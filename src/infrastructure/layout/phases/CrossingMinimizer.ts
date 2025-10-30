/**
 * Phase 5: Crossing Minimizer
 *
 * Uses barycenter method to minimize edge crossings between adjacent layers.
 *
 * The barycenter method calculates the average position of neighbors
 * for each entity, then sorts entities by this average.
 *
 * Applied iteratively in both directions (left-to-right and right-to-left)
 * to minimize crossings across all layer pairs.
 *
 * Example:
 *   Before: opportunities -> pipelines crosses with campaign_members -> contacts
 *   After: Reordered to eliminate crossing
 */

import { DirectedRelation } from './types';
import { Logger } from '../utils/Logger';

export class CrossingMinimizer {
  private relations: DirectedRelation[];
  private forwardEdges: Map<string, Set<string>>; // entity -> targets
  private backwardEdges: Map<string, Set<string>>; // entity -> sources

  constructor(relations: DirectedRelation[]) {
    this.relations = relations;

    // Build adjacency maps for fast lookup
    this.forwardEdges = new Map();
    this.backwardEdges = new Map();

    for (const { left, right } of relations) {
      if (!this.forwardEdges.has(left)) {
        this.forwardEdges.set(left, new Set());
      }
      this.forwardEdges.get(left)!.add(right);

      if (!this.backwardEdges.has(right)) {
        this.backwardEdges.set(right, new Set());
      }
      this.backwardEdges.get(right)!.add(left);
    }
  }

  /**
   * Apply barycenter method to minimize crossings
   *
   * @param layers - Initial layer assignments
   * @param maxIterations - Number of sweeps to perform
   * @returns Layers with minimized crossings
   */
  minimizeCrossings(
    layers: string[][],
    maxIterations: number = 4
  ): string[][] {
    Logger.section('PHASE 5: CROSSING MINIMIZATION (BARYCENTER METHOD)');

    if (layers.length <= 1) {
      return layers;
    }

    // Deep copy
    let currentLayers = layers.map(layer => [...layer]);

    // Count initial crossings
    const initialCrossings = this.countTotalCrossings(currentLayers);
    Logger.debug(`\nInitial crossings: ${initialCrossings}`);

    let bestLayers = currentLayers.map(layer => [...layer]);
    let bestCrossings = initialCrossings;

    // Iterative improvement
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      Logger.subsection(`Iteration ${iteration + 1}`);

      // Forward pass (left to right)
      for (let layerIdx = 1; layerIdx < currentLayers.length; layerIdx++) {
        const prevLayer = currentLayers[layerIdx - 1];
        const currentLayer = currentLayers[layerIdx];

        const reordered = this.reorderByBarycenterBackward(
          currentLayer,
          prevLayer
        );
        currentLayers[layerIdx] = reordered;
      }

      // Backward pass (right to left)
      for (let layerIdx = currentLayers.length - 2; layerIdx >= 0; layerIdx--) {
        const currentLayer = currentLayers[layerIdx];
        const nextLayer = currentLayers[layerIdx + 1];

        const reordered = this.reorderByBarycenterForward(
          currentLayer,
          nextLayer
        );
        currentLayers[layerIdx] = reordered;
      }

      // Count crossings after this iteration
      const crossings = this.countTotalCrossings(currentLayers);
      Logger.debug(`Crossings after iteration ${iteration + 1}: ${crossings}`);

      // Track best solution
      if (crossings < bestCrossings) {
        bestCrossings = crossings;
        bestLayers = currentLayers.map(layer => [...layer]);
        Logger.debug(`  [IMPROVED] New best: ${bestCrossings} crossings`);
      }

      // Early exit if no crossings
      if (crossings === 0) {
        Logger.debug('\n[SUCCESS] Zero crossings achieved!');
        break;
      }
    }

    Logger.section('CROSSING MINIMIZATION COMPLETE');
    Logger.debug(`Final crossings: ${bestCrossings} (reduced from ${initialCrossings})`);

