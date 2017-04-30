import { vec3 } from "gl-matrix";
import { gl, INPUT_URL } from "./rasterize";
import { TextureData } from "./TextureData";

/**
 * JSON format for triangle data
 */
export interface MaterialJson {
    ambient: number[];
    diffuse: number[];
    specular: number[];
    n: number;
    alpha: number;
    texture: string|false;
    specTexture: string|false;
    normalTexture: string|false;
}

let DEFAULT_DIFFUSE_TEXTURE = null;
let DEFAULT_SPECULAR_TEXTURE = null;
let DEFAULT_NORMAL_TEXTURE = null;

/**
 * Holds the material data used to render 3D object instances.  Multiple instances can reference the same material data.
 */
export class MaterialData {
   
    diffuseTexture: TextureData;
    specularTexture: TextureData;
    normalTexture: TextureData;
    index: number;

    static nextIndex: number = 0;

    /**
     * Initializes material data.
     * @param ambient The ambient color.
     * @param diffuse The diffuse color.
     * @param specular The specular color.
     * @param n The specular power.
     * @param alpha The alpha.
     * @param textureFile The texture file or false if a texture is not used.
     */
    constructor(public ambient: vec3, public diffuse: vec3, public specular: vec3, public n: number, public alpha: number, diffTextureFile: string|false, specTextureFile: string|false, normalTextureFile: string|false) {        
        this.index = MaterialData.nextIndex++;
        
        // If default textures haven't been created yet, create them
        if (DEFAULT_DIFFUSE_TEXTURE == null) {
            DEFAULT_DIFFUSE_TEXTURE = TextureData.fromColor(new Uint8Array([64, 64, 64, 255]));
            DEFAULT_SPECULAR_TEXTURE = TextureData.fromColor(new Uint8Array([255, 255, 255, 255]));
            DEFAULT_NORMAL_TEXTURE = TextureData.fromColor(new Uint8Array([127, 127, 255, 255]));
        }

        // Start textures with default solid colors
        this.diffuseTexture = DEFAULT_DIFFUSE_TEXTURE;
        this.specularTexture = DEFAULT_SPECULAR_TEXTURE;
        this.normalTexture = DEFAULT_NORMAL_TEXTURE;
        
        let currentMaterial = this;
        // Replace them with images asyncronously if file names are given
        if (diffTextureFile != false) {
            TextureData.fromFile(diffTextureFile).then(function(newData) {
                currentMaterial.diffuseTexture = newData;
            });
        }
    
        if (specTextureFile != false) {
             TextureData.fromFile(specTextureFile).then(function(newData) {
                currentMaterial.specularTexture = newData;
            });
        }

        if (normalTextureFile != false) {
            TextureData.fromFile(normalTextureFile).then(function(newData) {
                currentMaterial.normalTexture = newData;
            });
        }
    }
    
    /**
     * Loads material data from a JSON data structure.
     * @param input JSON data structure.
     */
    static load(input: MaterialJson): MaterialData {        
        let ambient = vec3.fromValues(input.ambient[0], input.ambient[1], input.ambient[2]);
        let diffuse = vec3.fromValues(input.diffuse[0], input.diffuse[1], input.diffuse[2]);
        let specular = vec3.fromValues(input.specular[0], input.specular[1], input.specular[2]);
        
        return new MaterialData(ambient, diffuse, specular, input.n, input.alpha, input.texture, input.specTexture, input.normalTexture);
    }
}