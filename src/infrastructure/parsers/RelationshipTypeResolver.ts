/**
 * Relationship Type Resolver
 *
 * Resolves relationship connectors to types following Open/Closed Principle.
 * New relationship types can be added without modifying existing code.
 */

export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export class RelationshipTypeResolver {
  private connectorMap: Map<string, RelationshipType>;

  constructor() {
    this.connectorMap = new Map([
      ['-', 'one-to-one'],
      ['<', 'one-to-many'],
      ['>', 'many-to-one'],
      ['<>', 'many-to-many']
    ]);
  }

  /**
   * Resolve a connector to a relationship type
   */
  resolve(connector: string, defaultType: RelationshipType = 'many-to-one'): RelationshipType {
    return this.connectorMap.get(connector) ?? defaultType;
  }

  /**
   * Register a new connector mapping
   */
  registerConnector(connector: string, type: RelationshipType): void {
    this.connectorMap.set(connector, type);
  }

  /**
   * Check if a connector is registered
   */
  hasConnector(connector: string): boolean {
    return this.connectorMap.has(connector);
  }

  /**
   * Get all registered connectors
   */
  getAllConnectors(): string[] {
    return Array.from(this.connectorMap.keys());
  }
}
