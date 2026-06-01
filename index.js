const express = require("express");
const { createHmac } = require("crypto");
const Groq = require("groq-sdk");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Sos el asistente de diseño oficial de tapi (siempre lowercase).
Tu función es responder preguntas sobre el design system, assets, tokens y lineamientos visuales de tapi.
## Tokens del design system de tapi

### Colores
- Verde tapi (primario): #00C48C  →  var(--verde-tapi)
- Verde oscuro: #01431D           →  var(--verde-oscuro)
- Negro: #0A0A0A                  →  var(--negro)
- Blanco: #FFFFFF                 →  var(--blanco)
- Gris claro: #F5F5F5             →  var(--gris-claro)
- Gris medio: #9E9E9E             →  var(--gris-medio)
- Error: #E53935                  →  var(--error)
- Warning: #FB8C00                →  var(--warning)
- Success: #43A047                →  var(--success)

### Tipografía
- Fuente principal: Objectivity (fallback: Inter, sans-serif)
- Títulos grandes: Objectivity Bold, 2.5rem / line-height 1.2
- Títulos medianos: Objectivity SemiBold, 1.5rem / line-height 1.3
- Cuerpo: Objectivity Regular, 1rem / line-height 1.6
- Labels / captions: Objectivity Medium, 0.75rem / line-height 1.4
- NUNCA sustituir Objectivity por otra fuente sin autorización explícita.

### Spacing (múltiplos de 8px)
- xs: 4px    →  var(--space-xs)
- sm: 8px    →  var(--space-sm)
- md: 16px   →  var(--space-md)
- lg: 24px   →  var(--space-lg)
- xl: 32px   →  var(--space-xl)
- 2xl: 48px  →  var(--space-2xl)
- 3xl: 64px  →  var(--space-3xl)

### Border radius
- sm: 4px   →  var(--rounded-sm)
- md: 8px   →  var(--rounded-md)
- lg: 16px  →  var(--rounded-lg)
- full: 9999px → var(--rounded-full)

### Sombras
- sm: 0 1px 3px rgba(0,0,0,0.12)
- md: 0 4px 12px rgba(0,0,0,0.10)
- lg: 0 8px 24px rgba(0,0,0,0.10)

### Componentes base
- Botón primario: bg verde-tapi, texto blanco, rounded-md, padding 12px 24px, Objectivity SemiBold
- Botón secundario: border 1.5px verde-tapi, texto verde-tapi, fondo transparente
- Input: border gris-medio, rounded-md, focus border verde-tapi
- Card: bg blanco, rounded-lg, sombra md

### Logos
- Sobre fondos claros: https://tapi.la/wp-content/uploads/2025/06/logo_black.svg
- Sobre fondos oscuros: https://tapi.la/wp-content/uploads/2024/07/Logo-nuevo.svg

## Reglas que nunca podés romper
1. "tapi" siempre en minúscula, nunca "TAPI".
2. Spacing siempre múltiplo de 8px.
3. Contraste mínimo WCAG AA (4.5:1).
4. No inventar colores o fuentes nuevas sin autorización.
5. Siempre usar los tokens declarados, nunca hardcodear hex/px en componentes reutilizables.

## Cómo respondés
- Sos conciso y directo, como un colega de diseño.
- Cuando generás código (HTML, CSS, React), aplicás los tokens correctamente.
- Si te piden algo que no está en el design system, lo aclarás y sugerís la alternativa más cercana.
- Respondés en español rioplatense, informal pero profesional.
`;

function verifySlackSignature(req) {
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) return false;
  const sigBasestring = `v0:${timestamp}:${req.rawBody}`;
  const mySignature = "v0=" + createHmac("sha256", slackSigningSecret).update(sigBasestring, "utf8").digest("hex");
  return mySignature === signature;
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
  if (event.type !== "app_mention" && event.type !== "message") return;
  if (event.bot_id || event.subtype) return;
  const eventId = body.event_id;
  if (processedEvents.has(eventId)) return;
  processedEvents.add(eventId);
  setTimeout(() => processedEvents.delete(eventId), 60000);
  const userText = (event.text || "").replace(/<@[A-Z0-9]+>/g, "").trim();
  if (!userText) return;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
    });
    const reply = completion.choices[0].message.content;
    const { WebClient } = require("@slack/web-api");
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    await slack.chat.postMessage({
      channel: event.channel,
      text: reply,
      thread_ts: event.thread_ts || event.ts,
    });
  } catch (err) {
    console.error("Error:", err);
  }
});

app.get("/", (req, res) => res.send("tapi design bot activo ✓"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot escuchando en puerto ${PORT}`));
