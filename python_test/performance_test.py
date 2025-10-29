"""
Performance Test: algo7 (Floyd Marshall) vs algo8 (Cedric)
Tests both algorithms 100 times on CRM dataset and reports average execution time
"""

import time
import sys

# Import both algorithms
print("Importing algo7 (Floyd Marshall)...")
import algo7

print("Importing algo8 (Cedric)...")
import algo8

def run_algo7():
    """Run algo7 and return execution time"""
    # Reset module state
    algo7.debug = False

    start = time.perf_counter()

    # Parse relations
    relations_raw = []
    for line in algo7.relations_input_crm.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        if '<>' in line:
            parts = line.split('<>')
            a = algo7.extract_table_name(parts[0].strip())
            b = algo7.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '->' in line:
            parts = line.split('->')
            a = algo7.extract_table_name(parts[0].strip())
            b = algo7.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '>' in line:
            parts = line.split('>')
            a = algo7.extract_table_name(parts[0].strip())
            b = algo7.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '<' in line:
            parts = line.split('<')
            a = algo7.extract_table_name(parts[0].strip())
            b = algo7.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '-' in line:
            parts = line.split('-')
            a = algo7.extract_table_name(parts[0].strip())
            b = algo7.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))

    # Deduplication
    seen_pairs = {}
    unique_relations = []
    for a, b in relations_raw:
        pair_key = frozenset({a, b})
        if pair_key not in seen_pairs:
            seen_pairs[pair_key] = (a, b)
            unique_relations.append((a, b))

    relations = unique_relations

    # Build entity order
    from collections import defaultdict
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

    # Build clusters
    clusters = {}
    for entity_name in entity_order:
        cluster_left = []
        for a, b in relations:
            if b == entity_name and a not in cluster_left:
                cluster_left.append(a)
        clusters[entity_name] = {
            'left': cluster_left,
            'right': [entity_name]
        }

    # Build final layers
    final_classifier = algo7.LayerClassifier()
    for left, right in relations:
        final_classifier.add_relation(left, right)

    final_layers = final_classifier.compute_layers()

    # Reorder
    final_layers = algo7.reorder_layers_by_cluster(final_layers, relations, entity_order)

    end = time.perf_counter()
    return end - start

def run_algo8():
    """Run algo8 and return execution time"""
    # Reset module state
    algo8.debug = False

    start = time.perf_counter()

    # Parse relations
    relations_raw = []
    for line in algo8.relations_input_crm.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        if '<>' in line:
            parts = line.split('<>')
            a = algo8.extract_table_name(parts[0].strip())
            b = algo8.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '->' in line:
            parts = line.split('->')
            a = algo8.extract_table_name(parts[0].strip())
            b = algo8.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '>' in line:
            parts = line.split('>')
            a = algo8.extract_table_name(parts[0].strip())
            b = algo8.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '<' in line:
            parts = line.split('<')
            a = algo8.extract_table_name(parts[0].strip())
            b = algo8.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '-' in line:
            parts = line.split('-')
            a = algo8.extract_table_name(parts[0].strip())
            b = algo8.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))

    # Deduplication
    seen_pairs = {}
    unique_relations = []
    for a, b in relations_raw:
        pair_key = frozenset({a, b})
        if pair_key not in seen_pairs:
            seen_pairs[pair_key] = (a, b)
            unique_relations.append((a, b))

    relations = unique_relations

    # Build entity order
    from collections import defaultdict
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

    # Build clusters
    clusters = {}
    for entity_name in entity_order:
        cluster_left = []
        for a, b in relations:
            if b == entity_name and a not in cluster_left:
                cluster_left.append(a)
        clusters[entity_name] = {
            'left': cluster_left,
            'right': [entity_name]
        }

    # Build final layers
    final_classifier = algo8.LayerClassifier()
    for left, right in relations:
        final_classifier.add_relation(left, right)

    final_layers = final_classifier.compute_layers(entity_order)

    # Reorder
    final_layers = algo8.reorder_layers_by_cluster(final_layers, relations, entity_order)

    end = time.perf_counter()
    return end - start

def main():
    print("\n" + "="*80)
    print("PERFORMANCE TEST: algo7 (Floyd Marshall) vs algo8 (Cedric)")
    print("Dataset: CRM")
    print("Iterations: 100 each")
    print("="*80)

    # Run algo7 100 times
    print("\n[1/2] Running algo7 (Floyd Marshall) 100 times...")
    algo7_times = []
    for i in range(100):
        exec_time = run_algo7()
        algo7_times.append(exec_time)
        if (i + 1) % 10 == 0:
            print(f"  Completed {i+1}/100 iterations...")

    # Run algo8 100 times
    print("\n[2/2] Running algo8 (Cedric) 100 times...")
    algo8_times = []
    for i in range(100):
        exec_time = run_algo8()
        algo8_times.append(exec_time)
        if (i + 1) % 10 == 0:
            print(f"  Completed {i+1}/100 iterations...")

    # Calculate averages
    algo7_avg = sum(algo7_times) / len(algo7_times)
    algo8_avg = sum(algo8_times) / len(algo8_times)

    # Results
    print("\n" + "="*80)
    print("RESULTS")
    print("="*80)
    print(f"\nalgo7 (Floyd Marshall):")
    print(f"  Average: {algo7_avg:.6f}s")
    print(f"  Min: {min(algo7_times):.6f}s")
    print(f"  Max: {max(algo7_times):.6f}s")

    print(f"\nalgo8 (Cedric):")
    print(f"  Average: {algo8_avg:.6f}s")
    print(f"  Min: {min(algo8_times):.6f}s")
    print(f"  Max: {max(algo8_times):.6f}s")

    # Comparison
    print("\n" + "-"*80)
    if algo7_avg < algo8_avg:
        faster = "algo7 (Floyd Marshall)"
        slower = "algo8 (Cedric)"
        speedup = algo8_avg / algo7_avg
    else:
        faster = "algo8 (Cedric)"
        slower = "algo7 (Floyd Marshall)"
        speedup = algo7_avg / algo8_avg

    print(f"\nWinner: {faster}")
    print(f"Speedup: {speedup:.2f}x faster than {slower}")
    print("="*80)

if __name__ == "__main__":
    main()
