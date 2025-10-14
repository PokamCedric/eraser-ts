#!/usr/bin/env python3
"""
Hierarchical Layout Engine - Python Implementation

Computes hierarchical layers for entities based on their dependencies.
Uses an inverted algorithm: leaves (nobody depends on them) → Layer 0 (left)
                            roots (many depend on them) → Layer max (right)
"""

from typing import Dict, List, Set, Tuple
import re


class DependencyGraph:
    """Represents a dependency graph with forward and reverse edges"""

    def __init__(self):
        self.graph: Dict[str, List[str]] = {}  # A -> [B, C] means A depends on B and C
        self.reverse_graph: Dict[str, List[str]] = {}  # B -> [A] means A depends on B
        self.nodes: Set[str] = set()


class HierarchicalLayoutEngine:
    """Computes hierarchical layers for entities based on dependencies"""

    @staticmethod
    def parse_dsl(dsl_text: str) -> Tuple[Set[str], List[Tuple[str, str]]]:
        """
        Parse DSL text to extract entities and relationships.

        Returns:
            - entities: Set of entity names
            - relationships: List of (from_entity, to_entity) tuples
        """
        entities = set()
        relationships = []

        lines = dsl_text.strip().split('\n')

        for line in lines:
            # Remove comments
            line = line.split('//')[0].strip()

            if not line:
                continue

            # Parse relationship patterns
            # Format 1: entity1.field > entity2.field (many-to-one)
            # Format 2: entity1.field - entity2.field (one-to-one)
            # Format 3: entity1.field < entity2.field (reversed many-to-one)

            # Match patterns like: posts.authorId > users.id
            match = re.match(r'(\w+)\.\w+\s*([><-])\s*(\w+)\.\w+', line)

            if match:
                entity1 = match.group(1)
                operator = match.group(2)
                entity2 = match.group(3)

                entities.add(entity1)
                entities.add(entity2)

                # Determine dependency direction
                # A > B means "A depends on B"
                # A < B means "B depends on A" (reversed)
                # A - B means "A depends on B" (one-to-one, treat as dependency)

                if operator == '>' or operator == '-':
                    # entity1 depends on entity2
                    relationships.append((entity1, entity2))
                elif operator == '<':
                    # entity2 depends on entity1 (reversed)
                    relationships.append((entity2, entity1))

        return entities, relationships

    @staticmethod
    def build_dependency_graph(entities: Set[str], relationships: List[Tuple[str, str]]) -> DependencyGraph:
        """
        Build dependency graph from entities and relationships.

        Args:
            entities: Set of entity names
            relationships: List of (from_entity, to_entity) tuples where from depends on to
        """
        dep_graph = DependencyGraph()

        # Add all entities as nodes
        dep_graph.nodes = entities.copy()

        # Build edges from relationships
        for from_entity, to_entity in relationships:
            # A → B means "A depends on B"
            if from_entity not in dep_graph.graph:
                dep_graph.graph[from_entity] = []
            dep_graph.graph[from_entity].append(to_entity)

            # Reverse: B is depended upon by A
            if to_entity not in dep_graph.reverse_graph:
                dep_graph.reverse_graph[to_entity] = []
            dep_graph.reverse_graph[to_entity].append(from_entity)

        return dep_graph

    @staticmethod
    def compute_layers(dep_graph: DependencyGraph) -> Dict[int, List[str]]:
        """
        Compute hierarchical layers using inverted algorithm.

        Algorithm:
        - Roots (don't depend on anyone) → Layer 0 initially
        - Leaves (depend on others) → Higher layers
        - Layer = max(layer of dependencies) + 1
        - Then invert: roots go to rightmost layer

        Returns:
            Dictionary mapping layer number to list of entity names
        """
        layer_of: Dict[str, int] = {}
        visited: Set[str] = set()

        def compute_layer(node: str) -> int:
            """Recursively compute layer for a node"""
            # Already computed?
            if node in layer_of:
                return layer_of[node]

            # Cycle detection
            if node in visited:
                layer_of[node] = 0
                return 0

            visited.add(node)

            # Get all nodes that this node depends on
            dependencies = dep_graph.graph.get(node, [])

            if not dependencies:
                # Root: doesn't depend on anyone - initially layer 0
                layer_of[node] = 0
            else:
                # Layer = max(layer of dependencies) + 1
                max_dep_layer = max(compute_layer(dep) for dep in dependencies)
                layer_of[node] = max_dep_layer + 1

            visited.remove(node)
            return layer_of[node]

        # Compute layers for all nodes
        for node in dep_graph.nodes:
            compute_layer(node)

        # Invert layers: nodes with highest layer should be rightmost
        max_layer = max(layer_of.values()) if layer_of else 0

        # Invert: layer N becomes (maxLayer - N)
        for node in layer_of:
            layer_of[node] = max_layer - layer_of[node]

        # Group nodes by layer
        layers: Dict[int, List[str]] = {}
        for node, layer in layer_of.items():
            if layer not in layers:
                layers[layer] = []
            layers[layer].append(node)

        return layers


