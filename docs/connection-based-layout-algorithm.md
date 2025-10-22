# Connection-Based Layout Algorithm

A 2D entity layout algorithm that organizes entities both **horizontally** (in layers) and **vertically** (within layers) based on their relationship structure. The core innovation is **cluster-based organization** that enables optimal positioning in both dimensions.

## Overview

The algorithm takes parsed entities and relationships from the DSL parser and organizes them into a clean 2D layout. It consists of 6 steps that transform relationship data into an optimized hierarchical structure.

**Key Innovation:** **Clusters** - Local relationship groups that determine both horizontal layering AND vertical positioning

**Input:** Entities and relationships from `DSLParserAdapter`
**Output:** Optimized 2D positions (layers + ordering within layers)
**Direction:** Left to right (dependencies → dependents), Top to bottom (cluster alignment)

### The Power of Clusters

Originally, the algorithm only handled **horizontal ordering** (which layer an entity belongs to). The introduction of **clusters** revolutionized this by enabling:

1. **Horizontal Organization:** Clusters determine layer boundaries (which entities go left, which go right)
2. **Vertical Organization:** Clusters determine stacking order within each layer (which entities go top, which go bottom)

**Without clusters:** Flat list of entities → Only horizontal ordering
**With clusters:** Hierarchical relationship groups → Both horizontal AND vertical ordering

---

## Complete Example: Project Management System

### Input DSL

```
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
notifications.userId > roles.id
user_projects.userId > users.id
user_projects.projectId > projects.id
projects.id < posts.authorId
comments.userId > users.id
```

**Result:** 19 relationships between 16 entities

---

## Step 1: Convert to Directed Relations

**Purpose:** Convert parsed `Relationship` objects to simple directed pairs

**Rule:** The `from` entity is always LEFT, `to` entity is always RIGHT
The symbol (`>`, `<`, `-`, `<>`) has NO effect - DSLParserAdapter handles that

**Output:**
```
users -> profiles       comments -> posts       projects -> teams
posts -> users          tags -> users           milestones -> projects
users -> teams          post_tags -> posts      attachments -> posts
post_tags -> tags       user_roles -> users     notifications -> roles
user_roles -> roles     user_projects -> users  projects -> posts
role_permissions -> roles    user_projects -> projects    comments -> users
role_permissions -> permissions
```

---

## Step 2: Order Relations by Entity

**Purpose:** Organize relations into processing order based on connectivity

**Algorithm:**
1. Count total connections per entity
2. Iteratively process relations:
   - Prioritize relations connected to already-processed entities
   - Sort by connection count (descending)
3. Group relations by main entity (most connected or already seen)

**Output:**

```
Entity 'users' (7 connections):
  users -> profiles, posts -> users, users -> teams
  tags -> users, user_roles -> users, user_projects -> users, comments -> users

Entity 'posts' (4 connections):
  comments -> posts, post_tags -> posts, attachments -> posts, projects -> posts

Entity 'projects' (4 connections):
  projects -> teams, milestones -> projects
  user_projects -> projects, projects -> posts

Entity 'roles' (3 connections):
  user_roles -> roles, role_permissions -> roles, notifications -> roles

Entity 'post_tags' (2 connections):
  post_tags -> tags

Entity 'role_permissions' (2 connections):
  role_permissions -> permissions

Processing order: users → posts → projects → roles → post_tags → role_permissions
```

---

## Step 3: Build Clusters ⭐ CORE INNOVATION

**Purpose:** Create entity clusters representing local dependency structures

**Why Clusters Are Critical:**
Clusters are the KEY to 2D organization. They provide:
1. **Horizontal structure:** Define which entities belong to the same layer
2. **Vertical structure:** Define ordering within layers (cluster members stay together)
3. **Relationship preservation:** Keep connected entities visually close

**Cluster Definition:**
- **LEFT (Layer N):** All entities pointing TO the cluster entity (dependencies)
- **RIGHT (Layer N+1):** The cluster entity itself (dependent)
- **Cluster group:** LEFT entities should be vertically aligned with RIGHT entity

**Example of Cluster Power:**
```
Cluster 'users':
  LEFT:  [posts, tags, user_roles, user_projects, comments]
  RIGHT: [users]

This means:
- Horizontal: posts, tags, etc. go in layer N, users goes in layer N+1
- Vertical: posts, tags, etc. stack together in layer N (they all connect to users)
```

