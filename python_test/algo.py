"""
Algorithm with Step 6 - Vertical Ordering by Cluster
Based on algo3.py with cluster-based vertical organization
"""

from collections import defaultdict

# === DONNÉES DE TEST ===
relations_input = """
users -> teams
workspaces -> folders
workspaces -> teams
chat -> workspaces
invite -> workspaces
invite -> users
users -> orders
orders -> order_items
order_items -> products
products -> categories
users -> reviews
products -> reviews
orders -> payments
users -> payments
orders -> shipments
shipments -> addresses
users -> carts
carts -> cart_items
cart_items -> products
users -> addresses
"""

# Parse relations
relations = []
for line in relations_input.strip().split('\n'):
    if '->' in line:
        parts = line.strip().split('->')
        a = parts[0].strip()
        b = parts[1].strip()
        relations.append((a, b))

print("=== ÉTAPE 1 : RELATIONS DÉTECTÉES ===")
for a, b in relations:
    print(f"{a} -> {b}")

# === ÉTAPE 2 : ORDRE DES RELATIONS ===
entity_order = ['users', 'orders', 'teams', 'workspaces', 'reviews', 'products',
                'payments', 'carts', 'addresses', 'order_items', 'shipments',
                'cart_items', 'folders', 'categories']

print("\n=== ÉTAPE 2 : ORDRE DES ENTITÉS ===")
print(f"Ordre: {' -> '.join(entity_order)}")

# === ÉTAPE 3 : BUILD CLUSTERS ===
print("\n=== ÉTAPE 3 : BUILD CLUSTERS ===\n")

clusters = {}

for iteration, entity_name in enumerate(entity_order, 1):
    # Construire le cluster
    cluster_left = []
    cluster_right = [entity_name]

    for a, b in relations:
        if b == entity_name and a not in cluster_left:
            cluster_left.append(a)

    clusters[entity_name] = {
        'left': cluster_left,
        'right': cluster_right
    }

    print(f"{iteration}) Cluster '{entity_name}':")
    print(f"   {cluster_left} -> {cluster_right}")

# === ÉTAPE 4 : BUILD LAYERS ===
print("\n=== ÉTAPE 4 : BUILD LAYERS ===\n")

layers = []

def find_layer_index(entity):
    """Trouve l'index du layer contenant l'entité"""
    for idx, layer in enumerate(layers):
        if entity in layer:
            return idx
    return None

def remove_from_layers(entity):
    """Supprime une entité de tous les layers"""
    for layer in layers:
        while entity in layer:
            layer.remove(entity)

def can_add_to_layer(entity, layer_idx):
    """Vérifie si on peut ajouter une entité à un layer"""
    if layer_idx >= len(layers):
        return True

    # Vérifier qu'il n'y a pas de relation avec les entités du layer
    for existing in layers[layer_idx]:
        for a, b in relations:
            if (a == entity and b == existing) or (a == existing and b == entity):
                return False
    return True

def move_entity_to_right_of_parent(parent_entity, child_entity):
    """
    Déplace child_entity à droite de parent_entity.
    Retourne le nouveau layer_idx de child_entity.
    """
    parent_layer = find_layer_index(parent_entity)
    if parent_layer is None:
        return None

    # Supprimer child de son layer actuel
    remove_from_layers(child_entity)

    # Chercher un layer à droite du parent où on peut placer child
    for layer_idx in range(parent_layer + 1, len(layers)):
        if can_add_to_layer(child_entity, layer_idx):
            layers[layer_idx].append(child_entity)
            return layer_idx

    # Aucun layer compatible trouvé : créer un nouveau layer
    layers.append([child_entity])
    return len(layers) - 1

