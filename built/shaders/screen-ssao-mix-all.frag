#version 300 es
precision mediump float; // set float to medium precision

// texture properties
uniform sampler2D uTexture; // the color texture
uniform sampler2D uSsaoTexture; // the SSAO texture
uniform sampler2D uAmbientTexture; // the SSAO texture

uniform vec2 uScreenSize; // The width and height of the screen

// per-vertex input
in vec2 vTexCoord; // texture uv of fragment

// Output
out vec4 oColor;

void main(void) {
    // Get the RGB color from the color texture and then mix in the ambient factor from the SSAO texture
    vec3 color = texture(uTexture, vTexCoord).rgb;
    vec3 ambient = texture(uAmbientTexture, vTexCoord).rgb;
    float ssao = texture(uSsaoTexture, vTexCoord).r;

    oColor = vec4(ssao * (ambient + color), 1);
}