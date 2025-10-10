import re
from collections import defaultdict

dsl = """
// Relationships
users.id <> teams.id
workspaces.folderId > folders.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id
workspaces.teamId > teams.id
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

    # One-to-one: same layer
    elif '-' in line:
        left, right = line.split('-')
        src = left.split('.')[0].strip()
        dst = right.split('.')[0].strip()
        same_layer_edges.append((src, dst))

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

graph = defaultdict(list)
nodes = set()

for a, b in directed_edges:
    graph[a].append(b)
    nodes.update([a, b])

for a, b in same_layer_edges:
    nodes.update([a, b])

# === DFS FOR LONGEST PATH ===

def dfs(node, memo):
    if node in memo:
        return memo[node]
    if not graph[node]:
        memo[node] = 0
        return 0
    longest = 0
    for child in graph[node]:
        longest = max(longest, 1 + dfs(child, memo))
    memo[node] = longest
    return longest

memo = {}
for n in nodes:
    dfs(n, memo)

# === NORMALIZE LAYERS (TOP DOWN) ===

max_layer = max(memo.values())
layers = defaultdict(list)
layer_of = {}

for n, depth in memo.items():
    layer = max_layer - depth
    layer_of[n] = layer
    layers[layer].append(n)

# Synchronize same-layer relations
for a, b in same_layer_edges:
    if a in layer_of and b in layer_of:
        common = min(layer_of[a], layer_of[b])
        layer_of[a] = layer_of[b] = common
        if a not in layers[common]:
            layers[common].append(a)
        if b not in layers[common]:
            layers[common].append(b)

# === OUTPUT ===

num_layers = len(layers)
print(f"\n🧭 Number of layers detected: {num_layers}\n")
for i in sorted(layers.keys(), reverse=True):
    print(f"Layer {i}: {', '.join(sorted(layers[i]))}")
