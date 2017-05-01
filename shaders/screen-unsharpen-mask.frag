#version 300 es
// Fragment shader for simple unsharpen mask AO technique
// Based on "Variance Methods for Screen-Space Ambient Occlusion
// by Angelo Pesce
// Published in Shader X7

precision mediump float; // set float to medium precision

// texture properties
uniform sampler2D uTexture; // the texture for the fragment
uniform sampler2D uDepthTexture; // the texture for the fragment

uniform vec2 uScreenSize; // The width and height of the screen

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

// Output
out vec4 oColor;

// Gets the eye-space depth at the given screen-space UV coordinate
float getDepth(vec2 uv) {
    vec4 pos = texture(uDepthTexture, uv);
    return pos.z / pos.w;
}

void main(void) {

    // Get the depth from the blurred depth texture and subtract it from the unblurred depth texture
    float d = getDepth(vTexCoord);

    // In the depth rendering shader, we used power of 20 to make the depth more visible.  Do the same here to match
    d = pow(d, 20.0);

    float bd = texture(uTexture, vTexCoord).r;

    float difference = 1.0 - clamp(d - bd, 0.0, 1.0);

    oColor = vec4(vec3(difference), 1.0);
}