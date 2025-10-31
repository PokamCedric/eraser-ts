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
   * Calculate luminance of a color and return appropriate text color
   */
  private getContrastColor(hexColor: string): string {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance (WCAG formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white for dark colors, black for light colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

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

    // Draw header with CUSTOM COLOR from entity
    const headerColor = entity.color || this.config.colors.entityHeader;
    ctx.fillStyle = headerColor;
    ctx.fillRect(x, y, this.config.width, this.config.headerHeight);

    // Calculate text color based on header background
    const textColor = this.getContrastColor(headerColor);

    // Draw custom icon if provided
    if (entity.icon && entity.icon !== 'box') {
      ctx.fillStyle = textColor;
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        entity.icon,
        x + 10,
        y + this.config.headerHeight / 2
      );
    }

    // Draw entity name with appropriate contrast
    ctx.fillStyle = textColor;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = entity.icon && entity.icon !== 'box' ? 'left' : 'center';
    ctx.textBaseline = 'middle';
    const nameX = entity.icon && entity.icon !== 'box'
      ? x + 40  // Offset if icon present
      : x + this.config.width / 2;
    ctx.fillText(
      entity.displayName,
      nameX,
      y + this.config.headerHeight / 2
    );

    // Draw fields
    ctx.font = '14px Arial';
    ctx.textBaseline = 'middle';

    // Calculate the maximum width needed for field names (right-aligned section)
    let maxNameWidth = 0;
    entity.fields.forEach((field) => {
      let fieldIcon = '';
      if (field.isPrimaryKey) {
        fieldIcon = '🔑 ';
      } else if (field.isForeignKey) {
        fieldIcon = '🔗 ';
      }
      const fieldNameText = `${fieldIcon}${field.name}`;
      const nameWidth = ctx.measureText(fieldNameText).width;
      maxNameWidth = Math.max(maxNameWidth, nameWidth);
    });

    // Position where colon should be (center of entity or adjusted)
    const colonX = x + maxNameWidth + 15; // 15px left margin

    entity.fields.forEach((field, index) => {
      const fieldY = y + this.config.headerHeight + index * this.config.fieldHeight;

      // Field background (alternate colors)
      if (index % 2 === 1) {
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(x, fieldY, this.config.width, this.config.fieldHeight);
      }

      // Field icon/symbol
      let fieldIcon = '';
      if (field.isPrimaryKey) {
        fieldIcon = '🔑 ';
      } else if (field.isForeignKey) {
        fieldIcon = '🔗 ';
      }

      // Draw field name (right-aligned)
      const fieldNameText = `${fieldIcon}${field.name}`;
      ctx.fillStyle = field.isPrimaryKey
        ? this.config.colors.primaryKey
        : this.config.colors.text;
      ctx.textAlign = 'right';
      ctx.fillText(
        fieldNameText,
        colonX - 3, // Small gap before colon
        fieldY + this.config.fieldHeight / 2
      );

      // Draw colon
      ctx.fillStyle = this.config.colors.text;
      ctx.textAlign = 'left';
      ctx.fillText(
        ':',
        colonX,
        fieldY + this.config.fieldHeight / 2
      );

      // Draw type (left-aligned after colon)
      ctx.fillStyle = '#666'; // Slightly gray for types
      ctx.textAlign = 'left';
      ctx.fillText(
        field.type,
        colonX + 8, // Small gap after colon
        fieldY + this.config.fieldHeight / 2
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
