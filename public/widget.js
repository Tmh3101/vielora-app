(function(window, document) {
  'use strict';

  // 1. Setup Global Object
  var Vielora = window.Vielora || window.ChatBotAI || {};
  
  // Configuration
  var config = {
    botId: null,
    baseUrl: null,
    settings: {
      primaryColor: '#3B82F6',
      textColor: '#1f2937',
      position: 'bottom-right',
      welcomeMessage: 'Xin chào! Tôi có thể giúp gì cho bạn?'
    }
  };

  // Constants
  var MAX_CHAT_INPUT = 200; // Giới hạn độ dài tin nhắn người dùng (phải khớp với MAX_CHAT_INPUT trên server)

  // State
  var state = {
    isInitialized: false, // NEW: Prevent double init
    isOpen: false,
    isLoading: false,
    isReady: false,
    isAvailable: false,
    statusMessage: null,
    botName: null,
    avatarUrl: null,
    conversationId: null,
    visitorId: null,
    messages: [],
    quotaExceeded: false,
    rateLimitExceeded: false
  };

  // --- Fingerprint Logic (Giữ nguyên) ---
  var fingerprintPromise = null;  
  function loadFingerprintJS() {
    if (fingerprintPromise) return fingerprintPromise;
    
    fingerprintPromise = new Promise(function(resolve) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.min.js';
      script.async = true;
      
      script.onload = function() {
        if (window.FingerprintJS) {
          window.FingerprintJS.load()
            .then(function(fp) { return fp.get(); })
            .then(function(result) { resolve(result.visitorId); })
            .catch(function() { resolve(null); });
        } else {
          resolve(null);
        }
      };
      
      script.onerror = function() { resolve(null); };
      setTimeout(function() { resolve(null); }, 5000);
      document.head.appendChild(script);
    });
    
    return fingerprintPromise;
  }

  async function generateVisitorId() {
    var stored = localStorage.getItem('vielora_visitor_id');
    if (stored) return stored;

    try {
      var fpId = await loadFingerprintJS();
      if (fpId) {
        var id = 'fp_' + fpId;
        localStorage.setItem('vielora_visitor_id', id);
        return id;
      }
    } catch (e) {
      console.log('Vielora: FingerprintJS fallback');
    }
    
    var id = 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('vielora_visitor_id', id);
    return id;
  }

  // --- Core Init Logic ---
  async function initWidget(botId, options) {
    if (state.isInitialized) return; // Prevent double init
    state.isInitialized = true;

    config.botId = botId;
    config.baseUrl = options?.baseUrl || '';
    
    // Xử lý baseUrl: bỏ dấu / ở cuối nếu có để tránh lỗi //api
    if (config.baseUrl.endsWith('/')) {
      config.baseUrl = config.baseUrl.slice(0, -1);
    }

    state.visitorId = await generateVisitorId();

    try {
      var response = await fetch(config.baseUrl + '/api/widget/init', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-bot-id': config.botId,
          'x-visitor-id': state.visitorId
        },
        body: JSON.stringify({ 
          botId: config.botId,
          visitorId: state.visitorId 
        })
      });

      // Handle Rate Limit (429)
      if (response.status === 429) {
        var errorData = await response.json();
        if (errorData.retryAfter) {
          console.log('Vielora: Rate limit, retry in ' + errorData.retryAfter + 's');
          setTimeout(function() {
            state.isInitialized = false; // Reset flag to allow retry
            initWidget(config.botId, { baseUrl: config.baseUrl });
          }, (errorData.retryAfter || 60) * 1000);
        } else {
          state.rateLimitExceeded = true;
          renderWidget();
        }
        return;
      }
      
      if (response.status === 403) {
        console.error('Vielora: Domain not allowed (Origin Check Failed)');
        return;
      }

      var data = await response.json();

      if (data.success) {
        config.settings = data.data.settings || config.settings;
        state.quotaExceeded = data.data.quotaExceeded;
        state.isReady = data.data.status === 'ready';
        state.isAvailable = data.data.isAvailable;
        state.statusMessage = data.data.statusMessage;
        state.botName = data.data.name || null;
        state.avatarUrl = data.data.avatarUrl || null;
        
        if (data.data.conversationId) {
          state.conversationId = data.data.conversationId;
          state.messages = data.data.messages || [];
        }

        renderWidget();
        
        if (state.messages.length > 0) {
          loadPreviousMessages();
        } else {
          // Show welcome message if no previous messages
          setTimeout(function() {
            var messages = document.getElementById('chatbotai-messages');
            if (messages && state.isAvailable) {
              addMessage(config.settings.welcomeMessage, 'bot');
            } else if (messages && state.statusMessage) {
              addMessage(state.statusMessage, 'bot');
            }
          }, 500);
        }
      } else {
        console.error('Vielora: Init failed', data.error);
      }
    } catch (error) {
      console.error('Vielora: Network error', error);
    }
  }

  // --- UI Rendering Functions (Giữ nguyên) ---
  function renderWidget() {
    if (document.getElementById('chatbotai-widget')) return; // Prevent duplicates UI

    var container = document.createElement('div');
    container.id = 'chatbotai-widget';
    container.innerHTML = getWidgetHTML();
    document.body.appendChild(container);

    applyStyles();
    bindEvents();
  }

  function getWidgetHTML() {
    var position = config.settings.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;';
    var isMobile = window.innerWidth < 480;
    
    // Responsive sizing logic could go here
    return `
      <div id="chatbotai-bubble" style="${position} bottom: 20px; position: fixed; z-index: 2147483647;">
        <button id="chatbotai-trigger" style="
          width: 56px; height: 56px; border-radius: 50%;
          background-color: ${config.settings.primaryColor}; border: none; cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s;
        ">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
      
      <div id="chatbotai-chat" style="
        ${position} bottom: 90px; position: fixed; z-index: 2147483646;
        width: 380px; max-width: calc(100vw - 40px); height: 550px; max-height: calc(100vh - 120px);
        background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      ">
        <div id="chatbotai-header" style="padding: 16px; background-color: ${config.settings.primaryColor}; color: white; display: flex; align-items: center; gap: 12px;">
          ${state.avatarUrl ? 
            `<div style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); overflow: hidden; display: flex; align-items: center; justify-content: center;">
               <img src="${state.avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; transform: scale(1.3);" />
             </div>` : 
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
               <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4m0 12v4M2 12h4m12 0h4"></path></svg>
             </div>`
          }
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: -4px;">${state.botName || "Trợ lý ảo"}</div>
            <div style="font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 4px;">
              ${state.isAvailable ? '<span style="width: 6px; height: 6px; background-color: #4ade80; border-radius: 50%; display: inline-block;"></span>Hoạt động' : 'Chưa sẵn sàng'}
            </div>
          </div>
          <button id="chatbotai-close" style="background: none; border: none; color: white; cursor: pointer; padding: 4px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div id="chatbotai-messages" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth;">
        </div>
        
        <div id="chatbotai-input-container" style="padding: 16px; border-top: 1px solid #f0f0f0; display: flex; gap: 8px; background: white;">
          <input id="chatbotai-input" type="text" placeholder="${state.isAvailable ? 'Nhập tin nhắn...' : 'Bot chưa sẵn sàng'}" ${state.isAvailable ? '' : 'disabled'} maxlength="${MAX_CHAT_INPUT}" style="
            flex: 1; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 24px; font-size: 15px; outline: none; transition: border-color 0.2s;
            color: #111827 !important; background: ${state.isAvailable ? 'white' : '#f9fafb'} !important; opacity: ${state.isAvailable ? '1' : '0.6'};
          " />
          <button id="chatbotai-send" ${state.isAvailable ? '' : 'disabled'} style="
            width: 44px; height: 44px; border-radius: 50%; background-color: ${config.settings.primaryColor}; border: none; cursor: ${state.isAvailable ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; justify-content: center;
            transition: opacity 0.2s; opacity: ${state.isAvailable ? '1' : '0.4'};
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <div style="text-align: center; padding: 4px; font-size: 10px; color: #9ca3af; background: white;">
          Powered by <a href="${config.baseUrl || '#'}" target="_blank" style="color: #9ca3af; text-decoration: none;">Vielora AI</a>
        </div>
      </div>
    `;
  }

  function applyStyles() {
    if (document.getElementById('chatbotai-style')) return;
    var style = document.createElement('style');
    style.id = 'chatbotai-style';
    style.textContent = `
      #chatbotai-trigger:hover { transform: scale(1.05); }
      #chatbotai-widget { font-family: sans-serif; }
      #chatbotai-input:focus { border-color: ${config.settings.primaryColor} !important; }
      #chatbotai-send:hover { opacity: 0.9; }
      
      .chatbotai-message { max-width: 85%; line-height: 1.5; font-size: 14px; }
      .chatbotai-message.user { align-self: flex-end; }
      .chatbotai-message.user div { background: ${config.settings.primaryColor}; color: white; padding: 12px 16px; border-radius: 16px; border-bottom-right-radius: 4px; }
      .chatbotai-message.bot div { background: #f3f4f6; color: ${config.settings.textColor}; padding: 12px 16px; border-radius: 16px; border-bottom-left-radius: 4px; }
      
      /* Markdown Styles */
      .chatbotai-message.bot strong { font-weight: 600; }
      .chatbotai-message.bot a { color: ${config.settings.primaryColor}; text-decoration: underline; }
      .chatbotai-message.bot ul, .chatbotai-message.bot ol { margin: 8px 0; padding-left: 20px; }
      .chatbotai-message.bot pre { background: #1f2937; color: #e5e7eb; padding: 8px; border-radius: 8px; overflow-x: auto; margin: 8px 0; }
      
      /* Typing Indicator */
      .chatbotai-typing { display: flex; gap: 4px; padding: 8px 12px; background: #f3f4f6; border-radius: 16px; width: fit-content; border-bottom-left-radius: 4px; }
      .chatbotai-typing span { width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: chatbotai-bounce 1.4s infinite ease-in-out; }
      .chatbotai-typing span:nth-child(1) { animation-delay: -0.32s; }
      .chatbotai-typing span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes chatbotai-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    `;
    document.head.appendChild(style);
  }

  function bindEvents() {
    var trigger = document.getElementById('chatbotai-trigger');
    var chat = document.getElementById('chatbotai-chat');
    var close = document.getElementById('chatbotai-close');
    var input = document.getElementById('chatbotai-input');
    var send = document.getElementById('chatbotai-send');

    trigger.addEventListener('click', function() {
      state.isOpen = !state.isOpen;
      chat.style.display = state.isOpen ? 'flex' : 'none';
      
      if (state.isOpen) {
        setTimeout(function(){ 
          input.focus();
          // Auto scroll to bottom when chat is opened
          var messages = document.getElementById('chatbotai-messages');
          if (messages) {
            messages.scrollTop = messages.scrollHeight;
          }
        }, 100);
      }
    });

    close.addEventListener('click', function() {
      state.isOpen = false;
      chat.style.display = 'none';
    });

    send.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // --- Logic Chat (Gửi/Nhận tin nhắn) ---
  async function sendMessage() {
    var input = document.getElementById('chatbotai-input');
    var message = input.value.trim();
    if (!message || state.isLoading) return;

    if (message.length > MAX_CHAT_INPUT) {
      addMessage('Tin nhắn quá dài (tối đa ' + MAX_CHAT_INPUT + ' ký tự). Vui lòng rút gọn nội dung.', 'bot');
      return;
    }

    if (state.quotaExceeded) {
      addMessage('Hệ thống đang bảo trì. Vui lòng quay lại sau.', 'bot');
      return;
    }
    if (state.rateLimitExceeded) {
      addMessage('Bạn đã hết lượt chat miễn phí hôm nay.', 'bot');
      return;
    }
    if (!state.isAvailable) {
      addMessage(state.statusMessage || 'Bot chưa sẵn sàng. Vui lòng đợi trong giây lát.', 'bot');
      return;
    }

    input.value = '';
    addMessage(message, 'user');
    showTyping();
    state.isLoading = true;

    try {
      var response = await fetch(config.baseUrl + '/api/widget/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-bot-id': config.botId,
          'x-visitor-id': state.visitorId
        },
        body: JSON.stringify({
          botId: config.botId,
          message: message,
          conversationId: state.conversationId,
          visitorId: state.visitorId
        })
      });

      hideTyping();

      if (response.status === 429) {
        state.rateLimitExceeded = true;
        addMessage('Bạn đã hết lượt chat miễn phí trong ngày.', 'bot');
        return;
      }
      if (response.status === 403) {
        addMessage('Lỗi xác thực (Origin/Domain không hợp lệ).', 'bot');
        return;
      }

      var data = await response.json();
      if (data.success) {
        state.conversationId = data.data.conversationId;
        addMessage(data.data.message, 'bot');
      } else {
        addMessage('Có lỗi xảy ra, vui lòng thử lại.', 'bot');
      }
    } catch (error) {
      hideTyping();
      addMessage('Mất kết nối mạng. Vui lòng kiểm tra lại.', 'bot');
    }
    state.isLoading = false;
  }

  function addMessage(text, role) {
    var messages = document.getElementById('chatbotai-messages');
    var div = document.createElement('div');
    div.className = 'chatbotai-message ' + role;
    
    var contentDiv = document.createElement('div');
    if (role === 'bot') {
      contentDiv.innerHTML = parseMarkdown(text);
    } else {
      contentDiv.textContent = text;
    }
    
    div.appendChild(contentDiv);
    messages.appendChild(div);
    
    // Auto scroll to bottom with small delay to ensure DOM is updated
    setTimeout(function() {
      messages.scrollTop = messages.scrollHeight;
    }, 50);
  }

  function showTyping() {
    var messages = document.getElementById('chatbotai-messages');
    var div = document.createElement('div');
    div.id = 'chatbotai-typing';
    div.className = 'chatbotai-message bot';
    div.innerHTML = '<div class="chatbotai-typing"><span></span><span></span><span></span></div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById('chatbotai-typing');
    if (typing) typing.remove();
  }

function parseMarkdown(text) {
    if (!text) return '';
    
    var result = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    result = result.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px; font-weight: 500;">$1</a>'
    );

    result = result.replace(
      /(^|\s)(https?:\/\/[^\s<]+)/g, 
      '$1<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px; font-weight: 500;">$2</a>'
    );

    result = result
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 0.9em;">$1</code>')
      .replace(/\n/g, '<br>');
      
    return result;
  }

  function loadPreviousMessages() {
    var messagesContainer = document.getElementById('chatbotai-messages');
    if (!messagesContainer || !state.messages.length) return;
    
    messagesContainer.innerHTML = '';
    var separator = document.createElement('div');
    separator.style.cssText = 'text-align: center; color: #9ca3af; font-size: 11px; padding: 10px 0;';
    separator.textContent = 'Lịch sử trò chuyện';
    messagesContainer.appendChild(separator);

    state.messages.forEach(function(msg) {
      var role = msg.role === 'assistant' ? 'bot' : msg.role;
      // Add messages without auto-scroll for each one
      var div = document.createElement('div');
      div.className = 'chatbotai-message ' + role;
      
      var contentDiv = document.createElement('div');
      if (role === 'bot') {
        contentDiv.innerHTML = parseMarkdown(msg.content);
      } else {
        contentDiv.textContent = msg.content;
      }
      
      div.appendChild(contentDiv);
      messagesContainer.appendChild(div);
    });
    
    // Scroll to bottom after all messages are loaded
    setTimeout(function() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }

  // --- EXPOSE API & AUTO INIT ---
  
  // 1. Expose function init ra ngoài (để tương thích ngược)
  Vielora.init = initWidget;
  window.Vielora = Vielora;
  window.ChatBotAI = Vielora; // Alias cũ

  // 2. Auto Init: Tìm thẻ script có data-bot-id
  function autoInit() {
    var currentScript = document.currentScript;
    // Fallback cho trình duyệt cũ hoặc trường hợp load async phức tạp
    if (!currentScript) {
      currentScript = document.querySelector('script[data-bot-id]');
    }

    if (currentScript) {
      var botId = currentScript.getAttribute('data-bot-id');
      var baseUrl = currentScript.getAttribute('data-base-url');

      if (botId) {
        initWidget(botId, { baseUrl: baseUrl });
      }
    }
  }

  // 3. Xử lý Queue (Lệnh chờ của mã nhúng cũ)
  var queue = (window.Vielora && window.Vielora.q) || (window.ChatBotAI && window.ChatBotAI.q);
  if (Array.isArray(queue)) {
    queue.forEach(function(args) {
      initWidget(args[0], args[1]);
    });
    // Xóa queue sau khi xử lý
    if (window.Vielora) window.Vielora.q = null;
  }

  // 4. Kích hoạt Auto Init
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    autoInit();
  } else {
    document.addEventListener('DOMContentLoaded', autoInit);
  }

})(window, document);