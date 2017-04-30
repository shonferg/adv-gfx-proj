import { vec3, mat4, vec4 } from "gl-matrix";
import { Plane } from "./Plane";
import { AABB, Intersection } from "./AABB";
import { TriangleJson, Mesh } from "./MeshData";

/**
 * A 3D frustum consisting of 6 planes
 */
export class Frustum {
    planes: Plane[] = [];
    
    /**
     * Creates a new frustum.
     * @param left The left plane.
     * @param right The right plane.
     * @param bottom The bottom plane.
     * @param top The top plane.
     * @param near The near plane.
     * @param far The far plane.
     */
    constructor(public left: Plane, public right: Plane, public bottom: Plane, public top: Plane, public near: Plane, public far: Plane) { 

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
    clipConvexPolygon(vertices: vec3[]): vec3[]|false {
        // Clip the polygon against every plane.  If any return false, then quit
        for (let p of [this.left, this.right, this.top, this.bottom]) {
            let result = p.clipConvexPolygon(vertices);
            if (result == false) {
                return false;
            } else {
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
    static fromViewProjectionMatrix(m: mat4): Frustum {
        let planes = [];
        
        // Get matrix rows
        let rows = Frustum.getMatrixRows(m);
        
        // Left plane
        let temp = vec4.create();
        vec4.add(temp, rows[3], rows[0]);
        vec4.negate(temp, temp);
        let left = new Plane(vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
        
        // Right plane
        temp = vec4.create();
        vec4.subtract(temp, rows[3], rows[0]);
        vec4.negate(temp, temp);
        let right = new Plane(vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
        
        // Bottom plane
        temp = vec4.create();
        vec4.add(temp, rows[3], rows[1]);
        vec4.negate(temp, temp);
        let bottom = new Plane(vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
        
        // Top plane
        temp = vec4.create();
        vec4.subtract(temp, rows[3], rows[1]);
        vec4.negate(temp, temp);
        let top = new Plane(vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
        
        // Near plane
        temp = vec4.create();
        vec4.add(temp, rows[3], rows[2]);
        vec4.negate(temp, temp);
        let near = new Plane(vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);
        
        // Far plane
        temp = vec4.create();
        vec4.subtract(temp, rows[3], rows[2]);
        vec4.negate(temp, temp);
        let far = new Plane(vec3.fromValues(temp[0], temp[1], temp[2]), temp[3]);

        return new Frustum(left, right, bottom, top, near, far);
    }
    
    /**
     * Determines whether the triangle defined by the three given points is within the frustum.
     * @param v1 Point 1
     * @param v2 Point 2
     * @param v3 Point 3
     * @returns True if the triangle is completely or partialy within the frustum, false otherwise.
     */
    isTriangleOutside(v1: vec3, v2: vec3, v3:vec3): boolean {
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
    areVerticesOutside(vertices: vec3[]): boolean {
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
    aabbIntersect(aabb: AABB): Intersection {
        let intersecting = false;
        for (let p of this.planes) {
            let result = aabb.planeIntersect(p);
            if (result == Intersection.OUTSIDE) {
                return Intersection.OUTSIDE
            } else if (result == Intersection.INTERSECTING) {
                intersecting = true;
            }
        }
        
        if (intersecting) {
            return Intersection.INTERSECTING;
        } else {
            return Intersection.INSIDE;
        }
    }
    
    /**
     * Gets the values of a matrix arranged into a list of vec4 rows.
     * @param m The matrix to extract the rows from.
     * @returns The rows of the matrix.
     */
    static getMatrixRows(m: mat4): vec4[] {
        let rows = [];
        for (let i = 0; i < 4; ++i) {
            rows.push(vec4.fromValues(m[0 + i], m[4 + i], m[8 + i], m[12 + i]));
        }
        return rows;
    }
    
    /**
     * Gets the values of a matrix arranged into a list of vec4 columns.
     * @param m The matrix to extract the columns from.
     * @returns The columns of the matrix.
     */
    static getMatrixCols(m: mat4): vec4[] {
        let rows = [];
        for (let i = 0; i < 4; ++i) {
            rows.push(vec4.fromValues(m[i * 4], m[i * 4 + 1], m[i * 4 + 2], m[i * 4 + 3]));
        }
        return rows;
    }
}