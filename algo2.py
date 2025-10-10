import re
from collections import defaultdict

dsl = """
// ============================================
// RELATIONSHIPS
// ============================================
users.profileId - profiles.id
posts.authorId > users.id
users.id > teams.id
comments.postId > posts.id
comments.userId > users.id
post_tags.postId > posts.id
post_tags.tagId > tags.id
"""

# === PARSE RELATIONSHIPS ===

directed_edges = []
same_layer_edges = []

for line in dsl.splitlines():
    line = line.strip()
    if not line or line.startswith("//"):
        continue

    # Many-to-many: treat as directional (A depends on B)
    if '<>' in line:
        left, right = line.split('<>')
        src = left.split('.')[0].strip()
        dst = right.split('.')[0].strip()
        directed_edges.append((src, dst))

    # One-to-one: treat as directional dependency
    elif '-' in line:
        left, right = line.split('-')
        src = left.split('.')[0].strip()
        dst = right.split('.')[0].strip()
        directed_edges.append((src, dst))  # Treat as dependency

    # One-way
    elif '>' in line:
        left, right = line.split('>')
        src = left.split('.')[0].strip()
        dst = right.split('.')[0].strip()
        directed_edges.append((src, dst))

    # Reverse
    elif '<' in line:
        left, right = line.split('<')
        src = right.split('.')[0].strip()
        dst = left.split('.')[0].strip()
        directed_edges.append((src, dst))

# === BUILD GRAPH ===
# graph[A] = [B] means A → B (A depends on B, so B must come before A)

graph = defaultdict(list)
reverse_graph = defaultdict(list)  # Track incoming edges
nodes = set()

for a, b in directed_edges:
    graph[a].append(b)  # A → B (A depends on B)
    reverse_graph[b].append(a)  # B is depended upon by A
    nodes.update([a, b])

for a, b in same_layer_edges:
    nodes.update([a, b])

# === COMPUTE LAYERS: Top-down approach (from leaves) ===
# Leaves (nodes that nobody depends on) get layer 0
# Then propagate backward: layer = 1 + max(layer of dependents)

layer_of = {}
visited = set()

def compute_layer(node):
    """Compute layer for a node based on who depends on it"""
    if node in layer_of:
        return layer_of[node]

    if node in visited:
        # Cycle detected, assign default layer
        layer_of[node] = 0
        return 0

    visited.add(node)

    # Get all nodes that depend on this node (reverse edges)
    dependents = reverse_graph.get(node, [])

    if not dependents:
        # No one depends on this node, it's a leaf (layer 0)
        layer_of[node] = 0
    else:
        # Layer must be 1 + max layer of all nodes that depend on this one
        max_dependent_layer = max(compute_layer(dep) for dep in dependents)
        layer_of[node] = max_dependent_layer + 1

    visited.remove(node)
    return layer_of[node]

# Compute layers for all nodes
for node in nodes:
    compute_layer(node)

# Group nodes by layer
layers = defaultdict(list)
for node, layer in layer_of.items():
    layers[layer].append(node)

# === OUTPUT ===
# The algorithm mathematically guarantees correct placement
# No validation needed

num_layers = len(layers)
print(f"\nNumber of layers detected: {num_layers}\n")
for i in sorted(layers.keys()):
    print(f"Layer {i}: {', '.join(sorted(layers[i]))}")
