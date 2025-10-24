/**
 * Connection-Based Layout Engine V2 - Simplified Algorithm
 * Based on algo5.py - Implementation of the 3 fundamental rules:
 * 1. Minimum Distance: distance >= 1 (entities in relationship are never in same layer)
 * 2. Optimal Placement: place entity at minimum valid layer
 * 3. Direction rule: element on LEFT of symbol stays LEFT in diagram
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
   * ÉTAPE 0: Parse relationships from domain entities to directed relations
   * Reuse the parser from V1
   */
  private static parseRelations(relationships: Relationship[]): DirectedRelation[] {
    const relations: DirectedRelation[] = [];

    console.log('\n=== ÉTAPE 0 : PARSER LES RELATIONS ===');
    for (const rel of relationships) {
      const left = rel.from.entity;
      const right = rel.to.entity;

      relations.push({ left, right });
      console.log(`  ${left} > ${right}`);
    }

    console.log(`Relations parsées: ${relations.length}`);
    return relations;
  }

  /**
   * ÉTAPE 1: Constituer le backlog (LISTE 1)
   * - Déduplication
   * - Comptage des connexions
   */
  private static buildBacklog(relationsRaw: DirectedRelation[]): {
    relations: DirectedRelation[];
    connectionCount: Map<string, number>;
  } {
    console.log('\n' + '='.repeat(80));
    console.log('ÉTAPE 1 : CONSTITUER LE BACKLOG');
    console.log('='.repeat(80));

    // Déduplication
    const seenRelations = new Set<string>();
    const uniqueRelations: DirectedRelation[] = [];

    for (const { left, right } of relationsRaw) {
      const relationKey = `${left}>${right}`;
      if (!seenRelations.has(relationKey)) {
        seenRelations.add(relationKey);
        uniqueRelations.push({ left, right });
      }
    }

    console.log(`Relations après déduplication: ${uniqueRelations.length}`);

    // Comptage des connexions
    const connectionCount = new Map<string, number>();
    for (const { left, right } of uniqueRelations) {
      connectionCount.set(left, (connectionCount.get(left) || 0) + 1);
      connectionCount.set(right, (connectionCount.get(right) || 0) + 1);
    }

    return { relations: uniqueRelations, connectionCount };
  }

  /**
   * ÉTAPE 2: Déterminer l'ordre de traitement
   * Utilise 3 critères:
   * 1. Liste-Règle 1: triée par nombre de connexions décroissant
   * 2. Connexion avec entités déjà choisies
   * 3. Tie-breaker: position dans Liste-Règle 1
   */
  private static determineOrder(
    relations: DirectedRelation[],
    connectionCount: Map<string, number>
  ): string[] {
    console.log('\n' + '='.repeat(80));
    console.log('ÉTAPE 2 : ORDRE DE TRAITEMENT');
    console.log('='.repeat(80));

    // Liste-Règle 1 (référence)
    const listeRegle1 = Array.from(connectionCount.keys()).sort(
      (a, b) => connectionCount.get(b)! - connectionCount.get(a)!
    );

    // Liste à remplir
    const entityOrder: string[] = [];
    const listeEnonces: string[] = [];

    // ITERATION 1: Prendre le premier élément
    entityOrder.push(listeRegle1[0]);

    // Ajouter les entités connectées
    for (const { left, right } of relations) {
      if (left === entityOrder[0] && !listeEnonces.includes(right)) {
        listeEnonces.push(right);
      }
      if (right === entityOrder[0] && !listeEnonces.includes(left)) {
        listeEnonces.push(left);
      }
    }

    // ITERATIONS suivantes
    while (entityOrder.length < listeRegle1.length) {
      const candidates = listeEnonces.filter(e => !entityOrder.includes(e));
      if (candidates.length === 0) break;

      // Choisir le candidat avec:
      // 1. Plus grand nombre de connexions
      // 2. Position la plus petite dans listeRegle1 (tie-breaker)
      const nextEntity = candidates.reduce((best, current) => {
        const currentConnections = connectionCount.get(current) || 0;
        const bestConnections = connectionCount.get(best) || 0;

        if (currentConnections > bestConnections) return current;
        if (currentConnections < bestConnections) return best;

        // Tie-breaker: position dans listeRegle1
        return listeRegle1.indexOf(current) < listeRegle1.indexOf(best) ? current : best;
      });

      entityOrder.push(nextEntity);

      // Mettre à jour liste_enonces
      for (const { left, right } of relations) {
        if (left === nextEntity && !listeEnonces.includes(right) && !entityOrder.includes(right)) {
          listeEnonces.push(right);
        }
        if (right === nextEntity && !listeEnonces.includes(left) && !entityOrder.includes(left)) {
          listeEnonces.push(left);
        }
      }
    }

    console.log(`Ordre: ${entityOrder.join(' > ')}`);
    return entityOrder;
  }

  /**
   * ÉTAPE 3: Construction des clusters
   */
  private static buildClusters(
    entityOrder: string[],
    relations: DirectedRelation[]
  ): Map<string, Cluster> {
    const clusters = new Map<string, Cluster>();

    for (const entityName of entityOrder) {
      const clusterLeft: string[] = [];
      for (const { left, right } of relations) {
        if (right === entityName && !clusterLeft.includes(left)) {
          clusterLeft.push(left);
        }
      }

      clusters.set(entityName, {
        left: clusterLeft,
        right: [entityName],
      });
    }

    return clusters;
  }

  /**
   * Helper: Find layer index containing entity
   */
  private static findLayerIndex(layers: string[][], entity: string): number | null {
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].includes(entity)) return i;
    }
    return null;
  }

  /**
   * Helper: Check if entity can be added to layer (no conflicts)
   */
  private static canAddToLayer(
    layers: string[][],
    entity: string,
    layerIdx: number,
    relations: DirectedRelation[]
  ): boolean {
    if (layerIdx >= layers.length) return true;

    for (const existing of layers[layerIdx]) {
      for (const { left, right } of relations) {
        if ((left === entity && right === existing) || (left === existing && right === entity)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Helper: Find all children (descendants) of an entity recursively
   */
  private static findAllChildren(entity: string, relations: DirectedRelation[]): string[] {
    const children: string[] = [];
    const visited = new Set<string>();

    const recurse = (current: string) => {
      if (visited.has(current)) return;
      visited.add(current);

      for (const { left, right } of relations) {
        if (left === current && !children.includes(right)) {
          children.push(right);
          recurse(right);
        }
      }
    };

    recurse(entity);
    return children;
  }

  /**
   * Helper: Find all parents of an entity
   */
  private static findAllParents(entity: string, relations: DirectedRelation[]): string[] {
    const parents: string[] = [];
    for (const { left, right } of relations) {
      if (right === entity && !parents.includes(left)) {
        parents.push(left);
      }
    }
    return parents;
  }

  /**
   * ÉTAPE 4: Build Layers (VERSION SIMPLIFIÉE)
   */
  private static buildLayers(
    entityOrder: string[],
    clusters: Map<string, Cluster>,
    relations: DirectedRelation[]
  ): string[][] {
    console.log('\n' + '='.repeat(80));
    console.log('ÉTAPE 4 : BUILD LAYERS (SIMPLE)');
    console.log('='.repeat(80));

    const layers: string[][] = [];

    // Traiter chaque entité selon l'ordre
    for (let iteration = 0; iteration < entityOrder.length; iteration++) {
      const entityName = entityOrder[iteration];
      const cluster = clusters.get(entityName);
      if (!cluster) continue;

      console.log(`\n${iteration + 1}) '${entityName}'`);
      console.log(`   Cluster: ${JSON.stringify(cluster.left)} > ${JSON.stringify(cluster.right)}`);

      const clusterLeft = [...cluster.left];

      // Trouver le layer maximum parmi les parents PLACÉS
      let maxParentLayer = -1;
      const unplacedParents: string[] = [];

      for (const parent of clusterLeft) {
        const parentLayer = this.findLayerIndex(layers, parent);
        if (parentLayer !== null) {
          maxParentLayer = Math.max(maxParentLayer, parentLayer);
          console.log(`   Parent '${parent}' en Layer ${parentLayer}`);
        } else {
          unplacedParents.push(parent);
        }
      }

      // Vérifier si l'entité est déjà placée
      const entityAlreadyPlaced = this.findLayerIndex(layers, entityName) !== null;

      // Si l'entité est déjà placée MAIS on a des parents non placés, les placer quand même
      if (entityAlreadyPlaced && unplacedParents.length > 0) {
        // Placer les parents non placés selon la logique normale
        for (const parent of unplacedParents) {
          if (this.findLayerIndex(layers, parent) === null) {
            // Calculer où ce parent devrait aller
            let currentMaxParent = -1;
            for (const placedParent of clusterLeft) {
              const parentLayer = this.findLayerIndex(layers, placedParent);
              if (parentLayer !== null) {
                currentMaxParent = Math.max(currentMaxParent, parentLayer);
              }
            }

            const entityTarget = currentMaxParent + 1;
            const parentPreferred = entityTarget > 0 ? entityTarget - 1 : 0;

            // Chercher de parentPreferred vers la gauche (0)
            let parentPlaced = false;
            for (let layerIdx = parentPreferred; layerIdx >= 0; layerIdx--) {
              if (this.canAddToLayer(layers, parent, layerIdx, relations)) {
                if (layerIdx >= layers.length) {
                  layers.push([parent]);
                } else {
                  layers[layerIdx].push(parent);
                }
                console.log(`      '${parent}' placé au Layer ${layerIdx}`);
                maxParentLayer = Math.max(maxParentLayer, layerIdx);
                parentPlaced = true;
                break;
              }
            }

            // Si pas placé, insérer un nouveau layer à gauche
            if (!parentPlaced) {
              layers.unshift([parent]);
              console.log(`      '${parent}' placé au nouveau Layer 0 (insertion à gauche)`);
              maxParentLayer = maxParentLayer >= 0 ? maxParentLayer + 1 : 0;
            }
          }
        }

        // Vérifier si l'entité doit être déplacée
        const entityCurrentLayer = this.findLayerIndex(layers, entityName);
        if (entityCurrentLayer === null) continue;

        // Recalculer max_parent_layer après placement des parents non placés
        let finalMaxParent = -1;
        for (const parent of clusterLeft) {
          const parentLayer = this.findLayerIndex(layers, parent);
          if (parentLayer !== null) {
            finalMaxParent = Math.max(finalMaxParent, parentLayer);
          }
        }

        const requiredLayer = finalMaxParent + 1;

        if (entityCurrentLayer < requiredLayer) {
          console.log(
            `   -> '${entityName}' doit être déplacé de Layer ${entityCurrentLayer} vers Layer ${requiredLayer} (avec cascade)`
          );

          // Déplacer l'entité, ses descendants (enfants)
          // ET les parents (cluster) de chaque descendant
          // SAUF les parents de l'entité principale (qui doivent rester à gauche)
          const allDescendants = this.findAllChildren(entityName, relations);
          const entityParents = new Set(clusterLeft); // Parents de l'entité principale à exclure

          const entitiesToMoveSet = new Set<string>();
          entitiesToMoveSet.add(entityName); // Commencer avec l'entité principale

          // Pour chaque descendant, ajouter le descendant ET ses parents (sauf parents de l'entité principale)
          for (const descendant of allDescendants) {
            if (this.findLayerIndex(layers, descendant) !== null) {
              entitiesToMoveSet.add(descendant);
              // Ajouter les parents de ce descendant qui ne sont PAS parents de l'entité principale
              for (const parent of this.findAllParents(descendant, relations)) {
                if (this.findLayerIndex(layers, parent) !== null && !entityParents.has(parent)) {
                  entitiesToMoveSet.add(parent);
                }
              }
            }
          }

          const entitiesToMove = Array.from(entitiesToMoveSet);

          // Calculer le décalage nécessaire
          const shift = requiredLayer - entityCurrentLayer;
          console.log(`      Entites a deplacer en cascade (avec clusters): ${JSON.stringify(entitiesToMove)}`);
          console.log(`      Decalage: +${shift} layers`);

          // Déplacer toutes les entités concernées
          for (const entityToMove of entitiesToMove) {
            const currentPos = this.findLayerIndex(layers, entityToMove);
            if (currentPos !== null) {
              const newPos = currentPos + shift;

              // Retirer de l'ancien layer
              const idx = layers[currentPos].indexOf(entityToMove);
              if (idx !== -1) {
                layers[currentPos].splice(idx, 1);
              }

              // Ajouter au nouveau layer
              while (layers.length <= newPos) {
                layers.push([]);
              }
              layers[newPos].push(entityToMove);
              console.log(`      '${entityToMove}' deplace: Layer ${currentPos} -> Layer ${newPos}`);
            }
          }
        }

        // Continue pour afficher les layers
      } else if (entityAlreadyPlaced) {
        // Entity déjà placé et pas de parents à placer
        console.log(`   -> Déjà placé, skip`);
        continue;
      } else {
        // Entity pas encore placé
        // Si on a des parents non placés, on doit les placer d'abord (cluster complet)
        if (unplacedParents.length > 0) {
          console.log(`   -> Placement des parents non placés: ${JSON.stringify(unplacedParents)}`);

          // Placer tous les parents non placés
          for (const parent of unplacedParents) {
            if (this.findLayerIndex(layers, parent) === null) {
              const entityTarget = maxParentLayer + 1;
              const parentPreferred = entityTarget > 0 ? entityTarget - 1 : 0;

              // Chercher de parentPreferred vers la gauche
              let parentPlaced = false;
              for (let layerIdx = parentPreferred; layerIdx >= 0; layerIdx--) {
                if (this.canAddToLayer(layers, parent, layerIdx, relations)) {
                  if (layerIdx >= layers.length) {
                    layers.push([parent]);
                  } else {
                    layers[layerIdx].push(parent);
                  }
                  console.log(`      '${parent}' placé au Layer ${layerIdx}`);
                  maxParentLayer = Math.max(maxParentLayer, layerIdx);
                  parentPlaced = true;
                  break;
                }
              }

              // Si pas placé (tous les layers ont conflit), insérer un nouveau layer à gauche
              if (!parentPlaced) {
                layers.unshift([parent]);
                console.log(`      '${parent}' placé au nouveau Layer 0 (insertion à gauche)`);
                maxParentLayer = maxParentLayer >= 0 ? maxParentLayer + 1 : 0;
                maxParentLayer = Math.max(maxParentLayer, 0);
              }
            }
          }
        }

        // Placer l'entité au minimum layer valide à droite du max parent
        const targetLayer = maxParentLayer + 1;

        // Chercher le premier layer compatible à partir de targetLayer
        let placed = false;
        for (let layerIdx = targetLayer; layerIdx <= layers.length; layerIdx++) {
          if (this.canAddToLayer(layers, entityName, layerIdx, relations)) {
            if (layerIdx >= layers.length) {
              layers.push([entityName]);
            } else {
              layers[layerIdx].push(entityName);
            }
            placed = true;
            console.log(`   -> '${entityName}' placé au Layer ${layerIdx}`);
            break;
          }
        }

        if (!placed) {
          // Ne devrait jamais arriver
          layers.push([entityName]);
          console.log(`   -> Nouveau Layer ${layers.length - 1}`);
        }
      }

      // Afficher les layers après placement
      console.log(`\n   Layers après placement:`);
      layers.forEach((layer, idx) => {
        console.log(`     Layer ${idx}: ${JSON.stringify(layer)}`);
      });
    }

    // Nettoyer les layers vides
    return layers.filter(layer => layer.length > 0);
  }

  /**
   * ÉTAPE 6: Réorganisation verticale par cluster
   */
  private static reorderLayersByCluster(
    layers: string[][],
    entityOrder: string[],
    relations: DirectedRelation[]
  ): string[][] {
    console.log('\n' + '='.repeat(80));
    console.log('ÉTAPE 6 : RÉORGANISATION VERTICALE');
    console.log('='.repeat(80));

    if (layers.length === 0) return layers;

    // Dernier layer: ordre selon entity_order
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

    layers[lastLayerIdx] = orderedLast;

    // Autres layers de droite à gauche
    for (let layerIdx = layers.length - 2; layerIdx >= 0; layerIdx--) {
      const currentLayer = layers[layerIdx];
      const nextLayer = layers[layerIdx + 1];

      // Trouver TOUTES les cibles pour chaque entité
      const entityToAllTargets = new Map<string, string[]>();
      for (const entity of currentLayer) {
        const targets: string[] = [];
        for (const { left, right } of relations) {
          if (left === entity && nextLayer.includes(right)) {
            targets.push(right);
          }
        }
        entityToAllTargets.set(entity, targets);
      }

      // Calculer pour chaque entité la position MAXIMALE de ses cibles
      // Ceci permet de grouper les entités qui pointent vers les mêmes cibles
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

      // Trier les entités par position maximale de cible, puis par entity_order
      const orderedLayer = currentLayer.slice().sort((a, b) => {
        const maxPosA = entityMaxTargetPos.get(a) ?? -1;
        const maxPosB = entityMaxTargetPos.get(b) ?? -1;

        if (maxPosA !== maxPosB) {
          return maxPosA - maxPosB;
        }

        // En cas d'égalité, trier par entity_order
        const indexA = entityOrder.indexOf(a);
        const indexB = entityOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      layers[layerIdx] = orderedLayer;
    }

    return layers;
  }

  /**
   * Main entry point
   */
  static layout(entities: Entity[], relationships: Relationship[]): ConnectionLayerResult {
    // ÉTAPE 0: Parser les relations
    const relationsRaw = this.parseRelations(relationships);

    // ÉTAPE 1: Constituer le backlog
    const { relations, connectionCount } = this.buildBacklog(relationsRaw);

    // ÉTAPE 2: Déterminer l'ordre de traitement
    const entityOrder = this.determineOrder(relations, connectionCount);

    // ÉTAPE 3: Construction des clusters
    const clusters = this.buildClusters(entityOrder, relations);

    // ÉTAPE 4: Build layers
    let layers = this.buildLayers(entityOrder, clusters, relations);

    // ÉTAPE 6: Réorganisation verticale
    layers = this.reorderLayersByCluster(layers, entityOrder, relations);

    console.log('\n' + '='.repeat(80));
    console.log('RÉSULTAT FINAL');
    console.log('='.repeat(80));
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
