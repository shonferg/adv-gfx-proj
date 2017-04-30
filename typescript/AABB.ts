import { vec3 } from "gl-matrix";
import { Plane } from "./Plane";

/**
 * Enum for intersection test results.
 */
export enum Intersection {
    /** Object one was completely outside object two. */
    OUTSIDE = 0,
    /** Object one was completely inside object two. */
    INSIDE = 1,
    /** The two objects overlap to some degree. */
    INTERSECTING = 2
}

/**
 * An axis-aligned bounding box.
 */
export class AABB {
    /**
     * Create a new axis-aligned bounding box.
     * @param min The minimum extent of the box.
     * @param max The maximum extent of the box.
     */
    constructor(public min: vec3, public max: vec3) {}
    
    /**
     * Creates an empty bounding box with min and max set to positive and negative infinity.  Points can be added to expand the box.
     * @returns A new empty axis-aligned bounding box.
     */
    static createEmpty(): AABB {
        return new AABB(vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), vec3.fromValues(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE));
    }
        
    /**
     * Calculates the volume of the bounding box.
     * @returns The volume.
     */
    volume(): number {
        let e = this.extents();
        return e[0] * e[1] * e[2];
    }
    
    /**
     * Calculates the length, width, and height of the box.
     * @returns The extents.
     */
    extents(): vec3 {
        let temp: vec3 = vec3.create();
        vec3.subtract(temp, this.max, this.min);
        return temp;
    }
    
    /**
     * Calculates the center of the box.
     * @returns The center.
     */
    center(): vec3 {
        let temp: vec3 = vec3.create();
        vec3.add(temp, this.max, this.min);
        vec3.scale(temp, temp, 0.5);
        return temp;        
    }
    
    /**
     * Generates a list of all 8 corners of the bounding box.
     * @returns The corners.
     */
    corners(): vec3[] {
        let corners: vec3[] = [];
        for (let x of [this.min[0], this.max[0]]) {
            for (let y of [this.min[1], this.max[1]]) {
                for (let z of [this.min[2], this.max[2]]) {
                    corners.push(vec3.fromValues(x, y, z));
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
    static clone(b: AABB): AABB {
        return new AABB(vec3.clone(b.min), vec3.clone(b.max));
    }
    
    /**
     * Determines whether this bounding boxes intersects with another one.
     * @param b The bounding box to compare this one to.
     * @returns True if the boxes intersect, false otherwise.
     */
    intersects(b: AABB): boolean {
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
    halfDiagonal(): vec3 {
        let temp: vec3 = vec3.create();
        vec3.subtract(temp, this.max, this.min);
        vec3.scale(temp, temp, 0.5);
        return temp;        
    }
    
    /**
     * Adds a point to the bounding box, causing it to expand to fit the new point.
     * @param p The point to add.
     */
    addPoint(p: vec3): void {
        vec3.max(this.max, this.max, p);
        vec3.min(this.min, this.min, p);
    }
    
    /**
     * creates a new box that contains two other boxes.
     * @param a The first box.
     * @param b The second box.
     * @returns The merged box.
     */
    static merge(a: AABB, b: AABB): AABB {
        let max = vec3.create();
        let min = vec3.create();
        vec3.min(min, a.min, b.min);
        vec3.max(max, a.max, b.max);
        
        return new AABB(min, max);
    }
    
    /**
     * Determine if two boxes are essentially equal (within a small epsilon)
     * @param a The first box.
     * @param b The second box
     * @returns True if the boxes are roughtly equivalent, false otherwise.
     */
    static areSimilar(a: AABB, b: AABB): boolean {
        let dmax: vec3 = vec3.create();
        let dmin: vec3 = vec3.create();
        vec3.subtract(dmax, a.max, b.max);
        vec3.subtract(dmin, a.min, b.min);
        
        let epsilon = 0.0001;
        
        return (
            Math.abs(dmax[0]) < epsilon &&
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
    containsPoint(v: vec3): boolean {
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
    doesRayIntersect(origin: vec3, dir: vec3): boolean {
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
    planeIntersect(plane: Plane): Intersection {
        let c = this.center();
        let h = this.halfDiagonal();
        let e = h[0] * Math.abs(plane.n[0]) + h[1] * Math.abs(plane.n[1]) + h[2] * Math.abs(plane.n[2]);
        let s = vec3.dot(c, plane.n) + plane.d;
        if (s - e > 0) {
            return Intersection.OUTSIDE;
        } else if (s + e < 0) {
            return Intersection.INSIDE;
        } else {
            return Intersection.INTERSECTING;
        }
    }
}