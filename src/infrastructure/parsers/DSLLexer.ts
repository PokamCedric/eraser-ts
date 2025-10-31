/**
 * DSL Lexer
 *
 * Responsible for tokenizing DSL text into lines.
 * Follows Single Responsibility Principle (SRP).
 */

export class DSLLexer {
  /**
   * Tokenize DSL text into clean lines
   * - Removes comments
   * - Trims whitespace
   * - Filters empty lines
   */
  tokenize(dslText: string): string[] {
    return dslText
      .split('\n')
      .map(line => {
        const commentIndex = line.indexOf('//');
        return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
      })
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }
}
