/**
 * Layer Classification Orchestrator
 *
 * Main coordinator that runs all phases:
 * - Phase 0: Parsing (via DSLParserAdapter - external)
 * - Phase 1-2: Preprocessing (GraphPreprocessor)
 * - Phase 3: Horizontal alignment (LayerClassifier)
 * - Phase 4: Vertical alignment (VerticalOrderOptimizer)
 */

import { Relationship } from '../../../domain/entities/Relationship';
import { DirectedRelation } from '../phases/types';
import { GraphPreprocessor } from '../phases/GraphPreprocessor';
import { LayerClassifier } from '../LayerClassifier';
import { VerticalOrderOptimizer } from '../phases/VerticalOrderOptimizer';

export class LayerClassificationOrchestrator {
  /**
   * Parse relationships into directed relations
   */
  private static parseRelations(relationships: Relationship[]): DirectedRelation[] {
    const relations: DirectedRelation[] = [];

    console.log('\n=== PHASE 0: PARSING RELATIONS ===');

    for (const rel of relationships) {
      const left = rel.from.entity;
      const right = rel.to.entity;

      relations.push({ left, right });
      console.log(`  ${left} > ${right}`);
    }

    console.log(`Parsed ${relations.length} relations`);

    return relations;
  }

  /**
   * Run complete layer classification pipeline
   *
   * @param relationships - Array of domain Relationship objects
   * @returns Array of layers, where each layer is an array of entity names
   */
  static classify(relationships: Relationship[]): string[][] {
    console.log('\n' + '='.repeat(80));
    console.log('LAYER CLASSIFICATION ORCHESTRATOR');
    console.log('='.repeat(80));

    // PHASE 0: Parse relationships
    const relationsRaw = this.parseRelations(relationships);

    // PHASE 1-2: Preprocessing
    const { relations, connectionCount } = GraphPreprocessor.buildBacklog(relationsRaw);
    const entityOrder = GraphPreprocessor.buildEntityOrder(relations, connectionCount);

    // PHASE 3: Horizontal alignment (X-axis)
    console.log('\n=== PHASE 3: HORIZONTAL ALIGNMENT (X-AXIS) ===');
    console.log(`Using LayerClassifier (algo10)`);

    const classifier = new LayerClassifier();

    console.log(`\nAdding ${relations.length} relations to classifier...`);
    for (const { left, right } of relations) {
      classifier.addRelation(left, right);
    }

    const horizontalLayers = classifier.computeLayers(entityOrder);

    console.log(`\nHorizontal layers: ${horizontalLayers.length} layers`);
    horizontalLayers.forEach((layer, idx) => {
      console.log(`  Layer ${idx}: [${layer.join(', ')}]`);
    });

    // PHASE 4: Vertical alignment (Y-axis)
    const finalLayers = VerticalOrderOptimizer.optimize(
      horizontalLayers,
      entityOrder,
      relations
    );

    // Final result
    console.log('\n' + '='.repeat(80));
    console.log('FINAL LAYERS');
    console.log('='.repeat(80));
    finalLayers.forEach((layer, idx) => {
      console.log(`Layer ${idx}: [${layer.join(', ')}]`);
    });

    return finalLayers;
  }
}
