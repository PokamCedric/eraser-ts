/**
 * Connection-Aware Positioner
 *
 * Optimizes entity positions to minimize connection crossings and length.
 * Uses bidirectional barycenter method with multiple passes.
 */

import { Position } from '../../value-objects/Position';
import { Entity } from '../../entities/Entity';
import { Relationship } from '../../entities/Relationship';

export interface OptimalLayoutConfig {
  entityWidth: number;
  entityHeaderHeight: number;
  entityFieldHeight: number;
  horizontalSpacing: number;
  minVerticalSpacing: number;  // Minimum gap between entities
  baseX: number;
}

interface EntityWithMetrics {
  name: string;
  height: number;
  barycenter: number;
}

export class ConnectionAwarePositioner {
  /**
   * Calculate optimal positions using bidirectional barycenter method
   * with multiple iterative passes
   */
  static calculateOptimalPositions(
    layers: Map<number, string[]>,
    entities: Entity[],
    relationships: Relationship[],
    config: OptimalLayoutConfig
  ): Map<string, Position> {
    // Create entity lookup map
    const entityMap = new Map<string, Entity>();
    entities.forEach(e => entityMap.set(e.name, e));

    // Calculate height for each entity
    const entityHeights = new Map<string, number>();
    entities.forEach(entity => {
      const height = config.entityHeaderHeight + entity.fields.length * config.entityFieldHeight;
      entityHeights.set(entity.name, height);
    });

    // Build adjacency lists (bidirectional)
    const { forward, backward } = this.buildAdjacencyLists(relationships);

    // Get entity to layer mapping
    const entityToLayer = new Map<string, number>();
    for (const [layerIndex, layerNodes] of layers.entries()) {
      layerNodes.forEach(node => entityToLayer.set(node, layerIndex));
    }

    // Initialize Y positions (temporary map for Y coordinates only)
    const yPositions = this.initializeYPositions(layers, entityHeights, config.minVerticalSpacing);

    // Run multiple passes of barycenter optimization (alternating forward and backward)
    const iterations = 4;
    for (let iter = 0; iter < iterations; iter++) {
      if (iter % 2 === 0) {
        // Forward pass (left to right)
        this.barycenterPass(layers, yPositions, entityHeights, forward, config.minVerticalSpacing, false);
      } else {
        // Backward pass (right to left)
        this.barycenterPass(layers, yPositions, entityHeights, backward, config.minVerticalSpacing, true);
      }
    }

    // Convert Y positions to final Position objects with X coordinates
    return this.convertToPositions(layers, yPositions, config);
  }

  /**
   * Build adjacency lists for forward and backward connections
   */
  private static buildAdjacencyLists(
    relationships: Relationship[]
  ): { forward: Map<string, string[]>; backward: Map<string, string[]> } {
    const forward = new Map<string, string[]>();
    const backward = new Map<string, string[]>();

    for (const rel of relationships) {
      const from = rel.from.entity;
      const to = rel.to.entity;

      // Forward: from -> to
      if (!forward.has(from)) forward.set(from, []);
      forward.get(from)!.push(to);

      // Backward: to -> from
      if (!backward.has(to)) backward.set(to, []);
      backward.get(to)!.push(from);
    }

    return { forward, backward };
  }

  /**
   * Initialize Y positions with even distribution
   */
  private static initializeYPositions(
    layers: Map<number, string[]>,
    entityHeights: Map<string, number>,
    minSpacing: number
  ): Map<string, number> {
    const yPositions = new Map<string, number>();

    for (const [_, layerNodes] of layers.entries()) {
      let currentY = 100;

      for (const name of layerNodes) {
        yPositions.set(name, currentY);
        const height = entityHeights.get(name) ?? 100;
        currentY += height + minSpacing;
      }
    }

    return yPositions;
  }

  /**
   * Perform one barycenter pass (forward or backward)
   */
  private static barycenterPass(
    layers: Map<number, string[]>,
    yPositions: Map<string, number>,
    entityHeights: Map<string, number>,
    adjacency: Map<string, string[]>,
    minSpacing: number,
    reverse: boolean
  ): void {
    const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0]);
    if (reverse) sortedLayers.reverse();

    for (const [_, layerNodes] of sortedLayers) {
      const entitiesWithBarycenters: EntityWithMetrics[] = [];

      for (const name of layerNodes) {
        const neighbors = adjacency.get(name) || [];

        if (neighbors.length > 0) {
          // Calculate barycenter (average Y position of connected entities)
          const sum = neighbors.reduce((s, neighbor) => {
            const pos = yPositions.get(neighbor);
            const height = entityHeights.get(neighbor) ?? 100;
            // Use center of entity for barycenter calculation
            return s + (pos !== undefined ? pos + height / 2 : 0);
          }, 0);
          const barycenter = sum / neighbors.length;

          entitiesWithBarycenters.push({
            name,
            height: entityHeights.get(name) ?? 100,
            barycenter
          });
        } else {
          // Keep current position if no neighbors
          entitiesWithBarycenters.push({
            name,
            height: entityHeights.get(name) ?? 100,
            barycenter: yPositions.get(name) ?? 100
          });
        }
      }

      // Sort by barycenter
      entitiesWithBarycenters.sort((a, b) => a.barycenter - b.barycenter);

      // Assign new positions avoiding overlaps
      let currentY = 100;
      for (const entity of entitiesWithBarycenters) {
        const idealY = entity.barycenter - entity.height / 2;
        const actualY = Math.max(idealY, currentY);
        yPositions.set(entity.name, actualY);
        currentY = actualY + entity.height + minSpacing;
      }
    }
  }

  /**
   * Convert Y positions map to Position objects with X coordinates
   */
  private static convertToPositions(
    layers: Map<number, string[]>,
    yPositions: Map<string, number>,
    config: OptimalLayoutConfig
  ): Map<string, Position> {
    const positions = new Map<string, Position>();

    for (const [layerIndex, layerNodes] of layers.entries()) {
      const x = config.baseX + layerIndex * config.horizontalSpacing;

      for (const name of layerNodes) {
        const y = yPositions.get(name) ?? 100;
        positions.set(name, new Position({ x, y }));
      }
    }

    return positions;
  }
}
