import { store } from '../store.js';

export function renderTopControlBar() {
  const { activeView, deviceViewMode } = store.state;

  const screens = [
    { id: 'home', name: '1. Ground Intel Home' },
    { id: 'map', name: '2. Interactive Risk Map' },
    { id: 'report', name: '3. Report Hazard' },
    { id: 'ai-verify', name: '4. AI Hazard Verification' },
    { id: 'sos', name: '5. SOS Emergency HUD' },
    { id: 'circle', name: '6. Family Circle' },
    { id: 'circle-active', name: '7. Circle Active Confirmed' },
    { id: 'privacy-settings', name: '8. Location Privacy' },
    { id: 'voice-assistant', name: '9. AI Voice Assistant' },
    { id: 'twin', name: '10. Personal Safety Twin' },
    { id: 'more', name: '11. More Services & Hub' },
    { id: 'auth', name: '12. Login / Onboarding' }
  ];

  return `
    <div class="w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm z-50 shadow-md">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2 font-bold text-white tracking-wide">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-blue-400">SafeGround</span> <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-normal">Citizen Edition</span>
        </div>

        <div class="h-4 w-px bg-slate-700 hidden sm:block"></div>

        <!-- Quick Screen Selector -->
        <div class="flex items-center gap-1.5">
          <label for="screen-switcher" class="text-xs text-slate-400 font-medium">Screen Jump:</label>
          <select id="screen-switcher" class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
            ${screens.map(s => `
              <option value="${s.id}" ${activeView === s.id ? 'selected' : ''}>${s.name}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Simulate Hazard Alert Trigger -->
        <button id="demo-simulate-alert-btn" class="px-2.5 py-1 text-xs rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-colors flex items-center gap-1 font-medium">
          <span class="material-symbols-outlined text-[14px]">bolt</span>
          Simulate Hazard Alert
        </button>

        <!-- Viewport Mode Toggle -->
        <button id="toggle-viewport-mode-btn" class="px-3 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 font-medium">
          <span class="material-symbols-outlined text-[15px]">
            ${deviceViewMode === 'frame' ? 'fullscreen' : 'smartphone'}
          </span>
          <span>${deviceViewMode === 'frame' ? 'Fullscreen' : 'Mobile Frame'}</span>
        </button>
      </div>
    </div>
  `;
}

export function bindControlBarEvents(container) {
  const switcher = container.querySelector('#screen-switcher');
  if (switcher) {
    switcher.addEventListener('change', (e) => {
      store.navigate(e.target.value);
    });
  }

  const toggleModeBtn = container.querySelector('#toggle-viewport-mode-btn');
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', () => {
      store.toggleDeviceFrame();
    });
  }

  const alertSimBtn = container.querySelector('#demo-simulate-alert-btn');
  if (alertSimBtn) {
    alertSimBtn.addEventListener('click', () => {
      store.state.notifications.unshift({
        id: Date.now(),
        text: 'URGENT: Flash Flood Warning & Rockfall detected 800m upstream!',
        time: 'Just now',
        type: 'critical'
      });
      store.state.areaStatus = {
        level: 'HIGH RISK',
        title: 'HIGH RISK ACTIVE',
        subtitle: 'Severe rainfall and ground movement detected nearby.',
        bg: '#FF7043',
        border: '#D84315',
        textColor: '#FFFFFF',
        subTextColor: '#FFEBEE',
        icon: 'emergency'
      };
      store.navigate('home');
    });
  }
}
