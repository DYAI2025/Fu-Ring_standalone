import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const distPath = path.join(__dirname, "dist");

// Railway private networking (same project): http://<service>.railway.internal:<port>
// Falls back to public URL if BAFE_INTERNAL_URL is not set.
const BAFE_BASE_URL =
  process.env.BAFE_INTERNAL_URL ||
  process.env.BAFE_BASE_URL ||
  process.env.VITE_BAFE_BASE_URL ||
  "https://bafe-production.up.railway.app";

// ── API proxy → BAFE backend (avoids browser CORS issues) ──────────
app.post("/api/calculate/:endpoint", express.json(), async (req, res) => {
  const { endpoint } = req.params;
  const allowed = ["bazi", "western", "fusion", "wuxing", "tst"];
  if (!allowed.includes(endpoint)) {
    return res.status(400).json({ error: `Unknown endpoint: ${endpoint}` });
  }

  const targetUrl = `${BAFE_BASE_URL}/calculate/${endpoint}`;
  console.log(`[proxy] POST ${targetUrl}`);

  try {
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const contentType = upstream.headers.get("content-type") || "application/json";
    const body = await upstream.text();

    if (!upstream.ok) {
      console.error(`[proxy] ${endpoint} → ${upstream.status}  body: ${body.slice(0, 300)}`);
    }

    res.status(upstream.status).set("Content-Type", contentType).send(body);
  } catch (err) {
    console.error(`[proxy] ${endpoint} network error:`, err.message);
    res.status(502).json({
      error: "BAFE API unreachable",
      details: err.message,
    });
  }
});

// ── Diagnostic: probe BAFE to discover available routes ─────────────
app.get("/api/debug-bafe", async (_req, res) => {
  const probes = [
    { label: "root", url: `${BAFE_BASE_URL}/` },
    { label: "docs", url: `${BAFE_BASE_URL}/docs` },
    { label: "openapi", url: `${BAFE_BASE_URL}/openapi.json` },
    { label: "health", url: `${BAFE_BASE_URL}/health` },
    { label: "GET /calculate/western", url: `${BAFE_BASE_URL}/calculate/western` },
    { label: "GET /api/calculate/western", url: `${BAFE_BASE_URL}/api/calculate/western` },
    { label: "GET /v1/calculate/western", url: `${BAFE_BASE_URL}/v1/calculate/western` },
  ];

  const results = [];
  for (const { label, url } of probes) {
    try {
      const r = await fetch(url, { method: "GET" });
      const text = await r.text();
      results.push({
        label,
        url,
        status: r.status,
        contentType: r.headers.get("content-type"),
        body: text.slice(0, 500),
      });
    } catch (err) {
      results.push({ label, url, error: err.message });
    }
  }

  res.json({ bafe_base_url: BAFE_BASE_URL, probes: results });
});

// ── Static files ────────────────────────────────────────────────────
app.use(express.static(distPath, { index: "index.html" }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Astro-Noctum listening on port ${port}`);
  console.log(`BAFE proxy → ${BAFE_BASE_URL}`);
});
