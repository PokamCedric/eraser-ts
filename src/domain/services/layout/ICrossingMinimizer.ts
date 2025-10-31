/**
 * Interface: Crossing Minimizer
 *
 * Abstraction for crossing minimization algorithms.
 */

export interface ICrossingMinimizer {
  /**
   * Minimize edge crossings between layers
   * @param layers - Current layer assignments
   * @param maxIterations - Maximum number of optimization iterations
   * @returns Layers with minimized crossings
   */
  minimizeCrossings(layers: string[][], maxIterations: number): string[][];
}
