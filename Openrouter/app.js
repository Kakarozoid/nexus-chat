/**
 * NexusChat - OpenRouter Client Application
 * Handles state, local storage, API communication, markdown parsing, and UI updates.
 */

// --- FALLBACK / DEFAULT MODELS ---
// Used if the OpenRouter API fails to load or before the API fetch completes.
const DEFAULT_MODELS = [
  {
    id: 'google/gemini-2.5-flash',
    name: 'Google: Gemini 2.5 Flash',
    description: 'Fast, highly capable, and extremely long-context model from Google.',
    context_length: 1048576,
    pricing: { prompt: '0.000000075', completion: '0.0000003' },
    is_free: false
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Google: Gemini 2.5 Pro',
    description: 'Google\'s premium model for complex reasoning, coding, and creative tasks.',
    context_length: 2097152,
    pricing: { prompt: '0.00000125', completion: '0.000005' },
    is_free: false
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Anthropic: Claude 3.5 Sonnet',
    description: 'State-of-the-art intelligence, speed, and coding capabilities from Anthropic.',
    context_length: 200000,
    pricing: { prompt: '0.000003', completion: '0.000015' },
    is_free: false
  },
  {
    id: 'openai/gpt-4o',
    name: 'OpenAI: GPT-4o',
    description: 'OpenAI\'s flagship high-speed multimodal intelligence model.',
    context_length: 128000,
    pricing: { prompt: '0.000005', completion: '0.000015' },
    is_free: false
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI: GPT-4o-mini',
    description: 'Fast, lightweight intelligence for everyday reasoning and high-volume tasks.',
    context_length: 128000,
    pricing: { prompt: '0.00000015', completion: '0.0000006' },
    is_free: false
  },
  {
    id: 'meta-llama/llama-3-8b-instruct:free',
    name: 'Meta: Llama 3 8B Instruct (Free)',
    description: 'Free, highly capable open model from Meta, optimized for dialogue.',
    context_length: 8192,
    pricing: { prompt: '0', completion: '0' },
    is_free: true
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek: V3',
    description: 'High-performance mixture-of-experts model matching top proprietary LLMs.',
    context_length: 64000,
    pricing: { prompt: '0.00000014', completion: '0.00000028' },
    is_free: false
  }
];

// --- SYSTEM PROMPT PRESETS ---
const PRESETS = {
  assistant: "You are a helpful, precise AI assistant.",
  writer: "You are a creative writer and storyteller. Craft engaging narratives, emails, or essays with vivid language and high stylistic quality.",
  architect: "You are a senior software architect. Analyze system requirements, propose design patterns, create clean ASCII flowcharts, and write modular, optimized code structures.",
  debugger: "You are an expert software engineer specializing in finding bugs. Review code carefully, isolate issues, explain why they occur, and provide robust, clean bug fixes.",
  designer: "You are a premium UI/UX designer. Propose gorgeous, responsive styling systems, glassmorphism layouts, clean spacing guidelines, and write ready-to-run HTML/CSS code.",
  socratic: "You are a Socratic tutor. Do not give direct answers. Instead, ask guiding questions to help the user arrive at the concepts independently, building critical thinking."
};

// --- APPLICATION STATE ---
let modelTarget = 'A'; // 'A' or 'B' target for model selection

let state = {
  apiKey: localStorage.getItem('openrouter_api_key') || '',
  models: JSON.parse(localStorage.getItem('openrouter_models')) || DEFAULT_MODELS,
  activeModel: null,
  compareModel: null,
  compareMode: localStorage.getItem('openrouter_compare_mode') === 'true',
  chats: JSON.parse(localStorage.getItem('openrouter_chats')) || [],
  activeChatId: localStorage.getItem('openrouter_active_chat_id') || '',
  isStreaming: false,
  searchQuery: '',
  activeFilter: 'all',
  activeSort: 'popularity',
  paramsVisible: false,
  abortControllers: [], // support concurrent stream aborts
  userScrolledUp: false
};

// --- DOM ELEMENTS ---
const elements = {
  apiKeyInput: document.getElementById('api-key-input'),
  toggleKeyVisibility: document.getElementById('toggle-key-visibility'),
  eyeIcon: document.getElementById('eye-icon'),
  verifyKeyBtn: document.getElementById('verify-key-btn'),
  keyStatusDetails: document.getElementById('key-status-details'),
  
  newChatTrigger: document.getElementById('new-chat-trigger'),
  chatList: document.getElementById('chat-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  exportHistoryBtn: document.getElementById('export-history-btn'),
  importHistoryBtn: document.getElementById('import-history-btn'),
  importHistoryFileInput: document.getElementById('import-history-file-input'),
  
  mainChatWindow: document.getElementById('main-chat-window'),
  modelDetailsHeader: document.getElementById('model-details-header'),
  currentModelName: document.getElementById('current-model-name'),
  currentModelMeta: document.getElementById('current-model-meta'),
  openModelSelectorBtn: document.getElementById('open-model-selector-btn'),
  
  toggleCompareModeBtn: document.getElementById('toggle-compare-mode-btn'),
  headerCompareDivider: document.getElementById('header-compare-divider'),
  compareModelDetailsHeader: document.getElementById('compare-model-details-header'),
  compareModelName: document.getElementById('compare-model-name'),
  compareModelMeta: document.getElementById('compare-model-meta'),
  
  messagesScrollBox: document.getElementById('messages-scroll-box'),
  chatEmptyState: document.getElementById('chat-empty-state'),
  scrollBottomBtn: document.getElementById('scroll-bottom-btn'),
  
  toggleParamsBtn: document.getElementById('toggle-params-btn'),
  paramsPopover: document.getElementById('params-popover'),
  tempSlider: document.getElementById('temp-slider'),
  tempValDisplay: document.getElementById('temp-val-display'),
  tokensSlider: document.getElementById('tokens-slider'),
  tokensValDisplay: document.getElementById('tokens-val-display'),
  systemPromptInput: document.getElementById('system-prompt-input'),
  presetButtonsContainer: document.getElementById('preset-buttons-container'),
  
  chatUserMessageInput: document.getElementById('chat-user-message-input'),
  sendMessageBtn: document.getElementById('send-message-btn'),
  
  modelSelectorModal: document.getElementById('model-selector-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  modelSearchInput: document.getElementById('model-search-input'),
  modelSortSelect: document.getElementById('model-sort-select'),
  providerTagsContainer: document.getElementById('provider-tags-container'),
  modelsListGrid: document.getElementById('models-list-grid'),
  
  toastWrapper: document.getElementById('toast-wrapper'),
  mobileSidebarToggle: document.getElementById('mobile-sidebar-toggle'),
  appSidebar: document.getElementById('app-sidebar')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  setupMarkdownParser();
  initApp();
  setupEventListeners();
});

// Setup custom marked parser for advanced code blocks and copy buttons
function setupMarkdownParser() {
  if (typeof marked === 'undefined') return;

  const renderer = new marked.Renderer();
  
  // Custom code block renderer
  renderer.code = function(code, lang) {
    lang = lang || 'txt';
    const id = 'code-' + Math.random().toString(36).substring(2, 11);
    
    // Safety check: ensure string
    const codeString = (typeof code === 'object' && code.text) ? code.text : String(code);
    
    // HTML Escape helper
    const escapedCode = codeString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const showPreview = (lang === 'html' || lang === 'svg' || lang === 'xml');
    const previewBtnHtml = showPreview ? `
      <button class="preview-code-btn" onclick="openLivePreview('${id}')" type="button">
        <i data-lucide="play" style="width: 12px; height: 12px;"></i>
        Preview
      </button>
    ` : '';

    return `
      <div class="code-block-container">
        <div class="code-block-header">
          <span class="code-lang">${lang}</span>
          <div class="code-block-actions">
            ${previewBtnHtml}
            <button class="copy-code-btn" onclick="copyToClipboard('${id}')" type="button">
              <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
              Copy
            </button>
          </div>
        </div>
        <pre class="language-${lang}"><code class="language-${lang}" id="${id}">${escapedCode}</code></pre>
      </div>
    `;
  };

  marked.setOptions({ renderer });
}

// Clipboard copying utility exported to window for markdown access
window.copyToClipboard = function(id) {
  const codeElement = document.getElementById(id);
  if (!codeElement) return;
  
  const text = codeElement.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Code copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy: ', err);
    showToast('Failed to copy code.', 'error');
  });
};

