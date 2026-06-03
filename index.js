process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const express = require("express");
const { createHmac } = require("crypto");
const https = require("https");

console.log("=== tapi-design bot v13 starting ===");
console.log("PORT:", process.env.PORT);
console.log("GROQ_API_KEY present:", !!process.env.GROQ_API_KEY);
console.log("SLACK_BOT_TOKEN present:", !!process.env.SLACK_BOT_TOKEN);
console.log("SLACK_SIGNING_SECRET present:", !!process.env.SLACK_SIGNING_SECRET);

const app = express();

// ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos el asistente de diseño de tapi en Slack. Respondé siempre en español, conciso y directo. Incluí siempre el link de Notion relevante.

MARCA: tapi (siempre minúsculas). Tagline: "Integrando Latinoamérica". B2B API-first, AR/CL/CO/MX/PE. Tono: directo, profesional, cercano, castellano neutro o rioplatense.
LOGOS: Black (fondos claros): https://tapi.la/wp-content/uploads/2025/06/logo_black.svg | Light (fondos oscuros/verdes): https://tapi.la/wp-content/uploads/2024/07/Logo-nuevo.svg. Mínimo 32px alto. No distorsionar ni recolorear.

COLORES PRIMARIOS:
verde-tapi #09D334 | verde-oscuro #01431D | verde-claro #00EE9F | blanco #FFFFFF | negro #000000 | gris #E5E5E5

RAMPAS:
Verde tapi: 50:#E8FAF0 100:#C2F2D5 200:#8DE8B0 300:#4ED882 400:#1DC858 500:#09D334 600:#07A828 700:#047D1C 800:#01431D 900:#012A12
Verde claro: 50:#F0FFF8 100:#D0FAE8 200:#9FF4CF 300:#5FEDB3 400:#2AE99C 500:#00EE9F 600:#00C483 700:#009A67 800:#006F4B 900:#004530
Gris: 50:#F9F9F9 100:#F2F2F2 200:#E5E5E5 300:#D0D0D0 400:#AAAAAA 500:#888888 600:#666666 700:#444444 800:#222222 900:#111111

TOKENS: bg/primary:#FFFFFF bg/secondary:#F9F9F9 bg/dark:#01431D | border/default:#E5E5E5 border/strong:#D0D0D0 border/accent:#09D334 border/accent-soft:rgba(9,211,52,.25) | text/primary:#000000 text/secondary:#666666 text/tertiary:#AAAAAA text/disabled:#CCCCCC text/inverse:#FFFFFF | state: success:#09D334 warning:#F59E0B error:#EF4444 info:#3B82F6 | state-light: success:#E8FAF0 warning:#FEF3C7 error:#FEE2E2 info:#DBEAFE

TIPOGRAFÍA: Objectivity (Única fuente tapi, no Inter ni Poppins). Fallback: -apple-system,Arial,sans-serif.
Pesos: 100 Thin | 300 Light | 400 Regular | 500 Medium | 700 Bold | 900 Black
Escala: Display:72px/Black/lh110%/ls-3px | H1:56px/Bold/lh115%/ls-2px | H2:40px/Bold/lh120%/ls-1px | H3:32px/Bold/lh125%/ls-.5px | H4:28px/Medium/lh130% | H5:24px/Medium/lh135% | H6:20px/Medium/lh140% | BodyXL:18px/Regular/lh170% | BodyLG:16px/Regular/lh165% | BodyMD:14px/Regular/lh165% | BodySM:12px/Regular/lh160% | LabelLG:14px/Medium/ls.3px | Overline:11px/Medium/ls2px/MAYÚsCULAS

