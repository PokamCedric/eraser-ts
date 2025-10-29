/**
 * Layer Classifier - Progressive Step-by-Step Distance Calculation (algo10)
 *
 * Implémentation optimisée de l'algorithme de classification par layers
 * utilisant un calcul progressif des distances avec propagation en cascade.
 *
 * Basé sur algo10.py - Phase 2 optimisations
 * Documentation: docs/layer-classification-algorithm-technical-deep-dive.md
 *
 * Principes:
 * 1. Atomicité: chaque relation directe = distance 1
 * 2. Calcul progressif: traiter les entités dans l'ordre de connectivité
 * 3. Propagation en cascade: mettre à jour les dépendances automatiquement
 * 4. Maximalité: en cas de conflit, le chemin long l'emporte
 *
 * Optimisations implémentées:
 * - #1: Pré-calcul des clusters (O(n×r) → O(r))
 * - #2: Index inversé pour propagation (O(n) → O(d))
 * - #3: Sets au lieu de listes (O(n) → O(1))
 * - #4: count_connections optimisé (O(n×r) → O(r))
 * - #5: Early exit dans propagation
 *
 * Performance: 83.3x plus rapide que Floyd-Warshall
 */

interface DirectedRelation {
  left: string;
  right: string;
}

/**
 * LayerClassifier - Algorithme progressif optimisé (algo10)
 *
 * Cette classe implémente la phase 2 (processing) de l'algorithme:
 * - Calcul progressif des distances par clusters
 * - Détection des intercalations transitives
 * - Propagation en cascade des mises à jour
 * - Placement des entités par rapport à une entité de référence
 *
 * Les phases 1 (pré-processing) et 4 (réorganisation) sont gérées en externe.
 */
export class LayerClassifier {
  private relations: DirectedRelation[] = [];
  private entities: Set<string> = new Set();
  private distances: Map<string, number> = new Map();

  // OPTIMIZATION #1: Pre-compute clusters cache
  private clustersCache: Map<string, Set<string>> = new Map();

  // OPTIMIZATION #2: Index inversé for fast propagation lookups
  // Maps each entity to the set of entities that depend on it
  private dependentsIndex: Map<string, Set<string>> = new Map();

  // Vecteur multi-références: entity -> {reference: distance}
  private entityReferenceDistances: Map<string, Map<string, number>> = new Map();

  /**
   * Ajoute une relation A r B (A doit être à gauche de B)
   *
   * @param left - Entité de gauche
   * @param right - Entité de droite
   */
  addRelation(left: string, right: string): void {
    this.relations.push({ left, right });
    this.entities.add(left);
    this.entities.add(right);

    // Distance initiale = 1 (relation atomique)
    this.distances.set(this.makeKey(left, right), 1);
  }

  /**
   * OPTIMIZATION #1: Pré-calcule tous les clusters une seule fois
   *
   * Complexité: O(r) où r = nombre de relations
   */
  private precomputeClusters(): void {
    this.clustersCache.clear();

    for (const { left, right } of this.relations) {
      if (!this.clustersCache.has(right)) {
        this.clustersCache.set(right, new Set());
      }
      this.clustersCache.get(right)!.add(left);
    }
  }

  /**
   * OPTIMIZATION #2 + #5: Propagation avec index inversé et early exit
   *
   * Quand la distance d'une entité vers une référence est mise à jour,
   * propage cette mise à jour à toutes les entités dépendantes.
   *
   * @param updatedEntity - Entité dont la distance a été mise à jour
   * @param updatedRef - Référence concernée
   * @param newDist - Nouvelle distance
   * @param visited - Set pour éviter les cycles (OPTIMIZATION #5)
   */
  private propagateDistanceUpdate(
    updatedEntity: string,
    updatedRef: string,
    newDist: number,
    visited: Set<string> = new Set()
  ): void {
    // OPTIMIZATION #5: Early exit si déjà traité
    const propagationKey = `${updatedEntity}→${updatedRef}→${newDist}`;
    if (visited.has(propagationKey)) {
      return; // Déjà propagé
    }
    visited.add(propagationKey);

    // OPTIMIZATION #2: Uniquement itérer sur les dépendants effectifs
    const dependents = this.dependentsIndex.get(updatedEntity);
    if (!dependents) return;

    for (const entity of dependents) {
      const entityDistances = this.entityReferenceDistances.get(entity);
      if (!entityDistances || !entityDistances.has(updatedEntity)) continue;

      const distToUpdated = entityDistances.get(updatedEntity)!;
      const inheritedDist = distToUpdated + newDist;

      // Mettre à jour si nouveau chemin plus long (plus d'intercalations)
      const currentDist = entityDistances.get(updatedRef);
      if (currentDist === undefined) {
        entityDistances.set(updatedRef, inheritedDist);
        // Propager récursivement
        this.propagateDistanceUpdate(entity, updatedRef, inheritedDist, visited);
      } else if (inheritedDist > currentDist) {
        entityDistances.set(updatedRef, inheritedDist);
        // Propager récursivement
        this.propagateDistanceUpdate(entity, updatedRef, inheritedDist, visited);
      }
    }
  }

