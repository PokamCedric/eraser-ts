/**
 * Application Service: DiagramService
 *
 * Orchestrates use cases for diagram operations
 */
import { ParseDSLUseCase, ParseDSLResult } from '../use-cases/ParseDSLUseCase';
import { RenderDiagramUseCase } from '../use-cases/RenderDiagramUseCase';
import { ExportCodeUseCase } from '../use-cases/ExportCodeUseCase';
import { Entity } from '../../domain/entities/Entity';
import { Relationship } from '../../domain/entities/Relationship';

export class DiagramService {
  private currentEntities: Entity[] = [];
  private currentRelationships: Relationship[] = [];

  constructor(
    private parseDSLUseCase: ParseDSLUseCase,
    private renderDiagramUseCase: RenderDiagramUseCase,
    private exportCodeUseCase: ExportCodeUseCase
  ) {}

  async parseDSL(dslText: string): Promise<ParseDSLResult> {
    const result = await this.parseDSLUseCase.execute(dslText);

    if (result.isValid) {
      this.currentEntities = result.entities;
      this.currentRelationships = result.relationships;
    }

    return result;
  }

  renderDiagram(): void {
    this.renderDiagramUseCase.execute(this.currentEntities, this.currentRelationships);
  }

  zoomIn(): void {
    this.renderDiagramUseCase.zoomIn();
  }

  zoomOut(): void {
    this.renderDiagramUseCase.zoomOut();
  }

  fitToScreen(): void {
    this.renderDiagramUseCase.fitToScreen();
  }

  autoLayout(): void {
    this.renderDiagramUseCase.autoLayout();
  }

  getZoomLevel(): number {
    return this.renderDiagramUseCase.getZoomLevel();
  }

  exportCode(format: string): string {
    return this.exportCodeUseCase.execute(format, this.currentEntities, this.currentRelationships);
  }

  getSupportedExportFormats(): string[] {
    return this.exportCodeUseCase.getSupportedFormats();
  }

  getCurrentData(): { entities: Entity[]; relationships: Relationship[] } {
    return {
      entities: this.currentEntities,
      relationships: this.currentRelationships
    };
  }
}
