// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const voiceApiKey = Deno.env.get("VOICE_PROVIDER_API_KEY");
    const voiceAgentId = Deno.env.get("VOICE_AGENT_ID") ?? "agent_prithvi_shield_demo";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const { user_id } = await req.json().catch(() => ({ user_id: null }));

    if (!voiceApiKey) {
      // Graceful fallback session payload for development/verification mode
      return new Response(JSON.stringify({
        status: "READY",
        provider: "retell",
        access_token: "demo_ephemeral_retell_token_sample",
        agent_id: voiceAgentId,
        message: "Voice session initialized in test/fallback mode. Configure VOICE_PROVIDER_API_KEY for live audio streaming."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Official Retell AI session creation POST request
    const retellResponse = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${voiceApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: voiceAgentId,
        metadata: { user_id: user_id || "anonymous" }
      })
    });

    const retellData = await retellResponse.json();

    // Log session in Supabase if user authenticated
    if (user_id && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from("voice_sessions").insert({
        user_id,
        provider: "retell",
        external_session_id: retellData.call_id || "web_call_" + Date.now(),
        status: "CONNECTING"
      });
    }

    return new Response(JSON.stringify({
      status: "SUCCESS",
      provider: "retell",
      access_token: retellData.access_token || retellData.call_id,
      call_id: retellData.call_id,
      agent_id: voiceAgentId
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
