"""
Phase 4 Prep: Direct Predecessor Analyzer

Analyzes direct predecessors (distance = 1 only) for vertical alignment.
"""

from typing import List, Tuple, Dict, Set


class DirectPredecessorAnalyzer:
    """
    Analyzes direct predecessors (distance = 1 only)
    """

    @staticmethod
    def compute_direct_predecessors(
        layers: List[List[str]],
        relations: List[Tuple[str, str]]
    ) -> Dict[str, Set[str]]:
        """
        Compute direct predecessors for each entity

        Direct predecessor: entity at distance exactly 1 (immediate neighbor)

        Returns: {entity: {direct_predecessors}}
        """
        # Build layer index
        layer_of = {}
        for layer_idx, layer in enumerate(layers):
            for entity in layer:
                layer_of[entity] = layer_idx

        # Find direct predecessors (layer distance = 1)
        direct_predecessors = {}
        for entity in layer_of:
            direct_predecessors[entity] = set()

        for left, right in relations:
            if left in layer_of and right in layer_of:
                left_layer = layer_of[left]
                right_layer = layer_of[right]

                # Direct if distance = 1 layer
                if right_layer - left_layer == 1:
                    direct_predecessors[right].add(left)

        return direct_predecessors
