import L from 'leaflet';

/**
 * Professional Leaflet Map Service for PRITHVI-SHIELD Citizen App
 * Supports 7 customizable disaster-response layers:
 * 1. My Location (with high-accuracy pulsing GPS beacon & accuracy circle)
 * 2. Landslide Risk Zones (transparent heat polygons: Green, Yellow, Orange, Red)
 * 3. Citizen Reports (verified incident markers with privacy protection)
 * 4. SOS Incidents (emergency distress beacons)
 * 5. Safe Shelters (relief camps with direct [VIEW SAFE ROUTE] action)
 * 6. Dangerous Roads (landslide & blockage affected road polylines)
 * 7. Evacuation Route (safe path avoiding danger zones)
 */
export class MapService {
  constructor() {
    this.map = null;
    this.userMarker = null;
    this.accuracyCircle = null;

    // Dedicated Layer Groups
    this.layers = {
      myLocation: L.layerGroup(),
      landslideRisk: L.layerGroup(),
      citizenReports: L.layerGroup(),
      sos: L.layerGroup(),
      shelters: L.layerGroup(),
      dangerousRoads: L.layerGroup(),
      evacuationRoute: L.layerGroup()
    };

    // Layer active state (My Location & Landslide Risk enabled by default)
    this.activeLayers = {
      myLocation: true,
      landslideRisk: true,
      citizenReports: false,
      sos: false,
      shelters: false,
      dangerousRoads: false,
      evacuationRoute: false
    };

    this.tileLayers = {};
    this.currentTileLayer = null;
  }

