/**
 * Field Ordering Optimizer
 *
 * Reorders fields within entities to minimize connection crossings
 * using the barycenter method at the field level.
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { Position } from '../../domain/value-objects/Position';

export class FieldOrderingOptimizer {
  /**
   * Optimize field ordering to minimize connection crossings
   *
   * @param entities - Array of entities to optimize
   * @param relationships - Relationships between entities
   * @param entityPositions - Current positions of entities
   * @param entityHeaderHeight - Height of entity header
   * @param entityFieldHeight - Height of each field
   * @param layers - Layer assignment for each entity
   * @param iterations - Number of optimization passes (default: 2)
   */
  static optimizeFieldOrder(
    entities: Entity[],
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    entityHeaderHeight: number,
    entityFieldHeight: number,
    layers: Map<number, string[]>,
    iterations: number = 2
  ): void {
    // Create entity name to entity map for quick lookup
    const entityMap = new Map<string, Entity>(
      entities.map(e => [e.name, e])
    );

    // Create layer lookup map (entity name -> layer number)
    const entityLayer = new Map<string, number>();
    for (const [layerNum, entityNames] of layers.entries()) {
      for (const name of entityNames) {
        entityLayer.set(name, layerNum);
      }
    }

    // Perform multiple iterations for better results
    for (let iter = 0; iter < iterations; iter++) {
      // Forward pass: optimize left to right
      this._optimizePass(
        entities,
        relationships,
        entityPositions,
        entityMap,
        entityLayer,
        entityHeaderHeight,
        entityFieldHeight,
        'forward'
      );

      // Backward pass: optimize right to left
      this._optimizePass(
        entities,
        relationships,
        entityPositions,
        entityMap,
        entityLayer,
        entityHeaderHeight,
        entityFieldHeight,
        'backward'
      );
    }
  }

  /**
   * Single optimization pass (forward or backward)
   */
  private static _optimizePass(
    entities: Entity[],
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    entityMap: Map<string, Entity>,
    entityLayer: Map<string, number>,
    entityHeaderHeight: number,
    entityFieldHeight: number,
    direction: 'forward' | 'backward'
  ): void {
    for (const entity of entities) {
      const currentLayer = entityLayer.get(entity.name);
      if (currentLayer === undefined) continue;

      // Calculate barycenter for each field
      const fieldBarycenters = new Map<string, number>();

      for (const field of entity.fields) {
        const barycenter = this._calculateFieldBarycenter(
          entity.name,
          field.name,
          relationships,
          entityPositions,
          entityMap,
          entityLayer,
          currentLayer,
          entityHeaderHeight,
          entityFieldHeight,
          direction
        );

        fieldBarycenters.set(field.name, barycenter);
      }

      // Sort fields by barycenter with special handling for primary keys
      const sortedFieldNames = entity.fields
        .map(f => ({ name: f.name, isPrimaryKey: f.isPrimaryKey }))
        .sort((a, b) => {
          const baryA = fieldBarycenters.get(a.name) ?? Infinity;
          const baryB = fieldBarycenters.get(b.name) ?? Infinity;

          // Primary keys without connections (Infinity) always come first
          const hasConnectionA = baryA !== Infinity;
          const hasConnectionB = baryB !== Infinity;

          // If PK has no connections, it goes to position 0
          if (a.isPrimaryKey && !hasConnectionA && b.isPrimaryKey && !hasConnectionB) {
            return 0; // Both PKs without connections, keep original order
          }
          if (a.isPrimaryKey && !hasConnectionA) {
            return -1; // PK without connection goes first
          }
          if (b.isPrimaryKey && !hasConnectionB) {
            return 1; // PK without connection goes first
          }

          // Otherwise, sort by barycenter (including PKs with connections)
          return baryA - baryB;
        })
        .map(f => f.name);

      // Reorder fields in the entity
      entity.reorderFields(sortedFieldNames);
    }
  }

  /**
   * Calculate barycenter (average Y position) of connected fields
   */
  private static _calculateFieldBarycenter(
    entityName: string,
    fieldName: string,
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    entityMap: Map<string, Entity>,
    entityLayer: Map<string, number>,
    currentLayer: number,
    entityHeaderHeight: number,
    entityFieldHeight: number,
    direction: 'forward' | 'backward'
  ): number {
    const connectedFieldPositions: number[] = [];

    // Find all relationships connected to this field
    for (const rel of relationships) {
      let targetEntityName: string | null = null;
      let targetFieldName: string | null = null;

      // Check if this field is the source
      if (rel.from.entity === entityName && rel.from.field === fieldName) {
        const targetLayer = entityLayer.get(rel.to.entity);

        // Only consider connections in the direction we're optimizing
        if (direction === 'forward' && targetLayer !== undefined && targetLayer > currentLayer) {
          targetEntityName = rel.to.entity;
          targetFieldName = rel.to.field;
        } else if (direction === 'backward' && targetLayer !== undefined && targetLayer < currentLayer) {
          targetEntityName = rel.to.entity;
          targetFieldName = rel.to.field;
        }
      }

      // Check if this field is the target
      if (rel.to.entity === entityName && rel.to.field === fieldName) {
        const sourceLayer = entityLayer.get(rel.from.entity);

        // Only consider connections in the direction we're optimizing
        if (direction === 'forward' && sourceLayer !== undefined && sourceLayer < currentLayer) {
          targetEntityName = rel.from.entity;
          targetFieldName = rel.from.field;
        } else if (direction === 'backward' && sourceLayer !== undefined && sourceLayer > currentLayer) {
          targetEntityName = rel.from.entity;
          targetFieldName = rel.from.field;
        }
      }

      // Calculate Y position of the connected field
      if (targetEntityName && targetFieldName) {
        const targetEntity = entityMap.get(targetEntityName);
        const targetPos = entityPositions.get(targetEntityName);

        if (targetEntity && targetPos) {
          const fieldIndex = targetEntity.fields.findIndex(f => f.name === targetFieldName);
          if (fieldIndex !== -1) {
            const fieldY = targetPos.y + entityHeaderHeight + (fieldIndex * entityFieldHeight) + (entityFieldHeight / 2);
            connectedFieldPositions.push(fieldY);
          }
        }
      }
    }

    // If no connections, return a default value (will sort to end)
    if (connectedFieldPositions.length === 0) {
      return Infinity;
    }

    // Calculate average position (barycenter)
    const sum = connectedFieldPositions.reduce((a, b) => a + b, 0);
    return sum / connectedFieldPositions.length;
  }
}
