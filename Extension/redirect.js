window.onload = function () {
  const extensionId = chrome.runtime.id;
  const baseUrl = `chrome-extension://${extensionId}`;
  window.location.href = `${baseUrl}/dist/browser/index.html`;
};
