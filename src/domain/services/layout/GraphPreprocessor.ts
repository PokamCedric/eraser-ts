/**
 * Phase 1-2: Graph Preprocessor
 *
 * Preprocesses raw relations:
 * - Deduplication (removes bidirectional duplicates)
 * - Entity ordering by connectivity
 */

import { DirectedRelation } from './types';
import { Logger } from '../../../infrastructure/utils/Logger';

export interface PreprocessorResult {
  relations: DirectedRelation[];
  connectionCount: Map<string, number>;
}

export class GraphPreprocessor {
  /**
   * ÉTAPE 1: Deduplicate relations based on entity pairs (order-agnostic)
   *
   * Matches algo10's deduplication logic:
   * - (A, B) and (A, B) -> keep one
   * - (A, B) and (B, A) -> keep one (bidirectional treated as same)
   *
   * @param relationsRaw - Raw relations from parser
   * @returns Deduplicated relations and connection counts
   */
  static buildBacklog(relationsRaw: DirectedRelation[]): PreprocessorResult {
    Logger.subsection('PHASE 1: DEDUPLICATION (BUILD BACKLOG)');

    // Deduplication based on entity PAIR (order-agnostic)
    const seenPairs = new Map<string, DirectedRelation>();
    const uniqueRelations: DirectedRelation[] = [];
    const duplicatesRemoved: string[] = [];

    for (const { left, right } of relationsRaw) {
      // Order-agnostic key: alphabetically sorted pair
      const pairKey = [left, right].sort().join('|');

      if (!seenPairs.has(pairKey)) {
        // First time seeing this pair
        seenPairs.set(pairKey, { left, right });
        uniqueRelations.push({ left, right });
      } else {
        // Duplicate detected!
        const first = seenPairs.get(pairKey)!;
        duplicatesRemoved.push(`  [DUPLICATE] ${left} > ${right} (first: ${first.left} > ${first.right})`);
      }
    }

    Logger.debug(`After deduplication: ${uniqueRelations.length} unique relations`);

    if (duplicatesRemoved.length > 0) {
      Logger.debug(`\n${duplicatesRemoved.length} duplicate(s) removed:`);
      duplicatesRemoved.slice(0, 5).forEach(dup => Logger.debug(dup));
      if (duplicatesRemoved.length > 5) {
        Logger.debug(`  ... (${duplicatesRemoved.length - 5} more)`);
      }
    } else {
      Logger.debug('No duplicates detected');
    }

    // Count connections
    const connectionCount = new Map<string, number>();
    for (const { left, right } of uniqueRelations) {
      connectionCount.set(left, (connectionCount.get(left) || 0) + 1);
      connectionCount.set(right, (connectionCount.get(right) || 0) + 1);
    }

    return { relations: uniqueRelations, connectionCount };
  }

  /**
   * ÉTAPE 2: Build entity processing order based on connectivity
   *
   * Algorithm uses 3 criteria:
   * 1. Liste-Règle 1: sorted by connection count (descending)
   * 2. Connection with already chosen entities
   * 3. Tie-breaker: position in Liste-Règle 1
   *
   * @param relations - Deduplicated relations
   * @param connectionCount - Connection count per entity
   * @returns Ordered list of entities for processing
   */
  static buildEntityOrder(
    relations: DirectedRelation[],
    connectionCount: Map<string, number>
  ): string[] {
    Logger.subsection('PHASE 2: ENTITY ORDERING');

    // Liste-Règle 1 (reference)
    const listeRegle1 = Array.from(connectionCount.keys()).sort(
      (a, b) => connectionCount.get(b)! - connectionCount.get(a)!
    );

    // List to fill
    const entityOrder: string[] = [];
    const listeEnonces: string[] = [];

    // ITERATION 1: Take the first element (most connected)
    entityOrder.push(listeRegle1[0]);

    // Add connected entities
    for (const { left, right } of relations) {
      if (left === entityOrder[0] && !listeEnonces.includes(right)) {
        listeEnonces.push(right);
      }
      if (right === entityOrder[0] && !listeEnonces.includes(left)) {
        listeEnonces.push(left);
      }
    }

    // SUBSEQUENT ITERATIONS
    while (entityOrder.length < listeRegle1.length) {
      const candidates = listeEnonces.filter(e => !entityOrder.includes(e));
      if (candidates.length === 0) break;

      // Choose candidate with highest connection count
      // Tie-breaker: position in listeRegle1
      const nextEntity = candidates.reduce((best, current) => {
        const currentConnections = connectionCount.get(current) || 0;
        const bestConnections = connectionCount.get(best) || 0;

        if (currentConnections > bestConnections) return current;
        if (currentConnections < bestConnections) return best;

        // Tie-breaker: position in listeRegle1
        return listeRegle1.indexOf(current) < listeRegle1.indexOf(best) ? current : best;
      });

      entityOrder.push(nextEntity);

      // Update liste_enonces
      for (const { left, right } of relations) {
        if (left === nextEntity && !listeEnonces.includes(right) && !entityOrder.includes(right)) {
          listeEnonces.push(right);
        }
        if (right === nextEntity && !listeEnonces.includes(left) && !entityOrder.includes(left)) {
          listeEnonces.push(left);
        }
      }
    }

    Logger.debug(`Entity order (top 10): ${entityOrder.slice(0, 10).join(' > ')}`);
    if (entityOrder.length > 10) {
      Logger.debug(`  ... (${entityOrder.length - 10} more)`);
    }

    return entityOrder;
  }
}
