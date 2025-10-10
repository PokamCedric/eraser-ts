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
   * Compute hierarchical layers using inverted algorithm
   *
   * Algorithm:
   * - Leaves (nobody depends on them) → Layer 0
   * - Others → 1 + max(layer of nodes that depend on them)
   */
  static computeLayers(
    dependencyGraph: DependencyGraph,
    entities: Entity[]
  ): LayerResult {
    const { reverseGraph, nodes } = dependencyGraph;
    const layerOf = new Map<string, number>();
    const visited = new Set<string>();

    // Recursive function to compute layer for a node
    const computeLayer = (node: string): number => {
      // Already computed?
      if (layerOf.has(node)) return layerOf.get(node)!;

      // Cycle detection
      if (visited.has(node)) {
        layerOf.set(node, 0);
        return 0;
      }

      visited.add(node);

      // Get all nodes that depend on this one
      const dependents = reverseGraph.get(node) || [];

      if (dependents.length === 0) {
        // Leaf: nobody depends on this node
        layerOf.set(node, 0);
      } else {
        // Layer = 1 + max(layer of dependents)
        const maxDependentLayer = Math.max(...dependents.map(dep => computeLayer(dep)));
        layerOf.set(node, maxDependentLayer + 1);
      }

      visited.delete(node);
      return layerOf.get(node)!;
    };

    // Compute layers for all nodes
    nodes.forEach(n => computeLayer(n));

    // Group nodes by layer
    const layers = new Map<number, string[]>();
    for (const [node, layer] of layerOf.entries()) {
      if (!layers.has(layer)) layers.set(layer, []);
      layers.get(layer)!.push(node);
    }

    // Handle isolated entities (no relationships)
    entities.forEach(e => {
      if (!layerOf.has(e.name)) {
        const isolatedLayer = layers.size > 0 ? Math.max(...layers.keys()) + 1 : 0;
        layerOf.set(e.name, isolatedLayer);
        if (!layers.has(isolatedLayer)) layers.set(isolatedLayer, []);
        layers.get(isolatedLayer)!.push(e.name);
      }
    });

    return { layers, layerOf };
  }
}
