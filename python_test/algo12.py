"""
Algorithm v12 - INCREMENTAL UPDATE OPTIMIZATION
Based on algo10 with incremental add/remove relation support for real-time visualization.

New features:
- add_relation_incremental(): Add relation and update only affected distances
- remove_relation(): Remove relation and recalculate only affected paths
- Smart dirty tracking: Only recalculate layers when structure changes

Use case: ERP with instant visualization
- User adds relation → instant update (no full recalculation)
- User removes relation → instant update (recalculate affected only)

Performance target:
- Full calculation: ~0.5ms for 50 entities (baseline algo10)
- Incremental add: <0.1ms (5x faster)
- Incremental remove: <0.2ms (2.5x faster)
"""

from collections import defaultdict
import time

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

// AUDIT & SECURITY
audit_logs.performedBy > users.id
api_keys.userId > users.id
"""

debug = False

def log(info: str):
    if debug:
        print(info)

def logTitle(title: str):
    log('\n' + '='*80)
    log(title)
    log('='*80)

class LayerClassifier:
    """
    Incremental Layer Classifier with add/remove support
    """
    def __init__(self):
        self.relations = []  # List of relations (left, right)
        self.entities = set()  # All entities
        self.distances = {}  # Distances: (left, right) -> distance
        self.entity_reference_distances = defaultdict(dict)  # entity -> {reference: distance}

        # Caches (from algo10)
        self.clusters_cache = {}  # {entity: set(cluster_elements)}
        self.dependents_index = defaultdict(set)  # {entity: {entities_that_depend_on_it}}

        # NEW: Dirty tracking for incremental updates
        self.is_structure_dirty = True  # True if need to recalculate entity_order
        self.cached_entity_order = None
        self.cached_layers = None

    def add_relation(self, left, right):
        """Add relation with full recalculation (baseline)"""
        self.relations.append((left, right))
        self.entities.add(left)
        self.entities.add(right)
        self.distances[(left, right)] = 1
        self.is_structure_dirty = True

    def add_relation_incremental(self, left, right):
        """
        Add relation with incremental update (OPTIMIZED for real-time)

        Steps:
        1. Add to data structures
        2. Update clusters cache incrementally
        3. Calculate new distances for this relation only
        4. Propagate changes to affected entities

        Complexity: O(d) where d = affected dependents
        vs O(n×r) for full recalculation
        """
        log(f"\n[INCREMENTAL ADD] {left} -> {right}")

        # 1. Add to structures
        self.relations.append((left, right))
        self.entities.add(left)
        self.entities.add(right)
        self.distances[(left, right)] = 1

        # 2. Update clusters cache incrementally
        if right not in self.clusters_cache:
            self.clusters_cache[right] = set()
        self.clusters_cache[right].add(left)

        # 3. Update dependents index
        if right not in self.dependents_index:
            self.dependents_index[right] = set()
        self.dependents_index[right].add(left)

        # 4. Initialize distance for new relation
        if left not in self.entity_reference_distances:
            self.entity_reference_distances[left] = {}
        self.entity_reference_distances[left][right] = 1

        # 5. Propagate: left inherits all distances from right
        if right in self.entity_reference_distances:
            for ref, dist in self.entity_reference_distances[right].items():
                inherited_dist = 1 + dist

                # Update if new path is longer (maximalité)
                if ref not in self.entity_reference_distances[left]:
                    self.entity_reference_distances[left][ref] = inherited_dist
                    log(f"  [NEW] dist({left}, {ref}) = {inherited_dist}")
                elif self.entity_reference_distances[left][ref] < inherited_dist:
                    old = self.entity_reference_distances[left][ref]
                    self.entity_reference_distances[left][ref] = inherited_dist
                    log(f"  [UPDATE] dist({left}, {ref}) = {old} -> {inherited_dist}")

        # 6. Propagate to all dependents of 'left'
        self._propagate_new_relation(left, right)

        # Mark layers as dirty (need re-layout)
        self.cached_layers = None

        log(f"[INCREMENTAL ADD] Complete")

    def _propagate_new_relation(self, left, right):
        """
        Propagate the impact of new relation (left -> right) to all dependents

        For each entity E that depends on 'left':
        - E can now reach 'right' via 'left'
        - E can also reach all references that 'right' can reach
        """
        dependents_of_left = self.dependents_index.get(left, set())

        for dependent in dependents_of_left:
            if dependent not in self.entity_reference_distances:
                continue

            if left not in self.entity_reference_distances[dependent]:
                continue

            dist_to_left = self.entity_reference_distances[dependent][left]

            # Dependent can reach 'right' via 'left'
            new_dist_to_right = dist_to_left + 1

            if right not in self.entity_reference_distances[dependent]:
                self.entity_reference_distances[dependent][right] = new_dist_to_right
                log(f"  [PROPAGATE] dist({dependent}, {right}) = {new_dist_to_right}")
            elif self.entity_reference_distances[dependent][right] < new_dist_to_right:
                old = self.entity_reference_distances[dependent][right]
                self.entity_reference_distances[dependent][right] = new_dist_to_right
                log(f"  [PROPAGATE] dist({dependent}, {right}) = {old} -> {new_dist_to_right}")

            # Dependent can also reach all references that 'right' can reach
            if right in self.entity_reference_distances:
                for ref, dist_from_right in self.entity_reference_distances[right].items():
                    inherited_dist = dist_to_left + 1 + dist_from_right

                    if ref not in self.entity_reference_distances[dependent]:
                        self.entity_reference_distances[dependent][ref] = inherited_dist
                        log(f"  [PROPAGATE] dist({dependent}, {ref}) = {inherited_dist}")
                    elif self.entity_reference_distances[dependent][ref] < inherited_dist:
                        old = self.entity_reference_distances[dependent][ref]
                        self.entity_reference_distances[dependent][ref] = inherited_dist
                        log(f"  [PROPAGATE] dist({dependent}, {ref}) = {old} -> {inherited_dist}")

    def remove_relation(self, left, right):
        """
        Remove relation and recalculate affected distances

        CHALLENGE: When removing A -> B, we may have distances that depended
        on this path as the MAX path. We need to recalculate those.

        Strategy:
        1. Remove from data structures
        2. Mark affected entities (those that used this path)
        3. Recalculate distances for affected entities only

        Complexity: O(a×r) where a = affected entities
        Still better than O(n×r) for full recalculation
        """
        log(f"\n[REMOVE] {left} -> {right}")

        # 1. Remove from structures
        if (left, right) in self.relations:
            self.relations.remove((left, right))

        if (left, right) in self.distances:
            del self.distances[(left, right)]

        # 2. Update clusters cache
        if right in self.clusters_cache and left in self.clusters_cache[right]:
            self.clusters_cache[right].remove(left)

        # 3. Update dependents index
        if right in self.dependents_index and left in self.dependents_index[right]:
            self.dependents_index[right].remove(left)

        # 4. Find affected entities (those that have distances through left -> right)
        affected = self._find_affected_by_removal(left, right)

        log(f"  [AFFECTED] {len(affected)} entities need recalculation")

        # 5. Clear distances for affected entities
        for entity in affected:
            if entity in self.entity_reference_distances:
                # Clear all distances for this entity (will recalculate)
                self.entity_reference_distances[entity] = {}

        # 6. Recalculate distances for affected entities
        # Use the same step-by-step approach but only for affected
        self._recalculate_affected(affected)

        # Mark layers as dirty
        self.cached_layers = None

        log(f"[REMOVE] Complete")

    def _find_affected_by_removal(self, left, right):
        """
        Find entities whose distances may be affected by removing (left -> right)

        An entity is affected if:
        - It depends on 'left' (may lose paths through left -> right)
        - It is 'left' itself (loses direct connection to right)
        """
        affected = set()

        # 'left' is definitely affected
        affected.add(left)

        # All dependents of 'left' are potentially affected
        def find_all_dependents(entity, visited=None):
            if visited is None:
                visited = set()
            if entity in visited:
                return visited
            visited.add(entity)

            for dependent in self.dependents_index.get(entity, set()):
                find_all_dependents(dependent, visited)

            return visited

        affected.update(find_all_dependents(left))

        return affected

    def _recalculate_affected(self, affected):
        """
        Recalculate distances for affected entities only

        Use same logic as _update_distances_step_by_step but only for affected
        """
        # For each affected entity, recalculate its distances
        for entity in affected:
            # Recalculate distances from scratch for this entity
            for left, right in self.relations:
                if left == entity:
                    # Direct relation
                    if entity not in self.entity_reference_distances:
                        self.entity_reference_distances[entity] = {}
                    self.entity_reference_distances[entity][right] = 1

                    # Inherit transitives
                    if right in self.entity_reference_distances:
                        for ref, dist in self.entity_reference_distances[right].items():
                            inherited = 1 + dist
                            if ref not in self.entity_reference_distances[entity]:
                                self.entity_reference_distances[entity][ref] = inherited
                            else:
                                self.entity_reference_distances[entity][ref] = max(
                                    self.entity_reference_distances[entity][ref],
                                    inherited
                                )

    def _precompute_clusters(self):
        """Pre-compute clusters cache"""
        self.clusters_cache = defaultdict(set)
        for left, right in self.relations:
            self.clusters_cache[right].add(left)

    def _propagate_distance_update(self, updated_entity, updated_ref, new_dist, visited=None):
        """Propagate distance update (from algo10)"""
        if visited is None:
            visited = set()

        propagation_key = (updated_entity, updated_ref, new_dist)
        if propagation_key in visited:
            return
        visited.add(propagation_key)

        for entity in self.dependents_index[updated_entity]:
            if updated_entity in self.entity_reference_distances[entity]:
                dist_to_updated = self.entity_reference_distances[entity][updated_entity]
                inherited_dist = dist_to_updated + new_dist

                if updated_ref not in self.entity_reference_distances[entity]:
                    self.entity_reference_distances[entity][updated_ref] = inherited_dist
                    self._propagate_distance_update(entity, updated_ref, inherited_dist, visited)
                elif self.entity_reference_distances[entity][updated_ref] < inherited_dist:
                    self.entity_reference_distances[entity][updated_ref] = inherited_dist
                    self._propagate_distance_update(entity, updated_ref, inherited_dist, visited)

    def _update_distances_step_by_step(self, entity_order):
        """Full distance calculation (from algo10)"""
        self._precompute_clusters()

        for reference_entity in entity_order:
            if reference_entity not in self.entities:
                continue

            cluster_elements = self.clusters_cache.get(reference_entity, set())
            if not cluster_elements:
                continue

            for element in cluster_elements:
                # Direct distance = 1
                if element not in self.entity_reference_distances:
                    self.entity_reference_distances[element] = {}
                self.entity_reference_distances[element][reference_entity] = 1

                # Build dependents index
                self.dependents_index[reference_entity].add(element)

                # Inherit transitive distances
                if reference_entity in self.entity_reference_distances:
                    for prev_ref, prev_dist in self.entity_reference_distances[reference_entity].items():
                        inherited_dist = 1 + prev_dist

                        if prev_ref not in self.entity_reference_distances[element]:
                            self.entity_reference_distances[element][prev_ref] = inherited_dist
                        elif self.entity_reference_distances[element][prev_ref] < inherited_dist:
                            self.entity_reference_distances[element][prev_ref] = inherited_dist
                            self._propagate_distance_update(element, prev_ref, inherited_dist)

        # Update global distances
        for entity, ref_dists in self.entity_reference_distances.items():
            for ref, dist in ref_dists.items():
                key = (entity, ref)
                if key not in self.distances or self.distances[key] < dist:
                    self.distances[key] = dist

    def _count_connections(self):
        """Count connections per entity"""
        connections = defaultdict(int)
        for left, right in self.relations:
            connections[left] += 1
            connections[right] += 1
        return dict(connections)

    def compute_layers(self, entity_order):
        """
        Compute layers with caching support

        If structure hasn't changed, return cached result
        """
        if not self.is_structure_dirty and self.cached_layers:
            return self.cached_layers

        # Full calculation
        self._update_distances_step_by_step(entity_order)

        if len(self.entities) == 0:
            return []

        connections = self._count_connections()

        # Find reference entity (most connected)
        def get_reference_score(entity):
            direct = connections.get(entity, 0)
            neighbors_sum = sum(
                connections.get(neighbor, 0)
                for left, right in self.relations
                if left == entity or right == entity
                for neighbor in ([right] if left == entity else [left])
            )
            return (direct, neighbors_sum)

        reference_entity = max(self.entities, key=get_reference_score)

        # Place entities in layers
        layers_map = {reference_entity: 0}

        sorted_distances = sorted(
            self.distances.items(),
            key=lambda x: connections.get(x[0][0], 0) + connections.get(x[0][1], 0),
            reverse=True
        )

        max_iterations = len(self.entities) ** 2
        iteration = 0

        while len(layers_map) < len(self.entities) and iteration < max_iterations:
            iteration += 1
            progress = False

            for (left, right), distance in sorted_distances:
                if left in layers_map and right not in layers_map:
                    layers_map[right] = layers_map[left] + distance
                    progress = True
                elif right in layers_map and left not in layers_map:
                    layers_map[left] = layers_map[right] - distance
                    progress = True
                elif left in layers_map and right in layers_map:
                    expected_right = layers_map[left] + distance
                    if layers_map[right] < expected_right:
                        layers_map[right] = expected_right
                        progress = True

            if not progress:
                for entity in self.entities:
                    if entity not in layers_map:
                        layers_map[entity] = 0
                        progress = True

        # Normalize
        min_layer = min(layers_map.values())
        if min_layer < 0:
            for entity in layers_map:
                layers_map[entity] -= min_layer

        # Group by layer
        layer_dict = defaultdict(list)
        for entity, layer in layers_map.items():
            layer_dict[layer].append(entity)

        sorted_layers = [layer_dict[i] for i in sorted(layer_dict.keys())]
        for layer in sorted_layers:
            layer.sort()

        self.cached_layers = sorted_layers
        self.is_structure_dirty = False

        return sorted_layers

# Helper functions from algo10
def extract_table_name(s):
    return s.split('.')[0].strip()

def reorder_layers_by_cluster(layers, relations, entity_order):
    """Vertical reorganization (from algo10)"""
    if not layers:
        return layers

    # Last layer: order by entity_order
    last_layer = layers[-1]
    ordered_last = [e for e in entity_order if e in last_layer]
    ordered_last.extend([e for e in last_layer if e not in ordered_last])
    layers[-1] = ordered_last

    # Other layers: group by target
    for layer_idx in range(len(layers) - 2, -1, -1):
        current_layer = layers[layer_idx]
        next_layer = layers[layer_idx + 1]

        entity_targets = {}
        for entity in current_layer:
            targets = [right for left, right in relations if left == entity and right in next_layer]
            entity_targets[entity] = targets[0] if targets else None

        target_groups = defaultdict(list)
        for entity in current_layer:
            target_groups[entity_targets[entity]].append(entity)

        for target in target_groups:
            target_groups[target].sort(key=lambda e: entity_order.index(e) if e in entity_order else float('inf'))

        ordered_targets = sorted(
            target_groups.keys(),
            key=lambda t: next_layer.index(t) if t and t in next_layer else -1
        )

        ordered_layer = []
        for target in ordered_targets:
            ordered_layer.extend(target_groups[target])

        layers[layer_idx] = ordered_layer

    return layers

if __name__ == "__main__":
    print("="*80)
    print("ALGO12 - INCREMENTAL UPDATE TESTING")
    print("="*80)

    # We'll create a comprehensive test in a separate file
    print("\nAlgo12 module loaded successfully.")
    print("Use test_algo12_incremental.py to run benchmarks.")
