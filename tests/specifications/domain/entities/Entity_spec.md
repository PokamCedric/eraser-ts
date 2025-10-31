# Test Specification: Entity

## Component Overview

**File:** `src/domain/entities/Entity.ts`
**Type:** Domain Entity (Value Object with Builder Pattern)
**Complexity:** Low
**Critical:** Yes (Core domain model)

### Purpose
Represents a database table/entity in the diagram. Immutable entity with builder methods following LSP.

### Dependencies
- `Field` entity

---

## Public API

```typescript
class Entity {
  constructor(props: EntityProps)
  withField(field: Field): Entity
  withFields(fields: Field[]): Entity

  // Read-only properties
  readonly name: string
  readonly displayName: string
  readonly icon: string
  readonly color: string
  readonly fields: readonly Field[]
}
```

---

## Test Cases

### Unit Tests

#### TC-E-001: Constructor - Valid Entity Creation
**Input:**
```typescript
new Entity({
  name: 'users',
  displayName: 'Users',
  icon: 'user-icon',
  color: '#3b82f6',
  fields: []
})
```
**Expected:** Entity created with all properties set correctly

#### TC-E-002: Constructor - Minimal Properties
**Input:**
```typescript
new Entity({
  name: 'products',
  displayName: 'Products'
})
```
**Expected:**
- Entity created
- `icon` defaults to 'box'
- `color` defaults to '#3b82f6'
- `fields` is empty array (frozen)

#### TC-E-003: Constructor - With Fields
**Input:**
```typescript
new Entity({
  name: 'orders',
  displayName: 'Orders',
  fields: [field1, field2]
})
```
**Expected:** Fields array is frozen (Object.isFrozen returns true)

#### TC-E-004: withField - Add Single Field
**Input:**
```typescript
const entity = new Entity({ name: 'test', displayName: 'Test' })
const newEntity = entity.withField(field)
```
**Expected:**
- Returns new Entity instance
- Original entity unchanged
- New entity has field added
- Fields array is frozen

#### TC-E-005: with Field - Immutability Check
**Input:**
```typescript
const entity = new Entity({ name: 'test', displayName: 'Test' })
const newEntity = entity.withField(field)
```
**Expected:** `entity !== newEntity` (different instances)

#### TC-E-006: withFields - Replace All Fields
**Input:**
```typescript
const entity = new Entity({
  name: 'test',
  displayName: 'Test',
  fields: [field1]
})
const newEntity = entity.withFields([field2, field3])
```
**Expected:**
- Returns new Entity instance
- New entity has field2, field3
- Original entity still has field1

#### TC-E-007: withFields - Empty Array
**Input:**
```typescript
entity.withFields([])
```
**Expected:** Entity with no fields

#### TC-E-008: Immutability - Cannot Mutate Fields Directly
**Input:**
```typescript
const entity = new Entity({ name: 'test', displayName: 'Test', fields: [field1] })
try {
  (entity.fields as any).push(field2)
} catch (error) {
  // Expected to throw
}
```
**Expected:** TypeError (cannot add property, object is not extensible)

#### TC-E-009: Immutability - Cannot Reassign Properties
**Input:**
```typescript
const entity = new Entity({ name: 'test', displayName: 'Test' })
try {
  (entity as any).name = 'changed'
} catch (error) {
  // Expected in strict mode
}
```
**Expected:** Properties remain unchanged (readonly)

### Edge Cases

#### TC-E-E001: Empty Name
**Input:** `new Entity({ name: '', displayName: 'Test' })`
**Expected:** Entity created (validation handled at application layer)

#### TC-E-E002: Special Characters in Name
**Input:** `new Entity({ name: 'user-profiles_2024', displayName: 'User Profiles' })`
**Expected:** Entity created with name as-is

#### TC-E-E003: Very Long Display Name
**Input:** `displayName: 'A'.repeat(1000)`
**Expected:** Entity created (no length validation)

#### TC-E-E004: Unicode Characters
**Input:**
```typescript
new Entity({
  name: 'utilisateurs',
  displayName: '用户',
  icon: '👤'
})
```
**Expected:** Entity created with Unicode preserved

### Error Cases

#### TC-E-ERR001: Null Name
**Input:** `new Entity({ name: null as any, displayName: 'Test' })`
**Expected:** TypeScript compile error (runtime: stores null)

#### TC-E-ERR002: Undefined Properties
**Input:** `new Entity({ name: undefined as any, displayName: 'Test' })`
**Expected:** TypeScript compile error

---

## MC/DC Test Matrix

### Decision 1: Icon Default Value
```typescript
this.icon = props.icon ?? 'box';
```

| Test Case | props.icon | Result | Condition Tested |
|-----------|------------|--------|------------------|
| TC-E-002 | undefined | 'box' | Nullish (true) |
| TC-E-001 | 'user-icon' | 'user-icon' | Nullish (false) |

### Decision 2: Color Default Value
```typescript
this.color = props.color ?? '#3b82f6';
```

| Test Case | props.color | Result | Condition Tested |
|-----------|-------------|--------|------------------|
| TC-E-002 | undefined | '#3b82f6' | Nullish (true) |
| TC-E-001 | '#3b82f6' | '#3b82f6' | Nullish (false) |

### Decision 3: Fields Default Value
```typescript
this.fields = Object.freeze(props.fields ?? []);
```

| Test Case | props.fields | Result | Condition Tested |
|-----------|--------------|--------|------------------|
| TC-E-002 | undefined | [] | Nullish (true) |
| TC-E-001 | [] | [] | Nullish (false) |
| TC-E-003 | [field1, field2] | [field1, field2] | Nullish (false) |

**MC/DC Coverage:** 3 decisions × 2 conditions = 6 test cases minimum
**Actual Test Cases:** 9 (exceeds minimum) ✅

---

## Mock Requirements

### External Dependencies
- **Field:** Use real Field instances (no mocking needed - simple value object)

### Test Data Fixtures
```typescript
// fixtures/entities.ts
export const validEntityProps: EntityProps = {
  name: 'users',
  displayName: 'Users',
  icon: 'user',
  color: '#blue',
  fields: []
}

export const minimalEntityProps: EntityProps = {
  name: 'products',
  displayName: 'Products'
}
```

---

## Implementation Notes

1. **Immutability Testing:** Verify Object.isFrozen() on fields array
2. **Builder Pattern:** Ensure new instances returned from withField/withFields
3. **Reference Equality:** Verify original !== new after builder methods
4. **TypeScript Types:** Verify readonly enforcement at compile time

---

## Success Criteria

- ✅ All 9 unit test cases passing
- ✅ All 4 edge cases handled
- ✅ MC/DC coverage 100%
- ✅ Immutability verified
- ✅ Builder pattern validated
- ✅ No regressions in existing code
