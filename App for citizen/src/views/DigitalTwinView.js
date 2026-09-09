import { store } from '../store.js';
import { renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

export function renderDigitalTwinView() {
  const { twinTelemetry, hazards } = store.state;

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-nav-safe overflow-hidden antialiased">
      <!-- TopAppBar with WindowInsets Protection -->
      <header class="w-full bg-surface-container-lowest border-b border-outline-variant/60 sticky top-0 z-40 pt-safe">
        <div class="flex justify-between items-center px-4 h-14 w-full">
          <div class="flex items-center gap-2">
            <button id="twin-back-btn" class="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-primary hover:bg-surface-container-high transition-transform active:scale-95">
              <span class="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <h1 class="text-base font-extrabold text-primary tracking-tight flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">monitoring</span>
              GIS Digital Twin
            </h1>
          </div>
          <div class="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>GIS Sync Active</span>
          </div>
        </div>
      </header>

      <!-- Main GIS Heat Map Interactive Screen -->
      <main class="flex-1 relative w-full h-[calc(100vh-120px)] flex flex-col">
        <!-- Interactive Leaflet / GIS Canvas -->
        <div id="twin-gis-map" class="absolute inset-0 z-0 w-full h-full bg-slate-900"></div>

        <!-- GIS Layer Controls & Overlay Panel -->
        <div class="relative z-10 p-3.5 flex flex-col justify-between h-full pointer-events-none">

          <!-- Top Architecture Integration Header -->
          <div class="pointer-events-auto bg-slate-900/90 text-white backdrop-blur-md rounded-2xl border border-slate-800 p-3 shadow-xl flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <span class="material-symbols-outlined text-[20px]">layers</span>
              </div>
              <div>
                <p class="text-xs font-bold text-white">GIS Heat Map & Satellite Integration</p>
                <p class="text-[10px] text-slate-400">Satellite + Weather + Citizen Reports + AI Model</p>
              </div>
            </div>
            <span class="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
              HIGH RISK
            </span>
          </div>

          <!-- Bottom Telemetry & GIS Heatmap Sector Inspector -->
          <div class="pointer-events-auto flex flex-col gap-2.5">

            <!-- GIS Risk Scale Legend -->
            <div class="bg-slate-900/90 text-white backdrop-blur-md rounded-2xl p-2.5 border border-slate-800 shadow-xl flex items-center justify-between text-[11px] font-bold">
              <span class="text-slate-400 uppercase tracking-wider text-[10px]">GIS Scale:</span>
              <div class="flex items-center gap-2">
                <span class="flex items-center gap-1 text-emerald-400"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> LOW</span>
                <span class="flex items-center gap-1 text-amber-400"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> MODERATE</span>
                <span class="flex items-center gap-1 text-orange-400"><span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span> HIGH</span>
                <span class="flex items-center gap-1 text-red-400"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> CRITICAL</span>
              </div>
            </div>

            <!-- GIS Sector Click Inspector Modal / Details -->
            <div id="twin-sector-card" class="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-2xl flex flex-col gap-3 transition-all duration-300">
              <div class="flex justify-between items-start border-b border-slate-800 pb-2">
                <div>
                  <h3 id="twin-sector-title" class="text-sm font-bold text-white leading-tight">Sector 4 - Western Ridge</h3>
                  <span id="twin-sector-subtitle" class="text-[10px] text-slate-400 font-mono">Lat: 34.0522°, Lng: -118.2437°</span>
                </div>
                <span id="twin-sector-risk-badge" class="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase">
                  HIGH RISK (78%)
                </span>
              </div>

              <!-- Metric Grid -->
              <div class="grid grid-cols-3 gap-2 text-center text-xs">
                <div class="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                  <span class="text-[10px] text-slate-400 font-bold block uppercase">Rainfall</span>
                  <span id="twin-sector-rain" class="font-extrabold text-cyan-300">120 mm</span>
                </div>

                <div class="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                  <span class="text-[10px] text-slate-400 font-bold block uppercase">Slope</span>
                  <span id="twin-sector-slope" class="font-extrabold text-amber-300">35°</span>
                </div>

                <div class="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                  <span class="text-[10px] text-slate-400 font-bold block uppercase">Reports</span>
                  <span id="twin-sector-reports" class="font-extrabold text-red-400">4 Nearby</span>
                </div>
              </div>

              <button id="twin-report-hazard-btn" class="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">report_problem</span>
                Report Hazard in this Sector
              </button>
            </div>
          </div>
        </div>
      </main>

      ${renderBottomNav('more')}
    </div>
  `;
}

export function bindDigitalTwinEvents(container) {
  bindNavigationEvents(container);

  const backBtn = container.querySelector('#twin-back-btn');
  if (backBtn) backBtn.addEventListener('click', () => store.goBack());

  const reportBtn = container.querySelector('#twin-report-hazard-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => store.navigate('report'));
  }

  // Initialize GIS Heatmap Leaflet Canvas
  const mapElement = container.querySelector('#twin-gis-map');
  if (!mapElement) return;

  import('leaflet').then((L) => {
    const { currentLocation, hazards } = store.state;

    const gisMap = L.map(mapElement, {
      zoomControl: false,
      attributionControl: false
    }).setView([currentLocation.lat, currentLocation.lng], 14);

    // Google Maps Satellite / Hybrid tiles for Digital Twin GIS
    L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Earth / Satellite GIS'
    }).addTo(gisMap);

    // GIS Heatmap Circles (RED, ORANGE, YELLOW, GREEN)
    const riskSectors = [
      { lat: currentLocation.lat + 0.003, lng: currentLocation.lng - 0.002, color: '#ef4444', risk: 'CRITICAL', score: '92%', rain: '145mm', slope: '38°', reports: 5, name: 'Sector 1 - Red Slope Zone' },
      { lat: currentLocation.lat - 0.002, lng: currentLocation.lng + 0.003, color: '#f97316', risk: 'HIGH', score: '78%', rain: '120mm', slope: '35°', reports: 4, name: 'Sector 4 - Western Ridge' },
      { lat: currentLocation.lat + 0.005, lng: currentLocation.lng + 0.004, color: '#eab308', risk: 'MODERATE', score: '54%', rain: '85mm', slope: '22°', reports: 1, name: 'Sector 2 - East Slope' },
      { lat: currentLocation.lat - 0.004, lng: currentLocation.lng - 0.003, color: '#10b981', risk: 'LOW', score: '18%', rain: '20mm', slope: '12°', reports: 0, name: 'Sector 3 - Valley Floor (Safe Zone)' }
    ];

    riskSectors.forEach(sec => {
      L.circle([sec.lat, sec.lng], {
        color: sec.color,
        fillColor: sec.color,
        fillOpacity: 0.45,
        radius: 400
      }).addTo(gisMap).on('click', () => {
        const title = container.querySelector('#twin-sector-title');
        const subtitle = container.querySelector('#twin-sector-subtitle');
        const badge = container.querySelector('#twin-sector-risk-badge');
        const rain = container.querySelector('#twin-sector-rain');
        const slope = container.querySelector('#twin-sector-slope');
        const reports = container.querySelector('#twin-sector-reports');

        if (title) title.textContent = sec.name;
        if (subtitle) subtitle.textContent = `Lat: ${sec.lat.toFixed(4)}°, Lng: ${sec.lng.toFixed(4)}°`;
        if (badge) {
          badge.textContent = `${sec.risk} RISK (${sec.score})`;
          badge.className = `text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${
            sec.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            sec.risk === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
            sec.risk === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
            'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`;
        }
        if (rain) rain.textContent = sec.rain;
        if (slope) slope.textContent = sec.slope;
        if (reports) reports.textContent = `${sec.reports} Nearby`;
      });
    });
  });
}
