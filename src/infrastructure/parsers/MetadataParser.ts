/**
 * Metadata Parser
 *
 * Responsible for parsing metadata strings.
 * Follows Single Responsibility Principle (SRP).
 */

export interface Metadata {
  [key: string]: string;
}

export class MetadataParser {
  /**
   * Parse metadata from string format: "key1:value1, key2:value2"
   */
  parse(metadataStr: string): Metadata {
    const metadata: Metadata = {};
    if (!metadataStr) return metadata;

    const pairs = metadataStr.split(',');
    for (const pair of pairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        metadata[key] = value;
      }
    }

    return metadata;
  }
}
