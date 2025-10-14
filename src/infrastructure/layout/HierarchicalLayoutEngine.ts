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
   * Algorithm:
   * - Roots (don't depend on anyone) → Layer 0 (initial)
   * - Leaves (depend on others) → Layer N (computed iteratively)
   * - Layer = max(layer of dependencies) + 1
   * - Finally invert: roots → rightmost, leaves → leftmost
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

      // For each node that depends on this one
      for (const [dependent, dependencies] of graph.entries()) {
        if (!dependencies.includes(node)) continue;

        // Check if all dependencies of 'dependent' have been processed
        const allDepsProcessed = dependencies.every(dep => layerOf.has(dep));

        if (allDepsProcessed) {
          // Compute layer: max(layer of dependencies) + 1
          const maxDepLayer = Math.max(...dependencies.map(dep => layerOf.get(dep)!));
          const newLayer = maxDepLayer + 1;

          // Only update if not yet computed or if we found a longer path
          if (!layerOf.has(dependent) || newLayer > layerOf.get(dependent)!) {
            layerOf.set(dependent, newLayer);

            // Add to queue if not already processed
            if (!queue.includes(dependent)) {
              queue.push(dependent);
            }
          }
        }
      }
    }

    console.log(`Processed ${processed} nodes`);

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
}
