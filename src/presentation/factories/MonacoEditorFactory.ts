/**
 * Presentation Factory: Monaco Editor Factory
 *
 * Creates and configures Monaco editor instances
 */

import { Logger } from '../../infrastructure/layout/utils/Logger';

// Declare global Monaco types
declare global {
  interface Window {
    monaco: any;
    require: {
      (deps: string[], callback: (...args: any[]) => void): void;
      (deps: string[], callback: (...args: any[]) => void, errback: (err: any) => void): void;
      config(options: { paths: Record<string, string> }): void;
    };
  }
}

export class MonacoEditorFactory {
  async createEditor(initialValue: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        window.require.config({
          paths: {
            vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs'
          }
        });

        window.require(['vs/editor/editor.main'], () => {
          const monaco = window.monaco;

          // Register custom language for DSL
          monaco.languages.register({ id: 'dsl' });

          // Define syntax highlighting
          monaco.languages.setMonarchTokensProvider('dsl', {
            tokenizer: {
              root: [
                [/\/\/.*$/, 'comment'],
                [/@\w+/, 'decorator'],
                [/\b(string|int|bool|timestamp|datetime|num|double)\b/, 'type'],
                [/\b(true|false|now)\b/, 'keyword'],
                [/\[([^\]]+)\]/, 'metadata'],
                [/\{|\}/, 'delimiter.bracket'],
                [/->/, 'operator'],
              ]
            }
          });

          // Define theme
          monaco.editor.defineTheme('dsl-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: 'comment', foreground: '6A9955' },
              { token: 'decorator', foreground: 'DCDCAA', fontStyle: 'bold' },
              { token: 'type', foreground: '4EC9B0' },
              { token: 'keyword', foreground: 'C586C0' },
              { token: 'metadata', foreground: '9CDCFE' },
              { token: 'operator', foreground: 'D4D4D4' },
            ],
            colors: {
              'editor.background': '#0f172a',
              'editor.lineHighlightBackground': '#1e293b',
            }
          });

          // Create editor
          const editor = monaco.editor.create(document.getElementById('dslEditor')!, {
            value: initialValue,
            language: 'dsl',
            theme: 'dsl-dark',
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            folding: true,
            wordWrap: 'on',
          });

          resolve(editor);
        }, (error: any) => {
          Logger.error('Failed to load Monaco Editor:', error);
          reject(error);
        });
      } catch (error) {
        Logger.error('Error configuring Monaco Editor:', error);
        reject(error);
      }
    });
  }
}
