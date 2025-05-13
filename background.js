// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item
  chrome.contextMenus.create({
    id: 'summarizeSelection',
    title: 'Summarize selected text',
    contexts: ['selection']
  });
});

// Store the selected text
let selectedText = '';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateContextMenu' && request.selectedText) {
    selectedText = request.selectedText;
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'summarizeSelection') {
    // If text is selected in the context menu, use that
    const textToSummarize = info.selectionText || selectedText;
    
    if (textToSummarize) {
      // Store the selected text to be used by the popup
      chrome.storage.local.set({ 
        pendingSelectedText: textToSummarize,
        pendingTabId: tab.id
      });
      
      // Open the popup
      chrome.action.openPopup();
    }
  }
});

// Listen for when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  // Check if there's selected text first
  chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    
    if (response && response.selectedText) {
      // Store the selected text to be used by the popup
      chrome.storage.local.set({ 
        pendingSelectedText: response.selectedText,
        pendingTabId: tab.id
      });
    }
    
    // Open the popup
    chrome.action.openPopup();
  });
});