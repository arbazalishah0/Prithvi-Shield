import { store } from '../store.js';
import { pwaManager } from '../services/pwaService.js';

export function renderPermissionSetupView() {
  const { currentUser } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-slate-950 text-white min-h-screen items-center justify-center p-5 antialiased overflow-y-auto">
      <main class="w-full max-w-md bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-800 flex flex-col gap-5 my-auto text-left">

        <!-- Header -->
        <div class="flex items-center gap-3 border-b border-slate-800 pb-4">
          <img src="/logo.jpg" alt="Logo" class="w-12 h-12 rounded-xl border border-cyan-400/30 object-contain shadow-md" onerror="this.src='/icons/icon-192.png'" />
          <div>
            <span class="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Authentication Successful</span>
            <h1 class="text-lg font-black text-white leading-tight">Setup Citizen Permissions</h1>
          </div>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed">
          Welcome, <strong>${currentUser.fullName || 'Citizen'}</strong>! Please grant required permissions so Prithvi Shield can protect you during disaster emergencies.
        </p>

        <!-- Permissions List -->
        <div class="flex flex-col gap-3">

          <!-- 1. Location Permission -->
          <div class="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-600/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-[20px]">my_location</span>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-white">Location Access</span>
                <button id="perm-btn-location" class="px-2.5 py-1 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-extrabold transition-all active:scale-95">
                  Allow Location
                </button>
              </div>
              <p class="text-[11px] text-slate-400 mt-1 leading-normal">
                Prithvi Shield uses your location to provide nearby landslide warnings, risk alerts, and emergency assistance.
              </p>
            </div>
          </div>

          <!-- 2. Notification Permission -->
          <div class="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-[20px]">notifications_active</span>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-white">Emergency Alerts</span>
                <button id="perm-btn-notifications" class="px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold transition-all active:scale-95">
                  Allow Alerts
                </button>
              </div>
              <p class="text-[11px] text-slate-400 mt-1 leading-normal">
                Receive real-time evacuation alerts, flash flood warnings, and emergency SOS broadcasts.
              </p>
            </div>
          </div>

          <!-- 3. Camera & Storage Permission -->
          <div class="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-[20px]">photo_camera</span>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-white">Camera & Evidence</span>
                <button id="perm-btn-camera" class="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-extrabold transition-all active:scale-95">
                  Allow Camera
                </button>
              </div>
              <p class="text-[11px] text-slate-400 mt-1 leading-normal">
                Capture live landslide photo evidence and upload hazard reports directly to the command center.
              </p>
            </div>
          </div>

          <!-- 4. Emergency Contact Input -->
          <div class="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex flex-col gap-2">
            <span class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">contact_emergency</span> Primary Emergency Contact (+91)
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <input id="setup-contact-name" class="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500" placeholder="Contact Name" value="${currentUser.emergencyContactName || 'Rahul Sharma'}" />
              <input id="setup-contact-phone" class="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-500" placeholder="+91 9876543210" value="${currentUser.emergencyContactPhone || '+91 9876543210'}" />
            </div>
          </div>
        </div>

        <!-- Finish Setup Button -->
        <button id="complete-setup-btn" class="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 mt-2">
          <span>Complete Setup & Enter Dashboard</span>
          <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </main>
    </div>
  `;
}

export function bindPermissionSetupEvents(container) {
  const locBtn = container.querySelector('#perm-btn-location');
  if (locBtn) {
    locBtn.addEventListener('click', () => {
      pwaManager.requestLocationPermission(() => {
        locBtn.textContent = '✓ Granted';
        locBtn.className = 'px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold';
      });
    });
  }

  const notifBtn = container.querySelector('#perm-btn-notifications');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      if ('Notification' in window) {
        Notification.requestPermission().then(() => {
          notifBtn.textContent = '✓ Granted';
          notifBtn.className = 'px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold';
        });
      } else {
        notifBtn.textContent = '✓ Granted';
        notifBtn.className = 'px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold';
      }
    });
  }

  const camBtn = container.querySelector('#perm-btn-camera');
  if (camBtn) {
    camBtn.addEventListener('click', async () => {
      const ok = await pwaManager.requestMicrophonePermission();
      camBtn.textContent = '✓ Granted';
      camBtn.className = 'px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold';
    });
  }

  const completeBtn = container.querySelector('#complete-setup-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      const cn = container.querySelector('#setup-contact-name')?.value;
      const cp = container.querySelector('#setup-contact-phone')?.value;

      if (cn) store.state.currentUser.emergencyContactName = cn;
      if (cp) store.state.currentUser.emergencyContactPhone = cp;

      store.completeOnboarding();
    });
  }
}
