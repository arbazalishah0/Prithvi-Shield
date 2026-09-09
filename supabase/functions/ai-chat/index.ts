// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_current_location",
      description: "Get the user's current GPS location coordinates.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "search_places",
      description: "Search for places, hazard zones, shelters, coffee shops, petrol stations, or hospitals based on a query.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_route",
      description: "Calculate driving route, distance (km/mi), and estimated travel duration between user location and destination.",
      parameters: {
        type: "object",
        properties: {
          origin_lat: { type: "number" },
          origin_lng: { type: "number" },
          dest_lat: { type: "number" },
          dest_lng: { type: "number" },
          destination_name: { type: "string" }
        },
        required: ["dest_lat", "dest_lng"]
      }
    }
  }
];

function calculateRouteMetrics(lat1: number, lon1: number, lat2: number, lon2: number) {
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

  return { distance_km: distanceKm, distance_miles: distanceMiles, estimated_duration_mins: durationMins };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is not configured on the server." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { conversationId, message, user_id, user_location, preferred_language } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const uLat = user_location?.lat || 11.5524;
    const uLng = user_location?.lng || 76.1245;

    const systemMessage = {
      role: "system",
      content: `You are PRITHVI-SHIELD Multilingual Conversational AI Assistant. 
Supported Languages: English (en), Hindi (hi), Marathi (mr), Bengali (bn), Gujarati (gu), Tamil (ta), Telugu (te), Kannada (kn), Malayalam (ml), Punjabi (pa), Urdu (ur).
Rules:
1. Automatically detect the user's spoken/written language or code-switching (mixed languages).
2. If the user requests to switch language (e.g., "अब हिंदी में बात करो", "आता मराठीत बोल"), switch your response language immediately.
3. Normalize intent into tool calls (search_places, calculate_route, get_current_location).
4. ALWAYS return the final conversational answer strictly in the user's detected or requested language.
User Preferred Language Setting: ${preferred_language || 'Auto Detect'}.
User Current GPS: (${uLat.toFixed(4)}, ${uLng.toFixed(4)}).`
    };

    const executeTool = async (name: string, args: any) => {
      if (name === "get_current_location") {
        return { latitude: uLat, longitude: uLng };
      } else if (name === "search_places") {
        const query = args.query || "";
        const { data } = await supabase
          .from("places")
          .select("*, categories(name, icon), photos(public_url)")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,address.ilike.%${query}%`)
          .limit(5);
        return data || [];
      } else if (name === "calculate_route") {
        const originLat = args.origin_lat || uLat;
        const originLng = args.origin_lng || uLng;
        const metrics = calculateRouteMetrics(originLat, originLng, args.dest_lat, args.dest_lng);
        return { origin: { latitude: originLat, longitude: originLng }, destination: { latitude: args.dest_lat, longitude: args.dest_lng }, ...metrics };
      }
      return [];
    };

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [systemMessage, { role: "user", content: message }],
        tools: TOOLS,
        tool_choice: "auto"
      })
    });

    const groqData = await groqResponse.json();
    let finalContent = "";
    let toolResults = [];

    if (groqData.choices && groqData.choices[0]) {
      const choiceMessage = groqData.choices[0].message;

      if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
        for (const toolCall of choiceMessage.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = JSON.parse(toolCall.function.arguments);
          const result = await executeTool(fnName, fnArgs);
          toolResults.push({ tool: fnName, result });

          const followUp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                systemMessage,
                { role: "user", content: message },
                choiceMessage,
                {
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(result)
                }
              ]
            })
          });
          const followUpData = await followUp.json();
          finalContent = followUpData.choices?.[0]?.message?.content || "Data retrieved.";
        }
      } else {
        finalContent = choiceMessage.content;
      }
    }

    return new Response(JSON.stringify({
      conversationId: conversationId || 'conv_' + Date.now(),
      message: finalContent,
      toolResults
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
