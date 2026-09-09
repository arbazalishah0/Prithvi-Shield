/**
 * PRITHVI-SHIELD / PRAHARI Command
 * Universal Tactical Slide-Bar & Global Navigation Drawer
 * SIH 2026 — Pure Self-Contained CSS + Reliable Global Dispatcher
 */

(function () {
  'use strict';

  const currentPath = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const navGroups = [
    {
      groupTitle: 'Command & GIS Operations',
      groupIcon: 'dashboard',
      items: [
        {
          name: 'Command Center',
          url: 'dashboard.html',
          icon: 'grid_view',
          tag: 'Live Ops',
          tagColor: '#38bdf8',
          tagBg: 'rgba(2, 132, 199, 0.2)',
          tagBorder: 'rgba(56, 189, 248, 0.4)',
          desc: 'Real-time telemetry, incidents & sensor health'
        },
        {
          name: 'Live GIS Risk Map',
          url: 'gis_map.html',
          icon: 'map',
          tag: '8.5K Points',
          tagColor: '#34d399',
          tagBg: 'rgba(16, 185, 129, 0.2)',
          tagBorder: 'rgba(52, 211, 153, 0.4)',
          desc: 'Spatial landslide hazard heatmaps & rainfall radar'
        },
        {
          name: '3D Digital Twin Simulation',
          url: 'digital_twin.html',
          icon: '3d_rotation',
          tag: 'Three.js',
          tagColor: '#60a5fa',
          tagBg: 'rgba(59, 130, 246, 0.2)',
          tagBorder: 'rgba(96, 165, 250, 0.4)',
          desc: 'Geotechnical 3D terrain stress & slope mechanics'
        },
        {
          name: '3D Earth Globe & Geodynamics',
          url: 'landslide_intro.html',
          icon: 'public',
          tag: '3D Globe',
          tagColor: '#818cf8',
          tagBg: 'rgba(99, 102, 241, 0.2)',
          tagBorder: 'rgba(129, 140, 248, 0.4)',
          desc: 'Planetary satellite InSAR & tectonic rupture viewer'
        },
        {
          name: 'Main Platform Portal',
          url: 'index.html',
          icon: 'home',
          tag: 'Portal',
          tagColor: '#94a3b8',
          tagBg: 'rgba(148, 163, 184, 0.15)',
          tagBorder: 'rgba(148, 163, 184, 0.3)',
          desc: 'PRITHVI-SHIELD central mission gateway'
        }
      ]
    },
    {
      groupTitle: 'Emergency Operations & FCM',
      groupIcon: 'campaign',
      items: [
        {
          name: 'Emergency Alert Center',
          url: 'alert_center.html',
          icon: 'notifications_active',
          tag: 'FCM Push',
          tagColor: '#f87171',
          tagBg: 'rgba(239, 68, 68, 0.25)',
          tagBorder: 'rgba(248, 113, 113, 0.5)',
          desc: 'Admin-to-citizen broadcast studio & delivery audit'
        },
        {
          name: 'Smart Evacuation & Rescue',
          url: 'evacuation_rescue.html',
          icon: 'directions_run',
          tag: 'A* Path',
          tagColor: '#fbbf24',
          tagBg: 'rgba(245, 158, 11, 0.2)',
          tagBorder: 'rgba(251, 191, 36, 0.4)',
          desc: 'Dynamic safe route corridors & shelter capacities'
        },
        {
          name: 'Citizen Safety & Reports',
          url: 'citizen_safety.html',
          icon: 'shield',
          tag: 'Mobile Sync',
          tagColor: '#34d399',
          tagBg: 'rgba(16, 185, 129, 0.2)',
          tagBorder: 'rgba(52, 211, 153, 0.4)',
          desc: 'Citizen geotagged evidence, hazard feeds & checklists'
        },
        {
          name: 'Early Warning & SOS Response',
          url: 'early_warning.html',
          icon: 'podcasts',
          tag: '911 / SOS',
          tagColor: '#f87171',
          tagBg: 'rgba(239, 68, 68, 0.2)',
          tagBorder: 'rgba(248, 113, 113, 0.4)',
          desc: 'Distress beacons, automated sirens & quick dispatch'
        }
      ]
    },
    {
      groupTitle: 'AI & Geotechnical Intelligence',
      groupIcon: 'psychology',
      items: [
        {
          name: 'AI Risk Prediction Engine',
          url: 'ai_risk_engine.html',
          icon: 'psychology',
          tag: 'ML Factor of Safety',
          tagColor: '#c084fc',
          tagBg: 'rgba(168, 85, 247, 0.2)',
          tagBorder: 'rgba(192, 132, 252, 0.4)',
          desc: 'Infinite-slope Mohr-Coulomb physics-informed AI'
        },
        {
          name: 'Deepfake Image Forensics',
          url: 'image_intelligence.html',
          icon: 'photo_camera',
          tag: 'Vision AI',
          tagColor: '#22d3ee',
          tagBg: 'rgba(6, 182, 212, 0.2)',
          tagBorder: 'rgba(34, 211, 238, 0.4)',
          desc: 'ResNet-18 synthetic image detection & authenticity checks'
        },
        {
          name: 'AI Tactical Reconnaissance',
          url: 'ai_intelligence.html',
          icon: 'explore',
          tag: 'Tactical HUD',
          tagColor: '#f59e0b',
          tagBg: 'rgba(245, 158, 11, 0.2)',
          tagBorder: 'rgba(245, 158, 11, 0.4)',
          desc: 'Sector 4 real-time field unit & terrain tracking'
        },
        {
          name: 'Drone UAV Aerial Imaging',
          url: 'drone_imaging.html',
          icon: 'flight',
          tag: 'LiDAR / UAV',
          tagColor: '#2dd4bf',
          tagBg: 'rgba(20, 184, 166, 0.2)',
          tagBorder: 'rgba(45, 212, 191, 0.4)',
          desc: 'Aerial orthomosaics, photogrammetry & slope cracks'
        }
      ]
    },
    {
      groupTitle: 'Administration & System APIs',
      groupIcon: 'settings',
      items: [
        {
          name: 'Admin Access & Control',
          url: 'admin_login.html',
          icon: 'admin_panel_settings',
          tag: 'Auth',
          tagColor: '#94a3b8',
          tagBg: 'rgba(148, 163, 184, 0.15)',
          tagBorder: 'rgba(148, 163, 184, 0.3)',
          desc: 'Security clearance, operator logs & privileges'
        },
        {
          name: 'FastAPI Backend Swagger Docs',
          url: 'http://127.0.0.1:8000/docs',
          icon: 'api',
          tag: 'API :8000',
          tagColor: '#38bdf8',
          tagBg: 'rgba(2, 132, 199, 0.2)',
          tagBorder: 'rgba(56, 189, 248, 0.4)',
          desc: 'Interactive REST API testing & schemas'
        }
      ]
    }
  ];

  const quickActions = [
    { name: 'Send Alert', icon: 'campaign', url: 'alert_center.html', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
    { name: 'Safe Route', icon: 'directions_run', url: 'evacuation_rescue.html', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(251, 191, 36, 0.4)' },
    { name: 'GIS Heatmap', icon: 'map', url: 'gis_map.html', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(52, 211, 153, 0.4)' },
    { name: 'AI Predict', icon: 'psychology', url: 'ai_risk_engine.html', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(192, 132, 252, 0.4)' },
    { name: 'Deepfake AI', icon: 'verified_user', url: 'image_intelligence.html', color: '#22d3ee', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(34, 211, 238, 0.4)' },
    { name: '3D Earth', icon: 'public', url: 'landslide_intro.html', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(96, 165, 250, 0.4)' }
  ];

  // Self-Contained Standalone Styles
  function injectStyles() {
    if (document.getElementById('prahari-sidebar-styles')) return;
    const style = document.createElement('style');
    style.id = 'prahari-sidebar-styles';
    style.textContent = `
      /* Slide-bar Backdrop */
      #prahari-slidebar-backdrop {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 999990 !important;
        background: rgba(3, 7, 18, 0.75) !important;
        backdrop-filter: blur(6px) !important;
        -webkit-backdrop-filter: blur(6px) !important;
        display: none;
        opacity: 0;
        transition: opacity 0.25s ease !important;
        pointer-events: auto !important;
      }

      /* Slide-bar Drawer Container */
      #prahari-slidebar-drawer {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        bottom: 0 !important;
        width: 360px !important;
        max-width: 90vw !important;
        height: 100vh !important;
        z-index: 999995 !important;
        background: #080d1a !important;
        border-right: 1px solid rgba(56, 189, 248, 0.3) !important;
        box-shadow: 20px 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.15) !important;
        transform: translateX(-100%) !important;
        -webkit-transform: translateX(-100%) !important;
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        display: flex !important;
        flex-direction: column !important;
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        overflow: hidden !important;
        pointer-events: auto !important;
        box-sizing: border-box !important;
      }

      /* Trigger Button */
      .prahari-slidebar-toggle-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        height: 32px !important;
        padding: 0 10px !important;
        border-radius: 8px !important;
        background: rgba(13, 21, 38, 0.9) !important;
        border: 1px solid rgba(56, 189, 248, 0.35) !important;
        color: #38bdf8 !important;
        font-weight: 800 !important;
        font-size: 11px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        flex-shrink: 0 !important;
        user-select: none !important;
        box-sizing: border-box !important;
      }
      .prahari-slidebar-toggle-btn:hover {
        background: rgba(56, 189, 248, 0.2) !important;
        border-color: #38bdf8 !important;
        color: #ffffff !important;
        transform: translateY(-1px) !important;
      }

      /* Drawer Inner Scrollbar */
      #prahari-slidebar-content::-webkit-scrollbar {
        width: 5px;
      }
      #prahari-slidebar-content::-webkit-scrollbar-track {
        background: #060a14;
      }
      #prahari-slidebar-content::-webkit-scrollbar-thumb {
        background: #1e293b;
        border-radius: 4px;
      }
      #prahari-slidebar-content::-webkit-scrollbar-thumb:hover {
        background: #334155;
      }

      /* Navigation Item */
      .prahari-nav-item {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 8px 10px !important;
        border-radius: 8px !important;
        color: #cbd5e1 !important;
        text-decoration: none !important;
        transition: all 0.15s ease !important;
        border: 1px solid transparent !important;
        margin-bottom: 2px !important;
        box-sizing: border-box !important;
      }
      .prahari-nav-item:hover {
        background: rgba(15, 23, 42, 0.85) !important;
        border-color: rgba(56, 189, 248, 0.3) !important;
        color: #ffffff !important;
        transform: translateX(3px) !important;
      }
      .prahari-nav-item.active {
        background: linear-gradient(90deg, rgba(8, 145, 178, 0.28) 0%, rgba(15, 23, 42, 0.9) 100%) !important;
        border-color: rgba(56, 189, 248, 0.6) !important;
        color: #38bdf8 !important;
        font-weight: 700 !important;
      }

      /* Quick Action Tile */
      .prahari-qa-tile {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 2px !important;
        padding: 6px 4px !important;
        border-radius: 8px !important;
        text-decoration: none !important;
        text-align: center !important;
        transition: transform 0.15s ease, background 0.15s ease !important;
        box-sizing: border-box !important;
      }
      .prahari-qa-tile:hover {
        transform: translateY(-2px) !important;
        filter: brightness(1.15) !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Render Sidebar HTML into DOM
  function renderSlidebar() {
    injectStyles();
    if (document.getElementById('prahari-slidebar-drawer')) return;
    if (!document.body) return;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'prahari-slidebar-backdrop';
    document.body.appendChild(backdrop);

    // Drawer
    const drawer = document.createElement('aside');
    drawer.id = 'prahari-slidebar-drawer';
    drawer.setAttribute('aria-label', 'Main Operations Sidebar');

    drawer.innerHTML = `
      <!-- Sidebar Header -->
      <div style="padding: 14px 16px; border-bottom: 1px solid #1e293b; background: #060a14; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <a href="index.html" style="display: flex; align-items: center; gap: 10px; text-decoration: none;">
            <div style="position: relative; width: 34px; height: 34px; border-radius: 8px; background: rgba(0, 229, 255, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              <img src="assets/logo.jpg" alt="Logo" style="width: 30px; height: 30px; object-fit: contain;" onerror="this.src='assets/logo.jpg'" />
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 13px; font-weight: 900; color: #ffffff; letter-spacing: -0.2px; display: flex; align-items: center; gap: 6px;">
                PRITHVI-SHIELD <span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; background: #083344; color: #38bdf8; border: 1px solid #0e7490; font-family: monospace; font-weight: 800;">COMMAND</span>
              </span>
              <span style="font-size: 9px; font-family: monospace; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase;">
                Universal Slide-Bar
              </span>
            </div>
          </a>

          <button id="prahari-slidebar-close-btn" style="width: 28px; height: 28px; border-radius: 6px; background: #0f172a; color: #94a3b8; border: 1px solid #334155; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.2s;" title="Close Sidebar (Esc)">
            ✕
          </button>
        </div>

        <!-- Quick Search Bar -->
        <div style="position: relative; width: 100%;">
          <span class="material-symbols-outlined" style="position: absolute; left: 8px; top: 7px; font-size: 16px; color: #38bdf8; pointer-events: none;">search</span>
          <input 
            id="prahari-sidebar-search-input"
            type="text" 
            placeholder="Search all 12+ features, models & tools..." 
            style="width: 100%; box-sizing: border-box; background: #0d1424; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 6px 10px 6px 30px; font-size: 11px; color: #f8fafc; outline: none; font-family: inherit;"
          />
        </div>

        <!-- Quick Action Launch Buttons Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding-top: 2px;">
          ${quickActions.map(qa => `
            <a href="${qa.url}" class="prahari-qa-tile" style="background: ${qa.bg}; border: 1px solid ${qa.border}; color: ${qa.color};">
              <span class="material-symbols-outlined" style="font-size: 15px;">${qa.icon}</span>
              <span style="font-size: 9px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${qa.name}</span>
            </a>
          `).join('')}
        </div>
      </div>

      <!-- Navigation Content -->
      <div id="prahari-slidebar-content" style="flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 14px;">
        ${navGroups.map(group => `
          <div class="prahari-nav-group" style="display: flex; flex-direction: column;">
            <div style="padding: 2px 6px; display: flex; align-items: center; gap: 6px; font-size: 9px; font-family: monospace; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 3px;">
              <span class="material-symbols-outlined" style="font-size: 13px; color: #38bdf8;">${group.groupIcon}</span>
              <span>${group.groupTitle}</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 2px;">
              ${group.items.map(item => {
                const isActive = currentPath === item.url.toLowerCase() || (currentPath === '' && item.url === 'index.html');
                return `
                  <a href="${item.url}" class="prahari-nav-item ${isActive ? 'active' : ''}" data-nav-name="${item.name.toLowerCase()} ${item.desc.toLowerCase()} ${item.tag.toLowerCase()}">
                    <div style="width: 28px; height: 28px; border-radius: 6px; background: #0f172a; border: 1px solid #1e293b; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <span class="material-symbols-outlined" style="font-size: 16px; color: ${isActive ? '#38bdf8' : '#94a3b8'};">${item.icon}</span>
                    </div>
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2;">
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                        <span style="font-size: 11px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isActive ? '#38bdf8' : '#f1f5f9'};">${item.name}</span>
                        ${item.tag ? `<span style="font-size: 8px; font-family: monospace; font-weight: 800; text-transform: uppercase; padding: 1px 4px; border-radius: 3px; color: ${item.tagColor}; background: ${item.tagBg}; border: 1px solid ${item.tagBorder};">${item.tag}</span>` : ''}
                      </div>
                      <span style="font-size: 9.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.desc}</span>
                    </div>
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Sidebar Footer -->
      <div style="padding: 10px 14px; border-top: 1px solid #1e293b; background: #060a14; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; font-size: 11px;">
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-family: monospace; color: #94a3b8;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
            <span>FastAPI Backend :8000</span>
          </span>
          <span style="color: #38bdf8; font-weight: bold;">ONLINE</span>
        </div>

        <a 
          href="alert_center.html" 
          style="width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; font-weight: 900; font-size: 11px; padding: 8px 12px; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); transition: filter 0.2s;"
        >
          <span class="material-symbols-outlined" style="font-size: 15px;">campaign</span>
          <span>Open Alert Center (FCM)</span>
        </a>

        <span style="font-size: 8.5px; text-align: center; color: #64748b; font-family: monospace;">Press [Ctrl + B] anywhere to toggle slide-bar</span>
      </div>
    `;

    document.body.appendChild(drawer);

    // Close button & backdrop events
    const closeBtn = document.getElementById('prahari-slidebar-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeSlidebar);
    backdrop.addEventListener('click', closeSlidebar);

    // Search filter input listener
    const searchInput = document.getElementById('prahari-sidebar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const items = drawer.querySelectorAll('.prahari-nav-item');
        const groups = drawer.querySelectorAll('.prahari-nav-group');

        items.forEach(item => {
          const text = item.getAttribute('data-nav-name') || '';
          if (!val || text.includes(val)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });

        // Hide empty groups when searching
        groups.forEach(group => {
          const visibleItems = group.querySelectorAll('.prahari-nav-item[style*="display: flex"], .prahari-nav-item:not([style*="display: none"])');
          if (val && visibleItems.length === 0) {
            group.style.display = 'none';
          } else {
            group.style.display = 'flex';
          }
        });
      });
    }
  }

  let isSlidebarOpen = false;

  function openSlidebar() {
    renderSlidebar();
    const backdrop = document.getElementById('prahari-slidebar-backdrop');
    const drawer = document.getElementById('prahari-slidebar-drawer');
    if (backdrop && drawer) {
      isSlidebarOpen = true;
      backdrop.style.setProperty('display', 'block', 'important');
      void drawer.offsetWidth; // Reflow
      backdrop.style.setProperty('opacity', '1', 'important');
      drawer.style.setProperty('transform', 'translateX(0)', 'important');

      const search = document.getElementById('prahari-sidebar-search-input');
      if (search) {
        setTimeout(() => { search.focus(); }, 100);
      }
    }
  }

  function closeSlidebar() {
    const backdrop = document.getElementById('prahari-slidebar-backdrop');
    const drawer = document.getElementById('prahari-slidebar-drawer');
    if (backdrop && drawer) {
      isSlidebarOpen = false;
      drawer.style.setProperty('transform', 'translateX(-100%)', 'important');
      backdrop.style.setProperty('opacity', '0', 'important');
      setTimeout(() => {
        if (!isSlidebarOpen) {
          backdrop.style.setProperty('display', 'none', 'important');
        }
      }, 260);
    }
  }

  function toggleSlidebar(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    renderSlidebar();
    if (isSlidebarOpen) {
      closeSlidebar();
    } else {
      openSlidebar();
    }
  }

  // Expose immediately to global scope
  window.prahariToggleSidebar = toggleSlidebar;
  window.prahariOpenSidebar = openSlidebar;
  window.prahariCloseSidebar = closeSlidebar;

  // Keyboard shortcut Ctrl + B or Escape
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSlidebar(e);
    }
    if (e.key === 'Escape') {
      closeSlidebar();
    }
  });

  // Global click delegator
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-prahari-sidebar-toggle], .prahari-slidebar-toggle-btn');
    if (btn) {
      toggleSlidebar(e);
    }
  }, true); // Use capture phase so nothing blocks it

  // Initialize immediately or on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSlidebar);
  } else {
    renderSlidebar();
  }
})();
