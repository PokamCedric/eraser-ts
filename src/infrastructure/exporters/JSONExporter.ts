/**
 * Infrastructure: JSON Exporter
 *
 * Exports entities to JSON schema
 *
 * LSP Compliant: Implements IExporter with ExportResult return type
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { IExporter, ExportResult } from '../../application/use-cases/ExportCodeUseCase';
import { entityToJSON, relationshipToJSON } from '../../data/models/utils';

export class JSONExporter implements IExporter {
  export(entities: Entity[], relationships: Relationship[]): ExportResult {
    const schema = {
      entities: entities.map(e => entityToJSON(e)),
      relationships: relationships.map(r => relationshipToJSON(r))
    };

    return JSON.stringify(schema, null, 2);
  }
}
