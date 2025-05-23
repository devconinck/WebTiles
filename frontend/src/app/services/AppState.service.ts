import { AppState } from '../models/AppState.model';

declare var chrome: any;

/**
 * Service responsible for managing the application's state.
 * Handles saving and loading the application state to Chrome storage.
 * @class AppStateService
 * @description Manages the application's state and provides methods for state manipulation
 */
async function saveAppState(state: AppState): Promise<void> {
  try {
    const dataToStore = { state };

    await chrome.storage.local.set({ profile: dataToStore });
  } catch (error) {
    console.error('Error saving app state:', error);
  }
}

/**
 * Loads the application state from Chrome storage
 * @returns The application state
 */
async function loadAppState(): Promise<AppState> {
  try {
    const result = await chrome.storage.local.get('profile');
    if (result.profile && result.profile.workspaces) {
      return {
        workspaces: result.profile.workspaces,
        activeWorkspace: result.profile.activeWorkspace,
      };
    }
    return { workspaces: [], activeWorkspace: null };
  } catch (error) {
    console.error('Error loading app state:', error);
    return { workspaces: [], activeWorkspace: null };
  }
}
