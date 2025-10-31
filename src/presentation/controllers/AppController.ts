/**
 * Presentation Controller: AppController
 *
 * Orchestrates all sub-controllers and coordinates the application flow.
 * Refactored to follow Single Responsibility Principle (SRP).
 */
import { DiagramService } from '../../application/services/DiagramService';
import { MonacoEditorFactory } from '../factories/MonacoEditorFactory';
import { EditorController } from './EditorController';
import { ToolbarController } from './ToolbarController';
import { StatusController } from './StatusController';
import { ExportController } from './ExportController';
import { ResizeController } from './ResizeController';

export class AppController {
  private editorController: EditorController;
  private toolbarController: ToolbarController;
  private statusController: StatusController;
  private exportController: ExportController;
  private resizeController: ResizeController;

  constructor(
    private diagramService: DiagramService,
    editorFactory: MonacoEditorFactory
  ) {
    // Initialize all sub-controllers
    this.editorController = new EditorController(editorFactory);
    this.toolbarController = new ToolbarController(diagramService);
    this.statusController = new StatusController(diagramService);
    this.exportController = new ExportController(diagramService);
    this.resizeController = new ResizeController();
  }

  async initialize(): Promise<void> {
    // Initialize editor
    await this.editorController.initialize(() => this._onDSLChange());

    // Setup all event listeners
    this._setupEventListeners();

    // Initialize icons
    this.statusController.initializeLucideIcons();

    // Initial render
    await this._onDSLChange();
  }

  private _setupEventListeners(): void {
    // Toolbar buttons (zoom, layout)
    this.toolbarController.setupEventListeners(() => {
      this.statusController.updateZoomLevel();
    });

    // Editor buttons (format, validate, save, reset)
    document.getElementById('formatBtn')!.addEventListener('click', () => {
      this.editorController.format();
    });

    document.getElementById('validateBtn')!.addEventListener('click', async () => {
      const dsl = this.editorController.getValue();
      const result = await this.diagramService.parseDSL(dsl);
      await this.statusController.showValidation(result);
    });

    document.getElementById('saveBtn')!.addEventListener('click', () => {
      this.editorController.save();
    });

    document.getElementById('resetBtn')!.addEventListener('click', () => {
      this.editorController.reset();
    });

    // Export button
    document.getElementById('exportBtn')!.addEventListener('click', () => {
      this.exportController.export(() => this.editorController.getValue());
    });

    // Resize handle
    this.resizeController.setupResizeHandle();
  }

  private async _onDSLChange(): Promise<void> {
    const dsl = this.editorController.getValue();
    const result = await this.diagramService.parseDSL(dsl);

    this.diagramService.renderDiagram();
    this.statusController.updateStatus(result);
    this.statusController.updateInfo(result);
    this.statusController.updateZoomLevel();
  }
}
