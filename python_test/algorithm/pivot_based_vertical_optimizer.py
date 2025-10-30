"""
Pivot-Based Vertical Order Optimizer

Optimizes vertical order within each layer using direct clusters and pivot detection.

Key concepts:
- Direct Cluster: Entities at distance exactly 1 pointing to a target entity
- Pivot: Entity belonging to multiple direct clusters (creates bridge between clusters)
- Cluster Bridge: Connection between clusters via shared pivot

Algorithm:
1. For each layer (right to left), compute direct clusters from next layer
2. Detect pivots (entities in multiple clusters)
3. Use pivots to determine cluster ordering
4. Arrange entities by cluster groups
"""

from typing import List, Tuple, Dict, Set


class PivotBasedVerticalOptimizer:
    """
    Optimizes vertical ordering using cluster analysis and pivot detection
    """

    def __init__(self, relations: List[Tuple[str, str]]):
        """
        Initialize optimizer

        Args:
            relations: List of (left, right) tuples
        """
        self.relations = relations

    def optimize(
        self,
        horizontal_layers: List[List[str]],
        entity_order: List[str]
    ) -> List[List[str]]:
        """
        Optimize vertical order using pivot-based cluster arrangement

        Args:
            horizontal_layers: Initial layer assignments from X-alignment
            entity_order: Global entity ordering (for tie-breaking)

        Returns:
            Optimized layers with reordered entities
        """
        print("\n" + "="*80)
        print("PHASE 4: PIVOT-BASED VERTICAL ALIGNMENT (Y-AXIS)")
        print("="*80)

        if len(horizontal_layers) == 0:
            return horizontal_layers

        # Deep copy layers
        layers = [layer[:] for layer in horizontal_layers]

        # Process from right to left (last layer first)
        # Last layer: order by entity_order
        last_idx = len(layers) - 1
        layers[last_idx] = self._order_by_entity_order(layers[last_idx], entity_order)

        print(f"\nLast layer {last_idx}: ordered by connectivity")
        print(f"  {layers[last_idx]}")

        # Process other layers from right to left
        for layer_idx in range(len(layers) - 2, -1, -1):
            current_layer = layers[layer_idx]
            next_layer = layers[layer_idx + 1]

            print(f"\n--- Processing Layer {layer_idx} ---")

            # Compute direct clusters for this layer
            direct_clusters = self._compute_direct_clusters(current_layer, next_layer)

            # Detect pivots
            pivots = self._detect_pivots(current_layer, direct_clusters)

            # Arrange clusters using pivot bridges
            ordered_layer = self._arrange_by_clusters(
                current_layer,
                next_layer,
                direct_clusters,
                pivots,
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

        # Add any remaining entities not in entity_order
        for entity in layer:
            if entity not in ordered:
                ordered.append(entity)

        return ordered

    def _compute_direct_clusters(
        self,
        current_layer: List[str],
        next_layer: List[str]
    ) -> Dict[str, Set[str]]:
        """
        Compute direct clusters: for each entity in next_layer,
        find all entities in current_layer pointing directly to it

        Returns:
            Map of target_entity -> set of source entities (cluster members)
        """
        direct_clusters = {target: set() for target in next_layer}

        for left, right in self.relations:
            if left in current_layer and right in next_layer:
                direct_clusters[right].add(left)

        # Filter out empty clusters
        direct_clusters = {k: v for k, v in direct_clusters.items() if len(v) > 0}

        print(f"\nDirect clusters from layer -> next layer:")
        for target, sources in direct_clusters.items():
            print(f"  Cluster-{target}-direct: {sorted(sources)} -> [{target}]")

        return direct_clusters

    def _detect_pivots(
        self,
        current_layer: List[str],
        direct_clusters: Dict[str, Set[str]]
    ) -> Dict[str, Set[str]]:
        """
        Detect pivot entities: entities belonging to multiple clusters

        Returns:
            Map of pivot_entity -> set of target entities it connects to
        """
        entity_to_targets = {}

        for target, members in direct_clusters.items():
            for member in members:
                if member not in entity_to_targets:
                    entity_to_targets[member] = set()
                entity_to_targets[member].add(target)

        # Pivots are entities with multiple targets
        pivots = {
            entity: targets
            for entity, targets in entity_to_targets.items()
            if len(targets) > 1
        }

        if pivots:
            print(f"\nPivots detected: {len(pivots)}")
            for pivot, targets in pivots.items():
                print(f"  [{pivot}] connects {len(targets)} clusters: {sorted(targets)}")
        else:
            print("\nNo pivots detected")

        return pivots

    def _arrange_by_clusters(
        self,
        current_layer: List[str],
        next_layer: List[str],
        direct_clusters: Dict[str, Set[str]],
        pivots: Dict[str, Set[str]],
        entity_order: List[str]
    ) -> List[str]:
        """
        Arrange entities by cluster groups, respecting pivot bridges

        Strategy:
        1. Group clusters that share pivots (pivot-connected groups)
        2. Order groups to minimize crossings
        3. Within each group, follow next_layer order
        4. Pivots appear only once, at the bridge position
        """
        # Build cluster groups connected by pivots
        cluster_groups = self._build_pivot_connected_groups(direct_clusters, pivots, next_layer)

        ordered = []
        placed = set()

        print(f"\nArranging entities by pivot-connected cluster groups...")

        for group_idx, cluster_group in enumerate(cluster_groups):
            print(f"\n  Group {group_idx + 1}: targets {cluster_group}")

            # Collect all entities in this group
            group_entities_set = set()
            for target in cluster_group:
                if target in direct_clusters:
                    group_entities_set.update(direct_clusters[target])

            # Remove already placed entities from other groups
            group_entities_set = group_entities_set - placed

            # Sort by target order in next_layer, then by entity_order
            # This ensures entities are grouped by their targets
            def sort_key(entity):
                # Find first target this entity points to
                first_target = None
                first_target_idx = float('inf')
                for target in cluster_group:
                    if target in direct_clusters and entity in direct_clusters[target]:
                        target_idx = next_layer.index(target) if target in next_layer else float('inf')
                        if target_idx < first_target_idx:
                            first_target_idx = target_idx
                            first_target = target

                # Secondary sort by entity_order
                entity_idx = entity_order.index(entity) if entity in entity_order else float('inf')

                return (first_target_idx, entity_idx)

            group_entities = sorted(list(group_entities_set), key=sort_key)

            # Show which clusters each entity belongs to
            entity_to_targets = {}
            for entity in group_entities:
                entity_to_targets[entity] = []
                for target in cluster_group:
                    if target in direct_clusters and entity in direct_clusters[target]:
                        entity_to_targets[entity].append(target)

            # Print cluster membership
            for entity in group_entities:
                targets = entity_to_targets[entity]
                if entity in pivots:
                    print(f"    [{entity}*] -> {targets}  (pivot)")
                else:
                    print(f"    [{entity}] -> {targets}")

            ordered.extend(group_entities)
            placed.update(group_entities)

        # Add any remaining entities (those with no targets in next layer)
        remaining = [e for e in current_layer if e not in placed]
        if remaining:
            # Sort by entity_order
            remaining_sorted = sorted(
                remaining,
                key=lambda e: entity_order.index(e) if e in entity_order else float('inf')
            )
            print(f"\n  Unconnected entities: {remaining_sorted}")
            ordered.extend(remaining_sorted)

        print(f"\nFinal order: {ordered}")

        return ordered

    def _build_pivot_connected_groups(
        self,
        direct_clusters: Dict[str, Set[str]],
        pivots: Dict[str, Set[str]],
        next_layer: List[str]
    ) -> List[List[str]]:
        """
        Build groups of clusters connected by pivots

        Returns:
            List of cluster groups, where each group is a list of target entities
        """
        if not pivots:
            # No pivots: each cluster is its own group, following next_layer order
            return [[target] for target in next_layer if target in direct_clusters]

        # Build a graph of cluster connections via pivots
        cluster_connections = {}  # target -> set of connected targets

        for pivot, targets in pivots.items():
            targets_list = list(targets)
            for i, target1 in enumerate(targets_list):
                if target1 not in cluster_connections:
                    cluster_connections[target1] = set()
                for target2 in targets_list[i+1:]:
                    cluster_connections[target1].add(target2)
                    if target2 not in cluster_connections:
                        cluster_connections[target2] = set()
                    cluster_connections[target2].add(target1)

        # Find connected components (groups of clusters connected via pivots)
        visited = set()
        groups = []

        def dfs(target, group):
            if target in visited:
                return
            visited.add(target)
            group.append(target)
            if target in cluster_connections:
                for connected in cluster_connections[target]:
                    dfs(connected, group)

        # Process in next_layer order to preserve relative ordering
        for target in next_layer:
            if target in direct_clusters and target not in visited:
                group = []
                dfs(target, group)
                # Sort group by next_layer order
                group.sort(key=lambda t: next_layer.index(t))
                groups.append(group)

        print(f"\nPivot-connected groups: {len(groups)}")
        for idx, group in enumerate(groups):
            print(f"  Group {idx + 1}: {group}")

        return groups
