import { gl, INPUT_URL } from "./rasterize";

/**
 * Contains all data required for one OpenGL texture.  
 * Ensures that any given texture is only loaded one time, and subsequent requests for the texture result in a reference to the existing one.
 */
export class TextureData {
    textureBuffer: WebGLTexture;
    textureImage: HTMLImageElement;
    isSolidColor: boolean;

    static textureCache: Promise<TextureData>[] = [];

    /**
     * Creates a new 1x1 solid color texture.  Can be used as a place-holder, or to send a solid color into a shader that normally expects a texture.
     * @param color The color to fill the texture with.
     */
    static fromColor(color: Uint8Array): TextureData {
        // load a 1x1 gray image into texture for use when no texture, and until texture loads
        let newData = new TextureData();
        newData.textureBuffer = gl.createTexture(); // new texture struct for model
        gl.bindTexture(gl.TEXTURE_2D, newData.textureBuffer); // activate texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, color);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null); // texture
        newData.isSolidColor = true;

        return newData;
    }

    /**
     * Loads a texture from the given URL.
     * @param textureFile The texture file URL.
     */
    static fromFile(textureFile: string): Promise<TextureData> {
        // Check if a promise for the texture is already in the cache
        if (textureFile in TextureData.textureCache) {
            return TextureData.textureCache[textureFile];
        }
        
        // Texture is not in the cache, so load it
        let promise = new Promise(async function (resolve, reject) {
            let newData = new TextureData();
            newData.textureBuffer = gl.createTexture(); // new texture struct for model

            // Load texture asynchronously
            newData.textureImage = new Image(); // new image struct for texture
            // Add it to the DOM to get rid of warnings
            document.head.appendChild(newData.textureImage);

            newData.textureImage.onload = function () { // when texture image loaded...
                gl.bindTexture(gl.TEXTURE_2D, newData.textureBuffer); // activate new texture
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // invert vertical texcoord v
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // use linear filter for magnification
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); // use mipmap for minification
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, newData.textureImage); // norm 2D texture
                gl.generateMipmap(gl.TEXTURE_2D); // rebuild mipmap pyramid
                

                // Increase aniso filtering, if supported
                var ext = (
                    gl.getExtension('EXT_texture_filter_anisotropic') ||
                    gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
                    gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
                );

                if (ext){
                    var max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                    gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max);
                }

                gl.bindTexture(gl.TEXTURE_2D, null); // deactivate new texture

                newData.isSolidColor = false;
                
                resolve(newData);
            }
            newData.textureImage.onerror = function () { // when texture image load fails...
                reject("Unable to load texture");
                console.log("Unable to load texture " + textureFile);
            }
            newData.textureImage.crossOrigin = "Anonymous"; // allow cross origin load, please
            newData.textureImage.src = INPUT_URL + textureFile; // set image location
        });

        // Add promise to cache
        TextureData.textureCache[textureFile] = promise;

        // Return the promise
        return promise;
    }
}