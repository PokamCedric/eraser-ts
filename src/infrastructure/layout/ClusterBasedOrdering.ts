/**
 * Cluster-Based Ordering Algorithm
 *
 * Approach:
 * 1. Identify ALL clusters across all layer pairs
 * 2. Establish connections between clusters (which cluster connects to which)
 * 3. Build chains of clusters starting from center, extending outward
 * 4. Order entities in each layer based on chain order
 *
 * Key concept:
 * - Cluster: A set of entities in layer n that are ALL connected to the SAME entity in layer n+1
 * - Chain: A path of connected clusters across multiple layers (e.g., 0.1 → 1.3 → 2.1 → 3.1 → 4.1)
 */

import { Relationship } from '../../domain/entities/Relationship';

interface Cluster {
  id: string;                   // Unique cluster ID (e.g., "2.0")
  layer: number;                // Layer n where entities are
  entitiesInN: Set<string>;    // Entities in layer n
  targetInN1: string;           // Their common target in layer n+1
  targetLayer: number;          // Layer n+1
}

interface ClusterChain {
  clusters: string[];  // Ordered list of cluster IDs forming a chain
}

export class ClusterBasedOrdering {
  /**
   * Optimize layer ordering using cluster-based approach
   */
  static optimize(
    layers: Map<number, string[]>,
    relationships: Relationship[]
  ): Map<number, string[]> {
    const result = new Map(layers);

    console.log('\n=== CLUSTER-BASED ORDERING (CHAIN APPROACH) ===');

    // Step 1: Identify ALL clusters across all layer pairs
    const allClusters = this._identifyAllClusters(layers, relationships);
    const clusterMap = new Map<string, Cluster>();
    allClusters.forEach(c => clusterMap.set(c.id, c));

    console.log(`\nStep 1: Found ${allClusters.length} clusters total`);
    allClusters.forEach(cluster => {
      const entities = Array.from(cluster.entitiesInN).join(', ');
      console.log(`  ${cluster.id}: [${entities}] → ${cluster.targetInN1} (layer ${cluster.targetLayer})`);
    });

    // Step 2: Establish connections between clusters (layer pair by layer pair)
    const connections = this._establishConnectionsByLayerPair(allClusters, layers);

    console.log(`\nStep 2: Connections by layer pair:`);
    for (const [pair, conns] of connections) {
      console.log(`  Layers ${pair}:`);
      conns.forEach(conn => console.log(`    ${conn.from} → ${conn.to}`));
    }

    // Step 3: Build chains starting from center
    const layerIndices = Array.from(layers.keys()).sort((a, b) => a - b);
    const anchorIdx = Math.floor((layerIndices.length - 1) / 2);
    const anchorLayer = layerIndices[anchorIdx];

    const chains = this._buildChainsFromCenter(
      allClusters,
      connections,
      anchorLayer,
      layerIndices
    );

    console.log(`\nStep 3: Built ${chains.length} chains:`);
    chains.forEach((chain, idx) => {
      console.log(`  Chain ${idx}: ${chain.clusters.join(' → ')}`);
    });

    // Step 4: Apply chain ordering to layers
    console.log(`\nStep 4: Applying chain ordering to layers`);
    this._applyChainOrderingToLayers(result, chains, clusterMap);

    console.log('\n=== ORDERING COMPLETE ===\n');

    return result;
  }

  /**
   * Step 1: Identify all clusters across all layer pairs
   */
  private static _identifyAllClusters(
    layers: Map<number, string[]>,
    relationships: Relationship[]
  ): Cluster[] {
    const allClusters: Cluster[] = [];
    const layerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

    // For each consecutive layer pair (n, n+1)
    for (let i = 0; i < layerIndices.length - 1; i++) {
      const n = layerIndices[i];
      const n1 = layerIndices[i + 1];

      const entitiesN = layers.get(n)!;
      const entitiesN1 = layers.get(n1)!;

      let clusterIdx = 0;

      // For each entity in n+1, find entities in n connected to it
      for (const targetN1 of entitiesN1) {
        const connectedN = new Set<string>();

        for (const entityN of entitiesN) {
          const hasConnection = relationships.some(rel => {
            const forward = rel.from.entity === entityN && rel.to.entity === targetN1;
            const backward = rel.from.entity === targetN1 && rel.to.entity === entityN;
            return forward || backward;
          });

          if (hasConnection) {
            connectedN.add(entityN);
          }
        }

        if (connectedN.size > 0) {
          allClusters.push({
            id: `${n}.${clusterIdx++}`,
            layer: n,
            entitiesInN: connectedN,
            targetInN1: targetN1,
            targetLayer: n1
          });
        }
      }
    }

    return allClusters;
  }

