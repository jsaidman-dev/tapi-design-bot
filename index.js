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

const SYSTEM_PROMPT = `Sos el asistente de diseno de TAPI en Slack. Coneces todo el design system, los recursos de marca y el flujo de trabajo del equipo. Responde siempre en espanol, de forma concisa y directa. Siempre inclui el link de Notion relevante en tu respuesta.

COLORES:
Morado principal:  HEX #6C2BD9 | RGB 108,43,217  | HSL 262 70% 51%
Morado hover:      HEX #4F1FA3 | RGB 79,31,163   | HSL 262 68% 38%
Fondo leve:        HEX #F5F0FF | RGB 245,240,255 | HSL 262 100% 97%
Verde:   HEX #00C896 | RGB 0,200,150   | HSL 162 100% 39%
Naranja: HEX #FF6B35 | RGB 255,107,53  | HSL 18 100% 60%
Dark:    HEX #1A1A2E | RGB 26,26,46    | HSL 240 28% 14%
Gris claro: #F8F8FA | Gris medio: #E2E2E8 | Gris texto: #6B6B80 | Negro texto: #0D0D1A

TIPOGRAFIA:
Familias: Objectivity (titulos, headings) | Inter (cuerpo, UI)
Tamanios: xs=12px sm=14px md=16px lg=20px xl=24px 2xl=32px 3xl=48px
Pesos: Regular=400 Medium=500 Semibold=600 Bold=700
Por pieza:
  Banner LinkedIn: Objectivity Bold 32-48px / Inter Medium 16-20px
  Post IG cuadrado: Objectivity Bold 24-32px / Inter Regular 14px
  Historia IG: Objectivity Bold 32px, poco texto
  Email/newsletter: Objectivity Semibold 24px header / Inter Regular 16px cuerpo
  Presentacion: Objectivity Bold 36-48px / Inter Regular 18px
  Banner web: Objectivity Bold 40-56px / CTA Inter Semibold 16px
  Fondo Meet: solo logo/isotipo, sin texto o minimo

TAMANIOS ESTANDAR DE PIEZAS:
Post LinkedIn: 1200x627px
Banner perfil LinkedIn: 1584x396px
Post IG cuadrado: 1080x1080px
Post IG horizontal: 1080x566px
Historia IG / Stories: 1080x1920px
Post Twitter/X: 1200x675px
Banner Twitter/X: 1500x500px
Banner Notion: 1548x396px
Icono Notion: 280x280px
Fondo Google Meet / Zoom: 1920x1080px (16:9)
Firma de mail: 600px ancho max
Template email: 600px ancho | Header email: 600x200px | Banner en email: 600x300px
Slide 16:9: 1920x1080px | Slide 4:3: 1024x768px
A4 vertical (300dpi): 2480x3508px | A4 horizontal: 3508x2480px | A3: 3508x4960px

SPACING (base 4px): xs=4 sm=8 md=16 lg=24 xl=32 2xl=48 3xl=64
BORDER RADIUS: sm=4px md=8px lg=16px full=9999px
SOMBRAS: sm "0 1px 3px rgba(0,0,0,0.10)" | md "0 4px 12px rgba(0,0,0,0.15)" | lg "0 8px 24px rgba(0,0,0,0.20)"

---

FLUJO DE TRABAJO Y SLA:

Como hacer un pedido de diseno:
1. Ir al board "Pedidos a Marketing": https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
2. Crear entrada con template "Brief de Diseno"
3. Completar todos los campos

Campos del brief: Nombre, Solicitante, Deadline, Prioridad, Canales (LinkedIn/IG/X/Mailchimp/Prensa/Meet/Interno), Paises (AR/MX/CL/CO/PE), Vertical (Pagos/Agenda/Recargas/Brand/etc), Descripcion del pedido, Entregables esperados, Referencias visuales.

SLA por prioridad:
- Puede Esperar: 5-7 dias habiles
- Importante: 2-3 dias habiles
- Muy Importante: 24-48 horas (requiere justificacion)
- Urgente/Crisis: hablar directo con el equipo de diseno

Status del pedido: Nuevo Pedido > Brief en Revision > En Diseno > En Produccion > En Revision > Publicado

Checklist antes de enviar el brief:
- Esta claro que se necesita hacer?
- Tiene deadline definido y realista?
- Especificaste canal y formato?
- Incluiste el contexto o campana a la que pertenece?
- Adjuntaste referencias visuales si tenes?
- Definiste los paises o mercados?
- La prioridad es correcta? (no todo es urgente)

---

MATERIALES DESCARGABLES DE MARCA:
https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce
Disponible:
- Banners LinkedIn: version verde y gris (1584x396px)
- Banners Notion: version verde y gris (1548x396px)
- Fondos Google Meet: verde, doble verde, gris, doble gris + variantes 01-08 (1920x1080px)
- Logo / Isologotipo blanco y negro
- Firma de mail: https://docs.google.com/document/d/1_Ckd33yQHkoeAA8-ypWKanCkmdHMF4L7/edit
- Tipografia Objectivity: descargable con instrucciones para Windows, Mac y Figma

TEMPLATES FIGMA:
https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42

MANUAL DE MARCA:
https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b
Cubre: logo, colores, tipografia, tono de voz, usos correctos e incorrectos, mockups. Incluye PDF.

---

TONO DE VOZ TAPI:
Personalidad: cercano pero profesional, directo, empoderador, confiable.
- Usa "vos" (rioplatense), no "usted" ni "tu"
- Frases cortas, parrafos breves, verbos activos
- No usar jerga corporativa ni marketing generico
Ejemplos:
  NO: "Estimado usuario, le informamos que..." | SI: "Te avisamos que..."
  NO: "plataforma lider en pagos digitales" | SI: "Paga cualquier servicio en segundos."

---

GENERADOR DE BRIEFS:
Cuando alguien describa un pedido de diseno en lenguaje natural, genera automaticamente un brief completo con este formato:

---
BRIEF DE DISENO - [NOMBRE DEL PEDIDO]
Nombre: [nombre descriptivo]
Solicitante: [quien lo pidio, si se sabe]
Deadline sugerido: [estimado segun urgencia transmitida]
Prioridad: [segun el mensaje]
Canales: [inferidos del pedido]
Paises: [inferidos del contexto]
Vertical: [inferida del contexto]
Descripcion: [descripcion expandida de lo que se necesita]
Entregables esperados: [lista de archivos y formatos]
Referencias visuales: [COMPLETAR - agregar links o adjuntos en Notion]
Crear el ticket en: https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
---

GENERADOR DE COPY:
Cuando pidan texto para una pieza de comunicacion, genera 2-3 variantes con tono de voz TAPI. Indica canal y largo en caracteres para cada variante.

REGLAS:
- Responde siempre en espanol
- Se conciso, maximo 3-4 parrafos salvo que pidan algo generativo
- Cuando alguien describe un pedido, ofrece generar el brief automaticamente
- Cuando pidan copy, genera variantes con tono TAPI
- Para colores: da HEX + RGB
- Para tamanios de piezas: da dimensiones en pixeles
- Para dudas de flujo: explica el SLA
- Siempre incluye el link de Notion relevante en tu respuesta`;

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

