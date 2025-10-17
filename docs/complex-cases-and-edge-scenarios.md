# Cas Complexes et Scénarios Limites

## Vue d'ensemble

Cette documentation explore les cas complexes et limites de l'algorithme Connection-Based Layout, avec des exemples détaillés et des traces d'exécution complètes.

---

## Cas 1 : Conflit de Placement (Layer Skipping)

### Description
Quand on veut placer une entité au layer adjacent (±1), mais ce layer contient déjà une entité **connectée** à celle qu'on veut placer.

**Solution** : Incrémenter/décrémenter jusqu'à trouver un layer sans conflit.

### Exemple : Chaîne avec Branche

```
Relations:
  A → B
  A → C
  B → D
  C → D
  D → E
```

#### Graphe de connexions
```
    A
   / \
  B   C
   \ /
    D
    |
    E
```


---

## Cas 2 : Ordre de Traitement Incorrect (Règle 1 Non Respectée)

### Description
Si on ne suit pas la **Règle 1** de l'étape 2 (prendre une relation connectée), on peut obtenir un ordre de traitement fragmenté qui produit un layout sous-optimal.

### Exemple : Arbre avec Plusieurs Branches

```
Relations:
  root → A
  root → B
  root → C
  A → A1
  A → A2
  B → B1
  C → C1
```

#### Graphe
```
        root
       / | \
      A  B  C
     /|  |  |
   A1 A2 B1 C1
```

#### Ordre CORRECT (Règle 1 appliquée)
```
Connexions:
  root: 3, A: 3, B: 2, C: 2, A1: 1, A2: 1, B1: 1, C1: 1

1. root → A     (Règle 2: root a 3 connexions)
2. root → B     (Règle 1: root traité)
3. root → C     (Règle 1: root traité)
4. A → A1       (Règle 1: A traité, A a 3 connexions > B)
5. A → A2       (Règle 1: A traité)
6. B → B1       (Règle 1: B traité)
7. C → C1       (Règle 1: C traité)
```

**Résultat** :
```
Layer 0: [root]
Layer 1: [A, B, C]
Layer 2: [A1, A2, B1, C1]
```

#### Ordre INCORRECT (Règle 1 ignorée)

Si on traitait dans l'ordre d'apparition :
```
1. root → A
2. root → B
3. root → C
4. A → A1
5. A → A2
6. B → B1
7. C → C1
```

**Même résultat** dans ce cas simple, mais avec un graphe plus complexe :

```
Relations:
  X → Y
  A → B
  Y → Z
  B → C
```

