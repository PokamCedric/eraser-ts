import re
from collections import defaultdict

# === INPUT DSL ===
dsl = """
// One-to-One: Users to Profiles
users.profileId - profiles.id
// Many-to-One: Posts to Users
posts.authorId > users.id
// Many-to-One: Users to Teams
users.id > teams.id
// Many-to-One: Comments to Posts
comments.postId > posts.id
// Many-to-One: Tags to Users
tags.userId > users.id
// Many-to-Many: Posts to Tags (through post_tags)
post_tags.postId > posts.id
post_tags.tagId > tags.id
// User roles
user_roles.userId > users.id
user_roles.roleId > roles.id
// Role permissions
role_permissions.roleId > roles.id
role_permissions.permissionId > permissions.id
"""

# === ÉTAPE 1 : Parser les relations selon la "Position Rule" ===
# Position Rule: Le premier élément écrit est TOUJOURS à gauche
# - A > B → A à gauche
# - A < B → A à gauche (PAS B!)
# - B < A → B à gauche
# - A - B → A à gauche
# - Le symbole (>, <, -, <>) n'affecte PAS la direction !
pattern = re.compile(r'(\w+)\.\w*\s*([><-]{1,2})\s*(\w+)\.\w*')
relations = []
for line in dsl.splitlines():
    m = pattern.search(line.strip())
    if not m:
        continue
    left, symbol, right = m.groups()
    # Position Rule: premier écrit = gauche, second = droite
    relations.append((left, right))

print("=== ÉTAPE 1 : RELATIONS DÉTECTÉES ===")
for a, b in relations:
    print(f"{a} -> {b}")

# === ÉTAPE 2 : Classifier selon les 2 règles ===
connections = defaultdict(int)
for a, b in relations:
    connections[a] += 1
    connections[b] += 1

processed_entities = set()
ordered_relations = []
remaining = relations.copy()

def find_next_relation():
    connected = [r for r in remaining if r[0] in processed_entities or r[1] in processed_entities]
    if connected:
        # Règle 1: Trier par nombre de connexions (max)
        connected.sort(key=lambda x: max(connections[x[0]], connections[x[1]]), reverse=True)
        return connected[0], "règle 1"
    else:
        # Règle 2: Trier par nombre de connexions (max)
        remaining.sort(key=lambda x: max(connections[x[0]], connections[x[1]]), reverse=True)
        return remaining[0], "règle 2"

while remaining:
    (a, b), rule_used = find_next_relation()
    ordered_relations.append((a, b))
    processed_entities.update([a, b])
    remaining = [r for r in remaining if r != (a, b)]

print("\n=== ÉTAPE 2 : ORDRE FINAL DES RELATIONS ===")
for a, b in ordered_relations:
    print(f"{a} -> {b}")

# === ÉTAPE 3 : Construire les couches (layers) ===
entity_layer = {}
layers = defaultdict(list)

# Construire un graphe des connexions pour vérifier les conflits
connections_graph = defaultdict(set)
for a, b in ordered_relations:
    connections_graph[a].add(b)
    connections_graph[b].add(a)

def find_valid_layer(entity, target_layer, entity_layer, direction='right'):
    """
    Trouve le layer valide le plus proche de target_layer
    - direction='right': incrémente si conflit
    - direction='left': décrémente si conflit
    Un layer est valide si aucune entité dans ce layer n'est connectée à 'entity'
    """
    while True:
        # Vérifier si le target_layer contient des entités connectées à 'entity'
        entities_in_layer = [ent for ent, ly in entity_layer.items() if ly == target_layer]
        has_conflict = any(ent in connections_graph[entity] for ent in entities_in_layer)

        if not has_conflict:
            return target_layer
        else:
            # Conflit détecté
            if direction == 'right':
                target_layer += 1
            else:  # direction == 'left'
                target_layer -= 1

def normalize_layers(entity_layer):
    """
    Si on a des layers négatifs, décaler tout pour que le minimum soit 0
    """
    if not entity_layer:
        return
    min_layer = min(entity_layer.values())
    if min_layer < 0:
        shift = -min_layer
        for ent in entity_layer:
            entity_layer[ent] += shift

print("\n=== ÉTAPE 3 : LAYERS ===")

for left, right in ordered_relations:
    left_exists = left in entity_layer
    right_exists = right in entity_layer

    # Cas 1: Aucune des deux entités n'existe encore
    if not left_exists and not right_exists:
        entity_layer[left] = 0
        entity_layer[right] = 1

    # Cas 2: Seulement right existe déjà
    elif not left_exists and right_exists:
        # Règle 1: ils ne peuvent pas cohabiter (interconnectés)
        # Règle 2: distance minimale = 1, mais vérifier les conflits
        # Règle 3: left doit être à gauche de right
        right_layer = entity_layer[right]
        target_layer = right_layer - 1

        # Trouver un layer valide pour left (en allant vers la gauche)
        valid_layer = find_valid_layer(left, target_layer, entity_layer, direction='left')
        entity_layer[left] = valid_layer

        # Normaliser si on a des layers négatifs
        normalize_layers(entity_layer)

    # Cas 3: Seulement left existe déjà
    elif left_exists and not right_exists:
        # Règle 2: distance minimale = 1, mais vérifier les conflits
        left_layer = entity_layer[left]
        target_layer = left_layer + 1

        # Trouver un layer valide pour right (en allant vers la droite)
        valid_layer = find_valid_layer(right, target_layer, entity_layer, direction='right')
        entity_layer[right] = valid_layer

    # Cas 4: Les deux existent déjà
    else:
        # S'assurer que left est avant right avec distance minimale = 1
        if entity_layer[left] >= entity_layer[right]:
            # Décaler right et tout ce qui est après
            shift_amount = entity_layer[left] + 1 - entity_layer[right]
            right_layer = entity_layer[right]
            for ent in entity_layer:
                if entity_layer[ent] >= right_layer:
                    entity_layer[ent] += shift_amount

    # Rebuild layers dict
    layers = defaultdict(list)
    for ent, ly in entity_layer.items():
        layers[ly].append(ent)

    # Print after update
    layer_str = " + ".join([f"Layer {ly} {layers[ly]}" for ly in sorted(layers.keys())])
    print(f"- {left} -> {right} -> {layer_str}")
