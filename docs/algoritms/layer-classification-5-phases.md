# Layer Classification Algorithm - Complete 5-Phase Pipeline

## Overview

Complete layer classification pipeline with **5 phases** for optimal entity layout with minimal edge crossings.

## Architecture

```
Phase 0: Parser → Phase 1-2: Preprocessor → Phase 3: Horizontal (X) → Phase 4: Vertical (Y) → Phase 5: Crossing Minimization
```

## The 5 Phases

### Phase 0: Parsing
**Module:** `RelationParser`
**Input:** DSL text
**Output:** List of `(left, right)` tuples

---

### Phase 1-2: Preprocessing
**Module:** `GraphPreprocessor`

- **Phase 1:** Deduplication (order-agnostic)
- **Phase 2:** Entity ordering by connectivity (BFS)

---

### Phase 3: Horizontal Alignment (X-Axis)
**Module:** `HorizontalLayerClassifier` (algo10)

Assigns entities to horizontal layers by distance.

**Performance:** 83x faster than Floyd-Warshall

---

### Phase 4: Source-Aware Vertical Alignment (Y-Axis)
**Module:** `PivotBasedVerticalOptimizerV2`

**Key Innovation:** Respects entity **source chains**

```
Layer N-1 (source) → Layer N (entity) → Layer N+1 (target)
```

**Concepts:**
- **Direct Clusters:** Entities pointing to same target
- **Pivots:** Entities in multiple clusters (bridges)
- **Source Chains:** Tracks where entities come from

**Example:**
```
Layer 2: [orders, carts]
Layer 3: [order_items (from orders), cart_items (from carts)]
```

Even if both point to same target, they're grouped by source!

---

### Phase 5: Crossing Minimization
**Module:** `CrossingMinimizer`

Minimizes edge crossings using **barycenter method**.

**Barycenter:** Average position of neighbors

**Algorithm:**
1. Forward pass: reorder based on previous layer
2. Backward pass: reorder based on next layer
3. Repeat N iterations
4. Return best configuration

**Results (CRM):**
- Initial crossings: 17
- Final crossings: 1
- **94% reduction!**

## Performance (CRM Dataset)

- 30 entities, 44 relations
- Total time: < 3ms
- Crossing reduction: 94%

## Files

```
python_test/algorithm/
├── relation_parser.py                      # Phase 0
├── graph_preprocessor.py                   # Phase 1-2
├── horizontal_layer_classifier.py          # Phase 3
├── pivot_based_vertical_optimizer_v2.py    # Phase 4
├── crossing_minimizer.py                   # Phase 5
└── layer_classification_orchestrator.py    # Coordinator
```

## Usage

```python
from layer_classification_orchestrator import LayerClassificationOrchestrator

orchestrator = LayerClassificationOrchestrator(dsl_input, debug=True)
final_layers = orchestrator.run()
```

## Key Improvements

| Feature | Old | New |
|---------|-----|-----|
| Vertical ordering | Target-based | **Source-aware** |
| Pivot handling | Basic | **Bridge-based** |
| Crossing min | ❌ None | ✅ **Barycenter** |
| Crossings (CRM) | ~17 | **1** |

## Next: Port to TypeScript

All 5 phases ready for TypeScript implementation!
