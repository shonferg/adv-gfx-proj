#version 300 es
// Fragment shader for depth-aware blur based on:
// A Gentle Introduction to Bilateral Filtering and its Applications
// Sylvain Paris, Pierre Kornprobst, Jack Tumblin, and Frédo Durand
// http://people.csail.mit.edu/sparis/bf_course/

precision mediump float; // set float to medium precision

const float PI = 3.1415926535897932384626433832795;
const float SIGMA = 100.0;
const float SIGMA2 = SIGMA * SIGMA;

// texture properties
uniform sampler2D uTexture; // the texture for the fragment
uniform sampler2D uDepthTexture; // the texture for the fragment

uniform vec2 uScreenSize; // The width and height of the screen

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

// Output
out vec4 oColor;

// Gets the eye-space depth at a given screen UV coordinate
float getDepth(vec2 uv) {
    vec4 pos = texture(uDepthTexture, uv);
    return pos.z / pos.w;
}

// Gausian function.  Would be faster to precalculate, but doing it here
// makes it simpler to alter the sigma.
float gaus(float v) {
    return 1.0 / (2.0 * PI * SIGMA2) * exp(-(v * v) / 2.0 * SIGMA2);
}

void main(void) {
    float accum = 0.0;
    float total = 0.0;

    vec2 screenStep = 1.0 / uScreenSize;

    vec2 centerPixel = vTexCoord;

    float centerDepth = getDepth(centerPixel);

    for (int x = -2; x < 2; ++x) {
        for (int y = -2; y < 2; ++y) {
            vec2 offsetCoord = centerPixel + vec2(x, y) * screenStep;

            // Get the depth from the depth texture
            float sampDepth = getDepth(offsetCoord);

            // For bilateral filtering, use the depth to determine sample importance
            float importance = clamp(gaus(centerDepth - sampDepth), 0.0, 1.0);

            // Accumulate results from the color texture
            accum += texture(uTexture, offsetCoord).r * importance;
            total += importance;
        }
    }
    accum /= total;
    oColor = vec4(vec3(accum), 1.0);
}