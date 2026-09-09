import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

export function renderHomeView() {
  const { areaStatus, currentLocation, hazards, notifications } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-surface text-on-surface min-h-screen pb-nav-safe overflow-y-auto">
      ${renderTopBar('Prithvi Shield', false, true)}

      <main class="px-4 pt-4 flex flex-col gap-5 max-w-xl mx-auto w-full">
        <!-- PRITHVI-SHIELD Hero Banner with Official Logo -->
        <section class="mt-1">
          <div class="relative rounded-[24px] p-5 bg-gradient-to-br from-[#090d16] via-[#0d1322] to-[#111827] text-white border border-cyan-500/30 shadow-xl overflow-hidden flex items-center gap-4">
            <div class="relative shrink-0">
              <div class="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-md animate-pulse"></div>
              <img src="/logo.jpg" alt="PRITHVI-SHIELD Logo" class="relative z-10 w-16 h-16 object-contain rounded-xl border border-cyan-400/40 shadow-lg" />
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

        <!-- Current Location Section -->
        <section>
          <div class="bg-surface-container-lowest rounded-[20px] p-4 shadow-sm border border-outline-variant/60 flex items-center justify-between gap-3">
            <div class="flex items-start gap-3 flex-1">
              <div class="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">my_location</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Your Live Coordinates</span>
                <p class="text-base font-bold text-on-surface leading-tight mt-0.5">${currentLocation.lat.toFixed(4)}° N, ${Math.abs(currentLocation.lng).toFixed(4)}° W</p>
                <div class="flex items-center gap-1.5 text-primary text-xs mt-1">
                  <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span class="font-semibold">${currentLocation.placeName} • ±${currentLocation.accuracy}m</span>
                </div>
              </div>
            </div>

            <!-- Mini Map Preview Button -->
            <button id="home-open-map-btn" class="relative group shrink-0 rounded-xl overflow-hidden border border-outline-variant hover:ring-2 hover:ring-primary transition-all">
              <img class="w-[72px] h-[72px] object-cover group-hover:scale-105 transition-transform" 
                   src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbUb7cZhLo-RSn8pI5WSlRLmUkKEJ-SzO2phgaktqvlW2lA-hB1ro4jfD9uFRWxPTxmin5Lpem-XC0kkiCWOvJcCI4iaqj6TH_PGVEyews9dNlB6gTlfqH7de3ZY02P1xpj7xGyPHdQgL7xqzqEqsQaJ8zP5HxyChreFviwKc3vFOLfbP0Eh3LbpeD_qsUOiUP9PO0w7FyKQZ7c83uOj0asn-C2w0b4IF3N7GY7imTMoZ8PlzFXcbDeQ" 
                   alt="Mini Map" />
              <div class="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <span class="material-symbols-outlined text-white text-[20px] drop-shadow">open_in_new</span>
              </div>
            </button>
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
