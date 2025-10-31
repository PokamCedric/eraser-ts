/**
 * Relationship Renderer
 *
 * Renders relationships (connections) between entities on canvas.
 * Follows Single Responsibility Principle (SRP).
 */

import { Relationship } from '../../domain/entities/Relationship';
import { Position } from '../../domain/value-objects/Position';
import { Entity } from '../../domain/entities/Entity';

export interface RelationshipRenderConfig {
  entityWidth: number;
  headerHeight: number;
  fieldHeight: number;
  colors: {
    relationshipLine: string;
    relationshipText: string;
  };
}

export class RelationshipRenderer {
  constructor(private config: RelationshipRenderConfig) {}

  /**
   * Render a relationship
   */
  render(
    ctx: CanvasRenderingContext2D,
    relationship: Relationship,
    entityPositions: Map<string, Position>,
    entities: Entity[]
  ): void {
    const sourcePos = entityPositions.get(relationship.from.entity);
    const targetPos = entityPositions.get(relationship.to.entity);

    if (!sourcePos || !targetPos) {
      return;
    }

    const sourceEntity = entities.find(e => e.name === relationship.from.entity);
    const targetEntity = entities.find(e => e.name === relationship.to.entity);

    if (!sourceEntity || !targetEntity) {
      return;
    }

    // Calculate connection points
    const sourceFieldIndex = sourceEntity.fields.findIndex(
      f => f.name === relationship.from.field
    );
    const targetFieldIndex = targetEntity.fields.findIndex(
      f => f.name === relationship.to.field
    );

    const sourceY = sourceFieldIndex >= 0
      ? sourcePos.y + this.config.headerHeight + sourceFieldIndex * this.config.fieldHeight + this.config.fieldHeight / 2
      : sourcePos.y + this.config.headerHeight / 2;

    const targetY = targetFieldIndex >= 0
      ? targetPos.y + this.config.headerHeight + targetFieldIndex * this.config.fieldHeight + this.config.fieldHeight / 2
      : targetPos.y + this.config.headerHeight / 2;

    const sourceX = sourcePos.x + this.config.entityWidth;
    const targetX = targetPos.x;

    // Draw relationship line
    ctx.strokeStyle = this.config.colors.relationshipLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);

    // Draw bezier curve for better visualization
    const controlPointOffset = Math.abs(targetX - sourceX) / 2;
    ctx.bezierCurveTo(
      sourceX + controlPointOffset,
      sourceY,
      targetX - controlPointOffset,
      targetY,
      targetX,
      targetY
    );
    ctx.stroke();

    // Draw cardinality markers
    this.drawCardinalityMarkers(
      ctx,
      sourceX,
      sourceY,
      targetX,
      targetY,
      relationship.type
    );

    // Draw relationship label if exists
    if (relationship.label) {
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;

      ctx.fillStyle = this.config.colors.relationshipText;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(relationship.label, midX, midY - 10);
    }
  }

  /**
   * Draw cardinality markers based on relationship type
   */
  private drawCardinalityMarkers(
    ctx: CanvasRenderingContext2D,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    relationType: string
  ): void {
    ctx.fillStyle = this.config.colors.relationshipLine;
    ctx.font = '14px Arial';
    ctx.textBaseline = 'middle';

    switch (relationType) {
      case 'one-to-one':
        ctx.textAlign = 'left';
        ctx.fillText('1', sourceX + 5, sourceY);
        ctx.textAlign = 'right';
        ctx.fillText('1', targetX - 5, targetY);
        break;

      case 'one-to-many':
        ctx.textAlign = 'left';
        ctx.fillText('1', sourceX + 5, sourceY);
        ctx.textAlign = 'right';
        ctx.fillText('*', targetX - 5, targetY);
        break;

      case 'many-to-one':
        ctx.textAlign = 'left';
        ctx.fillText('*', sourceX + 5, sourceY);
        ctx.textAlign = 'right';
        ctx.fillText('1', targetX - 5, targetY);
        break;

      case 'many-to-many':
        ctx.textAlign = 'left';
        ctx.fillText('*', sourceX + 5, sourceY);
        ctx.textAlign = 'right';
        ctx.fillText('*', targetX - 5, targetY);
        break;
    }
  }
}
