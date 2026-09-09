import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';
import { triggerPermissionPrompt } from '../components/PWABanner.js';

export function renderReportHazardView() {
  const { pendingReport } = store.state;

  const categories = [
    { id: 'Landslide', label: 'Landslide', icon: 'landslide' },
    { id: 'Ground Crack', label: 'Ground Crack', icon: 'earthquake' },
    { id: 'Soil Movement', label: 'Soil Movement', icon: 'landscape' },
    { id: 'Rockfall', label: 'Rockfall', icon: 'filter_hdr' },
    { id: 'Water Seepage', label: 'Water Seepage', icon: 'water_drop' },
    { id: 'Damage', label: 'Damage', icon: 'construction' }
  ];

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-nav-safe-deep overflow-y-auto">
      ${renderTopBar('Report Ground Intel', true, false)}

      <main class="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto w-full">
        <!-- Title & Subtitle -->
        <div class="flex flex-col gap-1">
          <h2 class="text-2xl font-extrabold text-on-surface tracking-tight">Report Hazard</h2>
          <p class="text-sm text-on-surface-variant">Select category and provide evidence for immediate AI assessment.</p>
        </div>

        <!-- Hazard Category Grid -->
        <section class="flex flex-col gap-2.5">
          <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider">Hazard Category</h3>
          <div class="grid grid-cols-3 gap-2.5">
            ${categories.map(cat => {
              const isSelected = pendingReport.category === cat.id;
              return `
                <button data-hazard-cat="${cat.id}" class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 min-h-[90px] active:scale-95 ${
                  isSelected 
                    ? 'border-2 border-primary bg-primary-container/10 shadow-sm text-primary font-bold' 
                    : 'border-outline-variant/70 bg-surface-container-lowest hover:bg-surface-container-low text-secondary font-medium'
                }">
                  <span class="material-symbols-outlined text-[28px] ${isSelected ? 'text-primary' : 'text-secondary'}" style="font-variation-settings: 'FILL' ${isSelected ? '1' : '0'};">${cat.icon}</span>
                  <span class="text-xs text-center leading-tight text-on-surface">${cat.label}</span>
                </button>
              `;
            }).join('')}
          </div>
        </section>

        <!-- AI Assist Banner -->
        <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary-container/60 text-on-secondary-container border border-secondary/20 shadow-sm">
          <span class="material-symbols-outlined text-primary text-[22px] mt-0.5" style="font-variation-settings: 'FILL' 1;">memory</span>
          <div class="flex flex-col">
            <span class="text-xs font-bold text-primary">AI Ground Sensor Assist</span>
            <span class="text-xs text-on-secondary-container/90 mt-0.5">High soil saturation detected nearby. AI suggests category <strong>${pendingReport.category}</strong>.</span>
          </div>
        </div>

        <!-- Evidence Collection -->
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider">Evidence Capture & Photo Upload</h3>
            ${pendingReport.evidencePhoto ? `
              <span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">check_circle</span> Photo Attached
              </span>
            ` : `
              <span class="text-xs text-amber-600 font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">warning</span> Required for AI Verification
              </span>
            `}
          </div>

          <!-- Hidden File Inputs -->
          <input type="file" id="camera-file-input" accept="image/*" capture="environment" class="hidden" />
          <input type="file" id="gallery-file-input" accept="image/*" class="hidden" />

          ${pendingReport.evidencePhoto ? `
            <!-- Attached Photo Preview Box -->
            <div class="relative w-full h-56 rounded-2xl overflow-hidden border-2 border-primary shadow-lg bg-black group">
              <img id="evidence-img-preview" src="${pendingReport.evidencePhoto}" class="w-full h-full object-cover" alt="Uploaded Citizen Evidence" />
              
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-3">
                <div class="flex justify-between items-center">
                  <span class="bg-primary/90 text-on-primary text-xs font-extrabold px-3 py-1 rounded-full shadow flex items-center gap-1 backdrop-blur-sm">
                    <span class="material-symbols-outlined text-[14px]">photo_camera</span> Attached Photo
                  </span>
                  <button id="remove-photo-btn" class="bg-error text-on-error hover:bg-red-700 text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1 transition active:scale-95">
                    <span class="material-symbols-outlined text-[14px]">delete</span> Remove
                  </button>
                </div>
                
                <div class="text-white text-xs font-mono bg-black/60 backdrop-blur-sm p-2 rounded-xl flex items-center justify-between">
                  <span>Image Ready for AI Analysis</span>
                  <button id="change-photo-btn" class="text-cyan-300 font-bold underline text-[11px]">Change Image</button>
                </div>
              </div>
            </div>
          ` : `
            <!-- Action Upload Buttons Grid -->
            <div class="grid grid-cols-2 gap-3">
              <button id="trigger-camera-btn" type="button" class="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-primary/60 bg-primary-container/10 hover:bg-primary-container/20 text-primary font-bold transition-all active:scale-95 shadow-sm min-h-[120px]">
                <div class="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                  <span class="material-symbols-outlined text-[26px]">photo_camera</span>
                </div>
                <span class="text-xs font-extrabold text-center">📸 Take Live Camera Photo</span>
              </button>

              <button id="trigger-gallery-btn" type="button" class="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-bold transition-all active:scale-95 shadow-sm min-h-[120px]">
                <div class="w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shadow-md">
                  <span class="material-symbols-outlined text-[26px]">upload_file</span>
                </div>
                <span class="text-xs font-extrabold text-center">📁 Upload from Gallery</span>
              </button>
            </div>
          `}

          <!-- Voice Note Row -->
          <div class="flex flex-col gap-2.5">
            <button id="voice-record-toggle-btn" class="flex items-center gap-3.5 p-3 rounded-2xl border border-outline-variant/70 bg-surface-container-lowest hover:bg-surface-container-low transition-all w-full min-h-[56px] active:scale-98">
              <div class="w-9 h-9 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0 ${pendingReport.isRecordingVoice ? 'sos-pulse' : ''}">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">mic</span>
              </div>
              <div class="flex flex-col items-start flex-1">
                <span class="text-xs font-bold text-on-surface">
                  ${pendingReport.isRecordingVoice ? 'Recording voice note...' : 'Voice Note Evidence (Recorded 0:12)'}
                </span>
                <div class="flex items-center h-3 text-error gap-[1.5px] mt-0.5">
                  <span class="voice-bar"></span><span class="voice-bar"></span><span class="voice-bar"></span>
                  <span class="voice-bar"></span><span class="voice-bar"></span><span class="voice-bar"></span>
                </div>
              </div>
              <span class="material-symbols-outlined text-primary text-[18px]">
                ${pendingReport.isRecordingVoice ? 'stop_circle' : 'check_circle'}
              </span>
            </button>
          </div>
        </section>

        <!-- Description Details -->
        <section class="flex flex-col gap-2">
          <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider">Observations / Notes</h3>
          <textarea id="hazard-details-input" class="w-full rounded-2xl border border-outline-variant/80 bg-surface-container-lowest p-3.5 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[90px] resize-none shadow-sm" placeholder="Describe fissure width, water rate, slope instability, or nearby structures...">${pendingReport.details || 'Deep diagonal crack across road surface. Active water seepage visible at base.'}</textarea>
        </section>

        <!-- Auto Metadata Info Tag -->
        <div class="flex items-center gap-2 text-on-surface-variant bg-surface-container-low p-3 rounded-xl text-xs border border-outline-variant/40">
          <span class="material-symbols-outlined text-[18px] text-primary">my_location</span>
          <span>GPS Coordinates (${store.state.currentLocation.lat.toFixed(4)}°, ${store.state.currentLocation.lng.toFixed(4)}°) & timestamp attached automatically.</span>
        </div>

        <!-- Submit Button -->
        <div class="flex flex-col gap-2 mt-2">
          <button id="submit-hazard-btn" class="w-full bg-error text-on-error font-extrabold text-base py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-[#93000a] active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[22px]">send</span>
            Submit for AI Verification
          </button>
          <div class="flex items-center justify-center gap-1.5 text-on-surface-variant text-[11px] mt-1">
            <span class="material-symbols-outlined text-[15px]">cloud_sync</span>
            <span>Offline storage enabled. Will sync when packet routes connect.</span>
          </div>
        </div>
      </main>

      ${renderBottomNav('report')}
    </div>
  `;
}

export function bindReportHazardEvents(container) {
  bindNavigationEvents(container);

  // Category Selector
  container.querySelectorAll('[data-hazard-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-hazard-cat');
      store.setReportCategory(cat);
      store.navigate('report'); // refresh
    });
  });

  // Description input
  const detailsInput = container.querySelector('#hazard-details-input');
  if (detailsInput) {
    detailsInput.addEventListener('input', (e) => {
      store.updateReportDetails(e.target.value);
    });
  }

  // Voice recording mock toggle with permission prompt
  const voiceBtn = container.querySelector('#voice-record-toggle-btn');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (store.state.permissions.microphone !== 'granted') {
        triggerPermissionPrompt('microphone', () => {
          store.state.pendingReport.isRecordingVoice = !store.state.pendingReport.isRecordingVoice;
          store.notify();
        });
      } else {
        store.state.pendingReport.isRecordingVoice = !store.state.pendingReport.isRecordingVoice;
        store.notify();
      }
    });
  }

  // Photo Upload Trigger & Handlers
  const cameraInput = container.querySelector('#camera-file-input');
  const galleryInput = container.querySelector('#gallery-file-input');
  const triggerCameraBtn = container.querySelector('#trigger-camera-btn');
  const triggerGalleryBtn = container.querySelector('#trigger-gallery-btn');
  const changePhotoBtn = container.querySelector('#change-photo-btn');
  const removePhotoBtn = container.querySelector('#remove-photo-btn');

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      store.state.pendingReport.evidencePhoto = ev.target.result;
      store.notify();
      store.navigate('report'); // Refresh view with photo preview
    };
    reader.readAsDataURL(file);
  };

  if (triggerCameraBtn && cameraInput) {
    triggerCameraBtn.addEventListener('click', () => cameraInput.click());
  }
  if (triggerGalleryBtn && galleryInput) {
    triggerGalleryBtn.addEventListener('click', () => galleryInput.click());
  }
  if (changePhotoBtn && galleryInput) {
    changePhotoBtn.addEventListener('click', () => galleryInput.click());
  }
  if (cameraInput) {
    cameraInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  }
  if (galleryInput) {
    galleryInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  }
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', () => {
      store.state.pendingReport.evidencePhoto = null;
      store.notify();
      store.navigate('report');
    });
  }

  // Non-blocking Submit button (Requirement 19 & 30)
  const submitBtn = container.querySelector('#submit-hazard-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (detailsInput) store.updateReportDetails(detailsInput.value);
      if (!store.state.pendingReport.evidencePhoto) {
        store.state.pendingReport.evidencePhoto = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnPOoo9P23syYg1w-SxSr6sZG6SSLdTI65ri16kRNg5yJ1ZSfMHTn0ZaT7Wpp2UbqKw5OV-FOKGs_UcPQVbNPb1wjn7fWrBfprwl8zRdODYfmLAY96qVKI80MNSSsg8e3cuwKEt2mCwPtlsxoFjy9kQJfW1EreXkVvrZcj6UF-lkYC_tYwFD4_wnQk-_Ohxg3Tt7C0YtFi-o57Zn5QxIgIGMn9sg2cBcNDj3VGoMQuhQ8Xdl09f872lQ';
      }

      // Non-blocking submission: returns immediately while AI verifies in background
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
        <span>Submitting Report...</span>
      `;

      const report = await store.submitHazardReport({
        category: store.state.pendingReport.category,
        description: store.state.pendingReport.details
      });

      // Display Instant Confirmation Modal (Requirement 30)
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200';
      modal.innerHTML = `
        <div class="bg-surface border border-outline-variant/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
          <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg">
            <span class="material-symbols-outlined text-[36px]">check_circle</span>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Report Submitted Successfully</span>
            <h3 class="text-xl font-extrabold text-on-surface">${report.category} Incident</h3>
            <span class="text-xs font-mono font-bold text-primary bg-primary-container/20 px-2.5 py-0.5 rounded-full mx-auto mt-1">${report.report_code || report.id}</span>
          </div>

          <!-- Metadata Telemetry Box -->
          <div class="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-3 text-left space-y-1.5 text-xs font-mono">
            <div class="flex justify-between">
              <span class="text-on-surface-variant">GPS Coords:</span>
              <span class="text-on-surface font-bold">${report.lat.toFixed(4)}°, ${report.lng.toFixed(4)}°</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">Timestamp:</span>
              <span class="text-on-surface">${report.time_formatted || 'Just now'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">AI Verification:</span>
              <span class="text-amber-500 font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>UNDER_AI_VERIFICATION</span>
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">Storage:</span>
              <span class="text-primary font-semibold">Supabase Storage</span>
            </div>
          </div>

          <p class="text-xs text-on-surface-variant leading-relaxed">
            Your evidence photo has been stored securely. Prithvi Shield Deepfake AI is verifying image authenticity in the background. Emergency dispatchers have been notified.
          </p>

          <div class="flex flex-col gap-2 w-full pt-2">
            <button id="modal-map-btn" class="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow hover:bg-primary/90 transition flex items-center justify-center gap-1.5 active:scale-98">
              <span class="material-symbols-outlined text-[18px]">map</span>
              <span>View On Live Safety Map</span>
            </button>
            <button id="modal-verify-btn" class="w-full py-2.5 bg-surface-container-high text-on-surface font-semibold text-xs rounded-xl border border-outline-variant hover:bg-surface-container-highest transition flex items-center justify-center gap-1.5 active:scale-98">
              <span class="material-symbols-outlined text-[18px]">document_scanner</span>
              <span>Inspect Deepfake Scanner</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#modal-map-btn').addEventListener('click', () => {
        modal.remove();
        store.navigate('map');
      });
      modal.querySelector('#modal-verify-btn').addEventListener('click', () => {
        modal.remove();
        store.navigate('ai-verify');
      });
    });
  }
}