# Traiter chaque entité
for iteration, entity_name in enumerate(entity_order, 1):
    print(f"{iteration}) Entité '{entity_name}':")

    cluster_left = clusters[entity_name]['left']
    cluster_right = clusters[entity_name]['right']

    print(f"cluster-{entity_name} -> {cluster_left} -> {cluster_right}")
    print()

    # Premier cluster
    if not layers:
        if cluster_left:
            layers.append(cluster_left[:])
        layers.append(cluster_right[:])
        print(f"=>")
        for idx, layer in enumerate(layers):
            print(f"Layer {idx}: {layer}")
        print()
        continue

    # Chercher une ancre
    anchor = None
    anchor_layer = None
    anchor_location = None

    # Chercher dans RIGHT
    for e in cluster_right:
        idx = find_layer_index(e)
        if idx is not None:
            anchor = e
            anchor_layer = idx
            anchor_location = 'right'
            break

    # Chercher dans LEFT
    if anchor is None:
        for e in cluster_left:
            idx = find_layer_index(e)
            if idx is not None:
                anchor = e
                anchor_layer = idx
                anchor_location = 'left'
                break

    # Pas d'ancre
    if anchor is None:
        new_layers = []
        if cluster_left:
            new_layers.append(cluster_left[:])
        new_layers.append(cluster_right[:])
        layers[:0] = new_layers
        print(f"=>")
        for idx, layer in enumerate(layers):
            print(f"Layer {idx}: {layer}")
        print()
        continue

    print()

    if anchor_location == 'right':
        # RIGHT (entity_name) existe déjà
        # Il faut déplacer RIGHT et tous ses enfants à droite de LEFT

        # 1. Identifier tous les enfants (descendants) de RIGHT
        def get_children(parent):
            """Retourne les enfants directs de parent"""
            children = []
            for a, b in relations:
                if a == parent:
                    children.append(b)
            return children

        def get_all_descendants(root):
            """Retourne tous les descendants (récursif)"""
            descendants = []
            visited = set()
            queue = [root]

            while queue:
                current = queue.pop(0)
                if current in visited:
                    continue
                visited.add(current)

                children = get_children(current)
                for child in children:
                    if child not in descendants:
                        descendants.append(child)
                        queue.append(child)

            return descendants

        # 2. Supprimer RIGHT et tous ses descendants
        descendants = get_all_descendants(entity_name)
        remove_from_layers(entity_name)
        for desc in descendants:
            remove_from_layers(desc)

        # 3. Placer les entités de LEFT (si elles ne sont pas déjà placées)
        for left_entity in cluster_left:
            if find_layer_index(left_entity) is None:
                # Chercher un layer compatible
                placed = False
                for layer_idx in range(len(layers)):
                    if can_add_to_layer(left_entity, layer_idx):
                        layers[layer_idx].append(left_entity)
                        placed = True
                        break

                if not placed:
                    layers.append([left_entity])

        # 4. Trouver le layer max des LEFT
        left_layers = [find_layer_index(e) for e in cluster_left if find_layer_index(e) is not None]
        if left_layers:
            max_left_layer = max(left_layers)
        else:
            max_left_layer = -1

        # 5. Placer RIGHT à droite du max LEFT
        right_placed_layer = None
        for layer_idx in range(max_left_layer + 1, len(layers)):
            if can_add_to_layer(entity_name, layer_idx):
                layers[layer_idx].append(entity_name)
                right_placed_layer = layer_idx
                break

        if right_placed_layer is None:
            layers.append([entity_name])
            right_placed_layer = len(layers) - 1

        # 6. Replacer les descendants en cascade
        # Pour chaque descendant, le parent le déplace à sa droite
        # On traite par niveaux (BFS)
        if descendants:
            # Organiser par niveaux
            level_map = {entity_name: 0}
            queue = [entity_name]

            while queue:
                current = queue.pop(0)
                current_level = level_map[current]
                children = get_children(current)

                for child in children:
                    if child in descendants and child not in level_map:
                        level_map[child] = current_level + 1
                        queue.append(child)

            # Trier descendants par niveau
            descendants_sorted = sorted(descendants, key=lambda x: level_map.get(x, 999))

            # Placer chaque descendant
            for desc in descendants_sorted:
                # Trouver le parent dans la relation
                parent = None
                for a, b in relations:
                    if b == desc and (a == entity_name or a in descendants_sorted):
                        parent_layer = find_layer_index(a)
                        if parent_layer is not None:
                            parent = a
                            break

                if parent:
                    move_entity_to_right_of_parent(parent, desc)

    else:  # anchor_location == 'left'
        # LEFT existe déjà

        # Identifier les pivots
        pivots = []
        for e in cluster_left:
            if e != anchor and find_layer_index(e) is not None:
                pivots.append(e)

        # Ajouter les non-pivots au layer de l'ancre
        anchor_layer = find_layer_index(anchor)
        for e in cluster_left:
            if e != anchor and e not in pivots and e not in layers[anchor_layer]:
                layers[anchor_layer].append(e)

        # Placer RIGHT à droite de l'ancre
        right_placed = False
        for layer_idx in range(anchor_layer + 1, len(layers)):
            if can_add_to_layer(entity_name, layer_idx):
                layers[layer_idx].append(entity_name)
                right_placed = True
                break

        if not right_placed:
            layers.append([entity_name])

    print(f"=>")
    for idx, layer in enumerate(layers):
        print(f"Layer {idx}: {layer}")
    print()

