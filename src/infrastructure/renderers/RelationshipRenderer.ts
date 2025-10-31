/**
 * Relationship Renderer
 *
 * Renders relationships between entities on canvas.
 * Single Responsibility: relationship visual representation only
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { Position } from '../../domain/value-objects/Position';
import { getRelationshipCardinality } from '../../data/models/utils';

export interface RelationshipRenderConfig {
  entityWidth: number;
  entityHeaderHeight: number;
  entityFieldHeight: number;
  colors: {
    relationLine: string;
  };
}

export class RelationshipRenderer {
  constructor(private config: RelationshipRenderConfig) {}

  /**
   * Draw a relationship between two entities
   */
  drawRelationship(
    ctx: CanvasRenderingContext2D,
    relationship: Relationship,
    fromEntity: Entity,
    toEntity: Entity,
    fromPos: Position,
    toPos: Position
  ): void {
    // Get field-specific Y positions
    const fromFieldY = this.getFieldYPosition(fromEntity, relationship.from.field, fromPos);
    const toFieldY = this.getFieldYPosition(toEntity, relationship.to.field, toPos);

    // Calculate entity centers for X positioning logic
    const fromCenterX = fromPos.x + this.config.entityWidth / 2;
    const toCenterX = toPos.x + this.config.entityWidth / 2;

    // Determine which side to connect from based on relative horizontal positions
    const dx = toCenterX - fromCenterX;

    let fromX: number, fromY: number, toX: number, toY: number;

    // Horizontal connection logic (left-to-right layout)
    if (dx > 0) {
      // From is left of To - connect from right edge of 'from' to left edge of 'to'
      fromX = fromPos.x + this.config.entityWidth;
      fromY = fromFieldY;
      toX = toPos.x;
      toY = toFieldY;
    } else if (dx < 0) {
      // From is right of To - connect from left edge of 'from' to right edge of 'to'
      fromX = fromPos.x;
      fromY = fromFieldY;
      toX = toPos.x + this.config.entityWidth;
      toY = toFieldY;
    } else {
      // Entities are vertically aligned - use top/bottom connection
      if (fromFieldY < toFieldY) {
        // From is above To
        fromX = fromCenterX;
        fromY = fromPos.y + this.config.entityHeaderHeight + (fromEntity.fields.length * this.config.entityFieldHeight);
        toX = toCenterX;
        toY = toPos.y;
      } else {
        // From is below To
        fromX = fromCenterX;
        fromY = fromPos.y;
        toX = toCenterX;
        toY = toPos.y + this.config.entityHeaderHeight + (toEntity.fields.length * this.config.entityFieldHeight);
      }
    }

    // Use custom color if provided, otherwise use default
    const lineColor = relationship.color || this.config.colors.relationLine;
    ctx.strokeStyle = lineColor;
    ctx.fillStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Draw orthogonal line with rounded corners
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);

    const cornerRadius = 12; // Rayon des coins arrondis

    // For horizontal layout, use orthogonal routing with rounded corners
    if (dx !== 0) {
      // Horizontal connection - orthogonal with rounded corners
      const midX = (fromX + toX) / 2;
      const dy = toY - fromY;

      // First horizontal segment
      if (Math.abs(dy) > cornerRadius * 2) {
        // Has vertical difference - need corners
        ctx.lineTo(midX - cornerRadius, fromY);

        // First corner (turn down or up)
        const turnDirection = dy > 0 ? 1 : -1;
        ctx.arcTo(midX, fromY, midX, fromY + cornerRadius * turnDirection, cornerRadius);

        // Vertical segment
        ctx.lineTo(midX, toY - cornerRadius * turnDirection);

        // Second corner (turn to target)
        ctx.arcTo(midX, toY, midX + cornerRadius, toY, cornerRadius);

        // Final horizontal segment
        ctx.lineTo(toX, toY);
      } else {
        // Almost horizontal - direct line with slight curve
        ctx.lineTo(toX, toY);
      }
    } else {
      // Vertical connection - orthogonal with rounded corners
      const midY = (fromY + toY) / 2;
      const distX = toX - fromX;

      if (Math.abs(distX) > cornerRadius * 2) {
        // Has horizontal difference - need corners
        ctx.lineTo(fromX, midY - cornerRadius);

        // First corner
        const turnDirection = distX > 0 ? 1 : -1;
        ctx.arcTo(fromX, midY, fromX + cornerRadius * turnDirection, midY, cornerRadius);

        // Horizontal segment
        ctx.lineTo(toX - cornerRadius * turnDirection, midY);

        // Second corner
        ctx.arcTo(toX, midY, toX, midY + cornerRadius, cornerRadius);

        // Final vertical segment
        ctx.lineTo(toX, toY);
      } else {
        // Almost vertical - direct line
        ctx.lineTo(toX, toY);
      }
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw cardinality markers based on relationship type
    this.drawCardinalityMarkers(ctx, relationship, fromX, fromY, toX, toY, lineColor);

    // Calculate label position at midpoint
    const labelX = (fromX + toX) / 2;
    const labelY = (fromY + toY) / 2;

    // Draw label if provided
    if (relationship.label) {
      ctx.fillStyle = lineColor;
      ctx.font = 'italic 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(relationship.label, labelX, labelY + 5);
    }

    // Draw cardinality text
    ctx.fillStyle = lineColor;
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(getRelationshipCardinality(relationship), labelX, labelY - 5);
  }

  /**
   * Get the Y coordinate of a specific field within an entity
   */
  private getFieldYPosition(entity: Entity, fieldName: string, entityPos: Position): number {
    const fieldIndex = entity.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) {
      // Field not found, default to entity center
      return entityPos.y + this.config.entityHeaderHeight + (entity.fields.length * this.config.entityFieldHeight) / 2;
    }
    // Return the vertical center of the field
    return entityPos.y + this.config.entityHeaderHeight + (fieldIndex * this.config.entityFieldHeight) + (this.config.entityFieldHeight / 2);
  }

  /**
   * Draw cardinality markers based on relationship type
   */
  private drawCardinalityMarkers(
    ctx: CanvasRenderingContext2D,
    relationship: Relationship,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string
  ): void {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    // Draw markers based on relationship type
    switch (relationship.type) {
      case 'one-to-one':
        // Draw single line on both ends
        this.drawSingleMarker(ctx, fromX, fromY, 'left');
        this.drawSingleMarker(ctx, toX, toY, 'right');
        break;

      case 'one-to-many':
        // Single line on 'from' side, crow's foot on 'to' side
        this.drawSingleMarker(ctx, fromX, fromY, 'left');
        this.drawCrowsFoot(ctx, toX, toY, 'right');
        break;

      case 'many-to-one':
        // Crow's foot on 'from' side, single line on 'to' side
        this.drawCrowsFoot(ctx, fromX, fromY, 'left');
        this.drawSingleMarker(ctx, toX, toY, 'right');
        break;

      case 'many-to-many':
        // Crow's foot on both sides
        this.drawCrowsFoot(ctx, fromX, fromY, 'left');
        this.drawCrowsFoot(ctx, toX, toY, 'right');
        break;
    }
  }

  /**
   * Draw single line marker
   */
  private drawSingleMarker(ctx: CanvasRenderingContext2D, x: number, y: number, side: string): void {
    const lineLength = 10;
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(x - lineLength, y - 5);
      ctx.lineTo(x - lineLength, y + 5);
    } else {
      ctx.moveTo(x + lineLength, y - 5);
      ctx.lineTo(x + lineLength, y + 5);
    }
    ctx.stroke();
  }

  /**
   * Draw crow's foot marker
   */
  private drawCrowsFoot(ctx: CanvasRenderingContext2D, x: number, y: number, side: string): void {
    const footLength = 12;
    const footWidth = 8;

    ctx.beginPath();
    if (side === 'left') {
      // Three lines forming crow's foot pointing left
      ctx.moveTo(x, y);
      ctx.lineTo(x - footLength, y - footWidth);
      ctx.moveTo(x, y);
      ctx.lineTo(x - footLength, y);
      ctx.moveTo(x, y);
      ctx.lineTo(x - footLength, y + footWidth);
    } else {
      // Three lines forming crow's foot pointing right
      ctx.moveTo(x, y);
      ctx.lineTo(x + footLength, y - footWidth);
      ctx.moveTo(x, y);
      ctx.lineTo(x + footLength, y);
      ctx.moveTo(x, y);
      ctx.lineTo(x + footLength, y + footWidth);
    }
    ctx.stroke();
  }
}
