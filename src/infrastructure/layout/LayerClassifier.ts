/**
 * Layer Classifier - Floyd-Warshall Inversé
 *
 * Implémentation pure de l'algorithme de classification par layers
 * utilisant Floyd-Warshall inversé (MAX au lieu de MIN) pour détecter
 * les intercalations transitives.
 *
 * Basé sur algo7.py - Phase 2 (Processing)
 * Documentation: docs/layer-classification-algorithm.md
 *
 * Principes:
 * 1. Atomicité: chaque relation directe = distance 1
 * 2. Thalès inversé: découverte de AB+BC+CD quand AD est connu
 * 3. Floyd-Warshall inversé: calcul du MAX path au lieu de MIN
 * 4. Maximalité: en cas de conflit, le chemin long l'emporte
 */

interface DirectedRelation {
  left: string;
  right: string;
}

/**
 * LayerClassifier - Algorithme de classification par Floyd-Warshall inversé
 *
 * Cette classe implémente UNIQUEMENT la phase 2 (processing) de l'algorithme:
 * - Calcul des distances transitives avec Floyd-Warshall MAX
 * - Placement des entités par rapport à une entité de référence
 * - Normalisation des positions
 *
 * Les phases 1 (pré-processing) et 3 (post-processing) sont gérées en externe.
 */
export class LayerClassifier {
  private relations: DirectedRelation[] = [];
  private entities: Set<string> = new Set();
  private distances: Map<string, number> = new Map();

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

    // Recalculer toutes les distances avec les intercalations
    this.updateDistances();
  }

  /**
   * Met à jour les distances en détectant les intercalations transitives (Théorème de Thalès)
   *
   * Utilise Floyd-Warshall modifié pour calculer la distance MAXIMALE entre toutes paires.
   * La distance maximale représente le nombre d'intercalations dans le chemin le plus long.
   *
   * Optimisation: Pruning précoce - arrêt global si aucune distance ne change pendant
   * une passe complète sur tous les nœuds intermédiaires.
   *
   * Complexité:
   * - Pire cas: O(n³) où n = nombre d'entités
   * - Meilleur cas: O(n² × k) où k = nombre d'itérations avant convergence
   */
  private updateDistances(): void {
    // Répéter Floyd-Warshall jusqu'à convergence (pruning précoce)
    const maxIterations = this.entities.size; // Au pire cas: nombre d'entités
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      let changedInPass = false; // Tracker les changements sur toute la passe

      // Floyd-Warshall: pour chaque nœud intermédiaire k
      for (const k of this.entities) {
        // Pour chaque paire source i et destination j
        for (const i of this.entities) {
          for (const j of this.entities) {
            if (i !== j && i !== k && j !== k) {
              // Si on a un chemin i -> k et k -> j
              const distIK = this.distances.get(this.makeKey(i, k));
              const distKJ = this.distances.get(this.makeKey(k, j));

              if (distIK !== undefined && distKJ !== undefined) {
                // Distance via k (principe d'atomicité: somme des distances atomiques)
                const distViaK = distIK + distKJ;

                // Mettre à jour la distance i -> j si on trouve un chemin plus long (MAX)
                const currentDist = this.distances.get(this.makeKey(i, j));
                if (currentDist !== undefined) {
                  if (distViaK > currentDist) {
                    // Principe de maximalité: le chemin long l'emporte
                    this.distances.set(this.makeKey(i, j), distViaK);
                    changedInPass = true;
                  }
                } else {
                  // Créer une nouvelle distance transitive (Thalès inversé: découverte de la décomposition)
                  this.distances.set(this.makeKey(i, j), distViaK);
                  changedInPass = true;
                }
              }
            }
          }
        }
      }

      // Pruning précoce: si aucune distance n'a changé pendant toute cette passe,
      // l'algorithme a convergé - on peut arrêter
      if (!changedInPass) {
        break;
      }
    }
  }

  /**
   * Compte le nombre de connexions pour chaque entité
   *
   * Une connexion = une relation où l'entité apparaît (soit à gauche, soit à droite)
   *
   * @returns Map<entity, connectionCount>
   */
  private countConnections(): Map<string, number> {
    const connections = new Map<string, number>();
    for (const entity of this.entities) {
      let count = 0;
      for (const { left, right } of this.relations) {
        if (left === entity || right === entity) {
          count++;
        }
      }
      connections.set(entity, count);
    }
    return connections;
  }

  /**
   * Calcule les layers en utilisant l'entité la plus connectée comme référence
   *
   * Processus:
   * 1. Sélectionner l'entité de référence (avec cascade criteria)
   * 2. Placer la référence au layer 0
   * 3. Propager les positions en respectant les distances
   * 4. Normaliser pour que le minimum soit au layer 0
   * 5. Grouper par layer
   *
   * @returns Array de layers (chaque layer = array d'entités triées)
   */
  computeLayers(): string[][] {
    if (this.entities.size === 0) {
      return [];
    }

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

    // Placer l'entité de référence au layer 0
    const layers = new Map<string, number>();
    layers.set(referenceEntity, 0);

    // Itérer jusqu'à ce que toutes les entités soient placées
    const maxIterations = this.entities.size ** 2;
    let iteration = 0;

    while (layers.size < this.entities.size && iteration < maxIterations) {
      iteration++;
      let progress = false;

      for (const [key, distance] of this.distances.entries()) {
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

    const sortedDistances = Array.from(byDistance.keys()).sort((a, b) => a - b);
    for (const dist of sortedDistances) {
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
