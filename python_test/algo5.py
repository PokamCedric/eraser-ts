"""
Algorithm v5 - VERSION SIMPLIFIÉE
Basé uniquement sur les 3 règles fondamentales:
1. Minimum Distance: distance >= 1
2. Optimal Placement: placer au layer minimum valide
3. Direction rule: élément de gauche reste à gauche
"""

from collections import defaultdict


# === DONNÉES DE TEST ===
relations_input_crm = """
// USER/ORGANIZATION
users.profileId - profiles.id
user_roles.userId > users.id
user_roles.roleId > roles.id
role_permissions.roleId > roles.id
role_permissions.permissionId > permissions.id
team_members.teamId > teams.id
team_members.userId > users.id
teams.leadId > users.id

// ACCOUNTS & CONTACTS
contacts.accountId > accounts.id
contacts_accounts.contactId > contacts.id
contacts_accounts.accountId > accounts.id
accounts.ownerId > users.id

// LEADS & CAMPAIGNS
leads.campaignId > campaigns.id
leads.ownerId > users.id
campaign_members.campaignId > campaigns.id
campaign_members.contactId > contacts.id
campaign_members.leadId > leads.id

// OPPORTUNITIES & SALES
opportunities.accountId > accounts.id
opportunities.primaryContactId > contacts.id
opportunities.ownerId > users.id
opportunities.pipelineId > pipelines.id
opportunity_products.opportunityId > opportunities.id
opportunity_products.productId > products.id

// QUOTES / ORDERS / INVOICES / PAYMENTS
quotes.opportunityId > opportunities.id
quotes.accountId > accounts.id
orders.quoteId > quotes.id
orders.accountId > accounts.id
invoices.orderId > orders.id
invoices.accountId > accounts.id
payments.invoiceId > invoices.id
payments.accountId > accounts.id

// ACTIVITIES / TASKS
activities.ownerId > users.id
activities.assignedTo > users.id
activity_assignments.activityId > activities.id
activity_assignments.fromUserId > users.id
activity_assignments.toUserId > users.id

// CASES / SUPPORT
cases.accountId > accounts.id
cases.contactId > contacts.id
cases.ownerId > users.id

// TAGS / NOTES / ATTACHMENTS
entity_tags.tagId > tags.id
notes.authorId > users.id
attachments.uploadedBy > users.id

// EMAILS / INTEGRATIONS
emails.relatedToId > accounts.id
webhooks.lastDeliveredAt
integration_logs.provider

// AUDIT & SECURITY
audit_logs.performedBy > users.id
api_keys.userId > users.id

// MISC
profiles.userId > users.id
accounts.id < opportunities.accountId
contacts.id < notes.entityId
accounts.id < attachments.entityId
"""

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
relations_input = relations_input_3


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

    if '<>' in line:
        parts = line.split('<>')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))
    elif '->' in line:
        parts = line.split('->')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))
    elif '>' in line:
        parts = line.split('>')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))
    elif '<' in line:
        parts = line.split('<')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))
    elif '-' in line:
        parts = line.split('-')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))

print(f"Relations parsées: {len(relations_raw)}")
for a, b in relations_raw:
    print(f"  {a} > {b}")


# === ÉTAPE 1 : CONSTITUER LE BACKLOG (LISTE 1) ===
print("\n" + "="*80)
print("ÉTAPE 1 : CONSTITUER LE BACKLOG")
print("="*80)

# Déduplication basée sur la PAIRE d'entités (peu importe l'ordre ou le symbole)
# RÈGLE: Si on a deux fois un lien entre A et B, c'est un doublon
# Le PREMIER lien rencontré a la priorité
#
# Exemples de doublons:
#   - A > B puis A > B      → DOUBLON (même lien)
#   - A > B puis A <> B     → DOUBLON (même paire A-B)
#   - A - B puis B <> A     → DOUBLON (même paire A-B, ordre inversé)
#   - A > B puis B > A      → DOUBLON (même paire A-B, ordre inversé)
#
# On garde toujours la PREMIÈRE relation rencontrée

