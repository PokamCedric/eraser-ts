/**
 * Field Ordering Algorithm
 *
 * Determines the optimal ORDER of fields within each entity to minimize
 * edge crossings between field connections.
 *
 * Key insight: Fields should be ordered based on the VERTICAL POSITION
 * of their connected entities in neighboring layers.
 *
 * Example:
 *   If entity A has fields [f1, f2] where:
 *   - f1 connects to Entity X (position 0 in layer)
 *   - f2 connects to Entity Y (position 1 in layer)
 *   Then f1 should come before f2 to avoid crossings
 */

import { Entity } from '../../entities/Entity';
import { Relationship } from '../../entities/Relationship';
import { reorderEntityFields } from '../../../data/models/utils';
import { Logger } from '../../../infrastructure/utils/Logger';

export class FieldOrderingAlgorithm {
  /**
   * Optimize field ordering within all entities
   *
   * @param entities - All entities
   * @param relationships - All relationships
   * @param orderedLayers - Layers with entities already ordered vertically
   */
  static optimize(
    entities: Entity[],
    relationships: Relationship[],
    orderedLayers: Map<number, string[]>
  ): void {
    Logger.section('FIELD ORDERING ALGORITHM');

    // Build entity position map (what is the vertical position of each entity?)
    const entityVerticalPosition = new Map<string, number>();
    orderedLayers.forEach((layerEntities) => {
      layerEntities.forEach((entityName, position) => {
        entityVerticalPosition.set(entityName, position);
      });
    });

    // Multiple passes for convergence
    // Each pass reorders fields based on current entity positions
    for (let pass = 0; pass < 3; pass++) {
      entities.forEach(entity => {
        const fieldConnectionPositions = new Map<string, number[]>();

        // For each field, find the vertical positions of entities it connects to
        entity.fields.forEach((field) => {
          const connectedEntityPositions: number[] = [];

          relationships.forEach(rel => {
            let targetEntityName: string | null = null;

            // Check outgoing connections (this field connects to another entity)
            if (rel.from.entity === entity.name && rel.from.field === field.name) {
              targetEntityName = rel.to.entity;
            }
            // Check incoming connections (another entity connects to this field)
            else if (rel.to.entity === entity.name && rel.to.field === field.name) {
              targetEntityName = rel.from.entity;
            }

            if (targetEntityName) {
              const targetEntityPos = entityVerticalPosition.get(targetEntityName);
              if (targetEntityPos !== undefined) {
                connectedEntityPositions.push(targetEntityPos);
              }
            }
          });

          fieldConnectionPositions.set(field.name, connectedEntityPositions);
        });

        // Sort fields by average connected entity vertical position
        const fieldOrder = entity.fields
          .map(field => {
            const targetPositions = fieldConnectionPositions.get(field.name) || [];
            const avgPos = targetPositions.length > 0
              ? targetPositions.reduce((sum, pos) => sum + pos, 0) / targetPositions.length
              : Infinity; // Fields with no connections go to the bottom

            return {
              name: field.name,
              avgTargetPos: avgPos,
              hasConnections: targetPositions.length > 0
            };
          })
          .sort((a, b) => {
            // Fields with connections come first, sorted by their target positions
            // Fields without connections go to the bottom
            if (a.avgTargetPos === Infinity && b.avgTargetPos === Infinity) return 0;
            if (a.avgTargetPos === Infinity) return 1;
            if (b.avgTargetPos === Infinity) return -1;

            return a.avgTargetPos - b.avgTargetPos;
          })
          .map(f => f.name);

        // Apply the new field order
        reorderEntityFields(entity, fieldOrder);

        // Log significant reorderings
        const originalOrder = entity.fields.map(f => f.name);
        if (JSON.stringify(originalOrder) !== JSON.stringify(fieldOrder)) {
          Logger.debug(`  Reordered fields in ${entity.name}:`, fieldOrder);
        }
      });
    }

    Logger.section('FIELD ORDERING COMPLETE');
  }
}
