#!/usr/bin/env python3
"""
Simple test script to run hierarchical layout on a DSL file
"""

import sys
from hierarchical_layout import HierarchicalLayoutEngine


def main():
    # Check if file path is provided
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                dsl_text = f.read()
        except FileNotFoundError:
            print(f"[X] Error: File '{file_path}' not found")
            sys.exit(1)
    else:
        # Use default test file
        file_path = "test_dsl.txt"
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                dsl_text = f.read()
        except FileNotFoundError:
            print("[X] Error: test_dsl.txt not found")
            print("Usage: python run_test.py [dsl_file.txt]")
            sys.exit(1)

    print(f"[*] Reading DSL from: {file_path}\n")

    # Parse DSL
    entities, relationships = HierarchicalLayoutEngine.parse_dsl(dsl_text)

    # Build dependency graph
    dep_graph = HierarchicalLayoutEngine.build_dependency_graph(entities, relationships)

    # Compute layers
    layers = HierarchicalLayoutEngine.compute_layers(dep_graph)

    # Display results
    print("=" * 60)
    print("HIERARCHICAL LAYOUT RESULTS")
    print("=" * 60)
    print(f"\n[!] Number of layers: {len(layers)}\n")

    for layer_num in sorted(layers.keys()):
        entities_in_layer = layers[layer_num]
        print(f"Layer {layer_num}: {', '.join(sorted(entities_in_layer))}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
