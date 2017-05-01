import { ScreenShaderProgram } from "./ScreenShaderProgram";
import { vec3, mat4 } from "gl-matrix";
import { ShaderSourceCode } from "./ShaderProgram";
import { gl, WIDTH, HEIGHT } from "../rasterize";
import { SSAOShaderProgram } from "./SSAOShaderProgram";

const SSAO_SCREEN_AREA: number = 0.05;

/**
 * Fragment shader for SSAO+
 * Augments standard version by rotating a hemisphere full of random
 * samples to face away from the surface normal rather than simply
 * using a sphere full of random samples.
 */
export class SSAOPlusShaderProgram extends SSAOShaderProgram {
    normalTextureUloc: WebGLUniformLocation;

    // Textures
    normalTexture: WebGLTexture;

    /**
     * Creates a new SSAOPlusShaderProgram.
     * @param source The shader source code.
     */
    constructor(source: ShaderSourceCode, numSamples: number) {
        super(source, numSamples);

        this.normalTextureUloc = this.initUniform("uNormals");

        this.genRandomHemisphereVectors(numSamples);
    }

    /**
     * Generates a new set of random sample vectors that fall within the hemisphere centered
     * around +Y.  Since these are random, the effect will look slightly different every time
     * the program is run or number of samples is changed.
     * @param numSamples The number of samples to generate vectors for.
     */
    genRandomHemisphereVectors(numSamples: number): void {
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

    /**
     * Sets up the textures used by the shader.
     * @param mainTexture All screen-space shaders use at least one texture and this sets which texture to use.
     */
    setupTextures(mainTexture: WebGLTexture): void {
        super.setupTextures(mainTexture);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.normalTexture); // bind the set's texture
        gl.uniform1i(this.normalTextureUloc, 2);
    }
}