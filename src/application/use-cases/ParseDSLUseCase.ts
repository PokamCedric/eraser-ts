/**
 * Use Case: Parse DSL
 *
 * Parses DSL text into domain entities and relationships
 */
import { IDiagramRepository, ParseError } from '../../domain/repositories/IDiagramRepository';
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

export interface ParseDSLResult {
  entities: Entity[];
  relationships: Relationship[];
  errors: ParseError[];
  isValid: boolean;
}

export class ParseDSLUseCase {
  constructor(private diagramRepository: IDiagramRepository) {}

  async execute(dslText: string): Promise<ParseDSLResult> {
    if (!dslText || dslText.trim() === '') {
      return {
        entities: [],
        relationships: [],
        errors: [{ message: 'DSL text is empty', line: 0 }],
        isValid: false
      };
    }

    try {
      const result = await this.diagramRepository.parseDSL(dslText);

      // Validate all entities
      const entityErrors: ParseError[] = [];
      for (const entity of result.entities) {
        const validation = entity.validate();
        if (!validation.isValid) {
          entityErrors.push({
            message: `Entity '${entity.name}': ${validation.error}`,
            line: 0
          });
        }
      }

      // Validate all relationships
      const relationErrors: ParseError[] = [];
      for (const relationship of result.relationships) {
        const validation = relationship.validate();
        if (!validation.isValid) {
          relationErrors.push({
            message: `Relationship: ${validation.error}`,
            line: 0
          });
        }
      }

      const allErrors = [...result.errors, ...entityErrors, ...relationErrors];

      return {
        entities: result.entities,
        relationships: result.relationships,
        errors: allErrors,
        isValid: allErrors.length === 0
      };
    } catch (error) {
      return {
        entities: [],
        relationships: [],
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error', line: 0 }],
        isValid: false
      };
    }
  }
}