  /**
   * Step 2: Establish connections between clusters, grouped by layer pair
   */
  private static _establishConnectionsByLayerPair(
    allClusters: Cluster[],
    layers: Map<number, string[]>
  ): Map<string, Array<{from: string, to: string}>> {
    const connectionsByPair = new Map<string, Array<{from: string, to: string}>>();

    // Group clusters by layer
    const clustersByLayer = new Map<number, Cluster[]>();
    for (const cluster of allClusters) {
      if (!clustersByLayer.has(cluster.layer)) {
        clustersByLayer.set(cluster.layer, []);
      }
      clustersByLayer.get(cluster.layer)!.push(cluster);
    }

    const layerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

    // For each consecutive layer pair
    for (let i = 0; i < layerIndices.length - 1; i++) {
      const n = layerIndices[i];
      const n1 = layerIndices[i + 1];
      const pairKey = `${n}-${n1}`;

      const clustersN = clustersByLayer.get(n) || [];
      const clustersN1 = clustersByLayer.get(n1) || [];
      const connections: Array<{from: string, to: string}> = [];

      // For each cluster in layer n, find which clusters in layer n+1 it connects to
      for (const clusterN of clustersN) {
        for (const clusterN1 of clustersN1) {
          // Check if target of clusterN is in clusterN1
          if (clusterN1.entitiesInN.has(clusterN.targetInN1)) {
            connections.push({
              from: clusterN.id,
              to: clusterN1.id
            });
          }
        }
      }

      connectionsByPair.set(pairKey, connections);
    }

    return connectionsByPair;
  }

  /**
   * Step 3: Build chains of clusters from center outward
   */
  private static _buildChainsFromCenter(
    allClusters: Cluster[],
    connections: Map<string, Array<{from: string, to: string}>>,
    anchorLayer: number,
    layerIndices: number[]
  ): ClusterChain[] {
    // Group clusters by layer
    const clustersByLayer = new Map<number, Cluster[]>();
    for (const cluster of allClusters) {
      if (!clustersByLayer.has(cluster.layer)) {
        clustersByLayer.set(cluster.layer, []);
      }
      clustersByLayer.get(cluster.layer)!.push(cluster);
    }

    // Step 3a: Order anchor layer clusters (respecting pivots)
    const anchorClusters = clustersByLayer.get(anchorLayer) || [];
    const orderedAnchorClusters = this._orderAnchorClusters(anchorClusters);

    console.log(`\n  Anchor layer ${anchorLayer} cluster order: ${orderedAnchorClusters.map(c => c.id).join(', ')}`);

    // Step 3b: Build chains starting from each anchor cluster
    const chains: ClusterChain[] = [];
    const clustersInChains = new Set<string>();

    for (const anchorCluster of orderedAnchorClusters) {
      // Start a chain with this anchor cluster
      const chain: string[] = [anchorCluster.id];
      clustersInChains.add(anchorCluster.id);

      // Extend upward (to higher layers)
      this._extendChainUpward(chain, anchorCluster, connections, clustersByLayer, layerIndices, clustersInChains);

      // Extend downward (to lower layers)
      this._extendChainDownward(chain, anchorCluster, connections, clustersByLayer, layerIndices, clustersInChains);

      chains.push({ clusters: chain });
    }

    // Step 3c: Add standalone chains for clusters not yet in any chain
    // Try to extend these standalone clusters into chains too
    for (const cluster of allClusters) {
      if (!clustersInChains.has(cluster.id)) {
        const chain: string[] = [cluster.id];
        clustersInChains.add(cluster.id);

        // Try to extend this chain upward and downward
        this._extendChainUpward(chain, cluster, connections, clustersByLayer, layerIndices, clustersInChains);
        this._extendChainDownward(chain, cluster, connections, clustersByLayer, layerIndices, clustersInChains);

        chains.push({ clusters: chain });
        console.log(`  Standalone cluster chain: ${chain.join(' → ')}`);
      }
    }

    // Step 3d: Sort chains to respect connections between them
    // Chains that connect to earlier clusters should come after
    const sortedChains = this._sortChainsByConnections(chains, connections);

    return sortedChains;
  }

