// <requires 

import { vec3, vec2, mat4 } from "gl-matrix";
import { Frustum } from "./Frustum";
import { MaterialData, MaterialJson } from "./MaterialData";
import { AABB } from "./AABB";
import { MeshData, TriangleJson, Mesh } from "./MeshData";
import { MeshInstance } from "./MeshInstance";
import { TreeNode } from "./TreeNode";
import { SoundBuffer } from "./SoundBuffer";
import { DefaultShaderProgram } from "./shaderPrograms/DefaultShaderProgram";
import { ShaderProgram, ShaderSourceCode } from "./shaderPrograms/ShaderProgram";
import { ScreenQuad } from "./ScreenQuad";
import { ScreenShaderProgram } from "./shaderPrograms/ScreenShaderProgram";
import { SSAOShaderProgram } from "./shaderPrograms/SSAOShaderProgram";
import { SSAOBlurShaderProgram } from "./shaderPrograms/SSAOBlurShaderProgram";
import { SSAOMixShaderProgram } from "./shaderPrograms/SSAOMixShaderProgram";
import { ObjModelNode } from "./ObjModelNode";
import { SSAOPlusShaderProgram } from "./shaderPrograms/SSAOPlusShaderProgram";
import { HBAOShaderProgram } from "./shaderPrograms/HBAOShaderProgram";
import { getJSONFile } from "./util";

/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
export const INPUT_URL: string = "assets/"; // Change to "assets/" to see custom room layout
let defaultEye: vec3 = vec3.fromValues(4, 0.6, -1); // default eye position in world space
let defaultCenter: vec3 = vec3.fromValues(-0.5, 0.6, -1); // default view direction in world space
let defaultUp: vec3 = vec3.fromValues(0, 1, 0); // default view up vector
let lights: LightJson[] = [];
let rotateTheta = Math.PI / 50; // how much to rotate models by with each key press

let mrtFB: WebGLFramebuffer;
let colorTexture: WebGLTexture;
let zBufferTexture: WebGLTexture;
let positionTexture: WebGLTexture;
let normalTexture: WebGLTexture;
let ambientTexture: WebGLTexture;
let offscreenFB: WebGLFramebuffer[] = [];
let offscreenTexture: WebGLTexture[] = [];

enum DisplayBuffers {
    Color = 0,
    Ambient = 1,
    Position = 2,
    Depth = 3,
    Normals = 4,
    SSAO = 5,
    SSAOBlurred = 6,
    Combined = 7
}

let bufferCount: number = 8;

let currentBuffer: number = DisplayBuffers.Combined;

enum SSAOTechnique {
    SSAO,
    SSAOPlus,
    HBAO,
    UnsharpenMask
}

let sampleCounts: number[] = [8, 16, 32, 64, 128, 256, 512, 1024];

let sampleCountIndex = 1;

let ssaoTechniqueCount: number = 4;

let currentTechnique: number = SSAOTechnique.SSAO;

// Mode switches
let aoEnabled: boolean = true;
let displayCharacters: boolean = true;
let mixAll: boolean = false;

// Projection globals
export let FOV: number = 0.5 * Math.PI;
export let NEAR: number = 0.1;
export let FAR: number = 100;
export let WIDTH: number;
export let HEIGHT: number;
export let ASPECT: number;
export let LEFT: number;
export let RIGHT: number;
export let TOP: number;
export let BOTTOM: number;

/* input model data */
export let gl: WebGL2RenderingContext = null; // the all powerful gl object. It's all here folks!

// Roots of the 3D scene
let environmentRoot: TreeNode = new TreeNode();
let characterRoot: TreeNode = new TreeNode();

/* interaction variables */
export let Eye: vec3 = vec3.clone(defaultEye); // eye position in world space
export let Center: vec3 = vec3.clone(defaultCenter); // view direction in world space
export let Up: vec3 = vec3.clone(defaultUp); // view up vector in world space
export let viewDelta: number = 0.1; // how much to displace view with each key press

