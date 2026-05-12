(function(window, document) {
  'use strict';

  var Vielora = window.Vielora || window.ChatBotAI || {};
  
  var config = {
    botId: null,
    baseUrl: null,
    settings: {
      primaryColor: '#3B82F6',
      textColor: '#1f2937',
      position: 'bottom-right',
      welcomeMessage: 'Xin chào! Tôi có thể giúp gì cho bạn?',
      suggestedQuestions: [],
      chatIconType: 'preset',
      chatIconPreset: 'messagecircle',
      chatIconUrl: null,
      chatIconColor: '#ffffff',
      chatIconBgColor: '#3B82F6'
    }
  };

  var MAX_CHAT_INPUT = 200;

  var state = {
    isInitialized: false,
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
    rateLimitExceeded: false,
    suggestedQuestionsShown: false
  };

  var UI = {
    chatWidth: 320,
    chatHeight: 500,
    chatRadius: 16,
    bubbleRadius: 16,
    bubbleTailRadius: 4,
    panelBorder: 'rgba(15, 23, 42, 0.08)',
    panelShadow: '0 20px 45px rgba(15, 23, 42, 0.18)',
    bubbleBotBg: '#e2e8f0',
    bubbleTypingBg: '#e2e8f0',
    inputBorder: '#e2e8f0',
    inputBg: '#f8fafc'
  };

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

  async function initWidget(botId, options) {
    if (state.isInitialized) return;
    state.isInitialized = true;

    config.botId = botId;
    config.baseUrl = options?.baseUrl || '';
    
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

      if (response.status === 429) {
        var errorData = await response.json();
        if (errorData.retryAfter) {
          console.log('Vielora: Rate limit, retry in ' + errorData.retryAfter + 's');
          setTimeout(function() {
            state.isInitialized = false;
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
        
        // Inject JSON-LD Schema for SEO
        injectVieloraContactSchema(data.data.botName);
        
        if (data.data.conversationId) {
          state.conversationId = data.data.conversationId;
          state.messages = data.data.messages || [];
        }

        renderWidget();
        
        if (state.messages.length > 0) {
          loadPreviousMessages();
          setTimeout(function() {
            if (!state.suggestedQuestionsShown && config.settings.suggestedQuestions && config.settings.suggestedQuestions.length > 0) {
              addSuggestedQuestions(config.settings.suggestedQuestions);
            }
          }, 600);
        } else {
          setTimeout(function() {
            var messages = document.getElementById('chatbotai-messages');
            if (messages && state.isAvailable) {
              addMessage(config.settings.welcomeMessage, 'bot');
              
              if (config.settings.suggestedQuestions && config.settings.suggestedQuestions.length > 0) {
                addSuggestedQuestions(config.settings.suggestedQuestions);
              }
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

  function renderWidget() {
    if (document.getElementById('chatbotai-widget')) return;

    var container = document.createElement('div');
    container.id = 'chatbotai-widget';
    container.innerHTML = getWidgetHTML();
    document.body.appendChild(container);

    applyStyles();
    applyBackgroundStyle();
    bindEvents();
  }

  function calculateLuminance(hex) {
    var rgb = parseInt(hex.slice(1), 16);
    var r = (rgb >> 16) & 255;
    var g = (rgb >> 8) & 255;
    var b = rgb & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function getUserMessageTextColor(primaryColor) {
    var luminance = calculateLuminance(primaryColor);
    return luminance > 186 ? '#000000' : '#ffffff';
  }

  function getIconColorBasedOnBg(bgColor) {
    var luminance = calculateLuminance(bgColor);
    return luminance > 186 ? '#000000' : '#ffffff';
  }

  function parsePosition(pos) {
    if (typeof pos === 'object' && pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      return { x: pos.x, y: pos.y };
    }

    if (typeof pos === 'string') {
      try {
        var parsed = JSON.parse(pos);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return { x: parsed.x, y: parsed.y };
        }
      } catch (e) {
      }
    }

    return { x: 268, y: 328, legacy: true };
  }

  function getIconSVG(presetId) {
    var iconMap = {
      'messagecircle': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      'headphones': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13.565C2 11.512 4 11 6 11v9a4 4 0 0 1-4-4zm20 0C22 11.512 20 11 18 11v9a4 4 0 0 0 4-4zM6 20V10a6 6 0 1 1 12 0v10"></path></svg>',
      'help': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
      'comment': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      'bot': '<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor"><path d="M18 10h2v2h-2zm-6 0h2v2h-2z"></path><path d="M26 20h-5v-2h1a2 2 0 0 0 2-2v-4h2v-2h-2V8a2 2 0 0 0-2-2h-2V2h-2v4h-4V2h-2v4h-2a2 2 0 0 0-2 2v2H6v2h2v4a2 2 0 0 0 2 2h1v2H6a2 2 0 0 0-2 2v8h2v-8h20v8h2v-8a2 2 0 0 0-2-2M10 8h12v8H10Zm3 10h6v2h-6Z"></path></svg>',
      'sparkles': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l3.5 7h7.5l-6 4.5 2.5 8-7-5-7 5 2.5-8-6-4.5h7.5z"></path></svg>',
      'zap': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
      'smile': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
      'briefcase-business': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12h.01"></path><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path><path d="M22 13a18.15 18.15 0 0 1-20 0"></path><rect width="20" height="14" x="2" y="6" rx="2"></rect></svg>',
      'square-arrow-out-up-left': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"></path><path d="m3 3 9 9"></path><path d="M3 9V3h6"></path></svg>',
      'users-round': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21a8 8 0 0 0-16 0"></path><circle cx="10" cy="8" r="5"></circle><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path></svg>',
      'badge-info': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path><line x1="12" x2="12" y1="16" y2="12"></line><line x1="12" x2="12.01" y1="8" y2="8"></line></svg>',
      'inbox': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
      'square-user-round': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 21a6 6 0 0 0-12 0"></path><circle cx="12" cy="11" r="4"></circle><rect width="18" height="18" x="3" y="3" rx="2"></rect></svg>',
      'user-round-cog': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.305 19.53.923-.382"></path><path d="m15.228 16.852-.923-.383"></path><path d="m16.852 15.228-.383-.923"></path><path d="m16.852 20.772-.383.924"></path><path d="m19.148 15.228.383-.923"></path><path d="m19.53 21.696-.382-.924"></path><path d="M2 21a8 8 0 0 1 10.434-7.62"></path><path d="m20.772 16.852.924-.383"></path><path d="m20.772 19.148.924.383"></path><circle cx="10" cy="8" r="5"></circle><circle cx="18" cy="18" r="3"></circle></svg>',
      'settings': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>',
      'sliders-horizontal': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5H3"></path><path d="M12 19H3"></path><path d="M14 3v4"></path><path d="M16 17v4"></path><path d="M21 12h-9"></path><path d="M21 19h-5"></path><path d="M21 5h-7"></path><path d="M8 10v4"></path><path d="M8 12H3"></path></svg>',
      'handshake': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"></path><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"></path><path d="m21 3 1 11h-2"></path><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"></path><path d="M3 4h8"></path></svg>',
      'app-window': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M10 4v4"></path><path d="M2 8h20"></path><path d="M6 4v4"></path></svg>',
      'hand-grab': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4"></path><path d="M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"></path><path d="M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5"></path><path d="M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2"></path><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"></path></svg>',
      'loader-pinwheel': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0"></path><path d="M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6"></path><path d="M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6"></path><circle cx="12" cy="12" r="10"></circle></svg>',
      'android': '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.532 15.106a1.003 1.003 0 1 1 .001-2.007a1.003 1.003 0 0 1 0 2.007m-11.044 0a1.003 1.003 0 1 1 .001-2.007a1.003 1.003 0 0 1 0 2.007m11.4-6.018l2.006-3.459a.413.413 0 1 0-.721-.407l-2.027 3.5a12.2 12.2 0 0 0-5.13-1.108c-1.85 0-3.595.398-5.141 1.098l-2.027-3.5a.413.413 0 1 0-.72.407l1.995 3.458C2.696 10.947.345 14.417 0 18.523h24c-.334-4.096-2.675-7.565-6.112-9.435"></path></svg>',
      'triangle': '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.293 4.793c.78-1.277 2.634-1.277 3.414 0l7.433 12.164C21.955 18.29 20.996 20 19.434 20H4.566c-1.562 0-2.52-1.71-1.706-3.043z"></path></svg>',
      'api': '<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor"><path d="M26 22a3.86 3.86 0 0 0-2 .57l-3.09-3.1a6 6 0 0 0 0-6.94L24 9.43a3.86 3.86 0 0 0 2 .57a4 4 0 1 0-4-4a3.86 3.86 0 0 0 .57 2l-3.1 3.09a6 6 0 0 0-6.94 0L9.43 8A3.86 3.86 0 0 0 10 6a4 4 0 1 0-4 4a3.86 3.86 0 0 0 2-.57l3.09 3.1a6 6 0 0 0 0 6.94L8 22.57A3.86 3.86 0 0 0 6 22a4 4 0 1 0 4 4a3.86 3.86 0 0 0-.57-2l3.1-3.09a6 6 0 0 0 6.94 0l3.1 3.09a3.86 3.86 0 0 0-.57 2a4 4 0 1 0 4-4m0-18a2 2 0 1 1-2 2a2 2 0 0 1 2-2M4 6a2 2 0 1 1 2 2a2 2 0 0 1-2-2m2 22a2 2 0 1 1 2-2a2 2 0 0 1-2 2m10-8a4 4 0 1 1 4-4a4 4 0 0 1-4 4m10 8a2 2 0 1 1 2-2a2 2 0 0 1-2 2"></path></svg>',
      'code': '<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor"><path d="m31 16l-7 7l-1.41-1.41L28.17 16l-5.58-5.59L24 9zM1 16l7-7l1.41 1.41L3.83 16l5.58 5.59L8 23zm11.42 9.484L17.64 6l1.932.517L14.352 26z"></path></svg>',
      'cube': '<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor"><path d="m28.504 8.136l-12-7a1 1 0 0 0-1.008 0l-12 7A1 1 0 0 0 3 9v14a1 1 0 0 0 .496.864l12 7a1 1 0 0 0 1.008 0l12-7A1 1 0 0 0 29 23V9a1 1 0 0 0-.496-.864M16 3.158L26.016 9L16 14.842L5.984 9ZM5 10.74l10 5.833V28.26L5 22.426Zm12 17.52V16.574l10-5.833v11.685Z"></path></svg>',
      'ai-agent': '<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor"><path d="M28 13a2.995 2.995 0 0 0-2.816 2h-4.46a2 2 0 0 0-.31-.415l-.793-.792l3.094-3.094c.39.188.823.3 1.285.3c1.654 0 3-1.345 3-3s-1.346-3-3-3s-3 1.347-3 3c0 .463.113.895.3 1.286l-3.093 3.094l-.793-.793a2 2 0 0 0-.414-.31v-4.46A2.995 2.995 0 0 0 19 4c0-1.654-1.346-3-3-3s-3 1.346-3 3c0 1.302.838 2.401 2 2.815v4.462a2 2 0 0 0-.414.309l-.793.793L10.7 9.285c.187-.39.3-.823.3-1.285c0-1.654-1.346-3-3-3S5 6.346 5 8s1.346 3 3 3c.462 0 .894-.113 1.285-.3l3.094 3.093l-.793.792a2 2 0 0 0-.31.415h-4.46A2.995 2.995 0 0 0 4 13c-1.654 0-3 1.346-3 3s1.346 3 3 3a2.995 2.995 0 0 0 2.816-2h4.46c.087.148.185.29.31.414l.793.793L9.285 21.3A3 3 0 0 0 8 21c-1.654 0-3 1.346-3 3s1.346 3 3 3s3-1.346 3-3c0-.462-.114-.894-.3-1.285l3.093-3.094l.793.793c.125.126.267.224.414.31v4.46A2.995 2.995 0 0 0 13 28c0 1.654 1.346 3 3 3s3-1.346 3-3a2.995 2.995 0 0 0-2-2.816v-4.46c.147-.086.288-.184.414-.31l.793-.793l3.094 3.094c-.187.391-.3.823-.3 1.285c0 1.655 1.345 3 3 3s3-1.345 3-3s-1.347-3-3-3a2.96 2.96 0 0 0-1.286.301l-3.094-3.094l.793-.793c.125-.124.223-.266.31-.414h4.46A2.995 2.995 0 0 0 28 19c1.654 0 3-1.346 3-3s-1.346-3-3-3m-4-6a1 1 0 1 1-.002 2.002A1 1 0 0 1 24 7M7 8a1 1 0 1 1 2.002.002A1 1 0 0 1 7 8m1 17a1 1 0 1 1 .002-2.002A1 1 0 0 1 8 25m17-1a1 1 0 1 1-2.002-.002A1 1 0 0 1 25 24M16 3a1 1 0 1 1-.002 2.002A1 1 0 0 1 16 3M4 17a1 1 0 0 1 0-2c.551 0 .999.448 1 .999v.002A1 1 0 0 1 4 17m12 12a1 1 0 1 1 .002-2.002A1 1 0 0 1 16 29m0-10l-3-3l3-3l3 3zm12-2a1 1 0 1 1 .002-2.002A1 1 0 0 1 28 17"></path></svg>',
      'ai': '<svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor"><path d="M17 11h3v10h-3v2h8v-2h-3V11h3V9h-8zm-4-2H9c-1.103 0-2 .897-2 2v12h2v-5h4v5h2V11c0-1.103-.897-2-2-2m-4 7v-5h4v5z"></path></svg>'
    };
    return iconMap[presetId] || iconMap['messagecircle'];
  }

  function getWidgetHTML() {
    var positionSetting = config.settings.position || 'bottom-right';
    var parsedPos = parsePosition(positionSetting);
    var isLegacyPosition = parsedPos.legacy;
    
    var positionStyle = '';
    var customX = null;
    var customY = null;
    
    var EDGE_OFFSET = 40;

    if (isLegacyPosition) {
      if (positionSetting === 'bottom-left') {
        positionStyle = 'left: ' + EDGE_OFFSET + 'px;';
      } else {
        positionStyle = 'right: ' + EDGE_OFFSET + 'px;';
      }
      positionStyle += ' bottom: ' + EDGE_OFFSET + 'px;';
    } else {
      var FRAME_WIDTH = 340;
      var FRAME_HEIGHT = 400;
      var ICON_SIZE = 56;
      var FRAME_PADDING = 16;
      var BASE_MIN_X = FRAME_PADDING;
      var BASE_MAX_X = FRAME_WIDTH - FRAME_PADDING - ICON_SIZE;
      var BASE_MIN_Y = FRAME_PADDING;
      var BASE_MAX_Y = FRAME_HEIGHT - FRAME_PADDING - ICON_SIZE;
      var BASE_RANGE_X = BASE_MAX_X - BASE_MIN_X;
      var BASE_RANGE_Y = BASE_MAX_Y - BASE_MIN_Y;
      
      var viewportWidth = window.innerWidth;
      var viewportHeight = window.innerHeight;
      var viewportRangeX = Math.max(0, viewportWidth - ICON_SIZE - (EDGE_OFFSET * 2));
      var viewportRangeY = Math.max(0, viewportHeight - ICON_SIZE - (EDGE_OFFSET * 2));

      var clampedBaseX = Math.max(BASE_MIN_X, Math.min(parsedPos.x, BASE_MAX_X));
      var clampedBaseY = Math.max(BASE_MIN_Y, Math.min(parsedPos.y, BASE_MAX_Y));
      var normalizedX = BASE_RANGE_X > 0 ? (clampedBaseX - BASE_MIN_X) / BASE_RANGE_X : 0;
      var normalizedY = BASE_RANGE_Y > 0 ? (clampedBaseY - BASE_MIN_Y) / BASE_RANGE_Y : 0;

      customX = EDGE_OFFSET + (normalizedX * viewportRangeX);
      customY = EDGE_OFFSET + (normalizedY * viewportRangeY);
      
      if (customX < (viewportWidth / 2)) {
        positionStyle = 'left: ' + Math.round(customX) + 'px;';
      } else {
        positionStyle = 'right: ' + Math.round(viewportWidth - customX - ICON_SIZE) + 'px;';
      }
      positionStyle += ' top: ' + Math.round(customY) + 'px;';
    }
    
    var isMobile = window.innerWidth < 480;
    
    var chatPositionStyle = '';
    if (isLegacyPosition) {
      if (positionSetting === 'bottom-left') {
        chatPositionStyle = 'left: 0px;';
      } else {
        chatPositionStyle = 'right: 0px;';
      }
      chatPositionStyle += ' bottom: 84px;';
    } else {
      if (customX < (viewportWidth / 2)) {
        chatPositionStyle = 'left: ' + Math.round(Math.max(0, customX - 20)) + 'px;';
      } else {
        chatPositionStyle = 'right: ' + Math.round(Math.max(0, viewportWidth - customX - 64)) + 'px;';
      }
      
      var chatWindowHeight = UI.chatHeight;
      var spaceNeeded = customY + 56 + 10 + chatWindowHeight;
      
      if (spaceNeeded <= viewportHeight) {
        chatPositionStyle += ' top: ' + Math.round(customY + 66) + 'px;';
      } else {
        var topPosition = Math.max(10, customY - 10 - chatWindowHeight);
        chatPositionStyle += ' top: ' + Math.round(topPosition) + 'px;';
      }
    }
    
    var triggerIconHTML = '';
    var triggerBgColor = '';
    var iconColor = '';
    
    if (config.settings.chatIconType === 'preset') {
      triggerBgColor = config.settings.chatIconBgColor || config.settings.primaryColor || '#3B82F6';
      iconColor = config.settings.chatIconColor || getIconColorBasedOnBg(triggerBgColor);
      var iconSVG = getIconSVG(config.settings.chatIconPreset || 'messagecircle');
      triggerIconHTML = iconSVG.replace(/<svg/, '<svg style="color: ' + iconColor + ';"');
    } else if (config.settings.chatIconType === 'custom' && config.settings.chatIconUrl) {
      triggerBgColor = config.settings.chatIconBgColor || config.settings.primaryColor || '#3B82F6';
      triggerIconHTML = '<img src="' + config.settings.chatIconUrl + '" style="width: 56px; height: 56px; object-fit: cover; border-radius: 50%;" />';
    } else {
      triggerBgColor = config.settings.chatIconBgColor || config.settings.primaryColor || '#3B82F6';
      iconColor = config.settings.chatIconColor || getIconColorBasedOnBg(triggerBgColor);
      var defaultSVG = getIconSVG('messagecircle');
      triggerIconHTML = defaultSVG.replace(/<svg/, '<svg style="color: ' + iconColor + ';"');
    }
    
    return `
      <div id="chatbotai-bubble" style="${positionStyle} position: fixed; z-index: 2147483647;">
        <button id="chatbotai-trigger" style="
          width: 56px; height: 56px; border-radius: 50%;
          background-color: ${triggerBgColor}; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.3s; margin: 0; padding: 0;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
        ">
          ${triggerIconHTML}
        </button>
      </div>
      
      <div id="chatbotai-chat" style="
        ${chatPositionStyle} position: fixed; z-index: 2147483646;
        width: ${UI.chatWidth}px; max-width: calc(100vw - 40px); height: ${UI.chatHeight}px; max-height: calc(100vh - 120px);
        background: #ffffff; border-radius: ${UI.chatRadius}px; border: 1px solid ${UI.panelBorder}; box-shadow: ${UI.panelShadow};
        display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      ">
        <div id="chatbotai-header" style="padding: 14px 16px 10px 16px; background-color: ${config.settings.primaryColor}; color: white; display: flex; align-items: center; gap: 12px;">
          ${state.avatarUrl ? 
            `<div style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); overflow: hidden; display: flex; align-items: center; justify-content: center;">
               <img src="${state.avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; transform: scale(1.3);" />
             </div>` : 
            `<div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
               <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4m0 12v4M2 12h4m12 0h4"></path></svg>
             </div>`
          }
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: -2px;">${state.botName || "Trợ lý ảo"}</div>
            <div style="font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 6px; line-height: 1;">
              ${state.isAvailable ? 'Luôn sẵn sàng hỗ trợ' : 'Chưa sẵn sàng'}
            </div>
          </div>
          <button id="chatbotai-close" style="background: none; border: none; color: white; cursor: pointer; padding: 4px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div id="chatbotai-messages" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth;">
        </div>
        
        <div id="chatbotai-input-wrapper" style="display: flex; flex-direction: column; background: transparent; position: relative;">
          <div id="chatbotai-suggested-container" style="display: none; position: absolute; left: 0; right: 0; bottom: 48px; z-index: 2; padding: 8px 12px; background: transparent; overflow: visible; pointer-events: auto;">
            <div id="chatbotai-suggested-buttons" style="display: flex; gap: 6px; flex-wrap: nowrap; padding-right: 8px; overflow-x: auto;"></div>
          </div>
          
          <div id="chatbotai-input-container" style="padding: 2px 12px; display: flex; gap: 8px; background: white; border-radius: 0 0 16px 16px;">
            <input id="chatbotai-input" type="text" placeholder="${state.isAvailable ? 'Nhập tin nhắn...' : 'Bot chưa sẵn sàng'}" ${state.isAvailable ? '' : 'disabled'} maxlength="${MAX_CHAT_INPUT}" style="
              flex: 1; padding: 8px 16px; border: 1px solid ${UI.inputBorder}; border-radius: 9999px; font-size: 14px; outline: none; transition: border-color 0.2s;
              color: #0f172a !important; background: ${state.isAvailable ? UI.inputBg : '#f1f5f9'} !important; opacity: ${state.isAvailable ? '1' : '0.6'};
            " />
            <button id="chatbotai-send" ${state.isAvailable ? '' : 'disabled'} style="
              width: 40px; height: 40px; border-radius: 50%; background-color: ${config.settings.primaryColor}; border: none; cursor: ${state.isAvailable ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; justify-content: center;
              transition: opacity 0.2s; opacity: ${state.isAvailable ? '1' : '0.4'};
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
        <div style="text-align: center; padding: 4px; font-size: 10px; color: #94a3b8; background: white;">
          Powered by <a href="${config.baseUrl || '#'}" target="_blank" style="color: #9ca3af; text-decoration: none;">Vielora</a>
        </div>
      </div>
    `;
  }

  function applyStyles() {
    if (document.getElementById('chatbotai-style')) return;
    var style = document.createElement('style');
    style.id = 'chatbotai-style';
    style.textContent = `
      html, body { margin: 0; padding: 0; }
      
      #chatbotai-bubble {
        margin: 0 !important;
        padding: 0 !important;
      }
      
      #chatbotai-messages {
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 16px !important;
        padding-bottom: 50px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        scroll-behavior: smooth !important;
      }
      
      #chatbotai-trigger:hover { transform: scale(1.05); }
      #chatbotai-widget { font-family: sans-serif; }
      #chatbotai-input:focus { border-color: ${config.settings.primaryColor} !important; }
      #chatbotai-send:hover { opacity: 0.9; }
      
      
      #chatbotai-suggested-buttons {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      #chatbotai-suggested-container::-webkit-scrollbar,
      #chatbotai-suggested-buttons::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
      
      .chatbotai-message { max-width: 85%; line-height: 1.5; font-size: 14px; }
      .chatbotai-message.user { align-self: flex-end; }
      .chatbotai-message.user div { background: ${config.settings.primaryColor}; color: ${getUserMessageTextColor(config.settings.primaryColor)}; padding: 12px 16px; border-radius: ${UI.bubbleRadius}px; border-bottom-right-radius: ${UI.bubbleTailRadius}px; }
      .chatbotai-message.bot div { background: ${UI.bubbleBotBg}; color: ${config.settings.textColor}; padding: 12px 16px; border-radius: ${UI.bubbleRadius}px; border-bottom-left-radius: ${UI.bubbleTailRadius}px; }
      .chatbotai-message.bot strong { font-weight: 600; }
      .chatbotai-message.bot a { color: ${config.settings.primaryColor}; text-decoration: underline; }
      .chatbotai-message.bot ul, .chatbotai-message.bot ol { margin: 8px 0; padding-left: 20px; }
      .chatbotai-message.bot pre { background: #1f2937; color: #e5e7eb; padding: 8px; border-radius: 8px; overflow-x: auto; margin: 8px 0; }
      
      
      .chatbotai-typing { display: flex; gap: 4px; padding: 8px 12px; background: ${UI.bubbleTypingBg}; border-radius: ${UI.bubbleRadius}px; width: fit-content; border-bottom-left-radius: ${UI.bubbleTailRadius}px; }
      .chatbotai-typing span { width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: chatbotai-bounce 1.4s infinite ease-in-out; }
      .chatbotai-typing span:nth-child(1) { animation-delay: -0.32s; }
      .chatbotai-typing span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes chatbotai-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    `;
    document.head.appendChild(style);
  }

  function applyBackgroundStyle() {
    var messagesDiv = document.getElementById('chatbotai-messages');
    if (!messagesDiv) return;

    var bgType = config.settings.chatBackgroundType || 'solid';
    var bgValue = config.settings.chatBackgroundValue || '#ffffff';
    var bgOpacity = (config.settings.chatBackgroundOpacity || 100) / 100;

    // Clear all background styles first
    messagesDiv.style.backgroundColor = '';
    messagesDiv.style.background = '';
    messagesDiv.style.backgroundImage = '';
    messagesDiv.style.backgroundBlendMode = '';
    messagesDiv.style.backgroundSize = '';
    messagesDiv.style.backgroundPosition = '';
    messagesDiv.style.backgroundRepeat = '';
    messagesDiv.style.backgroundAttachment = '';

    // Apply background styles based on type
    if (bgType === 'solid') {
      var hex = bgValue;
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      messagesDiv.style.backgroundColor = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + bgOpacity + ')';
    } else if (bgType === 'gradient') {
      var overlayOpacity = 1 - bgOpacity;
      messagesDiv.style.background = bgValue;
      messagesDiv.style.backgroundColor = 'rgba(255, 255, 255, ' + overlayOpacity + ')';
      messagesDiv.style.backgroundBlendMode = 'lighten';
      messagesDiv.style.backgroundSize = 'cover';
    } else if (bgType === 'image' && typeof bgValue === 'string' && /^https?:\/\//.test(bgValue)) {
      var overlayOpacity = 1 - bgOpacity;
      messagesDiv.style.backgroundImage = 'url("' + bgValue + '")';
      messagesDiv.style.backgroundColor = 'rgba(255, 255, 255, ' + overlayOpacity + ')';
      messagesDiv.style.backgroundBlendMode = 'lighten';
      messagesDiv.style.backgroundSize = 'cover';
      messagesDiv.style.backgroundPosition = 'center';
      messagesDiv.style.backgroundRepeat = 'no-repeat';
    } else {
      messagesDiv.style.backgroundColor = 'rgba(255, 255, 255, ' + bgOpacity + ')';
    }
  }

  function setSuggestedQuestionsDisplay(show) {
    var container = document.getElementById('chatbotai-suggested-container');
    var messages = document.getElementById('chatbotai-messages');
    if (!container) return;

    container.style.display = show ? 'block' : 'none';

    if (!messages) return;

    if (show) {
      var overlayHeight = container.offsetHeight || 70;
      var reservedBottom = overlayHeight;
      messages.style.paddingBottom = reservedBottom + 'px';
      messages.style.scrollPaddingBottom = reservedBottom + 'px';
    } else {
      messages.style.paddingBottom = '16px';
      messages.style.scrollPaddingBottom = '16px';
    }
  }

  function bindEvents() {
    var trigger = document.getElementById('chatbotai-trigger');
    var chat = document.getElementById('chatbotai-chat');
    var close = document.getElementById('chatbotai-close');
    var input = document.getElementById('chatbotai-input');
    var send = document.getElementById('chatbotai-send');
    var suggestedButtons = document.getElementById('chatbotai-suggested-buttons');

    if (suggestedButtons) {
      suggestedButtons.addEventListener('wheel', function(e) {
        if (e.deltaY === 0 && e.deltaX === 0) return;
        e.preventDefault();
        suggestedButtons.scrollLeft += e.deltaY + e.deltaX;
      }, { passive: false });
    }

    trigger.addEventListener('click', function() {
      state.isOpen = !state.isOpen;
      chat.style.display = state.isOpen ? 'flex' : 'none';
      
      if (state.isOpen) {
        applyBackgroundStyle();
        setTimeout(function(){ 
          input.focus();
          var messages = document.getElementById('chatbotai-messages');
          if (messages) {
            messages.scrollTop = messages.scrollHeight;
          }
        }, 100);
      } else {
        state.suggestedQuestionsShown = false;
        var container = document.getElementById('chatbotai-suggested-container');
        if (container) {
          setSuggestedQuestionsDisplay(false);
          setTimeout(function() {
            if (!state.suggestedQuestionsShown && config.settings.suggestedQuestions && config.settings.suggestedQuestions.length > 0) {
              var btnsDiv = document.getElementById('chatbotai-suggested-buttons');
              if (btnsDiv && btnsDiv.children.length > 0) {
                setSuggestedQuestionsDisplay(true);
              }
            }
          }, 100);
        }
      }
    });

    close.addEventListener('click', function() {
      state.isOpen = false;
      chat.style.display = 'none';
      setSuggestedQuestionsDisplay(false);
    });

    send.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

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
    
    setTimeout(function() {
      messages.scrollTop = messages.scrollHeight;
    }, 50);
  }

  function addSuggestedQuestions(questions) {
    if (!questions || questions.length === 0) return;
    if (state.suggestedQuestionsShown) return;
    
    var container = document.getElementById('chatbotai-suggested-container');
    var buttonsDiv = document.getElementById('chatbotai-suggested-buttons');
    
    if (!container || !buttonsDiv) return;
    
    buttonsDiv.innerHTML = '';
    
    questions.forEach(function(question, index) {
      if (!question.trim()) return;
      
      var btn = document.createElement('button');
      btn.textContent = question;
      btn.style.cssText = 'display: inline-flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0; white-space: nowrap; padding: 4px 10px; height: 28px; min-height: 28px; border: 1px solid ' + UI.inputBorder + '; border-radius: 9999px; background: white; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08); cursor: pointer; font-size: 12px; font-weight: 500; color: #334155; transition: all 0.2s; opacity: 0.98; line-height: 1 !important; box-sizing: border-box;';
      
      btn.onmouseover = function() {
        this.style.background = '#f3f4f6';
        this.style.borderColor = config.settings.primaryColor;
        this.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.12)';
      };
      btn.onmouseout = function() {
        this.style.background = 'white';
        this.style.borderColor = '#e5e7eb';
        this.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.08)';
      };
      
      btn.onclick = function() {
        state.suggestedQuestionsShown = true;
        setSuggestedQuestionsDisplay(false);
        var input = document.getElementById('chatbotai-input');
        input.value = question;
        sendMessage();
      };
      
      buttonsDiv.appendChild(btn);
    });
    
    setSuggestedQuestionsDisplay(true);
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
    
    setTimeout(function() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }

  /**
   * Inject JSON-LD Schema for SEO support
   * @param {string} botName 
   */
  function injectVieloraContactSchema(botName) {
    if (document.getElementById('vielora-seo-contact')) return;

    var orgName = botName || window.location.hostname;
    var currentOrigin = window.location.origin;
    var currentUrl = window.location.href;
    
    var schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": currentOrigin + "/#organization",
          "name": orgName,
          "url": currentOrigin,
          "contactPoint": [
            {
              "@type": "ContactPoint",
              "contactType": "customer support",
              "url": currentUrl
            }
          ]
        }
      ]
    };

    var script = document.createElement('script');
    script.id = 'vielora-seo-contact';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema).replace(/</g, '\\u003c');
    document.head.appendChild(script);
  }

  
  Vielora.init = initWidget;
  window.Vielora = Vielora;
  window.ChatBotAI = Vielora;

  function autoInit() {
    var currentScript = document.currentScript;
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

  var queue = (window.Vielora && window.Vielora.q) || (window.ChatBotAI && window.ChatBotAI.q);
  if (Array.isArray(queue)) {
    queue.forEach(function(args) {
      initWidget(args[0], args[1]);
    });
    if (window.Vielora) window.Vielora.q = null;
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    autoInit();
  } else {
    document.addEventListener('DOMContentLoaded', autoInit);
  }

})(window, document);
