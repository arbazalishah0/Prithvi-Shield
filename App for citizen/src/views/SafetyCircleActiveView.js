import confetti from 'canvas-confetti';
import { store } from '../store.js';

export function renderSafetyCircleActiveView() {
  const { familyMembers } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen overflow-y-auto antialiased pb-nav-safe">
      <!-- Header with WindowInsets Protection -->
      <header class="bg-surface sticky top-0 z-40 flex justify-between items-center w-full px-4 h-14 pt-safe border-b border-outline-variant/60 shadow-sm">
        <button id="circle-active-back-btn" class="w-10 h-10 -ml-1 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-full transition-transform active:scale-95">
          <span class="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div class="flex-1 text-center font-bold text-primary text-lg">
          Circle Ready
        </div>
        <div class="w-10"></div>
      </header>

      <main class="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-xl mx-auto w-full gap-5">
        <!-- Success Pulse Indicator -->
        <div class="relative flex items-center justify-center my-2">
          <div class="absolute w-24 h-24 bg-primary-fixed-dim rounded-full pulse-ring-orb opacity-50"></div>
          <div class="w-16 h-16 bg-primary text-on-primary rounded-full flex items-center justify-center z-10 shadow-xl border-2 border-white">
            <span class="material-symbols-outlined text-[34px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          </div>
        </div>

        <div class="text-center flex flex-col gap-1.5">
          <h1 class="text-2xl font-extrabold text-primary tracking-tight">Safety Circle Active</h1>
          <p class="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
            Your family safety network is synchronized. Encrypted emergency relay & location heartbeats are running.
          </p>
        </div>

        <!-- Bento Grid for Network Status -->
        <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-1">
          <!-- Overall Status Card -->
          <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-sm col-span-1 md:col-span-2 relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <div class="flex justify-between items-center mb-2 pl-1">
              <h2 class="text-sm font-bold text-on-surface">Circle Network Status</h2>
              <span class="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span class="material-symbols-outlined text-[14px] animate-pulse">sensors</span> Connected
              </span>
            </div>
            <div class="grid grid-cols-2 gap-4 pl-1 mt-3 pt-3 border-t border-outline-variant/40">
              <div class="flex flex-col">
                <span class="text-[11px] font-bold text-on-surface-variant uppercase">Monitoring Sector</span>
                <span class="text-xs font-bold text-on-surface mt-0.5">Wayanad High Alert Sector</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] font-bold text-on-surface-variant uppercase">Circle Readiness</span>
                <span class="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span> 100% Operational
                </span>
              </div>
            </div>
          </div>

          <!-- Connected Members Cards -->
          ${familyMembers.map(member => `
            <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/70 shadow-sm flex flex-col justify-between">
              <div class="flex items-center gap-3 mb-2">
                ${member.avatar ? `
                  <img src="${member.avatar}" class="w-11 h-11 rounded-full object-cover border border-outline-variant shadow-sm" alt="${member.name}" />
                ` : `
                  <div class="w-11 h-11 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-sm">
                    ${member.initials}
                  </div>
                `}
                <div class="flex-1">
                  <h3 class="text-xs font-bold text-on-surface">${member.name}</h3>
                  <p class="text-[11px] text-on-surface-variant">Location: ${member.lastKnownLocation || 'Home'}</p>
                </div>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-outline-variant/40">
                <span class="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px] text-primary" style="font-variation-settings: 'FILL' 1;">location_on</span>
                  ${member.shareLocation ? 'Sharing Active' : 'SOS Only'}
                </span>
                <span class="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Action Area -->
        <div class="w-full flex flex-col gap-2.5 mt-auto pt-4">
          <button id="test-checkin-btn" class="w-full py-4 bg-primary text-on-primary rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-primary-fixed-variant transition-all shadow-md active:scale-98">
            <span class="material-symbols-outlined text-[20px]">network_ping</span>
            Send Test Safety Check-in Ping
          </button>
          
          <button id="goto-dashboard-btn" class="w-full py-3.5 bg-surface-container text-on-surface rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border border-outline-variant hover:bg-surface-container-high transition-colors active:scale-98">
            <span class="material-symbols-outlined text-[18px]">home</span>
            Return to Ground Intel Dashboard
          </button>
        </div>
      </main>
    </div>
  `;
}

export function bindSafetyCircleActiveEvents(container) {
  const backBtn = container.querySelector('#circle-active-back-btn');
  if (backBtn) backBtn.addEventListener('click', () => store.goBack());

  const dashBtn = container.querySelector('#goto-dashboard-btn');
  if (dashBtn) dashBtn.addEventListener('click', () => store.navigate('home'));

  const testBtn = container.querySelector('#test-checkin-btn');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {}

      testBtn.innerHTML = `
        <span class="material-symbols-outlined text-[20px] text-emerald-300">done_all</span>
        Check-in Delivered to ${store.state.familyMembers.length} Members!
      `;
      testBtn.classList.add('bg-emerald-700');

      setTimeout(() => {
        if (testBtn) {
          testBtn.innerHTML = `
            <span class="material-symbols-outlined text-[20px]">network_ping</span>
            Send Test Safety Check-in Ping
          `;
          testBtn.classList.remove('bg-emerald-700');
        }
      }, 3000);
    });
  }
}
