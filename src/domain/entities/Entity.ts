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
    public fields: Field[];

    constructor(props: EntityProps) {
        this.name = props.name;
        this.displayName = props.displayName;
        this.icon = props.icon ?? 'box';
        this.color = props.color ?? '#3b82f6';
        this.fields = props.fields ?? [];
    }
}
