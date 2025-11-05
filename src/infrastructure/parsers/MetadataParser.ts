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
   * Parse metadata from string format: "key1: value1, key2: value2"
   * Note: Values can contain colons, so we only split on the FIRST colon
   */
  parse(metadataStr: string): Metadata {
    const metadata: Metadata = {};
    if (!metadataStr) return metadata;

    const pairs = metadataStr.split(',');
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) continue;

      const key = pair.substring(0, colonIndex).trim();
      const value = pair.substring(colonIndex + 1).trim();

      if (key && value) {
        console.log(`[MetadataParser] Parsed: "${key}" = "${value}"`);
        metadata[key] = value;
      }
    }

    console.log('[MetadataParser] Final metadata:', metadata);
    return metadata;
  }
}
