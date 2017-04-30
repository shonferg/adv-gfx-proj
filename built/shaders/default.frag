#version 300 es

{{use-normal-map}}

precision mediump float; // set float to medium precision

const int LIGHT_COUNT = {{num-lights}}; // Will be replaced by JavaScript before building shader
const float LIGHT_RADIUS = 6.0;
const float LIGHT_RAIDUS2 = LIGHT_RADIUS * LIGHT_RADIUS;

// Inverse model view Matrix
uniform mat4 uInvTransMV;

// eye location
uniform vec3 uEyePosition; // the eye's position in world

// light properties
uniform vec3 uLightAmbient[8]; // the light's ambient color
uniform vec3 uLightDiffuse[8]; // the light's diffuse color
uniform vec3 uLightSpecular[8]; // the light's specular color
uniform vec3 uLightPosition[8]; // the light's position

// material properties
uniform vec3 uAmbient; // the ambient reflectivity
uniform vec3 uDiffuse; // the diffuse reflectivity
uniform vec3 uSpecular; // the specular reflectivity
uniform float uShininess; // the specular exponent

// texture properties
uniform sampler2D uTexture; // the texture for the fragment
uniform sampler2D uSpecTexture; // the texture for the fragment
#ifdef USE_NORMAL_MAP
uniform sampler2D uNormalTexture; // the texture for the fragment
#endif

// per-vertex input
in vec2 vVertexUV; // texture uv of fragment
in vec4 vScreenPos; // screen coord
in vec3 vWorldPos; // world xyz of fragment
in vec3 vVertexNormal; // normal of fragment
#ifdef USE_NORMAL_MAP
in vec3 vVertexTangent;
in vec3 vVertexBinormal;
#endif

// MRT output
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oPosition;
layout(location = 2) out vec4 oAmbientColor;
layout(location = 3) out vec4 oNormal;

void main(void) {

    vec3 normal = normalize(vVertexNormal);

#ifdef USE_NORMAL_MAP
    // Based on tutorial at:
    // http://rastertek.com/dx11tut20.html

    // Sample the pixel in the bump map.
    vec3 normSample = texture(uNormalTexture, vVertexUV.st).rgb;

    // Expand the range of the normal value from (0, +1) to (-1, +1).
    normSample = (normSample * 2.0f) - 1.0f;

    // Calculate the normal from the data in the bump map.
    vec3 tangent = normalize(vVertexTangent);
    vec3 binormal = normalize(vVertexBinormal);
    mat3 tangentFrame = mat3(tangent, binormal, normal);
    normal = tangentFrame * normSample;
    
    // Normalize the resulting bump normal.
    normal = normalize(normal);
#endif

    vec3 litColor = vec3(0,0,0);
    vec3 litAmbient = vec3(0,0,0);

    vec3 eye = normalize(uEyePosition - vWorldPos);
    vec3 specColor = texture(uSpecTexture, vec2(vVertexUV.s, vVertexUV.t)).rgb;


    for (int i = 0; i < LIGHT_COUNT; i++) {        
        // ambient term
        vec3 ambient = uAmbient * uLightAmbient[i];
    
        // diffuse term
        vec3 light = normalize(uLightPosition[i] - vWorldPos);
        float lambert = max(0.0, dot(normal, light));
        vec3 diffuse = uDiffuse * uLightDiffuse[i] * lambert; // diffuse term

        // specular term
        vec3 halfVec = normalize(light + eye);
        float highlight = pow(max(0.0, dot(normal, halfVec)), uShininess);
        vec3 specular = specColor * uSpecular * uLightSpecular[i] * highlight; // specular term

        // combine to find lit color
        vec3 thisLight = diffuse + specular;

        // Attenuate by distance
        float d = length(uLightPosition[i] - vWorldPos);
        float attenuation = LIGHT_RAIDUS2 / (LIGHT_RAIDUS2 + d * d);
        thisLight *= attenuation;
        ambient *= attenuation;

        // Add to accumulated color of all lights
        litColor += thisLight;
        litAmbient += ambient;
    }

    vec4 texColor = texture(uTexture, vec2(vVertexUV.s, vVertexUV.t));

    if (texColor.a < 0.1) {
        discard;
    }
    oColor = vec4(texColor.rgb * litColor, 1.0);
    
    oAmbientColor = vec4(texColor.rgb * litAmbient, 1.0);

    // Calculate screen normal
    vec3 screenNormal = mat3(uInvTransMV) * normal;
    screenNormal = normalize(screenNormal) * 0.5 + 0.5;
    oNormal = vec4(screenNormal, 1.0);
    oPosition = vScreenPos;
} // end main