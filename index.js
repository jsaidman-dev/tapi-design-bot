process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const express = require("express");
const { createHmac } = require("crypto");
const https = require("https");

console.log("=== tapi-design bot starting ===");
console.log("PORT:", process.env.PORT);
console.log("GROQ_API_KEY present:", !!process.env.GROQ_API_KEY);
console.log("SLACK_BOT_TOKEN present:", !!process.env.SLACK_BOT_TOKEN);
console.log("SLACK_SIGNING_SECRET present:", !!process.env.SLACK_SIGNING_SECRET);

const app = express();

const SYSTEM_PROMPT = `Sos el asistente de diseno de tapi en Slack. Respondes en espanol, de forma concisa y directa.

SOBRE TAPI:
- Plataforma fintech de pagos (Argentina, Mexico, Colombia, Chile, Peru)
- Marca: nombre siempre en minusculas "tapi", nunca "TAPI" ni "Tapi"
- Tono: profesional pero cercano, sin formal ni vos/usted mezclados

COLORES PRINCIPALES:
- Verde principal: #00D68F / RGB(0,214,143)
- Verde oscuro: #00A86B
- Negro: #0A0A0A | Blanco: #FFFFFF
- Gris claro: #F5F5F5 | Gris medio: #9E9E9E

TIPOGRAFIA: Objectivity (titulos y UI), fallback: Inter, sans-serif

TAMANOS DE PIEZAS COMUNES:
- Post Instagram cuadrado: 1080x1080px
- Post Instagram historia: 1080x1920px
- Banner LinkedIn: 1200x628px
- Fondo Google Meet: 1920x1080px
- Firma email: 600x200px
- Banner interno Slack: 1500x500px

LO QUE PODES HACER:
1. Armar brief de diseno completo (formato, objetivo, copy, referencias)
2. Generar 2-3 variantes de copy con tono de tapi
3. Responder sobre tokens del design system (colores, tipografia, espaciados)
4. Indicar tamanos exactos de cualquier pieza
5. Analizar piezas graficas compartidas y dar feedback
6. Linkear a materiales descargables

LINKS UTILES:
- Board de pedidos: https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
- Materiales de marca: https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce
- Templates Figma: https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42
- Manual de marca: https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b

Siempre incluye el link de Notion mas relevante en tu respuesta. Si no sabes algo, decilo y sugeri contactar al equipo de diseno.`

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
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
        resolve({ data: buf.toString("base64"), mimeType: res.headers["content-type"] || "image/jpeg" });
      });
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("image download timeout")));
    req.end();
  });
}

function parseRetryTime(groqMessage) {
  // Groq includes "Please try again in Xm Ys" or "in Xs" in the message
  const match = groqMessage && groqMessage.match(/try again in ([\d]+m ?[\d]*s?|[\d.]+s)/i);
  return match ? match[1].trim() : null;
}