  /**
   * Initialize Leaflet map instance
   */
  async initMap(element, defaultCoords, zoom = 14) {
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) {
        console.warn('Map cleanup error:', e);
      }
      this.map = null;
    }

    const centerLat = defaultCoords?.lat || 18.5204;
    const centerLng = defaultCoords?.lng || 73.8567;

    this.map = L.map(element, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true
    }).setView([centerLat, centerLng], zoom);

    // High quality CartoDB & OpenStreetMap tile layers with clean disaster styling
    const standardTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    });

    const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    });

    const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '&copy; Esri World Imagery'
    });

    const terrainTiles = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; OpenTopoMap'
    });

    this.tileLayers = {
      standard: standardTiles,
      dark: darkTiles,
      satellite: satelliteTiles,
      terrain: terrainTiles
    };

    standardTiles.addTo(this.map);
    this.currentTileLayer = standardTiles;

    // Attach layer groups to map if active
    Object.keys(this.layers).forEach(key => {
      if (this.activeLayers[key]) {
        this.layers[key].addTo(this.map);
      }
    });

    // Invalidate size on load to prevent grey tile glitches
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 200);

    return this.map;
  }

  /**
   * Switch base tile layer
   */
  setMapType(type = 'standard') {
    if (!this.map) return;
    if (this.currentTileLayer) this.map.removeLayer(this.currentTileLayer);
    this.currentTileLayer = this.tileLayers[type] || this.tileLayers.standard;
    this.currentTileLayer.addTo(this.map);
  }

  /**
   * Toggle visibility of any of the 7 layers
   */
  toggleLayer(layerId, isVisible) {
    if (!this.map || !this.layers[layerId]) return;
    this.activeLayers[layerId] = isVisible;

    if (isVisible) {
      if (!this.map.hasLayer(this.layers[layerId])) {
        this.layers[layerId].addTo(this.map);
      }
    } else {
      if (this.map.hasLayer(this.layers[layerId])) {
        this.map.removeLayer(this.layers[layerId]);
      }
    }
  }

  /**
   * 1. MY LOCATION: Pulsing "You are here" marker with accuracy circle
   */
  setUserLocationMarker(lat, lng, accuracy = 15) {
    if (!this.map) return;
    const group = this.layers.myLocation;

    const userIcon = L.divIcon({
      className: 'custom-user-gps-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2" style="width: 44px; height: 44px;">
          <div class="absolute inset-0 rounded-full bg-blue-500/35 animate-ping"></div>
          <div class="absolute w-7 h-7 rounded-full bg-blue-500/25 animate-pulse"></div>
          <div class="relative w-5 h-5 rounded-full bg-blue-600 border-2.5 border-white shadow-xl flex items-center justify-center">
            <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([lat, lng]);
    } else {
      this.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(group);
      this.userMarker.bindTooltip('<b>📍 You Are Here</b><br>Live GPS telemetry active', {
        direction: 'top',
        offset: [0, -18],
        className: 'gps-tooltip'
      });
    }

    if (this.accuracyCircle) {
      this.accuracyCircle.setLatLng([lat, lng]);
      this.accuracyCircle.setRadius(accuracy || 15);
    } else {
      this.accuracyCircle = L.circle([lat, lng], {
        radius: accuracy || 15,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '3, 4'
      }).addTo(group);
    }
  }

  /**
   * Smooth flyTo user coordinates
   */
  centerOnLocation(lat, lng, zoom = 15) {
    if (this.map && lat && lng) {
      this.map.flyTo([lat, lng], zoom, {
        animate: true,
        duration: 1.0,
        easeLinearity: 0.25
      });
    }
  }

  /**
   * 2. LANDSLIDE RISK: Transparent heat polygons/circles
   * 🟢 Green = Low Risk
   * 🟡 Yellow = Moderate Risk
   * 🟠 Orange = High Risk
   * 🔴 Red = Critical Risk
   */
  renderRiskZones(zones, centerLat, centerLng, onZoneClick) {
    const group = this.layers.landslideRisk;
    group.clearLayers();

    zones.forEach(z => {
      const circleLat = centerLat + (z.offsetLat || 0);
      const circleLng = centerLng + (z.offsetLng || 0);

      const colorMap = {
        CRITICAL: { fill: '#ef4444', stroke: '#dc2626', label: 'Critical Risk', badge: '🔴 Critical' },
        HIGH: { fill: '#f97316', stroke: '#ea580c', label: 'High Risk', badge: '🟠 High' },
        MODERATE: { fill: '#eab308', stroke: '#ca8a04', label: 'Moderate Risk', badge: '🟡 Moderate' },
        LOW: { fill: '#10b981', stroke: '#059669', label: 'Low Risk', badge: '🟢 Low' }
      };

      const cfg = colorMap[z.level] || colorMap.MODERATE;

      const circle = L.circle([circleLat, circleLng], {
        color: cfg.stroke,
        fillColor: cfg.fill,
        fillOpacity: z.level === 'CRITICAL' ? 0.32 : z.level === 'HIGH' ? 0.26 : 0.20,
        weight: 1.8,
        dashArray: z.level === 'CRITICAL' ? '4, 4' : null,
        radius: z.radius || 400
      }).addTo(group);

      circle.bindTooltip(`
        <div class="text-xs font-sans">
          <div class="font-bold">${cfg.badge} Zone</div>
          <div class="text-slate-600 dark:text-slate-300 text-[11px]">${z.title}</div>
          <div class="text-[10px] text-slate-500 mt-0.5">Slope: ${z.slope || '24°'} • Soil Sat: ${z.saturation || '65%'}</div>
        </div>
      `, { sticky: true, opacity: 0.95 });

      if (onZoneClick) {
        circle.on('click', () => onZoneClick({ ...z, lat: circleLat, lng: circleLng }));
      }
    });
  }

  /**
   * 3. CITIZEN REPORTS: Verified hazard reports with privacy protection
   */
  renderCitizenReports(reports, onReportClick) {
    const group = this.layers.citizenReports;
    group.clearLayers();

    reports.forEach(r => {
      const iconText = r.category === 'Road Blockage' ? '🚧' : r.category === 'Ground Crack' ? '⚡' : r.category === 'Water Seepage' ? '🌊' : '⚠️';
      const isCritical = r.severity === 'CRITICAL';

      const reportIcon = L.divIcon({
        className: 'custom-citizen-report-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transform hover:scale-115 transition-transform" style="width: 38px; height: 38px;">
            ${isCritical ? '<div class="absolute inset-0 rounded-full bg-red-500/40 animate-ping"></div>' : ''}
            <div class="w-9 h-9 rounded-2xl bg-slate-900 border-2 ${isCritical ? 'border-red-500 text-red-400 shadow-red-500/40' : 'border-amber-500 text-amber-400 shadow-amber-500/30'} flex items-center justify-center shadow-lg text-sm font-bold">
              ${iconText}
            </div>
            <div class="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-sm">
              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const marker = L.marker([r.lat, r.lng], { icon: reportIcon }).addTo(group);
      if (onReportClick) {
        marker.on('click', () => onReportClick(r));
      }
    });
  }

  /**
   * 4. SOS MARKERS: Authorized emergency distress beacons
   */
  renderSOSMarkers(sosIncidents, onSOSClick) {
    const group = this.layers.sos;
    group.clearLayers();

    sosIncidents.forEach(item => {
      const sosIcon = L.divIcon({
        className: 'custom-sos-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer" style="width: 44px; height: 44px;">
            <div class="absolute inset-0 rounded-full bg-red-600/50 animate-ping"></div>
            <div class="absolute w-8 h-8 rounded-full bg-red-600/30 animate-pulse"></div>
            <div class="w-9 h-9 rounded-full bg-red-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-xs font-black">
              🆘
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([item.lat, item.lng], { icon: sosIcon, zIndexOffset: 950 }).addTo(group);
      if (onSOSClick) {
        marker.on('click', () => onSOSClick(item));
      }
    });
  }

  /**
   * 5. SAFE SHELTERS: Verified shelters with [VIEW SAFE ROUTE] action
   */
  renderShelters(shelters, onShelterClick) {
    const group = this.layers.shelters;
    group.clearLayers();

    shelters.forEach(s => {
      const shelterIcon = L.divIcon({
        className: 'custom-shelter-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transform hover:scale-110 transition-transform" style="width: 38px; height: 38px;">
            <div class="w-9 h-9 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xl border-2 border-white text-base font-bold shadow-emerald-700/40">
              ⛺
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const marker = L.marker([s.lat, s.lng], { icon: shelterIcon }).addTo(group);
      if (onShelterClick) {
        marker.on('click', () => onShelterClick(s));
      }
    });
  }

  /**
   * 6. DANGEROUS ROADS: Landslide & blockage affected road polylines
   */
  renderDangerousRoads(roads, onRoadClick) {
    const group = this.layers.dangerousRoads;
    group.clearLayers();

    roads.forEach(road => {
      const isBlocked = road.status === 'BLOCKED' || road.riskLevel === 'CRITICAL';
      const color = isBlocked ? '#dc2626' : '#ea580c';

      const polyline = L.polyline(road.coordinates, {
        color: color,
        weight: 6,
        opacity: 0.9,
        dashArray: '6, 6',
        lineCap: 'round'
      }).addTo(group);

      // Warning badge marker at midpoint
      const midIdx = Math.floor(road.coordinates.length / 2);
      const midPoint = road.coordinates[midIdx];

      const pinIcon = L.divIcon({
        className: 'road-hazard-pin',
        html: `
          <div class="bg-red-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-black shadow-md border border-white flex items-center gap-0.5 -translate-x-1/2 -translate-y-1/2">
            <span>⛔</span>
            <span>BLOCKED</span>
          </div>
        `,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });

      const pinMarker = L.marker(midPoint, { icon: pinIcon }).addTo(group);

      const clickHandler = () => {
        if (onRoadClick) onRoadClick(road);
      };

      polyline.on('click', clickHandler);
      pinMarker.on('click', clickHandler);
    });
  }

  /**
   * 7. EVACUATION ROUTE: Safe path to designated safe haven
   */
  renderEvacuationRoute(routePoints, onRouteClick) {
    const group = this.layers.evacuationRoute;
    group.clearLayers();

    if (!routePoints || routePoints.length < 2) return;

    // Glowing outline
    L.polyline(routePoints, {
      color: '#0284c7',
      weight: 8,
      opacity: 0.45,
      lineCap: 'round'
    }).addTo(group);

    // Primary safe path
    const mainPolyline = L.polyline(routePoints, {
      color: '#10b981',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round'
    }).addTo(group);

    if (onRouteClick) {
      mainPolyline.on('click', () => onRouteClick(routePoints));
    }
  }
}

export const mapService = new MapService();
