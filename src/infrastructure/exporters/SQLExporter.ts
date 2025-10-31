/**
 * Infrastructure: SQL Exporter
 *
 * Exports entities to SQL DDL
 *
 * LSP Compliant: Implements IExporter with ExportResult return type
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { IExporter, ExportResult } from '../../application/use-cases/ExportCodeUseCase';
import { SQLTypeMapper } from './TypeMapper';

export class SQLExporter implements IExporter {
  private typeMapper: SQLTypeMapper;

  constructor() {
    this.typeMapper = new SQLTypeMapper();
  }

  export(entities: Entity[], relationships: Relationship[]): ExportResult {
    let sql = '-- Generated SQL DDL\n\n';

    for (const entity of entities) {
      sql += `CREATE TABLE ${entity.name} (\n`;

      const fields = entity.fields.map(field => {
        let line = `  ${field.name} `;

        line += this.typeMapper.map(field.type, 'TEXT');

        if (field.isPrimaryKey) line += ' PRIMARY KEY';
        if (field.isRequired && !field.isPrimaryKey) line += ' NOT NULL';
        if (field.isUnique) line += ' UNIQUE';
        if (field.defaultValue) line += ` DEFAULT ${field.defaultValue}`;

        return line;
      });

      sql += fields.join(',\n') + '\n);\n\n';
    }

    // Add foreign key constraints
    for (const rel of relationships) {
      sql += `ALTER TABLE ${rel.from.entity}\n`;
      sql += `  ADD CONSTRAINT fk_${rel.from.entity}_${rel.to.entity}\n`;
      sql += `  FOREIGN KEY (${rel.from.field})\n`;
      sql += `  REFERENCES ${rel.to.entity}(${rel.to.field});\n\n`;
    }

    return sql;
  }
}
