/**
 * PRITHVI-SHIELD / PRAHARI (SIH 2026)
 * Citizen Mobile Application - Emergency Broadcasts & Alert History
 */

import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

export function renderAlertsView() {
  const { areaStatus } = store.state;
  const citizenAlerts = store.state.citizenAlerts || [
    {
      id: 'mock_1',
      title: 'CRITICAL LANDSLIDE WARNING',
      display_title: 'CRITICAL LANDSLIDE WARNING',
      message: 'High landslide risk detected near slopes due to torrential 145mm precipitation. Immediate evacuation advised.',
      display_message: 'High landslide risk detected near slopes due to torrential 145mm precipitation. Immediate evacuation advised.',
      severity: 'CRITICAL',
      priority: 'Maximum',
      target_region: 'Kamrup / Guwahati',
      created_by: 'PRAHARI Command State HQ',
      sent_at: 'Today • 06:30 PM',
      is_read: false,
      safety_instructions: [
        'Avoid unstable slope corridors.',
        'Move towards designated shelter immediately.',
        'Follow instructions from NDRF Battalion 1.'
      ]
    },
    {
      id: 'mock_2',
      title: 'HEAVY RAINFALL PRECAUTIONARY ADVISORY',
      display_title: 'HEAVY RAINFALL PRECAUTIONARY ADVISORY',
      message: 'Extreme precipitation predicted over hill roads. Avoid non-essential mountain transit.',
      display_message: 'Extreme precipitation predicted over hill roads. Avoid non-essential mountain transit.',
      severity: 'HIGH',
      priority: 'High',
      target_region: 'All Regions',
      created_by: 'State Disaster Management Authority',
      sent_at: 'Today • 10:00 AM',
      is_read: true,
      safety_instructions: [
        'Do not cross swollen river channels.',
        'Stay away from high-susceptibility hazard zones.'
      ]
    },
    {
      id: 'mock_3',
      title: 'WEATHER ADVISORY: MONSOON SURGE',
      display_title: 'WEATHER ADVISORY: MONSOON SURGE',
      message: 'Rainfall activity expected to increase over Western Ghats & Northeast corridors.',
      display_message: 'Rainfall activity expected to increase over Western Ghats & Northeast corridors.',
      severity: 'MODERATE',
      priority: 'Normal',
      target_region: 'All Regions',
      created_by: 'IMD & PRITHVI-SHIELD',
      sent_at: 'Yesterday • 08:30 PM',
      is_read: true,
      safety_instructions: [
        'Keep emergency supplies ready.'
      ]
    }
  ];

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-[100px] overflow-y-auto antialiased">
      ${renderTopBar('Emergency Alerts', true, true)}

      <main class="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto w-full">
        <!-- Header -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[24px]">notifications_active</span>
              Disaster Alerts &amp; Broadcasts
            </h2>
            <span class="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-300 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              FCM Live
            </span>
          </div>
          <p class="text-xs text-on-surface-variant">Official emergency push broadcasts from State Disaster Management Authority &amp; PRITHVI-SHIELD Command.</p>
        </div>

        <!-- Current Active Warning Banner -->
        <div class="p-4 rounded-2xl border shadow-md flex items-start gap-3.5" style="background-color: ${areaStatus.bg}; border-color: ${areaStatus.border}; color: ${areaStatus.textColor};">
          <span class="material-symbols-outlined text-[28px] shrink-0 mt-0.5" style="font-variation-settings: 'FILL' 1;">emergency</span>
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Current Active Advisory</span>
            <h3 class="text-lg font-black leading-tight">${areaStatus.title}</h3>
            <p class="text-xs font-medium leading-relaxed opacity-95">${areaStatus.subtitle}</p>
          </div>
        </div>

        <!-- Alerts Broadcast List -->
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider">Broadcast History</h3>
            <span class="text-[11px] font-mono text-on-surface-variant">${citizenAlerts.length} Messages Received</span>
          </div>

          <div class="flex flex-col gap-3">
            ${citizenAlerts.map(n => {
              const isCrit = n.severity === 'CRITICAL';
              const isHigh = n.severity === 'HIGH';
              const isMod = n.severity === 'MODERATE';

              const sevColor = isCrit ? 'bg-error' : isHigh ? 'bg-orange-500' : isMod ? 'bg-amber-500' : 'bg-emerald-500';
              const badgeClass = isCrit ? 'bg-error-container text-on-error-container' :
                                 isHigh ? 'bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-200' :
                                 isMod ? 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200' :
                                 'bg-secondary-container text-on-secondary-container';

              const timeStr = n.sent_at ? (
                n.sent_at.indexOf('T') !== -1 ?
                new Date(n.sent_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) :
                n.sent_at
              ) : 'Today';

              return `
                <div 
                  onclick="window.openEmergencyAlertDetail('${n.id}')"
                  class="bg-surface-container-lowest p-4 rounded-2xl border ${!n.is_read ? 'border-primary/80 shadow-md' : 'border-outline-variant/60 shadow-sm'} flex items-start gap-3.5 relative overflow-hidden transition-all hover:shadow-md cursor-pointer hover:border-primary"
                >
                  <div class="w-3 h-3 rounded-full ${sevColor} shrink-0 mt-1 ${isCrit ? 'animate-ping' : ''}"></div>

                  <div class="flex-1 flex flex-col gap-1.5">
                    <div class="flex justify-between items-center">
                      <span class="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                        <span>🕒 ${timeStr}</span>
                        ${!n.is_read ? '<span class="text-[9px] font-black text-primary uppercase bg-primary/10 px-1.5 py-0.2 rounded">NEW</span>' : ''}
                      </span>
                      <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badgeClass}">
                        ${n.severity || 'ALERT'}
                      </span>
                    </div>

                    <h4 class="text-xs font-black text-on-surface leading-snug">${n.display_title || n.title}</h4>
                    <p class="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">${n.display_message || n.message}</p>
                    
                    <div class="flex justify-between items-center text-[10px] font-mono text-on-surface-variant/80 border-t border-outline-variant/30 pt-1.5 mt-0.5">
                      <span>📍 ${n.target_region || 'Region'}</span>
                      <span class="text-primary font-bold flex items-center gap-0.5">View Notice &rarr;</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      </main>

      ${renderBottomNav('alerts')}
    </div>
  `;
}

export function bindAlertsEvents(container) {
  bindNavigationEvents(container);
}