// does stuff when keys are pressed
function handleKeyDown(event: KeyboardEvent) {

    // set up needed view params
    let lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
    lookAt = vec3.normalize(lookAt, vec3.subtract(temp, Center, Eye)); // get lookat vector
    viewRight = vec3.normalize(viewRight, vec3.cross(temp, lookAt, Up)); // get view right vector

    switch (event.code) {
        case "ArrowRight": // rotate right
            Center = vec3.add(Center, Center, vec3.scale(temp, viewRight, viewDelta * 1.5));
            break;
        case "ArrowLeft": // rotate left
            Center = vec3.add(Center, Center, vec3.scale(temp, viewRight, -viewDelta * 1.5));
            break;
        case "ArrowUp": // move forward
            Eye = vec3.add(Eye, Eye, vec3.scale(temp, lookAt, viewDelta));
            Center = vec3.add(Center, Center, vec3.scale(temp, lookAt, viewDelta));
            // Play walking sound
            lastFootstepGain = 0.5;
            footstepBuffer.setGain(lastFootstepGain);
            break;
        case "ArrowDown": // move backward
            Eye = vec3.add(Eye, Eye, vec3.scale(temp, lookAt, -viewDelta));
            Center = vec3.add(Center, Center, vec3.scale(temp, lookAt, -viewDelta));
            // Play walking sound
            lastFootstepGain = 0.5;
            footstepBuffer.setGain(lastFootstepGain);
            break;
        case "KeyA": // Toggle AO
            aoEnabled = !aoEnabled;
            break;
        case "KeyM": // Toggle Mix Mode
            mixAll = !mixAll;
            break;
        case "KeyC": // Toggle Characters
            displayCharacters = !displayCharacters;
            break;
        case "KeyB": // Display different buffers
            currentBuffer++;
            if (currentBuffer >= bufferCount) {
                currentBuffer = 0;
            }
            break;
        case "KeyT": // Toggle SSAO technique
            currentTechnique++;
            if (currentTechnique >= ssaoTechniqueCount) {
                currentTechnique = 0;
            }
            break;
        case "KeyS": // Toggles through different numbers of samples for AO shaders
            if (sampleCountIndex + 1 >= sampleCounts.length) {
                sampleCountIndex = 0;
            } else {
                sampleCountIndex++;
            }
            updateSampleCount();
    }
}

// set up the webGL environment
function setupWebGL() {

    // Set up keys
    document.onkeydown = handleKeyDown; // call this when key pressed

    // create a webgl canvas and set it up
    let webGLCanvas: HTMLCanvasElement = document.getElementById("myWebGLCanvas") as HTMLCanvasElement; // create a webgl canvas
    WIDTH = webGLCanvas.width;
    HEIGHT = webGLCanvas.height;
    ASPECT = WIDTH / HEIGHT;
    TOP = Math.tan(FOV * 0.5) * NEAR;
    BOTTOM = -TOP;
    LEFT = ASPECT * BOTTOM;
    RIGHT = ASPECT * TOP;

    gl = webGLCanvas.getContext("webgl2") as WebGL2RenderingContext; // get a webgl object from it
    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {

            gl.getExtension("OES_texture_float_linear");
            gl.getExtension("EXT_color_buffer_float");

            mrtFB = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, mrtFB);

            colorTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, colorTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WIDTH, HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            zBufferTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, zBufferTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, WIDTH, HEIGHT, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

            positionTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, positionTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, WIDTH, HEIGHT, 0, gl.RGBA, gl.FLOAT, null);

            normalTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, normalTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WIDTH, HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            ambientTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, ambientTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WIDTH, HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3]);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, zBufferTexture, 0);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, positionTexture, 0);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, ambientTexture, 0);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, normalTexture, 0);

            gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)

            for (let i = 0; i < 2; ++i) {
                offscreenFB[i] = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFB[i]);

                offscreenTexture[i] = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, offscreenTexture[i]);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, WIDTH, HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

                gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
                gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, offscreenTexture[i], 0);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

let lastFootstepGain = 0;
let lastScrapingGain = 0;

let footstepBuffer: SoundBuffer;
let scrapingBuffer: SoundBuffer;

interface ModelJson {
    objFile: string,
    mtlFile: string,
    position: number[];
    scale: number;
    rotation: number[];
    scaleTo1by1: boolean;
    material: MaterialJson;
}

export interface LightJson {
    position: number[];
    ambient: number[];
    diffuse: number[];
    specular: number[];
}

interface SceneJson {
    lights: LightJson[];
    characters: ModelJson[];
    environment: ModelJson[];
}

class MaterialGrouping {
    material: MaterialData;
    instances: MeshInstance[] = [];
}

class ShaderGrouping {
    shader: DefaultShaderProgram;
    materials: MaterialGrouping[] = [];
}

