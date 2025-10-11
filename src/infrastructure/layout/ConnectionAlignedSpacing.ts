/**
 * Connection-Aligned Spacing Optimizer
 *
 * Adjusts the Y positions of entities to minimize connection crossings
 * by ensuring that connections between consecutive fields go straight or downward.
 *
 * Rule: For two consecutive fields in a source entity:
 *   - Upper field → Target entity should be at same Y or above
 *   - Lower field → Target entity should be at same Y or below
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { Position } from '../../domain/value-objects/Position';

interface FieldConnection {
  sourceEntity: string;
  sourceField: string;
  sourceFieldY: number;
  targetEntity: string;
  targetFieldY: number;
}

export class ConnectionAlignedSpacing {
  /**
   * Optimize Y positions of entities to align with their field connections
   *
   * @param entities - All entities
   * @param relationships - All relationships
   * @param entityPositions - Current positions (will be modified in-place)
   * @param layers - Layer assignment for each entity
   * @param entityHeaderHeight - Height of entity header
   * @param entityFieldHeight - Height of each field
   */
  static optimizeSpacing(
    entities: Entity[],
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    layers: Map<number, string[]>,
    entityHeaderHeight: number,
    entityFieldHeight: number
  ): void {
    const entityMap = new Map<string, Entity>(
      entities.map(e => [e.name, e])
    );

    // Create layer lookup
    const entityLayer = new Map<string, number>();
    for (const [layerNum, entityNames] of layers.entries()) {
      for (const name of entityNames) {
        entityLayer.set(name, layerNum);
      }
    }

    // Build field connections with Y positions
    const connections = this._buildFieldConnections(
      relationships,
      entityPositions,
      entityMap,
      entityHeaderHeight,
      entityFieldHeight
    );

    // Process each layer from left to right
    const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

    for (let i = 1; i < sortedLayers.length; i++) {
      const currentLayerNum = sortedLayers[i];
      const currentLayerEntities = layers.get(currentLayerNum)!;

      // Adjust positions for entities in this layer
      this._adjustLayerPositions(
        currentLayerEntities,
        connections,
        entityPositions,
        entityMap,
        entityHeaderHeight,
        entityFieldHeight
      );
    }
  }

  /**
   * Build field connections with their Y positions
   */
  private static _buildFieldConnections(
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    entityMap: Map<string, Entity>,
    entityHeaderHeight: number,
    entityFieldHeight: number
  ): FieldConnection[] {
    const connections: FieldConnection[] = [];

    relationships.forEach(rel => {
      const sourceEntity = entityMap.get(rel.from.entity);
      const targetEntity = entityMap.get(rel.to.entity);
      const sourcePos = entityPositions.get(rel.from.entity);
      const targetPos = entityPositions.get(rel.to.entity);

      if (!sourceEntity || !targetEntity || !sourcePos || !targetPos) return;

      // Find source field index
      const sourceFieldIndex = sourceEntity.fields.findIndex(
        f => f.name === rel.from.field
      );

      // Find target field index
      const targetFieldIndex = targetEntity.fields.findIndex(
        f => f.name === rel.to.field
      );

      if (sourceFieldIndex === -1 || targetFieldIndex === -1) return;

      // Calculate Y positions of the fields
      const sourceFieldY =
        sourcePos.y +
        entityHeaderHeight +
        sourceFieldIndex * entityFieldHeight +
        entityFieldHeight / 2;

      const targetFieldY =
        targetPos.y +
        entityHeaderHeight +
        targetFieldIndex * entityFieldHeight +
        entityFieldHeight / 2;

      connections.push({
        sourceEntity: rel.from.entity,
        sourceField: rel.from.field,
        sourceFieldY,
        targetEntity: rel.to.entity,
        targetFieldY
      });
    });

    return connections;
  }

  /**
   * Adjust Y positions for entities in a layer to minimize crossings
   */
  private static _adjustLayerPositions(
    layerEntities: string[],
    connections: FieldConnection[],
    entityPositions: Map<string, Position>,
    entityMap: Map<string, Entity>,
    entityHeaderHeight: number,
    entityFieldHeight: number
  ): void {
    // For each entity, calculate the ideal Y position based on incoming connections
    const idealPositions = new Map<string, number>();

    layerEntities.forEach(entityName => {
      const entity = entityMap.get(entityName);
      if (!entity) return;

      // Find all connections pointing to this entity
      const incomingConnections = connections.filter(
        conn => conn.targetEntity === entityName
      );

      if (incomingConnections.length === 0) return;

      // Calculate ideal Y: average of source field Y positions
      // This will align the entity close to where its connections come from
      const avgSourceY =
        incomingConnections.reduce((sum, conn) => sum + conn.sourceFieldY, 0) /
        incomingConnections.length;

      // Calculate what entity Y would align the first field with avgSourceY
      const firstFieldOffset = entityHeaderHeight + entityFieldHeight / 2;
      const idealY = avgSourceY - firstFieldOffset;

      idealPositions.set(entityName, idealY);
    });

    // Sort entities by their ideal positions
    const sortedEntities = layerEntities
      .map(name => ({
        name,
        currentY: entityPositions.get(name)?.y ?? 0,
        idealY: idealPositions.get(name) ?? entityPositions.get(name)?.y ?? 0
      }))
      .sort((a, b) => a.idealY - b.idealY);

    // Reassign Y positions with minimum spacing
    const minSpacing = 30;
    let currentY = 50; // Start position

    sortedEntities.forEach(item => {
      const entity = entityMap.get(item.name);
      if (!entity) return;

      const entityHeight =
        entityHeaderHeight + entity.fields.length * entityFieldHeight;

      // Try to use ideal Y, but respect minimum spacing
      const newY = Math.max(currentY, item.idealY);

      const currentPos = entityPositions.get(item.name)!;
      entityPositions.set(
        item.name,
        new Position({ x: currentPos.x, y: newY })
      );

      currentY = newY + entityHeight + minSpacing;
    });
  }
}
