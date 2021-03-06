#version 300 es
// A fragment shader for visualizing the depth buffer.
// It is also used as part of the process for creating a blurred depth buffer for the unsharpen mask shader.

precision mediump float; // set float to medium precision

// texture properties
uniform sampler2D uTexture; // the texture for the fragment

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

uniform vec2 uScreenSize; // The width and height of the screen

// Output
out vec4 oColor;

void main(void) {
    // Visualize depth
    vec4 texColor = texture(uTexture, vTexCoord);
    float d = texColor.z / texColor.w;

    // Increase visibility of effect
    d = pow(d, 20.0);

    oColor = vec4(vec3(d), 1.0);
}