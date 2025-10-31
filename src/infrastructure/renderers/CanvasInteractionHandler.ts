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
  private isDragging: boolean = false;
  private draggedEntity: Entity | null = null;
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
    private entityWidth: number,
    private entityHeaderHeight: number,
    private entityFieldHeight: number
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
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldPos = this.viewportManager.screenToWorld(mouseX, mouseY);
    const clickedEntity = this.findEntityAt(
      mouseX,
      mouseY,
      this.getEntities(),
      this.getEntityPositions(),
      this.entityWidth,
      this.entityHeaderHeight,
      this.entityFieldHeight
    );

    if (clickedEntity) {
      // Drag entity
      this.isDragging = true;
      this.isPanning = false;
      this.draggedEntity = clickedEntity;
      const entityPos = this.getEntityPositions().get(clickedEntity.name);
      if (entityPos) {
        this.dragOffset = {
          x: worldPos.x - entityPos.x,
          y: worldPos.y - entityPos.y
        };
      }
      this.canvas.style.cursor = 'move';
    } else if (this.getEntities().length > 0) {
      // Pan canvas
      this.isPanning = true;
      this.isDragging = false;
      this.draggedEntity = null;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isMouseDown) {
      // Show cursor hint when hovering
      if (this.getEntities().length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const hoveredEntity = this.findEntityAt(
          mouseX,
          mouseY,
          this.getEntities(),
          this.getEntityPositions(),
          this.entityWidth,
          this.entityHeaderHeight,
          this.entityFieldHeight
        );
        this.canvas.style.cursor = hoveredEntity ? 'pointer' : 'default';
      } else {
        this.canvas.style.cursor = 'default';
      }
      return;
    }

    if (this.isDragging && this.draggedEntity) {
      // Drag entity
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldPos = this.viewportManager.screenToWorld(mouseX, mouseY);

      this.updateEntityPosition(
        this.draggedEntity.name,
        new Position({
          x: worldPos.x - this.dragOffset.x,
          y: worldPos.y - this.dragOffset.y
        })
      );
      this.onRender();
    } else if (this.isPanning) {
      // Pan canvas
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      const currentPan = this.viewportManager.getPan();
      this.viewportManager.setPan(currentPan.x + dx, currentPan.y + dy);
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.onRender();
    }
  }

  private handleMouseUp(e?: MouseEvent): void {
    this.isMouseDown = false;
    this.isDragging = false;
    this.isPanning = false;
    this.draggedEntity = null;

    if (this.getEntities().length > 0 && e) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const hoveredEntity = this.findEntityAt(
        mouseX,
        mouseY,
        this.getEntities(),
        this.getEntityPositions(),
        this.entityWidth,
        this.entityHeaderHeight,
        this.entityFieldHeight
      );
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
    const currentZoom = this.viewportManager.getZoomLevel();
    const newZoom = Math.max(0.1, Math.min(3.0, currentZoom * zoomDelta));

    const currentPan = this.viewportManager.getPan();
    const zoomChange = newZoom / currentZoom;

    this.viewportManager.setZoom(newZoom);
    this.viewportManager.setPan(
      mouseX - (mouseX - currentPan.x) * zoomChange,
      mouseY - (mouseY - currentPan.y) * zoomChange
    );

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
