import re
from collections import defaultdict

# === INPUT DSL ===
dsl = """

users.teams <> teams.id
workspaces.folderId > folders.id
workspaces.teamId > teams.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id
users.id > orders.userId
orders.id > order_items.orderId
order_items.productId > products.id
products.categoryId > categories.id
users.id > reviews.userId
products.id > reviews.productId
orders.paymentId > payments.id
payments.userId > users.id
orders.shipmentId > shipments.id
shipments.addressId > addresses.id
users.id > carts.userId
carts.id > cart_items.cartId
cart_items.productId > products.id
users.id > addresses.userId
orders.id > shipments.orderId
users.addressId > addresses.id
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
import re
from collections import defaultdict

# === INPUT DSL ===
dsl = """

users.teams <> teams.id
workspaces.folderId > folders.id
workspaces.teamId > teams.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id
users.id > orders.userId
orders.id > order_items.orderId
order_items.productId > products.id
products.categoryId > categories.id
users.id > reviews.userId
products.id > reviews.productId
orders.paymentId > payments.id
payments.userId > users.id
orders.shipmentId > shipments.id
shipments.addressId > addresses.id
users.id > carts.userId
carts.id > cart_items.cartId
cart_items.productId > products.id
users.id > addresses.userId
orders.id > shipments.orderId
users.addressId > addresses.id
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
    if min_layer < 0:
        shift = -min_layer
        for ent in entity_layer:
            entity_layer[ent] += shift

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
                # Sinon: ne rien faire (garder l'ordre par défaut)
            else:
                # Règle 3.1: Chaîne linéaire - appliquer la correction
                print(f"  [CHAÎNE LINÉAIRE] {left} -> {right} (déplacer {right})")
                target_layer = left_layer + 1
                valid_layer = find_valid_layer(right, target_layer, entity_layer, direction='right')
                entity_layer[right] = valid_layer

    # Rebuild layers dict
    layers = defaultdict(list)
    for ent, ly in entity_layer.items():
        layers[ly].append(ent)

    # Print after update
    layer_str = " + ".join([f"Layer {ly} {layers[ly]}" for ly in sorted(layers.keys())])
    print(f"- {left} -> {right} -> {layer_str}")