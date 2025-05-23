import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  computed,
  Signal,
} from '@angular/core';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { AsyncPipe, NgFor, NgIf, NgStyle, NgClass } from '@angular/common';
import { Widget } from '../../models/Widget.model';
import { WidgetComponent } from '../widget/widget.component';
import { WorkspaceService } from '../../services/workspace.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { HlmIconDirective } from '../../../../libs/ui/ui-icon-helm/src/lib/hlm-icon.directive';
import { HlmButtonDirective } from '../../../../libs/ui/ui-button-helm/src/lib/hlm-button.directive';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGroup } from '@ng-icons/lucide';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgFor,
    NgIf,

    AsyncPipe,
    DragDropModule,
    WidgetComponent,
    HlmButtonDirective,
    HlmIconDirective,
    NgIcon,
  ],
  providers: [provideIcons({ lucideGroup })],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  widgets$ = this.workspaceService.activeWidgets$;

  //need this because we cant use an Observable in a computed value
  private widgetsSignal: Signal<Widget[]> = toSignal(this.widgets$, {
    initialValue: [],
  });

  hasOffScreenWidgets = computed(() => {
    const currentWidgets = this.widgetsSignal();
    if (!currentWidgets) return false;

    return currentWidgets.some((widget: Widget) => {
      const { x, y } = widget.position;
      const { width, height } = widget;

      return (
        x < -100 ||
        y < -100 ||
        x + width > window.innerWidth + 100 ||
        y + height > window.innerHeight + 100
      );
    });
  });

  constructor() {}

  ngOnInit(): void {}

  removeWidget(widgetId: string): void {
    this.workspaceService.removeWidget(widgetId);
  }

  onDragEnded(event: CdkDragEnd, widget: Widget): void {
    const newPosition = event.source.getFreeDragPosition();

    if (
      widget.position.x === newPosition.x &&
      widget.position.y === newPosition.y
    ) {
      return;
    }

    const updatedWidget: Widget = {
      ...widget,
      position: { x: newPosition.x, y: newPosition.y },
    };

    this.workspaceService.updateWidget(updatedWidget);
  }

  trackWidgetById(index: number, widget: Widget): string {
    return widget.id;
  }

  onWidgetUpdated(updatedWidget: Widget): void {
    this.workspaceService.updateWidget(updatedWidget);
  }

  cascadeWidgets(): void {
    const widgets = this.widgetsSignal();

    if (!widgets) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    widgets.forEach((widget: Widget) => {
      const updatedWidget: Widget = {
        ...widget,
        position: {
          x: centerX - widget.width / 2,
          y: centerY - widget.height / 2,
        },
      };
      this.workspaceService.updateWidget(updatedWidget);
    });
  }
}
