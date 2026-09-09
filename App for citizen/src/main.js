import './style.css';
import { store } from './store.js';
import { pwaManager } from './services/pwaService.js';
import { renderTopControlBar, bindControlBarEvents } from './components/DeviceFrame.js';
import { renderSplashScreen, initSplashScreen } from './components/SplashScreen.js';
import { renderGlobalOverlays, bindGlobalOverlayEvents } from './components/PWABanner.js';

// Import Views
import { renderHomeView, bindHomeEvents } from './views/HomeView.js';
import { renderMapView, bindMapEvents } from './views/MapView.js';
import { renderReportHazardView, bindReportHazardEvents } from './views/ReportHazardView.js';
import { renderAIVerificationView, bindAIVerificationEvents } from './views/AIVerificationView.js';
import { renderSOSView, bindSOSEvents } from './views/SOSView.js';
import { renderFamilyCircleView, bindFamilyCircleEvents } from './views/FamilyCircleView.js';
import { renderSafetyCircleActiveView, bindSafetyCircleActiveEvents } from './views/SafetyCircleActiveView.js';
import { renderPrivacySettingsView, bindPrivacySettingsEvents } from './views/PrivacySettingsView.js';
import { renderVoiceAssistantView, bindVoiceAssistantEvents } from './views/VoiceAssistantView.js';
import { renderDigitalTwinView, bindDigitalTwinEvents } from './views/DigitalTwinView.js';
import { renderAuthView, bindAuthEvents } from './views/AuthView.js';
import { renderPermissionSetupView, bindPermissionSetupEvents } from './views/PermissionSetupView.js';
import { renderSafeRouteView, bindSafeRouteEvents } from './views/SafeRouteView.js';
import { renderNearestShelterView, bindNearestShelterEvents } from './views/NearestShelterView.js';
import { renderOnboardingView, bindOnboardingEvents } from './views/OnboardingView.js';
import { renderAlertsView, bindAlertsEvents } from './views/AlertsView.js';
import { renderAlertDetailsView, bindAlertDetailsEvents } from './views/AlertDetailsView.js';
import { renderProfileView, bindProfileEvents } from './views/ProfileView.js';
import { renderMoreView, bindMoreEvents } from './views/MoreView.js';
import { fcmService } from './services/fcmService.js';

// Expose navigation bridge for global triggers (like notification clicks)
window.renderAppView = function(view) {
  store.navigate(view);
};

function renderApp() {
  const root = document.getElementById('app-root');
  if (!root) return;

  let activeView = 'home';
  if (!store.state.isOnboardingCompleted) {
    activeView = 'onboarding';
  } else if (!store.state.isLoggedIn) {
    activeView = 'auth';
  } else {
    activeView = store.state.activeView;
  }

  let viewHtml = '';
  let bindViewEvents = () => {};

  switch (activeView) {
    case 'onboarding':
      viewHtml = renderOnboardingView();
      bindViewEvents = bindOnboardingEvents;
      break;
    case 'home':
      viewHtml = renderHomeView();
      bindViewEvents = bindHomeEvents;
      break;
    case 'map':
      viewHtml = renderMapView();
      bindViewEvents = bindMapEvents;
      break;
    case 'safe-route':
      viewHtml = renderSafeRouteView();
      bindViewEvents = bindSafeRouteEvents;
      break;
    case 'shelters':
      viewHtml = renderNearestShelterView();
      bindViewEvents = bindNearestShelterEvents;
      break;
    case 'report':
      viewHtml = renderReportHazardView();
      bindViewEvents = bindReportHazardEvents;
      break;
    case 'ai-verify':
      viewHtml = renderAIVerificationView();
      bindViewEvents = bindAIVerificationEvents;
      break;
    case 'sos':
      viewHtml = renderSOSView();
      bindViewEvents = bindSOSEvents;
      break;
    case 'alerts':
      viewHtml = renderAlertsView();
      bindViewEvents = bindAlertsEvents;
      break;
    case 'alert-details':
      viewHtml = renderAlertDetailsView();
      bindViewEvents = bindAlertDetailsEvents;
      break;
    case 'profile':
      viewHtml = renderProfileView();
      bindViewEvents = bindProfileEvents;
      break;
    case 'auth':
      viewHtml = renderAuthView();
      bindViewEvents = bindAuthEvents;
      break;
    case 'auth-permissions':
      viewHtml = renderPermissionSetupView();
      bindViewEvents = bindPermissionSetupEvents;
      break;
    case 'circle':
      viewHtml = renderFamilyCircleView();
      bindViewEvents = bindFamilyCircleEvents;
      break;
    case 'circle-active':
      viewHtml = renderSafetyCircleActiveView();
      bindViewEvents = bindSafetyCircleActiveEvents;
      break;
    case 'privacy-settings':
      viewHtml = renderPrivacySettingsView();
      bindViewEvents = bindPrivacySettingsEvents;
      break;
    case 'voice-assistant':
      viewHtml = renderVoiceAssistantView();
      bindViewEvents = bindVoiceAssistantEvents;
      break;
    case 'twin':
      viewHtml = renderDigitalTwinView();
      bindViewEvents = bindDigitalTwinEvents;
      break;
    case 'more':
      viewHtml = renderMoreView();
      bindViewEvents = bindMoreEvents;
      break;
    default:
      viewHtml = renderHomeView();
      bindViewEvents = bindHomeEvents;
      break;
  }

  root.innerHTML = `
    <!-- Production Citizen Mobile App Container -->
    <div id="screen-inner-container" class="w-full max-w-lg mx-auto bg-surface min-h-screen relative flex flex-col shadow-2xl overflow-x-hidden antialiased">
      ${renderGlobalOverlays()}
      ${viewHtml}
    </div>
  `;

  // Bind events
  bindGlobalOverlayEvents(root);
  const screenInner = root.querySelector('#screen-inner-container');
  if (screenInner) {
    bindViewEvents(screenInner);
  }
}

// Initial Render & Splash Screen Boot
let isSplashShown = false;

if (!isSplashShown) {
  isSplashShown = true;
  document.body.insertAdjacentHTML('beforeend', renderSplashScreen());
  initSplashScreen(() => {
    console.log('[PRITHVI-SHIELD] Splash screen completed. System active.');
  });
}

renderApp();

// Subscribe to store updates
store.subscribe(() => {
  renderApp();
});

// Subscribe to PWA state changes
pwaManager.onStateChange(() => {
  renderApp();
});

// Initialize FCM Push & Live Broadcast Receiver
fcmService.initialize(
  'citizen_001',
  store.state.currentUser?.fullName || 'Arunav Baruah',
  'Kamrup / Guwahati',
  store.state.currentUser?.language || 'English'
);
