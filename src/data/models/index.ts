/**
 * Data Models Index
 *
 * Exports all model classes that extend domain entities with business logic
 * and utility functions for working with domain entities
 */

export { EntityModel } from './EntityModel';
export { FieldModel } from './FieldModel';
export { RelationshipModel } from './RelationshipModel';

// Utility functions
export {
    getRelationshipCardinality,
    validateField,
    validateRelationship,
    validateEntity,
    getEntityPrimaryKey,
    getEntityForeignKeys,
    getEntityField,
    reorderEntityFields,
    addFieldToEntity,
    fieldToJSON,
    relationshipToJSON,
    entityToJSON
} from './utils';
