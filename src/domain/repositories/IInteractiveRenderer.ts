/**
 * Interactive Renderer Interface
 *
 * Extends zoomable renderer with interactive features like auto-layout.
 * Respects Interface Segregation Principle (ISP).
 */

import { IZoomableRenderer } from './IZoomableRenderer';

export interface IInteractiveRenderer extends IZoomableRenderer {
  /**
   * Fit the diagram to screen
   */
  fitToScreen(): void;

  /**
   * Automatically layout the diagram
   */
  autoLayout(): void;
}
