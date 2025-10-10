# Alignement Vertical Pondéré par Primary Key

## Vue d'ensemble

L'optimiseur d'alignement vertical utilise la méthode du **barycentre pondéré** pour placer les entités dans chaque layer. Les connexions vers ou depuis des **Primary Keys** reçoivent un poids plus fort, ce qui les tire vers le haut.

## Problème résolu

### Avant l'optimisation pondérée

```
Users (Layer 2):              Profiles (Layer 3):
┌─────────────┐               ┌─────────────┐
│ id 🔑       │───────┐       │ id 🔑       │
│ profileId   │───┐   │       │ userId      │
│ username    │   │   │       │ bio         │
│ email       │   │   │       │ avatar      │
└─────────────┘   │   │       └─────────────┘
                  │   │
                  │   │       Teams (Layer 3):
                  │   │       ┌─────────────┐
                  │   └──────→│ id 🔑       │  ← En bas (problème!)
                  └──────────→│ name        │
                              │ description │
                              └─────────────┘
```

**Problème**:
- `Users.id` (PK) → `Teams.id` : Position haute dans Users
- `Users.profileId` (non-PK) → `Profiles.id` : Position basse dans Users
- Mais `Teams` est placé **en bas**, créant un croisement

### Après l'optimisation pondérée

```
Users (Layer 2):              Teams (Layer 3):
┌─────────────┐               ┌─────────────┐
│ id 🔑       │──────────────→│ id 🔑       │  ← En haut! ✓
│ profileId   │───┐           │ name        │
│ username    │   │           │ description │
│ email       │   │           └─────────────┘
└─────────────┘   │
                  │           Profiles (Layer 3):
                  │           ┌─────────────┐
                  └──────────→│ id 🔑       │  ← En bas ✓
                              │ userId      │
                              │ bio         │
                              │ avatar      │
                              └─────────────┘
```

**Solution**: Teams est placé **plus haut** que Profiles car la connexion vient d'une Primary Key.

## Algorithme

### Principe : Barycentre Pondéré

Au lieu de calculer la position moyenne simple, on pondère chaque connexion :

```typescript
// Barycentre simple (ancien):
barycenter = sum(positions) / count

// Barycentre pondéré (nouveau):
barycenter = sum(position * weight) / sum(weight)
```

### Poids des connexions

```typescript
// Si la connexion vient d'une Primary Key
if (sourceField.isPrimaryKey) {
  weight = 0.3;  // Valeur plus petite = tire vers le haut
} else {
  weight = 1.0;  // Valeur normale
}
```

**Pourquoi 0.3 tire vers le haut ?**
- Les positions sont indexées de 0 (haut) à N (bas)
- Un poids plus petit réduit l'influence des positions hautes
- Résultat : le barycentre est biaisé vers les positions basses (indices petits = haut)

### Exemple de calcul

```typescript
Situation:
  Teams est connecté à:
    - Users.id (PK, position 0 dans layer 2)
    - Posts.id (PK, position 1 dans layer 2)

Calcul du barycentre:
  weightedSum = (0 * 0.3) + (1 * 0.3) = 0.3
  totalWeight = 0.3 + 0.3 = 0.6
  barycenter = 0.3 / 0.6 = 0.5

Vs barycentre simple:
  barycenter = (0 + 1) / 2 = 0.5

Situation avec mix:
  Profiles est connecté à:
    - Users.profileId (non-PK, position 1 dans layer 2)
    - Settings.profileId (non-PK, position 3 dans layer 2)

Calcul du barycentre:
  weightedSum = (1 * 1.0) + (3 * 1.0) = 4.0
  totalWeight = 1.0 + 1.0 = 2.0
  barycenter = 4.0 / 2.0 = 2.0

Résultat: Teams (0.5) sera placé AVANT Profiles (2.0) ✓
```

## Implémentation

### Fichier principal

**Fichier**: [`src/infrastructure/layout/VerticalAlignmentOptimizer.ts`](../src/infrastructure/layout/VerticalAlignmentOptimizer.ts)

