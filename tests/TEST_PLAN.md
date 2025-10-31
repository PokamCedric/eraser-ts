# Test Plan - 100% MC/DC Coverage

## Objective
Achieve 100% Modified Condition/Decision Coverage (MC/DC) for all relevant components in the ERP Visual Designer codebase.

## Test Structure

```
tests/
├── specifications/          # Test specifications (.md files)
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── data/
├── unit_tests/             # Unit tests (*_ut.test.ts)
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── data/
│   └── presentation/
└── integration_tests/      # Integration tests (*_it.test.ts)
    ├── domain/
    ├── application/
    └── infrastructure/
```

## Naming Convention

- **Unit tests:** `{ComponentName}_ut.test.ts`
- **Integration tests:** `{ComponentName}_it.test.ts`
- **Specifications:** `{ComponentName}_spec.md`

## Components to Test (68 total)

### Priority 1: Domain Layer (Core Business Logic)

#### Entities (3 components)
- [x] Entity.ts
- [x] Field.ts
- [x] Relationship.ts

#### Value Objects (1 component)
- [ ] Position.ts

#### Services - Layout Algorithms (13 components)
- [ ] LayerClassifier.ts ⭐ CRITICAL
- [ ] LayerClassificationEngine.ts ⭐ CRITICAL
- [ ] LayerClassificationOrchestrator.ts
- [ ] CrossingMinimizer.ts
- [ ] FieldOrderingAlgorithm.ts
- [ ] GraphPreprocessor.ts
- [ ] MagneticAlignmentOptimizer.ts
- [ ] SourceAwareVerticalOptimizer.ts
- [ ] VerticalOrderOptimizer.ts
- [ ] DirectPredecessorAnalyzer.ts
- [ ] LayoutPositioner.ts
- [ ] LayerClassifierRust.ts (optional - native binding)
- [ ] types.ts (type definitions - no tests needed)

#### Interfaces (7 components - no implementation tests)
- ICrossingMinimizer.ts
- ILayerClassifier.ts
- IVerticalOptimizer.ts
- ILogger.ts
- IBaseRenderer.ts
- IDiagramRepository.ts
- etc.

### Priority 2: Application Layer (Use Cases)

#### Use Cases (3 components)
- [ ] ParseDSLUseCase.ts
- [ ] RenderDiagramUseCase.ts
- [ ] ExportCodeUseCase.ts

#### Services (2 components)
- [ ] DiagramService.ts
- [ ] ExportFormatRegistry.ts

### Priority 3: Infrastructure Layer (Technical Implementation)

#### DI Container (1 component)
- [ ] DIContainer.ts ⭐ CRITICAL

#### Parsers (8 components)
- [ ] DSLParserAdapter.ts ⭐ CRITICAL
- [ ] DSLLexer.ts
- [ ] EntityParser.ts
- [ ] FieldParser.ts
- [ ] RelationshipParser.ts
- [ ] MetadataParser.ts
- [ ] DecoratorParser.ts
- [ ] RelationshipTypeResolver.ts

#### Exporters (4 components)
- [ ] JSONExporter.ts
- [ ] SQLExporter.ts
- [ ] TypeScriptExporter.ts
- [ ] TypeMapper.ts

#### Renderers (7 components)
- [ ] CanvasRendererAdapter.ts
- [ ] EntityRenderer.ts
- [ ] RelationshipRenderer.ts
- [ ] CardinalityRenderer.ts
- [ ] ViewportManager.ts
- [ ] CanvasInteractionHandler.ts
- [ ] CanvasLayoutOrchestrator.ts

#### Utils (1 component)
- [ ] Logger.ts

### Priority 4: Data Layer

#### Models (4 components)
- [ ] EntityModel.ts
- [ ] FieldModel.ts
- [ ] RelationshipModel.ts
- [ ] utils.ts

### Priority 5: Presentation Layer (Controllers)

#### Controllers (6 components)
- [ ] AppController.ts
- [ ] EditorController.ts
- [ ] ExportController.ts
- [ ] ResizeController.ts
- [ ] StatusController.ts
- [ ] ToolbarController.ts

#### Factories (1 component)
- [ ] MonacoEditorFactory.ts

### Excluded from Testing

- **main.ts** - Entry point (integration test only)
- **default_data.ts** - Static data
- **index.ts** files - Re-exports only
- **Interface files** - No implementation to test

## MC/DC Coverage Requirements

### What is MC/DC?

Modified Condition/Decision Coverage ensures:
1. Each condition in a decision independently affects the outcome
2. All possible outcomes of each decision are tested
3. Each condition is tested for both true and false values

### Example:
```typescript
if (a && b || c) {
  // MC/DC requires testing:
  // 1. a=T, b=T, c=F → true (a affects)
  // 2. a=F, b=T, c=F → false (a affects)
  // 3. a=T, b=T, c=F → true (b affects)
  // 4. a=T, b=F, c=F → false (b affects)
  // 5. a=F, b=F, c=T → true (c affects)
  // 6. a=F, b=F, c=F → false (c affects)
}
```

## Test Specifications Format

Each component requires a specification file with:

1. **Component Overview**
2. **Dependencies**
3. **Public API**
4. **Test Cases**
   - Unit tests
   - Edge cases
   - Error cases
5. **MC/DC Test Matrix**
6. **Mock Requirements**

## Testing Tools

- **Framework:** Vitest
- **Assertions:** Vitest assertions
- **Mocking:** Vitest mocks
- **Coverage:** Vitest coverage (c8)

## Coverage Goals

- **Statement Coverage:** 100%
- **Branch Coverage:** 100%
- **Function Coverage:** 100%
- **Line Coverage:** 100%
- **MC/DC Coverage:** 100% ⭐

## Execution Plan

### Phase 1: Critical Components (Week 1)
1. Entity, Field, Relationship (domain entities)
2. DIContainer (infrastructure core)
3. LayerClassifier (core algorithm)
4. DSLParserAdapter (core parser)

### Phase 2: Domain Services (Week 2)
5. LayerClassificationEngine
6. CrossingMinimizer
7. FieldOrderingAlgorithm
8. MagneticAlignmentOptimizer

### Phase 3: Application & Infrastructure (Week 3)
9. Use cases (Parse, Render, Export)
10. Parsers (Lexer, Entity, Field, Relationship)
11. Exporters (JSON, SQL, TypeScript)

### Phase 4: Presentation & Integration (Week 4)
12. Controllers
13. Renderers
14. Integration tests

## Success Criteria

✅ All 68 components have test specifications
✅ All testable components have unit tests
✅ Critical paths have integration tests
✅ 100% MC/DC coverage achieved
✅ All tests passing
✅ CI/CD pipeline configured
