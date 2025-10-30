/**
 * Main Entry Point
 *
 * Bootstraps the application with dependency injection
 */

// Application
import { ParseDSLUseCase } from './application/use-cases/ParseDSLUseCase';
import { RenderDiagramUseCase } from './application/use-cases/RenderDiagramUseCase';
import { ExportCodeUseCase } from './application/use-cases/ExportCodeUseCase';
import { DiagramService } from './application/services/DiagramService';

// Infrastructure
import { DSLParserAdapter } from './infrastructure/parsers/DSLParserAdapter';
import { CanvasRendererAdapter } from './infrastructure/renderers/CanvasRendererAdapter';
import { SQLExporter } from './infrastructure/exporters/SQLExporter';
import { TypeScriptExporter } from './infrastructure/exporters/TypeScriptExporter';
import { JSONExporter } from './infrastructure/exporters/JSONExporter';
import { Logger } from './infrastructure/layout/utils/Logger';

// Presentation
import { AppController } from './presentation/controllers/AppController';
import { MonacoEditorFactory } from './presentation/factories/MonacoEditorFactory';

/**
 * Application Composition Root
 *
 * This is where we wire up all dependencies following Clean Architecture principles:
 * - Domain entities are pure business logic with no dependencies
 * - Application use cases depend only on domain entities and repository interfaces
 * - Infrastructure adapters implement repository interfaces
 * - Presentation controllers depend on application services
 */
class Application {
  private container: {
    diagramRepository?: DSLParserAdapter;
    renderer?: CanvasRendererAdapter;
    exporters?: Record<string, any>;
    parseDSLUseCase?: ParseDSLUseCase;
    renderDiagramUseCase?: RenderDiagramUseCase;
    exportCodeUseCase?: ExportCodeUseCase;
    diagramService?: DiagramService;
    editorFactory?: MonacoEditorFactory;
    appController?: AppController;
  };

  constructor() {
    this.container = this._setupDependencyContainer();
  }

  private _setupDependencyContainer() {
    const container: any = {};

    // Infrastructure Layer - Repository Implementations
    container.diagramRepository = new DSLParserAdapter();

    // Infrastructure Layer - Renderer
    const canvas = document.getElementById('diagramCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    container.renderer = new CanvasRendererAdapter(canvas);

    // Infrastructure Layer - Exporters
    container.exporters = {
      'sql': new SQLExporter(),
      'typescript': new TypeScriptExporter(),
      'json': new JSONExporter()
    };

    // Application Layer - Use Cases
    container.parseDSLUseCase = new ParseDSLUseCase(container.diagramRepository);
    container.renderDiagramUseCase = new RenderDiagramUseCase(container.renderer);
    container.exportCodeUseCase = new ExportCodeUseCase(container.exporters);

    // Application Layer - Service
    container.diagramService = new DiagramService(
      container.parseDSLUseCase,
      container.renderDiagramUseCase,
      container.exportCodeUseCase
    );

    // Presentation Layer - Factories
    container.editorFactory = new MonacoEditorFactory();

    // Presentation Layer - Controller
    container.appController = new AppController(
      container.diagramService,
      container.editorFactory
    );

    return container;
  }

  async start(): Promise<void> {
    try {
      Logger.info('🚀 Starting ERP Visual Designer with Clean Architecture...');
      await this.container.appController!.initialize();
      Logger.info('✅ Application initialized successfully');
    } catch (error) {
      Logger.error('❌ Failed to initialize application:', error);
      alert('Failed to initialize application. Please check the console for details.');
    }
  }
}

// Bootstrap the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.start();
});

// Export for debugging purposes
(window as any).__app = Application;
