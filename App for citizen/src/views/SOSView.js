import { store } from '../store.js';

export function renderSOSView() {
  const { sosState, currentLocation, familyMembers, currentUser } = store.state;
  const primaryContact = (familyMembers && familyMembers.length > 0) ? familyMembers[0] : { name: currentUser?.emergencyContactName || 'Family Circle', phone: currentUser?.emergencyContactPhone || '+919876543212' };

  const isAcknowledged = sosState.status === 'ACKNOWLEDGED' || sosState.status === 'RESPONDER_ASSIGNED';
  const isResponderAssigned = sosState.status === 'RESPONDER_ASSIGNED';

  return `
    <div class="flex-1 flex flex-col bg-[#850e0e] text-white min-h-screen overflow-y-auto antialiased font-sans">
      <!-- Emergency Header -->
      <header class="w-full flex justify-between items-center px-4 pt-safe py-3.5 bg-[#670001] sticky top-0 z-50 border-b border-white/20 shadow-xl">
        <div class="flex items-center gap-2.5">
          <span class="material-symbols-outlined text-amber-300 text-[28px] animate-pulse" style="font-variation-settings: 'FILL' 1;">warning</span>
          <div>
            <h1 class="text-lg font-black tracking-tight text-white uppercase leading-none">SOS Beacon Active</h1>
            <span class="text-[10px] text-red-200 font-mono">PRAHARI Emergency Response</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-full text-xs font-bold border border-white/30 font-mono">
          <span class="w-2.5 h-2.5 rounded-full ${isResponderAssigned ? 'bg-emerald-400' : isAcknowledged ? 'bg-cyan-400' : 'bg-red-400 animate-ping'}"></span>
          <span>${sosState.eventId || 'TRANSMITTING...'}</span>
        </div>
      </header>

      <main class="w-full max-w-xl mx-auto px-4 flex-1 flex flex-col gap-4 pt-4 pb-12">
        <!-- Live Status Aura & Lifecycle Badge -->
        <div class="flex flex-col items-center justify-center py-2">
          <div class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center sos-pulse mb-3 border-2 border-white/50 shadow-2xl">
            <span class="material-symbols-outlined text-[44px] text-white" style="font-variation-settings: 'FILL' 1;">cell_tower</span>
          </div>
          
          <div class="px-4 py-1.5 rounded-full border text-xs font-mono font-black uppercase mb-1 shadow-md ${
            isResponderAssigned ? 'bg-emerald-900/90 text-emerald-200 border-emerald-400' :
            isAcknowledged ? 'bg-blue-900/90 text-blue-200 border-blue-400' :
            'bg-amber-950/90 text-amber-200 border-amber-400 animate-pulse'
          }">
            LIFECYCLE STATUS: ${sosState.status || 'ACTIVE'}
          </div>

          ${isResponderAssigned ? `
            <div class="bg-emerald-950/80 border border-emerald-400/60 rounded-xl px-4 py-2 mt-2 text-center text-xs text-emerald-100 font-semibold shadow-lg animate-in fade-in">
              🚨 Responder Dispatched: <span class="font-bold text-emerald-300 font-mono">${sosState.responderName || 'NDRF Quick Response Team 12'}</span>
            </div>
          ` : isAcknowledged ? `
            <div class="bg-blue-950/80 border border-blue-400/60 rounded-xl px-4 py-2 mt-2 text-center text-xs text-blue-100 font-semibold shadow-lg">
              ✓ Distress call acknowledged by Disaster Command Control Center
            </div>
          ` : `
            <p class="text-sm font-bold text-white text-center mt-1">Transmitting beacon to Civil Rescue &amp; Safe Circle...</p>
          `}
        </div>

        <!-- Immediate Distress Modifiers -->
        <div class="grid grid-cols-2 gap-3">
          <button id="sos-trapped-btn" class="w-full py-3 bg-white text-[#850e0e] font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 border-2 border-white ${sosState.trapped ? 'ring-4 ring-yellow-300 bg-yellow-100' : ''}">
            <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">personal_injury</span>
            <span>${sosState.trapped ? '✓ I AM TRAPPED' : 'I AM TRAPPED'}</span>
          </button>

          <button id="sos-rescue-btn" class="w-full py-3 bg-red-950 text-white font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-white/40 ${sosState.rescueNeeded ? 'ring-4 ring-yellow-300 bg-red-900' : ''}">
            <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">front_hand</span>
            <span>${sosState.rescueNeeded ? '✓ NEED RESCUE' : 'NEED RESCUE'}</span>
          </button>
        </div>

        <!-- Emergency Telemetry Data Card -->
        <div class="bg-black/40 rounded-2xl p-4 border border-white/20 flex flex-col gap-3 backdrop-blur-md shadow-xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-white">
              <span class="material-symbols-outlined text-cyan-300 text-[20px]" style="font-variation-settings: 'FILL' 1;">my_location</span>
              <span class="text-xs font-bold uppercase tracking-wider text-cyan-200">Live GPS Coordinates</span>
            </div>
            <span class="text-xs font-bold text-right font-mono text-cyan-100">${(currentLocation.lat || 30.3165).toFixed(4)}° N, ${(currentLocation.lng || 78.0322).toFixed(4)}° E (±${currentLocation.accuracy || 10}m)</span>
          </div>

          ${sosState.googleMapsUrl ? `
            <div class="pt-1">
              <a href="${sosState.googleMapsUrl}" target="_blank" class="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-mono text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-cyan-400/40 transition">
                <span class="material-symbols-outlined text-sm">open_in_new</span> Open Active Location in Google Maps
              </a>
            </div>
          ` : ''}
          
          <div class="h-px bg-white/15"></div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-white">
              <span class="material-symbols-outlined text-amber-300 text-[20px]">sms</span>
              <span class="text-xs font-bold uppercase tracking-wider text-amber-200">MSG91 Priority Alerts</span>
            </div>
            <span class="text-xs font-bold text-emerald-300 font-mono">Dispatched to 3 Channels</span>
          </div>

          <div class="space-y-1.5 text-[11px] font-mono text-slate-200 pl-2">
            <div class="flex items-center justify-between">
              <span>• Family Contact:</span>
              <span class="text-amber-200">${primaryContact.name} (${primaryContact.phone})</span>
            </div>
            <div class="flex items-center justify-between">
              <span>• Disaster Control:</span>
              <span class="text-emerald-300">+91 98765 43210 (Direct)</span>
            </div>
            <div class="flex items-center justify-between">
              <span>• NDRF Rescue Authority:</span>
              <span class="text-cyan-300">+91 98765 43211 (Direct)</span>
            </div>
          </div>

          <div class="h-px bg-white/15"></div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-white">
              <span class="material-symbols-outlined text-white/80 text-[20px]" style="font-variation-settings: 'FILL' 1;">group</span>
              <span class="text-xs font-bold uppercase tracking-wider">People with You</span>
            </div>
            <div class="flex items-center bg-white/20 rounded-full px-2 py-0.5 gap-2 border border-white/30">
              <button id="sos-people-dec" class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-black hover:bg-white/40">-</button>
              <span id="sos-people-count" class="text-sm font-bold w-4 text-center font-mono">${sosState.peopleCount || 1}</span>
              <button id="sos-people-inc" class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-black hover:bg-white/40">+</button>
            </div>
          </div>
        </div>

        <!-- Nearest Evacuation Shelter -->
        <div class="bg-black/30 rounded-2xl p-3.5 flex items-center gap-3 border-l-4 border-l-blue-400 border border-white/15 backdrop-blur-md">
          <div class="bg-blue-500/30 p-2 rounded-full text-blue-300 shrink-0">
            <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">home_pin</span>
          </div>
          <div class="flex-1">
            <h3 class="text-xs font-bold text-blue-200">Nearest Evacuation Shelter</h3>
            <p class="text-xs text-white/90 font-medium">1.2km East (Cascade Civic Center - Route Mapped)</p>
          </div>
        </div>

        <!-- Safe / Cancel Action -->
        <div class="mt-auto pt-2">
          <button id="sos-cancel-btn" class="w-full py-3.5 bg-black/40 border-2 border-white/60 text-white font-black text-sm rounded-2xl hover:bg-white/20 active:scale-95 transition-all shadow-xl">
            I'm Safe / Cancel SOS Emergency
          </button>
        </div>
      </main>
    </div>
  `;
}

