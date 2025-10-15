/**
 * Anchor-Based Ordering Algorithm
 *
 * Inspired by ERASER's approach:
 * 1. Find the central layer (middle layer)
 * 2. Find the most connected entity in that layer → ANCHOR
 * 3. Place ANCHOR in the center of its layer
 * 4. For adjacent layers, center entities connected to ANCHOR
 * 5. Propagate recursively to other layers
 *
 * This creates a natural "star" pattern with the most important
 * entity at the center and related entities aligned around it.
 */

import { Relationship } from '../../domain/entities/Relationship';

interface EntityWithConnections {
  name: string;
  connectionCount: number;
  connectedTo: Set<string>;
}

export class AnchorBasedOrdering {
  /**
   * Reorder entities with anchor-based approach
   */
  static optimize(
    layers: Map<number, string[]>,
    relationships: Relationship[]
  ): Map<number, string[]> {
    console.log('=== ANCHOR-BASED ORDERING ===');

    const orderedLayers = new Map<number, string[]>();
    const sortedLayerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

    // Initialize with current order
    sortedLayerIndices.forEach(idx => {
      orderedLayers.set(idx, [...layers.get(idx)!]);
    });

    // Step 1: Find central layer
    const centralLayerIdx = sortedLayerIndices[Math.floor(sortedLayerIndices.length / 2)];
    console.log(`Central layer: ${centralLayerIdx} (out of ${sortedLayerIndices.length} layers)`);

    // Step 2: Build connection map
    const entityConnections = this._buildConnectionMap(orderedLayers, relationships);

    // Step 3: Find anchor (most connected entity in central layer)
    const centralLayer = orderedLayers.get(centralLayerIdx)!;
    const anchor = this._findAnchor(centralLayer, entityConnections);

    if (!anchor) {
      console.log('No anchor found, keeping current order');
      return orderedLayers;
    }

    console.log(`Anchor: ${anchor.name} (${anchor.connectionCount} connections)`);

    // Step 4: Place anchor at center (keep other entities in their current order)
    this._centerEntityInLayer(anchor.name, orderedLayers, centralLayerIdx);

    // Step 5: Propagate to adjacent layers
    this._propagateOrdering(anchor.name, centralLayerIdx, orderedLayers, sortedLayerIndices, entityConnections);

    // Step 6: Log final order
    this._logFinalOrder(orderedLayers, entityConnections);

    console.log('=== ANCHOR-BASED ORDERING COMPLETE ===\n');
    return orderedLayers;
  }

  /**
   * Build map of entity connections
   */
  private static _buildConnectionMap(
    layers: Map<number, string[]>,
    relationships: Relationship[]
  ): Map<string, EntityWithConnections> {
    const connectionMap = new Map<string, EntityWithConnections>();

    // Initialize all entities
    layers.forEach(layerEntities => {
      layerEntities.forEach(entityName => {
        connectionMap.set(entityName, {
          name: entityName,
          connectionCount: 0,
          connectedTo: new Set()
        });
      });
    });

    // Count connections
    relationships.forEach(rel => {
      const fromEntity = connectionMap.get(rel.from.entity);
      const toEntity = connectionMap.get(rel.to.entity);

      if (fromEntity && toEntity) {
        fromEntity.connectionCount++;
        fromEntity.connectedTo.add(rel.to.entity);

        toEntity.connectionCount++;
        toEntity.connectedTo.add(rel.from.entity);
      }
    });

    return connectionMap;
  }

  /**
   * Find the most connected entity (anchor) in a layer
   */
  private static _findAnchor(
    layerEntities: string[],
    connectionMap: Map<string, EntityWithConnections>
  ): EntityWithConnections | null {
    let maxConnections = 0;
    let anchor: EntityWithConnections | null = null;

    layerEntities.forEach(entityName => {
      const entity = connectionMap.get(entityName);
      if (entity && entity.connectionCount > maxConnections) {
        maxConnections = entity.connectionCount;
        anchor = entity;
      }
    });

    return anchor;
  }

  /**
   * Place an entity at the center of its layer (keep others in current order)
   */
  private static _centerEntityInLayer(
    entityName: string,
    layers: Map<number, string[]>,
    layerIdx: number
  ): void {
    const layer = layers.get(layerIdx)!;
    const centerPos = Math.floor(layer.length / 2);

    // Remove entity from current position
    const currentIdx = layer.indexOf(entityName);
    if (currentIdx === -1) return;

    layer.splice(currentIdx, 1);

    // Insert at center
    layer.splice(centerPos, 0, entityName);

    console.log(`  Placed ${entityName} at center position ${centerPos + 1}/${layer.length + 1}`);
  }

  /**
   * Propagate ordering to adjacent layers based on connections to anchor
   */
  private static _propagateOrdering(
    anchorName: string,
    anchorLayerIdx: number,
    layers: Map<number, string[]>,
    sortedLayerIndices: number[],
    connectionMap: Map<string, EntityWithConnections>
  ): void {
    const anchor = connectionMap.get(anchorName);
    if (!anchor) return;

    console.log(`  Propagating from anchor ${anchorName}...`);

    // Process each adjacent layer
    sortedLayerIndices.forEach(layerIdx => {
      if (layerIdx === anchorLayerIdx) return;

      const layer = layers.get(layerIdx)!;

      // Find entities connected to anchor
      const connectedEntities: string[] = [];
      const unconnectedEntities: string[] = [];

      layer.forEach(entityName => {
        if (anchor.connectedTo.has(entityName)) {
          connectedEntities.push(entityName);
        } else {
          unconnectedEntities.push(entityName);
        }
      });

      if (connectedEntities.length > 0) {
        console.log(`    Layer ${layerIdx}: ${connectedEntities.length} entities connected to anchor`);

        // Reorder: put connected entities in the middle
        const reordered = this._placeEntitiesInCenter(
          connectedEntities,
          unconnectedEntities
        );

        layers.set(layerIdx, reordered);
      }
    });
  }

  /**
   * Place connected entities in the center, unconnected at edges
   */
  private static _placeEntitiesInCenter(
    connectedEntities: string[],
    unconnectedEntities: string[]
  ): string[] {
    const totalEntities = connectedEntities.length + unconnectedEntities.length;
    const connectedCount = connectedEntities.length;

    // Calculate how to split unconnected entities
    const beforeCount = Math.floor((totalEntities - connectedCount) / 2);
    const afterCount = totalEntities - connectedCount - beforeCount;

    const before = unconnectedEntities.slice(0, beforeCount);
    const after = unconnectedEntities.slice(beforeCount);

    return [...before, ...connectedEntities, ...after];
  }

  /**
   * Log the final ordering with connection counts
   */
  private static _logFinalOrder(
    layers: Map<number, string[]>,
    connectionMap: Map<string, EntityWithConnections>
  ): void {
    console.log('\n📊 FINAL ANCHOR-BASED ORDER:');

    const sortedLayerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

    sortedLayerIndices.forEach(layerIdx => {
      const entities = layers.get(layerIdx)!;
      console.log(`\nLayer ${layerIdx}:`);

      entities.forEach((entityName, index) => {
        const entity = connectionMap.get(entityName);
        const connections = entity?.connectionCount || 0;
        const position = `${index + 1}/${entities.length}`;
        const bar = '█'.repeat(Math.min(connections, 10));

        console.log(`  ${position} ${entityName.padEnd(20)} [${connections}] ${bar}`);
      });
    });
  }
}
