/**
 * Canvas Layout Orchestrator
 *
 * Orchestrates the layout algorithm execution and position calculation.
 * Follows Single Responsibility Principle (SRP).
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { Position } from '../../domain/value-objects/Position';
import { LayerClassificationEngine } from '../../domain/services/layout/LayerClassificationEngine';

export interface LayoutConfig {
  layerSpacingX: number;
  entitySpacingY: number;
  entityWidth: number;
  headerHeight: number;
  fieldHeight: number;
}

export class CanvasLayoutOrchestrator {
  constructor(private config: LayoutConfig) {}

  /**
   * Calculate positions for all entities using layout algorithm
   */
  calculatePositions(
    entities: Entity[],
    relationships: Relationship[]
  ): Map<string, Position> {
    const { layers } = LayerClassificationEngine.layout(entities, relationships);

    const positions = new Map<string, Position>();
    let maxY = 0;

    // Position entities by layers
    layers.forEach((layer: string[], layerIndex: number) => {
      let currentY = 50;

      layer.forEach((entityName: string) => {
        const entity = entities.find((e) => e.name === entityName);
        if (!entity) return;

        const x = 100 + layerIndex * (this.config.entityWidth + this.config.layerSpacingX);
        const y = currentY;

        positions.set(entityName, new Position({ x, y }));

        const entityHeight =
          this.config.headerHeight +
          entity.fields.length * this.config.fieldHeight;

        currentY += entityHeight + this.config.entitySpacingY;
        maxY = Math.max(maxY, currentY);
      });
    });

    return positions;
  }

  /**
   * Calculate required canvas dimensions
   */
  calculateCanvasDimensions(
    entities: Entity[],
    positions: Map<string, Position>
  ): { width: number; height: number } {
    let maxX = 0;
    let maxY = 0;

    positions.forEach((pos, entityName) => {
      const entity = entities.find((e) => e.name === entityName);
      if (!entity) return;

      const entityHeight =
        this.config.headerHeight +
        entity.fields.length * this.config.fieldHeight;

      maxX = Math.max(maxX, pos.x + this.config.entityWidth);
      maxY = Math.max(maxY, pos.y + entityHeight);
    });

    return {
      width: maxX + 100,
      height: maxY + 100
    };
  }

  /**
   * Auto-fit canvas to content
   */
  calculateFitToScreenTransform(
    canvasWidth: number,
    canvasHeight: number,
    contentWidth: number,
    contentHeight: number,
    padding: number = 50
  ): { zoom: number; panX: number; panY: number } {
    const availableWidth = canvasWidth - 2 * padding;
    const availableHeight = canvasHeight - 2 * padding;

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const zoom = Math.min(scaleX, scaleY, 1.0);

    const scaledWidth = contentWidth * zoom;
    const scaledHeight = contentHeight * zoom;

    const panX = (canvasWidth - scaledWidth) / 2;
    const panY = (canvasHeight - scaledHeight) / 2;

    return { zoom, panX, panY };
  }
}
