/**
 * Editor Controller
 *
 * Manages Monaco editor initialization and interactions.
 * Follows Single Responsibility Principle (SRP).
 */

import { MonacoEditorFactory } from '../factories/MonacoEditorFactory';
import { DEFAULT_DSL } from '../../data/default_data';

export class EditorController {
  private editor: any = null;

  constructor(private editorFactory: MonacoEditorFactory) {}

  /**
   * Initialize the Monaco editor
   */
  async initialize(onChange: () => void): Promise<void> {
    this.editor = await this.editorFactory.createEditor(DEFAULT_DSL);

    this.editor.onDidChangeModelContent(() => {
      onChange();
    });
  }

  /**
   * Get current DSL text from editor
   */
  getValue(): string {
    return this.editor.getValue();
  }

  /**
   * Set DSL text in editor
   */
  setValue(value: string): void {
    this.editor.setValue(value);
  }

  /**
   * Format DSL code with proper indentation
   */
  format(): void {
    const dsl = this.getValue();
    const lines = dsl.split('\n');
    const formatted: string[] = [];
    let indent = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        formatted.push('');
        continue;
      }

      if (trimmed.includes('}')) indent--;
      formatted.push('  '.repeat(Math.max(0, indent)) + trimmed);
      if (trimmed.includes('{')) indent++;
    }

    this.setValue(formatted.join('\n'));
  }

  /**
   * Reset editor to default DSL
   */
  reset(): void {
    if (confirm('Reset to default DSL? This will clear your current work.')) {
      this.setValue(DEFAULT_DSL);
    }
  }

  /**
   * Save DSL to file
   */
  save(): void {
    const dsl = this.getValue();
    const blob = new Blob([dsl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.dsl';
    a.click();
    URL.revokeObjectURL(url);
  }
}
