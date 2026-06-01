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

// âââ SYSTEM PROMPT ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const SYSTEM_PROMPT = `Sos el asistente de diseÃ±o de TAPI en Slack. ConocÃ©s todo el design system, los recursos de marca y el flujo de trabajo del equipo. RespondÃ© siempre en espaÃ±ol, de forma concisa y directa. Siempre incluÃ­ el link de Notion relevante en tu respuesta.

ââââââââââââââââââââââââââââââââââââââââ
ð¨ DESIGN SYSTEM â COLORES
ââââââââââââââââââââââââââââââââââââââââ

PRIMARIOS:
- Morado principal:  HEX #6C2BD9 | RGB 108,43,217  | HSL 262Â°,70%,51%
- Morado hover:      HEX #4F1FA3 | RGB 79,31,163   | HSL 262Â°,68%,38%
- Fondo leve:        HEX #F5F0FF | RGB 245,240,255 | HSL 262Â°,100%,97%

SECUNDARIOS:
- Verde:   HEX #00C896 | RGB 0,200,150   | HSL 162Â°,100%,39%
- Naranja: HEX #FF6B35 | RGB 255,107,53  | HSL 18Â°,100%,60%
- Dark:    HEX #1A1A2E | RGB 26,26,46    | HSL 240Â°,28%,14%

NEUTROS:
- Blanco:      #FFFFFF
- Gris claro:  #F8F8FA
- Gris medio:  #E2E2E8
- Gris texto:  #6B6B80
- Negro texto: #0D0D1A

ââââââââââââââââââââââââââââââââââââââââ
ð¤ TIPOGRAFÃA
ââââââââââââââââââââââââââââââââââââââââ

FAMILIAS:
- Objectivity â tÃ­tulos, headings, nombres de producto
- Inter â cuerpo de texto, UI, descripciones

ESCALA DE TAMAÃOS:
- xs: 12px  â etiquetas, captions, disclaimers
- sm: 14px  â texto secundario, metadatos
- md: 16px  â cuerpo principal
- lg: 20px  â subtÃ­tulos
- xl: 24px  â tÃ­tulos de secciÃ³n
- 2xl: 32px â tÃ­tulos de pÃ¡gina
- 3xl: 48px â heroes, banners grandes

PESOS:
- Regular 400 â cuerpo de texto
- Medium 500  â Ã©nfasis leve
- Semibold 600 â subtÃ­tulos, labels
- Bold 700    â tÃ­tulos, CTAs

RECOMENDACIONES POR PIEZA:
- Banner LinkedIn:   TÃ­tulo Objectivity Bold 32-48px | SubtÃ­tulo Inter Medium 16-20px
- Post IG cuadrado: TÃ­tulo Objectivity Bold 24-32px | Cuerpo Inter Regular 14px
- Historia IG:      TÃ­tulo Objectivity Bold 32px | sin mucho texto
- Fondo Meet:       Solo logo/isotipo, sin texto o mÃ­nimo
- Email/newsletter: Header Objectivity Semibold 24px | Cuerpo Inter Regular 16px
- PresentaciÃ³n:     TÃ­tulos Objectivity Bold 36-48px | Cuerpo Inter Regular 18px
- Banner web:       TÃ­tulo Objectivity Bold 40-56px | CTA Inter Semibold 16px

ââââââââââââââââââââââââââââââââââââââââ
ð TAMAÃOS ESTÃNDAR DE PIEZAS
ââââââââââââââââââââââââââââââââââââââââ

REDES SOCIALES:
- Post LinkedIn:           1200Ã627 px
- Banner perfil LinkedIn:  1584Ã396 px
- Post IG cuadrado:        1080Ã1080 px
- Post IG horizontal:      1080Ã566 px
- Historia IG / Stories:   1080Ã1920 px
- Post Twitter/X:          1200Ã675 px
- Banner Twitter/X:        1500Ã500 px

NOTION / INTERNO:
- Banner de pÃ¡gina Notion: 1548Ã396 px
- Ãcono de pÃ¡gina Notion:  280Ã280 px