def main():
    """Main function to test the hierarchical layout algorithm"""

    # Example DSL input
    dsl_text = """
// ============================================
// RELATIONSHIPS
// ============================================

// One-to-One: Users to Profiles
// Each user has exactly one profile
users.profileId - profiles.id

// Many-to-One: Posts to Users
// Many posts belong to one author (user)
posts.authorId > users.id

// Many-to-One: Users to Teams
// Many users belong to one team
users.id > teams.id

// Many-to-One: Comments to Posts
// Many comments belong to one post
comments.postId > posts.id

// Many-to-One: Comments to Users
// Many comments belong to one user
tags.userId > users.id

// Many-to-Many: Posts to Tags (through post_tags)
// Posts can have many tags, tags can belong to many posts
post_tags.postId > posts.id
post_tags.tagId > tags.id

// Alternative entity-level syntax (defaults to id fields):
// users > teams
// This is equivalent to: users.id > teams.id
user_roles.userId > users.id
user_roles.roleId > roles.id
role_permissions.roleId > roles.id
role_permissions.permissionId > permissions.id
projects.teamId > teams.id
milestones.projectId > projects.id
attachments.postId > posts.id
notifications.userId > users.id
user_projects.userId > users.id
user_projects.projectId > projects.id
projects.id < posts.authorId
comments.userId > users.id
"""

    # Parse DSL
    print("[*] Parsing DSL...")
    entities, relationships = HierarchicalLayoutEngine.parse_dsl(dsl_text)

    print(f"\n[+] Found {len(entities)} entities:")
    for entity in sorted(entities):
        print(f"   - {entity}")

    print(f"\n[+] Found {len(relationships)} relationships:")
    for from_e, to_e in relationships:
        print(f"   - {from_e} -> {to_e}")

    # Build dependency graph
    print("\n[*] Building dependency graph...")
    dep_graph = HierarchicalLayoutEngine.build_dependency_graph(entities, relationships)

    # Compute layers
    print("\n[*] Computing hierarchical layers...")
    layers = HierarchicalLayoutEngine.compute_layers(dep_graph)

    # Display results
    print(f"\n" + "="*60)
    print(f"HIERARCHICAL LAYOUT RESULTS")
    print("="*60)
    print(f"\n[!] Number of layers: {len(layers)}")
    print("\n[>] Layers (Left -> Right):\n")

    for layer_num in sorted(layers.keys()):
        entities_in_layer = layers[layer_num]
        print(f"Layer {layer_num}: {', '.join(sorted(entities_in_layer))}")

    print("\n" + "="*60)

    # Additional statistics
    print("\n[i] Statistics:")
    print(f"   - Total entities: {len(entities)}")
    print(f"   - Total relationships: {len(relationships)}")
    print(f"   - Number of layers: {len(layers)}")
    print(f"   - Average entities per layer: {len(entities) / len(layers):.1f}")

    # Show which entities have dependencies
    print("\n[?] Dependency Analysis:")
    roots = [e for e in entities if e not in dep_graph.graph or not dep_graph.graph[e]]
    leaves = [e for e in entities if e not in dep_graph.reverse_graph or not dep_graph.reverse_graph[e]]

    print(f"   - Root entities (don't depend on others): {len(roots)}")
    for root in sorted(roots):
        print(f"     * {root}")

    print(f"\n   - Leaf entities (others don't depend on them): {len(leaves)}")
    for leaf in sorted(leaves):
        print(f"     * {leaf}")


if __name__ == "__main__":
    main()
