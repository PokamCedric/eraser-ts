/**
 * Zoomable Renderer Interface
 *
 * Extends base renderer with zoom capabilities.
 * Respects Interface Segregation Principle (ISP).
 */

import { IBaseRenderer } from './IBaseRenderer';

export interface IZoomableRenderer extends IBaseRenderer {
  /**
   * Zoom in on the diagram
   */
  zoomIn(): void;

  /**
   * Zoom out on the diagram
   */
  zoomOut(): void;

  /**
   * Get current zoom level
   */
  getZoomLevel(): number;
}
