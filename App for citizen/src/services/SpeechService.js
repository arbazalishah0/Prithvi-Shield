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

export class NativeWebSpeechProvider {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis || null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
    }
  }

  getBCP47(langCode) {
    const found = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
    return found ? found.bcp47 : 'en-US';
  }

  startListening(langCode = 'en', onResult, onEnd, onError) {
    if (!this.recognition) return false;

    const targetLang = this.getBCP47(langCode);
    this.recognition.lang = targetLang;

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (onResult) onResult(transcript);
    };

    this.recognition.onend = () => { if (onEnd) onEnd(); };
    this.recognition.onerror = (err) => { if (onError) onError(err); };

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('Recognition start exception:', e);
      return false;
    }
  }

  stopListening() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
  }

  speak(text, langCode = 'en', onStart, onEnd) {
    if (!this.synthesis) return false;

    this.synthesis.cancel();
    const targetBcp = this.getBCP47(langCode);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetBcp;
    utterance.rate = 0.95; // Slightly natural pace
    utterance.pitch = 1.0;

    // Pick best matching voice for Indian language if available
    const voices = this.synthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang === targetBcp || v.lang.startsWith(langCode));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => { if (onEnd) onEnd(); };

    this.synthesis.speak(utterance);
    return true;
  }

  stopSpeaking() {
    if (this.synthesis) this.synthesis.cancel();
  }
}

export class RumikVoiceSpeechProvider extends NativeWebSpeechProvider {
  constructor() {
    super();
    this.apiKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_RUMIK_API_KEY : 'rumik_live_v2_9921_key';
    this.endpoint = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_RUMIK_VOICE_ENDPOINT : 'https://api.rumik.ai/v1/voice/speak';
  }

  async speakWithRumikAI(text, langCode = 'en', onStart, onEnd) {
    try {
      if (onStart) onStart();
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          language: langCode,
          voice_id: 'rumik-safety-assistant-multilingual'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.onended = () => { if (onEnd) onEnd(); };
        audio.play();
        return true;
      }
    } catch (e) {
      console.warn('[Rumik Voice AI Fallback to Native Speech]:', e);
    }

    return super.speak(text, langCode, onStart, onEnd);
  }

  speak(text, langCode = 'en', onStart, onEnd) {
    this.speakWithRumikAI(text, langCode, onStart, onEnd);
    return true;
  }
}

export class SpeechService {
  constructor(provider = new RumikVoiceSpeechProvider()) {
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
