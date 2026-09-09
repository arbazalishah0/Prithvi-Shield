// Centralized Localization System for PRITHVI-SHIELD / SafeGround
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';

const dictionaries = { en, hi, mr };

class I18nManager {
  constructor() {
    this.activeLang = 'auto'; // 'auto' | 'en' | 'hi' | 'mr' | 'bn' | 'gu' | 'ta' | 'te' | 'kn' | 'ml' | 'pa' | 'ur'
    this.detectedLang = 'en';
    this.listeners = [];
  }

  setLanguage(lang) {
    this.activeLang = lang;
    this.notify();
  }

  getEffectiveLanguage() {
    if (this.activeLang !== 'auto') return this.activeLang;
    return this.detectedLang || 'en';
  }

  t(key, fallback = '') {
    const lang = this.getEffectiveLanguage();
    const dict = dictionaries[lang] || dictionaries.en;
    return dict[key] || fallback || key;
  }

  notify() {
    this.listeners.forEach(fn => fn(this.activeLang));
  }

  onLanguageChange(callback) {
    this.listeners.push(callback);
  }
}

export const i18n = new I18nManager();
