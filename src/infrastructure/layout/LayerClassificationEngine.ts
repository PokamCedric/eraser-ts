/**
 * Layer Classification Engine - Refactored to use modular orchestrator
 *
 * This is now a thin wrapper around LayerClassificationOrchestrator.
 * The orchestrator coordinates all phases:
 * - Phase 0: Parsing
 * - Phase 1-2: Preprocessing (GraphPreprocessor)
 * - Phase 3: Horizontal alignment (LayerClassifier - algo10)
 * - Phase 4: Vertical alignment (VerticalOrderOptimizer)
 *
 * Documentation: docs/layer-classification-algorithm-technical-deep-dive.md
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { LayerClassificationOrchestrator } from './orchestrator/LayerClassificationOrchestrator';
import { Logger } from './utils/Logger';

export interface LayerClassificationResult {
  layers: Map<number, string[]>;
  layerOf: Map<string, number>;
}

export class LayerClassificationEngine {
  /**
   * Main entry point - Layout entities using layer classification
   *
   * @param entities - Array of domain Entity objects
   * @param relationships - Array of domain Relationship objects
   * @returns Layer classification result with layer assignments
   */
  static layout(entities: Entity[], relationships: Relationship[]): LayerClassificationResult {
    Logger.section('LAYER CLASSIFICATION ENGINE (MODULAR ARCHITECTURE)');

    // Run orchestrator to get final layers
    const layers = LayerClassificationOrchestrator.classify(relationships);

    // Build result maps
    const layersMap = new Map<number, string[]>();
    const layerOf = new Map<string, number>();

    layers.forEach((layer, idx) => {
      layersMap.set(idx, layer);
      layer.forEach(entity => {
        layerOf.set(entity, idx);
      });
    });

    // Handle isolated entities (no relationships)
    entities.forEach(entity => {
      if (!layerOf.has(entity.name)) {
        const maxLayer = Math.max(...Array.from(layerOf.values()), -1);
        layerOf.set(entity.name, maxLayer + 1);
        if (!layersMap.has(maxLayer + 1)) {
          layersMap.set(maxLayer + 1, []);
        }
        layersMap.get(maxLayer + 1)!.push(entity.name);

        Logger.info(`\n[INFO] Isolated entity '${entity.name}' placed at layer ${maxLayer + 1}`);
      }
    });

    Logger.section('LAYOUT COMPLETE');
    Logger.debug(`Total layers: ${layersMap.size}`);
    Logger.debug(`Total entities: ${entities.length}`);

    return { layers: layersMap, layerOf };
  }
}