  /**
   * Calcul progressif des distances étape par étape
   *
   * Principe: Traiter les entités dans l'ordre, chaque entité devient une référence
   * et on calcule les distances de son cluster vers elle.
   *
   * @param entityOrder - Ordre de traitement des entités (de Phase 1)
   */
  private updateDistancesStepByStep(entityOrder: string[]): void {
    // OPTIMIZATION #1: Pré-calculer les clusters une fois
    this.precomputeClusters();

    // Traiter les entités dans l'ordre
    for (const referenceEntity of entityOrder) {
      if (!this.entities.has(referenceEntity)) continue;

      // OPTIMIZATION #1: Utiliser le cache au lieu de scanner les relations
      const clusterElements = this.clustersCache.get(referenceEntity) || new Set();
      if (clusterElements.size === 0) continue;

      // Pour chaque élément du cluster
      for (const element of clusterElements) {
        // Distance directe = 1 (toujours)
        const directDist = 1;

        // Stocker la distance de référence
        if (!this.entityReferenceDistances.has(element)) {
          this.entityReferenceDistances.set(element, new Map());
        }
        this.entityReferenceDistances.get(element)!.set(referenceEntity, directDist);

        // OPTIMIZATION #2: Construire l'index des dépendances
        if (!this.dependentsIndex.has(referenceEntity)) {
          this.dependentsIndex.set(referenceEntity, new Set());
        }
        this.dependentsIndex.get(referenceEntity)!.add(element);

        // Hériter les distances transitives via la référence
        const refDistances = this.entityReferenceDistances.get(referenceEntity);
        if (refDistances) {
          for (const [prevRef, prevDist] of refDistances.entries()) {
            const inheritedDist = directDist + prevDist;
            const elementDistances = this.entityReferenceDistances.get(element)!;

            const currentDist = elementDistances.get(prevRef);
            if (currentDist === undefined) {
              // Nouvelle distance
              elementDistances.set(prevRef, inheritedDist);
            } else if (inheritedDist > currentDist) {
              // Chemin plus long détecté (plus d'intercalations)
              elementDistances.set(prevRef, inheritedDist);

              // OPTIMIZATION #6: Propager cette mise à jour
              this.propagateDistanceUpdate(element, prevRef, inheritedDist);
            }
          }
        }
      }
    }

    // Mettre à jour le dictionnaire global des distances
    for (const [entity, refDistances] of this.entityReferenceDistances.entries()) {
      for (const [ref, dist] of refDistances.entries()) {
        const key = this.makeKey(entity, ref);
        const currentDist = this.distances.get(key);
        if (currentDist === undefined || dist > currentDist) {
          this.distances.set(key, dist);
        }
      }
    }
  }

  /**
   * OPTIMIZATION #4: Compte les connexions en O(r) au lieu de O(n×r)
   *
   * @returns Map<entity, connectionCount>
   */
  private countConnections(): Map<string, number> {
    const connections = new Map<string, number>();

    // Un seul passage sur les relations
    for (const { left, right } of this.relations) {
      connections.set(left, (connections.get(left) || 0) + 1);
      connections.set(right, (connections.get(right) || 0) + 1);
    }

    return connections;
  }

