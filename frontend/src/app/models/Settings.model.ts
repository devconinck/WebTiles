export type Theme = 'light' | 'dark';
export type backgroundType = 'gradient' | 'solid' | 'image';
export type widgetStyle = 'glass' | 'solid';

/**
 * Represents the background settings value.
 * @interface BackgroundSettingsValue
 * @property {backgroundType} type - The type of background.
 * @property {string} value - The value of the background.
 */
export interface BackgroundSettingsValue {
  type: backgroundType;
  value: string;
}

/**
 * Represents the application settings.
 * @interface AppSettings
 * @property {Theme} theme - The theme of the application.
 * @property {BackgroundSettingsValue} background - The background settings value.
 * @property {boolean} showSearchBar - Whether the search bar is visible.
 * @property {boolean} titleOnHover - Whether the title is visible on hover.
 * @property {boolean} showHistory - Whether the history is visible.
 * @property {boolean} showBookmarks - Whether the bookmarks are visible.
 * @property {string} accentColor - The accent color of the application.
 * @property {boolean} showDragHandlesOnHover - Whether the drag handles are visible on hover.
 */
export interface AppSettings {
  theme: Theme;
  background: BackgroundSettingsValue;
  showSearchBar: boolean;
  titleOnHover: boolean;
  showHistory: boolean;
  showBookmarks: boolean;
  accentColor: string;
  showDragHandlesOnHover: boolean;
}
