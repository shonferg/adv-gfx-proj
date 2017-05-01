#version 300 es
precision mediump float; // set float to medium precision

// texture properties
uniform sampler2D uTexture; // the texture for the fragment

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

uniform vec2 uScreenSize; // The width and height of the screen

// Output
out vec4 oColor;

void main(void) {
    // Visualize normalized vectors
    vec3 texColor = texture(uTexture, vTexCoord).rgb * 2.0 - 1.0;
    oColor = vec4(abs(texColor), 1.0);
}