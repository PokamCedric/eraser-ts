/**
 * Layer Classifier - Rust Native Implementation Wrapper
 *
 * Ce fichier sert de wrapper TypeScript pour le module natif Rust.
 * Il fournit une interface compatible avec l'implémentation TypeScript originale
 * tout en utilisant la performance de Rust pour les calculs lourds.
 *
 * Usage:
 * - Si le module natif est disponible, il sera utilisé automatiquement
 * - Sinon, un fallback vers l'implémentation TypeScript est utilisé
 */

import { LayerClassifier } from './LayerClassifier';
import { ILayerClassifier } from './ILayerClassifier';
import { ILogger } from '../ILogger';
import { Logger } from '../../../infrastructure/utils/Logger';

interface LayerClassifierNative {
  new(): LayerClassifierNative;
  addRelation(left: string, right: string): void;
  computeLayers(): string[][];
  getStats(): { entities: number; relations: number; distances: number };
}

let nativeModule: { LayerClassifier: LayerClassifierNative } | null = null;

// Tenter de charger le module natif de manière synchrone
// En utilisant une approche qui ne sera pas validée par TypeScript au compile-time
try {
  // @ts-ignore - Le module peut ne pas exister, c'est intentionnel
  nativeModule = require('./native/layer-classifier-native.node');
  Logger.info('[LayerClassifier] Module Rust chargé avec succès 🦀');
} catch (error) {
  Logger.warn('[LayerClassifier] Module Rust non disponible, utilisation du fallback TypeScript');
}

/**
 * Wrapper pour le LayerClassifier Rust avec fallback TypeScript
 *
 * Fournit la même interface que LayerClassifier.ts mais utilise
 * l'implémentation Rust native pour de meilleures performances.
 * Si le module Rust n'est pas disponible, utilise automatiquement
 * l'implémentation TypeScript.
 */
export class LayerClassifierRust implements ILayerClassifier {
  private classifier: any;
  private usingRust: boolean;

  constructor(logger: ILogger) {
    if (nativeModule) {
      this.classifier = new nativeModule.LayerClassifier();
      this.usingRust = true;
    } else {
      // Fallback vers l'implémentation TypeScript
      this.classifier = new LayerClassifier(logger);
      this.usingRust = false;
    }
  }

  /**
   * Ajoute une relation A r B (A doit être à gauche de B)
   */
  addRelation(left: string, right: string): void {
    this.classifier.addRelation(left, right);
  }

  /**
   * Calcule les layers en utilisant l'algorithme Floyd-Warshall inversé
   *
   * @param entityOrder - Optional preferred order for entities
   * @returns Array de layers (chaque layer = array d'entités triées)
   */
  computeLayers(entityOrder?: string[]): string[][] {
    return this.classifier.computeLayers(entityOrder);
  }

  /**
   * Getter pour les statistiques
   */
  getStats() {
    return this.classifier.getStats();
  }

  /**
   * Indique si l'implémentation Rust est utilisée
   */
  isUsingRust(): boolean {
    return this.usingRust;
  }
}

/**
 * Vérifie si le module Rust natif est disponible
 */
export function isRustModuleAvailable(): boolean {
  return nativeModule !== null;
}
