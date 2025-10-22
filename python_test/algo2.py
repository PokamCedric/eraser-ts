from collections import defaultdict
from typing import Dict, List, Set, Tuple

# === INPUT ===
layers_input = {
    0: ['comments', 'post_tags', 'attachments'],
    1: ['posts', 'tags', 'user_roles', 'user_projects', 'milestones', 'role_permissions', 'notifications'],
    2: ['users', 'projects', 'roles', 'permissions'],
    3: ['profiles', 'teams']
}

# Relations du DSL (depuis l'algo précédent)
relations = [
    ('comments', 'posts'),
    ('comments', 'users'),
    ('post_tags', 'posts'),
    ('post_tags', 'tags'),
    ('attachments', 'posts'),
    ('posts', 'users'),
    ('tags', 'users'),
    ('user_roles', 'users'),
    ('user_roles', 'roles'),
    ('user_projects', 'users'),
    ('user_projects', 'projects'),
    ('milestones', 'projects'),
    ('role_permissions', 'roles'),
    ('role_permissions', 'permissions'),
    ('notifications', 'roles'),
    ('users', 'profiles'),
    ('users', 'teams'),
    ('projects', 'posts'),
    ('projects', 'teams'),
]

# Construire un graphe de connexions
connections = defaultdict(set)
for left, right in relations:
    connections[left].add(right)
    connections[right].add(left)

print("=== ÉTAPE 1 : TROUVER TOUS LES CLUSTERS ===\n")

# Structure: clusters[layer_pair] = [(left_entities, right_entity), ...]
clusters = defaultdict(list)
cluster_id = defaultdict(lambda: defaultdict(int))

# Parcourir chaque paire de layers adjacents
sorted_layers = sorted(layers_input.keys())
for i in range(len(sorted_layers) - 1):
    layer_n = sorted_layers[i]
    layer_n_plus_1 = sorted_layers[i + 1]
    
    print(f"Layers {layer_n} - {layer_n_plus_1}")
    
    entities_n = layers_input[layer_n]
    entities_n_plus_1 = layers_input[layer_n_plus_1]
    
    cluster_counter = 1
    
    # Pour chaque entité de layer_n_plus_1, trouver ses connexions avec layer_n
    for entity_right in entities_n_plus_1:
        # Trouver toutes les entités de layer_n connectées à entity_right
        connected_left = []
        for entity_left in entities_n:
            # Vérifier si entity_left est connecté à entity_right
            if entity_right in connections[entity_left]:
                connected_left.append(entity_left)
        
        if connected_left:
            cluster_key = (layer_n, layer_n_plus_1)
            clusters[cluster_key].append((connected_left, entity_right))
            
            cluster_name = f"cluster {layer_n} - {layer_n_plus_1}.{cluster_counter}"
            print(f"- {cluster_name} : Layer {layer_n} {connected_left} -> Layer {layer_n_plus_1} ['{entity_right}']")
            
            cluster_id[(layer_n, layer_n_plus_1)][entity_right] = cluster_counter
            cluster_counter += 1
    
    print()

print("\n=== ÉTAPE 2 : ORDONNER PAR CLUSTERS ===\n")

