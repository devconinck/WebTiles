/**
 * Represents a widget.
 * @interface Widget
 * @property {string} id - The ID of the widget.
 * @property {string} title - The title of the widget.
 * @property {string} url - The URL of the widget.
 * @property {Position} position - The position of the widget.
 * @property {number} width - The width of the widget.
 * @property {number} height - The height of the widget.
 * @property {string} customCss - The custom CSS of the widget.
 */
export interface Widget {
  id: string;
  title: string;
  url: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  customCss: string;
}
