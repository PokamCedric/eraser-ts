/**
 * Connection-Aware Positioner
 *
 * Optimizes entity positions to minimize connection crossings and length.
 * Uses a force-directed approach considering connections between entities.
 */

import { Position } from '../../value-objects/Position';
import { Entity } from '../../entities/Entity';
import { Relationship } from '../../entities/Relationship';

export interface OptimalLayoutConfig {
  entityWidth: number;
  entityHeaderHeight: number;
  entityFieldHeight: number;
  horizontalSpacing: number;
  minVerticalSpacing: number;  // Minimum gap between entities
  baseX: number;
}

export class ConnectionAwarePositioner {
  /**
   * Calculate optimal positions that minimize connection crossings
   * and align connected entities vertically
   */
  static calculateOptimalPositions(
    layers: Map<number, string[]>,
    entities: Entity[],
    relationships: Relationship[],
    config: OptimalLayoutConfig
  ): Map<string, Position> {
    const positions = new Map<string, Position>();

    // Create entity lookup map
    const entityMap = new Map<string, Entity>();
    entities.forEach(e => entityMap.set(e.name, e));

    // Build connection map (entity -> connected entities with their layers)
    const connections = this.buildConnectionMap(layers, relationships);

    // Calculate height for each entity
    const entityHeights = new Map<string, number>();
    entities.forEach(entity => {
      const height = config.entityHeaderHeight + entity.fields.length * config.entityFieldHeight;
      entityHeights.set(entity.name, height);
    });

    // Process each layer and calculate optimal Y positions
    const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0]);

    for (const [layerIndex, layerNodes] of sortedLayers) {
      const x = config.baseX + layerIndex * config.horizontalSpacing;

      if (layerIndex === 0) {
        // First layer: distribute evenly
        const yPositions = this.distributeEvenly(
          layerNodes,
          entityHeights,
          config.minVerticalSpacing
        );

        layerNodes.forEach((name, i) => {
          positions.set(name, new Position({ x, y: yPositions[i] }));
        });
      } else {
        // Subsequent layers: position based on connections to previous layers
        const yPositions = this.calculateConnectionBasedPositions(
          layerNodes,
          connections,
          positions,
          entityHeights,
          config.minVerticalSpacing
        );

        layerNodes.forEach((name, i) => {
          positions.set(name, new Position({ x, y: yPositions[i] }));
        });
      }
    }

    return positions;
  }

  /**
   * Build a map of connections between entities
   */
  private static buildConnectionMap(
    layers: Map<number, string[]>,
    relationships: Relationship[]
  ): Map<string, Array<{ entity: string; layer: number }>> {
    const connections = new Map<string, Array<{ entity: string; layer: number }>>();

    // Get layer for each entity
    const entityToLayer = new Map<string, number>();
    for (const [layerIndex, layerNodes] of layers.entries()) {
      layerNodes.forEach(node => entityToLayer.set(node, layerIndex));
    }

    // Build bidirectional connection map
    for (const rel of relationships) {
      const fromEntity = rel.from.entity;
      const toEntity = rel.to.entity;
      const fromLayer = entityToLayer.get(fromEntity) ?? 0;
      const toLayer = entityToLayer.get(toEntity) ?? 0;

      // Add forward connection
      if (!connections.has(fromEntity)) {
        connections.set(fromEntity, []);
      }
      connections.get(fromEntity)!.push({ entity: toEntity, layer: toLayer });

      // Add backward connection
      if (!connections.has(toEntity)) {
        connections.set(toEntity, []);
      }
      connections.get(toEntity)!.push({ entity: fromEntity, layer: fromLayer });
    }

    return connections;
  }

  /**
   * Distribute entities evenly for the first layer
   */
  private static distributeEvenly(
    entities: string[],
    entityHeights: Map<string, number>,
    minSpacing: number
  ): number[] {
    const positions: number[] = [];
    let currentY = 100; // Start padding

    entities.forEach(name => {
      positions.push(currentY);
      const height = entityHeights.get(name) ?? 100;
      currentY += height + minSpacing;
    });

    return positions;
  }

  /**
   * Calculate positions based on connections to already-positioned entities
   */
  private static calculateConnectionBasedPositions(
    layerNodes: string[],
    connections: Map<string, Array<{ entity: string; layer: number }>>,
    existingPositions: Map<string, Position>,
    entityHeights: Map<string, number>,
    minSpacing: number
  ): number[] {
    // Calculate ideal Y position for each entity based on its connections
    const idealPositions: Array<{ name: string; idealY: number }> = [];

    for (const name of layerNodes) {
      const connectedEntities = connections.get(name) || [];

      // Filter to only already-positioned entities
      const positionedConnections = connectedEntities
        .map(conn => existingPositions.get(conn.entity))
        .filter(pos => pos !== undefined) as Position[];

      if (positionedConnections.length > 0) {
        // Calculate center Y of connected entities
        const avgY = positionedConnections.reduce((sum, pos) => sum + pos.y, 0) / positionedConnections.length;
        idealPositions.push({ name, idealY: avgY });
      } else {
        // No connections yet, use default
        idealPositions.push({ name, idealY: 100 });
      }
    }

    // Sort by ideal Y position
    idealPositions.sort((a, b) => a.idealY - b.idealY);

    // Assign actual positions avoiding overlaps
    const actualPositions = new Map<string, number>();
    let currentY = 100;

    for (const { name, idealY } of idealPositions) {
      const height = entityHeights.get(name) ?? 100;

      // Use ideal Y if it doesn't cause overlap, otherwise use currentY
      const y = Math.max(idealY, currentY);
      actualPositions.set(name, y);

      currentY = y + height + minSpacing;
    }

    // Return positions in original order
    return layerNodes.map(name => actualPositions.get(name) ?? 100);
  }
}
