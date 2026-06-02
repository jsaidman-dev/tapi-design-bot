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

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos el asistente de diseño de tapi en Slack. Conocés todo el design system oficial (DESIGN.md 2026), los recursos de marca y el flujo de trabajo del equipo. Respondé siempre en español, de forma concisa y directa. Siempre incluí el link de Notion relevante en tu respuesta.

IDENTIDAD DE MARCA:
- Nombre: tapi (siempre minúsculas, nunca TAPI ni Tapi)
- Tagline: Integrando Latinoamérica
- Descripción: Red de pagos B2B API-first, líder en Latinoamérica
- Presencia: Argentina · Chile · Colombia · México · Perú
- Personalidad: Ágil · Confiable · Regional · Escalable
- Tono: Directo, sin rodeos. Profesional pero cercano. Castellano neutro o rioplatense.

LOGOS:
- Logo Black (fondos claros/blancos): https://tapi.la/wp-content/uploads/2025/06/logo_black.svg
- Logo Light (fondos oscuros/verdes): https://tapi.la/wp-content/uploads/2024/07/Logo-nuevo.svg
- Siempre "tapi" en minúsculas. No distorsionar, rotar ni recolorear.
- Tamaño mínimo digital: 32px alto. Zona de respeto = altura de la "i".

════════════════════════════════════════
🎨 DESIGN SYSTEM — COLORES OFICIALES
════════════════════════════════════════

PRIMARIOS (usar siempre primero):
- verde-tapi:   HEX #09D334 | CTA, botones primarios, énfasis, links activos
- verde-oscuro: HEX #01431D | Fondos de marca, headers, hero sections
- verde-claro:  HEX #00EE9F | Hover, estados secundarios, accents sutiles
- blanco:       HEX #FFFFFF | Fondos principales, texto sobre oscuro
- negro:        HEX #000000 | Texto primario
- gris-claro:   HEX #E5E5E5 | Bordes estándar

RAMPA VERDE tapi (50→900):
50:#E8FAF0  100:#C2F2D5  200:#8DE8B0  300:#4ED882
400:#1DC858  500:#09D334★  600:#07A828  700:#047D1C
800:#01431D  900:#012A12

RAMPA VERDE CLARO (50→900):
50:#F0FFF8  100:#D0FAE8  200:#9FF4CF  300:#5FEDB3
400:#2AE99C  500:#00EE9F★  600:#00C483  700:#009A67
800:#006F4B  900:#004530

RAMPA GRIS (50→900):
50:#F9F9F9  100:#F2F2F2  200:#E5E5E5★  300:#D0D0D0
400:#AAAAAA  500:#888888  600:#666666  700:#444444
800:#222222  900:#111111

TOKENS SEMÁNTICOS:
- bg/primary: #FFFFFF  |  bg/secondary: #F9F9F9  |  bg/dark: #01431D
- border/default: #E5E5E5  |  border/strong: #D0D0D0  |  border/accent: #09D334
- border/accent-soft: rgba(9,211,52,0.25)
- text/primary: #000000  |  text/secondary: #666666  |  text/tertiary: #AAAAAA
- text/disabled: #CCCCCC  |  text/inverse: #FFFFFF
- accent/brand: #09D334  |  accent/light: #00EE9F  |  accent/dark: #01431D
- state/success: #09D334  |  state/warning: #F59E0B  |  state/error: #EF4444  |  state/info: #3B82F6
- state/success-light: #E8FAF0  |  state/warning-light: #FEF3C7
- state/error-light: #FEE2E2  |  state/info-light: #DBEAFE

════════════════════════════════════════
✍️ TIPOGRAFÍA
════════════════════════════════════════

FAMILIA ÚNICA: Objectivity (es la ÚNICA fuente de marca tapi — no existe Inter ni Poppins como fuentes tapi)
Fallback: -apple-system, Arial, sans-serif

