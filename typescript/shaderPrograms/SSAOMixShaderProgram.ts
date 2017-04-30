import { gl } from "../rasterize";
import { ScreenShaderProgram } from "./ScreenShaderProgram";
import { ShaderSourceCode } from "./ShaderProgram";

export class SSAOMixShaderProgram extends ScreenShaderProgram {
    // Uniforms
    ssaoTextureUloc: WebGLUniformLocation;
    ambientTextureUloc: WebGLUniformLocation;

    // Textures
    ssaoTexture: WebGLTexture;
    ambientTexture: WebGLTexture;

    constructor(source: ShaderSourceCode) {
        super(source);

        this.vPosAttribLoc = this.initAttribute("aVertexPosition");

        this.ssaoTextureUloc = this.initUniform("uSsaoTexture");
        this.ambientTextureUloc = this.initUniform("uAmbientTexture");

        
    }

    setupTextures(mainTexture: WebGLTexture) {
        super.setupTextures(mainTexture);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.ssaoTexture); // bind the set's texture
        gl.uniform1i(this.ssaoTextureUloc, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.ambientTexture); // bind the set's texture
        gl.uniform1i(this.ambientTextureUloc, 2);
    }
}