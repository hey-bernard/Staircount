// Staircount Health Sync — Cloudflare Worker
//
// Bridges Apple Health data into the Staircount web app without a native
// app: an iOS Shortcuts automation reads "Flights Climbed" and "Steps"
// from Health and POSTs them here; the web app then GETs the latest value.
//
// Apple Health only ever records ascended flights (no HealthKit metric
// exists for descended flights), so this only ever supplies the "오르기"
// side — "내리기" stays a manual count in the app.
//
// Deploy (browser only, no CLI/Mac needed): see ../README.md "건강 앱 연동".

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Sync-Token",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const token = request.headers.get("X-Sync-Token") || url.searchParams.get("token");
    if (!env.SYNC_TOKEN || token !== env.SYNC_TOKEN) {
      return new Response("Unauthorized", { status: 401, headers: cors });
    }

    if (request.method === "POST" && url.pathname === "/sync") {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON body", { status: 400, headers: cors });
      }

      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
      const flightsClimbed = Math.max(0, Number(body.flightsClimbed) || 0);
      const steps = Math.max(0, Number(body.steps) || 0);

      const record = { date, flightsClimbed, steps, syncedAt: Date.now() };
      await env.HEALTH_KV.put(`day:${date}`, JSON.stringify(record));
      return new Response(JSON.stringify(record), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && url.pathname === "/latest") {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("date"))
        ? url.searchParams.get("date")
        : new Date().toISOString().slice(0, 10);
      const raw = await env.HEALTH_KV.get(`day:${date}`);
      return new Response(raw || "null", {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
