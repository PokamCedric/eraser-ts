#!/usr/bin/env python3
"""
Final debug - Show exactly how TypeScript SHOULD interpret relations
Based on the console output, TypeScript clearly uses INVERTED semantics
"""

from typing import Dict, List, Set, Tuple
import re


def parse_dsl_inverted(dsl_text: str) -> Tuple[Set[str], List[Tuple[str, str]]]:
    """
    Parse DSL with INVERTED semantics
    A.fk > B.pk means: B depends on A (inverted from database semantics)
    """
    entities = set()
    relationships = []

    lines = dsl_text.strip().split('\n')

    for line in lines:
        line = line.split('//')[0].strip()
        if not line:
            continue

        match = re.match(r'(\w+)\.\w+\s*([><-])\s*(\w+)\.\w+', line)

        if match:
            entity1 = match.group(1)
            operator = match.group(2)
            entity2 = match.group(3)

            entities.add(entity1)
            entities.add(entity2)

            # INVERTED: A > B means B depends on A
            if operator == '>' or operator == '-':
                relationships.append((entity2, entity1))
            elif operator == '<':
                relationships.append((entity1, entity2))

    return entities, relationships


def compute_layers_manually(entities: Set[str], relationships: List[Tuple[str, str]]) -> Dict[int, List[str]]:
    """Manually compute layers to debug"""

    # Build graph
    graph = {}
    for e in entities:
        graph[e] = []

    for from_e, to_e in relationships:
        if from_e not in graph:
            graph[from_e] = []
        graph[from_e].append(to_e)

    # Compute layers recursively
    layer_of = {}
    visited = set()

    def compute_layer(node):
        if node in layer_of:
            return layer_of[node]

        if node in visited:  # Cycle
            layer_of[node] = 0
            return 0

        visited.add(node)

        deps = graph.get(node, [])
        if not deps:
            layer_of[node] = 0  # Root
        else:
            max_dep_layer = max(compute_layer(d) for d in deps)
            layer_of[node] = max_dep_layer + 1

        visited.remove(node)
        return layer_of[node]

    # Compute for all
    for node in entities:
        compute_layer(node)

    # Invert
    max_layer = max(layer_of.values()) if layer_of else 0
    for node in layer_of:
        layer_of[node] = max_layer - layer_of[node]

    # Group by layer
    layers = {}
    for node, layer in layer_of.items():
        if layer not in layers:
            layers[layer] = []
        layers[layer].append(node)

    return layers


# Read DSL
with open('test_full_dsl.txt', 'r', encoding='utf-8') as f:
    dsl_text = f.read()

print("=" * 80)
print("FINAL DEBUG - INVERTED SEMANTICS")
print("=" * 80)
print()

# Parse
entities, relationships = parse_dsl_inverted(dsl_text)

print(f"Entities found: {len(entities)}")
print(f"Relationships found: {len(relationships)}")
print()

# Show dependency graph
print("DEPENDENCY GRAPH (WHO DEPENDS ON WHO):")
print("-" * 80)

deps_by_entity = {}
for from_e, to_e in relationships:
    if from_e not in deps_by_entity:
        deps_by_entity[from_e] = []
    deps_by_entity[from_e].append(to_e)

for entity in sorted(entities):
    deps = sorted(deps_by_entity.get(entity, []))
    if deps:
        print(f"{entity:20s} depends on: {', '.join(deps)}")
    else:
        print(f"{entity:20s} depends on: (nothing - ROOT)")

print()
print("=" * 80)

# Compute layers
layers = compute_layers_manually(entities, relationships)

print(f"\nCALCULATED LAYERS: {len(layers)}")
print()

for layer_num in sorted(layers.keys()):
    entities_in_layer = sorted(layers[layer_num])
    print(f"Layer {layer_num}: {', '.join(entities_in_layer)}")

print()
print("=" * 80)
print("\nTYPESCRIPT CONSOLE OUTPUT:")
print("Layer 0: milestones, user_projects")
print("Layer 1: projects, comments, attachments, post_tags")
print("Layer 2: posts, user_roles, notifications, tags")
print("Layer 3: users, role_permissions")
print("Layer 4: profiles, teams, roles, permissions")
print()
print("=" * 80)
