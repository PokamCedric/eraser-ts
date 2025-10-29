"""
Final Benchmark: algo7 vs algo8 vs algo9 vs algo10 vs algo11
Tests all algorithms 100 times on CRM dataset
"""

import time

print("Importing algo7...")
import algo7

print("Importing algo8...")
import algo8

print("Importing algo9...")
import algo9

print("Importing algo10...")
import algo10

print("Importing algo11...")
import algo11

def run_algorithm(algo_module):
    """Run an algorithm and return execution time"""
    if hasattr(algo_module, 'debug'):
        algo_module.debug = False

    start = time.perf_counter()

    # Parse relations
    relations_raw = []
    relations_input = algo_module.relations_input_crm
    for line in relations_input.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        if '<>' in line:
            parts = line.split('<>')
            a = algo_module.extract_table_name(parts[0].strip())
            b = algo_module.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '->' in line:
            parts = line.split('->')
            a = algo_module.extract_table_name(parts[0].strip())
            b = algo_module.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '>' in line:
            parts = line.split('>')
            a = algo_module.extract_table_name(parts[0].strip())
            b = algo_module.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '<' in line:
            parts = line.split('<')
            a = algo_module.extract_table_name(parts[0].strip())
            b = algo_module.extract_table_name(parts[1].strip())
            relations_raw.append((a, b))
        elif '-' in line:
            parts = line.split('-')
            a = algo_module.extract_table_name(parts[0].strip())
            b = algo_module.extract_table_name(parts[1].strip())
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

    # Build final layers
    final_classifier = algo_module.LayerClassifier()
    for left, right in relations:
        final_classifier.add_relation(left, right)

    # Check if compute_layers accepts entity_order parameter
    import inspect
    sig = inspect.signature(final_classifier.compute_layers)
    if len(sig.parameters) > 0:
        # algo8, algo9, algo10, algo11 need entity_order
        final_layers = final_classifier.compute_layers(entity_order)
    else:
        # algo7 doesn't need entity_order
        final_layers = final_classifier.compute_layers()

    final_layers = algo_module.reorder_layers_by_cluster(final_layers, relations, entity_order)

    end = time.perf_counter()
    return end - start

def main():
    print("\n" + "="*80)
    print("FINAL BENCHMARK: All Algorithms")
    print("Dataset: CRM")
    print("Iterations: 100 each")
    print("="*80)

    algos = [
        ("algo7 (Floyd-Warshall)", algo7),
        ("algo8 (Cedric baseline)", algo8),
        ("algo9 (Phase 1)", algo9),
        ("algo10 (Phase 2)", algo10),
        ("algo11 (Phase 3)", algo11),
    ]

    results = {}

    for i, (name, module) in enumerate(algos, 1):
        print(f"\n[{i}/{len(algos)}] Running {name} 100 times...")
        times = []
        for j in range(100):
            exec_time = run_algorithm(module)
            times.append(exec_time)
            if (j + 1) % 10 == 0:
                print(f"  Completed {j+1}/100 iterations...")
        results[name] = times

    # Calculate averages
    print("\n" + "="*80)
    print("RESULTS")
    print("="*80)

    for name in [n for n, _ in algos]:
        times = results[name]
        avg = sum(times) / len(times)
        print(f"\n{name}:")
        print(f"  Average: {avg:.6f}s ({avg*1000:.3f} ms)")
        print(f"  Min: {min(times):.6f}s")
        print(f"  Max: {max(times):.6f}s")

    # Comparison
    print("\n" + "="*80)
    print("COMPARISON vs algo7 (Floyd-Warshall)")
    print("="*80)

    baseline_avg = sum(results["algo7 (Floyd-Warshall)"]) / 100
    print(f"\nBaseline (algo7): {baseline_avg*1000:.3f} ms")
    print()

    for name in [n for n, _ in algos[1:]]:  # Skip algo7
        avg = sum(results[name]) / 100
        speedup = baseline_avg / avg
        improvement = (baseline_avg - avg) / baseline_avg * 100
        print(f"{name}:")
        print(f"  Time: {avg*1000:.3f} ms")
        print(f"  Speedup: {speedup:.1f}x")
        print(f"  Improvement: {improvement:.1f}%")
        print()

    # Phase improvements
    print("="*80)
    print("INCREMENTAL IMPROVEMENTS")
    print("="*80)

    algo8_avg = sum(results["algo8 (Cedric baseline)"]) / 100
    algo9_avg = sum(results["algo9 (Phase 1)"]) / 100
    algo10_avg = sum(results["algo10 (Phase 2)"]) / 100
    algo11_avg = sum(results["algo11 (Phase 3)"]) / 100

    print(f"\nPhase 1 (algo9 vs algo8):")
    improvement = (algo8_avg - algo9_avg) / algo8_avg * 100
    print(f"  Improvement: {improvement:.1f}%")
    print(f"  Time saved: {(algo8_avg - algo9_avg)*1000:.3f} ms")

    print(f"\nPhase 2 (algo10 vs algo9):")
    improvement = (algo9_avg - algo10_avg) / algo9_avg * 100
    print(f"  Improvement: {improvement:.1f}%")
    print(f"  Time saved: {(algo9_avg - algo10_avg)*1000:.3f} ms")

    print(f"\nPhase 3 (algo11 vs algo10):")
    improvement = (algo10_avg - algo11_avg) / algo10_avg * 100
    print(f"  Improvement: {improvement:.1f}%")
    print(f"  Time saved: {(algo10_avg - algo11_avg)*1000:.3f} ms")

    print(f"\nTotal optimization (algo11 vs algo8):")
    improvement = (algo8_avg - algo11_avg) / algo8_avg * 100
    print(f"  Improvement: {improvement:.1f}%")
    print(f"  Time saved: {(algo8_avg - algo11_avg)*1000:.3f} ms")

    print("\n" + "="*80)

if __name__ == "__main__":
    main()
