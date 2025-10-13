# Architecture du projet

## Séparation Entités / Modèles

Ce projet suit une architecture en couches avec une séparation claire entre les **entités du domaine** (données pures) et les **modèles de données** (logique métier).

### Principe de séparation

```
┌─────────────────────────────────────────────────┐
│          Domain Layer (Entités)                 │
│  - Structures de données pures                  │
│  - Pas de méthodes métier                       │
│  - Propriétés en lecture seule                  │
└─────────────────────────────────────────────────┘
                    ▼ hérite de
┌─────────────────────────────────────────────────┐
│           Data Layer (Modèles)                  │
│  - Classes héritant des entités                 │
│  - Méthodes métier (validate, toJSON, etc.)     │
│  - Fonctions utilitaires pour opérer            │
│    sur les entités sans conversion              │
└─────────────────────────────────────────────────┘
```

## Structure des fichiers

```
src/
├── domain/
│   └── entities/              # 🟦 Entités pures
│       ├── Entity.ts          # Propriétés seulement
│       ├── Field.ts           # Propriétés seulement
│       └── Relationship.ts    # Propriétés seulement
│
├── data/
│   └── models/               # 🟩 Modèles + Utilitaires
│       ├── EntityModel.ts    # Hérite de Entity + méthodes
│       ├── FieldModel.ts     # Hérite de Field + méthodes
│       ├── RelationshipModel.ts  # Hérite de Relationship + méthodes
│       ├── utils.ts          # Fonctions utilitaires
│       ├── index.ts          # Exports centralisés
│       └── README.md         # Documentation détaillée
│
├── application/
│   ├── services/             # Utilise les utilitaires
│   └── use-cases/            # Utilise les utilitaires
│
└── infrastructure/
    ├── parsers/              # Utilise addFieldToEntity
    ├── exporters/            # Utilise entityToJSON, relationshipToJSON
    ├── layout/               # Utilise reorderEntityFields
    └── renderers/            # Utilise getRelationshipCardinality
```

## Quand utiliser quoi ?

### ✅ Utiliser les **Modèles** (EntityModel, FieldModel, RelationshipModel)

**Cas d'usage** :
- Services applicatifs qui créent et manipulent des données
- Use cases qui nécessitent de la validation intensive
- Code orienté objet avec état mutable

**Exemple** :
```typescript
import { EntityModel, FieldModel } from '@/data/models';

const entity = new EntityModel({
  name: 'User',
  displayName: 'User'
});

entity.addField(new FieldModel({ name: 'id', type: 'number' }));
const validation = entity.validate();
```

### ✅ Utiliser les **Fonctions utilitaires**

**Cas d'usage** :
- Infrastructure (renderers, parsers, exporters, layout engines)
- Travail avec des entités déjà instanciées
- Code fonctionnel sans mutation
- Éviter des conversions inutiles

**Exemple** :
```typescript
import { Entity, Field } from '@/domain/entities';
import {
  validateEntity,
  addFieldToEntity,
  entityToJSON
} from '@/data/models';

const entity = new Entity({ name: 'User', displayName: 'User' });
const field = new Field({ name: 'id', type: 'number' });

addFieldToEntity(entity, field);
const validation = validateEntity(entity);
const json = entityToJSON(entity);
```

## Fonctions utilitaires disponibles

### Entity
- `validateEntity(entity)` - Validation
- `getEntityPrimaryKey(entity)` - Récupère PK
- `getEntityForeignKeys(entity)` - Récupère FKs
- `getEntityField(entity, fieldName)` - Récupère un champ
- `reorderEntityFields(entity, newOrder)` - Réorganise
- `addFieldToEntity(entity, field)` - Ajoute un champ
- `entityToJSON(entity)` - Sérialisation

### Field
- `validateField(field)` - Validation
- `fieldToJSON(field)` - Sérialisation

### Relationship
- `validateRelationship(relationship)` - Validation
- `getRelationshipCardinality(relationship)` - Cardinalité (1:1, 1:N, etc.)
- `relationshipToJSON(relationship)` - Sérialisation

## Avantages de cette architecture

1. **Séparation des responsabilités** : Les entités sont pures, la logique métier est dans les modèles
2. **Flexibilité** : Choix entre approche OOP (modèles) et fonctionnelle (utilitaires)
3. **Performance** : Pas de conversion nécessaire pour l'infrastructure
4. **Maintenabilité** : Code plus clair et testable
5. **Conformité DDD** : Respecte les principes du Domain-Driven Design

## Fichiers modifiés lors de la migration

✅ **Entités nettoyées** (méthodes retirées) :
- `src/domain/entities/Entity.ts`
- `src/domain/entities/Field.ts`
- `src/domain/entities/Relationship.ts`

✅ **Modèles créés** :
- `src/data/models/EntityModel.ts`
- `src/data/models/FieldModel.ts`
- `src/data/models/RelationshipModel.ts`
- `src/data/models/utils.ts`
- `src/data/models/index.ts`

✅ **Infrastructure mise à jour** :
- `src/application/use-cases/ParseDSLUseCase.ts` - Utilise `validateEntity`, `validateRelationship`
- `src/infrastructure/exporters/JSONExporter.ts` - Utilise `entityToJSON`, `relationshipToJSON`
- `src/infrastructure/layout/FieldOrderingOptimizer.ts` - Utilise `reorderEntityFields`
- `src/infrastructure/parsers/DSLParserAdapter.ts` - Utilise `addFieldToEntity`
- `src/infrastructure/renderers/CanvasRendererAdapter.ts` - Utilise `getRelationshipCardinality`

## Build et tests

Le projet compile sans erreur :
```bash
npm run build
# ✓ built in 425ms
```
