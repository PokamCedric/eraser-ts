# Algorithme de Classification Hiérarchique

## Vue d'ensemble

Cet algorithme organise automatiquement les entités d'un diagramme ERP en couches (layers) hiérarchiques, de gauche à droite, en fonction de leurs relations de dépendance.

## Principe de base

L'algorithme utilise une approche **inversée** (top-down from leaves) :

- **Feuilles** (entités dont personne ne dépend) → Layer 0 (gauche)
- **Racines** (entités dont beaucoup dépendent) → Layer max (droite)

## Algorithme

### 1. Construction du graphe

Pour chaque relation `A.field > B.field` :
- `A` dépend de `B`
- On ajoute l'arête : `A → B`
- On construit aussi le graphe inversé : `reverse_graph[B].push(A)`

```typescript
// A → B signifie "A dépend de B"
graph[A] = [B]
reverseGraph[B] = [A]
```

### 2. Calcul des couches (layers)

**Fonction récursive** :

```typescript
computeLayer(node):
  // Déjà calculé ?
  if (layerOf.has(node)) return layerOf[node]

  // Récupérer tous les nœuds qui dépendent de ce nœud
  dependents = reverseGraph[node] || []

  if (dependents.length === 0):
    // Personne ne dépend de ce nœud → c'est une feuille
    layerOf[node] = 0
  else:
    // Layer = 1 + max(layer de tous les dépendants)
    maxDependentLayer = max(dependents.map(dep => computeLayer(dep)))
    layerOf[node] = maxDependentLayer + 1

  return layerOf[node]
```

### 3. Exemple concret

Données :
```
posts.authorId > users.id      (posts dépend de users)
comments.postId > posts.id     (comments dépend de posts)
post_tags.tagId > tags.id      (post_tags dépend de tags)
```

Calcul :
```
1. comments : personne n'en dépend → Layer 0
2. post_tags : personne n'en dépend → Layer 0
3. posts : comments en dépend (Layer 0) → Layer 1
4. tags : post_tags en dépend (Layer 0) → Layer 1
5. users : posts en dépend (Layer 1) → Layer 2
```

Résultat :
```
Layer 0: comments, post_tags    (feuilles)
Layer 1: posts, tags
Layer 2: users                  (racines)
```

## Propriétés garanties

L'algorithme garantit mathématiquement :

1. **Distance >= 1** : Deux entités différentes en relation ne sont jamais au même layer
2. **Distance minimale = 1** : Chaque nœud a au moins une dépendance à distance 1
3. **Placement optimal** : Chaque nœud est placé au layer minimum qui respecte ses contraintes
4. **Self-loops autorisés** : `A → A` est valide

## Cas particuliers

### Entités isolées

Les entités sans aucune relation sont placées dans un layer séparé à la fin :

```typescript
if (!layerOf.has(entity)) {
  isolatedLayer = max(...layers.keys()) + 1
  layerOf[entity] = isolatedLayer
}
```

### Relations circulaires

`A → B` ET `B → A` est **valide**. L'algorithme les place automatiquement dans des layers appropriés.

### Self-loops

`A → A` (ex: `users.managerId > users.id`) est **valide** et n'affecte pas le calcul des layers.

## Complexité

- **Temps** : O(V + E) où V = nombre d'entités, E = nombre de relations
- **Espace** : O(V) pour stocker les layers

## Implémentation

Voir [CanvasRendererAdapter.ts](../src/infrastructure/renderers/CanvasRendererAdapter.ts#L185-L217) pour l'implémentation complète.

## Exemple visuel

```
Données:
  posts → users
  comments → posts
  tags (isolé)

Résultat:
  Layer 0: comments     (gauche)
  Layer 1: posts
  Layer 2: users        (droite)
  Layer 3: tags         (isolé)

Layout horizontal:
  [comments] -----> [posts] -----> [users]     [tags]
```

## Références

- Algorithme inspiré de : Longest Path DAG (Directed Acyclic Graph)
- Approche : Top-down from leaves (inversé par rapport au standard)
