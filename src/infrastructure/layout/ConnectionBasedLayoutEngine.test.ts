/**
 * Tests for Connection-Based Layout Engine
 *
 * Tests cover:
 * 1. Main example (RBAC system from Python algo)
 * 2. Simple chain (A → B → C)
 * 3. Diamond pattern
 * 4. Position Rule verification
 * 5. Conflict handling
 * 6. Multiple roots
 * 7. Isolated entities
 * 8. Circular dependencies
 * 9. ERP schema (without cycles)
 */

import { describe, it, expect } from 'vitest';
import { ConnectionBasedLayoutEngine } from './ConnectionBasedLayoutEngine';
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

describe('ConnectionBasedLayoutEngine', () => {

  describe('Rule 1: Main RBAC Example', () => {
    it('should follow the example algorithm exactly', () => {
      console.log('\n========================================');
      console.log('  CONNECTION-BASED LAYOUT TEST');
      console.log('========================================');

      // Create entities
      const entityNames = [
        'users', 'profiles', 'posts', 'comments', 'tags',
        'post_tags', 'user_roles', 'roles', 'role_permissions',
        'permissions', 'teams'
      ];

      const entities: Entity[] = entityNames.map(name => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        fields: [],
        color: '#fff',
        icon: ''
      }));

      // Create relationships from the example
      const relationships: Relationship[] = [
        // 1: users.profileId - profiles.id
        {
          from: { entity: 'users', field: 'profileId' },
          to: { entity: 'profiles', field: 'id' },
          type: 'one-to-one',
          color: '#888'
        },
        // 2: posts.authorId > users.id
        {
          from: { entity: 'posts', field: 'authorId' },
          to: { entity: 'users', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 3: users.id > teams.id
        {
          from: { entity: 'users', field: 'id' },
          to: { entity: 'teams', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 4: comments.postId > posts.id
        {
          from: { entity: 'comments', field: 'postId' },
          to: { entity: 'posts', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 5: tags.userId > users.id
        {
          from: { entity: 'tags', field: 'userId' },
          to: { entity: 'users', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 6: post_tags.postId > posts.id
        {
          from: { entity: 'post_tags', field: 'postId' },
          to: { entity: 'posts', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 7: post_tags.tagId > tags.id
        {
          from: { entity: 'post_tags', field: 'tagId' },
          to: { entity: 'tags', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 8: user_roles.userId > users.id
        {
          from: { entity: 'user_roles', field: 'userId' },
          to: { entity: 'users', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 9: user_roles.roleId > roles.id
        {
          from: { entity: 'user_roles', field: 'roleId' },
          to: { entity: 'roles', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 10: role_permissions.roleId > roles.id
        {
          from: { entity: 'role_permissions', field: 'roleId' },
          to: { entity: 'roles', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        // 11: role_permissions.permissionId > permissions.id
        {
          from: { entity: 'role_permissions', field: 'permissionId' },
          to: { entity: 'permissions', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      // Run the algorithm
      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      console.log('\n========================================');
      console.log('  VERIFICATION');
      console.log('========================================\n');

      // Expected final result from the algorithm:
      // Layer 0: [user_roles, comments, role_permissions]
      // Layer 1: [post_tags, roles, permissions]
      // Layer 2: [posts, tags]
      // Layer 3: [users]
      // Layer 4: [profiles, teams]

      console.log('\nActual:');
      Array.from(result.layers.entries())
        .sort((a: [number, string[]], b: [number, string[]]) => a[0] - b[0])
        .forEach(([layer, entities]: [number, string[]]) => {
          console.log(`  Layer ${layer}: [${entities.sort().join(', ')}]`);
        });

      // Verify layer structure
      expect(result.layerOf.get('user_roles')).toBe(0);
      expect(result.layerOf.get('comments')).toBe(0);
      expect(result.layerOf.get('role_permissions')).toBe(0);

      expect(result.layerOf.get('post_tags')).toBe(1);
      expect(result.layerOf.get('roles')).toBe(1);
      expect(result.layerOf.get('permissions')).toBe(1);

      expect(result.layerOf.get('posts')).toBe(2);
      expect(result.layerOf.get('tags')).toBe(2);

      expect(result.layerOf.get('users')).toBe(3);

      expect(result.layerOf.get('profiles')).toBe(4);
      expect(result.layerOf.get('teams')).toBe(4);

      // Verify Rule 1: minimum distance (connected entities in different layers)
      relationships.forEach(rel => {
        const fromLayer = result.layerOf.get(rel.from.entity)!;
        const toLayer = result.layerOf.get(rel.to.entity)!;
        const distance = Math.abs(fromLayer - toLayer);
        expect(distance).toBeGreaterThanOrEqual(1);
      });

      console.log('\n✓ All assertions passed!\n');
    });
  });

  describe('Rule 2: Simple Chain (A → B → C)', () => {
    it('should place entities in correct order', () => {
      const entities: Entity[] = [
        { name: 'A', displayName: 'A', fields: [], color: '#fff', icon: '' },
        { name: 'B', displayName: 'B', fields: [], color: '#fff', icon: '' },
        { name: 'C', displayName: 'C', fields: [], color: '#fff', icon: '' }
      ];

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
        }
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // A should be leftmost (layer 0), C should be rightmost
      const layerA = result.layerOf.get('A')!;
      const layerB = result.layerOf.get('B')!;
      const layerC = result.layerOf.get('C')!;

      expect(layerA).toBeLessThan(layerB);
      expect(layerB).toBeLessThan(layerC);
    });
  });

  describe('Rule 3: Diamond Pattern', () => {
    it('should handle diamond dependency pattern correctly', () => {
      // Diamond:
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

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      const layerA = result.layerOf.get('A')!;
      const layerB = result.layerOf.get('B')!;
      const layerC = result.layerOf.get('C')!;
      const layerD = result.layerOf.get('D')!;

      // A should be leftmost
      expect(layerA).toBeLessThan(layerB);
      expect(layerA).toBeLessThan(layerC);

      // D should be rightmost
      expect(layerD).toBeGreaterThan(layerB);
      expect(layerD).toBeGreaterThan(layerC);

      // B and C should be at same or adjacent layers
      expect(Math.abs(layerB - layerC)).toBeLessThanOrEqual(1);
    });
  });

  describe('Rule 4: Position Rule Verification', () => {
    it('should respect position rule: first written is left', () => {
      const entities: Entity[] = [
        { name: 'X', displayName: 'X', fields: [], color: '#fff', icon: '' },
        { name: 'Y', displayName: 'Y', fields: [], color: '#fff', icon: '' }
      ];

      // X > Y means X is left of Y (position rule)
      const relationships: Relationship[] = [
        {
          from: { entity: 'X', field: 'yId' },
          to: { entity: 'Y', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // X is written first, so X should be left (lower layer)
      expect(result.layerOf.get('X')!).toBeLessThan(result.layerOf.get('Y')!);
    });
  });

  describe('Rule 5: Conflict Handling', () => {
    it('should handle conflicts by incrementing/decrementing layers', () => {
      // Setup: Multiple entities depending on same target
      const entities: Entity[] = [
        { name: 'target', displayName: 'Target', fields: [], color: '#fff', icon: '' },
        { name: 'dep1', displayName: 'Dep1', fields: [], color: '#fff', icon: '' },
        { name: 'dep2', displayName: 'Dep2', fields: [], color: '#fff', icon: '' },
        { name: 'dep3', displayName: 'Dep3', fields: [], color: '#fff', icon: '' }
      ];

      const relationships: Relationship[] = [
        {
          from: { entity: 'dep1', field: 'targetId' },
          to: { entity: 'target', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'dep2', field: 'targetId' },
          to: { entity: 'target', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        },
        {
          from: { entity: 'dep3', field: 'targetId' },
          to: { entity: 'target', field: 'id' },
          type: 'many-to-one',
          color: '#888'
        }
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // All deps should be in same layer (no conflict with each other)
      const dep1Layer = result.layerOf.get('dep1')!;
      const dep2Layer = result.layerOf.get('dep2')!;
      const dep3Layer = result.layerOf.get('dep3')!;

      expect(dep1Layer).toBe(dep2Layer);
      expect(dep2Layer).toBe(dep3Layer);

      // Target should be in different layer
      const targetLayer = result.layerOf.get('target')!;
      expect(targetLayer).not.toBe(dep1Layer);
    });
  });

  describe('Rule 6: Multiple Independent Roots', () => {
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

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      const root1Layer = result.layerOf.get('root1')!;
      const root2Layer = result.layerOf.get('root2')!;
      const childLayer = result.layerOf.get('child')!;

      // Both roots should be at same layer
      expect(root1Layer).toBe(root2Layer);

      // Child should be at lower layer
      expect(childLayer).toBeLessThan(root1Layer);
    });
  });

  describe('Rule 7: Isolated Entities', () => {
    it('should place isolated entities in rightmost layer', () => {
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

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // Isolated entity should be placed
      expect(result.layerOf.has('isolated')).toBe(true);

      // Isolated should be rightmost (highest layer)
      const isolatedLayer = result.layerOf.get('isolated')!;
      const connected1Layer = result.layerOf.get('connected1')!;
      const connected2Layer = result.layerOf.get('connected2')!;

      expect(isolatedLayer).toBeGreaterThanOrEqual(Math.max(connected1Layer, connected2Layer));
    });
  });

  describe('Rule 8: Circular Dependencies', () => {
    it('should handle circular dependencies without infinite loop', () => {
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

      // Should not throw
      expect(() => {
        ConnectionBasedLayoutEngine.layout(entities, relationships);
      }).not.toThrow();

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // All nodes should be placed
      expect(result.layerOf.has('A')).toBe(true);
      expect(result.layerOf.has('B')).toBe(true);
      expect(result.layerOf.has('C')).toBe(true);
    });
  });

  describe('ERP Schema Test - Without Cycles', () => {
    it('should compute layers for simplified ERP schema', () => {
      console.log('\n======================================');
      console.log('  ERP SCHEMA - CONNECTION-BASED');
      console.log('======================================\n');

      const entities: Entity[] = [
        'users', 'teams', 'workspaces', 'folders', 'chat', 'invite',
        'orders', 'order_items', 'products', 'categories', 'reviews',
        'payments', 'shipments', 'addresses', 'carts', 'cart_items'
      ].map(name => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        fields: [],
        color: '#fff',
        icon: ''
      }));

      const relationships: Relationship[] = [
        // Workspace hierarchy
        { from: { entity: 'users', field: 'teamId' }, to: { entity: 'teams', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'workspaces', field: 'folderId' }, to: { entity: 'folders', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'workspaces', field: 'teamId' }, to: { entity: 'teams', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'chat', field: 'workspaceId' }, to: { entity: 'workspaces', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'invite', field: 'workspaceId' }, to: { entity: 'workspaces', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'invite', field: 'inviterId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },

        // E-commerce
        { from: { entity: 'orders', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'order_items', field: 'orderId' }, to: { entity: 'orders', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'order_items', field: 'productId' }, to: { entity: 'products', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'products', field: 'categoryId' }, to: { entity: 'categories', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'reviews', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'reviews', field: 'productId' }, to: { entity: 'products', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'payments', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'payments', field: 'orderId' }, to: { entity: 'orders', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'shipments', field: 'addressId' }, to: { entity: 'addresses', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'shipments', field: 'orderId' }, to: { entity: 'orders', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'addresses', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'carts', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'cart_items', field: 'cartId' }, to: { entity: 'carts', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'cart_items', field: 'productId' }, to: { entity: 'products', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      console.log('=== COMPUTED LAYERS ===\n');
      const sortedLayers = Array.from(result.layers.entries()).sort((a: [number, string[]], b: [number, string[]]) => a[0] - b[0]);
      for (const [layer, nodes] of sortedLayers as [number, string[]][]) {
        console.log(`Layer ${layer}: ${nodes.sort().join(', ')}`);
      }

      console.log('\n======================================\n');

      // Basic sanity checks
      expect(result.layers.size).toBeGreaterThan(0);
      expect(result.layerOf.size).toBe(entities.length);

      // Verify some expected relationships
      expect(result.layerOf.get('cart_items')!).toBeLessThan(result.layerOf.get('carts')!);
      expect(result.layerOf.get('order_items')!).toBeLessThan(result.layerOf.get('orders')!);
      expect(result.layerOf.get('chat')!).toBeLessThan(result.layerOf.get('workspaces')!);
      expect(result.layerOf.get('products')!).toBeLessThan(result.layerOf.get('categories')!);
    });
  });

  describe('Step 6: Vertical Ordering by Maximum Target Position', () => {
    it('should order entities by maximum target position in next layer', () => {
      console.log('\n======================================');
      console.log('  VERTICAL ORDERING TEST');
      console.log('======================================\n');

      const entities: Entity[] = [
        'users', 'workspaces', 'teams', 'folders', 'orders', 'carts'
      ].map(name => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        fields: [],
        color: '#fff',
        icon: ''
      }));

      // Create scenario where vertical ordering matters:
      // Layer 1: workspaces, users
      // Layer 2: teams (pos 0), folders (pos 1), orders (pos 2), carts (pos 3)
      //
      // workspaces -> [folders, teams] -> max pos = 1
      // users -> [teams, orders, carts] -> max pos = 3
      //
      // Expected: workspaces (max 1) comes before users (max 3)
      const relationships: Relationship[] = [
        { from: { entity: 'workspaces', field: 'folderId' }, to: { entity: 'folders', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'workspaces', field: 'teamId' }, to: { entity: 'teams', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'teamId' }, to: { entity: 'teams', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'orderId' }, to: { entity: 'orders', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'cartId' }, to: { entity: 'carts', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      console.log('Expected vertical order in their layer:');
      console.log('  workspaces (max target pos: 1) should come before users (max target pos: 3)');

      console.log('\nActual layers:');
      Array.from(result.layers.entries())
        .sort((a: [number, string[]], b: [number, string[]]) => a[0] - b[0])
        .forEach(([layer, entities]: [number, string[]]) => {
          console.log(`  Layer ${layer}: [${entities.join(', ')}]`);
        });

      // Both should be in the same layer
      const workspacesLayer = result.layerOf.get('workspaces')!;
      const usersLayer = result.layerOf.get('users')!;
      expect(workspacesLayer).toBe(usersLayer);

      // Verify vertical ordering: workspaces should come before users
      const layer = result.layers.get(workspacesLayer)!;
      const workspacesIndex = layer.indexOf('workspaces');
      const usersIndex = layer.indexOf('users');

      console.log(`\nworkspaces index: ${workspacesIndex}, users index: ${usersIndex}`);
      expect(workspacesIndex).toBeLessThan(usersIndex);

      console.log('\n✓ Vertical ordering test passed!\n');
    });

    it('should place entities with no targets first in vertical order', () => {
      const entities: Entity[] = [
        'A', 'B', 'C', 'target'
      ].map(name => ({
        name,
        displayName: name,
        fields: [],
        color: '#fff',
        icon: ''
      }));

      // A -> target
      // B -> target
      // C -> (no target in next layer)
      const relationships: Relationship[] = [
        { from: { entity: 'A', field: 'targetId' }, to: { entity: 'target', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'B', field: 'targetId' }, to: { entity: 'target', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // C should be in a different layer or come first if in same layer as A,B
      const layerC = result.layerOf.get('C')!;
      const layerA = result.layerOf.get('A')!;

      if (layerC === layerA) {
        // If same layer, C should come first (no target = -1 position)
        const layer = result.layers.get(layerC)!;
        const indexC = layer.indexOf('C');
        const indexA = layer.indexOf('A');
        const indexB = layer.indexOf('B');

        expect(indexC).toBeLessThan(indexA);
        expect(indexC).toBeLessThan(indexB);
      }
    });
  });

  describe('Full ERP Schema Test - Algo4 Example', () => {
    it('should match Python algo4.py expected output', () => {
      console.log('\n======================================');
      console.log('  FULL ERP SCHEMA - ALGO4 MATCH');
      console.log('======================================\n');

      const entities: Entity[] = [
        'users', 'teams', 'workspaces', 'folders', 'chat', 'invite',
        'orders', 'order_items', 'products', 'categories',
        'reviews', 'payments', 'shipments', 'addresses',
        'carts', 'cart_items'
      ].map(name => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        fields: [],
        color: '#fff',
        icon: ''
      }));

      const relationships: Relationship[] = [
        { from: { entity: 'users', field: 'id' }, to: { entity: 'teams', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'workspaces', field: 'id' }, to: { entity: 'folders', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'workspaces', field: 'id' }, to: { entity: 'teams', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'chat', field: 'id' }, to: { entity: 'workspaces', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'invite', field: 'id' }, to: { entity: 'workspaces', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'invite', field: 'id' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'id' }, to: { entity: 'orders', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'orders', field: 'id' }, to: { entity: 'order_items', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'order_items', field: 'id' }, to: { entity: 'products', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'products', field: 'id' }, to: { entity: 'categories', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'id' }, to: { entity: 'reviews', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'products', field: 'id' }, to: { entity: 'reviews', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'orders', field: 'id' }, to: { entity: 'payments', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'id' }, to: { entity: 'payments', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'orders', field: 'id' }, to: { entity: 'shipments', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'shipments', field: 'id' }, to: { entity: 'addresses', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'id' }, to: { entity: 'carts', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'carts', field: 'id' }, to: { entity: 'cart_items', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'cart_items', field: 'id' }, to: { entity: 'products', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'id' }, to: { entity: 'addresses', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

            // Expected final result from the algorithm:
      // Layer 0: [invite, chat]
      // Layer 1: [workspaces, users]
      // Layer 2: [teams, folders, orders, carts]
      // Layer 3: [payments, shipments, order_items, cart_items]
      // Layer 4: [addresses, products]
      // Layer 5: [reviews, categories]

      console.log('\nActual (TypeScript):');
      Array.from(result.layers.entries())
        .sort((a: [number, string[]], b: [number, string[]]) => a[0] - b[0])
        .forEach(([layer, entities]: [number, string[]]) => {
          console.log(`Layer ${layer}: [${entities.join(', ')}]`);
        });

      // Verify horizontal layers
      expect(result.layerOf.get('invite')).toBe(0);
      expect(result.layerOf.get('chat')).toBe(0);

      expect(result.layerOf.get('workspaces')).toBe(1);
      expect(result.layerOf.get('users')).toBe(1);

      expect(result.layerOf.get('teams')).toBe(2);
      expect(result.layerOf.get('folders')).toBe(2);
      expect(result.layerOf.get('orders')).toBe(2);
      expect(result.layerOf.get('carts')).toBe(2);

      expect(result.layerOf.get('payments')).toBe(3);
      expect(result.layerOf.get('shipments')).toBe(3);
      expect(result.layerOf.get('order_items')).toBe(3);
      expect(result.layerOf.get('cart_items')).toBe(3);

      expect(result.layerOf.get('addresses')).toBe(4);
      expect(result.layerOf.get('products')).toBe(4);

      expect(result.layerOf.get('reviews')).toBe(5);
      expect(result.layerOf.get('categories')).toBe(5);

      // Verify vertical ordering within Layer 1
      const layer1 = result.layers.get(1)!;
      const workspacesIdx = layer1.indexOf('workspaces');
      const usersIdx = layer1.indexOf('users');
      expect(workspacesIdx).toBeLessThan(usersIdx);

      console.log('\n✓ Full ERP schema test passed!\n');
    });
  });
});
