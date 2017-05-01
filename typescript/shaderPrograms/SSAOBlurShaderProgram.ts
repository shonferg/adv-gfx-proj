import { gl, WIDTH, HEIGHT } from "../rasterize";
import { ScreenShaderProgram } from "./ScreenShaderProgram";
import { ShaderSourceCode } from "./ShaderProgram";

/**
 * Shader program for depth-aware blur based on:
 * A Gentle Introduction to Bilateral Filtering and its Applications
 * Sylvain Paris, Pierre Kornprobst, Jack Tumblin, and Frédo Durand
 * http://people.csail.mit.edu/sparis/bf_course/
 */
export class SSAOBlurShaderProgram extends ScreenShaderProgram {
    // Uniforms
    depthTextureUloc: WebGLUniformLocation;

    // Textures
    depthTexture: WebGLTexture;

    /**
     * Creates a new SSAOBlurShaderProgram.
     * @param source The shader source code.
     */
    constructor(source: ShaderSourceCode) {
        super(source);

        this.vPosAttribLoc = this.initAttribute("aVertexPosition");

        this.depthTextureUloc = this.initUniform("uDepthTexture");
    }

    /**
     * Sets up the textures used by the shader.
     * @param mainTexture All screen-space shaders use at least one texture and this sets which texture to use.
     */
    setupTextures(mainTexture: WebGLTexture): void {
        super.setupTextures(mainTexture);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.depthTexture); // bind the set's texture
        gl.uniform1i(this.depthTextureUloc, 1);
    }
}