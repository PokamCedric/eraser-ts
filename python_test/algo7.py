"""
Algorithm v7 - PROGRESSIVE CLUSTER BUILDING
Combines:
- algo5.py: Steps 0-3 (parsing and cluster construction)
- test4.py: Step 4 (distance-based layer building with reference entity)
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
relations_input = relations_input_1  # Test with CRM dataset

# === LayerClassifier from test4.py ===
class LayerClassifier:
    def __init__(self):
        self.relations = []  # liste des relations (left, right)
        self.entities = set()  # toutes les entités
        self.distances = {}  # distances entre entités : (left, right) -> distance

    def add_relation(self, left, right):
        """Ajoute une relation A r B (A doit être à gauche de B)"""
        self.relations.append((left, right))
        self.entities.add(left)
        self.entities.add(right)
        # Distance initiale = 1
        self.distances[(left, right)] = 1
        # Recalculer toutes les distances avec les intercalations
        self._update_distances()

    def _update_distances(self):
        """Met à jour les distances en détectant les intercalations transitives (Théorème de Thalès)

        Utilise Floyd-Warshall modifié pour calculer la distance MAXIMALE entre toutes paires.
        La distance maximale représente le nombre d'intercalations dans le chemin le plus long.
        """
        # Floyd-Warshall: pour chaque nœud intermédiaire k
        for k in self.entities:
            # Pour chaque paire source i et destination j
            for i in self.entities:
                for j in self.entities:
                    if i != j and i != k and j != k:
                        # Si on a un chemin i -> k et k -> j
                        if (i, k) in self.distances and (k, j) in self.distances:
                            # Distance via k
                            dist_via_k = self.distances[(i, k)] + self.distances[(k, j)]

                            # Mettre à jour la distance i -> j si on trouve un chemin plus long
                            if (i, j) in self.distances:
                                if dist_via_k > self.distances[(i, j)]:
                                    self.distances[(i, j)] = dist_via_k
                            else:
                                # Créer une nouvelle distance transitive
                                self.distances[(i, j)] = dist_via_k

    def _count_connections(self):
        """Compte le nombre de connexions pour chaque entité"""
        connections = {}
        for entity in self.entities:
            count = 0
            for left, right in self.relations:
                if left == entity or right == entity:
                    count += 1
            connections[entity] = count
        return connections

    def compute_layers(self):
        """Calcule les layers en utilisant l'entité la plus connectée comme référence"""
        if not self.entities:
            return []

        # Étape 1: Trouver l'entité la plus connectée (avec cascade de critères en cas d'égalité)
        connections = self._count_connections()

        # Cascade de critères pour choisir la référence:
        # 1. Nombre de connexions directes (critère primaire)
        # 2. Somme des connexions des voisins (critère secondaire)
        # 3. Ordre d'apparition (critère tertiaire - implicite dans max())

        def get_reference_score(entity):
            """Calcule le score de référence d'une entité avec cascade de critères"""
            # Critère 1: Nombre de connexions directes
            direct_connections = connections[entity]

            # Critère 2: Somme des connexions des voisins
            neighbors_connections_sum = 0
            for left, right in self.relations:
                if left == entity:
                    neighbors_connections_sum += connections.get(right, 0)
                elif right == entity:
                    neighbors_connections_sum += connections.get(left, 0)

            # Retourner un tuple pour tri lexicographique
            # (plus grand nombre de connexions, plus grande somme des voisins)
            return (direct_connections, neighbors_connections_sum)

        reference_entity = max(connections.keys(), key=get_reference_score)
        ref_score = get_reference_score(reference_entity)

        print(f"\n[DEBUG] Entite de reference: {reference_entity} ({connections[reference_entity]} connexions, somme voisins: {ref_score[1]})")

        # Étape 2: Trier les relations par connectivité
        sorted_distances = sorted(
            self.distances.items(),
            key=lambda item: connections[item[0][0]] + connections[item[0][1]],
            reverse=True
        )

        print(f"\n[DEBUG] === Relations triees par connectivite ===")
        for idx, ((left, right), distance) in enumerate(sorted_distances[:15], 1):
            conn_sum = connections[left] + connections[right]
            print(f"[DEBUG] {idx}. {left}({connections[left]}) r {right}({connections[right]}) = {conn_sum} connexions")

        # Étape 3: Placer l'entité de référence au layer 0
        layers = {reference_entity: 0}

        # Étape 4: Propager depuis l'entité de référence
        max_iterations = len(self.entities) ** 2
        iteration = 0

        while len(layers) < len(self.entities) and iteration < max_iterations:
            iteration += 1
            progress = False

            for (left, right), distance in sorted_distances:
                if left in layers and right not in layers:
                    layers[right] = layers[left] + distance
                    progress = True

                elif right in layers and left not in layers:
                    layers[left] = layers[right] - distance
                    progress = True

                elif left in layers and right in layers:
                    expected = layers[left] + distance
                    if layers[right] < expected:
                        layers[right] = expected
                        progress = True

            if not progress:
                for entity in self.entities:
                    if entity not in layers:
                        layers[entity] = 0

        # Afficher résumé
        print(f"\n[DEBUG] ========================================")
        print(f"[DEBUG] DISTANCES PAR RAPPORT A {reference_entity.upper()}")
        print(f"[DEBUG] ========================================")

        by_distance = {}
        for entity in layers.keys():
            if entity != reference_entity:
                dist = layers[entity]
                if dist not in by_distance:
                    by_distance[dist] = []
                by_distance[dist].append(entity)

        for dist in sorted(by_distance.keys()):
            direction = "GAUCHE" if dist < 0 else ("DROITE" if dist > 0 else "MEME LAYER")
            print(f"[DEBUG] Distance {dist:+d} ({direction}):")
            for entity in sorted(by_distance[dist]):
                print(f"[DEBUG]   - {entity}")

        # Normaliser
        if layers:
            min_layer = min(layers.values())
            layers = {e: l - min_layer for e, l in layers.items()}
            print(f"\n[DEBUG] Normalisation: decalage de {-min_layer}")
            print(f"[DEBUG] {reference_entity} est maintenant au layer {layers[reference_entity]}")

        # Grouper par layer
        layer_dict = {}
        for entity, layer in layers.items():
            if layer not in layer_dict:
                layer_dict[layer] = []
            layer_dict[layer].append(entity)

        sorted_layers = [sorted(layer_dict[i]) for i in sorted(layer_dict.keys())]
        return sorted_layers

    def __str__(self):
        layers = self.compute_layers()
        return " - ".join(["(" + ", ".join(layer) + ")" for layer in layers])

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
    if not line or line.startswith('//'):
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
        relations_raw.append((a, b))  # Left entity stays left regardless of arrow direction
    elif '-' in line:
        parts = line.split('-')
        a = extract_table_name(parts[0].strip())
        b = extract_table_name(parts[1].strip())
        relations_raw.append((a, b))

