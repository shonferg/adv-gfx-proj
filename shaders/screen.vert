#version 300 es
// Basic vertex shader shared by all full-screen fragment shaders
// Used when rendering full screen quads with shader effects.

in vec2 aVertexPosition; // vertex position

out vec2 vTexCoord; // interpolated uv for frag shader


void main(void) {
    // passthrough
    gl_Position = vec4(aVertexPosition, 0.5, 1);
    vTexCoord = vec2(aVertexPosition * 0.5 + 0.5);
}