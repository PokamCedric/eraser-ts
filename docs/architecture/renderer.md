# Renderer Module Architecture

## Overview

The renderer module is responsible for visualizing Entity-Relationship Diagrams (ERD) on an HTML canvas. It orchestrates the layout pipeline and handles user interactions.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CanvasRendererAdapter                     │
│                      (Main Orchestrator)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─── Manages
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Data Layer  │      │Layout Pipeline│      │Rendering Layer│
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        │                     │                     │
   ┌────┴────┐           ┌────┴────┐           ┌────┴────┐
   │         │           │         │           │         │
   ▼         ▼           ▼         ▼           ▼         ▼
Entities  Relationships Layout   Field      Canvas    Interaction
                      Engines  Optimizers   Drawing    Handlers
```

## Layer Structure

### 1. Data Layer
```
Input: Entity[], Relationship[]
   │
   ├── Storage: Map<string, Position>
   │
   └── Coordinate System: World Space (independent of zoom/pan)
```

### 2. Layout Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTO-LAYOUT PIPELINE                      │
└─────────────────────────────────────────────────────────────┘

Step 1: Build Dependency Graph
┌─────────────────────────────────┐
│  HierarchicalLayoutEngine       │
│  .buildDependencyGraph()        │
│                                 │
│  Input:  Entities, Relationships│
│  Output: Forward/Reverse Graph  │
└─────────────────────────────────┘
              ↓
Step 2: Compute Layers
┌─────────────────────────────────┐
│  HierarchicalLayoutEngine       │
│  .computeLayers()               │
│                                 │
│  Algorithm: Longest Path DFS    │
│  Layout: Leaves Left → Roots Right│
└─────────────────────────────────┘
              ↓
Step 3: Vertical Alignment Optimization
┌─────────────────────────────────┐
│  VerticalAlignmentOptimizer     │
│  .optimize()                    │
│                                 │
│  Method: Weighted Barycenter    │
│  - PK connections: weight 0.3   │
│  - Normal connections: weight 1.0│
│  Iterations: 4 (forward/backward)│
└─────────────────────────────────┘
              ↓
Step 4: Calculate Positions
┌─────────────────────────────────┐
│  LayoutPositioner               │
│  .calculatePositions()          │
│                                 │
│  Height: Dynamic per entity     │
│  Spacing: H=370px, V=30px       │
└─────────────────────────────────┘
              ↓
Step 5: Field Ordering Optimization
┌─────────────────────────────────┐
│  FieldOrderingOptimizer         │
│  .optimizeFieldOrder()          │
│                                 │
│  Rules:                         │
│  - R-F1: PK always position 0   │
│  - R-F2: Max dispersion         │
│  - R-F3: Sort by target Y       │
│  Iterations: 1 only             │
└─────────────────────────────────┘
              ↓
Step 6: Connection-Aligned Spacing
┌─────────────────────────────────┐
│  ConnectionAlignedSpacing       │
│  .optimizeSpacing()             │
│                                 │
│  Status: PROBLEMATIC            │
│  Note: Currently makes it worse │
└─────────────────────────────────┘
              ↓
Step 7: Fit to Screen
┌─────────────────────────────────┐
│  .fitToScreen()                 │
│                                 │
│  Calculate optimal zoom/pan     │
└─────────────────────────────────┘
```

### 3. Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     RENDERING PIPELINE                       │
└─────────────────────────────────────────────────────────────┘

Transform Setup
┌─────────────────────────────────┐
│  ctx.translate(panX, panY)      │
│  ctx.scale(zoom, zoom)          │
└─────────────────────────────────┘
              ↓
Draw Relationships (Background)
┌─────────────────────────────────┐
│  For each relationship:         │
│                                 │
│  1. Get field Y positions       │
│  2. Determine connection sides  │
│  3. Draw orthogonal routing     │
│  4. Draw cardinality markers    │
│  5. Draw labels                 │
└─────────────────────────────────┘
              ↓
Draw Entities (Foreground)
┌─────────────────────────────────┐
│  For each entity:               │
│                                 │
│  1. Draw shadow                 │
│  2. Draw background + border    │
│  3. Draw header (colored)       │
│  4. Draw fields:                │
│     - PK: Blue background       │
│     - FK: Yellow background     │
│     - Icons: 🔑 🔗 ✦           │
└─────────────────────────────────┘
```

### 4. Coordinate Systems

```
┌─────────────────────────────────────────────────────────────┐
│                    COORDINATE TRANSFORMATION                 │
└─────────────────────────────────────────────────────────────┘

