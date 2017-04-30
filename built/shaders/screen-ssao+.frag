#version 300 es
precision mediump float; // set float to medium precision

// texture properties
uniform sampler2D uTexture; // the texture for the fragment
uniform sampler2D uOffsets; // The random rotation vectors
uniform sampler2D uNormals; // the texture for screen-space normals

const int NUM_SAMPLES = {{num-samples}};
uniform vec3 sampleVectors[NUM_SAMPLES]; // Vectors arranged in a random sphere about the point
uniform vec2 uScreenSize; // The width and height of the screen
uniform mat4 utivMatrix; // transpose inverse view matrix
uniform mat4 uPMatrix; // the project matrix

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

// Output
out vec4 oColor;

float getDepth(vec2 uv) {
    vec4 pos = texture(uTexture, uv);
    return pos.w;
}

vec3 getNormal(vec2 uv) {
    return texture(uNormals, uv).xzy * 2.0 - 1.0;
}

void main(void) {
    // Get depth and normal for this pixel
    float d = getDepth(vTexCoord);
    vec3 normal = getNormal(vTexCoord);

    // get reflection vector
    vec2 reflectionTexCoord = vTexCoord * uScreenSize / 4.0;
    vec3 rvec = 2.0 * texture(uOffsets, reflectionTexCoord).rgb - 1.0;

    // Create rotation matrix that will rotate the sample hemisphere to be centered around the normal
    // Based on: http://john-chapman-graphics.blogspot.com/2013/01/ssao-tutorial.html
    vec3 tangent = normalize(cross(normal, rvec));
    vec3 binormal = normalize(cross(normal, tangent));
    mat3 tangentFrame = mat3(tangent, binormal, normal);

    // Calculate screen ratio to keep the sample area circular
    vec2 screenRatio = vec2(1.0, uScreenSize.y / uScreenSize.x);

    // Loop through the other samples and determine the number that are occluded
    float accessibility = 0.0;
    for (int i = 0; i < NUM_SAMPLES; ++i) {
        vec3 samplePos = vec3(vTexCoord, d);

        vec3 currentSample = sampleVectors[i] * tangentFrame;

        samplePos += vec3(currentSample.xy * screenRatio, currentSample.z * d * 2.0);

        float sampleDepth = getDepth(samplePos.xy);

        // check if depths of both pixels are close enough and sampling point should affect our center pixel
        float rangeInvalid = clamp((d - sampleDepth) / sampleDepth, 0.0, 1.0);

        // accumulate accessibility, use default value of 0.5 if right computations are not possible
        float delta = samplePos.z - sampleDepth;
        if (delta < 0.0) {
            accessibility += 1.0;
        } else if (delta <= 0.01) {
            accessibility += mix(1.0, 0.0, delta * 100.0);
        } else {
            accessibility += mix(0.0, 0.5, rangeInvalid);
        }
    }

    accessibility /= float(NUM_SAMPLES);

    oColor = vec4(vec3(accessibility), 1.0);
}