// read models in, load them into webgl buffers
function setupScene(scene: SceneJson) {

    if (scene == null) {
        throw "Unable to load scene file!";
    }

    // Load Lights
    lights = scene.lights;

    // Load Charcters
    for (let m of scene.environment) {
        loadModel(m, environmentRoot);
    }

    // Load Environment
    for (let m of scene.characters) {
        loadModel(m, characterRoot);
    }
}

function loadModel(m: ModelJson, parent: TreeNode) {
    let pos = vec3.fromValues(m.position[0], m.position[1], m.position[2]);
    let scale = vec3.fromValues(m.scale, m.scale, m.scale);

    ObjModelNode.create(m.objFile, m.mtlFile, pos, scale, m.scaleTo1by1, m.material).then(function (modelNode) {
        parent.children.push(modelNode);
    });
}

let frameTimes = [];

// render the loaded model
function renderModels() {

    let frameStartTime = performance.now();

    // Fade down sounds quickly but not instantly
    if (frameTimes.length > 1) {
        let lastFrameTime = frameTimes[frameTimes.length - 1] / 1000;

        if (lastFootstepGain > 0) {
            lastFootstepGain = Math.max(lastFootstepGain -= lastFrameTime * 15, 0);
            footstepBuffer.setGain(lastFootstepGain);
        }

        if (lastScrapingGain > 0) {
            lastScrapingGain = Math.max(lastScrapingGain -= lastFrameTime * 7.5, 0);
            scrapingBuffer.setGain(lastScrapingGain);
        }
    }

    // Activate the default shader program
    defaultShaderProgram.begin();

    // Set main viewport to the whole screen
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    let pMatrix = mat4.create(); // projection matrix
    let vMatrix = mat4.create(); // view matrix
    let mMatrix = mat4.create(); // model matrix
    let pvMatrix = mat4.create(); // hand * proj * view matrices
    let invVMatrix = mat4.create(); // inverse view matrix
    let invPMatrix = mat4.create(); // inverse projection matrix
    let invPvMatrix = mat4.create();

    window.requestAnimationFrame(renderModels); // set up frame render callback

    // Set framebuffer to MRT textures
    gl.bindFramebuffer(gl.FRAMEBUFFER, mrtFB);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // set up handedness, projection and view
    mat4.perspective(pMatrix, FOV, ASPECT, NEAR, FAR); // create projection matrix
    //mat4.frustum(pMatrix, -0.178, 0.178, -0.1, 0.1, 0.1, 1000);
    mat4.lookAt(vMatrix, Eye, Center, Up); // create view matrix
    mat4.multiply(pvMatrix, pMatrix, vMatrix); // projection * view
    mat4.invert(invVMatrix, vMatrix);
    mat4.invert(invPMatrix, pMatrix);
    mat4.invert(invPvMatrix, pvMatrix);

    // Generate view frustum
    let viewFrustum = Frustum.fromViewProjectionMatrix(pvMatrix);

    screenQuad.setProjection(pMatrix, vMatrix, invPMatrix, invVMatrix);

    let trianglesDrawn = 0;

    // End default shader program
    defaultShaderProgram.end();

    // Draw the scene with default shader
    let visibleSet: MeshInstance[] = [];
    environmentRoot.appendVisibleSet(viewFrustum, false, visibleSet);

    if (displayCharacters) {
        characterRoot.appendVisibleSet(viewFrustum, false, visibleSet);
    }

    // Organize visible objects by shader, then material
    let shaders: ShaderGrouping[] = [];
    let currentShader: ShaderGrouping;
    let currentMaterial: MaterialGrouping;

    for (let inst of visibleSet) {
        if (inst.shader.index in shaders) {
            currentShader = shaders[inst.shader.index];
        } else {
            currentShader = new ShaderGrouping();
            currentShader.shader = inst.shader;
            shaders[inst.shader.index] = currentShader;
        }

        if (inst.material.index in currentShader.materials) {
            currentMaterial = currentShader.materials[inst.material.index];
        } else {
            currentMaterial = new MaterialGrouping();
            currentMaterial.material = inst.material;
            currentShader.materials[inst.material.index] = currentMaterial;
        }

        currentMaterial.instances.push(inst);
    }

    // Draw visible objects
    for (let shaderGroupIndex in shaders) {
        let shaderGroup = shaders[shaderGroupIndex];
        let shader = shaderGroup.shader;
        shader.begin();
        shader.setViewProjectionMatrix(pvMatrix);

        for (let materialGroupIndex in shaderGroup.materials) {
            let materialGroup = shaderGroup.materials[materialGroupIndex];
            let material = materialGroup.material;

            shader.setMaterial(material);

            for (let instance of materialGroup.instances) {
                shader.setMesh(instance.data);

                // Build model matrix and pass it to shader
                let mMatrix = mat4.create();
                mat4.fromRotationTranslationScale(mMatrix, instance.rotation, instance.position, instance.scale);

                shader.setModelMatrix(mMatrix, vMatrix);

                trianglesDrawn += shader.draw(instance.data, instance.primitiveType);
            }
        }

        shader.end();
    }

    TreeNode.endShader();

    if (aoEnabled || currentBuffer != DisplayBuffers.Combined) {
        // Switch to the offscreen frame buffer and draw SSAO to offscreen texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFB[0]);
        gl.disable(gl.DEPTH_TEST);
        let matrix = mat4.create();
        switch (currentTechnique) {
            case SSAOTechnique.SSAO:
                screenQuad.draw(ssaoShaderProgram, positionTexture);
                break;
            case SSAOTechnique.SSAOPlus:
                mat4.transpose(matrix, vMatrix);
                mat4.invert(matrix, matrix);
                ssaoPlusShaderProgram.normalTexture = normalTexture;
                screenQuad.draw(ssaoPlusShaderProgram, positionTexture);
                break;
            case SSAOTechnique.HBAO:
                mat4.transpose(matrix, vMatrix);
                mat4.invert(matrix, matrix);
                hbaoShaderProgram.normalTexture = normalTexture;
                screenQuad.draw(hbaoShaderProgram, positionTexture);
                break;
            case SSAOTechnique.UnsharpenMask:
                // First draw depth to offscreen buffer 0
                screenQuad.draw(screenDepthShaderProgram, positionTexture);
                // Next blur it vertically in buffer 1
                gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFB[1]);
                screenQuad.draw(gausVertProgram, offscreenTexture[0]);
                // Finaly blur it horizontally back to buffer 0
                gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFB[0]);
                screenQuad.draw(gausHorizProgram, offscreenTexture[1]);
                break;
        }

        // Swap to the other offscreen frame buffer and draw SSAO with blur
        gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFB[1]);

        if (currentTechnique == SSAOTechnique.UnsharpenMask) {
            unsharpenMaskProgram.depthTexture = positionTexture;
            screenQuad.draw(unsharpenMaskProgram, offscreenTexture[0]);
        } else {
            ssaoBlurProgram.depthTexture = positionTexture;
            screenQuad.draw(ssaoBlurProgram, offscreenTexture[0]);
        }
    } else {
        // Clear the SSAO buffer to white
        gl.bindFramebuffer(gl.FRAMEBUFFER, offscreenFB[1]);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }

    // Swap to the on-screen frame buffer and draw the final output 
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    switch (currentBuffer) {
        case DisplayBuffers.Color:
            screenQuad.draw(screenColorShaderProgram, colorTexture);
            break;
        case DisplayBuffers.Ambient:
            screenQuad.draw(screenColorShaderProgram, ambientTexture);
            break;
        case DisplayBuffers.Position:
            screenQuad.draw(screenColorShaderProgram, positionTexture);
            break;
        case DisplayBuffers.Depth:
            screenQuad.draw(screenDepthShaderProgram, positionTexture);
            break;
        case DisplayBuffers.Normals:
            screenQuad.draw(screenNormalsShaderProgram, normalTexture);
            break;
        case DisplayBuffers.SSAO:
            screenQuad.draw(screenColorShaderProgram, offscreenTexture[0]);
            break;
        case DisplayBuffers.SSAOBlurred:
            screenQuad.draw(screenColorShaderProgram, offscreenTexture[1]);
            break;
        case DisplayBuffers.Combined:
            if (mixAll) {
                ssaoMixAllProgram.ssaoTexture = offscreenTexture[1];
                ssaoMixAllProgram.ambientTexture = ambientTexture;
                screenQuad.draw(ssaoMixAllProgram, colorTexture);
            } else {
                ssaoMixProgram.ssaoTexture = offscreenTexture[1];
                ssaoMixProgram.ambientTexture = ambientTexture;
                screenQuad.draw(ssaoMixProgram, colorTexture);
            }
            break;
    }

    gl.enable(gl.DEPTH_TEST);

    let frameEndTime = performance.now();

    frameTimes.push(frameEndTime - frameStartTime);

    let ftLength = frameTimes.length;
    if (ftLength > 11) {
        frameTimes.shift();
        ftLength--;
    }

    let frameTime = 0;

    for (let i = 0; i < ftLength; ++i) {
        frameTime += frameTimes[i];
    }

    frameTime /= ftLength;


    // Update HUD
    document.getElementById("frameTime").innerHTML = frameTime.toFixed(2);
    document.getElementById("triangles").innerHTML = trianglesDrawn.toString();
    document.getElementById("displayCharacters").innerHTML = displayCharacters ? "ON" : "OFF";
    document.getElementById("aoEnabled").innerHTML = aoEnabled ? "ON" : "OFF";
    document.getElementById("mixMode").innerHTML = mixAll ? "All Light" : "Ambient Light Only";
    document.getElementById("sampleCount").innerHTML = sampleCounts[sampleCountIndex].toString();

    let bufferName: string = "";
    switch (currentBuffer) {
        case DisplayBuffers.Color:
            bufferName = "Color";
            break;
        case DisplayBuffers.Ambient:
            bufferName = "Ambient";
            break;
        case DisplayBuffers.Position:
            bufferName = "Position";
            break;
        case DisplayBuffers.Depth:
            bufferName = "Depth";
            break;
        case DisplayBuffers.Normals:
            bufferName = "Normals";
            break;
        case DisplayBuffers.SSAO:
            if (currentTechnique == SSAOTechnique.UnsharpenMask) {
                bufferName = "Blurred Depth";
            } else {
                bufferName = "AO Unfiltered";
            }
            break;
        case DisplayBuffers.SSAOBlurred:
            if (currentTechnique == SSAOTechnique.UnsharpenMask) {
                bufferName = "Unsharpen Mask";
            } else {
                bufferName = "AO Blurred";
            }
            break;
        case DisplayBuffers.Combined:
            bufferName = "Combined";
            break;
    }
    document.getElementById("bufferToDisplay").innerHTML = bufferName;

    let techName: string = "";
    switch (currentTechnique) {
        case SSAOTechnique.SSAO:
            techName = "SSAO";
            break;
        case SSAOTechnique.SSAOPlus:
            techName = "SSAO+";
            break;
        case SSAOTechnique.HBAO:
            techName = "HBAO";
            break;
        case SSAOTechnique.UnsharpenMask:
            techName = "Unsharpen Mask";
            break;
    }
    document.getElementById("ssaoTechnique").innerHTML = techName;

}