// Sandbox live code preview modal
window.openLivePreview = function(id) {
  const codeElement = document.getElementById(id);
  if (!codeElement) return;
  
  const code = codeElement.textContent;
  const modal = document.getElementById('sandbox-modal');
  const iframe = document.getElementById('sandbox-iframe');
  
  if (!modal || !iframe) return;
  
  modal.classList.add('show');
  
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(code);
  doc.close();
  
  showToast('Live preview loaded', 'success');
};

// Cost tracking stat badge generator
function renderStatsBadge(msg) {
  if (!msg.usage) return '';
  
  const modelPricing = state.activeModel?.pricing || { prompt: '0', completion: '0' };
  const promptRate = parseFloat(modelPricing.prompt);
  const compRate = parseFloat(modelPricing.completion);
  
  const promptCost = msg.usage.prompt_tokens * promptRate;
  const compCost = msg.usage.completion_tokens * compRate;
  const totalCost = promptCost + compCost;
  
  const costDisplay = totalCost > 0 
    ? `$${totalCost.toFixed(5)}` 
    : 'Free';

  return `
    <div class="message-stats-badge">
      <span class="stats-pill"><i data-lucide="cpu" style="width: 10.5px; height: 10.5px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> ${msg.usage.total_tokens} tokens</span>
      <span class="stats-pill">In: ${msg.usage.prompt_tokens} • Out: ${msg.usage.completion_tokens}</span>
      <span class="stats-pill cost">${costDisplay}</span>
    </div>
  `;
}

function initApp() {
  // Load state parameters
  if (state.apiKey) {
    elements.apiKeyInput.value = state.apiKey;
    verifyApiKey(state.apiKey, false);
  }
  
  // Load saved active model or select gemini-2.5-flash
  const savedModelId = localStorage.getItem('openrouter_active_model_id') || 'google/gemini-2.5-flash';
  state.activeModel = state.models.find(m => m.id === savedModelId) || state.models[0];
  updateActiveModelHeader();

  // Load saved compare model
  const savedCompareModelId = localStorage.getItem('openrouter_compare_model_id') || 'meta-llama/llama-3-8b-instruct:free';
  state.compareModel = state.models.find(m => m.id === savedCompareModelId) || state.models[1] || state.models[0];

  // Load comparison toggle state
  state.compareMode = localStorage.getItem('openrouter_compare_mode') === 'true';
  updateCompareModeUI();

  // Load chat conversations
  if (state.chats.length === 0) {
    createNewChat("Aether Exploration");
  } else {
    // Check active chat validity
    let activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (!activeChat) {
      state.activeChatId = state.chats[0].id;
      localStorage.setItem('openrouter_active_chat_id', state.activeChatId);
    }
    renderChatList();
    loadActiveChat();
  }

  // Fetch real-time OpenRouter models in background
  fetchOpenRouterModels();
  
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// --- API FUNCTIONS ---

// Fetch OpenRouter models
async function fetchOpenRouterModels() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error('Failed to fetch OpenRouter models');
    
    const json = await res.json();
    if (json.data && Array.isArray(json.data)) {
      // Parse pricing and identify free models
      state.models = json.data.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description || 'No description provided.',
        context_length: m.context_length,
        pricing: m.pricing,
        is_free: parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0
      }));
      
      localStorage.setItem('openrouter_models', JSON.stringify(state.models));
      
      // Update activeModel reference with newly fetched model data if IDs match
      const matched = state.models.find(m => m.id === state.activeModel.id);
      if (matched) state.activeModel = matched;
      
      updateActiveModelHeader();
      renderModelsGrid();
      showToast('OpenRouter models updated successfully', 'info');
    }
  } catch (error) {
    console.error('Error fetching models:', error);
    showToast('Failed to retrieve live models list. Using offline cache.', 'error');
    renderModelsGrid();
  }
}

