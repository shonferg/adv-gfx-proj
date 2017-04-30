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
    vec4 texColor = texture(uTexture, vTexCoord);
    oColor = vec4(texColor.rgb * 0.5 + 0.5, 1.0);
}