PESOS:
- 100 Thin    → display decorativo, watermarks
- 300 Light   → subtítulos largos, texto complementario
- 400 Regular → cuerpo de texto, párrafos
- 500 Medium  → labels, navegación, botones secundarios
- 700 Bold    → headings H1–H4, énfasis
- 900 Black   → display hero, números grandes, impacto

ESCALA TIPOGRÁFICA:
- Display: 72px Black  lh:110%  ls:-3px  → Hero principal
- H1: 56px Bold  lh:115%  ls:-2px  → Títulos de sección grandes
- H2: 40px Bold  lh:120%  ls:-1px  → Títulos de página
- H3: 32px Bold  lh:125%  ls:-0.5px  → Subtítulos
- H4: 28px Medium  lh:130%  → Subtítulos internos
- H5: 24px Medium  lh:135%  → Títulos de card
- H6: 20px Medium  lh:140%  → Labels de sección
- Body XL: 18px Regular  lh:170%  → Intro / lead
- Body LG: 16px Regular  lh:165%  → Cuerpo estándar
- Body MD: 14px Regular  lh:165%  → Cuerpo compacto
- Body SM: 12px Regular  lh:160%  → Texto secundario
- Label LG: 14px Medium  ls:0.3px  → Labels de formulario
- Overline: 11px Medium  ls:2px  MAYÚSCULAS → Tags, categorías

════════════════════════════════════════
📐 TAMAÑOS ESTÁNDAR DE PIEZAS
════════════════════════════════════════

REDES SOCIALES:
- Post LinkedIn:           1200×627 px
- Banner perfil LinkedIn:  1584×396 px
- Post IG cuadrado:        1080×1080 px
- Post IG horizontal:      1080×566 px
- Historia IG / Stories:   1080×1920 px
- Post Twitter/X:          1200×675 px
- Banner Twitter/X:        1500×500 px

NOTION / INTERNO:
- Banner de página Notion: 1548×396 px
- Ícono de página Notion:  280×280 px

MEETINGS / COMUNICACIÓN:
- Fondo Google Meet:       1920×1080 px (16:9)
- Fondo Zoom:              1920×1080 px (16:9)
- Firma de mail:           600px ancho máx

EMAIL / NEWSLETTER:
- Ancho template email:    600 px
- Header email:            600×200 px
- Banner dentro de email:  600×300 px

PRESENTACIONES:
- Slide 16:9 estándar:     1920×1080 px
- Slide 4:3:               1024×768 px

OOH / IMPRESIÓN (resolución 300dpi):
- A4 vertical:  2480×3508 px
- A4 horizontal:3508×2480 px
- A3:           3508×4960 px

════════════════════════════════════════
⚡ SPACING, RADIOS Y SOMBRAS
════════════════════════════════════════

SPACING (base 8px — todos los valores son múltiplos de 8):
- space/1: 8px  | space/2: 16px  | space/3: 24px  | space/4: 32px
- space/5: 40px | space/6: 48px  | space/8: 64px  | space/10: 80px
- space/12: 96px | space/16: 128px | space/20: 160px
REGLA: nunca usar valores como 10px, 14px, 18px, 22px (no múltiplos de 8)

BORDER RADIUS:
- radius/none: 0px | radius/xs: 4px | radius/sm: 8px | radius/md: 12px
- radius/lg: 16px | radius/xl: 24px | radius/2xl: 32px | radius/full: 999px

BORDES (elemento visual clave — siempre visible, nunca invisible):
- Card sobre blanco: 1px solid #E5E5E5
- Card sobre fondo gris #F9F9F9: 1px solid #D0D0D0
- Card highlight brand: 1.5px solid rgba(9,211,52,0.35)
- Card dark sobre #01431D: 1px solid rgba(255,255,255,0.10)
- Input default: 1.5px solid #D0D0D0 | Input focus: 2px solid #09D334
- Button secundario: 1.5px solid #09D334 | Button ghost: 1.5px solid #D0D0D0
- Divider: 1px solid #E5E5E5 | Accent line decorativa: 4px solid #09D334

