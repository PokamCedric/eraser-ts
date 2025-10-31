/**
 * Canvas Interaction Handler
 *
 * Handles mouse events for canvas (drag entities, pan, zoom).
 * Single Responsibility: user input handling only
 */

import { Entity } from '../../domain/entities/Entity';
import { Position } from '../../domain/value-objects/Position';
import { ViewportManager } from './ViewportManager';

interface MousePosition {
  x: number;
  y: number;
}

export class CanvasInteractionHandler {
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private dragEntity: Entity | null = null;
  private dragOffset: MousePosition = { x: 0, y: 0 };
  private lastMousePos: MousePosition = { x: 0, y: 0 };
  private isMouseDown: boolean = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private viewportManager: ViewportManager,
    private onRender: () => void,
    private getEntities: () => Entity[],
    private getEntityPositions: () => Map<string, Position>,
    private updateEntityPosition: (entityName: string, position: Position) => void,
    private isPointInEntity: (x: number, y: number) => Entity | null
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isMouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    const worldPos = this.viewportManager.screenToWorld(e.clientX, e.clientY, rect);
    const clickedEntity = this.isPointInEntity(worldPos.x, worldPos.y);

    if (clickedEntity) {
      this.isDragging = true;
      this.isPanning = false;
      this.dragEntity = clickedEntity;
      const pos = this.getEntityPositions().get(clickedEntity.name)!;
      this.dragOffset = {
        x: worldPos.x - pos.x,
        y: worldPos.y - pos.y
      };
      this.canvas.style.cursor = 'move';
    } else if (this.getEntities().length > 0) {
      this.isPanning = true;
      this.isDragging = false;
      this.dragEntity = null;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isMouseDown) {
      // Show cursor hint when hovering
      if (this.getEntities().length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const worldPos = this.viewportManager.screenToWorld(e.clientX, e.clientY, rect);
        const hoveredEntity = this.isPointInEntity(worldPos.x, worldPos.y);
        this.canvas.style.cursor = hoveredEntity ? 'pointer' : 'default';
      } else {
        this.canvas.style.cursor = 'default';
      }
      return;
    }

    if (this.isDragging && this.dragEntity) {
      const rect = this.canvas.getBoundingClientRect();
      const worldPos = this.viewportManager.screenToWorld(e.clientX, e.clientY, rect);
      this.updateEntityPosition(
        this.dragEntity.name,
        new Position({
          x: worldPos.x - this.dragOffset.x,
          y: worldPos.y - this.dragOffset.y
        })
      );
      this.onRender();
    } else if (this.isPanning) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.viewportManager.pan(dx, dy);
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.onRender();
    }
  }

  private handleMouseUp(e?: MouseEvent): void {
    this.isMouseDown = false;
    this.isDragging = false;
    this.isPanning = false;
    this.dragEntity = null;

    if (this.getEntities().length > 0 && e) {
      const rect = this.canvas.getBoundingClientRect();
      const worldPos = this.viewportManager.screenToWorld(e.clientX, e.clientY, rect);
      const hoveredEntity = this.isPointInEntity(worldPos.x, worldPos.y);
      this.canvas.style.cursor = hoveredEntity ? 'pointer' : 'default';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = this.viewportManager.getZoom() * zoomDelta;

    this.viewportManager.zoomToLevel(newZoom, mouseX, mouseY);
    this.onRender();
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }
}
