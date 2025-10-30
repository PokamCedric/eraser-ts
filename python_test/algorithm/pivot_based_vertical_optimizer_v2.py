"""
Pivot-Based Vertical Order Optimizer V2

Uses **source-aware** clustering: entities are grouped not only by their targets,
but also by where they come from in the previous layer.

Key innovation:
- Track "chains": Layer N-1 entity -> Layer N entity -> Layer N+1 entity
- Entities in Layer N are ordered to respect the order of their sources in Layer N-1

Example:
  Layer 2: [orders, carts, ...]
  Layer 3: [order_items (from orders), cart_items (from carts), ...]

Even if both order_items and cart_items point to the same target (products),
they should be ordered according to their sources (orders before carts).
"""

from typing import List, Tuple, Dict, Set


class PivotBasedVerticalOptimizerV2:
    """
    Source-aware vertical optimizer
    """

    def __init__(self, relations: List[Tuple[str, str]]):
        self.relations = relations
        # Build reverse relation map (target -> sources)
        self.reverse_relations = {}
        for left, right in relations:
            if right not in self.reverse_relations:
                self.reverse_relations[right] = set()
            self.reverse_relations[right].add(left)

    def optimize(
        self,
        horizontal_layers: List[List[str]],
        entity_order: List[str]
    ) -> List[List[str]]:
        """
        Optimize vertical order using source-aware pivot-based arrangement
        """
        print("\n" + "="*80)
        print("PHASE 4: SOURCE-AWARE PIVOT-BASED VERTICAL ALIGNMENT (Y-AXIS)")
        print("="*80)

        if len(horizontal_layers) == 0:
            return horizontal_layers

        # Deep copy layers
        layers = [layer[:] for layer in horizontal_layers]

        # Last layer: order by entity_order
        last_idx = len(layers) - 1
        layers[last_idx] = self._order_by_entity_order(layers[last_idx], entity_order)

        print(f"\nLast layer {last_idx}: ordered by connectivity")
        print(f"  {layers[last_idx]}")

        # Process other layers from right to left
        for layer_idx in range(len(layers) - 2, -1, -1):
            current_layer = layers[layer_idx]
            next_layer = layers[layer_idx + 1]
            prev_layer = layers[layer_idx - 1] if layer_idx > 0 else []

            print(f"\n--- Processing Layer {layer_idx} ---")

            # Order current layer using source-aware strategy
            ordered_layer = self._order_by_source_chains(
                current_layer,
                prev_layer,
                next_layer,
                entity_order
            )

            layers[layer_idx] = ordered_layer

        print("\n" + "="*80)
        print("VERTICAL OPTIMIZATION COMPLETE")
        print("="*80)

        return layers

    def _order_by_entity_order(self, layer: List[str], entity_order: List[str]) -> List[str]:
        """Order layer entities by global entity_order"""
        ordered = []
        for entity in entity_order:
            if entity in layer:
                ordered.append(entity)

        for entity in layer:
            if entity not in ordered:
                ordered.append(entity)

        return ordered

    def _order_by_source_chains(
        self,
        current_layer: List[str],
        prev_layer: List[str],
        next_layer: List[str],
        entity_order: List[str]
    ) -> List[str]:
        """
        Order current_layer by respecting source chains from prev_layer

        Strategy:
        1. For each entity in current_layer, find its sources in prev_layer
        2. Group entities by their primary source
        3. Order groups by prev_layer order
        4. Within each group, sort by next_layer targets, then entity_order
        """
        # Build source mapping: current_entity -> set of sources in prev_layer
        entity_sources = {}
        for entity in current_layer:
            sources = set()
            if entity in self.reverse_relations:
                for source in self.reverse_relations[entity]:
                    if source in prev_layer:
                        sources.add(source)
            entity_sources[entity] = sources

        # Build target mapping: current_entity -> set of targets in next_layer
        entity_targets = {}
        for entity in current_layer:
            targets = set()
            for left, right in self.relations:
                if left == entity and right in next_layer:
                    targets.add(right)
            entity_targets[entity] = targets

        print(f"\nSource chains (Layer {prev_layer if prev_layer else '[]'} -> current -> {next_layer}):")

        # Detect pivots (entities with multiple targets)
        pivots = {e: entity_targets[e] for e in current_layer if len(entity_targets[e]) > 1}

        if pivots:
            print(f"\nPivots detected: {len(pivots)}")
            for pivot, targets in pivots.items():
                print(f"  [{pivot}] connects {len(targets)} targets: {sorted(targets)}")

        # Group entities by primary source
        source_groups = {}  # source -> list of entities
        no_source_entities = []

        for entity in current_layer:
            sources = entity_sources[entity]

            if not sources:
                no_source_entities.append(entity)
                continue

            # Primary source = first source in prev_layer order
            primary_source = min(
                sources,
                key=lambda s: prev_layer.index(s) if s in prev_layer else float('inf')
            )

            if primary_source not in source_groups:
                source_groups[primary_source] = []
            source_groups[primary_source].append(entity)

        # Order groups by prev_layer order
        ordered = []

        if prev_layer:
            for source in prev_layer:
                if source not in source_groups:
                    continue

                group = source_groups[source]

                # Sort group by target position in next_layer, then entity_order
                def sort_key(entity):
                    targets = entity_targets[entity]
                    if not targets:
                        target_idx = float('inf')
                    else:
                        target_idx = min(
                            next_layer.index(t) if t in next_layer else float('inf')
                            for t in targets
                        )

                    entity_idx = entity_order.index(entity) if entity in entity_order else float('inf')

                    return (target_idx, entity_idx)

                sorted_group = sorted(group, key=sort_key)

                # Print group info
                for entity in sorted_group:
                    sources_list = sorted(entity_sources[entity])
                    targets_list = sorted(entity_targets[entity])
                    pivot_marker = "*" if entity in pivots else ""
                    print(f"  [{entity}{pivot_marker}] from {sources_list} -> to {targets_list}")

                ordered.extend(sorted_group)

        # Add entities with no sources
        if no_source_entities:
            no_source_entities.sort(
                key=lambda e: entity_order.index(e) if e in entity_order else float('inf')
            )
            print(f"\n  Entities with no sources: {no_source_entities}")
            ordered.extend(no_source_entities)

        print(f"\nFinal order: {ordered}")

        return ordered
