/**
 * Relationship Parser
 *
 * Responsible for parsing relationship declarations.
 * Follows Single Responsibility Principle (SRP).
 */

import { Relationship, RelationshipType } from '../../domain/entities/Relationship';
import { MetadataParser } from './MetadataParser';

export class RelationshipParser {
  private metadataParser: MetadataParser;

  constructor() {
    this.metadataParser = new MetadataParser();
  }

  /**
   * Check if a line is a relationship declaration
   */
  isRelationshipLine(line: string): boolean {
    return /(\w+)\.?(\w+)?\s*([<>-]|<>)\s*(\w+)\.?(\w+)?/.test(line);
  }

  /**
   * Parse a relationship declaration line
   * Supported formats:
   * - users.teamId > teams.id  (one-to-many)
   * - users.teamId < teams.id  (many-to-one)
   * - users.id - teams.id      (one-to-one)
   * - users.id <> teams.id     (many-to-many)
   * - users > teams            (entity-level, one-to-many)
   * - users.teamId > teams.id [color: green, label: belongs_to]
   */
  parse(line: string): Relationship | null {
    const relationshipRegex = /^(\w+)\.?(\w+)?\s*([<>-]|<>)\s*(\w+)\.?(\w+)?\s*(?:\[([^\]]+)\])?$/;
    const match = line.match(relationshipRegex);

    if (!match) return null;

    const fromEntity = match[1];
    const fromField = match[2] || 'id';
    const connector = match[3];
    const toEntity = match[4];
    const toField = match[5] || 'id';
    const metadataStr = match[6] || '';

    // Determine relationship type based on connector
    const type = this._resolveRelationshipType(connector);

    // Parse metadata (color, label, etc.)
    const metadata = this.metadataParser.parse(metadataStr);

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

  private _resolveRelationshipType(connector: string): RelationshipType {
    switch (connector) {
      case '<':
        return 'one-to-many';
      case '>':
        return 'many-to-one';
      case '-':
        return 'one-to-one';
      case '<>':
        return 'many-to-many';
      default:
        return 'many-to-one';
    }
  }
}
