/**
 * Use Case: Export Code
 *
 * Exports entities and relationships to various formats
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

export interface IExporter {
  export(entities: Entity[], relationships: Relationship[]): string;
}

export class ExportCodeUseCase {
  constructor(private exporters: Record<string, IExporter>) {}

  execute(format: string, entities: Entity[], relationships: Relationship[]): string {
    const exporter = this.exporters[format];

    if (!exporter) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    return exporter.export(entities, relationships);
  }

  getSupportedFormats(): string[] {
    return Object.keys(this.exporters);
  }
}
