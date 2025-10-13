/**
 * Infrastructure: JSON Exporter
 *
 * Exports entities to JSON schema
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { entityToJSON, relationshipToJSON } from '../../data/models/utils';

export class JSONExporter {
  export(entities: Entity[], relationships: Relationship[]): string {
    const schema = {
      entities: entities.map(e => entityToJSON(e)),
      relationships: relationships.map(r => relationshipToJSON(r))
    };

    return JSON.stringify(schema, null, 2);
  }
}