  /**
   * Calcule les layers en utilisant l'entité la plus connectée comme référence
   *
   * Processus:
   * 1. Calculer les distances progressivement (algo10)
   * 2. Sélectionner l'entité de référence (avec cascade criteria)
   * 3. Placer la référence au layer 0
   * 4. Propager les positions en respectant les distances
   * 5. Normaliser pour que le minimum soit au layer 0
   * 6. Grouper par layer
   *
   * @param entityOrder - Ordre de traitement des entités (de Phase 1)
   * @returns Array de layers (chaque layer = array d'entités triées)
   */
  computeLayers(entityOrder: string[]): string[][] {
    if (this.entities.size === 0) {
      return [];
    }

    // Calculer les distances avec l'algorithme progressif (algo10)
    this.updateDistancesStepByStep(entityOrder);

    const connections = this.countConnections();

    // Cascade de critères pour choisir la référence:
    // 1. Nombre de connexions directes (critère primaire)
    // 2. Somme des connexions des voisins (critère secondaire)
    // 3. Ordre d'apparition (critère tertiaire)
    const getReferenceScore = (entity: string): [number, number] => {
      // Critère 1: Nombre de connexions directes
      const directConnections = connections.get(entity) || 0;

      // Critère 2: Somme des connexions des voisins
      let neighborsConnectionsSum = 0;
      for (const { left, right } of this.relations) {
        if (left === entity) {
          neighborsConnectionsSum += connections.get(right) || 0;
        } else if (right === entity) {
          neighborsConnectionsSum += connections.get(left) || 0;
        }
      }

      return [directConnections, neighborsConnectionsSum];
    };

    // Trouver l'entité de référence (principe de centralité)
    let referenceEntity = '';
    let bestScore: [number, number] = [0, 0];
    for (const entity of this.entities) {
      const score = getReferenceScore(entity);
      if (score[0] > bestScore[0] || (score[0] === bestScore[0] && score[1] > bestScore[1])) {
        bestScore = score;
        referenceEntity = entity;
      }
    }

    console.log(
      `\n[DEBUG] Entite de reference: ${referenceEntity} (${bestScore[0]} connexions, somme voisins: ${bestScore[1]})`
    );

    // Trier les distances par connectivité
    const sortedDistances = Array.from(this.distances.entries()).sort((a, b) => {
      const [leftA, rightA] = this.parseKey(a[0]);
      const [leftB, rightB] = this.parseKey(b[0]);
      const sumA = (connections.get(leftA) || 0) + (connections.get(rightA) || 0);
      const sumB = (connections.get(leftB) || 0) + (connections.get(rightB) || 0);
      return sumB - sumA; // Décroissant
    });

    // Placer l'entité de référence au layer 0
    const layers = new Map<string, number>();
    layers.set(referenceEntity, 0);

    // Itérer jusqu'à ce que toutes les entités soient placées
    const maxIterations = this.entities.size ** 2;
    let iteration = 0;

    while (layers.size < this.entities.size && iteration < maxIterations) {
      iteration++;
      let progress = false;

      for (const [key, distance] of sortedDistances) {
        const [left, right] = this.parseKey(key);

        if (layers.has(left) && !layers.has(right)) {
          // Placer right pour la première fois
          layers.set(right, layers.get(left)! + distance);
          progress = true;
        } else if (layers.has(right) && !layers.has(left)) {
          // Placer left pour la première fois
          layers.set(left, layers.get(right)! - distance);
          progress = true;
        } else if (layers.has(left) && layers.has(right)) {
          // Les deux sont déjà placés - vérifier la cohérence
          const expectedRight = layers.get(left)! + distance;

          // Principe de cohérence transitive: respecter la contrainte de distance minimum
          if (layers.get(right)! < expectedRight) {
            layers.set(right, expectedRight);
            progress = true;
          }
        }
      }

      if (!progress) {
        // Placer les entités restantes au layer 0
        for (const entity of this.entities) {
          if (!layers.has(entity)) {
            layers.set(entity, 0);
            progress = true;
          }
        }
      }
    }

    // Afficher résumé des distances
    console.log(`\n[DEBUG] DISTANCES PAR RAPPORT A ${referenceEntity.toUpperCase()}`);
    const byDistance = new Map<number, string[]>();
    for (const [entity, layer] of layers.entries()) {
      if (entity !== referenceEntity) {
        const dist = layer;
        if (!byDistance.has(dist)) {
          byDistance.set(dist, []);
        }
        byDistance.get(dist)!.push(entity);
      }
    }

    const sortedDistances2 = Array.from(byDistance.keys()).sort((a, b) => a - b);
    for (const dist of sortedDistances2) {
      const direction = dist < 0 ? 'GAUCHE' : dist > 0 ? 'DROITE' : 'MEME LAYER';
      console.log(`[DEBUG] Distance ${dist >= 0 ? '+' : ''}${dist} (${direction}):`);
      for (const entity of byDistance.get(dist)!.sort()) {
        console.log(`[DEBUG]   - ${entity}`);
      }
    }

    // Normaliser (décaler pour que le minimum soit 0)
    const minLayer = Math.min(...Array.from(layers.values()));
    if (minLayer < 0) {
      for (const [entity, layer] of layers.entries()) {
        layers.set(entity, layer - minLayer);
      }
      console.log(`\n[DEBUG] Normalisation: decalage de ${-minLayer}`);
      console.log(`[DEBUG] ${referenceEntity} est maintenant au layer ${layers.get(referenceEntity)}`);
    }

    // Grouper par layer
    const layerDict = new Map<number, string[]>();
    for (const [entity, layer] of layers.entries()) {
      if (!layerDict.has(layer)) {
        layerDict.set(layer, []);
      }
      layerDict.get(layer)!.push(entity);
    }

    // Convertir en array trié par index de layer
    const sortedLayers: string[][] = [];
    const sortedLayerIndices = Array.from(layerDict.keys()).sort((a, b) => a - b);
    for (const idx of sortedLayerIndices) {
      sortedLayers.push(layerDict.get(idx)!.sort());
    }

    return sortedLayers;
  }

  /**
   * Helper: créer une clé unique pour une paire (left, right)
   */
  private makeKey(left: string, right: string): string {
    return `${left}→${right}`;
  }

  /**
   * Helper: parser une clé pour récupérer (left, right)
   */
  private parseKey(key: string): [string, string] {
    const parts = key.split('→');
    return [parts[0], parts[1]];
  }

  /**
   * Getter pour les statistiques
   */
  getStats() {
    return {
      entities: this.entities.size,
      relations: this.relations.length,
      distances: this.distances.size,
    };
  }
}
