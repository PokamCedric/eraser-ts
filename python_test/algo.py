import re
from collections import defaultdict

# === INPUT DSL ===
dsl = """

// One-to-One: Users to Profiles
// Each user has exactly one profile
users.profileId - profiles.id

// Many-to-One: Posts to Users
// Many posts belong to one author (user)
posts.authorId > users.id

// Many-to-One: Users to Teams
// Many users belong to one team
users.id > teams.id

// Many-to-One: Comments to Posts
// Many comments belong to one post
comments.postId > posts.id

// Many-to-One: Comments to Users
// Many comments belong to one user
tags.userId > users.id

// Many-to-Many: Posts to Tags (through post_tags)
// Posts can have many tags, tags can belong to many posts
post_tags.postId > posts.id
post_tags.tagId > tags.id

// Alternative entity-level syntax (defaults to id fields):
// users > teams
// This is equivalent to: users.id > teams.id
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

# Flag pour choisir la variante en cas de cycle (Règle 3.2)
PREFER_REORDER_ON_CYCLE = True  # False = garder l'ordre par défaut, True = réordonner

# === ÉTAPE 1 : Parser les relations selon la "Position Rule" ===
pattern = re.compile(r'(\w+)\.\w*\s*([><-]{1,2})\s*(\w+)\.\w*')
relations = []
for line in dsl.splitlines():
    m = pattern.search(line.strip())
    if not m:
        continue
    left, symbol, right = m.groups()
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
        connected.sort(key=lambda x: max(connections[x[0]], connections[x[1]]), reverse=True)
        return connected[0], "règle 1"
    else:
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

# Construire un graphe DIRIGÉ des relations pour détecter les cycles
directed_graph = defaultdict(set)
for a, b in ordered_relations:
    directed_graph[a].add(b)

# Construire un graphe des connexions (non-dirigé) pour vérifier les conflits
connections_graph = defaultdict(set)
for a, b in ordered_relations:
    connections_graph[a].add(b)
    connections_graph[b].add(a)

def has_cycle_between(left, right, directed_graph):
    """
    Détecte s'il existe un cycle entre left et right
    Un cycle existe si on peut aller de right vers left en suivant les arcs dirigés
    """
    visited = set()

    def dfs(node, target):
        if node == target:
            return True
        if node in visited:
            return False
        visited.add(node)

        for neighbor in directed_graph.get(node, []):
            if dfs(neighbor, target):
                return True
        return False

    # Vérifier si right peut atteindre left (cycle)
    return dfs(right, left)

def find_valid_layer(entity, target_layer, entity_layer, direction='right'):
    while True:
        entities_in_layer = [ent for ent, ly in entity_layer.items() if ly == target_layer]
        has_conflict = any(ent in connections_graph[entity] for ent in entities_in_layer)

        if not has_conflict:
            return target_layer
        else:
            if direction == 'right':
                target_layer += 1
            else:
                target_layer -= 1

def normalize_layers(entity_layer):
    if not entity_layer:
        return
    min_layer = min(entity_layer.values())
    if min_layer != 0:
        shift = -min_layer
        for ent in entity_layer:
            entity_layer[ent] += shift

def optimize_placement(entity, entity_layer, directed_graph, connections_graph):
    """
    Optimise le placement d'une entité et de toutes celles qui pointent vers elle
    pour respecter la Règle 2: Optimal Placement (distance minimale = 1)
    """
    # Trouver toutes les entités qui pointent vers 'entity' (parents)
    parents = [e for e, targets in directed_graph.items() if entity in targets]

    if not parents:
        return  # Pas de parents, rien à optimiser

    entity_layer_val = entity_layer[entity]

    for parent in parents:
        if parent not in entity_layer:
            continue

        parent_layer = entity_layer[parent]
        expected_parent_layer = entity_layer_val - 1

        # Si le parent est trop loin (distance > 1), le rapprocher
        if parent_layer < expected_parent_layer:
            # Essayer de placer au layer optimal (entity_layer - 1)
            target_layer = expected_parent_layer

            # Si conflit, essayer les layers entre parent_layer et expected_parent_layer
            # en partant du plus proche de expected_parent_layer
            for try_layer in range(expected_parent_layer, parent_layer - 1, -1):
                entities_in_layer = [ent for ent, ly in entity_layer.items() if ly == try_layer]
                has_conflict = any(ent in connections_graph[parent] for ent in entities_in_layer)

                if not has_conflict:
                    entity_layer[parent] = try_layer
                    # Optimiser récursivement les parents de ce parent
                    optimize_placement(parent, entity_layer, directed_graph, connections_graph)
                    break

print("\n=== ÉTAPE 3 : LAYERS ===")

for left, right in ordered_relations:
    left_exists = left in entity_layer
    right_exists = right in entity_layer

    if not left_exists and not right_exists:
        entity_layer[left] = 0
        entity_layer[right] = 1

    elif not left_exists and right_exists:
        right_layer = entity_layer[right]
        target_layer = right_layer - 1
        valid_layer = find_valid_layer(left, target_layer, entity_layer, direction='left')
        entity_layer[left] = valid_layer
        normalize_layers(entity_layer)

    elif left_exists and not right_exists:
        left_layer = entity_layer[left]
        target_layer = left_layer + 1
        valid_layer = find_valid_layer(right, target_layer, entity_layer, direction='right')
        entity_layer[right] = valid_layer

    else:
        # Cas 4: Les deux existent déjà
        left_layer = entity_layer[left]
        right_layer = entity_layer[right]

        if left_layer > right_layer:
            # Détecter si c'est un cycle (Règle 3.2) ou une chaîne linéaire (Règle 3.1)
            is_cycle = has_cycle_between(left, right, directed_graph)

            if is_cycle:
                # Règle 3.2: Cycle détecté (triangle)
                print(f"  [CYCLE DÉTECTÉ] {left} -> {right} (garder ordre par défaut)")
                if PREFER_REORDER_ON_CYCLE:
                    # Option: réordonner quand même
                    target_layer = left_layer + 1
                    valid_layer = find_valid_layer(right, target_layer, entity_layer, direction='right')
                    entity_layer[right] = valid_layer
                    # APPEL 1: Optimiser après réorganisation du cycle
                    optimize_placement(right, entity_layer, directed_graph, connections_graph)
                    normalize_layers(entity_layer)
                # Sinon: ne rien faire (garder l'ordre par défaut)
            else:
                # Règle 3.1: Chaîne linéaire - appliquer la correction
                print(f"  [CHAÎNE LINÉAIRE] {left} -> {right} (déplacer {right})")
                target_layer = left_layer + 1
                valid_layer = find_valid_layer(right, target_layer, entity_layer, direction='right')
                entity_layer[right] = valid_layer
                # APPEL 2: Optimiser après déplacement (CRUCIAL!)
                optimize_placement(right, entity_layer, directed_graph, connections_graph)
                normalize_layers(entity_layer)

    # Rebuild layers dict
    layers = defaultdict(list)
    for ent, ly in entity_layer.items():
        layers[ly].append(ent)

    # Print after update
    layer_str = " + ".join([f"Layer {ly} {layers[ly]}" for ly in sorted(layers.keys())])
    print(f"- {left} -> {right} -> {layer_str}")