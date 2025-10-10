# Optimisation de l'Ordre des Propriétés (Fields)

## Vue d'ensemble

L'optimiseur de l'ordre des propriétés réordonne les fields dans chaque entité pour **minimiser les croisements de connexions** entre les propriétés d'entités différentes.

## Problème résolu

### Avant l'optimisation

```
Invite (Layer 0)          Users (Layer 1)
┌─────────────┐           ┌─────────────┐
│  Invite     │           │    Users    │
│─────────────│           │─────────────│
│ inviteId    │           │ id       🔑 │ ← connecté à inviterId
│ workspaceId │ ─────┐    │ teams       │
│ type        │      │    │ displayName │
│ inviterId   │ ─────│───→│ team_role   │
└─────────────┘      │    └─────────────┘
                     │    ┌─────────────┐
                     │    │ Workspaces  │
                     └───→│ id       🔑 │ ← connecté à workspaceId
                          │ name        │
                          └─────────────┘
```

**Problème** : Les connexions se croisent car `workspaceId` est au-dessus de `inviterId`, mais `Workspaces` est en-dessous de `Users`.

### Après l'optimisation

```
Invite (Layer 0)          Users (Layer 1)
┌─────────────┐           ┌─────────────┐
│  Invite     │           │    Users    │
│─────────────│           │─────────────│
│ inviteId    │           │ id       🔑 │ ← connecté à inviterId
│ inviterId   │ ─────────→│ teams       │
│ type        │           │ displayName │
│ workspaceId │ ─────┐    │ team_role   │
└─────────────┘      │    └─────────────┘
                     │    ┌─────────────┐
                     │    │ Workspaces  │
                     └───→│ id       🔑 │ ← connecté à workspaceId
                          │ name        │
                          └─────────────┘
```

**Solution** : `inviterId` monte, `workspaceId` descend → pas de croisements.

## Algorithme

### Principe : Méthode du Barycentre au niveau des Fields

Pour chaque field d'une entité, on calcule le **barycentre** (position Y moyenne) de tous les fields connectés dans les entités voisines.

### Étapes

1. **Calcul du barycentre pour chaque field**
   ```typescript
   Pour chaque field F dans entité E:
     Trouver tous les fields connectés à F (via relationships)
     Calculer leur position Y moyenne

     Exemple:
       workspaceId connecté à Workspaces.id (Y = 400)
       → Barycentre = 400

       inviterId connecté à Users.id (Y = 100)
       → Barycentre = 100
   ```

2. **Tri des fields par barycentre**
   ```typescript
   sortedFields = fields.sort((a, b) => barycenterA - barycenterB)

   Exemple:
     inviterId (bary = 100) → position 0
     workspaceId (bary = 400) → position 1
   ```

3. **Réordonnancement de l'entité**
   ```typescript
   entity.reorderFields(sortedFields)
   ```

4. **Itérations forward/backward**
   - **Forward pass** : optimise de gauche → droite (en fonction des layers suivants)
   - **Backward pass** : optimise de droite → gauche (en fonction des layers précédents)
   - 2 itérations par défaut : `forward → backward`

## Implémentation

### Module principal

**Fichier** : [`src/infrastructure/layout/FieldOrderingOptimizer.ts`](../src/infrastructure/layout/FieldOrderingOptimizer.ts)

```typescript
export class FieldOrderingOptimizer {
  static optimizeFieldOrder(
    entities: Entity[],
    relationships: Relationship[],
    entityPositions: Map<string, Position>,
    entityHeaderHeight: number,
    entityFieldHeight: number,
    layers: Map<number, string[]>,
    iterations: number = 2
  ): void {
    // Optimisation en 2 itérations (forward + backward)
  }
}
```

### Intégration dans autoLayout

**Fichier** : [`src/infrastructure/renderers/CanvasRendererAdapter.ts`](../src/infrastructure/renderers/CanvasRendererAdapter.ts)

```typescript
autoLayout(): void {
  // ... Steps 1-4: layers, positions ...

  // Step 5: Optimize field ordering
  FieldOrderingOptimizer.optimizeFieldOrder(
    this.entities,
    this.relationships,
    this.entityPositions,
    this.entityHeaderHeight,
    this.entityFieldHeight,
    layers,
    2  // iterations
  );

  // ... render ...
}
```

## Complexité

- **Temps** : O(iterations × entities × fields × relationships)
  - Généralement rapide car le nombre de fields par entité est petit (~5-10)
- **Espace** : O(entities × fields)

## Cas particuliers

### Primary Keys sans connexions