export let defaultShaderProgram: DefaultShaderProgram;
export let normalMapShaderProgram: DefaultShaderProgram;
export let screenQuad: ScreenQuad;
export let screenColorShaderProgram: ScreenShaderProgram;
export let screenDepthShaderProgram: ScreenShaderProgram;
export let screenNormalsShaderProgram: ScreenShaderProgram;
export let ssaoPlusShaderProgram: SSAOPlusShaderProgram;
export let hbaoShaderProgram: HBAOShaderProgram;
export let ssaoShaderProgram: SSAOShaderProgram;
export let ssaoBlurProgram: SSAOBlurShaderProgram;
export let ssaoMixProgram: SSAOMixShaderProgram;
export let ssaoMixAllProgram: SSAOMixShaderProgram;
export let gausVertProgram: ScreenShaderProgram;
export let gausHorizProgram: ScreenShaderProgram;
export let unsharpenMaskProgram: SSAOBlurShaderProgram;

/* MAIN -- HERE is where execution begins after window load */
export async function main() {

    // set up the webGL environment
    setupWebGL();

    // Get a Web Audio context
    let ac = new AudioContext();

    let shaderFiles: ShaderFileNames[] = [];
    shaderFiles["default"] = new ShaderFileNames("default", "default");
    shaderFiles["normalMap"] = new ShaderFileNames("default", "default");
    shaderFiles["screenColor"] = new ShaderFileNames("screen", "screen-color");
    shaderFiles["screenNormals"] = new ShaderFileNames("screen", "screen-normal");
    shaderFiles["screenDepth"] = new ShaderFileNames("screen", "screen-depth");
    shaderFiles["ssaoBlur"] = new ShaderFileNames("screen", "screen-ssao-blur");
    shaderFiles["ssao"] = new ShaderFileNames("screen", "screen-ssao");
    shaderFiles["ssaoPlus"] = new ShaderFileNames("screen", "screen-ssao+");
    shaderFiles["hbao"] = new ShaderFileNames("screen", "screen-hbao");
    shaderFiles["ssaoMix"] = new ShaderFileNames("screen", "screen-ssao-mix");
    shaderFiles["ssaoMixAll"] = new ShaderFileNames("screen", "screen-ssao-mix-all");
    shaderFiles["gausVert"] = new ShaderFileNames("screen", "screen-gaus-v");
    shaderFiles["gausHoriz"] = new ShaderFileNames("screen", "screen-gaus-h");
    shaderFiles["unsharpenMask"] = new ShaderFileNames("screen", "screen-unsharpen-mask");

    // Request assets
    let sceneResult = getJSONFile("assets/scene.json");
    let footstepResult = SoundBuffer.create(ac, "assets/footsteps.ogg");
    let scrapingResult = SoundBuffer.create(ac, "assets/scraping.ogg");

    // Await loading of all assets
    let shaderSource = await requestShaders(shaderFiles);
    let scene = await sceneResult;
    footstepBuffer = await footstepResult;
    scrapingBuffer = await scrapingResult;

    // Start the audio buffers (they will loop continuously and volume will be modulated based on the situation)
    footstepBuffer.setLoop(true);
    footstepBuffer.play();

    scrapingBuffer.setLoop(true);
    scrapingBuffer.play();

    // set up the models from tri file
    setupScene(scene);

    defaultShaderProgram = new DefaultShaderProgram(shaderSource["default"], Eye, lights, false);
    normalMapShaderProgram = new DefaultShaderProgram(shaderSource["normalMap"], Eye, lights, true);
    screenColorShaderProgram = new ScreenShaderProgram(shaderSource["screenColor"]);
    screenNormalsShaderProgram = new ScreenShaderProgram(shaderSource["screenNormals"]);
    screenDepthShaderProgram = new ScreenShaderProgram(shaderSource["screenDepth"]);
    ssaoShaderProgram = new SSAOShaderProgram(shaderSource["ssao"], sampleCounts[sampleCountIndex]);
    ssaoPlusShaderProgram = new SSAOPlusShaderProgram(shaderSource["ssaoPlus"], sampleCounts[sampleCountIndex]);
    hbaoShaderProgram = new HBAOShaderProgram(shaderSource["hbao"], sampleCounts[sampleCountIndex]);
    ssaoBlurProgram = new SSAOBlurShaderProgram(shaderSource["ssaoBlur"]);
    ssaoMixProgram = new SSAOMixShaderProgram(shaderSource["ssaoMix"]);
    ssaoMixAllProgram = new SSAOMixShaderProgram(shaderSource["ssaoMixAll"]);
    gausVertProgram = new ScreenShaderProgram(shaderSource["gausVert"]);
    gausHorizProgram = new ScreenShaderProgram(shaderSource["gausHoriz"]);
    unsharpenMaskProgram = new SSAOBlurShaderProgram(shaderSource["unsharpenMask"]);
    screenQuad = new ScreenQuad();

    // start drawing
    renderModels();
}