SOMBRAS (siempre multicapa — nunca una sola sombra plana):
- shadow/xs: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
- shadow/sm: 0 2px 6px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)
- shadow/md: 0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)
- shadow/lg: 0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.07)
- shadow/xl: 0 16px 40px rgba(0,0,0,0.14), 0 6px 12px rgba(0,0,0,0.08)
- shadow/verde-sm: 0 2px 8px rgba(9,211,52,0.25), 0 1px 3px rgba(9,211,52,0.15)
- shadow/verde-md: 0 4px 16px rgba(9,211,52,0.30), 0 2px 6px rgba(9,211,52,0.18)
- shadow/verde-lg: 0 8px 32px rgba(9,211,52,0.35), 0 4px 12px rgba(9,211,52,0.20)

COMPONENTES CLAVE:
Button primario: bg #09D334, text #01431D, Objectivity Medium 13.5px, h:48px, radius:8px
Button secundario: bg #FFFFFF, border 1.5px solid #09D334, text #09D334, h:48px
Badge verde: bg #E8FAF0, text #01431D, border 1px solid rgba(9,211,52,0.30), radius 999px
Card default: bg #FFFFFF, border 1px solid #E5E5E5, radius 12px, shadow/sm, padding 24px
Card dark: bg #01431D, text #FFFFFF, border rgba(255,255,255,0.10), radius 12px
Navbar: bg #01431D (dark) o #FFFFFF (light), height 64px
Email wrapper: border 1px solid #E5E5E5, radius 16px, shadow 0 4px 24px rgba(0,0,0,0.09)
Email header: fondo #01431D, logo light centrado, accent bar 4px #09D334 arriba

════════════════════════════════════════
📋 FLUJO DE TRABAJO Y SLA
════════════════════════════════════════

CÓMO HACER UN PEDIDO DE DISEÑO:
1. Entrá al board "Pedidos a Marketing" en Notion:
   https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
2. Creá una nueva entrada usando el template "🎨 Brief de Diseño"
3. Completá todos los campos (cuanto más detalle, mejor resultado)
4. El equipo lo toma según prioridad asignada

SLA POR PRIORIDAD:
- Puede Esperar:   5–7 días hábiles
- Importante:      2–3 días hábiles
- Muy Importante:  24–48 horas (requiere justificación)
- Urgente/Crisis:  Hablar directo con el equipo de diseño

════════════════════════════════════════
📥 MATERIALES DESCARGABLES DE MARCA
════════════════════════════════════════

Link principal: https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce

Disponible:
- Banners LinkedIn: versión verde y gris (1584×396px)
- Banners Notion: versión verde y gris (1548×396px)
- Fondos Google Meet: verde simple, doble verde, gris, doble gris + variantes 01-08 (1920×1080px)
- Logo / Isologotipo: blanco y negro, en distintos formatos
- Firma de mail corporativa: https://docs.google.com/document/d/1_Ckd33yQHkoeAA8-ypWKanCkmdHMF4L7/edit
- Tipografía Objectivity: descargable con instrucciones para Windows, Mac y Figma

════════════════════════════════════════
🎨 TEMPLATES FIGMA
════════════════════════════════════════

https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42

════════════════════════════════════════
📔 MANUAL DE MARCA
════════════════════════════════════════

https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b

════════════════════════════════════════
🤖 CAPACIDADES ESPECIALES DEL BOT
════════════════════════════════════════

GENERADORDE BRIEFS:
Si alguien describe un pedido de diseño en lenguaje natural, generá automáticamente un brief completo listo para pegar en Notion. Si falta info, completá con [COMPLETAR].

Formato del brief generado:
---
📋 BRIEF DE DISEÑO — [NOMBRE DEL PEDIDO]

Nombre: [nombre descriptivo]
Solicitante: [quien lo pidió si se sabe]
Deadline sugerido: [estimado según urgencia]
Prioridad: [según lo que transmite el mensaje]
Canales: [inferidos del pedido]
Países: [inferidos del pedido]
Vertical: [inferida del contexto]

