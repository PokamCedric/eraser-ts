# Requirements - ERP Visual Designer Layout System

## Vue d'ensemble

Ce document définit **toutes les règles et contraintes** du système de layout automatique pour éviter les régressions lors des modifications.

---

## 1. REQUIREMENTS SYSTÈME

### 1.1 Objectif Global
Créer un layout automatique pour diagrammes ERD avec:
- Organisation hiérarchique **gauche → droite**
- Minimisation des **croisements** de connexions
- Respect des **conventions ERD** (Primary Keys en haut)
- **Aucun chevauchement** d'entités

### 1.2 Contraintes Techniques
- Langage: TypeScript
- Architecture: Domain-Driven Design (DDD)
- Modules indépendants et composables
- Pas de validation (l'algorithme garantit la correction)

---

## 2. HIERARCHICAL LAYOUT ENGINE

### 2.1 Fonctionnalité
Organiser les entités en **layers hiérarchiques** de gauche à droite selon leurs dépendances.

### 2.2 Règles Obligatoires

#### R-H1: Direction du graphe inversée
```
✅ CORRECT: Feuilles (personne n'en dépend) → Layer 0 (GAUCHE)
✅ CORRECT: Racines (beaucoup en dépendent) → Layer max (DROITE)

❌ INCORRECT: Racines à gauche, feuilles à droite
```

**Exemple**:
```
comments.postId > posts.id
posts.authorId > users.id

Résultat attendu:
  Layer 0: comments
  Layer 1: posts
  Layer 2: users
```

#### R-H2: Algorithme de layering
- Utiliser le **reverse graph** (qui dépend de qui)
- Calcul DFS: `layer = 1 + max(layer of dependents)`
- Les entités isolées (sans relations) vont dans un layer séparé

#### R-H3: Gestion des cycles
- Les cycles sont permis (pas de validation)
- Algorithme avec mémoïsation pour éviter boucles infinies

#### R-H4: Relations many-to-many
- Traiter comme **dirigées** (pas bidirectionnelles)
- Direction: A → B signifie "A dépend de B"

---

## 3. VERTICAL ALIGNMENT OPTIMIZER

### 3.1 Fonctionnalité
Optimiser l'ordre vertical des entités **dans chaque layer** pour minimiser les croisements.

### 3.2 Règles Obligatoires

#### R-V1: Barycentre pondéré par Primary Keys
```
✅ Connexion à une Primary Key: weight = 0.3 (priorité vers le haut)
✅ Connexion à un field normal: weight = 1.0

Formule: barycenter = sum(position * weight) / sum(weight)
```

**Justification**:
- PKs sont en position 0 (haut) dans leurs entités
- Entités connectées aux PKs doivent être placées plus haut
- Réduit les croisements pour connexions importantes

#### R-V2: Entités connectées aux PKs placées plus haut
```
Exemple:
  Users (Layer 2):
    - id 🔑 (position 0) → Teams.id
    - profileId (position 3) → Profiles.id

  Layer 3 attendu:
    - Teams (en haut, connecté à PK)
    - Profiles (en bas, connecté à non-PK)
```

#### R-V3: Itérations forward/backward
- 4 itérations par défaut
- Forward: gauche → droite
- Backward: droite → gauche
- Permet convergence vers un minimum local

---

## 4. LAYOUT POSITIONER

### 4.1 Fonctionnalité
Calculer les positions X et Y des entités en évitant les chevauchements.

### 4.2 Règles Obligatoires

#### R-P1: Hauteur dynamique des entités
```
✅ entityHeight = headerHeight + (fields.length * fieldHeight)

❌ INCORRECT: Hauteur fixe pour toutes les entités
```

#### R-P2: Espacement vertical adaptatif
```
✅ currentY += entityHeight + minSpacing

Où:
  - entityHeight = calculée dynamiquement
  - minSpacing = 30px (espacement minimum)
```

#### R-P3: Espacement horizontal uniforme
```
horizontalSpacing = entityWidth + 120  // 370px total
baseX = 100  // Marge gauche
```

#### R-P4: Pas de chevauchement
**Règle absolue**: Aucune entité ne doit chevaucher une autre
- Vérifier: `nextY >= prevY + prevHeight + minSpacing`

---

## 5. FIELD ORDERING OPTIMIZER

### 5.1 Fonctionnalité
Réordonner les **fields dans chaque entité** pour minimiser les croisements de connexions.

### 5.2 Règles Obligatoires (PAR ORDRE DE PRIORITÉ)

#### R-F1: Primary Keys TOUJOURS en position 0
```
✅ RÈGLE ABSOLUE: Tous les PKs en position 0

Peu importe:
  - Si le PK a des connexions ou non
  - Si le PK est connecté à d'autres layers
  - Le barycentre du PK

Exemple:
  Users:
    Position 0: id 🔑 (TOUJOURS, même si connecté)
    Position 1+: autres fields
```

#### R-F2: Dispersion maximale des fields connectés non-PK
```
✅ Objectif: Maximiser la distance entre fields connectés

Algorithme:
  1. Séparer: PKs | Connected non-PK | Non-connected
  2. PKs → Position 0
  3. Connected non-PK → Dispersés uniformément
  4. Non-connected → Remplissent les trous

Exemple (4 fields):
  - id (PK, connecté)
  - profileId (non-PK, connecté)
  - username (non connecté)
  - email (non connecté)

Résultat:
  Position 0: id          (PK prioritaire)
  Position 1: username    (remplissage)
  Position 2: email       (remplissage)
  Position 3: profileId   (dispersé au maximum)
```

#### R-F3: Détection des connexions (entrantes ET sortantes)
```
✅ Connexion sortante: entity.field > autre.field
✅ Connexion entrante: autre.field > entity.field

Les DEUX comptent pour déterminer si un field est "connecté"
```

**Exemple**:
```
users.id > teams.id      (sortant)
posts.authorId > users.id (entrant vers users.id)

→ users.id est considéré comme CONNECTÉ
```

#### R-F4: Calcul du barycentre par direction
- **Forward pass**: Connexions vers layers supérieurs (layer > currentLayer)
- **Backward pass**: Connexions vers layers inférieurs (layer < currentLayer)

#### R-F5: Une seule itération
```
✅ iterations = 1

❌ INCORRECT: iterations = 2 (annule la dispersion)
```

**Justification**: La backward pass détecte différentes connexions et peut annuler la dispersion de la forward pass.

---

## 6. CONNECTION ALIGNED SPACING

### 6.1 Fonctionnalité
Ajuster les positions Y des entités pour que les connexions entre fields consécutifs soient **droites ou descendantes**.

### 6.2 Règles Obligatoires

#### R-C1: Règle d'alignement des connexions
```
Pour deux fields consécutifs A et B dans une entité source:

Si:
  - Field A (position Y_A) → Entity X (position Y_X)
  - Field B (position Y_B) → Entity Y (position Y_Y)
  - Y_A < Y_B (A au-dessus de B)

Alors:
  Y_X ≤ Y_Y (X doit être au-dessus ou égal à Y)
```

**Objectif**: Éviter que les connexions se croisent inutilement

#### R-C2: Calcul de position idéale
```
Pour chaque entité cible:
  1. Trouver toutes les connexions entrantes
  2. Calculer: avgSourceY = moyenne des Y des fields sources
  3. Calculer: idealY = avgSourceY - (headerHeight + fieldHeight/2)
```

#### R-C3: Tri par position idéale
```
Trier les entités d'un layer par leur idealY
Réassigner les Y en respectant minSpacing = 30px
```

#### R-C4: Préservation de l'espacement minimum
```
newY = max(currentY, idealY)

Garantit qu'on ne crée pas de chevauchements
```

---

## 7. CANVAS RENDERER

### 7.1 Fonctionnalité
Dessiner les entités et les connexions au niveau des **fields spécifiques**.

### 7.2 Règles Obligatoires

#### R-R1: Connexions au niveau des fields
```
✅ Les connexions pointent vers les fields spécifiques
❌ INCORRECT: Connexions vers les centres d'entités

Calcul:
  fieldY = entityY + headerHeight + (fieldIndex * fieldHeight) + (fieldHeight / 2)
```

#### R-R2: Routing orthogonal
```
Pour connexions horizontales (layout gauche-droite):
  1. Partir du field source (bord droit/gauche de l'entité)
  2. Aller à mi-chemin horizontalement
  3. Monter/descendre verticalement
  4. Arriver au field cible
```

---

## 8. PIPELINE D'EXÉCUTION

### 8.1 Ordre d'exécution (IMPÉRATIF)

```
1. HierarchicalLayoutEngine.buildDependencyGraph()
   → Construit graph + reverseGraph

2. HierarchicalLayoutEngine.computeLayers()
   → Calcule layers hiérarchiques (gauche → droite)

3. VerticalAlignmentOptimizer.optimize()
   → Ordre vertical (barycentre pondéré par PKs)
   → 4 itérations

4. LayoutPositioner.calculatePositions()
   → Positions initiales X,Y
   → Espacement uniforme avec hauteurs dynamiques

5. FieldOrderingOptimizer.optimizeFieldOrder()
   → Ordre des fields (dispersion maximale)
   → 1 itération SEULEMENT

6. ConnectionAlignedSpacing.optimizeSpacing()
   → Ajustement final des Y
   → Alignement des connexions

7. Render
   → Connexions au niveau des fields
```

**⚠️ IMPORTANT**: Cet ordre DOIT être respecté

---

## 9. RÈGLES DE NON-RÉGRESSION

### 9.1 Tests de validation

Avant chaque modification, vérifier:

#### Test 1: Primary Keys en position 0
```
✅ TOUJOURS: entity.fields[0].isPrimaryKey === true
```

#### Test 2: Pas de chevauchement
```
Pour chaque paire d'entités adjacentes dans un layer:
  ✅ entity2.y >= entity1.y + entity1.height + minSpacing
```

#### Test 3: Dispersion des fields connectés
```
Pour une entité avec N fields dont M connectés:
  ✅ Distance moyenne entre fields connectés doit être maximisée
```

#### Test 4: Layers hiérarchiques corrects
```
Si A dépend de B:
  ✅ layer(A) < layer(B)
```

#### Test 5: Connexions vers fields corrects
```
Pour chaque relationship:
  ✅ La ligne part du field source
  ✅ La ligne arrive au field cible
  ✅ Pas au centre de l'entité
```

---

## 10. EXEMPLES DE VALIDATION

### 10.1 Cas: Users entity

**Configuration**:
```
users:
  - id (PK, connecté à teams, posts, tags)
  - username (non connecté)
  - email (non connecté)
  - profileId (connecté à profiles)
```

**Résultat attendu**:
```
Position 0: id          ✅ PK en position 0
Position 1: username    ✅ Remplissage
Position 2: email       ✅ Remplissage
Position 3: profileId   ✅ Dispersé au maximum (distance = 3)
```

**Validation**:
- ✅ PK en position 0
- ✅ Distance(id, profileId) = 3 (maximum possible)
- ✅ Fields connectés dispersés

### 10.2 Cas: Workspaces entity

**Configuration**:
```
workspaces:
  - id (PK, pas connecté)
  - teamId (connecté à teams, bary = 145)
  - folderId (connecté à folders, bary = 175)
  - name (non connecté)
  - createdAt (non connecté)
```

**Résultat attendu**:
```
Position 0: id          ✅ PK prioritaire
Position 1: name        ✅ Remplissage
Position 2: teamId      ✅ Dispersé (bary plus petit)
Position 3: createdAt   ✅ Remplissage
Position 4: folderId    ✅ Dispersé (bary plus grand)
```

**Validation**:
- ✅ PK en position 0
- ✅ teamId et folderId dispersés (positions 2 et 4)
- ✅ Distance maximale entre fields connectés

---

## 11. PARAMÈTRES CONFIGURABLES

### 11.1 Constantes

```typescript
// Dimensions entités
entityWidth = 250
entityHeaderHeight = 50
entityFieldHeight = 30

// Espacements
horizontalSpacing = entityWidth + 120  // 370px
verticalSpacing = 30  // Minimum
baseX = 100
baseY = 50

// Poids pour barycentre
PK_CONNECTION_WEIGHT = 0.3
NORMAL_CONNECTION_WEIGHT = 1.0

// Itérations
VERTICAL_ALIGNMENT_ITERATIONS = 4
FIELD_ORDERING_ITERATIONS = 1  // ⚠️ Ne pas changer!
```

### 11.2 Paramètres NON modifiables

**⚠️ DANGER**: Ne jamais modifier:
- `FIELD_ORDERING_ITERATIONS = 1` (annule dispersion si > 1)
- Ordre du pipeline (section 8.1)
- Règle PK position 0 (R-F1)

---

## 12. CHANGELOG DES REQUIREMENTS

### v1.0 - Initial
- Système de layout hiérarchique gauche → droite
- Algorithme inversé (feuilles à gauche)

### v2.0 - Optimisations verticales
- Barycentre pondéré par PKs
- Entités connectées aux PKs placées plus haut

### v3.0 - Field ordering
- Dispersion des fields connectés
- PK toujours en position 0

### v4.0 - Spacing alignment
- Ajustement d'espacement par connexions
- Connexions droites/descendantes

### v5.0 - Corrections critiques
- Fix: PK prioritaire même si connecté (R-F1)
- Fix: Une seule itération pour field ordering (R-F5)
- Fix: Détection connexions entrantes ET sortantes (R-F3)

---

## 13. GLOSSAIRE

- **Layer**: Couche horizontale d'entités au même niveau hiérarchique
- **Barycentre**: Position Y moyenne des connexions d'une entité
- **Dispersion**: Maximiser la distance entre éléments connectés
- **PK**: Primary Key (clé primaire)
- **FK**: Foreign Key (clé étrangère)
- **Forward pass**: Optimisation de gauche à droite
- **Backward pass**: Optimisation de droite à gauche
- **Field**: Propriété/attribut d'une entité
- **Connection entrante**: Relation où ce field est la cible (rel.to.field)
- **Connection sortante**: Relation où ce field est la source (rel.from.field)

---

## 14. CONTACT & MAINTENANCE

**Important**: Avant toute modification d'un algorithme, TOUJOURS:
1. Lire ce document en entier
2. Identifier les requirements impactés
3. Vérifier que tous les requirements restent satisfaits
4. Ajouter des tests si nécessaire

**En cas de régression**:
- Revenir à ce document
- Identifier la règle violée
- Corriger en préservant TOUTES les autres règles