  /**
   * Sort chains so that chains connecting to the same targets are grouped together
   */
  private static _sortChainsByConnections(
    chains: ClusterChain[],
    connections: Map<string, Array<{from: string, to: string}>>
  ): ClusterChain[] {
    // For each chain, find which other chains it connects to
    const chainConnections = new Map<ClusterChain, Set<string>>();

    for (const chain of chains) {
      const connectedClusters = new Set<string>();

      for (const clusterId of chain.clusters) {
        // Find all connections from this cluster
        for (const [_, conns] of connections) {
          for (const conn of conns) {
            if (conn.from === clusterId) {
              connectedClusters.add(conn.to);
            }
            if (conn.to === clusterId) {
              connectedClusters.add(conn.from);
            }
          }
        }
      }

      chainConnections.set(chain, connectedClusters);
    }

    // Sort chains: chains that share connections should be adjacent
    // For now, keep the original order but could be improved
    return chains;
  }

  /**
   * Order anchor layer clusters based on pivots (chain them together)
   */
  private static _orderAnchorClusters(clusters: Cluster[]): Cluster[] {
    if (clusters.length <= 1) return clusters;

    // Identify pivots
    const pivots = this._identifyPivotsInClusters(clusters);

    // Build chain via pivots
    const ordered: Cluster[] = [];
    const remaining = new Set(clusters);

    // Start with cluster that has most non-pivot entities
    let current = clusters.reduce((best, c) => {
      const bestNonPivots = Array.from(best.entitiesInN).filter(e => !pivots.has(e)).length;
      const currentNonPivots = Array.from(c.entitiesInN).filter(e => !pivots.has(e)).length;
      return currentNonPivots > bestNonPivots ? c : best;
    });

    while (remaining.size > 0) {
      if (!remaining.has(current)) {
        // Pick any remaining cluster
        current = Array.from(remaining)[0];
      }

      ordered.push(current);
      remaining.delete(current);

      // Find next cluster via pivot
      const currentPivots = Array.from(current.entitiesInN).filter(e => pivots.has(e));
      let nextCluster: Cluster | null = null;

      for (const pivot of currentPivots) {
        nextCluster = Array.from(remaining).find(c => c.entitiesInN.has(pivot)) || null;
        if (nextCluster) break;
      }

      if (nextCluster) {
        current = nextCluster;
      } else {
        break;
      }
    }

    // Add any remaining clusters
    for (const cluster of remaining) {
      ordered.push(cluster);
    }

    return ordered;
  }

  /**
   * Extend chain upward (to higher layers)
   */
  private static _extendChainUpward(
    chain: string[],
    anchorCluster: Cluster,
    connections: Map<string, Array<{from: string, to: string}>>,
    clustersByLayer: Map<number, Cluster[]>,
    layerIndices: number[],
    clustersInChains: Set<string>
  ): void {
    let currentLayer = anchorCluster.layer;
    let currentClusterId = anchorCluster.id;

    // Process layers above anchor
    while (currentLayer < Math.max(...layerIndices)) {
      const nextLayer = currentLayer + 1;
      const pairKey = `${currentLayer}-${nextLayer}`;
      const pairConnections = connections.get(pairKey) || [];

      // Find which cluster(s) in nextLayer this cluster connects to
      const connectedClusters = pairConnections
        .filter(c => c.from === currentClusterId)
        .map(c => c.to);

      if (connectedClusters.length > 0) {
        // Take the first connection that hasn't been used yet
        const nextClusterId = connectedClusters.find(id => !clustersInChains.has(id));

        if (nextClusterId) {
          chain.push(nextClusterId);
          clustersInChains.add(nextClusterId);
          currentClusterId = nextClusterId;
          currentLayer = nextLayer;
        } else {
          break; // All connected clusters already in other chains
        }
      } else {
        break;
      }
    }
  }