Les **primary keys sans connexions** (barycentre = `Infinity`) sont **toujours placés en premier**, avant tous les autres fields.

```typescript
// Si PK sans connexion, position 0
if (a.isPrimaryKey && !hasConnectionA) {
  return -1; // Va en premier
}
```

**Règle importante**:
- PK **sans connexion** → Position 0 (priorité absolue)
- PK **avec connexion** → Tri par barycentre (peut bouger selon les connexions)
- Autre field sans connexion → Tri à la fin (barycentre = Infinity)

**Exemple**:
```typescript
Entity Users:
  - id (PK, pas de connexion) → Position 0 ✓
  - teams (pas de connexion) → Position finale
  - displayName (pas de connexion) → Position finale
```

### Fields sans connexions (non-PK)

Les fields normaux sans connexions reçoivent un barycentre de `Infinity` et sont donc triés **à la fin** de la liste.

```typescript
if (connectedFieldPositions.length === 0) {
  return Infinity;  // Trie à la fin (sauf PK)
}
```

### Connexions bidirectionnelles

L'algorithme considère à la fois les connexions sortantes (`from`) et entrantes (`to`) :

```typescript
// Source: field est dans rel.from
if (rel.from.entity === entityName && rel.from.field === fieldName) {
  // Calculer position de rel.to.field
}

// Target: field est dans rel.to
if (rel.to.entity === entityName && rel.to.field === fieldName) {
  // Calculer position de rel.from.field
}
```

### Direction de l'optimisation

- **Forward pass** : considère uniquement les connexions vers les layers **suivants** (layer > currentLayer)
- **Backward pass** : considère uniquement les connexions vers les layers **précédents** (layer < currentLayer)

Cela évite les oscillations et garantit une convergence stable.

## Exemple complet

### Données d'entrée

```typescript
Entities:
  Invite (Layer 0):
    - inviteId
    - workspaceId
    - type
    - inviterId

  Users (Layer 1, Y=100):
    - id

  Workspaces (Layer 1, Y=400):
    - id

Relationships:
  Invite.inviterId → Users.id
  Invite.workspaceId → Workspaces.id
```

### Calcul des barycentres (Forward pass)

```typescript
Pour Invite (Layer 0):
  inviteId (PK): pas de connexions → Infinity (mais PK!)
  workspaceId: connecté à Workspaces.id (Y=400) → 400
  type: pas de connexions → Infinity
  inviterId: connecté à Users.id (Y=100) → 100
```

### Tri avec priorité PK

```typescript
Ordre final avec règle PK:
  1. inviteId (PK sans connexion → Position 0 prioritaire)
  2. inviterId (barycentre = 100)
  3. workspaceId (barycentre = 400)
  4. type (Infinity, non-PK → fin)

Résultat final:
  Invite.fields = [inviteId, inviterId, workspaceId, type]
```

**Note**: `inviteId` reste en position 0 car c'est une PK sans connexion, même si son barycentre est `Infinity`.

## Avantages

- ✅ **Minimise les croisements** : Chaque field est placé près de ses connexions
- ✅ **Converge rapidement** : 2 itérations suffisent généralement
- ✅ **Préserve la logique métier** : Primary keys sans connexions restent en position 0
- ✅ **S'adapte dynamiquement** : Fonctionne avec n'importe quelle topologie de graphe
- ✅ **Convention ERD standard** : PK toujours en premier (sauf en cas de conflit avec connexions)

## Limitations

- Les fields non-PK sans connexions sont triés à la fin (ordre arbitraire entre eux)
- L'ordre optimal global peut parfois nécessiter plus de 2 itérations
- Ne garantit pas zéro croisements dans tous les cas (problème NP-complet)
- Si une PK a une connexion, elle peut bouger de position 0

## Améliorations possibles

1. ✅ ~~**Préserver les PK en haut**~~ → Déjà implémenté pour les PK sans connexions
2. **Préserver les FK** : Forcer les foreign keys à être proches de leur PK associée
3. **Plus d'itérations** : Augmenter le nombre d'itérations pour des graphes très complexes
4. **Pénalités de croisements** : Compter les croisements réels et optimiser avec un algorithme génétique

---

## Références

- [Méthode du Barycentre (Graph Drawing)](https://en.wikipedia.org/wiki/Barycentric_coordinate_system_(graphics))
- [Sugiyama Framework](https://en.wikipedia.org/wiki/Layered_graph_drawing)
- [Minimisation des croisements d'arêtes](https://en.wikipedia.org/wiki/Edge_crossing_number)
