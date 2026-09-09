/**
 * PRITHVI-SHIELD / PRAHARI (SIH 2026)
 * Citizen Mobile Application - Emergency Alert Details Screen
 */

import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

export function renderAlertDetailsView() {
  const alert = store.state.activeAlertDetails || {
    title: 'CRITICAL LANDSLIDE WARNING',
    display_title: 'CRITICAL LANDSLIDE WARNING',
    message: 'High landslide risk has been detected in your region. Please avoid unstable slopes and follow evacuation instructions.',
    display_message: 'High landslide risk has been detected in your region. Please avoid unstable slopes and follow evacuation instructions.',
    severity: 'CRITICAL',
    priority: 'Maximum',
    target_region: 'Kamrup / Guwahati Sector',
    created_by: 'PRAHARI-NER Disaster Management Authority',
    sent_at: '07 September 2026 | 06:30 PM',
    safety_instructions: [
      'Avoid unstable slopes and steep cut banks.',
      'Avoid travelling through active hill roads.',
      'Move towards designated safe shelters immediately.',
      'Follow official instructions from district emergency teams.',
      'Stay updated through PRITHVI-SHIELD live feed.'
    ]
  };

  const isCritical = alert.severity === 'CRITICAL';
  const isHigh = alert.severity === 'HIGH';

  const sevBg = isCritical ? 'bg-red-600 text-white' :
                isHigh ? 'bg-orange-600 text-white' : 'bg-amber-500 text-slate-950';

  const timeDisplay = alert.sent_at ? (
    alert.sent_at.indexOf('T') !== -1 ?
    new Date(alert.sent_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) :
    alert.sent_at
  ) : '07 September 2026 | 06:30 PM';

  const instructions = Array.isArray(alert.safety_instructions) ? alert.safety_instructions : [
    'Avoid unstable slopes.',
    'Avoid travelling through hill roads.',
    'Follow official instructions.',
    'Stay updated through PRITHVI-SHIELD.'
  ];

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-[100px] overflow-y-auto antialiased">
      ${renderTopBar('Emergency Alert Details', true, true)}

      <main class="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto w-full">
        
        <!-- Emergency Severity Header Card -->
        <div class="${sevBg} p-5 rounded-3xl shadow-xl flex flex-col gap-3 relative overflow-hidden">
          <div class="flex justify-between items-start">
            <span class="text-[11px] font-black uppercase tracking-widest bg-black/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
              🚨 ${alert.severity} ALERT
            </span>
            <span class="text-[10px] font-mono font-bold bg-black/20 px-2.5 py-0.5 rounded-full">
              FCM PRIORITY: ${alert.priority || 'MAXIMUM'}
            </span>
          </div>

          <div>
            <h2 class="text-2xl font-black tracking-tight leading-tight">${alert.display_title || alert.title}</h2>
            <p class="text-xs font-mono opacity-90 mt-1">Target Zone: ${alert.target_region || 'Affected Sector'}</p>
          </div>
        </div>

        <!-- Official Notice Body -->
        <div class="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col gap-4">
          <div class="flex flex-col gap-1 border-b border-outline-variant/40 pb-3">
            <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Official Advisory</span>
            <p class="text-sm font-bold text-on-surface leading-relaxed">${alert.display_message || alert.message}</p>
          </div>

          <!-- Metadata -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-bold text-on-surface-variant uppercase">Issued By:</span>
              <span class="font-black text-on-surface">${alert.created_by || 'PRAHARI-NER Disaster Authority'}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-bold text-on-surface-variant uppercase">Time:</span>
              <span class="font-black text-on-surface">${timeDisplay}</span>
            </div>
          </div>
        </div>

        <!-- Safety Instructions Checklist -->
        <div class="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col gap-3.5">
          <h3 class="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <span class="material-symbols-outlined text-amber-500 text-lg">shield</span>
            Mandatory Safety Instructions
          </h3>

          <div class="flex flex-col gap-2.5">
            ${instructions.map(item => `
              <div class="flex items-start gap-3 bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30">
                <span class="material-symbols-outlined text-emerald-500 text-base shrink-0 mt-0.5">check_circle</span>
                <span class="text-xs font-semibold text-on-surface leading-snug">${item}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-3 pt-2">
          <button 
            onclick="window.renderAppView('shelter')"
            class="w-full bg-primary hover:bg-primary/90 text-on-primary font-black text-sm py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-98"
          >
            <span class="material-symbols-outlined text-xl">holiday_village</span>
            <span>NAVIGATE TO NEAREST SHELTER</span>
          </button>

          <button 
            onclick="window.renderAppView('sos')"
            class="w-full bg-error hover:bg-error/90 text-on-error font-black text-sm py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-98"
          >
            <span class="material-symbols-outlined text-xl animate-spin">e911_emergency</span>
            <span>EMERGENCY SOS DISTRESS BEACON</span>
          </button>

          <button 
            onclick="window.renderAppView('alerts')"
            class="w-full bg-surface-container text-on-surface font-bold text-xs py-3 rounded-xl border border-outline-variant/40 flex items-center justify-center gap-1.5 transition"
          >
            <span class="material-symbols-outlined text-sm">arrow_back</span>
            <span>Return to All Broadcasts</span>
          </button>
        </div>

      </main>

      ${renderBottomNav('alerts')}
    </div>
  `;
}

export function bindAlertDetailsEvents(container) {
  bindNavigationEvents(container);
}
