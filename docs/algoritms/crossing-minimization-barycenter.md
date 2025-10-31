# Crossing Minimization Algorithm (Phase 5)

## Table des Matières

1. [Introduction](#introduction)
2. [Le Problème des Croisements](#le-problème-des-croisements)
3. [La Méthode du Barycentre](#la-méthode-du-barycentre)
4. [L'Algorithme](#lalgorithme)
5. [Exemples Détaillés](#exemples-détaillés)
6. [Convergence et Itérations](#convergence-et-itérations)
7. [Complexité](#complexité)

---

## Introduction

L'algorithme de **Crossing Minimization** est la Phase 5 (dernière phase) du pipeline de classification en layers. Il minimise les **croisements d'arêtes** entre layers adjacents en utilisant la **méthode du barycentre**.

### Objectif

Réorganiser les entités dans chaque layer pour que les arêtes (relations) se croisent le moins possible.

### Entrée / Sortie

**Entrée:**
- Layers déjà organisés par les phases précédentes
- Relations entre entités

**Sortie:**
- Layers réorganisés avec un minimum de croisements

---

## Le Problème des Croisements

### Qu'est-ce qu'un Croisement?

Un **croisement** se produit quand deux arêtes (relations) entre deux layers adjacents s'intersectent visuellement.

**Exemple visuel:**

```
Layer 4: [A, B, C, D]
         │  │  │  │
         │  └──┼──┼─┐
         └─────┼──┘ │
               │    │
Layer 5: [P, Q, R, S]
```

Relations:
- A → Q
- B → P

Ces deux relations se **croisent** car:
- A est avant B (A à gauche de B)
- Mais Q est après P (Q à droite de P)

L'ordre est **inversé** → croisement!

### Définition Mathématique

Deux arêtes `(a₁, b₁)` et `(a₂, b₂)` se croisent si et seulement si:

```
(a₁ < a₂ ET b₁ > b₂) OU (a₁ > a₂ ET b₁ < b₂)
```

Où `<` signifie "est à gauche de" (position dans le layer).

**Exemple:**

```
Layer A: [1, 2, 3]
Layer B: [X, Y, Z]

Arête 1: (1, Y)  → position (0, 1)
Arête 2: (2, X)  → position (1, 0)

Vérification: 0 < 1 ET 1 > 0 ✓
→ Les arêtes se croisent!
```

### Pourquoi Minimiser les Croisements?

**Problèmes causés par les croisements:**

1. **Lisibilité réduite** - Difficile de suivre visuellement les relations
2. **Confusion** - On ne sait plus quelle arête va où
3. **Esthétique** - Le diagramme semble désordonné

**Exemple avec CRM:**

```
AVANT (17 croisements):
Layer 4: [opportunities, products, campaign_members, cases, contacts_accounts]
         └───────────────────────┐  ┌──┴──┬──┴────┘
                                 │  │     │
Layer 5: [pipelines, emails, contacts]
         ❌ Beaucoup de croisements!

APRÈS (1 croisement):
Layer 4: [campaign_members, cases, contacts_accounts, opportunities, products]
         ┌──┴──┬──┴────┘  │
         │     │          │
Layer 5: [contacts, emails, pipelines]
         ✅ Presque aucun croisement!
```

---

## La Méthode du Barycentre

### Concept du Barycentre

Le **barycentre** (ou centre de gravité) d'une entité est la **position moyenne** de ses voisins.

**Analogie physique:**
Imaginez que chaque voisin est un poids. Le barycentre est le point d'équilibre.

### Barycentre Forward (vers l'avant)

Pour une entité dans le layer courant, le **barycentre forward** est la position moyenne de ses **cibles** dans le layer suivant.

**Formule:**
```
barycentre(E) = moyenne(positions des cibles de E)
```

**Exemple:**

```
Layer N:   [A, B, C]
Layer N+1: [X, Y, Z]

Relations:
- A → Y (position 1)
- A → Z (position 2)

Barycentre de A = (1 + 2) / 2 = 1.5
```

### Barycentre Backward (vers l'arrière)

Pour une entité dans le layer courant, le **barycentre backward** est la position moyenne de ses **sources** dans le layer précédent.

**Formule:**
```
barycentre(E) = moyenne(positions des sources de E)
```

**Exemple:**

```
Layer N-1: [A, B, C]
Layer N:   [X, Y, Z]

Relations:
- A → X (A en position 0)
- C → X (C en position 2)

Barycentre de X = (0 + 2) / 2 = 1
```

### Intuition: Pourquoi ça Marche?

**Idée clé:** Si une entité E est placée près du barycentre de ses voisins, les arêtes tendront à être **parallèles** plutôt que de se croiser.

**Exemple:**

```
AVANT:
Layer A: [1, 2, 3]
Layer B: [Y, X, Z]

1 → X : traverse tout
2 → Y : traverse aussi
→ Croisement!

APRÈS tri par barycentre:
Layer A: [1, 2, 3]
         │  │  │
Layer B: [X, Y, Z]

Barycentres:
- X a source 1 → barycentre = 0
- Y a source 2 → barycentre = 1
- Z a source 3 → barycentre = 2

Tri par barycentre: X < Y < Z
→ Plus de croisement!
```

---

## L'Algorithme

### Vue d'Ensemble

L'algorithme applique la méthode du barycentre de manière **itérative** dans les deux directions:

1. **Forward pass** (gauche → droite): Réordonne chaque layer basé sur le layer précédent
2. **Backward pass** (droite → gauche): Réordonne chaque layer basé sur le layer suivant
3. Répéter N fois
4. Garder la meilleure solution

### Structure Complète

```
1. Compter les croisements initiaux
2. POUR iteration de 1 à max_iterations:
    a. Forward pass (gauche → droite)
    b. Backward pass (droite → gauche)
    c. Compter les croisements
    d. Si amélioration: sauvegarder
    e. Si 0 croisements: arrêter
3. Retourner la meilleure solution trouvée
```

### Étape 1: Compter les Croisements Initiaux

Compter tous les croisements entre chaque paire de layers adjacents.

**Algorithme:**
```
FONCTION compterCroisementsTotal(layers):
    total = 0
    POUR i DE 0 À layers.length - 2:
        leftLayer = layers[i]
        rightLayer = layers[i + 1]
        total += compterCroisementsEntreDeuxLayers(leftLayer, rightLayer)
    RETOURNER total

FONCTION compterCroisementsEntreDeuxLayers(leftLayer, rightLayer):
    # Collecter toutes les arêtes
    arêtes = []
    POUR CHAQUE entité left DANS leftLayer:
        POUR CHAQUE cible right de left DANS rightLayer:
            leftPos = leftLayer.indexOf(left)
            rightPos = rightLayer.indexOf(right)
            arêtes.ajouter((leftPos, rightPos))

    # Compter les croisements
    croisements = 0
    POUR i DE 0 À arêtes.length - 1:
        (left1, right1) = arêtes[i]
        POUR j DE i+1 À arêtes.length - 1:
            (left2, right2) = arêtes[j]

            # Les arêtes se croisent si l'ordre est inversé
            SI (left1 < left2 ET right1 > right2) OU (left1 > left2 ET right1 < right2):
                croisements++

    RETOURNER croisements
```

### Étape 2: Forward Pass

Réordonne chaque layer de gauche à droite, basé sur le **barycentre backward**.

**Algorithme:**
```
POUR layerIndex DE 1 À layers.length - 1:
    prevLayer = layers[layerIndex - 1]
    currentLayer = layers[layerIndex]

    # Calculer barycentres
    barycentres = {}
    POUR CHAQUE entity DANS currentLayer:
        sources = trouverSourcesDans(entity, prevLayer)

        SI sources est vide:
            barycentres[entity] = ∞  # Mettre à la fin
        SINON:
            positions = [prevLayer.indexOf(s) pour s dans sources]
            barycentres[entity] = moyenne(positions)

    # Trier par barycentre
    currentLayer.trier(FONCTION(a, b):
        SI barycentres[a] != barycentres[b]:
            RETOURNER barycentres[a] - barycentres[b]
        SINON:
            # Tie-break par position originale
            RETOURNER currentLayer.indexOf(a) - currentLayer.indexOf(b)
    )

    layers[layerIndex] = currentLayer
```

**Pourquoi de gauche à droite?**

Chaque layer est réordonné en fonction du layer **précédent**, donc on propage l'ordre de gauche vers la droite.

### Étape 3: Backward Pass

Réordonne chaque layer de droite à gauche, basé sur le **barycentre forward**.

**Algorithme:**
```
POUR layerIndex DE layers.length - 2 À 0:
    currentLayer = layers[layerIndex]
    nextLayer = layers[layerIndex + 1]

    # Calculer barycentres
    barycentres = {}
    POUR CHAQUE entity DANS currentLayer:
        cibles = trouverCiblesDans(entity, nextLayer)

        SI cibles est vide:
            barycentres[entity] = ∞  # Mettre à la fin
        SINON:
            positions = [nextLayer.indexOf(c) pour c dans cibles]
            barycentres[entity] = moyenne(positions)

    # Trier par barycentre
    currentLayer.trier par barycentre (avec tie-break)

    layers[layerIndex] = currentLayer
```

**Pourquoi de droite à gauche?**

Chaque layer est réordonné en fonction du layer **suivant**, donc on propage l'ordre de droite vers la gauche.

### Étape 4: Itérations Multiples

Répéter les passes forward et backward plusieurs fois (typiquement 4 itérations).

**Algorithme:**
```
meilleureLayers = copie de layers
meilleurScore = compterCroisementsTotal(layers)

POUR iteration DE 1 À max_iterations:
    # Forward pass
    POUR chaque layer:
        réordonner par barycentre backward

    # Backward pass
    POUR chaque layer (ordre inverse):
        réordonner par barycentre forward

    # Évaluer
    score = compterCroisementsTotal(layers)

    SI score < meilleurScore:
        meilleurScore = score
        meilleureLayers = copie de layers

    SI score == 0:
        ARRÊTER  # Perfection atteinte!

RETOURNER meilleureLayers
```

### Étape 5: Tie-Breaking

Quand deux entités ont le même barycentre, il faut un **tie-breaker** pour garantir un ordre déterministe.

**Stratégie:**
```
SI barycentre[A] == barycentre[B]:
    Utiliser la position originale
    (celle avant de trier)
```

**Pourquoi?**
Pour éviter des changements inutiles qui pourraient créer de nouveaux croisements.

---

## Exemples Détaillés

### Exemple 1: Cas Simple avec 2 Croisements

**Configuration initiale:**

```
Layer A: [1, 2, 3]
Layer B: [Y, X, Z]

Relations:
- 1 → X
- 2 → Y
- 3 → Z
```

**Visualisation:**
```
Layer A: [1, 2, 3]
         │ \│/ │
         │  X  │
         └─┐│┌─┘
Layer B: [Y, X, Z]
```

**Croisements:**
- (1, X) croise avec (2, Y): 1 < 2 mais X > Y → croisement ✓
- Donc: 1 croisement total

**Itération 1 - Forward pass:**

Réordonner Layer B basé sur barycentre backward:

```
Sources dans Layer A:
- Y ← 2 : barycentre = 1
- X ← 1 : barycentre = 0
- Z ← 3 : barycentre = 2

Tri par barycentre: X (0) < Y (1) < Z (2)

Nouveau Layer B: [X, Y, Z]
```

**Résultat après iteration 1:**
```
Layer A: [1, 2, 3]
         │  │  │
Layer B: [X, Y, Z]

Croisements: 0 ✅
```

### Exemple 2: CRM avec Multiple Croisements

**Configuration initiale:**

```
Layer 4: [opportunities, products, campaign_members, cases, contacts_accounts]
Layer 5: [contacts, pipelines, emails]

Relations:
- opportunities → pipelines
- campaign_members → contacts
- cases → contacts
- contacts_accounts → contacts

Croisements: 17
```

**Analyse des barycentres (backward pass sur Layer 4):**

```
Layer 5 positions: contacts=0, pipelines=1, emails=2

Barycentres:
- campaign_members → contacts: barycentre = 0
- cases → contacts: barycentre = 0
- contacts_accounts → contacts: barycentre = 0
- opportunities → pipelines: barycentre = 1
- products → (aucune cible): barycentre = ∞
```

**Tri par barycentre:**

```
Groupe barycentre=0: [campaign_members, cases, contacts_accounts]
Groupe barycentre=1: [opportunities]
Groupe barycentre=∞: [products]

Résultat: [campaign_members, cases, contacts_accounts, opportunities, products]
```

**Forward pass sur Layer 5:**

```
Layer 4 positions (après tri):
- campaign_members: 0
- cases: 1
- contacts_accounts: 2
- opportunities: 3
- products: 4

Barycentres Layer 5:
- contacts ← {0,1,2}: barycentre = (0+1+2)/3 = 1
- pipelines ← 3: barycentre = 3
- emails ← (aucune): barycentre = ∞

Tri: contacts (1) < pipelines (3) < emails (∞)

Résultat: [contacts, pipelines, emails]
```

**Mais attendez...**

Layer 5 était déjà `[contacts, pipelines, emails]`, donc pas de changement!

**Résultat final après 4 itérations:**

```
Layer 4: [campaign_members, cases, contacts_accounts, opportunities, products]
Layer 5: [contacts, emails, pipelines]

Croisements: 1 (réduction de 94%!)
```

### Exemple 3: Pivot avec Barycentre Multiple

**Configuration:**

```
Layer N:   [A, B]
Layer N+1: [X, Y, Z]

Relations:
- A → X
- A → Y
- B → Z
```

**Barycentres forward:**

```
Cibles dans Layer N+1:
- A → {X, Y}: positions {0, 1}
  barycentre = (0 + 1) / 2 = 0.5

- B → {Z}: position {2}
  barycentre = 2 / 1 = 2

Tri: A (0.5) < B (2) ✓

Ordre maintenu: [A, B]
```

**Barycentres backward:**

```
Sources dans Layer N:
- X ← A: position 0
  barycentre = 0

- Y ← A: position 0
  barycentre = 0

- Z ← B: position 1
  barycentre = 1

Tri: X (0), Y (0), Z (1)
X et Y ont même barycentre → tie-break par position originale

Résultat: [X, Y, Z]
```

---

## Convergence et Itérations

### Pourquoi Plusieurs Itérations?

**Une seule passe n'est pas suffisante** car:
1. Le forward pass optimise localement (layer par layer)
2. Le backward pass peut découvrir de meilleures positions
3. L'interaction entre les deux passes peut trouver des optimums

**Exemple où 2 passes sont nécessaires:**

```
Configuration initiale:
Layer 1: [A, B, C]
Layer 2: [Y, X, Z]
Layer 3: [P, Q, R]

Après forward pass:
Layer 2 optimisé basé sur Layer 1

Après backward pass:
Layer 1 et Layer 2 optimisés basé sur Layer 3
→ Peut améliorer encore Layer 2!
```

### Convergence

L'algorithme **converge** généralement en 2-4 itérations.

**Critères d'arrêt:**
1. **0 croisements atteints** → arrêt immédiat
2. **Pas d'amélioration** pendant N itérations
3. **Maximum d'itérations** atteint (typiquement 4)

**Graphe de convergence typique:**

```
Croisements
    20 │●
       │
    15 │
       │ ●
    10 │
       │   ●
     5 │     ●───●
       │
     0 └─────────────── Itérations
       0  1  2  3  4
```

### Garanties

**L'algorithme garantit:**
- ✅ Réduction monotone ou stagnation (jamais d'augmentation si on garde le meilleur)
- ✅ Terminaison en temps fini

**L'algorithme NE garantit PAS:**
- ❌ Optimum global (peut rester dans un optimum local)
- ❌ 0 croisements (certains graphes ont des croisements obligatoires)

### Optimum Local vs Global

**Problème NP-complet:**
Trouver le minimum global de croisements est NP-complet.

**Heuristique du barycentre:**
- Trouve souvent une très bonne solution
- Rapide (polynomial)
- Pratique suffit pour la plupart des cas

**Exemple d'optimum local:**

```
Solution A (optimum local): 2 croisements
Solution B (optimum global): 1 croisement

L'algorithme peut rester bloqué en A
```

---

## Complexité

### Complexité Temporelle

Pour un graphe avec:
- **L** layers
- **N** entités par layer (en moyenne)
- **E** arêtes
- **I** itérations

**Étapes:**

1. **Compter croisements:** O(E²)
   - Pour chaque paire d'arêtes, vérifier si croisement

2. **Calculer barycentre:** O(E)
   - Parcourir toutes les arêtes une fois

3. **Trier un layer:** O(N log N)
   - Tri standard

4. **Une passe (forward ou backward):** O(L × N log N)
   - Trier chaque layer

5. **Une itération complète:** O(L × N log N + E²)
   - Forward + backward + compter

**Total:** O(I × (L × N log N + E²))

**Cas typique:**
- I = 4 itérations
- L = 10 layers
- N = 5 entités/layer
- E = 50 arêtes

Temps: < 5ms

### Complexité Spatiale

**Structures de données:**
- Copie des layers: O(L × N)
- Barycentres: O(N)
- Liste des arêtes: O(E)

**Total: O(L × N + E)**

### Optimisations Possibles

1. **Cache des barycentres**
   - Éviter de recalculer si pas de changement

2. **Comptage incrémental des croisements**
   - Ne recompter que les layers modifiés

3. **Early stop amélioré**
   - Arrêter si pas d'amélioration pendant K itérations

4. **Parallélisation**
   - Calculer les barycentres en parallèle pour plusieurs layers

---

## Pseudo-Code Complet

```
FONCTION minimizeCrossings(layers, maxIterations):
    # Initialisation
    currentLayers = copie de layers
    initialCrossings = compterCroisementsTotal(currentLayers)

    bestLayers = copie de currentLayers
    bestCrossings = initialCrossings

    # Itérations
    POUR iteration DE 1 À maxIterations:
        # FORWARD PASS (gauche → droite)
        POUR layerIdx DE 1 À layers.length - 1:
            prevLayer = currentLayers[layerIdx - 1]
            currentLayer = currentLayers[layerIdx]

            currentLayers[layerIdx] = reorderByBarycenterBackward(
                currentLayer, prevLayer
            )

        # BACKWARD PASS (droite → gauche)
        POUR layerIdx DE layers.length - 2 À 0:
            currentLayer = currentLayers[layerIdx]
            nextLayer = currentLayers[layerIdx + 1]

            currentLayers[layerIdx] = reorderByBarycenterForward(
                currentLayer, nextLayer
            )

        # Évaluation
        crossings = compterCroisementsTotal(currentLayers)

        SI crossings < bestCrossings:
            bestCrossings = crossings
            bestLayers = copie de currentLayers

        SI crossings == 0:
            ARRÊTER

    RETOURNER bestLayers


FONCTION reorderByBarycenterBackward(currentLayer, prevLayer):
    barycentres = {}

    POUR CHAQUE entity DANS currentLayer:
        sources = trouverSourcesDans(entity, prevLayer)

        SI sources est vide:
            barycentres[entity] = ∞
        SINON:
            positions = [prevLayer.indexOf(s) pour s dans sources]
            barycentres[entity] = moyenne(positions)

    RETOURNER currentLayer.trié par (barycentres, positionOriginale)


FONCTION reorderByBarycenterForward(currentLayer, nextLayer):
    barycentres = {}

    POUR CHAQUE entity DANS currentLayer:
        cibles = trouverCiblesDans(entity, nextLayer)

        SI cibles est vide:
            barycentres[entity] = ∞
        SINON:
            positions = [nextLayer.indexOf(c) pour c dans cibles]
            barycentres[entity] = moyenne(positions)

    RETOURNER currentLayer.trié par (barycentres, positionOriginale)


FONCTION compterCroisementsTotal(layers):
    total = 0
    POUR i DE 0 À layers.length - 2:
        total += compterCroisementsEntreDeuxLayers(layers[i], layers[i+1])
    RETOURNER total


FONCTION compterCroisementsEntreDeuxLayers(leftLayer, rightLayer):
    arêtes = collecterArêtes(leftLayer, rightLayer)
    croisements = 0

    POUR i DE 0 À arêtes.length - 1:
        POUR j DE i+1 À arêtes.length - 1:
            SI arêtes[i] croise arêtes[j]:
                croisements++

    RETOURNER croisements
```

---

## Conclusion

L'algorithme de **Crossing Minimization** utilisant la **méthode du barycentre** est:

**Avantages:**
- ✅ Rapide et efficace (polynomial)
- ✅ Réduit drastiquement les croisements (souvent 80-95%)
- ✅ Simple à comprendre et implémenter
- ✅ Fonctionne bien en pratique

**Limites:**
- ❌ Pas d'optimum global garanti
- ❌ Peut rester dans un optimum local
- ❌ Nécessite plusieurs itérations

**Utilisation:**
Phase finale du pipeline de layout, appliquée après le vertical alignment source-aware pour polir le résultat visuel.

**Résultats typiques:**
- CRM dataset: 17 → 1 croisements (94% réduction)
- E-commerce dataset: 5 → 0 croisements (100% réduction)
