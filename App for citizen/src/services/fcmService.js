/**
 * PRITHVI-SHIELD / PRAHARI (SIH 2026)
 * Citizen Mobile Application - FCM Push Notification Service
 */

import { store } from '../store.js';

const BACKEND_API_BASE = 'http://127.0.0.1:8000';

class FCMService {
  constructor() {
    this.deviceToken = null;
    this.pollInterval = null;
    this.lastProcessedAlertId = null;
  }

  /**
   * Initializes FCM Device Token & registers with backend
   */
  async initialize(userId = 'citizen_001', userName = 'Arunav Baruah', region = 'Kamrup / Guwahati', language = 'English') {
    // Generate or retrieve persistent local device token
    let token = localStorage.getItem('prahari_fcm_token');
    if (!token) {
      token = 'fcm_tok_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      localStorage.setItem('prahari_fcm_token', token);
    }
    this.deviceToken = token;
    store.state.fcmToken = token;

    // Register token with FastAPI backend
    try {
      const payload = {
        user_id: userId,
        fcm_token: token,
        platform: 'android',
        name: userName,
        region: region,
        preferred_language: language
      };

      const res = await fetch(`${BACKEND_API_BASE}/api/device/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        console.log('[FCM Service] Device registered successfully with PRITHVI-SHIELD Backend');
      }
    } catch (e) {
      console.warn('[FCM Service] Backend offline, running in local cached push mode');
    }

    // Start background alert polling for real-time live push simulation
    this.startLiveAlertPolling(userId);
  }

  /**
   * Polls backend for live emergency broadcasts targeted for this citizen
   */
  startLiveAlertPolling(userId) {
    if (this.pollInterval) clearInterval(this.pollInterval);
    
    // Initial fetch
    this.syncAlerts(userId);

    // Periodic check every 8 seconds
    this.pollInterval = setInterval(() => {
      this.syncAlerts(userId);
    }, 8000);
  }

  async syncAlerts(userId) {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/api/alerts/citizen/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const alerts = data.alerts || [];

        // Check for new critical/high incoming alert
        if (alerts.length > 0) {
          const latest = alerts[0];
          if (latest.id !== this.lastProcessedAlertId) {
            this.lastProcessedAlertId = latest.id;
            
            // If it's a critical or high alert, show in-app banner
            if (latest.severity === 'CRITICAL' || latest.severity === 'HIGH') {
              this.triggerEmergencyBanner(latest);
            }
          }
        }

        // Update store
        store.state.citizenAlerts = alerts;
      }
    } catch (e) {
      // Offline fallback
    }
  }

  /**
   * Displays high-impact emergency alert banner on screen
   */
  triggerEmergencyBanner(alert) {
    // Check if banner element exists, else create it
    let banner = document.getElementById('prahari-emergency-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'prahari-emergency-banner';
      banner.className = 'fixed top-2 left-2 right-2 z-[99999] transition-all duration-500 transform -translate-y-full';
      document.body.appendChild(banner);
    }

    const isCritical = alert.severity === 'CRITICAL';
    const bgClass = isCritical ? 'bg-red-600 border-red-400' : 'bg-amber-600 border-amber-400';

    banner.innerHTML = `
      <div class="${bgClass} text-white p-4 rounded-2xl border-2 shadow-2xl flex items-start gap-3.5 cursor-pointer animate-bounce" onclick="window.openEmergencyAlertDetail('${alert.id}')">
        <div class="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-2xl animate-spin">${isCritical ? 'crisis_alert' : 'warning'}</span>
        </div>
        <div class="flex-1 flex flex-col gap-0.5">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-black tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded">
              🚨 ${alert.severity} ALERT
            </span>
            <span class="text-[10px] opacity-80">Tap to View</span>
          </div>
          <h4 class="font-black text-sm leading-tight mt-0.5">${alert.display_title || alert.title}</h4>
          <p class="text-xs opacity-90 line-clamp-2 leading-snug">${alert.display_message || alert.message}</p>
        </div>
      </div>
    `;

    // Animate down
    setTimeout(() => {
      banner.classList.remove('-translate-y-full');
    }, 100);

    // Vibrate device if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(isCritical ? [500, 200, 500, 200, 1000] : [300, 200, 300]);
    }
  }

  async markAsRead(alertId, userId) {
    try {
      await fetch(`${BACKEND_API_BASE}/api/alerts/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, user_id: userId })
      });
    } catch (e) {}
  }
}

export const fcmService = new FCMService();

// Global handler attached to window for banner click
window.openEmergencyAlertDetail = function(alertId) {
  // Dismiss banner
  const banner = document.getElementById('prahari-emergency-banner');
  if (banner) {
    banner.classList.add('-translate-y-full');
  }

  // Find alert in store or fallback
  const alert = (store.state.citizenAlerts || []).find(a => a.id === alertId) || {
    id: alertId,
    title: 'CRITICAL LANDSLIDE WARNING',
    message: 'High landslide risk detected in your area. Please avoid unstable slopes and follow immediate evacuation instructions.',
    severity: 'CRITICAL',
    target_region: 'Kamrup / Guwahati',
    created_by: 'PRAHARI Command State HQ',
    sent_at: '07 September 2026 | 06:30 PM',
    safety_instructions: [
      'Avoid unstable slopes.',
      'Avoid travelling through hill roads.',
      'Follow official instructions.',
      'Stay updated through PRITHVI-SHIELD / PRAHARI.'
    ]
  };

  store.state.activeAlertDetails = alert;
  fcmService.markAsRead(alert.id, 'citizen_001');

  // Navigate to alert-details view
  if (window.renderAppView) {
    window.renderAppView('alert-details');
  }
};
