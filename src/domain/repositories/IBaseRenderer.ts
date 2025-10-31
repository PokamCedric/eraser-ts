/**
 * Base Renderer Interface
 *
 * Core rendering functionality that all renderers must implement.
 * Respects Interface Segregation Principle (ISP).
 */

import { Entity } from '../entities/Entity';
import { Relationship } from '../entities/Relationship';

export interface IBaseRenderer {
  /**
   * Set the data to be rendered
   */
  setData(entities: Entity[], relationships: Relationship[]): void;

  /**
   * Render the diagram
   */
  render(): void;
}
