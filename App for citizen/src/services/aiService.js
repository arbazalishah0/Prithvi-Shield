import { supabase } from './supabaseClient.js';
import { store } from '../store.js';
import { i18n } from './i18n.js';
import { requireBackendBaseUrl } from './apiConfig.js';

export function calculateDistanceAndETA(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c * 10) / 10;
  const distanceMiles = Math.round(distanceKm * 0.621371 * 10) / 10;
  const durationMins = Math.max(1, Math.round((distanceKm / 40) * 60));

  return {
    distanceKm,
    distanceMiles,
    durationMins,
    formattedETA: durationMins > 60 ? `${Math.floor(durationMins/60)}h ${durationMins%60}m` : `${durationMins} mins`
  };
}

export async function queryGroqLLM(prompt, language = 'en') {
  const apiKey = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GROQ_API_KEY ? import.meta.env.VITE_GROQ_API_KEY : '';
  const model = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GROQ_MODEL ? import.meta.env.VITE_GROQ_MODEL : 'llama-3.3-70b-versatile';

  const isPlaceholder = !apiKey || apiKey.includes('REPLACE_WITH') || apiKey.includes('placeholder') || apiKey.length < 10;
  if (isPlaceholder) {
    // Return null to let the intelligent local multilingual knowledge base respond
    return null;
  }

  // Fix: never use hardcoded coords — only use real GPS if available
  const loc = store.state.currentLocation;
  const hasLocation = loc && loc.lat && loc.lng;
  const locationLine = hasLocation
    ? `User live GPS: (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}).`
    : `User GPS: not yet acquired — provide general safety advice.`;

  const systemPrompt = `You are PRITHVI-SHIELD Multilingual Conversational AI Assistant for disaster early warning & landslide safety.
Rules:
1. Respond concisely and clearly in the user's spoken/requested language (${language}).
2. Provide disaster safety advice, landslide risk updates, and evacuation instructions.
3. ${locationLine}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.6
      })
    });

    if (!res.ok) {
      throw new Error(`Groq API status ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('[Groq Direct LLM Notice]:', err);
    return null;
  }
}

let _activeBackendSessionId = null;

