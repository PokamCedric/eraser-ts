/**
 * Entity Parser
 *
 * Responsible for parsing entity declarations.
 * Follows Single Responsibility Principle (SRP).
 */

import { Entity } from '../../domain/entities/Entity';
import { MetadataParser } from './MetadataParser';

export class EntityParser {
  private metadataParser: MetadataParser;

  constructor() {
    this.metadataParser = new MetadataParser();
  }

  /**
   * Check if a line is an entity declaration
   */
  isEntityDeclaration(line: string): boolean {
    return line.includes('{') && !line.startsWith('}');
  }

  /**
   * Check if a line is an entity closing brace
   */
  isEntityClosing(line: string): boolean {
    return line.startsWith('}');
  }

  /**
   * Parse an entity declaration line
   * Format: EntityName [metadata] {
   */
  parse(line: string): Entity | null {
    const entityMatch = line.match(/^(\w+)\s*(\[([^\]]+)\])?\s*\{/);
    if (!entityMatch) return null;

    const entityName = entityMatch[1];
    const metadataStr = entityMatch[3] || '';
    const metadata = this.metadataParser.parse(metadataStr);

    return new Entity({
      name: entityName,
      displayName: this._toDisplayName(entityName),
      icon: metadata.icon || 'box',
      color: metadata.color || '#3b82f6',
      fields: []
    });
  }

  private _toDisplayName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
