export default async function handler(req, res) {
    // allow your site and local dev
    const origin = req.headers.origin || "";
    const allow =
      origin === "https://wyfraymer.vercel.app" || origin === "http://localhost:3000"
        ? origin
        : "https://wyfraymer.vercel.app";
  
    res.setHeader("Access-Control-Allow-Origin", allow);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
  
    const upstreamBase =
      "https://script.google.com/macros/s/AKfycbwQwDs7tCt8RVKlXWW8vd3TTeFlgqx4h6nW1roMoqpgV2lL5vzBLO_ys__-uIwvpi5olw/exec";
  
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const upstreamUrl = upstreamBase + qs;
  
    const init = { method: req.method, headers: { "Content-Type": "application/json" } };
    if (req.method === "POST") {
      const bodyText =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
      init.body = bodyText;
    }
  
    const r = await fetch(upstreamUrl, init);
    const ct = r.headers.get("content-type") || "application/json; charset=utf-8";
    const text = await r.text();
  
    res.setHeader("Content-Type", ct);
    res.status(r.status).send(text);
  }
  