ESPACIADO (base 8px, solo múltiplos): 8 16 24 32 40 48 64 80 96 128 160px. Nunca 10,14,18,22px.
RADIOS: none:0 xs:4 sm:8 md:12 lg:16 xl:24 2xl:32 full:999px
BORDES: card/blanco:1px solid #E5E5E5 | card/gris:1px solid #D0D0D0 | card/brand:1.5px solid rgba(9,211,52,.35) | card/dark:1px solid rgba(255,255,255,.10) | input:1.5px solid #D0D0D0 | input/focus:2px solid #09D334 | divider:1px solid #E5E5E5 | accent-line:4px solid #09D334
SOMBRAS (siempre multicapa): xs:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04) | sm:0 2px 6px rgba(0,0,0,.08),0 1px 3px rgba(0,0,0,.05) | md:0 4px 12px rgba(0,0,0,.10),0 2px 4px rgba(0,0,0,.06) | lg:0 8px 24px rgba(0,0,0,.12),0 4px 8px rgba(0,0,0,.07) | xl:0 16px 40px rgba(0,0,0,.14),0 6px 12px rgba(0,0,0,.08) | verde-sm:0 2px 8px rgba(9,211,52,.25),0 1px 3px rgba(9,211,52,.15) | verde-md:0 4px 16px rgba(9,211,52,.30),0 2px 6px rgba(9,211,52,.18) | verde-lg:0 8px 32px rgba(9,211,52,.35),0 4px 12px rgba(9,211,52,.20)

COMPONENTES: btn-primary:bg#09D334 text#01431D Medium 13.5px h48px r8px | btn-secondary:bg#FFF border1.5px#09D334 text#09D334 h48px | badge-verde:bg#E8FAF0 text#01431D border1px rgba(9,211,52,.30) r999px | card:bg#FFF border1px#E5E5E5 r12px shadow/sm p24px | card-dark:bg#01431D text#FFF border rgba(255,255,255,.10) r12px | navbar:bg#01431D(dark)/#FFF(light) h64px | email-wrapper:border1px#E5E5E5 r16px shadow0 4px 24px rgba(0,0,0,.09) | email-header:bg#01431D logo-light-centrado accent-bar4px#09D334-arriba

TAMAÑOS DE PIEZAS:
Social: LinkedIn post:1200×627 | LinkedIn banner:1584×396 | IG cuadrado:1080×1080 | IG horizontal:1080×566 | IG Stories:1080×1920 | Twitter post:1200×675 | Twitter banner:1500×500
Interno: Notion banner:1548×396 | Notion ícono:280×280 | Meet/Zoom bg:1920×1080 | Firma mail:600px ancho máx
Email: template:600px | header:600×200 | banner:600×300
Slides: 16:9→1920×1080 | 4:3→1024×768
Impresión 300dpi: A4v:2480×3508 | A4h:3508×2480 | A3:3508×4960

PEDIDOS DE DISEÑO: https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
SLA: Puede Esperar:5-7d | Importante:2-3d | Muy Importante:24-48h | Urgente:hablar directo con equipo

MATERIALES: https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce
(banners LinkedIn/Notion, fondos Meet, logos, firma mail, Objectivity)
TEMPLATES FIGMA: https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42
MANUAL DE MARCA: https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b

BRIEF: Si alguien describe un pedido, generá este formato listo para Notion:
---
📋 BRIEF — [NOMBRE]
Nombre: | Solicitante: | Deadline: | Prioridad: | Canales: | Países: | Vertical:
Descripción: | Entregables: | Referencias: [COMPLETAR]
👉 https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
---
COPY: Si piden texto, generá 2-3 variantes con tono tapi, indicando canal y largo en caracteres.
REGLAS: Español siempre. Máx 3-4 párrafos. Dá HEX+RGB para colores. Dá px para tamaños. Incluí link Notion relevante.`;

// ─── HELPERS HTTP ─────────────────────────────────────────────────────────────────────────────────
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on("error", reject);
    req.setTimeout(25000, () => { req.destroy(new Error("timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

// ─── DOWNLOAD SLACK IMAGE ─────────────────────────────────────────────────────────────────────
async function downloadSlackImage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        const mimeType = res.headers["content-type"] || "image/jpeg";
        resolve({ base64: buf.toString("base64"), mimeType });
      });
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("image download timeout")));
    req.end();
  });
}

// ─── PARSE RETRY TIME ─────────────────────────────────────────────────────────────────────────────────
function parseRetryTime(msg) {
  const match = msg && msg.match(/try again in ([\d]+m ?[\d]*s?|[\d.]+s)/i);
  return match ? match[1].trim() : null;
}

// ─── CALL GROQ ────────────────────────────────────────────────────────────────────────────────────
async function callGroq(userText, imageData) {
  const makePayload = (withImage) => {
    if (withImage && imageData) {
      return JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` }
              },
              {
                type: "text",
                text: userText || "Analiza esta imagen y dame feedback de diseño según el design system de tapi."
              }
            ]
          }
        ],
        max_tokens: 1200,
        temperature: 0.4,
      });
    } else {
      const text = imageData
        ? `[El usuario compartió una imagen pero no puedo procesarla en este momento. Respondé al texto si hay alguno, o indicá que podés ayudar con preguntas de diseño.]\n\n${userText || ""}`
        : userText;
      return JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ],
        max_tokens: 1200,
        temperature: 0.4,
      });
    }
  };

  const groqCall = async (payload) => {
    return httpsRequest({
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, payload);
  };

  const payload1 = makePayload(!!imageData);
  const res1 = await groqCall(payload1);

  if (res1.status === 200) {
    return { ok: true, text: res1.body.choices?.[0]?.message?.content || "Sin respuesta" };
  }

  if (imageData && res1.status !== 200) {
    console.warn(`Vision model failed [${res1.status}], falling back to text. Error: ${JSON.stringify(res1.body).slice(0, 300)}`);
    const payload2 = makePayload(false);
    const res2 = await groqCall(payload2);
    if (res2.status === 200) {
      return { ok: true, text: res2.body.choices?.[0]?.message?.content || "Sin respuesta" };
    }
    return handleGroqError(res2);
  }

  return handleGroqError(res1);
}

