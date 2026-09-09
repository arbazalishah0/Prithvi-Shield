import { store } from '../store.js';

export function renderTopBar(title = 'Prithvi Shield', showBack = false, showActions = true) {
  const { activeView } = store.state;

  return `
    <!-- Clean Professional Header with WindowInsets Status Bar Protection -->
    <header class="w-full bg-surface-container-lowest/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-outline-variant/40 px-4 py-3 pt-safe flex items-center justify-between sticky top-0 z-40 shadow-xs transition-all duration-200 select-none">
      <div class="flex items-center gap-3">
        ${showBack ? `
          <button id="nav-back-btn" class="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-primary dark:text-primary-fixed hover:bg-surface-container-high border border-outline-variant/50 transition-all active:scale-95 shadow-2xs cursor-pointer" aria-label="Go Back">
            <span class="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
        ` : ''}
        <div class="flex items-center gap-2.5">
          <div class="relative flex items-center justify-center shrink-0">
            <img src="/logo.jpg" alt="Prithvi Shield Logo" class="w-8 h-8 object-contain rounded-lg shadow-sm border border-primary/20" onerror="this.src='/icons/icon-192.png'" />
          </div>
          <div class="flex flex-col leading-tight">
            <h1 class="text-base font-extrabold tracking-tight text-primary dark:text-white flex items-center gap-1.5">
              ${title}
            </h1>
            <span class="text-[9px] font-bold text-on-surface-variant/70 dark:text-slate-400 tracking-wider uppercase">
              Official Safety Platform
            </span>
          </div>
        </div>
      </div>

      ${showActions ? `
        <div class="flex items-center gap-2">
          <button id="nav-voice-btn" class="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            activeView === 'voice-assistant'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/25 scale-105'
              : 'bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-200 hover:bg-surface-container-highest border border-outline-variant/40'
          }" title="AI Voice Assistant">
            <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">mic</span>
          </button>

          <button id="nav-circle-btn" class="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            activeView === 'circle' || activeView === 'circle-active'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/25 scale-105'
              : 'bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-200 hover:bg-surface-container-highest border border-outline-variant/40'
          }" title="Emergency Contacts">
            <span class="material-symbols-outlined text-[20px]">diversity_3</span>
          </button>
        </div>
      ` : `
        <div class="w-10"></div>
      `}
    </header>
  `;
}

export function renderBottomNav(activeTab = 'home') {
  // 5 primary navigation destinations (maximum 5 items per mobile standard)
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'map', label: 'Live Map', icon: 'map' },
    { id: 'report', label: 'Report', icon: 'add_circle' },
    { id: 'voice-assistant', label: 'AI Assistant', icon: 'mic' },
    { id: 'more', label: 'More', icon: 'grid_view' }
  ];

  return `
    <!-- INDEPENDENT FLOATING ACTION BUTTON: EMERGENCY SOS -->
    <!-- Positioned dynamically strictly above the bottom navigation bar and system insets -->
    <aside id="sos-fab-container" aria-label="Emergency Action">
      <button id="floating-sos-btn" aria-label="Emergency SOS - Trigger Immediate Distress Alert" class="sos-pulse cursor-pointer">
        SOS
      </button>
    </aside>

    <!-- INDEPENDENT BOTTOM NAVIGATION BAR -->
    <!-- 5 Equal Width Items, >=48dp touch targets, safe area inset padding -->
    <nav id="app-bottom-nav" aria-label="Primary Navigation">
      <div class="bottom-nav-row flex items-center justify-around h-[64px] px-2 w-full">
        ${tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return `
            <button 
              data-nav-target="${tab.id}" 
              class="bottom-nav-item flex-1 flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer ${
                isActive 
                  ? 'bg-primary-container/15 text-primary dark:text-primary-fixed shadow-2xs font-extrabold' 
                  : 'text-secondary dark:text-slate-400 hover:bg-surface-container-high/60 font-medium'
              }" 
              aria-current="${isActive ? 'page' : 'false'}"
              title="${tab.label}">
              <span class="material-symbols-outlined text-[22px] mb-0.5 leading-none ${isActive ? 'fill' : ''}">${tab.icon}</span>
              <span class="text-[11px] leading-tight tracking-tight text-center truncate max-w-full font-sans">${tab.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    </nav>
  `;
}

export function bindNavigationEvents(container) {
  // Back button
  const backBtn = container.querySelector('#nav-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => store.goBack());
  }

  // Header quick buttons
  const voiceBtn = container.querySelector('#nav-voice-btn');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => store.navigate('voice-assistant'));
  }
  const circleBtn = container.querySelector('#nav-circle-btn');
  if (circleBtn) {
    circleBtn.addEventListener('click', () => store.navigate('circle'));
  }

  // Floating SOS button - Trigger Immediate Distress Alert
  const sosBtn = container.querySelector('#floating-sos-btn');
  if (sosBtn) {
    sosBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      store.triggerSOS();
    });
  }

  // Bottom Navigation 5 tabs
  container.querySelectorAll('[data-nav-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav-target');
      if (target) store.navigate(target);
    });
  });
}
