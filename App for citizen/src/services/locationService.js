/**
 * PRITHVI-SHIELD / SafeGround Centralized Native & Web Location Service
 * Implements strict GPS validation, Capacitor native Geolocation with browser fallback,
 * reverse geocoding without fake defaults, and continuous location synchronization.
 */

import { Geolocation } from '@capacitor/geolocation';

// Known mock / default coordinates to strictly reject
const BANNED_COORDINATE_PAIRS = [
  { lat: 18.4729, lng: -73.9162 }, // Los Angeles Hills mock (wrong hemisphere)
  { lat: 34.0522, lng: -118.2437 }, // Los Angeles Downtown
  { lat: 0, lng: 0 }                 // Null Island
];

class LocationService {
  constructor() {
    this.watchId = null;
    this.cachedLocality = null;
    this.cachedLocalityCoords = null;
    this.isCapacitor = typeof window !== 'undefined' && !!window.Capacitor && window.Capacitor.isNativePlatform();
  }

  /**
   * Validate geographic coordinates
   * Rejects null, undefined, NaN, zeroes, out-of-range, and mock values.
   */
  validateCoordinates(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const numLat = Number(lat);
    const numLng = Number(lng);

    if (isNaN(numLat) || isNaN(numLng)) return false;
    if (numLat < -90 || numLat > 90) return false;
    if (numLng < -180 || numLng > 180) return false;

    // Reject exact zero (Null Island)
    if (Math.abs(numLat) < 0.00001 && Math.abs(numLng) < 0.00001) return false;

    // Reject known test/mock coordinates
    for (const banned of BANNED_COORDINATE_PAIRS) {
      if (Math.abs(numLat - banned.lat) < 0.001 && Math.abs(numLng - banned.lng) < 0.001) {
        console.warn(`[LocationService] Rejected banned mock coordinate pair: [${lat}, ${lng}]`);
        return false;
      }
    }

    return true;
  }

  /**
   * Formats coordinates into standard geographical hemisphere strings
   * Example: 18.5204° N, 73.8567° E (Never forces ° W for Eastern Hemisphere!)
   */
  formatCoordinates(lat, lng) {
    if (!this.validateCoordinates(lat, lng)) {
      return {
        latText: '--',
        lngText: '--',
        fullText: 'Location pending'
      };
    }

    const numLat = Number(lat);
    const numLng = Number(lng);

    const latDir = numLat >= 0 ? 'N' : 'S';
    const lngDir = numLng >= 0 ? 'E' : 'W';

    const latText = `${Math.abs(numLat).toFixed(4)}° ${latDir}`;
    const lngText = `${Math.abs(numLng).toFixed(4)}° ${lngDir}`;

    return {
      latText,
      lngText,
      fullText: `${latText}, ${lngText}`
    };
  }

