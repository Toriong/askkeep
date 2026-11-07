/**
 * Opens the onboarding page the first time AskKeep is installed.
 * No Google APIs, no OAuth, no remote code.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
});
