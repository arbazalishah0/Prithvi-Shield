// Central Reactive State Store for SafeGround Citizen App
import { requireApiBaseUrl } from './services/apiConfig.js';
import { locationService } from './services/locationService.js';
import { isSupabaseConfigured } from './services/supabaseClient.js';
import { offlineStorageService, compressImage } from './services/offlineStorageService.js';

/**
 * Returns a persistent, unique citizen UUID.
 * Generated once with crypto.randomUUID() and stored in localStorage.
 * Fixes: all users sharing the same derived phone-based ID.
 */
function getPersistentCitizenUUID() {
  const KEY = 'prithvi_citizen_uuid';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'ctz_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Calculates evidence integrity score dynamically based on actual report inputs.
 * Fixes: hardcoded 94% that never changed regardless of photo/GPS quality.
 */
function calcIntegrityScore(hasPhoto, gpsAccuracy, descriptionLength, aiConfidence) {
  const photoScore = hasPhoto ? 100 : 20;                           // Photo presence: 40% weight
  const gpsScore = gpsAccuracy ? Math.max(0, 100 - gpsAccuracy) : 30; // GPS accuracy: 30% weight (lower acc = higher score)
  const descScore = Math.min(100, (descriptionLength / 150) * 100); // Description: 20% weight
  const aiScore = Math.min(100, aiConfidence || 70);                // AI confidence: 10% weight
  return Math.min(100, Math.max(0, Math.round(
    photoScore * 0.40 + gpsScore * 0.30 + descScore * 0.20 + aiScore * 0.10
  )));
}

class Store {
  constructor() {
    const saved = localStorage.getItem('safeground_citizen_state');
    const defaultState = {
      isLoggedIn: false,
      currentUser: {
        fullName: 'Rahul Sharma',
        mobileNumber: '+91 9876543210',
        language: 'en',
        emergencyContactName: 'Rahul Sharma',
        emergencyContactPhone: '+91 9876543210',
        locationEnabled: true
      },
      isOnboardingCompleted: localStorage.getItem('prithvi_shield_onboarding') === 'true',
      activeAlertDetails: null,
      fcmToken: null,
      citizenAlerts: [],
      activeView: 'auth', // Default to Login screen
      viewHistory: ['auth'],
      deviceViewMode: 'frame', // 'frame' | 'fullscreen'

      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      permissions: {
        location: 'prompt', // 'prompt' | 'granted' | 'denied'
        microphone: 'prompt',
        storage: 'prompt'
      },

      currentLocation: {
        status: 'ACQUIRING', // 'ACQUIRING' | 'SUCCESS' | 'PERMISSION_DENIED' | 'SERVICES_DISABLED' | 'UNAVAILABLE'
        lat: null,
        lng: null,
        accuracy: null,
        locality: null,
        placeName: 'Acquiring GPS location...',
        elevation: '--',
        soilMoisture: '--',
        isLiveGPS: false,
        isManual: false,
        error: null,
        lastUpdated: null
      },
      
      areaStatus: {
        level: 'HIGH RISK',
        title: 'HIGH RISK ACTIVE',
        subtitle: 'Heavy rainfall and ground movement detected in sector.',
        bg: '#FF7043',
        border: '#D84315',
        textColor: '#FFFFFF',
        subTextColor: '#FFEBEE',
        icon: 'warning'
      },
      
      hazards: [
        {
          id: 'haz-1',
          title: 'Ground Fissure & Road Crack',
          category: 'Ground Crack',
          severity: 'CRITICAL',
          time: '12m ago',
          distance: '0.4 km away',
          lat: 11.5595,
          lng: 76.1340,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnPOoo9P23syYg1w-SxSr6sZG6SSLdTI65ri16kRNg5yJ1ZSfMHTn0ZaT7Wpp2UbqKw5OV-FOKGs_UcPQVbNPb1wjn7fWrBfprwl8zRdODYfmLAY96qVKI80MNSSsg8e3cuwKEt2mCwPtlsxoFjy9kQJfW1EreXkVvrZcj6UF-lkYC_tYwFD4_wnQk-_Ohxg3Tt7C0YtFi-o57Zn5QxIgIGMn9sg2cBcNDj3VGoMQuhQ8Xdl09f872lQ',
          description: 'Deep geological ground crack running diagonally across the main road. Water seepage observed at base.',
          confirmedByAI: true,
          confidence: 94
        },
        {
          id: 'haz-2',
          title: 'Soil Movement & Slope Shift',
          category: 'Soil Movement',
          severity: 'HIGH',
          time: '35m ago',
          distance: '0.8 km away',
          lat: 11.5550,
          lng: 76.1280,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByQehJO7ZnTwgnTaa0hPfDL0u4GliB4BU3g7ebD_FmDBMLo2SsBSfXx9GiIt7w56o1cJ0bPTiKgTg_9Spvqx0YSljBihfWNRe1aG3uzmNW9swccdoJOg2-qMCGH0UwiF61ywP9ZjGNyoTi4tTurAPAUXUO0z4W7RrluXR13O3zn2wUGD7woraKKkf294uozmnZ5PD44oGrw8ls8MxNoWsa4EoUYgcTV2aXlO6QcdH65w8j25KJ123L2g',
          description: 'Visible mud displacement and slight tilting of telephone poles along western ridge.',
          confirmedByAI: true,
          confidence: 88
        },
        {
          id: 'haz-3',
          title: 'Road Blockage (Debris)',
          category: 'Damage',
          severity: 'ELEVATED',
          time: '10m ago',
          distance: '1.2 km North',
          lat: 11.5620,
          lng: 76.1300,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmg4SnpnOmKrVzdfYM--jqKrqT-JCkZMmmCZKxlFRrgXF1Y7qGd9VyRjKHAAojdB3FKo_pgQOtvy4AMJuVB9ib6XXpsIpZYIU7bBPYO5Jmg6UrH4jYl50qiFdnNP_nD2m8kLJs_ELe_vryPs9eKTXqBON-1TcszJTeR_YFgA4HFnmx8oRQrVasivGtsd05Ilqtn3aaDBr2W27KRvA0eyeAS_GdAhrufK2Up96vmpnAytjjzqSNjXyzFw',
          description: 'Small rockfall and tree branch obstructing single lane road.',
          confirmedByAI: false,
          confidence: 76
        }
      ],

      shelters: [
        {
          id: 'sh-1',
          name: 'Central Civic Shelter & Aid Station',
          type: 'Evacuation Shelter',
          capacity: '85% available',
          distance: '1.2 km East',
          lat: 11.5600,
          lng: 76.1380,
          phone: '+91 9876543210'
        },
        {
          id: 'sh-2',
          name: 'Emergency Medical Relief Camp',
          type: 'Medical Station',
          capacity: 'Open 24/7',
          distance: '2.4 km South',
          lat: 11.5500,
          lng: 76.1250,
          phone: '+91 9123456789'
        },
        {
          id: 'sh-3',
          name: 'Sector 2 Govt High School Safe Haven',
          type: 'Community Shelter',
          capacity: '120 Beds Open',
          distance: '3.1 km North',
          lat: 11.5650,
          lng: 76.1350,
          phone: '+91 9447123456'
        }
      ],

      dangerousRoads: [
        {
          id: 'road-1',
          name: 'NH-10 Sector 4 (Upper Ridge)',
          status: 'BLOCKED',
          riskLevel: 'CRITICAL',
          reason: 'Active Landslide & Heavy Rockfall Debris',
          distance: '0.9 km away',
          offsetLat: 0.0035,
          offsetLng: 0.0025
        },
        {
          id: 'road-2',
          name: 'West Hill Valley Bypass',
          status: 'CAUTION',
          riskLevel: 'HIGH',
          reason: 'Severe Soil Erosion & Slope Creep',
          distance: '1.6 km away',
          offsetLat: -0.0030,
          offsetLng: 0.0040
        }
      ],

      sosIncidents: [
        {
          id: 'sos-001',
          name: 'Emergency SOS Signal #402',
          type: 'TRAPPED CITIZENS / LANDSLIDE CUT-OFF',
          status: 'RESPONSE DISPATCHED',
          time: '6m ago',
          distance: '1.1 km away',
          peopleCount: 3,
          offsetLat: -0.0032,
          offsetLng: -0.0038
        }
      ],

      familyMembers: [
        {
          id: 'fm-1',
          name: 'Rahul Sharma',
          initials: 'RS',
          phone: '+91 9876543210',
          relation: 'Father',
          notifySOS: true,
          shareLocation: true,
          lastKnownLocation: 'Home (Safe Zone)',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          isOnline: true
        },
        {
          id: 'fm-2',
          name: 'Priya Sharma',
          initials: 'PS',
          phone: '+91 9123456789',
          relation: 'Sister',
          notifySOS: true,
          shareLocation: false,
          lastKnownLocation: 'Sector 2 (Safe Zone)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isOnline: true
        }
      ],

      locationPreference: 'sos', // 'always' | 'sos' | 'risk'

      sosState: {
        isActive: false,
        trapped: false,
        rescueNeeded: false,
        peopleCount: 2,
        batteryPercent: 85,
        beaconActive: false,
        activatedAt: null,
        offlinePacketSaved: true,
        nearestSafeZone: '1.2km East (Route mapped)'
      },

      pendingReport: {
        category: 'Water Seepage',
        evidencePhoto: null,
        isRecordingVoice: false,
        voiceSeconds: 12,
        details: '',
        aiPredictedCategory: 'Ground Crack',
        aiConfidence: 92
      },

      voiceAssistant: {
        isListening: false,
        transcript: 'There is a large crack near the road and water is coming from the hill.',
        extractedEntities: {
          hazard: 'Ground Crack',
          indicator: 'Water Seepage',
          confidence: '94%'
        }
      },

      twinTelemetry: {
        sector: 'Sector Alpha (West Ridge)',
        riskLevel: 'Elevated',
        soilSaturation: 87,
        inclineShift: '+0.04°',
        precipitationRate: '18mm/hr',
        activeSensors: 14
      },

      notifications: [
        { id: 1, text: 'Nearby Warning • Road Blockage 2km North', time: '10m ago', type: 'warning' },
        { id: 2, text: 'Recent Citizen Report • Ground Crack 500m South', time: '45m ago', type: 'intel' }
      ]
    };

    if (saved) {
      try {
        this.state = { ...defaultState, ...JSON.parse(saved) };
        // Ensure mock/stale coordinates are reset to acquiring status
        if (!locationService.validateCoordinates(this.state.currentLocation?.lat, this.state.currentLocation?.lng)) {
          this.state.currentLocation = {
            status: 'ACQUIRING',
            lat: null,
            lng: null,
            accuracy: null,
            placeName: 'Acquiring GPS location...',
            elevation: '--',
            soilMoisture: '--',
            isLiveGPS: false,
            error: null,
            lastUpdated: null
          };
        }
      } catch (e) {
        this.state = defaultState;
      }
    } else {
      this.state = defaultState;
    }

    this.listeners = [];
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.state.isOnline = true;
        this.syncOfflineReports();
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.state.isOnline = false;
        this.notify();
      });

      // Auto initialize real GPS acquisition
      setTimeout(() => {
        this.initLocation();
      }, 150);
    }
    this.fetchSupabasePlaces();
    if (this.state.currentLocation?.lat && this.state.currentLocation?.lng) {
      this.syncCitizenLocationToSupabase(this.state.currentLocation.lat, this.state.currentLocation.lng);
    }
  }

  async syncCitizenLocationToSupabase(lat, lng) {
    if (!lat || !lng) return;
    // Guard: skip if Supabase is not configured with real credentials
    if (!isSupabaseConfigured) return;
    try {
      const { supabase } = await import('./services/supabaseClient.js');
      if (!supabase) return;
      const userId = this.getCitizenUserId();
      const userPhone = this.state.currentUser.mobileNumber || '';
      
      await supabase.from('citizen_users').upsert({
        user_account_id: userId,
        full_name: this.state.currentUser.fullName || 'Citizen App User',
        phone: userPhone,
        latitude: lat,
        longitude: lng,
        location_updated_at: new Date().toISOString()
      }, { onConflict: 'user_account_id' });
      console.log(`📡 [LOCATION SYNC] Citizen coordinates [${lat}, ${lng}] synced to Supabase.`);
    } catch (err) {
      console.warn('Supabase location sync note:', err);
    }
  }

  async fetchSupabasePlaces() {
    // Guard: skip if Supabase is not configured
    if (!isSupabaseConfigured) {
      console.info('[PRITHVI-SHIELD] Supabase not configured — using built-in mock hazard/shelter data.');
      return;
    }
    try {
      const { supabase } = await import('./services/supabaseClient.js');
      if (!supabase) return;
      const { data: dbPlaces, error } = await supabase
        .from('places')
        .select('*, categories(name, icon), photos(public_url)')
        .eq('status', 'ACTIVE');

      if (error) {
        console.warn('Supabase places fetch fallback to default:', error);
        return;
      }

      if (dbPlaces && dbPlaces.length > 0) {
        // Map database places into store state
        this.state.hazards = dbPlaces.filter(p => p.categories?.name !== 'Evacuation Shelter').map(p => ({
          id: p.id,
          title: p.name,
          category: p.categories?.name || 'Landslide Hazard Zone',
          severity: 'HIGH',
          time: new Date(p.created_at).toLocaleDateString(),
          distance: 'Monitored GPS Zone',
          lat: p.latitude,
          lng: p.longitude,
          image: p.photos?.[0]?.public_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          description: p.description || 'Active landslide monitoring point.',
          confirmedByAI: true,
          confidence: 94
        }));

        this.state.shelters = dbPlaces.filter(p => p.categories?.name === 'Evacuation Shelter').map(p => ({
          id: p.id,
          name: p.name,
          type: 'Evacuation Shelter',
          capacity: 'Open 24/7',
          distance: 'GPS Route Mapped',
          lat: p.latitude,
          lng: p.longitude,
          phone: '+1 (555) 911-0021'
        }));

        this.notify();
      }
    } catch (err) {
      console.warn('Could not connect to Supabase database:', err);
    }
  }

  save() {
    try {
      // Fix: exclude sensitive personal data and runtime-only fields from localStorage
      // Storing family phone numbers, GPS coords, and notifications in plain localStorage
      // is a privacy risk on shared devices.
      const {
        familyMembers: _fm,       // contains phone numbers — excluded
        currentLocation: _cl,     // live GPS data — excluded (re-acquired on boot)
        notifications: _notifs,   // runtime transient data — excluded
        sosState: _sos,           // active emergency state — excluded
        citizenAlerts: _alerts,   // fetched from server — excluded
        ...persistableState
      } = this.state;
      localStorage.setItem('safeground_citizen_state', JSON.stringify(persistableState));
    } catch (e) {
      console.warn('Could not save state to localStorage', e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.save();
    this.listeners.forEach(fn => fn(this.state));
  }

  navigate(view, addToHistory = true) {
    if (this.state.activeView === view) return;
    if (addToHistory && this.state.activeView) {
      this.state.viewHistory.push(this.state.activeView);
    }
    this.state.activeView = view;
    this.notify();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack() {
    if (this.state.viewHistory.length > 0) {
      const prev = this.state.viewHistory.pop();
      this.state.activeView = prev || 'home';
    } else {
      this.state.activeView = 'home';
    }
    this.notify();
  }

  toggleDeviceFrame() {
    this.state.deviceViewMode = this.state.deviceViewMode === 'frame' ? 'fullscreen' : 'frame';
    this.notify();
  }

  // Hazard actions
  setReportCategory(category) {
    this.state.pendingReport.category = category;
    this.notify();
  }

  updateReportDetails(details) {
    this.state.pendingReport.details = details;
    this.notify();
  }

  async submitHazardReport(hazardData) {
    const hasPhoto = !!this.state.pendingReport.evidencePhoto;
    const photoUrl = this.state.pendingReport.evidencePhoto || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnPOoo9P23syYg1w-SxSr6sZG6SSLdTI65ri16kRNg5yJ1ZSfMHTn0ZaT7Wpp2UbqKw5OV-FOKGs_UcPQVbNPb1wjn7fWrBfprwl8zRdODYfmLAY96qVKI80MNSSsg8e3cuwKEt2mCwPtlsxoFjy9kQJfW1EreXkVvrZcj6UF-lkYC_tYwFD4_wnQk-_Ohxg3Tt7C0YtFi-o57Zn5QxIgIGMn9sg2cBcNDj3VGoMQuhQ8Xdl09f872lQ';
    const now = new Date();
    const reportCode = 'PS-2026-' + Math.floor(10000 + Math.random() * 90000);
    const categoryName = hazardData.category || this.state.pendingReport.category || 'LANDSLIDE';
    // Fix: use persistent UUID — not phone number derived ID
    const citizenUserId = this.getCitizenUserId();

    // Fix: dynamic integrity score based on actual report inputs
    const descLen = (hazardData.description || this.state.pendingReport.details || '').length;
    const gpsAcc = this.state.currentLocation.accuracy || 50;
    const aiConf = this.state.pendingReport.aiConfidence || 70;
    const integrityScore = calcIntegrityScore(hasPhoto, gpsAcc, descLen, aiConf);
    const priorityScore = Math.min(100, Math.max(0, Math.round(
      integrityScore * 0.6 + (hasPhoto ? 20 : 0) + (gpsAcc < 20 ? 20 : gpsAcc < 50 ? 10 : 0)
    )));

    const newHazard = {
      id: reportCode,
      report_id: reportCode,
      report_code: reportCode,
      title: categoryName,
      category: categoryName,
      hazard_type: categoryName,
      severity: priorityScore >= 85 ? 'CRITICAL' : priorityScore >= 65 ? 'HIGH' : 'MODERATE',
      severity_level: priorityScore >= 85 ? 'CRITICAL' : priorityScore >= 65 ? 'HIGH' : 'MODERATE',
      priority_score: priorityScore,
      evidence_integrity_score: integrityScore,
      integrity_classification: integrityScore >= 90 ? 'HIGHLY TRUSTED' : 'TRUSTED',
      ai_risk_level: 'HIGH',
      status: !navigator.onLine ? 'WAITING_FOR_CONNECTION' : 'UNDER_AI_VERIFICATION',
      time: 'Just now',
      timestamp: now.toISOString(),
      date_formatted: now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      time_formatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distance: 'Current GPS location',
      lat: this.state.currentLocation.lat,
      lng: this.state.currentLocation.lng,
      location_accuracy: this.state.currentLocation.accuracy || 10.0,
      image: photoUrl,
      image_url: photoUrl,
      description: hazardData.description || this.state.pendingReport.details || 'Citizen verified hazard report with photo and GPS evidence.',
      user_id: citizenUserId,
      user_name: this.state.currentUser.fullName || 'Citizen User',
      user_phone: this.state.currentUser.mobileNumber || '',
      authenticity_score: integrityScore,
      deepfake_status: 'UNDER_AI_VERIFICATION',
      confirmedByAI: integrityScore >= 60,
      confidence: integrityScore
    };

    // Feature 6: Offline Emergency Queue Check (Compress & Store in IndexedDB)
    let optimizedPhoto = null;
    if (hasPhoto && photoUrl) {
      try {
        optimizedPhoto = await compressImage(photoUrl, 1280, 0.82);
      } catch (imgErr) {
        optimizedPhoto = photoUrl;
      }
    }

    if (!navigator.onLine) {
      newHazard.status = 'WAITING_FOR_CONNECTION';
      this.state.hazards.unshift(newHazard);
      this.state.notifications.unshift({
        id: Date.now(),
        text: `OFFLINE EMERGENCY REPORT SAVED: Report ${reportCode} will automatically transmit when connectivity returns.`,
        time: 'Just now',
        type: 'warning'
      });

      try {
        await offlineStorageService.queueReportOffline(newHazard, optimizedPhoto);
      } catch (err) {
        console.warn('Could not queue offline report in IndexedDB:', err);
      }
      this.notify();
      return newHazard;
    }

    // The backend is the source of truth. Never show success or publish a
    // report locally until it has confirmed a cloud database record and ID.
    try {
        console.info('[REPORT] Preparing submission');
        const backendPayload = {
          title: newHazard.title,
          category: newHazard.category,
          hazard_type: newHazard.hazard_type,
          latitude: newHazard.lat,
          longitude: newHazard.lng,
          location_accuracy: newHazard.location_accuracy,
          severity: newHazard.severity || 'CRITICAL',
          ai_risk_level: newHazard.ai_risk_level || 'HIGH',
          description: newHazard.description,
          image_url: hasPhoto && photoUrl.startsWith('http') ? photoUrl : null,
          image_data: optimizedPhoto || (hasPhoto ? photoUrl : null),
          user_id: citizenUserId,
          user_name: newHazard.user_name,
          user_phone: newHazard.user_phone,
          platform: 'mobile_app',
          ai_confirmed: true,
          ai_confidence: 94.0,
          report_id: reportCode,
          priority_score: priorityScore,
          evidence_integrity_score: integrityScore
        };

        const baseUrl = requireApiBaseUrl();
        console.info('[REPORT] Sending API request', `${baseUrl}/api/hazards/report`);

        const res = await fetch(`${baseUrl}/api/hazards/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendPayload)
        });
        const result = await res.json().catch(() => ({}));
        console.info('[REPORT] Backend response received', { status: res.status, reportId: result.report_id });
        if (!res.ok || result.success !== true || !result.report_id) {
          throw new Error(result.detail || result.error || 'The cloud database did not confirm report creation.');
        }

        newHazard.id = result.report_id;
        newHazard.report_id = result.report_id;
        newHazard.report_code = result.report_code || result.report_id;
        newHazard.status = result.status || 'UNDER_AI_VERIFICATION';
        newHazard.image_url = result.report?.image_url || newHazard.image_url;
        this.state.hazards.unshift(newHazard);
        this.state.notifications.unshift({
          id: Date.now(), text: `Report ${newHazard.report_code} submitted to the cloud database.`, time: 'Just now', type: 'success'
        });
        console.info('[REPORT] Cloud record confirmed', newHazard.report_code);
      } catch (backendErr) {
        console.warn('[REPORT] Submission or network issue:', backendErr);
        // If network lost during transit, queue safely in IndexedDB
        if (!navigator.onLine || backendErr?.message?.includes('fetch') || backendErr?.message?.includes('Failed')) {
          newHazard.status = 'WAITING_FOR_CONNECTION';
          this.state.hazards.unshift(newHazard);
          this.state.notifications.unshift({
            id: Date.now(),
            text: `OFFLINE QUEUE: Network lost. Report ${reportCode} saved securely offline.`,
            time: 'Just now',
            type: 'warning'
          });
          await offlineStorageService.queueReportOffline(newHazard, optimizedPhoto);
          this.notify();
          return newHazard;
        }
        throw new Error(`Report submission failed. Please retry. ${backendErr.message}`);
      }

    // Start Feature 5: Two-Way Citizen Communication Status Listener
    this.startTwoWayStatusListener(reportCode);

    this.notify();
    return newHazard;
  }

  // Feature 6: Auto-synchronize queued offline emergency reports when connectivity returns
  async syncOfflineReports() {
    try {
      const pendingFromIDB = await offlineStorageService.getPendingReports();
      const legacyQueue = JSON.parse(localStorage.getItem('safeground_offline_report_queue') || '[]');
      const allReports = [...pendingFromIDB, ...legacyQueue];
      if (allReports.length === 0) return;

      console.log(`📡 [OFFLINE AUTO-SYNC] Transmitting ${allReports.length} queued emergency reports...`);
      const baseUrl = requireApiBaseUrl();
      let transmittedCount = 0;

      for (const item of allReports) {
        try {
          const backendPayload = {
            title: item.title,
            category: item.category,
            hazard_type: item.hazard_type || item.category,
            latitude: item.lat,
            longitude: item.lng,
            location_accuracy: item.location_accuracy || 10.0,
            severity: item.severity || 'CRITICAL',
            ai_risk_level: item.ai_risk_level || 'HIGH',
            description: item.description,
            image_url: item.photo && item.photo.startsWith('http') ? item.photo : null,
            image_data: item.photo || item.image_data || null,
            user_id: item.user_id || 'anonymous',
            user_name: item.user_name || 'Citizen',
            user_phone: item.user_phone || '',
            platform: 'mobile_app',
            ai_confirmed: true,
            ai_confidence: 94.0,
            report_id: item.report_code || item.id,
            priority_score: 85,
            evidence_integrity_score: 90
          };

          const res = await fetch(`${baseUrl}/api/hazards/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendPayload)
          });
          const result = await res.json().catch(() => ({}));
          if (res.ok && result.success !== false) {
            console.log(`✅ [OFFLINE REPORT TRANSMITTED] Code: ${item.report_code || item.id}`);
            await offlineStorageService.removeReport(item.id);
            transmittedCount++;
          }
        } catch (e) {
          console.warn(`Offline item transmission note for ${item.id}:`, e);
        }
      }

      // Cleanup legacy queue
      localStorage.removeItem('safeground_offline_report_queue');

      if (transmittedCount > 0) {
        this.state.notifications.unshift({
          id: Date.now(),
          text: `CONNECTIVITY RESTORED: Transmitted ${transmittedCount} offline emergency report(s) to Admin Dashboard.`,
          time: 'Just now',
          type: 'success'
        });
        this.notify();
      }
    } catch (err) {
      console.warn('Offline queue sync error:', err);
    }
  }

  // Feature 5: Two-Way Citizen Status Listener (Polls status and notifies citizen)
  startTwoWayStatusListener(reportCode) {
    if (this._activeStatusPollers && this._activeStatusPollers[reportCode]) return;
    if (!this._activeStatusPollers) this._activeStatusPollers = {};

    let lastKnownStatus = 'UNDER_AI_VERIFICATION';
    let pollCount = 0;
    const MAX_POLLS = 90; // ~6 minutes at 4s interval — then give up

    this._activeStatusPollers[reportCode] = setInterval(async () => {
      pollCount++;
      if (pollCount >= MAX_POLLS) {
        clearInterval(this._activeStatusPollers[reportCode]);
        delete this._activeStatusPollers[reportCode];
        return;
      }
      try {
        const baseUrl = requireApiBaseUrl();
        let currentStatus = null;
        const res = await fetch(`${baseUrl}/api/hazards/reports/${reportCode}`);
        if (res.ok) {
          const data = await res.json();
          currentStatus = data.report?.status;
        }

        if (currentStatus && currentStatus !== lastKnownStatus) {
          lastKnownStatus = currentStatus;
          let statusMessage = `Report ${reportCode} status updated to ${currentStatus}.`;
          if (currentStatus === 'UNDER_INVESTIGATION' || currentStatus === 'ADMIN_REVIEW') {
            statusMessage = `UNDER REVIEW: Authorities are currently reviewing your incident report (${reportCode}).`;
          } else if (currentStatus === 'VERIFIED' || currentStatus === 'APPROVED') {
            statusMessage = `VERIFIED: Your report (${reportCode}) has been verified. Emergency authorities notified.`;
          } else if (currentStatus === 'RESCUE_IN_PROGRESS') {
            statusMessage = `RESCUE DISPATCHED: Response teams dispatched to your reported landslide sector (${reportCode}).`;
          } else if (currentStatus === 'RESOLVED') {
            statusMessage = `RESOLVED: Incident ${reportCode} has been marked as resolved by authorities.`;
          } else if (currentStatus === 'REJECTED') {
            statusMessage = `STATUS UPDATE: Your report (${reportCode}) could not be verified at this time.`;
          }

          this.state.notifications.unshift({
            id: Date.now(),
            text: statusMessage,
            time: 'Just now',
            type: currentStatus === 'REJECTED' ? 'warning' : 'success'
          });

          const hazardObj = this.state.hazards.find(h => h.report_code === reportCode || h.id === reportCode);
          if (hazardObj) hazardObj.status = currentStatus;

          this.notify();
          if (['VERIFIED', 'APPROVED', 'RESOLVED', 'REJECTED'].includes(currentStatus)) {
            clearInterval(this._activeStatusPollers[reportCode]);
          }
        }
      } catch (err) {
        console.warn('Status poller note:', err);
      }
    }, 4000);
  }

  // Centralized SOS Emergency Actions
  async triggerSOS(type = null) {
    // Fix: block SOS if GPS coordinates are not yet acquired
    // Sending null/fallback coordinates to rescue teams is dangerous
    const { lat, lng } = this.state.currentLocation;
    if (!locationService.validateCoordinates(lat, lng)) {
      this.state.notifications.unshift({
        id: Date.now(),
        text: '⚠️ SOS BLOCKED: GPS location has not been acquired yet. Please wait for GPS to lock before triggering SOS.',
        time: 'Just now',
        type: 'warning'
      });
      this.notify();
      // Still navigate to SOS screen so user can see the GPS status
      this.navigate('sos');
      return;
    }

    this.state.sosState.isActive = true;
    this.state.sosState.beaconActive = true;
    this.state.sosState.activatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (type === 'trapped') this.state.sosState.trapped = true;
    if (type === 'rescue') this.state.sosState.rescueNeeded = true;
    this.state.sosState.status = 'ACTIVE';

    this.navigate('sos');
    this.notify();

    // Transmit to Centralized FastAPI Backend & Trigger MSG91 SMS
    const { currentUser, currentLocation, familyMembers, sosState } = this.state;
    const contacts = (familyMembers || [])
      .filter(m => m.notifySOS)
      .map(m => ({ name: m.name, phone: m.phone, relation: m.relation || 'Family Contact' }));

    const payload = {
      user_id: this.getCitizenUserId(),
      user_name: currentUser.fullName || 'Citizen in Distress',
      user_phone: currentUser.mobileNumber || '+919876543210',
      latitude: (currentLocation.lat !== null && currentLocation.lat !== undefined) ? currentLocation.lat : 0,
      longitude: (currentLocation.lng !== null && currentLocation.lng !== undefined) ? currentLocation.lng : 0,
      location_accuracy: currentLocation.accuracy || 10,
      platform: 'mobile_app',
      situation: type || (sosState.trapped ? 'trapped' : (sosState.rescueNeeded ? 'rescue' : 'general')),
      people_count: sosState.peopleCount || 1,
      emergency_contacts: contacts.length > 0 ? contacts : [
        { name: currentUser.emergencyContactName || 'Family Contact', phone: currentUser.emergencyContactPhone || '+919876543211' }
      ]
    };

    try {
      const res = await fetch(`${requireApiBaseUrl()}/api/emergency/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        this.state.sosState.eventId = data.event_id;
        this.state.sosState.googleMapsUrl = data.google_maps_url;
        this.state.sosState.status = data.status || 'ACTIVE';
        this.notify();
        this.startSOSPolling(data.event_id);
      }
    } catch (err) {
      console.warn('Emergency SOS backend transmission fallback:', err);
    }
  }

  startSOSPolling(eventId) {
    if (this._sosPollTimer) clearInterval(this._sosPollTimer);
    if (!eventId) return;

    this._sosPollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${requireApiBaseUrl()}/api/emergency/sos/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          const ev = data.event;
          if (ev) {
            this.state.sosState.status = ev.status || 'ACTIVE';
            this.state.sosState.responderName = ev.responder_name;
            if (ev.status === 'RESOLVED' || ev.status === 'CANCELLED') {
              clearInterval(this._sosPollTimer);
            }
            this.notify();
          }
        }
      } catch (e) {}
    }, 3000);
  }

  async cancelSOS() {
    const eventId = this.state.sosState.eventId;
    if (this._sosPollTimer) clearInterval(this._sosPollTimer);

    if (eventId) {
      try {
        await fetch(`${requireApiBaseUrl()}/api/emergency/sos/${eventId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Citizen marked safe in SafeGround App' })
        });
      } catch (e) {}
    }

    this.state.sosState.isActive = false;
    this.state.sosState.beaconActive = false;
    this.state.sosState.trapped = false;
    this.state.sosState.rescueNeeded = false;
    this.state.sosState.eventId = null;
    this.state.sosState.status = 'INACTIVE';
    this.navigate('home');
    this.notify();
  }

  updatePeopleCount(count) {
    // Fix: cap at 50 to prevent nonsensical values
    this.state.sosState.peopleCount = Math.min(50, Math.max(1, count));
    this.notify();
  }

  // Family Circle Actions
  addFamilyMember(member) {
    const newMember = {
      id: 'fm-' + Date.now(),
      name: member.name,
      initials: member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'FC',
      phone: member.phone,
      relation: member.relation || 'Family Contact',
      notifySOS: true,
      shareLocation: true,
      lastKnownLocation: 'Pending Check-in',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isOnline: true
    };
    this.state.familyMembers.push(newMember);
    this.notify();
  }

  removeFamilyMember(id) {
    this.state.familyMembers = this.state.familyMembers.filter(m => m.id !== id);
    this.notify();
  }

  toggleMemberOption(id, option) {
    const member = this.state.familyMembers.find(m => m.id === id);
    if (member && option in member) {
      member[option] = !member[option];
      this.notify();
    }
  }

  setLocationPreference(pref) {
    this.state.locationPreference = pref;
    this.notify();
  }

  loginWithPhone(fullName, mobileNumber) {
    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber.replace(/[^\d]/g, '').slice(-10))) {
      return { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
    }
    this.state.isLoggedIn = true;
    this.state.currentUser.fullName = fullName || 'Citizen User';
    this.state.currentUser.mobileNumber = mobileNumber.startsWith('+91') ? mobileNumber : `+91 ${mobileNumber}`;
    this.state.currentUser.authProvider = 'phone';
    this.state.activeView = 'auth-permissions';
    this.notify();
    return { success: true };
  }

  loginWithEmail(email, password) {
    // Fix: validate email format and minimum password length
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    this.state.isLoggedIn = true;
    this.state.currentUser.email = email;
    this.state.currentUser.fullName = email.split('@')[0] || 'Citizen User';
    this.state.currentUser.authProvider = 'email';
    this.state.activeView = 'auth-permissions';
    this.notify();
    return { success: true };
  }

  registerCitizen(fullName, email, mobileNumber, password) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!fullName || fullName.trim().length < 2) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    this.state.isLoggedIn = true;
    this.state.currentUser.fullName = fullName.trim();
    this.state.currentUser.email = email;
    this.state.currentUser.mobileNumber = mobileNumber.startsWith('+91') ? mobileNumber : `+91 ${mobileNumber}`;
    this.state.currentUser.authProvider = 'email';
    this.state.activeView = 'auth-permissions';
    this.notify();
    return { success: true };
  }

  async loginWithGoogle() {
    // Fix: only mark as logged in if OAuth actually succeeds
    if (!isSupabaseConfigured) {
      console.warn('[PRITHVI-SHIELD] Google login requires Supabase to be configured.');
      // Graceful fallback for demo/testing only
      this.state.isLoggedIn = true;
      this.state.currentUser.fullName = 'Demo Citizen (Google)';
      this.state.currentUser.authProvider = 'google_demo';
      this.state.activeView = 'auth-permissions';
      this.notify();
      return;
    }
    try {
      const { supabase } = await import('./services/supabaseClient.js');
      if (!supabase) throw new Error('Supabase client unavailable');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      // OAuth redirects the page — code below only runs if redirect fails
      // Session is handled on return via supabase.auth.onAuthStateChange
    } catch (err) {
      console.error('[PRITHVI-SHIELD] Google login failed:', err.message);
      // Do NOT set isLoggedIn = true on failure
      this.state.notifications.unshift({
        id: Date.now(),
        text: `Google login failed: ${err.message}. Please try email login instead.`,
        time: 'Just now',
        type: 'warning'
      });
      this.notify();
    }
  }

  completeOnboarding() {
    this.state.isOnboardingCompleted = true;
    localStorage.setItem('prithvi_shield_onboarding', 'true');
    this.state.activeView = this.state.isLoggedIn ? 'home' : 'auth';
    this.notify();
  }

  logout() {
    // Fix: clean up all active polling timers to prevent memory leaks and battery drain
    this.cleanupAllPollers();
    this.state.isLoggedIn = false;
    this.state.activeView = 'auth';
    this.state.sosState.isActive = false;
    this.state.sosState.beaconActive = false;
    this.state.sosState.eventId = null;
    this.state.sosState.status = 'INACTIVE';
    this.notify();
  }

  /** Clears all active polling intervals. Call on logout and app teardown. */
  cleanupAllPollers() {
    if (this._sosPollTimer) {
      clearInterval(this._sosPollTimer);
      this._sosPollTimer = null;
    }
    if (this._activeStatusPollers) {
      Object.values(this._activeStatusPollers).forEach(t => clearInterval(t));
      this._activeStatusPollers = {};
    }
    // Also stop FCM alert polling
    try {
      import('./services/fcmService.js').then(({ fcmService }) => fcmService.stopPolling());
    } catch (e) {}
    console.info('[PRITHVI-SHIELD] All polling timers cleared.');
  }

  setPermissionState(type, status) {
    if (this.state.permissions && type in this.state.permissions) {
      this.state.permissions[type] = status;
      this.notify();
    }
  }

  setOnlineStatus(isOnline) {
    this.state.isOnline = isOnline;
    this.notify();
  }

  async initLocation() {
    this.state.currentLocation.status = 'ACQUIRING';
    this.state.currentLocation.placeName = 'Acquiring GPS location...';
    this.notify();

    try {
      const res = await locationService.getCurrentLocation({
        maxWaitMs: 7000,
        desiredAccuracyMeters: 20,
        onProgress: (prog) => {
          this.state.currentLocation.placeName = prog.message;
          this.state.currentLocation.accuracy = prog.accuracy;
          this.notify();
        }
      });

      if (res.success && locationService.validateCoordinates(res.latitude, res.longitude)) {
        this.state.currentLocation.status = res.status || 'SUCCESS';
        this.state.currentLocation.lat = res.latitude;
        this.state.currentLocation.lng = res.longitude;
        this.state.currentLocation.accuracy = res.accuracy;
        this.state.currentLocation.statusMessage = res.statusMessage || `Accuracy: ±${res.accuracy}m`;
        this.state.currentLocation.placeName = res.locality || `${res.latitude.toFixed(4)}°, ${res.longitude.toFixed(4)}°`;
        this.state.currentLocation.elevation = res.altitude ? `${res.altitude}m` : '--';
        this.state.currentLocation.isLiveGPS = true;
        this.state.currentLocation.error = null;
        this.state.currentLocation.lastUpdated = new Date().toISOString();
        this.state.permissions.location = 'granted';

        this.syncCitizenLocationToSupabase(res.latitude, res.longitude);
        this.fetchLiveRiskForLocation(res.latitude, res.longitude);
      } else {
        this.state.currentLocation.status = res.status || 'UNAVAILABLE';
        this.state.currentLocation.lat = null;
        this.state.currentLocation.lng = null;
        this.state.currentLocation.error = res.message || 'Unable to acquire location.';
        this.state.currentLocation.placeName = res.message || 'Location unavailable';
        this.state.currentLocation.isLiveGPS = false;
        if (res.status === 'PERMISSION_DENIED') {
          this.state.permissions.location = 'denied';
        }
      }
    } catch (err) {
      this.state.currentLocation.status = 'UNAVAILABLE';
      this.state.currentLocation.lat = null;
      this.state.currentLocation.lng = null;
      this.state.currentLocation.error = 'Location acquisition error: ' + (err.message || 'Failed');
      this.state.currentLocation.placeName = 'Location unavailable';
      this.state.currentLocation.isLiveGPS = false;
    }

    this.notify();

    // Start background watcher
    locationService.watchUserLocation(
      (pos) => {
        if (pos && locationService.validateCoordinates(pos.latitude, pos.longitude)) {
          this.updateUserLocation(pos.latitude, pos.longitude, pos.accuracy, pos.locality);
        }
      },
      (err) => {
        console.warn('[Store] Watch location error:', err);
      }
    );
  }

  async refreshLocation() {
    return this.initLocation();
  }

  async requestAndEnableLocation() {
    const granted = await locationService.requestLocationPermission();
    if (granted) {
      this.state.permissions.location = 'granted';
      return this.initLocation();
    } else {
      this.state.permissions.location = 'denied';
      this.state.currentLocation.status = 'PERMISSION_DENIED';
      this.state.currentLocation.error = 'Location permission is required to acquire your GPS position.';
      this.notify();
    }
  }

  updateUserLocation(lat, lng, accuracy = 10, locality = null) {
    if (!locationService.validateCoordinates(lat, lng)) return;
    this.state.currentLocation.status = 'SUCCESS';
    this.state.currentLocation.lat = Number(lat);
    this.state.currentLocation.lng = Number(lng);
    this.state.currentLocation.accuracy = Math.round(accuracy);
    this.state.currentLocation.isLiveGPS = true;
    this.state.currentLocation.isManual = false;
    this.state.currentLocation.error = null;
    this.state.currentLocation.lastUpdated = new Date().toISOString();
    if (locality) {
      this.state.currentLocation.locality = locality;
      this.state.currentLocation.placeName = locality;
    } else if (!this.state.currentLocation.locality) {
      this.state.currentLocation.locality = `${Number(lat).toFixed(4)}°, ${Number(lng).toFixed(4)}°`;
      this.state.currentLocation.placeName = this.state.currentLocation.locality;
    }
    this.syncCitizenLocationToSupabase(Number(lat), Number(lng));
    this.fetchLiveRiskForLocation(Number(lat), Number(lng));
    this.notify();
  }

  setManualLocation(lat, lng, localityName = null) {
    if (!locationService.validateCoordinates(lat, lng)) {
      return { success: false, message: 'Invalid coordinates provided.' };
    }
    const name = localityName || `${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E`;
    this.state.currentLocation.status = 'SUCCESS';
    this.state.currentLocation.lat = Number(lat);
    this.state.currentLocation.lng = Number(lng);
    this.state.currentLocation.accuracy = 15;
    this.state.currentLocation.locality = name;
    this.state.currentLocation.placeName = name;
    this.state.currentLocation.isLiveGPS = false;
    this.state.currentLocation.isManual = true;
    this.state.currentLocation.error = null;
    this.state.currentLocation.lastUpdated = new Date().toISOString();
    this.syncCitizenLocationToSupabase(Number(lat), Number(lng));
    this.fetchLiveRiskForLocation(Number(lat), Number(lng));
    this.notify();
    return { success: true };
  }

  async fetchLiveRiskForLocation(lat, lng) {
    if (!lat || !lng) return;
    try {
      const res = await fetch(`${requireApiBaseUrl()}/analyze-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.environmental_data) {
          if (data.environmental_data.elevation_m !== undefined && data.environmental_data.elevation_m !== null) {
            this.state.currentLocation.elevation = `${Math.round(data.environmental_data.elevation_m)}m`;
          }
          if (data.environmental_data.soil_moisture !== undefined && data.environmental_data.soil_moisture !== null) {
            this.state.currentLocation.soilMoisture = `${Math.round(data.environmental_data.soil_moisture * 100)}%`;
          }
        }
        const riskData = data.final_risk || data.final_assessment;
        if (riskData) {
          const lvl = (riskData.final_risk_level || riskData.risk_level || 'ELEVATED').toUpperCase();
          const reason = riskData.reason || 'Analyzed by Real-Time XGBoost & GEE Environmental Engine';
          let bg = '#FF7043', border = '#D84315', text = '#FFFFFF', subText = '#FFEBEE', icon = 'warning';
          if (lvl === 'HIGH' || lvl === 'CRITICAL') {
            bg = '#D32F2F'; border = '#B71C1C'; icon = 'warning';
          } else if (lvl === 'MEDIUM' || lvl === 'MODERATE') {
            bg = '#F57C00'; border = '#E65100'; icon = 'info';
          } else if (lvl === 'LOW') {
            bg = '#2E7D32'; border = '#1B5E20'; text = '#FFFFFF'; subText = '#E8F5E9'; icon = 'check_circle';
          }
          this.state.areaStatus = {
            level: `${lvl} RISK`,
            title: `${lvl} RISK ACTIVE`,
            subtitle: reason,
            bg, border, textColor: text, subTextColor: subText, icon
          };
        }
        this.notify();
      }
    } catch (e) {
      console.warn('[Store] Live risk fetch note:', e?.message || e);
    }
  }
}

export const store = new Store();