async function callGroq(userText, imageData) {
  const messages = [];

  if (imageData) {
    messages.push({
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${imageData.mimeType};base64,${imageData.data}` } },
        { type: "text", text: userText || "Analiza esta imagen y dame feedback de diseno segun el design system de tapi." }
      ]
    });
  } else {
    messages.push({ role: "user", content: userText });
  }

  const model = imageData ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

  const payload = JSON.stringify({
    model,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    max_tokens: 1200,
    temperature: 0.4,
  });

  const res = await httpsRequest({
    hostname: "api.groq.com",
    path: "/openai/v1/chat/completions",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  }, payload);

  if (res.status === 200) {
    return { ok: true, text: res.body.choices?.[0]?.message?.content || "Sin respuesta" };
  }

  // Parse error
  const errBody = res.body;
  const errCode = errBody?.error?.code || "";
  const errMsg = errBody?.error?.message || "";

  if (res.status === 429 || errCode === "rate_limit_exceeded") {
    const retryIn = parseRetryTime(errMsg);
    const retryText = retryIn ? ` Intenta de nuevo en *${retryIn}*.` : " Intenta de nuevo en unos minutos.";
    return { ok: false, userMsg: `⏳ Llegué al límite de consultas por ahora.${retryText}` };
  }

  if (res.status === 401 || errCode === "invalid_api_key") {
    return { ok: false, userMsg: "🔑 Error de autenticación con el servicio de IA. Contactá al equipo técnico." };
  }

  // Generic internal error — solo el código
  const code = errCode || res.status;
  return { ok: false, userMsg: `❌ Error interno [${code}]` };
}

async function slackPostMessage(channel, text, thread_ts) {
  const body = JSON.stringify({ channel, text, ...(thread_ts && { thread_ts }) });
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

app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }));

const processedEvents = new Set();

async function publishHomeTab(userId) {
  const body = JSON.stringify({
    user_id: userId,
    view: {
      type: "home",
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: "*Hola! Soy el asistente de diseno de tapi*\nEstoy aca para ayudarte con el design system, assets y marca. Escribime directo o mencioname con *@tapi-design*." } },
        { type: "divider" },
        { type: "section", text: { type: "mrkdwn", text: "*Que puedo hacer por vos?*" } },
        { type: "section", text: { type: "mrkdwn", text: "*Pedido de diseno* — Describime lo que necesitas y armo el brief.\n_Ej: \"Necesito un banner para LinkedIn\"_" } },
        { type: "section", text: { type: "mrkdwn", text: "*Copy y textos* — 2-3 variantes con el tono de voz de tapi.\n_Ej: \"Copy para un post de Instagram\"_" } },
        { type: "section", text: { type: "mrkdwn", text: "*Colores y tipografia* — Tokens HEX/RGB, tipografias, espaciados." } },
        { type: "section", text: { type: "mrkdwn", text: "*Tamanos de piezas* — Dimensiones exactas para cualquier formato." } },
        { type: "section", text: { type: "mrkdwn", text: "*Analisis de piezas* — Compartí una imagen y te doy feedback de marca." } },
        { type: "section", text: { type: "mrkdwn", text: "*Materiales descargables* — Banners, logos, tipografia Objectivity, fondos y firma de mail." } },
        { type: "divider" },
        { type: "section", text: { type: "mrkdwn", text: "*Links rapidos*\n- <https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab|Board de Pedidos>\n- <https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce|Materiales de marca>\n- <https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42|Templates Figma>\n- <https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b|Manual de marca>" } }
      ]
    }
  });
  await httpsRequest({
    hostname: "slack.com",
    path: "/api/views.publish",
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
}

app.post("/slack/events", async (req, res) => {
  const body = req.body;
  if (body.type === "url_verification") return res.json({ challenge: body.challenge });
  if (!verifySlackSignature(req)) return res.status(401).send("Unauthorized");
  res.status(200).send();

  const event = body.event;
  if (!event) return;

  const eventId = body.event_id || `${event.type}-${event.ts}`;
  if (processedEvents.has(eventId)) return;
  processedEvents.add(eventId);
  if (processedEvents.size > 500) processedEvents.delete(processedEvents.values().next().value);

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
        try { imageData = await downloadSlackImage(file.url_private); }
        catch (err) { console.error("Image download error:", err.message); }
      }
    }

    if (!userText && !imageData) return;
    const textToSend = userText || "Analiza esta imagen y dame feedback de diseno segun el design system de tapi.";

    try {
      const result = await callGroq(textToSend, imageData);
      await slackPostMessage(event.channel, result.text || result.userMsg);
    } catch (err) {
      console.error("Unexpected error:", err.message);
      await slackPostMessage(event.channel, `❌ Error interno [unexpected]`);
    }
  }
});

app.get("/", (req, res) => res.send("tapi design bot v10 — Groq Llama-4 Scout vision + smart error handling"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
