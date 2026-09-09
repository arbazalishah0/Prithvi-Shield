import { store } from '../store.js';

let activeSlide = 0;

export function renderOnboardingView() {
  const slides = [
    {
      icon: 'radar',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      title: 'EARLY WARNING SYSTEM',
      subtitle: 'Real-time Landslide Risk Telemetry',
      description: 'Receive instant AI-powered alerts and satellite sensor notifications before ground movement occurs in your sector.'
    },
    {
      icon: 'add_a_photo',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      title: 'REPORT HAZARDS',
      subtitle: 'Citizen Photo & Evidence Capture',
      description: 'Report road cracks, soil shifts, water seepage, or rockfalls directly to emergency dispatchers with auto GPS location.'
    },
    {
      icon: 'emergency',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      title: 'EMERGENCY SUPPORT',
      subtitle: 'Shelters, Safe Routes & SOS',
      description: 'Access 24/7 emergency shelters, AI-calculated evacuation routes clear of hazard zones, and 1-tap SOS rescue signal.'
    }
  ];

  const current = slides[activeSlide];

  return `
    <div class="flex-1 flex flex-col bg-slate-950 text-white min-h-screen items-center justify-between p-6 antialiased select-none">

      <!-- Top Branding Header -->
      <div class="w-full flex items-center justify-between pt-safe">
        <div class="flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" class="w-8 h-8 rounded-lg border border-cyan-400/30 object-contain shadow-sm" onerror="this.src='/icons/icon-192.png'" />
          <span class="text-sm font-extrabold tracking-tight text-white">PRITHVI-SHIELD</span>
        </div>
        <button id="onboarding-skip-btn" class="text-xs font-bold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
          Skip
        </button>
      </div>

      <!-- Slide Card Content -->
      <div class="w-full max-w-sm my-auto flex flex-col items-center text-center gap-6 py-6 animate-in fade-in duration-300">
        <!-- Visual Icon Orb -->
        <div class="relative flex items-center justify-center">
          <div class="absolute w-36 h-36 rounded-full ${current.bgColor} animate-ping opacity-50"></div>
          <div class="w-24 h-24 rounded-3xl ${current.bgColor} ${current.color} border ${current.borderColor} flex items-center justify-center shadow-2xl backdrop-blur-md">
            <span class="material-symbols-outlined text-[48px]">${current.icon}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">${current.subtitle}</span>
          <h2 class="text-2xl font-black text-white tracking-tight leading-tight">${current.title}</h2>
          <p class="text-xs text-slate-300 leading-relaxed max-w-[280px] mx-auto mt-1">
            ${current.description}
          </p>
        </div>

        <!-- Slide Indicators -->
        <div class="flex items-center gap-2 mt-2">
          ${slides.map((_, i) => `
            <div class="h-2 rounded-full transition-all duration-300 ${
              i === activeSlide ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-800'
            }"></div>
          `).join('')}
        </div>
      </div>

      <!-- Bottom Next / Get Started Action -->
      <div class="w-full max-w-sm pb-safe flex flex-col gap-3">
        <button id="onboarding-next-btn" class="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2">
          <span>${activeSlide === slides.length - 1 ? 'GET STARTED' : 'CONTINUE'}</span>
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  `;
}

export function bindOnboardingEvents(container) {
  const skipBtn = container.querySelector('#onboarding-skip-btn');
  const nextBtn = container.querySelector('#onboarding-next-btn');

  const completeOnboarding = () => {
    localStorage.setItem('prithvi_shield_onboarding', 'true');
    store.state.isOnboardingCompleted = true;
    store.navigate('auth');
  };

  if (skipBtn) skipBtn.addEventListener('click', completeOnboarding);

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (activeSlide < 2) {
        activeSlide++;
        store.notify();
      } else {
        completeOnboarding();
      }
    });
  }
}
