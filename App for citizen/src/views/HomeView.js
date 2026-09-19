import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';
import { locationService } from '../services/locationService.js';

export function renderHomeView() {
  const { areaStatus, currentLocation, hazards, notifications } = store.state;

  const coordsFormatted = locationService.formatCoordinates(currentLocation.lat, currentLocation.lng);
  const isAcquiring = currentLocation.status === 'ACQUIRING';
  const isPermissionDenied = currentLocation.status === 'PERMISSION_DENIED';
  const isServicesDisabled = currentLocation.status === 'SERVICES_DISABLED';
  const isUnavailable = currentLocation.status === 'UNAVAILABLE' || (!currentLocation.lat && !isAcquiring && !isPermissionDenied && !isServicesDisabled);
  const isSuccess = currentLocation.status === 'SUCCESS' && currentLocation.lat !== null && currentLocation.lng !== null;

  return `
    <div class="app-content flex-1 flex flex-col bg-surface text-on-surface min-h-screen pb-nav-safe overflow-y-auto">
      ${renderTopBar('Prithvi Shield', false, true)}

      <main class="px-4 pt-4 flex flex-col gap-5 max-w-xl mx-auto w-full">
        <!-- PRITHVI-SHIELD Hero Banner with Official Logo -->
        <section class="mt-1">
          <div class="relative rounded-[24px] p-5 bg-gradient-to-br from-[#090d16] via-[#0d1322] to-[#111827] text-white border border-cyan-500/30 shadow-xl overflow-hidden flex items-center gap-4">
            <div class="relative shrink-0">
              <div class="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-md animate-pulse"></div>
              <img src="/logo.jpg" alt="PRITHVI-SHIELD Logo" class="relative z-10 w-16 h-16 object-contain rounded-xl border border-cyan-400/40 shadow-lg" onerror="this.src='/icons/icon-192.png'" />
            </div>

            <div class="flex flex-col gap-1 z-10 flex-1">
              <span class="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                ACTIVE MONITORING MATRIX
              </span>
              <h2 class="text-xl font-black tracking-tight text-white leading-tight">PRITHVI-SHIELD</h2>
              <p class="text-[11px] font-medium text-slate-300 leading-snug">Protecting Today. Saving Tomorrow.</p>
            </div>
          </div>
        </section>

        <!-- Hero: Current Area Status (Bento Style) -->
        <section>
          <div class="relative rounded-[24px] p-6 overflow-hidden shadow-md border transition-all duration-300" style="background-color: ${areaStatus.bg}; border-color: ${areaStatus.border};">
            <!-- Status Bar Indicator -->
            <div class="absolute left-0 top-0 bottom-0 w-3" style="background-color: ${areaStatus.border};"></div>
            
            <div class="flex flex-col gap-2 pl-2 relative z-10">
              <div class="flex items-center gap-2" style="color: ${areaStatus.textColor}; opacity: 0.85;">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">${areaStatus.icon}</span>
                <span class="text-xs font-bold uppercase tracking-wider">Current Area Status</span>
              </div>
              <h2 class="text-3xl font-extrabold tracking-tight" style="color: ${areaStatus.textColor};">${areaStatus.title}</h2>
              <p class="text-sm font-medium leading-relaxed max-w-[280px]" style="color: ${areaStatus.subTextColor};">${areaStatus.subtitle}</p>
            </div>
            
            <!-- Decorative Graphic Background -->
            <div class="absolute right-[-15px] bottom-[-15px] opacity-20 pointer-events-none" style="color: ${areaStatus.textColor};">
              <span class="material-symbols-outlined text-[110px]">rainy</span>
            </div>
          </div>
        </section>

        <!-- Real Android GPS Device Location Section (No Fake Locations / No Embedded Map Image) -->
        <section>
          <div class="bg-surface-container-lowest rounded-[20px] p-4 shadow-sm border border-outline-variant/60 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">near_me</span>
                <span class="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">Device GPS Telemetry</span>
              </div>
              ${isSuccess ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live GPS
                </span>
              ` : isAcquiring ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin"></span>
                  Acquiring
                </span>
              ` : `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  <span class="material-symbols-outlined text-[12px]">error</span>
                  Unavailable
                </span>
              `}
            </div>

            ${isSuccess ? `
              <!-- SUCCESS STATE: REAL GPS COORDINATES -->
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 flex-1">
                  <div class="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">my_location</span>
                  </div>
                  <div class="flex flex-col">
                    <p class="text-base font-black text-on-surface leading-tight font-mono tracking-tight">${coordsFormatted.fullText}</p>
                    <p class="text-xs font-semibold text-primary mt-1 flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">location_on</span>
                      <span>${currentLocation.placeName}</span>
                    </p>
                    <div class="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant font-medium">
                      <span>Accuracy: ±${currentLocation.accuracy || 5}m</span>
                      ${currentLocation.elevation && currentLocation.elevation !== '--' ? `<span>• Elev: ${currentLocation.elevation}</span>` : ''}
                      ${currentLocation.soilMoisture && currentLocation.soilMoisture !== '--' ? `<span>• Soil: ${currentLocation.soilMoisture}</span>` : ''}
                    </div>
                  </div>
                </div>

                <button id="home-refresh-location-btn" title="Refresh GPS" class="p-2 rounded-xl border border-outline-variant/60 hover:bg-surface-container-high transition text-on-surface-variant shrink-0 cursor-pointer">
                  <span class="material-symbols-outlined text-[18px]">sync</span>
                </button>
              </div>

              <!-- Action CTA: Dedicated View Live Map Button -->
              <div class="pt-2 border-t border-outline-variant/40 flex items-center justify-between">
                <span class="text-xs text-on-surface-variant font-medium">Interactive hazard radar & shelters</span>
                <button id="home-open-map-btn" class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs shadow hover:bg-primary/90 active:scale-95 transition-all cursor-pointer">
                  <span class="material-symbols-outlined text-[16px]">map</span>
                  View Live Map
                </button>
              </div>
            ` : isAcquiring ? `
              <!-- ACQUIRING STATE -->
              <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0"></div>
                <div class="flex flex-col flex-1">
                  <span class="text-sm font-bold text-on-surface">Acquiring your location...</span>
                  <span class="text-xs text-on-surface-variant">Connecting to device GPS satellites</span>
                </div>
              </div>
            ` : isPermissionDenied ? `
              <!-- PERMISSION DENIED STATE -->
              <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                <div class="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  <span class="material-symbols-outlined text-[20px]">location_disabled</span>
                  <span>Location Permission Required</span>
                </div>
                <p class="text-xs text-on-surface-variant leading-relaxed">
                  Prithvi-Shield needs location access to alert you of localized landslide risks, calculate safe evacuation routes, and dispatch emergency SOS.
                </p>
                <div class="flex gap-2 mt-1">
                  <button id="home-enable-location-btn" class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition active:scale-95 flex items-center gap-1.5 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">verified_user</span>
                    Enable Location
                  </button>
                  <button id="home-open-map-btn" class="px-3 py-2 rounded-xl border border-outline-variant text-on-surface font-semibold text-xs hover:bg-surface-container-high transition cursor-pointer">
                    Open Map Anyway
                  </button>
                </div>
              </div>
            ` : isServicesDisabled ? `
              <!-- SERVICES DISABLED (GPS OFF) STATE -->
              <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-2">
                <div class="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                  <span class="material-symbols-outlined text-[20px]">location_off</span>
                  <span>Location Services Turned Off</span>
                </div>
                <p class="text-xs text-on-surface-variant leading-relaxed">
                  Your device GPS / Location Services appear to be turned off. Please enable GPS in device settings for accurate disaster alerts.
                </p>
                <div class="flex gap-2 mt-1">
                  <button id="home-retry-location-btn" class="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow transition active:scale-95 flex items-center gap-1.5 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">refresh</span>
                    Retry GPS Connection
                  </button>
                  <button id="home-open-map-btn" class="px-3 py-2 rounded-xl border border-outline-variant text-on-surface font-semibold text-xs hover:bg-surface-container-high transition cursor-pointer">
                    Open Map
                  </button>
                </div>
              </div>
            ` : `
              <!-- UNAVAILABLE / TIMEOUT STATE -->
              <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-2">
                <div class="flex items-center gap-2 text-on-surface font-bold text-sm">
                  <span class="material-symbols-outlined text-[20px] text-on-surface-variant">sync_problem</span>
                  <span>Unable to Acquire GPS Position</span>
                </div>
                <p class="text-xs text-on-surface-variant leading-relaxed">
                  ${currentLocation.error || 'Could not acquire satellite fix. Check your connection or move near an open sky.'}
                </p>
                <div class="flex gap-2 mt-1">
                  <button id="home-retry-location-btn" class="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow transition active:scale-95 flex items-center gap-1.5 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">refresh</span>
                    Retry Location
                  </button>
                  <button id="home-open-map-btn" class="px-3 py-2 rounded-xl border border-outline-variant text-on-surface font-semibold text-xs hover:bg-surface-container-high transition cursor-pointer">
                    Open Map
                  </button>
                </div>
              </div>
            `}
          </div>
        </section>

        <!-- Quick Actions Grid -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold text-on-surface">Quick Actions</h3>
            <span class="text-xs font-semibold text-primary">Emergency Ready</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <!-- Report Hazard Button -->
            <button id="quick-action-report" class="bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-150 p-4 rounded-[18px] flex flex-col items-start gap-3 border border-outline-variant/60 shadow-sm active:scale-98 text-left group">
              <div class="w-11 h-11 rounded-full bg-error-container text-on-error-container flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">report_problem</span>
              </div>
              <div>
                <span class="text-sm font-bold text-on-surface block">Report Hazard</span>
                <span class="text-xs text-on-surface-variant">Photo & AI validation</span>
              </div>
            </button>

            <!-- Find Nearest Shelter -->
            <button id="quick-action-shelter" class="bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-150 p-4 rounded-[18px] flex flex-col items-start gap-3 border border-outline-variant/60 shadow-sm active:scale-98 text-left group">
              <div class="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">home_pin</span>
              </div>
              <div>
                <span class="text-sm font-bold text-on-surface block">Nearest Shelter</span>
                <span class="text-xs text-on-surface-variant">1.2km East (Safe zone)</span>
              </div>
            </button>

            <!-- Safe Route Navigation -->
            <button id="quick-action-route" class="bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-150 p-4 rounded-[18px] flex flex-col items-start gap-3 border border-outline-variant/60 shadow-sm active:scale-98 text-left group">
              <div class="w-11 h-11 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">alt_route</span>
              </div>
              <div>
                <span class="text-sm font-bold text-on-surface block">Safe Route</span>
                <span class="text-xs text-on-surface-variant">AI Evacuation Path</span>
              </div>
            </button>

            <!-- Family Check-in -->
            <button id="quick-action-family" class="bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-150 p-4 rounded-[18px] flex flex-col items-start gap-3 border border-outline-variant/60 shadow-sm active:scale-98 text-left group">
              <div class="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">family_home</span>
              </div>
              <div>
                <span class="text-sm font-bold text-on-surface block">Family Circle</span>
                <span class="text-xs text-on-surface-variant">2 members active</span>
              </div>
            </button>
          </div>
        </section>

        <!-- Live Intel Feed -->
        <section class="mb-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-lg font-bold text-on-surface flex items-center gap-2">
              <span>Live Intel Feed</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </h3>
            <button id="home-view-map-link" class="text-primary font-bold text-xs hover:underline flex items-center gap-0.5">
              <span>View Map</span>
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>

          <div class="flex flex-col gap-3">
            ${hazards.slice(0, 3).map(h => `
              <div class="bg-surface-container-lowest p-4 rounded-[16px] shadow-sm border-l-4 ${
                h.severity === 'CRITICAL' ? 'border-l-error' : h.severity === 'HIGH' ? 'border-l-tertiary' : 'border-l-secondary'
              } border-t border-r border-b border-outline-variant/50 flex gap-3 items-start cursor-pointer hover:bg-surface-container-low transition-colors" data-hazard-item="${h.id}">
                <span class="material-symbols-outlined ${
                  h.severity === 'CRITICAL' ? 'text-error' : h.severity === 'HIGH' ? 'text-tertiary' : 'text-secondary'
                } mt-0.5" style="font-variation-settings: 'FILL' 1;">
                  ${h.category === 'Ground Crack' ? 'warning' : h.category === 'Soil Movement' ? 'landslide' : 'block'}
                </span>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <p class="text-[11px] font-bold text-on-surface-variant">${h.time} • ${h.distance}</p>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      h.severity === 'CRITICAL' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'
                    }">${h.severity}</span>
                  </div>
                  <p class="text-sm font-bold text-on-surface mt-0.5">${h.title}</p>
                  <p class="text-xs text-on-surface-variant line-clamp-1 mt-0.5">${h.description}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </main>

      <!-- Safety Modal (Triggered by Safety Protocol button) -->
      <div id="safety-protocol-modal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden items-center justify-center p-4">
        <div class="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
          <div class="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div class="flex items-center gap-2 text-primary font-bold text-lg">
              <span class="material-symbols-outlined text-[24px]">menu_book</span>
              Citizen Safety Instructions
            </div>
            <button id="close-safety-modal" class="text-on-surface-variant hover:text-on-surface p-1 rounded-full">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="flex flex-col gap-3 text-sm text-on-surface-variant">
            <div class="flex items-start gap-3 p-3 rounded-xl bg-error-container/20 border border-error-container/40">
              <span class="material-symbols-outlined text-error mt-0.5">warning</span>
              <p class="text-xs text-on-surface font-medium"><strong>Stay away from steep slopes & ravines:</strong> Saturated soil increases probability of sudden ground shifts.</p>
            </div>
            <div class="flex items-start gap-3 p-3 rounded-xl bg-primary-container/20 border border-primary-container/40">
              <span class="material-symbols-outlined text-primary mt-0.5">battery_charging_full</span>
              <p class="text-xs text-on-surface font-medium"><strong>Preserve phone battery:</strong> Switch to Low Power Mode. SafeGround automatically saves emergency packets offline.</p>
            </div>
            <div class="flex items-start gap-3 p-3 rounded-xl bg-secondary-container/30 border border-secondary-container/50">
              <span class="material-symbols-outlined text-secondary mt-0.5">home_pin</span>
              <p class="text-xs text-on-surface font-medium"><strong>Know your nearest shelter:</strong> The Central Civic Shelter is open and equipped with emergency generators.</p>
            </div>
          </div>
          <button id="safety-modal-ok-btn" class="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm shadow-md hover:bg-primary-fixed-variant transition-colors">
            Understood
          </button>
        </div>
      </div>

      ${renderBottomNav('home')}
    </div>
  `;
}

export function bindHomeEvents(container) {
  bindNavigationEvents(container);

  // Quick Action Buttons
  const reportBtn = container.querySelector('#quick-action-report');
  if (reportBtn) reportBtn.addEventListener('click', () => store.navigate('report'));

  const shelterBtn = container.querySelector('#quick-action-shelter');
  if (shelterBtn) shelterBtn.addEventListener('click', () => store.navigate('shelters'));

  const routeBtn = container.querySelector('#quick-action-route');
  if (routeBtn) routeBtn.addEventListener('click', () => store.navigate('safe-route'));

  const familyBtn = container.querySelector('#quick-action-family');
  if (familyBtn) familyBtn.addEventListener('click', () => store.navigate('circle'));

  const mapPreviewBtn = container.querySelector('#home-open-map-btn');
  if (mapPreviewBtn) mapPreviewBtn.addEventListener('click', () => store.navigate('map'));

  const viewMapLink = container.querySelector('#home-view-map-link');
  if (viewMapLink) viewMapLink.addEventListener('click', () => store.navigate('map'));

  // Location Actions
  const enableLocationBtn = container.querySelector('#home-enable-location-btn');
  if (enableLocationBtn) {
    enableLocationBtn.addEventListener('click', async () => {
      enableLocationBtn.disabled = true;
      enableLocationBtn.textContent = 'Requesting...';
      await store.requestAndEnableLocation();
    });
  }

  const retryLocationBtn = container.querySelector('#home-retry-location-btn');
  if (retryLocationBtn) {
    retryLocationBtn.addEventListener('click', async () => {
      retryLocationBtn.disabled = true;
      retryLocationBtn.textContent = 'Retrying...';
      await store.refreshLocation();
    });
  }

  const refreshLocationBtn = container.querySelector('#home-refresh-location-btn');
  if (refreshLocationBtn) {
    refreshLocationBtn.addEventListener('click', async () => {
      refreshLocationBtn.classList.add('animate-spin');
      await store.refreshLocation();
      refreshLocationBtn.classList.remove('animate-spin');
    });
  }

  // Safety Protocol Modal
  const guideBtn = container.querySelector('#quick-action-guide');
  const modal = container.querySelector('#safety-protocol-modal');
  const closeModal = container.querySelector('#close-safety-modal');
  const modalOk = container.querySelector('#safety-modal-ok-btn');

  if (guideBtn && modal) {
    guideBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  }
  const hideModal = () => {
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  };
  if (closeModal) closeModal.addEventListener('click', hideModal);
  if (modalOk) modalOk.addEventListener('click', hideModal);

  // Hazard list items click
  container.querySelectorAll('[data-hazard-item]').forEach(el => {
    el.addEventListener('click', () => store.navigate('map'));
  });
}
