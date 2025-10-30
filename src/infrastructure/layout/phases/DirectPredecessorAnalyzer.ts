/**
 * Phase 4 Prep: Direct Predecessor Analyzer
 *
 * Analyzes direct predecessors (distance = 1 only) for vertical alignment.
 */

import { DirectedRelation } from './types';

export class DirectPredecessorAnalyzer {
  /**
   * Compute direct predecessors for each entity
   *
   * Direct predecessor: entity at distance exactly 1 (immediate neighbor)
   * i.e., entities in adjacent layers (layer_distance = 1)
   *
   * @param layers - Horizontal layer assignments
   * @param relations - Directed relations
   * @returns Map of entity -> set of direct predecessors
   */
  static computeDirectPredecessors(
    layers: string[][],
    relations: DirectedRelation[]
  ): Map<string, Set<string>> {
    // Build layer index
    const layerOf = new Map<string, number>();
    layers.forEach((layer, idx) => {
      layer.forEach(entity => {
        layerOf.set(entity, idx);
      });
    });

    // Find direct predecessors (layer distance = 1)
    const directPredecessors = new Map<string, Set<string>>();

    // Initialize for all entities
    layerOf.forEach((_, entity) => {
      directPredecessors.set(entity, new Set());
    });

    for (const { left, right } of relations) {
      const leftLayer = layerOf.get(left);
      const rightLayer = layerOf.get(right);

      if (leftLayer !== undefined && rightLayer !== undefined) {
        // Direct if distance = 1 layer
        if (rightLayer - leftLayer === 1) {
          directPredecessors.get(right)!.add(left);
        }
      }
    }

    return directPredecessors;
  }
}
