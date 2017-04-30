#version 300 es

in vec2 aVertexPosition; // vertex position
in vec4 aFrustumVectors; // frustum vectors

out vec2 vTexCoord; // interpolated uv for frag shader
out vec4 vFrustumVector; // interpolated uv for frag shader

void main(void) {
    // passthrough
    gl_Position = vec4(aVertexPosition, 0.5, 1);
    vTexCoord = vec2(aVertexPosition * 0.5 + 0.5);
    vFrustumVector = aFrustumVectors;
}