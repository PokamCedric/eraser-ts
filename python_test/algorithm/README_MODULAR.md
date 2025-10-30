# Layer Classification - Modular Architecture

## Overview

The layer classification algorithm is now organized into separate, focused modules for better maintainability and clarity.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         LayerClassificationOrchestrator             │
│                (Main Coordinator)                    │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┼───────────┬──────────────┐
       │           │           │              │
       ▼           ▼           ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Phase 0  │ │ Phase 1-2│ │ Phase 3  │ │ Phase 4  │
│ Parser   │ │Preprocess│ │Horizontal│ │ Vertical │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Modules

### 1. `relation_parser.py` - Phase 0: Parsing
**Class**: `RelationParser`

Parses DSL input and extracts entity relations.

**Supported formats**:
- `A -> B` : A points to B
- `A > B`  : A points to B
- `A - B`  : A points to B
- `A < B`  : A points to B (A is left of B)
- `A <> B` : bidirectional

**Example**:
```python
from relation_parser import RelationParser

dsl = """
users.profileId -> profiles.id
contacts.accountId > accounts.id
"""

relations = RelationParser.parse(dsl)
# Returns: [('users', 'profiles'), ('contacts', 'accounts')]
```

### 2. `graph_preprocessor.py` - Phase 1-2: Preprocessing
**Class**: `GraphPreprocessor`

Preprocesses raw relations before layer classification.

**Functions**:
- **Deduplication**: Removes bidirectional duplicates (keeps first occurrence)
- **Entity Ordering**: Builds processing order based on connectivity (BFS)

**Example**:
```python
from graph_preprocessor import GraphPreprocessor

preprocessor = GraphPreprocessor()
unique_relations = preprocessor.deduplicate(raw_relations)
entity_order = preprocessor.build_entity_order(unique_relations)
```

### 3. `horizontal_layer_classifier.py` - Phase 3: Horizontal Alignment
**Class**: `HorizontalLayerClassifier`

Assigns entities to horizontal layers (X-axis positioning).

**Algorithm**: Progressive step-by-step distance calculation (from algo10)

**Key optimizations**:
- Pre-computed clusters cache (O(r) once vs O(n×r) per step)
- Index inversé for propagation (O(d) vs O(n))
- Early exit with visited tracking

**Performance**: 83x faster than Floyd-Warshall

**Example**:
```python
from horizontal_layer_classifier import HorizontalLayerClassifier

classifier = HorizontalLayerClassifier()
for left, right in relations:
    classifier.add_relation(left, right)

layers = classifier.compute_layers(entity_order)
# Returns: [['layer0_entities'], ['layer1_entities'], ...]
```

### 4. `direct_predecessor_analyzer.py` - Phase 4 Prep
**Class**: `DirectPredecessorAnalyzer`

Analyzes direct predecessors (distance = 1 only) for vertical alignment.

**Direct predecessor**: Entity at distance exactly 1 layer (immediate neighbor)

**Example**:
```python
from direct_predecessor_analyzer import DirectPredecessorAnalyzer

direct_preds = DirectPredecessorAnalyzer.compute_direct_predecessors(
    layers,
    relations
)
# Returns: {entity: {direct_predecessors_set}}
```

### 5. `vertical_order_optimizer.py` - Phase 4: Vertical Alignment
**Class**: `VerticalOrderOptimizer`

Optimizes vertical order (Y-axis) within each layer to minimize edge crossings.

**Algorithm**:
1. Process layers right to left
2. Group entities by their targets in next layer
3. Handle pivots (entities pointing to multiple targets)
4. Sort groups to minimize crossings

**Example**:
```python
from vertical_order_optimizer import VerticalOrderOptimizer

optimizer = VerticalOrderOptimizer(relations)
optimized_layers = optimizer.optimize(
    horizontal_layers,
    entity_order
)
```

### 6. `layer_classification_orchestrator.py` - Main Coordinator
**Class**: `LayerClassificationOrchestrator`

Coordinates all phases of the layer classification pipeline.

**Example**:
```python
from layer_classification_orchestrator import LayerClassificationOrchestrator

orchestrator = LayerClassificationOrchestrator(
    dsl_input,
    debug=True  # Enable logging
)

final_layers = orchestrator.run()
```

## Test Files

### `test_data.py`
Contains test datasets (CRM relations).

### `test_orchestrator.py`
Simple test showing basic usage.

**Run**:
```bash
python test_orchestrator.py
```

### `test_clustering.py`
Detailed analysis with:
- Cluster visualization
- Pivot detection
- Before/after comparison
- Summary statistics

**Run**:
```bash
python test_clustering.py
```

## Usage Example

```python
from layer_classification_orchestrator import LayerClassificationOrchestrator
from test_data import relations_input_crm

# Create orchestrator
orchestrator = LayerClassificationOrchestrator(
    relations_input_crm,
    debug=True
)

# Run complete pipeline
final_layers = orchestrator.run()

# Access results
print(f"Total layers: {len(final_layers)}")
print(f"Horizontal layers: {orchestrator.horizontal_layers}")
print(f"Final layers: {final_layers}")
```

## Key Concepts

### Cluster-Direct
Entities at distance exactly 1 (immediate predecessors).

Example:
```
Layer 6: [A, B, C]
Layer 7: [X, Y]

If A->X, B->X, C->Y:
  Cluster-X-direct: [A, B] -> [X]
  Cluster-Y-direct: [C] -> [Y]
```

### Pivot
Entity belonging to multiple cluster-directs (acts as bridge).

Example:
```
If A->X and A->Y:
  A is a PIVOT between Cluster-X-direct and Cluster-Y-direct
```

## Performance

- **Horizontal alignment**: 83x faster than Floyd-Warshall (0.56ms on CRM dataset)
- **Total pipeline**: < 1ms for 30 entities, 44 relations
- **Scalability**: Tested up to 500 entities

## Running Tests

### Option 1: Direct execution (easiest)
```bash
python python_test/algorithm/test_orchestrator.py
```

### Option 2: Using the convenience script
```bash
python run_python_test.py
```

### Option 3: Using Python module syntax
```bash
python -m python_test.algorithm.test_orchestrator
```

### Option 4: From Python code
```python
# Add algorithm directory to path
import sys
from pathlib import Path
sys.path.insert(0, str(Path('python_test/algorithm')))

from layer_classification_orchestrator import LayerClassificationOrchestrator
from test_data import relations_input_3

orchestrator = LayerClassificationOrchestrator(relations_input_3, debug=True)
final_layers = orchestrator.run()
```

## Migration from algo13.py

Old monolithic file:
```python
import algo13
orchestrator = algo13.LayerClassificationOrchestrator(dsl, debug=True)
```

New modular imports:
```python
from python_test.algorithm.layer_classification_orchestrator import LayerClassificationOrchestrator
orchestrator = LayerClassificationOrchestrator(dsl, debug=True)
```

The API is identical!

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `relation_parser.py` | ~80 | DSL parsing |
| `graph_preprocessor.py` | ~110 | Deduplication & ordering |
| `horizontal_layer_classifier.py` | ~320 | X-axis layer assignment |
| `direct_predecessor_analyzer.py` | ~50 | Direct predecessor analysis |
| `vertical_order_optimizer.py` | ~130 | Y-axis optimization |
| `layer_classification_orchestrator.py` | ~130 | Main coordinator |
| `test_data.py` | ~70 | Test datasets |
| `test_orchestrator.py` | ~30 | Basic test |
| `test_clustering.py` | ~200 | Detailed analysis |

**Total**: ~1,120 lines (vs 700 in monolithic algo13.py)

The modular version is slightly longer but much more maintainable!
