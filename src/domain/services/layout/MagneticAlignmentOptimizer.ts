/**
 * Magnetic Alignment Optimizer
 *
 * Handles field ordering within entities to optimize visual alignment.
 *
 * NOTE: Entity layering and ordering is now handled by LayerClassificationEngine
 * which includes:
 * - Horizontal layering (X positions) using Floyd-Warshall inversé
 * - Transitive intercalation detection
 * - Cluster-based vertical ordering (Y positions within layers)
 * - Reference entity selection with cascade criteria
 *
 * This class only handles field ordering within individual entities.
 * LSP Compliant: Returns optimized entities instead of mutating
 */

import { Entity } from '../../entities/Entity';
import { Relationship } from '../../entities/Relationship';
import { FieldOrderingAlgorithm } from './FieldOrderingAlgorithm';
import { Logger } from '../../../infrastructure/utils/Logger';

export interface OptimizationResult {
  layers: Map<number, string[]>;
  entities: Entity[];
}

export class MagneticAlignmentOptimizer {
  /**
   * Optimize field ordering within entities
   * LSP Compliant: Returns new entities instead of mutating
   *
   * @param entities - All entities
   * @param relationships - All relationships
   * @param layers - Layers from LayerClassificationEngine (already ordered)
   * @returns Layers and optimized entities
   */
  static optimize(
    entities: Entity[],
    relationships: Relationship[],
    layers: Map<number, string[]>
  ): OptimizationResult {
    Logger.section('FIELD ORDERING OPTIMIZER');
    Logger.debug('Optimizing field order within entities...\n');

    // Optimize field ordering within entities (LSP: returns map of updated entities)
    const optimizedEntityMap = FieldOrderingAlgorithm.optimize(entities, relationships, layers);

    // Convert map back to array
    const optimizedEntities = Array.from(optimizedEntityMap.values());

    Logger.section('FIELD ORDERING COMPLETE');
    return {
      layers,
      entities: optimizedEntities
    };
  }
}
