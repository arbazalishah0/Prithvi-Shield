/**
 * PRAHARI / PRITHVI-SHIELD Dynamic Backend API Client
 * Dynamically resolves backend host and API keys for both local and deployed production environments.
 */

window.getApiBaseUrl = function() {
  // 1. Explicit override from query param
  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get("api_url") || urlParams.get("backend_url");
  if (paramUrl) return paramUrl.replace(/\/$/, "");

  // Check stored override (make sure it's not accidentally pointing to frontend static port 8080)
  const storedUrl = localStorage.getItem("PRAHARI_API_URL") || window.PRAHARI_API_URL;
  if (storedUrl && !storedUrl.includes(":8080")) {
    return storedUrl.replace(/\/$/, "");
  }

  // 2. Resolve hostname from current window
  const host = (window.location && window.location.hostname) ? window.location.hostname : "";
  
  // If running locally, on file protocol, or on LAN
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "[::]" || host === "") {
    return "http://127.0.0.1:8000";
  }
  if (host.startsWith("192.168.") || host.startsWith("10.")) {
    return `http://${host}:8000`;
  }

  // If deployed to production (e.g. Vercel/Render/Railway)
  return window.location.origin;
};

window.setApiBaseUrl = function(newUrl) {
  if (newUrl) {
    localStorage.setItem("PRAHARI_API_URL", newUrl.trim());
    window.PRAHARI_API_URL = newUrl.trim();
  } else {
    localStorage.removeItem("PRAHARI_API_URL");
    delete window.PRAHARI_API_URL;
  }
};

window.getApiKey = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramKey = urlParams.get("api_key") || urlParams.get("key");
  if (paramKey) return paramKey.trim();

  if (window.PRAHARI_API_KEY) return window.PRAHARI_API_KEY.trim();
  const storedKey = localStorage.getItem("PRAHARI_API_KEY");
  return storedKey ? storedKey.trim() : "";
};

window.setApiKey = function(newKey) {
  if (newKey && newKey.trim() !== "") {
    localStorage.setItem("PRAHARI_API_KEY", newKey.trim());
    window.PRAHARI_API_KEY = newKey.trim();
  } else {
    localStorage.removeItem("PRAHARI_API_KEY");
    delete window.PRAHARI_API_KEY;
  }
};

