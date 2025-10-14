#!/usr/bin/env python3
"""
Verification script - Compare Python results with TypeScript console output

This script helps verify that Python calculates the same initial layers
as TypeScript's HierarchicalLayoutEngine (before visual optimizations).
"""

from hierarchical_layout import HierarchicalLayoutEngine


def main():
    print("=" * 70)
    print("VERIFICATION: Python vs TypeScript Initial Layer Calculation")
    print("=" * 70)
    print()
    print("Instructions:")
    print("1. Open your TypeScript application in a browser")
    print("2. Open browser console (F12)")
    print("3. Look for the log: 'Auto Layout Layers (Left -> Right)'")
    print("4. Compare those layers with the Python output below")
    print()
    print("-" * 70)
    print()

    # Use the same DSL as in test_dsl.txt
    with open('test_dsl.txt', 'r', encoding='utf-8') as f:
        dsl_text = f.read()

    # Parse and compute
    entities, relationships = HierarchicalLayoutEngine.parse_dsl(dsl_text)
    dep_graph = HierarchicalLayoutEngine.build_dependency_graph(entities, relationships)
    layers = HierarchicalLayoutEngine.compute_layers(dep_graph)

    # Display in the same format as TypeScript console
    print(f"Number of layers detected: {len(layers)}")
    print()

    for layer_num in sorted(layers.keys()):
        entities_in_layer = sorted(layers[layer_num])
        print(f"Layer {layer_num}: {', '.join(entities_in_layer)}")

    print()
    print("=" * 70)
    print()
    print("[+] If these layers match the TypeScript console output,")
    print("    the Python implementation is CORRECT!")
    print()
    print("[!] If the VISUAL layout differs, that's normal!")
    print("    TypeScript applies 5 additional optimization steps after this.")
    print()
    print("[?] Read DIFFERENCES.md for full explanation")
    print()


if __name__ == "__main__":
    main()
