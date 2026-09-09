import confetti from 'canvas-confetti';
import { store } from '../store.js';
import { renderTopBar } from '../components/Navigation.js';

export function renderAIVerificationView() {
  const { pendingReport } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen overflow-y-auto">
      <!-- Custom Header -->
      <header class="bg-surface sticky top-0 z-40 flex justify-between items-center w-full px-4 h-14 border-b border-outline-variant/60 shadow-sm">
        <button id="verify-back-btn" class="w-10 h-10 -ml-1 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high rounded-full transition-transform active:scale-95">
          <span class="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div class="flex-1 text-center font-bold text-primary text-lg">
          AI Hazard Verification
        </div>
        <div class="w-10"></div>
      </header>

      <main class="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 py-5 gap-5">
        <!-- AI Vision Computer Scanner Container -->
        <section class="relative w-full rounded-2xl overflow-hidden shadow-xl border border-outline-variant bg-surface-container-highest">
          <div class="relative h-[320px] w-full bg-slate-900">
            <!-- Captured Photo -->
            <img class="w-full h-full object-cover" 
                 src="${pendingReport.evidencePhoto || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnPOoo9P23syYg1w-SxSr6sZG6SSLdTI65ri16kRNg5yJ1ZSfMHTn0ZaT7Wpp2UbqKw5OV-FOKGs_UcPQVbNPb1wjn7fWrBfprwl8zRdODYfmLAY96qVKI80MNSSsg8e3cuwKEt2mCwPtlsxoFjy9kQJfW1EreXkVvrZcj6UF-lkYC_tYwFD4_wnQk-_Ohxg3Tt7C0YtFi-o57Zn5QxIgIGMn9sg2cBcNDj3VGoMQuhQ8Xdl09f872lQ'}" 
                 alt="AI Hazard Scan" />

            <!-- AI Laser Scanline -->
            <div class="ai-scan-line"></div>

            <!-- Bounding Box Overlay with Corner Accents -->
            <div class="absolute top-[20%] left-[15%] w-[70%] h-[55%] border-2 border-error rounded-lg bg-error/15 flex flex-col justify-between shadow-[0_0_15px_rgba(186,26,26,0.5)]">
              <!-- Corner Crosshairs -->
              <div class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-4 border-l-4 border-error"></div>
              <div class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-4 border-r-4 border-error"></div>
              <div class="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-4 border-l-4 border-error"></div>
              <div class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-4 border-r-4 border-error"></div>

              <!-- Confidence Floating Label -->
              <div class="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-error text-white px-3.5 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap shadow-lg border border-white/20">
                <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">warning</span>
                <span class="text-xs font-bold">${pendingReport.category} (${pendingReport.aiConfidence || 92}%)</span>
              </div>
            </div>
          </div>

          <!-- Scanner Metadata Telemetry Bar -->
          <div class="bg-surface-container-lowest flex justify-between items-center px-4 py-3 border-t border-outline-variant/60">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[18px]">verified</span>
              <span class="text-xs font-bold text-on-surface">Computer Vision: High Confidence</span>
            </div>
            <div class="flex items-center gap-1.5 text-on-surface-variant">
              <span class="material-symbols-outlined text-[16px] text-emerald-600">my_location</span>
              <span class="text-xs font-semibold text-emerald-700">GPS Calibrated</span>
            </div>
          </div>
        </section>

        <!-- Prompt Content -->
        <section class="flex flex-col gap-2 text-center px-2">
          <h2 class="text-2xl font-extrabold text-on-surface">Confirm Hazard Intelligence?</h2>
          <p class="text-sm text-on-surface-variant leading-relaxed">
            SafeGround AI verified a severe <strong>${pendingReport.category}</strong>. Confirming will notify civil defense dispatchers and update the live safety map for all nearby citizens.
          </p>
        </section>

        <!-- Action Buttons -->
        <section class="flex flex-col gap-3 mt-auto pb-6">
          <button id="verify-confirm-btn" class="w-full py-4 bg-error text-on-error font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-[#93000a] active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[22px]">check_circle</span>
            Yes, Confirm & Broadcast Report
          </button>
          
          <button id="verify-reclassify-btn" class="w-full py-3.5 bg-surface-container-high text-on-surface font-bold text-sm rounded-2xl flex items-center justify-center gap-2 border border-outline-variant hover:bg-surface-container-highest active:scale-98 transition-colors">
            <span class="material-symbols-outlined text-[20px]">refresh</span>
            No, Re-classify / Retake Photo
          </button>
        </section>
      </main>
    </div>
  `;
}

export function bindAIVerificationEvents(container) {
  const backBtn = container.querySelector('#verify-back-btn');
  if (backBtn) backBtn.addEventListener('click', () => store.navigate('report'));

  const reclassifyBtn = container.querySelector('#verify-reclassify-btn');
  if (reclassifyBtn) reclassifyBtn.addEventListener('click', () => store.navigate('report'));

  const confirmBtn = container.querySelector('#verify-confirm-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // Trigger celebratory confetti effect
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      // Submit hazard into global store
      store.submitHazardReport({
        category: store.state.pendingReport.category,
        description: store.state.pendingReport.details
      });

      // Jump to map to see the new pin
      setTimeout(() => {
        store.navigate('map');
      }, 500);
    });
  }
}
