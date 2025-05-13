// This content script runs in the context of web pages

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    // Get currently selected text
    const selectedText = window.getSelection().toString().trim();
    sendResponse({ selectedText });
  }
  
  // This return true is important for asynchronous responses
  return true;
});

// Listen for context menu events
document.addEventListener('contextmenu', () => {
  // Save the currently selected text when context menu is opened
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    chrome.runtime.sendMessage({
      action: 'updateContextMenu',
      selectedText
    });
  }
});

// Add visual feedback when text is selected
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText && selectedText.length > 10) {
    // Show a subtle indicator that text can be summarized
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Create or update the indicator element
    let indicator = document.getElementById('summarizer-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'summarizer-indicator';
      indicator.style.position = 'fixed';
      indicator.style.zIndex = '9999';
      indicator.style.pointerEvents = 'none';
      indicator.style.transition = 'opacity 0.3s ease';
      indicator.style.fontSize = '12px';
      indicator.style.padding = '4px 8px';
      indicator.style.borderRadius = '4px';
      indicator.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
      indicator.style.border = '1px solid rgba(79, 70, 229, 0.3)';
      indicator.style.color = '#4F46E5';
      document.body.appendChild(indicator);
    }
    
    // Position the indicator near the selection
    indicator.style.left = `${window.scrollX + rect.right}px`;
    indicator.style.top = `${window.scrollY + rect.top - 30}px`;
    indicator.textContent = '✓ Text selected';
    indicator.style.opacity = '1';
    
    // Hide the indicator after 2 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
    }, 2000);
  }
});