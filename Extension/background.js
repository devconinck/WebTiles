/**
 * WebTiles Background Script
 *
 * This script manages the lifecycle of widgets in the WebTiles extension.
 * It handles widget-frame mapping, CSS injection, URL tracking, and navigation events.
 * The script maintains several data structures to track the state of widgets and frames
 * across different browser tabs.
 */

// Global state management
let widgetFrameMap = {}; // Maps widget IDs to their frame information (tabId, frameId, originalSrc, cssInjected)
let frameIdToUrlMap = {}; // Maps frame identifiers (tabId-frameId) to their URLs and associated widget IDs
let pendingCssInjections = {}; // Queue for CSS that needs to be injected when frames become available
let activeTabIds = new Set(); // Tracks tabs where the extension is currently active

// ================================
// ================================
// ================================
// ================================
// Chrome extension event listeners
// ================================
// ================================

// Extension action handler - opens the main extension page when clicked
chrome.action.onClicked.addListener(async () => {
  chrome.tabs.create({
    url: "chrome-extension://" + chrome.runtime.id + "/dist/browser/index.html",
  });
});

/**
 * Main message handler for communication between the extension and its content scripts.
 * This is the central communication hub for widget-related operations.
 *
 * Message Types:
 * 1. PREPARE_WIDGET_TRACKING: Sets up tracking for a new widget
 * 2. INJECT_CSS: Injects custom CSS into a widget's frame
 * 3. UNREGISTER_WIDGET: Removes widget tracking and cleanup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;
  const tabId = sender.tab?.id;

  if (type === "PREPARE_WIDGET_TRACKING") {
    // ============================================
    // Widget Tracking Setup
    // ============================================
    // This message is sent when a new widget is created or when a widget needs to be
    // reconnected to its frame. It establishes the connection between the widget UI
    // and the actual iframe content.

    // Step 1: Validate the sender's tab ID
    // This is crucial because we need to know which tab the widget is in
    if (!tabId) {
      log("warn", "PREPARE_WIDGET_TRACKING: Missing tabId from sender.");
      sendResponse({ success: false, error: "Missing tabId" });
      return true;
    }
    activeTabIds.add(tabId);

    // Step 2: Extract and validate widget information
    // We need both the widget ID and its source URL to establish tracking
    const { widgetId, widgetSrc: rawWidgetSrc } = payload;
    if (!widgetId || !rawWidgetSrc) {
      log("warn", "PREPARE_WIDGET_TRACKING: Missing payload data.", payload);
      sendResponse({ success: false, error: "Missing payload data" });
      return true;
    }
    const widgetSrc = normalizeUrl(rawWidgetSrc);

    log(
      "info",
      `PREPARE_WIDGET_TRACKING for widget ${widgetId}, rawWidgetSrc: ${rawWidgetSrc}, normalizedWidgetSrc: ${widgetSrc}, tab: ${tabId}`
    );

    // Step 3: Clean up any existing mapping
    // This prevents duplicate mappings and ensures clean state
    unmapWidget(widgetId);

    // Step 4: Look for an existing frame that matches this widget
    // This handles the case where the frame was created before the widget was ready
    for (const [frameKey, frameData] of Object.entries(frameIdToUrlMap)) {
      const [storedTabId] = frameKey.split("-");
      if (parseInt(storedTabId) === tabId && frameData.url === widgetSrc) {
        const frameId = parseInt(frameKey.split("-")[1]);
        mapWidget(widgetId, tabId, frameId, widgetSrc);
        log(
          "info",
          `Matched widget ${widgetId} with existing frame ${frameId}`
        );
        sendResponse({ success: true });
        return true;
      }
    }

    // Step 5: If no matching frame is found, we'll wait for navigation events
    // The widget will be mapped when its frame is created during navigation
    log(
      "info",
      `No matching frame found for widget ${widgetId}, will wait for navigation`
    );
    sendResponse({ success: true });
    return true;
  } else if (type === "INJECT_CSS") {
    // ============================================
    // CSS Injection Handler
    // ============================================
    // This message is sent when custom CSS needs to be injected into a widget's frame.
    // It handles both immediate injection and queuing for later if the frame isn't ready.
    (async () => {
      const { widgetId, css } = payload;
      if (!widgetId) {
        log("warn", "INJECT_CSS: Missing widgetId.", payload);
        sendResponse({ success: false, error: "Missing widgetId" });
        return;
      }

      log(
        "info",
        `INJECT_CSS received for widget ${widgetId}. CSS defined: ${!!css}`
      );
      // Step 1: Check if we have a valid frame mapping for this widget
      const widgetInfo = widgetFrameMap[widgetId];

      // Step 2: Update the widget's customCss in the workspace data
      // This ensures the CSS persists across sessions
      try {
        const result = await chrome.storage.local.get(["workspaces"]);
        if (result.workspaces) {
          const updatedWorkspaces = result.workspaces.workspaces.map(
            (workspace) => {
              const updatedWidgets = workspace.widgets.map((widget) => {
                if (widget.id === widgetId) {
                  return { ...widget, customCss: css || "" };
                }
                return widget;
              });
              return { ...workspace, widgets: updatedWidgets };
            }
          );

          await chrome.storage.local.set({
            workspaces: {
              ...result.workspaces,
              workspaces: updatedWorkspaces,
            },
          });
          log("info", `Saved CSS for widget ${widgetId} in workspace data`);
        }
      } catch (error) {
        log(
          "error",
          `Error saving CSS for widget ${widgetId} in workspace data:`,
          error.message
        );
      }

      // Step 3: Attempt to inject the CSS if we have a valid frame
      if (widgetInfo && Number.isInteger(widgetInfo.frameId)) {
        if (css && css.trim() !== "") {
          try {
            await injectCss(widgetInfo.tabId, widgetInfo.frameId, css);
            log(
              "info",
              `CSS injected into widget: ${widgetId} (frame: ${widgetInfo.frameId})`
            );
            if (widgetFrameMap[widgetId]) {
              widgetFrameMap[widgetId].cssInjected = true;
            }
            sendResponse({ success: true });
          } catch (err) {
            // If injection fails, queue it for later
            log(
              "error",
              `Failed to inject CSS into widget ${widgetId}:`,
              err.message
            );
            pendingCssInjections[widgetId] = css;
            sendResponse({
              success: true,
              message: "CSS queued for later injection",
            });
          }
        } else {
          log(
            "info",
            `CSS for widget ${widgetId} is empty. No injection performed.`
          );
          sendResponse({ success: true, message: "CSS was empty" });
        }
      } else {
        // If no valid frame, queue the CSS for later
        log("info", `Widget ${widgetId} not mapped. Queuing CSS.`);
        if (css && css.trim() !== "") {
          pendingCssInjections[widgetId] = css;
        } else {
          delete pendingCssInjections[widgetId];
        }
        sendResponse({
          success: true,
          message: "CSS queued for later injection",
        });
      }
    })();
    return true;
  } else if (type === "UNREGISTER_WIDGET") {
    // ============================================
    // Widget Cleanup Handler
    // ============================================
    // This message is sent when a widget is being removed or destroyed.
    // It ensures proper cleanup of all widget-related data.
    const { widgetId } = payload;
    if (!widgetId) {
      log("warn", "UNREGISTER_WIDGET: Missing widgetId.", payload);
      sendResponse({ success: false, error: "Missing widgetId" });
      return true;
    }
    log("info", `UNREGISTER_WIDGET received for widget ${widgetId}`);

    // Clean up all widget-related data
    unmapWidget(widgetId);
    delete pendingCssInjections[widgetId];

    sendResponse({ success: true });
    return true;
  }
  return false;
});

/**
 * Handles frame navigation events.
 * Updates URL mappings and triggers necessary widget updates.
 * This is crucial for maintaining accurate widget state during navigation.
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Skip main frame and special URLs
  if (details.frameId === 0) return; // = we skip the main frame because injection always happens in frames deeper than the main frame
  if (
    details.url === "about:blank" ||
    details.url.startsWith("chrome-extension:")
  ) {
    return; // = skip about:blank and chrome-extension URLs
  }

  const { tabId, frameId, url: rawUrl } = details;
  const normalizedUrl = normalizeUrl(rawUrl);
  const frameKey = `${tabId}-${frameId}`;

  log(
    "info",
    `Navigation in frame ${frameId} (tab ${tabId}): ${normalizedUrl}`
  );

  const existingFrameMapping = frameIdToUrlMap[frameKey];

  if (existingFrameMapping) {
    // Update existing frame mapping with new URL
    existingFrameMapping.url = normalizedUrl;
    log(
      "info",
      `Updated internal map for frame ${frameKey} to normalized URL: "${normalizedUrl}". Associated widgetId: ${existingFrameMapping.widgetId}`
    );

    // If this frame is associated with a widget, update the widget's URL in storage
    // We use the raw URL here to preserve query parameters and other URL components
    const widgetId = existingFrameMapping.widgetId;
    if (widgetId) {
      await updateWidgetUrlInStorage(widgetId, rawUrl);
    }
  } else {
    // New frame encountered during navigation. Store it with its normalized URL.
    // The widgetId is null initially; it will be associated later if needed.

    log(
      "info",
      `onBeforeNavigate: Stored new frame ${frameKey} with normalized URL "${normalizedUrl}", no widgetId initially.`
    );
  }

  // Update workspace data if this frame is already mapped to a widget
  if (frameIdToUrlMap[frameKey]) {
    const widgetId = frameIdToUrlMap[frameKey].widgetId;
    frameIdToUrlMap[frameKey].url = normalizedUrl;
    log("info", `Updated URL for mapped frame ${frameId} to ${normalizedUrl}`);

    if (widgetId) {
      try {
        // Update the widget's URL in the workspace data
        // This ensures the UI shows the correct URL
        const result = await chrome.storage.local.get(["workspaces"]);
        if (result.workspaces) {
          const updatedWorkspaces = result.workspaces.workspaces.map(
            (workspace) => {
              const updatedWidgets = workspace.widgets.map((widget) => {
                if (widget.id === widgetId) {
                  return { ...widget, url: normalizedUrl };
                }
                return widget;
              });
              return { ...workspace, widgets: updatedWidgets };
            }
          );

          await chrome.storage.local.set({
            workspaces: {
              ...result.workspaces,
              workspaces: updatedWorkspaces,
            },
          });
          log(
            "info",
            `Updated URL for widget ${widgetId} in workspace data to ${normalizedUrl}`
          );
        }
      } catch (error) {
        log(
          "error",
          `Error updating widget URL in workspace data:`,
          error.message
        );
      }
    }
    return;
  }

  // Store this frame's URL
  frameIdToUrlMap[frameKey] = {
    url: normalizedUrl,
    widgetId: null,
  };
  log("info", `Stored new frame ${frameId} with URL ${normalizedUrl}`);
});

/**
 * Handles tab removal events.
 * Cleans up all widget and frame mappings associated with the removed tab.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  if (!activeTabIds.has(tabId)) {
    return;
  }
  log("info", `Tab ${tabId} removed. Cleaning up.`);
  activeTabIds.delete(tabId);

  // Clean up all mappings for this tab
  for (const [frameKey, frameData] of Object.entries(frameIdToUrlMap)) {
    const [storedTabId] = frameKey.split("-");
    if (parseInt(storedTabId) === tabId) {
      if (frameData.widgetId) {
        unmapWidget(frameData.widgetId);
      }
      delete frameIdToUrlMap[frameKey];
    }
  }

  // Clean up any pending CSS injections for widgets in this tab
  for (const widgetId in widgetFrameMap) {
    if (widgetFrameMap[widgetId].tabId === tabId) {
      delete pendingCssInjections[widgetId];
    }
  }
});

/**
 * Handles frame load completion events.
 * Triggers CSS injection for widgets after their frames have finished loading.
 */
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) return; // Skip main frame

  const frameKey = `${details.tabId}-${details.frameId}`;
  const frameData = frameIdToUrlMap[frameKey];

  if (frameData?.widgetId) {
    const widgetId = frameData.widgetId;
    log(
      "info",
      `Frame ${details.frameId} completed loading for widget ${widgetId}`
    );

    // Check for pending CSS
    const cssToInject = pendingCssInjections[widgetId];
    if (cssToInject) {
      log(
        "info",
        `Injecting queued CSS after frame load for widget ${widgetId}`
      );
      await injectCssWhenReady(
        widgetId,
        details.tabId,
        details.frameId,
        cssToInject
      );
      delete pendingCssInjections[widgetId];
      return;
    }

    // If no pending CSS, check workspace data
    try {
      const result = await chrome.storage.local.get(["workspaces"]);
      if (result.workspaces) {
        const workspace = result.workspaces.workspaces.find((ws) =>
          ws.widgets.some((w) => w.id === widgetId)
        );
        if (workspace) {
          const widget = workspace.widgets.find((w) => w.id === widgetId);
          if (widget?.customCss) {
            log("info", `Loading CSS after frame load for widget ${widgetId}`);
            await injectCssWhenReady(
              widgetId,
              details.tabId,
              details.frameId,
              widget.customCss
            );
          }
        }
      }
    } catch (error) {
      log(
        "error",
        `Error loading CSS after frame load for widget ${widgetId}:`,
        error.message
      );
    }
  }
});

