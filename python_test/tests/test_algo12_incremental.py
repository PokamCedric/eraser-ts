"""
Test script for algo12 incremental updates
Compares performance of:
1. Full recalculation (baseline algo10)
2. Incremental add_relation
3. Incremental remove_relation

Simulates real-time ERP visualization scenario
"""

import time
from collections import defaultdict
import algo12

# Test data
relations_input_crm = algo12.relations_input_crm

def extract_table_name(s):
    return s.split('.')[0].strip()

def parse_relations(relations_input):
    """Parse relations from DSL"""
    relations_raw = []
    for line in relations_input.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue

        if '<>' in line:
            parts = line.split('<>')
            a = extract_table_name(parts[0])
            b = extract_table_name(parts[1])
            relations_raw.append((a, b))
        elif '->' in line:
            parts = line.split('->')
            a = extract_table_name(parts[0])
            b = extract_table_name(parts[1])
            relations_raw.append((a, b))
        elif '>' in line:
            parts = line.split('>')
            a = extract_table_name(parts[0])
            b = extract_table_name(parts[1])
            relations_raw.append((a, b))
        elif '<' in line:
            parts = line.split('<')
            a = extract_table_name(parts[0])
            b = extract_table_name(parts[1])
            relations_raw.append((b, a))  # Reverse
        elif '-' in line:
            parts = line.split('-')
            a = extract_table_name(parts[0])
            b = extract_table_name(parts[1])
            relations_raw.append((a, b))

    # Deduplication
    seen_pairs = {}
    unique_relations = []
    for a, b in relations_raw:
        pair_key = frozenset({a, b})
        if pair_key not in seen_pairs:
            seen_pairs[pair_key] = (a, b)
            unique_relations.append((a, b))

    return unique_relations

def build_entity_order(relations):
    """Build entity processing order (from algo10)"""
    connection_count = defaultdict(int)
    for a, b in relations:
        connection_count[a] += 1
        connection_count[b] += 1

    liste_regle_1 = sorted(connection_count.keys(),
                           key=lambda x: connection_count[x],
                           reverse=True)

    entity_order = []
    liste_enonces = []
    entity_order.append(liste_regle_1[0])

    for a, b in relations:
        if a == entity_order[0] and b not in liste_enonces:
            liste_enonces.append(b)
        if b == entity_order[0] and a not in liste_enonces:
            liste_enonces.append(a)

    while len(entity_order) < len(liste_regle_1):
        candidates = [e for e in liste_enonces if e not in entity_order]
        if not candidates:
            break
        next_entity = max(candidates,
                          key=lambda e: (connection_count[e],
                                        -liste_regle_1.index(e)))
        entity_order.append(next_entity)
        for a, b in relations:
            if a == next_entity and b not in liste_enonces and b not in entity_order:
                liste_enonces.append(b)
            if b == next_entity and a not in liste_enonces and a not in entity_order:
                liste_enonces.append(a)

    return entity_order

def test_baseline_full_recalculation(relations, entity_order, iterations=100):
    """Test baseline: full recalculation every time"""
    print("\n" + "="*80)
    print("TEST 1: BASELINE - Full Recalculation (algo10 behavior)")
    print("="*80)

    times = []

    for i in range(iterations):
        classifier = algo12.LayerClassifier()

        # Add all relations
        for left, right in relations:
            classifier.add_relation(left, right)

        # Measure compute_layers
        start = time.perf_counter()
        layers = classifier.compute_layers(entity_order)
        end = time.perf_counter()

        times.append(end - start)

    avg_time = sum(times) / len(times)
    print(f"\nIterations: {iterations}")
    print(f"Average time: {avg_time*1000:.3f} ms")
    print(f"Min: {min(times)*1000:.3f} ms")
    print(f"Max: {max(times)*1000:.3f} ms")

    return avg_time