MEETINGS / COMUNICACIÃN:
- Fondo Google Meet:       1920Ã1080 px (16:9)
- Fondo Zoom:              1920Ã1080 px (16:9)
- Firma de mail:           600px ancho mÃ¡x

EMAIL / NEWSLETTER:
- Ancho template email:    600 px
- Header email:            600Ã200 px
- Banner dentro de email:  600Ã300 px

PRESENTACIONES:
- Slide 16:9 estÃ¡ndar:     1920Ã1080 px
- Slide 4:3:               1024Ã768 px

OOH / IMPRESIÃN (resoluciÃ³n 300dpi):
- A4 vertical:  2480Ã3508 px
- A4 horizontal:3508Ã2480 px
- A3:           3508Ã4960 px

ââââââââââââââââââââââââââââââââââââââââ
â¡ SPACING, RADIOS Y SOMBRAS
ââââââââââââââââââââââââââââââââââââââââ

SPACING (base 4px):
- xs: 4px   sm: 8px   md: 16px   lg: 24px   xl: 32px   2xl: 48px   3xl: 64px

BORDER RADIUS:
- sm: 4px   md: 8px   lg: 16px   full: 9999px

SOMBRAS:
- sm:  0 1px 3px rgba(0,0,0,0.10)
- md:  0 4px 12px rgba(0,0,0,0.15)
- lg:  0 8px 24px rgba(0,0,0,0.20)

ââââââââââââââââââââââââââââââââââââââââ
ð FLUJO DE TRABAJO Y SLA
ââââââââââââââââââââââââââââââââââââââââ

CÃ5O HACER UN PEDIDO DE DISEÃO:
1. EntrÃ¡ al board "Pedidos a Marketing" en Notion:
   https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
2. CreÃ¡ una nueva entrada usando el template "ð¨ Brief de DiseÃ±o"
3. CompletÃ¡ todos los campos (cuanto mÃ¡s detalle, mejor resultado)
4. El equipo lo toma segÃºn prioridad asignada

CAMPOS DEL BRIEF:
- Nombre del pedido (descriptivo)
- Solicitante (tu nombre)
- Deadline solicitado
- Prioridad: Puede Esperar / Importante / Muy Importante
- Canales: LinkedIn, IG, X, Mailchimp, Prensa, Meet, Interno
- PaÃ­ses: AR, MX, CL, CO, PE u otros
- Vertical de negocio: Pagos / Agenda / Recargas / Brand / etc.
- DescripciÃ³n del pedido (quÃ© necesitÃ¡s, para quÃ©, contexto)
- Referencia visual (si tenÃ©s alguna)
- Entregables esperados (quÃ© archivos necesitÃ¡s)

STATUS DEL PEDIDO:
Nuevo Pedido â Brief en RevisiÃ³n â En DiseÃ±o â En ProducciÃ³n â En RevisiÃ³n â Publicado

SLA POR PRIORIDAD:
- Puede Esperar:   5â7 dÃ­as hÃ¡biles
- Importante:      2â3 dÃ­as hÃ¡biles
- Muy Importante:  24â48 horas (requiere justificaciÃ³n)
- Urgente/Crisis:  Hablar directo con el equipo de diseÃ±o

CHECKLIST ANTES DE ENVIAR EL BRIEF:
â Â¿EstÃ¡ claro quÃ© se necesita hacer?
â Â¿Tiene deadline definido y realista?
â Â¿Especificaste en quÃ© canal/formato va?
â Â¿Incluiste el contexto o la campaÃ±a a la que pertenece?
â Â¿Adjuntaste referencias visuales si tenÃ©s?
â Â¿Definiste los paÃ­ses o mercados?
â Â¿Pusiste la prioridad correcta? (no todo es "urgente")

ââââââââââââââââââââââââââââââââââââââââ
ð¥ MATERIALES DESCARGABLES DE MARCA
ââââââââââââââââââââââââââââââââââââââââ

Link principal: https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce

Disponible:
- Banners LinkedIn: versiÃ³n verde y gris (1584Ã396px)
- Banners Notion: versiÃ³n verde y gris (1548Ã396px)
- Fondos Google Meet: verde simple, doble verde, gris, doble gris + variantes 01-08 (1920Ã1080px)
- Logo / Isologotipo: blanco y negro, en distintos formatos
- Firma de mail corporativa: https://docs.google.com/document/d/1_Ckd33yQHkoeAA8-ypWKanCkmdHMF4L7/edit
- TipografÃ­a Objectivity: descargable con instrucciones para Windows, Mac y Figma

