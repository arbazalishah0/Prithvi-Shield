// Single source of truth for calls made from Android/iOS and the web build.
const rawApiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const rawBackendBase = (import.meta.env.VITE_BACKEND_BASE_URL || '').replace(/\/$/, '');

function isNativeMobile() {
  return typeof window !== 'undefined' && !!window.Capacitor && window.Capacitor.isNativePlatform();
}

/**
 * Returns the AI Engine & Emergency Services API URL (Default Port: 8000)
 * Serves /api/emergency/sos, /api/evacuation/calculate, /analyze-location
 */
export function requireApiBaseUrl() {
  if (rawApiBase) {
    if (isNativeMobile() && (rawApiBase.includes('localhost') || rawApiBase.includes('127.0.0.1'))) {
      console.warn('[Network] Running on native mobile device with localhost URL. Android emulator should use 10.0.2.2 or host LAN IP.');
    }
    return rawApiBase;
  }

  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    // Android Emulator host loopback
    if (isNativeMobile() && (host === 'localhost' || !host)) {
      return 'http://10.0.2.2:8000';
    }
    // Deployed public web app
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.') && !host.startsWith('10.')) {
      return window.location.origin;
    }
    // Local LAN testing (Phone browsing via Wi-Fi IP)
    if (host && (host.startsWith('192.168.') || host.startsWith('10.'))) {
      return `http://${host}:8000`;
    }
  }

  return 'http://127.0.0.1:8000';
}

/**
 * Returns the Prithvi Shield Firebase/Data Backend URL (Default Port: 8001)
 * Serves /api/users, /api/locations, /api/reports, /api/risk
 */
export function requireBackendBaseUrl() {
  if (rawBackendBase) {
    return rawBackendBase;
  }
  const aiBase = requireApiBaseUrl();
  // If AI base is pointing to port 8000, backend is on 8001
  if (aiBase.includes(':8000')) {
    return aiBase.replace(':8000', ':8001');
  }
  return aiBase;
}

export const API_BASE_URL = requireApiBaseUrl();
export const getAIEngineBaseUrl = requireApiBaseUrl;
export const getBackendBaseUrl = requireBackendBaseUrl;