  /**
   * Check location permission status
   * Returns: 'granted' | 'denied' | 'prompt'
   */
  async checkPermission() {
    try {
      if (this.isCapacitor) {
        const perm = await Geolocation.checkPermissions();
        return perm.location || 'prompt';
      } else if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        return status.state;
      }
    } catch (err) {
      console.warn('[LocationService] Permission check note:', err);
    }
    return 'prompt';
  }

  /**
   * Request native or browser location permission
   */
  async requestLocationPermission() {
    try {
      if (this.isCapacitor) {
        const result = await Geolocation.requestPermissions({ permissions: ['location'] });
        return result.location === 'granted';
      } else if (navigator.geolocation) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false),
            { timeout: 8000 }
          );
        });
      }
    } catch (err) {
      console.warn('[LocationService] Request permission error:', err);
    }
    return false;
  }

  /**
   * Get Current Device GPS Location
   * Real Android GPS > Capacitor Geolocation > Web Fallback
   * NEVER returns mock/fake coordinates.
   */
  /**
   * Get Current Device GPS Location with Progressive Refinement
   * Real Android GPS > Capacitor Geolocation > Web Progressive Watch Fallback
   * Attempts high accuracy, retains best candidate, and reports status.
   * NEVER returns mock/fake coordinates.
   */
  async getCurrentLocation(options = {}) {
    const permStatus = await this.checkPermission();
    if (permStatus === 'denied') {
      return {
        success: false,
        status: 'PERMISSION_DENIED',
        message: 'Location permission is required to show your current location.'
      };
    }

    const maxWaitMs = options.maxWaitMs || 7000;
    const desiredAccuracyMeters = options.desiredAccuracyMeters || 20;
    const onProgress = options.onProgress || null;

    let bestReading = null;

    const evalCandidate = (raw) => {
      if (!raw || raw.errorType) return;
      const coords = raw.coords || raw;
      const lat = coords.latitude;
      const lng = coords.longitude;
      const accuracy = Math.round(coords.accuracy || 50);

      if (!this.validateCoordinates(lat, lng)) return;

      if (!bestReading || accuracy < bestReading.accuracy) {
        bestReading = {
          latitude: lat,
          longitude: lng,
          accuracy,
          altitude: coords.altitude ? Math.round(coords.altitude) : null,
          timestamp: raw.timestamp || Date.now()
        };
        if (onProgress) {
          onProgress({
            status: 'ACQUIRING',
            accuracy,
            message: `Acquiring GPS… (accuracy: ±${accuracy}m)`
          });
        }
      }
    };

    // 1. Try native Capacitor Geolocation first
    try {
      if (this.isCapacitor) {
        const raw = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 4500,
          maximumAge: 10000
        });
        evalCandidate(raw);
      }
    } catch (nativeErr) {
      console.warn('[LocationService] Native quick-check note:', nativeErr?.message || nativeErr);
      if (nativeErr?.message && nativeErr.message.toLowerCase().includes('denied')) {
        return {
          success: false,
          status: 'PERMISSION_DENIED',
          message: 'Location permission was denied.'
        };
      }
    }

    // 2. If reading is already high precision (<= desiredAccuracyMeters), return immediately
    if (bestReading && bestReading.accuracy <= desiredAccuracyMeters) {
      const locality = await this.reverseGeocode(bestReading.latitude, bestReading.longitude);
      return {
        success: true,
        status: 'SUCCESS',
        ...bestReading,
        locality,
        statusMessage: `Location found (±${bestReading.accuracy}m)`
      };
    }

    // 3. Progressive refinement via Geolocation watch within maxWaitMs window
    await new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, maxWaitMs);

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        let watchId = null;
        try {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              evalCandidate(pos);
              if (bestReading && bestReading.accuracy <= desiredAccuracyMeters) {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timer);
                  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                  resolve();
                }
              }
            },
            (err) => {
              console.warn('[LocationService] Refinement watch notice:', err?.message || err);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 5000 }
          );

          setTimeout(() => {
            if (watchId !== null) {
              try { navigator.geolocation.clearWatch(watchId); } catch (e) {}
            }
          }, maxWaitMs);
        } catch (watchErr) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve();
          }
        }
      } else {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve();
        }
      }
    });

    if (!bestReading) {
      return {
        success: false,
        status: 'UNAVAILABLE',
        message: 'Unable to determine GPS location. Please check satellite/network reception and retry.'
      };
    }

    const locality = await this.reverseGeocode(bestReading.latitude, bestReading.longitude);
    const isWeak = bestReading.accuracy > 35;

    return {
      success: true,
      status: isWeak ? 'WEAK_SIGNAL' : 'SUCCESS',
      ...bestReading,
      locality,
      statusMessage: isWeak
        ? `Weak GPS signal — using best available location (±${bestReading.accuracy}m)`
        : `Location found (±${bestReading.accuracy}m)`
    };
  }

  /**
   * Watch Real-Time User Location
   */
  async watchUserLocation(onUpdate, onError) {
    this.stopWatchingLocation();

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000
    };

    try {
      this.watchId = await Geolocation.watchPosition(options, async (position, err) => {
        if (err) {
          if (onError) onError(err);
          return;
        }

        if (position && position.coords) {
          const { latitude, longitude, accuracy, altitude } = position.coords;
          if (this.validateCoordinates(latitude, longitude)) {
            const locality = await this.reverseGeocode(latitude, longitude);
            if (onUpdate) {
              onUpdate({
                latitude,
                longitude,
                accuracy: Math.round(accuracy || 10),
                altitude: altitude ? Math.round(altitude) : null,
                locality,
                timestamp: position.timestamp || Date.now()
              });
            }
          }
        }
      });
    } catch (watchErr) {
      console.warn('[LocationService] Watch position native fallback:', watchErr);
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        this.watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            if (this.validateCoordinates(latitude, longitude)) {
              const locality = await this.reverseGeocode(latitude, longitude);
              if (onUpdate) {
                onUpdate({
                  latitude,
                  longitude,
                  accuracy: Math.round(accuracy || 10),
                  locality,
                  timestamp: pos.timestamp || Date.now()
                });
              }
            }
          },
          (err) => {
            if (onError) onError(err);
          },
          options
        );
      }
    }
  }

  /**
   * Stop Watching Location
   */
  stopWatchingLocation() {
    if (this.watchId !== null) {
      try {
        if (typeof this.watchId === 'string') {
          Geolocation.clearWatch({ id: this.watchId });
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.clearWatch(this.watchId);
        }
      } catch (err) {
        console.warn('[LocationService] Clear watch note:', err);
      }
      this.watchId = null;
    }
  }

  /**
   * Reverse Geocode Coordinates to Real Locality
   * Uses OpenStreetMap Nominatim with caching & graceful fallback to "Location detected"
   * NEVER displays Los Angeles or hardcoded fake names!
   */
  async reverseGeocode(lat, lng) {
    if (!this.validateCoordinates(lat, lng)) {
      return 'Location detected';
    }

    // Cache check: within ~500 meters
    if (
      this.cachedLocality &&
      this.cachedLocalityCoords &&
      Math.abs(this.cachedLocalityCoords.lat - lat) < 0.005 &&
      Math.abs(this.cachedLocalityCoords.lng - lng) < 0.005
    ) {
      return this.cachedLocality;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'PRITHVI-SHIELD-Citizen-App/2.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};

        const localityPart =
          address.city ||
          address.town ||
          address.village ||
          address.suburb ||
          address.county ||
          address.state_district ||
          address.district ||
          '';

        const regionPart = address.state || address.country || '';

        let result = '';
        if (localityPart && regionPart && localityPart !== regionPart) {
          result = `${localityPart}, ${regionPart}`;
        } else if (localityPart) {
          result = localityPart;
        } else if (regionPart) {
          result = regionPart;
        } else if (data.display_name) {
          const parts = data.display_name.split(',');
          result = parts.slice(0, 2).join(',').trim();
        }

        if (result) {
          this.cachedLocality = result;
          this.cachedLocalityCoords = { lat, lng };
          return result;
        }
      }
    } catch (err) {
      console.warn('[LocationService] Reverse geocoding network note:', err?.message || err);
    }

    return 'Location detected';
  }
}

export const locationService = new LocationService();
export default locationService;
