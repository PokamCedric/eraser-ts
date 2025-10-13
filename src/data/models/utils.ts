/**
 * Utility functions for working with domain entities
 *
 * These functions provide business logic operations without requiring
 * entity instances to be converted to model instances
 */

import { Entity } from '../../domain/entities/Entity';
import { Field } from '../../domain/entities/Field';
import { Relationship, RelationshipType } from '../../domain/entities/Relationship';

/**
 * Get cardinality notation for a relationship
 */
export function getRelationshipCardinality(relationship: Relationship): string {
    const cardinalityMap: Record<RelationshipType, string> = {
        'one-to-one': '1:1',
        'one-to-many': '1:N',
        'many-to-one': 'N:1',
        'many-to-many': 'N:N'
    };
    return cardinalityMap[relationship.type] || relationship.type;
}

/**
 * Validate a field
 */
export function validateField(field: Field): { isValid: boolean; error?: string } {
    if (!field.name || field.name.trim().length === 0) {
        return { isValid: false, error: 'Field name is required' };
    }

    if (!field.type || field.type.trim().length === 0) {
        return { isValid: false, error: 'Field type is required' };
    }

    return { isValid: true };
}

/**
 * Validate a relationship
 */
export function validateRelationship(relationship: Relationship): { isValid: boolean; error?: string } {
    if (!relationship.from || !relationship.from.entity || !relationship.from.field) {
        return { isValid: false, error: 'Relationship source is incomplete' };
    }

    if (!relationship.to || !relationship.to.entity || !relationship.to.field) {
        return { isValid: false, error: 'Relationship target is incomplete' };
    }

    return { isValid: true };
}

/**
 * Validate an entity
 */
export function validateEntity(entity: Entity): { isValid: boolean; error?: string } {
    if (!entity.name || entity.name.trim().length === 0) {
        return { isValid: false, error: 'Entity name is required' };
    }

    if (entity.fields.length === 0) {
        return { isValid: false, error: `Entity "${entity.name}" has no fields` };
    }

    for (const field of entity.fields) {
        const fieldValidation = validateField(field);
        if (!fieldValidation.isValid) {
            return {
                isValid: false,
                error: `Entity "${entity.name}": ${fieldValidation.error}`
            };
        }
    }

    return { isValid: true };
}

/**
 * Get the primary key field of an entity
 */
export function getEntityPrimaryKey(entity: Entity): Field | undefined {
    return entity.fields.find(f => f.isPrimaryKey);
}

/**
 * Get the foreign key fields of an entity
 */
export function getEntityForeignKeys(entity: Entity): Field[] {
    return entity.fields.filter(f => f.isForeignKey);
}

/**
 * Get a field by name from an entity
 */
export function getEntityField(entity: Entity, fieldName: string): Field | undefined {
    return entity.fields.find(f => f.name === fieldName);
}

/**
 * Reorder fields in an entity based on a new order array
 * @param entity The entity to reorder fields in
 * @param newOrder Array of field names in desired order
 */
export function reorderEntityFields(entity: Entity, newOrder: string[]): void {
    const orderedFields: Field[] = [];
    const fieldMap = new Map(entity.fields.map(f => [f.name, f]));

    // Add fields in the specified order
    for (const fieldName of newOrder) {
        const field = fieldMap.get(fieldName);
        if (field) {
            orderedFields.push(field);
            fieldMap.delete(fieldName);
        }
    }

    // Add any remaining fields that weren't in newOrder
    for (const field of fieldMap.values()) {
        orderedFields.push(field);
    }

    entity.fields = orderedFields;
}

/**
 * Add a field to an entity
 */
export function addFieldToEntity(entity: Entity, field: Field): void {
    entity.fields.push(field);
}

/**
 * Convert a field to JSON
 */
export function fieldToJSON(field: Field): Record<string, any> {
    return {
        name: field.name,
        displayName: field.displayName,
        type: field.type,
        isPrimaryKey: field.isPrimaryKey,
        isForeignKey: field.isForeignKey,
        isUnique: field.isUnique,
        isRequired: field.isRequired,
        defaultValue: field.defaultValue,
        enumValues: field.enumValues,
        decorators: field.decorators
    };
}

/**
 * Convert a relationship to JSON
 */
export function relationshipToJSON(relationship: Relationship): Record<string, any> {
    return {
        from: relationship.from,
        to: relationship.to,
        type: relationship.type,
        color: relationship.color,
        label: relationship.label
    };
}

/**
 * Convert an entity to JSON
 */
export function entityToJSON(entity: Entity): Record<string, any> {
    return {
        name: entity.name,
        displayName: entity.displayName,
        icon: entity.icon,
        color: entity.color,
        fields: entity.fields.map(fieldToJSON)
    };
}
