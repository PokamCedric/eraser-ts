/**
 * Domain Entity: Entity
 *
 * Represents a database table/entity in the diagram
 *
 * LSP Compliant: Entity is now immutable with builder pattern
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
    public readonly fields: readonly Field[];

    constructor(props: EntityProps) {
        this.name = props.name;
        this.displayName = props.displayName;
        this.icon = props.icon ?? 'box';
        this.color = props.color ?? '#3b82f6';
        this.fields = Object.freeze(props.fields ?? []);
    }

    /**
     * Create a new Entity with an additional field (immutable)
     * LSP: Ensures entities are immutable and substitutable
     */
    withField(field: Field): Entity {
        return new Entity({
            name: this.name,
            displayName: this.displayName,
            icon: this.icon,
            color: this.color,
            fields: [...this.fields, field]
        });
    }

    /**
     * Create a new Entity with replaced fields (immutable)
     * LSP: Ensures entities are immutable and substitutable
     */
    withFields(fields: Field[]): Entity {
        return new Entity({
            name: this.name,
            displayName: this.displayName,
            icon: this.icon,
            color: this.color,
            fields
        });
    }
}
