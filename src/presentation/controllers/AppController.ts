/**
 * Presentation Controller: AppController
 *
 * Coordinates UI interactions with application services
 */
import { DiagramService } from '../../application/services/DiagramService';
import { MonacoEditorFactory } from '../factories/MonacoEditorFactory';
import { ParseDSLResult } from '../../application/use-cases/ParseDSLUseCase';

// Declare global Lucide icons
declare global {
  interface Window {
    lucide?: {
      createIcons(): void;
    };
  }
}

export class AppController {
  private editor: any = null;

  constructor(
    private diagramService: DiagramService,
    private editorFactory: MonacoEditorFactory
  ) {}

  async initialize(): Promise<void> {
    await this._initializeEditor();
    this._setupEventListeners();
    this._initializeLucideIcons();
    await this._onDSLChange();
  }

  private async _initializeEditor(): Promise<void> {
    const defaultDSL = this._getDefaultDSL();
    this.editor = await this.editorFactory.createEditor(defaultDSL);

    this.editor.onDidChangeModelContent(() => {
      this._onDSLChange();
    });
  }

  private _setupEventListeners(): void {
    // Toolbar buttons
    document.getElementById('zoomInBtn')!.addEventListener('click', () => {
      this.diagramService.zoomIn();
      this._updateZoomLevel();
    });

    document.getElementById('zoomOutBtn')!.addEventListener('click', () => {
      this.diagramService.zoomOut();
      this._updateZoomLevel();
    });

    document.getElementById('fitBtn')!.addEventListener('click', () => {
      this.diagramService.fitToScreen();
      this._updateZoomLevel();
    });

    document.getElementById('autoLayoutBtn')!.addEventListener('click', () => {
      this.diagramService.autoLayout();
    });

    // Editor buttons
    document.getElementById('formatBtn')!.addEventListener('click', () => {
      this._formatDSL();
    });

    document.getElementById('validateBtn')!.addEventListener('click', () => {
      this._validateDSL();
    });

    // Header buttons
    document.getElementById('exportBtn')!.addEventListener('click', () => {
      this._exportCode();
    });

    document.getElementById('saveBtn')!.addEventListener('click', () => {
      this._saveDSL();
    });

    document.getElementById('resetBtn')!.addEventListener('click', () => {
      if (confirm('Reset to default DSL? This will clear your current work.')) {
        this.editor.setValue(this._getDefaultDSL());
      }
    });

    // Resize handle
    this._setupResizeHandle();
  }

  private _setupResizeHandle(): void {
    const resizeHandle = document.getElementById('resizeHandle')!;
    const canvasArea = document.querySelector('.canvas-area') as HTMLElement;
    const editorArea = document.querySelector('.editor-area') as HTMLElement;

    let isResizing = false;

    resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
      isResizing = true;
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isResizing) return;

      const containerWidth = (document.querySelector('.main-content') as HTMLElement).clientWidth;
      const editorWidth = containerWidth - e.clientX;
      const canvasWidth = e.clientX;

      const editorPercent = (editorWidth / containerWidth) * 100;
      const canvasPercent = (canvasWidth / containerWidth) * 100;

