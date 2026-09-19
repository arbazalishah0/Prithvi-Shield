import { supabase } from './supabaseClient.js';
import { sendAIChatMessage } from './aiService.js';
import { store } from '../store.js';
import { speechService } from './SpeechService.js';
import { i18n } from './i18n.js';

export class VoiceAssistantManager {
  constructor() {
    this.state = 'IDLE'; // IDLE | CONNECTING | LISTENING | THINKING | SPEAKING | ERROR | DISCONNECTED
    this.listeners = [];
    this.continuousMode = false; // Enabled only during active mic dialog
  }

  onStateChange(callback) {
    this.listeners.push(callback);
  }

  setState(newState) {
    this.state = newState;
    this.listeners.forEach(cb => cb(this.state));
  }

  speakText(text, enableContinuous = false) {
    const lang = i18n.getEffectiveLanguage();

    const ok = speechService.speak(
      text,
      lang,
      () => this.setState('SPEAKING'),
      () => {
        this.setState('IDLE');
        if (enableContinuous && this.continuousMode) {
          setTimeout(() => {
            this.startSession();
          }, 800);
        }
      }
    );

    if (!ok) {
      this.setState('IDLE');
    }
  }

  async startSession(userId = null) {
    try {
      this.continuousMode = true;
      this.setState('CONNECTING');
      const lang = i18n.getEffectiveLanguage();

      // Reset previous transcript for new turn
      store.state.voiceAssistant.transcript = '';
      store.notify();

      const ok = speechService.startListening(
        lang,
        (transcript) => {
          store.state.voiceAssistant.transcript = transcript;
          store.notify();
        },
        async () => {
          const finalPrompt = (store.state.voiceAssistant.transcript || '').trim();
          if (finalPrompt.length > 0) {
            this.setState('THINKING');
            try {
              const response = await sendAIChatMessage(finalPrompt);
              const textToSpeak = response.message || "Stay alert for rumbling sounds or sudden water runoff. Avoid steep slopes during heavy rainfall.";

              // Update Chat History in the UI
              if (typeof window !== 'undefined' && typeof window._addVoiceChatMessage === 'function') {
                window._addVoiceChatMessage(finalPrompt, textToSpeak);
              }

              this.speakText(textToSpeak, false);
            } catch (err) {
              console.error('[Voice Assistant AI Error]:', err);
              this.setState('IDLE');
            }
          } else {
            this.setState('IDLE');
          }
        },
        (err) => {
          console.warn('[Voice STT Error]', err);
          if (err?.code === 'PERMISSION_DENIED') {
            this.setState('PERMISSION_DENIED');
          } else if (err?.code === 'UNSUPPORTED') {
            this.setState('UNSUPPORTED');
          } else {
            this.setState('ERROR');
          }
        }
      );

      if (ok) {
        this.setState('LISTENING');
        return { success: true, mode: 'stt' };
      } else {
        if (!speechService.isRecognitionSupported()) {
          this.setState('UNSUPPORTED');
        } else {
          this.setState('ERROR');
        }
        return { success: false, mode: 'unsupported' };
      }

    } catch (err) {
      console.error('Microphone or Voice session error:', err);
      this.setState('ERROR');
      return { success: false, error: err.message };
    }
  }

  stopSession() {
    this.continuousMode = false;
    speechService.stopListening();
    this.setState('STOPPED');
  }
}

export const voiceManager = new VoiceAssistantManager();
