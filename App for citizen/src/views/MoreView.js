import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

export function renderMoreView() {
  const { currentUser, currentLocation } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-nav-safe overflow-y-auto">
      ${renderTopBar('Safety Hub & Services', false, false)}

      <main class="px-4 py-4 flex flex-col gap-5 max-w-xl mx-auto w-full">
        <!-- Citizen Profile Quick Banner -->
        <div class="p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20">
              ${currentUser?.fullName ? currentUser.fullName.charAt(0) : 'U'}
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-extrabold text-on-surface">${currentUser?.fullName || 'Verified Citizen'}</span>
              <span class="text-xs text-on-surface-variant font-mono">${currentUser?.mobileNumber || '+91 9876543210'}</span>
              <span class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                <span class="w-1.5 h-1.5 rounded-full ${currentLocation?.lat ? 'bg-emerald-500' : 'bg-amber-500'}"></span> ${currentLocation?.lat ? `Live GPS: ${currentLocation.lat.toFixed(4)}°, ${currentLocation.lng.toFixed(4)}°` : 'Locating GPS...'}
              </span>
            </div>
          </div>
          <button id="more-profile-btn" class="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary text-xs font-bold transition-all active:scale-95 border border-outline-variant/40">
            Edit
          </button>
        </div>

        <!-- Section 1: Advanced Hazard Intelligence & Twin -->
        <section class="flex flex-col gap-2.5">
          <h2 class="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant/90 px-1">
            Hazard Intelligence & AI Tools
          </h2>

          <div class="grid grid-cols-1 gap-2.5">
            <!-- Digital Twin -->
            <button data-more-nav="twin" class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 shadow-2xs transition-all active:scale-98 text-left w-full group">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[24px]">monitoring</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-on-surface">3D Geological Digital Twin</span>
                  <span class="text-xs text-on-surface-variant">Real-time terrain slope, soil moisture & GIS telemetry</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </button>

            <!-- AI Verification Scanner -->
            <button data-more-nav="ai-verify" class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 shadow-2xs transition-all active:scale-98 text-left w-full group">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[24px]">document_scanner</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-on-surface">AI Forensic Verification</span>
                  <span class="text-xs text-on-surface-variant">Deepfake scanner & ground sensor correlation</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </button>
          </div>
        </section>

        <!-- Section 2: Contacts & Safety Circle -->
        <section class="flex flex-col gap-2.5">
          <h2 class="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant/90 px-1">
            Emergency Contacts & Circle
          </h2>

          <div class="grid grid-cols-1 gap-2.5">
            <!-- Contacts -->
            <button data-more-nav="circle" class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 shadow-2xs transition-all active:scale-98 text-left w-full group">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[24px]">diversity_3</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-on-surface">Emergency Contacts</span>
                  <span class="text-xs text-on-surface-variant">Manage SMS broadcast recipients and priority guardians</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </button>

            <!-- Family Circle Status -->
            <button data-more-nav="circle-active" class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 shadow-2xs transition-all active:scale-98 text-left w-full group">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[24px]">family_restroom</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-on-surface">Family Circle Active Radar</span>
                  <span class="text-xs text-on-surface-variant">Live family safety check-ins and shared battery levels</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </button>
          </div>
        </section>

        <!-- Section 3: Safe Evacuation & Shelters -->
        <section class="flex flex-col gap-2.5">
          <h2 class="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant/90 px-1">
            Evacuation & Relief
          </h2>

          <div class="grid grid-cols-1 gap-2.5">
            <!-- Safe Route -->
            <button data-more-nav="safe-route" class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 shadow-2xs transition-all active:scale-98 text-left w-full group">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[24px]">alt_route</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-on-surface">Safe Evacuation Route</span>
                  <span class="text-xs text-on-surface-variant">Hazard-avoiding turn-by-turn evacuation pathfinder</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </button>

            <!-- Shelters -->
            <button data-more-nav="shelters" class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 shadow-2xs transition-all active:scale-98 text-left w-full group">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[24px]">night_shelter</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-on-surface">Nearest Relief Shelters</span>
                  <span class="text-xs text-on-surface-variant">Live bed capacity, food stocks & emergency camps</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </button>
          </div>
        </section>

        <!-- Section 4: Privacy & Settings -->
        <section class="flex flex-col gap-2.5">
          <h2 class="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant/90 px-1">
            Privacy & Settings
          </h2>

          <div class="grid grid-cols-1 gap-2.5">
            <!-- Privacy Settings -->
            <button data-more-nav="privacy-settings" class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 shadow-2xs transition-all active:scale-98 text-left w-full group">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[24px]">shield</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-on-surface">Location & Data Privacy</span>
                  <span class="text-xs text-on-surface-variant">Zero-knowledge encryption & SOS-only telemetry sharing</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </button>

            <!-- Citizen Profile -->
            <button data-more-nav="profile" class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/60 shadow-2xs transition-all active:scale-98 text-left w-full group">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[24px]">manage_accounts</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-on-surface">Citizen Profile & Medical Info</span>
                  <span class="text-xs text-on-surface-variant">Blood group, allergies, disability aid & language</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-outline-variant text-[20px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </button>
          </div>
        </section>

        <!-- System Architecture Footnote -->
        <div class="p-3 rounded-2xl bg-surface-container-low text-on-surface-variant text-[11px] flex flex-col gap-1 border border-outline-variant/40">
          <div class="flex items-center justify-between font-bold">
            <span class="flex items-center gap-1 text-primary">
              <span class="material-symbols-outlined text-[14px]">verified</span> PRITHVI-SHIELD v2.4 (Citizen Native)
            </span>
            <span class="text-emerald-600">NDRF Linked</span>
          </div>
          <p class="leading-relaxed">
            Centralized telemetry, automated edge-mesh routing, and zero-knowledge privacy active.
          </p>
        </div>
      </main>

      ${renderBottomNav('more')}
    </div>
  `;
}

export function bindMoreEvents(container) {
  bindNavigationEvents(container);

  // Profile quick button
  const profileBtn = container.querySelector('#more-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => store.navigate('profile'));
  }

  // Navigation handlers for More menu items
  container.querySelectorAll('[data-more-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-more-nav');
      if (target) {
        store.navigate(target);
      }
    });
  });
}
