// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeIndianPhone(rawPhone: string): string | null {
  if (!rawPhone) return null;
  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, "");
  
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  
  // Valid Indian mobile numbers are 10 digits starting with 6, 7, 8, or 9
  if (digits.length === 10 && /^[6789]/.test(digits)) {
    return digits;
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://xyzcompany.supabase.co";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const fast2smsApiKey = Deno.env.get("FAST2SMS_API_KEY") || "";
    const defaultCooldownMinutes = parseInt(Deno.env.get("SMS_ALERT_COOLDOWN_MINUTES") || "30", 10);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    
    const {
      latitude,
      longitude,
      risk_level = "LOW",
      risk_score = 0.0,
      danger_radius_km = 5.0,
      is_test = false,
      test_phone = null,
      custom_message = null
    } = body;

    console.log(`[Prithvi Shield SMS] Received request - Risk: ${risk_level}, Coords: [${latitude}, ${longitude}], IsTest: ${is_test}`);

    // Validate inputs
    const numLat = Number(latitude);
    const numLng = Number(longitude);
    const numScore = Number(risk_score);
    const radius = Number(danger_radius_km) || 5.0;
    const upperRisk = String(risk_level).toUpperCase();

    // -------------------------------------------------------------------------
    // TEST SMS MODE HANDLER
    // -------------------------------------------------------------------------
    if (is_test) {
      if (!test_phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Test phone number is required for test mode." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validPhone = normalizeIndianPhone(test_phone);
      if (!validPhone) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid Indian phone number format: ${test_phone}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testMsg = custom_message || `PRITHVI-SHIELD TEST ALERT\nThis is a test of the landslide early-warning system.\nNo action is required.`;

      let smsStatus = "SIMULATED";
      let errorMsg = null;
      let providerMsgId = null;

      if (fast2smsApiKey && fast2smsApiKey !== "YOUR_FAST2SMS_API_KEY") {
        try {
          const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              "authorization": fast2smsApiKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              route: "q",
              message: testMsg,
              language: "english",
              flash: 0,
              numbers: validPhone
            })
          });

          const smsResult = await smsRes.json();
          if (smsRes.ok && smsResult.return === true) {
            smsStatus = "SENT";
            providerMsgId = smsResult.request_id || "FAST2SMS_OK";
            console.log(`[Prithvi Shield SMS] Test SMS successfully delivered to ${validPhone}`);
          } else {
            smsStatus = "FAILED";
            errorMsg = smsResult.message || smsResult.detail || "Fast2SMS provider error";
            console.warn(`[Prithvi Shield SMS] Fast2SMS Test Error: ${errorMsg}`);
          }
        } catch (err) {
          smsStatus = "FAILED";
          errorMsg = err.message || "Network request failure";
          console.error(`[Prithvi Shield SMS] Test dispatch exception: ${err}`);
        }
      } else {
        errorMsg = "FAST2SMS_API_KEY not configured. Simulated dispatch.";
        console.log(`[Prithvi Shield SMS] TEST MODE (SIMULATED): Sent to ${validPhone}`);
      }

      // Log in DB
      await supabase.from("sms_alerts").insert({
        user_id: "TEST_USER",
        phone: validPhone,
        latitude: isNaN(numLat) ? 0 : numLat,
        longitude: isNaN(numLng) ? 0 : numLng,
        risk_level: upperRisk,
        risk_score: numScore,
        message: testMsg,
        provider: "Fast2SMS",
        provider_message_id: providerMsgId,
        status: smsStatus,
        error_message: errorMsg,
        is_test: true,
        danger_radius_km: radius
      });

      return new Response(
        JSON.stringify({
          success: smsStatus === "SENT" || smsStatus === "SIMULATED",
          is_test: true,
          status: smsStatus,
          recipient: validPhone,
          message: testMsg,
          error: errorMsg
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------------------
    // AUTOMATIC ALERT ROUTE (Requires HIGH or CRITICAL risk)
    // -------------------------------------------------------------------------
    if (upperRisk !== "HIGH" && upperRisk !== "CRITICAL") {
      console.log(`[Prithvi Shield SMS] Risk level '${upperRisk}' is below alert threshold (HIGH/CRITICAL). Skipping SMS broadcast.`);
      return new Response(
        JSON.stringify({
          success: true,
          status: "SKIPPED_LOW_RISK",
          risk_level: upperRisk,
          message: "Risk level does not require SMS early warning broadcast."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isNaN(numLat) || isNaN(numLng)) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid latitude and longitude are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Query Active Citizens from Database
    const { data: citizens, error: dbErr } = await supabase
      .from("citizen_users")
      .select("*")
      .eq("account_status", "ACTIVE");

    if (dbErr) {
      console.error("[Prithvi Shield SMS] Database query error:", dbErr);
    }

    const citizenList = citizens || [
      { user_account_id: 'citizen_005', full_name: 'Tashi Lepcha', phone: '+91 97330 22334', latitude: 27.3389, longitude: 88.6065 },
      { user_account_id: 'citizen_004', full_name: 'Ananya Nair', phone: '+91 94470 99001', latitude: 11.5542, longitude: 76.1264 },
      { user_account_id: 'citizen_007', full_name: 'Rahul Sharma', phone: '+91 98765 43210', latitude: 27.3380, longitude: 88.6050 }
    ];

    // 2. Filter Citizens inside Danger Radius (Haversine)
    const affectedCitizens = [];
    for (const c of citizenList) {
      if (c.latitude && c.longitude && c.phone) {
        const dist = haversineDistanceKm(numLat, numLng, c.latitude, c.longitude);
        if (dist <= radius) {
          const validPhone = normalizeIndianPhone(c.phone);
          if (validPhone) {
            affectedCitizens.push({
              user_id: c.user_account_id || c.id || "citizen",
              name: c.full_name || "Resident",
              raw_phone: c.phone,
              phone: validPhone,
              distance_km: Math.round(dist * 10) / 10
            });
          }
        }
      }
    }

    console.log(`[Prithvi Shield SMS] Prediction [${numLat}, ${numLng}] - Found ${affectedCitizens.length} citizens inside ${radius}km danger radius.`);

    if (affectedCitizens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          status: "NO_CITIZENS_IN_RADIUS",
          prediction_coords: { latitude: numLat, longitude: numLng },
          affected_citizens_count: 0,
          message: `No registered citizens found within ${radius} km danger radius.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Deduplication / Cooldown Check (Default 30 mins)
    const cooldownCutoff = new Date(Date.now() - defaultCooldownMinutes * 60 * 1000).toISOString();
    const { data: recentAlerts } = await supabase
      .from("sms_alerts")
      .select("*")
      .gte("created_at", cooldownCutoff)
      .eq("is_test", false);

    const eligibleCitizens = [];
    let cooldownSkippedCount = 0;

    for (const citizen of affectedCitizens) {
      const prevForCitizen = (recentAlerts || []).filter(a => a.phone === citizen.phone);
      
      let isSuppressed = false;
      if (prevForCitizen.length > 0) {
        const lastAlert = prevForCitizen[0];
        // Allow escalation override: if last alert was HIGH and current is CRITICAL, bypass cooldown!
        const isEscalation = lastAlert.risk_level === "HIGH" && upperRisk === "CRITICAL";
        if (!isEscalation) {
          isSuppressed = true;
        }
      }

      if (isSuppressed) {
        cooldownSkippedCount++;
        console.log(`[Prithvi Shield SMS] Cooldown active for ${citizen.phone}. Skipping repeat SMS.`);
        await supabase.from("sms_alerts").insert({
          user_id: citizen.user_id,
          phone: citizen.phone,
          latitude: numLat,
          longitude: numLng,
          risk_level: upperRisk,
          risk_score: numScore,
          message: "SMS suppressed due to 30-minute cooldown window.",
          provider: "Fast2SMS",
          status: "SKIPPED_COOLDOWN",
          danger_radius_km: radius
        });
      } else {
        eligibleCitizens.push(citizen);
      }
    }

    if (eligibleCitizens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          status: "ALL_SUPPRESSED_BY_COOLDOWN",
          affected_citizens_count: affectedCitizens.length,
          cooldown_skipped_count: cooldownSkippedCount,
          message: "All affected citizens recently received a warning within the 30-minute cooldown period."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Construct Emergency Message
    let alertMsg = "";
    if (upperRisk === "CRITICAL") {
      alertMsg = `PRITHVI-SHIELD CRITICAL ALERT:\nImmediate landslide danger detected near your area.\nPlease evacuate toward a safe location and follow instructions from local authorities.\nLocation:\nhttps://www.google.com/maps?q=${numLat},${numLng}`;
    } else {
      alertMsg = `PRITHVI-SHIELD ALERT:\nHIGH landslide risk detected near your area.\nRisk Score: ${numScore.toFixed(1)}%\nPlease move to a safer location and follow instructions from local authorities.\nLocation:\nhttps://www.google.com/maps?q=${numLat},${numLng}`;
    }

    const phoneNumbersToDispatch = eligibleCitizens.map(c => c.phone);
    let smsStatus = "SIMULATED";
    let errorMsg = null;
    let providerMsgId = null;

    // 5. Fast2SMS Provider Dispatch
    if (fast2smsApiKey && fast2smsApiKey !== "YOUR_FAST2SMS_API_KEY") {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": fast2smsApiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            route: "q",
            message: alertMsg,
            language: "english",
            flash: 0,
            numbers: phoneNumbersToDispatch.join(",")
          })
        });

        const smsResult = await smsRes.json();
        if (smsRes.ok && smsResult.return === true) {
          smsStatus = "SENT";
          providerMsgId = smsResult.request_id || "FAST2SMS_BATCH_OK";
          console.log(`[Prithvi Shield SMS] Fast2SMS batch delivered to ${phoneNumbersToDispatch.length} citizens.`);
        } else {
          smsStatus = "FAILED";
          errorMsg = smsResult.message || smsResult.detail || "Fast2SMS provider error";
          console.warn(`[Prithvi Shield SMS] Fast2SMS dispatch warning: ${errorMsg}`);
        }
      } catch (err) {
        smsStatus = "FAILED";
        errorMsg = err.message || "Network request error";
        console.error(`[Prithvi Shield SMS] Dispatch exception: ${err}`);
      }
    } else {
      errorMsg = "FAST2SMS_API_KEY not configured. Simulated dispatch for SIH demo.";
      console.log(`[Prithvi Shield SMS] SIMULATED DISPATCH to ${phoneNumbersToDispatch.length} phones: ${phoneNumbersToDispatch.join(", ")}`);
    }

    // 6. Audit Logging in Database
    for (const citizen of eligibleCitizens) {
      await supabase.from("sms_alerts").insert({
        user_id: citizen.user_id,
        phone: citizen.phone,
        latitude: numLat,
        longitude: numLng,
        risk_level: upperRisk,
        risk_score: numScore,
        message: alertMsg,
        provider: "Fast2SMS",
        provider_message_id: providerMsgId,
        status: smsStatus,
        error_message: errorMsg,
        is_test: false,
        danger_radius_km: radius
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        risk_level: upperRisk,
        affected_citizens_count: affectedCitizens.length,
        sms_attempted_count: eligibleCitizens.length,
        sms_sent_count: smsStatus === "SENT" || smsStatus === "SIMULATED" ? eligibleCitizens.length : 0,
        sms_failed_count: smsStatus === "FAILED" ? eligibleCitizens.length : 0,
        cooldown_skipped_count: cooldownSkippedCount,
        simulation_mode: !fast2smsApiKey || fast2smsApiKey === "YOUR_FAST2SMS_API_KEY",
        recipients: eligibleCitizens.map(c => ({ name: c.name, phone: c.phone, distance_km: c.distance_km })),
        message: "SMS early warning pipeline processing completed."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[Prithvi Shield SMS] Critical unhandled Edge Function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
