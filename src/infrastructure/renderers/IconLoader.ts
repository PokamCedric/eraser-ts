/**
 * Icon Loader
 *
 * Loads and caches SVG icons from Lucide Icons CDN
 * Single Responsibility: icon loading and caching
 */

export class IconLoader {
  private static cache: Map<string, HTMLImageElement> = new Map();
  private static loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private static readonly CDN_BASE = 'https://unpkg.com/lucide-static@latest/icons';

  /**
   * Load an icon by name from Lucide Icons
   * Returns a promise that resolves to an Image element
   */
  static async load(iconName: string): Promise<HTMLImageElement | null> {
    // Check cache first
    if (this.cache.has(iconName)) {
      return this.cache.get(iconName)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(iconName)) {
      return this.loadingPromises.get(iconName)!;
    }

    // Start loading
    const loadPromise = this.loadIcon(iconName);
    this.loadingPromises.set(iconName, loadPromise);

    try {
      const img = await loadPromise;
      this.cache.set(iconName, img);
      this.loadingPromises.delete(iconName);
      return img;
    } catch (error) {
      this.loadingPromises.delete(iconName);
      console.warn(`Failed to load icon: ${iconName}`, error);
      return null;
    }
  }

  /**
   * Load icon from CDN
   */
  private static loadIcon(iconName: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = `${this.CDN_BASE}/${iconName}.svg`;

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${url}`));
      img.src = url;
    });
  }

  /**
   * Preload multiple icons
   */
  static async preload(iconNames: string[]): Promise<void> {
    await Promise.all(iconNames.map(name => this.load(name)));
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cached icon synchronously (returns null if not loaded)
   */
  static getCached(iconName: string): HTMLImageElement | null {
    return this.cache.get(iconName) || null;
  }
}
