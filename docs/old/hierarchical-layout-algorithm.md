# Hierarchical Layout Algorithm

## Overview

Automatically organizes entities in an ERP diagram into horizontal layers (left to right) based on their dependency relationships, minimizing visual clutter and edge crossings.

## Core Rules

### Rule 1: Minimum Distance
**Entities in a relationship are never in the same layer (distance >= 1)**

For any relationship `A.field -> B.id`:
- Entity A (dependent) and Entity B (dependency) must be in different layers
- The distance between their layers must be at least 1

This ensures visual clarity and prevents overlapping connections.

### Rule 2: Optimal Placement
**Each entity is placed at the minimum valid layer that respects all its constraints**

An entity's layer is computed as:
```
layer = max(layer of all dependencies) + 1
```

This creates a compact layout without unnecessary gaps between layers.

## Algorithm Steps

### Step 1: Dependency Graph Construction
Build a directed graph where each edge represents a dependency:
- For relationship `A.field -> B.id`: create edge A → B (A depends on B)
- Detect and break bidirectional cycles (A ↔ B) by keeping only one direction
- Use lexicographic ordering to ensure consistent cycle breaking

### Step 2: Layer Assignment (Before Inversion)
Starting from root entities (no dependencies), assign layers recursively:

```
for each entity:
  if no dependencies:
    layer = 0  // Root entity
  else:
    layer = 1 + max(layer of all dependencies)
```

### Step 3: Distance Minimization
When an entity depends on multiple entities at different layers, attempt to align them:
- If dependencies span multiple layers, try moving lower-layer dependencies up
- Only move if it doesn't violate topological constraints
- This reduces unnecessary vertical spread in the diagram

### Step 4: Layer Inversion
Invert layers to place roots on the right (convention):

```
maxLayer = maximum layer value
for each entity:
  entity.layer = maxLayer - entity.layer
```

**Result**: Dependent entities (leaves) on the left, root entities on the right.

### Step 5: Handle Isolated Entities
Entities with no relationships are placed in a separate rightmost layer.

## Example

**Input relationships**:
```
posts.authorId -> users.id
comments.postId -> posts.id
user_roles.userId -> users.id
user_roles.roleId -> roles.id
```

**Step 1 - Before inversion**:
```
Layer 0: users, roles (roots - no dependencies)
Layer 1: posts, user_roles (depend on layer 0)
Layer 2: comments (depends on layer 1)
```

**Step 2 - After inversion** (maxLayer = 2):
```
Layer 0 (left):   comments
Layer 1 (middle): posts, user_roles
Layer 2 (right):  users, roles
```

Visual:
```
[comments] ──> [posts] ──> [users]
                  ^           ^
          [user_roles] ────> [roles]
```

## Cycle Handling

### Bidirectional Cycles (A ↔ B)
Automatically detected and broken:
- For `orders.paymentId -> payments.id` AND `payments.orderId -> orders.id`
- Algorithm keeps only one direction (lexicographically first)
- Example: keeps `addresses -> users`, skips `users -> addresses`

### Complex Cycles (A → B → C → A)
Placed at the same layer (fallback behavior):
- These are rare in well-designed ERP schemas
- Manual intervention may be needed for optimal layout

## Testing

See [HierarchicalLayoutEngine.test.ts](../src/infrastructure/layout/HierarchicalLayoutEngine.test.ts):
- Simple chains (A → B → C)
- Diamond patterns (multiple paths)
- RBAC systems with junction tables
- Multiple independent roots
- Isolated entities
- Circular dependencies

## Implementation

[HierarchicalLayoutEngine.ts](../src/infrastructure/layout/HierarchicalLayoutEngine.ts)
