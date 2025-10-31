/**
 * Main Entry Point
 *
 * Bootstraps the application with dependency injection.
 * Follows Dependency Inversion Principle (DIP) with a proper DI container.
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
import { Logger } from './infrastructure/utils/Logger';
import { DIContainer, ServiceKeys } from './infrastructure/di/DIContainer';

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
 *
 * DIP: Uses a proper DI container instead of manual service location
 */
class Application {
  private container: DIContainer;

  constructor() {
    this.container = new DIContainer();
    this._configureDependencies();
  }

  /**
   * Configure dependency injection container
   * DIP: All dependencies are registered and resolved through the container
   */
  private _configureDependencies(): void {
    // Infrastructure Layer - Repository Implementations (Singleton)
    this.container.registerSingleton(
      ServiceKeys.DIAGRAM_REPOSITORY,
      () => new DSLParserAdapter()
    );

    // Infrastructure Layer - Renderer (Singleton)
    this.container.registerSingleton(ServiceKeys.RENDERER, () => {
      const canvas = document.getElementById('diagramCanvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Canvas element not found');
      }
      return new CanvasRendererAdapter(canvas);
    });

    // Infrastructure Layer - Exporters (Singleton)
    this.container.registerSingleton(ServiceKeys.SQL_EXPORTER, () => new SQLExporter());
    this.container.registerSingleton(ServiceKeys.TYPESCRIPT_EXPORTER, () => new TypeScriptExporter());
    this.container.registerSingleton(ServiceKeys.JSON_EXPORTER, () => new JSONExporter());

    // Exporters collection
    this.container.registerSingleton(ServiceKeys.EXPORTERS, (c) => ({
      sql: c.resolve(ServiceKeys.SQL_EXPORTER),
      typescript: c.resolve(ServiceKeys.TYPESCRIPT_EXPORTER),
      json: c.resolve(ServiceKeys.JSON_EXPORTER)
    }));

    // Application Layer - Use Cases (Singleton)
    this.container.registerSingleton(
      ServiceKeys.PARSE_DSL_USE_CASE,
      (c) => new ParseDSLUseCase(c.resolve(ServiceKeys.DIAGRAM_REPOSITORY))
    );

    this.container.registerSingleton(
      ServiceKeys.RENDER_DIAGRAM_USE_CASE,
      (c) => new RenderDiagramUseCase(c.resolve(ServiceKeys.RENDERER))
    );

    this.container.registerSingleton(
      ServiceKeys.EXPORT_CODE_USE_CASE,
      (c) => new ExportCodeUseCase(c.resolve(ServiceKeys.EXPORTERS))
    );

    // Application Layer - Service (Singleton)
    this.container.registerSingleton(
      ServiceKeys.DIAGRAM_SERVICE,
      (c) => new DiagramService(
        c.resolve(ServiceKeys.PARSE_DSL_USE_CASE),
        c.resolve(ServiceKeys.RENDER_DIAGRAM_USE_CASE),
        c.resolve(ServiceKeys.EXPORT_CODE_USE_CASE)
      )
    );

    // Presentation Layer - Factories (Singleton)
    this.container.registerSingleton(
      ServiceKeys.EDITOR_FACTORY,
      () => new MonacoEditorFactory()
    );

    // Presentation Layer - Controller (Singleton)
    this.container.registerSingleton(
      ServiceKeys.APP_CONTROLLER,
      (c) => new AppController(
        c.resolve(ServiceKeys.DIAGRAM_SERVICE),
        c.resolve(ServiceKeys.EDITOR_FACTORY)
      )
    );
  }

  async start(): Promise<void> {
    try {
      Logger.info('🚀 Starting ERP Visual Designer with Clean Architecture + DI...');

      // Resolve the root component (DIP: no manual service location)
      const appController = this.container.resolve<AppController>(ServiceKeys.APP_CONTROLLER);
      await appController.initialize();

      Logger.info('✅ Application initialized successfully');
    } catch (error) {
      Logger.error('❌ Failed to initialize application:', error);
      alert('Failed to initialize application. Please check the console for details.');
    }
  }

  /**
   * Get DI container (for debugging/testing only)
   */
  getContainer(): DIContainer {
    return this.container;
  }
}

// Bootstrap the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.start();

  // Export for debugging purposes
  (window as any).__app = app;
  (window as any).__container = app.getContainer();
});

export { Application };
