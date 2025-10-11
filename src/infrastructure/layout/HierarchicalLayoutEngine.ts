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
   * - Roots (don't depend on anyone) → Layer max (right)
   * - Leaves (depend on others) → Layer 0 (left)
   * - Layer = max(layer of dependencies) + 1
   */
  static computeLayers(
    dependencyGraph: DependencyGraph,
    entities: Entity[]
  ): LayerResult {
    const { graph, nodes } = dependencyGraph;
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

      // Get all nodes that this node depends on
      const dependencies = graph.get(node) || [];

      if (dependencies.length === 0) {
        // Root: doesn't depend on anyone - rightmost layer
        layerOf.set(node, 0);
      } else {
        // Layer = max(layer of dependencies) + 1
        // This places nodes that depend on layer N at layer N+1
        const maxDependencyLayer = Math.max(...dependencies.map(dep => computeLayer(dep)));
        layerOf.set(node, maxDependencyLayer + 1);
      }

      visited.delete(node);
      return layerOf.get(node)!;
    };

    // Compute layers for all nodes
    nodes.forEach(n => computeLayer(n));

    // Invert layers: nodes with highest layer should be rightmost
    // Find max layer
    const maxLayer = Math.max(...Array.from(layerOf.values()));

    // Invert: layer N becomes (maxLayer - N)
    for (const [node, layer] of layerOf.entries()) {
      layerOf.set(node, maxLayer - layer);
    }

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
