# Layer Classification - Modular Architecture (TypeScript)

## Overview

The layer classification algorithm is now organized into separate, focused modules for better maintainability and clarity. This mirrors the Python implementation but integrates with existing TypeScript infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│        LayerClassificationEngine (Public API)           │
│                  (Thin Wrapper)                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         LayerClassificationOrchestrator                 │
│                (Main Coordinator)                        │
└────────────────────────┬────────────────────────────────┘
                         │
       ┌─────────────────┼─────────────────┬──────────────┬──────────────┐
       │                 │                 │              │              │
       ▼                 ▼                 ▼              ▼              ▼
┌──────────┐      ┌──────────┐      ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Phase 0  │      │Phase 1-2 │      │ Phase 3  │  │ Phase 4  │  │ Phase 5  │
│  Parser  │  ->  │Preprocess│  ->  │Horizontal│->│Source-   │->│ Crossing │
│(Domain)  │      │          │      │          │  │Aware     │  │Minimize  │
│          │      │          │      │          │  │Vertical  │  │          │
└──────────┘      └──────────┘      └──────────┘  └──────────┘  └──────────┘
```

## Modules

### 1. `types.ts` - Shared Types
Defines common types used across modules:
- `DirectedRelation`: `{ left: string, right: string }`

### 2. `GraphPreprocessor.ts` - Phase 1-2: Preprocessing
**Class**: `GraphPreprocessor`

Preprocesses raw relations before layer classification.

**Methods**:
- `buildBacklog(relationsRaw)`: Deduplicates relations (order-agnostic)
- `buildEntityOrder(relations, connectionCount)`: Builds processing order

**Algorithm**:
1. Deduplicate based on entity pairs (A,B) and (B,A) treated as same
2. Count connections per entity
3. Build entity order using BFS with connectivity ranking

**Example**:
```typescript
const { relations, connectionCount } = GraphPreprocessor.buildBacklog(rawRelations);
const entityOrder = GraphPreprocessor.buildEntityOrder(relations, connectionCount);
```

### 3. `LayerClassifier.ts` - Phase 3: Horizontal Alignment
**Class**: `LayerClassifier` (existing - algo10)

Assigns entities to horizontal layers (X-axis positioning).

**Algorithm**: Progressive step-by-step distance calculation

**Key optimizations**:
- Pre-computed clusters cache (O(r) once vs O(n×r) per step)
- Index inversé for propagation (O(d) vs O(n))
- Early exit with visited tracking

**Performance**: 83x faster than Floyd-Warshall

**Example**:
```typescript
const classifier = new LayerClassifier();
for (const { left, right } of relations) {
  classifier.addRelation(left, right);
}
const layers = classifier.computeLayers(entityOrder);
```

### 4. `DirectPredecessorAnalyzer.ts` - Phase 4 Prep
**Class**: `DirectPredecessorAnalyzer`

Analyzes direct predecessors (distance = 1 only) for vertical alignment.

**Direct predecessor**: Entity at distance exactly 1 layer (immediate neighbor)

**Example**:
```typescript
const directPreds = DirectPredecessorAnalyzer.computeDirectPredecessors(
  layers,
  relations
);
// Returns: Map<string, Set<string>>
```

### 5. `SourceAwareVerticalOptimizer.ts` - Phase 4: Source-Aware Vertical Alignment
**Class**: `SourceAwareVerticalOptimizer`

Optimizes vertical order (Y-axis) using **source chains**.

**Key Innovation:** Respects entity provenance (where they come from)

**Concepts:**
- **Direct Clusters:** Entities pointing to same target
- **Pivots:** Entities in multiple clusters
- **Source Chains:** Layer N-1 → Layer N → Layer N+1

**Example**:
```typescript
const optimizer = new SourceAwareVerticalOptimizer(relations);
const verticalLayers = optimizer.optimize(horizontalLayers, entityOrder);
```

### 6. `CrossingMinimizer.ts` - Phase 5: Crossing Minimization
**Class**: `CrossingMinimizer`

Minimizes edge crossings using the **barycenter method**.

**Algorithm**:
1. Forward pass: reorder based on previous layer
2. Backward pass: reorder based on next layer
3. Repeat N iterations, track best solution

**Example**:
```typescript
const minimizer = new CrossingMinimizer(relations);
const finalLayers = minimizer.minimizeCrossings(verticalLayers, 4);
```

### 7. `LayerClassificationOrchestrator.ts` - Main Coordinator
**Class**: `LayerClassificationOrchestrator`

Coordinates all 5 phases of the layer classification pipeline.

**Example**:
```typescript
const layers = LayerClassificationOrchestrator.classify(relationships);
// Returns: string[][] (array of layers)
```

### 7. `LayerClassificationEngine.ts` - Public API
**Class**: `LayerClassificationEngine` (refactored)

Thin wrapper providing backward-compatible API.

**Example**:
```typescript
const result = LayerClassificationEngine.layout(entities, relationships);
// Returns: { layers: Map<number, string[]>, layerOf: Map<string, number> }
```

## Integration with Existing Code

The refactored architecture integrates seamlessly with existing TypeScript infrastructure:

### Uses DSLParserAdapter
The orchestrator receives `Relationship[]` objects from the domain layer, already parsed by `DSLParserAdapter`:

```typescript
// In application layer
const { entities, relationships } = await dslParser.parseDSL(dslText);

