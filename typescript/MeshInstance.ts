import { MaterialData } from "./MaterialData";
import { MeshData } from "./MeshData";
import { vec3, quat, mat4 } from "gl-matrix";
import { gl, Eye } from "./rasterize";
import { Intersection } from "./AABB";
import { Frustum } from "./Frustum";
import { TreeNode } from "./TreeNode";
import { ShaderProgram } from "./shaderPrograms/ShaderProgram";
import { DefaultShaderProgram } from "./shaderPrograms/DefaultShaderProgram";

/**
 * An individual mesh positioned in the 3D world.
 * It can share mesh and material data with other instances, but it has its own transform data.
 */
export class MeshInstance extends TreeNode {
    position: vec3;
    rotation: quat;
    scale: vec3;
    primitiveType: number;

    /**
     * Constructs a new mesh instance with identity transforms and gl.TRIANGLES primitive type.
     * @param data The mesh data for the instance.
     * @param material The material data for the instance.
     */
    constructor(public data: MeshData, public material: MaterialData, public shader: DefaultShaderProgram) {
        super();
        
        this.position = vec3.fromValues(0, 0, 0);
        this.rotation = quat.create();
        this.scale = vec3.fromValues(1, 1, 1);
        this.primitiveType = gl.TRIANGLES;
    }

    /**
     * Used to create a list of objects that pass the view frustum culling test which can be further sorted before rendering.
     * @param frustum The frustum to cull against.
     * @param drawAll Whether or not to ignore future fustum checks.
     * @param visibleSet The visible set array to append objects that pass the culling tests.
     */
    appendVisibleSet(frustum: Frustum, drawAll: boolean, visibleSet: MeshInstance[]): void {
        
        // Try to cull AABB against the frustum
        if (drawAll == false) {
            let intersect = frustum.aabbIntersect(this.aabb);
            
            if (intersect == Intersection.INSIDE) {
                // Completely inside, so set drawAll to true to avoid future checks
                drawAll = true;
            } else if (intersect == Intersection.OUTSIDE) {
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
    updateBounds(): void {
        // Find the min/max of the verticies in world coordinates
        let mMatrix = mat4.create();
        mat4.fromRotationTranslationScale(mMatrix, this.rotation, this.position, this.scale);
        
        this.aabb.max = vec3.fromValues(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE); // bbox corner
        this.aabb.min = vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE); // other corner
        
        let temp = vec3.create();
        for (let v of this.data.vertices) {
            // Transform to world coords
            vec3.transformMat4(temp, v, mMatrix);
            
            // update bounding volume min and max
            vec3.max(this.aabb.max, this.aabb.max, temp);
            vec3.min(this.aabb.min, this.aabb.min, temp);
        }
    }
}