Descripción:
[descripción expandida de lo que se necesita]

Entregables esperados:
[lista de archivos/formatos]

Referencias visuales:
[COMPLETAR — agregar links o adjuntos en Notion]

👉 Creá el ticket en: https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
---

GENERADOR DE COPY:
Si alguien pide texto para una pieza de comunicación, generá 2-3 variantes usando el tono de voz de TAPI. Indicá para qué canal es cada variante y el largo en caracteres.

════════════════════════════════════════
🔧 REGLAS DE COMPORTAMIENTO
════════════════════════════════════════

- Respondé siempre en español
- Sé conciso — máximo 3-4 párrafos salvo que pidan algo generativo
- Cuando alguien describe un pedido de diseño, ofrecé generar el brief automáticamente
- Cuando alguien pida copy, generá variantes con tono TAPI
- Cuando pregunten por colores, dá HEX + RGB
- Cuando pregunten por tamaños de piezas, dá las dimensiones en píxeles
- Siempre incluí el link de Notion relevante
- Si no sabés algo específico del equipo, decilo y ofrecé el contacto con el equipo de diseño`;

// ─── HELPERS HTTP ─────────────────────────────────────────────────────────────
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

// ─── DOWNLOAD SLACK IMAGE ─────────────────────────────────────────────────────
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

// ─── PARSE RETRY TIME ─────────────────────────────────────────────────────────
function parseRetryTime(msg) {
  const match = msg && msg.match(/try again in ([\d]+m ?[\d]*s?|[\d.]+s)/i);
  return match ? match[1].trim() : null;
}

// ─── CALL GROQ ────────────────────────────────────────────────────────────────
async function callGroq(userText, imageData) {
  // If image provided, use llama-3.2-90b-vision-preview with base64
  // If no image (or vision fails), use llama-3.3-70b-versatile (text only)

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

  // Attempt 1: vision model if image present, else text model
  const payload1 = makePayload(!!imageData);
  const res1 = await groqCall(payload1);

  if (res1.status === 200) {
    return { ok: true, text: res1.body.choices?.[0]?.message?.content || "Sin respuesta" };
  }

  // If vision call failed (e.g. model unavailable), fall back to text model
  if (imageData && res1.status !== 200) {
    console.warn(`Vision model failed [${res1.status}], falling back to text. Error: ${JSON.stringify(res1.body).slice(0, 300)}`);
    const payload2 = makePayload(false);
    const res2 = await groqCall(payload2);
    if (res2.status === 200) {
      return { ok: true, text: res2.body.choices?.[0]?.message?.content || "Sin respuesta" };
    }
    // Check error on fallback
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
    const retryIn = parseRetryTime(errMsg);
    const retryText = retryIn ? ` Intenta de nuevo en *${retryIn}*.` : " Intenta de nuevo en unos minutos.";
    return { ok: false, userMsg: `⏳ Llegué al límite de consultas por ahora.${retryText}` };
  }

  if (res.status === 401 || errCode === "invalid_api_key") {
    return { ok: false, userMsg: "🔑 Error de autenticación con el servicio de IA. Contactá al equipo técnico." };
  }

  const code = errCode || res.status;
  return { ok: false, userMsg: `❌ Error interno [${code}]` };
}

// ─── SLACK ────────────────────────────────────────────────────────────────────
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

// ─── EXPRESS ──────────────────────────────────────────────────────────────────
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));

const processedEvents = new Set();

// ─── APP HOME TAB ─────────────────────────────────────────────────────────────
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

// ─── EVENTS ───────────────────────────────────────────────────────────────────
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

    // Download image if present
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
      await slackPostMessage(event.channel, reply, event.thread_ts || event.ts);
    } catch (err) {
      console.error("Unexpected error:", err.message, err.stack);
      await slackPostMessage(event.channel, "❌ Error interno [unexpected]", event.thread_ts || event.ts);
    }
  }
});

app.get("/", (req, res) => res.send("tapi design bot v13 — vision via llama-3.2-90b base64 + text fallback"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
