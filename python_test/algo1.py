# algo1.py
import re
from collections import defaultdict

dsl_sample = """
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
projects.teamId > teams.id
milestones.projectId > projects.id
attachments.postId > posts.id
notifications.userId > users.id
user_projects.userId > users.id
user_projects.projectId > projects.id
projects.id < posts.authorId
comments.userId > users.id
"""
def parse_relationships(dsl: str):
    directed_edges = []
    nondir_constraints = []
    nodes = set()

    for line in dsl.splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue

        if "<>" in line:
            left, right = line.split("<>")
            a = left.split(".")[0].strip()
            b = right.split(".")[0].strip()
            nodes.update([a, b])
            nondir_constraints.append((a, b))

        elif ">" in line:
            # A > B → A -> B  (A dépend de B)
            left, right = line.split(">")
            a = left.split(".")[0].strip()
            b = right.split(".")[0].strip()
            nodes.update([a, b])
            directed_edges.append((a, b))

        elif "<" in line:
            # A < B → B -> A
            left, right = line.split("<")
            a = left.split(".")[0].strip()
            b = right.split(".")[0].strip()
            nodes.update([a, b])
            directed_edges.append((b, a))

        elif "-" in line:
            left, right = line.split("-")
            a = left.split(".")[0].strip()
            b = right.split(".")[0].strip()
            nodes.update([a, b])
            nondir_constraints.append((a, b))

    return directed_edges, nondir_constraints, nodes

# --- cycle detection in directed graph (DFS)
def find_cycles(graph, nodes):
    visited = {}
    stack = []
    cycles = []

    def dfs(u):
        visited[u] = 1  # visiting
        stack.append(u)
        for v in graph.get(u, []):
            if visited.get(v, 0) == 0:
                dfs(v)
            elif visited.get(v) == 1:
                # found a back edge -> cycle
                # extract cycle nodes from stack
                try:
                    idx = stack.index(v)
                    cycle = stack[idx:] + [v]
                except ValueError:
                    cycle = stack[:] + [v]
                cycles.append(cycle)
        visited[u] = 2
        stack.pop()

    for n in nodes:
        if visited.get(n, 0) == 0:
            dfs(n)
    return cycles

# --- find all longest paths in a DAG using DFS + memo
def all_longest_paths(graph, nodes):
    # memo[node] = (max_length_from_node, list_of_paths_from_node)
    memo = {}

    def dfs(u, visiting):
        if u in memo:
            return memo[u]

        if u in visiting:
            # shouldn't happen in DAG; indicate cycle by returning length -inf
            return (-10**9, [])

        visiting.add(u)
        max_len = 0
        paths = [[u]]  # path consisting only of u

        children = graph.get(u, [])
        if not children:
            memo[u] = (1, [[u]])
            visiting.remove(u)
            return memo[u]

        max_len = 0
        paths = []
        for v in children:
            child_len, child_paths = dfs(v, visiting)
            if child_len + 1 > max_len:
                max_len = child_len + 1
                paths = []
                for p in child_paths:
                    paths.append([u] + p)
            elif child_len + 1 == max_len:
                for p in child_paths:
                    paths.append([u] + p)

        memo[u] = (max_len, paths)
        visiting.remove(u)
        return memo[u]

    # run dfs from every node
    global_max = 0
    global_paths = []
    for n in nodes:
        length, paths = dfs(n, set())
        if length > global_max:
            global_max = length
            global_paths = paths[:]
        elif length == global_max:
            # append unique paths
            for p in paths:
                if p not in global_paths:
                    global_paths.append(p)

    return global_max, global_paths

# --- helper to build adjacency list from directed edges
def build_graph(directed_edges):
    g = defaultdict(list)
    for u, v in directed_edges:
        g[u].append(v)
    return g

# --- pretty print paths
def format_path(path):
    return " -> ".join(path)

# --- main runner
if __name__ == "__main__":
    directed_edges, nondir_constraints, nodes = parse_relationships(dsl_sample)
    graph = build_graph(directed_edges)

    print("Directed edges (used to compute paths):")
    for u, v in directed_edges:
        print(f"  {u} -> {v}")
    print()

    if nondir_constraints:
        print("Non-directional constraints (must be on different layers):")
        for a, b in nondir_constraints:
            print(f"  {a}  !=  {b}")
        print()

    # detect cycles in directed portion
    cycles = find_cycles(graph, nodes)
    if cycles:
        print("ERROR: cycles detected in the directed graph. Longest path in general undefined.")
        print("Detected cycle(s):")
        for c in cycles:
            print("  " + " -> ".join(c))
        print("\nPlease break cycles or convert some relations into non-directional constraints.")
    else:
        max_len, longest_paths = all_longest_paths(graph, nodes)
        if max_len <= 0:
            print("No directed paths found.")
        else:
            print(f"Longest path length: {max_len}")
            print("Longest path(s):")
            for p in longest_paths:
                print("  " + format_path(p))
