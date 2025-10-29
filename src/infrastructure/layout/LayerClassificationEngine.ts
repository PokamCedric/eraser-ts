/**
 * Layer Classification Engine - Algorithme Progressif Optimisé
 * Based on algo10.py - Progressive Step-by-Step Distance Calculation
 *
 * Phases:
 * - Phase 1 (Pré-processing): Étapes 0-2 (ce fichier)
 * - Phase 2 (Progressive calculation): Étape 3 (LayerClassifier - fichier externe)
 * - Phase 3 (Réorganisation): Étape 4 (ce fichier)
 *
 * Documentation: docs/layer-classification-algorithm-technical-deep-dive.md
 */

import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';
import { LayerClassifier } from './LayerClassifier';

interface DirectedRelation {
  left: string;
  right: string;
}

export interface LayerClassificationResult {
  layers: Map<number, string[]>;
  layerOf: Map<string, number>;
}

export class LayerClassificationEngine {
  /**
   * ÉTAPE 0: Parse relationships from domain entities to directed relations
   * (Gérée en externe, mais incluse ici pour compatibilité)
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
   * - Déduplication basée sur la paire d'entités
   * - Comptage des connexions
   */
  private static buildBacklog(relationsRaw: DirectedRelation[]): {
    relations: DirectedRelation[];
    connectionCount: Map<string, number>;
  } {
    logTitle('ÉTAPE 1 : CONSTITUER LE BACKLOG (DÉDUPLICATION)');

    // Déduplication basée sur la PAIRE d'entités (peu importe l'ordre)
    const seenPairs = new Map<string, DirectedRelation>();
    const uniqueRelations: DirectedRelation[] = [];
    const duplicatesRemoved: string[] = [];

    for (const { left, right } of relationsRaw) {
      // Clé non-directionnelle: paire d'entités (ordre alphabétique pour normaliser)
      const pairKey = [left, right].sort().join('|');

      if (!seenPairs.has(pairKey)) {
        // Première fois qu'on voit cette paire d'entités
        seenPairs.set(pairKey, { left, right });
        uniqueRelations.push({ left, right });
      } else {
        // Doublon détecté!
        const first = seenPairs.get(pairKey)!;
        duplicatesRemoved.push(`  [DOUBLON] ${left} > ${right} (premier: ${first.left} > ${first.right})`);
      }
    }

    console.log(`Relations après déduplication: ${uniqueRelations.length}`);

    if (duplicatesRemoved.length > 0) {
      console.log(`\n${duplicatesRemoved.length} doublon(s) supprimé(s):`);
      duplicatesRemoved.forEach(dup => console.log(dup));
    } else {
      console.log('Aucun doublon détecté');
    }

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
    logTitle('ÉTAPE 2 : ORDRE DE TRAITEMENT');

    // Liste-Règle 1 (référence)
    const listeRegle1 = Array.from(connectionCount.keys()).sort(
      (a, b) => connectionCount.get(b)! - connectionCount.get(a)!
    );

    // Liste à remplir
    const entityOrder: string[] = [];
    const listeEnonces: string[] = [];

    // ITERATION 1: Prendre le premier élément (le plus connecté)
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

      // Choisir le candidat avec le plus grand nombre de connexions
      // Tie-breaker: position dans listeRegle1
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

    console.log(`Ordre (top 10): ${entityOrder.slice(0, 10).join(' > ')}`);
    if (entityOrder.length > 10) {
      console.log(`... (${entityOrder.length - 10} more)`);
    }

    return entityOrder;
  }

