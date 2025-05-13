document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const themeToggle = document.getElementById('themeToggle');
  const initialState = document.getElementById('initialState');
  const loadingState = document.getElementById('loadingState');
  const summaryState = document.getElementById('summaryState');
  const errorState = document.getElementById('errorState');
  const summaryContent = document.getElementById('summaryContent');
  const selectedTextInfo = document.getElementById('selectedTextInfo');
  const errorMessage = document.getElementById('errorMessage');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const copyButton = document.getElementById('copyButton');
  const newSummaryButton = document.getElementById('newSummaryButton');
  const tryAgainButton = document.getElementById('tryAgainButton');
  const historyList = document.getElementById('historyList');
  const clearHistoryButton = document.getElementById('clearHistoryButton');
  
  // Variables
  let currentSelectedText = '';
  let currentSummary = '';
  let history = [];
  
  // Initialize app state
  initializeApp();
  
  // Event listeners
  themeToggle.addEventListener('click', toggleTheme);
  saveApiKeyButton.addEventListener('click', saveApiKey);
  copyButton.addEventListener('click', copyToClipboard);
  newSummaryButton.addEventListener('click', showInitialState);
  tryAgainButton.addEventListener('click', generateSummary);
  clearHistoryButton.addEventListener('click', clearHistory);
  
  /**
   * Initialize the app state
   */
  function initializeApp() {
    // Load theme preference
    loadThemePreference();
    
    // Load API key
    chrome.storage.local.get(['apiKey'], (result) => {
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
      }
    });
    
    // Load history
    loadHistory();
    
    // Check for selected text
    getCurrentTab().then(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        
        if (response && response.selectedText) {
          currentSelectedText = response.selectedText;
          if (apiKeyInput.value) {
            generateSummary();
          } else {
            showInitialState();
          }
        } else {
          showInitialState();
        }
      });
    }).catch(error => {
      console.error('Error getting current tab:', error);
      showInitialState();
    });
  }
  
  /**
   * Get the current active tab
   */
  function getCurrentTab() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          resolve(tabs[0]);
        } else {
          reject(new Error('No active tab found'));
        }
      });
    });
  }
  
  /**
   * Toggle between light and dark theme
   */
  function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDarkTheme = document.body.classList.contains('dark-theme');
    chrome.storage.local.set({ darkTheme: isDarkTheme });
  }
  
  /**
   * Load theme preference from storage
   */
  function loadThemePreference() {
    chrome.storage.local.get(['darkTheme'], (result) => {
      if (result.darkTheme) {
        document.body.classList.add('dark-theme');
      }
    });
  }
  
  /**
   * Save API key to storage
   */
  function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ apiKey }, () => {
        if (currentSelectedText) {
          generateSummary();
        } else {
          showApiKeySavedMessage();
        }
      });
    } else {
      showError('Please enter a valid API key');
    }
  }
  
  /**
   * Show a temporary message that API key was saved
   */
  function showApiKeySavedMessage() {
    const saveButton = document.getElementById('saveApiKey');
    const originalText = saveButton.textContent;
    
    saveButton.textContent = 'Saved!';
    saveButton.disabled = true;
    
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.disabled = false;
    }, 2000);
  }
  
  /**
   * Generate summary using Gemini API
   */
  function generateSummary() {
    // Check if we have selected text
    if (!currentSelectedText) {
      showError('No text selected. Please select text on the webpage and try again.');
      return;
    }
    
    // Check if we have API key
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showInitialState();
      return;
    }
    
    // Show loading state
    showLoadingState();
    
    // Prepare request to Gemini API
    const prompt = `Please provide a concise summary of the following text. Focus on the main points and keep the summary clear and informative: "${currentSelectedText}"`;
    
    // Gemini API endpoint
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    // Request body
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800
      }
    };
    
    // Send request to Gemini API
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const summaryText = data.candidates[0].content.parts[0].text;
        currentSummary = summaryText;
        
        // Display summary
        summaryContent.textContent = summaryText;
        
        // Show character count
        const selectedTextLength = currentSelectedText.length;
        const summaryLength = summaryText.length;
        const compressionRatio = Math.round((1 - (summaryLength / selectedTextLength)) * 100);
        
        selectedTextInfo.textContent = `${selectedTextLength} chars → ${summaryLength} chars (${compressionRatio}% reduction)`;
        
        // Add to history
        addToHistory(summaryText);
        
        // Show summary state
        showSummaryState();
      } else {
        throw new Error('Invalid response format from API');
      }
    })
    .catch(error => {
      console.error('Error generating summary:', error);
      showError(error.message || 'Failed to generate summary. Please check your API key and try again.');
    });
  }
  
  /**
   * Copy summary to clipboard
   */
  function copyToClipboard() {
    if (currentSummary) {
      navigator.clipboard.writeText(currentSummary)
        .then(() => {
          // Show copied tooltip
          const tooltipEl = document.createElement('span');
          tooltipEl.className = 'tooltip-text';
          tooltipEl.textContent = 'Copied!';
          
          copyButton.classList.add('tooltip');
          copyButton.appendChild(tooltipEl);
          
          setTimeout(() => {
            copyButton.removeChild(tooltipEl);
            copyButton.classList.remove('tooltip');
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy:', err);
        });
    }
  }
  
  /**
   * Add summary to history
   */
  function addToHistory(summary) {
    // Limit to first 100 characters for display
    const displaySummary = summary.length > 100 
      ? summary.substring(0, 100) + '...' 
      : summary;
    
    // Add to history array
    const historyItem = {
      summary: summary,
      displaySummary: displaySummary,
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array
    history.unshift(historyItem);
    
    // Limit history to 10 items
    if (history.length > 10) {
      history.pop();
    }
    
    // Save to storage
    chrome.storage.local.set({ summaryHistory: history });
    
    // Update UI
    renderHistory();
  }
  
  /**
   * Load history from storage
   */
  function loadHistory() {
    chrome.storage.local.get(['summaryHistory'], (result) => {
      if (result.summaryHistory) {
        history = result.summaryHistory;
        renderHistory();
      }
    });
  }
  
  /**
   * Render history items in UI
   */
  function renderHistory() {
    historyList.innerHTML = '';
    
    if (history.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.textContent = 'No history yet';
      emptyMessage.style.color = 'var(--text-secondary)';
      emptyMessage.style.fontSize = '12px';
      emptyMessage.style.textAlign = 'center';
      emptyMessage.style.padding = 'var(--spacing-sm)';
      
      historyList.appendChild(emptyMessage);
      return;
    }
    
    history.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.textContent = item.displaySummary;
      historyItem.dataset.index = index;
      
      historyItem.addEventListener('click', () => {
        currentSummary = item.summary;
        summaryContent.textContent = item.summary;
        showSummaryState();
      });
      
      historyList.appendChild(historyItem);
    });
  }
  
  /**
   * Clear history
   */
  function clearHistory() {
    history = [];
    chrome.storage.local.remove(['summaryHistory']);
    renderHistory();
  }
  
  /**
   * Show initial state
   */
  function showInitialState() {
    initialState.style.display = 'flex';
    loadingState.style.display = 'none';
    summaryState.style.display = 'none';
    errorState.style.display = 'none';
    
    initialState.classList.add('fade-in');
  }
  
  /**
   * Show loading state
   */
  function showLoadingState() {
    initialState.style.display = 'none';
    loadingState.style.display = 'flex';
    summaryState.style.display = 'none';
    errorState.style.display = 'none';
  }
  
  /**
   * Show summary state
   */
  function showSummaryState() {
    initialState.style.display = 'none';
    loadingState.style.display = 'none';
    summaryState.style.display = 'flex';
    errorState.style.display = 'none';
    
    summaryState.classList.add('fade-in');
  }
  
  /**
   * Show error state
   */
  function showError(message) {
    initialState.style.display = 'none';
    loadingState.style.display = 'none';
    summaryState.style.display = 'none';
    errorState.style.display = 'flex';
    
    errorMessage.textContent = message;
    errorState.classList.add('fade-in');
  }
});