def test_incremental_add_single(relations, entity_order, iterations=100):
    """Test incremental: add one relation to existing classifier"""
    print("\n" + "="*80)
    print("TEST 2: INCREMENTAL ADD - Single Relation")
    print("="*80)

    # Prepare base classifier with most relations
    base_relations = relations[:-1]  # All except last
    new_relation = relations[-1]  # Last relation to add

    print(f"\nBase: {len(base_relations)} relations")
    print(f"Adding: {new_relation[0]} -> {new_relation[1]}")

    times_full = []
    times_incremental = []

    for i in range(iterations):
        # Method 1: Full recalculation
        classifier_full = algo12.LayerClassifier()
        for left, right in relations:
            classifier_full.add_relation(left, right)

        start = time.perf_counter()
        layers_full = classifier_full.compute_layers(entity_order)
        end = time.perf_counter()
        times_full.append(end - start)

        # Method 2: Incremental
        classifier_incr = algo12.LayerClassifier()
        for left, right in base_relations:
            classifier_incr.add_relation(left, right)
        classifier_incr.compute_layers(entity_order)  # Initial calculation

        # Now add incrementally
        start = time.perf_counter()
        classifier_incr.add_relation_incremental(new_relation[0], new_relation[1])
        layers_incr = classifier_incr.compute_layers(entity_order)
        end = time.perf_counter()
        times_incremental.append(end - start)

    avg_full = sum(times_full) / len(times_full)
    avg_incr = sum(times_incremental) / len(times_incremental)

    print(f"\nFull recalculation: {avg_full*1000:.3f} ms")
    print(f"Incremental add: {avg_incr*1000:.3f} ms")
    print(f"Speedup: {avg_full/avg_incr:.1f}x")
    print(f"Improvement: {(avg_full - avg_incr)/avg_full*100:.1f}%")

    return avg_full, avg_incr

def test_incremental_add_multiple(relations, entity_order, num_adds=5, iterations=50):
    """Test incremental: add multiple relations one by one"""
    print("\n" + "="*80)
    print(f"TEST 3: INCREMENTAL ADD - Multiple Relations ({num_adds} adds)")
    print("="*80)

    # Split relations
    base_relations = relations[:-num_adds]
    new_relations = relations[-num_adds:]

    print(f"\nBase: {len(base_relations)} relations")
    print(f"Adding: {len(new_relations)} relations")

    times_full = []
    times_incremental = []

    for i in range(iterations):
        # Method 1: Full recalculation after each add
        classifier_full = algo12.LayerClassifier()
        for left, right in base_relations:
            classifier_full.add_relation(left, right)

        start = time.perf_counter()
        for left, right in new_relations:
            classifier_full.add_relation(left, right)
            classifier_full.compute_layers(entity_order)  # Full recalc each time
        end = time.perf_counter()
        times_full.append(end - start)

        # Method 2: Incremental adds
        classifier_incr = algo12.LayerClassifier()
        for left, right in base_relations:
            classifier_incr.add_relation(left, right)
        classifier_incr.compute_layers(entity_order)  # Initial

        start = time.perf_counter()
        for left, right in new_relations:
            classifier_incr.add_relation_incremental(left, right)
            classifier_incr.compute_layers(entity_order)  # Reuse cache mostly
        end = time.perf_counter()
        times_incremental.append(end - start)

    avg_full = sum(times_full) / len(times_full)
    avg_incr = sum(times_incremental) / len(times_incremental)

    print(f"\nFull recalculation ({num_adds} times): {avg_full*1000:.3f} ms")
    print(f"Incremental add ({num_adds} times): {avg_incr*1000:.3f} ms")
    print(f"Speedup: {avg_full/avg_incr:.1f}x")
    print(f"Improvement: {(avg_full - avg_incr)/avg_full*100:.1f}%")

    return avg_full, avg_incr

