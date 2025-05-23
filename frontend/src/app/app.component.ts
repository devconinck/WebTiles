import { Component, computed, inject, signal, Signal } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SettingsService } from './services/settings.service';
import { NgClass, NgStyle, NgIf } from '@angular/common';
import { ThemeService } from './services/theme.service';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMaximize, lucideMinimize } from '@ng-icons/lucide';

/**
 * Root component for the WebTiles application.
 * Manages the application's state and provides the main layout.
 * @class AppComponent
 * @description Manages the application's state and provides the main layout
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    DashboardComponent,
    NgStyle,
    NgClass,
    HlmButtonDirective,
    HlmIconDirective,
    NgIcon,
  ],
  providers: [provideIcons({ lucideMaximize, lucideMinimize })],
  template: `
    <div class="flex h-screen w-full flex-col" [ngStyle]="backgroundStyles()">
      <app-header
        class="flex-shrink-0"
        [ngClass]="{ hidden: isFullscreen() }"
      ></app-header>
      <app-dashboard class="flex-grow overflow-hidden"></app-dashboard>

      <button
        hlmBtn
        size="icon"
        variant="outline"
        (click)="toggleFullscreen()"
        class="fixed right-4 bottom-4 z-9999 rounded-full p-2"
      >
        @if (!isFullscreen()) {
          <ng-icon hlm size="sm" name="lucideMaximize" />
        } @else {
          <ng-icon hlm size="sm" name="lucideMinimize" />
        }
      </button>
    </div>
  `,
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'WebTiles';
  private settingsService = inject(SettingsService);
  isFullscreen = signal(false);

  settings = this.settingsService.settings;

  /**
   * Toggles the fullscreen state
   */
  toggleFullscreen() {
    this.isFullscreen.update((fullscreen) => !fullscreen);
  }

  /**
   * Computes the background styles based on the current settings
   * @returns The computed background styles
   */
  backgroundStyles: Signal<{ [key: string]: string }> = computed(() => {
    const backgroundSetting = this.settings().background;
    let style: { [key: string]: string } = {};

    if (backgroundSetting?.value) {
      const baseStyles = {
        'background-size': 'cover',
        'background-position': 'center',
        'background-repeat': 'no-repeat',
        transition: 'background 0.3s ease-in-out',
      };

      switch (backgroundSetting.type) {
        case 'solid':
          style = {
            ...baseStyles,
            'background-color': backgroundSetting.value,
            'background-image': 'none',
          };
          break;
        case 'gradient':
          style = {
            ...baseStyles,
            background: backgroundSetting.value,
          };
          break;
        case 'image':
          let imageUrl = backgroundSetting.value;
          if (imageUrl === 'custom') {
            return style;
          }
          if (!imageUrl.startsWith('url(')) {
            imageUrl = `url('${imageUrl}')`;
          }
          style = {
            ...baseStyles,
            'background-image': imageUrl,
            'background-color': 'transparent',
            'background-size': 'cover',
            'background-position': 'center',
            'background-repeat': 'no-repeat',
            'background-attachment': 'fixed',
          };
          break;
      }
    }
    return style;
  });

  /**
   * Constructor for the AppComponent
   * Initializes the theme service
   */
  constructor() {
    // Initialize theme service
    const themeService = inject(ThemeService);
  }
}
