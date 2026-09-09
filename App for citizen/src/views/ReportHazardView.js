import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';
import { triggerPermissionPrompt } from '../components/PWABanner.js';
import { pwaManager } from '../services/pwaService.js';

export function renderReportHazardView() {
  const { pendingReport, currentLocation } = store.state;

  const categories = [
    { id: 'Landslide', label: 'Landslide', icon: 'landslide' },
    { id: 'Road Blockage', label: 'Road Blockage', icon: 'block' },
    { id: 'Ground Crack', label: 'Ground Crack', icon: 'earthquake' },
    { id: 'Slope Movement', label: 'Slope Movement', icon: 'landscape' },
    { id: 'Flooding', label: 'Flooding', icon: 'water_drop' },
    { id: 'Infrastructure Damage', label: 'Infrastructure Damage', icon: 'construction' },
    { id: 'Other Emergency', label: 'Other Emergency', icon: 'warning' }
  ];

  const currentCategory = pendingReport.category || 'Landslide';

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-nav-safe-deep overflow-y-auto antialiased">
      ${renderTopBar('Report Incident', true, false)}

      <main class="px-4 py-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        <!-- Title Banner -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
              <span class="material-symbols-outlined text-error text-[28px]">report_problem</span>
              Report Incident
            </h2>
            <span class="bg-red-500/10 text-red-600 border border-red-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              Live Dispatch Pipeline
            </span>
          </div>
          <p class="text-xs text-on-surface-variant">Submit real-time ground evidence directly to PRITHVI-SHIELD Admin Command Center.</p>
        </div>

        <!-- 1. Incident Type Category Selection -->
        <section class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1">
              <span>1. Incident Type</span>
              <span class="text-error font-extrabold">*</span>
            </h3>
            <span class="text-[11px] font-mono text-primary font-bold bg-primary-container/20 px-2 py-0.5 rounded-full">
              Selected: ${currentCategory}
            </span>
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            ${categories.map(cat => {
              const isSelected = currentCategory === cat.id;
              return `
                <button data-hazard-cat="${cat.id}" type="button" class="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border transition-all duration-150 min-h-[85px] active:scale-95 ${
                  isSelected 
                    ? 'border-2 border-primary bg-primary-container/15 shadow-md text-primary font-bold ring-2 ring-primary/20' 
                    : 'border-outline-variant/70 bg-surface-container-lowest hover:bg-surface-container-low text-secondary font-medium'
                }">
                  <span class="material-symbols-outlined text-[24px] ${isSelected ? 'text-primary' : 'text-secondary'}" style="font-variation-settings: 'FILL' ${isSelected ? '1' : '0'};">${cat.icon}</span>
                  <span class="text-[11px] text-center leading-tight font-semibold text-on-surface">${cat.label}</span>
                </button>
              `;
            }).join('')}
          </div>
        </section>

        <!-- 2. Capture or Upload Media -->
        <section class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1">
              <span>2. Evidence Photo</span>
              <span class="text-error font-extrabold">*</span>
            </h3>
            ${pendingReport.evidencePhoto ? `
              <span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">check_circle</span> Photo Preview Ready
              </span>
            ` : `
              <span class="text-[11px] text-amber-600 font-bold flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <span class="material-symbols-outlined text-[14px]">photo_camera</span> Camera or Gallery Required
              </span>
            `}
          </div>

          <!-- Hidden File Inputs -->
          <input type="file" id="camera-file-input" accept="image/*" capture="environment" class="hidden" />
          <input type="file" id="gallery-file-input" accept="image/*" class="hidden" />

          ${pendingReport.evidencePhoto ? `
            <!-- Attached Photo Preview Box -->
            <div class="relative w-full h-56 rounded-2xl overflow-hidden border-2 border-primary shadow-xl bg-black group">
              <img id="evidence-img-preview" src="${pendingReport.evidencePhoto}" class="w-full h-full object-cover" alt="Uploaded Citizen Evidence Photo" />
              
              <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 flex flex-col justify-between p-3.5">
                <div class="flex justify-between items-center">
                  <span class="bg-primary text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-md border border-white/20">
                    <span class="material-symbols-outlined text-[15px]">photo_camera</span> Ground Evidence Photo
                  </span>
                  <button id="remove-photo-btn" type="button" class="bg-error text-white hover:bg-red-700 text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 transition active:scale-95">
                    <span class="material-symbols-outlined text-[14px]">delete</span> Remove
                  </button>
                </div>
                
                <div class="text-white text-xs font-mono bg-black/70 backdrop-blur-md p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                  <span class="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Ready to Transmit</span>
                  </span>
                  <button id="change-photo-btn" type="button" class="text-cyan-300 font-extrabold underline text-xs">Change Image</button>
                </div>
              </div>
            </div>
          ` : `
            <!-- Action Upload Buttons Grid -->
            <div class="grid grid-cols-2 gap-3">
              <button id="trigger-camera-btn" type="button" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-primary/60 bg-primary-container/10 hover:bg-primary-container/20 text-primary font-bold transition-all active:scale-95 shadow-sm min-h-[115px]">
                <div class="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-[26px]">photo_camera</span>
                </div>
                <span class="text-xs font-extrabold text-center">📸 Take Photo</span>
                <span class="text-[10px] text-on-surface-variant font-medium">Open Device Camera</span>
              </button>

              <button id="trigger-gallery-btn" type="button" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-bold transition-all active:scale-95 shadow-sm min-h-[115px]">
                <div class="w-12 h-12 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center shadow-md">
                  <span class="material-symbols-outlined text-[26px]">photo_library</span>
                </div>
                <span class="text-xs font-extrabold text-center">📁 Upload From Gallery</span>
                <span class="text-[10px] text-on-surface-variant font-medium">Select Image File</span>
              </button>
            </div>
          `}
        </section>

        <!-- 3. Incident Description -->
        <section class="flex flex-col gap-2">
          <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center justify-between">
            <span>3. Incident Description</span>
            <span class="text-[11px] text-on-surface-variant font-normal">Optional</span>
          </h3>
          <textarea id="hazard-details-input" class="w-full rounded-2xl border border-outline-variant/80 bg-surface-container-lowest p-3.5 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[85px] resize-none shadow-sm" placeholder="Large amount of mud and rocks are blocking the road...">${pendingReport.details || ''}</textarea>
        </section>

        <!-- 4. Automatic Location Detection -->
        <section class="flex flex-col gap-2 bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/80 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span class="material-symbols-outlined text-primary text-[18px]">my_location</span>
              4. Automatic Location Detection
            </h3>
            <span id="gps-status-badge" class="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Location Detected Successfully
            </span>
          </div>

          <div class="flex items-center justify-between text-xs font-mono bg-surface-container-low p-3 rounded-xl border border-outline-variant/50 mt-1">
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center gap-2">
                <span class="text-on-surface font-extrabold text-sm" id="gps-coords-display">${currentLocation.lat.toFixed(4)}° N, ${currentLocation.lng.toFixed(4)}° E</span>
              </div>
              <span id="gps-accuracy-display" class="text-on-surface-variant text-[11px]">Accuracy: ±${currentLocation.accuracy || 6}m &bull; ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <button id="refresh-gps-btn" type="button" class="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-xl font-sans font-bold text-xs flex items-center gap-1 transition active:scale-95 shrink-0 shadow-xs">
              <span class="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh Location</span>
            </button>
          </div>
        </section>

        <!-- Error / Warning Banner Container -->
        <div id="report-validation-banner" class="hidden p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">warning</span>
          <span id="report-validation-text">Please complete all required fields.</span>
        </div>

        <!-- 5. Submit Report Button -->
        <div class="flex flex-col gap-2 mt-1">
          <button id="submit-hazard-btn" type="button" class="w-full bg-error text-white font-extrabold text-base py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-[#93000a] active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[22px]">send</span>
            <span>Submit Report</span>
          </button>

          <div class="flex items-center justify-center gap-1.5 text-on-surface-variant text-[11px]">
            <span class="material-symbols-outlined text-[15px] text-emerald-500">sync</span>
            <span>Real-time dispatch to Admin Dashboard enabled</span>
          </div>
        </div>
      </main>

      ${renderBottomNav('report')}
    </div>
  `;
}

export function bindReportHazardEvents(container) {
  bindNavigationEvents(container);

  const { currentLocation } = store.state;

  // 1. Category Selector
  container.querySelectorAll('[data-hazard-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-hazard-cat');
      store.setReportCategory(cat);
      store.navigate('report');
    });
  });

  // 2. Description input
  const detailsInput = container.querySelector('#hazard-details-input');
  if (detailsInput) {
    detailsInput.addEventListener('input', (e) => {
      store.updateReportDetails(e.target.value);
    });
  }

  // 3. Camera & Gallery File Triggers
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
      store.navigate('report');
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

  // 4. GPS Location Refresh Button
  const refreshGpsBtn = container.querySelector('#refresh-gps-btn');
  if (refreshGpsBtn) {
    refreshGpsBtn.addEventListener('click', () => {
      refreshGpsBtn.disabled = true;
      refreshGpsBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Locating...</span>`;
      pwaManager.requestLocationPermission(
        (pos) => {
          if (pos && pos.coords) {
            store.state.currentLocation.lat = pos.coords.latitude;
            store.state.currentLocation.lng = pos.coords.longitude;
            store.state.currentLocation.accuracy = Math.round(pos.coords.accuracy || 5);
          }
          const coordsDisp = container.querySelector('#gps-coords-display');
          const accDisp = container.querySelector('#gps-accuracy-display');
          if (coordsDisp) coordsDisp.textContent = `${store.state.currentLocation.lat.toFixed(4)}° N, ${store.state.currentLocation.lng.toFixed(4)}° E`;
          if (accDisp) accDisp.textContent = `Accuracy: ±${store.state.currentLocation.accuracy || 5}m • Refreshed ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          refreshGpsBtn.disabled = false;
          refreshGpsBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">refresh</span><span>Refresh Location</span>`;
        },
        () => {
          refreshGpsBtn.disabled = false;
          refreshGpsBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">refresh</span><span>Refresh Location</span>`;
        }
      );
    });
  }

  // 5. Form Validation & Submission Stepper Progress
  const submitBtn = container.querySelector('#submit-hazard-btn');
  const banner = container.querySelector('#report-validation-banner');
  const bannerText = container.querySelector('#report-validation-text');

  function showValidationError(msg) {
    if (banner && bannerText) {
      bannerText.textContent = msg;
      banner.classList.remove('hidden');
      banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const selectedCategory = store.state.pendingReport.category || 'Landslide';
      const evidencePhoto = store.state.pendingReport.evidencePhoto;
      const detailsText = detailsInput ? detailsInput.value : store.state.pendingReport.details;

      // Validation Checks
      if (!selectedCategory) {
        showValidationError('Please select an Incident Type before submitting.');
        return;
      }

      if (!evidencePhoto) {
        showValidationError('Please capture a photo or select an image from gallery before submitting.');
        return;
      }

      if (!store.state.currentLocation || !store.state.currentLocation.lat) {
        showValidationError('GPS location unavailable. Please click Refresh Location.');
        return;
      }

      if (banner) banner.classList.add('hidden');

      // Create Stepper Progress Modal Overlay
      const progressModal = document.createElement('div');
      progressModal.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
      progressModal.innerHTML = `
        <div class="bg-surface border border-outline-variant rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-5">
          <div class="w-16 h-16 rounded-full bg-primary/10 text-primary border border-primary/30 flex items-center justify-center shadow-inner">
            <span class="material-symbols-outlined text-[36px] animate-spin">progress_activity</span>
          </div>

          <div class="flex flex-col gap-1">
            <h3 id="step-title" class="text-lg font-black text-on-surface">Uploading Incident Report...</h3>
            <span id="step-sub" class="text-xs text-on-surface-variant font-medium">Preparing secure cloud payload</span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-surface-container-high rounded-full h-3 overflow-hidden p-0.5 border border-outline-variant/60">
            <div id="step-progress-bar" class="bg-gradient-to-r from-cyan-500 via-primary to-emerald-500 h-full w-[15%] transition-all duration-300 rounded-full"></div>
          </div>

          <!-- Stepper Log List -->
          <div class="w-full bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/50 text-left text-xs font-mono space-y-2">
            <div id="step-log-1" class="flex items-center gap-2 text-primary font-bold">
              <span class="material-symbols-outlined text-[16px] animate-spin">sync</span>
              <span>1. Uploading image to cloud storage...</span>
            </div>
            <div id="step-log-2" class="flex items-center gap-2 text-on-surface-variant opacity-50">
              <span class="material-symbols-outlined text-[16px]">hourglass_empty</span>
              <span>2. Capturing GPS telemetry...</span>
            </div>
            <div id="step-log-3" class="flex items-center gap-2 text-on-surface-variant opacity-50">
              <span class="material-symbols-outlined text-[16px]">hourglass_empty</span>
              <span>3. Transmitting to Admin Dashboard...</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(progressModal);

      const stepTitle = progressModal.querySelector('#step-title');
      const stepSub = progressModal.querySelector('#step-sub');
      const progressBar = progressModal.querySelector('#step-progress-bar');
      const log1 = progressModal.querySelector('#step-log-1');
      const log2 = progressModal.querySelector('#step-log-2');
      const log3 = progressModal.querySelector('#step-log-3');

      // Step 1: Image Upload (80%)
      await new Promise(r => setTimeout(r, 600));
      if (progressBar) progressBar.style.width = '45%';
      if (stepSub) stepSub.textContent = 'Image upload: 80% complete';
      if (log1) {
        log1.className = 'flex items-center gap-2 text-emerald-600 font-bold';
        log1.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span><span>1. Image uploaded securely</span>`;
      }
      if (log2) {
        log2.className = 'flex items-center gap-2 text-primary font-bold opacity-100';
        log2.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>2. Saving GPS coordinates & timestamp...</span>`;
      }

      // Step 2: Location & Record Creation
      await new Promise(r => setTimeout(r, 600));
      if (progressBar) progressBar.style.width = '80%';
      if (stepSub) stepSub.textContent = 'Creating central database record...';
      if (log2) {
        log2.className = 'flex items-center gap-2 text-emerald-600 font-bold';
        log2.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span><span>2. Location telemetry attached (${store.state.currentLocation.lat.toFixed(4)}°, ${store.state.currentLocation.lng.toFixed(4)}°)</span>`;
      }
      if (log3) {
        log3.className = 'flex items-center gap-2 text-primary font-bold opacity-100';
        log3.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>3. Triggering Admin Command Center alert...</span>`;
      }

      // Submit via Central Store
      const report = await store.submitHazardReport({
        category: selectedCategory,
        description: detailsText
      });

      // Step 3: Complete
      await new Promise(r => setTimeout(r, 500));
      if (progressBar) progressBar.style.width = '100%';
      if (stepTitle) stepTitle.textContent = 'Report Submitted Successfully!';
      if (stepSub) stepSub.textContent = 'Incident dispatches live to Admin Dashboard.';
      if (log3) {
        log3.className = 'flex items-center gap-2 text-emerald-600 font-bold';
        log3.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span><span>3. Report live on Admin Command Dashboard</span>`;
      }

      await new Promise(r => setTimeout(r, 400));
      progressModal.remove();

      // Show Final Confirmation Modal with Admin Redirect Option
      const confirmModal = document.createElement('div');
      confirmModal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200';
      confirmModal.innerHTML = `
        <div class="bg-surface border border-outline-variant rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
          <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg">
            <span class="material-symbols-outlined text-[36px]">check_circle</span>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Report Dispatched Live</span>
            <h3 class="text-xl font-black text-on-surface">${report.category || 'Landslide'} Incident</h3>
            <span class="text-xs font-mono font-bold text-primary bg-primary-container/20 px-2.5 py-0.5 rounded-full mx-auto mt-0.5">${report.report_code || report.id}</span>
          </div>

          <!-- Metadata Summary Card -->
          <div class="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-3 text-left space-y-1.5 text-xs font-mono">
            <div class="flex justify-between">
              <span class="text-on-surface-variant">Report ID:</span>
              <span class="text-on-surface font-bold">${report.report_code || report.id}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">GPS Location:</span>
              <span class="text-on-surface font-bold">${report.lat.toFixed(4)}°, ${report.lng.toFixed(4)}° (±${report.location_accuracy || 5}m)</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">Status:</span>
              <span class="text-amber-500 font-bold">PENDING VERIFICATION</span>
            </div>
            <div class="flex justify-between">
              <span class="text-on-surface-variant">Dashboard Sync:</span>
              <span class="text-emerald-600 font-bold">REAL-TIME SENT</span>
            </div>
          </div>

          <p class="text-xs text-on-surface-variant leading-relaxed">
            Your evidence photo and GPS telemetry have been received by the Admin Dashboard. Emergency personnel can now review and verify the incident.
          </p>

          <div class="flex flex-col gap-2 w-full pt-1">
            <button id="modal-map-btn" class="w-full py-3.5 bg-primary text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-primary/90 transition flex items-center justify-center gap-1.5 active:scale-98">
              <span class="material-symbols-outlined text-[18px]">map</span>
              <span>View On Live Map</span>
            </button>
            <button id="modal-done-btn" class="w-full py-2.5 bg-surface-container-high text-on-surface font-bold text-xs rounded-xl border border-outline-variant hover:bg-surface-container-highest transition">
              Done
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);

      confirmModal.querySelector('#modal-map-btn').addEventListener('click', () => {
        confirmModal.remove();
        store.navigate('map');
      });
      confirmModal.querySelector('#modal-done-btn').addEventListener('click', () => {
        confirmModal.remove();
        store.navigate('home');
      });
    });
  }
}
