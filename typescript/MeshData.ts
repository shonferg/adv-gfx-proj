import { vec3, vec2 } from "gl-matrix";
import { gl } from "./rasterize";
import { MaterialJson } from "./MaterialData";

/**
 * Format for triangle JSON files
 */
export interface TriangleJson {
    material: MaterialJson;
    vertices: number[][];
    normals: number[][];
    uvs: number[][];
    triangles: number[][];
}

/**
 * Format for meshs created within the program.
 */
export interface Mesh {
    vertices: vec3[];
    triangles: number[][];
    normals: vec3[];
    uvs: vec2[];
}

/**
 * Holds the mesh data used to render 3D object instances.  Multiple instances can reference the same mesh data.
 */
export class MeshData implements Mesh {
    vertices: vec3[];
    triangles: number[][];
    normals: vec3[];
    tangents: vec3[];
    binormals: vec3[];
    uvs: vec2[];

    vertexBuffer: WebGLBuffer;
    normalBuffer: WebGLBuffer;
    tangentBuffer: WebGLBuffer = null;
    binormalBuffer: WebGLBuffer = null;
    uvBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;

    triangleCount: number;

    /**
     * Constructor.  Creates WebGL buffers but does not place any data in them.
     */
    constructor() {
        this.vertices = [];
        this.triangles = [];
        this.normals = [];
        this.uvs = [];

        // create the buffers
        this.vertexBuffer = gl.createBuffer(); // init empty webgl set vertex coord buffer
        this.normalBuffer = gl.createBuffer(); // init empty webgl set normal component buffer
        this.tangentBuffer = gl.createBuffer();
        this.binormalBuffer = gl.createBuffer();
        this.uvBuffer = gl.createBuffer(); // init empty webgl set uv coord buffer
        this.indexBuffer = gl.createBuffer(); // init empty triangle index buffer
    }
    
