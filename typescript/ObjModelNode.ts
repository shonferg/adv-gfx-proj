import { MeshData, TriangleJson } from "./MeshData";
import { vec3, vec2 } from "gl-matrix";
import { AABB } from "./AABB";
import { TreeNode } from "./TreeNode";
import { MeshInstance } from "./MeshInstance";
import { INPUT_URL, normalMapShaderProgram, defaultShaderProgram } from "./rasterize";
import { MaterialData, MaterialJson } from "./MaterialData";
import { getTextFile } from "./util";

/**
 * Intermediate vertex format used during OBJ loading
 */
class ObjVertex {
    positionIndex: number;
    normalIndex: number;
    texCoordIndex: number;
}

/**
 * Intermediate mesh format used during OBJ loading
 */
class ObjMesh {
    groupName: string;
    materialName: string;
    triangles: ObjVertex[][] = [];
}

/**
 * A version of MeshData which loads limited information from OBJ files into WebGL buffers.
 */
export class ObjModelNode extends TreeNode {

    /**
     * Decodes a subset of the OBJ file format.
     * Based on the OBJ file spec:
     * http://www.cs.utah.edu/~boulos/cs3505/obj_spec.pdf
     * @param objUrl The URL of the OBJ file to load.
     * @param mtlUrl The URL of the MTL file to load or null if there is not one.
     * @param position The position to place the newly created mesh instances.
     * @param scale The scale to apply to the newly created mesh instances.
     * @param scaleTo1by1 Whether or not the OBJ file should be scaled to fit within a 1x1x1 cube.
     * @param defaultMaterial The material to use if the MTL file does not contain a definition that matches the OBJ file, or when there is no MTL file.
     */
    static create(objUrl: string, mtlUrl: string, position: vec3, scale: vec3, scaleTo1by1: boolean, defaultMaterial: MaterialJson): Promise<ObjModelNode> {
        return new Promise(async function (resolve, reject) {
            let objFileText = await getTextFile(INPUT_URL + objUrl);

            if (objFileText == null) {
                reject(Error("Unable to load OBJ file!"));
            }

            let materials: MaterialData[] = [];
            let useNormalMap: boolean[] = [];

            // Create default material
            materials[0] = MaterialData.load(defaultMaterial);
            useNormalMap[0] = defaultMaterial.normalTexture != false;

            if (mtlUrl != null) {
                let mtlFileText = await getTextFile(INPUT_URL + mtlUrl);

                if (mtlUrl == null) {
                    reject(Error("Unable to load MTL file!"));
                }

                let mtlMats = ObjModelNode.processMtlFile(mtlFileText, defaultMaterial);

                for (let key in mtlMats) {
                    materials[key] = MaterialData.load(mtlMats[key]);
                    useNormalMap[key] = mtlMats[key].normalTexture != false;
                }
            }

            let node = new ObjModelNode();
            resolve(node); // return the node now... meshes will be added to it as they are finished loading

            let objPositions: vec3[] = [];
            let objNormals: vec3[] = [];
            let objTexCoords: vec2[] = [];

            let objMeshes: ObjMesh[] = [];

            let currentMesh = new ObjMesh();
            currentMesh.groupName == null;
            objMeshes.push(currentMesh);

            // interpret lines from OBJ file
            let currentStart: number = 0;
            let nextNewLine: number = 0;
            let line: string;

            while (currentStart != -1) {
                // Split is too slow as it creates a huge array of strings, so use
                // indexOf and substr to fetch the lines of the file
                nextNewLine = objFileText.indexOf("\n", currentStart);

                if (nextNewLine != -1) {
                    line = objFileText.substr(currentStart, nextNewLine - currentStart);
                    currentStart = nextNewLine +1;
                } else {
                    line = objFileText.substr(currentStart);
                    currentStart = -1;
                }

                // Process line
                let parts = line.split(" ");

                if (parts.length == 0) {
                    continue;
                }

                let partsLength = parts.length;
                let numbers = []
                for (let p = 0; p < partsLength; ++p) {
                    parts[p] = parts[p].trim();
                    let n = parseFloat(parts[p]);
                    if (!isNaN(n)) {
                        numbers.push(n);
                    }
                }

                let numLen = numbers.length;

                switch (parts[0]) {
                    case "g": // mesh group
                        if (currentMesh.groupName != null) {
                            // This is not the first group, so create a new mesh and push it into the list
                            currentMesh = new ObjMesh();
                            objMeshes.push(currentMesh);
                        }
                        // Always set the name, even if it's the first one
                        currentMesh.groupName = parts[1];

                        break;
                    case "usemtl": // material setting for group
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
                    case "v": // vertex
                        if (numLen > 2) {
                            let v = vec3.fromValues(numbers[0], numbers[1], numbers[2]);
                            objPositions.push(v);
                        }
                        break;
                    case "vt": // uv
                        if (numLen > 1) {
                            let uv = vec2.fromValues(numbers[0], numbers[1]);
                            objTexCoords.push(uv);
                        }
                        break;
                    case "vn": // normal
                        if (numLen > 2) {
                            let n = vec3.fromValues(numbers[0], numbers[1], numbers[2]);
                            objNormals.push(n);
                        }
                        break;
                    case "f": // polygon face
                        // Faces may contain only vertex indices or separate vertex, normal, and texcoord indices
                        // Ex 1: f 9854 9798 9800 9856
                        // Ex 2: f 12107/12457/12107 12108/12458/12108 12109/12459/12109

                        let faceVerts: ObjVertex[] = [];

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
                                } else {
                                    newVertex.normalIndex = newVertex.positionIndex;
                                }
                            } else {
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
                let bounds: AABB = AABB.createEmpty();
                for (let v of objPositions) {
                    bounds.addPoint(v);
                }

                // Normalize positions to 0,1 cube
                let extents = bounds.extents();
                let scaleFactor = 1 / Math.max(Math.max(extents[0], extents[1]), extents[2]);
                for (let v of objPositions) {
                    vec3.subtract(v, v, bounds.min);
                    vec3.scale(v, v, scaleFactor);
                }
            }

            // Check if uvs were provided.  Only support normals from files that provide uvs for every vertex.
            if (objTexCoords.length == 0) {
                // Use spherical coordinates from center so texture is visible, but probably not in any particular place
                for (let v of objPositions) {
                    let temp = vec3.clone(v);
                    vec3.subtract(temp, temp, vec3.fromValues(0.5, 0.5, 0.5));
                    let r = vec3.length(temp);
                    let theta = Math.acos(temp[1] / r);
                    let rho = Math.atan2(temp[2], temp[0]);
                    objTexCoords.push(vec2.fromValues(rho, -theta));
                }
            }

            // Check if normals were provided.  Only support normals from files that provide normals for every vertex.
            if (objNormals.length == 0) {
                // Initialize normals to zero for all vertices
                for (let v of objPositions) {
                    objNormals.push(vec3.create());
                }

                
                for (let m of objMeshes) {
                    for (let t of m.triangles) {
                        let p0 = objPositions[t[0].positionIndex];
                        let p1 = objPositions[t[1].positionIndex];
                        let p2 = objPositions[t[2].positionIndex];

                        // Calculate normal for triangle
                        let tmp1 = vec3.create();
                        vec3.subtract(tmp1, p1, p0);
                        let n = vec3.create();
                        let tmp2 = vec3.create();
                        vec3.subtract(tmp2, p2, p0);
                        vec3.cross(n, tmp1, tmp2);
                        vec3.normalize(n, n);

                        // Add normal values to running totals.  Since all normals are unit length, normalizing them at the end will result in a correct average.
                        let n0 = objNormals[t[0].normalIndex];
                        let n1 = objNormals[t[1].normalIndex];
                        let n2 = objNormals[t[2].normalIndex];
                        vec3.add(n0, n0, n);
                        vec3.add(n1, n1, n);
                        vec3.add(n2, n2, n);
                    }
                }

                // Normalize all the normals at the end to average them
                for (let n of objNormals) {
                    vec3.normalize(n, n);
                }
            }

            for (let m of objMeshes) {
                // Create mesh data asycronously so the game doesn't stall when loading big meshes (like the world)
                ObjModelNode.processMesh(m, objPositions, objNormals, objTexCoords).then(function(data: MeshData) {
                    // Try to look up material by group name
                    let instanceMaterial: MaterialData = null;
                    let instanceUsesNormalMap: boolean = false;
                    if (m.materialName != null && m.materialName in materials) {
                        instanceMaterial = materials[m.materialName];
                        instanceUsesNormalMap = useNormalMap[m.materialName];
                    } else {
                        instanceMaterial = materials[0];
                        instanceUsesNormalMap = useNormalMap[0];
                    }
                    let instance = new MeshInstance(data, instanceMaterial, instanceUsesNormalMap ? normalMapShaderProgram : defaultShaderProgram);
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
    }

    /**
     * Converts OBJ faces, which may share UVs, Normals, etc., to the unique combinations that WebGL requires.
     * @param m The mesh to convert.
     * @param objPositions A list of all position vectors in the OBJ file.
     * @param objNormals A list of all the normals in the OBJ file.
     * @param objTexCoords A list of all texture coordinates in the OBJ file.
     * @return A MeshData object containing the converted data.
     */
    static processMesh(m: ObjMesh, objPositions: vec3[], objNormals: vec3[], objTexCoords: vec2[]): Promise<MeshData> {
        return new Promise(async function (resolve, reject) {
            // Convert OBJ faces to unique vertex/texture/normal combinations
            let positions: vec3[] = [];
            let texCoords: vec2[] = [];
            let normals: vec3[] = [];
            let triangles: number[][] = [];

            let vertexIndex: number[][][] = [];

            let nextVertex: number = 0;

            for (let t of m.triangles) {
                let newTriangle: number[] = [];
                for (let i = 0; i < 3; ++i) {
                    let v = t[i];
                    if (v.positionIndex in vertexIndex) {
                        if (v.texCoordIndex in vertexIndex[v.positionIndex]) {
                            if (v.normalIndex in vertexIndex[v.positionIndex][v.texCoordIndex]) {
                                // Vertex already exists.  Use it.
                                newTriangle[i] = vertexIndex[v.positionIndex][v.texCoordIndex][v.normalIndex];
                                continue;
                            }
                        } else {
                            vertexIndex[v.positionIndex][v.texCoordIndex] = [];
                        }
                    } else {
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

            let data = new MeshData();
            data.update({ vertices: positions, normals: normals, uvs: texCoords, triangles: triangles });

            resolve(data);
        });
    }

    /**
     * Process MTL file to extract material data.
     * @param mtlFileText The text of teh MTL file.
     * @param defaultMaterial The material to use if no material in the MTL file matches the name in the OBJ file.
     * @return A list of material info in the same format as JSON material files, which can be used to create MaterialData.
     */
    static processMtlFile(mtlFileText: string, defaultMaterial: MaterialJson): MaterialJson[] {
        let materials: MaterialJson[] = [];

        let currentMaterial: MaterialJson = null;
        let currentMaterialName: string = null;

        let currentStart: number = 0;
            let nextNewLine: number = 0;
            let line: string;

        while (currentStart != -1) {
            // Split is too slow as it creates a huge array of strings, so use
            // indexOf and substr to fetch the lines of the file
            nextNewLine = mtlFileText.indexOf("\n", currentStart);

            if (nextNewLine != -1) {
                line = mtlFileText.substr(currentStart, nextNewLine - currentStart);
                currentStart = nextNewLine +1;
            } else {
                line = mtlFileText.substr(currentStart);
                currentStart = -1;
            }

            let parts = line.trim().split(" ");

            if (parts.length == 0) {
                continue;
            }

            let partsLength = parts.length;
            let numbers = []
            for (let p = 0; p < partsLength; ++p) {
                parts[p] = parts[p].trim();
                let n = parseFloat(parts[p]);
                if (!isNaN(n)) {
                    numbers.push(n);
                }
            }

            let numLen = numbers.length;

            switch (parts[0]) {
                case "newmtl": // material group
                    // Clone from defaults to start
                    currentMaterial = JSON.parse(JSON.stringify(defaultMaterial));
                    materials[parts[1]] = currentMaterial;
                    break;
                case "Ns": // specular exponent
                    currentMaterial.n = numbers[0];
                    break;
                case "d": // alpha
                    currentMaterial.alpha = numbers[0];
                    break;
                case "Ka": // ambient
                    currentMaterial.ambient[0] = numbers[0];
                    currentMaterial.ambient[1] = numbers[1];
                    currentMaterial.ambient[2] = numbers[2];
                    break;
                case "Kd": // diffuse
                    currentMaterial.diffuse[0] = numbers[0];
                    currentMaterial.diffuse[1] = numbers[1];
                    currentMaterial.diffuse[2] = numbers[2];
                    break;
                case "Ks": // specular
                    currentMaterial.specular[0] = numbers[0];
                    currentMaterial.specular[1] = numbers[1];
                    currentMaterial.specular[2] = numbers[2];
                    break;
                case "map_Kd": // diffuse map
                    currentMaterial.texture = parts[1];
                    break;
                case "map_Ks": // specular map
                    currentMaterial.specTexture = parts[1];
                    break;
                case "map_bump": // normal map
                    currentMaterial.normalTexture = parts[1];
                    break;
            }
        }

        return materials;
    }
}