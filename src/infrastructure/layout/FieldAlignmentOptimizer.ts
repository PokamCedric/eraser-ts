/**
 * Field Alignment Optimizer
 *
 * Achieves ERASER-style perfect horizontal alignment of connected fields.
 * After entity ordering and field ordering are determined, this adjusts
 * the actual Y positions of entities to create horizontal connections.
 *
 * Strategy:
 * 1. Process layers left to right
 * 2. For each entity, calculate target Y based on connected field positions
 * 3. Adjust Y positions to align fields while respecting ordering and avoiding overlaps
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { Position } from '../../domain/value-objects/Position';

// Unused interface - kept for potential future use
// interface FieldYPosition {
//   entityName: string;
//   fieldName: string;
//   fieldIndex: number;
//   absoluteY: number; // Current absolute Y position of field center
// }

interface EntityAdjustment {
  entityName: string;
  currentY: number;
  targetY: number;
  order: number; // Vertical order within layer (from ordering algorithm)
}

export class FieldAlignmentOptimizer {
  private static readonly MIN_ENTITY_SPACING = 10;

  /**
   * Optimize Y positions to align connected fields horizontally
   *
   * @param entities - All entities
   * @param relationships - All relationships
   * @param entityPositions - Current positions (will be modified)
   * @param orderedLayers - Layers with entities in optimized vertical order
   * @param entityHeaderHeight - Header height
   * @param entityFieldHeight - Field height
   */
  static optimize(
    entities: Entity[],
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    orderedLayers: Map<number, string[]>,
    entityHeaderHeight: number,
    entityFieldHeight: number
  ): void {
    console.log('=== FIELD ALIGNMENT OPTIMIZER ===');

    const entityMap = new Map(entities.map(e => [e.name, e]));
    const sortedLayerIndices = Array.from(orderedLayers.keys()).sort((a, b) => a - b);

    // Process each layer from left to right
    // Each layer's positions are adjusted based on previous layer's field positions
    for (let i = 1; i < sortedLayerIndices.length; i++) {
      const layerIdx = sortedLayerIndices[i];
      const layerEntities = orderedLayers.get(layerIdx)!;

      this._alignLayerToConnections(
        layerEntities,
        relationships,
        entityPositions,
        entityMap,
        entityHeaderHeight,
        entityFieldHeight
      );
    }

    console.log('=== FIELD ALIGNMENT COMPLETE ===\n');
  }

  /**
   * Align a layer's entities to their connected fields in neighboring layers
   */
  private static _alignLayerToConnections(
    layerEntities: string[],
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    entityMap: Map<string, Entity>,
    entityHeaderHeight: number,
    entityFieldHeight: number
  ): void {
    // Calculate target Y for each entity based on its connections
    const adjustments: EntityAdjustment[] = [];

    layerEntities.forEach((entityName, order) => {
      const entity = entityMap.get(entityName);
      const currentPos = entityPositions.get(entityName);
      if (!entity || !currentPos) return;

      // Find all connections to/from this entity
      const connectedFieldPositions: number[] = [];

      relationships.forEach(rel => {
        let myFieldName: string | null = null;
        let otherEntityName: string | null = null;
        let otherFieldName: string | null = null;

        // Check if this entity is the target
        if (rel.to.entity === entityName) {
          myFieldName = rel.to.field;
          otherEntityName = rel.from.entity;
          otherFieldName = rel.from.field;
        }
        // Check if this entity is the source
        else if (rel.from.entity === entityName) {
          myFieldName = rel.from.field;
          otherEntityName = rel.to.entity;
          otherFieldName = rel.to.field;
        }

        if (myFieldName && otherEntityName && otherFieldName) {
          // Get the other entity's field Y position
          const otherEntity = entityMap.get(otherEntityName);
          const otherPos = entityPositions.get(otherEntityName);

          if (otherEntity && otherPos) {
            const otherFieldIdx = otherEntity.fields.findIndex(f => f.name === otherFieldName);
            const myFieldIdx = entity.fields.findIndex(f => f.name === myFieldName);

            if (otherFieldIdx !== -1 && myFieldIdx !== -1) {
              // Calculate where the other field is positioned
              const otherFieldY = otherPos.y + entityHeaderHeight +
                                 otherFieldIdx * entityFieldHeight + entityFieldHeight / 2;

              // Calculate where my entity should be to align this field
              const myFieldOffset = entityHeaderHeight + myFieldIdx * entityFieldHeight + entityFieldHeight / 2;
              const targetEntityY = otherFieldY - myFieldOffset;

              connectedFieldPositions.push(targetEntityY);
            }
          }
        }
      });

      // Calculate average target Y (if entity has connections)
      let targetY = currentPos.y;
      if (connectedFieldPositions.length > 0) {
        targetY = connectedFieldPositions.reduce((sum, y) => sum + y, 0) / connectedFieldPositions.length;
      }

      adjustments.push({
        entityName,
        currentY: currentPos.y,
        targetY,
        order
      });
    });

    // Sort by order (maintain the vertical ordering from ordering algorithm)
    adjustments.sort((a, b) => a.order - b.order);

    // Apply adjustments while respecting spacing and ordering
    let minY = 0;

    adjustments.forEach(adj => {
      const entity = entityMap.get(adj.entityName);
      if (!entity) return;

      const entityHeight = entityHeaderHeight + entity.fields.length * entityFieldHeight;

      // Try to use target Y, but ensure:
      // 1. Not overlapping with previous entity
      // 2. Respecting minimum spacing
      const finalY = Math.max(minY, adj.targetY);

      const currentPos = entityPositions.get(adj.entityName)!;
      entityPositions.set(
        adj.entityName,
        new Position({ x: currentPos.x, y: finalY })
      );

      // Update minimum Y for next entity
      minY = finalY + entityHeight + this.MIN_ENTITY_SPACING;

      // Log significant adjustments
      const adjustment = Math.abs(finalY - adj.currentY);
      if (adjustment > 5) {
        console.log(`  Aligned ${adj.entityName}: ${adj.currentY.toFixed(0)} → ${finalY.toFixed(0)} (shift: ${adjustment.toFixed(0)}px)`);
      }
    });
  }
}
