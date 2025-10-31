/**
 * Data Model: EntityModel
 *
 * Extends Entity with business logic methods
 *
 * NOTE: Since Entity is now immutable (LSP compliant), this class
 * only provides additional helper methods. Mutation methods have
 * been removed - use Entity.withField() and Entity.withFields() instead.
 */

import { Entity, EntityProps } from '../../domain/entities/Entity';
import { Field } from '../../domain/entities/Field';
import { FieldModel } from './FieldModel';

export class EntityModel extends Entity {
    constructor(props: EntityProps) {
        super(props);
    }

    getField(fieldName: string): Field | undefined {
        return this.fields.find(f => f.name === fieldName);
    }

    getPrimaryKey(): Field | undefined {
        return this.fields.find(f => f.isPrimaryKey);
    }

    getForeignKeys(): Field[] {
        return this.fields.filter(f => f.isForeignKey);
    }

    validate(): { isValid: boolean; error?: string } {
        if (!this.name || this.name.trim().length === 0) {
            return { isValid: false, error: 'Entity name is required' };
        }

        if (this.fields.length === 0) {
            return { isValid: false, error: `Entity "${this.name}" has no fields` };
        }

        for (const field of this.fields) {
            // Use FieldModel for validation if the field is a FieldModel instance
            if (field instanceof FieldModel) {
                const fieldValidation = field.validate();
                if (!fieldValidation.isValid) {
                    return {
                        isValid: false,
                        error: `Entity "${this.name}": ${fieldValidation.error}`
                    };
                }
            } else {
                // Basic validation for plain Field entities
                if (!field.name || field.name.trim().length === 0) {
                    return {
                        isValid: false,
                        error: `Entity "${this.name}": Field name is required`
                    };
                }
                if (!field.type || field.type.trim().length === 0) {
                    return {
                        isValid: false,
                        error: `Entity "${this.name}": Field type is required`
                    };
                }
            }
        }

        return { isValid: true };
    }

    toJSON(): Record<string, any> {
        return {
            name: this.name,
            displayName: this.displayName,
            icon: this.icon,
            color: this.color,
            fields: this.fields.map(f => {
                if (f instanceof FieldModel) {
                    return f.toJSON();
                }
                // Fallback for plain Field entities
                return {
                    name: f.name,
                    displayName: f.displayName,
                    type: f.type,
                    isPrimaryKey: f.isPrimaryKey,
                    isForeignKey: f.isForeignKey,
                    isUnique: f.isUnique,
                    isRequired: f.isRequired,
                    defaultValue: f.defaultValue,
                    enumValues: f.enumValues,
                    decorators: f.decorators
                };
            })
        };
    }
}
