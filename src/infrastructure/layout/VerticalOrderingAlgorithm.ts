/**
 * Vertical Ordering Algorithm
 *
 * Determines the optimal VERTICAL ORDER of entities within each layer
 * to minimize edge crossings. Uses the barycenter heuristic.
 *
 * Input: Layers with unordered entities
 * Output: Layers with optimally ordered entities (relative Y positions)
 */

import { Relationship } from '../../domain/entities/Relationship';
import { Logger } from './utils/Logger';

export class VerticalOrderingAlgorithm {
  /**
   * Optimize the vertical ordering of entities within each layer
   *
   * @param layers - Map of layer index to entity names (unordered)
   * @param relationships - All relationships between entities
   * @returns Map of layer index to entity names (ordered by optimal vertical position)
   */
  static optimize(
    layers: Map<number, string[]>,
    relationships: Relationship[]
  ): Map<number, string[]> {
    Logger.section('VERTICAL ORDERING ALGORITHM');

    const orderedLayers = new Map<number, string[]>();
    const sortedLayerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

    // Initialize with current order
    sortedLayerIndices.forEach(layerIdx => {
      orderedLayers.set(layerIdx, [...layers.get(layerIdx)!]);
    });

    // Apply multiple passes of barycenter ordering (forward and backward)
    // Multiple passes help the ordering converge to a better solution
    for (let pass = 0; pass < 5; pass++) {
      // Forward pass (left to right)
      for (let i = 1; i < sortedLayerIndices.length; i++) {
        const layerIdx = sortedLayerIndices[i];
        const prevLayerIdx = sortedLayerIndices[i - 1];

        this._applyBarycenterOrdering(
          orderedLayers,
          layerIdx,
          prevLayerIdx,
          relationships,
          'forward'
        );
      }

      // Backward pass (right to left)
      for (let i = sortedLayerIndices.length - 2; i >= 0; i--) {
        const layerIdx = sortedLayerIndices[i];
        const nextLayerIdx = sortedLayerIndices[i + 1];

        this._applyBarycenterOrdering(
          orderedLayers,
          layerIdx,
          nextLayerIdx,
          relationships,
          'backward'
        );
      }
    }

    // Log the results
    Logger.debug('Optimized vertical ordering:');
    orderedLayers.forEach((entities, layerIdx) => {
      Logger.debug(`  Layer ${layerIdx}: ${entities.join(', ')}`);
    });
    Logger.section('VERTICAL ORDERING COMPLETE');

    return orderedLayers;
  }

  /**
   * Apply barycenter ordering to a layer based on its neighbor layer
   *
   * Barycenter method: For each entity in the layer, calculate the average
   * position of its connected entities in the neighbor layer, then sort by this average.
   *
   * This is a classic heuristic from graph drawing research that minimizes crossings.
   */
  private static _applyBarycenterOrdering(
    layers: Map<number, string[]>,
    layerIdx: number,
    neighborLayerIdx: number,
    relationships: Relationship[],
    direction: 'forward' | 'backward'
  ): void {
    const layer = layers.get(layerIdx)!;
    const neighborLayer = layers.get(neighborLayerIdx)!;

    // Create position map for neighbor layer
    const neighborPositions = new Map<string, number>();
    neighborLayer.forEach((entityName, index) => {
      neighborPositions.set(entityName, index);
    });

    // Calculate barycenter (average neighbor position) for each entity
    const barycenters = layer.map(entityName => {
      const connectedPositions: number[] = [];

      relationships.forEach(rel => {
        let neighborEntity: string | null = null;

        if (direction === 'forward') {
          // Looking at connections from previous layer to current layer
          if (rel.from.entity === entityName && neighborPositions.has(rel.to.entity)) {
            neighborEntity = rel.to.entity;
          } else if (rel.to.entity === entityName && neighborPositions.has(rel.from.entity)) {
            neighborEntity = rel.from.entity;
          }
        } else {
          // Looking at connections from next layer to current layer
          if (rel.from.entity === entityName && neighborPositions.has(rel.to.entity)) {
            neighborEntity = rel.to.entity;
          } else if (rel.to.entity === entityName && neighborPositions.has(rel.from.entity)) {
            neighborEntity = rel.from.entity;
          }
        }

        if (neighborEntity) {
          const pos = neighborPositions.get(neighborEntity);
          if (pos !== undefined) {
            connectedPositions.push(pos);
          }
        }
      });

      const barycenter = connectedPositions.length > 0
        ? connectedPositions.reduce((sum, pos) => sum + pos, 0) / connectedPositions.length
        : Infinity;

      return { entityName, barycenter };
    });

    // Sort by barycenter
    barycenters.sort((a, b) => {
      if (a.barycenter === Infinity && b.barycenter === Infinity) return 0;
      if (a.barycenter === Infinity) return 1;
      if (b.barycenter === Infinity) return -1;
      return a.barycenter - b.barycenter;
    });

    // Update layer with new ordering
    layers.set(layerIdx, barycenters.map(b => b.entityName));
  }
}
