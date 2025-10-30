"""
Test script for algo13 vertical alignment with detailed cluster/pivot analysis
Shows how entities are grouped and pivots are detected
"""

import algo13

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

        # Display clusters (using original terminology from user)
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

                # Show impact of this pivot
                affected_clusters = len(targets)
                print(f"      Impact: Connects {affected_clusters} different clusters")
        else:
            print(f"\n  No pivots detected in this layer")

        # Show final vertical order
        final_current = orchestrator.final_layers[layer_idx]
        final_next = orchestrator.final_layers[layer_idx + 1]

        print(f"\nFinal Vertical Order:")
        print(f"  Layer {layer_idx}: {final_current}")
        print(f"  Layer {layer_idx + 1}: {final_next}")

def analyze_entity_grouping(orchestrator):
    """
    Show how entities are grouped by their primary targets
    """
    print("\n" + "="*80)
    print("ENTITY GROUPING BY PRIMARY TARGET")
    print("="*80)

    layers = orchestrator.final_layers
    relations = orchestrator.relations

    for layer_idx in range(len(layers) - 1):
        current_layer = layers[layer_idx]
        next_layer = layers[layer_idx + 1]

        print(f"\nLayer {layer_idx} grouped by targets in Layer {layer_idx + 1}:")
        print(f"  Current: {current_layer}")
        print(f"  Next:    {next_layer}")

        # Find what each entity in current layer points to
        entity_to_targets = {}
        for entity in current_layer:
            targets = [
                right for left, right in relations
                if left == entity and right in next_layer
            ]
            entity_to_targets[entity] = targets

        # Group entities by primary target
        from collections import defaultdict
        target_groups = defaultdict(list)

        for entity in current_layer:
            targets = entity_to_targets[entity]
            if targets:
                # Primary target is the first one in next_layer order
                primary = min(targets, key=lambda t: next_layer.index(t))
                target_groups[primary].append(entity)
            else:
                target_groups[None].append(entity)

        # Display grouping
        print(f"\n  Grouping:")
        for target in next_layer:
            if target in target_groups:
                group = target_groups[target]
                print(f"    Target [{target}]: {group}")

        if None in target_groups:
            print(f"    No target: {target_groups[None]}")

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

def main():
    print("="*80)
    print("ALGO13 - CLUSTER AND PIVOT ANALYSIS TEST")
    print("="*80)

    # Run orchestrator
    orchestrator = algo13.LayerClassificationOrchestrator(
        algo13.relations_input_crm,
        debug=False  # Disable default logging
    )
    final_layers = orchestrator.run()

    # Analyze clusters and pivots
    analyze_clusters_and_pivots(orchestrator)

    # Show entity grouping
    analyze_entity_grouping(orchestrator)

    # Compare before/after
    compare_before_after(orchestrator)

    # Summary statistics
    print_summary_statistics(orchestrator)

    print("\n" + "="*80)
    print("ANALYSIS COMPLETE")
    print("="*80)

if __name__ == "__main__":
    main()
