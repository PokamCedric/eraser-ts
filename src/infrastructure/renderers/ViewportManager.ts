/**
 * Viewport Manager
 *
 * Manages viewport transformations (zoom, pan) for canvas rendering.
 * Single Responsibility: viewport state and transformations only
 */

export class ViewportManager {
  private zoom: number = 1.0;
  private panX: number = 50;
  private panY: number = 50;

  /**
   * Apply viewport transformation to canvas context
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number, canvasRect: DOMRect): { x: number; y: number } {
    const x = (screenX - canvasRect.left - this.panX) / this.zoom;
    const y = (screenY - canvasRect.top - this.panY) / this.zoom;
    return { x, y };
  }

  /**
   * Zoom in centered on a point
   */
  zoomIn(centerX: number, centerY: number): void {
    const newZoom = Math.min(3.0, this.zoom * 1.2);
    const zoomChange = newZoom / this.zoom;

    this.panX = centerX - (centerX - this.panX) * zoomChange;
    this.panY = centerY - (centerY - this.panY) * zoomChange;
    this.zoom = newZoom;
  }

  /**
   * Zoom out centered on a point
   */
  zoomOut(centerX: number, centerY: number): void {
    const newZoom = Math.max(0.1, this.zoom / 1.2);
    const zoomChange = newZoom / this.zoom;

    this.panX = centerX - (centerX - this.panX) * zoomChange;
    this.panY = centerY - (centerY - this.panY) * zoomChange;
    this.zoom = newZoom;
  }

  /**
   * Zoom to a specific level with mouse position as focal point
   */
  zoomToLevel(newZoom: number, mouseX: number, mouseY: number): void {
    newZoom = Math.max(0.1, Math.min(3.0, newZoom));
    const zoomChange = newZoom / this.zoom;

    this.panX = mouseX - (mouseX - this.panX) * zoomChange;
    this.panY = mouseY - (mouseY - this.panY) * zoomChange;
    this.zoom = newZoom;
  }

  /**
   * Pan the viewport
   */
  pan(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
  }

  /**
   * Set zoom and pan to fit content
   */
  fitToContent(
    contentMinX: number,
    contentMinY: number,
    contentMaxX: number,
    contentMaxY: number,
    displayWidth: number,
    displayHeight: number,
    padding: number = 100
  ): void {
    const contentWidth = contentMaxX - contentMinX;
    const contentHeight = contentMaxY - contentMinY;

    const zoomX = (displayWidth - padding) / contentWidth;
    const zoomY = (displayHeight - padding) / contentHeight;
    this.zoom = Math.min(zoomX, zoomY, 1.0);

    this.panX = (displayWidth - contentWidth * this.zoom) / 2 - contentMinX * this.zoom;
    this.panY = (displayHeight - contentHeight * this.zoom) / 2 - contentMinY * this.zoom;
  }

  /**
   * Get current zoom level as percentage
   */
  getZoomLevel(): number {
    return Math.round(this.zoom * 100);
  }

  /**
   * Get current zoom value
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * Get current pan position
   */
  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }
}
