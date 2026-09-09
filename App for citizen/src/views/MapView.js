import L from 'leaflet';
import { store } from '../store.js';
import { renderBottomNav, bindNavigationEvents } from '../components/Navigation.js';
import { pwaManager } from '../services/pwaService.js';
import { triggerPermissionPrompt } from '../components/PWABanner.js';

let mapInstance = null;

export function renderMapView() {
  const { hazards, shelters, currentLocation } = store.state;

  return `
    <div class="relative flex h-screen w-full flex-col bg-surface overflow-hidden">
      <!-- Top Connectivity Bar -->
      <div class="fixed top-0 left-0 w-full z-40 bg-slate-950 text-slate-200 px-3.5 py-1.5 flex justify-between items-center text-[12px] font-medium pt-safe border-b border-slate-800/80 select-none shadow-xs backdrop-blur-md">
        <div class="flex items-center gap-1.5 bg-slate-900/90 text-slate-200 px-2.5 py-0.5 rounded-full border border-slate-800 shadow-2xs">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span class="text-[11px] font-semibold tracking-wide">Map Live Telemetry</span>
        </div>
        <div class="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide">
          <span class="material-symbols-outlined text-[13px]">sync</span>
          <span>Live Sync</span>
        </div>
      </div>

      <!-- Map Canvas -->
      <div id="leaflet-map" class="absolute inset-0 z-0 w-full h-full bg-slate-200"></div>

      <!-- UI Overlay Layer (Pointer Events None Container) -->
      <div class="relative z-20 flex flex-col h-full pointer-events-none pb-nav-safe pt-[calc(var(--status-bar-height,0px)+48px)]">
        
        <!-- Search & Filter Header -->
        <div class="p-4 pointer-events-auto max-w-xl mx-auto w-full">
          <div class="flex flex-col gap-2.5">
            <!-- Search Bar -->
            <div class="flex gap-2 items-center bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-outline-variant/80">
              <div class="text-primary px-2 flex items-center gap-1">
                <span class="material-symbols-outlined text-[22px]">search</span>
              </div>
              <input id="map-search-input" class="bg-transparent border-none focus:ring-0 focus:outline-none flex-1 text-sm text-on-surface placeholder:text-outline font-medium" placeholder="Search shelters, hazards, routes..." type="text">
              <span class="hidden sm:flex text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 items-center gap-1 shrink-0">
                <span class="material-symbols-outlined text-[12px]">map</span> Google Maps Live
              </span>
              <button id="map-filter-btn" class="bg-primary/10 hover:bg-primary/20 p-2 rounded-xl text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">tune</span>
              </button>
            </div>

            <!-- Quick Filter Chips -->
            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button data-filter="all" class="map-chip active shrink-0 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-md transition-all">All Intel</button>
              <button data-filter="hazards" class="map-chip shrink-0 px-4 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface text-xs font-semibold shadow-sm border border-outline-variant hover:bg-surface-container-low transition-all">Hazards (${hazards.length})</button>
              <button data-filter="shelters" class="map-chip shrink-0 px-4 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface text-xs font-semibold shadow-sm border border-outline-variant hover:bg-surface-container-low transition-all">Safe Shelters (${shelters.length})</button>
              <button data-filter="routes" class="map-chip shrink-0 px-4 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface text-xs font-semibold shadow-sm border border-outline-variant hover:bg-surface-container-low transition-all">Evac Routes</button>
            </div>
          </div>
        </div>

        <div class="flex-1"></div>

        <!-- Legend and GPS Floating Controls -->
        <div class="px-4 mb-2 flex justify-between items-end pointer-events-auto max-w-xl mx-auto w-full">
          <!-- Risk Legend -->
          <div class="bg-surface-container-lowest/95 backdrop-blur-md p-3 rounded-2xl border border-outline-variant/80 shadow-xl max-w-[145px]">
            <p class="text-[10px] font-bold uppercase tracking-wider text-outline mb-2 flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">legend_toggle</span>
              Risk Scale
            </p>
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span class="text-[11px] font-semibold text-on-surface">Safe Zone</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <span class="text-[11px] font-semibold text-on-surface">Elevated</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                <span class="text-[11px] font-semibold text-on-surface">High Risk</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full bg-error"></div>
                <span class="text-[11px] font-semibold text-on-surface">Critical</span>
              </div>
            </div>
          </div>

          <!-- GPS, Google Maps & Zoom Controls -->
          <div class="flex flex-col gap-2">
            <!-- Direct Open User Location in Google Maps -->
            <button id="map-open-gmap-user-btn" class="w-12 h-12 flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-2xl border border-blue-400 shadow-xl transition-transform active:scale-95 group" title="Open My Live Location in Google Maps">
              <span class="material-symbols-outlined text-[20px]">open_in_new</span>
              <span class="text-[8px] font-black tracking-tighter uppercase font-mono">G-Map</span>
            </button>

            <!-- Center My Location -->
            <button id="map-locate-btn" class="w-12 h-12 flex items-center justify-center bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl border border-outline-variant/80 shadow-xl text-primary hover:bg-surface-container-high transition-transform active:scale-95" title="Center My Location">
              <span class="material-symbols-outlined text-[24px]">my_location</span>
            </button>

            <!-- Google Maps Tile Layer Switcher -->
            <button id="map-layer-toggle-btn" class="w-12 h-12 flex items-center justify-center bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl border border-outline-variant/80 shadow-xl text-primary hover:bg-surface-container-high transition-transform active:scale-95" title="Toggle Google Maps Satellite / Street View">
              <span class="material-symbols-outlined text-[22px]">map</span>
            </button>

            <div class="flex flex-col bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl border border-outline-variant/80 shadow-xl overflow-hidden">
              <button id="map-zoom-in-btn" class="w-12 h-11 flex items-center justify-center text-primary border-b border-outline-variant/50 hover:bg-surface-container-high transition-colors">
                <span class="material-symbols-outlined text-[20px]">add</span>
              </button>
              <button id="map-zoom-out-btn" class="w-12 h-11 flex items-center justify-center text-primary hover:bg-surface-container-high transition-colors">
                <span class="material-symbols-outlined text-[20px]">remove</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Interactive Selected Hazard / Shelter Preview Card -->
        <div id="map-preview-card" class="px-4 mb-2 pointer-events-auto transition-all duration-300 transform translate-y-32 opacity-0 pointer-events-none max-w-xl mx-auto w-full">
          <div class="bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-outline-variant flex relative">
            <div id="card-thumbnail" class="w-28 h-28 bg-cover bg-center shrink-0 bg-slate-200" style="background-image: url('${hazards[0].image}')"></div>
            <div class="p-3.5 flex-1 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-start">
                  <h3 id="card-title" class="text-sm font-bold text-on-surface pr-6">${hazards[0].title}</h3>
                  <span id="card-badge" class="text-[10px] bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-extrabold uppercase">${hazards[0].severity}</span>
                </div>
                <p id="card-subtitle" class="text-xs text-on-surface-variant mt-1">${hazards[0].time} • ${hazards[0].distance}</p>
                <p id="card-desc" class="text-xs text-on-surface-variant/80 mt-1 line-clamp-1">${hazards[0].description}</p>
              </div>
              <div class="flex gap-2 mt-2">
                <button id="card-action-btn" class="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-xl shadow-sm hover:bg-primary-fixed-variant transition-colors">
                  In-App Route
                </button>
                <button id="card-gmap-btn" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5" title="Open Turn-by-Turn Navigation in Google Maps">
                  <span class="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>Google Maps</span>
                </button>
              </div>
            </div>
            <button id="card-close-btn" class="absolute top-2 right-2 text-outline hover:text-on-surface p-1 rounded-full">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      </div>

      ${renderBottomNav('map')}
    </div>
  `;
}

