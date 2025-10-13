/**
 * Data Model: RelationshipModel
 *
 * Extends Relationship entity with business logic methods
 */

import { Relationship, RelationshipProps, RelationshipType } from '../../domain/entities/Relationship';

export class RelationshipModel extends Relationship {
    constructor(props: RelationshipProps) {
        super(props);
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
