import {
  Directive,
  ElementRef,
  Renderer2,
  OnInit,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  NgZone,
  HostListener, // Import HostListener
} from '@angular/core';
import { Widget } from '../models/Widget.model';

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | null;

/**
 * Directive for making elements resizable.
 * @class ResizableDirective
 * @description Allows elements to be resized by dragging their edges or corners
 */
@Directive({
  selector: '[appResizable]',
  standalone: true,
})
export class ResizableDirective implements OnInit, OnDestroy {
  @Input() widget!: Widget;
  /**
   * Event emitter for when the widget is resized.
   * @type {EventEmitter<{width: number, height: number, deltaX?: number, deltaY?: number}>}
   */
  @Output() resized = new EventEmitter<{
    width: number;
    height: number;
    deltaX?: number; // How much the widget's x position should change
    deltaY?: number; // How much the widget's y position should change
  }>();

  /**
   * Whether the widget is currently being resized.
   * @type {boolean}
   */
  private resizing = false;
  private startX = 0;
  private startY = 0;
  private startWidth = 0;
  private startHeight = 0;
  private startLeft = 0; // Initial left of the element (from getBoundingClientRect)
  private startTop = 0; // Initial top of the element (from getBoundingClientRect)

  /**
   * The current resize direction.
   * @type {ResizeDirection}
   */
  private currentResizeDirection: ResizeDirection = null;
  private readonly resizeZoneSize = 8; // Px, how thick the "active" border is for resizing

  /**
   * The resize overlay element.
   * @type {HTMLElement | null}
   */
  private resizeOverlay: HTMLElement | null = null;

  /**
   * The preview outline element.
   * @type {HTMLElement | null}
   */
  private previewOutline: HTMLElement | null = null;

  /**
   * The preview outline element.
   * @type {HTMLElement | null}
   */

  private documentMouseMoveListener: (() => void) | null = null;
  private documentMouseUpListener: (() => void) | null = null;

