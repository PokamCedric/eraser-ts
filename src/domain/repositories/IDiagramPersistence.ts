/**
 * Diagram Persistence Interface
 *
 * Handles saving and loading diagram data.
 * Respects Interface Segregation Principle (ISP).
 */

export interface IDiagramPersistence {
  /**
   * Save diagram data
   */
  saveDiagram(data: unknown): Promise<void>;

  /**
   * Load diagram data
   */
  loadDiagram(): Promise<unknown>;
}
