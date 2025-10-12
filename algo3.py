"""
Vertical Alignment Optimizer - Test Script

This script tests the weighted barycenter method for positioning entities
within layers to minimize edge crossings.

Rules:
1. Weighted Barycenter: position = Σ(position × weight) / Σ(weight)
2. PK connections: weight = 0.3 (bias towards top)
3. Normal connections: weight = 1.0
4. No connections: default to middle position
5. Bidirectional optimization: forward and backward passes
"""

import re
from collections import defaultdict

dsl = """
// ============================================
// RELATIONSHIPS
// ============================================

// ============================================
// RELATIONSHIPS
// ============================================

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
"""

# Entity definitions with Primary Keys
entities = {
    'users': {'fields': ['id'], 'pks': ['id']},
    'profiles': {'fields': ['id', 'userId'], 'pks': ['id']},
    'teams': {'fields': ['id'], 'pks': ['id']},
    'posts': {'fields': ['id', 'authorId'], 'pks': ['id']},
    'comments': {'fields': ['id', 'postId'], 'pks': ['id']},
    'tags': {'fields': ['id', 'userId'], 'pks': ['id']},
    'post_tags': {'fields': ['id', 'postId', 'tagId'], 'pks': ['id']},
    'user_roles': {'fields': ['id', 'userId', 'roleId'], 'pks': ['id']},
    'roles': {'fields': ['id'], 'pks': ['id']},
    'role_permissions': {'fields': ['id', 'roleId', 'permissionId'], 'pks': ['id']},
    'permissions': {'fields': ['id'], 'pks': ['id']},
}

# === PARSE RELATIONSHIPS ===
relationships = []

for line in dsl.splitlines():
    line = line.strip()
    if not line or line.startswith("//"):
        continue

    # Parse relationship
    if '-' in line:
        left, right = line.split('-')
        from_entity = left.split('.')[0].strip()
        from_field = left.split('.')[1].strip()
        to_entity = right.split('.')[0].strip()
        to_field = right.split('.')[1].strip()
        relationships.append({
            'from': {'entity': from_entity, 'field': from_field},
            'to': {'entity': to_entity, 'field': to_field}
        })
    elif '>' in line:
        left, right = line.split('>')
        from_entity = left.split('.')[0].strip()
        from_field = left.split('.')[1].strip()
        to_entity = right.split('.')[0].strip()
        to_field = right.split('.')[1].strip()
        relationships.append({
            'from': {'entity': from_entity, 'field': from_field},
            'to': {'entity': to_entity, 'field': to_field}
        })

# === BUILD GRAPH (from algo2.py) ===
graph = defaultdict(list)
nodes = set()

for rel in relationships:
    from_e = rel['from']['entity']
    to_e = rel['to']['entity']
    graph[from_e].append(to_e)
    nodes.update([from_e, to_e])

# === COMPUTE LAYERS (from algo2.py) ===
layer_of = {}
visited = set()

def compute_layer(node):
    if node in layer_of:
        return layer_of[node]
    if node in visited:
        layer_of[node] = 0
        return 0
    visited.add(node)
    dependencies = graph.get(node, [])
    if not dependencies:
        layer_of[node] = 0
    else:
        max_dependency_layer = max(compute_layer(dep) for dep in dependencies)
        layer_of[node] = max_dependency_layer + 1
    visited.remove(node)
    return layer_of[node]

for node in nodes:
    compute_layer(node)

# Invert layers
max_layer = max(layer_of.values()) if layer_of else 0
for node in layer_of:
    layer_of[node] = max_layer - layer_of[node]

# Group by layer
layers = defaultdict(list)
for node, layer in layer_of.items():
    layers[layer].append(node)

# === VERTICAL ALIGNMENT OPTIMIZER ===

def is_primary_key(entity_name, field_name):
    """Check if a field is a primary key"""
    entity = entities.get(entity_name)
    if entity:
        return field_name in entity['pks']
    return False

def calculate_weighted_barycenter(entity, reference_layer, reference_layer_order):
    """
    Calculate weighted barycenter for an entity based on connections to reference layer

    Args:
        entity: Entity name
        reference_layer: List of entity names in the reference layer
        reference_layer_order: Current order of entities in reference layer

    Returns:
        Weighted average position (float)
    """
    weighted_positions = []

    # Find all relationships involving this entity
    for rel in relationships:
        connected_entity = None
        source_entity = None
        source_field = None

        # Check if this relationship connects to reference layer
        if rel['from']['entity'] == entity and rel['to']['entity'] in reference_layer:
            connected_entity = rel['to']['entity']
            source_entity = entity
            source_field = rel['from']['field']
        elif rel['to']['entity'] == entity and rel['from']['entity'] in reference_layer:
            connected_entity = rel['from']['entity']
            source_entity = rel['from']['entity']
            source_field = rel['from']['field']

        if connected_entity:
            # Get position in reference layer
            if connected_entity in reference_layer_order:
                position = reference_layer_order.index(connected_entity)

                # Check if source field is a Primary Key
                is_pk = is_primary_key(source_entity, source_field)

                # PK connections get weight 0.3, normal connections get weight 1.0
                weight = 0.3 if is_pk else 1.0

                weighted_positions.append({'position': position, 'weight': weight})

    # If no connections, return middle position
    if not weighted_positions:
        return len(reference_layer) / 2

    # Calculate weighted average
    weighted_sum = sum(item['position'] * item['weight'] for item in weighted_positions)
    total_weight = sum(item['weight'] for item in weighted_positions)

    return weighted_sum / total_weight

