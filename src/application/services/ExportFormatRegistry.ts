/**
 * Export Format Registry
 *
 * Implements Strategy pattern for export formats following Open/Closed Principle.
 * New export formats can be added without modifying existing code.
 */

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
  execute: () => string;
}

export class ExportFormatRegistry {
  private formats = new Map<string, ExportFormat>();

  /**
   * Register a new export format
   */
  register(format: ExportFormat): void {
    this.formats.set(format.id, format);
  }

  /**
   * Unregister an export format
   */
  unregister(id: string): void {
    this.formats.delete(id);
  }

  /**
   * Get a registered format by ID
   */
  getFormat(id: string): ExportFormat | undefined {
    return this.formats.get(id);
  }

  /**
   * Get all registered formats
   */
  getAllFormats(): ExportFormat[] {
    return Array.from(this.formats.values());
  }

  /**
   * Execute an export format
   */
  execute(id: string): { content: string; extension: string } | null {
    const format = this.formats.get(id);
    if (!format) {
      return null;
    }

    return {
      content: format.execute(),
      extension: format.extension
    };
  }

  /**
   * Check if a format is registered
   */
  has(id: string): boolean {
    return this.formats.has(id);
  }
}
