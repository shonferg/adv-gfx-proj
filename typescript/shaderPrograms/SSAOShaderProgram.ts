import { ScreenShaderProgram } from "./ScreenShaderProgram";
import { vec3, vec2 } from "gl-matrix";
import { ShaderSourceCode } from "./ShaderProgram";
import { gl, WIDTH, HEIGHT } from "../rasterize";

const SSAO_SCREEN_AREA: number = 0.05;

export class SSAOShaderProgram extends ScreenShaderProgram {
    // Uniforms
    sampleVectorsULoc: WebGLUniformLocation;
    uOffsetsLoc: WebGLUniformLocation;

    // Textures
    offsetTexture: WebGLTexture;
    
    constructor(source: ShaderSourceCode, numSamples: number) {
        source.frag = source.frag.replace("{{num-samples}}", numSamples.toString());
        super(source);

        this.sampleVectorsULoc = this.initUniform("sampleVectors");
        this.uOffsetsLoc = this.initUniform("uOffsets");

        if (numSamples == 8 || numSamples == 16 || numSamples == 24 || numSamples == 32) {
            this.genCubeCornerVectors(numSamples);
        } else {
            this.genRandomVectors(numSamples);
        }

        this.genRandomOffsetTexture();
    }

    genCubeCornerVectors(numSamples: number) {

        let offsetScale = 0.01;
        let offsetScaleStep = 1 + 2.4 / numSamples;
        let shaderVectors: number[] = [];

        // Rather than random vectors, use corners of increasingly smaller cubes
        for (let i = 0; i < (numSamples / 8); i++) {
            for (let x of [-1, 1]) {
                for (let y of [-1, 1]) {
                    for (let z of [-1, 1]) {

                        // here we use cube corners and give it different lengths
                        let v = vec3.fromValues(x, y, z);
                        let vOffset = vec3.scale(v, vec3.normalize(v, v), offsetScale *= offsetScaleStep);

                        shaderVectors.push(v[0], v[1], v[2]);
                    }
                }
            }
        }

        // Set shader uniform to sample offets
        gl.uniform3fv(this.sampleVectorsULoc, shaderVectors);
    }

    genRandomVectors(numSamples: number) {
        // Geneate random sample offsets
        let sampleVectors: vec3[] = [];
        let temp: vec3 = vec3.create();
        for (let i = 0; i < numSamples; ++i) {
            vec3.random(temp, Math.random());

            sampleVectors.push(vec3.clone(temp));
        }

        // Convert vectors for shader
        let shaderVectors: number[] = [];
        for (let v of sampleVectors) {
            // Size to SSAO_SCREEN_AREA
            vec3.scale(v, v, SSAO_SCREEN_AREA);
            // Add to output array
            shaderVectors.push(v[0], v[1], v[2]);
        }

        // Set shader uniform to sample offets
        gl.uniform3fv(this.sampleVectorsULoc, shaderVectors);
    }

    begin() {
        super.begin();
    }

    genRandomOffsetTexture() {
        // Generate a 4 x 4 texture of random vectors
        let pixelData: number[] = [];

        for (let i = 0; i < 16; ++i) {
            let v = vec2.create();
            vec2.random(v);
            vec2.scale(v, v, 0.5);
            vec2.add(v, v, vec2.fromValues(0.5, 0.5));
            pixelData.push(Math.round(v[0] * 255), Math.round(v[1] * 255), 128);
        }

        this.offsetTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.offsetTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 4, 4, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(pixelData));
        gl.uniform1i(this.uOffsetsLoc, 1);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    setupTextures(mainTexture: WebGLTexture) {
        super.setupTextures(mainTexture);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.offsetTexture); // bind the set's texture
        gl.uniform1i(this.uOffsetsLoc, 1);
    }
}