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
 */

import { Entity } from '../../entities/Entity';
import { Relationship } from '../../entities/Relationship';
import { FieldOrderingAlgorithm } from './FieldOrderingAlgorithm';
import { Logger } from '../../../infrastructure/utils/Logger';

export class MagneticAlignmentOptimizer {
  /**
   * Optimize field ordering within entities
   *
   * @param entities - All entities
   * @param relationships - All relationships
   * @param layers - Layers from LayerClassificationEngine (already ordered)
   * @returns The same layers (entities are not reordered, only fields within entities)
   */
  static optimize(
    entities: Entity[],
    relationships: Relationship[],
    layers: Map<number, string[]>
  ): Map<number, string[]> {
    Logger.section('FIELD ORDERING OPTIMIZER');
    Logger.debug('Optimizing field order within entities...\n');

    // Optimize field ordering within entities
    FieldOrderingAlgorithm.optimize(entities, relationships, layers);

    Logger.section('FIELD ORDERING COMPLETE');
    return layers;
  }
}
