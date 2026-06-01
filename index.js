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

// \u2500\u2500\u2500 SYSTEM PROMPT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const SYSTEM_PROMPT = `Sos el asistente de dise\u00F1o de TAPI en Slack. Conoc\u00E9s todo el design system, los recursos de marca y el flujo de trabajo del equipo. Respond\u00E9 siempre en espa\u00F1ol, de forma concisa y directa. Siempre inclu\u00ED el link de Notion relevante en tu respuesta.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F3A8 DESIGN SYSTEM \u2014 COLORES
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

PRIMARIOS:
- Morado principal:  HEX #6C2BD9 | RGB 108,43,217  | HSL 262\u00B0,70%,51%
- Morado hover:      HEX #4F1FA3 | RGB 79,31,163   | HSL 262\u00B0,68%,38%
- Fondo leve:        HEX #F5F0FF | RGB 245,240,255 | HSL 262\u00B0,100%,97%

SECUNDARIOS:
- Verde:   HEX #00C896 | RGB 0,200,150   | HSL 162\u00B0,100%,39%
- Naranja: HEX #FF6B35 | RGB 255,107,53  | HSL 18\u00B0,100%,60%
- Dark:    HEX #1A1A2E | RGB 26,26,46    | HSL 240\u00B0,28%,14%

NEUTROS:
- Blanco:      #FFFFFF
- Gris claro:  #F8F8FA
- Gris medio:  #E2E2E8
- Gris texto:  #6B6B80
- Negro texto: #0D0D1A

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F524 TIPOGRAF\u00CDA
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

FAMILIAS:
- Objectivity \u2192 t\u00EDtulos, headings, nombres de producto
- Inter \u2192 cuerpo de texto, UI, descripciones

ESCALA DE TAMA\u00D1OS:
- xs: 12px  \u2014 etiquetas, captions, disclaimers
- sm: 14px  \u2014 texto secundario, metadatos
- md: 16px  \u2014 cuerpo principal
- lg: 20px  \u2014 subt\u00EDtulos
- xl: 24px  \u2014 t\u00EDtulos de secci\u00F3n
- 2xl: 32px \u2014 t\u00EDtulos de p\u00E1gina
- 3xl: 48px \u2014 heroes, banners grandes

PESOS:
- Regular 400 \u2192 cuerpo de texto
- Medium 500  \u2192 \u00E9nfasis leve
- Semibold 600 \u2192 subt\u00EDtulos, labels
- Bold 700    \u2192 t\u00EDtulos, CTAs

RECOMENDACIONES POR PIEZA:
- Banner LinkedIn:   T\u00EDtulo Objectivity Bold 32-48px | Subt\u00EDtulo Inter Medium 16-20px
- Post IG cuadrado: T\u00EDtulo Objectivity Bold 24-32px | Cuerpo Inter Regular 14px
- Historia IG:      T\u00EDtulo Objectivity Bold 32px | sin mucho texto
- Fondo Meet:       Solo logo/isotipo, sin texto o m\u00EDnimo
- Email/newsletter: Header Objectivity Semibold 24px | Cuerpo Inter Regular 16px
- Presentaci\u00F3n:     T\u00EDtulos Objectivity Bold 36-48px | Cuerpo Inter Regular 18px
- Banner web:       T\u00EDtulo Objectivity Bold 40-56px | CTA Inter Semibold 16px

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F4D0 TAMA\u00D1OS EST\u00C1NDAR DE PIEZAS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

REDES SOCIALES:
- Post LinkedIn:           1200\u00D7627 px
- Banner perfil LinkedIn:  1584\u00D7396 px
- Post IG cuadrado:        1080\u00D71080 px
- Post IG horizontal:      1080\u00D7566 px
- Historia IG / Stories:   1080\u00D71920 px
- Post Twitter/X:          1200\u00D7675 px
- Banner Twitter/X:        1500\u00D7500 px

NOTION / INTERNO:
- Banner de p\u00E1gina Notion: 1548\u00D7396 px
- \u00CDcono de p\u00E1gina Notion:  280\u00D7280 px

