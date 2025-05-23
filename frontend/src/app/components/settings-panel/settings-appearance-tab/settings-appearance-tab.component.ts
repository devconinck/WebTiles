import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { backgroundType, Theme } from '../../../models/Settings.model';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { provideIcons, NgIcon } from '@ng-icons/core';
import {
  lucideMoon,
  lucideSun,
  lucideMonitor,
  lucidePalette,
  lucideImage,
  lucideCheck,
  lucideContrast,
} from '@ng-icons/lucide';

import { HlmSeparatorDirective } from '@spartan-ng/ui-separator-helm';
import { BrnSeparatorComponent } from '@spartan-ng/brain/separator';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { HlmSwitchComponent } from '@spartan-ng/ui-switch-helm';
import { BrnSwitchComponent } from '@spartan-ng/brain/switch';
import { HlmSliderComponent } from '@spartan-ng/ui-slider-helm';
import {
  HlmScrollAreaDirective,
  HlmScrollAreaModule,
} from '@spartan-ng/ui-scrollarea-helm';
import { SettingsService } from '../../../services/settings.service';
import { ThemeService } from '../../../services/theme.service';

interface GradientPreset {
  name: string;
  value: string;
  preview: string;
}

interface ColorPreset {
  name: string;
  value: string;
  preview: string;
}

interface ImagePreset {
  name: string;
  value: string;
}

@Component({
  selector: 'app-appearance-settings',
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    HlmSeparatorDirective,
    BrnSeparatorComponent,
    HlmLabelDirective,
  ],
  standalone: true,
  providers: [
    provideIcons({
      lucideMoon,
      lucideSun,
      lucideMonitor,
      lucidePalette,
      lucideImage,
      lucideCheck,
      lucideContrast,
    }),
  ],
  templateUrl: './settings-appearance-tab.component.html',
})
export class AppearanceSettingsComponent {
  protected readonly settingsService = inject(SettingsService);
  private readonly themeService = inject(ThemeService);

  protected readonly settings = this.settingsService.settings;
  protected readonly currentTheme = computed(() => this.settings().theme);

  protected backgroundTab = signal<backgroundType>(
    this.settings().background.type || 'solid'
  );
  protected customImageUrl = signal<string>('');

  protected readonly gradientPresets: GradientPreset[] = [
    {
      name: 'Blueberry',
      value: 'linear-gradient(to right bottom, #4f46e5, #0ea5e9)',
      preview: 'from-indigo-600 to-sky-500',
    },
    {
      name: 'Sunset',
      value: 'linear-gradient(to right bottom, #f97316, #db2777)',
      preview: 'from-orange-500 to-pink-600',
    },
    {
      name: 'Forest',
      value: 'linear-gradient(to right bottom, #16a34a, #65a30d)',
      preview: 'from-green-600 to-lime-600',
    },
    {
      name: 'Lavender',
      value: 'linear-gradient(to right bottom, #8b5cf6, #ec4899)',
      preview: 'from-violet-500 to-pink-500',
    },
    {
      name: 'Midnight',
      value: 'linear-gradient(to right bottom, #1e293b, #0f172a)',
      preview: 'from-slate-700 to-slate-900',
    },
    {
      name: 'Sunrise',
      value: 'linear-gradient(to right bottom, #fbbf24, #ef4444)',
      preview: 'from-amber-400 to-red-500',
    },
  ];

  protected readonly colorPresets: ColorPreset[] = [
    { name: 'Slate', value: '#f8fafc', preview: 'bg-slate-50' },
    { name: 'Gray', value: '#f9fafb', preview: 'bg-gray-50' },
    { name: 'Zinc', value: '#fafafa', preview: 'bg-zinc-50' },
    { name: 'Neutral', value: '#fafafa', preview: 'bg-neutral-50' },
    { name: 'Stone', value: '#fafaf9', preview: 'bg-stone-50' },
    { name: 'Blue', value: '#eff6ff', preview: 'bg-blue-50' },
    { name: 'Red', value: '#fef2f2', preview: 'bg-red-50' },
    { name: 'Green', value: '#f0fdf4', preview: 'bg-green-50' },
    { name: 'Purple', value: '#faf5ff', preview: 'bg-purple-50' },
  ];

  protected readonly imagePresets: ImagePreset[] = [
    {
      name: 'Mountains',
      value: '/dist/browser/assets/backgrounds/bg_mountain.png',
    },
    { name: 'Ocean', value: '/dist/browser/assets/backgrounds/bg_ocean.png' },
    { name: 'Code', value: '/dist/browser/assets/backgrounds/bg_code.png' },
    {
      name: 'Abstract',
      value: '/dist/browser/assets/backgrounds/bg_abstract.png',
    },
    // { name: 'Custom', value: '' },
  ];

  protected readonly accentColors: ColorPreset[] = [
    { name: 'Blue', value: '#3b82f6', preview: 'bg-blue-500' },
    { name: 'Red', value: '#ef4444', preview: 'bg-red-500' },
    { name: 'Green', value: '#22c55e', preview: 'bg-green-500' },
    { name: 'Purple', value: '#a855f7', preview: 'bg-purple-500' },
    { name: 'Pink', value: '#ec4899', preview: 'bg-pink-500' },
    { name: 'Orange', value: '#f97316', preview: 'bg-orange-500' },
    { name: 'Yellow', value: '#eab308', preview: 'bg-yellow-500' },
    { name: 'Teal', value: '#14b8a6', preview: 'bg-teal-500' },
  ];

  constructor() {
    effect(() => {
      this.backgroundTab.set(this.settings().background.type || 'solid');
    });
  }

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  onThemeChange(newTheme: Theme): void {
    this.settingsService.setTheme(newTheme);
  }

  onBackgroundTabChange(newType: backgroundType): void {
    // Only update the tab state, don't change the background
    this.backgroundTab.set(newType);
  }

  onBackgroundValueChange(newValue: string): void {
    this.settingsService.setBackground({
      type: this.backgroundTab(),
      value: newValue,
    });
  }

  onCustomImageUrlChange(url: string): void {
    if (url && url.trim() !== '') {
      // Validate URL format
      try {
        new URL(url);
        // Update the custom preset's value
        this.imagePresets[4].value = url;
        // Update the background
        this.settingsService.setBackground({
          type: 'image',
          value: url,
        });
      } catch (e) {
        // Invalid URL, don't update
        console.warn('Invalid image URL:', url);
      }
    }
  }

  isBackgroundSelected(type: backgroundType, value: string): boolean {
    return (
      this.settings().background.type === type &&
      this.settings().background.value === value
    );
  }

  onToggleGoogleSearch(value: boolean): void {
    this.settingsService.setShowSearchBar(value);
  }

  onToggleHeaderOnHover(value: boolean): void {
    this.settingsService.setTitleOnHover(value);
  }

  onToggleHistoryShortcut(value: boolean): void {
    this.settingsService.setShowHistory(value);
  }

  onToggleBookmarksShortcut(value: boolean): void {
    this.settingsService.setShowBookmarks(value);
  }

  onAccentColorChange(color: string): void {
    this.settingsService.setAccentColor(color);
  }
}
