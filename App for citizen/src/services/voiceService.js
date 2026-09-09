import { supabase } from './supabaseClient.js';
import { sendAIChatMessage } from './aiService.js';
import { store } from '../store.js';
import { speechService } from './SpeechService.js';
import { i18n } from './i18n.js';

export class VoiceAssistantManager {
  constructor() {
    this.state = 'IDLE'; // IDLE | CONNECTING | LISTENING | THINKING | SPEAKING | ERROR | DISCONNECTED
    this.listeners = [];
    this.continuousMode = true; // Enables hands-free back-and-forth conversation
  }

  onStateChange(callback) {
    this.listeners.push(callback);
  }

  setState(newState) {
    this.state = newState;
    this.listeners.forEach(cb => cb(this.state));
  }

  speakText(text) {
    const lang = i18n.getEffectiveLanguage();

    const ok = speechService.speak(
      text,
      lang,
      () => this.setState('SPEAKING'),
      () => {
        this.setState('IDLE');
        // Hands-Free Continuous Conversation Loop
        if (this.continuousMode) {
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
      this.setState('CONNECTING');
      const lang = i18n.getEffectiveLanguage();

      const ok = speechService.startListening(
        lang,
        (transcript) => {
          store.state.voiceAssistant.transcript = transcript;
          store.notify();
        },
        async () => {
          if (this.state === 'LISTENING') {
            this.setState('THINKING');
            const finalPrompt = store.state.voiceAssistant.transcript;
            if (finalPrompt && finalPrompt.trim().length > 0) {
              const response = await sendAIChatMessage(finalPrompt);
              const textToSpeak = response.message || "Route calculation complete.";
              this.speakText(textToSpeak);
            } else {
              this.setState('IDLE');
            }
          }
        },
        (err) => {
          console.warn('[Voice STT Error]', err);
          this.setState('ERROR');
        }
      );

      if (ok) {
        this.setState('LISTENING');
        return { success: true, mode: 'stt' };
      } else {
        setTimeout(() => {
          this.setState('LISTENING');
        }, 800);
        return { success: true, mode: 'fallback' };
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
    speechService.stopSpeaking();
    this.setState('IDLE');
  }
}

export const voiceManager = new VoiceAssistantManager();