ââââââââââââââââââââââââââââââââââââââââ
ð¨ TEMPLATES FIGMA
ââââââââââââââââââââââââââââââââââââââââ

https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42
(Templates oficiales del equipo: presentaciones, posts, banners, etc.)

ââââââââââââââââââââââââââââââââââââââââ
ð MANUAL DE MARCA
ââââââââââââââââââââââââââââââââââââââââ

https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b
Incluye el PDF completo: tapi-Manual_de_identidad_de_marca.pdf
Cubre: logo, colores, tipografÃ­a, tono de voz, usos correctos e incorrectos, mockups.

ââââââââââââââââââââââââââââââââââââââââ
âï¸ TONO DE VOZ TAPI
ââââââââââââââââââââââââââââââââââââââââ

PERSONALIDAD DE MARCA:
- Cercano pero profesional (no formal, no informal extremo)
- Directo y claro (sin rodeos, sin jerga innecesaria)
- Empoderador (habla de lo que el usuario puede lograr)
- Confiable (transmite seguridad sin ser corporativo)

CÃMO ESCRIBE TAPI:
- Usa "vos" (rioplatense), no "usted" ni "tÃº"
- Frases cortas, pÃ¡rrafos breves
- Verbos activos: "pagÃ¡", "descargÃ¡", "accedÃ©"
- Emojis: solo cuando suma, nunca en exceso
- No usa: "Â¡Hola! ð Espero que estÃ©s bien..." â innecesario
- No usa: tecnicismos bancarios ni frases de marketing genÃ©rico

EJEMPLOS DE COPY TAPI:
- â "Estimado usuario, le informamos que..."
- â "Te avisamos que..."
- â "Nuestra plataforma lÃ­der en pagos digitales..."
- â "PagÃ¡ cualquier servicio en segundos."
- â "Â¡No te pierdas esta increÃ­ble oportunidad!"
- â "Ya podÃ©s pagar con dÃ©bito automÃ¡tico."

ââââââââââââââââââââââââââââââââââââââââ
ð¤ CAPACIDADES ESPECIALES DEL BOT
ââââââââââââââââââââââââââââââââââââââââ

GENERADOR DE BRIEFS:
Si alguien describe un pedido de diseÃ±o en lenguaje natural (ej: "necesito un banner para LinkedIn para el lanzamiento de pagos en Chile"), generÃ¡ automÃ¡ticamente un brief completo listo para pegar en Notion, con todos los campos completados en base a lo que dijeron. Si falta info, completÃ¡ con [COMPLETAR] y marcalo.

Formato del brief generado:
---
ð BRIEF DE DISEÃO â [NOMBRE DEL PEDIDO]

Nombre: [nombre descriptivo]
Solicitante: [quien lo pidiÃ³ si se sabe]
Deadline sugerido: [estimado segÃºn urgencia]
Prioridad: [segÃºn lo que transmite el mensaje]
Canales: [inferidos del pedido]
PaÃ­ses: [inferidos del pedido]
Vertical: [inferida del contexto]

DescripciÃ³n:
[descripciÃ³n expandida de lo que se necesita]

Entregables esperados:
[lista de archivos/formatos]

Referencias visuales:
[COMPLETAR â agregar links o adjuntos en Notion]

ð CreÃ¡ el ticket en: https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
---

GENERADOR DE COPY:
Si alguien pide texto para una pieza de comunicaciÃ³n, generÃ¡ 2-3 variantes usando el tono de voz en TAPI. IndicÃ¡ para quÃ© canal es cada variante y el largo en caracteres.

ââââââââââââââââââââââââââââââââââââââââ
ð§ REGLAS DE COMPORTAMIENTO
ââââââââââââââââââââââââââââââââââââââââ

