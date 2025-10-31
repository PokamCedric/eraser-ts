/**
 * Type Mapper
 *
 * Maps DSL types to target language types following Open/Closed Principle.
 * New type mappings can be added without modifying the class.
 */

export class TypeMapper {
  constructor(private readonly mappings: Map<string, string>) {}

  /**
   * Map a source type to target type
   */
  map(sourceType: string, defaultValue: string = 'TEXT'): string {
    return this.mappings.get(sourceType) ?? defaultValue;
  }

  /**
   * Register a new type mapping
   */
  registerMapping(sourceType: string, targetType: string): void {
    this.mappings.set(sourceType, targetType);
  }

  /**
   * Check if a mapping exists
   */
  hasMapping(sourceType: string): boolean {
    return this.mappings.has(sourceType);
  }
}

/**
 * SQL Type Mapper
 */
export class SQLTypeMapper extends TypeMapper {
  constructor() {
    super(new Map([
      ['string', 'VARCHAR(255)'],
      ['int', 'INTEGER'],
      ['bool', 'BOOLEAN'],
      ['timestamp', 'TIMESTAMP'],
      ['datetime', 'DATETIME'],
      ['num', 'DECIMAL(10,2)'],
      ['double', 'DOUBLE PRECISION']
    ]));
  }
}

/**
 * TypeScript Type Mapper
 */
export class TypeScriptTypeMapper extends TypeMapper {
  constructor() {
    super(new Map([
      ['string', 'string'],
      ['int', 'number'],
      ['bool', 'boolean'],
      ['timestamp', 'Date'],
      ['datetime', 'Date'],
      ['num', 'number'],
      ['double', 'number']
    ]));
  }
}