Screen Space                          World Space
(Canvas pixels)                       (Logical coordinates)
     │                                      ▲
     │                                      │
     │  screenToWorld()                     │
     ├──────────────────────────────────────┤
     │                                      │
     │  x = (screenX - panX) / zoom         │
     │  y = (screenY - panY) / zoom         │
     │                                      │
     └──────────────────────────────────────┘

User Input (mouse)  ──→  Screen Space  ──→  World Space
                         (transform)        (storage)
```

### 5. Connection Routing

```
Horizontal Layout (dx ≠ 0):
┌─────────┐                        ┌─────────┐
│  From   │────→ midX              │   To    │
│         │         │              │         │
│      [field]──────┼──────────[field]       │
│         │         │              │         │
└─────────┘    ←────midX           └─────────┘

Orthogonal routing:
  fromX → midX → midX → toX
          (fromY) (toY)


Vertical Layout (dx = 0):
┌─────────┐
│  From   │
│         │
│   [field]
│    │    │
└────┼────┘
     │
     ↓ midY
     │
┌────┼────┐
│   [field]
│         │
│   To    │
└─────────┘
```

### 6. Field-Level Connections

```
Entity Structure:
┌─────────────────────┐  ─┬─ Header (50px)
│     Entity Name     │   │
├─────────────────────┤  ─┴─
│ id (PK) 🔑          │  ─┬─ Field 0 (30px) ← Field Y calculation
├─────────────────────┤   │
│ name                │  ─┼─ Field 1 (30px)
├─────────────────────┤   │
│ foreignId (FK) 🔗   │  ─┴─ Field 2 (30px)
└─────────────────────┘

Field Y Position Formula:
  fieldY = entityY + headerHeight + (fieldIndex × fieldHeight) + (fieldHeight / 2)

Example:
  entityY = 100
  headerHeight = 50
  fieldIndex = 2
  fieldHeight = 30

  fieldY = 100 + 50 + (2 × 30) + 15 = 225
```

### 7. State Management

```
┌─────────────────────────────────────────────────────────────┐
│                        STATE DIAGRAM                         │
└─────────────────────────────────────────────────────────────┘

Core Data State:
  entities: Entity[]
  relationships: Relationship[]
  entityPositions: Map<string, Position>

View State:
  zoom: number (0.1 - 3.0)
  panX: number
  panY: number

Interaction State:
  isDragging: boolean
  isPanning: boolean
  dragEntity: Entity | null
  dragOffset: {x, y}
  lastMousePos: {x, y}

Display State:
  displayWidth: number
  displayHeight: number
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
```

## Module Dependencies

```
CanvasRendererAdapter
    │
    ├── implements → IRenderer (domain/repositories)
    │
    ├── uses → Entity (domain/entities)
    ├── uses → Relationship (domain/entities)
    ├── uses → Position (domain/value-objects)
    │
    ├── uses → HierarchicalLayoutEngine (infrastructure/layout)
    ├── uses → LayoutPositioner (infrastructure/layout)
    ├── uses → VerticalAlignmentOptimizer (infrastructure/layout)
    ├── uses → FieldOrderingOptimizer (infrastructure/layout)
    └── uses → ConnectionAlignedSpacing (infrastructure/layout)
```

## Design Patterns

```
┌─────────────────────────────────────────────────────────────┐
│                       DESIGN PATTERNS                        │
└─────────────────────────────────────────────────────────────┘

1. Adapter Pattern
   ┌──────────────┐        ┌─────────────────────┐
   │  IRenderer   │◄───────│ CanvasRendererAdapter│
   │  (Interface) │        │  (Adapter)          │
   └──────────────┘        └─────────────────────┘
                                     │
                                     ▼
                           ┌─────────────────┐
                           │  Canvas API     │
                           │  (Adaptee)      │
                           └─────────────────┘

2. Strategy Pattern
   ┌──────────────────────┐
   │  Layout Strategies:  │
   ├──────────────────────┤
   │  - Hierarchical      │
   │  - Alignment         │
   │  - Field Ordering    │
   │  - Spacing           │
   └──────────────────────┘

3. Pipeline Pattern
   Step 1 → Step 2 → Step 3 → ... → Step 7
   (Each step transforms output of previous)

4. Observer Pattern
   User Events → Event Listeners → State Changes → Re-render
```

## Configuration

```typescript
// Entity Dimensions
entityWidth: 250px
entityHeaderHeight: 50px
entityFieldHeight: 30px

// Spacing
horizontalSpacing: 370px (entityWidth + 120)
verticalSpacing: 30px (minimum)

// Zoom
min: 0.1 (10%)
max: 3.0 (300%)
default: 1.0 (100%)

// Colors
background: '#ffffff'
entityBorder: '#e2e8f0'
relationLine: '#3b82f6'
primaryKeyBg: '#dbeafe'
foreignKeyBg: '#fef3c7'
```
