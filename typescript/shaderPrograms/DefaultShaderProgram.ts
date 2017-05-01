import { ShaderProgram, ShaderSourceCode } from "./ShaderProgram";
import { gl, LightJson, Eye } from "../rasterize";
import { vec3, mat4 } from "gl-matrix";
import { MaterialData } from "../MaterialData";
import { MeshData } from "../MeshData";

/**
 * Shader program used for rendering solid objects.
 */
export class DefaultShaderProgram extends ShaderProgram {
    useNormalMap: boolean;
    currentTriCount: number; // The number of triangles in the current mesh

    // Attributes
    vPosAttribLoc: number; // where to put position for vertex shader
    vNormAttribLoc: number; // where to put normal for vertex shader
    vTangentAttribLoc: number; // tangent vector location
    vBinormalAttribLoc: number; // binormal vector location
    vUVAttribLoc: number; // where to put UV for vertex shader

    // Uniforms
    eyePositionULoc: WebGLUniformLocation; // eye position
    lightAmbientULoc: WebGLUniformLocation; // ambient material color
    lightDiffuseULoc: WebGLUniformLocation; // diffuse material color
    lightSpecularULoc: WebGLUniformLocation; // specular material color
    lightPositionULoc: WebGLUniformLocation; // light positions
    mInvTransMVULoc: WebGLUniformLocation; // inverse transpose of model view matrix
    mMatrixULoc: WebGLUniformLocation; // where to put model matrix for vertex shader
    pvMatrixULoc: WebGLUniformLocation; // where to put project view matrix for vertex shader
    ambientULoc: WebGLUniformLocation; // where to put ambient reflecivity for fragment shader
    diffuseULoc: WebGLUniformLocation; // where to put diffuse reflecivity for fragment shader
    specularULoc: WebGLUniformLocation; // where to put specular reflecivity for fragment shader
    shininessULoc: WebGLUniformLocation; // where to put specular exponent for fragment shader
    textureULoc: WebGLUniformLocation; // where to put texture for fragment shader
    specTextureULoc: WebGLUniformLocation; // specular texture location
    normalTextureULoc: WebGLUniformLocation; // normal texture location

    /**
     * Creates a new DefaultShaderProgram.
     * @param source Source code for the shader.
     * @param Eye The current eye position.
     * @param lights n An array of light positions.
     * @param useNormalMap Whether to use normal mapping.
     */
    constructor(source: ShaderSourceCode, Eye: vec3, lights: LightJson[], useNormalMap: boolean) {
        source.frag = source.frag.replace("{{num-lights}}", lights.length.toString());
        source.frag = source.frag.replace("{{use-normal-map}}", useNormalMap ? "#define USE_NORMAL_MAP" : "");
        source.vert = source.vert.replace("{{use-normal-map}}", useNormalMap ? "#define USE_NORMAL_MAP" : "");
        super(source);

        this.useNormalMap = useNormalMap;
        this.currentTriCount = 0;

        this.vPosAttribLoc = this.initAttribute("aVertexPosition");
        this.vNormAttribLoc = this.initAttribute("aVertexNormal");
        this.vUVAttribLoc = this.initAttribute("aVertexUV");

        if (this.useNormalMap) {
            this.vTangentAttribLoc = this.initAttribute("aVertexTangent");
            this.vBinormalAttribLoc = this.initAttribute("aVertexBinormal");
        }

        this.eyePositionULoc = this.initUniform("uEyePosition");
        this.lightAmbientULoc = this.initUniform("uLightAmbient");
        this.lightDiffuseULoc = this.initUniform("uLightDiffuse");
        this.lightSpecularULoc = this.initUniform("uLightSpecular");
        this.lightPositionULoc = this.initUniform("uLightPosition");
        this.mInvTransMVULoc = this.initUniform("uInvTransMV");
        this.mMatrixULoc = this.initUniform("umMatrix");
        this.pvMatrixULoc = this.initUniform("upvMatrix");
        this.ambientULoc = this.initUniform("uAmbient");
        this.diffuseULoc = this.initUniform("uDiffuse");
        this.specularULoc = this.initUniform("uSpecular");
        this.shininessULoc = this.initUniform("uShininess");
        this.textureULoc = this.initUniform("uTexture");
        this.specTextureULoc = this.initUniform("uSpecTexture");

        if (this.useNormalMap) {
            this.normalTextureULoc = this.initUniform("uNormalTexture");
        }

        // Separate light data into separate arrays
        var position: number[] = [];
        var ambient: number[] = [];
        var diffuse: number[] = [];
        var specular: number[] = [];

        for (let l of lights) {
            position.push(l.position[0], l.position[1], l.position[2]);
            ambient.push(l.ambient[0], l.ambient[1], l.ambient[2]);
            diffuse.push(l.diffuse[0], l.diffuse[1], l.diffuse[2]);
            specular.push(l.specular[0], l.specular[1], l.specular[2]);
        }

        // Set initial uniform values
        gl.uniform3fv(this.eyePositionULoc, Eye); // pass in the eye's position
        gl.uniform3fv(this.lightAmbientULoc, ambient); // pass in the light's ambient emission
        gl.uniform3fv(this.lightDiffuseULoc, diffuse); // pass in the light's diffuse emission
        gl.uniform3fv(this.lightSpecularULoc, specular); // pass in the light's specular emission
        gl.uniform3fv(this.lightPositionULoc, position); // pass in the light's positions
    }