```typescript
private static _calculateWeightedBarycenter(
  entity: string,
  referenceLayer: string[],
  relationships: Relationship[],
  entityMap: Map<string, Entity>
): number {
  const weightedPositions: { position: number; weight: number }[] = [];

  relationships.forEach(rel => {
    // Déterminer si connexion vient d'une PK
    const sourceEntity = entityMap.get(rel.from.entity);
    const field = sourceEntity?.fields.find(f => f.name === rel.from.field);
    const isPrimaryKeyConnection = field?.isPrimaryKey ?? false;

    // Appliquer le poids
    const weight = isPrimaryKeyConnection ? 0.3 : 1.0;
    weightedPositions.push({ position, weight });
  });

  // Calculer la moyenne pondérée
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
```

### Intégration dans autoLayout

**Fichier**: [`src/infrastructure/renderers/CanvasRendererAdapter.ts`](../src/infrastructure/renderers/CanvasRendererAdapter.ts)

```typescript
// Step 3: Optimize vertical alignment with PK weighting
layers = VerticalAlignmentOptimizer.optimize(
  layers,
  this.relationships,
  this.entities,  // Nécessaire pour détecter les PKs
  4  // iterations
);
```

## Règles de priorité

### Ordre de tri dans un layer

1. **Entités connectées à des PKs** → Placées en haut (barycentre plus petit)
2. **Entités connectées à des non-PKs** → Placées plus bas (barycentre plus grand)
3. **Entités sans connexions** → Position médiane (middle of layer)

### Exemple complet

```typescript
Layer 2: [Users, Posts, Settings]
Layer 3: à organiser

Connexions:
  - Teams → Users.id (PK)           weight = 0.3
  - Profiles → Users.profileId      weight = 1.0
  - Comments → Posts.id (PK)        weight = 0.3
  - Tags → Settings.tagField        weight = 1.0

Barycenters (Users à index 0, Posts à index 1, Settings à index 2):
  - Teams: (0 * 0.3) / 0.3 = 0.0
  - Comments: (1 * 0.3) / 0.3 = 1.0
  - Profiles: (0 * 1.0) / 1.0 = 0.0  (mais poids normal)
  - Tags: (2 * 1.0) / 1.0 = 2.0

Tri final:
  Layer 3: [Teams, Profiles, Comments, Tags]

Note: Teams avant Profiles car même barycenter mais weight plus prioritaire
```

## Complexité

- **Temps**: O(iterations × layers × entities × relationships)
  - Identique à l'algorithme non-pondéré
- **Espace**: O(entities × relationships)

## Paramètres ajustables

### Weight ratio

Actuellement:
```typescript
const PK_WEIGHT = 0.3;   // Connexions à PK
const NORMAL_WEIGHT = 1.0; // Connexions normales
```

Vous pouvez ajuster ces valeurs:
- **Plus petit PK_WEIGHT** (ex: 0.1) = Priorité encore plus forte aux PKs
- **Plus grand PK_WEIGHT** (ex: 0.7) = Priorité plus faible aux PKs

### Nombre d'itérations

```typescript
layers = VerticalAlignmentOptimizer.optimize(layers, rels, entities, 4);
//                                                                     ^^
//                                                          Augmenter pour meilleure convergence
```

## Avantages

- ✅ **Respecte la convention ERD**: Primary Keys en haut → connexions en haut
- ✅ **Minimise les croisements**: Les connexions importantes (PKs) sont prioritaires
- ✅ **Converge rapidement**: 4 itérations suffisent
- ✅ **Configurable**: Ajustable via le weight ratio

## Limitations

- Ne garantit pas zéro croisements (problème NP-complet)
- Les entités sans connexions sont placées au milieu (pas optimal)
- Le weight ratio est fixe (pourrait être dynamique)

## Améliorations possibles

1. **Weight dynamique**: Calculer le poids selon le nombre de connexions PKs vs non-PKs
2. **Pénalité de distance**: Ajouter une pénalité si la connexion traverse plusieurs entités
3. **Foreign Keys**: Donner un poids intermédiaire aux FKs (entre PK et normal)

---

## Références

- [Weighted Barycenter Method](https://en.wikipedia.org/wiki/Barycentric_coordinate_system)
- [Sugiyama Framework - Layer Assignment](https://en.wikipedia.org/wiki/Layered_graph_drawing)
- [Graph Drawing: Entity-Relationship Diagrams](https://www.graphdrawing.org/)