**Output:**

```
Cluster 1 'users':
  [posts, tags, user_roles, user_projects, comments] -> [users] -> [profiles, teams]

Cluster 2 'posts':
  [comments, post_tags, attachments, projects] -> [posts] -> [users]

Cluster 3 'projects':
  [milestones, user_projects] -> [projects] -> [posts, teams]

Cluster 4 'roles':
  [user_roles, role_permissions, notifications] -> [roles]

Cluster 5 'permissions':
  [role_permissions] -> [permissions]

Cluster 6 'profiles':
  [users] -> [profiles]

Cluster 7 'tags':
  [post_tags] -> [tags] -> [users]

Cluster 8 'teams':
  [users, projects] -> [teams]
```

---

## Step 4: Build Layers from Clusters

**Purpose:** Integrate clusters into unified layer structure

**Algorithm:**
For each cluster:
1. **First cluster:** Create initial layers
2. **Find anchor:** Check if cluster entity exists in current layers
   - Search RIGHT entities first, then LEFT
3. **Anchor in RIGHT:** Remove cluster entities, insert LEFT before anchor
4. **Anchor in LEFT:** Add non-pivot LEFT to anchor layer, insert RIGHT after
5. **No anchor:** Insert at beginning

**Pivot:** Entity already in layers (appears in multiple clusters)

**Evolution:**

```
Iteration 1 (users):
  Layer 0: [posts, tags, user_roles, user_projects, comments]
  Layer 1: [users]

Iteration 2 (posts) - Anchor: posts in RIGHT at layer 0:
  Layer 0: [comments, post_tags, attachments, projects]
  Layer 1: [posts, tags, user_roles, user_projects]
  Layer 2: [users]

Iteration 3 (projects) - Anchor: projects in RIGHT at layer 0:
  Layer 0: [milestones, user_projects]
  Layer 1: [comments, post_tags, attachments, projects]
  Layer 2: [posts, tags, user_roles]
  Layer 3: [users]

Iteration 4 (roles) - Anchor: user_roles in LEFT at layer 2:
  Layer 0: [milestones, user_projects]
  Layer 1: [comments, post_tags, attachments, projects]
  Layer 2: [posts, tags, user_roles, role_permissions, notifications]
  Layer 3: [roles]
  Layer 4: [users]

Iteration 8 (teams) - Final:
  Layer 0: [milestones, user_projects]
  Layer 1: [comments, attachments, projects]
  Layer 2: [post_tags]
  Layer 3: [posts, tags, user_roles, role_permissions, notifications]
  Layer 4: [permissions]
  Layer 5: [roles]
  Layer 6: [users]
  Layer 7: [teams]
  Layer 8: [profiles]
```

---

## Step 5: Optimize Layers

**Purpose:** Reduce vertical space by merging compatible layers

**Algorithm:**
1. Check each adjacent layer pair
2. Merge if NO relationships exist between layers
3. Repeat until no more merges possible

**Result:**

```
Before (9 layers):
  Layer 0: [milestones, user_projects]
  Layer 1: [comments, attachments, projects]
  Layer 2: [post_tags]
  Layer 3: [posts, tags, user_roles, role_permissions, notifications]
  Layer 4: [permissions]
  Layer 5: [roles]
  Layer 6: [users]
  Layer 7: [teams]
  Layer 8: [profiles]

After (5 layers):
  Layer 0: [milestones, user_projects]
  Layer 1: [comments, attachments, projects, post_tags]
  Layer 2: [posts, tags, user_roles, role_permissions, notifications]
  Layer 3: [permissions, roles, users]
  Layer 4: [teams, profiles]
```

---

## Step 6: Reorder Elements Within Layers

**Purpose:** Finalize vertical ordering using cluster alignment

**This is where clusters deliver VERTICAL organization:**

The cluster structure built in Step 3 now determines the final vertical stacking order within each layer. Entities in the same cluster are grouped together vertically.

**Algorithm:**
1. **Last layer:** Order by cluster processing order
2. **Other layers (bottom to top):**
   - Identify clusters in this layer (from Step 3)
   - Order clusters by next layer's entity order
   - Identify pivots (entities belonging to multiple clusters)
   - Place non-pivots first, then pivots between their clusters