seen_pairs = {}  # {frozenset({a, b}): (a, b) première relation}
unique_relations = []
duplicates_removed = []

for a, b in relations_raw:
    # Clé non-directionnelle: paire d'entités
    pair_key = frozenset({a, b})

    if pair_key not in seen_pairs:
        # Première fois qu'on voit cette paire d'entités
        seen_pairs[pair_key] = (a, b)
        unique_relations.append((a, b))
    else:
        # Doublon détecté! Même paire d'entités
        first = seen_pairs[pair_key]
        duplicates_removed.append(f"  [DOUBLON] {a} > {b} (premier: {first[0]} > {first[1]})")

relations = unique_relations
print(f"Relations après déduplication: {len(relations)}")

if duplicates_removed:
    print(f"\n{len(duplicates_removed)} doublon(s) supprimé(s):")
    for dup in duplicates_removed:
        print(dup)
else:
    print("Aucun doublon détecté")

# Comptage des connexions
connection_count = defaultdict(int)
for a, b in relations:
    connection_count[a] += 1
    connection_count[b] += 1


# === ÉTAPE 2 : DÉTERMINER L'ORDRE DE TRAITEMENT ===
print("\n" + "="*80)
print("ÉTAPE 2 : ORDRE DE TRAITEMENT")
print("="*80)

# Liste-Règle 1 (référence)
liste_regle_1 = sorted(connection_count.keys(),
                       key=lambda x: connection_count[x],
                       reverse=True)

# Liste à remplir
entity_order = []
liste_enonces = []

# ITERATION 1: Prendre le premier élément
entity_order.append(liste_regle_1[0])

# Ajouter les entités connectées
for a, b in relations:
    if a == entity_order[0] and b not in liste_enonces:
        liste_enonces.append(b)
    if b == entity_order[0] and a not in liste_enonces:
        liste_enonces.append(a)

# ITERATIONS suivantes
while len(entity_order) < len(liste_regle_1):
    candidates = [e for e in liste_enonces if e not in entity_order]
    if not candidates:
        break

    next_entity = max(candidates,
                      key=lambda e: (connection_count[e],
                                    -liste_regle_1.index(e)))

    entity_order.append(next_entity)

    # Mettre à jour liste_enonces
    for a, b in relations:
        if a == next_entity and b not in liste_enonces and b not in entity_order:
            liste_enonces.append(b)
        if b == next_entity and a not in liste_enonces and a not in entity_order:
            liste_enonces.append(a)

print(f"Ordre: {' > '.join(entity_order)}")


# === ÉTAPE 3 : CONSTRUCTION DES CLUSTERS ===
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


# === ÉTAPE 4 : BUILD LAYERS (VERSION SIMPLIFIÉE) ===
print("\n" + "="*80)
print("ÉTAPE 4 : BUILD LAYERS (SIMPLE)")
print("="*80)

layers = []

def find_layer_index(entity):
    """Trouve l'index du layer contenant l'entité"""
    for idx, layer in enumerate(layers):
        if entity in layer:
            return idx
    return None

def can_add_to_layer(entity, layer_idx):
    """Vérifie si on peut ajouter une entité à un layer (pas de relation)"""
    if layer_idx >= len(layers):
        return True

    for existing in layers[layer_idx]:
        for a, b in relations:
            if (a == entity and b == existing) or (a == existing and b == entity):
                return False
    return True

