import { pwaManager } from '../services/pwaService.js';
import { store } from '../store.js';

export function renderGlobalOverlays() {
  const { isOnline } = store.state;
  const isInstallable = pwaManager.isInstallable && !pwaManager.isStandalone() && !pwaManager.isDismissed();

  return `
    <!-- Offline Connectivity Banner -->
    ${!isOnline ? `
      <div id="global-offline-banner" class="w-full bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md border-b border-amber-600 z-50 sticky top-0">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">wifi_off</span>
          <span><strong>Offline Mode Active:</strong> Emergency maps & local hazards active. Sync resumes on reconnect.</span>
        </div>
        <span class="text-[10px] bg-amber-950/20 px-2 py-0.5 rounded-full uppercase font-extrabold tracking-wider shrink-0">Cached Shell</span>
      </div>
    ` : ''}

    <!-- PWA Install Banner (When Installable) -->
    ${isInstallable ? `
      <div id="pwa-install-banner" class="mx-3 my-2 p-3 bg-slate-900 text-white rounded-2xl shadow-xl border border-blue-500/30 flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[22px]">install_mobile</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold text-white truncate">Install PRITHVI-SHIELD</span>
            <span class="text-[11px] text-slate-300 truncate">Faster access & offline hazards on phone</span>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button id="pwa-banner-install-btn" class="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 active:scale-95 transition-transform">
            <span>Install</span>
          </button>
          <button id="pwa-banner-dismiss-btn" class="p-1 rounded-full text-slate-400 hover:text-white transition-colors" title="Dismiss for 7 days">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    ` : ''}

    <!-- iOS Installation Guide Modal -->
    <div id="ios-install-modal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4">
      <div class="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b border-outline-variant/60 pb-3">
          <div class="flex items-center gap-2 text-primary font-bold text-base">
            <span class="material-symbols-outlined text-[22px]">phone_iphone</span>
            Install on iPhone / iPad
          </div>
          <button id="close-ios-modal" class="text-on-surface-variant hover:text-on-surface p-1 rounded-full">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p class="text-xs text-on-surface-variant leading-relaxed">
          To install <strong>PRITHVI-SHIELD</strong> as a native app on iOS:
        </p>

        <div class="flex flex-col gap-2.5 text-xs text-on-surface font-medium">
          <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
            <span class="w-6 h-6 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center shrink-0">1</span>
            <span>Tap the <strong>Share</strong> button <span class="material-symbols-outlined text-[16px] inline-block align-middle text-primary">share</span> in Safari's bottom bar.</span>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
            <span class="w-6 h-6 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center shrink-0">2</span>
            <span>Scroll and select <strong>Add to Home Screen</strong> <span class="material-symbols-outlined text-[16px] inline-block align-middle text-primary">add_box</span>.</span>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
            <span class="w-6 h-6 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center shrink-0">3</span>
            <span>Tap <strong>Add</strong> in the top right corner.</span>
          </div>
        </div>

        <button id="ios-modal-ok-btn" class="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-xs shadow-md">
          Understood
        </button>
      </div>
    </div>

    <!-- Universal Permissions Pre-Prompt Modal -->
    <div id="permissions-modal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4">
      <div class="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div class="flex items-center gap-3 border-b border-outline-variant/60 pb-3">
          <div id="perm-modal-icon-box" class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
            <span id="perm-modal-icon" class="material-symbols-outlined text-[24px]">my_location</span>
          </div>
          <div>
            <h3 id="perm-modal-title" class="text-base font-bold text-on-surface">Permission Required</h3>
            <span class="text-[11px] font-semibold text-primary">PRITHVI-SHIELD Citizen Platform</span>
          </div>
        </div>

        <p id="perm-modal-desc" class="text-xs text-on-surface-variant leading-relaxed">
          Permission description...
        </p>

        <div class="flex gap-2.5 mt-2">
          <button id="perm-modal-cancel-btn" class="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-xs hover:bg-surface-container-high transition-colors">
            Not Now
          </button>
          <button id="perm-modal-allow-btn" class="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5">
            <span>Allow Access</span>
            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

let activePermissionType = null;
let activePermissionCallback = null;

export function triggerPermissionPrompt(type, onGranted = null) {
  const modal = document.querySelector('#permissions-modal');
  if (!modal) return;

  activePermissionType = type;
  activePermissionCallback = onGranted;

  const icon = modal.querySelector('#perm-modal-icon');
  const title = modal.querySelector('#perm-modal-title');
  const desc = modal.querySelector('#perm-modal-desc');

  if (type === 'location') {
    if (icon) icon.textContent = 'my_location';
    if (title) title.textContent = 'GPS Location Permission Required';
    if (desc) desc.textContent = 'PRITHVI-SHIELD uses high-precision GPS to map live landslide risks in your immediate sector, calculate evacuation routes to nearest shelters, and transmit emergency rescue coordinates.';
  } else if (type === 'microphone') {
    if (icon) icon.textContent = 'mic';
    if (title) title.textContent = 'Microphone Access Required';
    if (desc) desc.textContent = 'Microphone access is required for the AI Voice Assistant (supporting 11 regional languages) and for recording voice evidence during hazard reporting.';
  } else if (type === 'storage') {
    if (icon) icon.textContent = 'save';
    if (title) title.textContent = 'Offline Storage Permission';
    if (desc) desc.textContent = 'Persistent storage access enables PRITHVI-SHIELD to cache emergency maps, shelter directories, and offline reports so they remain available when cell service is down.';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function bindGlobalOverlayEvents(container) {
  // PWA Install Banner Button
  const pwaInstallBtn = container.querySelector('#pwa-banner-install-btn');
  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      const res = await pwaManager.installApp();
      if (res === 'IOS_INSTRUCTIONS') {
        const iosModal = container.querySelector('#ios-install-modal');
        if (iosModal) {
          iosModal.classList.remove('hidden');
          iosModal.classList.add('flex');
        }
      }
    });
  }

  // PWA Dismiss Button
  const pwaDismissBtn = container.querySelector('#pwa-banner-dismiss-btn');
  if (pwaDismissBtn) {
    pwaDismissBtn.addEventListener('click', () => {
      pwaManager.dismissInstall();
    });
  }

  // iOS Modal Close
  const iosModal = container.querySelector('#ios-install-modal');
  const closeIos = container.querySelector('#close-ios-modal');
  const iosOk = container.querySelector('#ios-modal-ok-btn');
  const hideIosModal = () => {
    if (iosModal) {
      iosModal.classList.add('hidden');
      iosModal.classList.remove('flex');
    }
  };
  if (closeIos) closeIos.addEventListener('click', hideIosModal);
  if (iosOk) iosOk.addEventListener('click', hideIosModal);

  // Permissions Modal Controls
  const permModal = container.querySelector('#permissions-modal');
  const permCancel = container.querySelector('#perm-modal-cancel-btn');
  const permAllow = container.querySelector('#perm-modal-allow-btn');

  const hidePermModal = () => {
    if (permModal) {
      permModal.classList.add('hidden');
      permModal.classList.remove('flex');
    }
  };

  if (permCancel) permCancel.addEventListener('click', hidePermModal);

  if (permAllow) {
    permAllow.addEventListener('click', async () => {
      hidePermModal();
      if (activePermissionType === 'location') {
        pwaManager.requestLocationPermission(activePermissionCallback);
      } else if (activePermissionType === 'microphone') {
        const ok = await pwaManager.requestMicrophonePermission();
        if (ok && activePermissionCallback) activePermissionCallback();
      } else if (activePermissionType === 'storage') {
        const ok = await pwaManager.requestStoragePermission();
        if (ok && activePermissionCallback) activePermissionCallback();
      }
    });
  }
}
