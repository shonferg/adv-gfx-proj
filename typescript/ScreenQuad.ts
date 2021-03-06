import { gl, defaultShaderProgram } from "./rasterize";
import { ShaderProgram } from "./shaderPrograms/ShaderProgram";
import { ScreenShaderProgram } from "./shaderPrograms/ScreenShaderProgram";
import { mat4, vec4 } from "gl-matrix";

/**
 * Represents a scree-filling quad used to render full-screen effects.
 */
export class ScreenQuad {
    static vertices = new Float32Array([
        1, 1,
        -1, 1,
        -1, -1,
        1, -1]);
    static indices = new Uint16Array([2, 1, 0, 3, 2, 0]);

    vertexBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;

    vMatrix: mat4;
    pMatrix: mat4;
    invVMatrix: mat4;
    invPMatrix: mat4;

    /**
     * Creates a new ScreenQuad.
     */
    constructor() {
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, ScreenQuad.vertices, gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ScreenQuad.indices, gl.STATIC_DRAW);
    }

    /**
     * Sets various view and projection matricies which may be used by full screen shaders.
     * @param pMatrix The projection matrix.
     * @param vMatrix The view matrix.
     * @param invPMatrix The inverse projection matrix.
     * @param invVMatrix The inverse view matrix.
     */
    setProjection(pMatrix: mat4, vMatrix: mat4, invPMatrix: mat4, invVMatrix: mat4): void {
        this.pMatrix = pMatrix;
        this.vMatrix = vMatrix;
        this.invPMatrix = invPMatrix;
        this.invVMatrix = invVMatrix;
    }

    /**
     * Renders the screen-filling quad using the given shader program and main texture.
     * @param program The shader program to draw with.
     * @param texture The main texture to use when drawing.  Additional textures may need to be set on the program depending on type.
     */
    draw(program: ScreenShaderProgram, texture: WebGLTexture) {
        // Activate program
        program.begin();

        program.setupTextures(texture);
                
        // position, normal and uv buffers: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer); // activate position
        gl.vertexAttribPointer(program.vPosAttribLoc, 2, gl.FLOAT, false, 0, 0); // feed

        // Optional uniforms
        program.vMatrix.ifEnabled((location) => {
            gl.uniformMatrix4fv(location, false, this.vMatrix);
        });

        program.pMatrix.ifEnabled((location) => {
            gl.uniformMatrix4fv(location, false, this.pMatrix);
        });

        program.invVMatrix.ifEnabled((location) => {
            gl.uniformMatrix4fv(location, false, this.invVMatrix);
        });

        program.invPMatrix.ifEnabled((location) => {
            gl.uniformMatrix4fv(location, false, this.invPMatrix);
        });

        // Activate Index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Render lines
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        //Disable program
        program.end();
    }
}