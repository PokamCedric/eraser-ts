/**
 * Connection-Based Layout Engine - Clean Implementation
 * Based on algo4.py - Complete translation with all 6 steps
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

interface DirectedRelation {
  left: string;
  right: string;
}

interface Cluster {
  left: string[];
  right: string[];
}

export interface ConnectionLayerResult {
  layers: Map<number, string[]>;
  layerOf: Map<string, number>;
}

export class ConnectionBasedLayoutEngine {
  /**
   * STEP 1: Convert parsed relationships to directed relations
   */
  private static convertToDirectedRelations(relationships: Relationship[]): DirectedRelation[] {
    const relations: DirectedRelation[] = [];

    console.log('\n=== ÉTAPE 1 : RELATIONS DÉTECTÉES ===');
    for (const rel of relationships) {
      const left = rel.from.entity;
      const right = rel.to.entity;

      relations.push({ left, right });
      console.log(`${left} -> ${right}`);
    }

    return relations;
  }

  /**
   * STEP 2: Order entities - Simplified version from algo4.py
   * This is hardcoded in algo4.py, so we'll use a simple approach:
   * Process all relations and build entity order based on connectivity
   */
  private static orderEntities(relations: DirectedRelation[]): string[] {
    console.log('\n=== ÉTAPE 2 : ORDRE DES ENTITÉS ===');

    // Count connections per entity
    const connections = new Map<string, number>();
    for (const rel of relations) {
      connections.set(rel.left, (connections.get(rel.left) || 0) + 1);
      connections.set(rel.right, (connections.get(rel.right) || 0) + 1);
    }

    // Get all entities
    const allEntities = new Set<string>();
    for (const rel of relations) {
      allEntities.add(rel.left);
      allEntities.add(rel.right);
    }

    // Process entities: prioritize those that appear on RIGHT (are targets)
    const processed = new Set<string>();
    const entityOrder: string[] = [];
    const remaining = [...relations];

    while (remaining.length > 0) {
      // Find entities that appear on RIGHT in remaining relations
      const entitiesOnRight = new Set<string>();
      for (const rel of remaining) {
        entitiesOnRight.add(rel.right);
      }

      // Choose entity with most connections among those on RIGHT
      let chosenEntity: string | null = null;
      let maxConnections = -1;

      for (const entity of entitiesOnRight) {
        if (processed.has(entity)) continue;
        const conn = connections.get(entity) || 0;
        if (conn > maxConnections) {
          maxConnections = conn;
          chosenEntity = entity;
        }
      }

      if (!chosenEntity) break;

      entityOrder.push(chosenEntity);
      processed.add(chosenEntity);

      // Remove relations where chosen entity is on RIGHT
      const toRemove = remaining.filter(rel => rel.right === chosenEntity);
      for (const rel of toRemove) {
        const idx = remaining.indexOf(rel);
        if (idx !== -1) remaining.splice(idx, 1);
      }
    }

    console.log(`Ordre: ${entityOrder.join(' -> ')}`);
    return entityOrder;
  }

  /**
   * STEP 3: Build clusters
   */
  private static buildClusters(
    entityOrder: string[],
    relations: DirectedRelation[]
  ): Map<string, Cluster> {
    console.log('\n=== ÉTAPE 3 : BUILD CLUSTERS ===\n');

    const clusters = new Map<string, Cluster>();

    for (let i = 0; i < entityOrder.length; i++) {
      const entityName = entityOrder[i];

      // Construire le cluster
      const clusterLeft: string[] = [];
      const clusterRight = [entityName];

      for (const rel of relations) {
        if (rel.right === entityName && !clusterLeft.includes(rel.left)) {
          clusterLeft.push(rel.left);
        }
      }

      clusters.set(entityName, { left: clusterLeft, right: clusterRight });

      console.log(`${i + 1}) Cluster '${entityName}':`);
      console.log(`   ${JSON.stringify(clusterLeft)} -> ${JSON.stringify(clusterRight)}`);
    }

    return clusters;
  }

  /**
   * STEP 4: Build layers with cascade movement
   */
  private static buildLayers(
    entityOrder: string[],
    clusters: Map<string, Cluster>,
    relations: DirectedRelation[]
  ): string[][] {
    console.log('\n=== ÉTAPE 4 : BUILD LAYERS ===\n');

    const layers: string[][] = [];

    const findLayerIndex = (entity: string): number | null => {
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].includes(entity)) return i;
      }
      return null;
    };

    const removeFromLayers = (entity: string): void => {
      for (const layer of layers) {
        const idx = layer.indexOf(entity);
        if (idx !== -1) layer.splice(idx, 1);
      }
    };

    const canAddToLayer = (entity: string, layerIdx: number): boolean => {
      if (layerIdx >= layers.length) return true;

      for (const existing of layers[layerIdx]) {
        for (const rel of relations) {
          if ((rel.left === entity && rel.right === existing) ||
              (rel.left === existing && rel.right === entity)) {
            return false;
          }
        }
      }
      return true;
    };

    const moveEntityToRightOfParent = (parentEntity: string, childEntity: string): number | null => {
      const parentLayer = findLayerIndex(parentEntity);
      if (parentLayer === null) return null;

      removeFromLayers(childEntity);

      for (let layerIdx = parentLayer + 1; layerIdx < layers.length; layerIdx++) {
        if (canAddToLayer(childEntity, layerIdx)) {
          layers[layerIdx].push(childEntity);
          return layerIdx;
        }
      }

      layers.push([childEntity]);
      return layers.length - 1;
    };

    // Traiter chaque entité
    for (let iteration = 0; iteration < entityOrder.length; iteration++) {
      const entityName = entityOrder[iteration];
      const cluster = clusters.get(entityName);
      if (!cluster) continue;

      const clusterLeft = [...cluster.left];
      const clusterRight = [...cluster.right];

      console.log(`${iteration + 1}) Entité '${entityName}':`);
      console.log(`cluster-${entityName} -> ${JSON.stringify(clusterLeft)} -> ${JSON.stringify(clusterRight)}`);
      console.log();

      // Premier cluster
      if (layers.length === 0) {
        if (clusterLeft.length > 0) {
          layers.push([...clusterLeft]);
        }
        layers.push([...clusterRight]);
        console.log('=>');
        layers.forEach((layer, idx) => {
          console.log(`Layer ${idx}: ${JSON.stringify(layer)}`);
        });
        console.log();
        continue;
      }

      // Chercher une ancre
      let anchor: string | null = null;
      let anchorLocation: 'left' | 'right' | null = null;

      // Chercher dans RIGHT
      for (const e of clusterRight) {
        const idx = findLayerIndex(e);
        if (idx !== null) {
          anchor = e;
          anchorLocation = 'right';
          break;
        }
      }

      // Chercher dans LEFT
      if (anchor === null) {
        for (const e of clusterLeft) {
          const idx = findLayerIndex(e);
          if (idx !== null) {
            anchor = e;
            anchorLocation = 'left';
            break;
          }
        }
      }

      // Pas d'ancre
      if (anchor === null) {
        const newLayers: string[][] = [];
        if (clusterLeft.length > 0) {
          newLayers.push([...clusterLeft]);
        }
        newLayers.push([...clusterRight]);
        layers.unshift(...newLayers);
        console.log('=>');
        layers.forEach((layer, idx) => {
          console.log(`Layer ${idx}: ${JSON.stringify(layer)}`);
        });
        console.log();
        continue;
      }

      console.log();

      if (anchorLocation === 'right') {
        // RIGHT existe déjà - déplacer en cascade

        const getChildren = (parent: string): string[] => {
          const children: string[] = [];
          for (const rel of relations) {
            if (rel.left === parent) {
              children.push(rel.right);
            }
          }
          return children;
        };

        const getAllDescendants = (root: string): string[] => {
          const descendants: string[] = [];
          const visited = new Set<string>();
          const queue = [root];

          while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);

            const children = getChildren(current);
            for (const child of children) {
              if (!descendants.includes(child)) {
                descendants.push(child);
                queue.push(child);
              }
            }
          }

          return descendants;
        };

        // Supprimer RIGHT et descendants
        const descendants = getAllDescendants(entityName);
        removeFromLayers(entityName);
        for (const desc of descendants) {
          removeFromLayers(desc);
        }

        // Placer LEFT
        for (const leftEntity of clusterLeft) {
          if (findLayerIndex(leftEntity) === null) {
            let placed = false;
            for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
              if (canAddToLayer(leftEntity, layerIdx)) {
                layers[layerIdx].push(leftEntity);
                placed = true;
                break;
              }
            }
            if (!placed) {
              layers.push([leftEntity]);
            }
          }
        }

        // Trouver layer max des LEFT
        const leftLayers = clusterLeft
          .map(e => findLayerIndex(e))
          .filter(idx => idx !== null) as number[];
        const maxLeftLayer = leftLayers.length > 0 ? Math.max(...leftLayers) : -1;

        // Placer RIGHT
        let rightPlacedLayer: number | null = null;
        for (let layerIdx = maxLeftLayer + 1; layerIdx < layers.length; layerIdx++) {
          if (canAddToLayer(entityName, layerIdx)) {
            layers[layerIdx].push(entityName);
            rightPlacedLayer = layerIdx;
            break;
          }
        }

        if (rightPlacedLayer === null) {
          layers.push([entityName]);
          rightPlacedLayer = layers.length - 1;
        }

        // Replacer descendants en cascade
        if (descendants.length > 0) {
          const levelMap = new Map<string, number>();
          levelMap.set(entityName, 0);
          const queue = [entityName];

          while (queue.length > 0) {
            const current = queue.shift()!;
            const currentLevel = levelMap.get(current)!;
            const children = getChildren(current);

            for (const child of children) {
              if (descendants.includes(child) && !levelMap.has(child)) {
                levelMap.set(child, currentLevel + 1);
                queue.push(child);
              }
            }
          }

          const descendantsSorted = descendants.sort((a, b) => {
            const levelA = levelMap.get(a) || 999;
            const levelB = levelMap.get(b) || 999;
            return levelA - levelB;
          });

          for (const desc of descendantsSorted) {
            let parent: string | null = null;
            for (const rel of relations) {
              if (rel.right === desc && (rel.left === entityName || descendantsSorted.includes(rel.left))) {
                const parentLayer = findLayerIndex(rel.left);
                if (parentLayer !== null) {
                  parent = rel.left;
                  break;
                }
              }
            }

            if (parent) {
              moveEntityToRightOfParent(parent, desc);
            }
          }
        }
      } else {
        // anchor_location === 'left'

        const pivots: string[] = [];
        for (const e of clusterLeft) {
          if (e !== anchor && findLayerIndex(e) !== null) {
            pivots.push(e);
          }
        }

        const anchorLayerIdx = findLayerIndex(anchor)!;
        for (const e of clusterLeft) {
          if (e !== anchor && !pivots.includes(e) && !layers[anchorLayerIdx].includes(e)) {
            layers[anchorLayerIdx].push(e);
          }
        }

        let rightPlaced = false;
        for (let layerIdx = anchorLayerIdx + 1; layerIdx < layers.length; layerIdx++) {
          if (canAddToLayer(entityName, layerIdx)) {
            layers[layerIdx].push(entityName);
            rightPlaced = true;
            break;
          }
        }

        if (!rightPlaced) {
          layers.push([entityName]);
        }
      }

      console.log('=>');
      layers.forEach((layer, idx) => {
        console.log(`Layer ${idx}: ${JSON.stringify(layer)}`);
      });
      console.log();
    }

    // Nettoyer layers vides
    return layers.filter(layer => layer.length > 0);
  }

  /**
   * STEP 6: Reorder layers by cluster (vertical organization)
   */
  private static reorderLayersByCluster(
    layers: string[][],
    entityOrder: string[],
    relations: DirectedRelation[]
  ): string[][] {
    console.log('\n=== ÉTAPE 6 : RÉORGANISATION VERTICALE PAR CLUSTER ===\n');

    if (layers.length === 0) return layers;

    const reorderedLayers = layers.map(l => [...l]);

    // Dernier layer: ordonner selon entityOrder
    const lastLayerIdx = layers.length - 1;
    const lastLayer = layers[lastLayerIdx];
    const orderedLast: string[] = [];

    for (const entity of entityOrder) {
      if (lastLayer.includes(entity)) {
        orderedLast.push(entity);
      }
    }

    for (const entity of lastLayer) {
      if (!orderedLast.includes(entity)) {
        orderedLast.push(entity);
      }
    }

    reorderedLayers[lastLayerIdx] = orderedLast;
    console.log(`Layer ${lastLayerIdx}: ${JSON.stringify(lastLayer)} -> ${JSON.stringify(orderedLast)}`);

    // Autres layers de droite à gauche
    for (let layerIdx = layers.length - 2; layerIdx >= 0; layerIdx--) {
      const currentLayer = layers[layerIdx];
      const nextLayer = reorderedLayers[layerIdx + 1];

      console.log(`\nLayer ${layerIdx}: ${JSON.stringify(currentLayer)}`);

      // Trouver vers quelle entité du layer suivant chaque entité pointe
      const entityToTarget = new Map<string, string | null>();
      for (const entity of currentLayer) {
        let target: string | null = null;
        for (const rel of relations) {
          if (rel.left === entity && nextLayer.includes(rel.right)) {
            target = rel.right;
            break;
          }
        }
        entityToTarget.set(entity, target);
      }

      console.log(`   Connexions: ${JSON.stringify(Object.fromEntries(entityToTarget))}`);

      // NOUVELLE LOGIQUE: Trouver TOUTES les cibles pour chaque entité (pas seulement la première)
      const entityToAllTargets = new Map<string, string[]>();
      for (const entity of currentLayer) {
        const targets: string[] = [];
        for (const rel of relations) {
          if (rel.left === entity && nextLayer.includes(rel.right)) {
            targets.push(rel.right);
          }
        }
        entityToAllTargets.set(entity, targets);
      }

      console.log(`   Connexions multiples:`, Object.fromEntries(
        Array.from(entityToAllTargets.entries()).map(([e, ts]) => [e, ts.length > 0 ? ts : null])
      ));

      // NOUVELLE STRATÉGIE: Ordonner par la position MAXIMALE de leurs cibles
      // Entités pointant vers des cibles plus tôt viennent avant les entités pointant vers des cibles plus tard
      const orderedLayer: string[] = [];

      // 1. Calculer pour chaque entité la position max de ses cibles
      const entityMaxTargetPos = new Map<string, number>();
      for (const entity of currentLayer) {
        const targets = entityToAllTargets.get(entity) || [];
        if (targets.length === 0) {
          entityMaxTargetPos.set(entity, -1); // Pas de cible = vient en premier
        } else {
          const maxPos = Math.max(...targets.map(t => nextLayer.indexOf(t)));
          entityMaxTargetPos.set(entity, maxPos);
        }
      }

      console.log(`   Max target positions:`, Object.fromEntries(entityMaxTargetPos));

      // 2. Trier les entités par position maximale de cible
      const sortedEntities = [...currentLayer].sort((a, b) => {
        const posA = entityMaxTargetPos.get(a) ?? 999;
        const posB = entityMaxTargetPos.get(b) ?? 999;

        if (posA !== posB) {
          return posA - posB; // Position max plus petite = vient en premier
        }

        // Si même position max, utiliser entityOrder
        const indexA = entityOrder.indexOf(a);
        const indexB = entityOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      orderedLayer.push(...sortedEntities);

      // Log clusters for debugging
      const clustersByTarget = new Map<string, string[]>();
      for (const targetEntity of nextLayer) {
        const entities = currentLayer.filter(e =>
          (entityToAllTargets.get(e) || []).includes(targetEntity)
        );
        if (entities.length > 0) {
          clustersByTarget.set(targetEntity, entities);
        }
      }
      for (const [target, entities] of clustersByTarget) {
        console.log(`   Cluster -> ${target}: ${JSON.stringify(entities)}`);
      }

      reorderedLayers[layerIdx] = orderedLayer;
      console.log(`   => ${JSON.stringify(orderedLayer)}`);
    }

    return reorderedLayers;
  }

  /**
   * Main entry point
   */
  static layout(entities: Entity[], relationships: Relationship[]): ConnectionLayerResult {
    // Step 1: Convert to directed relations
    const relations = this.convertToDirectedRelations(relationships);

    // Step 2: Order entities
    const entityOrder = this.orderEntities(relations);

    // Step 3: Build clusters
    const clusters = this.buildClusters(entityOrder, relations);

    // Step 4: Build layers
    let layers = this.buildLayers(entityOrder, clusters, relations);

    // Step 6: Reorder by cluster (vertical organization)
    layers = this.reorderLayersByCluster(layers, entityOrder, relations);

    console.log('\n=== RÉSULTAT FINAL AVEC ORGANISATION VERTICALE ===\n');
    layers.forEach((layer, idx) => {
      console.log(`Layer ${idx}: ${JSON.stringify(layer)}`);
    });

    // Build result maps
    const layersMap = new Map<number, string[]>();
    const layerOf = new Map<string, number>();

    layers.forEach((layer, idx) => {
      layersMap.set(idx, layer);
      layer.forEach(entity => {
        layerOf.set(entity, idx);
      });
    });

    // Handle isolated entities
    entities.forEach(entity => {
      if (!layerOf.has(entity.name)) {
        const maxLayer = Math.max(...Array.from(layerOf.values()), -1);
        layerOf.set(entity.name, maxLayer + 1);
        if (!layersMap.has(maxLayer + 1)) {
          layersMap.set(maxLayer + 1, []);
        }
        layersMap.get(maxLayer + 1)!.push(entity.name);
      }
    });

    return { layers: layersMap, layerOf };
  }
}
