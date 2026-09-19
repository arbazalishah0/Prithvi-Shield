// Pluggable Speech Service Abstraction Layer (STT & TTS)

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', bcp47: 'en-US' },
  { code: 'en', name: 'English', bcp47: 'en-US' },
  { code: 'hi', name: 'हिन्दी (Hindi)', bcp47: 'hi-IN' },
  { code: 'mr', name: 'मराठी (Marathi)', bcp47: 'mr-IN' },
  { code: 'bn', name: 'বাংলা (Bengali)', bcp47: 'bn-IN' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)', bcp47: 'gu-IN' },
  { code: 'ta', name: 'தமிழ் (Tamil)', bcp47: 'ta-IN' },
  { code: 'te', name: 'తెలుగు (Telugu)', bcp47: 'te-IN' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', bcp47: 'kn-IN' },
  { code: 'ml', name: 'മലയാളം (Malayalam)', bcp47: 'ml-IN' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', bcp47: 'pa-IN' },
  { code: 'ur', name: 'اردو (Urdu)', bcp47: 'ur-PK' }
];

export function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    // Replace numbered bullets like "1. ", "2. " with a brief pause
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n\s*\d+\.\s+/g, '. ')
    // Remove markdown headers, bold, italics, code
    .replace(/[#*_`~]/g, '')
    // Remove bullet points
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\n\s*[-*•]\s+/g, '. ')
    // Replace multiple newlines or single newlines with periods for natural breath
    .replace(/\n+/g, '. ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Remove repeated punctuation like "..", "..."
    .replace(/\.{2,}/g, '.')
    .trim();
}

export class NativeWebSpeechProvider {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this._resumeInterval = null;

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }

      // Pre-load and cache voices
      if (this.synthesis) {
        this.voices = this.synthesis.getVoices();
        if (typeof this.synthesis.onvoiceschanged !== 'undefined') {
          this.synthesis.onvoiceschanged = () => {
            this.voices = this.synthesis.getVoices();
          };
        }
      }
    }
  }

  getBCP47(langCode) {
    const found = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
    return found ? found.bcp47 : 'en-US';
  }

  getBestVoice(langCode, targetBcp) {
    if (!this.voices || this.voices.length === 0) {
      if (this.synthesis) this.voices = this.synthesis.getVoices();
    }
    if (!this.voices || this.voices.length === 0) return null;

    // 1. Exact match on BCP47
    let match = this.voices.find(v => v.lang && v.lang.toLowerCase() === targetBcp.toLowerCase());
    if (match) return match;

    // 2. Prefix match (e.g. "en", "hi", "mr")
    match = this.voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
    if (match) return match;

    // 3. Indian English fallback for regional languages if direct voice missing
    if (langCode === 'hi' || langCode === 'mr') {
      const indianVoice = this.voices.find(v => v.lang && v.lang.toLowerCase().includes('in'));
      if (indianVoice) return indianVoice;
    }

    // 4. Default voice
    return this.voices.find(v => v.default) || this.voices[0] || null;
  }

  isRecognitionSupported() {
    return !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
  }

  startListening(langCode = 'en', onResult, onEnd, onError) {
    if (!this.isRecognitionSupported()) {
      if (onError) onError({ code: 'UNSUPPORTED', message: 'Speech recognition is not supported in this WebView. Please use quick prompts or type below.' });
      return false;
    }

    if (!this.recognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }
    }

    const targetLang = this.getBCP47(langCode);
    this.recognition.lang = targetLang;

    this.recognition.onresult = (event) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      if (onResult) onResult(fullTranscript.trim());
    };

    this.recognition.onend = () => { if (onEnd) onEnd(); };
    this.recognition.onerror = (err) => {
      const errCode = err?.error || '';
      if (errCode === 'not-allowed' || errCode === 'permission-denied') {
        if (onError) onError({ code: 'PERMISSION_DENIED', message: 'Microphone permission was denied. Please allow microphone access in device settings.' });
      } else if (errCode === 'no-speech') {
        if (onError) onError({ code: 'NO_SPEECH', message: 'No speech was detected. Please try again.' });
      } else {
        if (onError) onError({ code: 'ERROR', message: `Voice error: ${errCode || 'Recognition failed'}` });
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('Recognition start exception:', e);
      if (onError) onError({ code: 'ERROR', message: e.message || 'Could not activate microphone' });
      return false;
    }
  }

  stopListening() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
  }

  speak(text, langCode = 'en', onStart, onEnd) {
    if (!this.synthesis) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      if (onEnd) onEnd();
      return false;
    }

    const clean = cleanTextForSpeech(text);
    if (!clean) {
      if (onEnd) onEnd();
      return false;
    }

    // Workaround for Chromium pause/freeze bug: resume synthesis before speaking
    try {
      if (this.synthesis.paused) {
        this.synthesis.resume();
      }
      this.synthesis.cancel();
    } catch (e) {
      console.warn('[SpeechSynthesis cancel/resume notice]:', e);
    }

    const targetBcp = this.getBCP47(langCode);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = targetBcp;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const chosenVoice = this.getBestVoice(langCode, targetBcp);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (this._resumeInterval) {
        clearInterval(this._resumeInterval);
        this._resumeInterval = null;
      }
      window._activeUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onstart = () => {
      if (onStart) onStart();
      // Chromium bug workaround: Keep synthesis alive for long texts
      if (this._resumeInterval) clearInterval(this._resumeInterval);
      this._resumeInterval = setInterval(() => {
        if (this.synthesis && this.synthesis.speaking && !this.synthesis.paused) {
          this.synthesis.pause();
          this.synthesis.resume();
        }
      }, 5000);
    };

    utterance.onend = finish;
    utterance.onerror = (event) => {
      console.warn('[SpeechSynthesis utterance error]:', event);
      finish();
    };

    // Store in window to avoid premature garbage collection in Chrome
    window._activeUtterance = utterance;

    try {
      this.synthesis.speak(utterance);
      return true;
    } catch (err) {
      console.error('[SpeechSynthesis speak error]:', err);
      finish();
      return false;
    }
  }

  stopSpeaking() {
    if (this._resumeInterval) {
      clearInterval(this._resumeInterval);
      this._resumeInterval = null;
    }
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
    }
    window._activeUtterance = null;
  }
}

export class SpeechService {
  constructor(provider = new NativeWebSpeechProvider()) {
    this.provider = provider;
  }

  setProvider(newProvider) {
    this.provider = newProvider;
  }

  startListening(langCode, onResult, onEnd, onError) {
    return this.provider.startListening(langCode, onResult, onEnd, onError);
  }

  stopListening() {
    this.provider.stopListening();
  }

  speak(text, langCode, onStart, onEnd) {
    return this.provider.speak(text, langCode, onStart, onEnd);
  }

  stopSpeaking() {
    this.provider.stopSpeaking();
  }
}

export const speechService = new SpeechService();
