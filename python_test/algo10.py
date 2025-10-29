"""
Algorithm v10 - OPTIMIZED STEP-BY-STEP DISTANCE CALCULATION (Phase 2)
Based on algo9 with Phase 2 optimizations targeting the critical propagation loop.

Optimizations implemented (Phase 1):
- #4: Optimized _count_connections (O(n×r) → O(r))
- #3: Use sets instead of lists for cluster lookups (O(n) → O(1))
- #1: Pre-compute clusters cache (O(n×r) per step → O(r) once)

Optimizations implemented (Phase 2):
- #2: Index inversé for propagation (O(n) → O(d) where d = dependents)
- #5: Early exit in propagation (avoid redundant calculations)

Expected gain: 30-40% faster than algo9 (targeting the critical propagation loop)
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

    # helper
def log(info : str, debug=False):
    if debug: print(info)

def logTitle(  title: str   ):
    log('\n' + '='*80)
    log(title)
    log('='*80)


# Choisir le DSL à tester
relations_input = relations_input_crm  # Test with CRM dataset

# === LayerClassifier with Step-by-Step Distance Calculation ===
class LayerClassifier:
    def __init__(self):
        self.relations = []  # liste des relations (left, right)
        self.entities = set()  # toutes les entités
        self.distances = {}  # distances entre entités : (left, right) -> distance
        self.entity_reference_distances = defaultdict(dict)  # entity -> {reference: distance}

        # OPTIMIZATION #1: Pre-compute clusters cache
        self.clusters_cache = {}  # {entity: set(cluster_elements)}

        # OPTIMIZATION #2: Index inversé for fast propagation lookups
        # Maps each entity to the set of entities that depend on it
        self.dependents_index = defaultdict(set)  # {entity: {entities_that_depend_on_it}}



    def add_relation(self, left, right):
        """Ajoute une relation A r B (A doit être à gauche de B)"""
        self.relations.append((left, right))
        self.entities.add(left)
        self.entities.add(right)
        # Distance initiale = 1
        self.distances[(left, right)] = 1

    def _precompute_clusters(self):
        """Pre-compute clusters for all entities

        OPTIMIZATION #1: O(n×r) per step → O(r) once
        Build a cache mapping each entity to its cluster elements.
        """
        self.clusters_cache = defaultdict(set)
        for left, right in self.relations:
            self.clusters_cache[right].add(left)

    def _propagate_distance_update(self, updated_entity, updated_ref, new_dist, visited=None):
        """
        When an entity's distance to a reference is updated, propagate this change
        to all entities that depend on this entity.

        OPTIMIZATION #2: Use dependents_index instead of scanning all entities (O(n) → O(d))
        OPTIMIZATION #5: Early exit with visited set to avoid redundant propagations
        """
        # OPTIMIZATION #5: Early exit if we've already processed this update
        if visited is None:
            visited = set()

        propagation_key = (updated_entity, updated_ref, new_dist)
        if propagation_key in visited:
            return  # Already propagated this exact update
        visited.add(propagation_key)

        # OPTIMIZATION #2: Only iterate over entities that actually depend on updated_entity
        # Instead of: for entity in self.entity_reference_distances:
        for entity in self.dependents_index[updated_entity]:
            if updated_entity in self.entity_reference_distances[entity]:
                dist_to_updated = self.entity_reference_distances[entity][updated_entity]
                inherited_dist = dist_to_updated + new_dist

                # Update if no distance exists or if new path is longer (more intercalations)
                if updated_ref not in self.entity_reference_distances[entity]:
                    self.entity_reference_distances[entity][updated_ref] = inherited_dist
                    log( f"[PROPAGATION] dist({entity}, {updated_ref}) = {inherited_dist} (via {updated_entity})")
                    # Recursively propagate this update
                    self._propagate_distance_update(entity, updated_ref, inherited_dist, visited)
                elif self.entity_reference_distances[entity][updated_ref] < inherited_dist:
                    old_dist = self.entity_reference_distances[entity][updated_ref]
                    self.entity_reference_distances[entity][updated_ref] = inherited_dist
                    log(f"  [PROPAGATION] dist({entity}, {updated_ref}) = {old_dist} -> {inherited_dist} (via {updated_entity})")
                    # Recursively propagate this update
                    self._propagate_distance_update(entity, updated_ref, inherited_dist, visited)

    def _update_distances_step_by_step(self, entity_order):
        """
        Calculate distances step-by-step following entity processing order.
        Each entity becomes a reference point, and we calculate relative distances
        for its cluster elements.

        This replaces Floyd-Warshall with a more intuitive progressive approach.
        """
        log("=== STEP-BY-STEP DISTANCE CALCULATION ===")

        # OPTIMIZATION #1: Pre-compute clusters once
        self._precompute_clusters()

        # Process entities in order
        for step_idx, reference_entity in enumerate(entity_order, 1):
            if reference_entity not in self.entities:
                continue

            log(f"Step {step_idx}: Processing reference '{reference_entity}'")

            # OPTIMIZATION #1: Use cached clusters instead of scanning relations
            cluster_elements = self.clusters_cache.get(reference_entity, set())

            if not cluster_elements:
                log(f"No cluster elements for '{reference_entity}'")
                continue

            log(f"Cluster elements: {cluster_elements}")

            # For each cluster element, calculate its distance to this reference
            for element in cluster_elements:
                # Direct distance is always 1
                direct_dist = 1

                # Store the reference distance
                self.entity_reference_distances[element][reference_entity] = direct_dist

                # OPTIMIZATION #2: Build the dependents index
                # Track that 'element' depends on 'reference_entity'
                self.dependents_index[reference_entity].add(element)

                log(f"  dist({element}, {reference_entity}) = {direct_dist}")

                # Calculate transitive distances through this reference
                # If B -> reference and reference has distance to other refs, then B inherits those distances + 1
                # IMPORTANT: This must happen BEFORE we display the final distances
                if reference_entity in self.entity_reference_distances:
                    for prev_ref, prev_dist in self.entity_reference_distances[reference_entity].items():
                        # Inherit distance through reference
                        inherited_dist = direct_dist + prev_dist

                        # Only inherit if: (1) no distance exists yet OR (2) inherited path has MORE intercalations (longer)
                        # This finds the path with the maximum number of intercalations
                        if prev_ref not in self.entity_reference_distances[element]:
                            self.entity_reference_distances[element][prev_ref] = inherited_dist
                            log(f"  dist({element}, {prev_ref}) = {inherited_dist} (via {reference_entity})")
                        elif self.entity_reference_distances[element][prev_ref] < inherited_dist:
                            # Update to path with more intercalations
                            old_dist = self.entity_reference_distances[element][prev_ref]
                            self.entity_reference_distances[element][prev_ref] = inherited_dist
                            log(f"  dist({element}, {prev_ref}) = {old_dist} -> {inherited_dist} (via {reference_entity}) [MORE INTERCALATIONS]")

                            # Propagate this update to dependent entities
                            self._propagate_distance_update(element, prev_ref, inherited_dist)

                # Now check if this element has distances to multiple references
                # This creates the multi-reference distance vectors like dist(opportunities, accounts, users) = 1, 2
                if len(self.entity_reference_distances[element]) > 1:
                    all_refs = list(self.entity_reference_distances[element].keys())
                    distances_str = ", ".join([str(self.entity_reference_distances[element][ref]) for ref in all_refs])
                    log(f"  => {element} distances: [{distances_str}] to [{', '.join(all_refs)}]")

        # Update the distances dict based on calculated reference distances
        # For layer computation, we need the distance from each entity to the most connected one
        log(f"=== UPDATING DISTANCES DICT ===")
        for entity in self.entity_reference_distances:
            for ref, dist in self.entity_reference_distances[entity].items():
                if (entity, ref) not in self.distances or self.distances[(entity, ref)] < dist:
                    self.distances[(entity, ref)] = dist
                    log(f"distances[({entity}, {ref})] = {dist}")

    def _count_connections(self):
        """Compte le nombre de connexions pour chaque entité

        OPTIMIZATION #4: O(n×r) → O(r)
        Instead of iterating over all relations for each entity,
        we iterate over relations once and increment counters.
        """
        connections = defaultdict(int)
        for left, right in self.relations:
            connections[left] += 1
            connections[right] += 1
        return dict(connections)

    def compute_layers(self, entity_order):
        """Calcule les layers en utilisant l'entité la plus connectée comme référence

        Args:
            entity_order: The processing order of entities from Step 2
        """
        if not self.entities:
            return []

        # Calculate distances using step-by-step methodology
        self._update_distances_step_by_step(entity_order)

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

        log(f"Entite de reference: {reference_entity} ({connections[reference_entity]} connexions, somme voisins: {ref_score[1]})")

        # Étape 2: Trier les relations par connectivité
        sorted_distances = sorted(
            self.distances.items(),
            key=lambda item: connections[item[0][0]] + connections[item[0][1]],
            reverse=True
        )

        log(f"=== Relations triees par connectivite ===")
        for idx, ((left, right), distance) in enumerate(sorted_distances[:15], 1):
            conn_sum = connections[left] + connections[right]
            log(f"{idx}. {left}({connections[left]}) r {right}({connections[right]}) = {conn_sum} connexions")

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
        log(f"========================================")
        log(f"DISTANCES PAR RAPPORT A {reference_entity.upper()}")
        log(f"========================================")

        by_distance = {}
        for entity in layers.keys():
            if entity != reference_entity:
                dist = layers[entity]
                if dist not in by_distance:
                    by_distance[dist] = []
                by_distance[dist].append(entity)

        for dist in sorted(by_distance.keys()):
            direction = "GAUCHE" if dist < 0 else ("DROITE" if dist > 0 else "MEME LAYER")
            log(f"Distance {dist:+d} ({direction}):")
            for entity in sorted(by_distance[dist]):
                log(f"- {entity}")

        # Normaliser
        if layers:
            min_layer = min(layers.values())
            layers = {e: l - min_layer for e, l in layers.items()}
            log(f"Normalisation: decalage de {-min_layer}")
            log(f"{reference_entity} est maintenant au layer {layers[reference_entity]}")

        # Grouper par layer
        layer_dict = {}
        for entity, layer in layers.items():
            if layer not in layer_dict:
                layer_dict[layer] = []
            layer_dict[layer].append(entity)

        sorted_layers = [sorted(layer_dict[i]) for i in sorted(layer_dict.keys())]
        return sorted_layers

    def __str__(self):
        return " - ".join(["(" + ", ".join(layer) + ")" for layer in self.final_layers]) if hasattr(self, 'final_layers') else ""

# === ÉTAPE 0 : PARSER LES RELATIONS ===
logTitle("ÉTAPE 0 : PARSER LES RELATIONS")

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

log(f"Relations parsees: {len(relations_raw)}")
for a, b in relations_raw[:10]:
    log(f"  {a} > {b}")
if len(relations_raw) > 10:
    log(f"  ... ({len(relations_raw) - 10} more)")


# === ÉTAPE 1 : DÉDUPLICATION ===
logTitle("ÉTAPE 1 : CONSTITUER LE BACKLOG")

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
log(f"Relations après déduplication: {len(relations)}")

if duplicates_removed:
    log(f"\n{len(duplicates_removed)} doublon(s) supprimé(s):")
    for dup in duplicates_removed[:5]:
        log(dup)
    if len(duplicates_removed) > 5:
        log(f"  ... ({len(duplicates_removed) - 5} more)")


# === ÉTAPE 2 : DÉTERMINER L'ORDRE DE TRAITEMENT ===
logTitle("ÉTAPE 2 : ORDRE DE TRAITEMENT")

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

log(f"Ordre: {' > '.join(entity_order)}")


# === ÉTAPE 3 : CONSTRUCTION DES CLUSTERS (not used directly but shown for context) ===
logTitle("ÉTAPE 3 : CONSTRUCTION DES CLUSTERS")

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

log(f"Clusters construits: {len(clusters)}")
for entity_name in entity_order[:10]:
    cluster_left = clusters[entity_name]['left']
    log(f"  Cluster-{entity_name}: {cluster_left} r [{entity_name}]")
if len(clusters) > 10:
    log(f"  ... ({len(clusters) - 10} more)")


# === ÉTAPE 4.1 : BUILD CLUSTER OF ALL ELEMENTS ===
logTitle("ÉTAPE 4.1 : BUILD Cluster of all elements")
log("orignal cluster are every left elements of an entity. the choosen entity is the reference.")

for entity_name in entity_order[:15]:
    cluster_left = clusters[entity_name]['left']
    log(f"   Cluster-{entity_name}: {cluster_left} r [{entity_name}]")
if len(entity_order) > 15:
    log(f"   ...")


# === ÉTAPE 4.2 : CALCULATE ALL RELATIVE DISTANCES ===
logTitle("ÉTAPE 4.2 : CALCULATE ALL RELATIVE DISTANCES")
log("base on clusters we give each entities the a distance relativ to its reference.")
log("So all the left elements would have a initial distance from its reference.")

# Build final classifier with ALL relations
final_classifier = LayerClassifier()
for left, right in relations:
    final_classifier.add_relation(left, right)

# Build final layers using entity_order for step-by-step distance calculation
final_layers = final_classifier.compute_layers(entity_order)
final_classifier.final_layers = final_layers

log(f"\n=== RESULTAT AVANT RÉORGANISATION ===")
for layer_idx, layer in enumerate(final_layers):
    log(f"Layer {layer_idx}: {layer}")


# === ÉTAPE 6 : RÉORGANISATION VERTICALE PAR CLUSTER ===
logTitle("ÉTAPE 6 : RÉORGANISATION VERTICALE")

def reorder_layers_by_cluster(layers, relations, entity_order):
    """
    Réorganise l'ordre vertical des entités dans chaque layer pour aligner
    les clusters visuellement (entités pointant vers la même cible sont regroupées)
    """
    if not layers:
        return layers

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

    return layers

# Appliquer la réorganisation
final_layers = reorder_layers_by_cluster(final_layers, relations, entity_order)

log(f"\n=== RESULTAT FINAL (APRÈS RÉORGANISATION) ===", True)
for layer_idx, layer in enumerate(final_layers):
    log(f"Layer {layer_idx}: {layer}", True)

log(f"\n{final_classifier}")

# Final Statistics
log(f"\n=== STATISTIQUES FINALES ===")
log(f"Nombre total d'entites: {len(final_classifier.entities)}")
log(f"Nombre total de relations: {len(relations)}")
log(f"Nombre de layers: {len(final_layers)}")

# === VISUALISATION 2D ===
logTitle("VISUALISATION 2D")
if final_layers:
    max_entities = max(len(layer) for layer in final_layers)
    for row in range(max_entities):
        line = ""
        for layer in final_layers:
            if row < len(layer):
                entity = layer[row]
                line += f"{entity:20}"
            else:
                line += " " * 20
        log(line)

logTitle("ALGORITHME TERMINÉ")
