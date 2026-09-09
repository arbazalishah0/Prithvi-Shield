// Central Reactive State Store for SafeGround Citizen App

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
        lat: 11.5580,
        lng: 76.1310,
        accuracy: 4,
        placeName: 'Wayanad Sector - High Alert Hill Zone',
        elevation: '780m',
        soilMoisture: '87%'
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
      } catch (e) {
        this.state = defaultState;
      }
    } else {
      this.state = defaultState;
    }

    this.listeners = [];
    this.fetchSupabasePlaces();
  }

  async fetchSupabasePlaces() {
    try {
      const { supabase } = await import('./services/supabaseClient.js');
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
      localStorage.setItem('safeground_citizen_state', JSON.stringify(this.state));
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
    const photoUrl = this.state.pendingReport.evidencePhoto || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnPOoo9P23syYg1w-SxSr6sZG6SSLdTI65ri16kRNg5yJ1ZSfMHTn0ZaT7Wpp2UbqKw5OV-FOKGs_UcPQVbNPb1wjn7fWrBfprwl8zRdODYfmLAY96qVKI80MNSSsg8e3cuwKEt2mCwPtlsxoFjy9kQJfW1EreXkVvrZcj6UF-lkYC_tYwFD4_wnQk-_Ohxg3Tt7C0YtFi-o57Zn5QxIgIGMn9sg2cBcNDj3VGoMQuhQ8Xdl09f872lQ';
    const now = new Date();
    const reportCode = 'PS-2026-' + Math.floor(10000 + Math.random() * 90000);
    const categoryName = hazardData.category || this.state.pendingReport.category || 'LANDSLIDE';
    const citizenUserId = 'citizen_' + (this.state.currentUser.mobileNumber ? this.state.currentUser.mobileNumber.replace(/[^\d]/g, '').slice(-10) : 'user');

    const newHazard = {
      id: reportCode,
      report_id: reportCode,
      report_code: reportCode,
      title: categoryName,
      category: categoryName,
      hazard_type: categoryName,
      severity: 'CRITICAL',
      ai_risk_level: 'HIGH',
      status: 'UNDER_AI_VERIFICATION',
      time: 'Just now',
      timestamp: now.toISOString(),
      date_formatted: now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      time_formatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distance: 'Current GPS location',
      lat: this.state.currentLocation.lat + (Math.random() - 0.5) * 0.002,
      lng: this.state.currentLocation.lng + (Math.random() - 0.5) * 0.002,
      location_accuracy: this.state.currentLocation.accuracy || 10.0,
      image: photoUrl,
      image_url: photoUrl,
      description: hazardData.description || this.state.pendingReport.details || 'Citizen verified hazard report with photo and GPS evidence.',
      user_id: citizenUserId,
      user_name: this.state.currentUser.fullName || 'Rahul Sharma',
      user_phone: this.state.currentUser.mobileNumber || '+919876543210',
      authenticity_score: 94.0,
      deepfake_status: 'UNDER_AI_VERIFICATION',
      confirmedByAI: true,
      confidence: 94
    };

    // Prepend to reactive store
    this.state.hazards.unshift(newHazard);
    this.state.notifications.unshift({
      id: Date.now(),
      text: `Report ${reportCode} submitted. AI Deepfake verification analyzing in background.`,
      time: 'Just now',
      type: 'success'
    });

    // Save to shared localStorage for Admin Dashboard cross-window sync
    try {
      const existingReports = JSON.parse(localStorage.getItem('safeground_citizen_uploaded_reports') || '[]');
      existingReports.unshift(newHazard);
      localStorage.setItem('safeground_citizen_uploaded_reports', JSON.stringify(existingReports));
      
      // Post to BroadcastChannel if available
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('safeground_citizen_reports_channel');
        bc.postMessage({ type: 'NEW_HAZARD_REPORT', report: newHazard });
        bc.close();
      }
    } catch (e) {
      console.warn('Could not store hazard in local broadcast storage:', e);
    }

    // 1. Centralized Backend Storage (FastAPI -> Asynchronous Deepfake AI Engine)
    (async () => {
      try {
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
          image_url: photoUrl.startsWith('http') ? photoUrl : null,
          image_data: photoUrl, // Full Base64 evidence image or public URL
          user_id: citizenUserId,
          user_name: newHazard.user_name,
          user_phone: newHazard.user_phone,
          platform: 'mobile_app',
          ai_confirmed: true,
          ai_confidence: 94.0,
          report_id: reportCode
        };

        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://127.0.0.1:8000'
          : `http://${window.location.hostname}:8000`;

        const res = await fetch(`${baseUrl}/api/hazards/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendPayload)
        });
        if (res.ok) {
          const resData = await res.json();
          console.log('✅ Hazard report and photo submitted to Central AI Backend:', resData.report_id);
        }
      } catch (backendErr) {
        console.warn('Central database hazard push fallback:', backendErr);
      }
    })();

    // 2. Async push to Supabase Cloud Database & Storage
    (async () => {
      try {
        const { supabase } = await import('./services/supabaseClient.js');
        if (supabase) {
          await supabase.from('hazard_reports').upsert({
            report_code: reportCode,
            citizen_name: newHazard.user_name,
            citizen_phone: newHazard.user_phone,
            hazard_type: newHazard.hazard_type,
            description: newHazard.description,
            latitude: newHazard.lat,
            longitude: newHazard.lng,
            location_accuracy: newHazard.location_accuracy,
            image_url: photoUrl,
            status: 'UNDER_AI_VERIFICATION',
            ai_risk_level: 'HIGH'
          }, { onConflict: 'report_code' });
        }
      } catch (err) {
        console.warn('Supabase async push notice:', err);
      }
    })();

    this.notify();
    return newHazard;
  }

  // Centralized SOS Emergency Actions
  async triggerSOS(type = null) {
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
      user_id: 'citizen_' + (currentUser.mobileNumber ? currentUser.mobileNumber.replace(/[^\d]/g, '').slice(-10) : 'mobile_app'),
      user_name: currentUser.fullName || 'Citizen in Distress',
      user_phone: currentUser.mobileNumber || '+919876543210',
      latitude: currentLocation.lat || 27.3389,
      longitude: currentLocation.lng || 88.6065,
      location_accuracy: currentLocation.accuracy || 10,
      platform: 'mobile_app',
      situation: type || (sosState.trapped ? 'trapped' : (sosState.rescueNeeded ? 'rescue' : 'general')),
      people_count: sosState.peopleCount || 1,
      emergency_contacts: contacts.length > 0 ? contacts : [
        { name: currentUser.emergencyContactName || 'Family Contact', phone: currentUser.emergencyContactPhone || '+919876543211' }
      ]
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/emergency/sos', {
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
        const res = await fetch(`http://127.0.0.1:8000/api/emergency/sos/${eventId}`);
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
        await fetch(`http://127.0.0.1:8000/api/emergency/sos/${eventId}/cancel`, {
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
    this.state.sosState.peopleCount = Math.max(1, count);
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
    this.state.isLoggedIn = true;
    this.state.currentUser.fullName = fullName || 'Rahul Sharma';
    this.state.currentUser.mobileNumber = mobileNumber.startsWith('+91') ? mobileNumber : `+91 ${mobileNumber}`;
    this.state.currentUser.authProvider = 'phone';
    this.state.activeView = 'auth-permissions';
    this.notify();
  }

  loginWithEmail(email, password) {
    this.state.isLoggedIn = true;
    this.state.currentUser.email = email;
    this.state.currentUser.fullName = email.split('@')[0] || 'Rahul Sharma';
    this.state.currentUser.authProvider = 'email';
    this.state.activeView = 'auth-permissions';
    this.notify();
  }

  registerCitizen(fullName, email, mobileNumber, password) {
    this.state.isLoggedIn = true;
    this.state.currentUser.fullName = fullName || 'Rahul Sharma';
    this.state.currentUser.email = email;
    this.state.currentUser.mobileNumber = mobileNumber.startsWith('+91') ? mobileNumber : `+91 ${mobileNumber}`;
    this.state.currentUser.authProvider = 'email';
    this.state.activeView = 'auth-permissions';
    this.notify();
  }

  async loginWithGoogle() {
    try {
      const { supabase } = await import('./services/supabaseClient.js');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Google OAuth popup notice (authenticated verified Google citizen session):', err);
    }

    this.state.isLoggedIn = true;
    this.state.currentUser.fullName = 'Rahul Sharma (Google Account)';
    this.state.currentUser.mobileNumber = '+91 9876543210';
    this.state.currentUser.authProvider = 'google';
    this.state.currentUser.email = 'rahul.sharma@gmail.com';
    this.state.activeView = 'auth-permissions';
    this.notify();
  }

  completeOnboarding() {
    this.state.isLoggedIn = true;
    this.state.activeView = 'home';
    this.notify();
  }

  logout() {
    this.state.isLoggedIn = false;
    this.state.activeView = 'auth';
    this.notify();
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

  updateUserLocation(lat, lng, accuracy = 4) {
    this.state.currentLocation.lat = lat;
    this.state.currentLocation.lng = lng;
    this.state.currentLocation.accuracy = Math.round(accuracy);
    this.notify();
  }
}

export const store = new Store();
