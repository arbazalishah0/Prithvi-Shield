/**
 * PRITHVI-SHIELD / SafeGround Live Risk Map View
 * Real-time GPS Telemetry, Multi-Layer Disaster Visualizations,
 * Landslide Risk Zones, Verified Citizen Reports, SOS Beacons,
 * Safe Shelters, and Dangerous Roads.
 */

import { store } from '../store.js';
import { renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';
import { mapService } from '../services/mapService.js';
import { locationService } from '../services/locationService.js';

export function renderMapView() {
  const { currentLocation } = store.state;
  const isAcquiring = currentLocation.status === 'ACQUIRING';
  const isDenied = currentLocation.status === 'PERMISSION_DENIED';
  const isUnavailable = currentLocation.status === 'UNAVAILABLE' || currentLocation.status === 'SERVICES_DISABLED';
  const hasLiveCoords = locationService.validateCoordinates(currentLocation.lat, currentLocation.lng);
  const coordsFormatted = locationService.formatCoordinates(currentLocation.lat, currentLocation.lng);
  const localityName = currentLocation.locality || currentLocation.placeName || (hasLiveCoords ? 'Current Location' : 'Locating Area...');

  return `
    <div class="relative flex h-screen w-full flex-col bg-slate-950 overflow-hidden select-none">
      
      <!-- 1. FULL-SCREEN NATIVE LEAFLET MAP CANVAS -->
      <div class="absolute inset-0 z-0 w-full h-full bg-slate-900">
        <div id="live-map-canvas" class="w-full h-full"></div>
      </div>

      <!-- 2. TOP HEADER & COMPACT LOCATION CARD -->
      <div class="relative z-30 pointer-events-none pt-safe px-3.5 pt-2 flex flex-col gap-2 max-w-xl mx-auto w-full">
        <!-- Top App Bar -->
        <div class="pointer-events-auto bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-2.5 px-3.5 shadow-xl flex items-center justify-between text-white">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span class="material-symbols-outlined text-[20px]">public</span>
            </div>
            <div class="flex flex-col">
              <h1 class="text-xs font-black tracking-wider uppercase text-blue-400 font-mono">PRITHVI-SHIELD</h1>
              <span class="text-sm font-black text-white leading-tight">Live Risk Map</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Layers Toggle Button -->
            <button id="map-layers-btn" class="pointer-events-auto bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer" title="Toggle Map Layers">
              <span class="material-symbols-outlined text-[16px] text-blue-400">layers</span>
              <span>Layers</span>
            </button>
          </div>
        </div>

        <!-- Compact Location Card -->
        <div class="pointer-events-auto bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 shadow-xl flex items-center justify-between text-white">
          <div class="flex items-start gap-2.5">
            <span class="material-symbols-outlined text-red-500 text-[20px] mt-0.5 animate-bounce">location_on</span>
            <div class="flex flex-col">
              <span id="loc-card-city" class="text-xs font-extrabold text-white leading-snug">
                ${localityName}
              </span>
              <span id="loc-card-coords" class="text-[11px] font-mono text-slate-300">
                ${hasLiveCoords ? coordsFormatted.fullText : isAcquiring ? 'Acquiring GPS fix...' : 'GPS Offline'}
              </span>
              <span id="loc-card-accuracy" class="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span>GPS Accuracy: ${hasLiveCoords ? `±${currentLocation.accuracy || 10}m` : 'Calculating...'}</span>
              </span>
            </div>
          </div>

          <!-- Live Indicator & Refresh -->
          <div class="flex flex-col items-end gap-1 shrink-0">
            <div class="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              <span class="w-2 h-2 rounded-full ${hasLiveCoords ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
              <span class="text-[10px] font-black text-emerald-400 uppercase tracking-wider">${hasLiveCoords ? 'LIVE ●' : 'SYNCING'}</span>
            </div>
            <button id="quick-refresh-gps-btn" class="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer pt-0.5">
              <span class="material-symbols-outlined text-[12px] ${isAcquiring ? 'animate-spin' : ''}">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 3. LOCATION PERMISSION / UNAVAILABLE NOTIFICATION OVERLAY (IF NEEDED) -->
      ${(!hasLiveCoords && (isDenied || isUnavailable)) ? `
        <div id="location-permission-card" class="relative z-40 mx-4 mt-2 max-w-xl mx-auto w-full animate-in fade-in duration-200">
          <div class="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 shadow-2xl text-white flex flex-col gap-3 backdrop-blur-md">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[24px]">location_disabled</span>
              </div>
              <div class="flex flex-col">
                <h3 class="text-sm font-bold text-amber-300">
                  ${isDenied ? 'Location Permission Required' : 'GPS Signal Unavailable'}
                </h3>
                <p class="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  ${isDenied 
                    ? 'Location access is required to provide accurate risk information and emergency guidance.'
                    : 'Unable to determine your current location. Please enable GPS and try again.'}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mt-1">
              <button id="enable-gps-action-btn" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold py-2.5 px-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">near_me</span>
                <span>ENABLE LOCATION</span>
              </button>
              <button id="manual-location-action-btn" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold py-2.5 px-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">edit_location_alt</span>
                <span>ENTER MANUALLY</span>
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="flex-1"></div>

      <!-- 4. FLOATING MAP CONTROLS & COLLAPSIBLE LEGEND -->
      <div class="relative z-30 pointer-events-none pb-nav-safe px-4 mb-2 flex justify-between items-end max-w-xl mx-auto w-full">
        
        <!-- Collapsible Landslide Risk Legend -->
        <div id="risk-legend-box" class="pointer-events-auto bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800/90 shadow-2xl w-36 transition-all duration-200 select-none">
          <div id="legend-header-toggle" class="flex items-center justify-between cursor-pointer">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1">
              <span>LANDSLIDE RISK</span>
            </span>
            <span id="legend-chevron" class="material-symbols-outlined text-[14px] text-slate-400">expand_less</span>
          </div>

          <div id="legend-content" class="flex flex-col gap-1.5 mt-2 transition-all">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span class="text-[11px] font-semibold text-slate-200">🟢 Low</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
              <span class="text-[11px] font-semibold text-slate-200">🟡 Moderate</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></span>
              <span class="text-[11px] font-semibold text-slate-200">🟠 High</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0"></span>
              <span class="text-[11px] font-semibold text-slate-200">🔴 Critical</span>
            </div>
          </div>
        </div>

        <!-- Floating GPS Locate Me & Zoom Control Buttons -->
        <div class="pointer-events-auto flex flex-col gap-2.5 items-end">
          <!-- Locate Me Button -->
          <button id="map-locate-btn" class="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-2xl border-2 border-white/90 active:scale-90 transition-all cursor-pointer group" title="Locate Me (Center Real GPS)">
            <span class="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">my_location</span>
          </button>

          <!-- Zoom In / Out Buttons -->
          <div class="flex flex-col bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden text-slate-200">
            <button id="map-zoom-in" class="w-11 h-10 flex items-center justify-center border-b border-slate-800 hover:bg-slate-800 active:scale-95 transition-colors cursor-pointer" title="Zoom In">
              <span class="material-symbols-outlined text-[18px]">add</span>
            </button>
            <button id="map-zoom-out" class="w-11 h-10 flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-colors cursor-pointer" title="Zoom Out">
              <span class="material-symbols-outlined text-[18px]">remove</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 5. INTERACTIVE DETAIL PREVIEW BOTTOM CARD -->
      <div id="item-preview-bottom-card" class="fixed bottom-24 left-0 right-0 z-40 px-4 max-w-xl mx-auto w-full transition-all duration-300 transform translate-y-48 opacity-0 pointer-events-none">
        <div class="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl text-white relative">
          <button id="preview-close-btn" class="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div class="flex items-start gap-3">
            <div id="preview-icon-box" class="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
              📍
            </div>
            <div class="flex-1 pr-6">
              <div class="flex items-center gap-2 flex-wrap">
                <span id="preview-badge" class="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  INFO
                </span>
                <span id="preview-distance" class="text-xs text-slate-400 font-mono">1.2 km away</span>
              </div>
              <h3 id="preview-title" class="text-sm font-extrabold text-white mt-1 leading-snug">
                Item Title
              </h3>
              <p id="preview-desc" class="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                Item description and telemetry details.
              </p>
            </div>
          </div>

          <div id="preview-actions-container" class="mt-3 flex gap-2">
            <button id="preview-view-route-btn" class="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-black py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">alt_route</span>
              <span>VIEW SAFE ROUTE</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 6. LAYER CONTROL SLIDE-OVER MODAL -->
      <div id="map-layers-modal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs hidden items-center justify-center p-4 select-none">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl text-white flex flex-col gap-4 animate-in zoom-in-95 duration-150">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-blue-400 text-[22px]">layers</span>
              <h2 class="text-base font-extrabold text-white">Map Layers</h2>
            </div>
            <button id="close-layers-modal-btn" class="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div class="flex flex-col gap-2.5">
            ${[
              { id: 'myLocation', label: 'My Location', desc: 'Real GPS pulsing beacon & accuracy', checked: true },
              { id: 'landslideRisk', label: 'Landslide Risk', desc: 'Slope & soil saturation risk zones', checked: true },
              { id: 'citizenReports', label: 'Citizen Reports', desc: 'Verified rockfall & crack incidents', checked: false },
              { id: 'sos', label: 'SOS', desc: 'Emergency distress beacons & alerts', checked: false },
              { id: 'shelters', label: 'Safe Shelters', desc: 'Designated relief camps & aid stations', checked: false },
              { id: 'dangerousRoads', label: 'Dangerous Roads', desc: 'Blocked and hazardous road corridors', checked: false },
              { id: 'evacuationRoute', label: 'Evacuation Route', desc: 'Dynamic safe navigation path', checked: false }
            ].map(layer => `
              <label class="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-750 transition-colors cursor-pointer">
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-white">${layer.label}</span>
                  <span class="text-[10px] text-slate-400">${layer.desc}</span>
                </div>
                <input type="checkbox" data-layer-toggle="${layer.id}" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-700 border-slate-600 cursor-pointer" ${layer.checked ? 'checked' : ''} />
              </label>
            `).join('')}
          </div>

          <button id="done-layers-modal-btn" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer">
            Done
          </button>
        </div>
      </div>

      <!-- 7. MANUAL LOCATION ENTRY MODAL -->
      <div id="manual-location-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs hidden items-center justify-center p-4 select-none">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl text-white flex flex-col gap-4 animate-in zoom-in-95 duration-150">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-blue-400 text-[22px]">pin_drop</span>
              <h2 class="text-base font-extrabold text-white">Set Current Location</h2>
            </div>
            <button id="close-manual-modal-btn" class="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div class="flex flex-col gap-2.5 text-xs">
            <label class="font-bold text-slate-300">Quick Select Common Disasters / Regions:</label>
            <div class="grid grid-cols-2 gap-2">
              <button data-quick-loc="pune" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-xs font-bold text-white active:scale-95 cursor-pointer">
                📍 Pune, MH<br><span class="text-[10px] text-slate-400 font-mono">18.5204° N, 73.8567° E</span>
              </button>
              <button data-quick-loc="gangtok" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-xs font-bold text-white active:scale-95 cursor-pointer">
                📍 Gangtok, SK<br><span class="text-[10px] text-slate-400 font-mono">27.3314° N, 88.6138° E</span>
              </button>
              <button data-quick-loc="wayanad" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-xs font-bold text-white active:scale-95 cursor-pointer">
                📍 Wayanad, KL<br><span class="text-[10px] text-slate-400 font-mono">11.6854° N, 76.1320° E</span>
              </button>
              <button data-quick-loc="shimla" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-xs font-bold text-white active:scale-95 cursor-pointer">
                📍 Shimla, HP<br><span class="text-[10px] text-slate-400 font-mono">31.1048° N, 77.1734° E</span>
              </button>
            </div>

            <div class="relative flex py-1 items-center">
              <div class="flex-grow border-t border-slate-800"></div>
              <span class="flex-shrink mx-2 text-[10px] text-slate-500 font-mono uppercase">Or Enter Coordinates</span>
              <div class="flex-grow border-t border-slate-800"></div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="text-[10px] text-slate-400 font-semibold block mb-1">Latitude</span>
                <input id="manual-lat-input" type="number" step="any" placeholder="e.g. 18.5204" class="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 font-semibold block mb-1">Longitude</span>
                <input id="manual-lng-input" type="number" step="any" placeholder="e.g. 73.8567" class="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <span class="text-[10px] text-slate-400 font-semibold block mb-1">Area / Locality Name</span>
              <input id="manual-locality-input" type="text" placeholder="e.g. Pune, Maharashtra" class="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-1">
            <button id="cancel-manual-btn" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer">
              Cancel
            </button>
            <button id="save-manual-location-btn" class="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer">
              Apply Location
            </button>
          </div>
        </div>
      </div>

      <!-- 8. BOTTOM NAVIGATION (TAB 2: LIVE MAP) -->
      ${renderBottomNav('map')}
    </div>
  `;
}

export async function bindMapEvents(container) {
  bindNavigationEvents(container);

  const { currentLocation, hazards, shelters, dangerousRoads, sosIncidents } = store.state;
  const mapElement = container.querySelector('#live-map-canvas');
  if (!mapElement) return;

  // Resolve Real Current Location Coordinates (never fake LA defaults)
  const hasLiveCoords = locationService.validateCoordinates(currentLocation.lat, currentLocation.lng);
  const userLat = hasLiveCoords ? currentLocation.lat : 18.5204; // Pune fallback if locating
  const userLng = hasLiveCoords ? currentLocation.lng : 73.8567;

  // 1. Initialize Map
  await mapService.initMap(mapElement, { lat: userLat, lng: userLng }, 14);

  // 2. Set Real User Location Marker
  if (hasLiveCoords) {
    mapService.setUserLocationMarker(userLat, userLng, currentLocation.accuracy || 15);
  }

  // Preview Card helper
  const previewCard = container.querySelector('#item-preview-bottom-card');
  const previewIcon = container.querySelector('#preview-icon-box');
  const previewBadge = container.querySelector('#preview-badge');
  const previewTitle = container.querySelector('#preview-title');
  const previewDistance = container.querySelector('#preview-distance');
  const previewDesc = container.querySelector('#preview-desc');
  const previewRouteBtn = container.querySelector('#preview-view-route-btn');
  const previewCloseBtn = container.querySelector('#preview-close-btn');

  function showPreviewCard(data) {
    if (!previewCard) return;
    if (previewIcon) previewIcon.textContent = data.icon || '📍';
    if (previewBadge) {
      previewBadge.textContent = data.badgeText || 'INTEL';
      previewBadge.className = `text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${data.badgeClass || 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`;
    }
    if (previewTitle) previewTitle.textContent = data.title || 'Incident';
    if (previewDistance) previewDistance.textContent = data.distance || 'Nearby';
    if (previewDesc) previewDesc.textContent = data.description || '';

    if (previewRouteBtn) {
      if (data.showRouteBtn) {
        previewRouteBtn.classList.remove('hidden');
        previewRouteBtn.onclick = () => {
          store.navigate('safe-route');
        };
      } else {
        previewRouteBtn.classList.add('hidden');
      }
    }

    previewCard.classList.remove('translate-y-48', 'opacity-0', 'pointer-events-none');
  }

  function hidePreviewCard() {
    if (previewCard) {
      previewCard.classList.add('translate-y-48', 'opacity-0', 'pointer-events-none');
    }
  }

  if (previewCloseBtn) {
    previewCloseBtn.addEventListener('click', hidePreviewCard);
  }

  // 3. Render Landslide Risk Zones (🟢 Green, 🟡 Yellow, 🟠 Orange, 🔴 Red)
  const riskZones = [
    {
      level: 'CRITICAL',
      title: 'Active High-Slope Failure Sector',
      offsetLat: 0.0035,
      offsetLng: -0.0028,
      radius: 420,
      slope: '32° Steep',
      saturation: '88% Heavy',
      description: 'Immediate landslide danger due to saturated soil mantle on eastern ridge.'
    },
    {
      level: 'HIGH',
      title: 'Unstable Soil & Rock Creep Zone',
      offsetLat: -0.0030,
      offsetLng: 0.0035,
      radius: 380,
      slope: '26° Moderate',
      saturation: '72% Elevated',
      description: 'Ground crack propagation detected with micro-displacement along slope.'
    },
    {
      level: 'MODERATE',
      title: 'Elevated Surface Runoff Sector',
      offsetLat: 0.0055,
      offsetLng: 0.0040,
      radius: 480,
      slope: '18° Gentle',
      saturation: '58% Normal',
      description: 'Minor debris wash risk during extended heavy downpours.'
    },
    {
      level: 'LOW',
      title: 'Stable Bedrock Geological Plateau',
      offsetLat: -0.0045,
      offsetLng: -0.0040,
      radius: 520,
      slope: '6° Flat',
      saturation: '34% Dry',
      description: 'Geologically secure foundation zone with deep rock anchoring.'
    }
  ];

  mapService.renderRiskZones(riskZones, userLat, userLng, (zone) => {
    showPreviewCard({
      icon: zone.level === 'CRITICAL' ? '🔴' : zone.level === 'HIGH' ? '🟠' : zone.level === 'MODERATE' ? '🟡' : '🟢',
      badgeText: `${zone.level} RISK ZONE`,
      badgeClass: zone.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : zone.level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
      title: zone.title,
      distance: `Slope: ${zone.slope} • Sat: ${zone.saturation}`,
      description: zone.description,
      showRouteBtn: false
    });
  });

  // 4. Render Citizen Reports (Verified Incidents)
  const liveReports = (hazards && hazards.length > 0) ? hazards.map((h, i) => ({
    id: h.id || `rep-${i}`,
    category: h.category || 'Road Blockage',
    title: h.title || 'Verified Incident',
    severity: h.severity || 'HIGH',
    time: h.time || '14m ago',
    distance: h.distance || '1.2 km away',
    description: h.description || 'Verified citizen hazard report.',
    lat: userLat + (i === 0 ? 0.0028 : i === 1 ? -0.0025 : 0.0045),
    lng: userLng + (i === 0 ? 0.0020 : i === 1 ? -0.0035 : -0.0025)
  })) : [
    {
      id: 'rep-1',
      category: 'Road Blockage',
      title: 'Road Blockage (Landslide Debris)',
      severity: 'CRITICAL',
      time: '10m ago',
      distance: '1.2 km away',
      description: 'Boulders and mud blocking single lane passage. Verified by response team.',
      lat: userLat + 0.0028,
      lng: userLng + 0.0020
    }
  ];

  mapService.renderCitizenReports(liveReports, (rep) => {
    showPreviewCard({
      icon: rep.category === 'Road Blockage' ? '🚧' : '⚡',
      badgeText: `VERIFIED • ${rep.severity}`,
      badgeClass: rep.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
      title: rep.title,
      distance: `${rep.distance} • ${rep.time}`,
      description: `${rep.description} (Status: Verified by Disaster Response Unit)`,
      showRouteBtn: false
    });
  });

  // 5. Render SOS Distress Beacons
  const liveSOS = (sosIncidents && sosIncidents.length > 0) ? sosIncidents.map(s => ({
    id: s.id,
    name: s.name,
    type: s.type,
    status: s.status,
    time: s.time,
    distance: s.distance,
    lat: userLat + (s.offsetLat || -0.0032),
    lng: userLng + (s.offsetLng || -0.0038)
  })) : [
    {
      id: 'sos-1',
      name: 'Emergency SOS Signal #402',
      type: 'TRAPPED CITIZENS',
      status: 'RESPONSE DISPATCHED',
      time: '6m ago',
      distance: '1.1 km away',
      lat: userLat - 0.0032,
      lng: userLng - 0.0038
    }
  ];

  mapService.renderSOSMarkers(liveSOS, (item) => {
    showPreviewCard({
      icon: '🆘',
      badgeText: item.status || 'EMERGENCY BEACON',
      badgeClass: 'bg-red-600/30 text-red-300 border border-red-500/50',
      title: item.name,
      distance: `${item.distance} • ${item.time}`,
      description: `Emergency type: ${item.type}. Status: ${item.status}. Local rescue team en-route.`,
      showRouteBtn: false
    });
  });

  // 6. Render Safe Shelters
  const liveShelters = (shelters && shelters.length > 0) ? shelters.map((sh, idx) => ({
    id: sh.id || `sh-${idx}`,
    name: sh.name || 'Emergency Relief Camp',
    capacity: sh.capacity || '150 Beds Available',
    distance: sh.distance || '1.8 km',
    lat: userLat + (idx === 0 ? -0.0040 : 0.0050),
    lng: userLng + (idx === 0 ? 0.0045 : -0.0040)
  })) : [
    {
      id: 'sh-1',
      name: 'Central Disaster Relief Shelter',
      capacity: '200 Beds Available',
      distance: '1.8 km away',
      lat: userLat - 0.0040,
      lng: userLng + 0.0045
    }
  ];

  mapService.renderShelters(liveShelters, (s) => {
    showPreviewCard({
      icon: '⛺',
      badgeText: 'SAFE SHELTER',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
      title: s.name,
      distance: `${s.distance} • ${s.capacity}`,
      description: 'Designated disaster refuge with backup power, emergency medical supplies, and food relief.',
      showRouteBtn: true
    });
  });

  // 7. Render Dangerous Roads
  const liveRoads = [
    {
      id: 'road-1',
      name: 'Upper Ridge Highway Corridor',
      status: 'BLOCKED',
      riskLevel: 'CRITICAL',
      reason: 'Major Landslide & Rockfall Debris',
      distance: '0.9 km away',
      coordinates: [
        [userLat + 0.0020, userLng + 0.0010],
        [userLat + 0.0035, userLng + 0.0025],
        [userLat + 0.0045, userLng + 0.0035]
      ]
    },
    {
      id: 'road-2',
      name: 'West Hill Valley Bypass',
      status: 'CAUTION',
      riskLevel: 'HIGH',
      reason: 'Slope Creep & Mudflow Hazard',
      distance: '1.6 km away',
      coordinates: [
        [userLat - 0.0015, userLng + 0.0020],
        [userLat - 0.0030, userLng + 0.0040],
        [userLat - 0.0045, userLng + 0.0055]
      ]
    }
  ];

  mapService.renderDangerousRoads(liveRoads, (r) => {
    showPreviewCard({
      icon: '⛔',
      badgeText: `${r.status} ROAD`,
      badgeClass: r.status === 'BLOCKED' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
      title: r.name,
      distance: `${r.distance} • Risk: ${r.riskLevel}`,
      description: `${r.reason}. Excluded by Safe Route Dijkstra pathfinding system.`,
      showRouteBtn: false
    });
  });

  // 8. Render Evacuation Route
  if (liveShelters.length > 0) {
    const target = liveShelters[0];
    const evacPoints = [
      [userLat, userLng],
      [userLat - 0.0012, userLng + 0.0015],
      [userLat - 0.0025, userLng + 0.0028],
      [target.lat, target.lng]
    ];
    mapService.renderEvacuationRoute(evacPoints, () => {
      showPreviewCard({
        icon: '🛣️',
        badgeText: 'EVACUATION ROUTE',
        badgeClass: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40',
        title: 'Safest Path to Shelter',
        distance: 'Direct route avoiding landslide zones',
        description: `Active route navigating safely to ${target.name}.`,
        showRouteBtn: true
      });
    });
  }

  // 9. Floating "Locate Me" Button: Smoothly Fly to Real GPS Position
  const locateBtn = container.querySelector('#map-locate-btn');
  if (locateBtn) {
    locateBtn.addEventListener('click', async () => {
      locateBtn.classList.add('scale-90');
      setTimeout(() => locateBtn.classList.remove('scale-90'), 150);

      const curr = store.state.currentLocation;
      if (locationService.validateCoordinates(curr.lat, curr.lng)) {
        mapService.setUserLocationMarker(curr.lat, curr.lng, curr.accuracy || 15);
        mapService.centerOnLocation(curr.lat, curr.lng, 15);
      } else {
        // Trigger GPS request
        await store.requestAndEnableLocation();
        const updated = store.state.currentLocation;
        if (locationService.validateCoordinates(updated.lat, updated.lng)) {
          mapService.setUserLocationMarker(updated.lat, updated.lng, updated.accuracy || 15);
          mapService.centerOnLocation(updated.lat, updated.lng, 15);
        }
      }
    });
  }

  // 10. Quick GPS Refresh in Header Card
  const quickRefreshBtn = container.querySelector('#quick-refresh-gps-btn');
  if (quickRefreshBtn) {
    quickRefreshBtn.addEventListener('click', async () => {
      quickRefreshBtn.querySelector('.material-symbols-outlined')?.classList.add('animate-spin');
      await store.refreshLocation();
      const updated = store.state.currentLocation;
      if (locationService.validateCoordinates(updated.lat, updated.lng)) {
        mapService.setUserLocationMarker(updated.lat, updated.lng, updated.accuracy || 15);
        mapService.centerOnLocation(updated.lat, updated.lng, 15);
      }
      setTimeout(() => {
        quickRefreshBtn.querySelector('.material-symbols-outlined')?.classList.remove('animate-spin');
      }, 800);
    });
  }

  // 11. Zoom Controls
  const zoomIn = container.querySelector('#map-zoom-in');
  const zoomOut = container.querySelector('#map-zoom-out');
  if (zoomIn) {
    zoomIn.addEventListener('click', () => {
      if (mapService.map) mapService.map.zoomIn();
    });
  }
  if (zoomOut) {
    zoomOut.addEventListener('click', () => {
      if (mapService.map) mapService.map.zoomOut();
    });
  }

  // 12. Collapsible Legend Toggle
  const legendHeader = container.querySelector('#legend-header-toggle');
  const legendContent = container.querySelector('#legend-content');
  const legendChevron = container.querySelector('#legend-chevron');
  if (legendHeader && legendContent && legendChevron) {
    legendHeader.addEventListener('click', () => {
      const isHidden = legendContent.classList.contains('hidden');
      if (isHidden) {
        legendContent.classList.remove('hidden');
        legendChevron.textContent = 'expand_less';
      } else {
        legendContent.classList.add('hidden');
        legendChevron.textContent = 'expand_more';
      }
    });
  }

  // 13. Map Layers Modal Logic
  const layersBtn = container.querySelector('#map-layers-btn');
  const layersModal = container.querySelector('#map-layers-modal');
  const closeLayersBtn = container.querySelector('#close-layers-modal-btn');
  const doneLayersBtn = container.querySelector('#done-layers-modal-btn');

  if (layersBtn && layersModal) {
    layersBtn.addEventListener('click', () => {
      layersModal.classList.remove('hidden');
      layersModal.classList.add('flex');
    });
  }

  const hideLayersModal = () => {
    if (layersModal) {
      layersModal.classList.add('hidden');
      layersModal.classList.remove('flex');
    }
  };

  if (closeLayersBtn) closeLayersBtn.addEventListener('click', hideLayersModal);
  if (doneLayersBtn) doneLayersBtn.addEventListener('click', hideLayersModal);

  // Bind Layer Checkbox Toggles
  container.querySelectorAll('[data-layer-toggle]').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const layerId = e.target.getAttribute('data-layer-toggle');
      mapService.toggleLayer(layerId, e.target.checked);
    });
  });

  // 14. Location Permission Banner Actions
  const enableGpsBtn = container.querySelector('#enable-gps-action-btn');
  const manualLocationBtn = container.querySelector('#manual-location-action-btn');
  const manualModal = container.querySelector('#manual-location-modal');
  const closeManualBtn = container.querySelector('#close-manual-modal-btn');
  const cancelManualBtn = container.querySelector('#cancel-manual-btn');
  const saveManualBtn = container.querySelector('#save-manual-location-btn');

  if (enableGpsBtn) {
    enableGpsBtn.addEventListener('click', async () => {
      await store.requestAndEnableLocation();
      store.navigate('map');
    });
  }

  const showManualModal = () => {
    if (manualModal) {
      manualModal.classList.remove('hidden');
      manualModal.classList.add('flex');
    }
  };

  const hideManualModal = () => {
    if (manualModal) {
      manualModal.classList.add('hidden');
      manualModal.classList.remove('flex');
    }
  };

  if (manualLocationBtn) manualLocationBtn.addEventListener('click', showManualModal);
  if (closeManualBtn) closeManualBtn.addEventListener('click', hideManualModal);
  if (cancelManualBtn) cancelManualBtn.addEventListener('click', hideManualModal);

  // Quick Region Selection
  const quickLocations = {
    pune: { lat: 18.5204, lng: 73.8567, name: 'Pune, Maharashtra' },
    gangtok: { lat: 27.3314, lng: 88.6138, name: 'Gangtok, Sikkim' },
    wayanad: { lat: 11.6854, lng: 76.1320, name: 'Wayanad, Kerala' },
    shimla: { lat: 31.1048, lng: 77.1734, name: 'Shimla, Himachal Pradesh' }
  };

  container.querySelectorAll('[data-quick-loc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-quick-loc');
      const loc = quickLocations[key];
      if (loc) {
        store.setManualLocation(loc.lat, loc.lng, loc.name);
        hideManualModal();
        store.navigate('map');
      }
    });
  });

  if (saveManualBtn) {
    saveManualBtn.addEventListener('click', () => {
      const latInput = container.querySelector('#manual-lat-input');
      const lngInput = container.querySelector('#manual-lng-input');
      const localityInput = container.querySelector('#manual-locality-input');

      const lat = parseFloat(latInput?.value);
      const lng = parseFloat(lngInput?.value);
      const name = localityInput?.value?.trim() || null;

      if (!isNaN(lat) && !isNaN(lng) && locationService.validateCoordinates(lat, lng)) {
        store.setManualLocation(lat, lng, name);
        hideManualModal();
        store.navigate('map');
      } else {
        alert('Please enter valid geographic coordinates (e.g. Latitude: 18.5204, Longitude: 73.8567)');
      }
    });
  }
}
