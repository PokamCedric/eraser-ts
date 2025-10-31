/**
 * Dependency Injection Container
 *
 * Lightweight DI container following Dependency Inversion Principle (DIP).
 * Provides service registration and resolution without the service locator anti-pattern.
 *
 * Features:
 * - Type-safe service registration
 * - Singleton and transient lifetimes
 * - Constructor injection
 * - No service locator anti-pattern
 */

type ServiceFactory<T> = (container: DIContainer) => T;
type ServiceLifetime = 'singleton' | 'transient';

interface ServiceDescriptor<T> {
  factory: ServiceFactory<T>;
  lifetime: ServiceLifetime;
  instance?: T;
}

export class DIContainer {
  private services = new Map<string, ServiceDescriptor<any>>();

  /**
   * Register a singleton service
   * The same instance is returned for all requests
   */
  registerSingleton<T>(key: string, factory: ServiceFactory<T>): this {
    this.services.set(key, {
      factory,
      lifetime: 'singleton'
    });
    return this;
  }

  /**
   * Register a transient service
   * A new instance is created for each request
   */
  registerTransient<T>(key: string, factory: ServiceFactory<T>): this {
    this.services.set(key, {
      factory,
      lifetime: 'transient'
    });
    return this;
  }

  /**
   * Register an existing instance as a singleton
   */
  registerInstance<T>(key: string, instance: T): this {
    this.services.set(key, {
      factory: () => instance,
      lifetime: 'singleton',
      instance
    });
    return this;
  }

  /**
   * Resolve a service by key
   */
  resolve<T>(key: string): T {
    const descriptor = this.services.get(key);

    if (!descriptor) {
      throw new Error(`Service not registered: ${key}`);
    }

    // Return cached instance for singletons
    if (descriptor.lifetime === 'singleton' && descriptor.instance) {
      return descriptor.instance;
    }

    // Create new instance
    const instance = descriptor.factory(this);

    // Cache singleton instances
    if (descriptor.lifetime === 'singleton') {
      descriptor.instance = instance;
    }

    return instance;
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Get all registered service keys
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Service Keys (type-safe constants)
 * Using symbols or string constants prevents typos and enables refactoring
 */
export const ServiceKeys = {
  // Infrastructure
  DIAGRAM_REPOSITORY: 'IDiagramRepository',
  RENDERER: 'IRenderer',
  LOGGER: 'ILogger',

  // Exporters
  SQL_EXPORTER: 'SQLExporter',
  TYPESCRIPT_EXPORTER: 'TypeScriptExporter',
  JSON_EXPORTER: 'JSONExporter',
  EXPORTERS: 'Exporters',

  // Use Cases
  PARSE_DSL_USE_CASE: 'ParseDSLUseCase',
  RENDER_DIAGRAM_USE_CASE: 'RenderDiagramUseCase',
  EXPORT_CODE_USE_CASE: 'ExportCodeUseCase',

  // Services
  DIAGRAM_SERVICE: 'DiagramService',

  // Factories
  EDITOR_FACTORY: 'MonacoEditorFactory',

  // Controllers
  APP_CONTROLLER: 'AppController'
} as const;
