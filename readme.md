# CSC 462 Advanced Graphics Final Project

## Description
This demo, created as a final project for [Advanced Graphics class](http://cg4games.csc.ncsu.edu), demonstrates several techniques for generating real-time ambient occlusion.  It includes implementations of SSAO, SSAO+, HBAO, and Unsharpen Mask techniques.  It also features multiple render targets, the ability to load OBJ files, and normal and specular mapping.

## Live Demo
Visit the following URL to run the program:

https://shonferg.github.io/adv-gfx-proj/

Note that it may take several seconds to load before it becomes responsive due to the large size of the 3D mesh files.

### Requirements
The program requires WebGL 2.0 support to run, and on my machine it runs best in Chrome/Opera.  It also runs in FireFox but it takes much longer to load and it may be required to confirm that you would like to wait longer for the script to complete before it will become interactive.  It does not work in Internet Explorer/Edge.

### Video
A short video illustrating the features of the demo:

<a href="http://www.youtube.com/watch?feature=player_embedded&v=cl4jaGOF0g8
" target="_blank"><img src="http://img.youtube.com/vi/cl4jaGOF0g8/0.jpg" 
alt="Demo Video" width="240" height="180" border="10" /></a>

### Controls
Walk around using the arrow keys.  Press key toggles to changes options, as described below.

### Key Toggles
The program implements several toggleable modes that can be accessed by pressing various keys.  The current state of these, as well as the key to press, are shown in the heads-up display.

|Key|Description|
|---|---|
|**C**|Toggles display of two humanoid characters within the atrium environment.  These characters have a lot of polygons, so turning them off may boost performance.  It also demonstrates that the AO is not precalculated.|
|**A**|Toggles the current AO effect on and off so the effect can be compared with basic rendering.|
|**M**|Toggles whether the AO is mixed with only ambient light or all types of light (including diffuse and specular).  The way the AO is mixed to produce the final result varies by game based on art direction.|
|**S**|Changes the number of samples used by all AO techniques except Unsharpen Mask.  Increasing samples improves the result, but it reduces performance.|
|**T**|Cycles through each AO Technique.|
|**B**|Cycles through visualizations of the various buffers used to compose the scene.  Ambient, Diffuse+Specular, Position/Depth, and Normals are rendered in one pass using MRT.  The two SSAO buffers vary based on the technique in use.|

## Building from Scratch

I have included transpiled JavaScript code that is ready to run in a browser, but if you want to build the code from scratch, or rebuild after making tweaks, this section will explain how to do so.

The program is written with [TypeScript](http://www.typescriptlang.org), which is a superset of JavaScript that adds type information as well as new language features that are not yet widely available in browsers.  The type information allows you to get error checking and code-completion within an editor so you know if you have made a simple mistake before refreshing the browser.  However, since browsers can't execute TypeScript directly, it requires an additional step to transpile TypeScript *.ts files into JavaScript *.js files that can be executed in a browser.  It can also produce code maps so that the original type script files can be debugged within the browser as if they were actually being executed.

### Build Steps
1. Download and install [Node.js](https://nodejs.org/en/), if it is not already intalled.  Even if you have an existing installation, you may want to update it the latest to avoid any potential problems with the rest of the steps.
2. Clone the GitHub repository to a local folder
3. Open a command prompt and navigate to the repository folder
4. Use Node.js to install TypeScript globally with this command (Note: Some of these may require sudo on Mac or Linux):
```
npm install -g typescript
```
5. Use Node.js to install [http-server](https://www.npmjs.com/package/http-server) globally with this command:
```
npm install -g http-server
```
6. Use Node.js to download the dependencies for the project (gl-matrix and type information for webgl2):
```
npm install
```
7. Use TypeScript to build the project.  Note: You can add the **-w** command line switch to run TypeScript in watch mode.  In this mode, TypeScript will continue to run and watch all your files for changes.  Any change to the source *.ts files will result in a rebuilt *.js file.  This way, you will not have to remember to type the command every time you make a change.  However, this will take over the current console window, so you will need to open a second console window and navigate back to the project folder before moving on to the next step.
```
tsc
```
8. Use the simple Node.js http-server to host the page locally.  This will start up a local web server that will host the contents of the folder that it is run in, so make sure you run it from the project root folder.  The server will take over the current command line window while it is running.  Note that this requires port 8080 to be unused.  You can specify an alternative port with the **-p** command-line option if desired:
```
http-server
```
9. Browse to [http://localhost:8080](http://localhost:8080).  As mentioned before, Chrome and Opera work best, but FireFox should also work.  Note: If you changed the port that http-server is running on, you will need to change it here as well.

### Visual Studio Code

For the best experience when working with the code, I recommend trying out Microsoft's free cross-platform [Visual Studio Code](https://code.visualstudio.com) editor.  It offers syntax highlighting and code completion for TypeScript, and you can download the [vscode-shader](https://github.com/stef-levesque/vscode-shader) extension to get syntax highlighting for GLSL files as well.  Once installed, simply type the following on the command line to open the current folder:
```
code .
```
After the project is open, you can press **Ctrl+Shift+B** to start a TypeScript build in watch mode.  If you do it this way, you do not have to type the **tsc** command in step 7 above.

## Claims

### SSAO
I have implemented the basic SSAO technique as described in the ShaderX7 article: Screen-Space Ambient Occlusion by Vladimer Kajalin.  The implementation is located in [SSAOShaderProgram.ts](typescript/shaderPrograms/SSAOShaderProgram.ts) and [screen-ssao.frag](shaders/screen-ssao.frag).

### SSAO+
I have implemented the SSAO+ variation on the screen space-ambient occlusion technique which focuses the samples in the hemisphere surrounding the view-space normal.  Additionally, I have implemented normal mapping so that fine details can be seen in the AO, even though this detail does not exist in the mesh. The implementation is located in [SSAOPlusShaderProgram.ts](typescript/shaderPrograms/SSAOPlusShaderProgram.ts) and [screen-ssao+.frag](shaders/screen-ssao%2B.frag).

### Unsharpen Mask
I have implemented the simplistic AO technique unsharpen mask which subtracts a blurred version of the depth buffer from itself.  I did so using a separated horizontal and vertical blur passes.  The implementation can be found in [screen-unsharpen-mask.frag](shaders/screen-unsharpen-mask.frag), [screen-gaus-h.frag](shaders/screen-gaus-h.frag), and [screen-gaus-v.frag](shaders/screen-gaus-v.frag).

### HBAO
I have implemented horizon-based ambient occlusion, a technique which arranges the samples into rays and only takes into account the ray which increases the angle between the normal plane the most.  I have included features such as random sample rotation and jittering, and tangent angle bias to reduce artifacts.  The implementation is in [HBAOShaderProgram.ts](typescript/shaderPrograms/HBAOShaderProgram.ts), and [screen-hbao.frag](shaders/screen-hbao.frag).

## Asset Credits

### FUTURESCAN GIGAPIXEL SAMPLE #2
https://www.turbosquid.com/3d-models/people-archviz-zbrush-max-free/886664

### Sponza Atrium
Original created by Marko Dabrovic: http://hdri.cgtechniques.com/~sponza/files/

Updated version created by Crytek: http://www.crytek.com/cryengine/cryengine3/downloads/

### Goblin
https://www.turbosquid.com/3d-models/polygonal-fantasy-goblin-3d-model/275524

### Footstep Sound
http://soundbible.com/2057-Footsteps-On-Cement.html

### Additional Normal Maps
Created using AwesomeBump: https://github.com/kmkolasinski/AwesomeBump

## Code Credits
Parts of the source code that were inspired by articles written by others are cited in comments within the source code.
