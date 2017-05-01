#version 300 es
// Fragment shader for horizon-based AO
// Based on "Image-Space Horizon-Based Ambient Occlusion
// by Louis Bavoli and Miguel Sainz
// Published in ShaderX7

precision mediump float; // set float to medium precision

// texture properties
uniform sampler2D uTexture; // the texture for the fragment
uniform sampler2D uOffsets; // The random rotation vectors
uniform sampler2D uNormals; // the texture for screen-space normals

const int NUM_RAYS = {num-rays};
const int RAY_LENGTH = {ray-length};
const int SAMPLES_PER_RAY = {samples-per-ray};
const float SEPARATION_DISTANCE = float(RAY_LENGTH) / float(SAMPLES_PER_RAY);
const float PI = 3.1415926535897932384626433832795;
const float SEPARATION_ANGLE = (PI * 2.0) / float(NUM_RAYS);
const float RADIUS = 0.2;
const float RADIUS2 = RADIUS * RADIUS;
const float tangentAngleBias = 0.01;

uniform vec2 uScreenSize; // The width and height of the screen
uniform mat4 uPMatrix; // the project matrix

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

// Output
out vec4 oColor;

// Gets the eye-space position at a particular screen UV coordinate
vec3 getPosition(vec2 uv) {
    vec4 pos = texture(uTexture, uv);
    pos.xyz /= pos.w;
    pos.xyz = pos.xyz * 2.0 - 1.0;
    return pos.xyz;
}

// Gets the eye-space normal at a particular screen UV coordinate
vec3 getNormal(vec2 uv) {
    return texture(uNormals, uv).xzy * 2.0 - 1.0;
}

void main(void) {
    // Get center sample
    vec3 centerPos = getPosition(vTexCoord);
    vec3 normal = getNormal(vTexCoord);

    // get random vector
    vec2 reflectionTexCoord = vTexCoord * uScreenSize / 4.0;
    vec4 rvec = texture(uOffsets, reflectionTexCoord) * 2.0 - 1.0;

    // Calculate center pixel coords
    vec2 centerPixel = vTexCoord * uScreenSize;
    centerPixel = round(centerPixel) + 0.5;

    // Cast equally spaced rays into the circle around the current pixel, taking several samples per ray
    float ao = 0.0;
    for (int r = 0; r < NUM_RAYS; ++r) {

        // Determine ray angle and vector
        float rayAngle = SEPARATION_ANGLE * float(r) + atan(rvec.y, rvec.x);
        vec3 rayVector = vec3(cos(rayAngle), sin(rayAngle), 0);
        vec2 separationVector = rayVector.xy * SEPARATION_DISTANCE;
        
        // Calculate tangent angle
        vec3 binormal = normalize(cross(rayVector, normal));
        vec3 tangentVector = normalize(cross(normal, binormal));
        float tangentAngle = atan(tangentVector.z, length(tangentVector.xy)) - tangentAngleBias;
        
        float maxAO = 0.0;
        float horizonAngle = 0.0;
        for (int i = 1; i <= SAMPLES_PER_RAY; ++i) {
            vec2 samplePixel = centerPixel + separationVector * float(i);
            samplePixel += rvec.zw; // random jitter
            samplePixel = round(samplePixel) + 0.5;

            // Convert to texture coords
            vec2 sampleTexCoord = samplePixel.xy;
            sampleTexCoord.xy /= uScreenSize;

            vec3 samplePos = getPosition(sampleTexCoord);

            // Ignore samples where depth delta is too big
            vec3 delta = centerPos - samplePos;
            float deltaLen = length(delta);
            //Update attentuation
            float falloff = clamp(deltaLen * deltaLen * (-1.0 / RADIUS2) + 1.0, 0.0, 1.0);

            if (deltaLen > RADIUS || falloff > 0.01) {
                // Calculate horizon angle for current sample
                float currentHorizon = atan(delta.z, length(delta.xy));

                // Keep it if it's greater
                if (currentHorizon > horizonAngle) {
                    horizonAngle = currentHorizon;
                }

                maxAO = max(maxAO, falloff * clamp(sin(horizonAngle) - sin(tangentAngle), 0.0, 1.0));     
            }     
        }
        
        ao += maxAO;
    }

    ao /= float(NUM_RAYS);
    ao = 1.0 - clamp(ao, 0.0, 1.0);

    oColor = vec4(vec3(ao), 1.0);
}