/**
 * Infrastructure Adapter: Canvas Renderer
 *
 * Adapts the canvas renderer to implement IRenderer
 * Refactored to follow Single Responsibility Principle (SRP)
 */
import { IRenderer } from '../../domain/repositories/IRenderer';
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { Position } from '../../domain/value-objects/Position';
import { LayerClassificationEngine } from '../../domain/services/layout/LayerClassificationEngine';
import { LayoutPositioner } from '../../domain/services/positioning/LayoutPositioner';
import { MagneticAlignmentOptimizer } from '../../domain/services/layout/MagneticAlignmentOptimizer';
import { Logger } from '../utils/Logger';
import { ViewportManager } from './ViewportManager';
import { CanvasInteractionHandler } from './CanvasInteractionHandler';
import { EntityRenderer } from './EntityRenderer';
import { RelationshipRenderer } from './RelationshipRenderer';
import { CanvasLayoutOrchestrator } from './CanvasLayoutOrchestrator';

export class CanvasRendererAdapter implements IRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entities: Entity[] = [];
  private relationships: Relationship[] = [];

  // Entity layout
  private entityPositions: Map<string, Position> = new Map();
  private readonly entityWidth: number = 250;
  private readonly entityHeaderHeight: number = 50;
  private readonly entityFieldHeight: number = 30;
  private readonly entityPadding: number = 60;

  // Display dimensions
  private displayWidth: number = 0;
  private displayHeight: number = 0;

  // Delegated components (SRP)
  private viewportManager: ViewportManager;
  // @ts-expect-error - Kept to prevent garbage collection and maintain event listeners
  private interactionHandler: CanvasInteractionHandler;
  private entityRenderer: EntityRenderer;
  private relationshipRenderer: RelationshipRenderer;
  private layoutOrchestrator: CanvasLayoutOrchestrator;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    // Initialize delegated components
    this.viewportManager = new ViewportManager();
    this.entityRenderer = new EntityRenderer({
      width: this.entityWidth,
      headerHeight: this.entityHeaderHeight,
      fieldHeight: this.entityFieldHeight,
      colors: {
        entityBg: '#ffffff',
        entityBorder: '#e2e8f0',
        entityHeader: '#3b82f6',
        text: '#475569',
        primaryKey: '#2563eb'
      }
    });
    this.relationshipRenderer = new RelationshipRenderer({
      entityWidth: this.entityWidth,
      headerHeight: this.entityHeaderHeight,
      fieldHeight: this.entityFieldHeight,
      colors: {
        relationshipLine: '#3b82f6',
        relationshipText: '#475569'
      }
    });
    this.layoutOrchestrator = new CanvasLayoutOrchestrator({
      layerSpacingX: 120,
      entitySpacingY: 10,
      entityWidth: this.entityWidth,
      headerHeight: this.entityHeaderHeight,
      fieldHeight: this.entityFieldHeight
    });

    this._setupCanvas();
    this.interactionHandler = new CanvasInteractionHandler(
      this.canvas,
      this.viewportManager,
      () => this.render()
    );
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

    // Apply viewport transformation (zoom and pan)
    this.viewportManager.applyTransform(ctx);

    // Render relationships first (behind entities)
    for (const relationship of this.relationships) {
      this.relationshipRenderer.render(
        ctx,
        relationship,
        this.entityPositions,
        this.entities
      );
    }

    // Render entities
    for (const entity of this.entities) {
      const pos = this.entityPositions.get(entity.name);
      if (!pos) continue;
      this.entityRenderer.render(ctx, entity, pos);
    }

    ctx.restore();
  }

  zoomIn(): void {
    this.viewportManager.zoomIn();
    this.render();
  }

  zoomOut(): void {
    this.viewportManager.zoomOut();
    this.render();
  }

  fitToScreen(): void {
    if (this.entities.length === 0) return;

    const dimensions = this.layoutOrchestrator.calculateCanvasDimensions(
      this.entities,
      this.entityPositions
    );

    const transform = this.layoutOrchestrator.calculateFitToScreenTransform(
      this.displayWidth,
      this.displayHeight,
      dimensions.width,
      dimensions.height,
      100
    );

    this.viewportManager.setZoom(transform.zoom);
    this.viewportManager.setPan(transform.panX, transform.panY);

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
    return Math.round(this.viewportManager.getZoomLevel() * 100);
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
}
