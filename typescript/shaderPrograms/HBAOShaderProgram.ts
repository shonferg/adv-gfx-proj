import { ScreenShaderProgram } from "./ScreenShaderProgram";
import { vec3, mat4, vec2 } from "gl-matrix";
import { ShaderSourceCode } from "./ShaderProgram";
import { gl, WIDTH, HEIGHT } from "../rasterize";
import { SSAOShaderProgram } from "./SSAOShaderProgram";
import { SSAOPlusShaderProgram } from "./SSAOPlusShaderProgram";

const RAY_LENGTH_IN_PIXELS = 36;

export class HBAOShaderProgram extends SSAOPlusShaderProgram {
    constructor(source: ShaderSourceCode, numSamples: number) {
        // Divide samples evenly between rays and samples per ray
        let sqrtSamples = Math.floor(Math.sqrt(numSamples));

        source.frag = source.frag.replace("{num-rays}", sqrtSamples.toString());
        source.frag = source.frag.replace("{ray-length}", RAY_LENGTH_IN_PIXELS.toString());
        source.frag = source.frag.replace("{samples-per-ray}", sqrtSamples.toString());
        super(source, numSamples);
    }

    genRandomOffsetTexture() {
        // Generate a 4 x 4 texture of random vectors
        // This version generates 2 normalized 2D vectors, one in XY and one in YZ
        let pixelData: number[] = [];

        for (let i = 0; i < 32; ++i) {
            let v = vec2.create();
            vec2.random(v);
            pixelData.push(Math.round(v[0] * 255), Math.round(v[1] * 255));
        }

        this.offsetTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.offsetTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pixelData));
        gl.uniform1i(this.uOffsetsLoc, 1);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}