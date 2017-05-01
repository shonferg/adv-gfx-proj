import { gl } from "../rasterize";
import { ScreenShaderProgram } from "./ScreenShaderProgram";
import { ShaderSourceCode } from "./ShaderProgram";

/**
 * Shader program responsible for the final mix of light color and calculated AO
 * Can be used with either form of mixing depending on the shader source that is fed in.
 */
export class SSAOMixShaderProgram extends ScreenShaderProgram {
    // Uniforms
    ssaoTextureUloc: WebGLUniformLocation;
    ambientTextureUloc: WebGLUniformLocation;

    // Textures
    ssaoTexture: WebGLTexture;
    ambientTexture: WebGLTexture;

    /**
     * Creates a new SSAOMixShaderProgram.
     * @param source The shader source code.
     */
    constructor(source: ShaderSourceCode) {
        super(source);

        this.vPosAttribLoc = this.initAttribute("aVertexPosition");

        this.ssaoTextureUloc = this.initUniform("uSsaoTexture");
        this.ambientTextureUloc = this.initUniform("uAmbientTexture");
    }

    /**
     * Sets up the textures used by the shader.
     * @param mainTexture All screen-space shaders use at least one texture and this sets which texture to use.
     */
    setupTextures(mainTexture: WebGLTexture): void {
        super.setupTextures(mainTexture);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.ssaoTexture); // bind the set's texture
        gl.uniform1i(this.ssaoTextureUloc, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.ambientTexture); // bind the set's texture
        gl.uniform1i(this.ambientTextureUloc, 2);
    }
}