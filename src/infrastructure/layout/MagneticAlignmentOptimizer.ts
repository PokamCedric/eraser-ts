/**
 * Magnetic Alignment Optimizer (Orchestrator)
 *
 * Coordinates the 3 layout optimization algorithms:
 * 1. HorizontalLayeringAlgorithm - Determines X position (layers) - Already done in HierarchicalLayoutEngine
 * 2. VerticalOrderingAlgorithm - Determines Y ordering within layers
 * 3. FieldOrderingAlgorithm - Determines field ordering within entities
 *
 * This class is the main entry point that runs the algorithms in the correct sequence.
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
// import { VerticalOrderingAlgorithm } from './VerticalOrderingAlgorithm';
import { FieldOrderingAlgorithm } from './FieldOrderingAlgorithm';

export class MagneticAlignmentOptimizer {
  /**
   * Run the complete optimization pipeline
   *
   * @param entities - All entities
   * @param relationships - All relationships
   * @param layers - Layers from horizontal layering (X positions already determined)
   * @returns Optimized layers with entities ordered vertically
   */
  static optimize(
    entities: Entity[],
    relationships: Relationship[],
    layers: Map<number, string[]>
  ): Map<number, string[]> {
    console.log('\n=== FIELD ORDERING OPTIMIZER ===');
    console.log('Optimizing field order within entities...\n');

    // NOTE: Vertical ordering of entities is now done by ClusterBasedOrdering
    // This optimizer now ONLY handles field ordering within entities

    // Optimize field ordering within entities
    FieldOrderingAlgorithm.optimize(entities, relationships, layers);

    console.log('=== FIELD ORDERING COMPLETE ===\n');
    return layers;
  }
}
