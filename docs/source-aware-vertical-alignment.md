# Source-Aware Vertical Alignment Algorithm (Phase 4)

## Table des Matières

1. [Introduction](#introduction)
2. [Le Problème](#le-problème)
3. [Concepts Fondamentaux](#concepts-fondamentaux)
4. [L'Algorithme](#lalgorithme)
5. [Exemples Détaillés](#exemples-détaillés)
6. [Cas Particuliers](#cas-particuliers)
7. [Complexité](#complexité)

---

## Introduction

L'algorithme de **Source-Aware Vertical Alignment** est la Phase 4 du pipeline de classification en layers. Il ordonne les entités **verticalement** (axe Y) au sein de chaque layer horizontal, en respectant leur **provenance** (d'où elles viennent).

### Objectif

Organiser les entités dans chaque layer de manière à:
1. Regrouper les entités qui viennent de la même source
2. Respecter l'ordre des sources du layer précédent
3. Minimiser visuellement les enchevêtrements

### Différence avec l'ancien algorithme

**Ancien algorithme (target-based):**
- Groupait uniquement par **cible** (où pointent les entités)
- Ignorait la **provenance** (d'où viennent les entités)

**Nouvel algorithme (source-aware):**
- Groupe par **source** (d'où viennent les entités)
- Respecte les **chaînes de relations** entre layers

---

## Le Problème

### Exemple Concret: E-commerce

**Situation initiale après X-ordering:**

```
Layer 2: [orders, carts]
Layer 3: [order_items, cart_items]
Layer 4: [products]
```

**Relations:**
- `orders → order_items → products`
- `carts → cart_items → products`

**Problème avec l'ancien algorithme:**

Au Layer 3, les deux entités (`order_items` et `cart_items`) pointent vers la même cible (`products`). L'ancien algorithme les triait simplement par ordre alphabétique ou par connectivity, ce qui donnait:

```
Layer 3: [cart_items, order_items]  ❌
```

Mais visuellement, c'est incohérent car:
- `cart_items` vient de `carts`
- `order_items` vient de `orders`
- Et au Layer 2, `orders` vient AVANT `carts`!

**Solution avec source-aware:**

```
Layer 2: [orders, carts]
           ↓       ↓
Layer 3: [order_items, cart_items]  ✅
```

Les entités sont maintenant ordonnées selon leurs sources!

---

## Concepts Fondamentaux

### 1. Source Chain (Chaîne de Source)

Une **source chain** est une séquence de relations à travers plusieurs layers:

```
Layer N-1 (source) → Layer N (entité) → Layer N+1 (cible)
```

**Exemple:**
```
users → orders → order_items
  ↑       ↑          ↑
Layer 1  Layer 2   Layer 3
```

### 2. Source d'une Entité

La **source** d'une entité est l'entité qui pointe vers elle dans le layer précédent.

**Exemple:**
```
Layer 2: [orders, carts]
Layer 3: [order_items, cart_items]

Sources:
- order_items a comme source: orders
- cart_items a comme source: carts
```

Une entité peut avoir **plusieurs sources**:

```
Layer 2: [orders, users]
Layer 3: [payments]

Sources de payments:
- orders (orders → payments)
- users (users → payments)
```

### 3. Source Primaire

Quand une entité a **plusieurs sources**, sa **source primaire** est:
> La première source dans l'ordre du layer précédent

**Exemple:**
```
Layer 2: [orders, users, carts]
Layer 3: [payments]

Relations:
- users → payments
- orders → payments

Sources de payments: [users, orders]
Source primaire: users (car users vient avant orders au Layer 2)
```

### 4. Pivot

Un **pivot** est une entité qui pointe vers **plusieurs cibles** dans le layer suivant.

**Exemple:**
```
Layer 2: [orders]
Layer 3: [order_items, shipments, payments]

Relations:
- orders → order_items
- orders → shipments
- orders → payments

→ orders est un PIVOT (pointe vers 3 cibles)
```

Les pivots créent des **ponts** entre plusieurs groupes d'entités.

### 5. Groupe de Source

Un **groupe de source** contient toutes les entités qui ont la même source primaire.

**Exemple:**
```
Layer 2: [orders, carts]
Layer 3: [order_items, shipments, payments, cart_items]

Relations:
- orders → order_items
- orders → shipments
- orders → payments
- carts → cart_items

Groupes:
- Groupe "orders": [order_items, shipments, payments]
- Groupe "carts": [cart_items]
```

---

## L'Algorithme

### Vue d'Ensemble

L'algorithme traite les layers de **droite à gauche** (du dernier au premier).

Pour chaque layer:
1. Identifier les sources de chaque entité
2. Grouper les entités par source primaire
3. Ordonner les groupes selon l'ordre des sources
4. Dans chaque groupe, trier par position de cible

### Étape 1: Dernier Layer

Le dernier layer est simplement trié par **entity_order** (ordre de connectivité global).

```
Layer N (dernier): Trier par entity_order
```

**Raison:** Le dernier layer n'a pas de layer suivant, donc pas de cibles à considérer.

### Étape 2: Identifier les Sources

Pour chaque entité du layer courant, trouver toutes ses sources dans le layer précédent.

**Algorithme:**
```
Pour chaque entité E dans current_layer:
    sources[E] = ensemble vide

    Pour chaque relation (left, right):
        Si right == E ET left est dans prev_layer:
            Ajouter left à sources[E]
```

**Exemple:**
```
prev_layer: [A, B, C]
current_layer: [X, Y]

Relations:
- A → X
- B → X
- C → Y

Résultat:
sources[X] = {A, B}
sources[Y] = {C}
```

### Étape 3: Déterminer la Source Primaire

Pour chaque entité, choisir la source primaire = première source dans l'ordre de `prev_layer`.

**Algorithme:**
```
Pour chaque entité E:
    Si sources[E] est vide:
        primary_source[E] = null
    Sinon:
        primary_source[E] = source avec l'index minimum dans prev_layer
```

**Exemple:**
```
prev_layer: [A, B, C]
sources[X] = {A, B}

Indices:
- A: index 0
- B: index 1

→ primary_source[X] = A (index 0 < index 1)
```

### Étape 4: Grouper par Source Primaire

Créer un groupe pour chaque source primaire.

**Algorithme:**
```
source_groups = dictionnaire vide
no_source_entities = liste vide

Pour chaque entité E dans current_layer:
    Si primary_source[E] est null:
        Ajouter E à no_source_entities
    Sinon:
        source = primary_source[E]
        Si source n'est pas dans source_groups:
            source_groups[source] = liste vide
        Ajouter E à source_groups[source]
```

**Exemple:**
```
current_layer: [W, X, Y, Z]
primary_source:
- W: A
- X: A
- Y: B
- Z: null

Résultat:
source_groups[A] = [W, X]
source_groups[B] = [Y]
no_source_entities = [Z]
```

### Étape 5: Ordonner les Groupes

Les groupes sont ordonnés selon l'ordre de leurs sources dans `prev_layer`.

**Algorithme:**
```
ordered_entities = liste vide

Pour chaque source S dans prev_layer (dans l'ordre):
    Si S existe dans source_groups:
        group = source_groups[S]
        Trier group (voir Étape 6)
        Ajouter group à ordered_entities

Ajouter no_source_entities à la fin
```

**Exemple:**
```
prev_layer: [A, B, C]
source_groups:
- A: [W, X]
- B: [Y]

Ordre final: [W, X, Y, Z]
              └─┬─┘ └┘ └┘
            groupe A  B  sans source
```

### Étape 6: Trier au Sein d'un Groupe

Au sein d'un groupe, les entités sont triées par:
1. **Position de leur cible** dans `next_layer` (layer suivant)
2. Si égalité: **entity_order** (ordre de connectivité)

**Algorithme:**
```
Pour un groupe G:
    Pour chaque entité E dans G:
        Trouver toutes les cibles de E dans next_layer
        target_position[E] = index minimum des cibles

    Trier G par (target_position, entity_order)
```

**Exemple:**
```
next_layer: [P, Q, R]
Groupe: [X, Y, Z]

Relations:
- X → Q (index 1)
- Y → P (index 0)
- Z → R (index 2)

Tri par target_position:
Y (index 0) < X (index 1) < Z (index 2)

Résultat: [Y, X, Z]
```

### Étape 7: Détecter et Afficher les Pivots

Un **pivot** est détecté si une entité pointe vers plusieurs cibles.

**Algorithme:**
```
pivots = dictionnaire vide

Pour chaque entité E dans current_layer:
    targets = ensemble des cibles de E dans next_layer
    Si taille(targets) > 1:
        pivots[E] = targets
```

Les pivots sont affichés dans les logs pour information (utile pour le debugging).

---

## Exemples Détaillés

### Exemple 1: E-commerce Simple

**Configuration:**
```
Layer 1: [users]
Layer 2: [orders, carts]
Layer 3: [order_items, cart_items]
Layer 4: [products]

Relations:
- users → orders
- users → carts
- orders → order_items
- carts → cart_items
- order_items → products
- cart_items → products
```

**Traitement du Layer 3:**

```
prev_layer (Layer 2): [orders, carts]
current_layer (Layer 3): [order_items, cart_items]
next_layer (Layer 4): [products]
```

**Étape 1: Identifier sources**
```
sources[order_items] = {orders}
sources[cart_items] = {carts}
```

**Étape 2: Source primaire**
```
primary_source[order_items] = orders
primary_source[cart_items] = carts
```

**Étape 3: Grouper**
```
source_groups[orders] = [order_items]
source_groups[carts] = [cart_items]
```

**Étape 4: Ordonner**
```
prev_layer order: [orders, carts]
→ Groupe orders avant groupe carts

Résultat final: [order_items, cart_items] ✅
```

### Exemple 2: Pivot avec Multiple Cibles

**Configuration:**
```
Layer 2: [orders]
Layer 3: [order_items, shipments, payments]
Layer 4: [products, addresses]

Relations:
- orders → order_items
- orders → shipments
- orders → payments
- order_items → products
- shipments → addresses
- payments → (aucune cible dans Layer 4)
```

**Traitement du Layer 3:**

```
prev_layer (Layer 2): [orders]
current_layer (Layer 3): [order_items, shipments, payments]
next_layer (Layer 4): [products, addresses]
```

**Étape 1: Identifier sources**
```
sources[order_items] = {orders}
sources[shipments] = {orders}
sources[payments] = {orders}
```

**Étape 2: Source primaire**
```
Toutes ont la même source: orders
```

**Étape 3: Grouper**
```
source_groups[orders] = [order_items, shipments, payments]
```

**Étape 4: Trier le groupe par cible**
```
Cibles:
- order_items → products (index 0 dans next_layer)
- shipments → addresses (index 1 dans next_layer)
- payments → (aucune cible = index ∞)

Tri: order_items < shipments < payments

Résultat: [order_items, shipments, payments] ✅
```

**Détection du pivot:**
```
orders est un pivot car il pointe vers 3 cibles:
- order_items
- shipments
- payments
```

### Exemple 3: Multiple Sources

**Configuration:**
```
Layer 2: [orders, users]
Layer 3: [payments]
Layer 4: []

Relations:
- orders → payments
- users → payments
```

**Traitement du Layer 3:**

```
prev_layer (Layer 2): [orders, users]
current_layer (Layer 3): [payments]
next_layer (Layer 4): []
```

**Étape 1: Identifier sources**
```
sources[payments] = {orders, users}
```

**Étape 2: Source primaire**
```
prev_layer order: [orders, users]
orders a l'index 0
users a l'index 1

→ primary_source[payments] = orders (index minimum)
```

**Étape 3: Grouper**
```
source_groups[orders] = [payments]
```

**Résultat:**
```
payments est placé avec le groupe "orders"
```

### Exemple 4: CRM Complexe

**Configuration:**
```
Layer 4: [opportunities, campaign_members, cases, contacts_accounts, products]
Layer 5: [contacts, pipelines, emails]

Relations:
- opportunities → pipelines
- campaign_members → contacts
- cases → contacts
- contacts_accounts → contacts
- products → (aucune relation avec Layer 5)
```

**Sans source-aware (ancien algo):**
```
Tri alphabétique ou par connectivity:
[campaign_members, cases, contacts_accounts, opportunities, products]

Problème: opportunities (→ pipelines) est mélangé avec
          campaign_members/cases/contacts_accounts (→ contacts)
```

**Avec source-aware:**

On suppose que Layer 3 est:
```
Layer 3: [quotes, opportunity_products]
Layer 4: [opportunities, campaign_members, cases, contacts_accounts, products]

Relations Layer 3 → Layer 4:
- quotes → opportunities
- opportunity_products → opportunities
- (campaign_members, cases, contacts_accounts viennent d'autres sources)
```

**Résultat:**
```
Groupes formés selon Layer 3:
- Groupe quote/opportunity_products: [opportunities]
- Autres groupes: [campaign_members, cases, contacts_accounts]

Order final respecte les sources de Layer 3
```

---

## Cas Particuliers

### Cas 1: Entités Sans Source

**Situation:**
Une entité n'a aucune source dans le layer précédent.

**Traitement:**
```
Ces entités sont placées à la FIN du layer,
triées par entity_order.
```

**Exemple:**
```
prev_layer: [A, B]
current_layer: [X, Y, Z]

Relations:
- A → X
- B → Y
(Z n'a pas de source)

Résultat: [X, Y, Z]
          └─┬─┘ └┘
        avec source │
                sans source
```

### Cas 2: Entités Sans Cible

**Situation:**
Une entité n'a aucune cible dans le layer suivant.

**Traitement:**
```
Dans le tri au sein d'un groupe, ces entités
ont un target_position = ∞, donc placées à la fin.
```

**Exemple:**
```
Groupe: [X, Y, Z]
next_layer: [P, Q]

Relations:
- X → P
- Y → Q
- Z → (aucune cible)

target_position:
- X: 0
- Y: 1
- Z: ∞

Résultat: [X, Y, Z]
```

### Cas 3: Layer 0 (Premier Layer)

**Situation:**
Le premier layer n'a pas de layer précédent.

**Traitement:**
```
prev_layer = []
Toutes les entités ont primary_source = null
Donc toutes vont dans no_source_entities

Tri final par entity_order
```

### Cas 4: Égalité de Position de Cible

**Situation:**
Deux entités dans le même groupe pointent vers la même cible.

**Traitement:**
```
Utiliser entity_order comme tie-breaker

Si entity_order[A] < entity_order[B]:
    A vient avant B
```

---

## Complexité

### Complexité Temporelle

Pour un layer avec **N** entités et **R** relations:

1. **Identifier sources:** O(R)
   - Parcourir toutes les relations une fois

2. **Source primaire:** O(N × M)
   - N entités
   - M = nombre moyen de sources par entité (généralement petit)

3. **Grouper:** O(N)
   - Une passe sur toutes les entités

4. **Trier les groupes:** O(G)
   - G = nombre de groupes (≤ taille de prev_layer)

5. **Trier au sein des groupes:** O(N log N)
   - Tri le plus coûteux

**Total: O(N log N + R)**

### Complexité Spatiale

- **sources:** O(N × M) où M = sources moyennes par entité
- **source_groups:** O(N)
- **Structures temporaires:** O(N)

**Total: O(N)**

### Optimisations Possibles

1. **Pré-calculer les relations inverses** (target → sources)
   - Gain: O(R) → O(1) pour lookup

2. **Cache des indices de prev_layer**
   - Gain: recherche O(N) → O(1)

3. **Grouper et trier en une passe**
   - Réduction de constantes

---

## Pseudo-Code Complet

```
FONCTION optimizeVerticalOrder(layers, entityOrder):
    # Dernier layer
    dernierIndex = layers.length - 1
    layers[dernierIndex] = trierParEntityOrder(layers[dernierIndex], entityOrder)

    # Autres layers (droite à gauche)
    POUR layerIndex DE dernierIndex-1 À 0:
        prevLayer = SI layerIndex > 0 ALORS layers[layerIndex-1] SINON []
        currentLayer = layers[layerIndex]
        nextLayer = layers[layerIndex+1]

        layers[layerIndex] = orderBySourceChains(
            currentLayer, prevLayer, nextLayer, entityOrder
        )

    RETOURNER layers


FONCTION orderBySourceChains(currentLayer, prevLayer, nextLayer, entityOrder):
    # 1. Identifier sources
    sources = {}
    POUR CHAQUE entity DANS currentLayer:
        sources[entity] = ensembleVide()
        POUR CHAQUE relation (left, right):
            SI right == entity ET left DANS prevLayer:
                sources[entity].ajouter(left)

    # 2. Identifier cibles
    targets = {}
    POUR CHAQUE entity DANS currentLayer:
        targets[entity] = ensembleVide()
        POUR CHAQUE relation (left, right):
            SI left == entity ET right DANS nextLayer:
                targets[entity].ajouter(right)

    # 3. Détecter pivots
    pivots = {}
    POUR CHAQUE entity DANS currentLayer:
        SI taille(targets[entity]) > 1:
            pivots[entity] = targets[entity]

    # 4. Source primaire
    primarySource = {}
    POUR CHAQUE entity DANS currentLayer:
        SI sources[entity] est vide:
            primarySource[entity] = null
        SINON:
            minIndex = ∞
            primarySource[entity] = null
            POUR CHAQUE source DANS sources[entity]:
                index = prevLayer.indexOf(source)
                SI index < minIndex:
                    minIndex = index
                    primarySource[entity] = source

    # 5. Grouper par source primaire
    sourceGroups = {}
    noSourceEntities = []

    POUR CHAQUE entity DANS currentLayer:
        SI primarySource[entity] est null:
            noSourceEntities.ajouter(entity)
        SINON:
            source = primarySource[entity]
            SI source PAS DANS sourceGroups:
                sourceGroups[source] = []
            sourceGroups[source].ajouter(entity)

    # 6. Ordonner les groupes
    ordered = []

    POUR CHAQUE source DANS prevLayer:
        SI source DANS sourceGroups:
            group = sourceGroups[source]

            # Trier le groupe
            group.trier(FONCTION(a, b):
                # Par position de cible
                targetsA = targets[a]
                targetsB = targets[b]

                minPosA = SI targetsA vide ALORS ∞ SINON min(nextLayer.indexOf(t) pour t dans targetsA)
                minPosB = SI targetsB vide ALORS ∞ SINON min(nextLayer.indexOf(t) pour t dans targetsB)

                SI minPosA != minPosB:
                    RETOURNER minPosA - minPosB

                # Tie-break par entity_order
                idxA = entityOrder.indexOf(a)
                idxB = entityOrder.indexOf(b)
                RETOURNER idxA - idxB
            )

            ordered.ajouter(group)

    # 7. Ajouter entités sans source
    noSourceEntities.trier par entityOrder
    ordered.ajouter(noSourceEntities)

    RETOURNER ordered
```

---

## Conclusion

L'algorithme **Source-Aware Vertical Alignment** améliore significativement la lisibilité des diagrammes en:

1. **Respectant la provenance** des entités (source chains)
2. **Groupant visuellement** les entités liées
3. **Maintenant la cohérence** entre les layers adjacents

**Points clés:**
- Traitement droite à gauche
- Groupement par source primaire
- Tri par position de cible
- Détection des pivots pour information

Cette approche prépare également le terrain pour la Phase 5 (Crossing Minimization) en créant une base organisée qui facilite l'élimination des croisements.