// Verify API key and query account details
async function verifyApiKey(key, showToasts = true) {
  if (!key) {
    elements.keyStatusDetails.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; font-size: 0.75rem;">
        No key configured. Enter key above to view balance.
      </div>
    `;
    elements.keyStatusDetails.className = 'key-status-card';
    return;
  }

  elements.keyStatusDetails.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; gap: 6px; padding: 4px 0;">
      <div class="streaming-indicator" style="background: none; border-radius: 0; width: 14px; height: 14px;"></div>
      <span>Verifying credentials...</span>
    </div>
  `;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${key}`
      }
    });

    if (!res.ok) {
      throw new Error(res.status === 401 ? 'Unauthorized: Invalid API Key' : 'Connection failed');
    }

    const data = await res.json();
    if (data.data) {
      const info = data.data;
      const creditVal = info.limit !== null ? `$${(info.limit - info.usage).toFixed(4)}` : 'Unlimited';
      
      elements.keyStatusDetails.className = 'key-status-card success';
      elements.keyStatusDetails.innerHTML = `
        <div class="status-row">
          <span>Account:</span>
          <span class="status-val">${info.label || 'Default Key'}</span>
        </div>
        <div class="status-row">
          <span>Credits Left:</span>
          <span class="status-val" style="color: hsl(var(--accent-green));">${creditVal}</span>
        </div>
      `;

      state.apiKey = key;
      localStorage.setItem('openrouter_api_key', key);
      enableInputIfReady();
      
      if (showToasts) {
        showToast('API Key verified successfully!', 'success');
      }
    }
  } catch (err) {
    console.error(err);
    elements.keyStatusDetails.className = 'key-status-card error';
    elements.keyStatusDetails.innerHTML = `
      <div style="color: hsl(var(--accent-pink)); text-align: center; font-size: 0.75rem; font-weight: 500;">
        Verification failed. Please check your key.
      </div>
    `;
    state.apiKey = '';
    localStorage.removeItem('openrouter_api_key');
    enableInputIfReady();

    if (showToasts) {
      showToast(err.message || 'Failed to verify API key.', 'error');
    }
  }
}

// Send streaming message completions using SSE (supports Single and Compare modes)
async function sendStreamingMessage() {
  const inputVal = elements.chatUserMessageInput.value.trim();
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  
  if (!inputVal || !activeChat || state.isStreaming) return;
  if (!state.apiKey) {
    showToast('Please insert a verified API Key in the sidebar first!', 'error');
    elements.apiKeyInput.focus();
    return;
  }

  // Clear inputs
  elements.chatUserMessageInput.value = '';
  elements.chatUserMessageInput.style.height = '24px';
  state.isStreaming = true;
  enableInputIfReady();

  // Append user message
  const userMsg = {
    role: 'user',
    content: inputVal,
    timestamp: Date.now()
  };
  activeChat.messages.push(userMsg);
  saveChats();
  
  // Render immediately to update messages container
  renderMessages();
  hideEmptyState();

  if (state.compareMode && state.compareModel) {
    // COMPARE MODE: Dual Streaming columns
    const compareGroupId = 'comp-' + Date.now();
    const msgAId = 'msg-a-' + Date.now();
    const msgBId = 'msg-b-' + Date.now();

    const assistantMsgA = {
      id: msgAId,
      role: 'assistant',
      content: '',
      modelUsed: state.activeModel.id,
      compareGroupId: compareGroupId,
      timestamp: Date.now()
    };
    
    const assistantMsgB = {
      id: msgBId,
      role: 'assistant',
      content: '',
      modelUsed: state.compareModel.id,
      compareGroupId: compareGroupId,
      timestamp: Date.now()
    };

    activeChat.messages.push(assistantMsgA);
    activeChat.messages.push(assistantMsgB);
    saveChats();

    // Append placeholder compare bubbles directly
    const compareWrapper = appendPlaceholderCompareBubble(assistantMsgA, assistantMsgB);
    const containerA = compareWrapper.querySelector(`#col-${msgAId} .message-content`);
    const containerB = compareWrapper.querySelector(`#col-${msgBId} .message-content`);
    const cardA = compareWrapper.querySelector(`#col-${msgAId} .message-card`);
    const cardB = compareWrapper.querySelector(`#col-${msgBId} .message-card`);

    const controllerA = new AbortController();
    const controllerB = new AbortController();
    state.abortControllers = [controllerA, controllerB];

    const streamPromiseA = streamSingleModel(state.activeModel.id, activeChat, msgAId, containerA, cardA, controllerA);
    const streamPromiseB = streamSingleModel(state.compareModel.id, activeChat, msgBId, containerB, cardB, controllerB);

    Promise.allSettled([streamPromiseA, streamPromiseB]).then(() => {
      finalizeCompletions(activeChat, inputVal);
    });

  } else {
    // SINGLE MODE: Standard streaming completion
    const assistantMsgId = 'assistant-msg-' + Date.now();
    const assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      modelUsed: state.activeModel.id,
      timestamp: Date.now()
    };
    activeChat.messages.push(assistantMsg);
    saveChats();

    const msgWrapper = appendPlaceholderAssistantBubble(assistantMsg);
    const container = msgWrapper.querySelector('.message-content');
    const card = msgWrapper.querySelector('.message-card');

    const controller = new AbortController();
    state.abortControllers = [controller];

    streamSingleModel(state.activeModel.id, activeChat, assistantMsgId, container, card, controller).then(() => {
      finalizeCompletions(activeChat, inputVal);
    });
  }
}

