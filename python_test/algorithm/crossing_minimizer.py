"""
Crossing Minimizer

Uses barycenter method to minimize edge crossings between adjacent layers.

The barycenter method works by calculating the average position of neighbors
for each entity, then sorting entities by this average.

This is applied iteratively in both directions (left-to-right and right-to-left)
to minimize crossings across all layer pairs.
"""

from typing import List, Tuple, Dict


class CrossingMinimizer:
    """
    Minimizes edge crossings using the barycenter heuristic
    """

    def __init__(self, relations: List[Tuple[str, str]]):
        """
        Initialize crossing minimizer

        Args:
            relations: List of (left, right) tuples
        """
        self.relations = relations

        # Build adjacency maps for fast lookup
        self.forward_edges = {}  # entity -> set of targets
        self.backward_edges = {}  # entity -> set of sources

        for left, right in relations:
            if left not in self.forward_edges:
                self.forward_edges[left] = set()
            self.forward_edges[left].add(right)

            if right not in self.backward_edges:
                self.backward_edges[right] = set()
            self.backward_edges[right].add(left)

    def minimize_crossings(
        self,
        layers: List[List[str]],
        max_iterations: int = 4
    ) -> List[List[str]]:
        """
        Apply barycenter method to minimize crossings

        Args:
            layers: Initial layer assignments
            max_iterations: Number of sweeps to perform

        Returns:
            Layers with minimized crossings
        """
        print("\n" + "="*80)
        print("PHASE 5: CROSSING MINIMIZATION (BARYCENTER METHOD)")
        print("="*80)

        if len(layers) <= 1:
            return layers

        # Deep copy
        current_layers = [layer[:] for layer in layers]

        # Count initial crossings
        initial_crossings = self._count_total_crossings(current_layers)
        print(f"\nInitial crossings: {initial_crossings}")

        best_layers = [layer[:] for layer in current_layers]
        best_crossings = initial_crossings

        # Iterative improvement
        for iteration in range(max_iterations):
            print(f"\n--- Iteration {iteration + 1} ---")

            # Forward pass (left to right)
            for layer_idx in range(1, len(current_layers)):
                prev_layer = current_layers[layer_idx - 1]
                current_layer = current_layers[layer_idx]

                # Reorder current layer based on barycenter of previous layer
                reordered = self._reorder_by_barycenter_backward(
                    current_layer,
                    prev_layer
                )
                current_layers[layer_idx] = reordered

            # Backward pass (right to left)
            for layer_idx in range(len(current_layers) - 2, -1, -1):
                current_layer = current_layers[layer_idx]
                next_layer = current_layers[layer_idx + 1]

                # Reorder current layer based on barycenter of next layer
                reordered = self._reorder_by_barycenter_forward(
                    current_layer,
                    next_layer
                )
                current_layers[layer_idx] = reordered

            # Count crossings after this iteration
            crossings = self._count_total_crossings(current_layers)
            print(f"Crossings after iteration {iteration + 1}: {crossings}")

            # Track best solution
            if crossings < best_crossings:
                best_crossings = crossings
                best_layers = [layer[:] for layer in current_layers]
                print(f"  [IMPROVED] New best: {best_crossings} crossings")

            # Early exit if no crossings
            if crossings == 0:
                print("\n[SUCCESS] Zero crossings achieved!")
                break

        print(f"\n" + "="*80)
        print(f"CROSSING MINIMIZATION COMPLETE")
        print(f"Final crossings: {best_crossings} (reduced from {initial_crossings})")
        print("="*80)

        return best_layers

    def _reorder_by_barycenter_backward(
        self,
        current_layer: List[str],
        prev_layer: List[str]
    ) -> List[str]:
        """
        Reorder current layer based on barycenter of connections from prev_layer

        Barycenter = average position of source entities in prev_layer
        """
        barycenters = {}

        for entity in current_layer:
            # Find sources in prev_layer
            sources = []
            if entity in self.backward_edges:
                for source in self.backward_edges[entity]:
                    if source in prev_layer:
                        sources.append(source)

            if sources:
                # Calculate barycenter (average position in prev_layer)
                positions = [prev_layer.index(s) for s in sources]
                barycenter = sum(positions) / len(positions)
            else:
                # No connections: place at end
                barycenter = float('inf')

            barycenters[entity] = barycenter

        # Sort by barycenter
        reordered = sorted(current_layer, key=lambda e: (barycenters[e], current_layer.index(e)))

        return reordered

    def _reorder_by_barycenter_forward(
        self,
        current_layer: List[str],
        next_layer: List[str]
    ) -> List[str]:
        """
        Reorder current layer based on barycenter of connections to next_layer

        Barycenter = average position of target entities in next_layer
        """
        barycenters = {}

        for entity in current_layer:
            # Find targets in next_layer
            targets = []
            if entity in self.forward_edges:
                for target in self.forward_edges[entity]:
                    if target in next_layer:
                        targets.append(target)

            if targets:
                # Calculate barycenter (average position in next_layer)
                positions = [next_layer.index(t) for t in targets]
                barycenter = sum(positions) / len(positions)
            else:
                # No connections: place at end
                barycenter = float('inf')

            barycenters[entity] = barycenter

        # Sort by barycenter
        reordered = sorted(current_layer, key=lambda e: (barycenters[e], current_layer.index(e)))

        return reordered

    def _count_crossings_between_layers(
        self,
        left_layer: List[str],
        right_layer: List[str]
    ) -> int:
        """
        Count edge crossings between two adjacent layers
        """
        crossings = 0

        # Get all edges between these layers
        edges = []
        for left_idx, left_entity in enumerate(left_layer):
            if left_entity in self.forward_edges:
                for right_entity in self.forward_edges[left_entity]:
                    if right_entity in right_layer:
                        right_idx = right_layer.index(right_entity)
                        edges.append((left_idx, right_idx))

        # Count crossings: for each pair of edges, check if they cross
        for i in range(len(edges)):
            for j in range(i + 1, len(edges)):
                left1, right1 = edges[i]
                left2, right2 = edges[j]

                # Edges cross if their order is inverted
                if (left1 < left2 and right1 > right2) or (left1 > left2 and right1 < right2):
                    crossings += 1

        return crossings

    def _count_total_crossings(self, layers: List[List[str]]) -> int:
        """Count total crossings across all adjacent layer pairs"""
        total = 0
        for i in range(len(layers) - 1):
            crossings = self._count_crossings_between_layers(layers[i], layers[i + 1])
            total += crossings
        return total
