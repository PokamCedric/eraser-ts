# Test Repository - 100% MC/DC Coverage

## Overview

This directory contains all test specifications and test implementations for the ERP Visual Designer project, targeting **100% Modified Condition/Decision Coverage (MC/DC)**.

## Structure

```
tests/
├── README.md                    # This file
├── TEST_PLAN.md                # Overall test strategy and plan
│
├── specifications/             # Test specifications (.md files)
│   ├── domain/
│   │   └── entities/
│   │       └── Entity_spec.md  ✅
│   ├── application/
│   └── infrastructure/
│
├── unit_tests/                 # Unit tests (*_ut.test.ts)
│   ├── domain/
│   │   └── entities/
│   │       └── Entity_ut.test.ts  ✅ 20/20 passing
│   ├── application/
│   ├── infrastructure/
│   ├── data/
│   └── presentation/
│
└── integration_tests/          # Integration tests (*_it.test.ts)
    ├── domain/
    ├── application/
    └── infrastructure/
```

## Test Statistics

### Overall Progress

| Category | Total | Specified | Implemented | Passing | Coverage |
|----------|-------|-----------|-------------|---------|----------|
| **Domain Entities** | 3 | 1 | 1 | ✅ 20/20 | 100% |
| **Domain Services** | 13 | 0 | 0 | - | 0% |
| **Application** | 5 | 0 | 0 | - | 0% |
| **Infrastructure** | 30 | 0 | 0 | - | 0% |
| **Data** | 4 | 0 | 0 | - | 0% |
| **Presentation** | 7 | 0 | 0 | - | 0% |
| **TOTAL** | **62** | **1** | **1** | **20/20** | **1.6%** |

### Coverage by Component

#### ✅ Completed (100% MC/DC)
1. **Entity** - Domain entity (20 tests, 100% MC/DC)

#### 🔄 In Progress
- None

#### 📋 Planned - Phase 1 (Critical Components)
2. Field - Domain entity
3. Relationship - Domain entity
4. DIContainer - Infrastructure core
5. LayerClassifier - Core algorithm
6. DSLParserAdapter - Core parser

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- tests/unit_tests/domain/entities/Entity_ut.test.ts
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with UI
```bash
npm run test:ui
```

## Test Naming Convention

### Files
- **Unit tests:** `{ComponentName}_ut.test.ts`
- **Integration tests:** `{ComponentName}_it.test.ts`
- **Specifications:** `{ComponentName}_spec.md`

### Test Cases
- **Unit tests:** `TC-{COMPONENT}-{NUMBER}` (e.g., `TC-E-001`)
- **Edge cases:** `TC-{COMPONENT}-E{NUMBER}` (e.g., `TC-E-E001`)
- **Error cases:** `TC-{COMPONENT}-ERR{NUMBER}` (e.g., `TC-E-ERR001`)
- **MC/DC tests:** `MCDC-{NUMBER}` (e.g., `MCDC-001`)

## MC/DC Coverage Explanation

### What is MC/DC?

**Modified Condition/Decision Coverage** is a code coverage criterion that requires:

1. Each entry and exit point is invoked
2. Each decision tries every possible outcome
3. Each condition in a decision takes on every possible outcome
4. Each condition in a decision is shown to independently affect the decision's outcome

### Example

For the code:
```typescript
if (a && b || c) {
  // do something
}
```

MC/DC requires testing these combinations:

| Test | a | b | c | Result | Condition Tested |
|------|---|---|---|--------|------------------|
| 1 | T | T | F | true | a independently affects |
| 2 | F | T | F | false | a independently affects |
| 3 | T | T | F | true | b independently affects |
| 4 | T | F | F | false | b independently affects |
| 5 | F | F | T | true | c independently affects |
| 6 | F | F | F | false | c independently affects |

### Why MC/DC?

- **Critical for safety:** Required by DO-178C for aviation software
- **Finds more bugs:** Better than statement/branch coverage
- **Independent conditions:** Ensures each condition matters
- **Production ready:** Industry standard for high-reliability software

## Test Quality Standards

### Unit Test Requirements

✅ Each test must:
- Have a corresponding specification
- Follow the naming convention
- Test one specific behavior
- Be independent (no test interdependencies)
- Use descriptive test names
- Include arrange/act/assert structure
- Cover all edge cases
- Achieve 100% MC/DC coverage

### Specification Requirements

✅ Each specification must include:
- Component overview
- Public API documentation
- Complete test case list
- MC/DC test matrix
- Mock requirements
- Success criteria

## Writing New Tests

### 1. Create Specification

```bash
# Create spec file
touch tests/specifications/domain/{category}/{Component}_spec.md
```

Write specification following the template in `Entity_spec.md`.

### 2. Create Test File

```bash
# Create test file
touch tests/unit_tests/domain/{category}/{Component}_ut.test.ts
```

### 3. Implement Tests

Follow this structure:
```typescript
import { describe, it, expect } from 'vitest';
import { Component } from '../../../../src/...';

describe('Component - Unit Tests', () => {
  describe('Feature Group', () => {
    it('TC-C-001: should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### 4. Run and Verify

```bash
npm test -- tests/unit_tests/.../Component_ut.test.ts
```

### 5. Check Coverage

```bash
npm test -- --coverage tests/unit_tests/.../Component_ut.test.ts
```

## Continuous Integration

Tests are automatically run on:
- Every commit (pre-commit hook)
- Pull requests
- Main branch merges

### CI Requirements
- All tests must pass
- Coverage must not decrease
- New code requires tests

## Contributors

When adding tests:
1. Create specification first
2. Get specification reviewed
3. Implement tests following spec
4. Ensure 100% MC/DC coverage
5. Update this README with statistics

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [MC/DC Coverage Explained](https://en.wikipedia.org/wiki/Modified_condition/decision_coverage)
- [Test Specifications Template](./specifications/domain/entities/Entity_spec.md)
- [Test Implementation Example](./unit_tests/domain/entities/Entity_ut.test.ts)

---

**Target:** 100% MC/DC Coverage for all 62 components
**Status:** 1/62 components tested (1.6%)
**Next:** Field, Relationship, DIContainer, LayerClassifier
