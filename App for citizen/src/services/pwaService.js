import { store } from '../store.js';

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstallable = false;
    this.listeners = [];

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.notify();
    });

    // Listen for appinstalled
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstallable = false;
      console.log('[PWA] PRITHVI-SHIELD App successfully installed on device!');
      this.notify();
    });

    // Monitor connectivity
    this.initConnectivityMonitor();
  }

  initConnectivityMonitor() {
    window.addEventListener('online', () => {
      console.log('[Network] Internet connection restored.');
      store.setOnlineStatus(true);
    });

    window.addEventListener('offline', () => {
      console.warn('[Network] Connection lost. Switching to offline emergency mode.');
      store.setOnlineStatus(false);
    });
  }

  isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  isDismissed() {
    const dismissedUntil = localStorage.getItem('pwa_install_dismissed_until');
    if (!dismissedUntil) return false;
    return Date.now() < parseInt(dismissedUntil, 10);
  }

  dismissInstall() {
    // Dismiss for 7 days
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa_install_dismissed_until', nextWeek.toString());
    this.isInstallable = false;
    this.notify();
  }

  onStateChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(fn => fn({
      isInstallable: this.isInstallable,
      isStandalone: this.isStandalone(),
      isIOS: this.isIOS(),
      isDismissed: this.isDismissed()
    }));
  }

  async installApp() {
    if (!this.deferredPrompt) {
      if (this.isIOS()) {
        return 'IOS_INSTRUCTIONS';
      }
      return false;
    }

    this.deferredPrompt.prompt();
    const choiceResult = await this.deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the PWA install prompt');
      this.isInstallable = false;
      this.notify();
    } else {
      this.dismissInstall();
    }
    this.deferredPrompt = null;
    return choiceResult.outcome === 'accepted';
  }

  // --- Location Permission System ---
  async requestLocationPermission(onSuccess = null, onError = null) {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported on your device or browser.');
      store.setPermissionState('location', 'denied');
      if (onError) onError('NOT_SUPPORTED');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        store.updateUserLocation(latitude, longitude, accuracy);
        store.setPermissionState('location', 'granted');
        console.log(`[GPS] Location granted: (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), accuracy ±${accuracy}m`);
        if (onSuccess) onSuccess(pos.coords);
      },
      (err) => {
        console.warn('[GPS] Location permission error:', err);
        store.setPermissionState('location', 'denied');
        if (onError) onError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }

  // --- Microphone / Voice Permission System ---
  async requestMicrophonePermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Microphone recording is not supported on this device/browser.');
      store.setPermissionState('microphone', 'denied');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      store.setPermissionState('microphone', 'granted');
      // Stop temporary track
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.warn('[Microphone] Permission denied or unavailable:', err);
      store.setPermissionState('microphone', 'denied');
      return false;
    }
  }

  // --- Persistent Storage Permission System ---
  async requestStoragePermission() {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      store.setPermissionState('storage', isPersisted ? 'granted' : 'denied');
      console.log(`[Storage] Offline persistent storage ${isPersisted ? 'granted' : 'denied'}`);
      return isPersisted;
    }
    return false;
  }
}

export const pwaManager = new PWAManager();