/**
 * Handles navigation errors in extension pages.
 * Redirects to 404 page if an extension page fails to load.
 */
chrome.webNavigation.onErrorOccurred.addListener(
  (details) => {
    const extensionUrl = chrome.runtime.getURL("");
    if (
      details.url.startsWith(extensionUrl) &&
      !details.url.includes("404.html") &&
      details.frameId === 0
    ) {
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL("404.html"),
      });
    }
  },
  { url: [{ schemes: ["chrome-extension"] }] }
);

// ================================
// ================================
// ================================
// ================================
// ================================
// ================================
// Helper functions
// ===============================

// CSS functions

/**
 * Injects CSS into a specific frame within a tab.
 * Includes retry logic for permission errors and special handling for chrome-extension URLs.
 * @param {number} tabId - The ID of the tab containing the frame
 * @param {number} frameId - The ID of the frame to inject into
 * @param {string} css - The CSS to inject
 */
function injectCss(tabId, frameId, css) {
  return chrome.scripting
    .insertCSS({
      target: { tabId, frameIds: [frameId] },
      css: css,
    })
    .catch((err) => {
      log("error", `Error injecting CSS: ${err.message}`);

      // Handle permission errors with retry logic
      // This is necessary because sometimes the frame isn't ready when we first try to inject
      if (
        err.message.includes("permission") ||
        err.message.includes("Cannot access contents")
      ) {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Check if we're dealing with a chrome-extension URL
            // These need special handling as they have different security rules
            chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime.lastError) {
                log(
                  "error",
                  `Error getting tab info: ${chrome.runtime.lastError.message}`
                );
                throw err;
              }

              // Skip CSS injection for chrome-extension URLs
              if (tab.url && tab.url.startsWith("chrome-extension://")) {
                log(
                  "info",
                  `Skipping CSS injection for chrome-extension URL: ${tab.url}`
                );
                resolve(); // Resolve without error for chrome-extension URLs
                return;
              }

              // Retry the injection for other URLs
              chrome.scripting
                .insertCSS({
                  target: { tabId, frameIds: [frameId] },
                  css: css,
                })
                .then(resolve)
                .catch((retryErr) => {
                  log("error", `Error on retry: ${retryErr.message}`);
                  throw retryErr;
                });
            });
          }, 1000); // Wait 1 second before retrying
        });
      }
      log("error", `Error injecting CSS: ${err.message}`);
      throw err;
    });
}

