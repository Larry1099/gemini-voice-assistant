import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Modality } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8080);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-live-2.5-flash-preview";
const SHAREPOINT_ORIGIN = (process.env.SHAREPOINT_ORIGIN || "").trim();

if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is not set.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1alpha" }
});
// Use the SDK's normal stable API version for ordinary text generation.
const textAi = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Only allow your own SharePoint site to frame this app.
// Example: https://contoso.sharepoint.com
const frameAncestors = SHAREPOINT_ORIGIN
  ? ["'self'", SHAREPOINT_ORIGIN]
  : ["'self'"];

app.disable("x-powered-by");
app.use(helmet({
  // Vite bundles the frontend into /dist. The app needs its own scripts and audio.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "wss://generativelanguage.googleapis.com"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors
    }
  },
  // Do not set X-Frame-Options: SAMEORIGIN; that would block SharePoint embedding.
  xFrameOptions: false
}));

app.use(express.json({ limit: "20kb" }));

// Small in-memory per-IP limit. For a large public deployment, use a shared
// rate limiter (for example Redis) and authenticate your visitors.
const tokenRequests = new Map();
function tokenRateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 10;
  const recent = (tokenRequests.get(key) || []).filter(t => now - t < windowMs);
  if (recent.length >= maxRequests) {
    return res.status(429).json({ error: "Too many connection attempts. Wait one minute and try again." });
  }
  recent.push(now);
  tokenRequests.set(key, recent);
  next();
}

app.get("/health", (_req, res) => res.json({ ok: true }));

// The permanent API key stays on the server. The browser receives only a
// short-lived, single-use token restricted to this Live API session.
app.post("/api/chat", tokenRateLimit, async (req, res) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-12) : [];
    const contents = messages
      .filter(m => m && (m.role === "user" || m.role === "model") && typeof m.text === "string")
      .map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 6000) }] }));

    if (!contents.length || contents[contents.length - 1].role !== "user") {
      return res.status(400).json({ error: "Send a user message first." });
    }

    const result = await textAi.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: "You are a friendly, helpful assistant. Give clear, accurate, conversational answers."
      }
    });

    res.set("Cache-Control", "no-store");
    res.json({ text: result.text || "I could not create a text response." });
  } catch (error) {
    console.error("Text generation failed:", error?.message || error);
    res.status(502).json({
      error: "Gemini text chat failed. Check the API key, text model availability, billing, and quota."
    });
  }
});

app.post("/api/live-token", tokenRateLimit, async (_req, res) => {
  try {
    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now.getTime() + 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {}
          }
        }
      }
    });

    if (!token?.name) {
      throw new Error("Google did not return an ephemeral token.");
    }

    res.set("Cache-Control", "no-store");
    res.json({
      token: token.name,
      model: LIVE_MODEL,
      expiresAt: expireTime
    });
  } catch (error) {
    console.error("Token creation failed:", error?.message || error);
    res.status(502).json({
      error: "Could not start Gemini Live. Check the API key, project access, model availability, and billing/quota."
    });
  }
});

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath, { maxAge: "1h", index: false }));
app.use((_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Gemini Voice Assistant listening on port ${PORT}`);
  console.log(`Live model: ${LIVE_MODEL}`);
  console.log(`SharePoint frame origin: ${SHAREPOINT_ORIGIN || "(not configured)"}`);
});