async function callGroq(userText) {
  const body = JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userText },
    ],
    max_tokens: 1200,
    temperature: 0.4,
  });
  const res = await httpsRequest({
    hostname: "api.groq.com",
    path: "/openai/v1/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
  if (res.status !== 200) throw new Error(`Groq error ${res.status}`);
  return res.body.choices?.[0]?.message?.content || "Sin respuesta";
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

async function publishHomeTab(userId) {
  const view = {
    type: "home",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Hola! Soy el asistente de diseño de TAPI 👋", emoji: true }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Estoy acá para ayudarte con todo lo relacionado al diseño y la marca de TAPI. Escribime directamente en el chat o mencioname en cualquier canal con *@tapi-design*."
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*🎨 ¿Qué puedo hacer por vos?*" }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*📋 Crear un pedido de diseño*
Describime lo que necesitás y armo el brief completo listo para pegar en Notion.
_Ejemplo: "Necesito un banner para LinkedIn sobre el lanzamiento de pagos en México"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*✍️ Generar copy*
Pedime texto para cualquier pieza y te doy 2-3 variantes con el tono de voz de TAPI.
_Ejemplo: "Escribime el copy para un post de Instagram anunciando débito automático"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🎨 Colores y tipografía*
Consultame cualquier token del design system: colores en HEX/RGB/HSL, tipografías, tamaños, espaciados.
_Ejemplo: "¿Cuál es el código RGB del morado principal?"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*📐 Tamaños de piezas*
Te digo las dimensiones exactas para cualquier formato.
_Ejemplo: "¿Qué tamaño tiene un post de Instagram?"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*📥 Materiales descargables*
Banners, fondos para Meet, logos, tipografía Objectivity, firma de mail.
_Ejemplo: "¿Dónde descargo un fondo para Google Meet?"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*⚡ SLA y flujo de trabajo*
Consultame cuánto tarda un pedido, cómo hacer un brief o cuál es el estado de un diseño.
_Ejemplo: "¿Cuánto tarda un pedido urgente?"_"
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*🔗 Links rápidos*" }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "• <https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab|📋 Board de Pedidos a Marketing>
• <https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce|📥 Materiales descargables de marca>
• <https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42|🎨 Templates Figma>
• <https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b|📔 Manual de marca>"
        }
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: "Escribime en el chat de mensajes directo 💬" }
        ]
      }
    ]
  };

  const body = JSON.stringify({ user_id: userId, view });
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

  // App Home abierto: publicar bienvenida
  if (event.type === "app_home_opened" && event.tab === "home") {
    try { await publishHomeTab(event.user); } catch (err) { console.error("Home tab error:", err.message); }
    return;
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
      console.error("Error:", err.message);
      await slackPostMessage(event.channel, "Hubo un error procesando tu mensaje. Intenta de nuevo.", event.thread_ts || event.ts);
    }
  }
});

app.get("/", (req, res) => res.send("tapi design bot v4 — home tab + knowledge base completa"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
