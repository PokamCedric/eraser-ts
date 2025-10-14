#!/usr/bin/env python3
"""
Hierarchical Layout Engine - FIXED VERSION

DISCOVERIES:
1. Semantics are INVERTED: A.fk > B.pk means "B depends on A" for layout
2. NO final layer inversion! Layer 0 = leaves, Layer max = roots
"""

from typing import Dict, List, Set, Tuple
import re
import sys


class HierarchicalLayoutEngine:
    """Fixed implementation matching TypeScript exactly"""

    @staticmethod
    def parse_dsl(dsl_text: str) -> Tuple[Set[str], List[Tuple[str, str]]]:
        """
        Parse DSL with INVERTED semantics

        A.fk > B.pk means: "B depends on A" (for layout purposes)
        This is inverted from database FK semantics!
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

                # INVERTED SEMANTICS
                if operator == '>' or operator == '-':
                    # A > B means B depends on A
                    relationships.append((entity2, entity1))
                elif operator == '<':
                    # A < B means A depends on B
                    relationships.append((entity1, entity2))

        return entities, relationships

    @staticmethod
    def compute_layers(entities: Set[str], relationships: List[Tuple[str, str]]) -> Dict[int, List[str]]:
        """
        Compute layers WITHOUT final inversion

        Layer 0 = leaves (no one depends on them)
        Layer max = roots (don't depend on anyone)
        """
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

            if node in visited:  # Cycle detection
                layer_of[node] = 0
                return 0

            visited.add(node)

            deps = graph.get(node, [])
            if not deps:
                layer_of[node] = 0  # Root = layer 0 initially
            else:
                max_dep_layer = max(compute_layer(d) for d in deps)
                layer_of[node] = max_dep_layer + 1

            visited.remove(node)
            return layer_of[node]

        # Compute for all nodes
        for node in entities:
            compute_layer(node)

        # NO INVERSION! Just group by layer
        layers = {}
        for node, layer in layer_of.items():
            if layer not in layers:
                layers[layer] = []
            layers[layer].append(node)

        return layers


def main():
    # Check if file path provided
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "test_full_dsl.txt"

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            dsl_text = f.read()
    except FileNotFoundError:
        print(f"[X] Error: File '{file_path}' not found")
        sys.exit(1)

    print(f"[*] Reading DSL from: {file_path}\n")

    # Parse and compute
    entities, relationships = HierarchicalLayoutEngine.parse_dsl(dsl_text)
    layers = HierarchicalLayoutEngine.compute_layers(entities, relationships)

    # Display results
    print("=" * 60)
    print("HIERARCHICAL LAYOUT RESULTS (FIXED)")
    print("=" * 60)
    print(f"\n[!] Number of layers: {len(layers)}\n")

    for layer_num in sorted(layers.keys()):
        entities_in_layer = sorted(layers[layer_num])
        print(f"Layer {layer_num}: {', '.join(entities_in_layer)}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