  /**
   * The constructor for the ResizableDirective.
   * @param el - The element to be resized.
   * @param renderer - The renderer to be used.
   * @param zone - The zone to be used.
   */
  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private zone: NgZone
  ) {}

  /**
   * The onInit method for the ResizableDirective.
   */
  ngOnInit(): void {
    // Mousemove on the element itself to set cursor and detect zone
    this.renderer.listen(
      this.el.nativeElement,
      'mousemove',
      (event: MouseEvent) => {
        if (!this.resizing) {
          this.updateCursorAndDirection(event);
        }
      }
    );

    // Mouseleave to reset cursor
    this.renderer.listen(
      this.el.nativeElement,
      'mouseleave',
      (event: MouseEvent) => {
        if (!this.resizing) {
          this.renderer.setStyle(this.el.nativeElement, 'cursor', 'default');
          this.currentResizeDirection = null;
        }
      }
    );

    // Mousedown to start resizing
    this.renderer.listen(
      this.el.nativeElement,
      'mousedown',
      (event: MouseEvent) => {
        // Ensure mousedown is on the host and a resize direction is active
        if (
          event.target === this.el.nativeElement &&
          this.currentResizeDirection
        ) {
          this.startResize(event, this.currentResizeDirection);
        }
      }
    );
  }

  /**
   * The onDestroy method for the ResizableDirective.
   */
  ngOnDestroy(): void {
    this.removeGlobalListeners();
    this.removeResizeOverlay();
    this.removePreviewOutline();
  }

  /**
   * Updates the cursor and direction based on the mouse event.
   * @param event - The mouse event.
   */
  private updateCursorAndDirection(event: MouseEvent): void {
    const rect = this.el.nativeElement.getBoundingClientRect();
    // offsetX/Y are relative to the padding box of the target element.
    const x = event.offsetX;
    const y = event.offsetY;
    const width = this.el.nativeElement.clientWidth; // Inner width (excluding padding if box-sizing is content-box)
    const height = this.el.nativeElement.clientHeight; // Inner height

    let direction: ResizeDirection = null;
    let cursor = 'default';

    const onLeftEdge = x < this.resizeZoneSize;
    const onRightEdge = x > width - this.resizeZoneSize;
    const onTopEdge = y < this.resizeZoneSize;
    const onBottomEdge = y > height - this.resizeZoneSize;

    if (onTopEdge && onLeftEdge) {
      direction = 'nw';
      cursor = 'nwse-resize'; // Or nw-resize
    } else if (onTopEdge && onRightEdge) {
      direction = 'ne';
      cursor = 'nesw-resize'; // Or ne-resize
    } else if (onBottomEdge && onLeftEdge) {
      direction = 'sw';
      cursor = 'nesw-resize'; // Or sw-resize
    } else if (onBottomEdge && onRightEdge) {
      direction = 'se';
      cursor = 'nwse-resize'; // Or se-resize
    } else if (onTopEdge) {
      direction = 'n';
      cursor = 'ns-resize';
    } else if (onBottomEdge) {
      direction = 's';
      cursor = 'ns-resize';
    } else if (onLeftEdge) {
      direction = 'w';
      cursor = 'ew-resize';
    } else if (onRightEdge) {
      direction = 'e';
      cursor = 'ew-resize';
    }

    this.renderer.setStyle(this.el.nativeElement, 'cursor', cursor);
    this.currentResizeDirection = direction;
  }

  /**
   * Creates the resize overlay.
   */
  private createResizeOverlay(): void {
    this.resizeOverlay = this.renderer.createElement('div');
    this.renderer.setStyle(this.resizeOverlay, 'position', 'fixed');
    this.renderer.setStyle(this.resizeOverlay, 'top', '0');
    this.renderer.setStyle(this.resizeOverlay, 'left', '0');
    this.renderer.setStyle(this.resizeOverlay, 'width', '100vw');
    this.renderer.setStyle(this.resizeOverlay, 'height', '100vh');
    this.renderer.setStyle(
      this.resizeOverlay,
      'background-color',
      'transparent'
    );
    this.renderer.setStyle(this.resizeOverlay, 'z-index', '9999');
    // Cursor for overlay will be set in startResize based on direction
    this.renderer.appendChild(document.body, this.resizeOverlay);
  }

  /**
   * Creates the preview outline.
   */
  private createPreviewOutline(): void {
    this.previewOutline = this.renderer.createElement('div');
    const rect = this.el.nativeElement.getBoundingClientRect();

    this.renderer.setStyle(this.previewOutline, 'position', 'fixed');
    this.renderer.setStyle(this.previewOutline, 'top', `${rect.top}px`);
    this.renderer.setStyle(this.previewOutline, 'left', `${rect.left}px`);
    this.renderer.setStyle(this.previewOutline, 'width', `${rect.width}px`);
    this.renderer.setStyle(this.previewOutline, 'height', `${rect.height}px`);
    this.renderer.setStyle(this.previewOutline, 'border', '2px dashed #3b82f6');
    this.renderer.setStyle(
      this.previewOutline,
      'background-color',
      'rgba(59, 130, 246, 0.1)'
    );
    this.renderer.setStyle(this.previewOutline, 'z-index', '9998');
    this.renderer.setStyle(this.previewOutline, 'pointer-events', 'none');
    this.renderer.appendChild(document.body, this.previewOutline);
  }

  /**
   * Removes the resize overlay.
   */
  private removeResizeOverlay(): void {
    if (this.resizeOverlay && this.resizeOverlay.parentNode) {
      this.renderer.removeChild(
        this.resizeOverlay.parentNode,
        this.resizeOverlay
      );
      this.resizeOverlay = null;
    }
  }

  /**
   * Removes the preview outline.
   */
  private removePreviewOutline(): void {
    if (this.previewOutline && this.previewOutline.parentNode) {
      this.renderer.removeChild(
        this.previewOutline.parentNode,
        this.previewOutline
      );
      this.previewOutline = null;
    }
  }

  /**
   * Starts the resize.
   * @param event - The mouse event.
   * @param direction - The resize direction.
   */
  private startResize(event: MouseEvent, direction: ResizeDirection): void {
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.currentResizeDirection = direction; // Already set by mousemove, but good to confirm
    this.startX = event.clientX;
    this.startY = event.clientY;

    const elementRect = this.el.nativeElement.getBoundingClientRect();
    this.startWidth = elementRect.width;
    this.startHeight = elementRect.height;
    this.startLeft = elementRect.left;
    this.startTop = elementRect.top;

    this.createResizeOverlay();
    // Set cursor for the overlay based on the resize direction
    if (this.resizeOverlay) {
      this.renderer.setStyle(
        this.resizeOverlay,
        'cursor',
        getComputedStyle(this.el.nativeElement).cursor
      );
    }
    this.createPreviewOutline();

    this.zone.runOutsideAngular(() => {
      this.documentMouseMoveListener = this.renderer.listen(
        'document',
        'mousemove',
        (e: MouseEvent) => this.onResize(e)
      );
      this.documentMouseUpListener = this.renderer.listen(
        'document',
        'mouseup',
        () => this.stopResize()
      );
    });
  }

  /**
   * Handles the resize event.
   * @param event - The mouse event.
   */
  private onResize(event: MouseEvent): void {
    if (!this.resizing || !this.currentResizeDirection || !this.previewOutline)
      return;
    event.preventDefault();

    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    let newLeft = this.startLeft;
    let newTop = this.startTop;

    // Adjust dimensions and position based on resize direction
    if (this.currentResizeDirection.includes('e')) {
      newWidth = this.startWidth + dx;
    }
    if (this.currentResizeDirection.includes('w')) {
      newWidth = this.startWidth - dx;
      newLeft = this.startLeft + dx;
    }
    if (this.currentResizeDirection.includes('s')) {
      newHeight = this.startHeight + dy;
    }
    if (this.currentResizeDirection.includes('n')) {
      newHeight = this.startHeight - dy;
      newTop = this.startTop + dy;
    }

    // Apply minimum size constraints
    const minWidth = 100; // Adjusted min width
    const minHeight = 80; // Adjusted min height

    if (newWidth < minWidth) {
      if (this.currentResizeDirection.includes('w')) {
        newLeft -= minWidth - newWidth; // Adjust left if shrinking from west hits min
      }
      newWidth = minWidth;
    }
    if (newHeight < minHeight) {
      if (this.currentResizeDirection.includes('n')) {
        newTop -= minHeight - newHeight; // Adjust top if shrinking from north hits min
      }
      newHeight = minHeight;
    }

    // Update preview outline
    this.renderer.setStyle(this.previewOutline, 'width', `${newWidth}px`);
    this.renderer.setStyle(this.previewOutline, 'height', `${newHeight}px`);
    this.renderer.setStyle(this.previewOutline, 'left', `${newLeft}px`);
    this.renderer.setStyle(this.previewOutline, 'top', `${newTop}px`);
  }

  /**
   * Stops the resize.
   */
  private stopResize(): void {
    if (!this.resizing) return;

    this.removeResizeOverlay();

    let finalWidth = this.startWidth;
    let finalHeight = this.startHeight;
    let deltaX = 0;
    let deltaY = 0;

    if (this.previewOutline) {
      const previewRect = this.previewOutline.getBoundingClientRect();
      finalWidth = previewRect.width;
      finalHeight = previewRect.height;
      // Calculate delta from the original top-left position of the element
      deltaX = previewRect.left - this.startLeft;
      deltaY = previewRect.top - this.startTop;
      this.removePreviewOutline();
    }

    this.resizing = false;
    // this.currentResizeDirection = null; // Reset on mouseleave or next mousemove

    this.removeGlobalListeners();

    // The directive itself does NOT change its own width/height/left/top.
    // It emits the desired final dimensions and deltas.
    // The parent component (WidgetComponent) will handle applying these.

    this.zone.run(() => {
      this.resized.emit({
        width: finalWidth,
        height: finalHeight,
        deltaX: deltaX,
        deltaY: deltaY,
      });
    });
  }

  /**
   * Removes the global listeners.
   */
  private removeGlobalListeners(): void {
    if (this.documentMouseMoveListener) {
      this.documentMouseMoveListener();
      this.documentMouseMoveListener = null;
    }
    if (this.documentMouseUpListener) {
      this.documentMouseUpListener();
      this.documentMouseUpListener = null;
    }
  }
}
