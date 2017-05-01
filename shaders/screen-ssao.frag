#version 300 es
// Fragment shader for screen-space AO
// Based on "Screen-Space Ambient Occlusion
// by Vladimir Kajalin
// Published in ShaderX7

precision mediump float; // set float to medium precision

// texture properties
uniform sampler2D uTexture; // the texture for the fragment
uniform sampler2D uOffsets; // The random rotation vectors

const int NUM_SAMPLES = {{num-samples}};
uniform vec3 sampleVectors[NUM_SAMPLES]; // Vectors arranged in a random sphere about the point
uniform vec2 uScreenSize; // The width and height of the screen

uniform mat4 uPMatrix; // the project matrix

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

// Output
out vec4 oColor;

// Gets distance from camera at the given screen UV coordinate
float getDepth(vec2 uv)
{
    vec4 pos = texture(uTexture, uv);
    return pos.w;
}

void main(void) {
    // get random vector
    vec2 noiseTexCoord = vTexCoord * uScreenSize / 4.0;
    vec3 rvec = vec3(texture(uOffsets, noiseTexCoord).rg * 2.0 - 1.0, 0.0);

    // Calculate screen ratio to keep the sample area circular
    vec2 screenRatio = vec2(1.0, -uScreenSize.y / uScreenSize.x);

    // Get center sample
    float d = getDepth(vTexCoord);

    // Loop through the other samples and determine the number that are occluded
    float accessibility = 0.0;
    for (int i = 0; i < NUM_SAMPLES; ++i) {
        vec3 samplePos = vec3(vTexCoord, d);

        vec3 currentSample = sampleVectors[i];
        currentSample = reflect(currentSample, rvec);

        samplePos += vec3(currentSample.xy * screenRatio, currentSample.z * d * 2.0);

        // Clamp to exact pixel positions
        samplePos.xy *= uScreenSize;
        samplePos.xy = floor(samplePos.xy);
        samplePos.xy += vec2(0.5, 0.5);
        samplePos.xy /= uScreenSize;

        float sampleDepth = getDepth(samplePos.xy);

        // check if depths of both pixels are close enough and sampling point should affect our center pixel
        float rangeInvalid = clamp((d - sampleDepth) / sampleDepth, 0.0, 1.0);

        // accumulate accessibility, use default value of 0.5 if right computations are not possible
        float delta = samplePos.z - sampleDepth;
        if (delta < 0.0) {
            accessibility += 1.0; //mix(1.0, 0.5, rangeInvalid);
        } else if (delta <= 0.01) {
            accessibility += mix(1.0, 0.0, delta * 100.0);
        } else {
            accessibility += mix(0.0, 0.5, rangeInvalid);
        }
    }

    accessibility /= float(NUM_SAMPLES);

    oColor = vec4(vec3(accessibility), 1.0);
}