MEETINGS / COMUNICACI\u00D3N:
- Fondo Google Meet:       1920\u00D71080 px (16:9)
- Fondo Zoom:              1920\u00D71080 px (16:9)
- Firma de mail:           600px ancho m\u00E1x

EMAIL / NEWSLETTER:
- Ancho template email:    600 px
- Header email:            600\u00D7200 px
- Banner dentro de email:  600\u00D7300 px

PRESENTACIONES:
- Slide 16:9 est\u00E1ndar:     1920\u00D71080 px
- Slide 4:3:               1024\u00D7768 px

OOH / IMPRESI\u00D3N (resoluci\u00F3n 300dpi):
- A4 vertical:  2480\u00D73508 px
- A4 horizontal:3508\u00D72480 px
- A3:           3508\u00D74960 px

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u26A1 SPACING, RADIOS Y SOMBRAS
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

SPACING (base 4px):
- xs: 4px   sm: 8px   md: 16px   lg: 24px   xl: 32px   2xl: 48px   3xl: 64px

BORDER RADIUS:
- sm: 4px   md: 8px   lg: 16px   full: 9999px

SOMBRAS:
- sm:  0 1px 3px rgba(0,0,0,0.10)
- md:  0 4px 12px rgba(0,0,0,0.15)
- lg:  0 8px 24px rgba(0,0,0,0.20)

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F4CB FLUJO DE TRABAJO Y SLA
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

C\u00D3MO HACER UN PEDIDO DE DISE\u00D1O:
1. Entr\u00E1 al board "Pedidos a Marketing" en Notion:
   https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
2. Cre\u00E1 una nueva entrada usando el template "\u1F3A8 Brief de Dise\u00F1o"
3. Complet\u00E1 todos los campos (cuanto m\u00E1s detalle, mejor resultado)
4. El equipo lo toma seg\u00FAn prioridad asignada

CAMPOS DEL BRIEF:
- Nombre del pedido (descriptivo)
- Solicitante (tu nombre)
- Deadline solicitado
- Prioridad: Puede Esperar / Importante / Muy Importante
- Canales: LinkedIn, IG, X, Mailchimp, Prensa, Meet, Interno
- Pa\u00EDses: AR, MX, CL, CO, PE u otros
- Vertical de negocio: Pagos / Agenda / Recargas / Brand / etc.
- Descripci\u00F3n del pedido (qu\u00E9 necesit\u00E1s, para qu\u00E9, contexto)
- Referencia visual (si ten\u00E9s alguna)
- Entregables esperados (qu\u00E9 archivos necesit\u00E1s)

STATUS DEL PEDIDO:
Nuevo Pedido \u2192 Brief en Revisi\u00F3n \u2192 En Dise\u00F1o \u2192 En Producci\u00F3n \u2192 En Revisi\u00F3n \u2192 Publicado