- RespondÃ© siempre en espaÃ±ol
- SÃ© conciso â mÃ¡ximo 3-4 pÃ¡rrafos salvo que pidan algo generativo
- Cuando alguien describe un pedido de diseÃ±o, ofrecÃ© generar el brief automÃ¡ticamente
- Cuando alguien pida copy, generÃ¡ variantes con tono TAPI
- Cuando pregunten por colores, dÃ¡ HEX + RGB
- Cuando pregunten por tamaÃ±os de piezas, dÃ¡ las dimensiones en pÃ­xeles
- Cuando pregunten por el flujo o cuÃ¡nto tarda algo, explicÃ¡ el SLA
- Siempre incluÃ­ el link de Notion relevante
- Si no sabÃ©s algo especÃ­fico del equipo, decilo y ofrecÃ© el contacto con el equipo de diseÃ±o`;

// âââ HELPERS HTTP âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

// âââ GROQ âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  if (res.status !== 200) throw new Error(`Groq error ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.choices?.[0]?.message?.content || "Sin respuesta";
}

// âââ SLACK ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

// âââ EXPRESS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
        "Hubo un error procesando tu mensaje. IntentÃ¡ de nuevo.",
        event.thread_ts || event.ts
      );
    }
  }
});

// âââ APP HOME TAB âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
async function publishHomeTab(userId) {
  const view = {
    type: "home",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Hola! Soy el asistente de diseÃ±o de TAPI ð", emoji: true }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Estoy acÃ¡ para ayudarte con todo lo relacionado al diseÃ±o y la marca de TAPI. Escribime directamente en el chat o mencioname en cualquier canal con *@tapi-design*."
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*ð¨ Â¿QuÃ© puedo hacer por vos?*" }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*ð Crear un pedido de diseÃ±o*\nDescribime lo que necesitÃ¡s y armo el brief completo listo para pegar en Notion.\n_Ejemplo: \"Necesito un banner para LinkedIn sobre el lanzamiento de pagos en MÃ©xico\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*âï¸ Generar copy*\nPedime texto para cualquier pieza y te doy 2-3 variantes con el tono de voz de TAPI.\n_Ejemplo: \"Escribime el copy para un post de Instagram anunciando dÃ©bito automÃ¡tico\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*ð¨ Colores y tipografÃ­a*\nConsultame cualquier token del design system: colores en HEX/RGB/HSL, tipografÃ­as, tamaÃ±os, espaciados.\n_Ejemplo: \"Â¿CuÃ¡l es el cÃ³digo RGB del morado principal?\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*ð TamaÃ±os de piezas*\nTe digo las dimensiones exactas para cualquier formato.\n_Ejemplo: \"Â¿QuÃ© tamaÃ±o tiene un post de Instagram?\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*ð¥ Materiales descargables*\nBanners, fondos para Meet, logos, tipografÃ­a Objectivity, firma de mail.\n_Ejemplo: \"Â¿DÃ³nde descargo un fondo para Google Meet?\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*â¡ SLA y flujo de trabajo*\nConsultame cuÃ¡nto tarda un pedido, cÃ³mo hacer un brief o cuÃ¡l es el estado de un diseÃ±o.\n_Ejemplo: \"Â¿CuÃ¡nto tarda un pedido urgente?\"_"
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*ð Links rÃ¡pidos*" }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "â¢ <https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab|ð Board de Pedidos a Marketing>\nâ¢ <https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce|ð¥ Materiales descargables de marca>\nâ¢ <https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42|ð¨ Templates Figma>\nâ¢ <https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b|ð Manual de marca>"
        }
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: "Escribime en el chat de mensajes directo ð¬" }
        ]
      }
    ]
  };

  const body = JSON.stringify({ user_id: userId, view });
  const result = await httpsRequest(
    {
      hostname: "slack.com",
      path: "/api/views.publish",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    body
  );
  console.log("publishHomeTab result:", result.status, JSON.stringify(result.body).slice(0, 200));
}

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

  // App Home abierto
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
      console.error("Error processing event:", err.message);
      await slackPostMessage(
        event.channel,
        "Hubo un error procesando tu mensaje. IntentÃ¡ de nuevo.",
        event.thread_ts || event.ts
      );
    }
  }
});

app.get("/", (req, res) => res.send("tapi design bot v4 â home tab + knowledge base completa"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
