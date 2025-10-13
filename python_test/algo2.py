import re
from collections import defaultdict, deque

def run_algo2():
    dsl = """

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
projects.teamId > teams.id
milestones.projectId > projects.id
attachments.postId > posts.id
notifications.userId > users.id
user_projects.userId > users.id
user_projects.projectId > projects.id
projects.id < posts.authorId
comments.userId > users.id
    """

    # -------------------------
    # Parse relationships
    # -------------------------
    edges = []
    for line in dsl.splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue

        if "<>" in line:
            left, right = line.split("<>")
            src = left.split(".")[0].strip()
            dst = right.split(".")[0].strip()
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
            edges.append((dst, src))
        elif "<" in line:
            left, right = line.split("<")
            src = right.split(".")[0].strip()
            dst = left.split(".")[0].strip()
            edges.append((dst, src))

    # -------------------------
    # Build graph: dependency -> dependent
    # -------------------------
    graph = defaultdict(list)
    indegree = defaultdict(int)
    nodes = set()

    for u, v in edges:
        graph[u].append(v)
        indegree[v] += 1
        nodes.add(u)
        nodes.add(v)

    for n in nodes:
        indegree.setdefault(n, 0)

    # -------------------------
    # Compute layer depth = longest path from roots
    # -------------------------
    # Layer distance means:
    # - Root (no dependency) = layer 0
    # - Each dependent = 1 + max(layer of its dependencies)
    layer = {n: 0 for n in nodes}
    queue = deque([n for n in nodes if indegree[n] == 0])

    topo_order = []
    while queue:
        n = queue.popleft()
        topo_order.append(n)
        for child in graph[n]:
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)

    # longest path dynamic propagation
    for n in topo_order:
        for child in graph[n]:
            layer[child] = max(layer[child], layer[n] + 1)

    # -------------------------
    # Build layer groups
    # -------------------------
    max_layer = max(layer.values()) if layer else 0
    layer_groups = [[] for _ in range(max_layer + 1)]
    for n, l in layer.items():
        layer_groups[l].append(n)

    # Sort for consistent output
    layer_groups = [sorted(l) for l in layer_groups]
    layers_inverted = list(reversed(layer_groups))

    return layers_inverted, edges


if __name__ == "__main__":
    layers, _ = run_algo2()
    print(f"\nNumber of layers detected: {len(layers)}\n")
    for i, layer in enumerate(layers):
        print(f"Layer {i}: {', '.join(layer)}")
