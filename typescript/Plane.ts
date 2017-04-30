import { vec3, vec4, mat3 } from "gl-matrix";

/**
 * A 3D plane with normal and plane constant d
 */
export class Plane {
    /**
     * Constructs a plane.
     * @param n The normal pointing toward the positive side of the plane.
     * @param d The d value of the plane equation.
     */
    constructor(public n: vec3, public d: number) {}

    /**
     * Constructs a plane given a normal and a point on the plane.
     * @param n The normal pointing toward the positive side of the plane.
     * @param p A point on the plane.
     * @returns The new plane.
     */
    static fromNormalAndPoint(n: vec3, p: vec3): Plane {
        return new Plane(n, vec3.dot(n, p));
    }
    
    /**
     * Creates a new plane by cloning the values of an existnig one.
     * Prevents changing values in one plane from affecting the other.
     * @param p The plane to clone.
     * @returns The cloned plane.
     */
    static clone(p: Plane): Plane {
        return new Plane(vec3.clone(p.n), p.d);
    }
    
    /**
     * Creates a new plane given three different points on the plane.
     * @param p0 A point on the plane.
     * @param p1 Another point on the plane.
     * @param p2 Another point on the plane.
     * @returns A new plane passing through all three points.
     */
    static from3Points(p0: vec3, p1: vec3, p2: vec3): Plane {
        let n: vec3 = vec3.create();
        let v: vec3 = vec3.create();
        let u: vec3 = vec3.create();
        
        vec3.subtract(v, p1, p0);
        vec3.subtract(u, p2, p0);
        
        vec3.cross(n, v, u);
        vec3.normalize(n, n);
        
        return new Plane(n, vec3.dot(n, p0));
    }
    
    /**
     * Normalizes the plane so that the length of the plane normal is one.
     */
    normalize(): void {
        let scale: number = 1 / vec3.length(this.n);
        vec3.scale(this.n, this.n, scale);
        this.d *= scale;
    }
    
    /**
     * Calculates the signed distance from the plane to a point.
     * @param p The point.
     * @returns The signed distance.
     */
    distanceToPoint(p: vec3): number {
        // Insert point into plane equation
        return this.n[0] * p[0] + this.n[1] * p[1] + this.n[2] * p[2] + this.d;
    }
    
    /**
     * Returns some point on the plane.  The point calculated is just the simplest one to derive and has no other meaning.
     * @returns Some point on the plane.
     */
    pointOnPlane(): vec3 {
        // Find an intercept by setting the other two values to zero.
        // Avoid dividing by zero if part of the normal is already zero.
        // If normal is properly normalized, then at least one value should be non-zero.
        if (this.n[0] != 0) {
            return vec3.fromValues(-this.d / this.n[0], 0, 0);
        } else if (this.n[1] != 0) {
            return vec3.fromValues(0, -this.d / this.n[1], 0);
        } else {
            return vec3.fromValues(0, 0, -this.d / this.n[2]);
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
    static intersectionOf3Planes(p1: Plane, p2: Plane, p3: Plane): vec3|false {
        let m = mat3.fromValues(p1.n[0], p2.n[0], p3.n[0], p1.n[1], p2.n[1], p3.n[1], p1.n[2], p2.n[2], p3.n[2]);
        let det = mat3.determinant(m);
        
        if (det == 0) {
            // No intersection
            return false;
        }
        
        let temp1: vec3 = vec3.create();
        let temp2: vec3 = vec3.create();
        let temp3: vec3 = vec3.create();
        
        // d = point dot normal already
        vec3.cross(temp1, p2.n, p3.n);
        vec3.scale(temp1, temp1, p1.d);
        
        vec3.cross(temp2, p3.n, p1.n);
        vec3.scale(temp2, temp2, p2.d);
        
        vec3.cross(temp3, p1.n, p2.n);
        vec3.scale(temp3, temp3, p3.d);
        
        vec3.add(temp1, temp1, temp2);
        vec3.add(temp1, temp1, temp3);
        vec3.scale(temp1, temp1, 1 / det);
        vec3.negate(temp1, temp1);
        
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
    intersectLine(p1: vec3, p2: vec3): vec3|false {
        let temp = vec3.create();
        vec3.subtract(temp, p2, p1);
        vec3.normalize(temp, temp);
        
        let L = vec4.fromValues(this.n[0], this.n[1], this.n[2], this.d);
        let S = vec4.fromValues(p1[0], p1[1], p1[2], 1);
        let V = vec4.fromValues(temp[0], temp[1], temp[2], 0);

        let denom = vec4.dot(L, V);
        
        if (denom == 0) {
            return false;
        }
        
        let t = -(vec4.dot(L, S) / denom);
        
        vec3.scale(temp, temp, t);
        vec3.add(temp, vec3.fromValues(S[0], S[1], S[2]), temp);
        return temp;
    }
    
    /**
     * Clips an edge loop against this plane.
     * Based on page 236-238 of Mathematics for 3D Game Programming and Computer Graphics
     * By Eric Lengyel
     * @param vertices A list of vertices arranged into a loop.
     * @returns A new list of vertices that all lie on or inside the plane. 
     */
    clipConvexPolygon(vertices: vec3[]): vec3[]|false {
        // 4D plane
        let L = vec4.fromValues(this.n[0], this.n[1], this.n[2], this.d);
        
        // Classify the vertices as lying on positive or negative sides of the plane
        let classified: ClassifiedVertex[] = [];
        let allOutside: boolean = true;
        for (let v of vertices) {
            let dist: number = this.distanceToPoint(v);
            // Consider anything very close to the plane as being on it
            if (0 < dist && dist <= 0.001) {
                dist = 0;
                allOutside = false;
            } else if (dist > 0) {
                dist = 1;
            } else {
                dist = -1;
                allOutside = false;
            }
            
            classified.push({v:v, dist:dist});
        }
        
        // Check if the polygon is completely outside
        if (allOutside) {
            return false;
        }
        
        // Visit each pair of verticies in the loop
        let newVertices: vec3[] = [];
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
            
            if ((ci != 1 && cj == 1) || (ci == 1 && cj != 1)){
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

interface ClassifiedVertex {
    v: vec3;
    dist: number
}