def optimize_forward(layers_dict):
    """Forward pass: optimize left to right"""
    sorted_layer_indices = sorted(layers_dict.keys())

    for i in range(1, len(sorted_layer_indices)):
        current_layer_idx = sorted_layer_indices[i]
        previous_layer_idx = sorted_layer_indices[i - 1]

        current_layer = layers_dict[current_layer_idx]
        previous_layer = layers_dict[previous_layer_idx]

        # Calculate barycenter for each entity in current layer
        barycenters = []
        for entity in current_layer:
            barycenter = calculate_weighted_barycenter(
                entity,
                previous_layer,
                layers_dict[previous_layer_idx]
            )
            barycenters.append({'entity': entity, 'barycenter': barycenter})

        # Sort by barycenter value
        barycenters.sort(key=lambda x: x['barycenter'])

        # Update layer with sorted entities
        layers_dict[current_layer_idx] = [b['entity'] for b in barycenters]

def optimize_backward(layers_dict):
    """Backward pass: optimize right to left"""
    sorted_layer_indices = sorted(layers_dict.keys(), reverse=True)

    for i in range(1, len(sorted_layer_indices)):
        current_layer_idx = sorted_layer_indices[i]
        next_layer_idx = sorted_layer_indices[i - 1]

        current_layer = layers_dict[current_layer_idx]
        next_layer = layers_dict[next_layer_idx]

        # Calculate barycenter for each entity in current layer
        barycenters = []
        for entity in current_layer:
            barycenter = calculate_weighted_barycenter(
                entity,
                next_layer,
                layers_dict[next_layer_idx]
            )
            barycenters.append({'entity': entity, 'barycenter': barycenter})

        # Sort by barycenter value
        barycenters.sort(key=lambda x: x['barycenter'])

        # Update layer with sorted entities
        layers_dict[current_layer_idx] = [b['entity'] for b in barycenters]

# Run optimization (4 iterations)
optimized_layers = dict(layers)

print("\n=== INITIAL LAYER ORDER ===")
for layer_idx in sorted(optimized_layers.keys()):
    print(f"Layer {layer_idx}: {', '.join(optimized_layers[layer_idx])}")

for iteration in range(4):
    optimize_forward(optimized_layers)
    optimize_backward(optimized_layers)

# === OUTPUT ===
print(f"\n=== OPTIMIZED VERTICAL ORDER (after 4 iterations) ===")
print(f"Number of layers: {len(optimized_layers)}\n")

for layer_idx in sorted(optimized_layers.keys()):
    print(f"Layer {layer_idx}: {', '.join(optimized_layers[layer_idx])}")

# Show example barycenter calculation
print("\n=== EXAMPLE: Barycenter calculation for Layer 1 ===")
if 1 in optimized_layers and 0 in optimized_layers:
    layer_0 = optimized_layers[0]
    layer_1 = optimized_layers[1]

    print(f"Reference layer (Layer 0): {layer_0}")
    print(f"Current layer (Layer 1): {layer_1}")
    print()

    for entity in layer_1:
        print(f"\nEntity: {entity}")

        # Find connections
        connections = []
        for rel in relationships:
            if rel['from']['entity'] == entity and rel['to']['entity'] in layer_0:
                is_pk = is_primary_key(entity, rel['from']['field'])
                pos = layer_0.index(rel['to']['entity'])
                weight = 0.3 if is_pk else 1.0
                connections.append({
                    'to': rel['to']['entity'],
                    'field': rel['from']['field'],
                    'is_pk': is_pk,
                    'position': pos,
                    'weight': weight
                })
            elif rel['to']['entity'] == entity and rel['from']['entity'] in layer_0:
                is_pk = is_primary_key(rel['from']['entity'], rel['from']['field'])
                pos = layer_0.index(rel['from']['entity'])
                weight = 0.3 if is_pk else 1.0
                connections.append({
                    'from': rel['from']['entity'],
                    'field': rel['from']['field'],
                    'is_pk': is_pk,
                    'position': pos,
                    'weight': weight
                })

        if connections:
            for conn in connections:
                if 'to' in conn:
                    pk_str = " (PK)" if conn['is_pk'] else ""
                    print(f"  -> {conn['to']}: position={conn['position']}, weight={conn['weight']}{pk_str}")
                else:
                    pk_str = " (PK)" if conn['is_pk'] else ""
                    print(f"  <- {conn['from']}: position={conn['position']}, weight={conn['weight']}{pk_str}")

            weighted_sum = sum(c['position'] * c['weight'] for c in connections)
            total_weight = sum(c['weight'] for c in connections)
            barycenter = weighted_sum / total_weight
            print(f"  Barycenter = {weighted_sum}/{total_weight} = {barycenter:.2f}")
        else:
            print(f"  No connections to Layer 0")
            print(f"  Barycenter = {len(layer_0)/2:.2f} (middle)")
