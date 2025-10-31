/**
 * Infrastructure Adapter: DSL Parser
 *
 * Adapts the DSL parser to implement IDiagramRepository
 * Refactored to follow Single Responsibility Principle (SRP)
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { IDiagramRepository, ParseDSLResult, ParseError } from '../../domain/repositories/IDiagramRepository';
import { addFieldToEntity } from '../../data/models/utils';
import { Logger } from '../utils/Logger';
import { DSLLexer } from './DSLLexer';
import { EntityParser } from './EntityParser';
import { FieldParser } from './FieldParser';
import { RelationshipParser } from './RelationshipParser';

export class DSLParserAdapter implements IDiagramRepository {
  private lexer: DSLLexer;
  private entityParser: EntityParser;
  private fieldParser: FieldParser;
  private relationshipParser: RelationshipParser;

  constructor() {
    this.lexer = new DSLLexer();
    this.entityParser = new EntityParser();
    this.fieldParser = new FieldParser();
    this.relationshipParser = new RelationshipParser();
  }
  async parseDSL(dslText: string): Promise<ParseDSLResult> {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];
    const errors: ParseError[] = [];

    try {
      // Tokenize DSL text
      const lines = this.lexer.tokenize(dslText);

      let currentEntity: Entity | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Parse entity declaration
        if (this.entityParser.isEntityDeclaration(line)) {
          const entity = this.entityParser.parse(line);
          if (entity) {
            currentEntity = entity;
          }
        }
        // Parse entity closing brace
        else if (this.entityParser.isEntityClosing(line)) {
          if (currentEntity) {
            entities.push(currentEntity);
            currentEntity = null;
          }
        }
        // Parse relationship
        else if (this.relationshipParser.isRelationshipLine(line)) {
          const relationship = this.relationshipParser.parse(line);
          if (relationship) {
            relationships.push(relationship);
          }
        }
        // Parse field
        else if (currentEntity) {
          const field = this.fieldParser.parse(line);
          if (field) {
            addFieldToEntity(currentEntity, field);
          }
        }
      }

    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        line: 0
      });
    }

    return {
      entities,
      relationships,
      errors
    };
  }

  async saveDiagram(data: unknown): Promise<void> {
    // Could implement local storage or file save
    Logger.debug('Saving diagram:', data);
  }

  async loadDiagram(): Promise<unknown> {
    // Could implement local storage or file load
    return null;
  }
}
