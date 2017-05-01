var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define("Plane", ["require", "exports", "gl-matrix"], function (require, exports, gl_matrix_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * A 3D plane with normal and plane constant d
     */
    class Plane {
        /**
         * Constructs a plane.
         * @param n The normal pointing toward the positive side of the plane.
         * @param d The d value of the plane equation.
         */
        constructor(n, d) {
            this.n = n;
            this.d = d;
        }
        /**
         * Constructs a plane given a normal and a point on the plane.
         * @param n The normal pointing toward the positive side of the plane.
         * @param p A point on the plane.
         * @returns The new plane.
         */
        static fromNormalAndPoint(n, p) {
            return new Plane(n, gl_matrix_1.vec3.dot(n, p));
        }
        /**
         * Creates a new plane by cloning the values of an existnig one.
         * Prevents changing values in one plane from affecting the other.
         * @param p The plane to clone.
         * @returns The cloned plane.
         */
        static clone(p) {
            return new Plane(gl_matrix_1.vec3.clone(p.n), p.d);
        }
        /**
         * Creates a new plane given three different points on the plane.
         * @param p0 A point on the plane.
         * @param p1 Another point on the plane.
         * @param p2 Another point on the plane.
         * @returns A new plane passing through all three points.
         */
        static from3Points(p0, p1, p2) {
            let n = gl_matrix_1.vec3.create();
            let v = gl_matrix_1.vec3.create();
            let u = gl_matrix_1.vec3.create();
            gl_matrix_1.vec3.subtract(v, p1, p0);
            gl_matrix_1.vec3.subtract(u, p2, p0);
            gl_matrix_1.vec3.cross(n, v, u);
            gl_matrix_1.vec3.normalize(n, n);
            return new Plane(n, gl_matrix_1.vec3.dot(n, p0));
        }
        /**
         * Normalizes the plane so that the length of the plane normal is one.
         */
        normalize() {
            let scale = 1 / gl_matrix_1.vec3.length(this.n);
            gl_matrix_1.vec3.scale(this.n, this.n, scale);
            this.d *= scale;
        }
        /**
         * Calculates the signed distance from the plane to a point.
         * @param p The point.
         * @returns The signed distance.
         */
        distanceToPoint(p) {
            // Insert point into plane equation
            return this.n[0] * p[0] + this.n[1] * p[1] + this.n[2] * p[2] + this.d;
        }
        /**
         * Returns some point on the plane.  The point calculated is just the simplest one to derive and has no other meaning.
         * @returns Some point on the plane.
         */
        pointOnPlane() {
            // Find an intercept by setting the other two values to zero.
            // Avoid dividing by zero if part of the normal is already zero.
            // If normal is properly normalized, then at least one value should be non-zero.
            if (this.n[0] != 0) {
                return gl_matrix_1.vec3.fromValues(-this.d / this.n[0], 0, 0);
            }
            else if (this.n[1] != 0) {
                return gl_matrix_1.vec3.fromValues(0, -this.d / this.n[1], 0);
            }
            else {
                return gl_matrix_1.vec3.fromValues(0, 0, -this.d / this.n[2]);
            }
        }
        /**
         * Calculates the point of intersection between the three given planes if they intersect in a single point.
         * Base on page 305 of Graphics Gems
         * Intersection of Three Planes by Ronald Goldman
         * @param p1 A plane.
         * @param p2 Another plane.
         * @param p3 Another plane.
         * @returns The single point where all three planes intersect or false if there is no such point.
         */
        static intersectionOf3Planes(p1, p2, p3) {
            let m = gl_matrix_1.mat3.fromValues(p1.n[0], p2.n[0], p3.n[0], p1.n[1], p2.n[1], p3.n[1], p1.n[2], p2.n[2], p3.n[2]);
            let det = gl_matrix_1.mat3.determinant(m);
            if (det == 0) {
                // No intersection
                return false;
            }
            let temp1 = gl_matrix_1.vec3.create();
            let temp2 = gl_matrix_1.vec3.create();
            let temp3 = gl_matrix_1.vec3.create();
            // d = point dot normal already
            gl_matrix_1.vec3.cross(temp1, p2.n, p3.n);
            gl_matrix_1.vec3.scale(temp1, temp1, p1.d);
            gl_matrix_1.vec3.cross(temp2, p3.n, p1.n);
            gl_matrix_1.vec3.scale(temp2, temp2, p2.d);
            gl_matrix_1.vec3.cross(temp3, p1.n, p2.n);
            gl_matrix_1.vec3.scale(temp3, temp3, p3.d);
            gl_matrix_1.vec3.add(temp1, temp1, temp2);
            gl_matrix_1.vec3.add(temp1, temp1, temp3);
            gl_matrix_1.vec3.scale(temp1, temp1, 1 / det);
            gl_matrix_1.vec3.negate(temp1, temp1);
            return temp1;
        }
        /**
         * Calculates the point, if any, where a line segment intersects the plane.
         * Based on page 99 of Mathematics for 3D Game Programming and Computer Graphics
         * y Eric Lengyel
         * @param p1 One end of the line segment.
         * @param p2 The other end of the line segment.
         * @returns The point where the line segment intersects the plane, or false if they do not intersect.
         */
        intersectLine(p1, p2) {
            let temp = gl_matrix_1.vec3.create();
            gl_matrix_1.vec3.subtract(temp, p2, p1);
            gl_matrix_1.vec3.normalize(temp, temp);
            let L = gl_matrix_1.vec4.fromValues(this.n[0], this.n[1], this.n[2], this.d);
            let S = gl_matrix_1.vec4.fromValues(p1[0], p1[1], p1[2], 1);
            let V = gl_matrix_1.vec4.fromValues(temp[0], temp[1], temp[2], 0);
            let denom = gl_matrix_1.vec4.dot(L, V);
            if (denom == 0) {
                return false;
            }
            let t = -(gl_matrix_1.vec4.dot(L, S) / denom);
            gl_matrix_1.vec3.scale(temp, temp, t);
            gl_matrix_1.vec3.add(temp, gl_matrix_1.vec3.fromValues(S[0], S[1], S[2]), temp);
            return temp;
        }
        /**
         * Clips an edge loop against this plane.
         * Based on page 236-238 of Mathematics for 3D Game Programming and Computer Graphics
         * By Eric Lengyel
         * @param vertices A list of vertices arranged into a loop.
         * @returns A new list of vertices that all lie on or inside the plane.
         */
        clipConvexPolygon(vertices) {
            // 4D plane
            let L = gl_matrix_1.vec4.fromValues(this.n[0], this.n[1], this.n[2], this.d);
            // Classify the vertices as lying on positive or negative sides of the plane
            let classified = [];
            let allOutside = true;
            for (let v of vertices) {
                let dist = this.distanceToPoint(v);
                // Consider anything very close to the plane as being on it
                if (0 < dist && dist <= 0.001) {
                    dist = 0;
                    allOutside = false;
                }
                else if (dist > 0) {
                    dist = 1;
                }
                else {
                    dist = -1;
                    allOutside = false;
                }
                classified.push({ v: v, dist: dist });
            }
            // Check if the polygon is completely outside
            if (allOutside) {
                return false;
            }
            // Visit each pair of verticies in the loop
            let newVertices = [];
            let vertCount = classified.length;
            for (let i = 0; i < vertCount; ++i) {
                let j = (i < vertCount - 1 ? i + 1 : 0);
                let ci = classified[i].dist;
                let cj = classified[j].dist;
                let pi = classified[i].v;
                let pj = classified[j].v;
                if (ci != 1) {
                    // Keep vertex that is inside plane
                    newVertices.push(pi);
                }
                if ((ci != 1 && cj == 1) || (ci == 1 && cj != 1)) {
                    // insert a new vertex on the point between the
                    // two original ones that intersects the plane
                    let intersection = this.intersectLine(pi, pj);
                    if (intersection != false) {
                        newVertices.push(intersection);
                    }
                }
            }
            return newVertices;
        }
    }
    exports.Plane = Plane;
});
define("AABB", ["require", "exports", "gl-matrix"], function (require, exports, gl_matrix_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Enum for intersection test results.
     */
    var Intersection;
    (function (Intersection) {
        /** Object one was completely outside object two. */
        Intersection[Intersection["OUTSIDE"] = 0] = "OUTSIDE";
        /** Object one was completely inside object two. */
        Intersection[Intersection["INSIDE"] = 1] = "INSIDE";
        /** The two objects overlap to some degree. */
        Intersection[Intersection["INTERSECTING"] = 2] = "INTERSECTING";
    })(Intersection = exports.Intersection || (exports.Intersection = {}));
    /**
     * An axis-aligned bounding box.
     */
    class AABB {
        /**
         * Create a new axis-aligned bounding box.
         * @param min The minimum extent of the box.
         * @param max The maximum extent of the box.
         */
        constructor(min, max) {
            this.min = min;
            this.max = max;
        }
        /**
         * Creates an empty bounding box with min and max set to positive and negative infinity.  Points can be added to expand the box.
         * @returns A new empty axis-aligned bounding box.
         */
        static createEmpty() {
            return new AABB(gl_matrix_2.vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), gl_matrix_2.vec3.fromValues(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE));
        }
        /**
         * Calculates the volume of the bounding box.
         * @returns The volume.
         */
        volume() {
            let e = this.extents();
            return e[0] * e[1] * e[2];
        }
        /**
         * Calculates the length, width, and height of the box.
         * @returns The extents.
         */
        extents() {
            let temp = gl_matrix_2.vec3.create();
            gl_matrix_2.vec3.subtract(temp, this.max, this.min);
            return temp;
        }
        /**
         * Calculates the center of the box.
         * @returns The center.
         */
        center() {
            let temp = gl_matrix_2.vec3.create();
            gl_matrix_2.vec3.add(temp, this.max, this.min);
            gl_matrix_2.vec3.scale(temp, temp, 0.5);
            return temp;
        }
        /**
         * Generates a list of all 8 corners of the bounding box.
         * @returns The corners.
         */
        corners() {
            let corners = [];
            for (let x of [this.min[0], this.max[0]]) {
                for (let y of [this.min[1], this.max[1]]) {
                    for (let z of [this.min[2], this.max[2]]) {
                        corners.push(gl_matrix_2.vec3.fromValues(x, y, z));
                    }
                }
            }
            return corners;
        }
        /**
         * Creates a clone of the given bounding box so that values can be changed without one affecting the other.
         * @param b The AABB to clone.
         * @returns The cloned AABB.
         */
        static clone(b) {
            return new AABB(gl_matrix_2.vec3.clone(b.min), gl_matrix_2.vec3.clone(b.max));
        }
        /**
         * Determines whether this bounding boxes intersects with another one.
         * @param b The bounding box to compare this one to.
         * @returns True if the boxes intersect, false otherwise.
         */
        intersects(b) {
            for (let i = 0; i < 3; ++i) {
                if (this.min[i] > b.max[i] || b.min[i] > this.max[i]) {
                    return false;
                }
            }
            return true;
        }
        /**
         * Calculates a half-diagonal vector for the box.  This is useful in bounding-box/plane collision testing.
         * @returns The half-diagonal vector.
         */
        halfDiagonal() {
            let temp = gl_matrix_2.vec3.create();
            gl_matrix_2.vec3.subtract(temp, this.max, this.min);
            gl_matrix_2.vec3.scale(temp, temp, 0.5);
            return temp;
        }
        /**
         * Adds a point to the bounding box, causing it to expand to fit the new point.
         * @param p The point to add.
         */
        addPoint(p) {
            gl_matrix_2.vec3.max(this.max, this.max, p);
            gl_matrix_2.vec3.min(this.min, this.min, p);
        }
        /**
         * creates a new box that contains two other boxes.
         * @param a The first box.
         * @param b The second box.
         * @returns The merged box.
         */
        static merge(a, b) {
            let max = gl_matrix_2.vec3.create();
            let min = gl_matrix_2.vec3.create();
            gl_matrix_2.vec3.min(min, a.min, b.min);
            gl_matrix_2.vec3.max(max, a.max, b.max);
            return new AABB(min, max);
        }
        /**
         * Determine if two boxes are essentially equal (within a small epsilon)
         * @param a The first box.
         * @param b The second box
         * @returns True if the boxes are roughtly equivalent, false otherwise.
         */
        static areSimilar(a, b) {
            let dmax = gl_matrix_2.vec3.create();
            let dmin = gl_matrix_2.vec3.create();
            gl_matrix_2.vec3.subtract(dmax, a.max, b.max);
            gl_matrix_2.vec3.subtract(dmin, a.min, b.min);
            let epsilon = 0.0001;
            return (Math.abs(dmax[0]) < epsilon &&
                Math.abs(dmax[1]) < epsilon &&
                Math.abs(dmax[2]) < epsilon &&
                Math.abs(dmin[0]) < epsilon &&
                Math.abs(dmin[1]) < epsilon &&
                Math.abs(dmin[2]) < epsilon);
        }
        /**
         * Determines whether a given point is contained within the bounds of the box.
         * @param v The point to check.
         * @returns True if the point is inside (or right on the edge), false otherwise.
         */
        containsPoint(v) {
            return v[0] >= this.min[0] && v[0] <= this.max[0] &&
                v[1] >= this.min[1] && v[1] <= this.max[1] &&
                v[2] >= this.min[2] && v[2] <= this.max[2];
        }
        /**
         * AABB/Ray intersection test.
         * Based on Fast, Branchless Ray/Bounding Box Intersections
         * by Tavian Barnes
         * https://tavianator.com/fast-branchless-raybounding-box-intersections/
         * @param origin The origin point of the ray.
         * @param dir The direction of the ray.
         * @returns True if the ray intersects the AABB, false otherwise.
         */
        doesRayIntersect(origin, dir) {
            let tmin = Number.MIN_VALUE;
            let tmax = Number.MAX_VALUE;
            let epsilon = 0.0000001;
            if (Math.abs(dir[0]) > epsilon) {
                let tx1 = (this.min[0] - origin[0]) / dir[0];
                let tx2 = (this.max[0] - origin[0]) / dir[0];
                tmin = Math.max(tmin, Math.min(tx1, tx2));
                tmax = Math.min(tmax, Math.max(tx1, tx2));
            }
            if (Math.abs(dir[1]) > epsilon) {
                let ty1 = (this.min[1] - origin[1]) / dir[1];
                let ty2 = (this.max[1] - origin[1]) / dir[1];
                tmin = Math.max(tmin, Math.min(ty1, ty2));
                tmax = Math.min(tmax, Math.max(ty1, ty2));
            }
            return tmax >= tmin;
        }
        /**
         * AABB/Plane intersection test.
         * ased on page 756 of Real Time Rendering
         * By Akenine-Moller, Haines, and Hoffman
         * @param plane The plane to check for intersection.
         * @returns Whether the AAB is completely outside, completely inside, or intersecting the plane.
         */
        planeIntersect(plane) {
            let c = this.center();
            let h = this.halfDiagonal();
            let e = h[0] * Math.abs(plane.n[0]) + h[1] * Math.abs(plane.n[1]) + h[2] * Math.abs(plane.n[2]);
            let s = gl_matrix_2.vec3.dot(c, plane.n) + plane.d;
            if (s - e > 0) {
                return Intersection.OUTSIDE;
            }
            else if (s + e < 0) {
                return Intersection.INSIDE;
            }
            else {
                return Intersection.INTERSECTING;
            }
        }
    }
    exports.AABB = AABB;
});
define("TextureData", ["require", "exports", "rasterize"], function (require, exports, rasterize_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class TextureData {
        static fromColor(color) {
            // load a 1x1 gray image into texture for use when no texture, and until texture loads
            let newData = new TextureData();
            newData.textureBuffer = rasterize_1.gl.createTexture(); // new texture struct for model
            rasterize_1.gl.bindTexture(rasterize_1.gl.TEXTURE_2D, newData.textureBuffer); // activate texture
            rasterize_1.gl.texImage2D(rasterize_1.gl.TEXTURE_2D, 0, rasterize_1.gl.RGBA, 1, 1, 0, rasterize_1.gl.RGBA, rasterize_1.gl.UNSIGNED_BYTE, color);
            rasterize_1.gl.texParameteri(rasterize_1.gl.TEXTURE_2D, rasterize_1.gl.TEXTURE_MAG_FILTER, rasterize_1.gl.NEAREST);
            rasterize_1.gl.texParameteri(rasterize_1.gl.TEXTURE_2D, rasterize_1.gl.TEXTURE_MIN_FILTER, rasterize_1.gl.NEAREST);
            rasterize_1.gl.bindTexture(rasterize_1.gl.TEXTURE_2D, null); // texture
            newData.isSolidColor = true;
            return newData;
        }
        /**
         * Loads a texture from the given URL.
         * @param textureFile The texture file URL.
         */
        static fromFile(textureFile) {
            // Check if a promise for the texture is already in the cache
            if (textureFile in TextureData.textureCache) {
                return TextureData.textureCache[textureFile];
            }
            // Texture is not in the cache, so load it
            let promise = new Promise(function (resolve, reject) {
                return __awaiter(this, void 0, void 0, function* () {
                    let newData = new TextureData();
                    newData.textureBuffer = rasterize_1.gl.createTexture(); // new texture struct for model
                    // Load texture asynchronously
                    newData.textureImage = new Image(); // new image struct for texture
                    // Add it to the DOM to get rid of warnings
                    document.head.appendChild(newData.textureImage);
                    newData.textureImage.onload = function () {
                        rasterize_1.gl.bindTexture(rasterize_1.gl.TEXTURE_2D, newData.textureBuffer); // activate new texture
                        rasterize_1.gl.pixelStorei(rasterize_1.gl.UNPACK_FLIP_Y_WEBGL, true); // invert vertical texcoord v
                        rasterize_1.gl.texParameteri(rasterize_1.gl.TEXTURE_2D, rasterize_1.gl.TEXTURE_MAG_FILTER, rasterize_1.gl.LINEAR); // use linear filter for magnification
                        rasterize_1.gl.texParameteri(rasterize_1.gl.TEXTURE_2D, rasterize_1.gl.TEXTURE_MIN_FILTER, rasterize_1.gl.LINEAR_MIPMAP_LINEAR); // use mipmap for minification
                        rasterize_1.gl.texImage2D(rasterize_1.gl.TEXTURE_2D, 0, rasterize_1.gl.RGBA, rasterize_1.gl.RGBA, rasterize_1.gl.UNSIGNED_BYTE, newData.textureImage); // norm 2D texture
                        rasterize_1.gl.generateMipmap(rasterize_1.gl.TEXTURE_2D); // rebuild mipmap pyramid
                        // Increase aniso filtering, if supported
                        var ext = (rasterize_1.gl.getExtension('EXT_texture_filter_anisotropic') ||
                            rasterize_1.gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
                            rasterize_1.gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'));
                        if (ext) {
                            var max = rasterize_1.gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                            rasterize_1.gl.texParameterf(rasterize_1.gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max);
                        }
                        rasterize_1.gl.bindTexture(rasterize_1.gl.TEXTURE_2D, null); // deactivate new texture
                        newData.isSolidColor = false;
                        resolve(newData);
                    };
                    newData.textureImage.onerror = function () {
                        reject("Unable to load texture");
                        console.log("Unable to load texture " + textureFile);
                    };
                    newData.textureImage.crossOrigin = "Anonymous"; // allow cross origin load, please
                    newData.textureImage.src = rasterize_1.INPUT_URL + textureFile; // set image location
                });
            });
            // Add promise to cache
            TextureData.textureCache[textureFile] = promise;
            // Return the promise
            return promise;
        }
    }
    TextureData.textureCache = [];
    exports.TextureData = TextureData;
});
define("MaterialData", ["require", "exports", "gl-matrix", "TextureData"], function (require, exports, gl_matrix_3, TextureData_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let DEFAULT_DIFFUSE_TEXTURE = null;
    let DEFAULT_SPECULAR_TEXTURE = null;
    let DEFAULT_NORMAL_TEXTURE = null;
    /**
     * Holds the material data used to render 3D object instances.  Multiple instances can reference the same material data.
     */
    class MaterialData {
        /**
         * Initializes material data.
         * @param ambient The ambient color.
         * @param diffuse The diffuse color.
         * @param specular The specular color.
         * @param n The specular power.
         * @param alpha The alpha.
         * @param textureFile The texture file or false if a texture is not used.
         */
        constructor(ambient, diffuse, specular, n, alpha, diffTextureFile, specTextureFile, normalTextureFile) {
            this.ambient = ambient;
            this.diffuse = diffuse;
            this.specular = specular;
            this.n = n;
            this.alpha = alpha;
            this.index = MaterialData.nextIndex++;
            // If default textures haven't been created yet, create them
            if (DEFAULT_DIFFUSE_TEXTURE == null) {
                DEFAULT_DIFFUSE_TEXTURE = TextureData_1.TextureData.fromColor(new Uint8Array([64, 64, 64, 255]));
                DEFAULT_SPECULAR_TEXTURE = TextureData_1.TextureData.fromColor(new Uint8Array([255, 255, 255, 255]));
                DEFAULT_NORMAL_TEXTURE = TextureData_1.TextureData.fromColor(new Uint8Array([127, 127, 255, 255]));
            }
            // Start textures with default solid colors
            this.diffuseTexture = DEFAULT_DIFFUSE_TEXTURE;
            this.specularTexture = DEFAULT_SPECULAR_TEXTURE;
            this.normalTexture = DEFAULT_NORMAL_TEXTURE;
            let currentMaterial = this;
            // Replace them with images asyncronously if file names are given
            if (diffTextureFile != false) {
                TextureData_1.TextureData.fromFile(diffTextureFile).then(function (newData) {
                    currentMaterial.diffuseTexture = newData;
                });
            }
            if (specTextureFile != false) {
                TextureData_1.TextureData.fromFile(specTextureFile).then(function (newData) {
                    currentMaterial.specularTexture = newData;
                });
            }
            if (normalTextureFile != false) {
                TextureData_1.TextureData.fromFile(normalTextureFile).then(function (newData) {
                    currentMaterial.normalTexture = newData;
                });
            }
        }
        /**
         * Loads material data from a JSON data structure.
         * @param input JSON data structure.
         */
        static load(input) {
            let ambient = gl_matrix_3.vec3.fromValues(input.ambient[0], input.ambient[1], input.ambient[2]);
            let diffuse = gl_matrix_3.vec3.fromValues(input.diffuse[0], input.diffuse[1], input.diffuse[2]);
            let specular = gl_matrix_3.vec3.fromValues(input.specular[0], input.specular[1], input.specular[2]);
            return new MaterialData(ambient, diffuse, specular, input.n, input.alpha, input.texture, input.specTexture, input.normalTexture);
        }
    }
    MaterialData.nextIndex = 0;
    exports.MaterialData = MaterialData;
});
define("util", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Reads a text file
     * Based on an example from Mozilla Developer Network to use ES6 Promise with an XMLHttpRequest:
     * https://github.com/mdn/js-examples/blob/master/promises-test/index.html
     * @param url The URL of the text file to load
     */
    function getTextFile(url) {
        // Create new promise with the Promise() constructor;
        // This has as its argument a function
        // with two parameters, resolve and reject
        return new Promise(function (resolve, reject) {
            // Standard XHR to load an image
            var request = new XMLHttpRequest();
            request.open('GET', url + "?/rand=" + Math.round(Math.random() * 100000).toString());
            request.responseType = "text";
            // When the request loads, check whether it was successful
            request.onload = function () {
                if (request.status === 200) {
                    // If successful, resolve the promise by passing back the request response
                    resolve(request.response);
                }
                else {
                    // If it fails, reject the promise with a error message
                    reject(Error('File at ' + url + ' didn\'t load successfully; error code:' + request.statusText));
                }
            };
            request.onerror = function () {
                // Also deal with the case when the entire request fails to begin with
                // This is probably a network error, so reject the promise with an appropriate message
                reject(Error('There was a network error while trying to load: ' + url));
            };
            // Send the request
            request.send();
        });
    }
    exports.getTextFile = getTextFile;
    /**
     * Reads a JSON file from the passed URL
     * Based on an example from Mozilla Developer Network to use ES6 Promise with an XMLHttpRequest:
     * https://github.com/mdn/js-examples/blob/master/promises-test/index.html
     * @param url The URL of the text file to load
     */
    function getJSONFile(url) {
        // Create new promise with the Promise() constructor;
        // This has as its argument a function
        // with two parameters, resolve and reject
        return new Promise(function (resolve, reject) {
            // Standard XHR to load an image
            var request = new XMLHttpRequest();
            request.open('GET', url + "?/rand=" + Math.round(Math.random() * 100000).toString());
            request.responseType = "json";
            request.overrideMimeType("application/json");
            // When the request loads, check whether it was successful
            request.onload = function () {
                if (request.status === 200) {
                    // If successful, resolve the promise by passing back the request response
                    resolve(request.response);
                }
                else {
                    // If it fails, reject the promise with a error message
                    reject(Error('File at ' + url + ' didn\'t load successfully; error code:' + request.statusText));
                }
            };
            request.onerror = function () {
                // Also deal with the case when the entire request fails to begin with
                // This is probably a network error, so reject the promise with an appropriate message
                reject(Error('There was a network error while trying to load: ' + url));
            };
            // Send the request
            request.send();
        });
    }
    exports.getJSONFile = getJSONFile;
});
define("shaderPrograms/ShaderProgram", ["require", "exports", "rasterize", "util"], function (require, exports, rasterize_2, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class OptionalUniform {
        constructor(name, owner, source) {
            this.enabled = source.frag.indexOf(name) != -1 || source.vert.indexOf(name) != -1;
            if (this.enabled) {
                this.location = owner.initUniform(name);
            }
        }
        ifEnabled(action) {
            if (this.enabled) {
                action(this.location);
            }
        }
    }
    exports.OptionalUniform = OptionalUniform;
    class ShaderProgram {
        constructor(source) {
            this.attributes = [];
            this.index = ShaderProgram.nextIndex++;
            try {
                // create vertex shader
                this.vertexShader = rasterize_2.gl.createShader(rasterize_2.gl.VERTEX_SHADER);
                rasterize_2.gl.shaderSource(this.vertexShader, source.vert); // attach code to shader
                rasterize_2.gl.compileShader(this.vertexShader); // compile the code for gpu execution
                if (!rasterize_2.gl.getShaderParameter(this.vertexShader, rasterize_2.gl.COMPILE_STATUS)) {
                    // bad vertex shader compile
                    throw "error during vertex shader compile: " + rasterize_2.gl.getShaderInfoLog(this.vertexShader);
                }
                // create frag shader
                this.fragmentShader = rasterize_2.gl.createShader(rasterize_2.gl.FRAGMENT_SHADER);
                rasterize_2.gl.shaderSource(this.fragmentShader, source.frag); // attach code to shader
                rasterize_2.gl.compileShader(this.fragmentShader); // compile the code for gpu execution
                if (!rasterize_2.gl.getShaderParameter(this.fragmentShader, rasterize_2.gl.COMPILE_STATUS)) {
                    // bad frag shader compile
                    throw "error during fragment shader compile: " + rasterize_2.gl.getShaderInfoLog(this.fragmentShader);
                }
                this.program = rasterize_2.gl.createProgram(); // create the single shader program
                rasterize_2.gl.attachShader(this.program, this.fragmentShader); // put frag shader in program
                rasterize_2.gl.attachShader(this.program, this.vertexShader); // put vertex shader in program
                rasterize_2.gl.linkProgram(this.program); // link program into gl context
                if (!rasterize_2.gl.getProgramParameter(this.program, rasterize_2.gl.LINK_STATUS)) {
                    throw "error during shader program linking: " + rasterize_2.gl.getProgramInfoLog(this.program);
                }
                else {
                    rasterize_2.gl.useProgram(this.program); // activate shader program (frag and vert)
                }
            }
            catch (e) {
                console.log(e);
            }
        }
        initUniform(name) {
            return rasterize_2.gl.getUniformLocation(this.program, name);
        }
        initAttribute(name) {
            let loc = rasterize_2.gl.getAttribLocation(this.program, name); // ptr to vertex pos attrib
            this.attributes.push(loc);
            return loc;
        }
        begin() {
            rasterize_2.gl.useProgram(this.program);
            for (let loc of this.attributes) {
                rasterize_2.gl.enableVertexAttribArray(loc);
            }
        }
        end() {
            for (let loc of this.attributes) {
                rasterize_2.gl.disableVertexAttribArray(loc);
            }
            rasterize_2.gl.useProgram(null);
        }
        static fetchSource(vertexShaderBaseName, fragmentShaderBaseName) {
            return __awaiter(this, void 0, void 0, function* () {
                let vSourceResult = util_1.getTextFile("shaders/" + vertexShaderBaseName + ".vert");
                let fSourceResult = util_1.getTextFile("shaders/" + fragmentShaderBaseName + ".frag");
                // Await loading of shader code
                let vSourceCode = yield vSourceResult;
                let fSourceCode = yield fSourceResult;
                return { vert: vSourceCode, frag: fSourceCode };
            });
        }
    }
    ShaderProgram.nextIndex = 0;
    exports.ShaderProgram = ShaderProgram;
});
define("shaderPrograms/DefaultShaderProgram", ["require", "exports", "shaderPrograms/ShaderProgram", "rasterize", "gl-matrix"], function (require, exports, ShaderProgram_1, rasterize_3, gl_matrix_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class DefaultShaderProgram extends ShaderProgram_1.ShaderProgram {
        constructor(source, Eye, lights, useNormalMap) {
            source.frag = source.frag.replace("{{num-lights}}", lights.length.toString());
            source.frag = source.frag.replace("{{use-normal-map}}", useNormalMap ? "#define USE_NORMAL_MAP" : "");
            source.vert = source.vert.replace("{{use-normal-map}}", useNormalMap ? "#define USE_NORMAL_MAP" : "");
            super(source);
            this.useNormalMap = useNormalMap;
            this.vPosAttribLoc = this.initAttribute("aVertexPosition");
            this.vNormAttribLoc = this.initAttribute("aVertexNormal");
            this.vUVAttribLoc = this.initAttribute("aVertexUV");
            if (this.useNormalMap) {
                this.vTangentAttribLoc = this.initAttribute("aVertexTangent");
                this.vBinormalAttribLoc = this.initAttribute("aVertexBinormal");
            }
            this.eyePositionULoc = this.initUniform("uEyePosition");
            this.lightAmbientULoc = this.initUniform("uLightAmbient");
            this.lightDiffuseULoc = this.initUniform("uLightDiffuse");
            this.lightSpecularULoc = this.initUniform("uLightSpecular");
            this.lightPositionULoc = this.initUniform("uLightPosition");
            this.mInvTransMVULoc = this.initUniform("uInvTransMV");
            this.mMatrixULoc = this.initUniform("umMatrix");
            this.pvMatrixULoc = this.initUniform("upvMatrix");
            this.ambientULoc = this.initUniform("uAmbient");
            this.diffuseULoc = this.initUniform("uDiffuse");
            this.specularULoc = this.initUniform("uSpecular");
            this.shininessULoc = this.initUniform("uShininess");
            this.textureULoc = this.initUniform("uTexture");
            this.specTextureULoc = this.initUniform("uSpecTexture");
            if (this.useNormalMap) {
                this.normalTextureULoc = this.initUniform("uNormalTexture");
            }
            // Separate light data into separate arrays
            var position = [];
            var ambient = [];
            var diffuse = [];
            var specular = [];
            for (let l of lights) {
                position.push(l.position[0], l.position[1], l.position[2]);
                ambient.push(l.ambient[0], l.ambient[1], l.ambient[2]);
                diffuse.push(l.diffuse[0], l.diffuse[1], l.diffuse[2]);
                specular.push(l.specular[0], l.specular[1], l.specular[2]);
            }
            // Set initial uniform values
            rasterize_3.gl.uniform3fv(this.eyePositionULoc, Eye); // pass in the eye's position
            rasterize_3.gl.uniform3fv(this.lightAmbientULoc, ambient); // pass in the light's ambient emission
            rasterize_3.gl.uniform3fv(this.lightDiffuseULoc, diffuse); // pass in the light's diffuse emission
            rasterize_3.gl.uniform3fv(this.lightSpecularULoc, specular); // pass in the light's specular emission
            rasterize_3.gl.uniform3fv(this.lightPositionULoc, position); // pass in the light's positions
        }
        setViewProjectionMatrix(pvMatrix) {
            // If the shader changed, set frame-constant values
            rasterize_3.gl.uniform3fv(this.eyePositionULoc, rasterize_3.Eye);
            rasterize_3.gl.uniformMatrix4fv(this.pvMatrixULoc, false, pvMatrix); // pass in the pv matrix
        }
        setModelMatrix(mMatrix, mView) {
            rasterize_3.gl.uniformMatrix4fv(this.mMatrixULoc, false, mMatrix); // pass in the m matrix
            let mITMV = gl_matrix_4.mat4.create();
            gl_matrix_4.mat4.mul(mITMV, mView, mMatrix);
            gl_matrix_4.mat4.invert(mITMV, mITMV);
            gl_matrix_4.mat4.transpose(mITMV, mITMV);
            rasterize_3.gl.uniformMatrix4fv(this.mInvTransMVULoc, false, mITMV); // pass in the m matrix
        }
        setMaterial(material) {
            // reflectivity: feed to the fragment shader
            rasterize_3.gl.uniform3fv(this.ambientULoc, material.ambient); // pass in the ambient reflectivity
            rasterize_3.gl.uniform3fv(this.diffuseULoc, material.diffuse); // pass in the diffuse reflectivity
            rasterize_3.gl.uniform3fv(this.specularULoc, material.specular); // pass in the specular reflectivity
            rasterize_3.gl.uniform1f(this.shininessULoc, material.n); // pass in the specular exponent
            if (material.diffuseTexture != null) {
                rasterize_3.gl.activeTexture(rasterize_3.gl.TEXTURE0); // bind to active texture 0 (the first)
                rasterize_3.gl.bindTexture(rasterize_3.gl.TEXTURE_2D, material.diffuseTexture.textureBuffer); // bind the set's texture
                rasterize_3.gl.uniform1i(this.textureULoc, 0); // pass in the texture and active texture 0
            }
            if (material.specularTexture != null) {
                rasterize_3.gl.activeTexture(rasterize_3.gl.TEXTURE1); // bind to active texture 0 (the first)
                rasterize_3.gl.bindTexture(rasterize_3.gl.TEXTURE_2D, material.specularTexture.textureBuffer); // bind the set's texture
                rasterize_3.gl.uniform1i(this.specTextureULoc, 1); // pass in the texture and active texture 1
            }
            if (this.useNormalMap) {
                if (material.normalTexture != null) {
                    rasterize_3.gl.activeTexture(rasterize_3.gl.TEXTURE2); // bind to active texture 0 (the first)
                    rasterize_3.gl.bindTexture(rasterize_3.gl.TEXTURE_2D, material.normalTexture.textureBuffer); // bind the set's texture
                    rasterize_3.gl.uniform1i(this.normalTextureULoc, 2); // pass in the texture and active texture 1
                }
            }
        }
        setMesh(mesh) {
            // position, normal and uv buffers: activate and feed into vertex shader
            rasterize_3.gl.bindBuffer(rasterize_3.gl.ARRAY_BUFFER, mesh.vertexBuffer); // activate position
            rasterize_3.gl.vertexAttribPointer(this.vPosAttribLoc, 3, rasterize_3.gl.FLOAT, false, 0, 0); // feed
            rasterize_3.gl.bindBuffer(rasterize_3.gl.ARRAY_BUFFER, mesh.normalBuffer); // activate normal
            rasterize_3.gl.vertexAttribPointer(this.vNormAttribLoc, 3, rasterize_3.gl.FLOAT, false, 0, 0); // feed
            if (this.useNormalMap) {
                rasterize_3.gl.bindBuffer(rasterize_3.gl.ARRAY_BUFFER, mesh.tangentBuffer);
                rasterize_3.gl.vertexAttribPointer(this.vTangentAttribLoc, 3, rasterize_3.gl.FLOAT, false, 0, 0); // feed
                rasterize_3.gl.bindBuffer(rasterize_3.gl.ARRAY_BUFFER, mesh.binormalBuffer);
                rasterize_3.gl.vertexAttribPointer(this.vBinormalAttribLoc, 3, rasterize_3.gl.FLOAT, false, 0, 0); // feed
            }
            rasterize_3.gl.bindBuffer(rasterize_3.gl.ARRAY_BUFFER, mesh.uvBuffer); // activate uv
            rasterize_3.gl.vertexAttribPointer(this.vUVAttribLoc, 2, rasterize_3.gl.FLOAT, false, 0, 0); // feed
            // Activate Index buffer
            rasterize_3.gl.bindBuffer(rasterize_3.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        }
        draw(mesh, primitiveType) {
            // Render triangles
            rasterize_3.gl.drawElements(primitiveType, mesh.triangles.length * 3, rasterize_3.gl.UNSIGNED_SHORT, 0);
            return mesh.triangles.length;
        }
    }
    exports.DefaultShaderProgram = DefaultShaderProgram;
});
define("TreeNode", ["require", "exports", "AABB"], function (require, exports, AABB_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * A node in the bounding volume hierarchy tree used to speed up frustum intersection tests
     */
    class TreeNode {
        /**
         * Creates a new TreeNode.
         */
        constructor() {
            this.aabb = AABB_1.AABB.createEmpty();
            this.children = [];
        }
        appendVisibleSet(frustum, drawAll, visibleSet) {
            // Try to cull AABB against the frustum
            if (drawAll == false) {
                let intersect = frustum.aabbIntersect(this.aabb);
                if (intersect == AABB_1.Intersection.INSIDE) {
                    // Completely inside, so set drawAll to true to avoid future checks
                    drawAll = true;
                }
                else if (intersect == AABB_1.Intersection.OUTSIDE) {
                    // Completely outside, so do not continue to children.
                    return;
                }
            }
            for (let child of this.children) {
                child.appendVisibleSet(frustum, drawAll, visibleSet);
            }
        }
        /**
         * Updates the bounds of all objects in the culling hierarchy recursively.
         */
        updateBounds() {
            for (let child of this.children) {
                // Update bounds of child and then combine it into the bounds of this object
                child.updateBounds();
                this.aabb = AABB_1.AABB.merge(this.aabb, child.aabb);
            }
        }
        static beginShader(newShader) {
            if (TreeNode.currentShader == newShader) {
                // The shader is already active.  Do nothing.
                return false;
            }
            // End previous shader, if any
            TreeNode.endShader();
            // Set new shader and begin using it
            TreeNode.currentShader = newShader;
            TreeNode.currentShader.begin();
            return true;
        }
        static endShader() {
            if (TreeNode.currentShader != null) {
                TreeNode.currentShader.end();
                TreeNode.currentShader = null;
            }
        }
    }
    exports.TreeNode = TreeNode;
});
define("MeshInstance", ["require", "exports", "gl-matrix", "rasterize", "AABB", "TreeNode"], function (require, exports, gl_matrix_5, rasterize_4, AABB_2, TreeNode_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * An individual mesh positioned in the 3D world.
     * It can share mesh and material data with other instances, but it has its own transform data.
     */
    class MeshInstance extends TreeNode_1.TreeNode {
        /**
         * Constructs a new mesh instance with identity transforms and gl.TRIANGLES primitive type.
         * @param data The mesh data for the instance.
         * @param material The material data for the instance.
         */
        constructor(data, material, shader) {
            super();
            this.data = data;
            this.material = material;
            this.shader = shader;
            this.position = gl_matrix_5.vec3.fromValues(0, 0, 0);
            this.rotation = gl_matrix_5.quat.create();
            this.scale = gl_matrix_5.vec3.fromValues(1, 1, 1);
            this.primitiveType = rasterize_4.gl.TRIANGLES;
        }
        appendVisibleSet(frustum, drawAll, visibleSet) {
            // Try to cull AABB against the frustum
            if (drawAll == false) {
                let intersect = frustum.aabbIntersect(this.aabb);
                if (intersect == AABB_2.Intersection.INSIDE) {
                    // Completely inside, so set drawAll to true to avoid future checks
                    drawAll = true;
                }
                else if (intersect == AABB_2.Intersection.OUTSIDE) {
                    // Completely outside, so do not continue to children.
                    return;
                }
            }
            // Item is within frustum, so add it to set
            visibleSet.push(this);
        }
        /**
         * Updates the bounds of all objects in the culling hierarchy recursively.
         */
        updateBounds() {
            // Find the min/max of the verticies in world coordinates
            let mMatrix = gl_matrix_5.mat4.create();
            gl_matrix_5.mat4.fromRotationTranslationScale(mMatrix, this.rotation, this.position, this.scale);
            this.aabb.max = gl_matrix_5.vec3.fromValues(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE); // bbox corner
            this.aabb.min = gl_matrix_5.vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE); // other corner
            let temp = gl_matrix_5.vec3.create();
            for (let v of this.data.vertices) {
                // Transform to world coords
                gl_matrix_5.vec3.transformMat4(temp, v, mMatrix);
                // update bounding volume min and max
                gl_matrix_5.vec3.max(this.aabb.max, this.aabb.max, temp);
                gl_matrix_5.vec3.min(this.aabb.min, this.aabb.min, temp);
            }
        }
    }
    exports.MeshInstance = MeshInstance;
});
define("SoundBuffer", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Represents a sound file playable through WebAudio.
     * Based on Tutorial by Boris Smus at
     * https://www.html5rocks.com/en/tutorials/webaudio/intro/
     */
    class SoundBuffer {
        /**
         * Initializes a new sound buffer with an existing AudioBuffer
         * @param context A WebAudio context.
         * @param buffer A WebAudio buffer
         */
        constructor(context, buffer) {
            this.context = context;
            this.buffer = buffer;
            this.source = this.context.createBufferSource();
            this.gainNode = this.context.createGain();
            this.gainNode.gain.value = 0;
            this.source.buffer = this.buffer;
            this.source.connect(this.gainNode);
            this.gainNode.connect(this.context.destination);
        }
        /**
         * Creates a new SoundBuffer from the given URL asyncronously
         * Based on an example from Mozilla Developer Network to use ES6 Promise with an XMLHttpRequest:
         * https://github.com/mdn/js-examples/blob/master/promises-test/index.html
         * @param context A WebAudio conext
         * @param url The URL of the sound file to load
         */
        static create(context, url) {
            // Create new promise with the Promise() constructor;
            // This has as its argument a function
            // with two parameters, resolve and reject
            return new Promise(function (resolve, reject) {
                // Standard XHR to load an image
                var request = new XMLHttpRequest();
                request.open('GET', url);
                request.responseType = 'arraybuffer';
                // When the request loads, check whether it was successful
                request.onload = function () {
                    if (request.status === 200) {
                        // If successful, resolve the promise by passing back the request response
                        context.decodeAudioData(request.response, function (buffer) {
                            resolve(new SoundBuffer(context, buffer));
                        });
                    }
                    else {
                        // If it fails, reject the promise with a error message
                        reject(Error('Couldn\'t load sound from: ' + url + ' error code:' + request.statusText));
                    }
                };
                request.onerror = function () {
                    // Also deal with the case when the entire request fails to begin with
                    // This is probably a network error, so reject the promise with an appropriate message
                    reject(Error('There was a network error while trying to load: ' + url));
                };
                // Send the request
                request.send();
            });
        }
        /**
         * Starts playback of the sound.
         */
        play() {
            this.source.start(0);
        }
        /**
         * Sets the volume of the sound.
         * @param value The volume to set between 0 and 1.
         */
        setGain(value) {
            this.gainNode.gain.value = value * value;
        }
        /**
         * Sets whether the sound should loop or not.
         * @param value
         */
        setLoop(value) {
            this.source.loop = value;
        }
    }
    exports.SoundBuffer = SoundBuffer;
});
define("shaderPrograms/ScreenShaderProgram", ["require", "exports", "shaderPrograms/ShaderProgram", "rasterize"], function (require, exports, ShaderProgram_2, rasterize_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ScreenShaderProgram extends ShaderProgram_2.ShaderProgram {
        constructor(source) {
            super(source);
            this.vPosAttribLoc = this.initAttribute("aVertexPosition");
            this.textureULoc = this.initUniform("uTexture");
            this.uScreenSizeLoc = this.initUniform("uScreenSize");
            // Optional uniforms
            this.vMatrix = new ShaderProgram_2.OptionalUniform("uVMatrix", this, source);
            this.pMatrix = new ShaderProgram_2.OptionalUniform("uPMatrix", this, source);
            this.invVMatrix = new ShaderProgram_2.OptionalUniform("uInvVMatrix", this, source);
            this.invPMatrix = new ShaderProgram_2.OptionalUniform("uInvPMatrix", this, source);
            // Set screen size uniform
            rasterize_5.gl.uniform2f(this.uScreenSizeLoc, rasterize_5.WIDTH, rasterize_5.HEIGHT);
        }
        setupTextures(mainTexture) {
            rasterize_5.gl.uniform1i(this.textureULoc, 0); // pass in the texture and active texture 0
            rasterize_5.gl.activeTexture(rasterize_5.gl.TEXTURE0);
            rasterize_5.gl.bindTexture(rasterize_5.gl.TEXTURE_2D, mainTexture); // bind the set's texture
        }
    }
    exports.ScreenShaderProgram = ScreenShaderProgram;
});
define("ScreenQuad", ["require", "exports", "rasterize"], function (require, exports, rasterize_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ScreenQuad {
        constructor() {
            this.vertexBuffer = rasterize_6.gl.createBuffer();
            rasterize_6.gl.bindBuffer(rasterize_6.gl.ARRAY_BUFFER, this.vertexBuffer);
            rasterize_6.gl.bufferData(rasterize_6.gl.ARRAY_BUFFER, ScreenQuad.vertices, rasterize_6.gl.STATIC_DRAW);
            this.indexBuffer = rasterize_6.gl.createBuffer();
            rasterize_6.gl.bindBuffer(rasterize_6.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            rasterize_6.gl.bufferData(rasterize_6.gl.ELEMENT_ARRAY_BUFFER, ScreenQuad.indices, rasterize_6.gl.STATIC_DRAW);
        }
        setProjection(pMatrix, vMatrix, invPMatrix, invVMatrix) {
            this.pMatrix = pMatrix;
            this.vMatrix = vMatrix;
            this.invPMatrix = invPMatrix;
            this.invVMatrix = invVMatrix;
        }
        draw(program, texture) {
            // Activate program
            program.begin();
            program.setupTextures(texture);
            // position, normal and uv buffers: activate and feed into vertex shader
            rasterize_6.gl.bindBuffer(rasterize_6.gl.ARRAY_BUFFER, this.vertexBuffer); // activate position
            rasterize_6.gl.vertexAttribPointer(program.vPosAttribLoc, 2, rasterize_6.gl.FLOAT, false, 0, 0); // feed
            // Optional uniforms
            program.vMatrix.ifEnabled((location) => {
                rasterize_6.gl.uniformMatrix4fv(location, false, this.vMatrix);
            });
            program.pMatrix.ifEnabled((location) => {
                rasterize_6.gl.uniformMatrix4fv(location, false, this.pMatrix);
            });
            program.invVMatrix.ifEnabled((location) => {
                rasterize_6.gl.uniformMatrix4fv(location, false, this.invVMatrix);
            });
            program.invPMatrix.ifEnabled((location) => {
                rasterize_6.gl.uniformMatrix4fv(location, false, this.invPMatrix);
            });
            // Activate Index buffer
            rasterize_6.gl.bindBuffer(rasterize_6.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            // Render lines
            rasterize_6.gl.drawElements(rasterize_6.gl.TRIANGLES, 6, rasterize_6.gl.UNSIGNED_SHORT, 0);
            //Disable program
            program.end();
        }
    }
    ScreenQuad.vertices = new Float32Array([
        1, 1,
        -1, 1,
        -1, -1,
        1, -1
    ]);
    ScreenQuad.indices = new Uint16Array([2, 1, 0, 3, 2, 0]);
    exports.ScreenQuad = ScreenQuad;
});
define("shaderPrograms/SSAOShaderProgram", ["require", "exports", "shaderPrograms/ScreenShaderProgram", "gl-matrix", "rasterize"], function (require, exports, ScreenShaderProgram_1, gl_matrix_6, rasterize_7) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const SSAO_SCREEN_AREA = 0.05;
    class SSAOShaderProgram extends ScreenShaderProgram_1.ScreenShaderProgram {
        constructor(source, numSamples) {
            source.frag = source.frag.replace("{{num-samples}}", numSamples.toString());
            super(source);
            this.sampleVectorsULoc = this.initUniform("sampleVectors");
            this.uOffsetsLoc = this.initUniform("uOffsets");
            if (numSamples == 8 || numSamples == 16 || numSamples == 24 || numSamples == 32) {
                this.genCubeCornerVectors(numSamples);
            }
            else {
                this.genRandomVectors(numSamples);
            }
            this.genRandomOffsetTexture();
        }
        genCubeCornerVectors(numSamples) {
            let offsetScale = 0.01;
            let offsetScaleStep = 1 + 2.4 / numSamples;
            let shaderVectors = [];
            // Rather than random vectors, use corners of increasingly smaller cubes
            for (let i = 0; i < (numSamples / 8); i++) {
                for (let x of [-1, 1]) {
                    for (let y of [-1, 1]) {
                        for (let z of [-1, 1]) {
                            // here we use cube corners and give it different lengths
                            let v = gl_matrix_6.vec3.fromValues(x, y, z);
                            let vOffset = gl_matrix_6.vec3.scale(v, gl_matrix_6.vec3.normalize(v, v), offsetScale *= offsetScaleStep);
                            shaderVectors.push(v[0], v[1], v[2]);
                        }
                    }
                }
            }
            // Set shader uniform to sample offets
            rasterize_7.gl.uniform3fv(this.sampleVectorsULoc, shaderVectors);
        }
        genRandomVectors(numSamples) {
            // Geneate random sample offsets
            let sampleVectors = [];
            let temp = gl_matrix_6.vec3.create();
            for (let i = 0; i < numSamples; ++i) {
                gl_matrix_6.vec3.random(temp, Math.random());
                sampleVectors.push(gl_matrix_6.vec3.clone(temp));
            }
            // Convert vectors for shader
            let shaderVectors = [];
            for (let v of sampleVectors) {
                // Size to SSAO_SCREEN_AREA
                gl_matrix_6.vec3.scale(v, v, SSAO_SCREEN_AREA);
                // Add to output array
                shaderVectors.push(v[0], v[1], v[2]);
            }
            // Set shader uniform to sample offets
            rasterize_7.gl.uniform3fv(this.sampleVectorsULoc, shaderVectors);
        }
        begin() {
            super.begin();
        }
        genRandomOffsetTexture() {
            // Generate a 4 x 4 texture of random vectors
            let pixelData = [];
            for (let i = 0; i < 16; ++i) {
                let v = gl_matrix_6.vec2.create();
                gl_matrix_6.vec2.random(v);
                gl_matrix_6.vec2.scale(v, v, 0.5);
                gl_matrix_6.vec2.add(v, v, gl_matrix_6.vec2.fromValues(0.5, 0.5));
                pixelData.push(Math.round(v[0] * 255), Math.round(v[1] * 255), 128);
            }
            this.offsetTexture = rasterize_7.gl.createTexture();
            rasterize_7.gl.bindTexture(rasterize_7.gl.TEXTURE_2D, this.offsetTexture);
            rasterize_7.gl.texParameteri(rasterize_7.gl.TEXTURE_2D, rasterize_7.gl.TEXTURE_WRAP_S, rasterize_7.gl.REPEAT);
            rasterize_7.gl.texParameteri(rasterize_7.gl.TEXTURE_2D, rasterize_7.gl.TEXTURE_WRAP_T, rasterize_7.gl.REPEAT);
            rasterize_7.gl.texParameteri(rasterize_7.gl.TEXTURE_2D, rasterize_7.gl.TEXTURE_MAG_FILTER, rasterize_7.gl.NEAREST);
            rasterize_7.gl.texParameteri(rasterize_7.gl.TEXTURE_2D, rasterize_7.gl.TEXTURE_MIN_FILTER, rasterize_7.gl.NEAREST);
            rasterize_7.gl.texImage2D(rasterize_7.gl.TEXTURE_2D, 0, rasterize_7.gl.RGB, 4, 4, 0, rasterize_7.gl.RGB, rasterize_7.gl.UNSIGNED_BYTE, new Uint8Array(pixelData));
            rasterize_7.gl.uniform1i(this.uOffsetsLoc, 1);
            rasterize_7.gl.bindTexture(rasterize_7.gl.TEXTURE_2D, null);
        }
        setupTextures(mainTexture) {
            super.setupTextures(mainTexture);
            rasterize_7.gl.activeTexture(rasterize_7.gl.TEXTURE1);
            rasterize_7.gl.bindTexture(rasterize_7.gl.TEXTURE_2D, this.offsetTexture); // bind the set's texture
            rasterize_7.gl.uniform1i(this.uOffsetsLoc, 1);
        }
    }
    exports.SSAOShaderProgram = SSAOShaderProgram;
});
define("shaderPrograms/SSAOBlurShaderProgram", ["require", "exports", "rasterize", "shaderPrograms/ScreenShaderProgram"], function (require, exports, rasterize_8, ScreenShaderProgram_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SSAOBlurShaderProgram extends ScreenShaderProgram_2.ScreenShaderProgram {
        constructor(source) {
            super(source);
            this.vPosAttribLoc = this.initAttribute("aVertexPosition");
            this.depthTextureUloc = this.initUniform("uDepthTexture");
        }
        setupTextures(mainTexture) {
            super.setupTextures(mainTexture);
            rasterize_8.gl.activeTexture(rasterize_8.gl.TEXTURE1);
            rasterize_8.gl.bindTexture(rasterize_8.gl.TEXTURE_2D, this.depthTexture); // bind the set's texture
            rasterize_8.gl.uniform1i(this.depthTextureUloc, 1);
        }
    }
    exports.SSAOBlurShaderProgram = SSAOBlurShaderProgram;
});
define("shaderPrograms/SSAOMixShaderProgram", ["require", "exports", "rasterize", "shaderPrograms/ScreenShaderProgram"], function (require, exports, rasterize_9, ScreenShaderProgram_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SSAOMixShaderProgram extends ScreenShaderProgram_3.ScreenShaderProgram {
        constructor(source) {
            super(source);
            this.vPosAttribLoc = this.initAttribute("aVertexPosition");
            this.ssaoTextureUloc = this.initUniform("uSsaoTexture");
            this.ambientTextureUloc = this.initUniform("uAmbientTexture");
        }
        setupTextures(mainTexture) {
            super.setupTextures(mainTexture);
            rasterize_9.gl.activeTexture(rasterize_9.gl.TEXTURE1);
            rasterize_9.gl.bindTexture(rasterize_9.gl.TEXTURE_2D, this.ssaoTexture); // bind the set's texture
            rasterize_9.gl.uniform1i(this.ssaoTextureUloc, 1);
            rasterize_9.gl.activeTexture(rasterize_9.gl.TEXTURE2);
            rasterize_9.gl.bindTexture(rasterize_9.gl.TEXTURE_2D, this.ambientTexture); // bind the set's texture
            rasterize_9.gl.uniform1i(this.ambientTextureUloc, 2);
        }
    }
    exports.SSAOMixShaderProgram = SSAOMixShaderProgram;
});
define("ObjModelNode", ["require", "exports", "MeshData", "gl-matrix", "AABB", "TreeNode", "MeshInstance", "rasterize", "MaterialData", "util"], function (require, exports, MeshData_1, gl_matrix_7, AABB_3, TreeNode_2, MeshInstance_1, rasterize_10, MaterialData_1, util_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ObjVertex {
    }
    class ObjMesh {
        constructor() {
            this.triangles = [];
        }
    }
    /**
     * A version of MeshData which loads limited information from OBJ files into WebGL buffers.
     */
    class ObjModelNode extends TreeNode_2.TreeNode {
        constructor() {
            super();
        }
        /**
         * Decodes a subset of the OBJ file format.
         * Based on the OBJ file spec:
         * http://www.cs.utah.edu/~boulos/cs3505/obj_spec.pdf
         * @param text OBJ file text
         */
        static create(objUrl, mtlUrl, position, scale, scaleTo1by1, defaultMaterial) {
            return new Promise(function (resolve, reject) {
                return __awaiter(this, void 0, void 0, function* () {
                    let objFileText = yield util_2.getTextFile(rasterize_10.INPUT_URL + objUrl);
                    if (objFileText == null) {
                        reject(Error("Unable to load OBJ file!"));
                    }
                    let materials = [];
                    let useNormalMap = [];
                    // Create default material
                    materials[0] = MaterialData_1.MaterialData.load(defaultMaterial);
                    useNormalMap[0] = defaultMaterial.normalTexture != false;
                    if (mtlUrl != null) {
                        let mtlFileText = yield util_2.getTextFile(rasterize_10.INPUT_URL + mtlUrl);
                        if (mtlUrl == null) {
                            reject(Error("Unable to load MTL file!"));
                        }
                        let mtlMats = ObjModelNode.processMtlFile(mtlFileText, defaultMaterial);
                        for (let key in mtlMats) {
                            materials[key] = MaterialData_1.MaterialData.load(mtlMats[key]);
                            useNormalMap[key] = mtlMats[key].normalTexture != false;
                        }
                    }
                    let node = new ObjModelNode();
                    resolve(node); // return the node now... meshes will be added to it as they are finished loading
                    let objPositions = [];
                    let objNormals = [];
                    let objTexCoords = [];
                    let objMeshes = [];
                    let currentMesh = new ObjMesh();
                    currentMesh.groupName == null;
                    objMeshes.push(currentMesh);
                    // interpret lines from OBJ file
                    let currentStart = 0;
                    let nextNewLine = 0;
                    let line;
                    while (currentStart != -1) {
                        // Split is too slow as it creates a huge array of strings, so use
                        // indexOf and substr to fetch the lines of the file
                        nextNewLine = objFileText.indexOf("\n", currentStart);
                        if (nextNewLine != -1) {
                            line = objFileText.substr(currentStart, nextNewLine - currentStart);
                            currentStart = nextNewLine + 1;
                        }
                        else {
                            line = objFileText.substr(currentStart);
                            currentStart = -1;
                        }
                        // Process line
                        let parts = line.split(" ");
                        if (parts.length == 0) {
                            continue;
                        }
                        let partsLength = parts.length;
                        let numbers = [];
                        for (let p = 0; p < partsLength; ++p) {
                            parts[p] = parts[p].trim();
                            let n = parseFloat(parts[p]);
                            if (!isNaN(n)) {
                                numbers.push(n);
                            }
                        }
                        let numLen = numbers.length;
                        switch (parts[0]) {
                            case "g":
                                if (currentMesh.groupName != null) {
                                    // This is not the first group, so create a new mesh and push it into the list
                                    currentMesh = new ObjMesh();
                                    objMeshes.push(currentMesh);
                                }
                                // Always set the name, even if it's the first one
                                currentMesh.groupName = parts[1];
                                break;
                            case "usemtl":
                                // Also make a new group if the material changes mid-group
                                if (currentMesh.groupName != null && currentMesh.triangles.length > 0) {
                                    // This is not the first group, so create a new mesh and push it into the list
                                    let previousGroupName = currentMesh.groupName;
                                    currentMesh = new ObjMesh();
                                    currentMesh.groupName = previousGroupName;
                                    objMeshes.push(currentMesh);
                                }
                                currentMesh.materialName = parts[1];
                                break;
                            case "v":
                                if (numLen > 2) {
                                    let v = gl_matrix_7.vec3.fromValues(numbers[0], numbers[1], numbers[2]);
                                    objPositions.push(v);
                                }
                                break;
                            case "vt":
                                if (numLen > 1) {
                                    let uv = gl_matrix_7.vec2.fromValues(numbers[0], numbers[1]);
                                    objTexCoords.push(uv);
                                }
                                break;
                            case "vn":
                                if (numLen > 2) {
                                    let n = gl_matrix_7.vec3.fromValues(numbers[0], numbers[1], numbers[2]);
                                    objNormals.push(n);
                                }
                                break;
                            case "f":
                                // Faces may contain only vertex indices or separate vertex, normal, and texcoord indices
                                // Ex 1: f 9854 9798 9800 9856
                                // Ex 2: f 12107/12457/12107 12108/12458/12108 12109/12459/12109
                                let faceVerts = [];
                                for (let p = 1; p < parts.length; ++p) {
                                    let newVertex = new ObjVertex();
                                    let currentPart = parts[p].trim();
                                    if (currentPart == "") {
                                        continue;
                                    }
                                    if (currentPart.includes("/")) {
                                        let indices = currentPart.split("/");
                                        newVertex.positionIndex = parseFloat(indices[0]) - 1;
                                        newVertex.texCoordIndex = parseFloat(indices[1]) - 1;
                                        if (indices.length >= 3) {
                                            newVertex.normalIndex = parseFloat(indices[2]) - 1;
                                        }
                                        else {
                                            newVertex.normalIndex = newVertex.positionIndex;
                                        }
                                    }
                                    else {
                                        newVertex.positionIndex = parseFloat(currentPart) - 1;
                                        newVertex.texCoordIndex = newVertex.positionIndex;
                                        newVertex.normalIndex = newVertex.positionIndex;
                                    }
                                    faceVerts.push(newVertex);
                                }
                                let vertCount = faceVerts.length;
                                if (vertCount > 2) {
                                    // Make a triangle fan
                                    for (let n = 2; n < vertCount; ++n) {
                                        currentMesh.triangles.push([faceVerts[0], faceVerts[n - 1], faceVerts[n]]);
                                    }
                                }
                                break;
                        }
                    }
                    if (scaleTo1by1) {
                        // Find extents
                        let bounds = AABB_3.AABB.createEmpty();
                        for (let v of objPositions) {
                            bounds.addPoint(v);
                        }
                        // Normalize positions to 0,1 cube
                        let extents = bounds.extents();
                        let scaleFactor = 1 / Math.max(Math.max(extents[0], extents[1]), extents[2]);
                        for (let v of objPositions) {
                            gl_matrix_7.vec3.subtract(v, v, bounds.min);
                            gl_matrix_7.vec3.scale(v, v, scaleFactor);
                        }
                    }
                    // Check if uvs were provided.  Only support normals from files that provide uvs for every vertex.
                    if (objTexCoords.length == 0) {
                        // Use spherical coordinates from center so texture is visible, but probably not in any particular place
                        for (let v of objPositions) {
                            let temp = gl_matrix_7.vec3.clone(v);
                            gl_matrix_7.vec3.subtract(temp, temp, gl_matrix_7.vec3.fromValues(0.5, 0.5, 0.5));
                            let r = gl_matrix_7.vec3.length(temp);
                            let theta = Math.acos(temp[1] / r);
                            let rho = Math.atan2(temp[2], temp[0]);
                            objTexCoords.push(gl_matrix_7.vec2.fromValues(rho, -theta));
                        }
                    }
                    // Check if normals were provided.  Only support normals from files that provide normals for every vertex.
                    if (objNormals.length == 0) {
                        // Initialize normals to zero for all vertices
                        for (let v of objPositions) {
                            objNormals.push(gl_matrix_7.vec3.create());
                        }
                        for (let m of objMeshes) {
                            for (let t of m.triangles) {
                                let p0 = objPositions[t[0].positionIndex];
                                let p1 = objPositions[t[1].positionIndex];
                                let p2 = objPositions[t[2].positionIndex];
                                // Calculate normal for triangle
                                let tmp1 = gl_matrix_7.vec3.create();
                                gl_matrix_7.vec3.subtract(tmp1, p1, p0);
                                let n = gl_matrix_7.vec3.create();
                                let tmp2 = gl_matrix_7.vec3.create();
                                gl_matrix_7.vec3.subtract(tmp2, p2, p0);
                                gl_matrix_7.vec3.cross(n, tmp1, tmp2);
                                gl_matrix_7.vec3.normalize(n, n);
                                // Add normal values to running totals.  Since all normals are unit length, normalizing them at the end will result in a correct average.
                                let n0 = objNormals[t[0].normalIndex];
                                let n1 = objNormals[t[1].normalIndex];
                                let n2 = objNormals[t[2].normalIndex];
                                gl_matrix_7.vec3.add(n0, n0, n);
                                gl_matrix_7.vec3.add(n1, n1, n);
                                gl_matrix_7.vec3.add(n2, n2, n);
                            }
                        }
                        // Normalize all the normals at the end to average them
                        for (let n of objNormals) {
                            gl_matrix_7.vec3.normalize(n, n);
                        }
                    }
                    for (let m of objMeshes) {
                        // Create mesh data asycronously so the game doesn't stall when loading big meshes (like the world)
                        ObjModelNode.processMesh(m, objPositions, objNormals, objTexCoords).then(function (data) {
                            // Try to look up material by group name
                            let instanceMaterial = null;
                            let instanceUsesNormalMap = false;
                            if (m.materialName != null && m.materialName in materials) {
                                instanceMaterial = materials[m.materialName];
                                instanceUsesNormalMap = useNormalMap[m.materialName];
                            }
                            else {
                                instanceMaterial = materials[0];
                                instanceUsesNormalMap = useNormalMap[0];
                            }
                            let instance = new MeshInstance_1.MeshInstance(data, instanceMaterial, instanceUsesNormalMap ? rasterize_10.normalMapShaderProgram : rasterize_10.defaultShaderProgram);
                            if (instanceUsesNormalMap) {
                                data.updateTangentSpace();
                            }
                            instance.position = position;
                            instance.scale = scale;
                            instance.updateBounds();
                            node.children.push(instance);
                        });
                    }
                });
            });
        }
        static processMesh(m, objPositions, objNormals, objTexCoords) {
            return new Promise(function (resolve, reject) {
                return __awaiter(this, void 0, void 0, function* () {
                    // Convert OBJ faces to unique vertex/texture/normal combinations
                    let positions = [];
                    let texCoords = [];
                    let normals = [];
                    let triangles = [];
                    let vertexIndex = [];
                    let nextVertex = 0;
                    for (let t of m.triangles) {
                        let newTriangle = [];
                        for (let i = 0; i < 3; ++i) {
                            let v = t[i];
                            if (v.positionIndex in vertexIndex) {
                                if (v.texCoordIndex in vertexIndex[v.positionIndex]) {
                                    if (v.normalIndex in vertexIndex[v.positionIndex][v.texCoordIndex]) {
                                        // Vertex already exists.  Use it.
                                        newTriangle[i] = vertexIndex[v.positionIndex][v.texCoordIndex][v.normalIndex];
                                        continue;
                                    }
                                }
                                else {
                                    vertexIndex[v.positionIndex][v.texCoordIndex] = [];
                                }
                            }
                            else {
                                vertexIndex[v.positionIndex] = [];
                                vertexIndex[v.positionIndex][v.texCoordIndex] = [];
                            }
                            // This unique combination of position, texcoord, and UV has not yet been seen
                            // Create a new vertex.
                            vertexIndex[v.positionIndex][v.texCoordIndex][v.normalIndex] = nextVertex;
                            positions[nextVertex] = objPositions[v.positionIndex];
                            texCoords[nextVertex] = objTexCoords[v.texCoordIndex];
                            normals[nextVertex] = objNormals[v.normalIndex];
                            newTriangle[i] = nextVertex;
                            nextVertex++;
                        }
                        triangles.push(newTriangle);
                    }
                    let data = new MeshData_1.MeshData();
                    data.update({ vertices: positions, normals: normals, uvs: texCoords, triangles: triangles });
                    resolve(data);
                });
            });
        }
        static processMtlFile(mtlFileText, defaultMaterial) {
            let materials = [];
            /* Ex
            newmtl leaf
                Ns 10.0000
                Ni 1.5000
                d 1.0000
                Tr 0.0000
                Tf 1.0000 1.0000 1.0000
                illum 2
                Ka 0.5880 0.5880 0.5880
                Kd 0.5880 0.5880 0.5880
                Ks 0.0000 0.0000 0.0000
                Ke 0.0000 0.0000 0.0000
                map_Ka sponza/textures/sponza_thorn_diff.png
                map_Kd sponza/textures/sponza_thorn_diff.png
                map_d sponza/textures/sponza_thorn_mask.png
                map_bump sponza/textures/sponza_thorn_ddn.png
                bump sponza/textures/sponza_thorn_ddn.png
            */
            let currentMaterial = null;
            let currentMaterialName = null;
            let currentStart = 0;
            let nextNewLine = 0;
            let line;
            while (currentStart != -1) {
                // Split is too slow as it creates a huge array of strings, so use
                // indexOf and substr to fetch the lines of the file
                nextNewLine = mtlFileText.indexOf("\n", currentStart);
                if (nextNewLine != -1) {
                    line = mtlFileText.substr(currentStart, nextNewLine - currentStart);
                    currentStart = nextNewLine + 1;
                }
                else {
                    line = mtlFileText.substr(currentStart);
                    currentStart = -1;
                }
                let parts = line.trim().split(" ");
                if (parts.length == 0) {
                    continue;
                }
                let partsLength = parts.length;
                let numbers = [];
                for (let p = 0; p < partsLength; ++p) {
                    parts[p] = parts[p].trim();
                    let n = parseFloat(parts[p]);
                    if (!isNaN(n)) {
                        numbers.push(n);
                    }
                }
                let numLen = numbers.length;
                switch (parts[0]) {
                    case "newmtl":
                        // Clone from defaults to start
                        currentMaterial = JSON.parse(JSON.stringify(defaultMaterial));
                        materials[parts[1]] = currentMaterial;
                        break;
                    case "Ns":
                        currentMaterial.n = numbers[0];
                        break;
                    case "d":
                        currentMaterial.alpha = numbers[0];
                        break;
                    case "Ka":
                        currentMaterial.ambient[0] = numbers[0];
                        currentMaterial.ambient[1] = numbers[1];
                        currentMaterial.ambient[2] = numbers[2];
                        break;
                    case "Kd":
                        currentMaterial.diffuse[0] = numbers[0];
                        currentMaterial.diffuse[1] = numbers[1];
                        currentMaterial.diffuse[2] = numbers[2];
                        break;
                    case "Ks":
                        currentMaterial.specular[0] = numbers[0];
                        currentMaterial.specular[1] = numbers[1];
                        currentMaterial.specular[2] = numbers[2];
                        break;
                    case "map_Kd":
                        currentMaterial.texture = parts[1];
                        break;
                    case "map_Ks":
                        currentMaterial.specTexture = parts[1];
                        break;
                    case "map_bump":
                        currentMaterial.normalTexture = parts[1];
                        break;
                }
            }
            return materials;
        }
    }
    exports.ObjModelNode = ObjModelNode;
});
define("shaderPrograms/SSAOPlusShaderProgram", ["require", "exports", "gl-matrix", "rasterize", "shaderPrograms/SSAOShaderProgram"], function (require, exports, gl_matrix_8, rasterize_11, SSAOShaderProgram_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const SSAO_SCREEN_AREA = 0.05;
    class SSAOPlusShaderProgram extends SSAOShaderProgram_1.SSAOShaderProgram {
        constructor(source, numSamples) {
            super(source, numSamples);
            this.normalTextureUloc = this.initUniform("uNormals");
            this.genRandomHemisphereVectors(numSamples);
        }
        genRandomHemisphereVectors(numSamples) {
            // Geneate random sample offsets
            let sampleVectors = [];
            let temp = gl_matrix_8.vec3.create();
            let centralVector = gl_matrix_8.vec3.fromValues(0, 1, 0);
            while (sampleVectors.length < numSamples) {
                gl_matrix_8.vec3.random(temp, Math.random());
                if (gl_matrix_8.vec3.dot(centralVector, temp) <= 0) {
                    sampleVectors.push(gl_matrix_8.vec3.clone(temp));
                }
            }
            // Convert vectors for shader
            let shaderVectors = [];
            for (let v of sampleVectors) {
                // Size to SSAO_SCREEN_AREA
                gl_matrix_8.vec3.scale(v, v, SSAO_SCREEN_AREA);
                // Add to output array
                shaderVectors.push(v[0], v[1], v[2]);
            }
            // Set shader uniform to sample offets
            rasterize_11.gl.uniform3fv(this.sampleVectorsULoc, shaderVectors);
        }
        setupTextures(mainTexture) {
            super.setupTextures(mainTexture);
            rasterize_11.gl.activeTexture(rasterize_11.gl.TEXTURE2);
            rasterize_11.gl.bindTexture(rasterize_11.gl.TEXTURE_2D, this.normalTexture); // bind the set's texture
            rasterize_11.gl.uniform1i(this.normalTextureUloc, 2);
        }
    }
    exports.SSAOPlusShaderProgram = SSAOPlusShaderProgram;
});
define("shaderPrograms/HBAOShaderProgram", ["require", "exports", "gl-matrix", "rasterize", "shaderPrograms/SSAOPlusShaderProgram"], function (require, exports, gl_matrix_9, rasterize_12, SSAOPlusShaderProgram_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const RAY_LENGTH_IN_PIXELS = 36;
    class HBAOShaderProgram extends SSAOPlusShaderProgram_1.SSAOPlusShaderProgram {
        constructor(source, numSamples) {
            // Divide samples evenly between rays and samples per ray
            let sqrtSamples = Math.floor(Math.sqrt(numSamples));
            source.frag = source.frag.replace("{num-rays}", sqrtSamples.toString());
            source.frag = source.frag.replace("{ray-length}", RAY_LENGTH_IN_PIXELS.toString());
            source.frag = source.frag.replace("{samples-per-ray}", sqrtSamples.toString());
            super(source, numSamples);
        }
        genRandomOffsetTexture() {
            // Generate a 4 x 4 texture of random vectors
            // This version generates 2 normalized 2D vectors, one in XY and one in YZ
            let pixelData = [];
            for (let i = 0; i < 32; ++i) {
                let v = gl_matrix_9.vec2.create();
                gl_matrix_9.vec2.random(v);
                gl_matrix_9.vec2.scale(v, v, 0.5);
                gl_matrix_9.vec2.add(v, v, gl_matrix_9.vec2.fromValues(0.5, 0.5));
                pixelData.push(Math.round(v[0] * 255), Math.round(v[1] * 255));
            }
            this.offsetTexture = rasterize_12.gl.createTexture();
            rasterize_12.gl.bindTexture(rasterize_12.gl.TEXTURE_2D, this.offsetTexture);
            rasterize_12.gl.texParameteri(rasterize_12.gl.TEXTURE_2D, rasterize_12.gl.TEXTURE_WRAP_S, rasterize_12.gl.REPEAT);
            rasterize_12.gl.texParameteri(rasterize_12.gl.TEXTURE_2D, rasterize_12.gl.TEXTURE_WRAP_T, rasterize_12.gl.REPEAT);
            rasterize_12.gl.texParameteri(rasterize_12.gl.TEXTURE_2D, rasterize_12.gl.TEXTURE_MAG_FILTER, rasterize_12.gl.NEAREST);
            rasterize_12.gl.texParameteri(rasterize_12.gl.TEXTURE_2D, rasterize_12.gl.TEXTURE_MIN_FILTER, rasterize_12.gl.NEAREST);
            rasterize_12.gl.texImage2D(rasterize_12.gl.TEXTURE_2D, 0, rasterize_12.gl.RGBA, 4, 4, 0, rasterize_12.gl.RGBA, rasterize_12.gl.UNSIGNED_BYTE, new Uint8Array(pixelData));
            rasterize_12.gl.uniform1i(this.uOffsetsLoc, 1);
            rasterize_12.gl.bindTexture(rasterize_12.gl.TEXTURE_2D, null);
        }
    }
    exports.HBAOShaderProgram = HBAOShaderProgram;
});
// <requires 
define("rasterize", ["require", "exports", "gl-matrix", "Frustum", "TreeNode", "SoundBuffer", "shaderPrograms/DefaultShaderProgram", "shaderPrograms/ShaderProgram", "ScreenQuad", "shaderPrograms/ScreenShaderProgram", "shaderPrograms/SSAOShaderProgram", "shaderPrograms/SSAOBlurShaderProgram", "shaderPrograms/SSAOMixShaderProgram", "ObjModelNode", "shaderPrograms/SSAOPlusShaderProgram", "shaderPrograms/HBAOShaderProgram", "util"], function (require, exports, gl_matrix_10, Frustum_1, TreeNode_3, SoundBuffer_1, DefaultShaderProgram_1, ShaderProgram_3, ScreenQuad_1, ScreenShaderProgram_4, SSAOShaderProgram_2, SSAOBlurShaderProgram_1, SSAOMixShaderProgram_1, ObjModelNode_1, SSAOPlusShaderProgram_2, HBAOShaderProgram_1, util_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /* GLOBAL CONSTANTS AND VARIABLES */
    /* assignment specific globals */
    exports.INPUT_URL = "assets/"; // Change to "assets/" to see custom room layout
    let defaultEye = gl_matrix_10.vec3.fromValues(4, 0.6, -1); // default eye position in world space
    let defaultCenter = gl_matrix_10.vec3.fromValues(-0.5, 0.6, -1); // default view direction in world space
    let defaultUp = gl_matrix_10.vec3.fromValues(0, 1, 0); // default view up vector
    let lights = [];
    let rotateTheta = Math.PI / 50; // how much to rotate models by with each key press
    let mrtFB;
    let colorTexture;
    let zBufferTexture;
    let positionTexture;
    let normalTexture;
    let ambientTexture;
    let offscreenFB = [];
    let offscreenTexture = [];
    var DisplayBuffers;
    (function (DisplayBuffers) {
        DisplayBuffers[DisplayBuffers["Color"] = 0] = "Color";
        DisplayBuffers[DisplayBuffers["Ambient"] = 1] = "Ambient";
        DisplayBuffers[DisplayBuffers["Position"] = 2] = "Position";
        DisplayBuffers[DisplayBuffers["Depth"] = 3] = "Depth";
        DisplayBuffers[DisplayBuffers["Normals"] = 4] = "Normals";
        DisplayBuffers[DisplayBuffers["SSAO"] = 5] = "SSAO";
        DisplayBuffers[DisplayBuffers["SSAOBlurred"] = 6] = "SSAOBlurred";
        DisplayBuffers[DisplayBuffers["Combined"] = 7] = "Combined";
    })(DisplayBuffers || (DisplayBuffers = {}));
    let bufferCount = 8;
    let currentBuffer = DisplayBuffers.Combined;
    var SSAOTechnique;
    (function (SSAOTechnique) {
        SSAOTechnique[SSAOTechnique["SSAO"] = 0] = "SSAO";
        SSAOTechnique[SSAOTechnique["SSAOPlus"] = 1] = "SSAOPlus";
        SSAOTechnique[SSAOTechnique["HBAO"] = 2] = "HBAO";
        SSAOTechnique[SSAOTechnique["UnsharpenMask"] = 3] = "UnsharpenMask";
    })(SSAOTechnique || (SSAOTechnique = {}));
    let sampleCounts = [8, 16, 32, 64, 128, 256];
    let sampleCountIndex = 1;
    let ssaoTechniqueCount = 4;
    let currentTechnique = SSAOTechnique.SSAO;
    // Mode switches
    let aoEnabled = true;
    let displayCharacters = true;
    let mixAll = false;
    // Projection globals
    exports.FOV = 0.5 * Math.PI;
    exports.NEAR = 0.1;
    exports.FAR = 100;
    /* input model data */
    exports.gl = null; // the all powerful gl object. It's all here folks!
    // Roots of the 3D scene
    let environmentRoot = new TreeNode_3.TreeNode();
    let characterRoot = new TreeNode_3.TreeNode();
    /* interaction variables */
    exports.Eye = gl_matrix_10.vec3.clone(defaultEye); // eye position in world space
    exports.Center = gl_matrix_10.vec3.clone(defaultCenter); // view direction in world space
    exports.Up = gl_matrix_10.vec3.clone(defaultUp); // view up vector in world space
    exports.viewDelta = 0.1; // how much to displace view with each key press
    // does stuff when keys are pressed
    function handleKeyDown(event) {
        // set up needed view params
        let lookAt = gl_matrix_10.vec3.create(), viewRight = gl_matrix_10.vec3.create(), temp = gl_matrix_10.vec3.create(); // lookat, right & temp vectors
        lookAt = gl_matrix_10.vec3.normalize(lookAt, gl_matrix_10.vec3.subtract(temp, exports.Center, exports.Eye)); // get lookat vector
        viewRight = gl_matrix_10.vec3.normalize(viewRight, gl_matrix_10.vec3.cross(temp, lookAt, exports.Up)); // get view right vector
        switch (event.code) {
            case "ArrowRight":
                exports.Center = gl_matrix_10.vec3.add(exports.Center, exports.Center, gl_matrix_10.vec3.scale(temp, viewRight, exports.viewDelta * 1.5));
                break;
            case "ArrowLeft":
                exports.Center = gl_matrix_10.vec3.add(exports.Center, exports.Center, gl_matrix_10.vec3.scale(temp, viewRight, -exports.viewDelta * 1.5));
                break;
            case "ArrowUp":
                exports.Eye = gl_matrix_10.vec3.add(exports.Eye, exports.Eye, gl_matrix_10.vec3.scale(temp, lookAt, exports.viewDelta));
                exports.Center = gl_matrix_10.vec3.add(exports.Center, exports.Center, gl_matrix_10.vec3.scale(temp, lookAt, exports.viewDelta));
                // Play walking sound
                lastFootstepGain = 0.5;
                footstepBuffer.setGain(lastFootstepGain);
                break;
            case "ArrowDown":
                exports.Eye = gl_matrix_10.vec3.add(exports.Eye, exports.Eye, gl_matrix_10.vec3.scale(temp, lookAt, -exports.viewDelta));
                exports.Center = gl_matrix_10.vec3.add(exports.Center, exports.Center, gl_matrix_10.vec3.scale(temp, lookAt, -exports.viewDelta));
                // Play walking sound
                lastFootstepGain = 0.5;
                footstepBuffer.setGain(lastFootstepGain);
                break;
            case "KeyA":
                aoEnabled = !aoEnabled;
                break;
            case "KeyM":
                mixAll = !mixAll;
                break;
            case "KeyC":
                displayCharacters = !displayCharacters;
                break;
            case "KeyB":
                currentBuffer++;
                if (currentBuffer >= bufferCount) {
                    currentBuffer = 0;
                }
                break;
            case "KeyT":
                currentTechnique++;
                if (currentTechnique >= ssaoTechniqueCount) {
                    currentTechnique = 0;
                }
                break;
            case "KeyS":
                if (sampleCountIndex + 1 >= sampleCounts.length) {
                    sampleCountIndex = 0;
                }
                else {
                    sampleCountIndex++;
                }
                updateSampleCount();
        }
    }
    // set up the webGL environment
    function setupWebGL() {
        // Set up keys
        document.onkeydown = handleKeyDown; // call this when key pressed
        // create a webgl canvas and set it up
        let webGLCanvas = document.getElementById("myWebGLCanvas"); // create a webgl canvas
        exports.WIDTH = webGLCanvas.width;
        exports.HEIGHT = webGLCanvas.height;
        exports.ASPECT = exports.WIDTH / exports.HEIGHT;
        exports.TOP = Math.tan(exports.FOV * 0.5) * exports.NEAR;
        exports.BOTTOM = -exports.TOP;
        exports.LEFT = exports.ASPECT * exports.BOTTOM;
        exports.RIGHT = exports.ASPECT * exports.TOP;
        exports.gl = webGLCanvas.getContext("webgl2"); // get a webgl object from it
        try {
            if (exports.gl == null) {
                throw "unable to create gl context -- is your browser gl ready?";
            }
            else {
                exports.gl.getExtension("OES_texture_float_linear");
                exports.gl.getExtension("EXT_color_buffer_float");
                mrtFB = exports.gl.createFramebuffer();
                exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, mrtFB);
                colorTexture = exports.gl.createTexture();
                exports.gl.bindTexture(exports.gl.TEXTURE_2D, colorTexture);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MAG_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MIN_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_S, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_T, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texImage2D(exports.gl.TEXTURE_2D, 0, exports.gl.RGBA, exports.WIDTH, exports.HEIGHT, 0, exports.gl.RGBA, exports.gl.UNSIGNED_BYTE, null);
                zBufferTexture = exports.gl.createTexture();
                exports.gl.bindTexture(exports.gl.TEXTURE_2D, zBufferTexture);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MAG_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MIN_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_S, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_T, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texImage2D(exports.gl.TEXTURE_2D, 0, exports.gl.DEPTH_COMPONENT24, exports.WIDTH, exports.HEIGHT, 0, exports.gl.DEPTH_COMPONENT, exports.gl.UNSIGNED_INT, null);
                positionTexture = exports.gl.createTexture();
                exports.gl.bindTexture(exports.gl.TEXTURE_2D, positionTexture);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MAG_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MIN_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_S, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_T, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texImage2D(exports.gl.TEXTURE_2D, 0, exports.gl.RGBA32F, exports.WIDTH, exports.HEIGHT, 0, exports.gl.RGBA, exports.gl.FLOAT, null);
                normalTexture = exports.gl.createTexture();
                exports.gl.bindTexture(exports.gl.TEXTURE_2D, normalTexture);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MAG_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MIN_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_S, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_T, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texImage2D(exports.gl.TEXTURE_2D, 0, exports.gl.RGBA, exports.WIDTH, exports.HEIGHT, 0, exports.gl.RGBA, exports.gl.UNSIGNED_BYTE, null);
                ambientTexture = exports.gl.createTexture();
                exports.gl.bindTexture(exports.gl.TEXTURE_2D, ambientTexture);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MAG_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MIN_FILTER, exports.gl.NEAREST);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_S, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_T, exports.gl.CLAMP_TO_EDGE);
                exports.gl.texImage2D(exports.gl.TEXTURE_2D, 0, exports.gl.RGBA, exports.WIDTH, exports.HEIGHT, 0, exports.gl.RGBA, exports.gl.UNSIGNED_BYTE, null);
                exports.gl.drawBuffers([exports.gl.COLOR_ATTACHMENT0, exports.gl.COLOR_ATTACHMENT1, exports.gl.COLOR_ATTACHMENT2, exports.gl.COLOR_ATTACHMENT3]);
                exports.gl.framebufferTexture2D(exports.gl.DRAW_FRAMEBUFFER, exports.gl.COLOR_ATTACHMENT0, exports.gl.TEXTURE_2D, colorTexture, 0);
                exports.gl.framebufferTexture2D(exports.gl.DRAW_FRAMEBUFFER, exports.gl.DEPTH_ATTACHMENT, exports.gl.TEXTURE_2D, zBufferTexture, 0);
                exports.gl.framebufferTexture2D(exports.gl.DRAW_FRAMEBUFFER, exports.gl.COLOR_ATTACHMENT1, exports.gl.TEXTURE_2D, positionTexture, 0);
                exports.gl.framebufferTexture2D(exports.gl.DRAW_FRAMEBUFFER, exports.gl.COLOR_ATTACHMENT2, exports.gl.TEXTURE_2D, ambientTexture, 0);
                exports.gl.framebufferTexture2D(exports.gl.DRAW_FRAMEBUFFER, exports.gl.COLOR_ATTACHMENT3, exports.gl.TEXTURE_2D, normalTexture, 0);
                exports.gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
                exports.gl.clearDepth(1.0); // use max when we clear the depth buffer
                exports.gl.enable(exports.gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
                for (let i = 0; i < 2; ++i) {
                    offscreenFB[i] = exports.gl.createFramebuffer();
                    exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, offscreenFB[i]);
                    offscreenTexture[i] = exports.gl.createTexture();
                    exports.gl.bindTexture(exports.gl.TEXTURE_2D, offscreenTexture[i]);
                    exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MAG_FILTER, exports.gl.NEAREST);
                    exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_MIN_FILTER, exports.gl.NEAREST);
                    exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_S, exports.gl.CLAMP_TO_EDGE);
                    exports.gl.texParameteri(exports.gl.TEXTURE_2D, exports.gl.TEXTURE_WRAP_T, exports.gl.CLAMP_TO_EDGE);
                    exports.gl.texImage2D(exports.gl.TEXTURE_2D, 0, exports.gl.RGBA, exports.WIDTH, exports.HEIGHT, 0, exports.gl.RGBA, exports.gl.UNSIGNED_BYTE, null);
                    exports.gl.drawBuffers([exports.gl.COLOR_ATTACHMENT0]);
                    exports.gl.framebufferTexture2D(exports.gl.DRAW_FRAMEBUFFER, exports.gl.COLOR_ATTACHMENT0, exports.gl.TEXTURE_2D, offscreenTexture[i], 0);
                }
            }
        }
        catch (e) {
            console.log(e);
        }
    }
    let lastFootstepGain = 0;
    let lastScrapingGain = 0;
    let footstepBuffer;
    let scrapingBuffer;
    class MaterialGrouping {
        constructor() {
            this.instances = [];
        }
    }
    class ShaderGrouping {
        constructor() {
            this.materials = [];
        }
    }
    // read models in, load them into webgl buffers
    function setupScene(scene) {
        if (scene == null) {
            throw "Unable to load scene file!";
        }
        // Load Lights
        lights = scene.lights;
        // Load Charcters
        for (let m of scene.environment) {
            loadModel(m, environmentRoot);
        }
        // Load Environment
        for (let m of scene.characters) {
            loadModel(m, characterRoot);
        }
    }
    function loadModel(m, parent) {
        let pos = gl_matrix_10.vec3.fromValues(m.position[0], m.position[1], m.position[2]);
        let scale = gl_matrix_10.vec3.fromValues(m.scale, m.scale, m.scale);
        ObjModelNode_1.ObjModelNode.create(m.objFile, m.mtlFile, pos, scale, m.scaleTo1by1, m.material).then(function (modelNode) {
            parent.children.push(modelNode);
        });
    }
    let frameTimes = [];
    // render the loaded model
    function renderModels() {
        let frameStartTime = performance.now();
        // Fade down sounds quickly but not instantly
        if (frameTimes.length > 1) {
            let lastFrameTime = frameTimes[frameTimes.length - 1] / 1000;
            if (lastFootstepGain > 0) {
                lastFootstepGain = Math.max(lastFootstepGain -= lastFrameTime * 15, 0);
                footstepBuffer.setGain(lastFootstepGain);
            }
            if (lastScrapingGain > 0) {
                lastScrapingGain = Math.max(lastScrapingGain -= lastFrameTime * 7.5, 0);
                scrapingBuffer.setGain(lastScrapingGain);
            }
        }
        // Activate the default shader program
        exports.defaultShaderProgram.begin();
        // Set main viewport to the whole screen
        exports.gl.viewport(0, 0, exports.gl.drawingBufferWidth, exports.gl.drawingBufferHeight);
        let pMatrix = gl_matrix_10.mat4.create(); // projection matrix
        let vMatrix = gl_matrix_10.mat4.create(); // view matrix
        let mMatrix = gl_matrix_10.mat4.create(); // model matrix
        let pvMatrix = gl_matrix_10.mat4.create(); // hand * proj * view matrices
        let invVMatrix = gl_matrix_10.mat4.create(); // inverse view matrix
        let invPMatrix = gl_matrix_10.mat4.create(); // inverse projection matrix
        let invPvMatrix = gl_matrix_10.mat4.create();
        window.requestAnimationFrame(renderModels); // set up frame render callback
        // Set framebuffer to MRT textures
        exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, mrtFB);
        exports.gl.clearColor(0, 0, 0, 1);
        exports.gl.clear(exports.gl.COLOR_BUFFER_BIT | exports.gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
        // set up handedness, projection and view
        gl_matrix_10.mat4.perspective(pMatrix, exports.FOV, exports.ASPECT, exports.NEAR, exports.FAR); // create projection matrix
        //mat4.frustum(pMatrix, -0.178, 0.178, -0.1, 0.1, 0.1, 1000);
        gl_matrix_10.mat4.lookAt(vMatrix, exports.Eye, exports.Center, exports.Up); // create view matrix
        gl_matrix_10.mat4.multiply(pvMatrix, pMatrix, vMatrix); // projection * view
        gl_matrix_10.mat4.invert(invVMatrix, vMatrix);
        gl_matrix_10.mat4.invert(invPMatrix, pMatrix);
        gl_matrix_10.mat4.invert(invPvMatrix, pvMatrix);
        // Generate view frustum
        let viewFrustum = Frustum_1.Frustum.fromViewProjectionMatrix(pvMatrix);
        exports.screenQuad.setProjection(pMatrix, vMatrix, invPMatrix, invVMatrix);
        let trianglesDrawn = 0;
        // End default shader program
        exports.defaultShaderProgram.end();
        // Draw the scene with default shader
        let visibleSet = [];
        environmentRoot.appendVisibleSet(viewFrustum, false, visibleSet);
        if (displayCharacters) {
            characterRoot.appendVisibleSet(viewFrustum, false, visibleSet);
        }
        // Organize visible objects by shader, then material
        let shaders = [];
        let currentShader;
        let currentMaterial;
        for (let inst of visibleSet) {
            if (inst.shader.index in shaders) {
                currentShader = shaders[inst.shader.index];
            }
            else {
                currentShader = new ShaderGrouping();
                currentShader.shader = inst.shader;
                shaders[inst.shader.index] = currentShader;
            }
            if (inst.material.index in currentShader.materials) {
                currentMaterial = currentShader.materials[inst.material.index];
            }
            else {
                currentMaterial = new MaterialGrouping();
                currentMaterial.material = inst.material;
                currentShader.materials[inst.material.index] = currentMaterial;
            }
            currentMaterial.instances.push(inst);
        }
        // Draw visible objects
        for (let shaderGroupIndex in shaders) {
            let shaderGroup = shaders[shaderGroupIndex];
            let shader = shaderGroup.shader;
            shader.begin();
            shader.setViewProjectionMatrix(pvMatrix);
            for (let materialGroupIndex in shaderGroup.materials) {
                let materialGroup = shaderGroup.materials[materialGroupIndex];
                let material = materialGroup.material;
                shader.setMaterial(material);
                for (let instance of materialGroup.instances) {
                    shader.setMesh(instance.data);
                    // Build model matrix and pass it to shader
                    let mMatrix = gl_matrix_10.mat4.create();
                    gl_matrix_10.mat4.fromRotationTranslationScale(mMatrix, instance.rotation, instance.position, instance.scale);
                    shader.setModelMatrix(mMatrix, vMatrix);
                    trianglesDrawn += shader.draw(instance.data, instance.primitiveType);
                }
            }
            shader.end();
        }
        TreeNode_3.TreeNode.endShader();
        if (aoEnabled || currentBuffer != DisplayBuffers.Combined) {
            // Switch to the offscreen frame buffer and draw SSAO to offscreen texture
            exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, offscreenFB[0]);
            exports.gl.disable(exports.gl.DEPTH_TEST);
            let matrix = gl_matrix_10.mat4.create();
            switch (currentTechnique) {
                case SSAOTechnique.SSAO:
                    exports.screenQuad.draw(exports.ssaoShaderProgram, positionTexture);
                    break;
                case SSAOTechnique.SSAOPlus:
                    gl_matrix_10.mat4.transpose(matrix, vMatrix);
                    gl_matrix_10.mat4.invert(matrix, matrix);
                    exports.ssaoPlusShaderProgram.normalTexture = normalTexture;
                    exports.screenQuad.draw(exports.ssaoPlusShaderProgram, positionTexture);
                    break;
                case SSAOTechnique.HBAO:
                    gl_matrix_10.mat4.transpose(matrix, vMatrix);
                    gl_matrix_10.mat4.invert(matrix, matrix);
                    exports.hbaoShaderProgram.normalTexture = normalTexture;
                    exports.screenQuad.draw(exports.hbaoShaderProgram, positionTexture);
                    break;
                case SSAOTechnique.UnsharpenMask:
                    // First draw depth to offscreen buffer 0
                    exports.screenQuad.draw(exports.screenDepthShaderProgram, positionTexture);
                    // Next blur it vertically in buffer 1
                    exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, offscreenFB[1]);
                    exports.screenQuad.draw(exports.gausVertProgram, offscreenTexture[0]);
                    // Finaly blur it horizontally back to buffer 0
                    exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, offscreenFB[0]);
                    exports.screenQuad.draw(exports.gausHorizProgram, offscreenTexture[1]);
                    break;
            }
            // Swap to the other offscreen frame buffer and draw SSAO with blur
            exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, offscreenFB[1]);
            if (currentTechnique == SSAOTechnique.UnsharpenMask) {
                exports.unsharpenMaskProgram.depthTexture = positionTexture;
                exports.screenQuad.draw(exports.unsharpenMaskProgram, offscreenTexture[0]);
            }
            else {
                exports.ssaoBlurProgram.depthTexture = positionTexture;
                exports.screenQuad.draw(exports.ssaoBlurProgram, offscreenTexture[0]);
            }
        }
        else {
            // Clear the SSAO buffer to white
            exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, offscreenFB[1]);
            exports.gl.clearColor(1, 1, 1, 1);
            exports.gl.clear(exports.gl.COLOR_BUFFER_BIT | exports.gl.DEPTH_BUFFER_BIT);
        }
        // Swap to the on-screen frame buffer and draw the final output 
        exports.gl.bindFramebuffer(exports.gl.FRAMEBUFFER, null);
        switch (currentBuffer) {
            case DisplayBuffers.Color:
                exports.screenQuad.draw(exports.screenColorShaderProgram, colorTexture);
                break;
            case DisplayBuffers.Ambient:
                exports.screenQuad.draw(exports.screenColorShaderProgram, ambientTexture);
                break;
            case DisplayBuffers.Position:
                exports.screenQuad.draw(exports.screenColorShaderProgram, positionTexture);
                break;
            case DisplayBuffers.Depth:
                exports.screenQuad.draw(exports.screenDepthShaderProgram, positionTexture);
                break;
            case DisplayBuffers.Normals:
                exports.screenQuad.draw(exports.screenNormalsShaderProgram, normalTexture);
                break;
            case DisplayBuffers.SSAO:
                exports.screenQuad.draw(exports.screenColorShaderProgram, offscreenTexture[0]);
                break;
            case DisplayBuffers.SSAOBlurred:
                exports.screenQuad.draw(exports.screenColorShaderProgram, offscreenTexture[1]);
                break;
            case DisplayBuffers.Combined:
                if (mixAll) {
                    exports.ssaoMixAllProgram.ssaoTexture = offscreenTexture[1];
                    exports.ssaoMixAllProgram.ambientTexture = ambientTexture;
                    exports.screenQuad.draw(exports.ssaoMixAllProgram, colorTexture);
                }
                else {
                    exports.ssaoMixProgram.ssaoTexture = offscreenTexture[1];
                    exports.ssaoMixProgram.ambientTexture = ambientTexture;
                    exports.screenQuad.draw(exports.ssaoMixProgram, colorTexture);
                }
                break;
        }
        exports.gl.enable(exports.gl.DEPTH_TEST);
        let frameEndTime = performance.now();
        frameTimes.push(frameEndTime - frameStartTime);
        let ftLength = frameTimes.length;
        if (ftLength > 11) {
            frameTimes.shift();
            ftLength--;
        }
        let frameTime = 0;
        for (let i = 0; i < ftLength; ++i) {
            frameTime += frameTimes[i];
        }
        frameTime /= ftLength;
        // Update HUD
        document.getElementById("frameTime").innerHTML = frameTime.toFixed(2);
        document.getElementById("triangles").innerHTML = trianglesDrawn.toString();
        document.getElementById("displayCharacters").innerHTML = displayCharacters ? "ON" : "OFF";
        document.getElementById("aoEnabled").innerHTML = aoEnabled ? "ON" : "OFF";
        document.getElementById("mixMode").innerHTML = mixAll ? "All Light" : "Ambient Light Only";
        document.getElementById("sampleCount").innerHTML = sampleCounts[sampleCountIndex].toString();
        let bufferName = "";
        switch (currentBuffer) {
            case DisplayBuffers.Color:
                bufferName = "Color";
                break;
            case DisplayBuffers.Ambient:
                bufferName = "Ambient";
                break;
            case DisplayBuffers.Position:
                bufferName = "Position";
                break;
            case DisplayBuffers.Depth:
                bufferName = "Depth";
                break;
            case DisplayBuffers.Normals:
                bufferName = "Normals";
                break;
            case DisplayBuffers.SSAO:
                if (currentTechnique == SSAOTechnique.UnsharpenMask) {
                    bufferName = "Blurred Depth";
                }
                else {
                    bufferName = "AO Unfiltered";
                }
                break;
            case DisplayBuffers.SSAOBlurred:
                if (currentTechnique == SSAOTechnique.UnsharpenMask) {
                    bufferName = "Unsharpen Mask";
                }
                else {
                    bufferName = "AO Blurred";
                }
                break;
            case DisplayBuffers.Combined:
                bufferName = "Combined";
                break;
        }
        document.getElementById("bufferToDisplay").innerHTML = bufferName;
        let techName = "";
        switch (currentTechnique) {
            case SSAOTechnique.SSAO:
                techName = "SSAO";
                break;
            case SSAOTechnique.SSAOPlus:
                techName = "SSAO+";
                break;
            case SSAOTechnique.HBAO:
                techName = "HBAO";
                break;
            case SSAOTechnique.UnsharpenMask:
                techName = "Unsharpen Mask";
                break;
        }
        document.getElementById("ssaoTechnique").innerHTML = techName;
    }
    /* MAIN -- HERE is where execution begins after window load */
    function main() {
        return __awaiter(this, void 0, void 0, function* () {
            // set up the webGL environment
            setupWebGL();
            // Get a Web Audio context
            let ac = new AudioContext();
            let shaderFiles = [];
            shaderFiles["default"] = new ShaderFileNames("default", "default");
            shaderFiles["normalMap"] = new ShaderFileNames("default", "default");
            shaderFiles["screenColor"] = new ShaderFileNames("screen", "screen-color");
            shaderFiles["screenNormals"] = new ShaderFileNames("screen", "screen-normal");
            shaderFiles["screenDepth"] = new ShaderFileNames("screen", "screen-depth");
            shaderFiles["ssaoBlur"] = new ShaderFileNames("screen", "screen-ssao-blur");
            shaderFiles["ssao"] = new ShaderFileNames("screen", "screen-ssao");
            shaderFiles["ssaoPlus"] = new ShaderFileNames("screen", "screen-ssao+");
            shaderFiles["hbao"] = new ShaderFileNames("screen", "screen-hbao");
            shaderFiles["ssaoMix"] = new ShaderFileNames("screen", "screen-ssao-mix");
            shaderFiles["ssaoMixAll"] = new ShaderFileNames("screen", "screen-ssao-mix-all");
            shaderFiles["gausVert"] = new ShaderFileNames("screen", "screen-gaus-v");
            shaderFiles["gausHoriz"] = new ShaderFileNames("screen", "screen-gaus-h");
            shaderFiles["unsharpenMask"] = new ShaderFileNames("screen", "screen-unsharpen-mask");
            // Request assets
            let sceneResult = util_3.getJSONFile("assets/scene.json");
            let footstepResult = SoundBuffer_1.SoundBuffer.create(ac, "assets/footsteps.ogg");
            let scrapingResult = SoundBuffer_1.SoundBuffer.create(ac, "assets/scraping.ogg");
            // Await loading of all assets
            let shaderSource = yield requestShaders(shaderFiles);
            let scene = yield sceneResult;
            footstepBuffer = yield footstepResult;
            scrapingBuffer = yield scrapingResult;
            // Start the audio buffers (they will loop continuously and volume will be modulated based on the situation)
            footstepBuffer.setLoop(true);
            footstepBuffer.play();
            scrapingBuffer.setLoop(true);
            scrapingBuffer.play();
            // set up the models from tri file
            setupScene(scene);
            exports.defaultShaderProgram = new DefaultShaderProgram_1.DefaultShaderProgram(shaderSource["default"], exports.Eye, lights, false);
            exports.normalMapShaderProgram = new DefaultShaderProgram_1.DefaultShaderProgram(shaderSource["normalMap"], exports.Eye, lights, true);
            exports.screenColorShaderProgram = new ScreenShaderProgram_4.ScreenShaderProgram(shaderSource["screenColor"]);
            exports.screenNormalsShaderProgram = new ScreenShaderProgram_4.ScreenShaderProgram(shaderSource["screenNormals"]);
            exports.screenDepthShaderProgram = new ScreenShaderProgram_4.ScreenShaderProgram(shaderSource["screenDepth"]);
            exports.ssaoShaderProgram = new SSAOShaderProgram_2.SSAOShaderProgram(shaderSource["ssao"], sampleCounts[sampleCountIndex]);
            exports.ssaoPlusShaderProgram = new SSAOPlusShaderProgram_2.SSAOPlusShaderProgram(shaderSource["ssaoPlus"], sampleCounts[sampleCountIndex]);
            exports.hbaoShaderProgram = new HBAOShaderProgram_1.HBAOShaderProgram(shaderSource["hbao"], sampleCounts[sampleCountIndex]);
            exports.ssaoBlurProgram = new SSAOBlurShaderProgram_1.SSAOBlurShaderProgram(shaderSource["ssaoBlur"]);
            exports.ssaoMixProgram = new SSAOMixShaderProgram_1.SSAOMixShaderProgram(shaderSource["ssaoMix"]);
            exports.ssaoMixAllProgram = new SSAOMixShaderProgram_1.SSAOMixShaderProgram(shaderSource["ssaoMixAll"]);
            exports.gausVertProgram = new ScreenShaderProgram_4.ScreenShaderProgram(shaderSource["gausVert"]);
            exports.gausHorizProgram = new ScreenShaderProgram_4.ScreenShaderProgram(shaderSource["gausHoriz"]);
            exports.unsharpenMaskProgram = new SSAOBlurShaderProgram_1.SSAOBlurShaderProgram(shaderSource["unsharpenMask"]);
            exports.screenQuad = new ScreenQuad_1.ScreenQuad();
            // start drawing
            renderModels();
        });
    }
    exports.main = main;
    function updateSampleCount() {
        return __awaiter(this, void 0, void 0, function* () {
            let shaderFiles = [];
            shaderFiles["ssao"] = new ShaderFileNames("screen", "screen-ssao");
            shaderFiles["ssaoPlus"] = new ShaderFileNames("screen", "screen-ssao+");
            shaderFiles["hbao"] = new ShaderFileNames("screen", "screen-hbao");
            // Await loading of all assets
            let shaderSource = yield requestShaders(shaderFiles);
            exports.ssaoShaderProgram = new SSAOShaderProgram_2.SSAOShaderProgram(shaderSource["ssao"], sampleCounts[sampleCountIndex]);
            exports.ssaoPlusShaderProgram = new SSAOPlusShaderProgram_2.SSAOPlusShaderProgram(shaderSource["ssaoPlus"], sampleCounts[sampleCountIndex]);
            exports.hbaoShaderProgram = new HBAOShaderProgram_1.HBAOShaderProgram(shaderSource["hbao"], sampleCounts[sampleCountIndex]);
        });
    }
    class ShaderFileNames {
        constructor(frag, vert) {
            this.frag = frag;
            this.vert = vert;
        }
    }
    function requestShaders(input) {
        return new Promise(function (resolve, reject) {
            return __awaiter(this, void 0, void 0, function* () {
                let promises = [];
                // Initiate all async actions
                for (let key in input) {
                    let item = input[key];
                    promises[key] = ShaderProgram_3.ShaderProgram.fetchSource(item.frag, item.vert);
                }
                let results = [];
                // Await all results
                for (let key in promises) {
                    let item = promises[key];
                    results[key] = yield item;
                }
                resolve(results);
            });
        });
    }
});
define("MeshData", ["require", "exports", "gl-matrix", "rasterize"], function (require, exports, gl_matrix_11, rasterize_13) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Holds the mesh data used to render 3D object instances.  Multiple instances can reference the same mesh data.
     */
    class MeshData {
        /**
         * Constructor.  Creates WebGL buffers but does not place any data in them.
         */
        constructor() {
            this.tangentBuffer = null;
            this.binormalBuffer = null;
            this.vertices = [];
            this.triangles = [];
            this.normals = [];
            this.uvs = [];
            // create the buffers
            this.vertexBuffer = rasterize_13.gl.createBuffer(); // init empty webgl set vertex coord buffer
            this.normalBuffer = rasterize_13.gl.createBuffer(); // init empty webgl set normal component buffer
            this.tangentBuffer = rasterize_13.gl.createBuffer();
            this.binormalBuffer = rasterize_13.gl.createBuffer();
            this.uvBuffer = rasterize_13.gl.createBuffer(); // init empty webgl set uv coord buffer
            this.indexBuffer = rasterize_13.gl.createBuffer(); // init empty triangle index buffer
        }
        /**
         * Updates the WebGL buffers with new data.
         * @param mesh The new mesh data.
         */
        update(mesh) {
            // Save the original arrays in case we want to modify the shape later
            this.vertices = mesh.vertices;
            this.triangles = mesh.triangles;
            this.normals = mesh.normals;
            this.uvs = mesh.uvs;
            // set up the vertex, normal and uv arrays, define model center and axes
            let glVertices = []; // flat coord list for webgl
            let glNormals = []; // flat normal list for webgl
            let glUvs = []; // flat texture coord list for webgl
            let numVerts = mesh.vertices.length; // num vertices in tri set
            for (let i = 0; i < numVerts; i++) {
                let vtxToAdd = mesh.vertices[i]; // get vertex to add
                let normToAdd = mesh.normals[i]; // get normal to add
                let uvToAdd = mesh.uvs[i]; // get uv to add
                glVertices.push(vtxToAdd[0], vtxToAdd[1], vtxToAdd[2]); // put coords in set vertex list
                glNormals.push(normToAdd[0], normToAdd[1], normToAdd[2]); // put normal in set normal list
                glUvs.push(uvToAdd[0], uvToAdd[1]); // put uv in set uv list
            } // end for vertices in set
            // send the vertex coords, normals and uvs to webGL; load texture
            rasterize_13.gl.bindBuffer(rasterize_13.gl.ARRAY_BUFFER, this.vertexBuffer); // activate that buffer
            rasterize_13.gl.bufferData(rasterize_13.gl.ARRAY_BUFFER, new Float32Array(glVertices), rasterize_13.gl.STATIC_DRAW); // data in
            rasterize_13.gl.bindBuffer(rasterize_13.gl.ARRAY_BUFFER, this.normalBuffer); // activate that buffer
            rasterize_13.gl.bufferData(rasterize_13.gl.ARRAY_BUFFER, new Float32Array(glNormals), rasterize_13.gl.STATIC_DRAW); // data in
            rasterize_13.gl.bindBuffer(rasterize_13.gl.ARRAY_BUFFER, this.uvBuffer); // activate that buffer
            rasterize_13.gl.bufferData(rasterize_13.gl.ARRAY_BUFFER, new Float32Array(glUvs), rasterize_13.gl.STATIC_DRAW); // data in
            // set up the triangle index array, adjusting indices across sets
            let glTriangles = []; // flat index list for webgl
            this.triangleCount = mesh.triangles.length; // number of tris in this set
            for (let i = 0; i < this.triangleCount; ++i) {
                let triToAdd = mesh.triangles[i]; // get tri to add
                glTriangles.push(triToAdd[0], triToAdd[1], triToAdd[2]); // put indices in set list
            }
            // send the triangle indices to webGL
            rasterize_13.gl.bindBuffer(rasterize_13.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer); // activate that buffer
            rasterize_13.gl.bufferData(rasterize_13.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(glTriangles), rasterize_13.gl.STATIC_DRAW); // data in  
        }
        /**
         * Loads buffer data from JSON structure.
         * @param triangleSet The JSON data structure to load.
         * @returns A new mesh data object constructed from the given JSON data.
         */
        static load(triangleSet) {
            let result = new MeshData();
            result.reload(triangleSet);
            return result;
        }
        /**
         * Creates a MeshData object with WebGL buffers given a raw collection of mesh data
         * @param mesh The mesh data to create buffers from.
         */
        static fromMesh(mesh) {
            let md = new MeshData();
            md.update(mesh);
            return md;
        }
        /**
         * Loads buffer data from JSON structure into an existing mesh data object.
         * @param triangleSet The JSON data structure to load.
         */
        reload(triangleSet) {
            let vertices = MeshData.arrayToVec3(triangleSet.vertices);
            let normals = MeshData.arrayToVec3(triangleSet.normals);
            let uvs = MeshData.arrayToVec2(triangleSet.uvs);
            this.update({ vertices: vertices, normals: normals, uvs: uvs, triangles: triangleSet.triangles });
        }
        static arrayToVec3(array) {
            let vectors = [];
            for (let v of array) {
                vectors.push(gl_matrix_11.vec3.fromValues(v[0], v[1], v[2]));
            }
            return vectors;
        }
        static arrayToVec2(array) {
            let vectors = [];
            for (let v of array) {
                vectors.push(gl_matrix_11.vec2.fromValues(v[0], v[1]));
            }
            return vectors;
        }
        /**
         * Generates binormals and tangents based on current normals and texcoords
         * Based on page 436-437 of 3D Math Primer for Graphics and Game Development
         * by Fletcher Dunn & Ian PaarhDerry
         */
        updateTangentSpace() {
            // Clear the arrays and Start them at (0,0,0) so they can accumulate values
            this.tangents = [];
            this.binormals = [];
            for (let n of this.normals) {
                gl_matrix_11.vec3.normalize(n, n); // make sure normals are normalized
                this.tangents.push(gl_matrix_11.vec3.create());
                this.binormals.push(gl_matrix_11.vec3.create());
            }
            // Since the basis vectors will be unit length, just
            // keep adding them in.  When we normalize at the end,
            // it will work the same way as averageing over the
            // face edges
            for (let t of this.triangles) {
                let v0 = this.vertices[t[0]];
                let v1 = this.vertices[t[1]];
                let v2 = this.vertices[t[2]];
                let uv0 = this.uvs[t[0]];
                let uv1 = this.uvs[t[1]];
                let uv2 = this.uvs[t[2]];
                // Compute intermediate values
                let q1 = gl_matrix_11.vec3.create();
                let q2 = gl_matrix_11.vec3.create();
                gl_matrix_11.vec3.subtract(q1, v1, v0);
                gl_matrix_11.vec3.subtract(q2, v2, v0);
                let s1 = uv1[0] - uv0[0];
                let s2 = uv2[0] - uv0[0];
                let t1 = uv1[1] - uv0[1];
                let t2 = uv2[1] - uv0[1];
                // Compute basis vectors for this triangle
                let tangent = gl_matrix_11.vec3.create();
                let binormal = gl_matrix_11.vec3.create();
                let temp1 = gl_matrix_11.vec3.create();
                let temp2 = gl_matrix_11.vec3.create();
                gl_matrix_11.vec3.scale(temp1, q1, t2);
                gl_matrix_11.vec3.scale(temp2, q2, t1);
                gl_matrix_11.vec3.subtract(tangent, temp1, temp2);
                gl_matrix_11.vec3.normalize(tangent, tangent);
                gl_matrix_11.vec3.scale(temp1, q1, -s2);
                gl_matrix_11.vec3.scale(temp2, q2, s1);
                gl_matrix_11.vec3.add(binormal, temp1, temp2);
                gl_matrix_11.vec3.normalize(binormal, binormal);
                // Accumulate them into the running sums
                for (let i = 0; i < 3; ++i) {
                    let currentTangent = this.tangents[t[i]];
                    let currentBinormal = this.binormals[t[i]];
                    gl_matrix_11.vec3.add(temp1, currentTangent, tangent);
                    gl_matrix_11.vec3.add(temp2, currentBinormal, binormal);
                    // Avoid zeroing out the tangent/binormal
                    if (gl_matrix_11.vec3.length(temp1) > 0.01) {
                        gl_matrix_11.vec3.add(currentTangent, currentTangent, tangent);
                    }
                    if (gl_matrix_11.vec3.length(temp2) > 0.01) {
                        gl_matrix_11.vec3.add(currentBinormal, currentBinormal, binormal);
                    }
                }
            }
            // Finally, normalize all the vectors to average
            // across triangle boundaries
            // Also put the tangents and bitangents into the flat format OpenGL likes
            let glTangents = [];
            let glBinormals = [];
            let vertexCount = this.vertices.length;
            for (let i = 0; i < vertexCount; ++i) {
                let currentNormal = this.normals[i];
                let currentTangent = this.tangents[i];
                let currentBinormal = this.binormals[i];
                // Ensure tangent is perpendicular to the normal
                let temp = gl_matrix_11.vec3.create();
                gl_matrix_11.vec3.scale(temp, currentNormal, gl_matrix_11.vec3.dot(currentTangent, currentNormal));
                gl_matrix_11.vec3.subtract(currentTangent, currentTangent, temp);
                gl_matrix_11.vec3.normalize(currentTangent, currentTangent);
                // Ensure binormal is perpendicular to the normal
                gl_matrix_11.vec3.scale(temp, currentNormal, gl_matrix_11.vec3.dot(currentBinormal, currentNormal));
                gl_matrix_11.vec3.subtract(currentBinormal, currentBinormal, temp);
                gl_matrix_11.vec3.normalize(currentBinormal, currentBinormal);
                // Normalize both
                glTangents.push(currentTangent[0], currentTangent[1], currentTangent[2]);
                glBinormals.push(currentBinormal[0], currentBinormal[1], currentBinormal[2]);
            }
            // Feed the data into the WebGL buffers
            rasterize_13.gl.bindBuffer(rasterize_13.gl.ARRAY_BUFFER, this.tangentBuffer); // activate that buffer
            rasterize_13.gl.bufferData(rasterize_13.gl.ARRAY_BUFFER, new Float32Array(glTangents), rasterize_13.gl.STATIC_DRAW); // data in
            rasterize_13.gl.bindBuffer(rasterize_13.gl.ARRAY_BUFFER, this.binormalBuffer); // activate that buffer
            rasterize_13.gl.bufferData(rasterize_13.gl.ARRAY_BUFFER, new Float32Array(glBinormals), rasterize_13.gl.STATIC_DRAW); // data in
        }
    }
    exports.MeshData = MeshData;
});
define("Frustum", ["require", "exports", "gl-matrix", "Plane", "AABB"], function (require, exports, gl_matrix_12, Plane_1, AABB_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * A 3D frustum consisting of 6 planes
     */
    class Frustum {
        /**
         * Creates a new frustum.
         * @param left The left plane.
         * @param right The right plane.
         * @param bottom The bottom plane.
         * @param top The top plane.
         * @param near The near plane.
         * @param far The far plane.
         */
        constructor(left, right, bottom, top, near, far) {
            this.left = left;
            this.right = right;
            this.bottom = bottom;
            this.top = top;
            this.near = near;
            this.far = far;
            this.planes = [];
            this.planes = [];
            this.planes.push(left);
            this.planes.push(right);
            this.planes.push(bottom);
            this.planes.push(top);
            this.planes.push(near);
            this.planes.push(far);
            // Normalize all the planes
            for (let p of this.planes) {
                p.normalize();
            }
        }
        /**
         * Clips an edge loop against the left, right, top, and bottom planes of the frustum.
         * Can avoid projection errors when points are behind the eye.
         * @param vertices A list of vertices arranged into a loop.
         * @returns A new list of vertices that fits within the frustum pyramid or false if it does not fit.
         */
        clipConvexPolygon(vertices) {
            // Clip the polygon against every plane.  If any return false, then quit
            for (let p of [this.left, this.right, this.top, this.bottom]) {
                let result = p.clipConvexPolygon(vertices);
                if (result == false) {
                    return false;
                }
                else {
                    vertices = result;
                }
            }
            return vertices;
        }
        /**
         * Creates a new frustum from the projection of the given matrix.
         * Based on page 774 of Real Time Rendering
         * By Akenine-Moller, Haines, and Hoffman
         * @param m The matrix to extract the projection from.
         * @returns The new frustum.
         */
        static fromViewProjectionMatrix(m) {
            let planes = [];
            // Get matrix rows
            let rows = Frustum.getMatrixRows(m);
            // Left plane
            let temp = gl_matrix_12.vec4.create();
            gl_matrix_12.vec4.add(temp, rows[3], rows[0]);
            gl_matrix_12.vec4.negate(temp, temp);
            let left = new Plane_1.Plane(gl_matrix_12.vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
            // Right plane
            temp = gl_matrix_12.vec4.create();
            gl_matrix_12.vec4.subtract(temp, rows[3], rows[0]);
            gl_matrix_12.vec4.negate(temp, temp);
            let right = new Plane_1.Plane(gl_matrix_12.vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
            // Bottom plane
            temp = gl_matrix_12.vec4.create();
            gl_matrix_12.vec4.add(temp, rows[3], rows[1]);
            gl_matrix_12.vec4.negate(temp, temp);
            let bottom = new Plane_1.Plane(gl_matrix_12.vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
            // Top plane
            temp = gl_matrix_12.vec4.create();
            gl_matrix_12.vec4.subtract(temp, rows[3], rows[1]);
            gl_matrix_12.vec4.negate(temp, temp);
            let top = new Plane_1.Plane(gl_matrix_12.vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
            // Near plane
            temp = gl_matrix_12.vec4.create();
            gl_matrix_12.vec4.add(temp, rows[3], rows[2]);
            gl_matrix_12.vec4.negate(temp, temp);
            let near = new Plane_1.Plane(gl_matrix_12.vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
            // Far plane
            temp = gl_matrix_12.vec4.create();
            gl_matrix_12.vec4.subtract(temp, rows[3], rows[2]);
            gl_matrix_12.vec4.negate(temp, temp);
            let far = new Plane_1.Plane(gl_matrix_12.vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
            return new Frustum(left, right, bottom, top, near, far);
        }
        /**
         * Determines whether the triangle defined by the three given points is within the frustum.
         * @param v1 Point 1
         * @param v2 Point 2
         * @param v3 Point 3
         * @returns True if the triangle is completely or partialy within the frustum, false otherwise.
         */
        isTriangleOutside(v1, v2, v3) {
            for (let p of this.planes) {
                // If signed distance for all vertices is positive, then the triangle
                // is completely outside the plane
                if (p.distanceToPoint(v1) > 0 && p.distanceToPoint(v2) > 0 && p.distanceToPoint(v3) > 0) {
                    return true;
                }
            }
            // The triangle was not completely outside any of the frustum planes
            return false;
        }
        /**
         * Determines whether the given vertices defined are all within the frustum.
         * @param vertices The vertices to test.
         * @returns Whether all the verticies are within the frustum
         */
        areVerticesOutside(vertices) {
            for (let p of this.planes) {
                let anyInside = false;
                for (let v of vertices) {
                    if (p.distanceToPoint(v) < 0) {
                        anyInside = true;
                        break;
                    }
                }
                // All verticies were outside this plane
                if (!anyInside) {
                    return true;
                }
            }
            // The triangle was not completely outside any of the frustum planes
            return false;
        }
        /**
         * Determines whether and how the given axis-aligned bounding box intersects this frustum.
         * based on page 777 of Real Time Rendering
         * By Akenine-Moller, Haines, and Hoffman
         * @param aabb The axis-aligned bounding box to test.
         * @returns Whether the AAB is inside, outside, or intersecting the frustum.
         */
        aabbIntersect(aabb) {
            let intersecting = false;
            for (let p of this.planes) {
                let result = aabb.planeIntersect(p);
                if (result == AABB_4.Intersection.OUTSIDE) {
                    return AABB_4.Intersection.OUTSIDE;
                }
                else if (result == AABB_4.Intersection.INTERSECTING) {
                    intersecting = true;
                }
            }
            if (intersecting) {
                return AABB_4.Intersection.INTERSECTING;
            }
            else {
                return AABB_4.Intersection.INSIDE;
            }
        }
        /**
         * Gets the values of a matrix arranged into a list of vec4 rows.
         * @param m The matrix to extract the rows from.
         * @returns The rows of the matrix.
         */
        static getMatrixRows(m) {
            let rows = [];
            for (let i = 0; i < 4; ++i) {
                rows.push(gl_matrix_12.vec4.fromValues(m[0 + i], m[4 + i], m[8 + i], m[12 + i]));
            }
            return rows;
        }
        /**
         * Gets the values of a matrix arranged into a list of vec4 columns.
         * @param m The matrix to extract the columns from.
         * @returns The columns of the matrix.
         */
        static getMatrixCols(m) {
            let rows = [];
            for (let i = 0; i < 4; ++i) {
                rows.push(gl_matrix_12.vec4.fromValues(m[i * 4], m[i * 4 + 1], m[i * 4 + 2], m[i * 4 + 3]));
            }
            return rows;
        }
    }
    exports.Frustum = Frustum;
});
//# sourceMappingURL=merged.js.map