function handleGroqError(res) {
  const errBody = res.body;
  const errCode = errBody?.error?.code || "";
  const errMsg = errBody?.error?.message || "";

  console.error(`Groq error [${res.status}] code=${errCode}:`, JSON.stringify(errBody).slice(0, 400));

  if (res.status === 429 || errCode === "rate_limit_exceeded") {
    const retryIn = parseRetryTime(errMsg)
      || parseRetryTime(res.headers?.["retry-after"] || "")
      || parseRetryTime(res.headers?.["x-ratelimit-reset-tokens"] || "")
      || parseRetryTime(res.headers?.["x-ratelimit-reset-requests"] || "");
    const retryText = retryIn ? ` Intenta de nuevo en *${retryIn}*.` : " Intenta de nuevo en *1 minuto*.";
    return { ok: false, userMsg: `⏳ Llegé al límite de consultas por ahora.${retryText}` };
  }

  if (res.status === 401 || errCode === "invalid_api_key") {
    return { ok: false, userMsg: "🔑 Error de autenticación con el servicio de IA. Contactá al equipo técnico." };
  }

  const code = errCode || res.status;
  return { ok: false, userMsg: `❌ Error interno [${code}]` };
}

// ─── SLACK ────────────────────────────────────────────────────────────────────────────────────────────
async function slackPostMessage(channel, text, thread_ts) {
  const body = JSON.stringify({
    channel,
    text,
    ...(thread_ts && { thread_ts }),
  });
  await httpsRequest({
    hostname: "slack.com",
    path: "/api/chat.postMessage",
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
}

function verifySlackSignature(req) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = req.headers["x-slack-request-timestamp"];
  const slackSig = req.headers["x-slack-signature"];
  if (!timestamp || !slackSig) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const base = `v0:${timestamp}:${req.rawBody}`;
  const computed = "v0=" + createHmac("sha256", signingSecret).update(base).digest("hex");
  return computed === slackSig;
}

// ─── EXPRESS ────────────────────────────────────────────────────────────────────────────────────────────
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));

const processedEvents = new Set();

