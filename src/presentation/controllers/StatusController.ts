/**
 * Status Controller
 *
 * Manages status display (validation, errors, info, zoom level).
 * Follows Single Responsibility Principle (SRP).
 */

import { ParseDSLResult } from '../../application/use-cases/ParseDSLUseCase';
import { DiagramService } from '../../application/services/DiagramService';

// Declare global Lucide icons
declare global {
  interface Window {
    lucide?: {
      createIcons(): void;
    };
  }
}

export class StatusController {
  constructor(private diagramService: DiagramService) {}

  /**
   * Update validation status indicator
   */
  updateStatus(result: ParseDSLResult): void {
    const statusIndicator = document.getElementById('statusIndicator')!;
    const errorMessage = document.getElementById('errorMessage')!;

    if (result.isValid) {
      statusIndicator.className = 'status-ok';
      statusIndicator.innerHTML = '<i data-lucide="check-circle"></i> Valid';
      errorMessage.textContent = '';
    } else {
      statusIndicator.className = 'status-error';
      statusIndicator.innerHTML = '<i data-lucide="alert-circle"></i> Error';
      errorMessage.textContent = result.errors.map(e => e.message).join(', ');
    }

    this._initializeLucideIcons();
  }

  /**
   * Update diagram info (entity count, relation count)
   */
  updateInfo(result: ParseDSLResult): void {
    document.getElementById('entityCount')!.textContent =
      `${result.entities.length} ${result.entities.length === 1 ? 'entity' : 'entities'}`;
    document.getElementById('relationCount')!.textContent =
      `${result.relationships.length} ${result.relationships.length === 1 ? 'relation' : 'relations'}`;
  }

  /**
   * Update zoom level display
   */
  updateZoomLevel(): void {
    const zoomLevel = this.diagramService.getZoomLevel();
    document.getElementById('zoomLevel')!.textContent = `${zoomLevel}%`;
  }

  /**
   * Initialize Lucide icons
   */
  initializeLucideIcons(): void {
    this._initializeLucideIcons();
  }

  /**
   * Show validation alert
   */
  async showValidation(result: ParseDSLResult): Promise<void> {
    if (result.isValid) {
      alert('✓ DSL is valid!');
    } else {
      alert('✗ DSL has errors:\n\n' + result.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n'));
    }
  }

  private _initializeLucideIcons(): void {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}
