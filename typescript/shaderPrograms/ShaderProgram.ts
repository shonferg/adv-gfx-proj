import { gl } from "../rasterize";
import { getTextFile } from "../util";

export interface ShaderSourceCode {
    vert: string,
    frag: string
}

export class OptionalUniform {
    enabled: boolean;
    location: WebGLUniformLocation;

    constructor(name: string, owner: ShaderProgram, source: ShaderSourceCode) {
        this.enabled = source.frag.indexOf(name) != -1 || source.vert.indexOf(name) != -1;
        if (this.enabled) {
            this.location = owner.initUniform(name);
        }
    }

    ifEnabled(action: (location: WebGLUniformLocation) => void) {
        if (this.enabled) {
            action(this.location);
        }
    }
}

export class ShaderProgram {
    vertexShader: WebGLShader;
    fragmentShader: WebGLShader;
    program: WebGLProgram;
    attributes: number[] = [];
    index: number;

    static nextIndex: number = 0;

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

    initUniform(name: string): WebGLUniformLocation {
        return gl.getUniformLocation(this.program, name);
    }

    initAttribute(name: string): number {
        let loc = gl.getAttribLocation(this.program, name); // ptr to vertex pos attrib
        this.attributes.push(loc);
        return loc;
    }

    begin() {
        gl.useProgram(this.program);

        for (let loc of this.attributes) {
            gl.enableVertexAttribArray(loc);
        }
    }

    end () {
        for (let loc of this.attributes) {
            gl.disableVertexAttribArray(loc);
        }
        gl.useProgram(null);
    }

    static async fetchSource(vertexShaderBaseName: string, fragmentShaderBaseName: string): Promise<ShaderSourceCode> {
        let vSourceResult = getTextFile("shaders/" + vertexShaderBaseName + ".vert");
        let fSourceResult = getTextFile("shaders/" + fragmentShaderBaseName + ".frag");

        // Await loading of shader code
        let vSourceCode: string = await vSourceResult;
        let fSourceCode: string = await fSourceResult;

        return {vert: vSourceCode, frag: fSourceCode};
    }
}