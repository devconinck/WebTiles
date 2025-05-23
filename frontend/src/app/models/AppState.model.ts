import { Workspace } from './Workspace.model';

/**
 * Represents the application state.
 * @interface AppState
 * @property {Workspace[]} workspaces - The list of workspaces.
 * @property {string | null} activeWorkspace - The ID of the active workspace.
 */
export interface AppState {
  workspaces: Workspace[];
  activeWorkspace: string | null;
}
