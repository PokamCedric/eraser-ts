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

    validate(): { isValid: boolean; error?: string } {
        if (!this.from || !this.from.entity || !this.from.field) {
            return { isValid: false, error: 'Relationship source is incomplete' };
        }

        if (!this.to || !this.to.entity || !this.to.field) {
            return { isValid: false, error: 'Relationship target is incomplete' };
        }

        return { isValid: true };
    }

    getCardinality(): string {
        const cardinalityMap: Record<RelationshipType, string> = {
            'one-to-one': '1:1',
            'one-to-many': '1:N',
            'many-to-one': 'N:1',
            'many-to-many': 'N:N'
        };
        return cardinalityMap[this.type] || this.type;
    }

    toJSON(): Record<string, any> {
        return {
            from: this.from,
            to: this.to,
            type: this.type,
            color: this.color,
            label: this.label
        };
    }
}
