/**
 * Phase 4: Source-Aware Vertical Order Optimizer
 *
 * Optimizes vertical order within each layer using SOURCE CHAINS.
 *
 * Key innovation: Respects entity provenance (where entities come from)
 * Instead of just grouping by targets, we track:
 *   Layer N-1 (source) -> Layer N (entity) -> Layer N+1 (target)
 *
 * This ensures entities are grouped by their sources, preventing
 * entities from different source groups from being interleaved.
 *
 * Example:
 *   Layer 2: [orders, carts]
 *   Layer 3: [order_items (from orders), cart_items (from carts)]
 *
 * Even if both order_items and cart_items point to the same target (products),
 * they remain grouped by their source (orders vs carts).
 */

import { DirectedRelation } from './types';
import { ILogger } from '../ILogger';
import { IVerticalOptimizer } from './IVerticalOptimizer';

export class SourceAwareVerticalOptimizer implements IVerticalOptimizer {
  private relations: DirectedRelation[];
  private reverseRelations: Map<string, Set<string>>; // target -> sources

  constructor(relations: DirectedRelation[], private readonly logger: ILogger) {
    this.relations = relations;

    // Build reverse relation map for fast lookup
    this.reverseRelations = new Map();
    for (const { left, right } of relations) {
      if (!this.reverseRelations.has(right)) {
        this.reverseRelations.set(right, new Set());
      }
      this.reverseRelations.get(right)!.add(left);
    }
  }

  /**
   * Optimize vertical order using source-aware pivot-based arrangement
   */
  optimize(
    horizontalLayers: string[][],
    entityOrder: string[]
  ): string[][] {
    this.logger.section('PHASE 4: SOURCE-AWARE VERTICAL ALIGNMENT (Y-AXIS)');

    if (horizontalLayers.length === 0) {
      return horizontalLayers;
    }

    // Deep copy layers
    const layers = horizontalLayers.map(layer => [...layer]);

    // Last layer: order by entity_order
    const lastIdx = layers.length - 1;
    layers[lastIdx] = this.orderByEntityOrder(layers[lastIdx], entityOrder);

    this.logger.debug(`\nLast layer ${lastIdx}: ordered by connectivity`);
    this.logger.debug(`  ${JSON.stringify(layers[lastIdx])}`);

    // Process other layers from right to left
    for (let layerIdx = layers.length - 2; layerIdx >= 0; layerIdx--) {
      const currentLayer = layers[layerIdx];
      const prevLayer = layerIdx > 0 ? layers[layerIdx - 1] : [];
      const nextLayer = layers[layerIdx + 1];

      this.logger.subsection(`Processing Layer ${layerIdx}`);

      const orderedLayer = this.orderBySourceChains(
        currentLayer,
        prevLayer,
        nextLayer,
        entityOrder
      );

      layers[layerIdx] = orderedLayer;
    }

    this.logger.section('SOURCE-AWARE VERTICAL OPTIMIZATION COMPLETE');

    return layers;
  }

  private orderByEntityOrder(layer: string[], entityOrder: string[]): string[] {
    const ordered: string[] = [];

    for (const entity of entityOrder) {
      if (layer.includes(entity)) {
        ordered.push(entity);
      }
    }

    // Add any remaining entities not in entity_order
    for (const entity of layer) {
      if (!ordered.includes(entity)) {
        ordered.push(entity);
      }
    }

    return ordered;
  }

