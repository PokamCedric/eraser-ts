/**
 * Phase 4: Vertical Order Optimizer
 *
 * Optimizes vertical order within each layer to minimize edge crossings.
 * Groups entities by their targets in the next layer.
 */

import { DirectedRelation } from './types';

export class VerticalOrderOptimizer {
  /**
   * Optimize vertical order (Y-axis) within each layer
   *
   * Algorithm:
   * 1. Process layers right to left (start with last layer)
   * 2. Last layer: order by entityOrder
   * 3. Other layers: group entities by targets in next layer
   * 4. Sort groups to minimize crossings
   *
   * @param horizontalLayers - Initial layer assignments
   * @param entityOrder - Global entity ordering (for tie-breaking)
   * @param relations - Directed relations
   * @returns Optimized layers with reordered entities
   */
  static optimize(
    horizontalLayers: string[][],
    entityOrder: string[],
    relations: DirectedRelation[]
  ): string[][] {
    console.log('\n=== PHASE 4: VERTICAL ALIGNMENT (Y-AXIS) ===');

    if (horizontalLayers.length === 0) return horizontalLayers;

    // Deep copy layers
    const layers = horizontalLayers.map(layer => [...layer]);

    // Last layer: order by entity_order
    const lastLayerIdx = layers.length - 1;
    const lastLayer = layers[lastLayerIdx];

    const orderedLast: string[] = [];
    for (const entity of entityOrder) {
      if (lastLayer.includes(entity)) {
        orderedLast.push(entity);
      }
    }

    // Add any remaining (shouldn't happen, but safety)
    for (const entity of lastLayer) {
      if (!orderedLast.includes(entity)) {
        orderedLast.push(entity);
      }
    }

    layers[lastLayerIdx] = orderedLast;

    // Other layers: sort by targets in next layer (right to left)
    for (let layerIdx = layers.length - 2; layerIdx >= 0; layerIdx--) {
      const currentLayer = layers[layerIdx];
      const nextLayer = layers[layerIdx + 1];

      const reordered = this.sortLayerByTargets(
        currentLayer,
        nextLayer,
        entityOrder,
        relations
      );

      layers[layerIdx] = reordered;
    }

    console.log('Vertical optimization complete');

    return layers;
  }

  /**
   * Sort layer by grouping entities with same targets in next layer
   *
   * Algorithm:
   * 1. Find what each entity points to in next layer
   * 2. Determine primary target (first in next_layer order)
   * 3. Group entities by primary target
   * 4. Order groups by target position in next_layer
   * 5. Within each group, sort by entity_order
   */
  private static sortLayerByTargets(
    currentLayer: string[],
    nextLayer: string[],
    entityOrder: string[],
    relations: DirectedRelation[]
  ): string[] {
    // Find targets for each entity in current layer
    const entityToAllTargets = new Map<string, string[]>();
    for (const entity of currentLayer) {
      const targets: string[] = [];
      for (const { left, right } of relations) {
        if (left === entity && nextLayer.includes(right)) {
          targets.push(right);
        }
      }
      entityToAllTargets.set(entity, targets);
    }

    // Determine primary target for each entity
    // Primary target = first target in next_layer order
    const entityPrimaryTarget = new Map<string, string | null>();
    for (const entity of currentLayer) {
      const targets = entityToAllTargets.get(entity) || [];
      if (targets.length > 0) {
        // Take the first target (or the one with min position)
        const primary = targets.reduce((best, current) => {
          return nextLayer.indexOf(current) < nextLayer.indexOf(best) ? current : best;
        });
        entityPrimaryTarget.set(entity, primary);
      } else {
        entityPrimaryTarget.set(entity, null);
      }
    }

    // Group by primary target
    const targetGroups = new Map<string | null, string[]>();
    for (const entity of currentLayer) {
      const primary = entityPrimaryTarget.get(entity)!;
      if (!targetGroups.has(primary)) {
        targetGroups.set(primary, []);
      }
      targetGroups.get(primary)!.push(entity);
    }

    // Sort each group by entity_order
    for (const [target, group] of targetGroups.entries()) {
      targetGroups.set(
        target,
        group.sort((a, b) => {
          const indexA = entityOrder.indexOf(a);
          const indexB = entityOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        })
      );
    }

    // Order groups by target position in nextLayer
    const orderedTargets = Array.from(targetGroups.keys()).sort((a, b) => {
      if (a === null) return 1; // Entities with no target go last
      if (b === null) return -1;
      return nextLayer.indexOf(a) - nextLayer.indexOf(b);
    });

    // Build final ordered layer
    const orderedLayer: string[] = [];
    for (const target of orderedTargets) {
      orderedLayer.push(...targetGroups.get(target)!);
    }

    return orderedLayer;
  }
}
