#version 300 es
// A fragment shader that implements a horizontal gaussian blur 

precision mediump float; // set float to medium precision

const float PI = 3.1415926535897932384626433832795;
const int RADIUS = 16;
const float SIGMA = 0.7;
const float SIGMA2 = SIGMA * SIGMA;

// texture properties
uniform sampler2D uTexture; // the texture for the fragment

uniform vec2 uScreenSize; // The width and height of the screen

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

// Output
out vec4 oColor;

// Gausian function.  Would be faster to precalculate, but doing it here
// makes it simpler to alter the radius.
float gaus(float v) {
    return 1.0 / (2.0 * PI * SIGMA2) * exp(-(v * v) / 2.0 * SIGMA2);
}

void main(void) {
    vec2 screenStep = 1.0 / uScreenSize;

    vec4 accum = vec4(0);
    float total = 0.0;

    // Sample each pixel in a horizontal line centered at the current pixel and
    // use the gaus function to determine its contribution to the final result.
    for (int x = -RADIUS; x < RADIUS; ++x) {
        vec2 offsetCoord = vTexCoord + vec2(x, 0) * screenStep;
        vec4 samp = texture(uTexture, offsetCoord);

        float g = clamp(gaus((0.0 - float(x)) / float(RADIUS)), 0.0, 1.0);
        total += g;

        accum += samp * g;
    }
    accum /= total;
    oColor = accum;
}