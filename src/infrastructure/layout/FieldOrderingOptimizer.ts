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

      // Disperse connected fields to maximize spacing
      const sortedFieldNames = this._disperseConnectedFields(
        entity.name,
        entity.fields,
        fieldBarycenters,
        relationships,
        entityLayer,
        entityPositions
      );

      // Debug: Log dispersion for users
      if (entity.name === 'users') {
        console.log(`[FieldOrdering] Users field dispersion:`);
        entity.fields.forEach(f => {
          const bary = fieldBarycenters.get(f.name);
          const hasConnection = bary !== Infinity;
          console.log(`  ${f.name}: ${hasConnection ? `connected (bary=${bary})` : 'no connection'}`);
        });
        console.log(`  Final order:`, sortedFieldNames);
      }

      // Reorder fields in the entity
      entity.reorderFields(sortedFieldNames);
    }
  }

  /**
   * Disperse connected fields to maximize spacing between them
   *
   * Strategy:
   * 1. Primary keys → Position 0 (always)
   * 2. Connected non-PK fields → Sorted by target entity position in layer, then dispersed
   * 3. Non-connected fields → Fill the gaps
   */
  private static _disperseConnectedFields(
    entityName: string,
    fields: any[],
    fieldBarycenters: Map<string, number>,
    relationships: Relationship[],
    _entityLayer: Map<string, number>,
    entityPositions: Map<string, Position>
  ): string[] {
    // Separate fields into categories
    const primaryKeys: string[] = [];
    const connectedFieldsNonPK: Array<{ name: string; targetY: number }> = [];
    const nonConnectedFields: string[] = [];

    fields.forEach(field => {
      const barycenter = fieldBarycenters.get(field.name) ?? Infinity;
      const hasConnection = barycenter !== Infinity;

      if (field.isPrimaryKey) {
        // ALL primary keys go to position 0 (priority absolute)
        primaryKeys.push(field.name);
      } else if (hasConnection) {
        // Find target entity Y position
        const targetY = this._getTargetEntityY(
          entityName,
          field.name,
          relationships,
          entityPositions
        );
        connectedFieldsNonPK.push({ name: field.name, targetY });
      } else {
        nonConnectedFields.push(field.name);
      }
    });

    // Sort connected non-PK fields by target entity Y position (not barycenter!)
    connectedFieldsNonPK.sort((a, b) => a.targetY - b.targetY);

    // Calculate total positions available
    const totalFields = fields.length;
    const numPK = primaryKeys.length;
    const numConnected = connectedFieldsNonPK.length;

    // Build final order with maximum dispersion
    const result: string[] = new Array(totalFields);

    // 1. Place ALL PKs at position 0 (and following if multiple PKs)
    let currentIndex = 0;
    primaryKeys.forEach(fieldName => {
      result[currentIndex++] = fieldName;
    });

    // 2. Disperse connected non-PK fields across remaining positions
    if (numConnected > 0) {
      const availableSlots = totalFields - numPK;

      if (numConnected === 1) {
        // Only one connected field: place it at the end
        result[totalFields - 1] = connectedFieldsNonPK[0].name;
      } else {
        // Multiple connected fields: distribute evenly in remaining space
        const step = availableSlots / numConnected;
        connectedFieldsNonPK.forEach((field, index) => {
          const position = numPK + Math.min(
            availableSlots - 1,
            Math.round((index + 0.5) * step)
          );
          result[position] = field.name;
        });
      }
    }

    // 3. Fill gaps with non-connected fields
    let nonConnectedIndex = 0;
    for (let i = 0; i < totalFields; i++) {
      if (result[i] === undefined) {
        result[i] = nonConnectedFields[nonConnectedIndex++];
      }
    }

    return result;
  }

  /**
   * Get the Y position of the target entity for a field
   */
  private static _getTargetEntityY(
    entityName: string,
    fieldName: string,
    relationships: Relationship[],
    entityPositions: Map<string, Position>
  ): number {
    // Find the relationship for this field
    for (const rel of relationships) {
      let targetEntityName: string | null = null;

      // Check if this field is source (outgoing connection)
      if (rel.from.entity === entityName && rel.from.field === fieldName) {
        targetEntityName = rel.to.entity;
      }
      // Check if this field is target (incoming connection)
      else if (rel.to.entity === entityName && rel.to.field === fieldName) {
        targetEntityName = rel.from.entity;
      }

      // Return the Y position of the target entity
      if (targetEntityName) {
        const targetPos = entityPositions.get(targetEntityName);
        if (targetPos) {
          return targetPos.y;
        }
      }
    }

    // No connection found, return high value (will sort to end)
    return Infinity;
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