def test_incremental_remove(relations, entity_order, iterations=100):
    """Test incremental: remove a relation"""
    print("\n" + "="*80)
    print("TEST 4: INCREMENTAL REMOVE - Single Relation")
    print("="*80)

    # Pick a relation to remove (one that's not too central)
    relation_to_remove = relations[len(relations) // 2]
    print(f"\nRemoving: {relation_to_remove[0]} -> {relation_to_remove[1]}")

    times_full = []
    times_incremental = []

    for i in range(iterations):
        # Method 1: Full recalculation
        classifier_full = algo12.LayerClassifier()
        for left, right in relations:
            if (left, right) != relation_to_remove:
                classifier_full.add_relation(left, right)

        start = time.perf_counter()
        layers_full = classifier_full.compute_layers(entity_order)
        end = time.perf_counter()
        times_full.append(end - start)

        # Method 2: Incremental remove
        classifier_incr = algo12.LayerClassifier()
        for left, right in relations:
            classifier_incr.add_relation(left, right)
        classifier_incr.compute_layers(entity_order)  # Initial

        start = time.perf_counter()
        classifier_incr.remove_relation(relation_to_remove[0], relation_to_remove[1])
        layers_incr = classifier_incr.compute_layers(entity_order)
        end = time.perf_counter()
        times_incremental.append(end - start)

    avg_full = sum(times_full) / len(times_full)
    avg_incr = sum(times_incremental) / len(times_incremental)

    print(f"\nFull recalculation: {avg_full*1000:.3f} ms")
    print(f"Incremental remove: {avg_incr*1000:.3f} ms")
    print(f"Speedup: {avg_full/avg_incr:.1f}x")
    print(f"Improvement: {(avg_full - avg_incr)/avg_full*100:.1f}%")

    return avg_full, avg_incr

def test_correctness(relations, entity_order):
    """Verify that incremental produces same results as full"""
    print("\n" + "="*80)
    print("TEST 5: CORRECTNESS - Incremental vs Full")
    print("="*80)

    # Test 1: Add all incrementally
    classifier_full = algo12.LayerClassifier()
    for left, right in relations:
        classifier_full.add_relation(left, right)
    layers_full = classifier_full.compute_layers(entity_order)

    classifier_incr = algo12.LayerClassifier()
    for left, right in relations[:1]:
        classifier_incr.add_relation(left, right)
    classifier_incr.compute_layers(entity_order)

    for left, right in relations[1:]:
        classifier_incr.add_relation_incremental(left, right)

    layers_incr = classifier_incr.compute_layers(entity_order)

    print(f"\nFull calculation layers: {len(layers_full)}")
    print(f"Incremental layers: {len(layers_incr)}")

    if layers_full == layers_incr:
        print("[SUCCESS] PASSED: Results are identical!")
    else:
        print("[FAILURE] FAILED: Results differ!")
        print("\nFull:")
        for i, layer in enumerate(layers_full):
            print(f"  Layer {i}: {layer}")
        print("\nIncremental:")
        for i, layer in enumerate(layers_incr):
            print(f"  Layer {i}: {layer}")

    return layers_full == layers_incr

def main():
    print("\n" + "="*80)
    print("ALGO12 - INCREMENTAL UPDATE BENCHMARKS")
    print("Testing incremental add/remove for real-time ERP visualization")
    print("="*80)

    # Parse CRM dataset
    relations = parse_relations(relations_input_crm)
    entity_order = build_entity_order(relations)

    print(f"\nDataset: CRM")
    print(f"Entities: {len(set([e for rel in relations for e in rel]))}")
    print(f"Relations: {len(relations)}")

    # Run tests
    baseline_time = test_baseline_full_recalculation(relations, entity_order, iterations=100)

    correct = test_correctness(relations, entity_order)
    if not correct:
        print("\n⚠️  WARNING: Correctness test failed! Results may not be reliable.")
        return

    full_single, incr_single = test_incremental_add_single(relations, entity_order, iterations=100)
    full_multi, incr_multi = test_incremental_add_multiple(relations, entity_order, num_adds=5, iterations=50)
    full_remove, incr_remove = test_incremental_remove(relations, entity_order, iterations=100)

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"\nBaseline (full recalculation): {baseline_time*1000:.3f} ms")
    print(f"\nIncremental add (single): {incr_single*1000:.3f} ms ({full_single/incr_single:.1f}x faster)")
    print(f"Incremental add (5x): {incr_multi*1000:.3f} ms ({full_multi/incr_multi:.1f}x faster)")
    print(f"Incremental remove: {incr_remove*1000:.3f} ms ({full_remove/incr_remove:.1f}x faster)")

    print("\n" + "="*80)
    print("CONCLUSION")
    print("="*80)
    if incr_single < full_single:
        print("[SUCCESS] Incremental updates are FASTER than full recalculation!")
        print(f"  Recommended for real-time ERP visualization.")
    else:
        print("[FAILURE] Incremental updates are SLOWER than full recalculation.")
        print(f"  Not recommended - stick with full recalculation.")

if __name__ == "__main__":
    main()
