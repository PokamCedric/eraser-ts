/**
 * Repository Interface: IDiagramRepository
 *
 * Combines parsing and persistence interfaces.
 * For new implementations, prefer using IDSLParser and IDiagramPersistence separately
 * to respect Interface Segregation Principle (ISP).
 */

import { IDSLParser, ParseError, ParseDSLResult } from './IDSLParser';
import { IDiagramPersistence } from './IDiagramPersistence';

// Re-export for backward compatibility
export type { ParseError, ParseDSLResult };

/**
 * @deprecated Use IDSLParser and IDiagramPersistence separately instead
 */
export interface IDiagramRepository extends IDSLParser, IDiagramPersistence {}
