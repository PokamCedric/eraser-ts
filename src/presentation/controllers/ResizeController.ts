/**
 * Resize Controller
 *
 * Manages resize handle for adjusting canvas/editor split.
 * Follows Single Responsibility Principle (SRP).
 */

export class ResizeController {
  private isResizing: boolean = false;

  /**
   * Setup resize handle event listeners
   */
  setupResizeHandle(): void {
    const resizeHandle = document.getElementById('resizeHandle')!;
    const canvasArea = document.querySelector('.canvas-area') as HTMLElement;
    const editorArea = document.querySelector('.editor-area') as HTMLElement;

    resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
      this.isResizing = true;
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isResizing) return;

      const containerWidth = (document.querySelector('.main-content') as HTMLElement).clientWidth;
      const editorWidth = containerWidth - e.clientX;
      const canvasWidth = e.clientX;

      const editorPercent = (editorWidth / containerWidth) * 100;
      const canvasPercent = (canvasWidth / containerWidth) * 100;

      // Limit resize range: editor between 15% and 50%
      if (editorPercent >= 15 && editorPercent <= 50) {
        canvasArea.style.flex = `0 0 ${canvasPercent}%`;
        editorArea.style.flex = `0 0 ${editorPercent}%`;
      }
    });

    document.addEventListener('mouseup', () => {
      this.isResizing = false;
      document.body.style.cursor = 'default';
    });
  }
}
