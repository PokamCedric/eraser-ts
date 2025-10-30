"""
Algorithm v13 - COMPLETE LAYER CLASSIFICATION ORCHESTRATOR
Clean architecture with separation of concerns:
- Phase 0: Parsing (RelationParser)
- Phase 1-2: Preprocessing (GraphPreprocessor)
- Phase 3: Horizontal Alignment / X-axis (HorizontalLayerClassifier)
- Phase 4: Vertical Alignment / Y-axis (VerticalOrderOptimizer)

Vocabulary:
- Predecessors: Nodes pointing to an entity
- Direct Predecessors: Predecessors at distance exactly 1
- Horizontal: Layer assignment (X-axis positioning)
- Vertical: Order within layer (Y-axis positioning)
- Pivot: Entity belonging to multiple predecessor groups
"""

from collections import defaultdict
from typing import List, Tuple, Set, Dict

# === PHASE 0: RELATION PARSER ===

class RelationParser:
    """
    Parses DSL relations into normalized (left, right) tuples
    Handles: ->, <-, <>, -, >
    """

    @staticmethod
    def extract_entity_name(s: str) -> str:
        """Extract entity name from 'entity.field' or 'entity'"""
        return s.split('.')[0].strip()

    @classmethod
    def parse(cls, dsl_input: str) -> List[Tuple[str, str]]:
        """
        Parse DSL string into list of directed relations

        Returns: [(left, right), ...] where left -> right
        """
        relations_raw = []

        for line in dsl_input.strip().split('\n'):
            line = line.strip()
            if not line or line.startswith('//'):
                continue

            # Detect relation type and parse
            if '<>' in line:
                parts = line.split('<>')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))
            elif '->' in line:
                parts = line.split('->')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))
            elif '>' in line:
                parts = line.split('>')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))
            elif '<' in line:
                parts = line.split('<')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))  # A < B means A is left of B, so A -> B
            elif '-' in line:
                parts = line.split('-')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))

        return relations_raw

# === PHASE 1-2: GRAPH PREPROCESSOR ===

