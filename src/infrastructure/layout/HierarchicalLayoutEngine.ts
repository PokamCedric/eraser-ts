/**
 * Hierarchical Layout Engine
 *
 * Computes hierarchical layers for entities based on their dependencies.
 * Uses an inverted algorithm: leaves (nobody depends on them) → Layer 0 (left)
 *                             roots (many depend on them) → Layer max (right)
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

export interface DependencyGraph {
  graph: Map<string, string[]>;
  reverseGraph: Map<string, string[]>;
  nodes: Set<string>;
}

export interface LayerResult {
  layers: Map<number, string[]>;
  layerOf: Map<string, number>;
}

export class HierarchicalLayoutEngine {
  /**
   * Build dependency graph from entities and relationships
   */
  static buildDependencyGraph(
    entities: Entity[],
    relationships: Relationship[]
  ): DependencyGraph {
    const graph = new Map<string, string[]>();
    const reverseGraph = new Map<string, string[]>();
    const nodes = new Set<string>();

    // Add all entities as nodes
    entities.forEach(e => nodes.add(e.name));

    // Build edges from relationships
    relationships.forEach(rel => {
      const from = rel.from.entity;
      const to = rel.to.entity;

      // A → B means "A depends on B"
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from)!.push(to);

      // Reverse: B is depended upon by A
      if (!reverseGraph.has(to)) reverseGraph.set(to, []);
      reverseGraph.get(to)!.push(from);
    });

    return { graph, reverseGraph, nodes };
  }

  /**
   * Compute hierarchical layers using iterative algorithm (no recursion)
   *
   * Algorithm with Dynamic Distance Minimization
   * =============================================
   *
   * EXAMPLE: RBAC System with Posts and Teams
   * ==========================================
   *
   * Dependency Graph:
   * -----------------
   *   posts → users
   *   users → teams
   *   user_roles → users
   *   user_roles → roles
   *   role_permissions → roles
   *   role_permissions → permissions
   *
   * Theoretical Layer Analysis:
   * ---------------------------
   *
   * Roots (don't depend on anyone):
   *   - teams (initial layer 0)
   *   - roles (initial layer 0)
   *   - permissions (initial layer 0)
   *
   * Dependents:
   *   - users depends on teams (L0) → initial layer 1
   *   - posts depends on users (L1) → initial layer 2
   *   - user_roles depends on users (L1) AND roles (L0) → max(1, 0) + 1 = initial layer 2
   *   - role_permissions depends on roles (L0) AND permissions (L0) → max(0, 0) + 1 = initial layer 1
   *
   * PROBLEM IDENTIFIED:
   *   user_roles and role_permissions both depend on 'roles',
   *   but are at different layers (2 vs 1) because user_roles has a longer
   *   dependency path (users → teams).
   *
   *
   * SOLUTION: Dynamic Distance Minimization
   * ========================================
   *
   * Phase 1: Initial Layer Assignment
   * ----------------------------------
   * Base rule: Layer = max(layer of dependencies) + 1
   *
   * Initial state:
   *   - Layer 0: teams, roles, permissions (roots)
   *   - Layer 1: users
   *   - Layer 2: posts, user_roles
   *   - Layer 1: role_permissions
   *
   * Phase 2: Distance Minimization (applied during computation)
   * ------------------------------------------------------------
   *
   * Step 1: Process 'users'
   *   users depends on teams (L0)
   *   → users = max(0) + 1 = Layer 1 ✓
   *
   * Step 2: Process 'user_roles'
   *   user_roles depends on users (L1) AND roles (L0)
   *   → Distance between dependencies: |L1 - L0| = 1 (distance detected!)
   *
   *   Algorithm attempts to reduce distance:
   *   Question: Can 'roles' move from L0 → L1?
   *
   *   Check 1: Does roles have dependencies at L0?
   *     → No, roles is a root ✓
   *
   *   Check 2: Are there entities depending on roles at L0 or L1?
   *     → No, user_roles is not yet placed ✓
   *
   *   Result: Move roles from L0 → L1 ✓
   *
   *   Recalculation after adjustment:
   *   → user_roles = max(users=1, roles=1) + 1 = Layer 2 ✓
   *
   * Step 3: Process 'role_permissions'
   *   role_permissions depends on roles (now L1) AND permissions (L0)
   *   → Distance between dependencies: |L1 - L0| = 1 (distance detected!)
   *
   *   Algorithm attempts to reduce distance:
   *   Question: Can 'permissions' move from L0 → L1?
   *
   *   Check 1: Does permissions have dependencies at L0?
   *     → No, permissions is a root ✓
   *
   *   Check 2: Are there entities depending on permissions at L0 or L1?
   *     → No, role_permissions is not yet placed ✓
   *
   *   Result: Move permissions from L0 → L1 ✓
   *
   *   Recalculation after adjustment:
   *   → role_permissions = max(roles=1, permissions=1) + 1 = Layer 2 ✓
   *
   * Result before inversion:
   * ------------------------
   *   - Layer 0: teams
   *   - Layer 1: roles, permissions, users
   *   - Layer 2: posts, user_roles, role_permissions  ← All at same layer! ✓
   *
   * Phase 3: Inversion (roots → right, leaves → left)
   * --------------------------------------------------
   *   - Layer 2 → Layer 0: posts, user_roles, role_permissions
   *   - Layer 1 → Layer 1: roles, permissions, users
   *   - Layer 0 → Layer 2: teams
   *
   * Final Result:
   * -------------
   *   Layer 0: posts, user_roles, role_permissions
   *   Layer 1: roles, permissions, users
   *   Layer 2: teams
   *
   * Benefits:
   * ---------
   * ✓ Minimizes unnecessary distances between related entities
   * ✓ Keeps entities with common dependencies together (user_roles and role_permissions)
   * ✓ More compact and readable diagrams
   * ✓ Respects all topological constraints (no cycles)
   */
  static computeLayers(
    dependencyGraph: DependencyGraph,
    entities: Entity[]
  ): LayerResult {
    const { graph, nodes } = dependencyGraph;
    const layerOf = new Map<string, number>();

    // Step 1: Count incoming dependencies for each node
    const inDegree = new Map<string, number>();
    for (const node of nodes) {
      inDegree.set(node, 0);
    }
    for (const [, dependencies] of graph.entries()) {
      for (const dep of dependencies) {
        if (nodes.has(dep)) {
          inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
        }
      }
    }

    // Step 2: Find all roots (nodes with no dependencies)
    const queue: string[] = [];
    for (const node of nodes) {
      const deps = graph.get(node) || [];
      if (deps.length === 0) {
        layerOf.set(node, 0);
        queue.push(node);
      }
    }

    console.log('=== ITERATIVE LAYER COMPUTATION ===');
    console.log(`Starting with ${queue.length} roots:`, queue.join(', '));

    // Step 3: Process nodes level by level (iterative topological sort)
    let processed = 0;
    while (queue.length > 0) {
      const node = queue.shift()!;
      processed++;
      console.log(`\nProcessing: ${node} (Layer ${layerOf.get(node)})`);

      // For each node that depends on this one
      for (const [dependent, dependencies] of graph.entries()) {
        if (!dependencies.includes(node)) continue;

        console.log(`  Found dependent: ${dependent} (depends on: ${dependencies.join(', ')})`);

        // Check if all dependencies of 'dependent' have been processed
        const allDepsProcessed = dependencies.every(dep => layerOf.has(dep));

        if (allDepsProcessed) {
          // Compute layer: max(layer of dependencies) + 1
          const depLayers = dependencies.map(dep => ({ dep, layer: layerOf.get(dep)! }));
          const maxDepLayer = Math.max(...depLayers.map(d => d.layer));
          const minDepLayer = Math.min(...depLayers.map(d => d.layer));
          const newLayer = maxDepLayer + 1;

          console.log(`    All dependencies processed. Dep layers:`, depLayers);
          console.log(`    Max dependency layer: ${maxDepLayer}, Min: ${minDepLayer}, new layer: ${newLayer}`);

          // Check if we can reduce distance by moving lower dependencies up
          if (maxDepLayer - minDepLayer > 0) {
            console.log(`    Distance between dependencies: ${maxDepLayer - minDepLayer}`);

            // Try to move lower dependencies closer to maxDepLayer
            for (const { dep: depName, layer: depLayer } of depLayers) {
              if (depLayer < maxDepLayer) {
                const targetDepLayer = maxDepLayer; // Try to align with max
                console.log(`    Checking if ${depName} can move from L${depLayer} to L${targetDepLayer}`);

                // Check if this dependency can be moved without violating constraints
                if (this._canMoveNodeToLayer(depName, targetDepLayer, graph, layerOf)) {
                  console.log(`    ✓ Moving ${depName}: L${depLayer} → L${targetDepLayer} to reduce distance`);
                  layerOf.set(depName, targetDepLayer);

                  // Need to reprocess nodes that depend on this moved node
                  for (const [otherDependent, otherDeps] of graph.entries()) {
                    if (otherDeps.includes(depName) && !queue.includes(otherDependent)) {
                      queue.push(otherDependent);
                    }
                  }
                } else {
                  console.log(`    ✗ Cannot move ${depName} to L${targetDepLayer}`);
                }
              }
            }

            // Recalculate after potential moves
            const updatedMaxDepLayer = Math.max(...dependencies.map(dep => layerOf.get(dep)!));
            const updatedNewLayer = updatedMaxDepLayer + 1;

            if (updatedNewLayer !== newLayer) {
              console.log(`    After dependency adjustments: new layer ${newLayer} → ${updatedNewLayer}`);
            }

            // Set the dependent's layer
            const currentLayer = layerOf.get(dependent);
            if (!currentLayer || updatedNewLayer > currentLayer) {
              console.log(`    ${currentLayer ? `Updating ${dependent}: L${currentLayer} → L${updatedNewLayer}` : `Setting ${dependent}: L${updatedNewLayer}`}`);
              layerOf.set(dependent, updatedNewLayer);

              if (!queue.includes(dependent)) {
                queue.push(dependent);
              }
            } else {
              console.log(`    Keeping ${dependent} at L${currentLayer} (new would be L${updatedNewLayer})`);
            }
          } else {
            // No distance to reduce, proceed normally
            const currentLayer = layerOf.get(dependent);
            if (!currentLayer || newLayer > currentLayer) {
              console.log(`    ${currentLayer ? `Updating ${dependent}: L${currentLayer} → L${newLayer}` : `Setting ${dependent}: L${newLayer}`}`);
              layerOf.set(dependent, newLayer);

              if (!queue.includes(dependent)) {
                queue.push(dependent);
              }
            } else {
              console.log(`    Keeping ${dependent} at L${currentLayer} (new would be L${newLayer})`);
            }
          }
        } else {
          const missingDeps = dependencies.filter(dep => !layerOf.has(dep));
          console.log(`    Not all dependencies processed yet. Missing: ${missingDeps.join(', ')}`);
        }
      }
    }

    console.log(`\nProcessed ${processed} nodes`);

    // Step 4: Handle cycles (nodes not processed)
    for (const node of nodes) {
      if (!layerOf.has(node)) {
        console.log(`Warning: Node ${node} is part of a cycle, placing at layer 0`);
        layerOf.set(node, 0);
      }
    }

    // Step 5: Invert layers (roots → rightmost, leaves → leftmost)
    const maxLayer = Math.max(...Array.from(layerOf.values()));
    console.log(`Max layer before inversion: ${maxLayer}`);

    for (const [node, layer] of layerOf.entries()) {
      layerOf.set(node, maxLayer - layer);
    }

    // Step 6: Group nodes by layer
    const layers = new Map<number, string[]>();
    for (const [node, layer] of layerOf.entries()) {
      if (!layers.has(layer)) layers.set(layer, []);
      layers.get(layer)!.push(node);
    }

    // Step 7: Handle isolated entities (no relationships)
    entities.forEach(e => {
      if (!layerOf.has(e.name)) {
        const isolatedLayer = layers.size > 0 ? Math.max(...layers.keys()) + 1 : 0;
        layerOf.set(e.name, isolatedLayer);
        if (!layers.has(isolatedLayer)) layers.set(isolatedLayer, []);
        layers.get(isolatedLayer)!.push(e.name);
      }
    });

    // Debug: Show initial layers before optimization
    console.log('\n=== INITIAL LAYERS (before optimization) ===');
    for (const [layer, nodes] of Array.from(layers.entries()).sort((a, b) => a[0] - b[0])) {
      console.log(`Layer ${layer}: ${nodes.join(', ')}`);
    }

    return { layers, layerOf };
  }

  /**
   * Check if a node can be moved to a target layer without creating cycles or violations
   *
   * This method validates that moving a node maintains the topological order:
   * dependencies must always be at lower or equal layers, and dependents at higher layers.
   *
   * Example from RBAC system:
   * -------------------------
   * Scenario: Can we move 'roles' from L0 to L1?
   *
   * Graph state:
   *   - roles: L0 (current)
   *   - user_roles → roles (user_roles depends on roles)
   *   - role_permissions → roles (role_permissions depends on roles)
   *
   * Check 1: Dependencies of 'roles'
   *   - roles has no dependencies → ✓ Pass
   *   - (If roles depended on X at L2, moving to L1 would violate: dep must be ≤ target)
   *
   * Check 2: Dependents of 'roles'
   *   - user_roles will be at L2 (computed as max(users=L1, roles=L1) + 1)
   *   - role_permissions will be at L2 (computed as max(roles=L1, permissions=L1) + 1)
   *   - Both L2 > L1 → ✓ Pass
   *   - (If a dependent was at L0 or L1, it would violate: dependent must be > target)
   *
   * Result: roles CAN move from L0 → L1 ✓
   *
   * Constraints:
   * -----------
   * 1. All dependencies must be at layers ≤ targetLayer
   * 2. All dependents must be at layers > targetLayer
   *
   * @param node - The node to potentially move
   * @param targetLayer - The target layer to move to
   * @param graph - Dependency graph (node → dependencies)
   * @param layerOf - Current layer assignments
   * @returns true if move is valid, false otherwise
   */
  private static _canMoveNodeToLayer(
    node: string,
    targetLayer: number,
    graph: Map<string, string[]>,
    layerOf: Map<string, number>
  ): boolean {
    // Check 1: All dependencies must be at layers <= targetLayer
    const dependencies = graph.get(node) || [];
    for (const dep of dependencies) {
      const depLayer = layerOf.get(dep);
      if (depLayer !== undefined && depLayer > targetLayer) {
        // Dependency is at a higher layer - would create a violation
        return false;
      }
    }

    // Check 2: All dependents (nodes that depend on this node) must be at layers > targetLayer
    for (const [otherNode, otherDeps] of graph.entries()) {
      if (otherDeps.includes(node)) {
        const otherLayer = layerOf.get(otherNode);
        if (otherLayer !== undefined && otherLayer <= targetLayer) {
          // A dependent would be at same or lower layer - would create a violation
          return false;
        }
      }
    }

    return true;
  }
}