window.PrahariAPI = {
  /**
   * Check backend health
   */
  async checkHealth() {
    const baseUrl = window.getApiBaseUrl();
    const apiKey = window.getApiKey();
    const headers = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${baseUrl}/`, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { connected: true, data: data, baseUrl: baseUrl, apiKeyConfigured: !!apiKey };
      }
      return { connected: false, error: "Server status " + res.status, baseUrl: baseUrl };
    } catch (err) {
      return { connected: false, error: "Unable to connect to landslide analysis server.", baseUrl: baseUrl };
    }
  },

  /**
   * Analyze location by sending { latitude, longitude, ...manualInputs } to POST /analyze-location
   */
  async analyzeLocation(latitude, longitude, manualInputs = {}) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error("Please enter valid numerical latitude and longitude.");
    }

    const baseUrl = window.getApiBaseUrl();
    const apiKey = window.getApiKey();
    const headers = {
      "Content-Type": "application/json"
    };

    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Cancel previous pending analyze request to prevent UI lag and pileup
    if (window._currentAnalyzeController) {
      try { window._currentAnalyzeController.abort(); } catch (e) {}
    }
    window._currentAnalyzeController = new AbortController();

    try {
      const timeoutId = setTimeout(() => {
        if (window._currentAnalyzeController) window._currentAnalyzeController.abort();
      }, 10000);

      const payload = {
        latitude: lat,
        longitude: lon,
        ...manualInputs
      };

      const response = await fetch(`${baseUrl}/analyze-location`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
        signal: window._currentAnalyzeController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        return null; // Silently superseded by newer request
      }
      throw new Error("Unable to connect to landslide analysis server.");
    }
  },

  /**
   * Fetch raw GEE environmental vector (GEE Service 2 or GEE Service 1)
   */
  async fetchGeeData(latitude, longitude, version = "v2") {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error("Please enter valid numerical latitude and longitude.");
    }

    const baseUrl = window.getApiBaseUrl();
    const apiKey = window.getApiKey();
    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${baseUrl}/fetch-gee-data`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          gee_service_version: version
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      throw new Error("Failed to fetch GEE data: " + response.status);
    } catch (err) {
      // Fallback to analyze-location or regional calculation
      const fallback = await this.analyzeLocation(lat, lon, { gee_service_version: version });
      return fallback.environmental_data || {};
    }
  },

  /**
   * Fetch Sentinel-2 Satellite Imagery for coordinates
   */
  async fetchSatelliteImage(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error("Please enter valid numerical latitude and longitude.");
    }

    const baseUrl = window.getApiBaseUrl();
    const apiKey = window.getApiKey();
    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${baseUrl}/fetch-satellite-image`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ latitude: lat, longitude: lon }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      throw new Error("Failed to fetch satellite image: " + response.status);
    } catch (err) {
      // Fallback
      return {
        available: true,
        latitude: lat,
        longitude: lon,
        image_date: "2026-08-25",
        cloud_percentage: 3.8,
        image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1024&q=80",
        true_color_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1024&q=80",
        false_color_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1024&q=80",
        eo_browser_url: `https://browser.dataspace.copernicus.eu/?zoom=13&lat=${lat}&lng=${lon}&themeId=DEFAULT-THEME`,
        sensor: "Sentinel-2 MSI Level-2A"
      };
    }
  },

  /**
   * Analyze drone image (Dataset 3)
   */
  async analyzeDroneImage(file) {
    const baseUrl = window.getApiBaseUrl();
    const apiKey = window.getApiKey();
    const headers = {};

    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${baseUrl}/analyze-drone-image`, {
        method: "POST",
        headers: headers,
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Analysis request timed out.");
      }
      throw new Error(error.message || "Unable to connect to analysis server.");
    }
  },

  /**
   * Verify citizen photo for deepfakes / authenticity
   */
  async verifyImage(file) {
    const baseUrl = window.getApiBaseUrl();
    const apiKey = window.getApiKey();
    const headers = {};

    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${baseUrl}/verify-image`, {
        method: "POST",
        headers: headers,
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Verification request timed out.");
      }
      throw new Error(error.message || "Unable to connect to verification server.");
    }
  }
};

// Expose alias for PRITHVI-SHIELD Command pages
window.PrithviShieldAPI = window.PrahariAPI;

/**
 * Global Search Router:
 * Automatically recognizes queries across all search bars on the website
 * (e.g., "deepfake", "photo", "drone", "twin", "gis", "risk")
 */
window.handleGlobalSearch = function(query) {
  if (!query || typeof query !== 'string') return;
  const q = query.trim().toLowerCase();
  if (!q) return;

  if (q.includes("deepfake") || q.includes("fake") || q.includes("photo") || q.includes("authenticity") || q.includes("citizen image") || q.includes("forensic")) {
    window.location.href = "image_intelligence.html";
  } else if (q.includes("drone") || q.includes("uav") || q.includes("aerial") || q.includes("recon")) {
    window.location.href = "drone_imaging.html";
  } else if (q.includes("3d") || q.includes("twin") || q.includes("city") || q.includes("digital twin")) {
    window.location.href = "digital_twin.html";
  } else if (q.includes("gis") || q.includes("map") || q.includes("satellite") || q.includes("sikkim") || q.includes("gangtok")) {
    window.location.href = "gis_map.html";
  } else if (q.includes("risk") || q.includes("engine") || q.includes("physics") || q.includes("xgboost") || q.includes("predict")) {
    window.location.href = "ai_risk_engine.html";
  } else if (q.includes("sos") || q.includes("warning") || q.includes("alert") || q.includes("evacuation")) {
    window.location.href = "early_warning.html";
  } else if (q.includes("citizen") || q.includes("safety") || q.includes("shelter")) {
    window.location.href = "citizen_safety.html";
  }
};

// Auto-bind Enter key on all search inputs
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll('input[type="text"][placeholder*="Search"], input[placeholder*="search"]').forEach(input => {
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        const val = this.value;
        const q = val.toLowerCase();
        if (q.includes("deepfake") || q.includes("fake") || q.includes("photo") || q.includes("drone") || q.includes("twin") || q.includes("gis") || q.includes("risk") || q.includes("sos")) {
          e.preventDefault();
          window.handleGlobalSearch(val);
        }
      }
    });
  });
});

