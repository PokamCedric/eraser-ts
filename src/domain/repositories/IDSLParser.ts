/**
 * DSL Parser Interface
 *
 * Separates parsing responsibility from persistence.
 * Respects Interface Segregation Principle (ISP).
 */

import { Entity } from '../entities/Entity';
import { Relationship } from '../entities/Relationship';

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseDSLResult {
  entities: Entity[];
  relationships: Relationship[];
  errors: ParseError[];
  isValid?: boolean; // Optional for backward compatibility
}

export interface IDSLParser {
  /**
   * Parse DSL text into entities and relationships
   */
  parseDSL(dslText: string): Promise<ParseDSLResult>;
}
