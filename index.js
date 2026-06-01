process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
    process.exit(1);
});

console.log('Starting tapi-design-bot...');
console.log('PORT:', process.env.PORT);
console.log('Has GROQ_API_KEY:', !!process.env.GROQ_API_KEY);
console.log('Has SLACK_BOT_TOKEN:', !!process.env.SLACK_BOT_TOKEN);

const express = require("express");
const { createHmac } = require("crypto");
const https = require("https");

const app = express();

const SYSTEM_PROMPT = `Sos el asistente de diseno oficial de tapi (siempre lowercase).
Tu funcion es responder preguntas sobre el design system, assets, tokens y lineamientos visuales de tapi.

## Tokens del design system de tapi

### Colores
- Verde tapi (primario): #00C48C  ->  var(--verde-tapi)
- Verde oscuro: #01431D           ->  var(--verde-oscuro)
- Negro: #0A0A0A                  ->  var(--negro)
- Blanco: #FFFFFF                 ->  var(--blanco)
- Gris claro: #F5F5F5             ->  var(--gris-claro)
- Gris medio: #9E9E9E             ->  var(--gris-medio)
- Error: #E53935                  ->  var(--error)
- Warning: #FB8C00                ->  var(--warning)
- Success: #43A047                ->  var(--success)

### Tipografia
- Fuente principal: Objectivity (fallback: Inter, sans-serif)
- Titulos grandes: Objectivity Bold, 2.5rem / line-height 1.2
- Titulos medianos: Objectivity SemiBold, 1.5rem / line-height 1.3
- Cuerpo: Objectivity Regular, 1rem / line-height 1.6
- Labels / captions: Objectivity Medium, 0.75rem / line-height 1.4
- NUNCA sustituir Objectivity por otra fuente sin autorizacion explicita.

### Spacing (multiples de 8px)
- xs: 4px    ->  var(--space-xs)
- sm: 8px    ->  var(--space-sm)
- md: 16px   ->  var(--space-md)
- lg: 24px   ->  var(--space-lg)
- xl: 32px   ->  var(--space-xl)
- 2xl: 48px  ->  var(--space-2xl)
- 3xl: 64px  ->  var(--space-3xl)

### Border radius
- sm: 4px   ->  var(--rounded-sm)
- md: 8px   ->  var(--rounded-md)
- lg: 16px  ->  var(--rounded-lg)
- full: 9999px -> var(--rounded-full)

### Sombras
- sm: 0 1px 3px rgba(0,0,0,0.12)
- md: 0 4px 12px rgba(0,0,0,0.10)
- lg: 0 8px 24px rgba(0,0,0,0.10)

### Componentes base
- Boton primario: bg verde-tapi, texto blanco, rounded-md, padding 12px 24px, Objectivity SemiBold
- Boton secundario: border 1.5px verde-tapi, texto verde-tapi, fondo transparente
- Input: border gris-medio, rounded-md, focus border verde-tapi
- Card: bg blanco, rounded-lg, sombra md

### Logos
- Sobre fondos claros: https://tapi.la/wp-content/uploads/2025/06/logo_black.svg
- Sobre fondos oscuros: https://tapi.la/wp-content/uploads/2024/07/Logo-nuevo.svg

## Reglas que nunca podes romper
1. tapi siempre en minuscula, nunca TAPI.
2. Spacing siempre multiplo de 8px.
3. Contraste minimo WCAG AA (4.5:1).
4. No inventar colores o fuentes nuevas sin autorizacion.
5. Siempre usar los tokens declarados, nunca hardcodear hex/px en componentes reutilizables.

## Como respondés
- Sos conciso y directo, como un colega de diseno.
- Cuando generás codigo (HTML, CSS, React), aplicás los tokens correctamente.
- Si te piden algo que no esta en el design system, lo aclararas y sugerirás la alternativa mas cercana.
- Respondés en espanol rioplatense, informal pero profesional.
`;

function callGroq(userText) {
    return new Promise((resolve, reject) => {
          const body = JSON.stringify({
                  model: "llama-3.3-70b-versatile",
                  max_tokens: 1024,
                  messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userText },
                          ],
          });
          const options = {
                  hostname: "api.groq.com",
                  path: "/openai/v1/chat/completions",
                  method: "POST",
                  headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + process.env.GROQ_API_KEY,
                            "Content-Length": Buffer.byteLength(body),
                  },
          };
          const req = https.request(options, (res) => {
                  let data = "";
                  res.on("data", (chunk) => { data += chunk; });
                  res.on("end", () => {
                            try {
                                        const json = JSON.parse(data);
                                        resolve(json.choices[0].message.content);
                            } catch (e) {
                                        reject(new Error("Groq parse error: " + data));
                            }
                  });
          });
          req.on("error", reject);
          req.write(body);
          req.end();
    });
}

function slackPostMessage(channel, text, thread_ts) {
    return new Promise((resolve, reject) => {
          const body = JSON.stringify({ channel, text, thread_ts });
          const options = {
                  hostname: "slack.com",
                  path: "/api/chat.postMessage",
                  method: "POST",
                  headers: {
                            "Content-Type": "application/json; charset=utf-8",
                            "Authorization": "Bearer " + process.env.SLACK_BOT_TOKEN,
                            "Content-Length": Buffer.byteLength(body),
                  },
          };
          const req = https.request(options, (res) => {
                  let data = "";
                  res.on("data", (chunk) => { data += chunk; });
                  res.on("end", () => resolve(JSON.parse(data)));
          });
          req.on("error", reject);
          req.write(body);
          req.end();
    });
}

function verifySlackSignature(req) {
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
    const signature = req.headers["x-slack-signature"];
    const timestamp = req.headers["x-slack-request-timestamp"];
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) return false;
    const sigBasestring = "v0:" + timestamp + ":" + req.rawBody;
    const mySignature =
          "v0=" +
          createHmac("sha256", slackSigningSecret)
        .update(sigBasestring, "utf8")
        .digest("hex");
    return mySignature === signature;
}

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
    if (event.type !== "app_mention" && event.type !== "message") return;
    if (event.bot_id || event.subtype) return;
    const eventId = body.event_id;
    if (processedEvents.has(eventId)) return;
    processedEvents.add(eventId);
    setTimeout(() => processedEvents.delete(eventId), 60000);
    const userText = (event.text || "").replace(/<@[A-Z0-9]+>/g, "").trim();
    if (!userText) return;
    try {
          const reply = await callGroq(userText);
          await slackPostMessage(event.channel, reply, event.thread_ts || event.ts);
    } catch (err) {
          console.error("Error procesando evento:", err);
    }
});

app.get("/", (req, res) => res.send("tapi design bot activo"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot escuchando en puerto " + PORT));