async function updateSampleCount() {
    let shaderFiles: ShaderFileNames[] = [];
    shaderFiles["ssao"] = new ShaderFileNames("screen", "screen-ssao");
    shaderFiles["ssaoPlus"] = new ShaderFileNames("screen", "screen-ssao+");
    shaderFiles["hbao"] = new ShaderFileNames("screen", "screen-hbao");

    // Await loading of all assets
    let shaderSource = await requestShaders(shaderFiles);

    ssaoShaderProgram = new SSAOShaderProgram(shaderSource["ssao"], sampleCounts[sampleCountIndex]);
    ssaoPlusShaderProgram = new SSAOPlusShaderProgram(shaderSource["ssaoPlus"], sampleCounts[sampleCountIndex]);
    hbaoShaderProgram = new HBAOShaderProgram(shaderSource["hbao"], sampleCounts[sampleCountIndex]);
}

class ShaderFileNames {
    constructor(public frag: string, public vert: string) { }
}

function requestShaders(input: ShaderFileNames[]): Promise<ShaderSourceCode[]> {
    return new Promise(async function (resolve, reject) {
        let promises: Promise<ShaderSourceCode>[] = [];

        // Initiate all async actions
        for (let key in input) {
            let item: ShaderFileNames = input[key];
            promises[key] = ShaderProgram.fetchSource(item.frag, item.vert);
        }

        let results: ShaderSourceCode[] = [];

        // Await all results
        for (let key in promises) {
            let item: Promise<ShaderSourceCode> = promises[key];
            results[key] = await item;
        }

        resolve(results);
    });
}