# Traiter chaque entité selon l'ordre
for iteration_num, entity_name in enumerate(entity_order, 1):
    print(f"\n{iteration_num}) '{entity_name}'")

    cluster_left = clusters[entity_name]['left']
    print(f"   Cluster: {cluster_left} > [{entity_name}]")

    # Trouver le layer maximum parmi les parents PLACÉS
    max_parent_layer = -1
    unplaced_parents = []

    for parent in cluster_left:
        parent_layer = find_layer_index(parent)
        if parent_layer is not None:
            max_parent_layer = max(max_parent_layer, parent_layer)
            print(f"   Parent '{parent}' en Layer {parent_layer}")
        else:
            unplaced_parents.append(parent)
            # print(f"   Parent '{parent}' non placé")

    # Vérifier si l'entité est déjà placée
    entity_already_placed = find_layer_index(entity_name) is not None

    # Si l'entité est déjà placée MAIS on a des parents non placés, les placer quand même
    if entity_already_placed and unplaced_parents:
        # print(f"   -> Entity déjà placé, mais placement des parents non placés: {unplaced_parents}")

        # Placer les parents non placés selon la logique normale
        # On cherche le max_parent_layer parmi les parents PLACÉS
        for parent in unplaced_parents:
            if find_layer_index(parent) is None:
                # Calculer où ce parent devrait aller (à gauche du layer cible de l'entité)
                # On trouve d'abord le max_parent_layer actuel
                current_max_parent = -1
                for placed_parent in cluster_left:
                    parent_layer = find_layer_index(placed_parent)
                    if parent_layer is not None:
                        current_max_parent = max(current_max_parent, parent_layer)

                # Le parent non placé devrait être placé au layer juste avant l'entité cible
                # L'entité cible sera à current_max_parent + 1
                entity_target = current_max_parent + 1
                parent_preferred = entity_target - 1 if entity_target > 0 else 0

                # Chercher de parent_preferred vers la gauche
                parent_placed = False
                for layer_idx in range(parent_preferred, -1, -1):
                    if can_add_to_layer(parent, layer_idx):
                        if layer_idx >= len(layers):
                            layers.append([parent])
                        else:
                            layers[layer_idx].append(parent)
                        print(f"      '{parent}' placé au Layer {layer_idx}")
                        # Mettre à jour max_parent_layer
                        max_parent_layer = max(max_parent_layer, layer_idx)
                        parent_placed = True
                        break

                # Si pas placé, insérer un nouveau layer à gauche
                if not parent_placed:
                    layers.insert(0, [parent])
                    print(f"      '{parent}' placé au nouveau Layer 0 (insertion à gauche)")
                    # Mettre à jour max_parent_layer (le parent est maintenant à 0, mais tous les autres ont été décalés)
                    max_parent_layer = max(max_parent_layer + 1, 0)

        # Vérifier si l'entité doit être déplacée
        # Trouver le layer actuel de l'entité
        entity_current_layer = find_layer_index(entity_name)

        # Recalculer max_parent_layer après placement des parents non placés
        final_max_parent = -1
        for parent in cluster_left:
            parent_layer = find_layer_index(parent)
            if parent_layer is not None:
                final_max_parent = max(final_max_parent, parent_layer)

        # L'entité devrait être au minimum à final_max_parent + 1
        required_layer = final_max_parent + 1

        if entity_current_layer < required_layer:
            print(f"   -> '{entity_name}' doit être déplacé de Layer {entity_current_layer} vers Layer {required_layer} (avec cascade)")

            # Identifier tous les descendants (enfants) ET leurs clusters (parents)
            def find_all_children(entity, visited=None):
                """Trouve récursivement tous les enfants d'une entité (avec protection contre cycles)"""
                if visited is None:
                    visited = set()

                if entity in visited:
                    return []

                visited.add(entity)
                children = []

                for a, b in relations:
                    if a == entity and b not in visited:
                        children.append(b)
                        # Récursion pour trouver les enfants des enfants
                        children.extend(find_all_children(b, visited))

                return list(set(children))  # Déduplication

            def find_all_parents(entity):
                """Trouve tous les parents directs d'une entité"""
                parents = []
                for a, b in relations:
                    if b == entity:
                        parents.append(a)
                return list(set(parents))

            # Déplacer l'entité, ses descendants (enfants)
            # ET les parents (cluster) de chaque descendant
            # SAUF les parents de l'entité principale (qui doivent rester à gauche)
            all_descendants = find_all_children(entity_name)
            entity_parents = set(cluster_left)  # Parents de l'entité principale à exclure

            entities_to_move_set = {entity_name}  # Commencer avec l'entité principale

            # Pour chaque descendant, ajouter le descendant ET ses parents (sauf parents de l'entité principale)
            for descendant in all_descendants:
                if find_layer_index(descendant) is not None:
                    entities_to_move_set.add(descendant)
                    # Ajouter les parents de ce descendant qui ne sont PAS parents de l'entité principale
                    for parent in find_all_parents(descendant):
                        if find_layer_index(parent) is not None and parent not in entity_parents:
                            entities_to_move_set.add(parent)

            entities_to_move = list(entities_to_move_set)

            # Calculer le décalage nécessaire
            shift = required_layer - entity_current_layer
            print(f"      Entites a deplacer en cascade (avec clusters): {entities_to_move}")
            print(f"      Decalage: +{shift} layers")

            # Déplacer toutes les entités concernées
            for entity_to_move in entities_to_move:
                current_pos = find_layer_index(entity_to_move)
                if current_pos is not None:
                    new_pos = current_pos + shift

                    # Retirer de l'ancien layer
                    layers[current_pos].remove(entity_to_move)

                    # Ajouter au nouveau layer
                    while len(layers) <= new_pos:
                        layers.append([])
                    layers[new_pos].append(entity_to_move)
                    print(f"      '{entity_to_move}' deplace: Layer {current_pos} -> Layer {new_pos}")

        # Continue pour afficher les layers
    elif entity_already_placed:
        # Entity déjà placé et pas de parents à placer
        print(f"   -> Déjà placé, skip")
        continue
    else:
        # Entity pas encore placé
        # Si on a des parents non placés, on doit les placer d'abord (cluster complet)
        if unplaced_parents:
            print(f"   -> Placement des parents non placés: {unplaced_parents}")

            # Placer tous les parents non placés
            # Stratégie: placer directement à gauche de l'entité (layer juste avant)
            # En cas de conflit, chercher plus à gauche jusqu'à Layer 0
            # Si même Layer 0 a conflit, insérer un nouveau layer à gauche (devient le nouveau Layer 0)
            for parent in unplaced_parents:
                if find_layer_index(parent) is None:
                    # L'entité sera placée au target_layer (max_parent_layer + 1)
                    # Le parent doit être placé directement à gauche: target_layer - 1
                    entity_target = max_parent_layer + 1
                    parent_preferred = entity_target - 1 if entity_target > 0 else 0

                    # Chercher de parent_preferred vers la gauche (0)
                    parent_placed = False
                    for layer_idx in range(parent_preferred, -1, -1):
                        if can_add_to_layer(parent, layer_idx):
                            if layer_idx >= len(layers):
                                layers.append([parent])
                            else:
                                layers[layer_idx].append(parent)
                            print(f"      '{parent}' placé au Layer {layer_idx}")
                            # Mettre à jour max_parent_layer
                            max_parent_layer = max(max_parent_layer, layer_idx)
                            parent_placed = True
                            break

                    # Si pas placé (tous les layers ont conflit), insérer un nouveau layer à gauche
                    if not parent_placed:
                        layers.insert(0, [parent])
                        print(f"      '{parent}' placé au nouveau Layer 0 (insertion à gauche)")
                        # Tous les autres layers ont été décalés, donc max_parent_layer aussi
                        max_parent_layer = max_parent_layer + 1 if max_parent_layer >= 0 else 0
                        # Le parent est maintenant au Layer 0
                        max_parent_layer = max(max_parent_layer, 0)

        # Placer l'entité au minimum layer valide à droite du max parent
        target_layer = max_parent_layer + 1

        # Chercher le premier layer compatible à partir de target_layer
        placed = False
        for layer_idx in range(target_layer, len(layers) + 1):
            if can_add_to_layer(entity_name, layer_idx):
                if layer_idx >= len(layers):
                    layers.append([entity_name])
                else:
                    layers[layer_idx].append(entity_name)
                placed = True
                print(f"   -> '{entity_name}' placé au Layer {layer_idx}")
                break

        if not placed:
            # Ne devrait jamais arriver
            layers.append([entity_name])
            print(f"   -> Nouveau Layer {len(layers)-1}")

    # Afficher les layers après placement
    print(f"\n   Layers après placement:")
    for idx, layer in enumerate(layers):
        print(f"     Layer {idx}: {layer}")

