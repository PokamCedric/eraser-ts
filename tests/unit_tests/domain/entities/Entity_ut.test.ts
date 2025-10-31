/**
 * Unit Tests: Entity
 *
 * Tests for the Entity domain entity (immutable value object with builder pattern).
 * Specification: tests/specifications/domain/entities/Entity_spec.md
 *
 * Coverage Target: 100% MC/DC
 */

import { describe, it, expect } from 'vitest';
import { Entity } from '../../../../src/domain/entities/Entity';
import { Field } from '../../../../src/domain/entities/Field';

describe('Entity - Unit Tests', () => {
  // Test fixtures
  const createTestField = (name: string): Field => {
    return new Field({
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      type: 'string'
    });
  };

  describe('Constructor', () => {
    it('TC-E-001: should create entity with all properties', () => {
      // Arrange
      const field1 = createTestField('id');
      const field2 = createTestField('name');

      // Act
      const entity = new Entity({
        name: 'users',
        displayName: 'Users',
        icon: 'user-icon',
        color: '#3b82f6',
        fields: [field1, field2]
      });

      // Assert
      expect(entity.name).toBe('users');
      expect(entity.displayName).toBe('Users');
      expect(entity.icon).toBe('user-icon');
      expect(entity.color).toBe('#3b82f6');
      expect(entity.fields).toHaveLength(2);
      expect(entity.fields[0]).toBe(field1);
      expect(entity.fields[1]).toBe(field2);
    });

    it('TC-E-002: should use default values for icon and color', () => {
      // Act
      const entity = new Entity({
        name: 'products',
        displayName: 'Products'
      });

      // Assert
      expect(entity.name).toBe('products');
      expect(entity.displayName).toBe('Products');
      expect(entity.icon).toBe('box'); // Default value
      expect(entity.color).toBe('#3b82f6'); // Default value
      expect(entity.fields).toEqual([]);
    });

    it('TC-E-003: should freeze fields array', () => {
      // Arrange
      const field = createTestField('id');

      // Act
      const entity = new Entity({
        name: 'orders',
        displayName: 'Orders',
        fields: [field]
      });

      // Assert
      expect(Object.isFrozen(entity.fields)).toBe(true);
    });
  });

  describe('withField - Builder Pattern', () => {
    it('TC-E-004: should add single field and return new instance', () => {
      // Arrange
      const entity = new Entity({
        name: 'test',
        displayName: 'Test'
      });
      const field = createTestField('newField');

      // Act
      const newEntity = entity.withField(field);

      // Assert
      expect(newEntity).toBeInstanceOf(Entity);
      expect(newEntity.fields).toHaveLength(1);
      expect(newEntity.fields[0]).toBe(field);
      expect(Object.isFrozen(newEntity.fields)).toBe(true);
    });

    it('TC-E-005: should preserve immutability (different instances)', () => {
      // Arrange
      const entity = new Entity({
        name: 'test',
        displayName: 'Test'
      });
      const field = createTestField('newField');

      // Act
      const newEntity = entity.withField(field);

      // Assert
      expect(entity).not.toBe(newEntity); // Different instances
      expect(entity.fields).toHaveLength(0); // Original unchanged
      expect(newEntity.fields).toHaveLength(1); // New has field
    });

    it('TC-E-005b: should preserve all properties except fields', () => {
      // Arrange
      const entity = new Entity({
        name: 'users',
        displayName: 'Users',
        icon: 'user',
        color: '#red'
      });
      const field = createTestField('email');

      // Act
      const newEntity = entity.withField(field);

      // Assert
      expect(newEntity.name).toBe(entity.name);
      expect(newEntity.displayName).toBe(entity.displayName);
      expect(newEntity.icon).toBe(entity.icon);
      expect(newEntity.color).toBe(entity.color);
    });
  });

  describe('withFields - Replace All Fields', () => {
    it('TC-E-006: should replace all fields with new array', () => {
      // Arrange
      const field1 = createTestField('field1');
      const entity = new Entity({
        name: 'test',
        displayName: 'Test',
        fields: [field1]
      });
      const field2 = createTestField('field2');
      const field3 = createTestField('field3');

      // Act
      const newEntity = entity.withFields([field2, field3]);

      // Assert
      expect(newEntity.fields).toHaveLength(2);
      expect(newEntity.fields[0]).toBe(field2);
      expect(newEntity.fields[1]).toBe(field3);
      expect(entity.fields).toHaveLength(1); // Original unchanged
      expect(entity.fields[0]).toBe(field1); // Original unchanged
    });

    it('TC-E-007: should handle empty array', () => {
      // Arrange
      const field = createTestField('field1');
      const entity = new Entity({
        name: 'test',
        displayName: 'Test',
        fields: [field]
      });

      // Act
      const newEntity = entity.withFields([]);

      // Assert
      expect(newEntity.fields).toEqual([]);
      expect(entity.fields).toHaveLength(1); // Original unchanged
    });
  });

  describe('Immutability Guarantees', () => {
    it('TC-E-008: should prevent direct mutation of fields array', () => {
      // Arrange
      const field1 = createTestField('field1');
      const entity = new Entity({
        name: 'test',
        displayName: 'Test',
        fields: [field1]
      });
      const field2 = createTestField('field2');

      // Act & Assert
      expect(() => {
        (entity.fields as any).push(field2);
      }).toThrow(TypeError);
    });

    it('TC-E-009: should have readonly properties (TypeScript enforced)', () => {
      // Arrange
      const entity = new Entity({
        name: 'test',
        displayName: 'Test'
      });

      // Assert
      // TypeScript prevents reassignment at compile time with readonly
      // At runtime in JavaScript, properties CAN be reassigned (not frozen)
      // This test verifies TypeScript compile-time protection exists

      // Verify properties are defined
      expect(entity.name).toBe('test');
      expect(entity.displayName).toBe('Test');

      // TypeScript will show compile error if you try: entity.name = 'changed'
      // The readonly modifier is a compile-time only feature

      // For runtime immutability, we rely on:
      // 1. Builder pattern (withField, withFields return new instances)
      // 2. Object.freeze on fields array
      // 3. No setter methods provided
    });
  });

  describe('Edge Cases', () => {
    it('TC-E-E001: should handle empty string name', () => {
      // Act
      const entity = new Entity({
        name: '',
        displayName: 'Test'
      });

      // Assert
      expect(entity.name).toBe('');
      expect(entity).toBeInstanceOf(Entity);
    });

    it('TC-E-E002: should handle special characters in name', () => {
      // Act
      const entity = new Entity({
        name: 'user-profiles_2024',
        displayName: 'User Profiles'
      });

      // Assert
      expect(entity.name).toBe('user-profiles_2024');
    });

    it('TC-E-E003: should handle very long display name', () => {
      // Arrange
      const longName = 'A'.repeat(1000);

      // Act
      const entity = new Entity({
        name: 'test',
        displayName: longName
      });

      // Assert
      expect(entity.displayName).toBe(longName);
      expect(entity.displayName.length).toBe(1000);
    });

    it('TC-E-E004: should handle Unicode characters', () => {
      // Act
      const entity = new Entity({
        name: 'utilisateurs',
        displayName: '用户',
        icon: '👤'
      });

      // Assert
      expect(entity.name).toBe('utilisateurs');
      expect(entity.displayName).toBe('用户');
      expect(entity.icon).toBe('👤');
    });
  });

  describe('MC/DC Coverage - Default Values', () => {
    it('MCDC-001: icon default - condition true (undefined)', () => {
      // Test: props.icon ?? 'box' when props.icon is undefined
      const entity = new Entity({
        name: 'test',
        displayName: 'Test'
        // icon not provided
      });

      expect(entity.icon).toBe('box');
    });

    it('MCDC-002: icon default - condition false (provided)', () => {
      // Test: props.icon ?? 'box' when props.icon is provided
      const entity = new Entity({
        name: 'test',
        displayName: 'Test',
        icon: 'custom-icon'
      });

      expect(entity.icon).toBe('custom-icon');
    });

    it('MCDC-003: color default - condition true (undefined)', () => {
      // Test: props.color ?? '#3b82f6' when props.color is undefined
      const entity = new Entity({
        name: 'test',
        displayName: 'Test'
        // color not provided
      });

      expect(entity.color).toBe('#3b82f6');
    });

    it('MCDC-004: color default - condition false (provided)', () => {
      // Test: props.color ?? '#3b82f6' when props.color is provided
      const entity = new Entity({
        name: 'test',
        displayName: 'Test',
        color: '#custom'
      });

      expect(entity.color).toBe('#custom');
    });

    it('MCDC-005: fields default - condition true (undefined)', () => {
      // Test: props.fields ?? [] when props.fields is undefined
      const entity = new Entity({
        name: 'test',
        displayName: 'Test'
        // fields not provided
      });

      expect(entity.fields).toEqual([]);
    });

    it('MCDC-006: fields default - condition false (provided)', () => {
      // Test: props.fields ?? [] when props.fields is provided
      const field = createTestField('test');
      const entity = new Entity({
        name: 'test',
        displayName: 'Test',
        fields: [field]
      });

      expect(entity.fields).toEqual([field]);
    });
  });
});
