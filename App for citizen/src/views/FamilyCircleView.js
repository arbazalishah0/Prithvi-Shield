import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

export function renderFamilyCircleView() {
  const { familyMembers } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-nav-safe overflow-y-auto">
      ${renderTopBar('Family Circle', true, true)}

      <main class="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto w-full">
        <!-- Introduction Header -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-extrabold text-on-surface tracking-tight">Family & Safety Circle</h2>
            <button id="circle-view-active-summary" class="text-xs font-bold text-primary bg-primary-container/20 px-3 py-1 rounded-full border border-primary/20 hover:bg-primary-container/30 transition-colors flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Status Overview
            </button>
          </div>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            Manage your trusted circle. They will receive automated alerts when you trigger an emergency SOS and can view your real-time location.
          </p>
        </div>

        <!-- Privacy Config Shortcut Banner -->
        <div class="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/70 shadow-sm flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="material-symbols-outlined text-primary text-[22px]">privacy_tip</span>
            <div>
              <p class="text-xs font-bold text-on-surface">Location Sharing Policy</p>
              <p class="text-[11px] text-on-surface-variant">Active: <strong>Share only during SOS</strong> (Encrypted)</p>
            </div>
          </div>
          <button id="circle-edit-privacy-btn" class="text-xs font-bold text-primary hover:underline px-2 py-1">
            Configure
          </button>
        </div>

        <!-- Family Members List -->
        <section class="flex flex-col gap-3.5" id="family-list">
          ${familyMembers.map((member, idx) => `
            <div class="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div class="absolute left-0 top-0 bottom-0 w-1.5 ${idx === 0 ? 'bg-primary' : 'bg-secondary'}"></div>
              
              <!-- Contact Info Row -->
              <div class="flex items-center justify-between pl-1">
                <div class="flex items-center gap-3">
                  ${member.avatar ? `
                    <img src="${member.avatar}" class="w-12 h-12 rounded-full object-cover border border-outline-variant shadow-sm" alt="${member.name}" />
                  ` : `
                    <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-primary font-bold text-base shadow-sm">
                      ${member.initials}
                    </div>
                  `}
                  <div>
                    <div class="flex items-center gap-1.5">
                      <h3 class="text-sm font-bold text-on-surface">${member.name}</h3>
                      <span class="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant">${member.relation || 'Contact'}</span>
                    </div>
                    <p class="text-xs text-on-surface-variant mt-0.5">${member.phone}</p>
                    <p class="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ${member.lastKnownLocation || 'Safe'}
                    </p>
                  </div>
                </div>

                <button data-remove-member="${member.id}" class="text-on-surface-variant hover:text-error transition-colors p-2 rounded-full hover:bg-surface-container" title="Remove Contact">
                  <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>

              <!-- Toggles Row -->
              <div class="pl-1 border-t border-outline-variant/40 pt-3 flex flex-col gap-2.5">
                <!-- SOS Notification Toggle -->
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-on-surface flex items-center gap-2">
                    <span class="material-symbols-outlined text-secondary text-[18px]">notifications_active</span>
                    Notify during SOS Emergency
                  </span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" data-toggle-member="${member.id}" data-option="notifySOS" class="sr-only toggle-switch-input" ${member.notifySOS ? 'checked' : ''} />
                    <div class="w-11 h-6 bg-surface-container-highest border border-outline-variant rounded-full toggle-switch-track transition-colors duration-200">
                      <div class="w-4 h-4 bg-outline-variant rounded-full shadow-md transform transition-transform duration-200 mt-1 ml-1 toggle-switch-thumb"></div>
                    </div>
                  </label>
                </div>

                <!-- Location Sharing Toggle -->
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-on-surface flex items-center gap-2">
                    <span class="material-symbols-outlined text-secondary text-[18px]">share_location</span>
                    Real-time Location Stream
                  </span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" data-toggle-member="${member.id}" data-option="shareLocation" class="sr-only toggle-switch-input" ${member.shareLocation ? 'checked' : ''} />
                    <div class="w-11 h-6 bg-surface-container-highest border border-outline-variant rounded-full toggle-switch-track transition-colors duration-200">
                      <div class="w-4 h-4 bg-outline-variant rounded-full shadow-md transform transition-transform duration-200 mt-1 ml-1 toggle-switch-thumb"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          `).join('')}
        </section>

        <!-- Add Contact Form (Toggleable) -->
        <section id="add-member-form-card" class="hidden bg-surface-container-lowest border-2 border-dashed border-primary/40 rounded-2xl p-4 shadow-md flex-col gap-3.5">
          <h3 class="text-sm font-bold text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px]">person_add</span>
            Add Trusted Circle Contact
          </h3>
          <div class="flex flex-col gap-3">
            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Full Name</label>
              <input id="add-contact-name" class="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Rahul Sharma" type="text" />
            </div>
            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Relationship</label>
              <input id="add-contact-relation" class="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Father, Mother, Sibling" type="text" />
            </div>
            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Indian Mobile Number (+91)</label>
              <div class="flex items-center bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span class="px-3 py-3 bg-surface-container-high text-primary font-bold text-xs border-r border-outline-variant shrink-0">
                  +91
                </span>
                <input id="add-contact-phone" class="w-full bg-transparent p-3 text-sm text-on-surface font-mono font-bold focus:outline-none" placeholder="9876543210" type="tel" maxlength="10" />
              </div>
            </div>
            <div class="flex gap-2.5 mt-1">
              <button id="cancel-add-contact-btn" class="flex-1 py-3 px-4 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-xs hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
              <button id="save-add-contact-btn" class="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary-fixed-variant transition-colors">
                Save Contact
              </button>
            </div>
          </div>
        </section>

        <!-- Add Member Button Trigger -->
        <div class="flex flex-col gap-2 pt-2">
          <button id="show-add-contact-btn" class="w-full py-4 rounded-2xl bg-primary-container text-on-primary-container font-extrabold text-sm shadow-sm hover:bg-primary-container/80 transition-all flex items-center justify-center gap-2 active:scale-98">
            <span class="material-symbols-outlined text-[22px]">person_add</span>
            Add New Family Contact
          </button>
        </div>
      </main>

      ${renderBottomNav('more')}
    </div>
  `;
}

export function bindFamilyCircleEvents(container) {
  bindNavigationEvents(container);

  // Status Overview Shortcut
  const statusOverviewBtn = container.querySelector('#circle-view-active-summary');
  if (statusOverviewBtn) {
    statusOverviewBtn.addEventListener('click', () => store.navigate('circle-active'));
  }

  // Edit Privacy Settings Shortcut
  const editPrivacyBtn = container.querySelector('#circle-edit-privacy-btn');
  if (editPrivacyBtn) {
    editPrivacyBtn.addEventListener('click', () => store.navigate('privacy-settings'));
  }

  // Toggle member options
  container.querySelectorAll('[data-toggle-member]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.getAttribute('data-toggle-member');
      const option = input.getAttribute('data-option');
      store.toggleMemberOption(id, option);
    });
  });

  // Remove member
  container.querySelectorAll('[data-remove-member]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-remove-member');
      if (confirm('Remove this contact from your Emergency Safety Circle?')) {
        store.removeFamilyMember(id);
      }
    });
  });

  // Add Member Form interactions
  const showAddBtn = container.querySelector('#show-add-contact-btn');
  const addFormCard = container.querySelector('#add-member-form-card');
  const cancelAddBtn = container.querySelector('#cancel-add-contact-btn');
  const saveAddBtn = container.querySelector('#save-add-contact-btn');

  if (showAddBtn && addFormCard) {
    showAddBtn.addEventListener('click', () => {
      addFormCard.classList.remove('hidden');
      addFormCard.classList.add('flex');
      showAddBtn.classList.add('hidden');
    });
  }

  if (cancelAddBtn && addFormCard) {
    cancelAddBtn.addEventListener('click', () => {
      addFormCard.classList.add('hidden');
      addFormCard.classList.remove('flex');
      if (showAddBtn) showAddBtn.classList.remove('hidden');
    });
  }

  if (saveAddBtn) {
    saveAddBtn.addEventListener('click', () => {
      const nameInput = container.querySelector('#add-contact-name');
      const phoneInput = container.querySelector('#add-contact-phone');
      const relationInput = container.querySelector('#add-contact-relation');

      const rawPhone = phoneInput ? phoneInput.value.trim() : '';
      if (!nameInput.value || !rawPhone) {
        alert('Please enter both name and Indian mobile number.');
        return;
      }

      if (!/^[6-9]\d{9}$/.test(rawPhone)) {
        alert('Please enter a valid 10-digit Indian mobile number after +91.');
        return;
      }

      store.addFamilyMember({
        name: nameInput.value,
        phone: `+91 ${rawPhone}`,
        relation: relationInput.value || 'Father'
      });

      addFormCard.classList.add('hidden');
      addFormCard.classList.remove('flex');
      if (showAddBtn) showAddBtn.classList.remove('hidden');
    });
  }
}
