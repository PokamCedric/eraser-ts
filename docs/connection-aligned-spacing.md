# Espacement Aligné sur les Connexions

## Vue d'ensemble

Le **troisième algorithme d'optimisation** ajuste les positions Y des entités pour que les connexions entre fields consécutifs soient **droites ou descendantes**, éliminant les croisements inutiles.

## Problème résolu

### Avant l'ajustement d'espacement

```
Workspaces (Layer 1):         Layer 2:
┌─────────────┐
│ id          │               Teams (Y=50):
│ teamId      │───────────┐   ┌─────────────┐
│ folderId    │───┐       └──→│ id          │
│ name        │   │           │ name        │
│ createdAt   │   │           └─────────────┘
└─────────────┘   │
                  │           Folders (Y=150):
                  │           ┌─────────────┐
                  └──────────→│ id          │  ← Croisement! ✗
                              │ name        │
                              └─────────────┘
```

**Problème**:
- `teamId` (Y=60) → Teams (Y=50) ✓ Ligne montante OK
- `folderId` (Y=90) → Folders (Y=150) ✗ **Croise** la ligne de `teamId`

### Après l'ajustement d'espacement

```
Workspaces (Layer 1):         Layer 2:
┌─────────────┐
│ id          │               Teams (Y=40):
│ teamId      │──────────────→┌─────────────┐
│ folderId    │───┐           │ id          │  ← Aligné avec teamId
│ name        │   │           │ name        │
│ createdAt   │   │           └─────────────┘
└─────────────┘   │
                  │           Folders (Y=110):
                  └──────────→┌─────────────┐
                              │ id          │  ← Aligné avec folderId
                              │ name        │
                              └─────────────┘
```

**Solution**:
- `teamId` (Y=60) → Teams (Y=40) : Ligne droite/montante
- `folderId` (Y=90) → Folders (Y=110) : Ligne droite/descendante
- **Pas de croisement!** ✓

## Règle fondamentale

Pour deux **fields consécutifs** dans une entité source:
```
Field A (position Y_A)  ───→  Entity X (position Y_X)
Field B (position Y_B)  ───→  Entity Y (position Y_Y)

Si Y_A < Y_B (A au-dessus de B), alors Y_X ≤ Y_Y
```

**En français**: Si le field du haut pointe vers X et le field du bas pointe vers Y, alors X doit être au-dessus (ou égal) à Y.

## Algorithme

### Étape 1: Calculer les positions idéales

Pour chaque entité cible, calculer la position Y idéale basée sur **la moyenne des Y de ses connexions entrantes**:

```typescript
// Connexions entrantes vers l'entité
incomingConnections = [
  { sourceFieldY: 60 },  // teamId
  { sourceFieldY: 100 }  // autre connexion
]

// Position Y moyenne des sources
avgSourceY = (60 + 100) / 2 = 80

// Position Y idéale de l'entité
// (pour aligner le premier field avec avgSourceY)
idealY = avgSourceY - (headerHeight + fieldHeight/2)
idealY = 80 - (50 + 15) = 15
```

### Étape 2: Trier par position idéale

```typescript
sortedEntities = [
  { name: "Teams", idealY: 15 },
  { name: "Folders", idealY: 75 }
].sort((a, b) => a.idealY - b.idealY)
```

### Étape 3: Réassigner les Y avec espacement minimum

```typescript
currentY = 50  // Position de départ
minSpacing = 30

for each entity in sortedEntities:
  newY = max(currentY, entity.idealY)  // Respecter espacement minimum
  entity.y = newY
  currentY = newY + entityHeight + minSpacing
```

**Résultat**:
- Teams: Y = max(50, 15) = 50
- Folders: Y = max(50 + 100 + 30, 75) = 180

## Implémentation

### Fichier principal

**Fichier**: [`src/infrastructure/layout/ConnectionAlignedSpacing.ts`](../src/infrastructure/layout/ConnectionAlignedSpacing.ts)

```typescript
export class ConnectionAlignedSpacing {
  static optimizeSpacing(
    entities: Entity[],
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    layers: Map<number, string[]>,
    entityHeaderHeight: number,
    entityFieldHeight: number
  ): void {
    // Build field connections with Y positions
    const connections = this._buildFieldConnections(...);

    // For each layer, adjust positions
    for each layer:
      this._adjustLayerPositions(...);
  }
}
```

### Construction des connexions

```typescript
private static _buildFieldConnections(...): FieldConnection[] {
  relationships.forEach(rel => {
    // Calculer Y du field source
    sourceFieldY = sourcePos.y + headerHeight +
                   (sourceFieldIndex * fieldHeight) +
                   (fieldHeight / 2);

    // Calculer Y du field cible
    targetFieldY = targetPos.y + headerHeight +
                   (targetFieldIndex * fieldHeight) +
                   (fieldHeight / 2);

    connections.push({
      sourceEntity, sourceField, sourceFieldY,
      targetEntity, targetFieldY
    });
  });
}
```