# Nettoyer les layers vides
layers = [layer for layer in layers if layer]

print("\n=== LAYERS APRÈS ÉTAPE 4 ===\n")
for idx, layer in enumerate(layers):
    print(f"Layer {idx}: {layer}")

# === ÉTAPE 6 : REORDER ELEMENTS WITHIN LAYERS ===
print("\n=== ÉTAPE 6 : RÉORGANISATION VERTICALE PAR CLUSTER ===\n")

def reorder_layers_by_cluster():
    """
    Réorganise les entités dans chaque layer selon l'organisation en clusters.

    LA CLÉ: Grouper les entités qui appartiennent au MÊME cluster
    (qui pointent vers la même entité dans le layer suivant)

    Algorithme:
    1. Dernier layer: ordre selon entity_order
    2. Autres layers (de droite à gauche):
       - Pour chaque entité du layer suivant (dans l'ordre):
         - Grouper toutes les entités du layer actuel qui pointent vers elle (même cluster)
       - Les entités sans connexion au layer suivant viennent en premier
    """
    global layers

    if not layers:
        return

    # Layer le plus à droite: ordonner selon entity_order
    last_layer_idx = len(layers) - 1
    last_layer = layers[last_layer_idx]

    # Ordonner selon entity_order
    ordered_last = []
    for entity in entity_order:
        if entity in last_layer:
            ordered_last.append(entity)

    # Ajouter les entités non dans entity_order (ne devrait pas arriver)
    for entity in last_layer:
        if entity not in ordered_last:
            ordered_last.append(entity)

    layers[last_layer_idx] = ordered_last
    print(f"Layer {last_layer_idx}: {last_layer} -> {ordered_last}")

    # Traiter les autres layers de droite à gauche
    for layer_idx in range(len(layers) - 2, -1, -1):
        current_layer = layers[layer_idx]
        next_layer = layers[layer_idx + 1]

        print(f"\nLayer {layer_idx}: {current_layer}")

        # NOUVELLE LOGIQUE: Trouver TOUTES les cibles pour chaque entité
        entity_to_all_targets = {}
        for entity in current_layer:
            targets = []
            for a, b in relations:
                if a == entity and b in next_layer:
                    targets.append(b)
            entity_to_all_targets[entity] = targets

        print(f"   Connexions multiples: {entity_to_all_targets}")

        # NOUVELLE STRATÉGIE: Ordonner par la position MAXIMALE de leurs cibles
        # Entités pointant vers des cibles plus tôt viennent avant les entités pointant vers des cibles plus tard

        # 1. Calculer pour chaque entité la position max de ses cibles
        entity_max_target_pos = {}
        for entity in current_layer:
            targets = entity_to_all_targets[entity]
            if not targets:
                entity_max_target_pos[entity] = -1  # Pas de cible = vient en premier
            else:
                max_pos = max(next_layer.index(t) for t in targets)
                entity_max_target_pos[entity] = max_pos

        print(f"   Max target positions: {entity_max_target_pos}")

        # 2. Trier les entités par position maximale de cible
        ordered_layer = sorted(current_layer, key=lambda e: (
            entity_max_target_pos[e],
            entity_order.index(e) if e in entity_order else 999
        ))

        # Log clusters for debugging
        for target_entity in next_layer:
            entities_pointing_to_target = [e for e in current_layer
                                          if target_entity in entity_to_all_targets[e]]
            if entities_pointing_to_target:
                print(f"   Cluster -> {target_entity}: {entities_pointing_to_target}")

        layers[layer_idx] = ordered_layer
        print(f"   => {ordered_layer}")

reorder_layers_by_cluster()

print("\n=== RÉSULTAT FINAL AVEC ORGANISATION VERTICALE ===\n")
for idx, layer in enumerate(layers):
    print(f"Layer {idx}: {layer}")

print("\n=== VISUALISATION 2D ===\n")
max_entities = max(len(layer) for layer in layers)
for row in range(max_entities):
    line = ""
    for layer in layers:
        if row < len(layer):
            entity = layer[row]
            line += f"{entity:20}"
        else:
            line += " " * 20
    print(line)
