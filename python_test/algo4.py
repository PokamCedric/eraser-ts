"""
Algorithm v4 - Implementation des étapes documentées
Basé sur algo.py avec implémentation correcte des étapes 0, 1, 2, 3
"""

from collections import defaultdict


# === DONNÉES DE TEST ===
relations_input_1 = """
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

relations_input_2 = """
workspaces.teamId > teams.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id
users.id < orders.userId
orders.id > order_items.orderId
order_items.productId > products.id
products.categoryId > categories.id
users.id > reviews.userId
products.id > reviews.productId
orders.paymentId > payments.id
users.id > payments.userId
orders.id > payments.orderId
orders.shipmentId > shipments.id
shipments.addressId > addresses.id
users.id > carts.userId
carts.id > cart_items.cartId
cart_items.productId > products.id
users.id > addresses.userId
orders.id > shipments.orderId
users.addressId > addresses.id
"""

relations_input_3 = """
users.profileId - profiles.id
posts.authorId > users.id
users.id > teams.id
comments.postId > posts.id
tags.userId > users.id
post_tags.postId > posts.id
post_tags.tagId > tags.id
user_roles.userId > users.id
user_roles.roleId > roles.id
role_permissions.roleId > roles.id
role_permissions.permissionId > permissions.id
projects.teamId > teams.id
milestones.projectId > projects.id
attachments.postId > posts.id
notifications.userId > roles.id
user_projects.userId > users.id
user_projects.projectId > projects.id
projects.id < posts.authorId
comments.userId > users.id
"""

# Choisir le DSL à tester
relations_input = relations_input_1


# === ÉTAPE 0 : PARSER LES RELATIONS ===
print("="*80)
print("ÉTAPE 0 : PARSER LES RELATIONS")
print("="*80)

def extract_table_name(field_ref):
    """Extrait le nom de la table depuis une référence de champ"""
    if '.' in field_ref:
        return field_ref.split('.')[0]
    return field_ref

relations_raw = []
for line in relations_input.strip().split('\n'):
    line = line.strip()
    if not line:
        continue

    # Détecter le type de relation et parser en conséquence
    # Priorité importante : vérifier <> en premier, puis ->, puis > ou <, puis -

    if '<>' in line:
        # Many-to-many: A <> B means A is on left of B
        parts = line.split('<>')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))
    elif '->' in line:
        # One-to-many: A -> B means A is on left of B
        parts = line.split('->')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))
    elif '>' in line:
        # Many-to-one: A > B means A is on left of B
        parts = line.split('>')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))
    elif '<' in line:
        # One-to-many: A < B means A is on left of B
        parts = line.split('<')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))
    elif '-' in line:
        # One-to-one: A - B means A is on left of B
        parts = line.split('-')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))

print(f"Relations parsées: {len(relations_raw)}")
for a, b in relations_raw:
    print(f"  {a} > {b}")


# === ÉTAPE 1 : CONSTITUER LE BACKLOG (LISTE 1) ===
print("\n" + "="*80)
print("ÉTAPE 1 : CONSTITUER LE BACKLOG (LISTE 1)")
print("="*80)

# 1.1 Dédupliquer les relations
print("\n1.1 Déduplication des relations")
seen_relations = set()
unique_relations = []

for a, b in relations_raw:
    relation_key = (a, b)
    if relation_key not in seen_relations:
        seen_relations.add(relation_key)
        unique_relations.append((a, b))
    else:
        print(f"  [DOUBLON] {a} > {b}")

relations = unique_relations
print(f"Relations après déduplication: {len(relations)}")

# 1.2 Compter les connexions
connection_count = defaultdict(int)
for a, b in relations:
    connection_count[a] += 1
    connection_count[b] += 1

print("\n1.2 Nombre de connexions par entité:")
for entity in sorted(connection_count.keys(), key=lambda x: connection_count[x], reverse=True):
    print(f"  {entity}: {connection_count[entity]}")

# 1.3 Organiser par nombre de connexions (LISTE 1)
def get_max_connection_for_relation(rel):
    a, b = rel
    return max(connection_count[a], connection_count[b])

liste_1 = sorted(relations, key=get_max_connection_for_relation, reverse=True)

print("\n1.3 LISTE 1 (triée par max de connexions):")
for i, (a, b) in enumerate(liste_1, 1):
    max_conn = get_max_connection_for_relation((a, b))
    print(f"  {i}. {a} > {b}  (max={max_conn})")


# === ÉTAPE 2 : DÉTERMINER L'ORDRE DE TRAITEMENT DES ENTITÉS ===
print("\n" + "="*80)
print("ÉTAPE 2 : DÉTERMINER L'ORDRE DE TRAITEMENT")
print("="*80)

# Critère 1: Liste-Règle 1 (référence triée par connexions)
liste_regle_1 = sorted(connection_count.keys(),
                       key=lambda x: connection_count[x],
                       reverse=True)

print("\nCritère 1 - Liste-Règle 1 (référence):")
print(f"  {' > '.join(liste_regle_1)}")

# Liste à remplir (résultat final)
entity_order = []

# Liste des entités connectées aux éléments déjà choisis
liste_enonces = []

# ITERATION 1: Prendre le premier élément de la Liste-Règle 1
print("\n" + "-"*60)
print("ITERATION 1")
entity_order.append(liste_regle_1[0])
print(f"  Choix: {liste_regle_1[0]} (premier de Liste-Règle 1)")

# Ajouter toutes les entités connectées au premier élément dans liste_enonces
for a, b in relations:
    if a == entity_order[0] and b not in liste_enonces:
        liste_enonces.append(b)
    if b == entity_order[0] and a not in liste_enonces:
        liste_enonces.append(a)

print(f"  Liste énoncés: {liste_enonces}")

# ITERATIONS 2, 3, ...
iteration = 2
while len(entity_order) < len(liste_regle_1):
    print("\n" + "-"*60)
    print(f"ITERATION {iteration}")

    # Filtrer les candidats: éléments dans liste_enonces qui ne sont pas déjà choisis
    candidates = [e for e in liste_enonces if e not in entity_order]

    if not candidates:
        print("  Aucun candidat disponible, arrêt")
        break

    print(f"  Candidats: {candidates}")

    # Parmi les candidats, choisir celui avec le plus de connexions
    # En cas d'égalité, prendre celui qui vient en premier dans liste_regle_1
    next_entity = max(candidates,
                      key=lambda e: (connection_count[e],
                                    -liste_regle_1.index(e)))

    print(f"  Choix: {next_entity} (connexions={connection_count[next_entity]})")
    entity_order.append(next_entity)

    # Mettre à jour liste_enonces avec les nouvelles connexions
    new_enonces = []
    for a, b in relations:
        if a == next_entity and b not in liste_enonces and b not in entity_order:
            liste_enonces.append(b)
            new_enonces.append(b)
        if b == next_entity and a not in liste_enonces and a not in entity_order:
            liste_enonces.append(a)
            new_enonces.append(a)

    if new_enonces:
        print(f"  Nouveaux énoncés: {new_enonces}")
    print(f"  Liste énoncés: {liste_enonces}")

    iteration += 1

print("\n" + "-"*60)
print("RÉSULTAT - entity_order:")
print(f"  {' > '.join(entity_order)}")


# === ÉTAPE 3 : CONSTRUCTION DES CLUSTERS ===
print("\n" + "="*80)
print("ÉTAPE 3 : CONSTRUCTION DES CLUSTERS")
print("="*80)

clusters = {}

for entity_name in entity_order:
    # Construire le cluster
    cluster_left = []
    cluster_right = [entity_name]

    # Trouver tous les parents (entités qui pointent vers entity_name)
    for a, b in relations:
        if b == entity_name and a not in cluster_left:
            cluster_left.append(a)

    clusters[entity_name] = {
        'left': cluster_left,
        'right': cluster_right
    }

    print(f"\nCluster '{entity_name}':")
    print(f"  {cluster_left} > {cluster_right}")


# === ÉTAPE 4 : BUILD LAYERS ===
print("\n" + "="*80)
print("ÉTAPE 4 : BUILD LAYERS")
print("="*80)

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
for iteration_num, entity_name in enumerate(entity_order, 1):
    print(f"\n{'-'*60}")
    print(f"ITERATION {iteration_num}: '{entity_name}'")
    print(f"{'-'*60}")

    cluster_left = clusters[entity_name]['left']
    cluster_right = clusters[entity_name]['right']

    print(f"Cluster: {cluster_left} > {cluster_right}")

    # Premier cluster
    if not layers:
        if cluster_left:
            layers.append(cluster_left[:])
        layers.append(cluster_right[:])
        print(f"\nPremier cluster créé:")
        for idx, layer in enumerate(layers):
            print(f"  Layer {idx}: {layer}")
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
        print(f"\nPas d'ancre - insertion à gauche:")
        for idx, layer in enumerate(layers):
            print(f"  Layer {idx}: {layer}")
        continue

    if anchor_location == 'right':
        # RIGHT (entity_name) existe déjà
        print(f"\nAncre trouvée: '{anchor}' en Layer {anchor_layer} (RIGHT)")

        # Détecter les conflits
        entity_layer = find_layer_index(entity_name)
        must_reorganize = False
        conflict_parents = []
        unplaced_parents = []

        for parent in cluster_left:
            parent_layer = find_layer_index(parent)
            if parent_layer is None:
                # Parent non placé
                unplaced_parents.append(parent)
                print(f"  [!] Parent non placé: '{parent}'")
            elif parent_layer >= entity_layer:
                # Parent en conflit de position
                must_reorganize = True
                conflict_parents.append(parent)
                print(f"  [!] CONFLIT! Parent '{parent}' (Layer {parent_layer}) >= Entity (Layer {entity_layer})")

        # Si on a des parents non placés, on doit réorganiser
        if unplaced_parents:
            must_reorganize = True
            print(f"  [!] Réorganisation nécessaire à cause des parents non placés: {unplaced_parents}")

        if not must_reorganize:
            print(f"  [OK] Pas de conflit, pas de réorganisation nécessaire")
            print(f"\nLayers inchangés:")
            for idx, layer in enumerate(layers):
                print(f"  Layer {idx}: {layer}")
            continue

        print(f"  [REORGANISATION] due aux conflits avec: {conflict_parents}")

        # 1. Identifier tous les enfants (descendants) de RIGHT
        descendants = get_all_descendants(entity_name)
        print(f"  Descendants à supprimer: {descendants}")

        # 2. Supprimer RIGHT et tous ses descendants
        remove_from_layers(entity_name)
        for desc in descendants:
            remove_from_layers(desc)

        # 3. Placer les entités de LEFT (si elles ne sont pas déjà placées)
        for left_entity in cluster_left:
            if find_layer_index(left_entity) is None:
                print(f"  Placement du parent non placé: {left_entity}")
                # Chercher un layer compatible
                placed = False
                for layer_idx in range(len(layers)):
                    if can_add_to_layer(left_entity, layer_idx):
                        layers[layer_idx].append(left_entity)
                        placed = True
                        print(f"    -> Ajouté au Layer {layer_idx}")
                        break

                if not placed:
                    layers.append([left_entity])
                    print(f"    -> Nouveau Layer {len(layers)-1} créé")

        # 4. Trouver le layer max des LEFT
        left_layers = [find_layer_index(e) for e in cluster_left if find_layer_index(e) is not None]
        if left_layers:
            max_left_layer = max(left_layers)
        else:
            max_left_layer = -1

        print(f"  Max layer des parents: {max_left_layer}")

        # 5. Placer RIGHT à droite du max LEFT
        right_placed_layer = None
        for layer_idx in range(max_left_layer + 1, len(layers)):
            if can_add_to_layer(entity_name, layer_idx):
                layers[layer_idx].append(entity_name)
                right_placed_layer = layer_idx
                print(f"  Placement de {entity_name} au Layer {layer_idx}")
                break

        if right_placed_layer is None:
            layers.append([entity_name])
            right_placed_layer = len(layers) - 1
            print(f"  Nouveau Layer {right_placed_layer} créé pour {entity_name}")

        # 6. Replacer les descendants en cascade
        if descendants:
            print(f"  Cascade des descendants: {descendants}")
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
                    new_layer = move_entity_to_right_of_parent(parent, desc)
                    print(f"    Déplacement de {desc} au Layer {new_layer} (à droite de {parent})")

    else:  # anchor_location == 'left'
        # LEFT existe déjà
        print(f"\nAncre trouvée: '{anchor}' en Layer {anchor_layer} (LEFT)")

        # Trouver le layer MAXIMUM de TOUS les parents placés
        max_parent_layer = -1
        unplaced_parents = []

        for e in cluster_left:
            parent_layer = find_layer_index(e)
            if parent_layer is not None:
                max_parent_layer = max(max_parent_layer, parent_layer)
                print(f"  Parent '{e}' en Layer {parent_layer}")
            else:
                unplaced_parents.append(e)
                print(f"  Parent '{e}' non placé")

        print(f"  Max layer des parents: {max_parent_layer}")

        # Placer les parents non placés
        for e in unplaced_parents:
            placed = False
            for layer_idx in range(len(layers)):
                if can_add_to_layer(e, layer_idx):
                    layers[layer_idx].append(e)
                    placed = True  # FIX: était False !
                    print(f"  Placement du parent non placé '{e}' au Layer {layer_idx}")
                    # Mettre à jour max_parent_layer si nécessaire
                    max_parent_layer = max(max_parent_layer, layer_idx)
                    break

            if not placed:
                layers.append([e])
                new_layer_idx = len(layers) - 1
                print(f"  Nouveau Layer {new_layer_idx} créé pour le parent non placé '{e}'")
                max_parent_layer = max(max_parent_layer, new_layer_idx)

        # Placer RIGHT à droite du MAX des parents
        right_placed = False
        for layer_idx in range(max_parent_layer + 1, len(layers)):
            if can_add_to_layer(entity_name, layer_idx):
                layers[layer_idx].append(entity_name)
                right_placed = True
                print(f"  Placement de {entity_name} au Layer {layer_idx}")
                break

        if not right_placed:
            layers.append([entity_name])
            print(f"  Nouveau Layer {len(layers)-1} créé pour {entity_name}")

    print(f"\nLayers après traitement:")
    for idx, layer in enumerate(layers):
        print(f"  Layer {idx}: {layer}")

# Nettoyer les layers vides
layers = [layer for layer in layers if layer]

print("\n" + "="*80)
print("RÉSULTAT FINAL")
print("="*80)
for idx, layer in enumerate(layers):
    print(f"Layer {idx}: {layer}")
