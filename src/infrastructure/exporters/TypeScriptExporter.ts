/**
 * Infrastructure: TypeScript Exporter
 *
 * Exports entities to TypeScript interfaces
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { TypeScriptTypeMapper } from './TypeMapper';

export class TypeScriptExporter {
  private typeMapper: TypeScriptTypeMapper;

  constructor() {
    this.typeMapper = new TypeScriptTypeMapper();
  }

  export(entities: Entity[], _relationships: Relationship[]): string {
    let ts = '// Generated TypeScript Interfaces\n\n';

    for (const entity of entities) {
      ts += `export interface ${entity.displayName.replace(/\s+/g, '')} {\n`;

      for (const field of entity.fields) {
        const optional = !field.isRequired ? '?' : '';
        const type = this.typeMapper.map(field.type, 'any');

        if (field.enumValues && field.enumValues.length > 0) {
          ts += `  ${field.name}${optional}: ${field.enumValues.map(v => `'${v}'`).join(' | ')};\n`;
        } else {
          ts += `  ${field.name}${optional}: ${type};\n`;
        }
      }

      ts += '}\n\n';
    }

    return ts;
  }
}