/**
 * Handles CSS injection with additional safety checks and frame readiness verification.
 * If the frame isn't ready or the mapping has changed, queues the CSS for later injection.
 * @param {string} widgetId - The ID of the widget to inject CSS into
 * @param {number} tabId - The tab ID
 * @param {number} frameId - The frame ID
 * @param {string} css - The CSS to inject
 */
async function injectCssWhenReady(widgetId, tabId, frameId, css) {
  try {
    // Wait for the frame to be ready
    await new Promise((resolve) => setTimeout(resolve, 500)); // Give time for any redirects

    // Check if the frame is still valid
    if (
      !widgetFrameMap[widgetId] ||
      widgetFrameMap[widgetId].tabId !== tabId ||
      widgetFrameMap[widgetId].frameId !== frameId
    ) {
      log("warn", `Frame mapping changed for widget ${widgetId}, queueing CSS`);
      pendingCssInjections[widgetId] = css;
      return;
    }

    await injectCss(tabId, frameId, css);
    log("info", `CSS injected into widget: ${widgetId} (frame: ${frameId})`);
    if (widgetFrameMap[widgetId]) {
      widgetFrameMap[widgetId].cssInjected = true;
    }
  } catch (error) {
    log("error", `Error injecting CSS for widget ${widgetId}:`, error.message);
    pendingCssInjections[widgetId] = css;
  }
}

