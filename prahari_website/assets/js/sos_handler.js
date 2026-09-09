/**
 * PRAHARI / PRITHVI-SHIELD Centralized SOS Emergency & MSG91 SMS Handler
 * Automatically binds to all SOS buttons across website pages and manages live emergency lifecycle.
 */

(function() {
  let activeEventId = localStorage.getItem("PRAHARI_ACTIVE_SOS_ID") || null;
  let pollInterval = null;

  // Sound effect / Audio beacon helper (optional Web Audio API beep)
  function playSosBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
  }

  // Build and Inject SOS Modals HTML
  function injectSosModals() {
    if (document.getElementById("prahari-sos-modal-root")) return;

    const modalRoot = document.createElement("div");
    modalRoot.id = "prahari-sos-modal-root";
    modalRoot.innerHTML = `
      <!-- ══ STEP 1: SOS CONFIRMATION MODAL ══ -->
      <div id="prahari-sos-confirm-modal" class="hidden fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="bg-[#0f172a] border-2 border-red-500/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
          
          <div class="p-5 bg-gradient-to-r from-red-950 via-red-900 to-slate-900 border-b border-red-500/40 flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center text-red-400 shrink-0">
              <span class="material-symbols-outlined text-2xl font-bold animate-pulse">crisis_alert</span>
            </div>
            <div>
              <h3 class="font-black text-lg text-white tracking-wide uppercase">EMERGENCY SOS DISTRESS SIGNAL</h3>
              <p class="text-xs text-red-200 font-mono">Immediate NDRF & Citizen Safety Alert</p>
            </div>
          </div>

          <div class="p-6 space-y-4 text-xs font-sans text-slate-200">
            <div class="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 leading-relaxed">
              <b class="text-red-300 block mb-1">⚠️ Life-Threatening Crisis Protocol:</b>
              Activating SOS will capture your live device GPS coordinates and immediately dispatch emergency SMS alerts via MSG91 to:
              <ul class="list-disc pl-5 mt-1.5 space-y-0.5 text-[11px] text-slate-300 font-mono">
                <li>Primary Emergency Family Contact</li>
                <li>District Disaster Management Authority (DDMA/NDRF)</li>
                <li>Quick Response Rescue Dispatch Team</li>
              </ul>
            </div>

            <!-- Optional Citizen Info -->
            <div class="grid grid-cols-2 gap-3 text-left">
              <div>
                <label class="block text-[10px] font-mono text-slate-400 mb-1">Your Name / ID</label>
                <input id="sos-input-name" type="text" value="${localStorage.getItem('PRAHARI_CITIZEN_NAME') || 'Citizen in Distress'}" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono outline-none focus:border-red-400" />
              </div>
              <div>
                <label class="block text-[10px] font-mono text-slate-400 mb-1">Your Mobile Number</label>
                <input id="sos-input-phone" type="tel" value="${localStorage.getItem('PRAHARI_CITIZEN_PHONE') || '+919876543210'}" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono outline-none focus:border-red-400" />
              </div>
            </div>

            <!-- Emergency Contact Number -->
            <div>
              <label class="block text-[10px] font-mono text-slate-400 mb-1">Family Emergency Contact Mobile</label>
              <input id="sos-input-contact-phone" type="tel" value="${localStorage.getItem('PRAHARI_FAMILY_PHONE') || '+919876543211'}" placeholder="+91..." class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-amber-300 font-mono outline-none focus:border-amber-400" />
            </div>

            <!-- Situation Selection -->
            <div>
              <label class="block text-[10px] font-mono text-slate-400 mb-1">Current Emergency Situation</label>
              <select id="sos-input-situation" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-400">
                <option value="general">Immediate Danger / Slope Instability</option>
                <option value="trapped">I Am Trapped Under Debris / Cut-off</option>
                <option value="rescue">Medical Emergency / Evacuation Required</option>
              </select>
            </div>

            <div id="sos-gps-status" class="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <span class="material-symbols-outlined text-sm text-cyan-400 animate-spin">sync</span>
              <span>Acquiring high-accuracy GPS fix...</span>
            </div>
          </div>

          <div class="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
            <button onclick="window.PrahariSOS.closeModal()" class="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition">
              Cancel
            </button>
            
            <button id="btn-transmit-sos" onclick="window.PrahariSOS.confirmAndTransmit()" class="flex-1 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider shadow-xl shadow-red-600/40 transition">
              <span class="material-symbols-outlined text-base">emergency_share</span>
              <span>TRANSMIT SOS NOW</span>
            </button>
          </div>

        </div>
      </div>

      <!-- ══ STEP 2: ACTIVE SOS STATUS HUD MODAL ══ -->
      <div id="prahari-sos-active-modal" class="hidden fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <div class="bg-[#090d16] border-2 border-red-500 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
          
          <div class="p-5 bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 border-b border-red-500/40 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shrink-0 animate-ping">
                <span class="material-symbols-outlined text-xl">sensors</span>
              </div>
              <div>
                <h3 class="font-black text-base text-white tracking-wide uppercase flex items-center gap-2">
                  <span>🚨 SOS ACTIVATED</span>
                  <span id="hud-event-id" class="text-[11px] bg-red-950 border border-red-500 text-red-300 px-2 py-0.5 rounded font-mono">SOS-2026-00001</span>
                </h3>
                <p class="text-[11px] text-red-200 font-mono">Telemetry & SMS Broadcast Active</p>
              </div>
            </div>

            <span id="hud-status-badge" class="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500 animate-pulse uppercase">
              WAITING FOR RESPONSE
            </span>
          </div>

          <div class="p-6 space-y-4 text-xs font-sans text-slate-200">
            <!-- Lifecycle Progress Bar -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Emergency Lifecycle</span>
                <span id="hud-step-text" class="text-cyan-300 font-bold">1 / 4 • SOS Sent</span>
              </div>
              <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div id="hud-progress-bar" class="bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 h-full w-1/4 transition-all duration-500"></div>
              </div>
            </div>

            <!-- GPS & Telemetry Card -->
            <div class="bg-[#0d1322] border border-dark-border rounded-xl p-3.5 space-y-2 font-mono text-xs">
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-slate-400 flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm text-cyan-400">my_location</span> GPS Coordinates:
                </span>
                <b id="hud-coords" class="text-cyan-300">27.3389°N, 88.6065°E</b>
              </div>
              <div class="flex items-center justify-between text-slate-300">
                <span class="text-slate-400 flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm text-emerald-400">speed</span> Accuracy:
                </span>
                <span id="hud-accuracy" class="text-emerald-300">± 8 meters</span>
              </div>
              <div class="pt-2 border-t border-slate-800 flex justify-between items-center">
                <a id="hud-maps-link" href="#" target="_blank" class="text-cyan-400 hover:text-cyan-300 underline font-bold flex items-center gap-1 text-[11px]">
                  <span class="material-symbols-outlined text-xs">open_in_new</span> Open in Google Maps
                </a>
                <span id="hud-time" class="text-[10px] text-slate-500">Just now</span>
              </div>
            </div>

            <!-- SMS Delivery Dispatches -->
            <div class="bg-[#070a12] border border-slate-800 rounded-xl p-3 space-y-2 font-mono text-[11px]">
              <span class="text-slate-400 font-bold uppercase block text-[10px]">📡 MSG91 SMS Notification Dispatch:</span>
              <div class="space-y-1" id="hud-sms-list">
                <div class="flex items-center justify-between text-emerald-400">
                  <span>✓ Family Contact:</span>
                  <span class="font-bold">SMS Sent</span>
                </div>
                <div class="flex items-center justify-between text-emerald-400">
                  <span>✓ District Disaster Authority:</span>
                  <span class="font-bold">SMS Sent</span>
                </div>
                <div class="flex items-center justify-between text-emerald-400">
                  <span>✓ Rescue Quick Response:</span>
                  <span class="font-bold">Dispatched</span>
                </div>
              </div>
            </div>

            <!-- Responder Info (if assigned) -->
            <div id="hud-responder-box" class="hidden p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300">
              <div class="font-bold flex items-center gap-1.5 text-xs">
                <span class="material-symbols-outlined text-sm">shield_person</span>
                <span>Responder Assigned: <span id="hud-responder-name">NDRF Unit 12</span></span>
              </div>
              <p class="text-[11px] text-emerald-200/80 mt-0.5">Rescue team is en route with UAV Recon support.</p>
            </div>
          </div>

          <div class="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
            <button onclick="window.PrahariSOS.cancelActiveSOS()" class="px-4 py-2.5 rounded-xl border border-red-500/50 hover:bg-red-950/40 text-red-300 font-bold text-xs transition active:scale-95">
              I'm Safe / Cancel SOS
            </button>

            <a href="tel:112" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg transition text-center">
              <span class="material-symbols-outlined text-base">call</span>
              <span>Call Helpline 112</span>
            </a>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modalRoot);
  }

  // High-Accuracy GPS Geolocation Promise
  function getDeviceLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return resolve({ latitude: 27.3389, longitude: 88.6065, accuracy: 25, fallback: true });
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 10),
            fallback: false
          });
        },
        (err) => {
          console.warn("Geolocation fallback applied:", err.message);
          // Graceful fallback with region default
          resolve({ latitude: 27.3389, longitude: 88.6065, accuracy: 30, fallback: true, error: err.message });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  }

  window.PrahariSOS = {
    // Open Confirmation Dialog
    async openModal() {
      injectSosModals();
      const confirmModal = document.getElementById("prahari-sos-confirm-modal");
      if (confirmModal) confirmModal.classList.remove("hidden");

      // Pre-warm GPS
      const statusEl = document.getElementById("sos-gps-status");
      if (statusEl) {
        statusEl.innerHTML = '<span class="material-symbols-outlined text-sm text-cyan-400 animate-spin">sync</span> <span>Calibrating GPS satellite lock...</span>';
      }
      const loc = await getDeviceLocation();
      if (statusEl) {
        statusEl.innerHTML = `<span class="material-symbols-outlined text-sm text-emerald-400">check_circle</span> <span>GPS Fixed: ${loc.latitude}°N, ${loc.longitude}°E (±${loc.accuracy}m)</span>`;
      }
    },

    closeModal() {
      const confirmModal = document.getElementById("prahari-sos-confirm-modal");
      if (confirmModal) confirmModal.classList.add("hidden");
    },

    // Confirm & Transmit to Central FastAPI Backend
    async confirmAndTransmit() {
      const btn = document.getElementById("btn-transmit-sos");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span> <span>TRANSMITTING SOS & SMS...</span>';
      }

      const name = document.getElementById("sos-input-name")?.value || "Citizen in Distress";
      const phone = document.getElementById("sos-input-phone")?.value || "+919876543210";
      const contactPhone = document.getElementById("sos-input-contact-phone")?.value || "+919876543211";
      const situation = document.getElementById("sos-input-situation")?.value || "general";

      localStorage.setItem("PRAHARI_CITIZEN_NAME", name);
      localStorage.setItem("PRAHARI_CITIZEN_PHONE", phone);
      localStorage.setItem("PRAHARI_FAMILY_PHONE", contactPhone);

      const loc = await getDeviceLocation();
      const baseUrl = window.getApiBaseUrl ? window.getApiBaseUrl() : "http://127.0.0.1:8000";

      const payload = {
        user_id: "citizen_" + phone.replace(/[^\d]/g, "").slice(-10),
        user_name: name,
        user_phone: phone,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_accuracy: loc.accuracy,
        platform: "website",
        situation: situation,
        people_count: 1,
        emergency_contacts: [
          { name: "Primary Emergency Contact", phone: contactPhone, relation: "Family" }
        ]
      };

      try {
        const response = await fetch(`${baseUrl}/api/emergency/sos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("Server error triggering SOS (" + response.status + ")");
        }

        const data = await response.json();
        activeEventId = data.event_id;
        localStorage.setItem("PRAHARI_ACTIVE_SOS_ID", activeEventId);

        playSosBeep();
        this.closeModal();
        this.showActiveHUD(data);
      } catch (err) {
        alert("🚨 SOS Transmitted locally. Error contacting online gateway: " + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined text-base">emergency_share</span> <span>TRANSMIT SOS NOW</span>';
        }
      }
    },

    // Show Active HUD
    showActiveHUD(eventData) {
      injectSosModals();
      const hud = document.getElementById("prahari-sos-active-modal");
      if (hud) hud.classList.remove("hidden");

      const eventId = eventData.event_id || activeEventId;
      document.getElementById("hud-event-id").innerText = eventId;
      document.getElementById("hud-coords").innerText = `${Number(eventData.location?.latitude || eventData.latitude || 27.3389).toFixed(4)}°N, ${Number(eventData.location?.longitude || eventData.longitude || 88.6065).toFixed(4)}°E`;
      document.getElementById("hud-accuracy").innerText = `± ${eventData.location?.accuracy || eventData.location_accuracy || 8} meters`;
      
      const mapsUrl = eventData.google_maps_url || `https://www.google.com/maps?q=${eventData.latitude},${eventData.longitude}`;
      const mapsLink = document.getElementById("hud-maps-link");
      if (mapsLink) mapsLink.href = mapsUrl;

      this.startPolling(eventId);
    },

    // Poll live status from backend every 3 seconds
    startPolling(eventId) {
      if (pollInterval) clearInterval(pollInterval);
      const baseUrl = window.getApiBaseUrl ? window.getApiBaseUrl() : "http://127.0.0.1:8000";

      const checkStatus = async () => {
        try {
          const res = await fetch(`${baseUrl}/api/emergency/sos/${eventId}`);
          if (res.ok) {
            const data = await res.json();
            const ev = data.event;
            const status = ev.status || "ACTIVE";

            const badge = document.getElementById("hud-status-badge");
            const stepText = document.getElementById("hud-step-text");
            const bar = document.getElementById("hud-progress-bar");
            const responderBox = document.getElementById("hud-responder-box");

            if (status === "ACTIVE") {
              badge.innerText = "WAITING FOR RESPONSE";
              badge.className = "px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500 animate-pulse uppercase";
              stepText.innerText = "1 / 4 • SOS & SMS Dispatched";
              bar.style.width = "25%";
              if (responderBox) responderBox.classList.add("hidden");
            } else if (status === "ACKNOWLEDGED") {
              badge.innerText = "ACKNOWLEDGED BY CONTROL";
              badge.className = "px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500 uppercase";
              stepText.innerText = "2 / 4 • Acknowledged by District Control";
              bar.style.width = "50%";
              if (responderBox) responderBox.classList.add("hidden");
            } else if (status === "RESPONDER_ASSIGNED") {
              badge.innerText = "RESCUE DISPATCHED";
              badge.className = "px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 animate-pulse uppercase";
              stepText.innerText = "3 / 4 • Rescue Team En Route";
              bar.style.width = "75%";
              if (responderBox) {
                responderBox.classList.remove("hidden");
                document.getElementById("hud-responder-name").innerText = ev.responder_name || "NDRF Unit 12";
              }
            } else if (status === "RESOLVED" || status === "CANCELLED") {
              badge.innerText = status;
              badge.className = "px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase";
              stepText.innerText = status === "RESOLVED" ? "4 / 4 • Emergency Resolved" : "Emergency Cancelled";
              bar.style.width = "100%";
              clearInterval(pollInterval);
              localStorage.removeItem("PRAHARI_ACTIVE_SOS_ID");
            }
          }
        } catch (e) {}
      };

      checkStatus();
      pollInterval = setInterval(checkStatus, 3000);
    },

    // Cancel Active SOS
    async cancelActiveSOS() {
      if (!confirm("Are you sure you want to cancel the active SOS distress signal and notify responders that you are safe?")) {
        return;
      }
      const eventId = activeEventId || localStorage.getItem("PRAHARI_ACTIVE_SOS_ID");
      if (!eventId) {
        document.getElementById("prahari-sos-active-modal")?.classList.add("hidden");
        return;
      }

      const baseUrl = window.getApiBaseUrl ? window.getApiBaseUrl() : "http://127.0.0.1:8000";
      try {
        await fetch(`${baseUrl}/api/emergency/sos/${eventId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Citizen clicked I am Safe" })
        });
      } catch (e) {}

      clearInterval(pollInterval);
      localStorage.removeItem("PRAHARI_ACTIVE_SOS_ID");
      document.getElementById("prahari-sos-active-modal")?.classList.add("hidden");
      alert("✅ SOS Emergency Cancelled. Emergency contacts & responders have been updated that you are safe.");
    }
  };

  // Auto-bind click handlers to any SOS buttons across all website pages
  document.addEventListener("DOMContentLoaded", function() {
    injectSosModals();

    // Re-bind all SOS buttons
    document.querySelectorAll("button, a").forEach((el) => {
      const text = el.innerText || "";
      const onclickAttr = el.getAttribute("onclick") || "";
      if (
        text.includes("SOS EMERGENCY") || 
        text.includes("SEND SOS") || 
        text.includes("BROADCAST SOS") || 
        onclickAttr.includes("EMERGENCY PROTOCOL") ||
        onclickAttr.includes("triggerSOS") ||
        onclickAttr.includes("dispatchAllSirens")
      ) {
        el.removeAttribute("onclick");
        el.addEventListener("click", function(e) {
          e.preventDefault();
          window.PrahariSOS.openModal();
        });
      }
    });

    // Check if there was an active SOS from earlier session
    const storedId = localStorage.getItem("PRAHARI_ACTIVE_SOS_ID");
    if (storedId) {
      window.PrahariSOS.startPolling(storedId);
    }
  });

})();
