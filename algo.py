import re
import matplotlib.pyplot as plt
import networkx as nx

dsl = """
// Workspace Collaboration System
// Based on the ERD example with chat, users, teams, workspaces, folders, and invites

users [icon: users] {
    id string @pk
    teams string
    displayName string
    team_role string
}

teams [icon: users, color: #3b82f6] {
    id string @pk
    name string
}

workspaces [icon: home, color: #10b981] {
    id string @pk
    name string
    createdAt timestamp
    folderId string @fk
    teamId string @fk
}

folders [icon: folder, color: #f59e0b] {
    id string @pk
    name string
}

chat [icon: message-circle, color: #8b5cf6] {
    id string @pk
    duration number
    startedAt timestamp
    endedAt timestamp
    workspaceId string @fk
}

invite [icon: mail, color: #ec4899] {
    inviteId string @pk
    workspaceId string @fk
    type string
    inviterId string @fk
}

// Relationships
users.id <> teams.id
workspaces.folderId > folders.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id
workspaces.teamId > teams.id

"""

# --- Parse entities ---
entity_pattern = re.compile(r'(\w+)\s*\[.*?\]\s*\{([^}]*)\}', re.DOTALL)
entities = {name: props.strip().split('\n') for name, props in entity_pattern.findall(dsl)}

# --- Parse relationships ---
directed_edges = []
undirected_edges = []

for line in dsl.splitlines():
    line = line.strip()
    if not line or line.startswith("//"):
        continue

    # Many-to-many (no direction)
    if '<>' in line:
        left, right = line.split('<>')
        src = left.split('.')[0].strip()
        dst = right.split('.')[0].strip()
        undirected_edges.append((src, dst))

    # Unidirectional (→)
    elif '>' in line:
        left, right = line.split('>')
        src = left.split('.')[0].strip()
        dst = right.split('.')[0].strip()
        directed_edges.append((src, dst))

    # Reverse (<)
    elif '<' in line:
        left, right = line.split('<')
        src = right.split('.')[0].strip()
        dst = left.split('.')[0].strip()
        directed_edges.append((src, dst))

# --- Build graphs ---
G_dir = nx.DiGraph()
G_undir = nx.Graph()

# Add nodes
for e, props in entities.items():
    weight = len([p for p in props if p.strip()])
    G_dir.add_node(e, weight=weight)
    G_undir.add_node(e, weight=weight)

# Add edges
G_dir.add_edges_from(directed_edges)
G_undir.add_edges_from(undirected_edges)

# --- Compute hierarchical layout for directed graph ---
def compute_layers(G_directed, G_undirected):
    layers = {}
    try:
        order = list(nx.topological_sort(G_directed))
    except nx.NetworkXUnfeasible:
        # fallback for small cycles (should not happen now)
        order = list(G_directed.nodes())

    # First pass: compute minimum layer based on predecessors (directed edges)
    for node in order:
        preds = list(G_directed.predecessors(node))
        if not preds:
            layers[node] = 0
        else:
            layers[node] = max(layers.get(p, 0) + 1 for p in preds)

    # Second pass: for many-to-many relationships, place nodes AFTER their neighbors
    # if they have no directed relationships
    for node in G_undirected.nodes():
        undir_neighbors = list(G_undirected.neighbors(node))

        # Only apply this to nodes that have no outgoing edges (not sources)
        has_outgoing = len(list(G_directed.successors(node))) > 0 if node in G_directed else False
        has_incoming = len(list(G_directed.predecessors(node))) > 0 if node in G_directed else False

        # If a node only has undirected relationships (no directed edges),
        # place it AFTER its undirected neighbors
        if undir_neighbors and not has_outgoing and not has_incoming:
            max_neighbor_layer = max(layers.get(n, 0) for n in undir_neighbors)
            layers[node] = max_neighbor_layer + 1

    return layers

layers = compute_layers(G_dir, G_undir)

# --- Assign positions ---
positions = {}
layer_nodes = {}

# Group nodes by layer
for node, layer in layers.items():
    layer_nodes.setdefault(layer, []).append(node)

# Handle isolated nodes (entities without relationships)
isolated_nodes = set(G_dir.nodes()) - set(layers.keys())
if isolated_nodes:
    # Place isolated nodes in a separate layer at the end
    max_layer = max(layers.values()) if layers else -1
    for node in isolated_nodes:
        layers[node] = max_layer + 1
        layer_nodes.setdefault(max_layer + 1, []).append(node)

x_spacing = 3  # Horizontal spacing between layers (left to right)
y_spacing = 3  # Vertical spacing between nodes in same layer

# Sort nodes within each layer to minimize edge crossings
# Nodes with more connections should be centered
def sort_nodes_in_layer(nodes, G_directed, G_undirected):
    def get_connection_weight(node):
        # Count total connections (predecessors, successors, and undirected neighbors)
        preds = len(list(G_directed.predecessors(node))) if node in G_directed else 0
        succs = len(list(G_directed.successors(node))) if node in G_directed else 0
        undir = len(list(G_undirected.neighbors(node))) if node in G_undirected else 0
        return preds + succs + undir

    # Sort by connection weight (descending), so highly connected nodes are in the middle
    return sorted(nodes, key=get_connection_weight, reverse=True)

# Position nodes: x = layer (left to right), y = position in layer (top to bottom)
for layer, nodes_in_layer in layer_nodes.items():
    # Sort nodes to minimize crossings
    sorted_nodes = sort_nodes_in_layer(nodes_in_layer, G_dir, G_undir)

    for i, node in enumerate(sorted_nodes):
        x = layer * x_spacing  # Layer determines horizontal position (left to right)
        y = (i - len(sorted_nodes) / 2) * y_spacing  # Vertical position within layer
        positions[node] = (x, y)

# --- Draw everything ---
plt.figure(figsize=(10, 8))

# Nodes
nx.draw_networkx_nodes(
    G_dir,
    positions,
    node_color="#dbeafe",
    node_size=[G_dir.nodes[n]['weight'] * 500 for n in G_dir],
    edgecolors="black"
)

# Directed edges
nx.draw_networkx_edges(
    G_dir,
    positions,
    arrows=True,
    arrowstyle='-|>',
    connectionstyle='arc3,rad=0.1',
    width=1.5
)

# Undirected edges (many-to-many)
nx.draw_networkx_edges(
    G_undir,
    positions,
    style='dashed',
    edge_color="#888",
    width=1.5
)

# Labels
nx.draw_networkx_labels(G_dir, positions, font_size=9, font_family="sans-serif")

plt.title("Entity Relationship Diagram (Directional + Many-to-Many)")
plt.axis("off")
plt.tight_layout()
plt.show()

# --- Debug positions ---
print("\nEntity positions:")
for node, (x, y) in positions.items():
    print(f"{node:12s} → x={x:.2f}, y={y:.2f}, weight={G_dir.nodes[node]['weight']}")
