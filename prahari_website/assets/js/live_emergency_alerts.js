/**
 * PRITHVI-SHIELD / PRAHARI Command
 * Refined Non-Intrusive Emergency Alert System & Notification Hub
 * SIH 2026
 */

(function () {
  const BACKEND_API_BASE = 'http://127.0.0.1:8000';
  let latestAlerts = [];
  let isSoundMuted = true; // ALWAYS muted by default

  // Inject CSS Styles for Floating Emergency Ribbon, Bell, and Modal
  const style = document.createElement('style');
  style.id = 'prahari-emergency-styles';
  style.textContent = `
    /* Sleek Floating Emergency Ribbon (Positioned cleanly below fixed top navbar) */
    #prahari-top-emergency-bar {
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 1280px;
      z-index: 45;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(239, 68, 68, 0.6);
      border-left: 4px solid #ef4444;
      border-radius: 12px;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px rgba(220, 38, 38, 0.2);
      backdrop-filter: blur(12px);
      color: #ffffff;
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: ribbonSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes ribbonSlideDown {
      from { opacity: 0; transform: translate(-50%, -10px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    .prahari-ticker-badge {
      background: #7f1d1d;
      color: #fecaca;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      padding: 3px 8px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(239, 68, 68, 0.4);
      text-transform: uppercase;
      white-space: nowrap;
    }
    .prahari-siren-dot {
      width: 7px;
      height: 7px;
      background: #ef4444;
      border-radius: 50%;
      animation: sirenPing 1.2s infinite;
    }
    @keyframes sirenPing {
      0% { transform: scale(0.9); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.4; }
      100% { transform: scale(0.9); opacity: 1; }
    }

    /* Emergency Pop-up Modal (Only shown on explicit user click) */
    #prahari-alert-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100000;
      background: rgba(3, 7, 18, 0.85);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .prahari-alert-dialog {
      background: #0b1120;
      border: 2px solid #ef4444;
      border-radius: 20px;
      max-width: 560px;
      width: 100%;
      color: #f8fafc;
      box-shadow: 0 25px 60px -15px rgba(220, 38, 38, 0.5), 0 0 0 1px rgba(255,255,255,0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .prahari-alert-glow-header {
      background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);
      padding: 16px 20px;
      border-bottom: 1px solid rgba(239, 68, 68, 0.4);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    /* Floating Emergency Notification Bell */
    #prahari-floating-alert-bell {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9998;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #0f172a;
      border: 2px solid #38bdf8;
      color: #38bdf8;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    #prahari-floating-alert-bell:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 30px rgba(56, 189, 248, 0.4);
    }
    #prahari-floating-alert-bell.has-critical {
      border-color: #ef4444;
      color: #ef4444;
      background: #180d12;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
    }
    .prahari-bell-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      background: #ef4444;
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #0b1120;
    }

    /* Bell Dropdown Tray */
    #prahari-alert-tray {
      position: fixed;
      bottom: 80px;
      right: 24px;
      width: 360px;
      max-width: calc(100vw - 48px);
      max-height: 440px;
      background: #0b1329;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
      z-index: 9998;
      display: none;
      flex-direction: column;
      overflow: hidden;
      backdrop-filter: blur(12px);
    }
  `;
  document.head.appendChild(style);

  // Initialize DOM Elements
  function initDOM() {
    // 1. Floating Sub-Navbar Emergency Ribbon
    if (!document.getElementById('prahari-top-emergency-bar')) {
      const bar = document.createElement('div');
      bar.id = 'prahari-top-emergency-bar';
      bar.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden flex-1 mr-3">
          <div class="prahari-ticker-badge shrink-0">
            <span class="prahari-siren-dot"></span>
            <span id="prahari-ticker-severity">CRITICAL ALERT</span>
          </div>
          <div class="flex items-center gap-2 overflow-hidden text-xs">
            <span class="text-amber-300 font-bold shrink-0 text-[11px]" id="prahari-ticker-region">📍 ALL REGIONS</span>
            <span class="text-slate-600">|</span>
            <span class="truncate text-slate-200 font-medium text-[11px]" id="prahari-ticker-msg">Active early warning alert issued by PRAHARI Command.</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button id="prahari-ticker-view-btn" class="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-extrabold px-2.5 py-1 rounded transition flex items-center gap-1">
            <span>View Advisory</span>
            <span>&rarr;</span>
          </button>
          <a href="alert_center.html" class="bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded transition uppercase">
            Alert Center
          </a>
          <button id="prahari-ticker-close-btn" class="text-slate-400 hover:text-white p-1 ml-1" title="Dismiss Alert Bar">
            <span style="font-size:14px; line-height:1;">✕</span>
          </button>
        </div>
      `;
      document.body.appendChild(bar);

      document.getElementById('prahari-ticker-view-btn').addEventListener('click', () => {
        if (latestAlerts.length > 0) {
          showAlertModal(latestAlerts[0]);
        }
      });

      document.getElementById('prahari-ticker-close-btn').addEventListener('click', () => {
        bar.style.display = 'none';
        if (latestAlerts.length > 0) {
          sessionStorage.setItem('prahari_dismissed_ribbon_' + latestAlerts[0].id, 'true');
        }
      });
    }

    // 2. Alert Details Modal Dialog (Controlled solely by clicks)
    if (!document.getElementById('prahari-alert-modal-backdrop')) {
      const modal = document.createElement('div');
      modal.id = 'prahari-alert-modal-backdrop';
      modal.innerHTML = `
        <div class="prahari-alert-dialog">
          <div class="prahari-alert-glow-header">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center shrink-0">
                <span class="text-xl">🚨</span>
              </div>
              <div>
                <span id="modal-alert-badge" class="text-[9px] font-black uppercase tracking-widest bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-700/50 inline-block">
                  CRITICAL BROADCAST
                </span>
                <h3 id="modal-alert-title" class="text-base font-black text-white leading-tight mt-0.5">
                  LANDSLIDE WARNING ADVISORY
                </h3>
              </div>
            </div>
            <button id="modal-alert-close-btn" class="text-slate-400 hover:text-white p-1 text-base font-bold">✕</button>
          </div>

          <div class="p-5 flex flex-col gap-3.5 text-xs">
            <div class="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1">
              <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Official Advisory</span>
              <p id="modal-alert-body" class="text-xs font-semibold text-slate-100 leading-relaxed">
                Emergency notice content goes here...
              </p>
            </div>

            <div class="grid grid-cols-2 gap-2.5 text-[10px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>
                <span class="text-slate-500 block text-[9px] uppercase">Targeted Sector:</span>
                <span id="modal-alert-region" class="font-bold text-cyan-400">Kamrup / Guwahati</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[9px] uppercase">Issued By:</span>
                <span id="modal-alert-issuer" class="font-bold text-slate-300">PRAHARI Command HQ</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[9px] uppercase">FCM Priority:</span>
                <span id="modal-alert-priority" class="font-bold text-amber-400">MAXIMUM</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[9px] uppercase">Timestamp:</span>
                <span id="modal-alert-time" class="font-bold text-slate-300">Live Broadcast</span>
              </div>
            </div>

            <!-- Mandatory Safety Checklist -->
            <div class="flex flex-col gap-1.5">
              <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <span>🛡️</span> Mandatory Field Instructions
              </span>
              <div id="modal-alert-instructions" class="flex flex-col gap-1 text-slate-300">
                <div class="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
                  <span class="text-emerald-400 font-bold">✓</span>
                  <span>Avoid unstable slope cuts and active landslide hazard zones.</span>
                </div>
              </div>
            </div>

            <!-- Quick Action Links -->
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <a href="evacuation_rescue.html" class="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 transition text-xs">
                <span>🏃‍♂️ Evacuation Routes</span>
              </a>
              <a href="alert_center.html" class="bg-red-600 hover:bg-red-500 text-white font-black py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 transition text-xs">
                <span>📢 Alert Center Studio</span>
              </a>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('modal-alert-close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }

    // 3. Floating Notification Bell & Tray (Bottom-Right)
    if (!document.getElementById('prahari-floating-alert-bell')) {
      const bell = document.createElement('div');
      bell.id = 'prahari-floating-alert-bell';
      bell.title = 'Live Emergency Broadcasts';
      bell.innerHTML = `
        <span style="font-size: 20px;">🔔</span>
        <span id="prahari-bell-counter" class="prahari-bell-badge" style="display:none;">0</span>
      `;
      document.body.appendChild(bell);

      const tray = document.createElement('div');
      tray.id = 'prahari-alert-tray';
      tray.innerHTML = `
        <div class="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-white uppercase tracking-wider">Emergency Broadcasts</span>
            <span class="text-[9px] font-mono bg-red-950 text-red-400 px-1.5 py-0.2 rounded border border-red-800/50">FCM Live</span>
          </div>
          <button id="prahari-tray-close-btn" class="text-slate-400 hover:text-white text-xs p-1">✕</button>
        </div>
        <div id="prahari-tray-list" class="p-2.5 flex flex-col gap-1.5 overflow-y-auto max-h-[320px] text-xs">
          <p class="text-slate-500 text-center py-4 text-xs">Syncing emergency channel...</p>
        </div>
        <div class="p-2.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <a href="alert_center.html" class="text-cyan-400 hover:underline font-bold">Open Alert Center &rarr;</a>
          <span class="text-slate-500 font-mono text-[9px]">FastAPI 8000</span>
        </div>
      `;
      document.body.appendChild(tray);

      bell.addEventListener('click', () => {
        tray.style.display = tray.style.display === 'flex' ? 'none' : 'flex';
      });
      document.getElementById('prahari-tray-close-btn').addEventListener('click', () => {
        tray.style.display = 'none';
      });
    }
  }

  // Display alert in modal dialog (Only on user action)
  function showAlertModal(alert) {
    initDOM();
    const modal = document.getElementById('prahari-alert-modal-backdrop');
    if (!modal) return;

    const titleEl = document.getElementById('modal-alert-title');
    const bodyEl = document.getElementById('modal-alert-body');
    const regionEl = document.getElementById('modal-alert-region');
    const issuerEl = document.getElementById('modal-alert-issuer');
    const priorityEl = document.getElementById('modal-alert-priority');
    const timeEl = document.getElementById('modal-alert-time');
    const instructionsEl = document.getElementById('modal-alert-instructions');
    const badgeEl = document.getElementById('modal-alert-badge');

    if (titleEl) titleEl.textContent = alert.display_title || alert.title || 'EMERGENCY ADVISORY';
    if (bodyEl) bodyEl.textContent = alert.display_message || alert.message || '';
    if (regionEl) regionEl.textContent = alert.target_region || 'All Monitored Sectors';
    if (issuerEl) issuerEl.textContent = alert.created_by || 'PRAHARI Command State HQ';
    if (priorityEl) priorityEl.textContent = (alert.priority || 'MAXIMUM') + ' (Firebase Cloud Messaging)';
    if (timeEl) timeEl.textContent = alert.sent_at ? new Date(alert.sent_at).toLocaleTimeString() : 'Live Broadcast';
    if (badgeEl) badgeEl.textContent = `🚨 ${alert.severity || 'CRITICAL'} ALERT`;

    const instructions = Array.isArray(alert.safety_instructions) ? alert.safety_instructions : [
      'Avoid unstable slopes and water runoff channels.',
      'Follow official safety instructions from disaster response teams.',
      'Stay tuned to PRITHVI-SHIELD / PRAHARI Early Warning Platform.'
    ];

    if (instructionsEl) {
      instructionsEl.innerHTML = instructions.map(inst => `
        <div class="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-start gap-2">
          <span class="text-emerald-400 font-bold shrink-0">✓</span>
          <span>${inst}</span>
        </div>
      `).join('');
    }

    modal.style.display = 'flex';
  }

  // Update UI Elements
  function updateAlertUI(alerts) {
    initDOM();
    latestAlerts = alerts || [];

    const topBar = document.getElementById('prahari-top-emergency-bar');
    const bell = document.getElementById('prahari-floating-alert-bell');
    const counter = document.getElementById('prahari-bell-counter');
    const trayList = document.getElementById('prahari-tray-list');

    const activeAlerts = (alerts || []).filter(a => a.status !== 'DRAFT');

    if (activeAlerts.length === 0) {
      if (topBar) topBar.style.display = 'none';
      if (bell) bell.classList.remove('has-critical');
      if (counter) counter.style.display = 'none';
      return;
    }

    const latest = activeAlerts[0];
    const isCritical = latest.severity === 'CRITICAL' || latest.severity === 'HIGH';

    // Show Ribbon only if NOT dismissed for this session
    const isDismissed = sessionStorage.getItem('prahari_dismissed_ribbon_' + latest.id) === 'true';

    if (topBar) {
      if (!isDismissed) {
        topBar.style.display = 'flex';
        const sevEl = document.getElementById('prahari-ticker-severity');
        const regEl = document.getElementById('prahari-ticker-region');
        const msgEl = document.getElementById('prahari-ticker-msg');

        if (sevEl) sevEl.textContent = `${latest.severity} ALERT`;
        if (regEl) regEl.textContent = `📍 ${latest.target_region || 'ALL SECTORS'}`;
        if (msgEl) msgEl.textContent = `${latest.title} — ${latest.message}`;
      } else {
        topBar.style.display = 'none';
      }
    }

    // Bell updates
    if (bell) {
      if (isCritical) {
        bell.classList.add('has-critical');
      } else {
        bell.classList.remove('has-critical');
      }
    }

    if (counter) {
      counter.style.display = 'flex';
      counter.textContent = activeAlerts.length;
    }

    // Tray list updates
    if (trayList) {
      trayList.innerHTML = activeAlerts.map(a => {
        const isCrit = a.severity === 'CRITICAL';
        const isHigh = a.severity === 'HIGH';
        const sevColor = isCrit ? 'text-red-400 bg-red-950/80 border-red-800' :
                         isHigh ? 'text-orange-400 bg-orange-950/80 border-orange-800' :
                         'text-amber-400 bg-amber-950/80 border-amber-800';

        const timeStr = a.sent_at ? new Date(a.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent';

        return `
          <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex flex-col gap-1" onclick="window.prahariShowAlertModal('${a.id}')">
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${sevColor}">
                ${a.severity || 'ALERT'}
              </span>
              <span class="text-[10px] text-slate-500 font-mono">${timeStr}</span>
            </div>
            <h4 class="font-bold text-white text-xs leading-tight mt-0.5">${a.title}</h4>
            <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">${a.message}</p>
            <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 mt-0.5">
              <span>📍 ${a.target_region || 'All Sectors'}</span>
              <span class="text-cyan-400 font-bold">View Directive &rarr;</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Fetch Alerts from Backend
  async function syncAlertsFromBackend() {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/api/alerts`);
      if (res.ok) {
        const data = await res.json();
        const alerts = data.alerts || [];
        updateAlertUI(alerts);
      }
    } catch (e) {}
  }

  // Global helper
  window.prahariShowAlertModal = function (alertId) {
    const found = latestAlerts.find(a => a.id === alertId || a.alert_code === alertId);
    if (found) {
      showAlertModal(found);
    }
  };

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initDOM();
      syncAlertsFromBackend();
    });
  } else {
    initDOM();
    syncAlertsFromBackend();
  }

  setInterval(syncAlertsFromBackend, 6000);
})();
