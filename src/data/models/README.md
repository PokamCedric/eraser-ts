# Data Models

Ce répertoire contient les **modèles de données** qui étendent les entités du domaine avec la logique métier, ainsi que des **fonctions utilitaires** pour travailler avec les entités pures.

## Architecture

### Entités (Domain Layer)
- **Localisation**: `src/domain/entities/`
- **Responsabilité**: Structures de données pures, sans logique métier
- **Contenu**: Propriétés et constructeurs uniquement

### Modèles (Data Layer)
- **Localisation**: `src/data/models/`
- **Responsabilité**: Logique métier et méthodes d'opération
- **Contenu**:
  - Classes héritant des entités + méthodes (validate, toJSON, etc.)
  - Fonctions utilitaires pour opérer sur les entités sans conversion

## Structure

```
src/
├── domain/
│   └── entities/          # Entités pures (données seulement)
│       ├── Entity.ts
│       ├── Field.ts
│       └── Relationship.ts
└── data/
    └── models/           # Modèles avec logique métier
        ├── EntityModel.ts
        ├── FieldModel.ts
        ├── RelationshipModel.ts
        ├── utils.ts      # Fonctions utilitaires
        ├── index.ts
        └── README.md
```

## Utilisation

### Approche 1: Utiliser les modèles (orienté objet)
Pour du code qui manipule intensivement les entités avec beaucoup de logique métier :

```typescript
import { EntityModel, FieldModel } from '@/data/models';

const field = new FieldModel({
  name: 'email',
  displayName: 'Email',
  type: 'string'
});

// Utiliser les méthodes métier
const validation = field.validate();
const json = field.toJSON();
```

### Approche 2: Utiliser les fonctions utilitaires (fonctionnel)
Pour du code qui travaille avec des entités pures sans les convertir :

```typescript
import { Entity, Field, Relationship } from '@/domain/entities';
import {
  validateField,
  fieldToJSON,
  getRelationshipCardinality
} from '@/data/models';

const field = new Field({
  name: 'email',
  displayName: 'Email',
  type: 'string'
});

// Utiliser les fonctions utilitaires
const validation = validateField(field);
const json = fieldToJSON(field);
```

### Quand utiliser quelle approche ?

**Modèles (EntityModel, FieldModel, RelationshipModel)** :
- ✅ Pour des use cases et services applicatifs
- ✅ Quand vous créez et manipulez beaucoup les données
- ✅ Pour du code orienté objet avec état mutable

**Fonctions utilitaires** :
- ✅ Pour l'infrastructure (renderers, exporters, parsers)
- ✅ Quand vous travaillez avec des entités déjà existantes
- ✅ Pour du code fonctionnel sans mutation
- ✅ Pour éviter des conversions inutiles

## Méthodes disponibles

### EntityModel
- `addField(field: Field): void` - Ajoute un champ
- `getField(fieldName: string): Field | undefined` - Récupère un champ par nom
- `reorderFields(newOrder: string[]): void` - Réorganise les champs
- `getPrimaryKey(): Field | undefined` - Récupère la clé primaire
- `getForeignKeys(): Field[]` - Récupère les clés étrangères
- `validate(): { isValid: boolean; error?: string }` - Valide l'entité
- `toJSON(): Record<string, any>` - Sérialise en JSON

### FieldModel
- `validate(): { isValid: boolean; error?: string }` - Valide le champ
- `toJSON(): Record<string, any>` - Sérialise en JSON

### RelationshipModel
- `validate(): { isValid: boolean; error?: string }` - Valide la relation
- `getCardinality(): string` - Récupère la cardinalité (1:1, 1:N, etc.)
- `toJSON(): Record<string, any>` - Sérialise en JSON

## Fonctions utilitaires disponibles

### Pour Entity
- `validateEntity(entity: Entity)` - Valide une entité
- `getEntityPrimaryKey(entity: Entity)` - Récupère la clé primaire
- `getEntityForeignKeys(entity: Entity)` - Récupère les clés étrangères
- `getEntityField(entity: Entity, fieldName: string)` - Récupère un champ par nom
- `reorderEntityFields(entity: Entity, newOrder: string[])` - Réorganise les champs
- `addFieldToEntity(entity: Entity, field: Field)` - Ajoute un champ
- `entityToJSON(entity: Entity)` - Sérialise en JSON

### Pour Field
- `validateField(field: Field)` - Valide un champ
- `fieldToJSON(field: Field)` - Sérialise en JSON

### Pour Relationship
- `validateRelationship(relationship: Relationship)` - Valide une relation
- `getRelationshipCardinality(relationship: Relationship)` - Récupère la cardinalité
- `relationshipToJSON(relationship: Relationship)` - Sérialise en JSON
