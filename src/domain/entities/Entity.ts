/**
 * Domain Entity: Entity
 *
 * Represents a database table/entity in the diagram
 */

import { Field } from './Field';

export interface EntityProps {
    name: string;
    displayName: string;
    icon?: string;
    color?: string;
    fields?: Field[];
}

export class Entity {
    public readonly name: string;
    public readonly displayName: string;
    public readonly icon: string;
    public readonly color: string;
    public readonly fields: Field[];

    constructor(props: EntityProps) {
        this.name = props.name;
        this.displayName = props.displayName;
        this.icon = props.icon ?? 'box';
        this.color = props.color ?? '#3b82f6';
        this.fields = props.fields ?? [];
    }

    addField(field: Field): void {
        this.fields.push(field);
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
            const fieldValidation = field.validate();
            if (!fieldValidation.isValid) {
                return {
                    isValid: false,
                    error: `Entity "${this.name}": ${fieldValidation.error}`
                };
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
            fields: this.fields.map(f => f.toJSON())
        };
    }
}
