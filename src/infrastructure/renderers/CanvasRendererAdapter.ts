/**
 * Infrastructure Adapter: Canvas Renderer
 *
 * Adapts the canvas renderer to implement IRenderer
 */
import { IRenderer } from '../../domain/repositories/IRenderer';
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { Position } from '../../domain/value-objects/Position';
import { LayerClassificationEngine } from '../../domain/services/layout/LayerClassificationEngine';
import { LayoutPositioner } from '../../domain/services/positioning/LayoutPositioner';
import { MagneticAlignmentOptimizer } from '../../domain/services/layout/MagneticAlignmentOptimizer';
import { getRelationshipCardinality } from '../../data/models/utils';
import { Logger } from '../utils/Logger';

interface MousePosition {
  x: number;
  y: number;
}

export class CanvasRendererAdapter implements IRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entities: Entity[] = [];
  private relationships: Relationship[] = [];

  // Rendering state
  private zoom: number = 1.0;
  private panX: number = 50;
  private panY: number = 50;
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private dragEntity: Entity | null = null;
  private dragOffset: MousePosition = { x: 0, y: 0 };
  private lastMousePos: MousePosition = { x: 0, y: 0 };

  // Entity layout
  private entityPositions: Map<string, Position> = new Map();
  private readonly entityWidth: number = 250;
  private readonly entityHeaderHeight: number = 50;
  private readonly entityFieldHeight: number = 30;
  private readonly entityPadding: number = 60;

  // Display dimensions
  private displayWidth: number = 0;
  private displayHeight: number = 0;

  // Colors
  private readonly colors = {
    background: '#ffffff',
    gridLine: 'rgba(0,0,0,0.05)',
    entityBorder: '#e2e8f0',
    entityShadow: 'rgba(0,0,0,0.1)',
    fieldText: '#475569',
    relationLine: '#3b82f6',
    primaryKeyBg: '#dbeafe',
    foreignKeyBg: '#fef3c7'
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    this._setupCanvas();
    this._setupEventListeners();
  }

  setData(entities: Entity[], relationships: Relationship[]): void {
    this.entities = entities;
    this.relationships = relationships;

    // Apply auto-layout automatically if there are entities
    if (this.entities.length > 0) {
      this.autoLayout();
    } else {
      this._initializePositions();
      this.render();
    }
  }

  render(): void {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    this._drawRelationships(ctx);
    this._drawEntities(ctx);

    ctx.restore();
  }

  zoomIn(): void {
    const centerX = this.displayWidth / 2;
    const centerY = this.displayHeight / 2;

    const newZoom = Math.min(3.0, this.zoom * 1.2);
    const zoomChange = newZoom / this.zoom;

    this.panX = centerX - (centerX - this.panX) * zoomChange;
    this.panY = centerY - (centerY - this.panY) * zoomChange;
    this.zoom = newZoom;

    this.render();
  }

  zoomOut(): void {
    const centerX = this.displayWidth / 2;
    const centerY = this.displayHeight / 2;

    const newZoom = Math.max(0.1, this.zoom / 1.2);
    const zoomChange = newZoom / this.zoom;

    this.panX = centerX - (centerX - this.panX) * zoomChange;
    this.panY = centerY - (centerY - this.panY) * zoomChange;
    this.zoom = newZoom;

    this.render();
  }

  fitToScreen(): void {
    if (this.entities.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const entity of this.entities) {
      const pos = this.entityPositions.get(entity.name);
      if (!pos) continue;

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + this.entityWidth);
      maxY = Math.max(maxY, pos.y + this.entityHeaderHeight + (entity.fields.length * this.entityFieldHeight));
    }

    if (!isFinite(minX)) return;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 100;

    const zoomX = (this.displayWidth - padding) / contentWidth;
    const zoomY = (this.displayHeight - padding) / contentHeight;
    this.zoom = Math.min(zoomX, zoomY, 1.0);

    this.panX = (this.displayWidth - contentWidth * this.zoom) / 2 - minX * this.zoom;
    this.panY = (this.displayHeight - contentHeight * this.zoom) / 2 - minY * this.zoom;

    this.render();
  }

  autoLayout(): void {
    this.entityPositions.clear();

    // Step 1-5: Compute hierarchical layers using Layer Classification Engine
    // This algorithm uses Floyd-Warshall inversé to detect transitive intercalations
    // - Step 0: Parse relationships (external, handled by parser)
    // - Step 1: Build backlog (deduplication)
    // - Step 2: Determine processing order
    // - Step 3: Build clusters
    // - Step 4: Build layers with Floyd-Warshall inversé (transitive distance calculation)
    // - Step 5: Vertical reorganization by cluster
    const { layers } = LayerClassificationEngine.layout(this.entities, this.relationships);

    // Step 7: Field ordering within entities (only reorder fields, not entities)
    const finalLayers = MagneticAlignmentOptimizer.optimize(
      this.entities,
      this.relationships,
      layers
    );

    // Step 8: Calculate positions based on optimized ordering
    const positions = LayoutPositioner.calculatePositions(
      finalLayers,
      this.entities,  // Pass entities to calculate heights
      {
        entityWidth: this.entityWidth,
        entityHeaderHeight: this.entityHeaderHeight,
        entityFieldHeight: this.entityFieldHeight,
        horizontalSpacing: this.entityWidth + 120,
        verticalSpacing: 10,  // Minimum gap between entities
        baseX: 100,
        displayHeight: this.displayHeight
      }
    );

    // Apply positions
    this.entityPositions = positions;

    // Step 9: Debug output
    this._logLayoutDebugInfo(finalLayers);

    // Step 10: Fit to screen
    this.fitToScreen();
  }

  /**
   * Log debug information about the layout
   */
  private _logLayoutDebugInfo(layers: Map<number, string[]>): void {
    Logger.debug('🧭 Auto Layout Layers (Left → Right)');
    Logger.debug(`Number of layers detected: ${layers.size}`);
    for (const [i, names] of Array.from(layers.entries()).sort((a, b) => a[0] - b[0])) {
      Logger.debug(`Layer ${i}: ${names.join(', ')}`);
    }
  }

  getZoomLevel(): number {
    return Math.round(this.zoom * 100);
  }

  // Private methods
  private _setupCanvas(): void {
    this._resizeCanvas();
    window.addEventListener('resize', () => {
      this._resizeCanvas();
      this.render();
    });
  }

  private _resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
  }

  private _setupEventListeners(): void {
    let isMouseDown = false;

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      isMouseDown = true;
      const worldPos = this._screenToWorld(e.clientX, e.clientY);
      const clickedEntity = this._getEntityAtPoint(worldPos.x, worldPos.y);

      if (clickedEntity) {
        this.isDragging = true;
        this.isPanning = false;
        this.dragEntity = clickedEntity;
        const pos = this.entityPositions.get(clickedEntity.name)!;
        this.dragOffset = {
          x: worldPos.x - pos.x,
          y: worldPos.y - pos.y
        };
        this.canvas.style.cursor = 'move';
      } else if (this.entities.length > 0) {
        this.isPanning = true;
        this.isDragging = false;
        this.dragEntity = null;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
      }
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isMouseDown) {
        if (this.entities.length > 0) {
          const worldPos = this._screenToWorld(e.clientX, e.clientY);
          const hoveredEntity = this._getEntityAtPoint(worldPos.x, worldPos.y);
          this.canvas.style.cursor = hoveredEntity ? 'pointer' : 'default';
        } else {
          this.canvas.style.cursor = 'default';
        }
        return;
      }

      if (this.isDragging && this.dragEntity) {
        const worldPos = this._screenToWorld(e.clientX, e.clientY);
        this.entityPositions.set(this.dragEntity.name, new Position({
          x: worldPos.x - this.dragOffset.x,
          y: worldPos.y - this.dragOffset.y
        }));
        this.render();
      } else if (this.isPanning) {
        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;
        this.panX += dx;
        this.panY += dy;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.render();
      }
    });

    const stopDragging = (e?: MouseEvent) => {
      isMouseDown = false;
      this.isDragging = false;
      this.isPanning = false;
      this.dragEntity = null;

      if (this.entities.length > 0 && e) {
        const worldPos = this._screenToWorld(e.clientX, e.clientY);
        const hoveredEntity = this._getEntityAtPoint(worldPos.x, worldPos.y);
        this.canvas.style.cursor = hoveredEntity ? 'pointer' : 'default';
      } else {
        this.canvas.style.cursor = 'default';
      }
    };

    this.canvas.addEventListener('mouseup', stopDragging);
    this.canvas.addEventListener('mouseleave', stopDragging);

    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3.0, this.zoom * zoomDelta));

      const zoomChange = newZoom / this.zoom;
      this.panX = mouseX - (mouseX - this.panX) * zoomChange;
      this.panY = mouseY - (mouseY - this.panY) * zoomChange;

      this.zoom = newZoom;
      this.render();
    });
  }

  private _screenToWorld(screenX: number, screenY: number): MousePosition {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - this.panX) / this.zoom;
    const y = (screenY - rect.top - this.panY) / this.zoom;
    return { x, y };
  }

  private _getEntityAtPoint(x: number, y: number): Entity | null {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      const pos = this.entityPositions.get(entity.name);
      if (!pos) continue;

      const width = this.entityWidth;
      const height = this.entityHeaderHeight + (entity.fields.length * this.entityFieldHeight);

      if (x >= pos.x && x <= pos.x + width &&
        y >= pos.y && y <= pos.y + height) {
        return entity;
      }
    }
    return null;
  }

  private _initializePositions(): void {
    const cols = Math.ceil(Math.sqrt(this.entities.length));
    const spacing = this.entityWidth + this.entityPadding * 2;

    this.entities.forEach((entity, index) => {
      if (!this.entityPositions.has(entity.name)) {
        const row = Math.floor(index / cols);
        const col = index % cols;

        this.entityPositions.set(entity.name, new Position({
          x: col * spacing + this.entityPadding,
          y: row * (300 + this.entityPadding) + this.entityPadding
        }));
      }
    });
  }

  private _drawEntities(ctx: CanvasRenderingContext2D): void {
    for (const entity of this.entities) {
      const pos = this.entityPositions.get(entity.name);
      if (!pos) continue;
      this._drawEntity(ctx, entity, pos.x, pos.y);
    }
  }

  private _drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number): void {
    const width = this.entityWidth;
    const headerHeight = this.entityHeaderHeight;
    const fieldHeight = this.entityFieldHeight;
    const totalHeight = headerHeight + (entity.fields.length * fieldHeight);

    ctx.shadowColor = this.colors.entityShadow;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, width, totalHeight);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.strokeStyle = this.colors.entityBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, totalHeight);

    ctx.fillStyle = entity.color || '#3b82f6';
    ctx.fillRect(x, y, width, headerHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entity.displayName, x + width / 2, y + headerHeight / 2);

    entity.fields.forEach((field, index) => {
      const fieldY = y + headerHeight + (index * fieldHeight);
      this._drawField(ctx, field, x, fieldY, width, fieldHeight);
    });
  }

  private _drawField(ctx: CanvasRenderingContext2D, field: any, x: number, y: number, width: number, height: number): void {
    if (field.isPrimaryKey) {
      ctx.fillStyle = this.colors.primaryKeyBg;
      ctx.fillRect(x, y, width, height);
    } else if (field.isForeignKey) {
      ctx.fillStyle = this.colors.foreignKeyBg;
      ctx.fillRect(x, y, width, height);
    }

    ctx.strokeStyle = this.colors.entityBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    ctx.fillStyle = this.colors.fieldText;
    ctx.font = '14px -apple-system, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let fieldText = field.name;
    if (field.isPrimaryKey) fieldText += ' 🔑';
    if (field.isForeignKey) fieldText += ' 🔗';
    if (field.isUnique) fieldText += ' ✦';

    ctx.fillText(fieldText, x + 10, y + height / 2);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px -apple-system, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(field.type, x + width - 10, y + height / 2);
  }

  private _drawRelationships(ctx: CanvasRenderingContext2D): void {
    for (const rel of this.relationships) {
      this._drawRelationship(ctx, rel);
    }
  }

  /**
   * Get the Y coordinate of a specific field within an entity
   */
  private _getFieldYPosition(entity: Entity, fieldName: string, entityPos: Position): number {
    const fieldIndex = entity.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) {
      // Field not found, default to entity center
      return entityPos.y + this.entityHeaderHeight + (entity.fields.length * this.entityFieldHeight) / 2;
    }
    // Return the vertical center of the field
    return entityPos.y + this.entityHeaderHeight + (fieldIndex * this.entityFieldHeight) + (this.entityFieldHeight / 2);
  }

  private _drawRelationship(ctx: CanvasRenderingContext2D, relationship: Relationship): void {
    const fromEntity = this.entities.find(e => e.name === relationship.from.entity);
    const toEntity = this.entities.find(e => e.name === relationship.to.entity);

    if (!fromEntity || !toEntity) return;

    const fromPos = this.entityPositions.get(fromEntity.name);
    const toPos = this.entityPositions.get(toEntity.name);

    if (!fromPos || !toPos) return;

    // Get field-specific Y positions
    const fromFieldY = this._getFieldYPosition(fromEntity, relationship.from.field, fromPos);
    const toFieldY = this._getFieldYPosition(toEntity, relationship.to.field, toPos);

    // Calculate entity centers for X positioning logic
    const fromCenterX = fromPos.x + this.entityWidth / 2;
    const toCenterX = toPos.x + this.entityWidth / 2;

    // Determine which side to connect from based on relative horizontal positions
    const dx = toCenterX - fromCenterX;

    let fromX: number, fromY: number, toX: number, toY: number;

    // Horizontal connection logic (left-to-right layout)
    if (dx > 0) {
      // From is left of To - connect from right edge of 'from' to left edge of 'to'
      fromX = fromPos.x + this.entityWidth;
      fromY = fromFieldY;
      toX = toPos.x;
      toY = toFieldY;
    } else if (dx < 0) {
      // From is right of To - connect from left edge of 'from' to right edge of 'to'
      fromX = fromPos.x;
      fromY = fromFieldY;
      toX = toPos.x + this.entityWidth;
      toY = toFieldY;
    } else {
      // Entities are vertically aligned - use top/bottom connection
      if (fromFieldY < toFieldY) {
        // From is above To
        fromX = fromCenterX;
        fromY = fromPos.y + this.entityHeaderHeight + (fromEntity.fields.length * this.entityFieldHeight);
        toX = toCenterX;
        toY = toPos.y;
      } else {
        // From is below To
        fromX = fromCenterX;
        fromY = fromPos.y;
        toX = toCenterX;
        toY = toPos.y + this.entityHeaderHeight + (toEntity.fields.length * this.entityFieldHeight);
      }
    }

    // Use custom color if provided, otherwise use default
    const lineColor = relationship.color || this.colors.relationLine;
    ctx.strokeStyle = lineColor;
    ctx.fillStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Draw line with orthogonal routing for horizontal connections
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);

    // For horizontal layout, use orthogonal routing with midpoint
    if (dx !== 0) {
      // Horizontal connection - use orthogonal routing
      const midX = (fromX + toX) / 2;
      ctx.lineTo(midX, fromY);
      ctx.lineTo(midX, toY);
      ctx.lineTo(toX, toY);
    } else {
      // Vertical connection - direct line with midpoint
      const midY = (fromY + toY) / 2;
      ctx.lineTo(fromX, midY);
      ctx.lineTo(toX, midY);
      ctx.lineTo(toX, toY);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw cardinality markers based on relationship type
    this._drawCardinalityMarkers(ctx, relationship, fromX, fromY, toX, toY, lineColor);

    // Calculate label position at midpoint
    const labelX = (fromX + toX) / 2;
    const labelY = (fromY + toY) / 2;

    // Draw label if provided
    if (relationship.label) {
      ctx.fillStyle = lineColor;
      ctx.font = 'italic 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(relationship.label, labelX, labelY + 5);
    }

    // Draw cardinality text
    ctx.fillStyle = lineColor;
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(getRelationshipCardinality(relationship), labelX, labelY - 5);
  }

  private _drawCardinalityMarkers(ctx: CanvasRenderingContext2D, relationship: Relationship, fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    // Draw markers based on relationship type
    switch (relationship.type) {
      case 'one-to-one':
        // Draw single line on both ends
        this._drawSingleMarker(ctx, fromX, fromY, 'left');
        this._drawSingleMarker(ctx, toX, toY, 'right');
        break;

      case 'one-to-many':
        // Single line on 'from' side, crow's foot on 'to' side
        this._drawSingleMarker(ctx, fromX, fromY, 'left');
        this._drawCrowsFoot(ctx, toX, toY, 'right');
        break;

      case 'many-to-one':
        // Crow's foot on 'from' side, single line on 'to' side
        this._drawCrowsFoot(ctx, fromX, fromY, 'left');
        this._drawSingleMarker(ctx, toX, toY, 'right');
        break;

      case 'many-to-many':
        // Crow's foot on both sides
        this._drawCrowsFoot(ctx, fromX, fromY, 'left');
        this._drawCrowsFoot(ctx, toX, toY, 'right');
        break;
    }
  }

  private _drawSingleMarker(ctx: CanvasRenderingContext2D, x: number, y: number, side: string): void {
    const lineLength = 10;
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(x - lineLength, y - 5);
      ctx.lineTo(x - lineLength, y + 5);
    } else {
      ctx.moveTo(x + lineLength, y - 5);
      ctx.lineTo(x + lineLength, y + 5);
    }
    ctx.stroke();
  }

  private _drawCrowsFoot(ctx: CanvasRenderingContext2D, x: number, y: number, side: string): void {
    const footLength = 12;
    const footWidth = 8;

    ctx.beginPath();
    if (side === 'left') {
      // Three lines forming crow's foot pointing left
      ctx.moveTo(x, y);
      ctx.lineTo(x - footLength, y - footWidth);
      ctx.moveTo(x, y);
      ctx.lineTo(x - footLength, y);
      ctx.moveTo(x, y);
      ctx.lineTo(x - footLength, y + footWidth);
    } else {
      // Three lines forming crow's foot pointing right
      ctx.moveTo(x, y);
      ctx.lineTo(x + footLength, y - footWidth);
      ctx.moveTo(x, y);
      ctx.lineTo(x + footLength, y);
      ctx.moveTo(x, y);
      ctx.lineTo(x + footLength, y + footWidth);
    }
    ctx.stroke();
  }
}
