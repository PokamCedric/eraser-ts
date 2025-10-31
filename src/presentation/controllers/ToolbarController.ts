/**
 * Toolbar Controller
 *
 * Manages toolbar button interactions (zoom, layout, etc.).
 * Follows Single Responsibility Principle (SRP).
 */

import { DiagramService } from '../../application/services/DiagramService';

export class ToolbarController {
  constructor(private diagramService: DiagramService) {}

  /**
   * Setup toolbar event listeners
   */
  setupEventListeners(onZoomChange: () => void): void {
    // Zoom in button
    document.getElementById('zoomInBtn')!.addEventListener('click', () => {
      this.diagramService.zoomIn();
      onZoomChange();
    });

    // Zoom out button
    document.getElementById('zoomOutBtn')!.addEventListener('click', () => {
      this.diagramService.zoomOut();
      onZoomChange();
    });

    // Fit to screen button
    document.getElementById('fitBtn')!.addEventListener('click', () => {
      this.diagramService.fitToScreen();
      onZoomChange();
    });

    // Auto layout button
    document.getElementById('autoLayoutBtn')!.addEventListener('click', () => {
      this.diagramService.autoLayout();
    });
  }
}