// Concurrently streams tokens for a single model completion target
async function streamSingleModel(modelId, activeChat, msgLocalId, textContainer, cardElement, abortController) {
  const targetMsg = activeChat.messages.find(m => m.id === msgLocalId);
  if (!targetMsg) return;

  const apiMessages = [];
  if (activeChat.systemPrompt && activeChat.systemPrompt.trim() !== '') {
    apiMessages.push({ role: 'system', content: activeChat.systemPrompt.trim() });
  }
  
  // Get history before this block
  const index = activeChat.messages.findIndex(m => m.id === msgLocalId);
  activeChat.messages.slice(0, index).forEach(m => {
    apiMessages.push({ role: m.role, content: m.content });
  });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`,
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'NexusChat UI'
      },
      body: JSON.stringify({
        model: modelId,
        messages: apiMessages,
        temperature: activeChat.temperature,
        max_tokens: activeChat.maxTokens,
        stream: true,
        stream_options: {
          include_usage: true
        }
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson.error?.message || `HTTP error ${response.status}`;
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine) continue;
        if (cleanedLine === 'data: [DONE]') continue;

        if (cleanedLine.startsWith('data:')) {
          const jsonStr = cleanedLine.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const contentChunk = parsed.choices?.[0]?.delta?.content || '';
            
            if (contentChunk) {
              targetMsg.content += contentChunk;
              renderStreamingContent(textContainer, targetMsg.content);
              
              if (!state.userScrolledUp) {
                scrollToBottom();
              } else {
                elements.scrollBottomBtn.classList.add('show');
              }
            }
            
            if (parsed.usage) {
              targetMsg.usage = {
                prompt_tokens: parsed.usage.prompt_tokens,
                completion_tokens: parsed.usage.completion_tokens,
                total_tokens: parsed.usage.total_tokens
              };
            }
          } catch (e) {
            console.warn('Error parsing SSE json chunk:', e, jsonStr);
          }
        }
      }
    }

    if (buffer && buffer.startsWith('data:')) {
      const jsonStr = buffer.slice(5).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        const contentChunk = parsed.choices?.[0]?.delta?.content || '';
        if (contentChunk) {
          targetMsg.content += contentChunk;
        }
      } catch(e) {}
    }

    finalizeAssistantColumn(textContainer, cardElement, targetMsg.content, targetMsg.usage);

  } catch (error) {
    if (error.name === 'AbortError') {
      targetMsg.content += '\n\n*[Streaming Aborted]*';
      finalizeAssistantColumn(textContainer, cardElement, targetMsg.content, targetMsg.usage);
    } else {
      console.error(`Streaming error for model ${modelId}:`, error);
      targetMsg.content += `\n\n<div class="key-status-card error" style="margin-top: 10px; border-left-width: 4px;"><strong>Error:</strong> ${error.message}</div>`;
      finalizeAssistantColumn(textContainer, cardElement, targetMsg.content, targetMsg.usage);
    }
  } finally {
    saveChats();
  }
}

// Helper to wrap up completions and reset streaming UI states
function finalizeCompletions(activeChat, inputVal) {
  state.isStreaming = false;
  state.abortControllers = [];
  enableInputIfReady();
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  // Auto rename chat title if default
  if (activeChat.title === "Aether Exploration" && activeChat.messages.length >= 3) {
    autoRenameChat(activeChat, inputVal);
  }
}

// Cancel any active streaming calls
function abortAllStreams() {
  if (state.abortControllers && state.abortControllers.length > 0) {
    state.abortControllers.forEach(ctrl => ctrl.abort());
    state.abortControllers = [];
    state.isStreaming = false;
    enableInputIfReady();
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    showToast('Streaming stopped by user', 'info');
  }
}

// Auto generate conversation title from first prompt
function autoRenameChat(chat, firstPrompt) {
  let title = firstPrompt.trim().substring(0, 24);
  if (firstPrompt.length > 24) title += '...';
  chat.title = title;
  saveChats();
  renderChatList();
}

// --- RENDERING ACTIONS ---

// Render the chat list in the sidebar
function renderChatList() {
  elements.chatList.innerHTML = '';
  
  state.chats.forEach(chat => {
    const isActive = chat.id === state.activeChatId;
    const lastMsg = chat.messages.filter(m => m.role === 'user').slice(-1)[0];
    const preview = lastMsg ? lastMsg.content.substring(0, 40) + (lastMsg.content.length > 40 ? '...' : '') : 'No messages yet';
    const msgCount = chat.messages.filter(m => m.role !== 'system').length;
    
    const item = document.createElement('div');
    item.className = `chat-item glass-panel ${isActive ? 'active' : ''}`;
    item.setAttribute('data-chat-id', chat.id);
    item.onclick = () => onSwitchChat(chat.id);
    
    item.innerHTML = `
      <div class="chat-item-content">
        <span class="chat-item-title" id="title-span-${chat.id}">${chat.title}</span>
        <span class="chat-item-preview">${preview}</span>
      </div>
      <div class="chat-item-actions">
        <span class="chat-item-count">${msgCount}</span>
        <button class="chat-action-btn" onclick="startRenameChat('${chat.id}', event)" title="Rename" type="button">
          <i data-lucide="pencil" style="width: 12px; height: 12px;"></i>
        </button>
        <button class="chat-action-btn delete" onclick="onDeleteChat('${chat.id}', event)" title="Delete" type="button">
          <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
        </button>
      </div>
    `;
    
    elements.chatList.appendChild(item);
  });
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Update Active Model details in Chat Header
function updateActiveModelHeader() {
  if (!state.activeModel) return;
  elements.currentModelName.textContent = state.activeModel.name;
  
  // Format price & metadata
  const promptPrice = (parseFloat(state.activeModel.pricing.prompt) * 1000000).toFixed(2);
  const compPrice = (parseFloat(state.activeModel.pricing.completion) * 1000000).toFixed(2);
  
  let provider = state.activeModel.id.split('/')[0] || 'Unknown';
  provider = provider.charAt(0).toUpperCase() + provider.slice(1);
  
  const contextFormatted = state.activeModel.context_length >= 1000000 
    ? `${(state.activeModel.context_length / 1000000).toFixed(1)}M` 
    : `${state.activeModel.context_length / 1000}k`;
    
  elements.currentModelMeta.textContent = `${provider} • ${contextFormatted} context • $${promptPrice}/$${compPrice} M-tok`;
}

// Update Compare Model details in Chat Header
function updateCompareModelHeader() {
  if (!state.compareModel) return;
  elements.compareModelName.textContent = state.compareModel.name;
  
  const promptPrice = (parseFloat(state.compareModel.pricing.prompt) * 1000000).toFixed(2);
  const compPrice = (parseFloat(state.compareModel.pricing.completion) * 1000000).toFixed(2);
  
  let provider = state.compareModel.id.split('/')[0] || 'Unknown';
  provider = provider.charAt(0).toUpperCase() + provider.slice(1);
  
  const contextFormatted = state.compareModel.context_length >= 1000000 
    ? `${(state.compareModel.context_length / 1000000).toFixed(1)}M` 
    : `${state.compareModel.context_length / 1000}k`;
    
  elements.compareModelMeta.textContent = `${provider} • ${contextFormatted} context • $${promptPrice}/$${compPrice} M-tok`;
}

// Redraw UI when compare mode is toggled
function updateCompareModeUI() {
  const active = state.compareMode;
  elements.toggleCompareModeBtn.classList.toggle('active', active);
  
  elements.headerCompareDivider.style.display = active ? 'flex' : 'none';
  elements.compareModelDetailsHeader.style.display = active ? 'flex' : 'none';
  
  if (active) {
    updateCompareModelHeader();
  }
  
  // Re-render messages to handle single/dual layouts
  renderMessages();
}

// Render all messages in active conversation (groups compare message bubbles)
function renderMessages() {
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat || activeChat.messages.length === 0) {
    showEmptyState();
    return;
  }

  hideEmptyState();
  elements.messagesScrollBox.innerHTML = '';

  const messages = activeChat.messages;
  let i = 0;
  
  while (i < messages.length) {
    const msg = messages[i];
    
    if (msg.role === 'system') {
      i++;
      continue;
    }
    
    if (msg.role === 'user') {
      const wrapper = document.createElement('div');
      wrapper.className = 'message-wrapper user';
      wrapper.innerHTML = `
        <div class="avatar">U</div>
        <div class="message-card glass-panel">
          <div class="message-content">${msg.content}</div>
        </div>
      `;
      elements.messagesScrollBox.appendChild(wrapper);
      i++;
    } else if (msg.role === 'assistant') {
      if (msg.compareGroupId) {
        // Collect all messages sharing this compareGroupId
        const groupMessages = [msg];
        let j = i + 1;
        while (j < messages.length && messages[j].role === 'assistant' && messages[j].compareGroupId === msg.compareGroupId) {
          groupMessages.push(messages[j]);
          j++;
        }
        
        renderCompareBubbleGroup(groupMessages);
        i = j;
      } else {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper assistant';
        const modelTag = msg.modelUsed ? `<div class="message-model-tag">${msg.modelUsed}</div>` : '';
        const parsedText = typeof marked !== 'undefined' ? marked.parse(msg.content) : msg.content;
        const statsBadgeHtml = msg.usage ? renderStatsBadge(msg) : '';
        
        wrapper.innerHTML = `
          <div class="avatar">AI</div>
          <div class="message-card glass-panel">
            ${modelTag}
            <div class="message-content">${parsedText}</div>
            ${statsBadgeHtml}
          </div>
        `;
        elements.messagesScrollBox.appendChild(wrapper);
        i++;
      }
    }
  }

  // Re-run prism syntax highlighting
  if (typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(elements.messagesScrollBox);
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  scrollToBottom();
}

// Render grouped comparison messages side-by-side
function renderCompareBubbleGroup(groupMsgs) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper assistant compare';
  wrapper.id = 'compare-group-' + groupMsgs[0].compareGroupId;
  
  let colsHtml = '';
  groupMsgs.forEach((msg, idx) => {
    const parsedText = typeof marked !== 'undefined' ? marked.parse(msg.content) : msg.content;
    const statsBadgeHtml = msg.usage ? renderStatsBadge(msg) : '';
    const borderAccent = idx === 1 ? 'border-color: rgba(hsl(var(--accent-pink)), 0.25);' : '';
    const bubbleLoader = msg.isStreamingPlaceholder ? '<span class="streaming-indicator"></span>' : '';
    
    colsHtml += `
      <div class="compare-col" id="col-${msg.id || 'idx-' + idx}">
        <div class="message-card glass-panel" style="width: 100%; ${borderAccent}">
          <div class="message-model-tag">${msg.modelUsed}</div>
          <div class="message-content">${parsedText}${bubbleLoader}</div>
          ${statsBadgeHtml}
        </div>
      </div>
    `;
  });
  
  wrapper.innerHTML = `
    <div class="avatar">AI</div>
    <div class="compare-row" style="flex: 1;">
      ${colsHtml}
    </div>
  `;
  
  elements.messagesScrollBox.appendChild(wrapper);
}

// Append a temporary assistant bubble to the DOM during streaming
function appendPlaceholderAssistantBubble(msg) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper assistant';
  wrapper.id = msg.id;
  
  wrapper.innerHTML = `
    <div class="avatar">AI</div>
    <div class="message-card glass-panel">
      <div class="message-model-tag">${msg.modelUsed}</div>
      <div class="message-content">
        <span class="streaming-indicator"></span>
      </div>
    </div>
  `;
  
  elements.messagesScrollBox.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

// Append placeholder compare bubble to the DOM during comparison streaming
function appendPlaceholderCompareBubble(msgA, msgB) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper assistant compare';
  
  wrapper.innerHTML = `
    <div class="avatar">AI</div>
    <div class="compare-row" style="flex: 1;">
      <div class="compare-col col-a" id="col-${msgA.id}">
        <div class="message-card glass-panel" style="width: 100%;">
          <div class="message-model-tag">${msgA.modelUsed}</div>
          <div class="message-content">
            <span class="streaming-indicator"></span>
          </div>
        </div>
      </div>
      <div class="compare-col col-b" id="col-${msgB.id}">
        <div class="message-card glass-panel" style="width: 100%; border-color: rgba(hsl(var(--accent-pink)), 0.25);">
          <div class="message-model-tag">${msgB.modelUsed}</div>
          <div class="message-content">
            <span class="streaming-indicator"></span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  elements.messagesScrollBox.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

// Update incremental text in assistant card
function renderStreamingContent(container, content) {
  if (typeof marked !== 'undefined') {
    // Parse partial markdown securely
    container.innerHTML = marked.parse(content) + '<span class="streaming-indicator"></span>';
  } else {
    container.innerHTML = `<p>${content}</p><span class="streaming-indicator"></span>`;
  }
}

// Complete the assistant card by removing the cursor indicator and highlighting code
function finalizeAssistantBubble(msgElement, finalContent, msgUsage) {
  const contentContainer = msgElement.querySelector('.message-content');
  
  if (typeof marked !== 'undefined') {
    contentContainer.innerHTML = marked.parse(finalContent);
  } else {
    contentContainer.innerHTML = `<p>${finalContent}</p>`;
  }
  
  if (msgUsage) {
    const cardElement = msgElement.querySelector('.message-card');
    let badge = cardElement.querySelector('.message-stats-badge');
    if (!badge) {
      const tempMsg = { usage: msgUsage };
      const badgeHtml = renderStatsBadge(tempMsg);
      if (badgeHtml) {
        cardElement.insertAdjacentHTML('beforeend', badgeHtml);
      }
    }
  }
  
  if (typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(contentContainer);
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Finalize assistant column block inside compare row
function finalizeAssistantColumn(contentContainer, cardElement, finalContent, msgUsage) {
  if (typeof marked !== 'undefined') {
    contentContainer.innerHTML = marked.parse(finalContent);
  } else {
    contentContainer.innerHTML = `<p>${finalContent}</p>`;
  }
  
  if (msgUsage) {
    let badge = cardElement.querySelector('.message-stats-badge');
    if (!badge) {
      const tempMsg = { usage: msgUsage };
      const badgeHtml = renderStatsBadge(tempMsg);
      if (badgeHtml) {
        cardElement.insertAdjacentHTML('beforeend', badgeHtml);
      }
    }
  }
  
  if (typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(contentContainer);
  }
}

// Render available models in selector modal grid
function renderModelsGrid() {
  elements.modelsListGrid.innerHTML = '';
  
  // 1. Filter
  let filtered = state.models.filter(m => {
    // Category check
    if (state.activeFilter === 'free' && !m.is_free) return false;
    
    if (state.activeFilter === 'google' && !m.id.startsWith('google/')) return false;
    if (state.activeFilter === 'anthropic' && !m.id.startsWith('anthropic/')) return false;
    if (state.activeFilter === 'openai' && !m.id.startsWith('openai/')) return false;
    if (state.activeFilter === 'meta' && !m.id.startsWith('meta-llama/')) return false;
    if (state.activeFilter === 'deepseek' && !m.id.startsWith('deepseek/')) return false;
    if (state.activeFilter === 'mistral' && !m.id.startsWith('mistralai/') && !m.id.startsWith('codellama/') && !m.id.startsWith('mistral/')) {
      // Mistral could also start with mistral/
      if (!m.id.includes('mistral')) return false;
    }
    
    if (state.activeFilter === 'high-context' && m.context_length < 100000) return false;

    // Search query check
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchId = m.id.toLowerCase().includes(q);
      const matchDesc = m.description.toLowerCase().includes(q);
      return matchName || matchId || matchDesc;
    }
    
    return true;
  });
  
  // 2. Sort
  filtered.sort((a, b) => {
    if (state.activeSort === 'name') {
      return a.name.localeCompare(b.name);
    } else if (state.activeSort === 'price-asc') {
      const costA = parseFloat(a.pricing.prompt) + parseFloat(a.pricing.completion);
      const costB = parseFloat(b.pricing.prompt) + parseFloat(b.pricing.completion);
      return costA - costB;
    } else if (state.activeSort === 'context-desc') {
      return b.context_length - a.context_length;
    } else {
      // default: popularity (rely on original API order or pre-configured order)
      // We keep the original order from API but move free ones/favorites slightly higher.
      return 0; 
    }
  });

  if (filtered.length === 0) {
    elements.modelsListGrid.innerHTML = `
      <div style="grid-column: span 2; text-align: center; padding: 40px; color: var(--text-muted);">
        <i data-lucide="info" style="width: 24px; height: 24px; margin-bottom: 8px;"></i>
        <p>No models match your search criteria.</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  filtered.forEach(m => {
    const isSelected = (modelTarget === 'A') ? (m.id === state.activeModel.id) : (m.id === (state.compareModel?.id || ''));
    const pPrompt = (parseFloat(m.pricing.prompt) * 1000000).toFixed(2);
    const pComp = (parseFloat(m.pricing.completion) * 1000000).toFixed(2);
    const priceText = m.is_free ? 'FREE' : `$${pPrompt}/$${pComp} M-tok`;
    
    const contextText = m.context_length >= 1000000 
      ? `${(m.context_length / 1000000).toFixed(1)}M` 
      : `${m.context_length.toLocaleString()} tokens`;
      
    const provider = m.id.split('/')[0].toUpperCase();
    const freeBadge = m.is_free ? '<span class="free-badge">Free</span>' : '';
    
    const card = document.createElement('div');
    card.className = `model-card-item glass-panel ${isSelected ? 'selected' : ''}`;
    card.onclick = () => onSelectModel(m.id);
    
    card.innerHTML = `
      ${freeBadge}
      <div class="model-card-top">
        <span class="model-card-provider">${provider}</span>
        <span class="model-card-name">${m.name}</span>
        <p class="model-card-description">${m.description}</p>
      </div>
      <div class="model-card-footer">
        <span class="model-card-price">${priceText}</span>
        <span class="model-card-context">${contextText} ctx</span>
      </div>
    `;
    
    elements.modelsListGrid.appendChild(card);
  });
}

// --- STATE ACTIONS ---

// Create new chat session
function createNewChat(title) {
  const newChat = {
    id: 'chat-' + Date.now(),
    title: title,
    systemPrompt: 'You are a helpful, precise AI assistant.',
    temperature: 0.7,
    maxTokens: 4096,
    messages: []
  };
  
  state.chats.unshift(newChat);
  state.activeChatId = newChat.id;
  
  saveChats();
  localStorage.setItem('openrouter_active_chat_id', state.activeChatId);
  
  renderChatList();
  loadActiveChat();
}

// Load parameters and messages of active chat
function loadActiveChat() {
  const activeChat = state.chats.find(c => c.id === state.activeChatId);
  if (!activeChat) return;

  // Set inputs to match chat params
  elements.tempSlider.value = activeChat.temperature;
  elements.tempValDisplay.textContent = activeChat.temperature;
  
  elements.tokensSlider.value = activeChat.maxTokens;
  elements.tokensValDisplay.textContent = activeChat.maxTokens;
  
  elements.systemPromptInput.value = activeChat.systemPrompt || '';

  // Highlight matching preset if any
  if (elements.presetButtonsContainer) {
    elements.presetButtonsContainer.querySelectorAll('.preset-pill').forEach(pill => {
      const presetName = pill.getAttribute('data-preset');
      if (PRESETS[presetName] === activeChat.systemPrompt) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  renderMessages();
  enableInputIfReady();
}

// Switch to a chosen chat session
window.onSwitchChat = function(id) {
  state.activeChatId = id;
  localStorage.setItem('openrouter_active_chat_id', state.activeChatId);
  
  // Highlight active
  document.querySelectorAll('.chat-item').forEach(el => {
    if (el.getAttribute('data-chat-id') === id) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  loadActiveChat();
  
  // Close sidebar on mobile after choosing a chat
  if (window.innerWidth <= 768) {
    elements.appSidebar.classList.remove('show');
  }
};

// Start inline renaming in the sidebar
window.startRenameChat = function(id, event) {
  if (event) event.stopPropagation();
  
  const span = document.getElementById(`title-span-${id}`);
  if (!span) return;

  const currentTitle = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'chat-rename-input';
  input.value = currentTitle;
  
  // Replace span with input
  span.replaceWith(input);
  input.focus();
  input.select();
  
  const finalizeRename = () => {
    const newTitle = input.value.trim() || currentTitle;
    const chat = state.chats.find(c => c.id === id);
    if (chat) {
      chat.title = newTitle;
      saveChats();
    }
    
    // Switch back to span
    const newSpan = document.createElement('span');
    newSpan.className = 'chat-item-title';
    newSpan.id = `title-span-${id}`;
    newSpan.textContent = newTitle;
    input.replaceWith(newSpan);
  };

  input.addEventListener('blur', finalizeRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      finalizeRename();
    } else if (e.key === 'Escape') {
      // Revert changes
      const newSpan = document.createElement('span');
      newSpan.className = 'chat-item-title';
      newSpan.id = `title-span-${id}`;
      newSpan.textContent = currentTitle;
      input.replaceWith(newSpan);
    }
  });
};

// Delete a chat session
window.onDeleteChat = function(id, event) {
  if (event) event.stopPropagation();
  
  if (state.chats.length <= 1) {
    showToast('Cannot delete the last remaining chat session.', 'error');
    return;
  }

  const index = state.chats.findIndex(c => c.id === id);
  if (index === -1) return;

  state.chats.splice(index, 1);
  saveChats();
  
  if (state.activeChatId === id) {
    state.activeChatId = state.chats[0].id;
    localStorage.setItem('openrouter_active_chat_id', state.activeChatId);
  }
  
  renderChatList();
  loadActiveChat();
  showToast('Chat deleted', 'info');
};

// Select active model from selection grid (handles Model A or Model B targets)
function onSelectModel(modelId) {
  const matched = state.models.find(m => m.id === modelId);
  if (matched) {
    if (modelTarget === 'A') {
      state.activeModel = matched;
      localStorage.setItem('openrouter_active_model_id', modelId);
      updateActiveModelHeader();
      showToast(`Model A changed to: ${matched.name}`, 'success');
    } else {
      state.compareModel = matched;
      localStorage.setItem('openrouter_compare_model_id', modelId);
      updateCompareModelHeader();
      showToast(`Model B changed to: ${matched.name}`, 'success');
    }
    
    closeModelSelector();
    renderModelsGrid();
  }
}

// Clean up state and clear localStorage keys
function clearAllChatHistory() {
  if (confirm('Are you sure you want to delete all chat history? This action is irreversible.')) {
    state.chats = [];
    createNewChat("Aether Exploration");
    showToast('All chat history cleared.', 'info');
  }
}

// Export conversations as a JSON file
function exportChatHistory() {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.chats, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nexus_chat_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Chat history exported successfully!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to export history.', 'error');
  }
}

// Save chats array to localStorage
function saveChats() {
  localStorage.setItem('openrouter_chats', JSON.stringify(state.chats));
}

// Enable inputs if api key verified, disable otherwise (handles send/abort styles)
function enableInputIfReady() {
  if (state.isStreaming) {
    elements.sendMessageBtn.disabled = false;
    elements.sendMessageBtn.title = "Stop Generation";
    elements.sendMessageBtn.innerHTML = `<i data-lucide="square" style="width: 14px; height: 14px; fill: currentColor;"></i>`;
  } else {
    elements.sendMessageBtn.disabled = !elements.chatUserMessageInput.value.trim();
    elements.sendMessageBtn.title = "Send Message";
    elements.sendMessageBtn.innerHTML = `<i data-lucide="send" style="width: 16px; height: 16px;"></i>`;
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- MODALS AND TOAST SYSTEM ---

function openModelSelector() {
  elements.modelSelectorModal.classList.add('show');
  elements.modelSearchInput.focus();
  renderModelsGrid();
}

function closeModelSelector() {
  elements.modelSelectorModal.classList.remove('show');
  elements.modelSearchInput.value = '';
  state.searchQuery = '';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast glass-panel ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';
  
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
    <span>${message}</span>
  `;
  
  elements.toastWrapper.appendChild(toast);
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s reverse forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

// --- SCROLL / DOM HELPER ACTIONS ---

function scrollToBottom() {
  elements.messagesScrollBox.scrollTo({
    top: elements.messagesScrollBox.scrollHeight,
    behavior: 'smooth'
  });
}

function showEmptyState() {
  elements.chatEmptyState.style.display = 'flex';
}

function hideEmptyState() {
  elements.chatEmptyState.style.display = 'none';
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  
  // API key actions
  elements.toggleKeyVisibility.addEventListener('click', () => {
    const isPw = elements.apiKeyInput.type === 'password';
    elements.apiKeyInput.type = isPw ? 'text' : 'password';
    elements.eyeIcon.setAttribute('data-lucide', isPw ? 'eye-off' : 'eye');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  elements.verifyKeyBtn.addEventListener('click', () => {
    const key = elements.apiKeyInput.value.trim();
    verifyApiKey(key, true);
  });

  elements.apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const key = elements.apiKeyInput.value.trim();
      verifyApiKey(key, true);
    }
  });

  // Sidebar controls
  elements.newChatTrigger.addEventListener('click', () => {
    createNewChat("Aether Exploration");
    showToast('Created new conversation.', 'info');
  });

  elements.clearHistoryBtn.addEventListener('click', clearAllChatHistory);
  elements.exportHistoryBtn.addEventListener('click', exportChatHistory);

  // Modal actions
  elements.openModelSelectorBtn.addEventListener('click', () => {
    modelTarget = 'A';
    openModelSelector();
  });
  
  elements.modelDetailsHeader.addEventListener('click', () => {
    modelTarget = 'A';
    openModelSelector();
  });
  
  elements.compareModelDetailsHeader.addEventListener('click', () => {
    modelTarget = 'B';
    openModelSelector();
  });
  
  elements.closeModalBtn.addEventListener('click', closeModelSelector);
  
  elements.modelSelectorModal.addEventListener('click', (e) => {
    if (e.target === elements.modelSelectorModal) {
      closeModelSelector();
    }
  });

  // Model search and filter
  elements.modelSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderModelsGrid();
  });

  elements.modelSortSelect.addEventListener('change', (e) => {
    state.activeSort = e.target.value;
    renderModelsGrid();
  });

  elements.providerTagsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tag')) {
      // Clear active tags
      elements.providerTagsContainer.querySelectorAll('.filter-tag').forEach(tag => {
        tag.classList.remove('active');
      });
      
      e.target.classList.add('active');
      state.activeFilter = e.target.getAttribute('data-filter');
      renderModelsGrid();
    }
  });

  // Mobile sidebar toggle
  elements.mobileSidebarToggle.addEventListener('click', () => {
    elements.appSidebar.classList.toggle('show');
  });

  // Textarea input and send actions
  elements.chatUserMessageInput.addEventListener('input', (e) => {
    // Auto-grow textarea height
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight - 4) + 'px';
    enableInputIfReady();
  });

  elements.chatUserMessageInput.addEventListener('keydown', (e) => {
    // Send on Enter, newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendStreamingMessage();
    }
  });

  elements.sendMessageBtn.addEventListener('click', () => {
    if (state.isStreaming) {
      abortAllStreams();
    } else {
      sendStreamingMessage();
    }
  });

  // Toggle compare mode
  elements.toggleCompareModeBtn.addEventListener('click', () => {
    state.compareMode = !state.compareMode;
    localStorage.setItem('openrouter_compare_mode', state.compareMode);
    updateCompareModeUI();
    showToast(state.compareMode ? 'Compare Mode Enabled' : 'Compare Mode Disabled', 'info');
  });

  // Toggle params popover
  elements.toggleParamsBtn.addEventListener('click', () => {
    state.paramsVisible = !state.paramsVisible;
    elements.toggleParamsBtn.classList.toggle('active', state.paramsVisible);
    elements.paramsPopover.classList.toggle('show', state.paramsVisible);
  });

  // Sliders value updates
  elements.tempSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    elements.tempValDisplay.textContent = val.toFixed(1);
    
    // Save to active chat settings
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) {
      activeChat.temperature = val;
      saveChats();
    }
  });

  elements.tokensSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    elements.tokensValDisplay.textContent = val;
    
    // Save to active chat settings
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) {
      activeChat.maxTokens = val;
      saveChats();
    }
  });

  elements.systemPromptInput.addEventListener('input', (e) => {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) {
      activeChat.systemPrompt = e.target.value;
      saveChats();
    }
  });

  // Greeting suggestions quick click actions
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (prompt) {
        elements.chatUserMessageInput.value = prompt;
        elements.chatUserMessageInput.style.height = 'auto';
        elements.chatUserMessageInput.style.height = (elements.chatUserMessageInput.scrollHeight - 4) + 'px';
        enableInputIfReady();
        elements.chatUserMessageInput.focus();
      }
    });
  });

  // Phase 2: Preset buttons event listener
  elements.presetButtonsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('preset-pill')) {
      const presetName = e.target.getAttribute('data-preset');
      const promptText = PRESETS[presetName];
      if (promptText) {
        elements.systemPromptInput.value = promptText;
        
        const activeChat = state.chats.find(c => c.id === state.activeChatId);
        if (activeChat) {
          activeChat.systemPrompt = promptText;
          saveChats();
        }
        
        elements.presetButtonsContainer.querySelectorAll('.preset-pill').forEach(pill => {
          pill.classList.remove('active');
        });
        e.target.classList.add('active');
        
        showToast(`Preset loaded: ${e.target.textContent}`, 'info');
      }
    }
  });

  // Import History file triggers
  elements.importHistoryBtn.addEventListener('click', () => {
    elements.importHistoryFileInput.click();
  });

  elements.importHistoryFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const importedData = JSON.parse(evt.target.result);
        let importedChats = [];
        
        if (Array.isArray(importedData)) {
          importedChats = importedData;
        } else if (importedData && typeof importedData === 'object' && Array.isArray(importedData.chats)) {
          importedChats = importedData.chats;
        } else if (importedData && typeof importedData === 'object' && importedData.id && importedData.messages) {
          importedChats = [importedData];
        } else {
          throw new Error("Invalid format. Expected JSON array of conversations.");
        }

        const validChats = importedChats.filter(chat => {
          return chat && typeof chat === 'object' && chat.title && Array.isArray(chat.messages);
        });

        if (validChats.length === 0) {
          throw new Error("No valid conversations found in the file.");
        }

        const existingIds = new Set(state.chats.map(c => c.id));
        validChats.forEach(chat => {
          if (existingIds.has(chat.id)) {
            chat.id = 'chat-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
          }
          if (!chat.temperature) chat.temperature = 0.7;
          if (!chat.maxTokens) chat.maxTokens = 4096;
          if (!chat.systemPrompt) chat.systemPrompt = 'You are a helpful, precise AI assistant.';
          state.chats.unshift(chat);
        });

        saveChats();
        state.activeChatId = validChats[0].id;
        localStorage.setItem('openrouter_active_chat_id', state.activeChatId);
        
        renderChatList();
        loadActiveChat();
        showToast(`Successfully imported ${validChats.length} conversation(s)!`, 'success');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Failed to parse JSON file.', 'error');
      } finally {
        elements.importHistoryFileInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  // Code Sandbox modal close triggers
  const closeSandboxBtn = document.getElementById('close-sandbox-btn');
  const sandboxModal = document.getElementById('sandbox-modal');
  if (closeSandboxBtn && sandboxModal) {
    closeSandboxBtn.addEventListener('click', () => {
      sandboxModal.classList.remove('show');
      document.getElementById('sandbox-iframe').src = 'about:blank';
    });
    
    sandboxModal.addEventListener('click', (e) => {
      if (e.target === sandboxModal) {
        sandboxModal.classList.remove('show');
        document.getElementById('sandbox-iframe').src = 'about:blank';
      }
    });
  }

  // Smart Scroll Box events
  elements.messagesScrollBox.addEventListener('scroll', () => {
    const scrollBox = elements.messagesScrollBox;
    const distanceFromBottom = scrollBox.scrollHeight - scrollBox.scrollTop - scrollBox.clientHeight;
    
    if (distanceFromBottom > 100) {
      state.userScrolledUp = true;
    } else {
      state.userScrolledUp = false;
      elements.scrollBottomBtn.classList.remove('show');
    }
  });

  elements.scrollBottomBtn.addEventListener('click', () => {
    state.userScrolledUp = false;
    elements.scrollBottomBtn.classList.remove('show');
    scrollToBottom();
  });
}
