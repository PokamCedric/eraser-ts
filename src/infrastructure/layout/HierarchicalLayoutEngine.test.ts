/**
 * Unit tests for HierarchicalLayoutEngine
 *
 * Tests cover different scenarios and rules:
 * 1. Simple chain (A → B → C)
 * 2. Diamond pattern (A → B, A → C, B → D, C → D)
 * 3. RBAC system with distance minimization
 * 4. Multiple roots
 * 5. Isolated entities
 */

import { describe, it, expect } from 'vitest';
import { HierarchicalLayoutEngine } from './HierarchicalLayoutEngine';
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

describe('HierarchicalLayoutEngine', () => {

  describe('Rule 1: Simple Chain (A → B → C)', () => {
    it('should place entities in correct hierarchical order', () => {
      // Setup: posts → users → teams
      const entities: Entity[] = [
        { name: 'posts', displayName: 'Posts', fields: [], color: '#fff', icon: '' },
        { name: 'users', displayName: 'Users', fields: [], color: '#fff', icon: '' },
        { name: 'teams', displayName: 'Teams', fields: [], color: '#fff', icon: '' }
      ];

      const relationships: Relationship[] = [
        {
          from: { entity: 'posts', field: 'userId' },
          to: { entity: 'users', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'users', field: 'teamId' },
          to: { entity: 'teams', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const dependencyGraph = HierarchicalLayoutEngine.buildDependencyGraph(entities, relationships);
      const result = HierarchicalLayoutEngine.computeLayers(dependencyGraph, entities);

      // Verify: teams (root) should be rightmost, posts (leaf) should be leftmost
      const teamsLayer = result.layerOf.get('teams')!;
      const usersLayer = result.layerOf.get('users')!;
      const postsLayer = result.layerOf.get('posts')!;

      expect(teamsLayer).toBeGreaterThan(usersLayer);
      expect(usersLayer).toBeGreaterThan(postsLayer);
    });
  });

  describe('Rule 2: Diamond Pattern (Multiple paths to same entity)', () => {
    it('should handle diamond dependency pattern correctly', () => {
      // Setup: Diamond pattern
      //   A → B → D
      //   A → C → D
      const entities: Entity[] = [
        { name: 'A', displayName: 'A', fields: [], color: '#fff', icon: '' },
        { name: 'B', displayName: 'B', fields: [], color: '#fff', icon: '' },
        { name: 'C', displayName: 'C', fields: [], color: '#fff', icon: '' },
        { name: 'D', displayName: 'D', fields: [], color: '#fff', icon: '' }
      ];

      const relationships: Relationship[] = [
        {
          from: { entity: 'A', field: 'bId' },
          to: { entity: 'B', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'A', field: 'cId' },
          to: { entity: 'C', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'B', field: 'dId' },
          to: { entity: 'D', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'C', field: 'dId' },
          to: { entity: 'D', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const dependencyGraph = HierarchicalLayoutEngine.buildDependencyGraph(entities, relationships);
      const result = HierarchicalLayoutEngine.computeLayers(dependencyGraph, entities);

      // Verify: D should be rightmost (root), A should be leftmost (leaf)
      const layerD = result.layerOf.get('D')!;
      const layerB = result.layerOf.get('B')!;
      const layerC = result.layerOf.get('C')!;
      const layerA = result.layerOf.get('A')!;

      expect(layerD).toBeGreaterThan(layerB);
      expect(layerD).toBeGreaterThan(layerC);
      expect(layerB).toBeGreaterThan(layerA);
      expect(layerC).toBeGreaterThan(layerA);
    });
  });

  describe('Rule 3: RBAC with Distance Minimization', () => {
    it('should place user_roles and role_permissions at same layer (distance minimization)', () => {
      // Setup: RBAC system from documentation example
      const entities: Entity[] = [
        { name: 'teams', displayName: 'Teams', fields: [], color: '#fff', icon: '' },
        { name: 'users', displayName: 'Users', fields: [], color: '#fff', icon: '' },
        { name: 'roles', displayName: 'Roles', fields: [], color: '#fff', icon: '' },
        { name: 'permissions', displayName: 'Permissions', fields: [], color: '#fff', icon: '' },
        { name: 'user_roles', displayName: 'User Roles', fields: [], color: '#fff', icon: '' },
        { name: 'role_permissions', displayName: 'Role Permissions', fields: [], color: '#fff', icon: '' },
        { name: 'posts', displayName: 'Posts', fields: [], color: '#fff', icon: '' }
      ];

      const relationships: Relationship[] = [
        {
          from: { entity: 'users', field: 'teamId' },
          to: { entity: 'teams', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'posts', field: 'authorId' },
          to: { entity: 'users', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'user_roles', field: 'userId' },
          to: { entity: 'users', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'user_roles', field: 'roleId' },
          to: { entity: 'roles', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'role_permissions', field: 'roleId' },
          to: { entity: 'roles', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'role_permissions', field: 'permissionId' },
          to: { entity: 'permissions', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const dependencyGraph = HierarchicalLayoutEngine.buildDependencyGraph(entities, relationships);
      const result = HierarchicalLayoutEngine.computeLayers(dependencyGraph, entities);

      // Key assertion: user_roles and role_permissions should be at SAME layer
      const userRolesLayer = result.layerOf.get('user_roles')!;
      const rolePermissionsLayer = result.layerOf.get('role_permissions')!;

      expect(userRolesLayer).toBe(rolePermissionsLayer);

      // Verify hierarchical order
      const teamsLayer = result.layerOf.get('teams')!;
      const usersLayer = result.layerOf.get('users')!;
      const rolesLayer = result.layerOf.get('roles')!;
      const permissionsLayer = result.layerOf.get('permissions')!;

      // teams should be rightmost (root)
      expect(teamsLayer).toBeGreaterThan(usersLayer);

      // roles and permissions should be at same layer or close (both moved to align)
      expect(Math.abs(rolesLayer - permissionsLayer)).toBeLessThanOrEqual(0);

      // Junction tables should be leftmost
      expect(userRolesLayer).toBeLessThan(usersLayer);
      expect(rolePermissionsLayer).toBeLessThan(rolesLayer);
    });
  });

  describe('Rule 4: Multiple Independent Roots', () => {
    it('should handle multiple independent root entities', () => {
      const entities: Entity[] = [
        { name: 'root1', displayName: 'Root1', fields: [], color: '#fff', icon: '' },
        { name: 'root2', displayName: 'Root2', fields: [], color: '#fff', icon: '' },
        { name: 'child', displayName: 'Child', fields: [], color: '#fff', icon: '' }
      ];

      const relationships: Relationship[] = [
        {
          from: { entity: 'child', field: 'root1Id' },
          to: { entity: 'root1', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'child', field: 'root2Id' },
          to: { entity: 'root2', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const dependencyGraph = HierarchicalLayoutEngine.buildDependencyGraph(entities, relationships);
      const result = HierarchicalLayoutEngine.computeLayers(dependencyGraph, entities);

      const root1Layer = result.layerOf.get('root1')!;
      const root2Layer = result.layerOf.get('root2')!;
      const childLayer = result.layerOf.get('child')!;

      // Both roots should be at same layer (aligned by distance minimization)
      expect(root1Layer).toBe(root2Layer);

      // Child should be at lower layer
      expect(childLayer).toBeLessThan(root1Layer);
    });
  });

  describe('Rule 5: Isolated Entities', () => {
    it('should place isolated entities in separate layer', () => {
      const entities: Entity[] = [
        { name: 'connected1', displayName: 'Connected1', fields: [], color: '#fff', icon: '' },
        { name: 'connected2', displayName: 'Connected2', fields: [], color: '#fff', icon: '' },
        { name: 'isolated', displayName: 'Isolated', fields: [], color: '#fff', icon: '' }
      ];

      const relationships: Relationship[] = [
        {
          from: { entity: 'connected1', field: 'connected2Id' },
          to: { entity: 'connected2', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const dependencyGraph = HierarchicalLayoutEngine.buildDependencyGraph(entities, relationships);
      const result = HierarchicalLayoutEngine.computeLayers(dependencyGraph, entities);

      // Isolated entity should be placed in a layer
      expect(result.layerOf.has('isolated')).toBe(true);

      // Isolated should typically be rightmost (highest layer)
      const isolatedLayer = result.layerOf.get('isolated')!;
      const connected1Layer = result.layerOf.get('connected1')!;
      const connected2Layer = result.layerOf.get('connected2')!;

      expect(isolatedLayer).toBeGreaterThanOrEqual(Math.max(connected1Layer, connected2Layer));
    });
  });

  describe('Rule 6: No Cycles', () => {
    it('should handle circular dependencies gracefully', () => {
      const entities: Entity[] = [
        { name: 'A', displayName: 'A', fields: [], color: '#fff', icon: '' },
        { name: 'B', displayName: 'B', fields: [], color: '#fff', icon: '' },
        { name: 'C', displayName: 'C', fields: [], color: '#fff', icon: '' }
      ];

      // Create a cycle: A → B → C → A
      const relationships: Relationship[] = [
        {
          from: { entity: 'A', field: 'bId' },
          to: { entity: 'B', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'B', field: 'cId' },
          to: { entity: 'C', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'C', field: 'aId' },
          to: { entity: 'A', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const dependencyGraph = HierarchicalLayoutEngine.buildDependencyGraph(entities, relationships);

      // Should not throw - cycles should be handled
      expect(() => {
        HierarchicalLayoutEngine.computeLayers(dependencyGraph, entities);
      }).not.toThrow();

      const result = HierarchicalLayoutEngine.computeLayers(dependencyGraph, entities);

      // All nodes in cycle should be placed (even if at layer 0)
      expect(result.layerOf.has('A')).toBe(true);
      expect(result.layerOf.has('B')).toBe(true);
      expect(result.layerOf.has('C')).toBe(true);
    });
  });

  describe('Dependency Graph Building', () => {
    it('should correctly build dependency graph from relationships', () => {
      const entities: Entity[] = [
        { name: 'posts', displayName: 'Posts', fields: [], color: '#fff', icon: '' },
        { name: 'users', displayName: 'Users', fields: [], color: '#fff', icon: '' }
      ];

      const relationships: Relationship[] = [
        {
          from: { entity: 'posts', field: 'authorId' },
          to: { entity: 'users', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const graph = HierarchicalLayoutEngine.buildDependencyGraph(entities, relationships);

      // Verify graph structure
      expect(graph.nodes.has('posts')).toBe(true);
      expect(graph.nodes.has('users')).toBe(true);

      // posts depends on users
      expect(graph.graph.get('posts')).toContain('users');

      // users is depended upon by posts
      expect(graph.reverseGraph.get('users')).toContain('posts');
    });
  });
});
