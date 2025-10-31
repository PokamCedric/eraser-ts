/**
 * Entity Renderer
 *
 * Renders entities on canvas.
 * Single Responsibility: entity visual representation only
 */

import { Entity } from '../../domain/entities/Entity';
import { IconLoader } from './IconLoader';

export interface EntityRenderConfig {
  entityWidth: number;
  entityHeaderHeight: number;
  entityFieldHeight: number;
  colors: {
    entityBorder: string;
    entityShadow: string;
    fieldText: string;
    primaryKeyBg: string;
    foreignKeyBg: string;
  };
}

export class EntityRenderer {
  private iconsLoaded: Set<string> = new Set();

  constructor(private config: EntityRenderConfig) {}

  /**
   * Draw an entity at the specified position
   */
  drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number): void {
    const width = this.config.entityWidth;
    const headerHeight = this.config.entityHeaderHeight;
    const fieldHeight = this.config.entityFieldHeight;
    const totalHeight = headerHeight + (entity.fields.length * fieldHeight);

    // Shadow
    ctx.shadowColor = this.config.colors.entityShadow;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, width, totalHeight);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = this.config.colors.entityBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, totalHeight);

    // Header
    ctx.fillStyle = entity.color || '#3b82f6';
    ctx.fillRect(x, y, width, headerHeight);

    // Icon (SVG from Lucide Icons or emoji fallback)
    let iconRendered = false;
    if (entity.icon && entity.icon !== 'box') {
      // Try to load SVG icon
      if (!this.iconsLoaded.has(entity.icon)) {
        IconLoader.load(entity.icon).then(() => {
          this.iconsLoaded.add(entity.icon);
        });
      }

      const iconImg = IconLoader.getCached(entity.icon);
      if (iconImg) {
        // Draw SVG icon (white colored via filter)
        ctx.save();
        // Apply white color filter to SVG
        ctx.filter = 'brightness(0) invert(1)';
        const iconSize = 20;
        const iconX = x + 12;
        const iconY = y + (headerHeight - iconSize) / 2;
        ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
        ctx.restore();
        iconRendered = true;
      } else {
        // Fallback: render as emoji/text if available
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(entity.icon, x + 12, y + headerHeight / 2);
        iconRendered = true;
      }
    }

    // Entity name (offset if icon present)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = iconRendered ? 'left' : 'center';
    ctx.textBaseline = 'middle';
    const nameX = iconRendered ? x + 42 : x + width / 2;
    ctx.fillText(entity.displayName, nameX, y + headerHeight / 2);

    // Fields
    entity.fields.forEach((field, index) => {
      const fieldY = y + headerHeight + (index * fieldHeight);
      this.drawField(ctx, field, x, fieldY, width, fieldHeight);
    });
  }

  /**
   * Draw a single field
   */
  private drawField(ctx: CanvasRenderingContext2D, field: any, x: number, y: number, width: number, height: number): void {
    // Field background
    if (field.isPrimaryKey) {
      ctx.fillStyle = this.config.colors.primaryKeyBg;
      ctx.fillRect(x, y, width, height);
    } else if (field.isForeignKey) {
      ctx.fillStyle = this.config.colors.foreignKeyBg;
      ctx.fillRect(x, y, width, height);
    }

    // Field separator
    ctx.strokeStyle = this.config.colors.entityBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    // Field name (left)
    ctx.fillStyle = this.config.colors.fieldText;
    ctx.font = '14px -apple-system, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let fieldText = field.name;
    if (field.isPrimaryKey) fieldText += ' 🔑';
    if (field.isForeignKey) fieldText += ' 🔗';
    if (field.isUnique) fieldText += ' ✦';

    ctx.fillText(fieldText, x + 10, y + height / 2);

    // Field type (right)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px -apple-system, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(field.type, x + width - 10, y + height / 2);
  }

  /**
   * Calculate entity height
   */
  calculateHeight(entity: Entity): number {
    return this.config.entityHeaderHeight + entity.fields.length * this.config.entityFieldHeight;
  }

  /**
   * Check if a point is inside an entity
   */
  isPointInside(x: number, y: number, entityX: number, entityY: number, entity: Entity): boolean {
    const width = this.config.entityWidth;
    const height = this.calculateHeight(entity);

    return x >= entityX && x <= entityX + width &&
           y >= entityY && y <= entityY + height;
  }
}
