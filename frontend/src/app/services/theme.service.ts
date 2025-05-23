import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  OnDestroy,
  inject,
  PLATFORM_ID,
  RendererFactory2,
  Renderer2,
  effect,
  signal,
  computed,
} from '@angular/core';
import { SettingsService } from './settings.service';
import { Theme } from '../models/Settings.model';

/**
 * Service responsible for managing the application's theme settings.
 * Handles theme initialization, dark mode toggling, and compatibility with localStorage.
 * @class ThemeService
 * @description Manages the application's theme state and provides methods for theme manipulation
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  private readonly settingsService = inject(SettingsService);
  private readonly document = inject(DOCUMENT);
  private readonly renderer: Renderer2;

  /**
   * Computed signal representing the current theme
   * @returns The current theme setting from the settings service
   */
  private currentTheme = computed(() => this.settingsService.settings().theme);

  /**
   * Constructor for the ThemeService
   * Initializes the service by creating a renderer and initializing the theme
   */
  constructor() {
    const rendererFactory = inject(RendererFactory2);
    this.renderer = rendererFactory.createRenderer(null, null);

    // Initialize theme on service creation
    this.initializeTheme();

    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  /**
   * Initializes the theme based on the current settings
   * Applies the theme to the document and updates localStorage
   */
  private initializeTheme(): void {
    // Get initial theme from settings
    const theme = this.settingsService.settings().theme;
    this.applyTheme(theme);
  }

  /**
   * Applies the theme to the document and updates localStorage
   * @param theme - The theme to apply
   */
  private applyTheme(theme: Theme): void {
    if (theme === 'dark') {
      this.renderer.addClass(this.document.documentElement, 'dark');
      this.renderer.addClass(this.document.body, 'dark');
      // Also update localStorage for compatibility
      localStorage.setItem('theme', 'dark');
    } else {
      this.renderer.removeClass(this.document.documentElement, 'dark');
      this.renderer.removeClass(this.document.body, 'dark');
      // Also update localStorage for compatibility
      localStorage.setItem('theme', 'light');
    }
  }

  /**
   * Toggles the theme between dark and light
   * Updates the theme in the settings service and applies the new theme
   */
  public toggleDarkMode(): void {
    const newTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.settingsService.setTheme(newTheme);
  }

  /**
   * Destroys the service when the component is destroyed
   */
  ngOnDestroy(): void {}
}