  /**
   * ÉTAPE 3: Calcul des layers avec algorithme progressif (algo10)
   * (Gérée par LayerClassifier)
   */
  private static buildLayersWithProgressiveAlgorithm(
    relations: DirectedRelation[],
    entityOrder: string[]
  ): string[][] {
    logTitle('ÉTAPE 3 : BUILD LAYERS (ALGORITHME PROGRESSIF - ALGO10)');

    console.log(`\n[INFO] Utilisation de l'implémentation: LayerClassifier (algo10)`);

    const classifier = new LayerClassifier();

    // Ajouter toutes les relations
    console.log(`\nAjout de ${relations.length} relations au classifier...`);
    for (const { left, right } of relations) {
      classifier.addRelation(left, right);
    }

    // Calculer les layers avec l'ordre de traitement
    const layers = classifier.computeLayers(entityOrder);

    console.log(`\n=== RESULTAT BUILD LAYERS ===`);
    layers.forEach((layer, idx) => {
      console.log(`Layer ${idx}: [${layer.join(', ')}]`);
    });

    return layers;
  }

  /**
   * ÉTAPE 5: Réorganisation verticale par cluster
   * (Peut être gérée en externe, mais incluse ici pour compatibilité)
   */
  private static reorderLayersByCluster(
    layers: string[][],
    entityOrder: string[],
    relations: DirectedRelation[]
  ): string[][] {
    logTitle('ÉTAPE 4 : RÉORGANISATION VERTICALE');

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

      // Trouver les cibles pour chaque entité
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

      // Grouper les entités par leur cible principale
      const entityPrimaryTarget = new Map<string, string | null>();
      for (const entity of currentLayer) {
        const targets = entityToAllTargets.get(entity) || [];
        if (targets.length > 0) {
          // Prendre la première cible (ou celle avec position min)
          const primary = targets.reduce((best, current) => {
            return nextLayer.indexOf(current) < nextLayer.indexOf(best) ? current : best;
          });
          entityPrimaryTarget.set(entity, primary);
        } else {
          entityPrimaryTarget.set(entity, null);
        }
      }

      // Grouper par cible principale
      const targetGroups = new Map<string | null, string[]>();
      for (const entity of currentLayer) {
        const primary = entityPrimaryTarget.get(entity)!;
        if (!targetGroups.has(primary)) {
          targetGroups.set(primary, []);
        }
        targetGroups.get(primary)!.push(entity);
      }

      // Trier chaque groupe par entity_order
      for (const [target, group] of targetGroups.entries()) {
        targetGroups.set(
          target,
          group.sort((a, b) => {
            const indexA = entityOrder.indexOf(a);
            const indexB = entityOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          })
        );
      }

      // Ordonner les groupes par position de leur cible dans nextLayer
      const orderedTargets = Array.from(targetGroups.keys()).sort((a, b) => {
        if (a === null) return -1;
        if (b === null) return 1;
        return nextLayer.indexOf(a) - nextLayer.indexOf(b);
      });

      // Construire la liste finale
      const orderedLayer: string[] = [];
      for (const target of orderedTargets) {
        orderedLayer.push(...targetGroups.get(target)!);
      }

      layers[layerIdx] = orderedLayer;
    }

    return layers;
  }

  /**
   * Main entry point
   */
  static layout(entities: Entity[], relationships: Relationship[]): LayerClassificationResult {
    logTitle('LAYER CLASSIFICATION ENGINE (ALGORITHME PROGRESSIF - ALGO10)');

    // ÉTAPE 0: Parser les relations
    const relationsRaw = this.parseRelations(relationships);

    // ÉTAPE 1: Constituer le backlog (déduplication)
    const { relations, connectionCount } = this.buildBacklog(relationsRaw);

    // ÉTAPE 2: Déterminer l'ordre de traitement
    const entityOrder = this.determineOrder(relations, connectionCount);

    // ÉTAPE 3: Build layers avec algorithme progressif
    let layers = this.buildLayersWithProgressiveAlgorithm(relations, entityOrder);

    // ÉTAPE 4: Réorganisation verticale
    layers = this.reorderLayersByCluster(layers, entityOrder, relations);

    logTitle('LAYERS FINAUX');
    layers.forEach((layer, idx) => {
      console.log(`Layer ${idx}: [${layer.join(', ')}]`);
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

    // Handle isolated entities (no relationships)
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
function logTitle(  title: string   ) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

