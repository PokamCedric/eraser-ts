/**
 * Infrastructure Adapter: DSL Parser
 *
 * Adapts the DSL parser to implement IDiagramRepository
 */
import { Entity } from '../../domain/entities/Entity';
import { Field } from '../../domain/entities/Field';
import { Relationship } from '../../domain/entities/Relationship';
import { IDiagramRepository, ParseDSLResult, ParseError } from '../../domain/repositories/IDiagramRepository';
import { addFieldToEntity } from '../../data/models/utils';
import { Logger } from '../layout/utils/Logger';

interface Metadata {
  [key: string]: string;
}

interface Decorator {
  name: string;
  args: string | null;
  params: { [key: string]: string | string[] };
}

export class DSLParserAdapter implements IDiagramRepository {
  async parseDSL(dslText: string): Promise<ParseDSLResult> {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];
    const errors: ParseError[] = [];

    try {
      // Remove comments and split into lines
      const lines = dslText
        .split('\n')
        .map(line => {
          const commentIndex = line.indexOf('//');
          return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
        })
        .map(line => line.trim())
        .filter(line => line.length > 0);

      let currentEntity: Entity | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Parse entity declaration
        if (line.includes('{') && !line.startsWith('}')) {
          const entityMatch = line.match(/^(\w+)\s*(\[([^\]]+)\])?\s*\{/);
          if (entityMatch) {
            const entityName = entityMatch[1];
            const metadataStr = entityMatch[3] || '';
            const metadata = this._parseMetadata(metadataStr);

            currentEntity = new Entity({
              name: entityName,
              displayName: this._toDisplayName(entityName),
              icon: metadata.icon || 'box',
              color: metadata.color || '#3b82f6',
              fields: []
            });
          }
        }
        // Parse entity closing brace
        else if (line.startsWith('}')) {
          if (currentEntity) {
            entities.push(currentEntity);
            currentEntity = null;
          }
        }
        // Parse relationship (check for relationship operators: >, <, -, <>)
        else if (this._isRelationshipLine(line)) {
          const relationship = this._parseRelationship(line);
          if (relationship) {
            relationships.push(relationship);
          }
        }
        // Parse field
        else if (currentEntity) {
          const field = this._parseField(line);
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

  private _parseMetadata(metadataStr: string): Metadata {
    const metadata: Metadata = {};
    if (!metadataStr) return metadata;

    const pairs = metadataStr.split(',');
    for (const pair of pairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        metadata[key] = value;
      }
    }

    return metadata;
  }

  private _parseField(line: string): Field | null {
    const match = line.match(/^(\w+)\s+(\w+)(.*)$/);
    if (!match) return null;

    const fieldName = match[1];
    const fieldType = match[2];
    const decoratorsStr = match[3] || '';

    const decorators = this._parseDecorators(decoratorsStr);

    const isPrimaryKey = decorators.some(d => d.name === 'pk');
    const isForeignKey = decorators.some(d => d.name === 'fk');
    const isUnique = decorators.some(d => d.name === 'unique');
    const isRequired = decorators.some(d => d.name === 'required') || isPrimaryKey;

    const defaultDecorator = decorators.find(d => d.name === 'default');
    const defaultValue = defaultDecorator ? defaultDecorator.args : null;

    const enumDecorator = decorators.find(d => d.name === 'enum');
    const enumValues = enumDecorator && enumDecorator.params && enumDecorator.params.fields
      ? (Array.isArray(enumDecorator.params.fields) ? enumDecorator.params.fields : [enumDecorator.params.fields])
      : null;

    return new Field({
      name: fieldName,
      displayName: this._toDisplayName(fieldName),
      type: fieldType,
      isPrimaryKey,
      isForeignKey,
      isUnique,
      isRequired,
      defaultValue,
      enumValues,
      decorators
    });
  }

  private _parseDecorators(decoratorsStr: string): Decorator[] {
    const decorators: Decorator[] = [];
    if (!decoratorsStr) return decorators;

    const regex = /@(\w+)(?:\(([^)]+)\))?/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(decoratorsStr)) !== null) {
      const name = match[1];
      const argsStr = match[2];

      let args: string | null = null;
      const params: { [key: string]: string | string[] } = {};

      if (argsStr) {
        if (argsStr.includes(':')) {
          const pairs = argsStr.split(',');
          for (const pair of pairs) {
            const [key, value] = pair.split(':').map(s => s.trim());
            if (key && value) {
              if (value.startsWith('[') && value.endsWith(']')) {
                params[key] = value
                  .substring(1, value.length - 1)
                  .split(',')
                  .map(v => v.trim());
              } else {
                params[key] = value;
              }
            }
          }
        } else {
          args = argsStr.trim();
        }
      }

      decorators.push({ name, args, params });
    }

    return decorators;
  }

  private _isRelationshipLine(line: string): boolean {
    // Check if line contains relationship operators
    return /(\w+)\.?(\w+)?\s*([<>-]|<>)\s*(\w+)\.?(\w+)?/.test(line);
  }

  private _parseRelationship(line: string): Relationship | null {
    // Parse relationship with various syntaxes:
    // users.teamId > teams.id  (one-to-many)
    // users.teamId < teams.id  (many-to-one)
    // users.id - teams.id      (one-to-one)
    // users.id <> teams.id     (many-to-many)
    // users > teams            (entity-level, one-to-many)
    // Support for metadata: users.teamId > teams.id [color: green]

    const relationshipRegex = /^(\w+)\.?(\w+)?\s*([<>-]|<>)\s*(\w+)\.?(\w+)?\s*(?:\[([^\]]+)\])?$/;
    const match = line.match(relationshipRegex);

    if (!match) return null;

    let fromEntity = match[1];
    let fromField = match[2] || 'id';
    const connector = match[3];
    let toEntity = match[4];
    let toField = match[5] || 'id';
    const metadataStr = match[6] || '';

    // Determine relationship type based on connector
    let type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    switch (connector) {
      case '<':
        type = 'one-to-many';
        break;
      case '>':
        type = 'many-to-one';
        break;
      case '-':
        type = 'one-to-one';
        break;
      case '<>':
        type = 'many-to-many';
        break;
      default:
        type = 'many-to-one';
    }

    // // IMPORTANT: Don't swap
    // // "A.x > B.y" means "A.x references B.y" (A depends on B)
    // // But "A.id > B.x" means "A.id is referenced by B.x" (B depends on A)
    // // We need to swap direction when the left side is an 'id' field being referenced
    // if (fromField === 'id' && toField !== 'id' && (connector === '>' || connector === '<')) {
    //   // Swap from and to
    //   [fromEntity, toEntity] = [toEntity, fromEntity];
    //   [fromField, toField] = [toField, fromField];

    //   // Also flip the type
    //   if (type === 'many-to-one') type = 'one-to-many';
    //   else if (type === 'one-to-many') type = 'many-to-one';
    // }

    // Parse metadata (color, label, etc.)
    const metadata = this._parseMetadata(metadataStr);

    return new Relationship({
      from: {
        entity: fromEntity,
        field: fromField
      },
      to: {
        entity: toEntity,
        field: toField
      },
      type,
      color: metadata.color,
      label: metadata.label
    });
  }

  private _toDisplayName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
