/**
 * Interface: Vertical Optimizer
 *
 * Abstraction for vertical ordering optimization algorithms.
 */

export interface IVerticalOptimizer {
  /**
   * Optimize vertical order within each layer
   * @param layers - Current layer assignments
   * @param entityOrder - Preferred entity order
   * @returns Optimized layers
   */
  optimize(layers: string[][], entityOrder: string[]): string[][];
}