      if (editorPercent >= 15 && editorPercent <= 50) {
        canvasArea.style.flex = `0 0 ${canvasPercent}%`;
        editorArea.style.flex = `0 0 ${editorPercent}%`;
      }
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
      document.body.style.cursor = 'default';
    });
  }

  private async _onDSLChange(): Promise<void> {
    const dsl = this.editor.getValue();
    const result = await this.diagramService.parseDSL(dsl);

    this.diagramService.renderDiagram();
    this._updateStatus(result);
    this._updateInfo(result);
    this._updateZoomLevel();
  }

  private _updateStatus(result: ParseDSLResult): void {
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

  private _updateInfo(result: ParseDSLResult): void {
    document.getElementById('entityCount')!.textContent =
      `${result.entities.length} ${result.entities.length === 1 ? 'entity' : 'entities'}`;
    document.getElementById('relationCount')!.textContent =
      `${result.relationships.length} ${result.relationships.length === 1 ? 'relation' : 'relations'}`;
  }

  private _updateZoomLevel(): void {
    const zoomLevel = this.diagramService.getZoomLevel();
    document.getElementById('zoomLevel')!.textContent = `${zoomLevel}%`;
  }

  private _formatDSL(): void {
    const dsl = this.editor.getValue();
    const lines = dsl.split('\n');
    const formatted: string[] = [];
    let indent = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        formatted.push('');
        continue;
      }

      if (trimmed.includes('}')) indent--;
      formatted.push('  '.repeat(Math.max(0, indent)) + trimmed);
      if (trimmed.includes('{')) indent++;
    }

    this.editor.setValue(formatted.join('\n'));
  }

  private async _validateDSL(): Promise<void> {
    const dsl = this.editor.getValue();
    const result = await this.diagramService.parseDSL(dsl);

    if (result.isValid) {
      alert('✓ DSL is valid!');
    } else {
      alert('✗ DSL has errors:\n\n' + result.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n'));
    }
  }

  private _saveDSL(): void {
    const dsl = this.editor.getValue();
    const blob = new Blob([dsl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.dsl';
    a.click();
    URL.revokeObjectURL(url);
  }

  private _exportCode(): void {
    const format = prompt(
      'Export format:\n' +
      '1 - DSL (current format)\n' +
      '2 - JSON Schema\n' +
      '3 - SQL DDL\n' +
      '4 - TypeScript Interfaces\n\n' +
      'Enter number (1-4):',
      '1'
    );

    if (!format) return;

    let exportContent = '';
    let fileExtension = 'txt';

    try {
      switch (format) {
        case '1':
          exportContent = this.editor.getValue();
          fileExtension = 'dsl';
          break;
        case '2':
          exportContent = this.diagramService.exportCode('json');
          fileExtension = 'json';
          break;
        case '3':
          exportContent = this.diagramService.exportCode('sql');
          fileExtension = 'sql';
          break;
        case '4':
          exportContent = this.diagramService.exportCode('typescript');
          fileExtension = 'ts';
          break;
        default:
          alert('Invalid format');
          return;
      }

      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export.${fileExtension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private _initializeLucideIcons(): void {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  private _getDefaultDSL(): string {
    return `users [icon: user, color: blue] {
  id string pk
  displayName string
  team_role string
  teams string
  email string
  phone string
  addressId string
  createdAt timestamp
  updatedAt timestamp
}

teams [icon: users, color: blue] {
  id string pk
  name string
  createdAt timestamp
  updatedAt timestamp
}

workspaces [icon: home] {
  id string
  createdAt timestamp
  folderId string
  teamId string
  name string
  description string
}

folders [icon: folder] {
  id string
  name string
}

chat [icon: message-circle, color: green] {
  workspaceId string
  duration number
  startedAt timestamp
  endedAt timestamp
}

invite [icon: mail, color: green] {
  workspaceId string
  inviteId string
  type string
  inviterId string
}
products [icon: box, color: orange] {

  id string pk
  name string
  description string
  price number
  stock number
  categoryId string
  createdAt timestamp
  updatedAt timestamp
}
categories [icon: tag, color: orange] {

  id string pk
  name string
  description string
  parentCategoryId string
}
orders [icon: shopping-cart, color: purple] {

  id string pk
  userId string
  status string
  total number
  paymentId string
  shipmentId string
  createdAt timestamp
  updatedAt timestamp
}
order_items [icon: package, color: purple] {

  id string pk
  orderId string
  productId string
  quantity number
  price number
}
payments [icon: credit-card, color: purple] {

  id string pk
  orderId string
  userId string
  amount number
  method string
  status string
  paidAt timestamp
}
reviews [icon: star, color: yellow] {

  id string pk
  userId string
  productId string
  rating number
  comment string
  createdAt timestamp
}
carts [icon: shopping-bag, color: teal] {

  id string pk
  userId string
  createdAt timestamp
}
cart_items [icon: package, color: teal] {

  id string pk
  cartId string
  productId string
  quantity number
}
shipments [icon: truck, color: red] {

  id string pk
  orderId string
  addressId string
  status string
  shippedAt timestamp
  deliveredAt timestamp
}
addresses [icon: map-pin, color: blue] {

  id string pk
  userId string
  line1 string
  line2 string
  city string
  state string
  postalCode string
  country string
  createdAt timestamp
}

users.teams <> teams.id
workspaces.folderId > folders.id
workspaces.teamId > teams.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id
users.id > orders.userId
orders.id > order_items.orderId
order_items.productId > products.id
products.categoryId > categories.id
users.id > reviews.userId
products.id > reviews.productId
orders.paymentId > payments.id
payments.userId > users.id
orders.shipmentId > shipments.id
shipments.addressId > addresses.id
users.id > carts.userId
carts.id > cart_items.cartId
cart_items.productId > products.id
users.id > addresses.userId
orders.id > shipments.orderId
users.addressId > addresses.id`;
  }
}
