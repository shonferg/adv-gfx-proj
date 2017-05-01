import { ScreenShaderProgram } from "./ScreenShaderProgram";
import { vec3, mat4 } from "gl-matrix";
import { ShaderSourceCode } from "./ShaderProgram";
import { gl, WIDTH, HEIGHT } from "../rasterize";
import { SSAOShaderProgram } from "./SSAOShaderProgram";

const SSAO_SCREEN_AREA: number = 0.05;

export class SSAOPlusShaderProgram extends SSAOShaderProgram {
    normalTextureUloc: WebGLUniformLocation;

    // Textures
    normalTexture: WebGLTexture;

    constructor(source: ShaderSourceCode, numSamples: number) {
        super(source, numSamples);

        this.normalTextureUloc = this.initUniform("uNormals");

        this.genRandomHemisphereVectors(numSamples);
    }

    genRandomHemisphereVectors(numSamples: number) {
        // Geneate random sample offsets
        let sampleVectors: vec3[] = [];
        let temp: vec3 = vec3.create();
        let centralVector = vec3.fromValues(0, 1, 0);
        while (sampleVectors.length < numSamples) {
            vec3.random(temp, Math.random());

            if (vec3.dot(centralVector, temp) <= 0) {
                sampleVectors.push(vec3.clone(temp));
            }

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

    setupTextures(mainTexture: WebGLTexture) {
        super.setupTextures(mainTexture);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture); // bind the set's texture
        gl.uniform1i(this.normalTextureUloc, 2);
    }
}