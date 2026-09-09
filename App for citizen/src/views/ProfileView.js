import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

export function renderProfileView() {
  const { currentUser } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-nav-safe overflow-y-auto antialiased">
      ${renderTopBar('Citizen Profile & Settings', true, true)}

      <main class="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto w-full">
        <!-- Citizen Profile Card -->
        <div class="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/70 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div class="w-16 h-16 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-black text-xl shadow-md shrink-0">
            ${currentUser.fullName ? currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'RS'}
          </div>

          <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="text-base font-extrabold text-on-surface truncate">${currentUser.fullName || 'Rahul Sharma'}</h2>
              <span class="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                Verified Citizen
              </span>
            </div>
            <p class="text-xs text-on-surface-variant font-mono mt-0.5">${currentUser.mobileNumber || '+91 9876543210'}</p>
            <p class="text-[11px] text-on-surface-variant mt-0.5">${currentUser.email || 'rahul.sharma@gmail.com'}</p>
          </div>
        </div>

        <!-- Emergency Contact Card -->
        <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/70 shadow-sm flex flex-col gap-3">
          <div class="flex justify-between items-center border-b border-outline-variant/40 pb-2.5">
            <span class="text-xs font-bold text-primary flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">contact_emergency</span> Primary Emergency Contact (+91)
            </span>
            <button id="profile-edit-contact-btn" class="text-xs font-bold text-primary hover:underline">Edit</button>
          </div>

          <div class="flex items-center justify-between text-xs">
            <div>
              <p class="font-bold text-on-surface">${currentUser.emergencyContactName || 'Rahul Sharma'}</p>
              <p class="text-on-surface-variant text-[11px]">Father • Immediate Family Circle</p>
            </div>
            <a href="tel:${currentUser.emergencyContactPhone || '+919876543210'}" class="font-mono font-extrabold text-primary bg-primary-container/20 px-3 py-1 rounded-full border border-primary/20">
              ${currentUser.emergencyContactPhone || '+91 9876543210'}
            </a>
          </div>
        </div>

        <!-- Quick Settings List -->
        <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/70 shadow-sm overflow-hidden flex flex-col divide-y divide-outline-variant/40 text-xs font-medium">
          <button id="profile-privacy-btn" class="p-4 flex items-center justify-between text-on-surface hover:bg-surface-container-low transition-colors text-left">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-[20px]">privacy_tip</span>
              <span>Location Privacy & Sharing Rules</span>
            </div>
            <span class="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
          </button>

          <button id="profile-shelters-btn" class="p-4 flex items-center justify-between text-on-surface hover:bg-surface-container-low transition-colors text-left">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-[20px]">home_pin</span>
              <span>Saved Emergency Shelters</span>
            </div>
            <span class="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
          </button>

          <button id="profile-twin-btn" class="p-4 flex items-center justify-between text-on-surface hover:bg-surface-container-low transition-colors text-left">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-[20px]">monitoring</span>
              <span>GIS Digital Twin Sector</span>
            </div>
            <span class="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
          </button>
        </div>

        <!-- Account Actions -->
        <div class="flex flex-col gap-2.5 pt-2">
          <button id="profile-logout-btn" class="w-full py-3.5 rounded-2xl bg-surface-container-high text-on-surface font-extrabold text-xs hover:bg-error-container hover:text-on-error-container border border-outline-variant/60 transition-all flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out of Prithvi Shield</span>
          </button>

          <button id="profile-delete-account-btn" class="w-full py-2 text-[11px] font-bold text-error/80 hover:text-error hover:underline text-center">
            Delete Citizen Account Data
          </button>
        </div>
      </main>

      ${renderBottomNav('more')}
    </div>
  `;
}

export function bindProfileEvents(container) {
  bindNavigationEvents(container);

  const privacyBtn = container.querySelector('#profile-privacy-btn');
  if (privacyBtn) privacyBtn.addEventListener('click', () => store.navigate('privacy-settings'));

  const sheltersBtn = container.querySelector('#profile-shelters-btn');
  if (sheltersBtn) sheltersBtn.addEventListener('click', () => store.navigate('shelters'));

  const twinBtn = container.querySelector('#profile-twin-btn');
  if (twinBtn) twinBtn.addEventListener('click', () => store.navigate('twin'));

  const logoutBtn = container.querySelector('#profile-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Sign out of Prithvi Shield Citizen Platform?')) {
        store.logout();
      }
    });
  }

  const deleteBtn = container.querySelector('#profile-delete-account-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('Permanently delete citizen profile data?')) {
        store.logout();
      }
    });
  }
}
