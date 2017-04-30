import { ShaderProgram, ShaderSourceCode, OptionalUniform } from "./ShaderProgram";
import { gl, WIDTH, HEIGHT } from "../rasterize";

export class ScreenShaderProgram extends ShaderProgram {
    // Attributes
    vPosAttribLoc: number; // where to put position for vertex shader

    // Uniforms
    textureULoc: WebGLUniformLocation; // where to put texture for fragment shader
    uScreenSizeLoc: WebGLUniformLocation;
    vMatrix: OptionalUniform;
    pMatrix: OptionalUniform;
    invVMatrix: OptionalUniform;
    invPMatrix: OptionalUniform;

    constructor(source: ShaderSourceCode) {
        super(source);

        this.vPosAttribLoc = this.initAttribute("aVertexPosition");

        this.textureULoc = this.initUniform("uTexture");
        this.uScreenSizeLoc = this.initUniform("uScreenSize");

        // Optional uniforms
        this.vMatrix = new OptionalUniform("uVMatrix", this, source);
        this.pMatrix = new OptionalUniform("uPMatrix", this, source);
        this.invVMatrix = new OptionalUniform("uInvVMatrix", this, source);
        this.invPMatrix = new OptionalUniform("uInvPMatrix", this, source);

        // Set screen size uniform
        gl.uniform2f(this.uScreenSizeLoc, WIDTH, HEIGHT);
    }

    setupTextures(mainTexture: WebGLTexture) {
        gl.uniform1i(this.textureULoc, 0); // pass in the texture and active texture 0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, mainTexture); // bind the set's texture
    }
}