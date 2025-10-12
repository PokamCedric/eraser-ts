import re
from collections import defaultdict, deque

dsl = """
// ============================================
// RELATIONSHIPS
// ============================================

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
"""

# -------------------------
# Parse relationships
# -------------------------
# We'll treat these relations as "left depends on right":
#   A > B  => A depends on B  => add edge B -> A
#   A - B  => A depends on B  => add edge B -> A  (we treat '-' like dependency)
#   A <> B => many-to-many, treat as A depends on B (B -> A).
#
# This orientation ensures nodes with indegree 0 are nodes WITH NO dependencies.
edges = []
for line in dsl.splitlines():
    line = line.strip()
    if not line or line.startswith("//"):
        continue

    # handle <> (many-to-many) and '-' (one-to-one) as dependencies (left depends on right)
    if "<>" in line:
        left, right = line.split("<>")
        src = left.split(".")[0].strip()
        dst = right.split(".")[0].strip()
        # add edge: dst -> src (dst is dependency, src depends on it)
        edges.append((dst, src))

    elif "-" in line:
        left, right = line.split("-")
        src = left.split(".")[0].strip()
        dst = right.split(".")[0].strip()
        edges.append((dst, src))

    elif ">" in line:
        left, right = line.split(">")
        src = left.split(".")[0].strip()
        dst = right.split(".")[0].strip()
        edges.append((dst, src))  # dst -> src

    elif "<" in line:
        left, right = line.split("<")
        src = right.split(".")[0].strip()
        dst = left.split(".")[0].strip()
        edges.append((dst, src))

# -------------------------
# Build directed graph (dependency -> dependent)
# -------------------------
graph = defaultdict(list)     # adjacency: u -> [v1, v2] (u is dependency, v are dependents)
indegree = defaultdict(int)   # indegree[v] = number of dependencies of v
nodes = set()

for u, v in edges:
    graph[u].append(v)
    indegree[v] += 1
    nodes.add(u); nodes.add(v)

# ensure nodes without indegree appear in indegree map
for n in nodes:
    indegree.setdefault(n, 0)

# -------------------------
# Kahn's algorithm to compute layers by removing nodes with indegree 0 iteratively
# nodes with indegree 0 => no dependencies => topmost in dependency graph
# -------------------------
layers = []
queue = deque([n for n in nodes if indegree[n] == 0])
visited_count = 0

while queue:
    level_size = len(queue)
    current_layer = []
    for _ in range(level_size):
        node = queue.popleft()
        current_layer.append(node)
        visited_count += 1
        # remove node -> reduce indegree of dependents
        for child in graph[node]:
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)
    layers.append(sorted(current_layer))

# If not all nodes visited, there are cycles -> break them by treating remaining nodes as next layers
if visited_count < len(nodes):
    remaining = [n for n in nodes if indegree[n] > 0]
    # Put remaining nodes in subsequent layers (simple fallback)
    # We could try SCC condensation, but fallback is acceptable to avoid crash
    layers.append(sorted(remaining))

# Now we have layers from top (roots: no dependencies) to bottom (most dependent).
# If you want Layer 0 to be the most dependent (lowest), invert the layers:
layers_inverted = list(reversed(layers))

# -------------------------
# Output result (Layer 0 = most dependent)
# -------------------------
print(f"\nNumber of layers detected: {len(layers_inverted)}\n")
for i, layer in enumerate(layers_inverted):
    print(f"Layer {i}: {', '.join(layer)}")