export function bindSOSEvents(container) {
  // Trapped trigger
  const trappedBtn = container.querySelector('#sos-trapped-btn');
  if (trappedBtn) {
    trappedBtn.addEventListener('click', async () => {
      store.state.sosState.trapped = !store.state.sosState.trapped;
      store.notify();
      if (store.state.sosState.eventId) {
        try {
          await fetch(`http://127.0.0.1:8000/api/emergency/sos/${store.state.sosState.eventId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'ACTIVE',
              notes: store.state.sosState.trapped ? 'Citizen marked: TRAPPED' : 'Citizen updated trapped status'
            })
          });
        } catch (e) {}
      }
    });
  }

  // Rescue trigger
  const rescueBtn = container.querySelector('#sos-rescue-btn');
  if (rescueBtn) {
    rescueBtn.addEventListener('click', async () => {
      store.state.sosState.rescueNeeded = !store.state.sosState.rescueNeeded;
      store.notify();
      if (store.state.sosState.eventId) {
        try {
          await fetch(`http://127.0.0.1:8000/api/emergency/sos/${store.state.sosState.eventId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'ACTIVE',
              notes: store.state.sosState.rescueNeeded ? 'Citizen marked: IMMEDIATE RESCUE NEEDED' : 'Citizen updated rescue status'
            })
          });
        } catch (e) {}
      }
    });
  }

  // Headcount adjusters
  const decBtn = container.querySelector('#sos-people-dec');
  const incBtn = container.querySelector('#sos-people-inc');
  if (decBtn) {
    decBtn.addEventListener('click', () => {
      store.updatePeopleCount((store.state.sosState.peopleCount || 1) - 1);
    });
  }
  if (incBtn) {
    incBtn.addEventListener('click', () => {
      store.updatePeopleCount((store.state.sosState.peopleCount || 1) + 1);
    });
  }

  // Cancel SOS
  const cancelBtn = container.querySelector('#sos-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel SOS mode and notify emergency contacts that you are safe?')) {
        store.cancelSOS();
      }
    });
  }
}