class GraphPreprocessor:
    """
    Preprocesses raw relations:
    - Deduplication (same entity pair)
    - Entity ordering by connectivity
    """

    @staticmethod
    def deduplicate(relations: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Remove duplicate relations based on entity pairs (order-agnostic)

        This matches algo10's deduplication logic:
        - (A, B) and (A, B) -> keep one
        - (A, B) and (B, A) -> keep one (bidirectional treated as same)

        Example: users -> profiles AND profiles -> users
                 Only the first one is kept
        """
        seen_pairs = {}
        unique_relations = []

        for a, b in relations:
            pair_key = frozenset({a, b})  # Order-agnostic
            if pair_key not in seen_pairs:
                seen_pairs[pair_key] = (a, b)
                unique_relations.append((a, b))

        return unique_relations

    @staticmethod
    def build_entity_order(relations: List[Tuple[str, str]]) -> List[str]:
        """
        Build entity processing order based on connectivity

        Algorithm:
        1. Sort by connection count (descending)
        2. Breadth-first expansion from most connected
        3. Tie-breaker: position in connectivity ranking
        """
        # Count connections per entity
        connection_count = defaultdict(int)
        for a, b in relations:
            connection_count[a] += 1
            connection_count[b] += 1

        # Rule 1: Sort by connectivity
        connectivity_ranking = sorted(
            connection_count.keys(),
            key=lambda x: connection_count[x],
            reverse=True
        )

        if not connectivity_ranking:
            return []

        # Build order with breadth-first expansion
        entity_order = []
        frontier = []  # Entities connected to already processed

        # Start with most connected
        entity_order.append(connectivity_ranking[0])

        # Add all neighbors of first entity to frontier
        for a, b in relations:
            if a == entity_order[0] and b not in frontier:
                frontier.append(b)
            if b == entity_order[0] and a not in frontier:
                frontier.append(a)

        # Expand frontier
        while len(entity_order) < len(connectivity_ranking):
            candidates = [e for e in frontier if e not in entity_order]
            if not candidates:
                break

            # Choose next: max connectivity, tie-break by ranking position
            next_entity = max(
                candidates,
                key=lambda e: (
                    connection_count[e],
                    -connectivity_ranking.index(e)
                )
            )

            entity_order.append(next_entity)

            # Expand frontier with neighbors
            for a, b in relations:
                if a == next_entity and b not in frontier and b not in entity_order:
                    frontier.append(b)
                if b == next_entity and a not in frontier and a not in entity_order:
                    frontier.append(a)

        return entity_order

# === PHASE 3: HORIZONTAL LAYER CLASSIFIER ===

# Helper function for logging (matches algo10)
def log(message: str, debug=False):
    """Silently ignore log messages (algo10 compatibility)"""
    pass

class HorizontalLayerClassifier:
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

# === PHASE 4: VERTICAL ORDER OPTIMIZER ===

class DirectPredecessorAnalyzer:
    """
    Analyzes direct predecessors (distance = 1 only)
    """

    @staticmethod
    def compute_direct_predecessors(
        layers: List[List[str]],
        relations: List[Tuple[str, str]]
    ) -> Dict[str, Set[str]]:
        """
        Compute direct predecessors for each entity

        Direct predecessor: entity at distance exactly 1 (immediate neighbor)

        Returns: {entity: {direct_predecessors}}
        """
        # Build layer index
        layer_of = {}
        for layer_idx, layer in enumerate(layers):
            for entity in layer:
                layer_of[entity] = layer_idx

        # Find direct predecessors (same layer or previous layer)
        direct_predecessors = defaultdict(set)

        for left, right in relations:
            if left in layer_of and right in layer_of:
                left_layer = layer_of[left]
                right_layer = layer_of[right]

                # Direct if distance = 1 layer
                if right_layer - left_layer == 1:
                    direct_predecessors[right].add(left)

        return dict(direct_predecessors)

class VerticalOrderOptimizer:
    """
    Optimizes vertical order within each layer to minimize edge crossings
    Uses cluster-based sorting with pivot detection
    """

    def __init__(self, relations: List[Tuple[str, str]]):
        self.relations = relations

    def optimize(
        self,
        layers: List[List[str]],
        entity_order: List[str]
    ) -> List[List[str]]:
        """
        Optimize vertical order within each layer

        Algorithm:
        1. Process layers from right to left (reverse order)
        2. For each layer, group entities by their targets in next layer
        3. Handle pivots (entities belonging to multiple groups)
        4. Sort groups to minimize crossings
        """
        if not layers:
            return layers

        optimized_layers = [layer[:] for layer in layers]  # Copy

        # Start from rightmost layer (use entity_order as base)
        last_layer_idx = len(optimized_layers) - 1
        optimized_layers[last_layer_idx] = self._sort_by_entity_order(
            optimized_layers[last_layer_idx],
            entity_order
        )

        # Process each layer from right to left
        for layer_idx in range(len(optimized_layers) - 2, -1, -1):
            current_layer = optimized_layers[layer_idx]
            next_layer = optimized_layers[layer_idx + 1]

            optimized_layers[layer_idx] = self._sort_layer_by_targets(
                current_layer,
                next_layer,
                entity_order
            )

        return optimized_layers

    def _sort_by_entity_order(
        self,
        layer: List[str],
        entity_order: List[str]
    ) -> List[str]:
        """Sort layer by entity_order"""
        ordered = [e for e in entity_order if e in layer]
        ordered.extend([e for e in layer if e not in ordered])
        return ordered

    def _sort_layer_by_targets(
        self,
        current_layer: List[str],
        next_layer: List[str],
        entity_order: List[str]
    ) -> List[str]:
        """
        Sort current layer by grouping entities targeting same entities in next layer

        Handles pivots: entities targeting multiple entities in next layer
        """
        # Find targets for each entity
        entity_to_targets = {}
        for entity in current_layer:
            targets = [
                right for left, right in self.relations
                if left == entity and right in next_layer
            ]
            entity_to_targets[entity] = targets

        # Find primary target (first in next_layer order)
        entity_to_primary_target = {}
        for entity, targets in entity_to_targets.items():
            if targets:
                # Primary = first target in next_layer order
                primary = min(targets, key=lambda t: next_layer.index(t))
                entity_to_primary_target[entity] = primary
            else:
                entity_to_primary_target[entity] = None

        # Group by primary target
        target_groups = defaultdict(list)
        for entity in current_layer:
            primary = entity_to_primary_target[entity]
            target_groups[primary].append(entity)

        # Sort each group by entity_order
        for target in target_groups:
            target_groups[target].sort(
                key=lambda e: entity_order.index(e) if e in entity_order else float('inf')
            )

        # Order groups by target position in next_layer
        ordered_targets = sorted(
            target_groups.keys(),
            key=lambda t: next_layer.index(t) if t and t in next_layer else -1
        )

        # Build final order
        ordered_layer = []
        for target in ordered_targets:
            ordered_layer.extend(target_groups[target])

        return ordered_layer

# === MAIN ORCHESTRATOR ===

class LayerClassificationOrchestrator:
    """
    Main orchestrator coordinating all phases
    """

    def __init__(self, dsl_input: str, debug: bool = False):
        self.dsl_input = dsl_input
        self.debug = debug

        # Results from each phase
        self.raw_relations = []
        self.relations = []
        self.entity_order = []
        self.horizontal_layers = []
        self.final_layers = []
        self.direct_predecessors = {}

    def run(self) -> List[List[str]]:
        """
        Execute complete pipeline

        Returns: Final optimized layers
        """
        self._log_phase("PHASE 0: PARSING")
        self.raw_relations = RelationParser.parse(self.dsl_input)
        self._log(f"Parsed {len(self.raw_relations)} raw relations")

        self._log_phase("PHASE 1-2: PREPROCESSING")
        preprocessor = GraphPreprocessor()
        self.relations = preprocessor.deduplicate(self.raw_relations)
        self._log(f"After deduplication: {len(self.relations)} unique relations")

        self.entity_order = preprocessor.build_entity_order(self.relations)
        self._log(f"Entity order (top 10): {self.entity_order[:10]}")

        self._log_phase("PHASE 3: HORIZONTAL ALIGNMENT (X-AXIS)")
        horizontal_classifier = HorizontalLayerClassifier()
        for left, right in self.relations:
            horizontal_classifier.add_relation(left, right)

        self.horizontal_layers = horizontal_classifier.compute_layers(self.entity_order)
        self._log(f"Horizontal layers: {len(self.horizontal_layers)} layers")
        for idx, layer in enumerate(self.horizontal_layers):
            self._log(f"  Layer {idx}: {layer}")

        self._log_phase("PHASE 4: VERTICAL ALIGNMENT (Y-AXIS)")
        self.direct_predecessors = DirectPredecessorAnalyzer.compute_direct_predecessors(
            self.horizontal_layers,
            self.relations
        )
        self._log(f"Direct predecessors computed for {len(self.direct_predecessors)} entities")

        vertical_optimizer = VerticalOrderOptimizer(self.relations)
        self.final_layers = vertical_optimizer.optimize(
            self.horizontal_layers,
            self.entity_order
        )
        self._log("Vertical optimization complete")

        self._log_phase("FINAL RESULT")
        for idx, layer in enumerate(self.final_layers):
            self._log(f"Layer {idx}: {layer}")

        return self.final_layers

    def _log_phase(self, title: str):
        """Log phase header"""
        if self.debug:
            print(f"\n{'='*80}")
            print(title)
            print('='*80)

    def _log(self, message: str):
        """Log message"""
        if self.debug:
            print(message)

# === TEST DATA ===

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

# === MAIN ===

if __name__ == "__main__":
    print("Algorithm v13 - Complete Layer Classification Orchestrator")
    print("="*80)

    orchestrator = LayerClassificationOrchestrator(relations_input_crm, debug=True)
    final_layers = orchestrator.run()

    print("\n" + "="*80)
    print("ORCHESTRATION COMPLETE")
    print("="*80)
    print(f"Total layers: {len(final_layers)}")
    print(f"Total entities: {sum(len(layer) for layer in final_layers)}")
