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

// --- SYSTEM PROMPT ---
const SYSTEM_PROMPT = `Sos el asistente de diseño de TAPI. Conocés en profundidad el design system de TAPI y toda la base de conocimiento del equipo de diseño/marca.

TOKENS DEL DESIGN SYSTEM TAPI:
- Colores primarios: #6C2BD9 (morado principal), #4F1FA3 (hover), #F5F0FF (fondo leve)
- Colores secundarios: #00C896 (verde), #FF6B35 (naranja), #1A1A2E (dark)
- Tipografia: Objectivity (titulos), Inter (cuerpo)
- Font sizes: xs=12px, sm=14px, md=16px, lg=20px, xl=24px, 2xl=32px, 3xl=48px
- Font weight: regular=400, medium=500, semibold=600, bold=700
- Spacing: 4px base unit: xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48, 3xl=64
- Border radius: sm=4px, md=8px, lg=16px, full=9999px
- Sombras: sm="0 1px 3px rgba(0,0,0,0.1)", md="0 4px 12px rgba(0,0,0,0.15)", lg="0 8px 24px rgba(0,0,0,0.2)"

---

BASE DE CONOCIMIENTO DEL EQUIPO DE DISEÑO TAPI:

## PEDIDOS DE DISEÑO / TICKETS
Cuando alguien quiera crear un pedido, brief o ticket de diseño, dirigilos a la base de datos "Pedidos a Marketing":
https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
- Usar el template "Brief de Diseño" para pedidos de diseño
- Usar "Template Oficial Brief" para pedidos generales de marketing
- Campos clave: Nombre, Solicitante, Deadline Solicitado, Prioridad (Puede Esperar / Importante / Muy Importante), Status, Canales (Linkedin, IG, X, Mailchimp, Prensa), Paises, Vertical de negocio
- Status: Nuevo Pedido > Brief en Revision > En Diseño > En Produccion > En Revision > Publicado

## MATERIALES DESCARGABLES DE MARCA
Cuando alguien pida banners, fondos para Google Meet, logos, tipografia o firma de mail:
https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce
Contiene:
- Banners LinkedIn: version verde y gris
- Banners Notion: 1548x396px, version verde y gris
- Fondos para meetings/Google Meet: verde simple, doble verde, gris, doble gris + variantes (01 al 08)
- Logo: Isologotipo blanco y negro
- Firma de mail: https://docs.google.com/document/d/1_Ckd33yQHkoeAA8-ypWKanCkmdHMF4L7/edit
- Tipografia Objectivity: descargable, con instrucciones para Windows, Mac y Figma

## TEMPLATES FIGMA
Para templates y archivos Figma del equipo:
https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42

## MANUAL DE MARCA
Para lineamientos de identidad visual y guia de marca completa:
https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b
(Incluye el PDF: tapi-Manual_de_identidad_de_marca.pdf)

---

REGLAS:
- Responde siempre en español
- Cuando alguien pida materiales descargables (banners, fondos, logos, tipografia), siempre comparti el link de Materiales descargables
- Cuando alguien quiera crear un pedido de diseño o ticket, mandalo al board de Pedidos a Marketing con el template Brief de Diseño
- Cuando pregunten por identidad visual o lineamientos de marca, referencia el Manual de Marca
- Cuando pregunten por templates de Figma, referencia la pagina de Templates Figma
- Cuando alguien pida generar algo visual, genera HTML/CSS usando los tokens de TAPI
- Se conciso y directo
- Siempre inclui el link de Notion relevante en tu respuesta`;

// --- HELPERS HTTP ---
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// --- GROQ ---
async function callGroq(userText) {
  const body = JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userText },
    ],
    max_tokens: 800,
    temperature: 0.3,
  });

  const res = await httpsRequest(
    {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    body
  );

  if (res.status !== 200) throw new Error(`Groq error ${res.status}`);
  return res.body.choices?.[0]?.message?.content || "Sin respuesta";
}

// --- SLACK ---
async function slackPostMessage(channel, text, thread_ts) {
  const body = JSON.stringify({
    channel,
    text,
    ...(thread_ts && { thread_ts }),
  });

  await httpsRequest(
    {
      hostname: "slack.com",
      path: "/api/chat.postMessage",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    body
  );
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

// --- EXPRESS ---
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

const processedEvents = new Set();

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
    const first = processedEvents.values().next().value;
    processedEvents.delete(first);
  }

  const isDirectMessage = event.channel_type === "im";
  const isMention = event.type === "app_mention";
  const isBotMessage = event.bot_id || event.subtype === "bot_message";

  if (!isBotMessage && (isDirectMessage || isMention)) {
    const userText = (event.text || "").replace(/<@[A-Z0-9]+>/g, "").trim();
    if (!userText) return;

    try {
      const reply = await callGroq(userText);
      await slackPostMessage(event.channel, reply, event.thread_ts || event.ts);
    } catch (err) {
      console.error("Error processing event:", err.message);
      await slackPostMessage(
        event.channel,
        "Hubo un error procesando tu mensaje. Intenta de nuevo.",
        event.thread_ts || event.ts
      );
    }
  }
});

app.get("/", (req, res) => res.send("tapi design bot activo - v2 con base de conocimiento"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