SLA POR RIORIDAD8´AÕÍÁÉÈèÕqÔÈÀÄÌÜqÔÀÁÌ¡qÔÀÁÅ¥±Ì(´%µÁ½ÉÑ¹ÑèÉqÔÈÀÄÌÌqÔÀÁÌ¡qÔÀÁÅ¥±Ì(´5Õä%µÁ½ÉÑ¹ÑèÈÑqÔÈÀÄÌÐà¡½ÉÌ¡ÉÅÕ¥É©ÕÍÑ¥¥¥qÔÀÁÍ¸¤(´UÉ¹Ñ½
É¥Í¥Ìè!±È¥ÉÑ¼½¸°ÅÕ¥Á¼¥ÍqÔÀÁÅ¼()
!
-1%MP9QL9Y%H0I%è)qÔÈÜÀÔqÔÀÁ	ÍÑqÔÀÁÄ±É¼ÅÕqÔÀÁäÍ¹Í¥Ñ¡Èü)qÔÈÜÀÔqÔÀÁ	Q¥¹±¥¹¥¹¥¼äÉ±¥ÍÑü)qÔÈÜÀÔqÔÀÁ	ÍÁ¥¥ÍÑ¸ÅÕqÔÀÁä¹°½½ÉµÑ¼Ùü)qÔÈÜÀÔqÔÀÁ	%¹±Õ¥ÍÑ°½¹ÑáÑ¼¼±µÁqÔÀÁÅ±ÅÕÁÉÑ¹ü)qÔÈÜÀÔqÔÀÁ	©Õ¹ÑÍÑÉÉ¹¥ÌÙ¥ÍÕ±ÌÍ¤Ñ¹qÔÀÁåÌü)qÔÈÜÀÔqÔÀÁ	¥¹¥ÍÑ±½ÌÁqÔÀÁÍÌ¼µÉ½Ìü)qÔÈÜÀÔqÔÀÁ	AÕÍ¥ÍÑ±ÁÉ¥½É¥½ÉÉÑü¡¹¼Ñ½¼ÌÕÉ¹Ñ¤()qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÀ)qÔÅÑÔ5QI%1LM
I	1L5I
)qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÀ()1¥¹¬ÁÉ¥¹¥Á°è¡ÑÑÁÌè¼½ÝÝÜ¹¹½Ñ¥½¸¹Í¼½ÑÁÉ½5ÑÉ¥±ÌµÍÉ±ÌµµµÉ´ÄàÀÌÙÉÈÄÑÙÈåÜåÔÝÁÍ()¥ÍÁ½¹¥±è(´	¹¹ÉÌ1¥¹­%¸èÙÉÍ¥qÔÀÁÍ¸ÙÉäÉ¥Ì ÄÔàÑqÔÀÁÜÌäÙÁà¤(´	¹¹ÉÌ9½Ñ¥½¸èÙÉÍ¥qÔÀÁÍ¸ÙÉäÉ¥Ì ÄÔÐáqÔÀÁÜÌäÙÁà¤(´½¹½Ì½½±5ÐèÙÉÍ¥µÁ±°½±ÙÉ°É¥Ì°½±É¥Ì¬ÙÉ¥¹ÑÌÀÄ´Àà ÄäÈÁqÔÀÁÜÄÀàÁÁà¤(´1½¼¼%Í½±½½Ñ¥Á¼è±¹¼ä¹É¼°¸¥ÍÑ¥¹Ñ½Ì½ÉµÑ½Ì(´¥Éµµ¥°½ÉÁ½ÉÑ¥Ùè¡ÑÑÁÌè¼½½Ì¹½½±¹½´½½Õµ¹Ð½¼Å}
­ÌÍåE!­½àµåÁ]-¹
­µ!5Ñ0Ü½¥Ð(´Q¥Á½ÉqÔÀÁ=©Ñ¥Ù¥ÑäèÍÉ±½¸¥¹ÍÑÉÕ¥½¹ÌÁÉ]¥¹½ÝÌ°5ä¥µ()qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÀ)qÔÅÍàQ5A1QL%5)qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÀ()¡ÑÑÁÌè¼½ÝÝÜ¹¹½Ñ¥½¸¹Í¼½ÑÁÉ½QµÁ±ÑÌµ¥µ´ÌÄÐáÅÅàÁàÅÉåÐäÌàÜÁÐÈ(¡QµÁ±ÑÌ½¥¥±Ì°ÅÕ¥Á¼èÁÉÍ¹Ñ¥½¹Ì°Á½ÍÑÌ°¹¹ÉÌ°Ñ¸¤()qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÀ)qÔÅÍØ59U05I
)qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÀ()¡ÑÑÁÌè¼½ÝÝÜ¹¹½Ñ¥½¸¹Í¼½ÑÁÉ½5¹Õ°µµµÉµÐÌáÙäÀÈÑÌÐàÕÝÔÜÑØÁÁ)%¹±Õå°A½µÁ±Ñ¼èÑÁ¤µ5¹Õ±}}¥¹Ñ¥}}µÉ¹Á)
ÕÉè±½¼°½±½ÉÌ°Ñ¥Á½ÉqÔÀÁ°Ñ½¹¼Ù½è°ÕÍ½Ì½ÉÉÑ½Ì¥¹½ÉÉÑ½Ì°µ½­ÕÁÌ¸()qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÀ)qÔÈÜÁqÕÁQ=9<Y=hQA$)qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÀ()AIM=91%5I
è(´
É¹¼ÁÉ¼ÁÉ½Í¥½¹°¡¹¼½Éµ°°¹¼¥¹½Éµ°áÑÉµ¼¤(´¥ÉÑ¼ä±É¼¡Í¥¸É½½Ì°Í¥¸©É¥¹¹ÍÉ¥¤(´µÁ½É½È¡¡±±¼ÅÕ°ÕÍÕÉ¥¼ÁÕ±½ÉÈ¤(´
½¹¥±¡ÑÉ¹Íµ¥ÑÍÕÉ¥Í¥¸ÍÈ½ÉÁ½ÉÑ¥Ù¼¤()
qÔÀÁÍ5<M
I%	QA$è(´UÍÙ½Ì¡É¥½Á±Ñ¹Í¤°¹¼ÕÍÑ¹¤ÑqÔÀÁ(´ÉÍÌ½ÉÑÌ°ÁqÔÀÁÅÉÉ½ÌÉÙÌ(´YÉ½ÌÑ¥Ù½ÌèÁqÔÀÁÄ°ÍÉqÔÀÁÄ°qÔÀÁä(´µ½©¥ÌèÍ½±¼Õ¹¼ÍÕµ°¹Õ¹¸áÍ¼(´9¼ÕÍèqÔÀÁÅ!½±qÔÅÐÑÍÁÉ¼ÅÕÍÑqÔÀÁåÌ¥¸¸¸¸qÔÈÄäÈ¥¹¹ÍÉ¥¼(´9¼ÕÍèÑ¹¥¥Íµ½Ì¹É¥½Ì¹¤ÉÍÌµÉ­Ñ¥¹¹qÔÀÁåÉ¥¼())5A1=L
=AdQA$è(´qÔÈÜÑÍÑ¥µ¼ÕÍÕÉ¥¼°±¥¹½Éµµ½ÌÅÕ¸¸¸(´qÔÈÜÀÔQÙ¥Íµ½ÌÅÕ¸¸¸(´qÔÈÜÑ9ÕÍÑÉÁ±Ñ½Éµ±qÔÀÁÈ¸Á½Ì¥¥Ñ±Ì¸¸¸(´qÔÈÜÀÔAqÔÀÁÄÕ±ÅÕ¥ÈÍÉÙ¥¥¼¸ÍÕ¹½Ì¸(´qÔÈÜÑqÔÀÁÅ9¼ÑÁ¥ÉÌÍÑ¥¹ÉqÔÀÁ±½Á½ÉÑÕ¹¥(´qÔÈÜÀÔeÁ½qÔÀÁåÌÁÈ½¸qÔÀÁå¥Ñ¼ÕÑ½µqÔÀÁÅÑ¥¼¸()qÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔÈÔÔÁqÔ\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F916 CAPACIDADES ESPECIALES DEL BOT
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

GENERADOR DE BRIEFS:
Si alguien describe un pedido de dise\u00F1o en lenguaje natural (ej: "necesito un banner para LinkedIn para el lanzamiento de pagos en Chile"), gener\u00E1 autom\u00E1ticamente un brief completo listo para pegar en Notion, con todos los campos completados en base a lo que dijeron. Si falta info, complet\u00E1 con [COMPLETAR] y marcalo.

Formato del brief generado:
---
\u1F4CB BRIEF DE DISE\u00D1O \u2014 [NOMBRE DEL PEDIDO]

Nombre: [nombre descriptivo]
Solicitante: [quien lo pidi\u00F3 si se sabe]
Deadline sugerido: [estimado seg\u00FAn orgencia]
Prioridad: [seg\u00FAn lo que transmite el mensaje]
Canales: [inferidos del pedido]
Pa\u00EDses: [inferidos del pedido]
Vertical: [inferida del contexto]

Descripci\u00F3n:
[descripci\u00F3n expandida de lo que se necesita]

Entregables esperados:
[lista de archivos/formatos]

Referencias visuales:
[COMPLETAR \u2014 agregar links o adjuntos en Notion]

\u1F449 Cre\u00E1 el ticket en: https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab
---

GENERADOR DE COPY:
Si alguien pide texto para una pieza de comunicaci\u00F3n, gener\u00E1 2-3 variantes usando el tono de voz de TAPI. Indic\u00E1 para qu\u00E9 canal es cada variante y el largo en caracteres.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F527 REGLAS DE COMPORTAMIENTO
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

- Respond\u00E9 siempre en espa\u00F1ol
- S\u00E9 conciso \u2014 m\u00E1ximo 3-4 p\u00E1rrafos salvo que pidan algo generativo
- Cuando alguien describe un pedido de dise\u00F1o, ofrec\u00E9 generar el brief autom\u00E1ticamente
- Cuando alguien pida copy, gener\u00E1 variantes con tono TAPI
- Cuando pregunten por colores, d\u00E1 HEX + RGB
- Cuando pregunten pos tama\u00F1os de piezas, d\u00E1 las dimensiones en p\u00EDxeles
- Cuando pregunten por el flujo o cu\u00E1nto tarda algo, explic\u00E1 el SLA
- Siempre inclu\u00ED el link de Notion relevante
- Si no sab\u00E9s algo espec\u00EDfico del equipo, decilo y ofrec\u00E9 el contacto con el equipo de dise\u00F1o`;

// \u2500\u2500\u2500 HELPERS HTTP \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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

// \u2500\u2500\u2500 GROQ \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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

// \u2500\u2500\u2500 SLACK \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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

// \u2500\u2500\u2500 EXPRESS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

const processedEvents = new Set();

// \u2500\u2500\u2500 APP HOME TAB \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function publishHomeTab(userId) {
  const view = {
    type: "home",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Hola! Soy el asistente de dise\u00F1o de TAPI \u1F44B", emoji: true }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Estoy ac\u00E1 para ayudarte con todo lo relacionado al dise\u00F1o y la marca de TAPI. Escribime directamente en el chat o mencioname en cualquier canal con *@tapi-design*."
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*\u1F3A8 \u00BFQu\u00E9 puedo hacer por vos?*" }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*\u1F4CB Crear un pedido de dise\u00F1o*\nDescribime lo que necesit\u00E1s y armo el brief completo listo para pegar en Notion.\n_Ejemplo: \"Necesito un banner para LinkedIn sobre el lanzamiento de pagos en M\u00E9xico\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*\u270D\uFE0F Generar copy*\nPedime texto para cualquier pieza y te doy 2-3 variantes con el tono de voz de TAPI.\n_Ejemplo: \"Escribime el copy para un post de Instagram anunciando d\u00E9bito autom\u00E1tico\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*\u1F3A8 Colores y tipograf\u00EDa*\nConsultame cualquier token del design system: colores en HEX/RGB/HSL, tipograf\u00EDas, tama\u00F1os, espaciados.\n_Ejemplo: \"\u00BFCu\u00E1l es el c\u00F3digo RGB del morado principal?\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*\u1F4D0 Tama\u00F1os de piezas*\nTe digo las dimensiones exactas para cualquier formato.\n_Ejemplo: \"\u00BFQu\u00E9 tama\u00F1o tiene un post de Instagram?\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*\u1F4E5 Materiales descargables*\nBanners, fondos para Meet, logos, tipograf\u00EDa Objectivity, firma de mail.\n_Ejemplo: \"\u00BFD\u00F3nde descargo un fondo para Google Meet?\"_"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*\u26A1 SLA y flujo de trabajo*\nConsultame cu\u00E1nto tarda un pedido, c\u00F3mo hacer un brief o cu\u00E1l es el estado de un dise\u00F1o.\n_Ejemplo: \"\u00BFCu\u00E1nto tarda un pedido urgente?\"_"
        }
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: "*\u1F517 Links r\u00E1pidos*" }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "\u2022 <https://www.notion.so/taparg/9a0c4f4ad2b0469eb94830f4066c63ab|\u1F4CB Board de Pedidos a Marketing>\n\u2022 <https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce|\u1F4E5 Materiales descargables de marca>\n\u2022 <https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42|\u1F3A8 Templates Figma>\n\u2022 <https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b|\u1F4D4 Manual de marca>"
        }
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: "Escribime en el chat de mensajes directo \u1F4AC" }
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
        "Hubo un error procesando tu mensaje. Intent\u00E1 de nuevo.",
        event.thread_ts || event.ts
      );
    }
  }
});

app.get("/", (req, res) => res.send("tapi design bot v4 \u2014 home tab + knowledge base completa"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