// Mapping functions

/**
 * Maps a widget to a specific frame and handles initial CSS injection.
 * This is the main function for establishing the connection between widgets and frames.
 * @param {string} widgetId - The ID of the widget to map
 * @param {number} tabId - The tab ID containing the frame
 * @param {number} frameId - The frame ID to map to
 * @param {string} originalSrc - The original source URL of the frame
 */
async function mapWidget(widgetId, tabId, frameId, originalSrc) {
  log(
    "info",
    `Mapping widget ${widgetId} to frame ${frameId} in tab ${tabId}. OriginalSrc: ${originalSrc}`
  );

  // Store the widget-to-frame mapping
  // This is the primary data structure that links widgets to their frames
  widgetFrameMap[widgetId] = {
    tabId,
    frameId,
    originalSrc,
    cssInjected: false,
  };

  // Store the frame mapping
  const frameKey = `${tabId}-${frameId}`;
  frameIdToUrlMap[frameKey] = {
    url: originalSrc,
    widgetId,
  };

  // Wait for the frame to be ready before injecting CSS
  try {
    // First check for any pending CSS injections
    // This handles cases where CSS was requested before the frame was ready
    const cssToInject = pendingCssInjections[widgetId];
    if (cssToInject) {
      log("info", `Injecting queued CSS for widget ${widgetId}`);
      await injectCssWhenReady(widgetId, tabId, frameId, cssToInject);
      delete pendingCssInjections[widgetId];
      return;
    }

    // If no pending CSS, check workspace data for saved CSS
    // This ensures widgets maintain their styling across sessions
    const result = await chrome.storage.local.get(["workspaces"]);
    if (result.workspaces) {
      const workspace = result.workspaces.workspaces.find((ws) =>
        ws.widgets.some((w) => w.id === widgetId)
      );
      if (workspace) {
        const widget = workspace.widgets.find((w) => w.id === widgetId);
        if (widget?.customCss) {
          log("info", `Loading CSS for widget ${widgetId} from workspace data`);
          await injectCssWhenReady(widgetId, tabId, frameId, widget.customCss);
        }
      }
    }
  } catch (error) {
    log("error", `Error handling CSS for widget ${widgetId}:`, error.message);
  }
}

