import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  ChangeDetectorRef,
  signal,
  ElementRef,
  ViewChild,
  inject,
  SimpleChanges,
  HostListener,
  effect,
  Renderer2,
  computed,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { Widget } from '../../models/Widget.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ResizableDirective } from '../../directives/resizable.directive';
import { lucidePaintbrush, lucideRefreshCw, lucideX } from '@ng-icons/lucide';

import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { AddCssModalComponent } from '../add-css-modal/add-css-modal.component';
import {
  BrnDialogTriggerDirective,
  BrnDialogContentDirective,
} from '@spartan-ng/brain/dialog';
import {
  HlmDialogComponent,
  HlmDialogContentComponent,
} from '@spartan-ng/ui-dialog-helm';
import { AddWidgetModalComponent } from '../add-widget-modal/add-widget-modal.component';
import { SettingsService } from '../../services/settings.service';

declare var chrome: any;

@Component({
  selector: 'app-widget',
  standalone: true,
  imports: [
    NgIf,
    ResizableDirective,
    HlmIconDirective,
    NgIcon,
    AddCssModalComponent,
    BrnDialogTriggerDirective,
    BrnDialogContentDirective,
    HlmDialogComponent,
    HlmDialogContentComponent,
    HlmButtonDirective,
  ],
  providers: [provideIcons({ lucidePaintbrush, lucideRefreshCw, lucideX })],
  templateUrl: './widget.component.html',
})
export class WidgetComponent implements OnInit, OnChanges {
  private readonly settingsService = inject(SettingsService);
  protected readonly showHeaderOnHover = computed(
    () => this.settingsService.settings().showDragHandlesOnHover
  );
  protected readonly accentColor = computed(
    () => this.settingsService.settings().accentColor
  );

  @Input() widget!: Widget;
  @Output() remove = new EventEmitter<string>();
  @Output() widgetChange = new EventEmitter<Widget>();

  showElementSelector = false;
  @ViewChild('widgetIframe') iframeEl!: ElementRef<HTMLIFrameElement>;

  safeUrl = signal<SafeResourceUrl | null>(null);
  isLoading = signal<boolean>(true);
  private isRetrying = false;
  private previousUrl: string | null = null;
  faviconUrl = signal<string | null>(null);
  showHandleBelow = signal<boolean>(false);
  private readonly HANDLE_AREA_HEIGHT = 100;

  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private registrationAttempted = false;
  private static highestZIndex = 100; // Lower base z-index for widgets
  private static readonly UI_Z_INDEX = 9999; // Z-index for UI components

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {
    effect(() => {
      const currentSafeUrl = this.safeUrl();
      // Only attempt registration once per URL update
      if (currentSafeUrl && !this.registrationAttempted) {
        let urlString = '';
        if (typeof currentSafeUrl === 'string') {
          urlString = currentSafeUrl;
        } else if (
          typeof currentSafeUrl === 'object' &&
          currentSafeUrl !== null &&
          'changingThisBreaksApplicationSecurity' in currentSafeUrl
        ) {
          urlString = (
            currentSafeUrl as {
              changingThisBreaksApplicationSecurity: string;
            }
          ).changingThisBreaksApplicationSecurity;
        }

        if (urlString && urlString !== 'about:blank') {
          this.prepareWidgetTracking();
          this.registrationAttempted = true; // Mark as attempted
        }
      }
    });
  }

  ngOnInit(): void {
    this.updateSafeUrl();
    this.updateFaviconUrl();
    this.checkHandlePosition();

    const initialCss = this.widget?.customCss?.trim();
    if (initialCss) {
      this.injectCss(initialCss);
    }
  }

  updateFaviconUrl(): void {
    if (this.widget?.url && chrome.runtime && chrome.runtime.getURL) {
      const faviconPath = `_favicon/?pageUrl=${encodeURIComponent(this.widget.url)}&size=32`;
      const fullFaviconUrl = chrome.runtime.getURL(faviconPath);
      this.faviconUrl.set(fullFaviconUrl);
    } else {
      this.faviconUrl.set(null);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['widget']) {
      const currentWidget = changes['widget'].currentValue as Widget;
      const previousWidget = changes['widget'].previousValue as
        | Widget
        | undefined;
      let iframeReloaded = false;

      if (this.previousUrl !== currentWidget.url) {
        this.registrationAttempted = false;
        this.updateSafeUrl();
        iframeReloaded = true;
      }

      if (!previousWidget || currentWidget.url !== previousWidget.url) {
        this.updateFaviconUrl();
      }

      this.checkHandlePosition();

      const newCss = currentWidget.customCss?.trim();
      const oldCss = previousWidget?.customCss?.trim();

      if (newCss) {
        if (iframeReloaded || newCss !== oldCss) {
          this.injectCss(newCss);
        }
      } else if (oldCss && !newCss) {
        console.warn(
          `Custom CSS for widget ${currentWidget.id} was cleared. Styles may persist until iframe reload or explicit removal is implemented.`
        );
      }
    }
  }

