/**
 * Interface: Layer Classifier
 *
 * Abstraction for layer classification algorithms.
 * Supports Dependency Inversion and Open/Closed principles.
 */

export interface ILayerClassifier {
  /**
   * Add a directed relation between two entities
   * @param left - Source entity
   * @param right - Target entity
   */
  addRelation(left: string, right: string): void;

  /**
   * Compute layers based on added relations
   * @param entityOrder - Optional preferred order for entities
   * @returns Array of layers, where each layer is an array of entity names
   */
  computeLayers(entityOrder?: string[]): string[][];

  /**
   * Get algorithm statistics
   */
  getStats(): { entities: number; relations: number; distances?: number };
}
