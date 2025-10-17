/**
 * Connection-Based Layout Engine
 *
 * Implements a 3-step algorithm:
 *
 * STEP 1: Parse relationships and apply POSITION RULE
 *   Position Rule: First written element is ALWAYS left
 *   - A > B: A is left of B
 *   - A < B: A is left of B (NOT B!)
 *   - A - B: A is left of B
 *   - A <> B: A is left of B
 *   - B - A: B is left of A
 *   The symbol (>, <, -, <>) has NO effect on direction!
 *
 * STEP 2: Order relationships by processing priority
 *   - Rule 1: If relation connects to already-processed entity, prioritize by connection count
 *   - Rule 2: Otherwise, start with entity with most connections
 *
 * STEP 3: Build layers incrementally
 *   - Rule 1: Connected entities cannot cohabit same layer
 *   - Rule 2: Minimum distance = 1 (check for conflicts, increment/decrement if needed)
 *   - Rule 3: Respect direction (left → right)
 *   - Normalize: If negative layers, shift all layers to make minimum = 0
 *
 * CONFLICTS (bidirectional):
 *   Case 1: A > B and B < A (same relationship written twice)
 *   Case 2: A > B, B > C, C > A (circular dependency - cannot be resolved)
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

interface DirectedRelation {
  left: string;
  right: string;
}

export interface ConnectionLayerResult {
  layers: Map<number, string[]>;
  layerOf: Map<string, number>;
}

export class ConnectionBasedLayoutEngine {
  /**
   * STEP 1: Parse relationships and apply position rule (direction rule)
   *
   * Position Rule: The first written element is ALWAYS on the left
   * - A > B → A is left of B
   * - A < B → A is left of B (NOT B!)
   * - B < A → B is left of A
   * - A - B → A is left of B
   * - B - A → B is left of A
   * - A <> B → A is left of B
   *
   * The symbol (>, <, -, <>) does NOT affect direction!
   * Direction is purely determined by writing order.
   */
  private static parseRelationships(relationships: Relationship[]): DirectedRelation[] {
    const relations: DirectedRelation[] = [];

    for (const rel of relationships) {
      // Position rule: first written is left, second is right
      const left = rel.from.entity;
      const right = rel.to.entity;

      relations.push({ left, right });
    }

    return relations;
  }

  /**
   * STEP 2: Order relationships by processing priority
   */
  private static orderRelations(relations: DirectedRelation[]): DirectedRelation[] {
    // Count connections per entity
    const connections = new Map<string, number>();
    for (const rel of relations) {
      connections.set(rel.left, (connections.get(rel.left) || 0) + 1);
      connections.set(rel.right, (connections.get(rel.right) || 0) + 1);
    }

    const processedEntities = new Set<string>();
    const orderedRelations: DirectedRelation[] = [];
    const remaining = [...relations];

    const findNextRelation = (): DirectedRelation => {
      // Rule 1: Find relations connected to already-processed entities
      const connected = remaining.filter(
        r => processedEntities.has(r.left) || processedEntities.has(r.right)
      );

      if (connected.length > 0) {
        // Sort by connection count (max)
        connected.sort((a, b) => {
          const maxA = Math.max(connections.get(a.left) || 0, connections.get(a.right) || 0);
          const maxB = Math.max(connections.get(b.left) || 0, connections.get(b.right) || 0);
          return maxB - maxA;
        });
        return connected[0];
      } else {
        // Rule 2: Start with entity with most connections
        remaining.sort((a, b) => {
          const maxA = Math.max(connections.get(a.left) || 0, connections.get(a.right) || 0);
          const maxB = Math.max(connections.get(b.left) || 0, connections.get(b.right) || 0);
          return maxB - maxA;
        });
        return remaining[0];
      }
    };

    while (remaining.length > 0) {
      const nextRel = findNextRelation();
      orderedRelations.push(nextRel);
      processedEntities.add(nextRel.left);
      processedEntities.add(nextRel.right);

      // Remove from remaining
      const idx = remaining.indexOf(nextRel);
      if (idx > -1) {
        remaining.splice(idx, 1);
      }
    }

    return orderedRelations;
  }

  /**
   * STEP 3: Build layers incrementally
   */
  private static buildLayers(orderedRelations: DirectedRelation[]): Map<string, number> {
    const entityLayer = new Map<string, number>();

    // Build connection graph to check conflicts
    const connectionsGraph = new Map<string, Set<string>>();
    for (const rel of orderedRelations) {
      if (!connectionsGraph.has(rel.left)) {
        connectionsGraph.set(rel.left, new Set());
      }
      if (!connectionsGraph.has(rel.right)) {
        connectionsGraph.set(rel.right, new Set());
      }
      connectionsGraph.get(rel.left)!.add(rel.right);
      connectionsGraph.get(rel.right)!.add(rel.left);
    }

    // Helper: Find valid layer without conflicts
    const findValidLayer = (
      entity: string,
      targetLayer: number,
      direction: 'left' | 'right'
    ): number => {
      while (true) {
        // Check if targetLayer contains entities connected to 'entity'
        const entitiesInLayer = Array.from(entityLayer.entries())
          .filter(([_, layer]) => layer === targetLayer)
          .map(([ent, _]) => ent);

        const hasConflict = entitiesInLayer.some(ent =>
          connectionsGraph.get(entity)?.has(ent)
        );

        if (!hasConflict) {
          return targetLayer;
        }

        // Conflict detected: increment or decrement
        targetLayer = direction === 'right' ? targetLayer + 1 : targetLayer - 1;
      }
    };

    // Helper: Normalize layers if negative
    const normalizeLayers = () => {
      const minLayer = Math.min(...Array.from(entityLayer.values()));
      if (minLayer < 0) {
        const shift = -minLayer;
        entityLayer.forEach((layer, entity) => {
          entityLayer.set(entity, layer + shift);
        });
      }
    };

    // Process each relation
    for (const rel of orderedRelations) {
      const leftExists = entityLayer.has(rel.left);
      const rightExists = entityLayer.has(rel.right);

      if (!leftExists && !rightExists) {
        // Case 1: Neither exists - place both
        entityLayer.set(rel.left, 0);
        entityLayer.set(rel.right, 1);
      } else if (!leftExists && rightExists) {
        // Case 2: Only right exists - place left to the left
        const rightLayer = entityLayer.get(rel.right)!;
        const targetLayer = rightLayer - 1;

        const validLayer = findValidLayer(rel.left, targetLayer, 'left');
        entityLayer.set(rel.left, validLayer);

        normalizeLayers();
      } else if (leftExists && !rightExists) {
        // Case 3: Only left exists - place right to the right
        const leftLayer = entityLayer.get(rel.left)!;
        const targetLayer = leftLayer + 1;

        const validLayer = findValidLayer(rel.right, targetLayer, 'right');
        entityLayer.set(rel.right, validLayer);
      } else {
        // Case 4: Both exist - ensure left < right
        const leftLayer = entityLayer.get(rel.left)!;
        const rightLayer = entityLayer.get(rel.right)!;

        if (leftLayer >= rightLayer) {
          // Violation: shift right and everything after it
          const shiftAmount = leftLayer + 1 - rightLayer;
          entityLayer.forEach((layer, entity) => {
            if (layer >= rightLayer) {
              entityLayer.set(entity, layer + shiftAmount);
            }
          });
        }
      }
    }

    return entityLayer;
  }

  /**
   * Main entry point
   */
  static layout(entities: Entity[], relationships: Relationship[]): ConnectionLayerResult {
    // Step 1: Parse and apply direction rule
    const relations = this.parseRelationships(relationships);

    // Step 2: Order relations by processing priority
    const orderedRelations = this.orderRelations(relations);

    // Step 3: Build layers incrementally
    const layerOf = this.buildLayers(orderedRelations);

    // Handle isolated entities
    entities.forEach(entity => {
      if (!layerOf.has(entity.name)) {
        const maxLayer = Math.max(...Array.from(layerOf.values()), -1);
        layerOf.set(entity.name, maxLayer + 1);
      }
    });

    // Build layers map
    const layers = new Map<number, string[]>();
    layerOf.forEach((layer, entity) => {
      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer)!.push(entity);
    });

    return { layers, layerOf };
  }
}
