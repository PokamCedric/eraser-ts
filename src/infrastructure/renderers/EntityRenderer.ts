/**
 * Entity Renderer
 *
 * Renders entities on canvas.
 * Follows Single Responsibility Principle (SRP).
 */

import { Entity } from '../../domain/entities/Entity';
import { Position } from '../../domain/value-objects/Position';

export interface EntityRenderConfig {
  width: number;
  headerHeight: number;
  fieldHeight: number;
  colors: {
    entityBg: string;
    entityBorder: string;
    entityHeader: string;
    text: string;
    primaryKey: string;
  };
}

export class EntityRenderer {
  constructor(private config: EntityRenderConfig) {}

  /**
   * Render an entity
   */
  render(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    position: Position
  ): void {
    const { x, y } = position;
    const totalHeight = this.config.headerHeight + entity.fields.length * this.config.fieldHeight;

    // Draw entity box
    ctx.fillStyle = this.config.colors.entityBg;
    ctx.fillRect(x, y, this.config.width, totalHeight);

    ctx.strokeStyle = this.config.colors.entityBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.config.width, totalHeight);

    // Draw header
    ctx.fillStyle = this.config.colors.entityHeader;
    ctx.fillRect(x, y, this.config.width, this.config.headerHeight);

    ctx.fillStyle = this.config.colors.text;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      entity.displayName,
      x + this.config.width / 2,
      y + this.config.headerHeight / 2
    );

    // Draw fields
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';

    entity.fields.forEach((field, index) => {
      const fieldY = y + this.config.headerHeight + index * this.config.fieldHeight;

      // Field background (alternate colors)
      if (index % 2 === 1) {
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(x, fieldY, this.config.width, this.config.fieldHeight);
      }

      // Field text
      const icon = field.isPrimaryKey ? '🔑 ' : '';
      const fieldText = `${icon}${field.name}: ${field.type}`;

      ctx.fillStyle = field.isPrimaryKey
        ? this.config.colors.primaryKey
        : this.config.colors.text;
      ctx.textBaseline = 'middle';
      ctx.fillText(
        fieldText,
        x + 10,
        fieldY + this.config.fieldHeight / 2,
        this.config.width - 20
      );
    });
  }

  /**
   * Calculate entity height
   */
  calculateHeight(entity: Entity): number {
    return this.config.headerHeight + entity.fields.length * this.config.fieldHeight;
  }
}
