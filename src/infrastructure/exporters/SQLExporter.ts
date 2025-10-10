/**
 * Infrastructure: SQL Exporter
 *
 * Exports entities to SQL DDL
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

export class SQLExporter {
  export(entities: Entity[], relationships: Relationship[]): string {
    let sql = '-- Generated SQL DDL\n\n';

    for (const entity of entities) {
      sql += `CREATE TABLE ${entity.name} (\n`;

      const fields = entity.fields.map(field => {
        let line = `  ${field.name} `;

        const typeMap: Record<string, string> = {
          'string': 'VARCHAR(255)',
          'int': 'INTEGER',
          'bool': 'BOOLEAN',
          'timestamp': 'TIMESTAMP',
          'datetime': 'DATETIME',
          'num': 'NUMERIC',
          'double': 'DOUBLE PRECISION'
        };
        line += typeMap[field.type] || 'TEXT';

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
