import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  shareReplay,
  tap,
} from 'rxjs';
import { AppState } from '../models/AppState.model';
import { Workspace } from '../models/Workspace.model';
import { Widget } from '../models/Widget.model';
import { v4 as uuidv4 } from 'uuid';

declare var chrome: any;

/**
 * Service responsible for managing workspaces and their widgets in the WebTiles application.
 * Handles workspace creation, modification, deletion, and state management.
 * @class WorkspaceService
 * @description Manages the application's workspace state and provides methods for workspace manipulation
 */
@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  /** Storage key used for persisting workspace data */
  readonly STORAGE_KEY = 'workspaces';

  /** BehaviorSubject holding the current application state */
  private readonly stateSubject = new BehaviorSubject<AppState>({
    workspaces: [],
    activeWorkspace: null,
  });

  /** Observable of the current application state */
  readonly state$: Observable<AppState> = this.stateSubject.asObservable();

  /**
   * Observable of all workspaces in the application
   * @returns Observable<Workspace[]> Array of all workspaces
   */
  readonly workspaces$: Observable<Workspace[]> = this.state$.pipe(
    map((state) => state.workspaces),
    distinctUntilChanged(),
    tap((workspaces) => console.log('Workspaces Emitting:', workspaces)),
    shareReplay(1)
  );

  /**
   * Observable of the currently active workspace ID
   * @returns Observable<string | null> ID of the active workspace or null if none selected
   */
  readonly activeWorkspaceId$: Observable<string | null> = this.state$.pipe(
    map((state) => state.activeWorkspace),
    distinctUntilChanged(),
    tap((id) => console.log('Active Workspace ID Emitting:', id)),
    shareReplay(1)
  );

  /**
   * Observable of the currently active workspace
   * @returns Observable<Workspace | null> The active workspace object or null if none selected
   */
  readonly activeWorkspace$: Observable<Workspace | null> = combineLatest([
    this.workspaces$,
    this.activeWorkspaceId$,
  ]).pipe(
    map(([workspaces, activeId]) => {
      const found = activeId
        ? (workspaces.find((ws) => ws.id === activeId) ?? null)
        : null;
      return found;
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Observable of widgets in the active workspace
   * @returns Observable<Widget[]> Array of widgets in the active workspace
   */
  readonly activeWidgets$: Observable<Widget[]> = this.activeWorkspace$.pipe(
    map((workspace) => workspace?.widgets ?? []),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Constructor for the WorkspaceService
   * Initializes the service by loading the application state from Chrome storage
   */
  constructor() {
    this.loadAppState();
  }

  /**
   * Loads the application state from Chrome storage
   * @throws Error if loading fails
   */
  private async loadAppState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);

      let initialState: AppState;
      let needsSave = false;

      if (result[this.STORAGE_KEY]?.workspaces) {
        initialState = result[this.STORAGE_KEY] as AppState;

        if (
          initialState.workspaces.length > 0 &&
          (!initialState.activeWorkspace ||
            !initialState.workspaces.some(
              (ws) => ws.id === initialState.activeWorkspace
            ))
        ) {
          initialState.activeWorkspace = initialState.workspaces[0].id;
          needsSave = true;
        } else if (initialState.workspaces.length === 0) {
          const defaultWorkspace = this.createDefaultWorkspace([]);
          initialState = {
            workspaces: [defaultWorkspace],
            activeWorkspace: defaultWorkspace.id,
          };
          needsSave = true;
        }
      } else {
        console.log('loadAppState: No existing state found, creating default.');
        const defaultWorkspace = this.createDefaultWorkspace([]);
        initialState = {
          workspaces: [defaultWorkspace],
          activeWorkspace: defaultWorkspace.id,
        };
        needsSave = true;
      }

      this.stateSubject.next(initialState);

      if (needsSave) {
        await this.saveAppState(initialState);
      }
    } catch (error) {
      console.error('loadAppState: CRITICAL ERROR loading state:', error);
      const fallbackWorkspace = this.createDefaultWorkspace([]);
      const fallbackState: AppState = {
        workspaces: [fallbackWorkspace],
        activeWorkspace: fallbackWorkspace.id,
      };
      this.stateSubject.next(fallbackState);
      await this.saveAppState(fallbackState);
    }
  }

  /**
   * Creates a default workspace with the specified widgets
   * @param widgets - Array of widgets to include in the workspace
   * @returns Workspace object with default name and widgets
   */
  private createDefaultWorkspace(widgets: Widget[]): Workspace {
    return {
      id: uuidv4(),
      name: 'Default',
      widgets: widgets,
    };
  }

  /**
   * Saves the current application state to Chrome storage
   * @param state - The application state to save
   * @throws Error if saving fails
   */
  private async saveAppState(state: AppState): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: state });
    } catch (error) {
      console.error('saveAppState: CRITICAL ERROR saving state:', error);
    }
  }

  private updateState(updateFn: (currentState: AppState) => AppState): void {
    const currentState = this.stateSubject.value;
    const newState = updateFn(currentState);

    if (newState !== currentState) {
      this.stateSubject.next(newState);
      this.saveAppState(newState);
    } else {
      console.log('updateState: State reference identical, no changes.');
    }
  }

  /**
   * Sets the active workspace by its ID
   * @param workspaceId - The ID of the workspace to set as active
   * @throws Error if workspace ID is not found
   */
  setActiveWorkspace(workspaceId: string): void {
    this.updateState((currentState) => {
      if (currentState.activeWorkspace === workspaceId) {
        return currentState;
      }
      const workspaceExists = currentState.workspaces.some(
        (ws) => ws.id === workspaceId
      );
      if (workspaceExists) {
        console.log(`setActiveWorkspace: Setting active to ${workspaceId}`);
        return { ...currentState, activeWorkspace: workspaceId };
      } else {
        console.warn(
          `setActiveWorkspace: Workspace ID ${workspaceId} not found.`
        );
        return currentState;
      }
    });
  }

  /**
   * Adds a new widget to the active workspace
   * @param widgetData - The data for the new widget
   * @throws Error if widget addition fails
   */
  addWidget(
    widgetData: Omit<Widget, 'id' | 'position' | 'width' | 'height'> &
      Partial<Pick<Widget, 'position' | 'width' | 'height'>>
  ): void {
    this.updateState((currentState) => {
      const activeWorkspaceId = currentState.activeWorkspace;
      if (!activeWorkspaceId) {
        console.error('addWidget: Cannot add widget - No active workspace ID!');
        return currentState;
      }

      const targetWorkspaceIndex = currentState.workspaces.findIndex(
        (ws) => ws.id === activeWorkspaceId
      );
      if (targetWorkspaceIndex === -1) {
        console.error(
          `addWidget: Cannot add widget - Active workspace ID ${activeWorkspaceId} not found in state!`
        );
        return currentState;
      }

      const newWidget: Widget = {
        id: uuidv4(),
        title: widgetData.title,
        url: widgetData.url,
        position: widgetData.position ?? { x: 10, y: 10 },
        width: widgetData.width ?? 400,
        height: widgetData.height ?? 300,
        customCss: widgetData.customCss ?? '',
      };

      const newWorkspaces = currentState.workspaces.map((ws, index) => {
        if (index === targetWorkspaceIndex) {
          return {
            ...ws,
            widgets: [...ws.widgets, newWidget],
          };
        }
        return ws;
      });

      return {
        ...currentState,
        workspaces: newWorkspaces,
      };
    });
  }

  /**
   * Removes a widget from the active workspace
   * @param widgetId - The ID of the widget to remove
   * @throws Error if widget removal fails
   */
  removeWidget(widgetId: string): void {
    this.updateState((currentState) => {
      const activeWorkspaceId = currentState.activeWorkspace;
      if (!activeWorkspaceId) {
        console.warn('removeWidget: No active workspace.');
        return currentState;
      }

      let widgetRemoved = false;
      const newWorkspaces = currentState.workspaces.map((ws) => {
        if (ws.id === activeWorkspaceId) {
          const originalLength = ws.widgets.length;
          const updatedWidgets = ws.widgets.filter((w) => w.id !== widgetId);
          if (updatedWidgets.length < originalLength) {
            widgetRemoved = true;
            return { ...ws, widgets: updatedWidgets };
          }
        }
        return ws;
      });

      if (widgetRemoved) {
        return { ...currentState, workspaces: newWorkspaces };
      } else {
        console.log(`removeWidget: Widget ${widgetId} not found.`);
        return currentState;
      }
    });
  }

  /**
   * Updates an existing widget in the active workspace
   * @param updatedWidget - The updated widget object
   * @throws Error if widget update fails
   */
  updateWidget(updatedWidget: Widget): void {
    this.updateState((currentState) => {
      const activeWorkspaceId = currentState.activeWorkspace;
      if (!activeWorkspaceId) {
        console.warn('updateWidget: No active workspace.');
        return currentState;
      }

      let widgetUpdated = false;
      const newWorkspaces = currentState.workspaces.map((ws) => {
        if (ws.id === activeWorkspaceId) {
          const widgetIndex = ws.widgets.findIndex(
            (w) => w.id === updatedWidget.id
          );
          if (widgetIndex !== -1) {
            if (
              JSON.stringify(ws.widgets[widgetIndex]) !==
              JSON.stringify(updatedWidget)
            ) {
              const newWidgets = [...ws.widgets];
              newWidgets[widgetIndex] = updatedWidget;
              widgetUpdated = true;
              return { ...ws, widgets: newWidgets };
            }
          }
        }
        return ws;
      });

      if (widgetUpdated) {
        return { ...currentState, workspaces: newWorkspaces };
      } else {
        console.log(
          `updateWidget: Widget ${updatedWidget.id} not found or no data changed.`
        );
        return currentState;
      }
    });
  }

  /**
   * Creates a new workspace with the specified name
   * @param name - The name for the new workspace
   * @throws Error if workspace creation fails
   */
  addWorkspace(name: string): void {
    this.updateState((currentState) => {
      const newWorkspace: Workspace = {
        id: uuidv4(),
        name: name || `Workspace ${currentState.workspaces.length + 1}`,
        widgets: [],
      };
      console.log('addWorkspace: Created new workspace:', newWorkspace);
      return {
        ...currentState,
        workspaces: [...currentState.workspaces, newWorkspace],
      };
    });
  }

  /**
   * Removes a workspace by its ID
   * @param workspaceId - The ID of the workspace to remove
   * @throws Error if workspace removal fails
   */
  removeWorkspace(workspaceId: string): void {
    this.updateState((currentState) => {
      if (currentState.workspaces.length <= 1) {
        console.warn('removeWorkspace: Cannot remove the last workspace.');
        return currentState;
      }

      const newWorkspaces = currentState.workspaces.filter(
        (ws) => ws.id !== workspaceId
      );
      let newActiveWorkspaceId = currentState.activeWorkspace;

      if (currentState.activeWorkspace === workspaceId) {
        newActiveWorkspaceId = newWorkspaces[0]?.id ?? null;
      }

      return {
        ...currentState,
        workspaces: newWorkspaces,
        activeWorkspace: newActiveWorkspaceId,
      };
    });
  }

  /**
   * Updates the name of an existing workspace
   * @param workspaceId - The ID of the workspace to rename
   * @param newName - The new name for the workspace
   * @throws Error if workspace rename fails
   */
  renameWorkspace(workspaceId: string, newName: string): void {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      console.warn('renameWorkspace: New name is empty.');
      return;
    }

    this.updateState((currentState) => {
      let workspaceRenamed = false;
      const newWorkspaces = currentState.workspaces.map((ws) => {
        if (ws.id === workspaceId && ws.name !== trimmedName) {
          workspaceRenamed = true;
          return { ...ws, name: trimmedName };
        }
        return ws;
      });

      if (workspaceRenamed) {
        return { ...currentState, workspaces: newWorkspaces };
      } else {
        console.log(
          `renameWorkspace: Workspace ${workspaceId} not found or name unchanged.`
        );
        return currentState;
      }
    });
  }

  /**
   * Exports a single workspace to JSON format
   * @param workspace - The workspace to export
   */
  exportWorkspace(workspace: Workspace): void {
    const dataStr = JSON.stringify(workspace, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileName = `workspace-${workspace.name.toLowerCase().replace(/\s+/g, '-')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  }

  /**
   * Exports all workspaces to JSON format
   */
  exportAllWorkspaces(): void {
    const currentState = this.stateSubject.value;
    const dataStr = JSON.stringify(currentState.workspaces, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileName = 'all-workspaces.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  }

  /**
   * Imports workspaces from JSON data
   * @param importedWorkspaces - Array of workspaces to import
   * @throws Error if import fails
   */
  importWorkspaces(importedWorkspaces: Workspace[]): void {
    this.updateState((currentState) => {
      const processedWorkspaces = importedWorkspaces.map((ws) => ({
        ...ws,
        id: uuidv4(),
        widgets: ws.widgets.map((w) => ({
          ...w,
          id: uuidv4(),
        })),
      }));

      return {
        ...currentState,
        workspaces: [...currentState.workspaces, ...processedWorkspaces],
      };
    });
  }
}
