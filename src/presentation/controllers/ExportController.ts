/**
 * Export Controller
 *
 * Manages code export functionality.
 * Follows Single Responsibility Principle (SRP).
 */

import { DiagramService } from '../../application/services/DiagramService';

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  number: string;
}

export class ExportController {
  private readonly formats: ExportFormat[] = [
    { id: 'dsl', name: 'DSL (current format)', extension: 'dsl', number: '1' },
    { id: 'json', name: 'JSON Schema', extension: 'json', number: '2' },
    { id: 'sql', name: 'SQL DDL', extension: 'sql', number: '3' },
    { id: 'typescript', name: 'TypeScript Interfaces', extension: 'ts', number: '4' }
  ];

  constructor(private diagramService: DiagramService) {}

  /**
   * Export code with format selection dialog
   */
  export(getCurrentDSL: () => string): void {
    const formatList = this.formats
      .map(f => `${f.number} - ${f.name}`)
      .join('\n');

    const format = prompt(
      `Export format:\n${formatList}\n\nEnter number (1-4):`,
      '1'
    );

    if (!format) return;

    const selectedFormat = this.formats.find(f => f.number === format);
    if (!selectedFormat) {
      alert('Invalid format');
      return;
    }

    try {
      const exportContent = this._getExportContent(selectedFormat.id, getCurrentDSL);
      this._downloadFile(exportContent, selectedFormat.extension);
    } catch (error) {
      alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private _getExportContent(formatId: string, getCurrentDSL: () => string): string {
    switch (formatId) {
      case 'dsl':
        return getCurrentDSL();
      case 'json':
        return this.diagramService.exportCode('json');
      case 'sql':
        return this.diagramService.exportCode('sql');
      case 'typescript':
        return this.diagramService.exportCode('typescript');
      default:
        throw new Error(`Unknown format: ${formatId}`);
    }
  }

  private _downloadFile(content: string, extension: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
