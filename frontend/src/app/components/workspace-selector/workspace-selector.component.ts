import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideChevronsUpDown,
  lucideCirclePlus,
  lucideDownload,
  lucidePencil,
  lucideSave,
  lucideSearch,
  lucideSettings,
  lucideShare2,
  lucideTrash2,
  lucideUpload,
  lucideX,
} from '@ng-icons/lucide';
import { BrnCommandImports } from '@spartan-ng/brain/command';
import {
  BrnPopoverComponent,
  BrnPopoverContentDirective,
  BrnPopoverTriggerDirective,
} from '@spartan-ng/brain/popover';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmCommandImports } from '@spartan-ng/ui-command-helm';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmSelectImports } from '@spartan-ng/ui-select-helm';
import { Workspace } from '../../models/Workspace.model';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-selector',
  standalone: true,
  imports: [
    BrnSelectImports,
    HlmSelectImports,
    FormsModule,
    BrnPopoverComponent,
    BrnPopoverTriggerDirective,
    BrnPopoverContentDirective,
    BrnCommandImports,
    HlmCommandImports,
    NgIcon,
    NgIf,
    NgFor,
    AsyncPipe,
    HlmButtonDirective,
    HlmIconDirective,
    HlmInputDirective,
  ],
  providers: [
    provideIcons({
      lucideChevronsUpDown,
      lucideSearch,
      lucideSettings,
      lucideCheck,
      lucideCirclePlus,
      lucidePencil,
      lucideTrash2,
      lucideSave,
      lucideX,
      lucideDownload,
      lucideUpload,
      lucideShare2,
    }),
  ],
  templateUrl: './workspace-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSelectorComponent {
  private workspaceService = inject(WorkspaceService);

  workspaces$ = this.workspaceService.workspaces$;
  activeWorkspace$ = this.workspaceService.activeWorkspace$;

  editingWorkspaceId = signal<string | null>(null);
  editingWorkspaceName = signal('');
  newWorkspaceName = signal('');
  showAdvancedOptions = signal(false);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectWorkspace(workspace: Workspace | null): void {
    if (workspace) {
      this.workspaceService.setActiveWorkspace(workspace.id);
    }
  }

  startEditing(workspace: Workspace): void {
    this.editingWorkspaceId.set(workspace.id);
    this.editingWorkspaceName.set(workspace.name);

    setTimeout(() => {
      const inputId = `edit-input-${workspace.id}`;
      const inputElement = document.getElementById(
        inputId
      ) as HTMLInputElement | null;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    });
  }

  cancelEditing(): void {
    this.editingWorkspaceId.set(null);
    this.editingWorkspaceName.set('');
  }

  saveEditing(): void {
    const id = this.editingWorkspaceId();
    const newName = this.editingWorkspaceName().trim();
    if (id && newName) {
      this.workspaceService.renameWorkspace(id, newName);
    }
    this.cancelEditing();
  }

  handleEditKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.saveEditing();
    } else if (event.key === 'Escape') {
      this.cancelEditing();
    }
  }

  removeWorkspace(id: string, isSelected: boolean): void {
    this.workspaceService.removeWorkspace(id);
    if (this.editingWorkspaceId() === id) {
      this.cancelEditing();
    }
  }

  addWorkspace(): void {
    const name = this.newWorkspaceName().trim();
    if (name) {
      this.workspaceService.addWorkspace(name);
      this.newWorkspaceName.set('');
    }
  }

  handleAddKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addWorkspace();
    }
  }

  exportWorkspace(workspace: Workspace): void {
    this.workspaceService.exportWorkspace(workspace);
  }

  exportAllWorkspaces(): void {
    this.workspaceService.exportAllWorkspaces();
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  handleFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);

        // Handle both single workspace and multiple workspaces
        const workspacesToImport = Array.isArray(parsedData)
          ? parsedData // Multiple workspaces
          : [parsedData]; // Single workspace

        // Validate that each item has the required workspace properties
        if (
          !workspacesToImport.every(
            (ws) => ws.id && ws.name && Array.isArray(ws.widgets)
          )
        ) {
          throw new Error('Invalid workspace format');
        }

        this.workspaceService.importWorkspaces(workspacesToImport);

        // Reset file input
        this.fileInput.nativeElement.value = '';
      } catch (error) {
        console.error('Error processing import:', error);
        // You might want to show a toast notification here
      }
    };
    reader.readAsText(file);
  }

  // shareWorkspace(workspace: Workspace): void {
  //   const dataStr = JSON.stringify(workspace);
  //   navigator.clipboard
  //     .writeText(dataStr)
  //     .then(() => {
  //       // You might want to show a toast notification here
  //     })
  //     .catch((err) => {
  //       console.error('Could not copy text: ', err);
  //     });
  // }
}
