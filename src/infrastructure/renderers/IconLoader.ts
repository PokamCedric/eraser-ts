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
  private static initialized = false;

  /**
   * Top 50 most commonly used Lucide icons (alphabetically sorted)
   * These will be preloaded and available offline for PWA users
   */
  private static readonly COMMON_ICONS = [
    'activity',
    'align-vertical-space-between',
    'ambulance',
    'ampersand',
    'amphora',
    'anchor',
    'angry',
    'antenna',
    'anvil',
    'aperture',
    'app-window',
    'app-window-mac',
    'apple',
    'arrow-big-right-dash',
    'arrow-down',
    'arrow-down-right',
    'arrow-left',
    'arrow-left-right',
    'arrow-right',
    'arrow-right-from-line',
    'arrow-right-left',
    'arrow-up',
    'badge-check',
    'bell',
    'book-check',
    'bookmark-check',
    'calendar-check-2',
    'camera',
    'chevron-left',
    'circle-arrow-right',
    'code',
    'download',
    'edit-2',
    'house',
    'import',
    'list',
    'list-check',
    'menu',
    'minus',
    'pizza',
    'plus',
    'sandwich',
    'search',
    'settings',
    'upload',
    'user',
    'x'
  ];

  /**
   * Initialize icon loader by preloading common icons
   * Should be called once when the application starts
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    this.initialized = true;

    // Preload common icons in the background (don't wait for them)
    this.preload(this.COMMON_ICONS).catch(() => {
      // Silently ignore preload errors
      // Icons will be loaded on-demand if preload fails
    });
  }

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
      // Sanitize icon name - remove invalid characters
      const sanitizedName = iconName.trim().replace(/[^a-z0-9-]/gi, '-').toLowerCase();

      const img = new Image();
      const url = `${this.CDN_BASE}/${sanitizedName}.svg`;

      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load icon "${iconName}" (tried: ${url}). Using fallback.`);
        reject(new Error(`Failed to load: ${url}`));
      };
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
