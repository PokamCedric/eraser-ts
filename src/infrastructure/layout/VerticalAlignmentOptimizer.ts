/**
 * Vertical Alignment Optimizer
 *
 * Optimizes the vertical order of entities within each layer to minimize edge crossings.
 * Uses the barycenter method: entities are positioned based on the average position
 * of their connected neighbors.
 */

import { Relationship } from '../../domain/entities/Relationship';

export class VerticalAlignmentOptimizer {
  /**
   * Optimize vertical ordering within layers to minimize edge crossings
   *
   * Algorithm:
   * 1. For each layer (left to right)
   * 2. Calculate barycenter for each entity based on connected entities in previous layer
   * 3. Sort entities by barycenter value
   * 4. Repeat in reverse (right to left) for better results
   *
   * @param layers - Map of layer index to entity names
   * @param relationships - All relationships between entities
   * @param iterations - Number of optimization passes (default: 4)
   */
  static optimize(
    layers: Map<number, string[]>,
    relationships: Relationship[],
    iterations: number = 4
  ): Map<number, string[]> {
    const optimizedLayers = new Map(layers);

    // Build adjacency maps for quick lookup
    const adjacencyMap = this._buildAdjacencyMap(relationships);

    // Run multiple iterations for better convergence
    for (let iter = 0; iter < iterations; iter++) {
      // Forward pass: left to right
      this._optimizeForward(optimizedLayers, adjacencyMap);

      // Backward pass: right to left
      this._optimizeBackward(optimizedLayers, adjacencyMap);
    }

    return optimizedLayers;
  }

  /**
   * Build adjacency map: entity -> list of connected entities
   */
  private static _buildAdjacencyMap(
    relationships: Relationship[]
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    relationships.forEach(rel => {
      const from = rel.from.entity;
      const to = rel.to.entity;

      // Bidirectional adjacency
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!adjacency.has(to)) adjacency.set(to, []);

      adjacency.get(from)!.push(to);
      adjacency.get(to)!.push(from);
    });

    return adjacency;
  }

  /**
   * Forward pass: optimize left to right
   */
  private static _optimizeForward(
    layers: Map<number, string[]>,
    adjacency: Map<string, string[]>
  ): void {
    const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

    for (let i = 1; i < sortedLayers.length; i++) {
      const currentLayerIndex = sortedLayers[i];
      const previousLayerIndex = sortedLayers[i - 1];

      const currentLayer = layers.get(currentLayerIndex)!;
      const previousLayer = layers.get(previousLayerIndex)!;

      // Calculate barycenter for each entity in current layer
      const barycenters = currentLayer.map(entity => {
        const barycenter = this._calculateBarycenter(
          entity,
          previousLayer,
          adjacency
        );
        return { entity, barycenter };
      });

      // Sort by barycenter value
      barycenters.sort((a, b) => a.barycenter - b.barycenter);

      // Update layer with sorted entities
      layers.set(
        currentLayerIndex,
        barycenters.map(b => b.entity)
      );
    }
  }

  /**
   * Backward pass: optimize right to left
   */
  private static _optimizeBackward(
    layers: Map<number, string[]>,
    adjacency: Map<string, string[]>
  ): void {
    const sortedLayers = Array.from(layers.keys()).sort((a, b) => b - a);

    for (let i = 1; i < sortedLayers.length; i++) {
      const currentLayerIndex = sortedLayers[i];
      const nextLayerIndex = sortedLayers[i - 1];

      const currentLayer = layers.get(currentLayerIndex)!;
      const nextLayer = layers.get(nextLayerIndex)!;

      // Calculate barycenter for each entity in current layer
      const barycenters = currentLayer.map(entity => {
        const barycenter = this._calculateBarycenter(
          entity,
          nextLayer,
          adjacency
        );
        return { entity, barycenter };
      });

      // Sort by barycenter value
      barycenters.sort((a, b) => a.barycenter - b.barycenter);

      // Update layer with sorted entities
      layers.set(
        currentLayerIndex,
        barycenters.map(b => b.entity)
      );
    }
  }

  /**
   * Calculate barycenter (average position) of connected entities
   *
   * @param entity - Current entity
   * @param referenceLayer - Layer to calculate barycenter from
   * @param adjacency - Adjacency map
   * @returns Average position (0-based index in reference layer)
   */
  private static _calculateBarycenter(
    entity: string,
    referenceLayer: string[],
    adjacency: Map<string, string[]>
  ): number {
    const neighbors = adjacency.get(entity) || [];

    // Find neighbors that are in the reference layer
    const connectedPositions: number[] = [];
    neighbors.forEach(neighbor => {
      const position = referenceLayer.indexOf(neighbor);
      if (position !== -1) {
        connectedPositions.push(position);
      }
    });

    // If no connections, return middle position
    if (connectedPositions.length === 0) {
      return referenceLayer.length / 2;
    }

    // Calculate average position (barycenter)
    const sum = connectedPositions.reduce((a, b) => a + b, 0);
    return sum / connectedPositions.length;
  }
}