// Pass to layout engine
const result = LayerClassificationEngine.layout(entities, relationships);
```

### Backward Compatible
The public API (`LayerClassificationEngine.layout`) remains unchanged:

```typescript
// Before refactoring
const result = LayerClassificationEngine.layout(entities, relationships);

// After refactoring (same API!)
const result = LayerClassificationEngine.layout(entities, relationships);
```

## File Structure

```
src/infrastructure/layout/
├── README.md                                    # This file
├── LayerClassificationEngine.ts                 # Public API (thin wrapper)
├── LayerClassifier.ts                           # Phase 3 (algo10)
├── orchestrator/
│   └── LayerClassificationOrchestrator.ts      # Main coordinator (5 phases)
└── phases/
    ├── types.ts                                 # Shared types
    ├── GraphPreprocessor.ts                     # Phase 1-2: Preprocessing
    ├── SourceAwareVerticalOptimizer.ts         # Phase 4: Source-aware vertical
    └── CrossingMinimizer.ts                     # Phase 5: Crossing minimization
```

## Key Concepts

### Directed Relations
Simplified representation: `{ left: string, right: string }` where `left -> right`

### Deduplication
Order-agnostic: `(A, B)` and `(B, A)` are treated as duplicates.
Only the first occurrence is kept.

### Entity Order
Processing order based on connectivity, used for:
- Distance calculation (algo10)
- Tie-breaking in vertical alignment

### Horizontal Layers (X-axis)
Entities grouped by their distance from reference entity.

### Vertical Order (Y-axis)
Order within each layer, optimized to minimize edge crossings.

### Direct Predecessors
Entities in the immediately previous layer (distance = 1).
Different from all predecessors (any distance).

## Benefits of Modular Architecture

### 1. Separation of Concerns
Each module has a single, well-defined responsibility:
- **GraphPreprocessor**: Data preparation
- **LayerClassifier**: Horizontal positioning
- **VerticalOrderOptimizer**: Vertical positioning
- **Orchestrator**: Coordination

### 2. Testability
Each module can be tested independently:
```typescript
// Test preprocessing in isolation
const result = GraphPreprocessor.buildBacklog(testRelations);
expect(result.relations).toHaveLength(expected);

// Test vertical optimization in isolation
const optimized = VerticalOrderOptimizer.optimize(testLayers, testOrder, testRels);
expect(optimized[0]).toEqual(expectedOrder);
```

### 3. Maintainability
- Clear module boundaries
- Easy to locate and fix bugs
- Simple to extend with new features

### 4. Reusability
Modules can be used independently:
```typescript
// Use only preprocessing
const { relations, connectionCount } = GraphPreprocessor.buildBacklog(raw);

// Use only vertical optimization
const optimized = VerticalOrderOptimizer.optimize(layers, order, rels);
```

## Performance

- **Horizontal alignment**: 83x faster than Floyd-Warshall (0.56ms on CRM dataset)
- **Total pipeline**: < 1ms for 30 entities, 44 relations
- **Scalability**: Tested up to 500 entities

## Migration Guide

### Before (Monolithic)
```typescript
// All logic in LayerClassificationEngine
LayerClassificationEngine.layout(entities, relationships);
```

### After (Modular)
```typescript
// Same public API, but uses orchestrator internally
LayerClassificationEngine.layout(entities, relationships);

// Or use orchestrator directly for more control
const layers = LayerClassificationOrchestrator.classify(relationships);
```

**No breaking changes!** The public API remains identical.

## Comparison with Python Implementation

| Python Module | TypeScript Module | Notes |
|---------------|-------------------|-------|
| `relation_parser.py` | DSLParserAdapter (existing) | Uses domain infrastructure |
| `graph_preprocessor.py` | `GraphPreprocessor.ts` | ✅ Direct port |
| `horizontal_layer_classifier.py` | `LayerClassifier.ts` | Already existed (algo10) |
| `direct_predecessor_analyzer.py` | `DirectPredecessorAnalyzer.ts` | ✅ Direct port |
| `vertical_order_optimizer.py` | `VerticalOrderOptimizer.ts` | ✅ Direct port |
| `layer_classification_orchestrator.py` | `LayerClassificationOrchestrator.ts` | ✅ Direct port |

Both implementations use the same algorithms and produce identical results!

## Next Steps

To extend the system:

1. **Add new optimization phases**: Create new module implementing specific interface
2. **Custom ordering strategies**: Extend `GraphPreprocessor` or `VerticalOrderOptimizer`
3. **Alternative algorithms**: Swap `LayerClassifier` with different implementation
4. **Caching**: Add memoization at orchestrator level for repeated layouts

## See Also

- `docs/layer-classification-algorithm-technical-deep-dive.md` - Algorithm details
- `docs/algo8-optimization-plan.md` - Performance optimizations
- `python_test/README_MODULAR.md` - Python implementation reference
