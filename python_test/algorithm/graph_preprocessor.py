"""
Phase 1-2: Graph Preprocessor

Preprocesses raw relations:
- Deduplication (removes bidirectional duplicates)
- Entity ordering by connectivity
"""

from typing import List, Tuple
from collections import defaultdict


class GraphPreprocessor:
    """
    Preprocesses graph relations before layer classification
    """

    @staticmethod
    def deduplicate(relations: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Remove duplicate relations based on entity pairs (order-agnostic)

        This matches algo10's deduplication logic:
        - (A, B) and (A, B) -> keep one
        - (A, B) and (B, A) -> keep one (bidirectional treated as same)

        Example: users -> profiles AND profiles -> users
                 Only the first one is kept
        """
        seen_pairs = {}
        unique_relations = []

        for a, b in relations:
            pair_key = frozenset({a, b})  # Order-agnostic
            if pair_key not in seen_pairs:
                seen_pairs[pair_key] = (a, b)
                unique_relations.append((a, b))

        return unique_relations

    @staticmethod
    def build_entity_order(relations: List[Tuple[str, str]]) -> List[str]:
        """
        Build entity processing order based on connectivity

        Algorithm:
        1. Sort by connection count (descending)
        2. Breadth-first expansion from most connected
        3. Tie-breaker: position in connectivity ranking
        """
        # Count connections per entity
        connection_count = defaultdict(int)
        for a, b in relations:
            connection_count[a] += 1
            connection_count[b] += 1

        # Rule 1: Sort by connectivity
        connectivity_ranking = sorted(
            connection_count.keys(),
            key=lambda x: connection_count[x],
            reverse=True
        )

        # Start with most connected entity
        entity_order = []
        frontier = []

        if connectivity_ranking:
            entity_order.append(connectivity_ranking[0])

            # Initialize frontier with neighbors of first entity
            for a, b in relations:
                if a == entity_order[0] and b not in frontier:
                    frontier.append(b)
                if b == entity_order[0] and a not in frontier:
                    frontier.append(a)

        # Rule 2: Breadth-first expansion with connectivity tie-breaker
        while len(entity_order) < len(connectivity_ranking):
            candidates = [e for e in frontier if e not in entity_order]

            if not candidates:
                # No more in frontier, pick from unvisited
                candidates = [e for e in connectivity_ranking if e not in entity_order]
                if not candidates:
                    break

            # Rule 3: Tie-breaker by connectivity ranking
            next_entity = max(
                candidates,
                key=lambda e: (
                    connection_count[e],
                    -connectivity_ranking.index(e)
                )
            )

            entity_order.append(next_entity)

            # Expand frontier with neighbors
            for a, b in relations:
                if a == next_entity and b not in frontier and b not in entity_order:
                    frontier.append(b)
                if b == next_entity and a not in frontier and a not in entity_order:
                    frontier.append(a)

        return entity_order