    return bestLayers;
  }

  /**
   * Reorder current layer based on barycenter of connections from prev_layer
   *
   * Barycenter = average position of source entities in prev_layer
   */
  private reorderByBarycenterBackward(
    currentLayer: string[],
    prevLayer: string[]
  ): string[] {
    const barycenters = new Map<string, number>();

    for (const entity of currentLayer) {
      // Find sources in prev_layer
      const sources: string[] = [];
      const backSources = this.backwardEdges.get(entity);
      if (backSources) {
        for (const source of backSources) {
          if (prevLayer.includes(source)) {
            sources.push(source);
          }
        }
      }

      if (sources.length > 0) {
        // Calculate barycenter (average position in prev_layer)
        const positions = sources.map(s => prevLayer.indexOf(s));
        const barycenter = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
        barycenters.set(entity, barycenter);
      } else {
        // No connections: place at end
        barycenters.set(entity, Infinity);
      }
    }

    // Sort by barycenter
    return [...currentLayer].sort((a, b) => {
      const barA = barycenters.get(a)!;
      const barB = barycenters.get(b)!;
      if (barA !== barB) return barA - barB;
      // Tie-break by original position
      return currentLayer.indexOf(a) - currentLayer.indexOf(b);
    });
  }

  /**
   * Reorder current layer based on barycenter of connections to next_layer
   *
   * Barycenter = average position of target entities in next_layer
   */
  private reorderByBarycenterForward(
    currentLayer: string[],
    nextLayer: string[]
  ): string[] {
    const barycenters = new Map<string, number>();

    for (const entity of currentLayer) {
      // Find targets in next_layer
      const targets: string[] = [];
      const forwardTargets = this.forwardEdges.get(entity);
      if (forwardTargets) {
        for (const target of forwardTargets) {
          if (nextLayer.includes(target)) {
            targets.push(target);
          }
        }
      }

      if (targets.length > 0) {
        // Calculate barycenter (average position in next_layer)
        const positions = targets.map(t => nextLayer.indexOf(t));
        const barycenter = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
        barycenters.set(entity, barycenter);
      } else {
        // No connections: place at end
        barycenters.set(entity, Infinity);
      }
    }

    // Sort by barycenter
    return [...currentLayer].sort((a, b) => {
      const barA = barycenters.get(a)!;
      const barB = barycenters.get(b)!;
      if (barA !== barB) return barA - barB;
      // Tie-break by original position
      return currentLayer.indexOf(a) - currentLayer.indexOf(b);
    });
  }

  /**
   * Count edge crossings between two adjacent layers
   */
  private countCrossingsBetweenLayers(
    leftLayer: string[],
    rightLayer: string[]
  ): number {
    let crossings = 0;

    // Get all edges between these layers
    const edges: Array<[number, number]> = [];
    for (let leftIdx = 0; leftIdx < leftLayer.length; leftIdx++) {
      const leftEntity = leftLayer[leftIdx];
      const targets = this.forwardEdges.get(leftEntity);
      if (targets) {
        for (const rightEntity of targets) {
          const rightIdx = rightLayer.indexOf(rightEntity);
          if (rightIdx !== -1) {
            edges.push([leftIdx, rightIdx]);
          }
        }
      }
    }

    // Count crossings: for each pair of edges, check if they cross
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const [left1, right1] = edges[i];
        const [left2, right2] = edges[j];

        // Edges cross if their order is inverted
        if ((left1 < left2 && right1 > right2) || (left1 > left2 && right1 < right2)) {
          crossings++;
        }
      }
    }

    return crossings;
  }

  /**
   * Count total crossings across all adjacent layer pairs
   */
  private countTotalCrossings(layers: string[][]): number {
    let total = 0;
    for (let i = 0; i < layers.length - 1; i++) {
      const crossings = this.countCrossingsBetweenLayers(layers[i], layers[i + 1]);
      total += crossings;
    }
    return total;
  }
}
