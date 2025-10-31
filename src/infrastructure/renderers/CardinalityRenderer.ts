/**
 * Cardinality Renderer Strategy
 *
 * Implements Open/Closed Principle (OCP) for rendering cardinality markers.
 * New cardinality types can be added without modifying existing code.
 */

import { RelationshipType } from '../../domain/entities/Relationship';

export interface CardinalityMarkers {
  source: string;
  target: string;
}

/**
 * Strategy interface for rendering cardinality markers
 */
export interface ICardinalityRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
  ): void;
}

/**
 * One-to-One cardinality renderer
 */
export class OneToOneRenderer implements ICardinalityRenderer {
  constructor(private config: { color: string }) {}

  render(
    ctx: CanvasRenderingContext2D,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
  ): void {
    ctx.fillStyle = this.config.color;
    ctx.font = '14px Arial';
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'left';
    ctx.fillText('1', sourceX + 5, sourceY);
    ctx.textAlign = 'right';
    ctx.fillText('1', targetX - 5, targetY);
  }
}

/**
 * One-to-Many cardinality renderer
 */
export class OneToManyRenderer implements ICardinalityRenderer {
  constructor(private config: { color: string }) {}

  render(
    ctx: CanvasRenderingContext2D,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
  ): void {
    ctx.fillStyle = this.config.color;
    ctx.font = '14px Arial';
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'left';
    ctx.fillText('1', sourceX + 5, sourceY);
    ctx.textAlign = 'right';
    ctx.fillText('*', targetX - 5, targetY);
  }
}

/**
 * Many-to-One cardinality renderer
 */
export class ManyToOneRenderer implements ICardinalityRenderer {
  constructor(private config: { color: string }) {}

  render(
    ctx: CanvasRenderingContext2D,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
  ): void {
    ctx.fillStyle = this.config.color;
    ctx.font = '14px Arial';
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'left';
    ctx.fillText('*', sourceX + 5, sourceY);
    ctx.textAlign = 'right';
    ctx.fillText('1', targetX - 5, targetY);
  }
}

/**
 * Many-to-Many cardinality renderer
 */
export class ManyToManyRenderer implements ICardinalityRenderer {
  constructor(private config: { color: string }) {}

  render(
    ctx: CanvasRenderingContext2D,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
  ): void {
    ctx.fillStyle = this.config.color;
    ctx.font = '14px Arial';
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'left';
    ctx.fillText('*', sourceX + 5, sourceY);
    ctx.textAlign = 'right';
    ctx.fillText('*', targetX - 5, targetY);
  }
}

/**
 * Cardinality Renderer Factory
 *
 * Factory that creates appropriate cardinality renderers based on relationship type.
 * Follows Open/Closed Principle - new types can be registered without modification.
 */
export class CardinalityRendererFactory {
  private renderers: Map<RelationshipType, ICardinalityRenderer>;

  constructor(color: string) {
    this.renderers = new Map<RelationshipType, ICardinalityRenderer>();
    this.renderers.set('one-to-one', new OneToOneRenderer({ color }));
    this.renderers.set('one-to-many', new OneToManyRenderer({ color }));
    this.renderers.set('many-to-one', new ManyToOneRenderer({ color }));
    this.renderers.set('many-to-many', new ManyToManyRenderer({ color }));
  }

  /**
   * Get renderer for a specific relationship type
   */
  getRenderer(type: RelationshipType): ICardinalityRenderer | undefined {
    return this.renderers.get(type);
  }

  /**
   * Register a custom cardinality renderer (OCP: extensible without modification)
   */
  registerRenderer(type: RelationshipType, renderer: ICardinalityRenderer): void {
    this.renderers.set(type, renderer);
  }

  /**
   * Check if a renderer is registered for a type
   */
  hasRenderer(type: RelationshipType): boolean {
    return this.renderers.has(type);
  }
}
