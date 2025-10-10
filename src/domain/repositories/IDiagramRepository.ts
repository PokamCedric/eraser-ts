/**
 * Repository Interface: IDiagramRepository
 *
 * Defines the contract for diagram data persistence
 */
import { Entity } from '../entities/Entity';
import { Relationship } from '../entities/Relationship';

export interface ParseDSLResult {
  entities: Entity[];
  relationships: Relationship[];
  errors: ParseError[];
}

export interface ParseError {
  message: string;
  line: number;
}

export interface IDiagramRepository {
  /**
   * Parse DSL text and return entities and relationships
   */
  parseDSL(dslText: string): Promise<ParseDSLResult>;

  /**
   * Save diagram data
   */
  saveDiagram(data: unknown): Promise<void>;

  /**
   * Load diagram data
   */
  loadDiagram(): Promise<unknown>;
}
