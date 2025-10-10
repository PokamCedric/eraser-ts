/**
 * Vertical Alignment Optimizer
 *
 * Optimizes the vertical order of entities within each layer to minimize edge crossings.
 * Uses the weighted barycenter method: entities are positioned based on the average position
 * of their connected neighbors, with higher weight for connections to Primary Keys.
 */

import { Relationship } from '../../domain/entities/Relationship';
import { Entity } from '../../domain/entities/Entity';

export class VerticalAlignmentOptimizer {
  /**
   * Optimize vertical ordering within layers to minimize edge crossings
   *
   * Algorithm:
   * 1. For each layer (left to right)
   * 2. Calculate weighted barycenter for each entity based on connected entities in previous layer
   *    - Connections to Primary Keys have higher weight (priority towards top)
   * 3. Sort entities by barycenter value
   * 4. Repeat in reverse (right to left) for better results
   *
   * @param layers - Map of layer index to entity names
   * @param relationships - All relationships between entities
   * @param entities - All entities (needed to check for Primary Keys)
   * @param iterations - Number of optimization passes (default: 4)
   */
  static optimize(
    layers: Map<number, string[]>,
    relationships: Relationship[],
    entities: Entity[],
    iterations: number = 4
  ): Map<number, string[]> {
    const optimizedLayers = new Map(layers);

    // Build entity map for quick lookup
    const entityMap = new Map<string, Entity>(
      entities.map(e => [e.name, e])
    );

    // Run multiple iterations for better convergence
    for (let iter = 0; iter < iterations; iter++) {
      // Forward pass: left to right
      this._optimizeForward(optimizedLayers, relationships, entityMap);

      // Backward pass: right to left
      this._optimizeBackward(optimizedLayers, relationships, entityMap);
    }

    return optimizedLayers;
  }

  /**
   * Forward pass: optimize left to right
   */
  private static _optimizeForward(
    layers: Map<number, string[]>,
    relationships: Relationship[],
    entityMap: Map<string, Entity>
  ): void {
    const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

    for (let i = 1; i < sortedLayers.length; i++) {
      const currentLayerIndex = sortedLayers[i];
      const previousLayerIndex = sortedLayers[i - 1];

      const currentLayer = layers.get(currentLayerIndex)!;
      const previousLayer = layers.get(previousLayerIndex)!;

      // Calculate weighted barycenter for each entity in current layer
      const barycenters = currentLayer.map(entity => {
        const barycenter = this._calculateWeightedBarycenter(
          entity,
          previousLayer,
          relationships,
          entityMap
        );
        return { entity, barycenter };
      });

      // Sort by barycenter value
      barycenters.sort((a, b) => a.barycenter - b.barycenter);

      // Update layer with sorted entities
      layers.set(
        currentLayerIndex,
        barycenters.map(b => b.entity)
      );
    }
  }

  /**
   * Backward pass: optimize right to left
   */
  private static _optimizeBackward(
    layers: Map<number, string[]>,
    relationships: Relationship[],
    entityMap: Map<string, Entity>
  ): void {
    const sortedLayers = Array.from(layers.keys()).sort((a, b) => b - a);

    for (let i = 1; i < sortedLayers.length; i++) {
      const currentLayerIndex = sortedLayers[i];
      const nextLayerIndex = sortedLayers[i - 1];

      const currentLayer = layers.get(currentLayerIndex)!;
      const nextLayer = layers.get(nextLayerIndex)!;

      // Calculate weighted barycenter for each entity in current layer
      const barycenters = currentLayer.map(entity => {
        const barycenter = this._calculateWeightedBarycenter(
          entity,
          nextLayer,
          relationships,
          entityMap
        );
        return { entity, barycenter };
      });

      // Sort by barycenter value
      barycenters.sort((a, b) => a.barycenter - b.barycenter);

      // Update layer with sorted entities
      layers.set(
        currentLayerIndex,
        barycenters.map(b => b.entity)
      );
    }
  }

  /**
   * Calculate weighted barycenter (average position) of connected entities
   * Connections to/from Primary Keys have higher weight (bias towards top)
   *
   * @param entity - Current entity name
   * @param referenceLayer - Layer to calculate barycenter from
   * @param relationships - All relationships
   * @param entityMap - Map of entity name to Entity object
   * @returns Weighted average position (0-based index in reference layer)
   */
  private static _calculateWeightedBarycenter(
    entity: string,
    referenceLayer: string[],
    relationships: Relationship[],
    entityMap: Map<string, Entity>
  ): number {
    const weightedPositions: { position: number; weight: number }[] = [];

    // Find all relationships involving this entity
    relationships.forEach(rel => {
      let connectedEntity: string | null = null;
      let sourceField: string | null = null;
      let isPrimaryKeyConnection = false;

      // Check if this relationship connects to reference layer
      if (rel.from.entity === entity && referenceLayer.includes(rel.to.entity)) {
        connectedEntity = rel.to.entity;
        sourceField = rel.from.field;
      } else if (rel.to.entity === entity && referenceLayer.includes(rel.from.entity)) {
        connectedEntity = rel.from.entity;
        sourceField = rel.from.field;
      }

      if (connectedEntity) {
        // Check if the source field is a Primary Key
        const sourceEntity = entityMap.get(
          rel.from.entity === entity ? entity : rel.from.entity
        );

        if (sourceEntity) {
          const field = sourceEntity.fields.find(f => f.name === sourceField);
          isPrimaryKeyConnection = field?.isPrimaryKey ?? false;
        }

        const position = referenceLayer.indexOf(connectedEntity);
        if (position !== -1) {
          // Primary Key connections get higher weight (0.3 = bias towards top)
          // Regular connections get normal weight (1.0)
          const weight = isPrimaryKeyConnection ? 0.3 : 1.0;
          weightedPositions.push({ position, weight });
        }
      }
    });

    // If no connections, return middle position
    if (weightedPositions.length === 0) {
      return referenceLayer.length / 2;
    }

    // Calculate weighted average position
    const weightedSum = weightedPositions.reduce(
      (sum, item) => sum + item.position * item.weight,
      0
    );
    const totalWeight = weightedPositions.reduce(
      (sum, item) => sum + item.weight,
      0
    );

    return weightedSum / totalWeight;
  }
}
