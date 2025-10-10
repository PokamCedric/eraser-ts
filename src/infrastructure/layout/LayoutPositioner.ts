/**
 * Layout Positioner
 *
 * Calculates screen positions for entities based on their hierarchical layers.
 */

import { Position } from '../../domain/value-objects/Position';

export interface LayoutConfig {
  entityWidth: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  baseX: number;
  displayHeight: number;
}

export class LayoutPositioner {
  /**
   * Calculate positions for entities in horizontal layout (left to right)
   *
   * @param layers - Map of layer index to entity names
   * @param config - Layout configuration
   * @returns Map of entity name to position
   */
  static calculatePositions(
    layers: Map<number, string[]>,
    config: LayoutConfig
  ): Map<string, Position> {
    const positions = new Map<string, Position>();

    // Sort layers by index and position entities
    for (const [layerIndex, layerNodes] of Array.from(layers.entries()).sort((a, b) => a[0] - b[0])) {
      const count = layerNodes.length;
      const totalLayerHeight = (count - 1) * config.verticalSpacing;
      const startY = (config.displayHeight - totalLayerHeight) / 2;
      const x = config.baseX + layerIndex * config.horizontalSpacing;

      layerNodes.forEach((name, i) => {
        const y = startY + i * config.verticalSpacing;
        positions.set(name, new Position({ x, y }));
      });
    }

    return positions;
  }
}