print(f"Relations parsees: {len(relations_raw)}")
for a, b in relations_raw[:10]:
    print(f"  {a} > {b}")
if len(relations_raw) > 10:
    print(f"  ... ({len(relations_raw) - 10} more)")


# === ÉTAPE 1 : DÉDUPLICATION ===
print("\n" + "="*80)
print("ÉTAPE 1 : DÉDUPLICATION")
print("="*80)

seen_pairs = {}
unique_relations = []
duplicates_removed = []

for a, b in relations_raw:
    pair_key = frozenset({a, b})

    if pair_key not in seen_pairs:
        seen_pairs[pair_key] = (a, b)
        unique_relations.append((a, b))
    else:
        first = seen_pairs[pair_key]
        duplicates_removed.append(f"  [DOUBLON] {a} > {b} (premier: {first[0]} > {first[1]})")

relations = unique_relations
print(f"Relations apres deduplication: {len(relations)}")

if duplicates_removed:
    print(f"\n{len(duplicates_removed)} doublon(s) supprime(s):")
    for dup in duplicates_removed[:5]:
        print(dup)
    if len(duplicates_removed) > 5:
        print(f"  ... ({len(duplicates_removed) - 5} more)")
else:
    print("Aucun doublon detecte")


# === ÉTAPE 2 : DÉTERMINER L'ORDRE DE TRAITEMENT ===
print("\n" + "="*80)
print("ÉTAPE 2 : ORDRE DE TRAITEMENT")
print("="*80)

connection_count = defaultdict(int)
for a, b in relations:
    connection_count[a] += 1
    connection_count[b] += 1

liste_regle_1 = sorted(connection_count.keys(),
                       key=lambda x: connection_count[x],
                       reverse=True)

entity_order = []
liste_enonces = []

# ITERATION 1: Prendre le premier élément (le plus connecté)
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

    for a, b in relations:
        if a == next_entity and b not in liste_enonces and b not in entity_order:
            liste_enonces.append(b)
        if b == next_entity and a not in liste_enonces and a not in entity_order:
            liste_enonces.append(a)

print(f"Ordre (top 10): {' > '.join(entity_order[:10])}")
if len(entity_order) > 10:
    print(f"... ({len(entity_order) - 10} more)")


# === ÉTAPE 3 : CONSTRUCTION DES CLUSTERS ===
print("\n" + "="*80)
print("ÉTAPE 3 : CONSTRUCTION DES CLUSTERS")
print("="*80)

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

print(f"Clusters construits: {len(clusters)}")
for entity_name in entity_order[:5]:
    cluster_left = clusters[entity_name]['left']
    print(f"  Cluster-{entity_name}: {cluster_left} > [{entity_name}]")
if len(clusters) > 5:
    print(f"  ... ({len(clusters) - 5} more)")


