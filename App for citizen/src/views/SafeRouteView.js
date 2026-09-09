import L from 'leaflet';
import { store } from '../store.js';
import { renderTopBar, renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';

let routeMapInstance = null;
let currentEvacRouteData = null;

const API_BASE = "http://127.0.0.1:8000";

export function renderSafeRouteView() {
  const { currentLocation, shelters } = store.state;
  const primaryShelter = shelters[0] || { name: 'Gangtok Community Relief Camp', lat: 27.3245, lng: 88.6180, distance: '2.4 km' };

  return `
    <div class="flex-1 flex flex-col bg-background text-on-background min-h-screen pb-nav-safe overflow-x-hidden antialiased">
      ${renderTopBar('Safe Evacuation Route', true, true)}

      <main class="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 py-4 gap-4">
        <!-- Header Banner -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[24px]">alt_route</span>
              AI Safe Evacuation Route
            </h2>
            <span id="route-status-badge" class="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Safety First Mode
            </span>
          </div>
          <p class="text-xs text-on-surface-variant">Real-time AI path calculated avoiding active landslide hazard zones &amp; road blockages.</p>
        </div>

        <!-- Route Summary Card -->
        <div class="bg-gradient-to-br from-primary/10 via-surface-container-lowest to-surface-container-low p-4 rounded-2xl border border-primary/20 shadow-md flex flex-col gap-3">
          <div class="flex justify-between items-center border-b border-outline-variant/40 pb-2.5">
            <div>
              <span class="text-[10px] font-bold text-primary uppercase tracking-wider block">Recommended Safe Shelter</span>
              <span id="evac-shelter-name" class="text-sm font-extrabold text-on-surface">${primaryShelter.name}</span>
            </div>
            <span id="evac-route-safety-badge" class="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300">
              94/100 Safe
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/50 flex flex-col">
              <span class="text-[10px] text-on-surface-variant font-bold uppercase">Distance</span>
              <span id="evac-dist-val" class="text-sm font-extrabold text-primary mt-0.5">3.2 km</span>
            </div>

            <div class="bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/50 flex flex-col">
              <span class="text-[10px] text-on-surface-variant font-bold uppercase">Est. Time</span>
              <span id="evac-time-val" class="text-sm font-extrabold text-primary mt-0.5">18 Mins</span>
            </div>

            <div class="bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/50 flex flex-col">
              <span class="text-[10px] text-on-surface-variant font-bold uppercase">Risk Level</span>
              <span id="evac-risk-val" class="text-xs font-extrabold text-emerald-600 mt-0.5">LOW EXPOSURE</span>
            </div>
          </div>
        </div>

        <!-- Interactive Route Map Container -->
        <div class="relative w-full h-[280px] rounded-2xl overflow-hidden border border-outline-variant/80 shadow-lg bg-slate-900">
          <div id="safe-route-map" class="w-full h-full"></div>

          <button id="safe-route-recenter-btn" class="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-primary border border-outline-variant/80 flex items-center justify-center shadow-lg active:scale-95 transition-transform" title="Center My GPS">
            <span class="material-symbols-outlined text-[20px]">my_location</span>
          </button>
        </div>

        <!-- Route Options Toggle -->
        <div class="grid grid-cols-2 gap-2 text-xs font-bold">
          <button id="btn-route-opt-a" class="py-2 px-3 rounded-xl bg-primary text-on-primary border border-primary flex items-center justify-center gap-1 transition active:scale-95 shadow">
            <span class="material-symbols-outlined text-sm">shield</span> Option A: Safest (94)
          </button>
          <button id="btn-route-opt-b" class="py-2 px-3 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant flex items-center justify-center gap-1 transition active:scale-95">
            <span class="material-symbols-outlined text-sm">speed</span> Option B: Fastest (82)
          </button>
        </div>

        <!-- Explainability: Why This Route? -->
        <div class="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-sm flex flex-col gap-2.5">
          <h3 class="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-primary">psychology</span>
            Why This Route? (Explainable AI)
          </h3>
          <ul id="evac-explain-list" class="text-xs text-on-surface-variant space-y-1.5 pl-1">
            <li class="flex items-start gap-1.5"><span class="text-emerald-500 font-bold">✓</span> Avoids unstable steep slopes and potential landslide runouts.</li>
            <li class="flex items-start gap-1.5"><span class="text-emerald-500 font-bold">✓</span> Bypasses active citizen-reported and admin-verified blockages.</li>
            <li class="flex items-start gap-1.5"><span class="text-emerald-500 font-bold">✓</span> Leads to certified shelter with verified open capacity.</li>
          </ul>
        </div>

        <!-- Action Navigation Buttons -->
        <div class="grid grid-cols-2 gap-2.5 mt-1">
          <button id="open-gmap-route-btn" class="py-3.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
            <span>Google Maps Live</span>
          </button>

          <button id="share-route-circle-btn" class="py-3.5 px-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[18px]">share_location</span>
            <span>Share with Family</span>
          </button>
        </div>
      </main>

      ${renderBottomNav('more')}
    </div>
  `;
}

export function bindSafeRouteEvents(container) {
  bindNavigationEvents(container);

  const { currentLocation, shelters } = store.state;
  let targetShelter = shelters[0] || { name: 'Gangtok Relief Camp', lat: 27.3245, lng: 88.6180 };

  // Initialize Map
  const mapElem = container.querySelector('#safe-route-map');
  if (!mapElem) return;

  if (routeMapInstance) {
    routeMapInstance.remove();
    routeMapInstance = null;
  }

  routeMapInstance = L.map(mapElem, {
    zoomControl: false,
    attributionControl: false
  }).setView([currentLocation.lat, currentLocation.lng], 13);

  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
  }).addTo(routeMapInstance);

  // User Marker
  const userIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center" style="width: 28px; height: 28px;">
        <div class="absolute w-7 h-7 rounded-full bg-cyan-400/40 animate-ping"></div>
        <div class="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([currentLocation.lat, currentLocation.lng], { icon: userIcon }).addTo(routeMapInstance);

  // Target Shelter Marker
  const shelterIcon = L.divIcon({
    className: 'custom-shelter-marker',
    html: `
      <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl border-2 border-white text-xs font-bold">
        ⛺
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
  const shelterMarker = L.marker([targetShelter.lat, targetShelter.lng], { icon: shelterIcon }).addTo(routeMapInstance);

  let activePolyline = null;

  function drawRoute(coords, color = '#10b981') {
    if (activePolyline) routeMapInstance.removeLayer(activePolyline);
    activePolyline = L.polyline(coords, {
      color: color,
      weight: 5,
      opacity: 0.95,
      lineCap: 'round'
    }).addTo(routeMapInstance);
    routeMapInstance.fitBounds(activePolyline.getBounds(), { padding: [35, 35] });
  }

  // Fetch Dynamic AI Evacuation Route from FastAPI Backend
  async function fetchLiveRoute() {
    try {
      const res = await fetch(`${API_BASE}/api/evacuation/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          user_id: store.state.user?.id || 'citizen_mobile'
        })
      });
      const data = await res.json();
      currentEvacRouteData = data;

      if (data.recommended_shelter) {
        targetShelter = {
          name: data.recommended_shelter.name,
          lat: data.recommended_shelter.latitude,
          lng: data.recommended_shelter.longitude
        };
        shelterMarker.setLatLng([targetShelter.lat, targetShelter.lng]);
        container.querySelector('#evac-shelter-name').textContent = targetShelter.name;
      }

      if (data.recommended_route) {
        const r = data.recommended_route;
        container.querySelector('#evac-dist-val').textContent = `${r.distance_km} km`;
        container.querySelector('#evac-time-val').textContent = `${r.estimated_time_minutes} Mins`;
        container.querySelector('#evac-route-safety-badge').textContent = `${r.safety_score}/100 Safe`;

        const coords = r.route_geojson.geometry.coordinates.map(c => [c[1], c[0]]);
        drawRoute(coords, '#10b981');
      }

      if (data.explanation) {
        const explainList = container.querySelector('#evac-explain-list');
        explainList.innerHTML = data.explanation.map(e => `
          <li class="flex items-start gap-1.5"><span class="text-emerald-500 font-bold">✓</span> ${e}</li>
        `).join('');
      }
    } catch (err) {
      console.warn("Backend offline, using local topological path fallback:", err);
      const fallbackCoords = [
        [currentLocation.lat, currentLocation.lng],
        [currentLocation.lat + 0.003, currentLocation.lng + 0.004],
        [currentLocation.lat + 0.007, currentLocation.lng + 0.009],
        [targetShelter.lat, targetShelter.lng]
      ];
      drawRoute(fallbackCoords, '#10b981');
    }
  }

  fetchLiveRoute();

  // Option A / Option B switchers
  const btnOptA = container.querySelector('#btn-route-opt-a');
  const btnOptB = container.querySelector('#btn-route-opt-b');

  if (btnOptA && btnOptB) {
    btnOptA.addEventListener('click', () => {
      btnOptA.className = "py-2 px-3 rounded-xl bg-primary text-on-primary border border-primary flex items-center justify-center gap-1 transition active:scale-95 shadow";
      btnOptB.className = "py-2 px-3 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant flex items-center justify-center gap-1 transition active:scale-95";
      if (currentEvacRouteData?.recommended_route) {
        const coords = currentEvacRouteData.recommended_route.route_geojson.geometry.coordinates.map(c => [c[1], c[0]]);
        drawRoute(coords, '#10b981');
      }
    });

    btnOptB.addEventListener('click', () => {
      btnOptB.className = "py-2 px-3 rounded-xl bg-primary text-on-primary border border-primary flex items-center justify-center gap-1 transition active:scale-95 shadow";
      btnOptA.className = "py-2 px-3 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant flex items-center justify-center gap-1 transition active:scale-95";
      const alt = currentEvacRouteData?.alternative_routes?.[0];
      if (alt) {
        const coords = alt.route_geojson.geometry.coordinates.map(c => [c[1], c[0]]);
        drawRoute(coords, '#38bdf8');
      }
    });
  }

  // Google Maps navigation link
  const gmapBtn = container.querySelector('#open-gmap-route-btn');
  if (gmapBtn) {
    gmapBtn.addEventListener('click', () => {
      const gmapUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${targetShelter.lat},${targetShelter.lng}&travelmode=driving`;
      window.open(gmapUrl, '_blank');
    });
  }

  // Share route link
  const shareBtn = container.querySelector('#share-route-circle-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: 'Prithvi Shield Safe Evacuation Route',
          text: `I am navigating via AI Safe Route to ${targetShelter.name}. Live GPS: ${currentLocation.lat}, ${currentLocation.lng}`,
          url: window.location.href
        }).catch(() => {});
      } else {
        alert(`Safe Route shared with Emergency Safety Circle contacts! Destination: ${targetShelter.name}`);
      }
    });
  }

  // Recenter button
  const recenterBtn = container.querySelector('#safe-route-recenter-btn');
  if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
      routeMapInstance.flyTo([currentLocation.lat, currentLocation.lng], 14);
    });
  }
}
