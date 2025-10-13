/**
 * Data Model: FieldModel
 *
 * Extends Field entity with business logic methods
 */

import { Field, FieldProps } from '../../domain/entities/Field';

export class FieldModel extends Field {
    constructor(props: FieldProps) {
        super(props);
    }

    validate(): { isValid: boolean; error?: string } {
        if (!this.name || this.name.trim().length === 0) {
            return { isValid: false, error: 'Field name is required' };
        }

        if (!this.type || this.type.trim().length === 0) {
            return { isValid: false, error: 'Field type is required' };
        }

        return { isValid: true };
    }

    toJSON(): Record<string, any> {
        return {
            name: this.name,
            displayName: this.displayName,
            type: this.type,
            isPrimaryKey: this.isPrimaryKey,
            isForeignKey: this.isForeignKey,
            isUnique: this.isUnique,
            isRequired: this.isRequired,
            defaultValue: this.defaultValue,
            enumValues: this.enumValues,
            decorators: this.decorators
        };
    }
}
