/**
 * Viewport Manager
 *
 * Manages viewport transformations (zoom, pan) for canvas rendering.
 * Follows Single Responsibility Principle (SRP).
 */

export class ViewportManager {
  private zoom: number = 1.0;
  private panX: number = 50;
  private panY: number = 50;

  /**
   * Apply viewport transformation to canvas context
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panX, this.panY);
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    this.zoom = Math.min(this.zoom * 1.2, 3.0);
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    this.zoom = Math.max(this.zoom / 1.2, 0.1);
  }

  /**
   * Get current zoom level
   */
  getZoomLevel(): number {
    return this.zoom;
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(3.0, zoom));
  }

  /**
   * Set pan position
   */
  setPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
  }

  /**
   * Get pan position
   */
  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  /**
   * Reset viewport to default
   */
  reset(): void {
    this.zoom = 1.0;
    this.panX = 50;
    this.panY = 50;
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.zoom + this.panX,
      y: worldY * this.zoom + this.panY
    };
  }
}