def reorder_by_clusters():
    """
    Réordonne les entités en fonction des clusters
    Suit les chaînes de dépendances entre clusters
    """
    reordered = {}
    for layer_idx in sorted_layers:
        reordered[layer_idx] = []
    
    # Pour chaque paire de layers adjacents
    for i in range(len(sorted_layers) - 1):
        layer_n = sorted_layers[i]
        layer_n_plus_1 = sorted_layers[i + 1]

        cluster_list = clusters[(layer_n, layer_n_plus_1)]

        if not cluster_list:
            continue
        
        print(f"\nTraitement Layers {layer_n} - {layer_n_plus_1}:")
        
        # Compter les occurrences de chaque entité left
        left_entity_count = defaultdict(int)
        for left_entities, right_entity in cluster_list:
            for left_entity in left_entities:
                left_entity_count[left_entity] += 1

        # Construire les groupes de clusters avec entités uniques et pivots
        cluster_groups = []
        for left_entities, right_entity in cluster_list:
            unique_left = [e for e in left_entities if left_entity_count[e] == 1]
            pivot_left = [e for e in left_entities if left_entity_count[e] > 1]
            cluster_groups.append((right_entity, unique_left, pivot_left))

        # Réordonner les clusters selon les dépendances
        # Si un cluster partage des entités avec le cluster précédent, le placer à côté
        ordered_clusters = []
        remaining_clusters = cluster_groups.copy()

        if remaining_clusters:
            # Commencer par le premier cluster
            ordered_clusters.append(remaining_clusters.pop(0))

            # Tant qu'il reste des clusters
            while remaining_clusters:
                last_cluster = ordered_clusters[-1]
                last_right = last_cluster[0]
                last_all_left = set(last_cluster[1] + last_cluster[2])

                # Chercher un cluster qui partage des entités avec le dernier cluster placé
                best_match = None
                best_score = 0

                for idx, cluster in enumerate(remaining_clusters):
                    right_entity, unique_left, pivot_left = cluster
                    all_left = set(unique_left + pivot_left)

                    # Score basé sur le nombre d'entités partagées
                    shared = len(last_all_left & all_left)

                    if shared > best_score:
                        best_score = shared
                        best_match = idx

                # Placer le meilleur match, ou le premier si aucun match
                if best_match is not None and best_score > 0:
                    ordered_clusters.append(remaining_clusters.pop(best_match))
                else:
                    ordered_clusters.append(remaining_clusters.pop(0))

        # Placer les entités selon l'ordre des clusters
        placed_left = set(reordered[layer_n])
        placed_right = set(reordered[layer_n_plus_1])

        for idx, (right_entity, unique_left, pivot_left) in enumerate(ordered_clusters):
            cluster_num = idx + 1
            
            # Placer les entités uniques de layer_n
            for left_entity in unique_left:
                if left_entity not in placed_left:
                    reordered[layer_n].append(left_entity)
                    placed_left.add(left_entity)
                    print(f"  Cluster {cluster_num}: Placer '{left_entity}' (unique) dans Layer {layer_n}")

            # Placer les pivots
            for left_entity in pivot_left:
                if left_entity not in placed_left:
                    reordered[layer_n].append(left_entity)
                    placed_left.add(left_entity)
                    print(f"    -> Placer '{left_entity}' (pivot) dans Layer {layer_n}")

            # Placer right_entity dans layer_n_plus_1
            if right_entity not in placed_right:
                reordered[layer_n_plus_1].append(right_entity)
                placed_right.add(right_entity)
                print(f"    -> Placer '{right_entity}' dans Layer {layer_n_plus_1}")
        
        # Ajouter les entités non traitées
        for entity in layers_input[layer_n]:
            if entity not in placed_left:
                reordered[layer_n].append(entity)
    
    # Traiter le dernier layer
    last_layer = sorted_layers[-1]
    for entity in layers_input[last_layer]:
        if entity not in reordered[last_layer]:
            reordered[last_layer].append(entity)

    return reordered

# Identifier les pivots
print("Analyse des clusters :")

entity_cluster_count = defaultdict(lambda: defaultdict(int))

for i in range(len(sorted_layers) - 1):
    layer_n = sorted_layers[i]
    layer_n_plus_1 = sorted_layers[i + 1]

    cluster_list = clusters[(layer_n, layer_n_plus_1)]

    for left_entities, right_entity in cluster_list:
        for left_entity in left_entities:
            entity_cluster_count[layer_n][left_entity] += 1

print("\nPivots identifiés (entités partagées entre clusters) :")
for layer_idx in sorted_layers[:-1]:
    pivots = [entity for entity, count in entity_cluster_count[layer_idx].items() if count > 1]
    if pivots:
        print(f"  Layer {layer_idx}: {pivots}")

# Réordonner selon les clusters
reordered_layers = reorder_by_clusters()

print("\n=== RÉSULTAT : LAYERS RÉORDONNÉS ===\n")

for layer_idx in sorted_layers:
    print(f"Layer {layer_idx} {reordered_layers[layer_idx]}")

print("\n=== COMPARAISON ===\n")
print("Input:")
for layer_idx in sorted_layers:
    print(f"Layer {layer_idx} {layers_input[layer_idx]}")

print("\nOutput:")
for layer_idx in sorted_layers:
    print(f"Layer {layer_idx} {reordered_layers[layer_idx]}")

print("\n=== CHANGEMENTS ===\n")
for layer_idx in sorted_layers:
    if reordered_layers[layer_idx] != layers_input[layer_idx]:
        print(f"Layer {layer_idx}:")
        print(f"  Avant : {layers_input[layer_idx]}")
        print(f"  Après : {reordered_layers[layer_idx]}")

        for i, entity in enumerate(reordered_layers[layer_idx]):
            old_pos = layers_input[layer_idx].index(entity) if entity in layers_input[layer_idx] else -1
            if old_pos != i and old_pos != -1:
                print(f"    - '{entity}' : position {old_pos} -> {i}")
    else:
        print(f"Layer {layer_idx}: Aucun changement")