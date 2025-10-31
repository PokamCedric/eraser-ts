/**
 * Repository Interface: IRenderer
 *
 * Main renderer interface - alias for IInteractiveRenderer for backward compatibility.
 * For new implementations, prefer using IBaseRenderer, IZoomableRenderer, or IInteractiveRenderer
 * based on the actual capabilities needed (Interface Segregation Principle).
 */

import { IInteractiveRenderer } from './IInteractiveRenderer';

/**
 * @deprecated Use IBaseRenderer, IZoomableRenderer, or IInteractiveRenderer instead
 */
export interface IRenderer extends IInteractiveRenderer {}
