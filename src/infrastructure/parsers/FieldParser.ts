/**
 * Field Parser
 *
 * Responsible for parsing field declarations.
 * Follows Single Responsibility Principle (SRP).
 */

import { Field } from '../../domain/entities/Field';
import { DecoratorParser } from './DecoratorParser';

export class FieldParser {
  private decoratorParser: DecoratorParser;

  constructor() {
    this.decoratorParser = new DecoratorParser();
  }

  /**
   * Parse a field declaration line
   * Format: fieldName fieldType @decorator1 @decorator2(args)
   */
  parse(line: string): Field | null {
    const match = line.match(/^(\w+)\s+(\w+)(.*)$/);
    if (!match) return null;

    const fieldName = match[1];
    const fieldType = match[2];
    const decoratorsStr = match[3] || '';

    const decorators = this.decoratorParser.parse(decoratorsStr);

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

  private _toDisplayName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
