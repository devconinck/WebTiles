import { effect, Injectable, signal, WritableSignal } from '@angular/core';
import {
  AppSettings,
  BackgroundSettingsValue,
  Theme,
} from '../models/Settings.model';

const SETTINGS_STORAGE_KEY = 'settings';
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  background: {
    type: 'solid',
    value: '#f8fafc', // Slate-50 color
  },
  showSearchBar: true,
  titleOnHover: false,
  showHistory: true,
  showBookmarks: true,
  accentColor: '#3b82f6', // Blue-500 color
  showDragHandlesOnHover: false,
};

declare var chrome: any;

/**
 * Service responsible for managing the application's settings.
 * Handles loading and saving settings, and providing a signal for the current settings.
 * @class SettingsService
 * @description Manages the application's settings state and provides methods for setting manipulation
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly _settings: WritableSignal<AppSettings> =
    signal(DEFAULT_SETTINGS);

  readonly settings = this._settings.asReadonly();

  private isInitialized = false;

  /**
   * Constructor for the SettingsService
   * Initializes the service by loading the settings from Chrome storage
   */
  constructor() {
    this.loadSettings(); // Don't await here, let it run async

    effect(() => {
      // Read the signal to establish dependency
      const currentSettings = this._settings();

      // Save only if initialized
      if (this.isInitialized) {
        // Pass the current settings explicitly
        this.saveSettings(currentSettings);
      } else {
        console.log(
          '[SettingsService Effect] Not initialized yet, skipping save.'
        );
      }
    });
  }

  /**
   * Loads the settings from Chrome storage
   * @throws Error if loading fails
   */
  private async loadSettings(): Promise<void> {
    try {
      // Check if chrome.storage is available early
      if (!chrome?.storage?.local) {
        console.error(
          '[SettingsService] chrome.storage.local is not available.'
        );
        this._settings.set(DEFAULT_SETTINGS);
        this.isInitialized = true;
        console.warn(
          '[SettingsService] Marked as initialized despite storage API error.'
        );
        return;
      }

      const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
      // Check for runtime error after the await
      if (chrome.runtime.lastError) {
        throw new Error(
          `Error loading settings: ${chrome.runtime.lastError.message}`
        );
      }

      const storedSettings = result?.[SETTINGS_STORAGE_KEY] as AppSettings;

      if (storedSettings && Object.keys(storedSettings).length > 0) {
        // Important: Merge defaults with stored settings to handle new default properties
        const mergedSettings = { ...DEFAULT_SETTINGS, ...storedSettings };
        this._settings.set(mergedSettings);
      } else {
        console.log(
          '[SettingsService] No valid settings found in storage, using and saving defaults.'
        );
        this._settings.set(DEFAULT_SETTINGS);
        // Save default settings immediately
        await this.saveSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('[SettingsService] Error during loadSettings:', error);
      console.log(
        '[SettingsService] Falling back to default settings due to error.'
      );
      this._settings.set(DEFAULT_SETTINGS);
    } finally {
      console.log(
        '[SettingsService] Load process finished. Marking initialized.'
      );
      this.isInitialized = true;
    }
  }

  /**
   * Saves the settings to Chrome storage
   * @param settings - The settings to save
   * @throws Error if saving fails
   */
  private async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await chrome.storage.local.set({
        [SETTINGS_STORAGE_KEY]: settings,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Updates a specific setting in the settings service
   * @param key - The key of the setting to update
   * @param value - The new value for the setting
   */
  updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): void {
    this._settings.update((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
    this.saveSettings(this._settings());
  }

  /**
   * Sets the theme in the settings service
   * @param theme - The theme to set
   */
  setTheme(theme: Theme): void {
    this.updateSetting('theme', theme);
  }

  /**
   * Sets the background in the settings service
   * @param background - The background to set
   */
  setBackground(background: BackgroundSettingsValue): void {
    this.updateSetting('background', background);
  }

  /**
   * Sets the showSearchBar in the settings service
   * @param show - The showSearchBar to set
   */
  setShowSearchBar(show: boolean): void {
    this.updateSetting('showSearchBar', show);
  }

  /**
   * Sets the titleOnHover in the settings service
   * @param show - The titleOnHover to set
   */
  setTitleOnHover(show: boolean): void {
    this.updateSetting('titleOnHover', show);
  }

  /**
   * Sets the showHistory in the settings service
   * @param show - The showHistory to set
   */
  setShowHistory(show: boolean): void {
    this.updateSetting('showHistory', show);
  }

  /**
   * Sets the showBookmarks in the settings service
   * @param show - The showBookmarks to set
   */
  setShowBookmarks(show: boolean): void {
    this.updateSetting('showBookmarks', show);
  }

  /**
   * Sets the accentColor in the settings service
   * @param color - The accentColor to set
   */
  setAccentColor(color: string): void {
    this.updateSetting('accentColor', color);
  }

  /**
   * Sets the showDragHandlesOnHover in the settings service
   * @param show - The showDragHandlesOnHover to set
   */
  setShowDragHandlesOnHover(show: boolean): void {
    this.updateSetting('showDragHandlesOnHover', show);
  }
}
