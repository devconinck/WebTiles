import { Widget } from './Widget.model';

/**
 * Represents a workspace in the WebTiles application.
 * A workspace is a collection of widgets that can be arranged and managed together.
 * @interface Workspace
 */
export interface Workspace {
  /** Unique identifier for the workspace */

  id: string;
  /** Display name of the workspace */

  name: string;
  /** Array of widgets contained within this workspace */

  widgets: Widget[];
}

/**
 * Type alias for exporting a single workspace
 * @typedef WorkspaceExport
 */
export type WorkspaceExport = Workspace;

/**
 * Type alias for exporting multiple workspaces
 * @typedef WorkspacesExport
 */
export type WorkspacesExport = Workspace[];