  private orderBySourceChains(
    currentLayer: string[],
    prevLayer: string[],
    nextLayer: string[],
    entityOrder: string[]
  ): string[] {
    // Build source mapping: entity -> sources in prev_layer
    const entitySources = new Map<string, Set<string>>();
    for (const entity of currentLayer) {
      const sources = new Set<string>();
      const reverseSources = this.reverseRelations.get(entity);
      if (reverseSources) {
        for (const source of reverseSources) {
          if (prevLayer.includes(source)) {
            sources.add(source);
          }
        }
      }
      entitySources.set(entity, sources);
    }

    // Build target mapping: entity -> targets in next_layer
    const entityTargets = new Map<string, Set<string>>();
    for (const entity of currentLayer) {
      const targets = new Set<string>();
      for (const { left, right } of this.relations) {
        if (left === entity && nextLayer.includes(right)) {
          targets.add(right);
        }
      }
      entityTargets.set(entity, targets);
    }

    this.logger.debug(`\nSource chains (Layer ${prevLayer.length > 0 ? JSON.stringify(prevLayer) : '[]'} -> current -> ${JSON.stringify(nextLayer)}):`);

    // Detect pivots (entities with multiple targets)
    const pivots = new Map<string, Set<string>>();
    for (const entity of currentLayer) {
      const targets = entityTargets.get(entity)!;
      if (targets.size > 1) {
        pivots.set(entity, targets);
      }
    }

    if (pivots.size > 0) {
      this.logger.debug(`\nPivots detected: ${pivots.size}`);
      for (const [pivot, targets] of pivots.entries()) {
        this.logger.debug(`  [${pivot}] connects ${targets.size} targets: ${JSON.stringify([...targets].sort())}`);
      }
    }

    // Group entities by primary source
    const sourceGroups = new Map<string, string[]>();
    const noSourceEntities: string[] = [];

    for (const entity of currentLayer) {
      const sources = entitySources.get(entity)!;

      if (sources.size === 0) {
        noSourceEntities.push(entity);
        continue;
      }

      // Primary source = first source in prev_layer order
      let primarySource: string | null = null;
      let minIdx = Infinity;

      for (const source of sources) {
        const idx = prevLayer.indexOf(source);
        if (idx !== -1 && idx < minIdx) {
          minIdx = idx;
          primarySource = source;
        }
      }

      if (primarySource) {
        if (!sourceGroups.has(primarySource)) {
          sourceGroups.set(primarySource, []);
        }
        sourceGroups.get(primarySource)!.push(entity);
      }
    }

    // Order groups by prev_layer order
    const ordered: string[] = [];

    if (prevLayer.length > 0) {
      for (const source of prevLayer) {
        if (!sourceGroups.has(source)) continue;

        const group = sourceGroups.get(source)!;

        // Sort group by target position in next_layer, then entity_order
        const sortedGroup = group.sort((a, b) => {
          const targetsA = entityTargets.get(a)!;
          const targetsB = entityTargets.get(b)!;

          // Calculate minimum target index
          const minTargetIdxA = targetsA.size === 0
            ? Infinity
            : Math.min(...[...targetsA].map(t => nextLayer.indexOf(t)).filter(idx => idx !== -1));

          const minTargetIdxB = targetsB.size === 0
            ? Infinity
            : Math.min(...[...targetsB].map(t => nextLayer.indexOf(t)).filter(idx => idx !== -1));

          if (minTargetIdxA !== minTargetIdxB) {
            return minTargetIdxA - minTargetIdxB;
          }

          // Tie-break by entity_order
          const entityIdxA = entityOrder.indexOf(a);
          const entityIdxB = entityOrder.indexOf(b);

          if (entityIdxA === -1 && entityIdxB === -1) return 0;
          if (entityIdxA === -1) return 1;
          if (entityIdxB === -1) return -1;

          return entityIdxA - entityIdxB;
        });

        // Print group info
        for (const entity of sortedGroup) {
          const sources = [...entitySources.get(entity)!].sort();
          const targets = [...entityTargets.get(entity)!].sort();
          const pivotMarker = pivots.has(entity) ? '*' : '';
          this.logger.debug(`  [${entity}${pivotMarker}] from ${JSON.stringify(sources)} -> to ${JSON.stringify(targets)}`);
        }

        ordered.push(...sortedGroup);
      }
    }

    // Add entities with no sources
    if (noSourceEntities.length > 0) {
      noSourceEntities.sort((a, b) => {
        const idxA = entityOrder.indexOf(a);
        const idxB = entityOrder.indexOf(b);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      this.logger.debug(`\n  Entities with no sources: ${JSON.stringify(noSourceEntities)}`);
      ordered.push(...noSourceEntities);
    }

    this.logger.debug(`\nFinal order: ${JSON.stringify(ordered)}`);

    return ordered;
  }
}
