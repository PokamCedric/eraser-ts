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

import { Relationship } from '../../entities/Relationship';
import { DirectedRelation } from './types';
import { GraphPreprocessor } from './GraphPreprocessor';
import { ILayerClassifier } from './ILayerClassifier';
import { IVerticalOptimizer } from './IVerticalOptimizer';
import { ICrossingMinimizer } from './ICrossingMinimizer';
import { ILogger } from '../ILogger';

/**
 * Layer Classification Orchestrator
 *
 * Coordinates the layer classification pipeline using dependency injection.
 * Respects Dependency Inversion Principle (DIP) by depending on abstractions.
 */
export class LayerClassificationOrchestrator {
  constructor(
    private readonly logger: ILogger,
    private readonly layerClassifier: ILayerClassifier,
    private readonly verticalOptimizer: IVerticalOptimizer,
    private readonly crossingMinimizer: ICrossingMinimizer
  ) {}

  /**
   * Parse relationships into directed relations
   */
  private parseRelations(relationships: Relationship[]): DirectedRelation[] {
    const relations: DirectedRelation[] = [];

    this.logger.subsection('PHASE 0: PARSING RELATIONS');

    for (const rel of relationships) {
      const left = rel.from.entity;
      const right = rel.to.entity;

      relations.push({ left, right });
      this.logger.debug(`  ${left} > ${right}`);
    }

    this.logger.debug(`Parsed ${relations.length} relations`);

    return relations;
  }

  /**
   * Run complete layer classification pipeline
   *
   * @param relationships - Array of domain Relationship objects
   * @returns Array of layers, where each layer is an array of entity names
   */
  classify(relationships: Relationship[]): string[][] {
    this.logger.section('LAYER CLASSIFICATION ORCHESTRATOR');

    // PHASE 0: Parse relationships
    const relationsRaw = this.parseRelations(relationships);

    // PHASE 1-2: Preprocessing
    const { relations, connectionCount } = GraphPreprocessor.buildBacklog(relationsRaw, this.logger);
    const entityOrder = GraphPreprocessor.buildEntityOrder(relations, connectionCount, this.logger);

    // PHASE 3: Horizontal alignment (X-axis)
    this.logger.subsection('PHASE 3: HORIZONTAL ALIGNMENT (X-AXIS)');
    this.logger.debug(`Using LayerClassifier (algo10)`);

    this.logger.debug(`\nAdding ${relations.length} relations to classifier...`);
    for (const { left, right } of relations) {
      this.layerClassifier.addRelation(left, right);
    }

    const horizontalLayers = this.layerClassifier.computeLayers(entityOrder);

    this.logger.debug(`\nHorizontal layers: ${horizontalLayers.length} layers`);
    horizontalLayers.forEach((layer, idx) => {
      this.logger.debug(`  Layer ${idx}: [${layer.join(', ')}]`);
    });

    // PHASE 4: Source-aware vertical alignment (Y-axis)
    const verticalLayers = this.verticalOptimizer.optimize(horizontalLayers, entityOrder);

    // PHASE 5: Crossing minimization
    const finalLayers = this.crossingMinimizer.minimizeCrossings(verticalLayers, 4);

    // Final result
    this.logger.section('FINAL LAYERS');
    finalLayers.forEach((layer, idx) => {
      this.logger.debug(`Layer ${idx}: [${layer.join(', ')}]`);
    });

    return finalLayers;
  }
}
