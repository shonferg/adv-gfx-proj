import { gl, WIDTH, HEIGHT } from "../rasterize";
import { ScreenShaderProgram } from "./ScreenShaderProgram";
import { ShaderSourceCode } from "./ShaderProgram";

export class SSAOBlurShaderProgram extends ScreenShaderProgram {
    // Uniforms
    depthTextureUloc: WebGLUniformLocation;

    // Textures
    depthTexture: WebGLTexture;

    constructor(source: ShaderSourceCode) {
        super(source);

        this.vPosAttribLoc = this.initAttribute("aVertexPosition");

        this.depthTextureUloc = this.initUniform("uDepthTexture");
        
    }

    setupTextures(mainTexture: WebGLTexture) {
        super.setupTextures(mainTexture);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.depthTexture); // bind the set's texture
        gl.uniform1i(this.depthTextureUloc, 1);
    }
}