# Connection-Based Layout Algorithm

## Vue d'ensemble

L'algorithme **Connection-Based Layout** est un algorithme de placement d'entités en couches (layers) qui se base sur les connexions entre entités plutôt que sur une hiérarchie stricte.

### Philosophie

- **Position Rule** : L'ordre d'écriture détermine la direction (gauche → droite)
- **Connection First** : Les entités avec le plus de connexions sont traitées en priorité
- **Conflict Avoidance** : Les entités connectées ne peuvent jamais cohabiter dans le même layer
- **Distance Minimization** : Distance minimale = 1 layer entre entités connectées

---

## Les 3 Étapes de l'Algorithme

```
STEP 1: Parse Relations (Position Rule)
   ↓
STEP 2: Order Relations (Connection Priority)
   ↓
STEP 3: Build Layers (Incremental Placement)
```

---

## STEP 1: Parse Relations (Position Rule)

### Objectif
Parser les relations et appliquer la **Position Rule** pour déterminer la direction.

### Position Rule (Règle de Direction)

**Principe fondamental** : Le **premier élément écrit** est TOUJOURS à gauche. Le symbole (`>`, `<`, `-`, `<>`) **n'a AUCUN effet** sur la direction !

#### Exemples

```
A > B  →  A à gauche, B à droite
A < B  →  A à gauche, B à droite (PAS B à gauche !)
A - B  →  A à gauche, B à droite
A <> B →  A à gauche, B à droite
B - A  →  B à gauche, A à droite
```

#### Pourquoi cette règle ?

- **Simplicité** : Pas besoin d'interpréter les symboles
- **Contrôle utilisateur** : L'utilisateur décide de la direction en choisissant l'ordre d'écriture
- **Philosophie** : Une relation n'indique pas de sens intrinsèque

### Sortie de l'étape 1

Liste de relations directionnelles : `(left, right)`

**Exemple :**
```
Input:
  users.profileId - profiles.id
  posts.authorId > users.id
  users.id > teams.id

Output:
  users → profiles
  posts → users
  users → teams
```

---

## STEP 2: Order Relations (Connection Priority)

### Objectif
Déterminer l'**ordre de traitement** des relations en utilisant deux règles de priorité.

### Règle 1 : Relations Connectées
Si une relation connecte une entité **déjà traitée**, elle a la priorité.

**Critère de tri** : Nombre de connexions (maximum en premier)

### Règle 2 : Démarrage
Si aucune relation n'est connectée aux entités déjà traitées, commencer par l'entité avec le **plus de connexions**.

### Algorithme

```
1. Compter les connexions de chaque entité
2. Initialiser : processed_entities = {}, ordered_relations = []
3. Tant qu'il reste des relations:
   a. Chercher les relations connectées aux entités déjà traitées
   b. Si trouvées:
      - Trier par nombre de connexions (max)
      - Prendre la première
   c. Sinon (démarrage):
      - Trier toutes les relations par nombre de connexions (max)
      - Prendre la première
   d. Ajouter à ordered_relations
   e. Marquer les entités comme traitées
```

### Exemple Complet

#### Input
```
1. users → profiles
2. posts → users
3. users → teams
4. comments → posts
5. tags → users
6. post_tags → posts
7. post_tags → tags
8. user_roles → users
9. user_roles → roles
10. role_permissions → roles
11. role_permissions → permissions
```

#### Comptage des connexions
```
users: 5 connexions (1, 2, 3, 5, 8)
posts: 3 connexions (2, 4, 6)
profiles: 1 connexion (1)
teams: 1 connexion (3)
tags: 2 connexions (5, 7)
comments: 1 connexion (4)
post_tags: 2 connexions (6, 7)
user_roles: 2 connexions (8, 9)
roles: 2 connexions (9, 10)
role_permissions: 2 connexions (10, 11)
permissions: 1 connexion (11)
```

#### Ordre final (Step 2)
```
1. users → profiles       (Règle 2: users a 5 connexions - maximum)
2. posts → users          (Règle 1: users déjà traité, posts a 3 connexions)
3. users → teams          (Règle 1: users déjà traité)
4. tags → users           (Règle 1: users déjà traité)
5. user_roles → users     (Règle 1: users déjà traité)
6. comments → posts       (Règle 1: posts déjà traité)
7. post_tags → posts      (Règle 1: posts déjà traité)
8. post_tags → tags       (Règle 1: post_tags et tags déjà traités)
9. user_roles → roles     (Règle 1: user_roles déjà traité)
10. role_permissions → roles     (Règle 1: roles déjà traité)
11. role_permissions → permissions (Règle 1: role_permissions déjà traité)
```

---

## STEP 3: Build Layers (Incremental Placement)

### Objectif
Construire les layers en plaçant chaque relation de manière incrémentale.

### Les 3 Règles Fondamentales

#### Règle 1 : Non-Cohabitation
**Deux entités connectées ne peuvent JAMAIS être dans le même layer.**

#### Règle 2 : Distance Minimale avec Vérification de Conflits
**Distance minimale = 1 layer**, mais il faut vérifier qu'il n'y a pas de conflit.

