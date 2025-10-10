/**
 * Repository Interface: IRenderer
 *
 * Defines the contract for diagram rendering
 */
import { Entity } from '../entities/Entity';
import { Relationship } from '../entities/Relationship';

export interface IRenderer {
  /**
   * Set data to render
   */
  setData(entities: Entity[], relationships: Relationship[]): void;

  /**
   * Render the diagram
   */
  render(): void;

  /**
   * Zoom in
   */
  zoomIn(): void;

  /**
   * Zoom out
   */
  zoomOut(): void;

  /**
   * Fit diagram to screen
   */
  fitToScreen(): void;

  /**
   * Auto-layout entities
   */
  autoLayout(): void;

  /**
   * Get current zoom level
   */
  getZoomLevel(): number;
}
