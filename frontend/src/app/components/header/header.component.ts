import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { WorkspaceSelectorComponent } from '../workspace-selector/workspace-selector.component';
import { WorkspaceService } from '../../services/workspace.service';
import { SettingsPanelComponent } from '../settings-panel/settings-panel.component';
import { AddWidgetModalComponent } from '../add-widget-modal/add-widget-modal.component';
import {
  BrnDialogContentDirective,
  BrnDialogTriggerDirective,
} from '@spartan-ng/brain/dialog';
import {
  HlmDialogComponent,
  HlmDialogContentComponent,
  HlmDialogHeaderComponent,
  HlmDialogFooterComponent,
  HlmDialogTitleDirective,
  HlmDialogDescriptionDirective,
  HlmDialogCloseDirective,
} from '@spartan-ng/ui-dialog-helm';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';

declare const chrome: any;

@Component({
  selector: 'app-header',
  templateUrl: 'header.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    WorkspaceSelectorComponent,
    HlmButtonDirective,
    SettingsPanelComponent,
    AddWidgetModalComponent,
    BrnDialogTriggerDirective,
    BrnDialogContentDirective,
    HlmDialogComponent,
    HlmDialogContentComponent,
    HlmIconDirective,
    NgIcon,
  ],
  providers: [provideIcons({ lucidePlus, lucideX, lucideSearch })],
})
export class HeaderComponent {
  searchQuery = new FormControl('');
  isWorkflowOpen = false;

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  private workspaceService = inject(WorkspaceService);

  handleSearch(): void {
    const query = this.searchQuery.value?.trim();
    if (query && query.length > 0) {
      const searchUrl = `https://unduck.link?q=${encodeURIComponent(query)}`;
      if (chrome && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: searchUrl });
      } else {
        console.warn(
          'Chrome Tabs API not available. Opening in current window (for testing outside extension).'
        );
        window.open(searchUrl, '_blank');
      }
      this.searchQuery.setValue('');
      this.searchInputRef.nativeElement.blur();
    }
  }

  addWidget(widgetData: {
    title: string;
    url: string;
    customCss: string;
  }): void {
    this.workspaceService.addWidget({
      title: widgetData.title,
      url: widgetData.url,
      customCss: widgetData.customCss ?? '',
    });
  }
}