**Conflit** : Un layer contient une entité connectée à l'entité qu'on veut placer.

**Solution** :
- Si placement à **droite** (right) → **incrémenter** jusqu'à trouver un layer sans conflit
- Si placement à **gauche** (left) → **décrémenter** jusqu'à trouver un layer sans conflit

#### Règle 3 : Direction
**Left** est toujours à gauche de **Right** (layer(left) < layer(right))

### Les 4 Cas de Placement

#### Cas 1 : Ni left ni right n'existent
```
Action:
  layer[left] = 0
  layer[right] = 1
```

#### Cas 2 : Seulement right existe
```
Action:
  1. target_layer = layer[right] - 1
  2. valid_layer = findValidLayer(left, target_layer, direction='left')
  3. layer[left] = valid_layer
  4. Normaliser si layers négatifs
```

**findValidLayer avec direction='left'** :
- Vérifier si target_layer contient des entités connectées à `left`
- Si conflit → **décrémenter** et revérifier
- Sinon → retourner target_layer

#### Cas 3 : Seulement left existe
```
Action:
  1. target_layer = layer[left] + 1
  2. valid_layer = findValidLayer(right, target_layer, direction='right')
  3. layer[right] = valid_layer
```

**findValidLayer avec direction='right'** :
- Vérifier si target_layer contient des entités connectées à `right`
- Si conflit → **incrémenter** et revérifier
- Sinon → retourner target_layer

#### Cas 4 : Les deux existent
```
Action:
  Si layer[left] >= layer[right]:
    1. shift_amount = layer[left] + 1 - layer[right]
    2. Pour chaque entité:
       Si layer[entité] >= layer[right]:
         layer[entité] += shift_amount
```

### Normalisation des Layers

Si après un placement, le layer minimum est négatif :
```
shift = -min_layer
Pour chaque entité:
  layer[entité] += shift
```

Cela garantit que tous les layers sont >= 0.

---

## Scénario Complet : Système RBAC

### Input Relations

```
1. users.profileId - profiles.id
2. posts.authorId > users.id
3. users.id > teams.id
4. comments.postId > posts.id
5. tags.userId > users.id
6. post_tags.postId > posts.id
7. post_tags.tagId > tags.id
8. user_roles.userId > users.id
9. user_roles.roleId > roles.id
10. role_permissions.roleId > roles.id
11. role_permissions.permissionId > permissions.id
```

### STEP 1 : Parse (Position Rule)

```
users → profiles
posts → users
users → teams
comments → posts
tags → users
post_tags → posts
post_tags → tags
user_roles → users
user_roles → roles
role_permissions → roles
role_permissions → permissions
```

### STEP 2 : Order (déjà montré ci-dessus)

```
Ordre final:
1. users → profiles
2. posts → users
3. users → teams
4. tags → users
5. user_roles → users
6. comments → posts
7. post_tags → posts
8. post_tags → tags
9. user_roles → roles
10. role_permissions → roles
11. role_permissions → permissions
```

### STEP 3 : Build Layers (Trace complète)

#### Relation 1 : users → profiles
- **Cas 1** : Ni users ni profiles n'existent
- Action : `layer[users] = 0`, `layer[profiles] = 1`
- **Résultat** : `Layer 0: [users] | Layer 1: [profiles]`

#### Relation 2 : posts → users
- **Cas 2** : Seulement users existe (layer 0)
- Action :
  - target_layer = 0 - 1 = -1
  - Aucun conflit au layer -1 (vide)
  - `layer[posts] = -1`
  - **Normalisation** : min = -1, shift = 1
  - `layer[posts] = 0`, `layer[users] = 1`, `layer[profiles] = 2`
- **Résultat** : `Layer 0: [posts] | Layer 1: [users] | Layer 2: [profiles]`

#### Relation 3 : users → teams
- **Cas 3** : Seulement users existe (layer 1)
- Action :
  - target_layer = 1 + 1 = 2
  - Layer 2 contient profiles
  - profiles connecté à users ? OUI (relation 1)
  - **Conflit** → incrémenter : target_layer = 3
  - Layer 3 vide → aucun conflit
  - `layer[teams] = 3`
  - Mais profiles et teams peuvent cohabiter (pas connectés)
  - Réajustement : `layer[teams] = 2` (pas de conflit avec profiles)
- **Résultat** : `Layer 0: [posts] | Layer 1: [users] | Layer 2: [profiles, teams]`

#### Relation 4 : tags → users
- **Cas 2** : Seulement users existe (layer 1)
- Action :
  - target_layer = 1 - 1 = 0
  - Layer 0 contient posts
  - posts connecté à tags ? NON
  - `layer[tags] = 0`
- **Résultat** : `Layer 0: [posts, tags] | Layer 1: [users] | Layer 2: [profiles, teams]`

#### Relation 5 : user_roles → users
- **Cas 2** : Seulement users existe (layer 1)
- Action :
  - target_layer = 0
  - posts et tags connectés à user_roles ? NON
  - `layer[user_roles] = 0`
- **Résultat** : `Layer 0: [posts, tags, user_roles] | Layer 1: [users] | Layer 2: [profiles, teams]`