  /**
   * Extend chain downward (to lower layers)
   */
  private static _extendChainDownward(
    chain: string[],
    anchorCluster: Cluster,
    connections: Map<string, Array<{from: string, to: string}>>,
    clustersByLayer: Map<number, Cluster[]>,
    layerIndices: number[],
    clustersInChains: Set<string>
  ): void {
    let currentLayer = anchorCluster.layer;
    let currentClusterId = anchorCluster.id;

    // Process layers below anchor
    while (currentLayer > Math.min(...layerIndices)) {
      const prevLayer = currentLayer - 1;
      const pairKey = `${prevLayer}-${currentLayer}`;
      const pairConnections = connections.get(pairKey) || [];

      // Find which cluster(s) in prevLayer connect to this cluster
      const connectedClusters = pairConnections
        .filter(c => c.to === currentClusterId)
        .map(c => c.from);

      if (connectedClusters.length > 0) {
        // Take the first connection that hasn't been used yet
        const prevClusterId = connectedClusters.find(id => !clustersInChains.has(id));

        if (prevClusterId) {
          chain.unshift(prevClusterId); // Add to beginning of chain
          clustersInChains.add(prevClusterId);
          currentClusterId = prevClusterId;
          currentLayer = prevLayer;
        } else {
          break; // All connected clusters already in other chains
        }
      } else {
        break;
      }
    }
  }

  /**
   * Step 4: Apply chain ordering to layers
   */
  private static _applyChainOrderingToLayers(
    layers: Map<number, string[]>,
    chains: ClusterChain[],
    clusterMap: Map<string, Cluster>
  ): void {
    // Group chains by layer
    const chainsByLayer = new Map<number, Array<{chain: ClusterChain, clusterInLayer: Cluster}>>();

    for (const chain of chains) {
      for (const clusterId of chain.clusters) {
        const cluster = clusterMap.get(clusterId);
        if (!cluster) continue;

        if (!chainsByLayer.has(cluster.layer)) {
          chainsByLayer.set(cluster.layer, []);
        }
        chainsByLayer.get(cluster.layer)!.push({ chain, clusterInLayer: cluster });
      }
    }

    // For each layer, rebuild entity order based on chain order
    for (const [layerIdx, chainEntries] of chainsByLayer) {
      const originalEntities = layers.get(layerIdx);
      if (!originalEntities) continue;

      const clusters = chainEntries.map(e => e.clusterInLayer);
      const newOrder: string[] = [];
      const processed = new Set<string>();

      // Identify pivots
      const pivots = this._identifyPivotsInClusters(clusters);

      // Add entities cluster by cluster (following chain order)
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        const nextCluster = clusters[i + 1];

        const clusterEntities = Array.from(cluster.entitiesInN).filter(e => !processed.has(e));
        const nonPivots = clusterEntities.filter(e => !pivots.has(e));
        const clusterPivots = clusterEntities.filter(e => pivots.has(e));

        // Add non-pivots
        for (const entity of nonPivots) {
          newOrder.push(entity);
          processed.add(entity);
        }

        // Add pivots at boundaries
        for (const pivot of clusterPivots) {
          const belongsToNext = nextCluster && nextCluster.entitiesInN.has(pivot);
          if (belongsToNext || !nextCluster) {
            newOrder.push(pivot);
            processed.add(pivot);
          }
        }
      }

      // Add remaining entities
      for (const entity of originalEntities) {
        if (!processed.has(entity)) {
          newOrder.push(entity);
        }
      }

      console.log(`  Layer ${layerIdx}: ${newOrder.join(', ')}`);
      layers.set(layerIdx, newOrder);
    }
  }

  /**
   * Identify pivots in a set of clusters
   */
  private static _identifyPivotsInClusters(clusters: Cluster[]): Set<string> {
    const entityCount = new Map<string, number>();

    for (const cluster of clusters) {
      for (const entity of cluster.entitiesInN) {
        entityCount.set(entity, (entityCount.get(entity) || 0) + 1);
      }
    }

    const pivots = new Set<string>();
    for (const [entity, count] of entityCount) {
      if (count > 1) {
        pivots.add(entity);
      }
    }

    return pivots;
  }
}
