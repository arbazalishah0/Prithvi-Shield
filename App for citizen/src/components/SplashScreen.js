export function renderSplashScreen() {
  return `
    <div id="app-splash-screen" class="fixed inset-0 z-50 bg-[#070a11] text-white flex flex-col items-center justify-center p-6 selection:bg-cyan-500 transition-opacity duration-700">
      <!-- Background Grid & Glow Overlay -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/40 via-[#070a11] to-[#070a11] pointer-events-none"></div>

      <div class="relative z-10 flex flex-col items-center text-center max-w-sm w-full gap-6">
        <!-- Glowing Logo Ring -->
        <div class="relative flex items-center justify-center">
          <div class="absolute w-36 h-36 rounded-full bg-cyan-500/20 animate-ping opacity-60"></div>
          <div class="absolute w-28 h-28 rounded-full bg-blue-600/30 blur-md"></div>
          
          <img src="/logo.jpg" alt="PRITHVI-SHIELD Logo" class="relative z-10 w-24 h-24 object-contain rounded-2xl shadow-2xl border-2 border-cyan-400/40 drop-shadow-[0_0_20px_rgba(0,229,255,0.4)]" />
        </div>

        <!-- App Branding Titles -->
        <div class="flex flex-col gap-1.5">
          <h1 class="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            PRITHVI-SHIELD
          </h1>
          <p class="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
            AI-POWERED LANDSLIDE RISK MONITORING & RESCUE SYSTEM
          </p>
          <div class="h-0.5 w-12 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto my-1"></div>
          <p class="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            Protecting Today. Saving Tomorrow.
          </p>
        </div>

        <!-- Animated Loading Bar -->
        <div class="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden shadow-inner mt-4">
          <div id="splash-progress-bar" class="bg-gradient-to-r from-cyan-500 to-blue-600 h-full w-0 transition-all duration-300 rounded-full"></div>
        </div>

        <span class="text-[11px] text-slate-500 font-mono animate-pulse">Initializing GIS Telemetry & AI Engines...</span>
      </div>
    </div>
  `;
}

export function initSplashScreen(onComplete) {
  const progressBar = document.getElementById('splash-progress-bar');
  const splashScreen = document.getElementById('app-splash-screen');

  if (!splashScreen) {
    if (onComplete) onComplete();
    return;
  }

  let width = 0;
  const interval = setInterval(() => {
    width += 10;
    if (progressBar) progressBar.style.width = width + '%';

    if (width >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        splashScreen.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
          splashScreen.remove();
          if (onComplete) onComplete();
        }, 700);
      }, 300);
    }
  }, 120);
}
