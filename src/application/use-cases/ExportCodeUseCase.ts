/**
 * Use Case: Export Code
 *
 * Exports entities and relationships to various formats
 *
 * LSP Compliant: ExportResult type allows both text and binary formats
 */
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

/**
 * Export result type
 * Supports both text (string) and binary (Blob, Uint8Array) formats
 */
export type ExportResult = string | Blob | Uint8Array;

/**
 * IExporter interface
 * LSP Compliant: Returns ExportResult instead of just string
 * This allows future exporters (PDF, PNG, etc.) to return binary data
 * without breaking the interface contract
 */
export interface IExporter {
  export(entities: Entity[], relationships: Relationship[]): ExportResult;
}

export class ExportCodeUseCase {
  constructor(private exporters: Record<string, IExporter>) {}

  execute(format: string, entities: Entity[], relationships: Relationship[]): ExportResult {
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
