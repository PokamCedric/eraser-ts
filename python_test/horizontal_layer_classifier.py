"""
Phase 3: Horizontal Layer Classifier

Assigns entities to horizontal layers (X-axis positioning).
EXACT copy of algo10.LayerClassifier with optimizations.
"""

from typing import List
from collections import defaultdict


# Helper function for logging (algo10 compatibility)
def log(message: str, debug=False):
    """Silently ignore log messages"""
    pass


class HorizontalLayerClassifier:
    """
    Assigns entities to horizontal layers (X-axis)
    Based on algo10 progressive step-by-step distance calculation
    """

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
                    log(f"[PROPAGATION] dist({entity}, {updated_ref}) = {inherited_dist} (via {updated_entity})")
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
