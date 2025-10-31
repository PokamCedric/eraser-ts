/**
 * Canvas Interaction Handler
 *
 * Handles mouse events for canvas (drag, pan, etc.).
 * Follows Single Responsibility Principle (SRP).
 */

import { Entity } from '../../domain/entities/Entity';
import { Position } from '../../domain/value-objects/Position';
import { ViewportManager } from './ViewportManager';

interface MousePosition {
  x: number;
  y: number;
}

export class CanvasInteractionHandler {
  private isPanning: boolean = false;
  private lastMousePos: MousePosition = { x: 0, y: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private viewportManager: ViewportManager,
    private onRender: () => void
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.lastMousePos = { x: mouseX, y: mouseY };

    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      // Middle mouse or Shift+Left mouse = pan
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.isPanning) {
      const dx = mouseX - this.lastMousePos.x;
      const dy = mouseY - this.lastMousePos.y;

      const currentPan = this.viewportManager.getPan();
      this.viewportManager.setPan(currentPan.x + dx, currentPan.y + dy);

      this.onRender();
    }

    this.lastMousePos = { x: mouseX, y: mouseY };
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    if (e.deltaY < 0) {
      this.viewportManager.zoomIn();
    } else {
      this.viewportManager.zoomOut();
    }

    this.onRender();
  }

  /**
   * Find entity at given screen coordinates
   */
  findEntityAt(
    screenX: number,
    screenY: number,
    entities: Entity[],
    entityPositions: Map<string, Position>,
    entityWidth: number,
    entityHeaderHeight: number,
    entityFieldHeight: number
  ): Entity | null {
    const worldPos = this.viewportManager.screenToWorld(screenX, screenY);

    for (const entity of entities) {
      const pos = entityPositions.get(entity.name);
      if (!pos) continue;

      const entityHeight = entityHeaderHeight + entity.fields.length * entityFieldHeight;

      if (
        worldPos.x >= pos.x &&
        worldPos.x <= pos.x + entityWidth &&
        worldPos.y >= pos.y &&
        worldPos.y <= pos.y + entityHeight
      ) {
        return entity;
      }
    }

    return null;
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }
}
