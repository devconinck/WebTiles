import { Component, inject } from '@angular/core';
import { SettingsService } from '../../../services/settings.service';
import { HlmSwitchComponent } from '../../../../../libs/ui/ui-switch-helm/src/lib/hlm-switch.component';

@Component({
  selector: 'app-settings-general-tab',
  imports: [HlmSwitchComponent],
  templateUrl: './settings-general-tab.component.html',
  styles: ``,
})
export class SettingsGeneralTabComponent {
  private readonly settingsService = inject(SettingsService);
  protected readonly settings = this.settingsService.settings;

  onToggleHeaderOnHover(value: boolean): void {
    this.settingsService.setShowDragHandlesOnHover(value);
  }
}
