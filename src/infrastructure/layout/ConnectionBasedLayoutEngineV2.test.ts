/**
 * Tests for Connection-Based Layout Engine V2
 * Based on algo5.py - Simplified algorithm with 3 fundamental rules
 */

import { describe, it, expect } from 'vitest';
import { ConnectionBasedLayoutEngine } from './ConnectionBasedLayoutEngine';
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

describe('ConnectionBasedLayoutEngine', () => {

  describe('DSL 1: E-Commerce Schema', () => {
    it('should correctly layout e-commerce schema', () => {
      console.log('\n========================================');
      console.log('  DSL 1: E-COMMERCE SCHEMA TEST');
      console.log('========================================');

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

      console.log('\n========================================');
      console.log('  VERIFICATION - DSL 1');
      console.log('========================================\n');

      // Expected result from algo5.py:
      // Layer 0: ['invite', 'chat']
      // Layer 1: ['users', 'workspaces']
      // Layer 2: ['teams', 'folders', 'orders', 'carts']
      // Layer 3: ['payments', 'shipments', 'order_items', 'cart_items']
      // Layer 4: ['addresses', 'products']
      // Layer 5: ['reviews', 'categories']

      console.log('\nActual (TypeScript V2):');
      Array.from(result.layers.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([layer, entities]) => {
          console.log(`Layer ${layer}: [${entities.join(', ')}]`);
        });

      // Verify horizontal layers
      expect(result.layerOf.get('invite')).toBe(0);
      expect(result.layerOf.get('chat')).toBe(0);

      expect(result.layerOf.get('users')).toBe(1);
      expect(result.layerOf.get('workspaces')).toBe(1);

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

      // Verify vertical ordering within Layer 3 (cluster separation)
      const layer3 = result.layers.get(3)!;
      const paymentsIdx = layer3.indexOf('payments');
      const shipmentsIdx = layer3.indexOf('shipments');
      const orderItemsIdx = layer3.indexOf('order_items');
      const cartItemsIdx = layer3.indexOf('cart_items');

      // payments (no target in Layer 4) should come first
      expect(paymentsIdx).toBeLessThan(shipmentsIdx);
      expect(paymentsIdx).toBeLessThan(orderItemsIdx);
      expect(paymentsIdx).toBeLessThan(cartItemsIdx);

      // shipments (cluster-addresses) should come before order_items/cart_items (cluster-products)
      expect(shipmentsIdx).toBeLessThan(orderItemsIdx);
      expect(shipmentsIdx).toBeLessThan(cartItemsIdx);

      console.log('\n✓ DSL 1 test passed!\n');
    });
  });

  describe('DSL 3: Complex RBAC System with Cascade', () => {
    it('should correctly handle cascade movement', () => {
      console.log('\n========================================');
      console.log('  DSL 3: RBAC WITH CASCADE TEST');
      console.log('========================================');

      const entities: Entity[] = [
        'users', 'profiles', 'posts', 'comments', 'tags',
        'post_tags', 'user_roles', 'roles', 'role_permissions',
        'permissions', 'teams', 'projects', 'milestones',
        'attachments', 'notifications', 'user_projects'
      ].map(name => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        fields: [],
        color: '#fff',
        icon: ''
      }));

      const relationships: Relationship[] = [
        { from: { entity: 'users', field: 'profileId' }, to: { entity: 'profiles', field: 'id' }, type: 'one-to-one', color: '#888' },
        { from: { entity: 'posts', field: 'authorId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'users', field: 'id' }, to: { entity: 'teams', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'comments', field: 'postId' }, to: { entity: 'posts', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'tags', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'post_tags', field: 'postId' }, to: { entity: 'posts', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'post_tags', field: 'tagId' }, to: { entity: 'tags', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'user_roles', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'user_roles', field: 'roleId' }, to: { entity: 'roles', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'role_permissions', field: 'roleId' }, to: { entity: 'roles', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'role_permissions', field: 'permissionId' }, to: { entity: 'permissions', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'projects', field: 'teamId' }, to: { entity: 'teams', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'milestones', field: 'projectId' }, to: { entity: 'projects', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'attachments', field: 'postId' }, to: { entity: 'posts', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'notifications', field: 'userId' }, to: { entity: 'roles', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'user_projects', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'user_projects', field: 'projectId' }, to: { entity: 'projects', field: 'id' }, type: 'many-to-one', color: '#888' },
        // Special relation that triggers cascade: projects < posts
        { from: { entity: 'projects', field: 'id' }, to: { entity: 'posts', field: 'authorId' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'comments', field: 'userId' }, to: { entity: 'users', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      console.log('\n========================================');
      console.log('  VERIFICATION - DSL 3');
      console.log('========================================\n');

      console.log('\nActual (TypeScript V2):');
      Array.from(result.layers.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([layer, entities]) => {
          console.log(`Layer ${layer}: [${entities.join(', ')}]`);
        });

      // Verify that cascade movement worked
      // user_projects should be in an early layer (parent of both users and projects)
      const userProjectsLayer = result.layerOf.get('user_projects')!;
      const projectsLayer = result.layerOf.get('projects')!;
      const postsLayer = result.layerOf.get('posts')!;
      const usersLayer = result.layerOf.get('users')!;

      // user_projects should be left of projects and users
      expect(userProjectsLayer).toBeLessThan(projectsLayer);
      expect(userProjectsLayer).toBeLessThan(usersLayer);

      // projects should be left of posts (because projects < posts relation)
      expect(projectsLayer).toBeLessThan(postsLayer);

      // posts should be left of users (because posts -> users relation)
      expect(postsLayer).toBeLessThan(usersLayer);

      // Verify cluster movement: comments, attachments, post_tags should move with posts
      const commentsLayer = result.layerOf.get('comments')!;
      const attachmentsLayer = result.layerOf.get('attachments')!;
      const postTagsLayer = result.layerOf.get('post_tags')!;

      // These should be close to posts (cluster-posts)
      expect(Math.abs(commentsLayer - postsLayer)).toBeLessThanOrEqual(2);
      expect(Math.abs(attachmentsLayer - postsLayer)).toBeLessThanOrEqual(2);
      expect(Math.abs(postTagsLayer - postsLayer)).toBeLessThanOrEqual(2);

      console.log('\n✓ DSL 3 cascade test passed!\n');
    });
  });

  describe('Rule Verification', () => {
    it('should respect Rule 1: Minimum Distance >= 1', () => {
      const entities: Entity[] = [
        'A', 'B', 'C'
      ].map(name => ({
        name,
        displayName: name,
        fields: [],
        color: '#fff',
        icon: ''
      }));

      const relationships: Relationship[] = [
        { from: { entity: 'A', field: 'bId' }, to: { entity: 'B', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'B', field: 'cId' }, to: { entity: 'C', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // Verify that connected entities are never in the same layer
      relationships.forEach(rel => {
        const fromLayer = result.layerOf.get(rel.from.entity)!;
        const toLayer = result.layerOf.get(rel.to.entity)!;
        const distance = Math.abs(fromLayer - toLayer);
        expect(distance).toBeGreaterThanOrEqual(1);
      });
    });

    it('should respect Rule 2: Optimal Placement (minimum valid layer)', () => {
      const entities: Entity[] = [
        'parent1', 'parent2', 'child'
      ].map(name => ({
        name,
        displayName: name,
        fields: [],
        color: '#fff',
        icon: ''
      }));

      const relationships: Relationship[] = [
        { from: { entity: 'parent1', field: 'childId' }, to: { entity: 'child', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'parent2', field: 'childId' }, to: { entity: 'child', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // Both parents should be in same layer (no conflict between them)
      expect(result.layerOf.get('parent1')).toBe(result.layerOf.get('parent2'));

      // Child should be at minimum valid layer (parent layer + 1)
      const parentLayer = result.layerOf.get('parent1')!;
      const childLayer = result.layerOf.get('child')!;
      expect(childLayer).toBe(parentLayer + 1);
    });

    it('should respect Rule 3: Direction rule (left stays left)', () => {
      const entities: Entity[] = [
        'X', 'Y'
      ].map(name => ({
        name,
        displayName: name,
        fields: [],
        color: '#fff',
        icon: ''
      }));

      // X > Y means X is written first, so X stays left
      const relationships: Relationship[] = [
        { from: { entity: 'X', field: 'yId' }, to: { entity: 'Y', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // X (left in relation) should have lower layer than Y (right)
      expect(result.layerOf.get('X')!).toBeLessThan(result.layerOf.get('Y')!);
    });
  });

  describe('Edge Cases', () => {
    it('should handle isolated entities', () => {
      const entities: Entity[] = [
        'connected1', 'connected2', 'isolated'
      ].map(name => ({
        name,
        displayName: name,
        fields: [],
        color: '#fff',
        icon: ''
      }));

      const relationships: Relationship[] = [
        { from: { entity: 'connected1', field: 'id' }, to: { entity: 'connected2', field: 'id' }, type: 'many-to-one', color: '#888' },
      ];

      const result = ConnectionBasedLayoutEngine.layout(entities, relationships);

      // Isolated entity should be placed
      expect(result.layerOf.has('isolated')).toBe(true);

      // Isolated should be in rightmost layer
      const isolatedLayer = result.layerOf.get('isolated')!;
      const connected1Layer = result.layerOf.get('connected1')!;
      const connected2Layer = result.layerOf.get('connected2')!;

      expect(isolatedLayer).toBeGreaterThanOrEqual(Math.max(connected1Layer, connected2Layer));
    });

    it('should handle circular dependencies without infinite loop', () => {
      const entities: Entity[] = [
        'A', 'B', 'C'
      ].map(name => ({
        name,
        displayName: name,
        fields: [],
        color: '#fff',
        icon: ''
      }));

      // Create a cycle: A → B → C → A
      const relationships: Relationship[] = [
        { from: { entity: 'A', field: 'bId' }, to: { entity: 'B', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'B', field: 'cId' }, to: { entity: 'C', field: 'id' }, type: 'many-to-one', color: '#888' },
        { from: { entity: 'C', field: 'aId' }, to: { entity: 'A', field: 'id' }, type: 'many-to-one', color: '#888' },
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
});
