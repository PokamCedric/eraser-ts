# Cluster-Based Ordering Algorithm

## Overview

A graph layout algorithm that minimizes edge crossings by building chains of connected clusters across hierarchical layers. Entities sharing connections to the same target are grouped together and ordered to maintain visual coherence.

## Core Concepts

### Cluster
**Definition:** A set of entities in layer N that ALL connect to the SAME entity in layer N+1.

**Example:**
```
Layer 1: post_tags, attachments, comments, projects
Layer 2: posts, tags

Cluster 1.0: [post_tags, attachments, comments, projects] → posts
Cluster 1.1: [post_tags] → tags

Note: post_tags is a PIVOT (belongs to both clusters)
```

### Pivot
An entity belonging to multiple clusters. Pivots act as boundaries between cluster groups.

### Chain
A connected path of clusters across multiple layers, representing natural groupings.

**Example:**
```
Chain: 0.0 → 1.0 → 2.2 → 3.0
Means: cluster 0.0 connects to 1.0, which connects to 2.2, which connects to 3.0
```

## Algorithm Steps

### Step 1: Identify All Clusters

For each consecutive layer pair (N, N+1), build clusters by grouping entities in N by their shared target in N+1.

**Example Scenario:**

```
Layer 0: milestones, user_projects
  Cluster 0.0: [milestones, user_projects] → projects

Layer 1: comments, post_tags, projects, attachments
  Cluster 1.0: [comments, post_tags, projects, attachments] → posts
  Cluster 1.1: [post_tags] → tags

Layer 2: user_roles, role_permissions, notifications, posts, tags
  Cluster 2.0: [user_roles, role_permissions, notifications] → roles
  Cluster 2.1: [role_permissions] → permissions
  Cluster 2.2: [user_roles, posts, tags] → users

Layer 3: roles, permissions, users
  Cluster 3.0: [users] → profiles
  Cluster 3.1: [users] → teams
  Cluster 3.2: [roles] → (no connections)
  Cluster 3.3: [permissions] → (no connections)
```

### Step 2: Establish Connections Between Clusters

Determine which clusters connect to which by checking if the target of cluster A is an entity in cluster B.

**Example:**
```
Layer Pair 0-1:
  0.0 → 1.0  (projects is in cluster 1.0)

Layer Pair 1-2:
  1.0 → 2.2  (posts is in cluster 2.2)
  1.1 → 2.2  (tags is in cluster 2.2)

Layer Pair 2-3:
  2.0 → 3.2  (roles is in cluster 3.2)
  2.1 → 3.3  (permissions is in cluster 3.3)
  2.2 → 3.0  (users is in cluster 3.0)
  2.2 → 3.1  (users is in cluster 3.1)
```

### Step 3: Order Anchor Layer Clusters

Start with the central layer (anchor). Order clusters by chaining them via pivots.

**Pivot Chaining:**
- Cluster 2.2 contains: user_roles, posts, tags
- Cluster 2.0 contains: user_roles (PIVOT!)
- Cluster 2.1 contains: role_permissions (PIVOT!)
- Cluster 2.0 contains: role_permissions (PIVOT!)

**Possible orders:**
- 2.2 → 2.0 → 2.1 (via pivot user_roles, then role_permissions)
- 2.1 → 2.0 → 2.2 (reverse)

Algorithm picks the order based on non-pivot count (cluster with most non-pivot entities first).

### Step 4: Build Chains from Anchor

For each anchor cluster, create a chain by extending upward and downward through connections.

**Process:**
1. Start with anchor cluster (e.g., 2.2)
2. Extend upward: 2.2 → 3.0 (via connection 2.2 → 3.0)
3. Extend downward: 1.0 → 2.2 (via connection 1.0 → 2.2)
4. Continue: 0.0 → 1.0 (via connection 0.0 → 1.0)

**Result:** Chain 0.0 → 1.0 → 2.2 → 3.0

### Step 5: Build Standalone Chains

Clusters not yet in any chain get their own chains, with attempts to extend them.

**Example:**
```
Cluster 1.1 not in any chain yet
Try to extend: 1.1 → 2.2 (but 2.2 already taken!)
Result: Chain 1.1 (standalone, cannot extend)
```

### Step 6: Apply Chain Order to Layers

For each layer, order entities by following the chain order of their clusters.

**Within each cluster:**
1. Add non-pivot entities
2. Add pivot entities at boundaries (between clusters)

**Example for Layer 1:**
```
Chains affecting Layer 1:
- Chain 0: contains cluster 1.0
- Chain 3: contains cluster 1.1

Order clusters: 1.1, then 1.0

Cluster 1.1 entities: [post_tags]
Cluster 1.0 entities: [comments, projects, attachments] + pivot [post_tags]

Result: post_tags (from 1.1), comments, projects, attachments
```

## Complete Example Walkthrough

**Initial State:**
```
Layer 0: milestones, user_projects
Layer 1: comments, post_tags, projects, attachments
Layer 2: user_roles, role_permissions, notifications, posts, tags
Layer 3: roles, permissions, users
Layer 4: profiles, teams
```

**After clustering and chaining:**
```
Built 5 chains:
  Chain 0: 0.0 → 1.0 → 2.2 → 3.0
  Chain 1: 2.0
  Chain 2: 2.1
  Chain 3: 1.1
  Chain 4: (3.1 if not connected)

Final ordering:
  Layer 0: milestones, user_projects
  Layer 1: post_tags, comments, projects, attachments
  Layer 2: posts, tags, user_roles, notifications, role_permissions
  Layer 3: users, roles, permissions
  Layer 4: profiles, teams
```

## Key Principles

1. **Cluster Cohesion:** Entities sharing connections stay visually adjacent
2. **Chain Extension:** Connected clusters form natural paths across layers
3. **Pivot Boundaries:** Pivots mark transitions between cluster groups
4. **Center-Out Processing:** Start from middle, extend to extremes

## Algorithm Complexity

- **Time:** O(n × m × r) where n=entities/layer, m=layers, r=relationships
- **Space:** O(n + m + r)

## Usage

```typescript
import { ClusterBasedOrdering } from './ClusterBasedOrdering';

const layers = new Map<number, string[]>([
  [0, ['milestones', 'user_projects']],
  [1, ['comments', 'post_tags', 'projects', 'attachments']],
  [2, ['user_roles', 'posts', 'tags']]
]);

const relationships = [
  { from: { entity: 'milestones' }, to: { entity: 'projects' } },
  { from: { entity: 'projects' }, to: { entity: 'posts' } },
  // ...
];

const optimized = ClusterBasedOrdering.optimize(layers, relationships);
```

## Strengths & Limitations

**Strengths:**
- Respects natural connectivity patterns
- Minimizes crossings through cluster grouping
- Handles pivots elegantly at boundaries
- Deterministic output

**Limitations:**
- Initial anchor order affects final result
- Multiple valid orderings possible (based on pivot chains)
- Dense graphs may have many overlapping clusters

## When to Use

**Best for:**
- ERD visualizations with many-to-many relationships
- Hierarchical diagrams with clear grouping patterns
- Moderate to high connectivity graphs

**Avoid when:**
- Very sparse graphs (little benefit)
- Extremely dense graphs (too many clusters)

## Debug Output

Console logs show:
- All identified clusters
- Connections between clusters (by layer pair)
- Anchor layer cluster order
- Built chains with full paths
- Final entity order per layer

## Related Files

- [ClusterBasedOrdering.ts](../src/infrastructure/layout/ClusterBasedOrdering.ts)
- [hierarchical-layout-algorithm.md](./hierarchical-layout-algorithm.md)
