import { gl } from "../rasterize";
import { getTextFile } from "../util";

/**
 * Interface describing shader program source code.
 */
export interface ShaderSourceCode {
    /**
     * The vertex shader source code.
     */
    vert: string;

    /**
     * The fragment shader source code.
     */
    frag: string;
}

/**
 * A helper class to make it possible to make various uniforms available to shaders, but only attempt
 * to set them if the shader source code actually contains the name of the uniform.
 */
export class OptionalUniform {
    /**
     * Whether the uniform exists in the shader souce code.
     */
    enabled: boolean;

    /**
     * The WebGL location of the uniform, if it exists.
     */
    location: WebGLUniformLocation;

    /**
     * Creates a new OptionalUniform.
     * @param name The name of the uniform that will appear in the shader source code if in use.
     * @param owner The shader program that this uniform is part of.
     * @param source The shader source code.
     */
    constructor(name: string, owner: ShaderProgram, source: ShaderSourceCode) {
        this.enabled = source.frag.indexOf(name) != -1 || source.vert.indexOf(name) != -1;
        if (this.enabled) {
            this.location = owner.initUniform(name);
        }
    }

    /**
     * This method is used as a convenient way to execute code only if the uniform is in use by the shader.
     * @param action This action will only be invoked if the uniform is in use.  The location will be passed in as a parameter.
     */
    ifEnabled(action: (location: WebGLUniformLocation) => void) {
        if (this.enabled) {
            action(this.location);
        }
    }
}

/**
 * Base class for all shader programs.  These classes encapsulate shader techniques that are a combination of vertex and fragment shaders as well as
 * a collection of uniforms and attributes.
 */
export class ShaderProgram {
    vertexShader: WebGLShader; // The vertex shader
    fragmentShader: WebGLShader; // The fragment shader
    program: WebGLProgram; // The WebGL shader program
    attributes: number[] = []; // All the attributes used by the shader
    index: number; // A unique index for the shader, making it easier to sort renderable objects by shader.

    // The next index to use when creating a new shader.  It will be incremented each time a shader is created.
    static nextIndex: number = 0;

    /**
     * Creates a new ShaderProgram.
     * @param source The shader source code.
     */
    constructor(source: ShaderSourceCode) {
        this.index = ShaderProgram.nextIndex++;

        try {
            // create vertex shader
            this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(this.vertexShader, source.vert); // attach code to shader
            gl.compileShader(this.vertexShader); // compile the code for gpu execution

            if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
                // bad vertex shader compile
                throw "error during vertex shader compile: " + gl.getShaderInfoLog(this.vertexShader);
            }

            // create frag shader
            this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(this.fragmentShader, source.frag); // attach code to shader
            gl.compileShader(this.fragmentShader); // compile the code for gpu execution

            if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
                // bad frag shader compile
                throw "error during fragment shader compile: " + gl.getShaderInfoLog(this.fragmentShader);
            }

            this.program = gl.createProgram(); // create the single shader program
            gl.attachShader(this.program, this.fragmentShader); // put frag shader in program
            gl.attachShader(this.program, this.vertexShader); // put vertex shader in program
            gl.linkProgram(this.program); // link program into gl context

            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(this.program);
            } else { // no shader program link errors
                gl.useProgram(this.program); // activate shader program (frag and vert)
            }
        } catch (e) {
            console.log(e);
        }
    }

    /**
     * Initializes a new shader uniform.
     * @param name The name of the uniform to initialize
     * @return The WebGL uniform location.
     */
    protected initUniform(name: string): WebGLUniformLocation {
        return gl.getUniformLocation(this.program, name);
    }

    /**
     * Initializes a new shader attribute.
     * @param name The name of the attribute.
     * @return The WebGL attribute location number.
     */
    protected initAttribute(name: string): number {
        let loc = gl.getAttribLocation(this.program, name); // ptr to vertex pos attrib
        this.attributes.push(loc);
        return loc;
    }

    /**
     * Begins rendering with this shader program.  Should be paired with a call to end.
     */
    begin() {
        gl.useProgram(this.program);

        for (let loc of this.attributes) {
            gl.enableVertexAttribArray(loc);
        }
    }

    /**
     * Ends rendering with this shader program.  Should come after a call to begin.
     */
    end() {
        for (let loc of this.attributes) {
            gl.disableVertexAttribArray(loc);
        }
        gl.useProgram(null);
    }

    /**
     * Fetches shader source code from URLs in the background.
     * @param vertexShaderBaseName The name of the vertex shader file without path or extension.
     * @param fragmentShaderBaseName The name of the fragment shader file without path or extension.
     * @return A ShaderSourceCode objects containing the text data from the two files once they have both been fetched.
     */
    static async fetchSource(vertexShaderBaseName: string, fragmentShaderBaseName: string): Promise<ShaderSourceCode> {
        let vSourceResult = getTextFile("shaders/" + vertexShaderBaseName + ".vert");
        let fSourceResult = getTextFile("shaders/" + fragmentShaderBaseName + ".frag");

        // Await loading of shader code
        let vSourceCode: string = await vSourceResult;
        let fSourceCode: string = await fSourceResult;

        return { vert: vSourceCode, frag: fSourceCode };
    }
}