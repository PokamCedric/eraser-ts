/**
 * Layout Positioner
 *
 * Calculates screen positions for entities based on their hierarchical layers.
 * Takes into account entity heights to avoid overlaps.
 */

import { Position } from '../../value-objects/Position';
import { Entity } from '../../entities/Entity';

export interface LayoutConfig {
  entityWidth: number;
  entityHeaderHeight: number;
  entityFieldHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;  // Minimum gap between entities
  baseX: number;
  displayHeight: number;
}

export class LayoutPositioner {
  /**
   * Calculate the height of an entity based on its fields
   */
  static calculateEntityHeight(
    entity: Entity,
    headerHeight: number,
    fieldHeight: number
  ): number {
    return headerHeight + entity.fields.length * fieldHeight;
  }

  /**
   * Calculate positions for entities in horizontal layout (left to right)
   * Avoids overlaps by considering actual entity heights
   *
   * @param layers - Map of layer index to entity names
   * @param entities - All entities (to calculate heights)
   * @param config - Layout configuration
   * @returns Map of entity name to position
   */
  static calculatePositions(
    layers: Map<number, string[]>,
    entities: Entity[],
    config: LayoutConfig
  ): Map<string, Position> {
    const positions = new Map<string, Position>();

    // Create entity lookup map
    const entityMap = new Map<string, Entity>();
    entities.forEach(e => entityMap.set(e.name, e));

    // Sort layers by index and position entities
    for (const [layerIndex, layerNodes] of Array.from(layers.entries()).sort((a, b) => a[0] - b[0])) {
      // Calculate total height needed for this layer (including entity heights + spacing)
      let totalHeight = 0;
      const entityHeights: number[] = [];

      layerNodes.forEach(name => {
        const entity = entityMap.get(name);
        if (entity) {
          const height = this.calculateEntityHeight(
            entity,
            config.entityHeaderHeight,
            config.entityFieldHeight
          );
          entityHeights.push(height);
          totalHeight += height;
        } else {
          // Fallback if entity not found
          entityHeights.push(config.entityHeaderHeight);
          totalHeight += config.entityHeaderHeight;
        }
      });

      // Add spacing between entities
      totalHeight += (layerNodes.length - 1) * config.verticalSpacing;

      // Calculate starting Y position (center the layer vertically)
      let currentY = Math.max(0, (config.displayHeight - totalHeight) / 2);
      const x = config.baseX + layerIndex * config.horizontalSpacing;

      // Position each entity
      layerNodes.forEach((name, i) => {
        positions.set(name, new Position({ x, y: currentY }));

        // Move Y down by entity height + spacing for next entity
        currentY += entityHeights[i] + config.verticalSpacing;
      });
    }

    return positions;
  }
}
