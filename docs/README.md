# Documentation - ERP Visual Designer

## Table des matières

1. [Algorithme de Classification Hiérarchique](#algorithme-de-classification-hiérarchique)
2. [Auto Layout dans CanvasRendererAdapter](#auto-layout-dans-canvasrendereradapter)

---

## Algorithme de Classification Hiérarchique

### Description

L'algorithme organise automatiquement les entités en **couches hiérarchiques** (layers) de gauche à droite, selon leurs relations de dépendance.

📖 **Documentation détaillée** : [hierarchical-layout-algorithm.md](./hierarchical-layout-algorithm.md)

### Principe clé

```
Feuilles (personne n'en dépend) → Layer 0 (GAUCHE)
Racines (beaucoup en dépendent) → Layer max (DROITE)
```

### Exemple

```
Données:
  comments.postId > posts.id
  posts.authorId > users.id
  post_tags.tagId > tags.id

Résultat:
  Layer 0: comments, post_tags
  Layer 1: posts, tags
  Layer 2: users
```

---

## Auto Layout dans CanvasRendererAdapter

### Utilisation

La fonction `autoLayout()` est appelée automatiquement lors du chargement des données :

```typescript
setData(entities: Entity[], relationships: Relationship[]): void {
  this.entities = entities;
  this.relationships = relationships;

  if (this.entities.length > 0) {
    this.autoLayout();  // ← Appel automatique
  }
}
```

### Fonction autoLayout()

**Fichier** : [`src/infrastructure/renderers/CanvasRendererAdapter.ts`](../src/infrastructure/renderers/CanvasRendererAdapter.ts)

**Ligne** : 159-204

#### Étapes

1. **Construction du graphe de dépendances**
   - Module: [`HierarchicalLayoutEngine`](../src/infrastructure/layout/HierarchicalLayoutEngine.ts)
   ```typescript
   // Pour chaque relation A → B
   graph[A].push(B)           // A dépend de B
   reverseGraph[B].push(A)    // B est dépendu par A
   ```

2. **Calcul des layers** (algorithme inversé)
   - Module: [`HierarchicalLayoutEngine`](../src/infrastructure/layout/HierarchicalLayoutEngine.ts)
   ```typescript
   computeLayer(node):
     dependents = reverseGraph[node]
     if (dependents.length === 0):
       return 0  // Feuille
     else:
       return 1 + max(dependents.map(computeLayer))
   ```

3. **Optimisation de l'alignement vertical des entités**
   - Module: [`VerticalAlignmentOptimizer`](../src/infrastructure/layout/VerticalAlignmentOptimizer.ts)
   - Utilise la méthode du **barycentre pondéré** pour réduire les croisements d'arêtes entre entités
   - **Priorité aux Primary Keys**: Les entités connectées à des PKs sont placées plus haut
   ```typescript
   // Weighted barycenter:
   // - Connection à une PK: weight = 0.3 (bias vers le haut)
   // - Connection normale: weight = 1.0

   // 4 itérations: forward → backward → forward → backward
   layers = VerticalAlignmentOptimizer.optimize(layers, relationships, entities, 4)
   ```

4. **Positionnement avec prévention de chevauchement**
   - Module: [`LayoutPositioner`](../src/infrastructure/layout/LayoutPositioner.ts)
   - Calcule la hauteur réelle de chaque entité basée sur le nombre de propriétés
   ```typescript
   entityHeight = headerHeight + fields.length * fieldHeight

   for (layer, entities) in layers:
     x = baseX + layer * horizontalSpacing  // Horizontal (gauche → droite)
     y = currentY
     currentY += entityHeight + verticalSpacing  // Pas de chevauchement
   ```

5. **Optimisation de l'ordre des propriétés**
   - Module: [`FieldOrderingOptimizer`](../src/infrastructure/layout/FieldOrderingOptimizer.ts)
   - Réordonne les fields dans chaque entité pour minimiser les croisements de connexions
   - Utilise également la méthode du barycentre, mais au niveau des fields
   ```typescript
   // Pour chaque field, calculer la position Y moyenne de ses connexions
   barycenter = average(connectedFieldsYPositions)

   // Trier les fields par leur barycentre
   sortedFields = fields.sort((a, b) => barycenterA - barycenterB)

   // 2 itérations: forward → backward
   ```

6. **Rendu final avec connexions au niveau des propriétés**
   - Les relations connectent les propriétés spécifiques (fields) entre entités
   - Positionnement Y calculé selon l'index du field dans l'entité
   ```typescript
   fieldY = entityY + headerHeight + (fieldIndex * fieldHeight) + (fieldHeight / 2)
   ```

### Paramètres de spacing

```typescript
const entityWidth = 250;                           // Largeur d'entité fixe
const entityHeaderHeight = 50;                     // Hauteur du header
const entityFieldHeight = 30;                      // Hauteur par propriété
const horizontalSpacing = entityWidth + 120;       // 370px (250 + 120) entre layers
const verticalSpacing = 30;                        // 30px minimum entre entités d'un même layer
const baseX = 100;                                 // Marge gauche
```

### Exemple visuel

```
baseX = 100
horizontalSpacing = 370

Layer 0 (x=100):          Layer 1 (x=470):        Layer 2 (x=840):
┌─────────────┐           ┌─────────────┐         ┌─────────────┐
│  comments   │           │    posts    │         │    users    │
│─────────────│           │─────────────│         │─────────────│
│ id       🔑 │           │ id       🔑 │         │ id       🔑 │
│ postId   🔗 │ --------> │ authorId 🔗 │ ------> │ displayName │
│ userId   🔗 │           │ content     │         └─────────────┘
│ content     │           └─────────────┘
└─────────────┘
       ↓ 30px minimum (ajusté selon hauteur)
┌─────────────┐           ┌─────────────┐
│ post_tags   │           │    tags     │
│─────────────│           │─────────────│
│ postId   🔗 │ --------> │ id       🔑 │
│ tagId    🔗 │           │ name        │
└─────────────┘           └─────────────┘

Note: Les connexions pointent vers les propriétés spécifiques,
      pas vers les centres des entités
```

### Debug

La console affiche les layers calculés :

```
🧭 Auto Layout Layers (Left → Right)
Number of layers detected: 3
Layer 0: comments, post_tags
Layer 1: posts, tags
Layer 2: users
```

### Avantages

- ✅ **Automatique** : Pas besoin de placer manuellement
- ✅ **Optimal** : Distance minimale entre entités liées
- ✅ **Lisible** : Layout gauche → droite naturel
- ✅ **Robuste** : Gère tous les cas (cycles, self-loops, isolés)
- ✅ **Sans chevauchement** : Hauteurs calculées dynamiquement selon le nombre de propriétés
- ✅ **Connexions précises** : Les relations pointent vers les propriétés spécifiques, pas les centres d'entités
- ✅ **Croisements minimisés (entités)** : Algorithme du barycentre pour optimiser l'alignement vertical
- ✅ **Croisements minimisés (fields)** : Réordonnancement intelligent des propriétés dans chaque entité

---

## Fichiers clés

### Documentation
- **Algorithme de classification hiérarchique** : [`docs/hierarchical-layout-algorithm.md`](./hierarchical-layout-algorithm.md)
- **Alignement vertical pondéré par PK** : [`docs/pk-weighted-vertical-alignment.md`](./pk-weighted-vertical-alignment.md)
- **Optimisation de l'ordre des fields** : [`docs/field-ordering-optimization.md`](./field-ordering-optimization.md)

### Modules de layout
- **Moteur hiérarchique** : [`src/infrastructure/layout/HierarchicalLayoutEngine.ts`](../src/infrastructure/layout/HierarchicalLayoutEngine.ts)
- **Positionneur** : [`src/infrastructure/layout/LayoutPositioner.ts`](../src/infrastructure/layout/LayoutPositioner.ts)
- **Optimiseur vertical (entités)** : [`src/infrastructure/layout/VerticalAlignmentOptimizer.ts`](../src/infrastructure/layout/VerticalAlignmentOptimizer.ts)
- **Optimiseur de l'ordre des fields** : [`src/infrastructure/layout/FieldOrderingOptimizer.ts`](../src/infrastructure/layout/FieldOrderingOptimizer.ts)

### Renderer
- **Adapter Canvas** : [`src/infrastructure/renderers/CanvasRendererAdapter.ts`](../src/infrastructure/renderers/CanvasRendererAdapter.ts)

### Prototypes
- **Prototype Python (algorithme initial)** : [`algo2.py`](../algo2.py)
- **Prototype Python (avec graphe complet)** : [`algo.py`](../algo.py)

---

## Contribution

Pour toute question ou amélioration de l'algorithme, voir la documentation détaillée dans [`hierarchical-layout-algorithm.md`](./hierarchical-layout-algorithm.md).
