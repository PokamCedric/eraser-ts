/**
 * Domain Entity: Field
 *
 * Represents a field/column in an entity
 */

export interface FieldDecorator {
    name: string;
    args?: string | null;
    params?: Record<string, any>;
}

export interface FieldProps {
    name: string;
    displayName: string;
    type: string;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    isUnique?: boolean;
    isRequired?: boolean;
    defaultValue?: string | null;
    enumValues?: string[] | null;
    decorators?: FieldDecorator[];
}

export class Field {
    public readonly name: string;
    public readonly displayName: string;
    public readonly type: string;
    public readonly isPrimaryKey: boolean;
    public readonly isForeignKey: boolean;
    public readonly isUnique: boolean;
    public readonly isRequired: boolean;
    public readonly defaultValue: string | null;
    public readonly enumValues: string[] | null;
    public readonly decorators: FieldDecorator[];

    constructor(props: FieldProps) {
        this.name = props.name;
        this.displayName = props.displayName;
        this.type = props.type;
        this.isPrimaryKey = props.isPrimaryKey ?? false;
        this.isForeignKey = props.isForeignKey ?? false;
        this.isUnique = props.isUnique ?? false;
        this.isRequired = props.isRequired ?? false;
        this.defaultValue = props.defaultValue ?? null;
        this.enumValues = props.enumValues ?? null;
        this.decorators = props.decorators ?? [];
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
