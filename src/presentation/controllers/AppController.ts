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
    return `
// Comprehensive Relationships Demo
// This example demonstrates all relationship types and features

// Users entity
users {
    id uuid @pk
    username string @unique @required
    email string @unique @required
    profileId uuid @fk
}

// Profiles entity (one-to-one with users)
profiles {
    id uuid @pk
    userId uuid @fk @unique
    bio text
    avatar string
}

// Teams entity
teams {
    id uuid @pk
    name string @required
    description text
}

// Posts entity
posts {
    id uuid @pk
    authorId uuid @fk @required
    title string @required
    content text
    status string @enum(fields: [draft, published, archived])
}

// Comments entity
comments {
    id uuid @pk
    postId uuid @fk @required
    text text @required
    createdAt timestamp @default(now)
  userId uuid required
}

// Tags entity (for many-to-many with posts)
tags {
    id uuid @pk
    userId uuid @fk @required
    name string @unique @required
}

// Post-Tags junction table (many-to-many)
post_tags {
    id uuid @pk
    postId uuid @fk @required
    tagId uuid @fk @required
}
roles [icon: shield, color: orange] {

  id uuid pk
  name string unique required
  description text
}
permissions [icon: key, color: green] {

  id uuid pk
  name string unique required
  description text
}
user_roles [icon: users, color: purple] {

  id uuid pk
  userId uuid required
  roleId uuid required
}
role_permissions [icon: lock, color: teal] {

  id uuid pk
  roleId uuid required
  permissionId uuid required
}
projects [icon: folder, color: blue] {

  id uuid pk
  name string required
  description text
  teamId uuid required
  createdAt timestamp
}
milestones [icon: flag, color: yellow] {

  id uuid pk
  projectId uuid required
  name string required
  dueDate date
  status string
}
attachments [icon: paperclip, color: gray] {

  id uuid pk
  postId uuid required
  filename string required
  url string required
  uploadedAt timestamp
}
notifications [icon: bell, color: red] {

  id uuid pk
  userId uuid required
  message string required
  read boolean
  createdAt timestamp
}
user_projects [icon: users, color: pink] {

  id uuid pk
  userId uuid required
  projectId uuid required
}


// ============================================
// RELATIONSHIPS
// ============================================

// One-to-One: Users to Profiles
// Each user has exactly one profile
users.profileId - profiles.id

// Many-to-One: Posts to Users
// Many posts belong to one author (user)
posts.authorId > users.id

// Many-to-One: Users to Teams
// Many users belong to one team
users.id > teams.id

// Many-to-One: Comments to Posts
// Many comments belong to one post
comments.postId > posts.id

// Many-to-One: Comments to Users
// Many comments belong to one user
tags.userId > users.id

// Many-to-Many: Posts to Tags (through post_tags)
// Posts can have many tags, tags can belong to many posts
post_tags.postId > posts.id
post_tags.tagId > tags.id

// Alternative entity-level syntax (defaults to id fields):
// users > teams
// This is equivalent to: users.id > teams.id
user_roles.userId > users.id
user_roles.roleId > roles.id
role_permissions.roleId > roles.id
role_permissions.permissionId > permissions.id
projects.teamId > teams.id
milestones.projectId > projects.id
attachments.postId > posts.id
notifications.userId > roles.id
user_projects.userId > users.id
user_projects.projectId > projects.id
projects.id < posts.authorId
comments.userId > users.id

    `;
  }
}
