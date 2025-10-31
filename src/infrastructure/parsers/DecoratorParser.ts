/**
 * Decorator Parser
 *
 * Responsible for parsing decorator annotations.
 * Follows Single Responsibility Principle (SRP).
 */

export interface Decorator {
  name: string;
  args: string | null;
  params: { [key: string]: string | string[] };
}

export class DecoratorParser {
  /**
   * Parse decorators from string format: "@pk @fk @enum(fields:[a,b,c])"
   */
  parse(decoratorsStr: string): Decorator[] {
    const decorators: Decorator[] = [];
    if (!decoratorsStr) return decorators;

    const regex = /@(\w+)(?:\(([^)]+)\))?/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(decoratorsStr)) !== null) {
      const name = match[1];
      const argsStr = match[2];

      let args: string | null = null;
      const params: { [key: string]: string | string[] } = {};

      if (argsStr) {
        if (argsStr.includes(':')) {
          // Parse key-value pairs
          const pairs = argsStr.split(',');
          for (const pair of pairs) {
            const [key, value] = pair.split(':').map(s => s.trim());
            if (key && value) {
              if (value.startsWith('[') && value.endsWith(']')) {
                // Array value
                params[key] = value
                  .substring(1, value.length - 1)
                  .split(',')
                  .map(v => v.trim());
              } else {
                // String value
                params[key] = value;
              }
            }
          }
        } else {
          // Simple argument
          args = argsStr.trim();
        }
      }

      decorators.push({ name, args, params });
    }

    return decorators;
  }
}
