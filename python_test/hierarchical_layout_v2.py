#!/usr/bin/env python3
"""
Hierarchical Layout Engine - Version 2
WITH INVERTED SEMANTICS

Testing hypothesis: TypeScript inverts the dependency direction
A.fk > B.pk means "for layout purposes, B depends on A" (not A depends on B)
"""

from typing import Dict, List, Set, Tuple
import re


class HierarchicalLayoutEngineV2:

    @staticmethod
    def parse_dsl(dsl_text: str) -> Tuple[Set[str], List[Tuple[str, str]]]:
        """Parse DSL with INVERTED semantics for relationships"""
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

                # INVERTED SEMANTICS:
                # A > B means "B depends on A" (for layout)
                # This is the opposite of database semantics!

                if operator == '>' or operator == '-':
                    # entity2 depends on entity1 (INVERTED!)
                    relationships.append((entity2, entity1))
                elif operator == '<':
                    # entity1 depends on entity2 (INVERTED!)
                    relationships.append((entity1, entity2))

        return entities, relationships

    @staticmethod
    def build_dependency_graph(entities: Set[str], relationships: List[Tuple[str, str]]):
        """Build dependency graph"""
        from hierarchical_layout import DependencyGraph

        dep_graph = DependencyGraph()
        dep_graph.nodes = entities.copy()

        for from_entity, to_entity in relationships:
            if from_entity not in dep_graph.graph:
                dep_graph.graph[from_entity] = []
            dep_graph.graph[from_entity].append(to_entity)

            if to_entity not in dep_graph.reverse_graph:
                dep_graph.reverse_graph[to_entity] = []
            dep_graph.reverse_graph[to_entity].append(from_entity)

        return dep_graph

    @staticmethod
    def compute_layers(dep_graph):
        """Compute layers using the same algorithm"""
        from hierarchical_layout import HierarchicalLayoutEngine
        return HierarchicalLayoutEngine.compute_layers(dep_graph)


def main():
    print("=" * 70)
    print("TESTING INVERTED SEMANTICS")
    print("=" * 70)
    print()
    print("Hypothesis: A > B means 'B depends on A' for layout purposes")
    print()

    with open('test_full_dsl.txt', 'r', encoding='utf-8') as f:
        dsl_text = f.read()

    # Parse with inverted semantics
    entities, relationships = HierarchicalLayoutEngineV2.parse_dsl(dsl_text)

    print("Sample relationships (inverted):")
    for i, (from_e, to_e) in enumerate(relationships[:5]):
        print(f"  {from_e} depends on {to_e}")
    print(f"  ... ({len(relationships)} total)")
    print()

    # Build and compute
    dep_graph = HierarchicalLayoutEngineV2.build_dependency_graph(entities, relationships)
    layers = HierarchicalLayoutEngineV2.compute_layers(dep_graph)

    # Display
    print("=" * 70)
    print(f"Number of layers: {len(layers)}")
    print()

    for layer_num in sorted(layers.keys()):
        entities_in_layer = sorted(layers[layer_num])
        print(f"Layer {layer_num}: {', '.join(entities_in_layer)}")

    print()
    print("=" * 70)
    print()
    print("Compare with TypeScript console output:")
    print("Layer 0: milestones, user_projects")
    print("Layer 1: projects, comments, attachments, post_tags")
    print("Layer 2: posts, user_roles, notifications, tags")
    print("Layer 3: users, role_permissions")
    print("Layer 4: profiles, teams, roles, permissions")


if __name__ == "__main__":
    main()
