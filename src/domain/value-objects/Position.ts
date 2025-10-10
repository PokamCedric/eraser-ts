/**
 * Domain Value Object: Position
 *
 * Represents a 2D position on the canvas
 */

export interface PositionProps {
    x: number;
    y: number;
}

export class Position {
    public readonly x: number;
    public readonly y: number;

    constructor(props: PositionProps) {
        this.x = props.x;
        this.y = props.y;
    }

    distanceTo(other: Position): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    add(other: Position): Position {
        return new Position({
            x: this.x + other.x,
            y: this.y + other.y
        });
    }

    equals(other: Position): boolean {
        return this.x === other.x && this.y === other.y;
    }

    toJSON(): PositionProps {
        return { x: this.x, y: this.y };
    }
}
