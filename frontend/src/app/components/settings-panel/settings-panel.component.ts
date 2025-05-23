import { Component, inject } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { provideIcons, NgIcon } from '@ng-icons/core';
import { lucideMoon, lucideSettings, lucideSun } from '@ng-icons/lucide';

import { HlmSeparatorDirective } from '@spartan-ng/ui-separator-helm';
import { BrnSeparatorComponent } from '@spartan-ng/brain/separator';
import { AppearanceSettingsComponent } from './settings-appearance-tab/settings-appearance-tab.component';

import {
  BrnPopoverComponent,
  BrnPopoverContentDirective,
  BrnPopoverTriggerDirective,
} from '@spartan-ng/brain/popover';
import { HlmPopoverContentDirective } from '@spartan-ng/ui-popover-helm';
import {
  HlmTabsComponent,
  HlmTabsContentDirective,
  HlmTabsListComponent,
  HlmTabsTriggerDirective,
} from '@spartan-ng/ui-tabs-helm';
import { backgroundType, Theme } from '../../models/Settings.model';
import {
  HlmRadioComponent,
  HlmRadioGroupComponent,
  HlmRadioIndicatorComponent,
} from '@spartan-ng/ui-radiogroup-helm';
import { FormsModule } from '@angular/forms';
import { SettingsGeneralTabComponent } from './settings-general-tab/settings-general-tab.component';
import { SettingsShortcutsTabComponent } from './settings-shortcuts-tab/settings-shortcuts-tab.component';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [
    HlmButtonDirective,
    NgIcon,
    HlmIconDirective,
    BrnPopoverComponent,
    BrnPopoverTriggerDirective,
    BrnPopoverContentDirective,
    HlmPopoverContentDirective,
    HlmTabsComponent,
    HlmTabsListComponent,
    HlmTabsTriggerDirective,
    HlmTabsContentDirective,
    FormsModule,
    AppearanceSettingsComponent,
    SettingsGeneralTabComponent,
    SettingsShortcutsTabComponent,
  ],
  templateUrl: './settings-panel.component.html',
  providers: [
    provideIcons({
      lucideSettings,
      lucideMoon,
      lucideSun,
    }),
  ],
})
export class SettingsPanelComponent {
  protected readonly settingsService = inject(SettingsService);
  protected readonly settings = this.settingsService.settings;

  protected activeTab = 'general';

  onThemeChange(newTheme: Theme): void {
    this.settingsService.setTheme(newTheme);
  }

  onBackgroundChange(newBackground: backgroundType): void {
    let defaultValue: string = '';

    if (newBackground === 'solid') {
      defaultValue = '#000000';
    } else if (newBackground === 'gradient') {
      defaultValue = 'linear-gradient(90deg, #000000, #FFFFFF)';
    } else if (newBackground === 'image') {
      defaultValue = '';
    }

    this.settingsService.setBackground({
      type: newBackground,
      value: defaultValue,
    });
  }

  onBackgroundValueChange(newValue: string): void {
    this.settingsService.setBackground({
      type: this.settings().background.type,
      value: newValue,
    });
  }

  get backgroundColorValue(): string {
    return this.settings().background.value;
  }

  set backgroundColorValue(value: string) {
    this.onBackgroundValueChange(value);
  }
}