/**
 * Removes the mapping between a widget and its frame.
 * Called when a widget is removed or when its frame is destroyed.
 * @param {string} widgetId - The ID of the widget to unmap
 */
function unmapWidget(widgetId) {
  const mapping = widgetFrameMap[widgetId];
  if (mapping) {
    log(
      "info",
      `Unmapping widget ${widgetId} from frame ${mapping.frameId} in tab ${mapping.tabId}`
    );
    const frameKey = `${mapping.tabId}-${mapping.frameId}`;
    delete frameIdToUrlMap[frameKey];
    delete widgetFrameMap[widgetId];
  }
}

/**
 * Updates a widget's URL in the extension's storage.
 * This is called when a widget's frame navigates to a new URL.
 * @param {string} widgetId - The ID of the widget to update
 * @param {string} rawUrl - The new URL to store
 */
async function updateWidgetUrlInStorage(widgetId, rawUrl) {
  if (!widgetId || typeof rawUrl !== "string") {
    log(
      "warn",
      `updateWidgetUrlInStorage: Invalid parameters. widgetId: ${widgetId}, rawUrl type: ${typeof rawUrl}`
    );
    return;
  }

  try {
    const result = await chrome.storage.local.get(["workspaces"]);
    if (result.workspaces && result.workspaces.workspaces) {
      let widgetFound = false;
      const updatedWorkspaces = result.workspaces.workspaces.map(
        (workspace) => {
          const updatedWidgets = workspace.widgets.map((widget) => {
            if (widget.id === widgetId) {
              // Only log if the URL is actually changing
              if (widget.url !== rawUrl) {
                log(
                  "info",
                  `Updating stored URL for widget ${widgetId} from "${widget.url}" to RAW URL: "${rawUrl}"`
                );
              }
              widgetFound = true;
              return { ...widget, url: rawUrl }; // Store the raw URL
            }
            return widget;
          });
          return { ...workspace, widgets: updatedWidgets };
        }
      );

      if (widgetFound) {
        await chrome.storage.local.set({
          workspaces: {
            ...result.workspaces,
            workspaces: updatedWorkspaces,
          },
        });
        // Log success only if found and updated to avoid confusion if widget was missing
        // log("info", `Successfully updated stored URL for widget ${widgetId} to: ${rawUrl}`);
      } else {
        log(
          "warn",
          `updateWidgetUrlInStorage: Widget ${widgetId} not found in storage for URL update.`
        );
      }
    }
  } catch (error) {
    log(
      "error",
      `Error in updateWidgetUrlInStorage for widget ${widgetId} (URL: ${rawUrl}):`,
      error.message
    );
  }
}

/**
 * Normalizes URLs by removing trailing slashes and query parameters.
 * This ensures consistent URL comparison across the extension.
 * @param {string} urlString - The URL to normalize
 * @returns {string} The normalized URL
 */
function normalizeUrl(urlString) {
  if (typeof urlString !== "string") return urlString;
  try {
    // Remove trailing slash and any query parameters
    let url = urlString.split("?")[0];
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }
    return url;
  } catch (e) {
    return urlString;
  }
}

/**
 * Custom logging function that prefixes messages with [WebTiles BG]
 * and handles different log levels appropriately.
 */
function log(level, ...args) {
  const prefix = "[WebTiles BG]";
  if (level === "error" || level === "warn") {
    console[level](prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}
