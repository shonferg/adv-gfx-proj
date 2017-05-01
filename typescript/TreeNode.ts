import { AABB, Intersection } from "./AABB";
import { Frustum } from "./Frustum";
import { ShaderProgram } from "./shaderPrograms/ShaderProgram";
import { DefaultShaderProgram } from "./shaderPrograms/DefaultShaderProgram";
import { MeshInstance } from "./MeshInstance";

/**
 * A node in the bounding volume hierarchy tree used to speed up frustum intersection tests
 */
export class TreeNode {
    aabb: AABB;
    children: TreeNode[];

    static currentShader: ShaderProgram;

    /**
     * Creates a new TreeNode.
     */
    constructor() {
        this.aabb = AABB.createEmpty();
        this.children = [];
    }

    /**
     * Used to create a list of objects that pass the view frustum culling test which can be further sorted before rendering.
     * Called recursively on child nodes and mesh instances to gather a list of all visible objects in a given tree.
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
        
        for (let child of this.children) {
            child.appendVisibleSet(frustum, drawAll, visibleSet);
        }
    }
    
    /**
     * Updates the bounds of all objects in the culling hierarchy recursively.
     */
    updateBounds(): void {
        for (let child of this.children) {
            // Update bounds of child and then combine it into the bounds of this object
            child.updateBounds();
            this.aabb = AABB.merge(this.aabb, child.aabb);
        }
    }
}
