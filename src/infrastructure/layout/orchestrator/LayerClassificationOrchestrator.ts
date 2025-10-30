/**
 * Layer Classification Orchestrator
 *
 * Main coordinator that runs all 5 phases:
 * - Phase 0: Parsing (via DSLParserAdapter - external)
 * - Phase 1-2: Preprocessing (GraphPreprocessor)
 * - Phase 3: Horizontal alignment (LayerClassifier - algo10)
 * - Phase 4: Source-aware vertical alignment (SourceAwareVerticalOptimizer)
 * - Phase 5: Crossing minimization (CrossingMinimizer)
 */

import { Relationship } from '../../../domain/entities/Relationship';
import { DirectedRelation } from '../phases/types';
import { GraphPreprocessor } from '../phases/GraphPreprocessor';
import { LayerClassifier } from './LayerClassifier';
import { SourceAwareVerticalOptimizer } from '../phases/SourceAwareVerticalOptimizer';
import { CrossingMinimizer } from '../phases/CrossingMinimizer';
import { Logger } from '../utils/Logger';

export class LayerClassificationOrchestrator {
  /**
   * Parse relationships into directed relations
   */
  private static parseRelations(relationships: Relationship[]): DirectedRelation[] {
    const relations: DirectedRelation[] = [];

    Logger.subsection('PHASE 0: PARSING RELATIONS');

    for (const rel of relationships) {
      const left = rel.from.entity;
      const right = rel.to.entity;

      relations.push({ left, right });
      Logger.debug(`  ${left} > ${right}`);
    }

    Logger.debug(`Parsed ${relations.length} relations`);

    return relations;
  }

  /**
   * Run complete layer classification pipeline
   *
   * @param relationships - Array of domain Relationship objects
   * @returns Array of layers, where each layer is an array of entity names
   */
  static classify(relationships: Relationship[]): string[][] {
    Logger.section('LAYER CLASSIFICATION ORCHESTRATOR');

    // PHASE 0: Parse relationships
    const relationsRaw = this.parseRelations(relationships);

    // PHASE 1-2: Preprocessing
    const { relations, connectionCount } = GraphPreprocessor.buildBacklog(relationsRaw);
    const entityOrder = GraphPreprocessor.buildEntityOrder(relations, connectionCount);

    // PHASE 3: Horizontal alignment (X-axis)
    Logger.subsection('PHASE 3: HORIZONTAL ALIGNMENT (X-AXIS)');
    Logger.debug(`Using LayerClassifier (algo10)`);

    const classifier = new LayerClassifier();

    Logger.debug(`\nAdding ${relations.length} relations to classifier...`);
    for (const { left, right } of relations) {
      classifier.addRelation(left, right);
    }

    const horizontalLayers = classifier.computeLayers(entityOrder);

    Logger.debug(`\nHorizontal layers: ${horizontalLayers.length} layers`);
    horizontalLayers.forEach((layer, idx) => {
      Logger.debug(`  Layer ${idx}: [${layer.join(', ')}]`);
    });

    // PHASE 4: Source-aware vertical alignment (Y-axis)
    const verticalOptimizer = new SourceAwareVerticalOptimizer(relations);
    const verticalLayers = verticalOptimizer.optimize(horizontalLayers, entityOrder);

    // PHASE 5: Crossing minimization
    const crossingMinimizer = new CrossingMinimizer(relations);
    const finalLayers = crossingMinimizer.minimizeCrossings(verticalLayers, 4);

    // Final result
    Logger.section('FINAL LAYERS');
    finalLayers.forEach((layer, idx) => {
      Logger.debug(`Layer ${idx}: [${layer.join(', ')}]`);
    });

    return finalLayers;
  }
}
