from collections import defaultdict

def run_algo4(layers, edges):
    # construire le graphe normal (dépendance -> dépendant)
    graph = defaultdict(set)
    parents = defaultdict(set)
    for u, v in edges:
        graph[u].add(v)
        parents[v].add(u)

    # fonction utilitaire pour trouver tous les ancêtres d’un nœud
    def find_ancestors(node, visited=None):
        if visited is None:
            visited = set()
        for p in parents[node]:
            if p not in visited:
                visited.add(p)
                find_ancestors(p, visited)
        return visited

    # pré-calcul des ancêtres
    all_ancestors = {n: find_ancestors(n) for layer in layers for n in layer}

    # mapping pour savoir où est chaque nœud
    layer_of = {n: i for i, layer in enumerate(layers) for n in layer}

    moved = True
    while moved:
        moved = False
        # on parcourt les couches du haut vers le bas (pour remonter si possible)
        for i in range(1, len(layers)):
            current_nodes = list(layers[i])
            for node in current_nodes:
                current_layer = layer_of[node]
                ancestors = all_ancestors[node]

                # on cherche le layer le plus haut possible où il peut aller
                target_layer = current_layer
                for j in range(current_layer - 1, -1, -1):
                    upper_nodes = layers[j]

                    # règle 1 : pas d’arête directe avec ce layer
                    has_direct_link = any(
                        (node, u) in edges or (u, node) in edges for u in upper_nodes
                    )
                    if has_direct_link:
                        break

                    # règle 2 : doit rester sous ses ancêtres
                    ancestor_layers = [layer_of[a] for a in ancestors] if ancestors else []
                    if ancestor_layers and j <= max(ancestor_layers):
                        # il faut rester après le layer max de ses ancêtres
                        if j < max(ancestor_layers):
                            continue

                    # règle 3 : partage d’ancêtres ou ancêtres du même layer
                    has_shared_ancestor = any(
                        all_ancestors[node] & all_ancestors[u] for u in upper_nodes
                    )
                    if has_shared_ancestor or not ancestors:
                        target_layer = j
                    else:
                        continue

                # si on a trouvé un layer plus haut possible
                if target_layer < current_layer:
                    layers[current_layer].remove(node)
                    layers[target_layer].append(node)
                    layer_of[node] = target_layer
                    moved = True

        # nettoyer les layers vides
        layers = [sorted(l) for l in layers if l]

    return layers


if __name__ == "__main__":
    from algo2 import run_algo2
    layers, edges = run_algo2()
    print("\n--- Initial Layers (Algo2) ---")
    for i, layer in enumerate(layers):
        print(f"Layer {i}: {', '.join(layer)}")

    result = run_algo4(layers, edges)
    print("\n--- After applying Rule 3 ---")
    for i, layer in enumerate(result):
        print(f"Layer {i}: {', '.join(layer)}")
