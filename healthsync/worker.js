// Staircount Health Sync — Cloudflare Worker
//
// Two independent bridges into the Staircount web app, neither requiring a
// native app build:
//
// 1. /sync + /latest — an iOS Shortcuts automation reads "Flights Climbed"
//    and "Steps" from Apple Health and POSTs them here once a day. Health
//    only ever records ascended flights (no HealthKit metric exists for
//    descended flights), so this only ever supplies the "오르기" side.
//
// 2. /sensorpush + /sensorpush/latest — the free "Sensor Logger" app
//    (tszheichoi) streams raw accelerometer/pedometer/barometer readings
//    here via its built-in HTTP Push feature while running in the
//    background. We store the most recent reading verbatim (no attempt to
//    derive floor counts yet — the exact field names need confirming
//    against a real device first) so the web app can display it.
//
// Deploy (browser only, no CLI/Mac needed): see ../README.md.

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

    // Sensor Logger's HTTP Push body: { messageId, sessionId, deviceId,
    // userId, payload: [{ name, time, values }, ...] }. We keep the most
    // recent reading per sensor name we care about, stored verbatim.
    if (request.method === "POST" && url.pathname === "/sensorpush") {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON body", { status: 400, headers: cors });
      }

      const items = Array.isArray(body.payload) ? body.payload : [];
      const receivedAt = Date.now();
      const record = { receivedAt, pedometer: null, barometer: null, accelerometer: null };

      for (const item of items) {
        if (item && item.name && item.values && record.hasOwnProperty(item.name)) {
          record[item.name] = { time: item.time, values: item.values };
        }
      }

      await env.HEALTH_KV.put("sensorpush:latest", JSON.stringify(record));
      return new Response(JSON.stringify({ ok: true, itemsReceived: items.length }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && url.pathname === "/sensorpush/latest") {
      const raw = await env.HEALTH_KV.get("sensorpush:latest");
      return new Response(raw || "null", {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
