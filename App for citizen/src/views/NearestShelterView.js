import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

export function renderNearestShelterView() {
  const { shelters, currentLocation } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-nav-safe overflow-y-auto antialiased">
      ${renderTopBar('Nearest Emergency Shelters', true, true)}

      <main class="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto w-full">
        <!-- Header Info -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[24px]">home_pin</span>
              Emergency Shelters & Relief Camps
            </h2>
            <span class="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Open 24/7
            </span>
          </div>
          <p class="text-xs text-on-surface-variant">Verified civic havens equipped with medical staff, food supplies, and power backup.</p>
        </div>

        <!-- Filter Chips -->
        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button class="shelter-chip active shrink-0 px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-sm">All Shelters (${shelters.length})</button>
          <button class="shelter-chip shrink-0 px-3.5 py-1.5 rounded-full bg-surface-container-lowest text-on-surface text-xs font-semibold border border-outline-variant/60">Medical Stations</button>
          <button class="shelter-chip shrink-0 px-3.5 py-1.5 rounded-full bg-surface-container-lowest text-on-surface text-xs font-semibold border border-outline-variant/60">High Capacity</button>
        </div>

        <!-- Shelter Directory List -->
        <section class="flex flex-col gap-4">
          ${shelters.map((shelter, idx) => `
            <div class="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden transition-all hover:shadow-md">
              <div class="absolute left-0 top-0 bottom-0 w-1.5 ${idx === 0 ? 'bg-emerald-500' : 'bg-primary'}"></div>

              <!-- Title & Capacity -->
              <div class="flex justify-between items-start pl-1">
                <div>
                  <h3 class="text-sm font-extrabold text-on-surface leading-tight">${shelter.name}</h3>
                  <span class="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <span class="material-symbols-outlined text-[14px] text-primary">near_me</span>
                    ${shelter.distance} • ${shelter.type || 'Civic Relief Center'}
                  </span>
                </div>
                <span class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 shrink-0">
                  ${shelter.capacity || '85% Available'}
                </span>
              </div>

              <!-- Available Facilities Badges -->
              <div class="pl-1 flex flex-wrap gap-1.5 text-[10px] font-semibold text-on-surface-variant">
                <span class="bg-surface-container-low px-2 py-0.5 rounded-md border border-outline-variant/40 flex items-center gap-1">
                  🏥 Medical Clinic
                </span>
                <span class="bg-surface-container-low px-2 py-0.5 rounded-md border border-outline-variant/40 flex items-center gap-1">
                  🍲 Free Meals
                </span>
                <span class="bg-surface-container-low px-2 py-0.5 rounded-md border border-outline-variant/40 flex items-center gap-1">
                  ⚡ Power Backup
                </span>
                <span class="bg-surface-container-low px-2 py-0.5 rounded-md border border-outline-variant/40 flex items-center gap-1">
                  🛏️ Bedding
                </span>
              </div>

              <!-- Contact & Actions Row -->
              <div class="pl-1 border-t border-outline-variant/40 pt-3 flex flex-col gap-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="font-bold text-on-surface flex items-center gap-1">
                    <span class="material-symbols-outlined text-primary text-[16px]">call</span>
                    Helpline:
                  </span>
                  <a href="tel:${shelter.phone || '+919876543210'}" class="font-mono font-extrabold text-primary hover:underline">
                    ${shelter.phone || '+91 9876543210'}
                  </a>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-1">
                  <button data-navigate-shelter="${shelter.id}" class="py-2.5 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-sm hover:bg-primary-container transition-colors flex items-center justify-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">alt_route</span>
                    <span>Safe Route</span>
                  </button>

                  <a href="https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${shelter.lat},${shelter.lng}&travelmode=driving" target="_blank" class="py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 no-underline text-center">
                    <span class="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Google Maps</span>
                  </a>
                </div>
              </div>
            </div>
          `).join('')}
        </section>
      </main>

      ${renderBottomNav('more')}
    </div>
  `;
}

export function bindNearestShelterEvents(container) {
  bindNavigationEvents(container);

  container.querySelectorAll('[data-navigate-shelter]').forEach(btn => {
    btn.addEventListener('click', () => {
      store.navigate('safe-route');
    });
  });
}