**Sans Règle 1** (ordre d'apparition) :
```
1. X → Y        Layer 0: [X] | Layer 1: [Y]
2. A → B        Layer 0: [X, A] | Layer 1: [Y, B]  (A et X isolés)
3. Y → Z        Layer 0: [X, A] | Layer 1: [Y, B] | Layer 2: [Z]
4. B → C        Layer 0: [X, A] | Layer 1: [Y, B] | Layer 2: [Z, C]
```

**Avec Règle 1** (connexions prioritaires) :
```
1. X → Y        Layer 0: [X] | Layer 1: [Y]
2. Y → Z        Layer 0: [X] | Layer 1: [Y] | Layer 2: [Z]
3. A → B        Layer 0: [X, A] | Layer 1: [Y, B] | Layer 2: [Z]
4. B → C        Layer 0: [X, A] | Layer 1: [Y, B] | Layer 2: [Z, C]
```

**Observation** : La Règle 1 maintient les composantes connexes groupées, évitant la fragmentation.

---

## Cas 3 : Dépendances Bidirectionnelles

### Cas 3.1 : Duplication (Même Relation Écrite Deux Fois)

```
Relations:
  A > B
  B < A
```

**Selon Position Rule** :
- `A > B` → A à gauche, B à droite → `A → B`
- `B < A` → B à gauche, A à droite → `B → A`

#### Trace d'exécution

**STEP 1** :
```
A → B
B → A
```

**STEP 2** :
```
Connexions: A: 2, B: 2

1. A → B        (Règle 2: premier trouvé)
2. B → A        (Règle 1: A et B traités)
```

**STEP 3** :

**Relation 1 : A → B**
- `layer[A] = 0, layer[B] = 1`
- **État** : `Layer 0: [A] | Layer 1: [B]`

**Relation 2 : B → A**
- Cas 4 : Les deux existent (B=1, A=0)
- **Vérification** : layer[B] > layer[A] ? OUI (1 > 0)
- Mais **direction incorrecte** : B → A signifie B doit être à gauche de A
- **Problème** : layer[B] >= layer[A] → Violation
- **Action** : Décaler A et tout >= 0 (sauf B)
- shift_amount = 1 + 1 - 0 = 2
- `layer[A] = 2`
- **État FINAL** : `Layer 0: [none] | Layer 1: [B] | Layer 2: [A]`

Mais attendez, le Layer 0 est vide après le shift. Normalisons :
- **État FINAL** : `Layer 0: [B] | Layer 1: [A]`

**Résultat** : La deuxième relation inverse la première ! C'est une **contradiction**.

**Comportement attendu** : L'algorithme traite les deux relations, la dernière gagne.

### Cas 3.2 : Cycle Triangulaire

```
Relations:
  A → B
  B → C
  C → A
```

#### Graphe
```
A → B
↑   ↓
└─ C
```

#### Trace d'exécution

**STEP 2** :
```
Connexions: A: 2, B: 2, C: 2

1. A → B        (Règle 2: premier trouvé)
2. B → C        (Règle 1: B traité)
3. C → A        (Règle 1: C traité)
```

**STEP 3** :

**Relation 1 : A → B**
- `layer[A] = 0, layer[B] = 1`
- **État** : `Layer 0: [A] | Layer 1: [B]`

**Relation 2 : B → C**
- Cas 3 : Seulement B existe (layer 1)
- target_layer = 1 + 1 = 2
- `layer[C] = 2`
- **État** : `Layer 0: [A] | Layer 1: [B] | Layer 2: [C]`

**Relation 3 : C → A**
- Cas 4 : Les deux existent (C=2, A=0)
- **Vérification** : layer[C] >= layer[A] ? OUI (2 >= 0)
- **Problème** : C doit être à gauche de A, mais A est déjà à gauche
- **Action** : Décaler A et tout >= 0 (sauf C)
- shift_amount = 2 + 1 - 0 = 3
- `layer[A] = 3, layer[B] = 4`
- **État FINAL** : `Layer 0: [none] | Layer 1: [none] | Layer 2: [C] | Layer 3: [A] | Layer 4: [B]`

Normalisation :
- **État FINAL** : `Layer 0: [C] | Layer 1: [A] | Layer 2: [B]`

**Résultat** : Le cycle est "cassé" avec un placement linéaire. La contrainte `C → A` force A à droite, brisant le cycle initial.

**Observation** : Les cycles **ne peuvent pas être respectés** dans un layout unidimensionnel. L'algorithme choisit de respecter l'ordre de traitement.

---

## Cas 4 : Graphe en Diamant avec Convergence Multiple

### Description
Plusieurs chemins menant au même nœud avec des longueurs différentes.

```
Relations:
  A → B
  A → C
  A → D
  B → E
  C → E
  D → E
  E → F
```

#### Graphe
```
    A
  / | \
 B  C  D
  \ | /
    E
    |
    F
```

#### Connexions
```
A: 3, B: 2, C: 2, D: 2, E: 4, F: 1
```

#### Trace d'exécution (STEP 3)

**Relation 1 : A → B**
- `layer[A] = 0, layer[B] = 1`

**Relation 2 : A → C**
- target_layer = 1
- **Conflit** : B connecté à A ? OUI
- Incrémenter → target_layer = 2
- `layer[C] = 2`

**Relation 3 : A → D**
- target_layer = 1
- **Conflit** : B connecté à A ? OUI
- Incrémenter → target_layer = 2
- **Conflit** : C connecté à A ? OUI
- Incrémenter → target_layer = 3
- `layer[D] = 3`

**État** : `Layer 0: [A] | Layer 1: [B] | Layer 2: [C] | Layer 3: [D]`

**Relation 4 : B → E**
- target_layer = 2
- **Conflit** : C connecté à B ? NON (C connecté à A, pas B)
- Mais E sera connecté à C (relation 5 à venir)
- Pour l'instant, `layer[E] = 2`
- **Problème** : E et C dans le même layer !

**État** : `Layer 0: [A] | Layer 1: [B] | Layer 2: [C, E] | Layer 3: [D]`

**Relation 5 : C → E**
- Cas 4 : Les deux existent (C=2, E=2)
- **Violation** : même layer !
- **Action** : Décaler E
- shift_amount = 2 + 1 - 2 = 1
- `layer[E] = 3, layer[D] = 4`

**État** : `Layer 0: [A] | Layer 1: [B] | Layer 2: [C] | Layer 3: [E] | Layer 4: [D]`

**Relation 6 : D → E**
- Cas 4 : Les deux existent (D=4, E=3)
- **Vérification** : layer[D] >= layer[E] ? OUI (4 >= 3)
- **Violation** : D doit être à gauche de E
- **Action** : Décaler E
- shift_amount = 4 + 1 - 3 = 2
- `layer[E] = 5`

**État** : `Layer 0: [A] | Layer 1: [B] | Layer 2: [C] | Layer 3: [none] | Layer 4: [D] | Layer 5: [E]`

**Relation 7 : E → F**
- target_layer = 6
- `layer[F] = 6`

**État FINAL (après normalisation)** :
```
Layer 0: [A]
Layer 1: [B]
Layer 2: [C]
Layer 3: [D]
Layer 4: [E]
Layer 5: [F]
```

**Observation** : Le diamant crée un layout très étalé car les conflits successifs forcent les décalages.

---

## Cas 5 : Graphe Fortement Connecté (Clique)

### Description
Tous les nœuds sont connectés entre eux.

```
Relations:
  A → B
  A → C
  B → C
  B → A
  C → A
  C → B
```

#### Connexions
```
A: 4, B: 4, C: 4
```

#### Résultat Attendu
Impossible de placer dans des layers adjacents. Chaque nœud doit être dans un layer différent.

**État FINAL** : `Layer 0: [?] | Layer 1: [?] | Layer 2: [?] | ...`

Selon l'ordre de traitement, on obtient un placement linéaire avec beaucoup de décalages.

---

## Cas 6 : Graphe Biparti

### Description
Deux groupes d'entités où chaque entité du groupe A est connectée à toutes les entités du groupe B.

```
Relations:
  A1 → B1
  A1 → B2
  A2 → B1
  A2 → B2
```

#### Graphe
```
A1 ─┬─→ B1
    └─→ B2
A2 ─┬─→ B1
    └─→ B2
```

#### Résultat Attendu
```
Layer 0: [A1, A2]
Layer 1: [B1, B2]
```

**Observation** : Les entités du même groupe peuvent cohabiter car elles ne sont pas connectées entre elles.

---

## Autres Cas Spéciaux Identifiés

### Cas 7 : Entités avec Connexions Asymétriques
Une entité avec beaucoup de connexions sortantes mais peu entrantes.

### Cas 8 : Graphe en Étoile
Un nœud central connecté à tous les autres, mais les autres ne sont pas connectés entre eux.

```
    B
    |
C - A - D
    |
    E
```

**Résultat** :
```
Layer 0: [B, C, D, E]
Layer 1: [A]
```

### Cas 9 : Chaîne Longue avec Branche Courte
Une longue chaîne (A → B → C → D → E) avec une branche courte (A → Z).

**Résultat** :
```
Layer 0: [A]
Layer 1: [B, Z]
Layer 2: [C]
Layer 3: [D]
Layer 4: [E]
```

---

## Recommandations

1. **Éviter les cycles** : Restructurer le modèle pour éliminer les dépendances circulaires
2. **Grouper logiquement** : Utiliser l'ordre d'écriture pour contrôler le placement
3. **Tester l'ordre** : Expérimenter avec différents ordres de relations
4. **Accepter les compromis** : Dans les graphes complexes, un layout parfait n'existe pas toujours

---

## Conclusion

L'algorithme Connection-Based gère la plupart des cas complexes de manière gracieuse, mais certains graphes (cycles, cliques) produisent des layouts sous-optimaux. C'est un compromis acceptable pour maintenir la simplicité et la robustesse de l'algorithme.
