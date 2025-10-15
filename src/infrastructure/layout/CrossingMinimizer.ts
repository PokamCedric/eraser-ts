/**
 * Crossing Minimizer
 *
 * Post-processing optimization that reduces edge crossings through
 * local permutations and greedy improvements.
 *
 * Separation of concern: This is a REFINEMENT step that runs after
 * initial ordering. It tries local swaps to reduce crossings without
 * disrupting the overall structure.
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

interface EdgeCrossing {
  edge1: { from: string; to: string };
  edge2: { from: string; to: string };
}

export class CrossingMinimizer {
  /**
   * Minimize edge crossings through local optimizations
   *
   * @param layers - Current layer ordering
   * @param relationships - All relationships
   * @param entities - All entities
   * @param maxIterations - Maximum number of improvement iterations
   * @returns Optimized layer ordering
   */
  static optimize(
    layers: Map<number, string[]>,
    relationships: Relationship[],
    entities: Entity[],
    maxIterations: number = 10
  ): Map<number, string[]> {
    console.log('=== CROSSING MINIMIZER ===');

    const optimizedLayers = new Map<number, string[]>();
    layers.forEach((entityList, layerIdx) => {
      optimizedLayers.set(layerIdx, [...entityList]);
    });

    const entityMap = new Map(entities.map(e => [e.name, e]));
    let currentCrossings = this._countCrossings(optimizedLayers, relationships, entityMap);
    console.log(`Initial crossings: ${currentCrossings}`);

    let improved = true;
    let iteration = 0;

    // Iteratively improve until no more improvements or max iterations
    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      const sortedLayerIndices = Array.from(optimizedLayers.keys()).sort((a, b) => a - b);

      // Try swapping adjacent entities in each layer
      for (const layerIdx of sortedLayerIndices) {
        const layer = optimizedLayers.get(layerIdx)!;

        for (let i = 0; i < layer.length - 1; i++) {
          // Try swapping positions i and i+1
          const newLayer = [...layer];
          [newLayer[i], newLayer[i + 1]] = [newLayer[i + 1], newLayer[i]];

          // Calculate new crossing count
          optimizedLayers.set(layerIdx, newLayer);
          const newCrossings = this._countCrossings(optimizedLayers, relationships, entityMap);

          if (newCrossings < currentCrossings) {
            // Keep the swap - it improved things!
            currentCrossings = newCrossings;
            improved = true;
            console.log(`  Iteration ${iteration}: Reduced to ${currentCrossings} crossings (swapped ${layer[i]} ↔ ${layer[i + 1]})`);
          } else {
            // Revert the swap
            optimizedLayers.set(layerIdx, layer);
          }
        }
      }
    }

    console.log(`Final crossings: ${currentCrossings} (after ${iteration} iterations)`);
    console.log('=== CROSSING MINIMIZER COMPLETE ===\n');

    return optimizedLayers;
  }

  /**
   * Count the total number of edge crossings
   */
  private static _countCrossings(
    layers: Map<number, string[]>,
    relationships: Relationship[],
    entityMap: Map<string, Entity>
  ): number {
    let totalCrossings = 0;

    const sortedLayerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

    // Check crossings between each pair of adjacent layers
    for (let i = 0; i < sortedLayerIndices.length - 1; i++) {
      const leftLayerIdx = sortedLayerIndices[i];
      const rightLayerIdx = sortedLayerIndices[i + 1];

      totalCrossings += this._countCrossingsBetweenLayers(
        layers.get(leftLayerIdx)!,
        layers.get(rightLayerIdx)!,
        relationships,
        entityMap
      );
    }

    return totalCrossings;
  }

  /**
   * Count crossings between two adjacent layers
   */
  private static _countCrossingsBetweenLayers(
    leftLayer: string[],
    rightLayer: string[],
    relationships: Relationship[],
    entityMap: Map<string, Entity>
  ): number {
    // Build position maps
    const leftPos = new Map<string, number>();
    const rightPos = new Map<string, number>();
    leftLayer.forEach((name, idx) => leftPos.set(name, idx));
    rightLayer.forEach((name, idx) => rightPos.set(name, idx));

    // Get all edges between these layers
    interface Edge {
      fromPos: number;
      fromFieldIdx: number;
      toPos: number;
      toFieldIdx: number;
    }

    const edges: Edge[] = [];

    relationships.forEach(rel => {
      const fromEntityPos = leftPos.get(rel.from.entity);
      const toEntityPos = rightPos.get(rel.to.entity);

      if (fromEntityPos !== undefined && toEntityPos !== undefined) {
        // Left to right edge
        const fromEntity = entityMap.get(rel.from.entity);
        const toEntity = entityMap.get(rel.to.entity);

        if (fromEntity && toEntity) {
          const fromFieldIdx = fromEntity.fields.findIndex(f => f.name === rel.from.field);
          const toFieldIdx = toEntity.fields.findIndex(f => f.name === rel.to.field);

          edges.push({
            fromPos: fromEntityPos,
            fromFieldIdx: fromFieldIdx !== -1 ? fromFieldIdx : 0,
            toPos: toEntityPos,
            toFieldIdx: toFieldIdx !== -1 ? toFieldIdx : 0
          });
        }
      }

      // Also check reverse direction
      const reverseFromPos = leftPos.get(rel.to.entity);
      const reverseToPos = rightPos.get(rel.from.entity);

      if (reverseFromPos !== undefined && reverseToPos !== undefined) {
        const fromEntity = entityMap.get(rel.to.entity);
        const toEntity = entityMap.get(rel.from.entity);

        if (fromEntity && toEntity) {
          const fromFieldIdx = fromEntity.fields.findIndex(f => f.name === rel.to.field);
          const toFieldIdx = toEntity.fields.findIndex(f => f.name === rel.from.field);

          edges.push({
            fromPos: reverseFromPos,
            fromFieldIdx: fromFieldIdx !== -1 ? fromFieldIdx : 0,
            toPos: reverseToPos,
            toFieldIdx: toFieldIdx !== -1 ? toFieldIdx : 0
          });
        }
      }
    });

    // Count crossings between all pairs of edges
    let crossings = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        if (this._edgesCross(edges[i], edges[j])) {
          crossings++;
        }
      }
    }

    return crossings;
  }

  /**
   * Check if two edges cross each other
   */
  private static _edgesCross(edge1: any, edge2: any): boolean {
    // Two edges cross if they have opposite ordering
    // Edge 1: from A to B, Edge 2: from C to D
    // They cross if: (A < C and B > D) or (A > C and B < D)

    const from1 = edge1.fromPos;
    const to1 = edge1.toPos;
    const from2 = edge2.fromPos;
    const to2 = edge2.toPos;

    // Check entity-level crossing
    if ((from1 < from2 && to1 > to2) || (from1 > from2 && to1 < to2)) {
      return true;
    }

    // If same entity positions, check field-level crossing
    if (from1 === from2 && to1 === to2) {
      const fromField1 = edge1.fromFieldIdx;
      const toField1 = edge1.toFieldIdx;
      const fromField2 = edge2.fromFieldIdx;
      const toField2 = edge2.toFieldIdx;

      if ((fromField1 < fromField2 && toField1 > toField2) ||
          (fromField1 > fromField2 && toField1 < toField2)) {
        return true;
      }
    }

    return false;
  }
}