**Why this works:**
- Clusters group related entities → They should stack together vertically
- Next layer's order influences this layer's order → Minimizes edge crossings
- Pivots connect multiple clusters → Placed strategically between them

**Result:**

```
Layer 4: [teams, profiles] → [profiles, teams]
Layer 3: [permissions, roles, users] → [users, roles, permissions]
Layer 2: [posts, tags, user_roles, role_permissions, notifications]
      → [posts, tags, user_roles, notifications, role_permissions]
Layer 1: No change
Layer 0: No change
```

---

## Final Output

```
Layer 0: [milestones, user_projects]
Layer 1: [comments, attachments, projects, post_tags]
Layer 2: [posts, tags, user_roles, notifications, role_permissions]
Layer 3: [users, roles, permissions]
Layer 4: [profiles, teams]
```

**Visual Layout (2D):**

```
Horizontal (Layers):  Layer 0 → Layer 1 → Layer 2 → Layer 3 → Layer 4
                      Left                                      Right

Vertical (Stacking):

milestones          comments         posts           users         profiles
user_projects       attachments      tags            roles         teams
                    projects         user_roles      permissions
                    post_tags        notifications
                                     role_permissions

                    ↑                ↑
              Cluster-based    Cluster-based
              vertical         vertical
              grouping         grouping
```

**How Clusters Created This Layout:**
- **Layer 0:** `milestones` and `user_projects` clustered around `projects`
- **Layer 1:** Four entities clustered around different targets (`posts`, `projects`, `tags`)
- **Layer 2:** Five entities from multiple clusters (users, posts, roles, permissions clusters)
- **Layer 3:** Three entities clustered together (roles, permissions dependencies)
- **Layer 4:** Two entities from different clusters (`users`, `projects`)

---

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ DSLParserAdapter (Parsing Layer)                            │
│   parseDSL(dslText) → { entities[], relationships[] }       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ConnectionBasedLayoutEngine (Layout Layer)                  │
│                                                              │
│   Step 1: convertToDirectedRelations()                      │
│   Step 2: orderRelationsByEntity()                          │
│   Step 3: buildClusters()                                   │
│   Step 4: buildLayersFromClusters()                         │
│   Step 5: optimizeLayers()                                  │
│   Step 6: reorderLayersByCluster()                          │
│                                                              │
│   Output: { layers, layerOf }                               │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ CanvasRendererAdapter (Rendering Layer)                     │
│   - MagneticAlignmentOptimizer (field alignment)            │
│   - LayoutPositioner (position calculation)                 │
│   - Canvas rendering                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Principles

1. **Clusters Enable 2D Organization:** The core innovation
   - **Horizontal (Layers):** Clusters define which entities go left vs right
   - **Vertical (Stacking):** Clusters define which entities group together top to bottom
   - Without clusters: Only 1D ordering possible
   - With clusters: Full 2D layout optimization

2. **Separation of Concerns:** Layout doesn't parse DSL
   - DSLParserAdapter: Handles parsing
   - ConnectionBasedLayoutEngine: Handles classification
   - CanvasRendererAdapter: Handles rendering

3. **Dependency Flow:** Left entities depend on right entities
   - Reading direction: Left → Right
   - Data flow: Dependencies → Dependents

4. **Iterative Refinement:** Build → Optimize → Reorder
   - Step 3: Build clusters (2D structure)
   - Step 4: Integrate clusters into layers (horizontal)
   - Step 5: Optimize layer count
   - Step 6: Finalize vertical ordering (vertical)

5. **Pivot Handling:** Shared entities maintain multiple cluster relationships
   - Pivots belong to multiple clusters
   - Special placement between clusters

6. **Edge Minimization:** Cluster-based ordering reduces visual crossings
   - Related entities stack together
   - Reduces connection line crossings

---

## Time Complexity

- **Step 1:** O(R) where R = relationships
- **Step 2:** O(R²) worst case
- **Step 3:** O(R × E) where E = entities
- **Step 4:** O(C × L × E) where C = clusters, L = layers
- **Step 5:** O(L² × R)
- **Step 6:** O(L × E²)

**Overall:** O(R² + E²) - excellent for typical diagrams (< 1000 entities)
