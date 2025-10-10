/**
 * Use Case: Render Diagram
 *
 * Renders the diagram using the provided renderer
 */
import { IRenderer } from '../../domain/repositories/IRenderer';
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

export class RenderDiagramUseCase {
  constructor(private renderer: IRenderer) {}

  execute(entities: Entity[], relationships: Relationship[]): void {
    if (!entities || !Array.isArray(entities)) {
      throw new Error('Entities must be an array');
    }

    if (!relationships || !Array.isArray(relationships)) {
      throw new Error('Relationships must be an array');
    }

    this.renderer.setData(entities, relationships);
    this.renderer.render();
  }

  zoomIn(): void {
    this.renderer.zoomIn();
  }

  zoomOut(): void {
    this.renderer.zoomOut();
  }

  fitToScreen(): void {
    this.renderer.fitToScreen();
  }

  autoLayout(): void {
    this.renderer.autoLayout();
  }

  getZoomLevel(): number {
    return this.renderer.getZoomLevel();
  }
}
