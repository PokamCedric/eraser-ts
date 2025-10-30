"""
Test script for clustering and pivot analysis with modular imports
"""

from layer_classification_orchestrator import LayerClassificationOrchestrator
from test_data import relations_input_crm


def analyze_clusters_and_pivots(orchestrator):
    """
    Analyze and display clusters with pivot detection
    """
    print("\n" + "="*80)
    print("CLUSTER AND PIVOT ANALYSIS")
    print("="*80)

    layers = orchestrator.horizontal_layers
    relations = orchestrator.relations

    # Build layer index
    layer_of = {}
    for layer_idx, layer in enumerate(layers):
        for entity in layer:
            layer_of[entity] = layer_idx

    # Analyze each pair of consecutive layers
    for layer_idx in range(len(layers) - 1):
        current_layer = layers[layer_idx]
        next_layer = layers[layer_idx + 1]

        print(f"\n{'='*80}")
        print(f"LAYER {layer_idx} -> LAYER {layer_idx + 1}")
        print(f"{'='*80}")

        # Find direct predecessors for each entity in next layer
        direct_predecessors = {}
        for target in next_layer:
            predecessors = [
                left for left, right in relations
                if right == target and left in current_layer
            ]
            direct_predecessors[target] = predecessors

        # Display clusters
        print(f"\nDirect Predecessor Groups (Clusters):")
        print(f"Current Layer {layer_idx}: {current_layer}")
        print(f"Next Layer {layer_idx + 1}: {next_layer}")
        print()

        for target in next_layer:
            if direct_predecessors[target]:
                print(f"  Cluster-{target}-direct: {direct_predecessors[target]} -> [{target}]")

        # Detect pivots (entities in multiple clusters)
        entity_to_targets = {}
        for entity in current_layer:
            targets = [
                right for left, right in relations
                if left == entity and right in next_layer
            ]
            entity_to_targets[entity] = targets

        pivots = {
            entity: targets
            for entity, targets in entity_to_targets.items()
            if len(targets) > 1
        }

        if pivots:
            print(f"\n  PIVOTS DETECTED: {len(pivots)} pivot(s)")
            for entity, targets in pivots.items():
                cluster_names = [f"Cluster-{t}-direct" for t in targets]
                print(f"    {entity} -> {targets}")
                print(f"      Belongs to: {', '.join(cluster_names)}")
                print(f"      Acts as BRIDGE between these clusters")
                print(f"      Impact: Connects {len(targets)} different clusters")
        else:
            print(f"\n  No pivots detected in this layer")


def compare_before_after(orchestrator):
    """
    Compare layer order before and after vertical optimization
    """
    print("\n" + "="*80)
    print("BEFORE/AFTER VERTICAL OPTIMIZATION")
    print("="*80)

    for layer_idx in range(len(orchestrator.horizontal_layers)):
        before = orchestrator.horizontal_layers[layer_idx]
        after = orchestrator.final_layers[layer_idx]

        print(f"\nLayer {layer_idx}:")
        print(f"  Before: {before}")
        print(f"  After:  {after}")

        if before != after:
            print(f"  [REORDERED]")
        else:
            print(f"  [UNCHANGED]")


def print_summary_statistics(orchestrator):
    """
    Print overall statistics about the clustering and optimization
    """
    print("\n" + "="*80)
    print("SUMMARY STATISTICS")
    print("="*80)

    layers = orchestrator.horizontal_layers
    relations = orchestrator.relations

    # Count total pivots
    total_pivots = 0
    for layer_idx in range(len(layers) - 1):
        current_layer = layers[layer_idx]
        next_layer = layers[layer_idx + 1]

        entity_to_targets = {}
        for entity in current_layer:
            targets = [
                right for left, right in relations
                if left == entity and right in next_layer
            ]
            entity_to_targets[entity] = targets

        pivots = {
            entity: targets
            for entity, targets in entity_to_targets.items()
            if len(targets) > 1
        }
        total_pivots += len(pivots)

    # Count reordered layers
    reordered_count = 0
    for layer_idx in range(len(orchestrator.horizontal_layers)):
        before = orchestrator.horizontal_layers[layer_idx]
        after = orchestrator.final_layers[layer_idx]
        if before != after:
            reordered_count += 1

    print(f"\nTotal entities: {len([e for layer in layers for e in layer])}")
    print(f"Total relations: {len(relations)}")
    print(f"Total layers: {len(layers)}")
    print(f"Total pivots detected: {total_pivots}")
    print(f"Layers reordered: {reordered_count}/{len(layers)}")
    print(f"Layers unchanged: {len(layers) - reordered_count}/{len(layers)}")

    # Average cluster size
    cluster_sizes = []
    for layer_idx in range(len(layers) - 1):
        current_layer = layers[layer_idx]
        next_layer = layers[layer_idx + 1]

        for target in next_layer:
            predecessors = [
                left for left, right in relations
                if right == target and left in current_layer
            ]
            if predecessors:
                cluster_sizes.append(len(predecessors))

    if cluster_sizes:
        avg_cluster_size = sum(cluster_sizes) / len(cluster_sizes)
        print(f"\nAverage cluster size: {avg_cluster_size:.2f} entities")
        print(f"Smallest cluster: {min(cluster_sizes)} entities")
        print(f"Largest cluster: {max(cluster_sizes)} entities")


def main():
    print("="*80)
    print("CLUSTER AND PIVOT ANALYSIS TEST")
    print("="*80)

    # Run orchestrator
    orchestrator = LayerClassificationOrchestrator(
        relations_input_crm,
        debug=False
    )
    final_layers = orchestrator.run()

    # Analyze clusters and pivots
    analyze_clusters_and_pivots(orchestrator)

    # Compare before/after
    compare_before_after(orchestrator)

    # Summary statistics
    print_summary_statistics(orchestrator)

    print("\n" + "="*80)
    print("ANALYSIS COMPLETE")
    print("="*80)


if __name__ == "__main__":
    main()