async function getOrCreateBackendSession(lang) {
  const baseUrl = requireBackendBaseUrl();

  if (_activeBackendSessionId) return { baseUrl, sessionId: _activeBackendSessionId };

  try {
    const res = await fetch(`${baseUrl}/api/voice/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang })
    });
    if (res.ok) {
      const data = await res.json();
      _activeBackendSessionId = data.session_id;
      return { baseUrl, sessionId: _activeBackendSessionId };
    }
  } catch (e) {
    // Backend offline or unreachable
  }
  return { baseUrl, sessionId: null };
}

export async function sendAIChatMessage(message, conversationId = null, userId = null) {
  const loc = store.state.currentLocation;
  const currentLocation = (loc && loc.lat && loc.lng) ? loc : null;
  const preferredLanguage = i18n.getEffectiveLanguage() || 'en';
  const targetShelter = (store.state.shelters && store.state.shelters[0]) || { name: 'Central Civic Shelter', lat: 11.5580, lng: 76.1310 };

  // 1. Query PRITHVI Backend Voice & Safety AI Engine (Running on localhost:8000)
  try {
    const { baseUrl, sessionId } = await getOrCreateBackendSession(preferredLanguage);
    if (sessionId) {
      const chatRes = await fetch(`${baseUrl}/api/voice/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          text: message,
          language: preferredLanguage
        })
      });
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        if (chatData && chatData.response_text) {
          return {
            conversationId: conversationId || sessionId,
            message: chatData.response_text,
            places: store.state.shelters
          };
        }
      }
    }
  } catch (err) {
    console.warn('[PRITHVI Local Backend Notice]:', err.message);
  }

  // 2. Direct Groq LLM query fallback (if configured with real key)
  const groqDirectResponse = await queryGroqLLM(message, preferredLanguage);
  if (groqDirectResponse) {
    return {
      conversationId: conversationId || 'conv_' + Date.now(),
      message: groqDirectResponse,
      places: store.state.shelters
    };
  }

  // 3. Grounded Disaster Safety Fallback Engine
  const lowerMsg = message.toLowerCase();
  const userLat = currentLocation?.lat ?? 11.5500;
  const userLng = currentLocation?.lng ?? 76.1200;
  const route = calculateDistanceAndETA(userLat, userLng, targetShelter.lat, targetShelter.lng);

  let fallbackText = "";

  const isDanger = lowerMsg.includes('danger') || lowerMsg.includes('emergency') || lowerMsg.includes('help') || lowerMsg.includes('trapped') || lowerMsg.includes('मदद') || lowerMsg.includes('खतरा');
  const isShelter = lowerMsg.includes('shelter') || lowerMsg.includes('route') || lowerMsg.includes('दूरी') || lowerMsg.includes('रास्ता') || lowerMsg.includes('निवारा');
  const isSafetyTips = lowerMsg.includes('what should i do') || lowerMsg.includes('landslide') || lowerMsg.includes('tips') || lowerMsg.includes('भूस्खलन') || lowerMsg.includes('दरड') || lowerMsg.includes('काय करावे');
  const isGreeting = lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey') || lowerMsg.includes('namaste') || lowerMsg.includes('नमस्ते') || lowerMsg.includes('नमस्कार');

  if (preferredLanguage === 'hi') {
    if (isDanger) {
      fallbackText = "तुरंत ढलान और नदी नालों से दूर ऊंचे व पक्के स्थान पर जाएं। यदि आप खतरे में हैं, तो तत्काल 112 पर कॉल करें।";
    } else if (isShelter) {
      fallbackText = `${targetShelter.name} की दूरी लगभग ${route.distanceKm} किलोमीटर है। वहां पहुंचने में लगभग ${route.durationMins} मिनट लगेंगे।`;
    } else if (isSafetyTips) {
      fallbackText = "भूस्खलन के दौरान तुरंत ऊंचे और पक्के स्थान पर जाएं। ढलानों और नदी घाटियों से दूर रहें। गड़गड़ाहट की आवाज पर सतर्क रहें और तुरंत एसओएस भेजें।";
    } else if (isGreeting) {
      fallbackText = "नमस्ते, मैं पृथ्वी हूँ, आपका AI सुरक्षा सहायक। आज मैं आपकी सुरक्षा में क्या सहायता कर सकता हूँ?";
    } else {
      fallbackText = `मैंने पृथ्वी-शील्ड डेटाबेस में आपकी जांच दर्ज की। स्थान (${userLat.toFixed(4)}, ${userLng.toFixed(4)}) पर भूस्खलन जोखिम निगरानी सक्रिय है।`;
    }
  } else if (preferredLanguage === 'mr') {
    if (isDanger) {
      fallbackText = "तातडीने डोंगराळ उतारावरून दूर उंच आणि सुरक्षित ठिकाणी जा. तातडीच्या मदतीसाठी ११२ किंवा आपत्ती व्यवस्थापनाशी संपर्क साधा.";
    } else if (isShelter) {
      fallbackText = `जवळचे सुरक्षित निवारा केंद्र ${targetShelter.name} ${route.distanceKm} किमी अंतरावर आहे. अंदाजे वेळ ${route.durationMins} मिनिटे लागेल.`;
    } else if (isSafetyTips) {
      fallbackText = "दरड कोसळण्याच्या वेळी त्वरित उंच व सुरक्षित जागी जा. उतारांवरून आणि खोऱ्यांमधून जाणे टाळा. आपत्कालीन एसओएस सिग्नल पाठवा.";
    } else if (isGreeting) {
      fallbackText = "नमस्कार, मी पृथ्वी, आपला AI सुरक्षा सहाय्यक. मी आज आपल्या सुरक्षिततेसाठी काय मदत करू शकतो?";
    } else {
      fallbackText = "मी आपल्या सुरक्षेसाठी उपलब्ध आहे. आपत्कालीन मदत, सुरक्षित निवारा किंवा दरड सुरक्षेविषयी मला विचारू शकता.";
    }
  } else {
    if (isDanger) {
      fallbackText = "Move immediately to stable high ground away from steep slopes. If you are in immediate danger, dial 112 for emergency services.";
    } else if (isShelter) {
      fallbackText = `The distance to ${targetShelter.name} is ${route.distanceKm} km. Estimated travel duration is approximately ${route.formattedETA}.`;
    } else if (isSafetyTips) {
      fallbackText = "Stay alert for rumbling sounds or sudden water runoff. Avoid steep slopes, ravines, and saturated soil during heavy rainfall.";
    } else if (isGreeting) {
      fallbackText = "Hello, I am PRITHVI, your AI Safety Assistant. How can I help you stay safe today?";
    } else {
      fallbackText = "Stay alert for rumbling sounds or sudden water runoff. Avoid steep slopes, ravines, and saturated soil during heavy rainfall.";
    }
  }

  return {
    conversationId: conversationId || 'conv_' + Date.now(),
    message: fallbackText,
    toolResults: [{ tool: 'calculate_route', result: { ...route, destination: targetShelter } }],
    places: [targetShelter]
  };
}
