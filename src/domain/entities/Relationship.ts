/**
 * Domain Entity: Relationship
 *
 * Represents a relationship between two entities
 */

export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export interface RelationshipEndpoint {
    entity: string;
    field: string;
}

export interface RelationshipProps {
    from: RelationshipEndpoint;
    to: RelationshipEndpoint;
    type?: RelationshipType;
    color?: string;
    label?: string;
}

export class Relationship {
    public readonly from: RelationshipEndpoint;
    public readonly to: RelationshipEndpoint;
    public readonly type: RelationshipType;
    public readonly color?: string;
    public readonly label?: string;

    constructor(props: RelationshipProps) {
        this.from = props.from;
        this.to = props.to;
        this.type = props.type ?? 'many-to-one';
        this.color = props.color;
        this.label = props.label;
    }
}