    /**
     * Updates the WebGL buffers with new data.
     * @param mesh The new mesh data.
     */
    update(mesh: Mesh): void {
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
        for (let i = 0; i < numVerts; i++) { // verts in set
            let vtxToAdd = mesh.vertices[i]; // get vertex to add
            let normToAdd = mesh.normals[i]; // get normal to add
            let uvToAdd = mesh.uvs[i]; // get uv to add
            
            glVertices.push(vtxToAdd[0], vtxToAdd[1], vtxToAdd[2]); // put coords in set vertex list
            glNormals.push(normToAdd[0], normToAdd[1], normToAdd[2]); // put normal in set normal list
            glUvs.push(uvToAdd[0], uvToAdd[1]); // put uv in set uv list
        } // end for vertices in set

        // send the vertex coords, normals and uvs to webGL; load texture
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(glVertices), gl.STATIC_DRAW); // data in
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(glNormals), gl.STATIC_DRAW); // data in
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(glUvs), gl.STATIC_DRAW); // data in

        // set up the triangle index array, adjusting indices across sets
        let glTriangles = []; // flat index list for webgl
        this.triangleCount = mesh.triangles.length; // number of tris in this set
        for (let i = 0; i < this.triangleCount; ++i) {
            let triToAdd = mesh.triangles[i]; // get tri to add
            glTriangles.push(triToAdd[0], triToAdd[1], triToAdd[2]); // put indices in set list
        }

        // send the triangle indices to webGL
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(glTriangles), gl.STATIC_DRAW); // data in  
    }
    
    /**
     * Loads buffer data from JSON structure.
     * @param triangleSet The JSON data structure to load.
     * @returns A new mesh data object constructed from the given JSON data.
     */
    static load(triangleSet: TriangleJson): MeshData {      
        let result = new MeshData();

        result.reload(triangleSet);

        return result;
    }

    /**
     * Creates a MeshData object with WebGL buffers given a raw collection of mesh data
     * @param mesh The mesh data to create buffers from.
     */
    static fromMesh(mesh: Mesh) {
        let md = new MeshData();

        md.update(mesh);

        return md;
    }
    
    /**
     * Loads buffer data from JSON structure into an existing mesh data object.
     * @param triangleSet The JSON data structure to load.
     */
    reload(triangleSet: TriangleJson): void {

        let vertices: vec3[] = MeshData.arrayToVec3(triangleSet.vertices);
        let normals: vec3[] = MeshData.arrayToVec3(triangleSet.normals);
        let uvs: vec2[] = MeshData.arrayToVec2(triangleSet.uvs);

        this.update({vertices: vertices, normals: normals, uvs: uvs, triangles: triangleSet.triangles});
    }

    static arrayToVec3(array: number[][]): vec3[] {
        let vectors: vec3[] = [];
        for(let v of array) {
            vectors.push(vec3.fromValues(v[0], v[1], v[2]));
        }
        return vectors;
    }

    static arrayToVec2(array: number[][]): vec2[] {
        let vectors: vec2[] = [];
        for(let v of array) {
            vectors.push(vec2.fromValues(v[0], v[1]));
        }
        return vectors;
    }

    /**
     * Generates binormals and tangents based on current normals and texcoords
     * Based on page 436-437 of 3D Math Primer for Graphics and Game Development
     * by Fletcher Dunn & Ian PaarhDerry
     */
    updateTangentSpace(): void {
        // Clear the arrays and Start them at (0,0,0) so they can accumulate values
        this.tangents = [];
        this.binormals = [];
        for (let n of this.normals) {
            vec3.normalize(n, n); // make sure normals are normalized
            this.tangents.push(vec3.create());
            this.binormals.push(vec3.create());
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
            let q1 = vec3.create();
            let q2 = vec3.create();
            vec3.subtract(q1, v1, v0);
            vec3.subtract(q2, v2, v0);

            let s1 = uv1[0] - uv0[0];
            let s2 = uv2[0] - uv0[0];

            let t1 = uv1[1] - uv0[1];
            let t2 = uv2[1] - uv0[1];

            // Compute basis vectors for this triangle
            let tangent = vec3.create();
            let binormal = vec3.create();
            let temp1 = vec3.create();
            let temp2 = vec3.create();

            vec3.scale(temp1, q1, t2);
            vec3.scale(temp2, q2, t1);
            vec3.subtract(tangent, temp1, temp2);
            vec3.normalize(tangent, tangent);

            vec3.scale(temp1, q1, -s2);
            vec3.scale(temp2, q2, s1);
            vec3.add(binormal, temp1, temp2);
            vec3.normalize(binormal, binormal);

            // Accumulate them into the running sums
            for (let i = 0; i < 3; ++i) {
                let currentTangent = this.tangents[t[i]];
                let currentBinormal = this.binormals[t[i]];
                vec3.add(temp1, currentTangent, tangent);
                vec3.add(temp2, currentBinormal, binormal);

                // Avoid zeroing out the tangent/binormal
                if (vec3.length(temp1) > 0.01) {
                    vec3.add(currentTangent, currentTangent, tangent);
                }
                if (vec3.length(temp2) > 0.01) {
                    vec3.add(currentBinormal, currentBinormal, binormal);
                }
            }
        }

        // Finally, normalize all the vectors to average
        // across triangle boundaries
        // Also put the tangents and bitangents into the flat format OpenGL likes
        let glTangents: number[] = [];
        let glBinormals: number[] = [];
        let vertexCount = this.vertices.length;
        for(let i = 0; i < vertexCount; ++i) {
            let currentNormal = this.normals[i];
            let currentTangent = this.tangents[i];
            let currentBinormal = this.binormals[i];

            // Ensure tangent is perpendicular to the normal
            let temp = vec3.create();
            vec3.scale(temp, currentNormal, vec3.dot(currentTangent, currentNormal));
            vec3.subtract(currentTangent, currentTangent, temp);
            vec3.normalize(currentTangent, currentTangent);

            // Ensure binormal is perpendicular to the normal
            vec3.scale(temp, currentNormal, vec3.dot(currentBinormal, currentNormal));
            vec3.subtract(currentBinormal, currentBinormal, temp);
            vec3.normalize(currentBinormal, currentBinormal);

            // Normalize both
            glTangents.push(currentTangent[0], currentTangent[1], currentTangent[2]);
            glBinormals.push(currentBinormal[0], currentBinormal[1], currentBinormal[2]);
        }

        // Feed the data into the WebGL buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(glTangents), gl.STATIC_DRAW); // data in

        gl.bindBuffer(gl.ARRAY_BUFFER, this.binormalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(glBinormals), gl.STATIC_DRAW); // data in
    }
}
