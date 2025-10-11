# Algorithme de Classification Hiérarchique

## Vue d'ensemble

Cet algorithme organise automatiquement les entités d'un diagramme ERP en couches (layers) hiérarchiques, de gauche à droite, en fonction de leurs relations de dépendance.

## Principe de base

L'algorithme utilise une approche **inversée** (left-to-right layout) :

- **Feuilles** (entités qui dépendent d'autres) → Layer 0 (gauche)
- **Racines** (entités dont personne ne dépend) → Layer max (droite)

## Algorithme

### 1. Construction du graphe

Pour chaque relation `A.field > B.field` :
- `A` dépend de `B`
- On ajoute l'arête : `A → B` dans le graphe de dépendances
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

  // Récupérer toutes les dépendances de ce nœud
  dependencies = graph[node] || []

  if (dependencies.length === 0):
    // Ne dépend de personne → c'est une racine
    layerOf[node] = 0
  else:
    // Layer = 1 + max(layer de toutes les dépendances)
    maxDependencyLayer = max(dependencies.map(dep => computeLayer(dep)))
    layerOf[node] = maxDependencyLayer + 1

  return layerOf[node]
```

**Inversion finale** :

Après le calcul, on inverse les layers pour placer les racines à droite :

```typescript
maxLayer = max(layerOf.values())
for each (node, layer) in layerOf:
  layerOf[node] = maxLayer - layer
```

### 3. Exemple concret

Données :
```
posts.authorId > users.id      (posts dépend de users)
comments.postId > posts.id     (comments dépend de posts)
post_tags.tagId > tags.id      (post_tags dépend de tags)
user_roles.userId > users.id   (user_roles dépend de users)
user_roles.roleId > roles.id   (user_roles dépend de roles)
```

**Étape 1 - Calcul initial** :
```
1. users : ne dépend de personne → Layer 0 (racine)
2. roles : ne dépend de personne → Layer 0 (racine)
3. tags : ne dépend de personne → Layer 0 (racine)
4. posts : dépend de users (Layer 0) → Layer 1
5. user_roles : dépend de users (Layer 0) et roles (Layer 0) → Layer 1
6. post_tags : dépend de tags (Layer 0) → Layer 1
7. comments : dépend de posts (Layer 1) → Layer 2
```

**Étape 2 - Inversion** (maxLayer = 2) :
```
1. users : Layer 0 → Layer 2 (droite)
2. roles : Layer 0 → Layer 2 (droite)
3. tags : Layer 0 → Layer 2 (droite)
4. posts : Layer 1 → Layer 1 (milieu)
5. user_roles : Layer 1 → Layer 1 (milieu)
6. post_tags : Layer 1 → Layer 1 (milieu)
7. comments : Layer 2 → Layer 0 (gauche)
```

**Résultat final** :
```
Layer 0 (gauche) : comments, post_tags
Layer 1 (milieu) : posts, user_roles
Layer 2 (droite) : users, roles, tags
```

**Avantage** : `user_roles` est maintenant à distance 1 de `users`, réduisant le nombre de layers nécessaires.

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

Voir [HierarchicalLayoutEngine.ts](../src/infrastructure/layout/HierarchicalLayoutEngine.ts#L55-L120) pour l'implémentation complète.

## Exemple visuel

```
Données:
  comments → posts
  posts → users
  user_roles → users
  user_roles → roles

Calcul initial (forward):
  users: 0, roles: 0
  posts: 1, user_roles: 1
  comments: 2

Après inversion (maxLayer = 2):
  Layer 0 (gauche) : comments, user_roles
  Layer 1 (milieu) : posts
  Layer 2 (droite) : users, roles

Layout horizontal:
  [comments]  -----> [posts] -----> [users]
  [user_roles] ------^--------^---> [roles]
```

## Références

- Algorithme inspiré de : Longest Path DAG (Directed Acyclic Graph)
- Approche : Top-down from leaves (inversé par rapport au standard)