  ngOnDestroy(): void {
    this.unregisterWidget();
  }

  ngAfterViewInit(): void {
    this.checkHandlePosition();
  }

  public checkHandlePosition(): void {
    if (typeof window !== 'undefined' && this.elementRef?.nativeElement) {
      const rect = this.elementRef.nativeElement.getBoundingClientRect();
      this.showHandleBelow.set(rect.top < this.HANDLE_AREA_HEIGHT);
      this.cdr.detectChanges();
    }
  }

  private updateSafeUrl(): void {
    if (this.widget && this.widget.url && this.widget.url.trim() !== '') {
      this.previousUrl = this.widget.url;
      let originalUrl = this.widget.url;

      this.safeUrl.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(originalUrl)
      );
      this.isRetrying = false;
      return;
    }
  }

  removeWidget(): void {
    this.remove.emit(this.widget.id);
  }

  onIframeLoad(): void {
    this.isLoading.set(false);
    this.checkHandlePosition();
  }

  onIframeError(): void {
    if (!this.isRetrying && this.widget && this.widget.url) {
      this.isRetrying = true;
      this.registrationAttempted = false;
      const originalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.widget.url
      );
      this.safeUrl.set(originalUrl);
      this.isLoading.set(true);
      this.cdr.detectChanges();
    }
  }

  onWidgetResized(event: {
    width: number;
    height: number;
    deltaX?: number;
    deltaY?: number;
  }): void {
    const updatedWidget: Widget = {
      ...this.widget,
      width: event.width,
      height: event.height,
      position: {
        // Update position if deltas are provided
        x: this.widget.position.x + (event.deltaX || 0),
        y: this.widget.position.y + (event.deltaY || 0),
      },
    };
    this.widgetChange.emit(updatedWidget);
    this.checkHandlePosition(); // In case height change affects this
  }

  onCustomCssSaved(css: string): void {
    if (this.widget) {
      const updatedWidget: Widget = {
        ...this.widget,
        customCss: css,
      };
      this.widgetChange.emit(updatedWidget);
      if (css.trim() !== '') {
        this.injectCss(css);
      }
    }
  }

  prepareWidgetTracking(): void {
    if (chrome.runtime && chrome.runtime.id && this.widget?.id) {
      console.log(`Preparing tracking for widget: ${this.widget.id}`);
      chrome.runtime.sendMessage({
        type: 'PREPARE_WIDGET_TRACKING',
        payload: { widgetId: this.widget.id, widgetSrc: this.widget.url },
      });
    } else {
      console.warn(
        'Chrome runtime not available or widget ID missing for tracking preparation.'
      );
    }
  }

  injectCss(css: string): void {
    console.log('Injecting CSS:', css);
    if (chrome.runtime && chrome.runtime.id && this.widget?.id) {
      console.log(`Requesting CSS injection for widget: ${this.widget.id}`);
      chrome.runtime.sendMessage(
        {
          type: 'INJECT_CSS',
          payload: { widgetId: this.widget.id, css: css },
        },
        (response: { success: boolean; message?: string; error?: string }) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            return;
          }
          if (response?.success) {
            console.log('CSS injection successful:', response.message);
          } else {
            console.error('CSS injection failed:', response?.error);
          }
        }
      );
    } else {
      console.warn(
        'Chrome runtime not available or widget ID missing for CSS injection.'
      );
    }
  }

  unregisterWidget(): void {
    if (chrome.runtime && chrome.runtime.id && this.widget?.id) {
      console.log(`Unregistering widget: ${this.widget.id}`);
      chrome.runtime.sendMessage({
        type: 'UNREGISTER_WIDGET',
        payload: { widgetId: this.widget.id },
      });
    }
  }

  refreshWidget(): void {
    if (this.iframeEl?.nativeElement) {
      this.isLoading.set(true);
      const currentSrc = this.iframeEl.nativeElement.src;
      this.iframeEl.nativeElement.src = 'about:blank';
      setTimeout(() => {
        this.iframeEl.nativeElement.src = currentSrc;
      }, 100);
    }
  }

  private bringToFront(): void {
    // Only increment if we're not already at or above UI z-index
    const currentZIndex = parseInt(
      this.elementRef.nativeElement.style.zIndex || '0'
    );
    if (currentZIndex < WidgetComponent.UI_Z_INDEX) {
      WidgetComponent.highestZIndex = Math.min(
        WidgetComponent.highestZIndex + 1,
        WidgetComponent.UI_Z_INDEX - 1
      );
      this.renderer.setStyle(
        this.elementRef.nativeElement,
        'z-index',
        WidgetComponent.highestZIndex.toString()
      );
    }
  }

  @HostListener('click')
  onWidgetClick(): void {
    this.bringToFront();
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    // Only bring to front if the mousedown is on the widget itself or its header
    const target = event.target as HTMLElement;
    if (
      target.closest('.cursor-move') ||
      target === this.elementRef.nativeElement
    ) {
      this.bringToFront();
    }
  }
}