# === ÉTAPE 4.1 : BUILD CLUSTER OF ALL ELEMENTS ===
print("\n" + "="*80)
print("ÉTAPE 4.1 : BUILD Cluster of all elements")
print("="*80)

for entity_name in entity_order:
    cluster_left = clusters[entity_name]['left']
    print(f"   Cluster-{entity_name}: {cluster_left} r [{entity_name}]")


# === ÉTAPE 4.2 : BUILD LAYERS (PROGRESSIVE) ===
print("\n" + "="*80)
print("ÉTAPE 4.2 : BUILD LAYERS (SIMPLE)")
print("="*80)

# Define major entities to show detailed layer building
major_entities = ['users', 'accounts', 'leads', 'opportunities', 'quotes', 'orders', 'invoices', 'payments']

for idx, major_entity in enumerate(major_entities, 1):
    if major_entity not in clusters:
        continue

    print(f"\n{idx}) '{major_entity}'")

    # Show cluster for this entity
    cluster_left = clusters[major_entity]['left']
    print(f"   Cluster-{major_entity}: {cluster_left} r [{major_entity}]")

    # Build classifier with relations involving this entity and its cluster
    classifier = LayerClassifier()

    # Get all relevant relations for this major entity
    # Include all relations where major_entity or its cluster elements appear
    cluster_entities = set(cluster_left + [major_entity])

    # Expand to include related entities (children and their clusters)
    expanded_entities = cluster_entities.copy()

    # Add all direct children of major_entity
    for a, b in relations:
        if a == major_entity:
            expanded_entities.add(b)
        if b == major_entity:
            expanded_entities.add(a)

    # Add children of cluster elements
    for cluster_elem in cluster_left:
        for a, b in relations:
            if a == cluster_elem or b == cluster_elem:
                expanded_entities.add(a)
                expanded_entities.add(b)

    # Find all relations within this expanded set
    relevant_relations = []
    for a, b in relations:
        if a in expanded_entities or b in expanded_entities:
            relevant_relations.append((a, b))

    # Add relations to classifier
    print(f"\n   Relations pertinentes: {len(relevant_relations)}")
    for left, right in relevant_relations:
        classifier.add_relation(left, right)

    # Build layers
    print(f"\n   === BUILD LAYERS pour '{major_entity}' ===")
    layers = classifier.compute_layers()

    print(f"\n   === RESULTAT POUR '{major_entity}' ===")
    for layer_idx, layer in enumerate(layers):
        print(f"   Layer {layer_idx}: {layer}")

    print(f"\n   {classifier}")

    # Statistics
    print(f"\n   === STATISTIQUES ===")
    print(f"   Nombre d'entites: {len(classifier.entities)}")
    print(f"   Nombre de relations: {len(relevant_relations)}")
    print(f"   Nombre de layers: {len(layers)}")

    # Intercalations
    print(f"\n   === INTERCALATIONS DETECTEES ===")
    intercalations = []
    for (x, z) in classifier.relations:
        for y in classifier.entities:
            if y != x and y != z:
                if (x, y) in classifier.relations and (y, z) in classifier.relations:
                    intercalations.append((x, y, z))

    if intercalations:
        for (x, y, z) in sorted(set(intercalations))[:10]:
            print(f"     {y} entre {x} et {z}")
        if len(set(intercalations)) > 10:
            print(f"     ... ({len(set(intercalations)) - 10} more)")
    else:
        print("     Aucune intercalation")

    # Distances > 1
    print(f"\n   === DISTANCES > 1 ===")
    distances_gt1 = [(left, right, dist) for (left, right), dist in sorted(classifier.distances.items()) if dist > 1]
    if distances_gt1:
        for left, right, distance in distances_gt1[:10]:
            print(f"     distance({left}, {right}) = {distance}")
        if len(distances_gt1) > 10:
            print(f"     ... ({len(distances_gt1) - 10} more)")
    else:
        print("     Toutes les distances = 1")

    print("\n" + "-"*80)


# === RÉSULTAT FINAL GLOBAL ===
print("\n" + "="*80)
print("RÉSULTAT FINAL GLOBAL - TOUTES LES ENTITÉS")
print("="*80)

# Build final classifier with ALL relations
final_classifier = LayerClassifier()
for left, right in relations:
    final_classifier.add_relation(left, right)

# Build final layers
final_layers = final_classifier.compute_layers()

print(f"\n=== RESULTAT FINAL ===")
for layer_idx, layer in enumerate(final_layers):
    print(f"Layer {layer_idx}: {layer}")

print(f"\n{final_classifier}")

# Final Statistics
print(f"\n=== STATISTIQUES FINALES ===")
print(f"Nombre total d'entites: {len(final_classifier.entities)}")
print(f"Nombre total de relations: {len(relations)}")
print(f"Nombre de layers: {len(final_layers)}")

print("\n" + "="*80)
print("ALGORITHME TERMINÉ")
print("="*80)
