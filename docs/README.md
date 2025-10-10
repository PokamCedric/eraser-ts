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

**Ligne** : 156-271

#### Étapes

1. **Construction du graphe de dépendances**
   ```typescript
   // Pour chaque relation A → B
   graph[A].push(B)           // A dépend de B
   reverseGraph[B].push(A)    // B est dépendu par A
   ```

2. **Calcul des layers** (algorithme inversé)
   ```typescript
   computeLayer(node):
     dependents = reverseGraph[node]
     if (dependents.length === 0):
       return 0  // Feuille
     else:
       return 1 + max(dependents.map(computeLayer))
   ```

3. **Gestion des entités isolées**
   ```typescript
   // Entités sans relations → layer séparé
   isolatedLayer = max(...layers.keys()) + 1
   ```

4. **Positionnement horizontal**
   ```typescript
   for (layer, entities) in layers:
     x = baseX + layer * horizontalSpacing  // Horizontal (gauche → droite)
     y = verticalCenter + entityIndex * verticalSpacing
   ```

5. **Rendu final**
   ```typescript
   this.fitToScreen()  // Zoom automatique pour tout voir
   ```

### Paramètres de spacing

```typescript
const horizontalSpacing = entityWidth + 120;  // 370px (250 + 120)
const verticalSpacing = 150;                   // 150px entre entités d'un même layer
const baseX = 100;                             // Marge gauche
```

### Exemple visuel

```
baseX = 100
horizontalSpacing = 370

Layer 0 (x=100):          Layer 1 (x=470):        Layer 2 (x=840):
┌─────────────┐           ┌─────────────┐         ┌─────────────┐
│  comments   │ --------> │    posts    │ ------> │    users    │
└─────────────┘           └─────────────┘         └─────────────┘
       ↓ 150px
┌─────────────┐           ┌─────────────┐
│ post_tags   │ --------> │    tags     │
└─────────────┘           └─────────────┘
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
- ✅ **Optimal** : Distance minimale entre entités
- ✅ **Lisible** : Layout gauche → droite naturel
- ✅ **Robuste** : Gère tous les cas (cycles, self-loops, isolés)

---

## Fichiers clés

- **Documentation** : [`docs/hierarchical-layout-algorithm.md`](./hierarchical-layout-algorithm.md)
- **Implémentation** : [`src/infrastructure/renderers/CanvasRendererAdapter.ts`](../src/infrastructure/renderers/CanvasRendererAdapter.ts#L156-L271)
- **Prototype Python** : [`algo2.py`](../algo2.py)

---

## Contribution

Pour toute question ou amélioration de l'algorithme, voir la documentation détaillée dans [`hierarchical-layout-algorithm.md`](./hierarchical-layout-algorithm.md).