#### Relation 6 : comments → posts
- **Cas 2** : Seulement posts existe (layer 0)
- Action :
  - target_layer = -1
  - Aucun conflit
  - `layer[comments] = -1`
  - **Normalisation** : shift = 1
- **Résultat** : `Layer 0: [comments] | Layer 1: [posts, tags, user_roles] | Layer 2: [users] | Layer 3: [profiles, teams]`

#### Relation 7 : post_tags → posts
- **Cas 2** : Seulement posts existe (layer 1)
- Action :
  - target_layer = 0
  - comments connecté à post_tags ? NON
  - `layer[post_tags] = 0`
- **Résultat** : `Layer 0: [comments, post_tags] | Layer 1: [posts, tags, user_roles] | Layer 2: [users] | Layer 3: [profiles, teams]`

#### Relation 8 : post_tags → tags
- **Cas 4** : Les deux existent (post_tags=0, tags=1)
- Action : layer[post_tags] < layer[tags] → OK, aucun changement
- **Résultat** : `Layer 0: [comments, post_tags] | Layer 1: [posts, tags, user_roles] | Layer 2: [users] | Layer 3: [profiles, teams]`

#### Relation 9 : user_roles → roles
- **Cas 3** : Seulement user_roles existe (layer 1)
- Action :
  - target_layer = 2
  - users connecté à roles ? NON
  - `layer[roles] = 2`
- **Résultat** : `Layer 0: [comments, post_tags] | Layer 1: [posts, tags, user_roles] | Layer 2: [users, roles] | Layer 3: [profiles, teams]`

#### Relation 10 : role_permissions → roles
- **Cas 2** : Seulement roles existe (layer 2)
- Action :
  - target_layer = 1
  - posts, tags, user_roles connectés à role_permissions ? NON
  - `layer[role_permissions] = 1`
- **Résultat** : `Layer 0: [comments, post_tags] | Layer 1: [posts, tags, user_roles, role_permissions] | Layer 2: [users, roles] | Layer 3: [profiles, teams]`

#### Relation 11 : role_permissions → permissions
- **Cas 3** : Seulement role_permissions existe (layer 1)
- Action :
  - target_layer = 2
  - users, roles connectés à permissions ? NON
  - `layer[permissions] = 2`
- **Résultat FINAL** :
  ```
  Layer 0: [comments, post_tags]
  Layer 1: [posts, tags, user_roles, role_permissions]
  Layer 2: [users, roles, permissions]
  Layer 3: [profiles, teams]
  ```

---

## Gestion des Cas Spéciaux

### Entités Isolées
Les entités sans connexion sont placées dans le layer le plus à droite (max layer + 1).

### Dépendances Circulaires
L'algorithme **ne plante pas** sur les cycles. Il place les entités selon l'ordre de traitement, ce qui peut créer des layers qui ne respectent pas parfaitement toutes les contraintes.

**Exemple de cycle** :
```
A → B → C → A
```

L'algorithme va traiter dans l'ordre et placer les entités. Le cycle sera détecté mais géré gracieusement.

### Conflits Bidirectionnels

**Cas 1** : Même relation écrite deux fois
```
A > B
B < A
```
→ Les deux seront traitées séparément (duplication)

**Cas 2** : Cycle triangulaire
```
A > B
B > C
C > A
```
→ Impossible à résoudre parfaitement. L'algorithme placera selon l'ordre de traitement.

---

## Complexité

- **STEP 1** : O(n) où n = nombre de relations
- **STEP 2** : O(n × m) où m = nombre d'entités (tri répété)
- **STEP 3** : O(n × m × k) où k = nombre moyen d'entités par layer (vérification des conflits)

**Complexité totale** : O(n × m × k)

Pour des graphes typiques (m ≈ n), cela reste raisonnable.

---

## Comparaison avec l'Algorithme Hiérarchique

| Critère | Connection-Based | Hierarchical |
|---------|------------------|--------------|
| **Principe** | Connexions en priorité | Dépendances strictes |
| **Direction** | Position Rule (ordre d'écriture) | Champs (id vs foreign key) |
| **Cycles** | Gère gracieusement | Peut créer des problèmes |
| **Résultat** | Plus compact (entités proches) | Plus étalé (hiérarchie stricte) |
| **Use Case** | Schémas complexes avec beaucoup de connexions | Schémas strictement hiérarchiques |

---

## Implémentation

### TypeScript
`src/infrastructure/layout/ConnectionBasedLayoutEngine.ts`

### Python (Prototype)
`python_test/algo.py`

### Tests
`src/infrastructure/layout/ConnectionBasedLayoutEngine.test.ts`

**9 suites de tests** couvrant tous les cas d'usage.

---

## Conclusion

L'algorithme **Connection-Based Layout** est conçu pour :
- ✅ Gérer des schémas complexes avec de nombreuses connexions
- ✅ Respecter l'ordre d'écriture de l'utilisateur (Position Rule)
- ✅ Minimiser les distances entre entités connectées
- ✅ Gérer gracieusement les cycles et conflits
- ✅ Produire des layouts compacts et lisibles
