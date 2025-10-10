/**
 * Infrastructure: JSON Exporter
 *
 * Exports entities to JSON schema
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

export class JSONExporter {
  export(entities: Entity[], relationships: Relationship[]): string {
    const schema = {
      entities: entities.map(e => e.toJSON()),
      relationships: relationships.map(r => r.toJSON())
    };

    return JSON.stringify(schema, null, 2);
  }
}