export function bindMapEvents(container) {
  bindNavigationEvents(container);

  const { currentLocation, hazards, shelters } = store.state;

  // Initialize Leaflet Map
  const mapElement = container.querySelector('#leaflet-map');
  if (!mapElement) return;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  // Centered strictly on Central Live GPS Telemetry
  mapInstance = L.map(mapElement, {
    zoomControl: false,
    attributionControl: false
  }).setView([currentLocation.lat, currentLocation.lng], 14);

  // Google Maps Tile Layers
  const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  });

  const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google Maps Satellite'
  });

  const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  });

  let currentTileLayer = googleRoadmap;
  currentTileLayer.addTo(mapInstance);

  // Tile Layer Switcher
  const layerToggleBtn = container.querySelector('#map-layer-toggle-btn');
  let currentLayerIndex = 0;
  const tileLayers = [
    { name: 'Google Maps Street', layer: googleRoadmap, icon: 'map' },
    { name: 'Google Maps Satellite', layer: googleHybrid, icon: 'satellite_alt' },
    { name: 'Tactical Topo', layer: cartoVoyager, icon: 'terrain' }
  ];

  if (layerToggleBtn) {
    layerToggleBtn.addEventListener('click', () => {
      if (mapInstance && currentTileLayer) {
        mapInstance.removeLayer(currentTileLayer);
      }
      currentLayerIndex = (currentLayerIndex + 1) % tileLayers.length;
      currentTileLayer = tileLayers[currentLayerIndex].layer;
      currentTileLayer.addTo(mapInstance);

      const iconSpan = layerToggleBtn.querySelector('.material-symbols-outlined');
      if (iconSpan) iconSpan.textContent = tileLayers[currentLayerIndex].icon;
      layerToggleBtn.title = `Current View: ${tileLayers[currentLayerIndex].name}`;
    });
  }

  // Custom User Location Marker with Animated Pulse
  const userIcon = L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 32px; height: 32px;">
        <div class="pulsate-gps absolute inset-0 rounded-full bg-primary opacity-30"></div>
        <div class="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-lg"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  // Direct Open User Location in Google Maps Button Handler
  const openGMapUserBtn = container.querySelector('#map-open-gmap-user-btn');
  if (openGMapUserBtn) {
    openGMapUserBtn.addEventListener('click', () => {
      const userLat = store.state.currentLocation.lat;
      const userLng = store.state.currentLocation.lng;
      const gmapUserUrl = `https://www.google.com/maps?q=${userLat},${userLng}`;
      window.open(gmapUserUrl, '_blank');
    });
  }

  // Create User Marker with rich Google Maps interactive popup
  const userMarker = L.marker([currentLocation.lat, currentLocation.lng], { icon: userIcon })
    .addTo(mapInstance)
    .bindPopup(`
      <div class="p-2.5 font-sans min-w-[180px]">
        <div class="flex items-center gap-1.5 text-blue-600 font-black text-xs uppercase mb-1">
          <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
          <span>Your Live GPS Position</span>
        </div>
        <p class="text-xs font-mono text-slate-700 mb-2">${currentLocation.lat.toFixed(5)}°, ${currentLocation.lng.toFixed(5)}° (±${currentLocation.accuracy || 5}m)</p>
        <a href="https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}" target="_blank" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 shadow-sm transition no-underline">
          <span>Open in Google Maps</span> ↗
        </a>
      </div>
    `);

  const card = container.querySelector('#map-preview-card');
  const cardTitle = container.querySelector('#card-title');
  const cardSubtitle = container.querySelector('#card-subtitle');
  const cardDesc = container.querySelector('#card-desc');
  const cardBadge = container.querySelector('#card-badge');
  const cardThumbnail = container.querySelector('#card-thumbnail');
  const cardCloseBtn = container.querySelector('#card-close-btn');
  const cardActionBtn = container.querySelector('#card-action-btn');
  const cardGMapBtn = container.querySelector('#card-gmap-btn');

  let activeTargetCoords = { lat: shelters[0]?.lat || 11.5580, lng: shelters[0]?.lng || 76.1310 };

  function showCard(title, subtitle, desc, badge, badgeClass, imgUrl, lat, lng) {
    if (!card) return;
    if (lat !== undefined && lng !== undefined) {
      activeTargetCoords = { lat, lng };
    }
    cardTitle.textContent = title;
    cardSubtitle.textContent = subtitle;
    cardDesc.textContent = desc;
    cardBadge.textContent = badge;
    cardBadge.className = `text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${badgeClass}`;
    cardThumbnail.style.backgroundImage = `url('${imgUrl}')`;

    card.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
    card.classList.add('translate-y-0', 'opacity-100');
  }

  function hideCard() {
    if (!card) return;
    card.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
    card.classList.remove('translate-y-0', 'opacity-100');
  }

  if (cardCloseBtn) {
    cardCloseBtn.addEventListener('click', hideCard);
  }

  // Open Direct Turn-by-Turn Navigation from User's Current GPS to Target in Google Maps
  if (cardGMapBtn) {
    cardGMapBtn.addEventListener('click', () => {
      const userLat = store.state.currentLocation.lat;
      const userLng = store.state.currentLocation.lng;
      const gmapUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${activeTargetCoords.lat},${activeTargetCoords.lng}&travelmode=driving`;
      window.open(gmapUrl, '_blank');
    });
  }

  let currentPolyline = null;

  if (cardActionBtn) {
    cardActionBtn.addEventListener('click', () => {
      const activeShelter = shelters[0] || { lat: 11.5580, lng: 76.1310, name: 'Central Civic Shelter' };
      const userLat = currentLocation.lat;
      const userLng = currentLocation.lng;

      if (currentPolyline && mapInstance) {
        mapInstance.removeLayer(currentPolyline);
      }

      // Draw Route Polyline
      const latlngs = [
        [userLat, userLng],
        [userLat + (activeShelter.lat - userLat) * 0.5 + 0.002, userLng + (activeShelter.lng - userLng) * 0.5 - 0.001],
        [activeShelter.lat, activeShelter.lng]
      ];

      currentPolyline = L.polyline(latlngs, {
        color: '#00e5ff',
        weight: 5,
        opacity: 0.85,
        dashArray: '10, 10',
        lineCap: 'round'
      }).addTo(mapInstance);

      mapInstance.fitBounds(currentPolyline.getBounds(), { padding: [50, 50] });

      const routeInfo = container.querySelector('#card-subtitle');
      if (routeInfo) {
        routeInfo.textContent = `Route Mapped • 1.2 km (Approx 3 mins)`;
      }
    });
  }

  // Add Hazard Markers
  hazards.forEach(h => {
    const isCritical = h.severity === 'CRITICAL';
    const markerBg = isCritical ? '#ba1a1a' : h.severity === 'HIGH' ? '#a33500' : '#505f76';
    const iconName = h.category === 'Ground Crack' ? 'warning' : h.category === 'Soil Movement' ? 'landslide' : 'block';

    const hazardIcon = L.divIcon({
      className: 'custom-hazard-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transform hover:scale-110 transition-transform" style="width: 38px; height: 38px;">
          ${isCritical ? '<div class="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40"></div>' : ''}
          <div class="w-9 h-9 rounded-full text-white flex items-center justify-center shadow-xl border-2 border-white" style="background-color: ${markerBg};">
            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">${iconName}</span>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const m = L.marker([h.lat, h.lng], { icon: hazardIcon }).addTo(mapInstance);
    m.on('click', () => {
      showCard(
        h.title,
        `${h.time} • ${h.distance}`,
        h.description,
        h.severity,
        isCritical ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container',
        h.image,
        h.lat,
        h.lng
      );
    });
  });

  // Add Safe Shelter Markers
  shelters.forEach(s => {
    const shelterIcon = L.divIcon({
      className: 'custom-shelter-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transform hover:scale-110 transition-transform" style="width: 38px; height: 38px;">
          <div class="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">home_pin</span>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const m = L.marker([s.lat, s.lng], { icon: shelterIcon }).addTo(mapInstance);
    m.on('click', () => {
      showCard(
        s.name,
        `${s.type} • ${s.distance}`,
        `Capacity: ${s.capacity} • Emergency Phone: ${s.phone}`,
        'SAFE ZONE',
        'bg-emerald-100 text-emerald-900 border border-emerald-300',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAbUb7cZhLo-RSn8pI5WSlRLmUkKEJ-SzO2phgaktqvlW2lA-hB1ro4jfD9uFRWxPTxmin5Lpem-XC0kkiCWOvJcCI4iaqj6TH_PGVEyews9dNlB6gTlfqH7de3ZY02P1xpj7xGyPHdQgL7xqzqEqsQaJ8zP5HxyChreFviwKc3vFOLfbP0Eh3LbpeD_qsUOiUP9PO0w7FyKQZ7c83uOj0asn-C2w0b4IF3N7GY7imTMoZ8PlzFXcbDeQ',
        s.lat,
        s.lng
      );
    });
  });

  // Safe Evacuation Route Polyline (Dynamic offset from user's live position to shelter)
  const safeRouteCoords = [
    [currentLocation.lat, currentLocation.lng],
    [currentLocation.lat + 0.001, currentLocation.lng + 0.002],
    [currentLocation.lat + 0.002, currentLocation.lng + 0.005],
    [shelters[0].lat, shelters[0].lng]
  ];
  const routeLine = L.polyline(safeRouteCoords, {
    color: '#0052cc',
    weight: 4,
    dashArray: '8, 8',
    opacity: 0.85
  }).addTo(mapInstance);

  // Central GPS-derived Dynamic Risk Heatmap Zones
  const heatmapLayerGroup = L.layerGroup();
  const riskHeatZones = [
    { offsetLat: 0.0035, offsetLng: -0.0025, radius: 450, color: '#ef4444', level: 'CRITICAL RISK', title: 'High Slope Saturation Zone' },
    { offsetLat: -0.0025, offsetLng: 0.0030, radius: 400, color: '#f97316', level: 'HIGH RISK', title: 'Unstable Soil Ridge' },
    { offsetLat: 0.0050, offsetLng: 0.0040, radius: 550, color: '#eab308', level: 'MODERATE RISK', title: 'Elevated Runoff Sector' },
    { offsetLat: -0.0045, offsetLng: -0.0035, radius: 500, color: '#10b981', level: 'SAFE BUFFER', title: 'Stable Bedrock Zone' }
  ];

  function updateHeatmapZones(lat, lng) {
    heatmapLayerGroup.clearLayers();
    riskHeatZones.forEach(zone => {
      const circle = L.circle([lat + zone.offsetLat, lng + zone.offsetLng], {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.35,
        weight: 1.5,
        radius: zone.radius
      }).bindTooltip(`<strong>${zone.level}</strong>: ${zone.title}`, { sticky: true });
      heatmapLayerGroup.addLayer(circle);
    });
  }

  updateHeatmapZones(currentLocation.lat, currentLocation.lng);
  heatmapLayerGroup.addTo(mapInstance);

  // Auto-request live location permission on map open and redirect map to citizen's live GPS
  pwaManager.requestLocationPermission(
    (pos) => {
      if (mapInstance && userMarker) {
        const liveLat = pos?.latitude || pos?.coords?.latitude || store.state.currentLocation.lat;
        const liveLng = pos?.longitude || pos?.coords?.longitude || store.state.currentLocation.lng;
        userMarker.setLatLng([liveLat, liveLng]);
        updateHeatmapZones(liveLat, liveLng);
        mapInstance.flyTo([liveLat, liveLng], 15, { animate: true, duration: 1.2 });
      }
    },
    (err) => {
      console.log('[GPS Map Notice] Central live telemetry active:', err);
    }
  );

  // Map Controls (Zoom / Re-center)
  const zoomIn = container.querySelector('#map-zoom-in-btn');
  if (zoomIn) zoomIn.addEventListener('click', () => mapInstance.zoomIn());

  const zoomOut = container.querySelector('#map-zoom-out-btn');
  if (zoomOut) zoomOut.addEventListener('click', () => mapInstance.zoomOut());

  const locateBtn = container.querySelector('#map-locate-btn');
  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      const flyToCurrent = () => {
        pwaManager.requestLocationPermission(
          (pos) => {
            const lat = pos?.latitude || pos?.coords?.latitude || store.state.currentLocation.lat;
            const lng = pos?.longitude || pos?.coords?.longitude || store.state.currentLocation.lng;
            userMarker.setLatLng([lat, lng]);
            updateHeatmapZones(lat, lng);
            mapInstance.flyTo([lat, lng], 15, { animate: true, duration: 1 });
          },
          () => {
            mapInstance.flyTo([store.state.currentLocation.lat, store.state.currentLocation.lng], 15, { animate: true, duration: 1 });
          }
        );
      };

      if (store.state.permissions.location !== 'granted') {
        triggerPermissionPrompt('location', flyToCurrent);
      } else {
        flyToCurrent();
      }
    });
  }

  // Filter Chips
  container.querySelectorAll('.map-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.map-chip').forEach(c => {
        c.classList.remove('bg-primary', 'text-white', 'shadow-md');
        c.classList.add('bg-surface-container-lowest/90', 'text-on-surface');
      });
      chip.classList.add('bg-primary', 'text-white', 'shadow-md');
      chip.classList.remove('bg-surface-container-lowest/90', 'text-on-surface');
    });
  });
}