### Ajustement des positions

```typescript
private static _adjustLayerPositions(...): void {
  // Calculer position idéale pour chaque entité
  layerEntities.forEach(entityName => {
    const incomingConnections = connections.filter(
      conn => conn.targetEntity === entityName
    );

    const avgSourceY = average(incomingConnections.map(c => c.sourceFieldY));
    const firstFieldOffset = headerHeight + fieldHeight / 2;
    const idealY = avgSourceY - firstFieldOffset;

    idealPositions.set(entityName, idealY);
  });

  // Trier et réassigner
  const sorted = entities.sort((a, b) =>
    idealPositions.get(a) - idealPositions.get(b)
  );

  let currentY = 50;
  sorted.forEach(entity => {
    const newY = Math.max(currentY, idealPositions.get(entity.name));
    entityPositions.set(entity.name, { x, y: newY });
    currentY = newY + entityHeight + minSpacing;
  });
}
```

### Intégration dans autoLayout

**Fichier**: [`src/infrastructure/renderers/CanvasRendererAdapter.ts`](../src/infrastructure/renderers/CanvasRendererAdapter.ts)

```typescript
autoLayout(): void {
  // ... Steps 1-5 ...

  // Step 6: Adjust Y spacing to align connections
  ConnectionAlignedSpacing.optimizeSpacing(
    this.entities,
    this.relationships,
    this.entityPositions,
    layers,
    this.entityHeaderHeight,
    this.entityFieldHeight
  );

  // ... render ...
}
```

## Exemple complet

### Données d'entrée

```typescript
Workspaces (Layer 1, Y=100):
  - id (Y=115)
  - teamId (Y=145)      → Teams.id
  - folderId (Y=175)    → Folders.id
  - name (Y=205)

Layer 2 (positions initiales uniformes):
  Teams (Y=50)
  Folders (Y=200)
```

### Calculs

**Teams**:
```
Connexion: Workspaces.teamId (Y=145) → Teams.id
avgSourceY = 145
idealY = 145 - (50 + 15) = 80
```

**Folders**:
```
Connexion: Workspaces.folderId (Y=175) → Folders.id
avgSourceY = 175
idealY = 175 - (50 + 15) = 110
```

### Tri et positionnement

```typescript
sorted = [
  { name: "Teams", idealY: 80 },
  { name: "Folders", idealY: 110 }
]

// Teams
newY = max(50, 80) = 80
currentY = 80 + 100 + 30 = 210

// Folders
newY = max(210, 110) = 210
currentY = 210 + 100 + 30 = 340
```

### Résultat final

```
Teams: Y = 80    → teamId (Y=145) fait une ligne descendante légère ✓
Folders: Y = 210 → folderId (Y=175) fait une ligne montante ✓
```

**Pas de croisement!**

## Complexité

- **Temps**: O(layers × entities × relationships)
  - Linéaire par rapport au nombre de connexions
- **Espace**: O(relationships)

## Avantages

- ✅ **Élimine les croisements inutiles**: Connexions consécutives ne se croisent plus
- ✅ **Lignes droites ou descendantes**: Plus lisible visuellement
- ✅ **Simple et efficace**: Un seul passage suffit
- ✅ **Préserve l'ordre**: Ne change pas l'ordre vertical des entités, juste leurs espacements

## Limitations

- Ne gère que les croisements entre connexions consécutives
- Peut créer de grands espacements si les connexions sont éloignées
- N'optimise pas les croisements entre connexions non-consécutives

## Améliorations possibles

1. **Contraintes de proximité**: Limiter les déplacements pour garder les entités proches
2. **Pondération par distance**: Donner plus de poids aux connexions proches
3. **Optimisation globale**: Minimiser la somme des longueurs de toutes les connexions

---

## Ordre d'exécution des algorithmes

L'espacement aligné est le **dernier algorithme** à s'exécuter:

```
1. HierarchicalLayoutEngine      → Calcul des layers
2. VerticalAlignmentOptimizer    → Ordre vertical (barycentre pondéré)
3. LayoutPositioner              → Positions initiales (espacement uniforme)
4. FieldOrderingOptimizer        → Ordre des fields dans chaque entité
5. ConnectionAlignedSpacing      → Ajustement final des espacements ✓
```

Cette séquence garantit que:
- L'ordre vertical est optimal (basé sur PKs)
- Les fields sont bien ordonnés
- Les espacements sont ajustés pour éviter les croisements

---

## Références

- [Orthogonal Graph Drawing](https://en.wikipedia.org/wiki/Orthogonal_graph_drawing)
- [Edge Routing in Graph Drawing](https://www.graphdrawing.org/)
- [Force-Directed Layouts](https://en.wikipedia.org/wiki/Force-directed_graph_drawing)