# Nettoyer les layers vides
layers = [layer for layer in layers if layer]

print("\n" + "="*80)
print("RÉSULTAT APRÈS ÉTAPE 4")
print("="*80)
for idx, layer in enumerate(layers):
    print(f"Layer {idx}: {layer}")


# === ÉTAPE 6 : RÉORGANISATION VERTICALE PAR CLUSTER ===
print("\n" + "="*80)
print("ÉTAPE 6 : RÉORGANISATION VERTICALE")
print("="*80)

def reorder_layers_by_cluster():
    global layers

    if not layers:
        return

    # Dernier layer: ordre selon entity_order
    last_layer_idx = len(layers) - 1
    last_layer = layers[last_layer_idx]

    ordered_last = []
    for entity in entity_order:
        if entity in last_layer:
            ordered_last.append(entity)

    for entity in last_layer:
        if entity not in ordered_last:
            ordered_last.append(entity)

    layers[last_layer_idx] = ordered_last

    # Autres layers de droite à gauche
    for layer_idx in range(len(layers) - 2, -1, -1):
        current_layer = layers[layer_idx]
        next_layer = layers[layer_idx + 1]

        # Trouver les cibles pour chaque entité
        entity_to_all_targets = {}
        for entity in current_layer:
            targets = []
            for a, b in relations:
                if a == entity and b in next_layer:
                    targets.append(b)
            entity_to_all_targets[entity] = targets

        # Grouper les entités par leur cible principale (première cible ou None)
        # Ceci garantit que les entités pointant vers la même cible restent groupées
        entity_primary_target = {}
        for entity in current_layer:
            targets = entity_to_all_targets[entity]
            if targets:
                # Prendre la première cible comme cible principale (ou celle avec position min)
                primary = min(targets, key=lambda t: next_layer.index(t))
                entity_primary_target[entity] = primary
            else:
                entity_primary_target[entity] = None

        # Calculer position de la cible principale
        entity_target_pos = {}
        for entity in current_layer:
            primary = entity_primary_target[entity]
            if primary is None:
                entity_target_pos[entity] = -1
            else:
                entity_target_pos[entity] = next_layer.index(primary)

        # Grouper les entités par leur cible principale
        # Créer des groupes: {target: [entities]}
        target_groups = {}
        for entity in current_layer:
            primary = entity_primary_target[entity]
            if primary not in target_groups:
                target_groups[primary] = []
            target_groups[primary].append(entity)

        # Trier chaque groupe par entity_order
        for target in target_groups:
            target_groups[target] = sorted(target_groups[target], key=lambda e: (
                entity_order.index(e) if e in entity_order else 999
            ))

        # Ordonner les groupes par position de leur cible dans next_layer
        # Les entités sans cible (None) vont en premier
        ordered_targets = sorted(target_groups.keys(), key=lambda t: (
            next_layer.index(t) if t is not None else -1
        ))

        # Construire la liste finale
        ordered_layer = []
        for target in ordered_targets:
            ordered_layer.extend(target_groups[target])

        layers[layer_idx] = ordered_layer

reorder_layers_by_cluster()

print("\n" + "="*80)
print("RÉSULTAT FINAL")
print("="*80)
for idx, layer in enumerate(layers):
    print(f"Layer {idx}: {layer}")

print("\n" + "="*80)
print("VISUALISATION 2D")
print("="*80)
if layers:
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
