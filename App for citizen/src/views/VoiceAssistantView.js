import { store } from '../store.js';
import { i18n } from '../services/i18n.js';
import { renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';
import { triggerPermissionPrompt } from '../components/PWABanner.js';
import { voiceManager } from '../services/voiceService.js';

export function renderVoiceAssistantView() {
  const { voiceAssistant } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-[#191c1e] text-white min-h-screen pb-nav-safe overflow-y-auto antialiased">
      <!-- Dark Header with WindowInsets Status Bar Protection -->
      <header class="w-full bg-[#191c1e] px-4 py-3 pt-safe flex items-center justify-between sticky top-0 z-40 border-b border-white/10 shadow-sm">
        <button id="voice-back-btn" class="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-transform active:scale-95">
          <span class="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div class="flex items-center gap-2 font-bold text-white text-base">
          <span class="material-symbols-outlined text-blue-400 text-[20px]" style="font-variation-settings: 'FILL' 1;">mic</span>
          PRITHVI-SHIELD AI Assistant
        </div>
        <select id="voice-lang-select" class="bg-[#2d3133] border border-white/20 text-white font-bold text-xs px-2 py-1 rounded-xl outline-none focus:ring-1 focus:ring-blue-400">
          <option value="auto">🌐 Auto Detect</option>
          <option value="en">🇬🇧 English</option>
          <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
          <option value="mr">🇮🇳 मराठी (Marathi)</option>
          <option value="bn">🇮🇳 বাংলা (Bengali)</option>
          <option value="gu">🇮🇳 ગુજરાતી (Gujarati)</option>
          <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
          <option value="te">🇮🇳 తెలుగు (Telugu)</option>
          <option value="kn">🇮🇳 ಕನ್ನಡ (Kannada)</option>
          <option value="ml">🇮🇳 മലയാളം (Malayalam)</option>
          <option value="pa">🇮🇳 ਪੰਜਾਬੀ (Punjabi)</option>
          <option value="ur">🇮🇳 اردو (Urdu)</option>
        </select>
      </header>

      <main class="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-xl mx-auto w-full gap-6">
        <!-- Voice Orb Indicator -->
        <div class="relative flex items-center justify-center my-4 w-full">
          <div class="absolute w-36 h-36 bg-blue-500/20 rounded-full pulse-ring-orb blur-md"></div>
          <div class="absolute w-28 h-28 bg-blue-600/30 rounded-full pulse-ring-orb blur-sm" style="animation-delay: 0.5s;"></div>
          
          <button id="voice-mic-toggle" class="relative z-10 w-20 h-20 bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center rounded-full shadow-2xl transition-transform active:scale-90 border-2 border-white/30 cursor-pointer">
            <span class="material-symbols-outlined text-[36px]" style="font-variation-settings: 'FILL' 1;">mic</span>
          </button>
        </div>

        <!-- Listening Transcription -->
        <div class="text-center w-full px-2">
          <p id="voice-status-text" class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 animate-pulse flex items-center justify-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-400"></span>
            ${voiceAssistant.isListening ? 'Listening to voice stream...' : 'Voice AI Active'}
          </p>
          <div class="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
            <p id="voice-transcript-text" class="text-base font-semibold text-white/95 leading-relaxed">
              "${voiceAssistant.transcript}"
            </p>
          </div>
        </div>

        <!-- AI Landslide Analysis Bento Card -->
        <div class="w-full bg-[#2d3133] border border-white/15 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
          <div class="flex justify-between items-center border-b border-white/10 pb-2.5">
            <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-cyan-400" style="font-variation-settings: 'FILL' 1;">analytics</span>
              AI LANDSLIDE ANALYSIS
            </h3>
            <span class="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase animate-pulse">
              Risk: HIGH (82%)
            </span>
          </div>

          <!-- Risk Factor Grid -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-[#191c1e] p-2.5 rounded-xl border border-white/5 flex flex-col">
              <span class="text-[10px] text-slate-400 font-bold uppercase">Rainfall Rate</span>
              <span class="text-sm font-extrabold text-cyan-300">145 mm / 24 hrs</span>
            </div>

            <div class="bg-[#191c1e] p-2.5 rounded-xl border border-white/5 flex flex-col">
              <span class="text-[10px] text-slate-400 font-bold uppercase">Slope Angle</span>
              <span class="text-sm font-extrabold text-amber-300">38° (Steep)</span>
            </div>

            <div class="bg-[#191c1e] p-2.5 rounded-xl border border-white/5 flex flex-col">
              <span class="text-[10px] text-slate-400 font-bold uppercase">Soil Moisture</span>
              <span class="text-sm font-extrabold text-red-400">High (87%)</span>
            </div>

            <div class="bg-[#191c1e] p-2.5 rounded-xl border border-white/5 flex flex-col">
              <span class="text-[10px] text-slate-400 font-bold uppercase">Vegetation</span>
              <span class="text-sm font-extrabold text-slate-200">Moderate Cover</span>
            </div>
          </div>

          <div class="p-3 bg-red-950/30 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
            <span class="material-symbols-outlined text-red-400 text-[18px] mt-0.5" style="font-variation-settings: 'FILL' 1;">warning</span>
            <div>
              <strong>AI Recommendation:</strong> Avoid travelling through nearby high-risk slope zones. Seek shelter if rainfall continues.
            </div>
          </div>
        </div>

        <!-- AI Disaster Chatbot Section -->
        <div class="w-full bg-[#2d3133] border border-white/15 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[18px] text-cyan-400" style="font-variation-settings: 'FILL' 1;">forum</span>
            Disaster Assistance AI Chatbot
          </h3>

          <!-- Preset Query Chips -->
          <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button data-ai-query="Is my area safe?" class="ai-query-chip shrink-0 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition-all">Is my area safe?</button>
            <button data-ai-query="What should I do during a landslide?" class="ai-query-chip shrink-0 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition-all">Landslide Safety Tips</button>
            <button data-ai-query="Where is the nearest shelter?" class="ai-query-chip shrink-0 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition-all">Nearest Shelter</button>
            <button data-ai-query="How can I report a hazard?" class="ai-query-chip shrink-0 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition-all">Report Hazard</button>
          </div>

          <!-- Chat History Window -->
          <div id="ai-chat-history" class="bg-[#191c1e] p-3 rounded-xl border border-white/5 min-h-[90px] max-h-[160px] overflow-y-auto text-xs flex flex-col gap-2">
            <div class="bg-blue-600/20 text-blue-200 border border-blue-500/30 p-2.5 rounded-xl self-start max-w-[90%]">
              Hello! I am your <strong>Prithvi Shield AI Safety Assistant</strong>. Ask me anything about local landslide risks, nearest emergency shelters, or safety protocols.
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="w-full flex flex-col gap-2.5 mt-auto">
          <button id="voice-confirm-structurize-btn" class="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all">
            <span>Confirm & Structurize into Report</span>
            <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          </button>
          
          <button id="voice-speak-sample-btn" class="w-full py-3 bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 border border-white/10 transition-colors">
            <span class="material-symbols-outlined text-[16px]">record_voice_over</span>
            Simulate Another Voice Statement
          </button>
        </div>
      </main>

      ${renderBottomNav('voice-assistant')}
    </div>
  `;
}

export function bindVoiceAssistantEvents(container) {
  bindNavigationEvents(container);

  const backBtn = container.querySelector('#voice-back-btn');
  if (backBtn) backBtn.addEventListener('click', () => store.navigate('home'));

  // Confirm & Structurize
  const confirmBtn = container.querySelector('#voice-confirm-structurize-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      store.setReportCategory('Ground Crack');
      store.updateReportDetails(store.state.voiceAssistant.transcript);
      store.navigate('report');
    });
  }

  const langSelect = container.querySelector('#voice-lang-select');
  if (langSelect) {
    langSelect.value = i18n.activeLang;
    langSelect.addEventListener('change', (e) => {
      i18n.setLanguage(e.target.value);
    });
  }

  const micBtn = container.querySelector('#voice-mic-toggle');
  const statusText = container.querySelector('#voice-status-text');
  const transcriptEl = container.querySelector('#voice-transcript-text');

  // Universal voice state observer
  const updateVoiceStatus = (state) => {
    if (!statusText) return;
    switch (state) {
      case 'SPEAKING':
        statusText.className = "text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 animate-pulse flex items-center justify-center gap-1.5";
        statusText.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> 🔊 PRITHVI IS SPEAKING...';
        break;
      case 'LISTENING':
        statusText.className = "text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 animate-pulse flex items-center justify-center gap-1.5";
        statusText.innerHTML = '<span class="w-2 h-2 rounded-full bg-cyan-400"></span> 🎙️ LISTENING TO VOICE...';
        break;
      case 'THINKING':
        statusText.className = "text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 animate-pulse flex items-center justify-center gap-1.5";
        statusText.innerHTML = '<span class="w-2 h-2 rounded-full bg-purple-400"></span> 🧠 AI THINKING...';
        break;
      case 'PERMISSION_DENIED':
        statusText.className = "text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5";
        statusText.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span> 🔒 MIC ACCESS DENIED — ALLOW IN PERMISSIONS';
        break;
      case 'UNSUPPORTED':
        statusText.className = "text-xs font-bold text-amber-300 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5";
        statusText.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> ⚠️ VOICE NOT SUPPORTED IN WEBVIEW — USE QUICK PROMPTS';
        break;
      case 'STOPPED':
        statusText.className = "text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5";
        statusText.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span> ⏹️ VOICE INPUT STOPPED';
        break;
      case 'ERROR':
        statusText.className = "text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5";
        statusText.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-400"></span> ⚠️ VOICE RECOGNITION ERROR — TAP TO RETRY';
        break;
      default:
        statusText.className = "text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5";
        statusText.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span> VOICE AI READY';
    }
  };
  voiceManager.onStateChange(updateVoiceStatus);

  if (micBtn) {
    micBtn.addEventListener('click', async () => {
      const startOrStop = async () => {
        if (voiceManager.state === 'LISTENING') {
          voiceManager.stopSession();
        } else {
          await voiceManager.startSession();
        }
      };

      if (store.state.permissions.microphone !== 'granted') {
        triggerPermissionPrompt('microphone', startOrStop);
      } else {
        await startOrStop();
      }
    });
  }

  // Global helper for replaying chat voice messages
  window._replaySafetyAudio = (text) => {
    voiceManager.speakText(text, false);
  };

  // Global helper for appending voice-spoken turns into the UI chat history
  window._addVoiceChatMessage = (userText, aiText) => {
    if (transcriptEl) {
      transcriptEl.textContent = `"${userText}"`;
    }
    if (chatHistory) {
      const escapedAi = (aiText || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      chatHistory.innerHTML += `
        <div class="bg-blue-600/30 text-cyan-200 border border-blue-400/30 p-2 rounded-xl self-end max-w-[85%] font-medium text-right text-xs shadow">
          <div class="flex items-center justify-end gap-1 text-[10px] text-cyan-400 mb-0.5 font-bold">
            <span class="material-symbols-outlined text-[12px]">mic</span> You (Voice)
          </div>
          ${userText}
        </div>
        <div class="bg-cyan-950/70 border border-cyan-500/40 text-white p-2.5 rounded-xl self-start max-w-[95%] font-medium text-xs flex flex-col gap-1.5 shadow-md">
          <div class="flex items-center gap-1 text-[10px] text-cyan-400 font-bold mb-0.5">
            <span class="material-symbols-outlined text-[12px]">smart_toy</span> PRITHVI AI
          </div>
          <div>${(aiText || '').replace(/\n/g, '<br>')}</div>
          <button onclick="window._replaySafetyAudio('${escapedAi}')" class="self-start flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-100 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors mt-1">
            <span class="material-symbols-outlined text-[14px]">volume_up</span> Replay Voice
          </button>
        </div>
      `;
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  };

  // Multilingual safety advice database
  const aiResponses = {
    en: {
      "Is my area safe?": "Your sector is currently marked HIGH RISK with an 82% probability due to heavy rainfall. Please avoid steep slope embankments.",
      "What should I do during a landslide?": "1. Move to high ground immediately. 2. Avoid river valleys and low-lying roads. 3. Stay alert for rumbling sounds or crackling trees. 4. Trigger SOS to broadcast your location.",
      "Where is the nearest shelter?": "Central Civic Shelter is 1.2 kilometers East. Capacity is available and medical personnel are on site.",
      "How can I report a hazard?": "Tap the Report tab at the bottom, upload a photo, add details, and submit with live GPS coordinates."
    },
    hi: {
      "Is my area safe?": "आपके क्षेत्र में भारी वर्षा के कारण भूस्खलन का जोखिम 82% है। कृपया ढलानों और घाटी वाले मार्गों से दूर रहें।",
      "What should I do during a landslide?": "1. तुरंत किसी ऊंचे और पक्के स्थान पर जाएं। 2. ढलानों और नदी घाटियों से दूर रहें। 3. गड़गड़ाहट की आवाज पर सतर्क रहें। 4. आपातकालीन सहायता के लिए एसओएस भेजें।",
      "Where is the nearest shelter?": "निकटतम सुरक्षित राहत आश्रय लगभग 1.2 किलोमीटर पूर्व में स्थित है, जहां चिकित्सा कर्मी उपलब्ध हैं।",
      "How can I report a hazard?": "नीचे दिए गए 'रिपोर्ट' विकल्प पर जाएं, फोटो अपलोड करें और लाइव जीपीएस के साथ रिपोर्ट दर्ज करें।"
    },
    mr: {
      "Is my area safe?": "आपल्या भागात अतिवृष्टीमुळे दरड कोसळण्याचा धोका 82% आहे. कृपया डोंगराळ उतारांपासून दूर राहा.",
      "What should I do during a landslide?": "1. त्वरित उंच आणि सुरक्षित ठिकाणी जा. 2. नद्या आणि सखल रस्ते टाळा. 3. दरड कोसळण्याच्या आवाजावर लक्ष ठेवा. 4. तातडीच्या मदतीसाठी एसओएस पाठवा.",
      "Where is the nearest shelter?": "जवळचे सुरक्षित निवारक केंद्र 1.2 किलोमीटर अंतरावर पूर्वेकडे आहे.",
      "How can I report a hazard?": "खालील 'रिपोर्ट' बटनावर क्लिक करा, फोटो जोडा आणि थेट जीपीएस लोकेशनसह तक्रार नोंदवा."
    }
  };

  // AI Chatbot preset queries
  const chatHistory = container.querySelector('#ai-chat-history');

  container.querySelectorAll('[data-ai-query]').forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-ai-query');
      const lang = i18n.activeLang || 'en';
      const langMap = aiResponses[lang] || aiResponses.en;
      const response = langMap[query] || aiResponses.en[query] || "I am analyzing real-time GIS and weather telemetry for your sector.";

      if (transcriptEl) {
        transcriptEl.textContent = `"${query}"`;
      }

      const escapedResp = response.replace(/'/g, "\\'").replace(/"/g, '&quot;');

      if (chatHistory) {
        chatHistory.innerHTML += `
          <div class="bg-slate-800 text-cyan-300 p-2 rounded-xl self-end max-w-[85%] font-medium text-right text-xs">
            ${query}
          </div>
          <div class="bg-cyan-950/70 border border-cyan-500/40 text-white p-2.5 rounded-xl self-start max-w-[95%] font-medium text-xs flex flex-col gap-1.5 shadow-md">
            <div>${response.replace(/\n/g, '<br>')}</div>
            <button onclick="window._replaySafetyAudio('${escapedResp}')" class="self-start flex items-center gap-1 text-[11px] font-bold text-cyan-300 hover:text-cyan-100 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors mt-1">
              <span class="material-symbols-outlined text-[14px]">volume_up</span> Replay Voice
            </button>
          </div>
        `;
        chatHistory.scrollTop = chatHistory.scrollHeight;
      }

      // Speak directly through the native speech engine
      voiceManager.speakText(response, false);
    });
  });

  let sampleIdx = 0;
  const sampleBtn = container.querySelector('#voice-speak-sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      sampleIdx = (sampleIdx + 1) % samples.length;
      const s = samples[sampleIdx];
      store.state.voiceAssistant.transcript = s.text;
      store.state.voiceAssistant.extractedEntities = {
        hazard: s.hazard,
        indicator: s.indicator,
        confidence: s.confidence
      };
      store.notify();
    });
  }
}