    /**
     * Sets the view projection matrix, as well as updating the eye position.  Applies to subsequent objects rendered with the shader.
     * @param pvMatrix The view projection matrix.
     */
    setViewProjectionMatrix(pvMatrix: mat4): void {
        // If the shader changed, set frame-constant values
        gl.uniform3fv(this.eyePositionULoc, Eye);

        gl.uniformMatrix4fv(this.pvMatrixULoc, false, pvMatrix); // pass in the pv matrix
    }

    /**
     * Sets the model and view matricies.  Applies to subsequent objects rendered with the shader.
     * @param mMatrix The model matrix.
     * @param mView The view matrix.
     */
    setModelMatrix(mMatrix: mat4, mView): void {
        gl.uniformMatrix4fv(this.mMatrixULoc, false, mMatrix); // pass in the m matrix

        let mITMV = mat4.create();
        mat4.mul(mITMV, mView, mMatrix);
        mat4.invert(mITMV, mITMV);
        mat4.transpose(mITMV, mITMV);

        gl.uniformMatrix4fv(this.mInvTransMVULoc, false, mITMV); // pass in the m matrix
    }

    /**
     * Sets material colors and textures.  Applies to subsequent objects rendered with the shader.
     * @param material An object describing the material to use.
     */
    setMaterial(material: MaterialData): void {
        // reflectivity: feed to the fragment shader
        gl.uniform3fv(this.ambientULoc, material.ambient); // pass in the ambient reflectivity
        gl.uniform3fv(this.diffuseULoc, material.diffuse); // pass in the diffuse reflectivity
        gl.uniform3fv(this.specularULoc, material.specular); // pass in the specular reflectivity
        gl.uniform1f(this.shininessULoc, material.n); // pass in the specular exponent

        if (material.diffuseTexture != null) {
            gl.activeTexture(gl.TEXTURE0); // bind to active texture 0 (the first)
            gl.bindTexture(gl.TEXTURE_2D, material.diffuseTexture.textureBuffer); // bind the set's texture
            gl.uniform1i(this.textureULoc, 0); // pass in the texture and active texture 0
        }

        if (material.specularTexture != null) {
            gl.activeTexture(gl.TEXTURE1); // bind to active texture 0 (the first)
            gl.bindTexture(gl.TEXTURE_2D, material.specularTexture.textureBuffer); // bind the set's texture
            gl.uniform1i(this.specTextureULoc, 1); // pass in the texture and active texture 1
        }

        if (this.useNormalMap) {
            if (material.normalTexture != null) {
                gl.activeTexture(gl.TEXTURE2); // bind to active texture 0 (the first)
                gl.bindTexture(gl.TEXTURE_2D, material.normalTexture.textureBuffer); // bind the set's texture
                gl.uniform1i(this.normalTextureULoc, 2); // pass in the texture and active texture 1
            }
        }
    }

    /**
     * Sets the mesh to use for subsequent renders with this shader.
     * @param mesh An object containing mesh data such as verticies and texture coordinates.
     */
    setMesh(mesh: MeshData): void {
        // position, normal and uv buffers: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer); // activate position
        gl.vertexAttribPointer(this.vPosAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer); // activate normal
        gl.vertexAttribPointer(this.vNormAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed

        if (this.useNormalMap) {
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.tangentBuffer);
            gl.vertexAttribPointer(this.vTangentAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed

            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.binormalBuffer);
            gl.vertexAttribPointer(this.vBinormalAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvBuffer); // activate uv
        gl.vertexAttribPointer(this.vUVAttribLoc, 2, gl.FLOAT, false, 0, 0); // feed

        // Activate Index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

        this.currentTriCount = mesh.triangles.length;
    }

    /**
     * Draws the current mesh.
     * @return The number of triangles drawn.
     */
    draw(): number {
        // Render triangles
        gl.drawElements(gl.TRIANGLES, this.currentTriCount * 3, gl.UNSIGNED_SHORT, 0);
        return this.currentTriCount;
    }
}