#version 300 es

{{use-normal-map}}

in vec3 aVertexPosition; // vertex position
in vec3 aVertexNormal; // vertex normal
in vec2 aVertexUV; // vertex texture uv

#ifdef USE_NORMAL_MAP
in vec3 aVertexTangent;
in vec3 aVertexBinormal;
#endif

uniform mat4 umMatrix; // the model matrix
uniform mat4 upvMatrix; // the project view model matrix

out vec3 vWorldPos; // interpolated world position of vertex
out vec3 vVertexNormal; // interpolated normal for frag shader
out vec2 vVertexUV; // interpolated uv for frag shader
out vec4 vScreenPos; // screen coord

#ifdef USE_NORMAL_MAP
out vec3 vVertexTangent;
out vec3 vVertexBinormal;
#endif

void main(void) {

    // vertex position
    mat3 umRotMatrix = mat3(umMatrix);
    vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
    vWorldPos = vec3(vWorldPos4.x, vWorldPos4.y, vWorldPos4.z);
    gl_Position = upvMatrix * umMatrix * vec4(aVertexPosition, 1.0);

    // vertex normal (assume no non-uniform scale)
    vVertexNormal = normalize(umRotMatrix * aVertexNormal);

#ifdef USE_NORMAL_MAP
    vVertexTangent = normalize(umRotMatrix * aVertexTangent);
    vVertexBinormal = normalize(umRotMatrix * aVertexBinormal);
#endif

    // vertex uv
    vVertexUV = aVertexUV;

    // Screen pos
    vScreenPos = gl_Position;
}