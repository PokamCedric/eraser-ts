"""
Test script for e-commerce example with V2 optimizer (source-aware)
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from relation_parser import RelationParser
from graph_preprocessor import GraphPreprocessor
from horizontal_layer_classifier import HorizontalLayerClassifier
from pivot_based_vertical_optimizer_v2 import PivotBasedVerticalOptimizerV2
from test_data_ecommerce import dsl_ecommerce


def main():
    print("="*80)
    print("E-COMMERCE TEST - SOURCE-AWARE VERTICAL ALIGNMENT (V2)")
    print("="*80)

    # PHASE 0: Parse
    print("\n" + "="*80)
    print("PHASE 0: PARSING")
    print("="*80)
    raw_relations = RelationParser.parse(dsl_ecommerce)
    print(f"Parsed {len(raw_relations)} relations")

    # PHASE 1-2: Preprocessing
    print("\n" + "="*80)
    print("PHASE 1-2: PREPROCESSING")
    print("="*80)
    preprocessor = GraphPreprocessor()
    relations = preprocessor.deduplicate(raw_relations)
    print(f"After deduplication: {len(relations)} unique relations")

    entity_order = preprocessor.build_entity_order(relations)
    print(f"Entity order (top 15): {entity_order[:15]}")

    # PHASE 3: Horizontal alignment
    print("\n" + "="*80)
    print("PHASE 3: HORIZONTAL ALIGNMENT (X-AXIS)")
    print("="*80)
    classifier = HorizontalLayerClassifier()
    for left, right in relations:
        classifier.add_relation(left, right)

    horizontal_layers = classifier.compute_layers(entity_order)
    print(f"\nHorizontal layers: {len(horizontal_layers)} layers")
    for idx, layer in enumerate(horizontal_layers):
        print(f"  Layer {idx}: {layer}")

    # PHASE 4: Source-aware vertical alignment
    optimizer = PivotBasedVerticalOptimizerV2(relations)
    final_layers = optimizer.optimize(horizontal_layers, entity_order)

    # Final result
    print("\n" + "="*80)
    print("FINAL LAYERS")
    print("="*80)
    for idx, layer in enumerate(final_layers):
        print(f"Layer {idx}: {layer}")

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()