// ─── APP HOME TAB ──────────────────────────────────────────────────────────────────────────────────
async function publishHomeTab(userId) {
  const view = {
    type: "home",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Hola! Soy el asistente de diseño de tapi 👋", emoji: true }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Estoy acá para ayudarte con todo lo relacionado al diseño y la marca de tapi. Escribime directamente en el chat o mencioname con *@tapi-design*."
        }
      },
      { type: "divider" },
      { type: "section", text: { type: "mrkdwn", text: "*🎨 ¿Qué puedo hacer por vos?*" } },
      { type: "section", text: { type: "mrkdwn", text: "*📋 Crear un pedido de diseño*\nDescribime lo que necesitás y armo el brief completo listo para pegar en Notion.\n_Ej: \"Necesito un banner para LinkedIn sobre el lanzamiento en México\"_" } },
      { type: "section", text: { type: "mrkdwn", text: "*✍️ Generar copy*\nPedime texto para cualquier pieza y te doy 2-3 variantes con el tono de voz de tapi.\n_Ej: \"Copy para un post de Instagram anunciando débito automático\"_" } },
      { type: "section", text: { type: "mrkdwn", text: "*🎨 Colores y tipografía*\nConsultame cualquier token del design system: colores HEX/RGB, tipografías, espaciados.\n_Ej: \"¿Cuál es el verde principal de tapi?\"_" } },
      { type: "section", text: { type: "mrkdwn", text: "*📐 Tamaños de piezas*\nDimensiones exactas para cualquier formato.\n_Ej: \"¿Qué tamaño tiene un post de Instagram?\"_" } },
      { type: "section", text: { type: "mrkdwn", text: "*🖼️ Análisis de piezas*\nCompartí una imagen y te doy feedback de diseño según el brand system de tapi." } },
      { type: "section", text: { type: "mrkdwn", text: "*📥 Materiales descargables*\nBanners, logos, tipografía Objectivity, fondos para Meet, firma de mail." } },
      { type: "divider" },
      { type: "section", text: { type: "mrkdwn", text: "*🔗 Links rápidos*\n• <https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab|📋 Board de Pedidos a Marketing>\n• <https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce|📥 Materiales de marca>\n• <https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42|🎨 Templates Figma>\n• <https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b|📔 Manual de marca>" } },
      { type: "divider" },
      { type: "context", elements: [{ type: "mrkdwn", text: "Escribime en el chat de mensajes directo 💬" }] }
    ]
  };

  const body = JSON.stringify({ user_id: userId, view });
  const result = await httpsRequest({
    hostname: "slack.com",
    path: "/api/views.publish",
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
  console.log("publishHomeTab result:", result.status, JSON.stringify(result.body).slice(0, 200));
}

// ─── EVENTS ─────────────────────────────────────────────────────────────────────────────────────────────
app.post("/slack/events", async (req, res) => {
  const body = req.body;

  if (body.type === "url_verification") {
    return res.json({ challenge: body.challenge });
  }

  if (!verifySlackSignature(req)) {
    return res.status(401).send("Unauthorized");
  }

  res.status(200).send();

  const event = body.event;
  if (!event) return;

  const eventId = body.event_id || `${event.type}-${event.ts}`;
  if (processedEvents.has(eventId)) return;
  processedEvents.add(eventId);
  if (processedEvents.size > 500) {
    processedEvents.delete(processedEvents.values().next().value);
  }

  if (event.type === "app_home_opened" && event.tab === "home") {
    try { await publishHomeTab(event.user); } catch (err) { console.error("Home tab error:", err.message); }
    return;
  }

  const isDirectMessage = event.channel_type === "im";
  const isMention = event.type === "app_mention";
  const isBotMessage = event.bot_id || event.subtype === "bot_message";

  if (!isBotMessage && (isDirectMessage || isMention)) {
    const userText = (event.text || "").replace(/<@[A-Z0-9]+>/g, "").trim();

    let imageData = null;
    if (event.files && event.files.length > 0) {
      const file = event.files[0];
      if (file.mimetype && file.mimetype.startsWith("image/") && file.url_private) {
        try {
          imageData = await downloadSlackImage(file.url_private);
          console.log(`Image downloaded: ${file.mimetype}, ${Math.round(imageData.base64.length * 0.75 / 1024)}KB`);
        } catch (err) {
          console.error("Image download error:", err.message);
        }
      }
    }

    if (!userText && !imageData) return;

    try {
      const result = await callGroq(userText, imageData);
      const reply = result.ok ? result.text : result.userMsg;
      await slackPostMessage(event.channel, reply, null);
    } catch (err) {
      console.error("Unexpected error:", err.message, err.stack);
      await slackPostMessage(event.channel, "❌ Error interno [unexpected]", null);
    }
  }
});

app.get("/", (req, res) => res.send("tapi design bot v13 — vision via llama-3.2-90b base64 + text fallback"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
