"""
Phase 4: Vertical Order Optimizer

Optimizes vertical order within each layer to minimize edge crossings.
Groups entities by their targets in the next layer.
"""

from typing import List, Tuple
from collections import defaultdict


class VerticalOrderOptimizer:
    """
    Optimizes the vertical order (Y-axis) of entities within each layer
    to minimize edge crossings by grouping entities with same targets.
    """

    def __init__(self, relations: List[Tuple[str, str]]):
        self.relations = relations

    def optimize(
        self,
        horizontal_layers: List[List[str]],
        entity_order: List[str]
    ) -> List[List[str]]:
        """
        Optimize vertical order within each layer

        Args:
            horizontal_layers: Initial layer assignments from horizontal classifier
            entity_order: Global entity ordering (for tie-breaking)

        Returns: Optimized layers with reordered entities
        """
        optimized_layers = [layer[:] for layer in horizontal_layers]

        # Process layers from right to left (start with last layer)
        # Last layer: order by entity_order
        last_idx = len(optimized_layers) - 1
        if last_idx >= 0:
            last_layer = optimized_layers[last_idx]
            ordered_last = [e for e in entity_order if e in last_layer]
            # Add any remaining (shouldn't happen, but safety)
            for e in last_layer:
                if e not in ordered_last:
                    ordered_last.append(e)
            optimized_layers[last_idx] = ordered_last

        # Other layers: sort by targets in next layer
        for layer_idx in range(len(optimized_layers) - 2, -1, -1):
            current_layer = optimized_layers[layer_idx]
            next_layer = optimized_layers[layer_idx + 1]

            reordered = self._sort_layer_by_targets(
                current_layer,
                next_layer,
                entity_order
            )
            optimized_layers[layer_idx] = reordered

        return optimized_layers

    def _sort_layer_by_targets(
        self,
        current_layer: List[str],
        next_layer: List[str],
        entity_order: List[str]
    ) -> List[str]:
        """
        Sort layer by grouping entities with same targets in next layer

        Algorithm:
        1. Find what each entity points to in next layer
        2. Determine primary target (first in next_layer order)
        3. Group entities by primary target
        4. Order groups by target position in next_layer
        5. Within each group, sort by entity_order
        """
        # Find targets for each entity in current layer
        entity_to_targets = {}
        for entity in current_layer:
            targets = [
                right for left, right in self.relations
                if left == entity and right in next_layer
            ]
            entity_to_targets[entity] = targets

        # Determine primary target for each entity
        # Primary target = first target in next_layer order
        entity_to_primary_target = {}
        for entity, targets in entity_to_targets.items():
            if targets:
                # Primary target is the first one appearing in next_layer
                primary = min(targets, key=lambda t: next_layer.index(t))
                entity_to_primary_target[entity] = primary
            else:
                # No target: assign None (will be placed last)
                entity_to_primary_target[entity] = None

        # Group entities by primary target
        target_groups = defaultdict(list)
        for entity in current_layer:
            primary = entity_to_primary_target[entity]
            target_groups[primary].append(entity)

        # Sort each group by entity_order
        for target in target_groups:
            target_groups[target].sort(key=lambda e: entity_order.index(e) if e in entity_order else float('inf'))

        # Build final order: groups ordered by target position in next_layer
        reordered = []

        # First: entities with targets (ordered by target position)
        for target in next_layer:
            if target in target_groups:
                reordered.extend(target_groups[target])

        # Last: entities with no targets
        if None in target_groups:
            reordered.extend(target_groups[None])

        return reordered
