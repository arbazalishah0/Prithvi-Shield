import { supabase } from './supabaseClient.js';
import { store } from '../store.js';
import { i18n } from './i18n.js';

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
  const apiKey = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GROQ_API_KEY ? import.meta.env.VITE_GROQ_API_KEY : 'gsk_vC8k2B2X9m4A6p1Z7q0R8T3u1W2Y4L6M';
  const model = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GROQ_MODEL ? import.meta.env.VITE_GROQ_MODEL : 'llama-3.3-70b-versatile';
  const currentLocation = store.state.currentLocation || { lat: 11.5580, lng: 76.1310 };

  const systemPrompt = `You are PRITHVI-SHIELD Multilingual Conversational AI Assistant for disaster early warning & landslide safety.
Rules:
1. Respond concisely and clearly in the user's spoken/requested language (${language}).
2. Provide disaster safety advice, landslide risk updates, and evacuation instructions.
3. User live GPS coordinates: (${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}).`;

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

export async function sendAIChatMessage(message, conversationId = null, userId = null) {
  const currentLocation = store.state.currentLocation || { lat: 11.5524, lng: 76.1245 };
  const preferredLanguage = i18n.getEffectiveLanguage();

  // Try direct Groq LLM query first
  const groqDirectResponse = await queryGroqLLM(message, preferredLanguage);
  if (groqDirectResponse) {
    return {
      conversationId: conversationId || 'conv_' + Date.now(),
      message: groqDirectResponse,
      places: store.state.shelters
    };
  }

  // Supabase Edge Function fallback
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        conversationId,
        user_id: userId,
        user_location: currentLocation,
        preferred_language: preferredLanguage
      }
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase edge function fallback, generating localized response:', err);
    const lowerMsg = message.toLowerCase();
    const targetShelter = store.state.shelters[0] || { name: 'Central Civic Shelter', lat: 11.5580, lng: 76.1310 };
    const route = calculateDistanceAndETA(currentLocation.lat, currentLocation.lng, targetShelter.lat, targetShelter.lng);

    let fallbackText = "";

    if (preferredLanguage === 'hi') {
      fallbackText = lowerMsg.includes('route') || lowerMsg.includes('दूरी') || lowerMsg.includes('रास्ता')
        ? `${targetShelter.name} की दूरी ${route.distanceKm} किलोमीटर है। वहां पहुंचने में लगभग ${route.durationMins} मिनट लगेंगे।`
        : `मैंने पृथ्वी-शील्ड डेटाबेस में "${message}" के लिए जांच की। स्थान (${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}) पर निगरानी जारी है।`;
    } else {
      fallbackText = `The distance to ${targetShelter.name} is ${route.distanceKm} km. Estimated travel duration is approximately ${route.formattedETA}.`;
    }

    return {
      conversationId: conversationId || 'conv_' + Date.now(),
      message: fallbackText,
      toolResults: [{ tool: 'calculate_route', result: { ...route, destination: targetShelter } }],
      places: [targetShelter]
    };
  }
}
