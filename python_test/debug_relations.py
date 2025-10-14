#!/usr/bin/env python3
"""
Debug script to see how relationships are interpreted
"""

from hierarchical_layout import HierarchicalLayoutEngine

# Read DSL
with open('test_full_dsl.txt', 'r', encoding='utf-8') as f:
    dsl_text = f.read()

# Parse
entities, relationships = HierarchicalLayoutEngine.parse_dsl(dsl_text)

print("=" * 70)
print("RELATIONSHIPS DEBUG")
print("=" * 70)
print()

# Group by target entity
from_deps = {}
for from_e, to_e in relationships:
    if from_e not in from_deps:
        from_deps[from_e] = []
    from_deps[from_e].append(to_e)

# Display
for entity in sorted(entities):
    deps = from_deps.get(entity, [])
    if deps:
        print(f"{entity:20s} depends on: {', '.join(sorted(deps))}")
    else:
        print(f"{entity:20s} depends on: (none - ROOT)")

print()
print("=" * 70)

# Now compute and show layers
dep_graph = HierarchicalLayoutEngine.build_dependency_graph(entities, relationships)
layers = HierarchicalLayoutEngine.compute_layers(dep_graph)

print()
print(f"Number of layers: {len(layers)}")
print()

for layer_num in sorted(layers.keys()):
    entities_in_layer = sorted(layers[layer_num])
    print(f"Layer {layer_num}: {', '.join(entities_in_layer)}")
