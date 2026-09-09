import { store } from '../store.js';

export function renderPrivacySettingsView() {
  const { locationPreference } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen overflow-y-auto antialiased pb-nav-safe">
      <!-- TopAppBar with WindowInsets Protection -->
      <header class="bg-surface sticky top-0 z-40 flex justify-between items-center w-full px-4 h-14 pt-safe border-b border-outline-variant/60 shadow-sm">
        <button id="privacy-back-btn" class="w-10 h-10 -ml-1 flex items-center justify-center text-primary hover:bg-surface-container-high rounded-full transition-transform active:scale-95">
          <span class="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div class="flex-1 text-center font-bold text-primary text-lg">
          Location Privacy
        </div>
        <div class="w-10"></div>
      </header>

      <main class="flex-1 max-w-xl mx-auto w-full px-4 py-5 flex flex-col gap-5">
        <!-- Header info -->
        <div class="flex flex-col gap-1.5">
          <h2 class="text-2xl font-extrabold text-on-surface tracking-tight">Location Sharing Rules</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            Configure how and when your coordinates are transmitted to your emergency circle. These policies apply strictly to verified contacts.
          </p>
        </div>

        <!-- Map Preview Card -->
        <section class="rounded-2xl border border-outline-variant/80 overflow-hidden shadow-sm bg-surface-container-lowest">
          <div class="h-44 w-full relative bg-cover bg-center" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAymG5vO0hmm7b6md0fNK72vvFdiAYWN7XuxLcoEkDPSFvKyjtXAL75V6CV-h8VYbLroWYQ0yyMLHSh7f9-T_dR-qMjwaIOrLyz0KI2vD1LRjFa4vl_mNAyJTSZN3oS_A5sptfibhR9clESEzPdlxojdIqcJqFFezKb1ZScrwRY9vFMO97T6g3qFDbSmLLwKOLYoQyHIioOkC-pRuUT8U8VMfN_fi-NG4C1wR_gfOMg7XIrbCh031tLxg');">
            <!-- Overlay Badge -->
            <div class="absolute top-3 left-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant flex items-center gap-1.5 shadow-sm">
              <span class="material-symbols-outlined text-primary text-[16px]">visibility</span>
              <span class="text-xs font-bold text-on-surface">Preview: Family View</span>
            </div>

            <!-- Simulated User Marker -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div class="w-12 h-12 bg-primary/25 rounded-full pulsate-gps absolute -z-10"></div>
              <div class="w-8 h-8 bg-surface rounded-full shadow-lg flex items-center justify-center border-2 border-primary z-10">
                <span class="material-symbols-outlined text-primary text-[18px]">person</span>
              </div>
            </div>
          </div>

          <div class="bg-surface-container-low p-3.5 border-t border-outline-variant/60 flex items-start gap-2.5">
            <span class="material-symbols-outlined text-primary text-[20px] mt-0.5" style="font-variation-settings: 'FILL' 1;">verified_user</span>
            <p class="text-xs text-on-secondary-container leading-relaxed">
              Your precise telemetry is protected by zero-knowledge end-to-end encryption. SafeGround dispatchers cannot access location unless an active SOS is triggered.
            </p>
          </div>
        </section>

        <!-- Sharing Policy Radios -->
        <section class="flex flex-col gap-3">
          <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider">Privacy Preferences</h3>
          
          <div class="flex flex-col gap-3">
            <!-- Option 1: Always Share -->
            <label class="relative rounded-2xl border p-4 cursor-pointer transition-all bg-surface-container-lowest shadow-sm flex items-start gap-3.5 hover:bg-surface-container-low ${
              locationPreference === 'always' ? 'border-primary bg-primary-fixed/20 ring-2 ring-primary/30' : 'border-outline-variant/70'
            }">
              <input type="radio" name="loc_pref" value="always" class="mt-1 text-primary focus:ring-primary" ${locationPreference === 'always' ? 'checked' : ''} />
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="material-symbols-outlined text-primary text-[20px]" style="font-variation-settings: 'FILL' 1;">share_location</span>
                  <span class="text-sm font-bold text-on-surface">Always Share</span>
                </div>
                <p class="text-xs text-on-surface-variant leading-relaxed">Your family circle can view your real-time coordinates at any time. Best for continuous peace of mind.</p>
              </div>
            </label>

            <!-- Option 2: Share only during SOS -->
            <label class="relative rounded-2xl border p-4 cursor-pointer transition-all bg-surface-container-lowest shadow-sm flex items-start gap-3.5 hover:bg-surface-container-low ${
              locationPreference === 'sos' ? 'border-primary bg-primary-fixed/20 ring-2 ring-primary/30' : 'border-outline-variant/70'
            }">
              <input type="radio" name="loc_pref" value="sos" class="mt-1 text-primary focus:ring-primary" ${locationPreference === 'sos' ? 'checked' : ''} />
              <div class="flex-1">
                <div class="flex items-center justify-between gap-2 mb-0.5">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-error text-[20px]" style="font-variation-settings: 'FILL' 1;">emergency</span>
                    <span class="text-sm font-bold text-on-surface">Share only during SOS</span>
                  </div>
                  <span class="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded-full font-bold">Recommended</span>
                </div>
                <p class="text-xs text-on-surface-variant leading-relaxed">Location remains completely private until you activate SOS emergency mode. Maximizes everyday privacy.</p>
              </div>
            </label>

            <!-- Option 3: Share in High Risk Zones -->
            <label class="relative rounded-2xl border p-4 cursor-pointer transition-all bg-surface-container-lowest shadow-sm flex items-start gap-3.5 hover:bg-surface-container-low ${
              locationPreference === 'risk' ? 'border-primary bg-primary-fixed/20 ring-2 ring-primary/30' : 'border-outline-variant/70'
            }">
              <input type="radio" name="loc_pref" value="risk" class="mt-1 text-primary focus:ring-primary" ${locationPreference === 'risk' ? 'checked' : ''} />
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="material-symbols-outlined text-tertiary text-[20px]" style="font-variation-settings: 'FILL' 1;">warning</span>
                  <span class="text-sm font-bold text-on-surface">Share in High Risk Zones</span>
                </div>
                <p class="text-xs text-on-surface-variant leading-relaxed">Location is automatically broadcasted to your circle whenever you enter a geofenced severe weather or landslide risk zone.</p>
              </div>
            </label>
          </div>
        </section>

        <!-- Save Button -->
        <div class="pt-2 mt-auto">
          <button id="save-privacy-prefs-btn" class="w-full py-4 bg-primary text-on-primary font-extrabold text-sm rounded-2xl shadow-md hover:bg-primary-fixed-variant transition-all active:scale-98">
            Save Privacy Preferences
          </button>
        </div>
      </main>
    </div>
  `;
}

export function bindPrivacySettingsEvents(container) {
  const backBtn = container.querySelector('#privacy-back-btn');
  if (backBtn) backBtn.addEventListener('click', () => store.goBack());

  // Radio choices
  container.querySelectorAll('input[name="loc_pref"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      store.setLocationPreference(e.target.value);
      store.navigate('privacy-settings'); // re-render selected state
    });
  });

  const saveBtn = container.querySelector('#save-privacy-prefs-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveBtn.textContent = '✓ Preferences Saved';
      saveBtn.classList.add('bg-emerald-700');
      setTimeout(() => {
        store.navigate('circle');
      }, 600);
    });
  }
}
