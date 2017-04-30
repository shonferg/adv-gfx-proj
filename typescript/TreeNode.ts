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

    static beginShader(newShader: ShaderProgram): boolean {
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

    static endShader(): void {
        if (TreeNode.currentShader != null) {
            TreeNode.currentShader.end();
            TreeNode.currentShader = null;
        }
    }
}
