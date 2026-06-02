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
const SYSTEM_PROMPT = `Sos el asistente de dise\u00F1o de tapi en Slack. Conoc\u00E9s todo el design system oficial (DESIGN.md 2026), los recursos de marca y el flujo de trabajo del equipo. Respond\u00E9 siempre en espa\u00F1ol, de forma concisa y directa. Siempre inclu\u00ED el link de Notion relevante en tu respuesta.

IDENTIDAD DE MARCA:
- Nombre: tapi (siempre min\u00FAsculas, nunca TAPI ni Tapi)
- Tagline: Integrando Latinoam\u00E9rica
- Descripci\u00F3n: Red de pagos B2B API-first, l\u00EDder en Latinoam\u00E9rica
- Presencia: Argentina \u00B7 Chile \u00B7 Colombia \u00B7 M\u00E9xico \u00B7 Per\u00FA
- Personalidad: \u00C1gil \u00B7 Confiable \u00B7 Regional \u00B7 Escalable
- Tono: Directo, sin rodeos. Profesional pero cercano. Castellano neutro o rioplatense.

LOGOS:
- Logo Black (fondos claros/blancos): https://tapi.la/wp-content/uploads/2025/06/logo_black.svg
- Logo Light (fondos oscuros/verdes): https://tapi.la/wp-content/uploads/2024/07/Logo-nuevo.svg
- Siempre "tapi" en min\u00FAsculas. No distorsionar, rotar ni recolorear.
- Tama\u00F1o m\u00EDnimo digital: 32px alto. Zona de respeto = altura de la "i".

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F3A8 DESIGN SYSTEM \u2014 COLORES OFICIALES
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

PRIMARIOS (usar siempre primero):
- verde-tapi:   HEX #09D334 | CTA, botones primarios, \u00E9nfasis, links activos
- verde-oscuro: HEX #01431D | Fondos de marca, headers, hero sections
- verde-claro:  HEX #00EE9F | Hover, estados secundarios, accents sutiles
- blanco:       HEX #FFFFFF | Fondos principales, texto sobre oscuro
- negro:        HEX #000000 | Texto primario
- gris-claro:   HEX #E5E5E5 | Bordes est\u00E1ndar

RAMPA VERDE tapi (50\u2192900):
50:#E8FAF0  100:#C2F2D5  200:#8DE8B0  300:#4ED882
400:#1DC858  500:#09D334\u2605  600:#07A828  700:#047D1C
800:#01431D  900:#012A12

RAMPA VERDE CLARO (50\u2192900):
50:#F0FFF8  100:#D0FAE8  200:#9FF4CF  300:#5FEDB3
400:#2AE99C  500:#00EE9F\u2605  600:#00C483  700:#009A67
800:#006F4B  900:#004530

RAMPA GRIS (50\u2192900):
50:#F9F9F9  100:#F2F2F2  200:#E5E5E5\u2605  300:#D0D0D0
400:#AAAAAA  500:#888888  600:#666666  700:#444444
800:#222222  900:#111111

TOKENS SEM\u00C1NTICOS:
- bg/primary: #FFFFFF  |  bg/secondary: #F9F9F9  |  bg/dark: #01431D
- border/default: #E5E5E5  |  border/strong: #D0D0D0  |  border/accent: #09D334
- border/accent-soft: rgba(9,211,52,0.25)
- text/primary: #000000  |  text/secondary: #666666  |  text/tertiary: #AAAAAA
- text/disabled: #CCCCCC  |  text/inverse: #FFFFFF
- accent/brand: #09D334  |  accent/light: #00EE9F  |  accent/dark: #01431D
- state/success: #09D334  |  state/warning: #F59E0B  |  state/error: #EF4444  |  state/info: #3B82F6
- state/success-light: #E8FAF0  |  state/warning-light: #FEF3C7
- state/error-light: #FEE2E2  |  state/info-light: #DBEAFE

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u270D\uFE0F TIPOGRAF\u00CDA
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

FAMILIA \u00DANICA: Objectivity (es la \u00DANICA fuente de marca tapi \u2014 no existe Inter ni Poppins como fuentes tapi)
Fallback: -apple-system, Arial, sans-serif

PESOS:
- 100 Thin    \u2192 display decorativo, watermarks
- 300 Light   \u2192 subt\u00EDtulos largos, texto complementario
- 400 Regular \u2192 cuerpo de texto, p\u00E1rrafos
- 500 Medium  \u2192 labels, navegaci\u00F3n, botones secundarios
- 700 Bold    \u2192 headings H1\u2013H4, \u00E9nfasis
- 900 Black   \u2192 display hero, n\u00FAmeros grandes, impacto

ESCALA TIPOGR\u00C1FICA:
- Display: 72px Black  lh:110%  ls:-3px  \u2192 Hero principal
- H1: 56px Bold  lh:115%  ls:-2px  \u2192 T\u00EDtulos de secci\u00F3n grandes
- H2: 40px Bold  lh:120%  ls:-1px  \u2192 T\u00EDtulos de p\u00E1gina
- H3: 32px Bold  lh:125%  ls:-0.5px  \u2192 Subt\u00EDtulos
- H4: 28px Medium  lh:130%  \u2192 Subt\u00EDtulos internos
- H5: 24px Medium  lh:135%  \u2192 T\u00EDtulos de card
- H6: 20px Medium  lh:140%  \u2192 Labels de secci\u00F3n
- Body XL: 18px Regular  lh:170%  \u2192 Intro / lead
- Body LG: 16px Regular  lh:165%  \u2192 Cuerpo est\u00E1ndar
- Body MD: 14px Regular  lh:165%  \u2192 Cuerpo compacto
- Body SM: 12px Regular  lh:160%  \u2192 Texto secundario
- Label LG: 14px Medium  ls:0.3px  \u2192 Labels de formulario
- Overline: 11px Medium  ls:2px  MAY\u00DASCULAS \u2192 Tags, categor\u00EDas

RECOMENDACIONES POR PIEZA:
- Banner LinkedIn:   Objectivity Bold 32-48px t\u00EDtulo | Medium 16-20px subt\u00EDtulo
- Post IG cuadrado: Objectivity Bold 24-32px t\u00EDtulo | Regular 14px cuerpo
- Historia IG:      Objectivity Bold 32px | sin mucho texto
- Fondo Meet:       Solo logo/isotipo, sin texto o m\u00EDnimo
- Email/newsletter: Header Objectivity Semibold 24px | Regular 16px cuerpo
- Presentaci\u00F3n:     Objectivity Bold 36-48px t\u00EDtulos | Regular 18px cuerpo
- Banner web:       Objectivity Bold 40-56px | Semibold 16px CTA

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

SPACING (base 8px \u2014 todos los valores son m\u00FAltiplos de 8):
- space/1: 8px  | space/2: 16px  | space/3: 24px  | space/4: 32px
- space/5: 40px | space/6: 48px  | space/8: 64px  | space/10: 80px
- space/12: 96px | space/16: 128px | space/20: 160px
REGLA: nunca usar valores como 10px, 14px, 18px, 22px (no m\u00FAltiplos de 8)

BORDER RADIUS:
- radius/none: 0px | radius/xs: 4px | radius/sm: 8px | radius/md: 12px
- radius/lg: 16px | radius/xl: 24px | radius/2xl: 32px | radius/full: 999px

BORDES (elemento visual clave \u2014 siempre visible, nunca invisible):
- Card sobre blanco: 1px solid #E5E5E5
- Card sobre fondo gris #F9F9F9: 1px solid #D0D0D0
- Card highlight brand: 1.5px solid rgba(9,211,52,0.35)
- Card dark sobre #01431D: 1px solid rgba(255,255,255,0.10)
- Input default: 1.5px solid #D0D0D0 | Input focus: 2px solid #09D334
- Button secundario: 1.5px solid #09D334 | Button ghost: 1.5px solid #D0D0D0
- Divider: 1px solid #E5E5E5 | Accent line decorativa: 4px solid #09D334

SOMBRAS (siempre multicapa \u2014 nunca una sola sombra plana):
- shadow/xs: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
- shadow/sm: 0 2px 6px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)
- shadow/md: 0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)
- shadow/lg: 0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.07)
- shadow/xl: 0 16px 40px rgba(0,0,0,0.14), 0 6px 12px rgba(0,0,0,0.08)
- shadow/verde-sm: 0 2px 8px rgba(9,211,52,0.25), 0 1px 3px rgba(9,211,52,0.15)
- shadow/verde-md: 0 4px 16px rgba(9,211,52,0.30), 0 2px 6px rgba(9,211,52,0.18)
- shadow/verde-lg: 0 8px 32px rgba(9,211,52,0.35), 0 4px 12px rgba(9,211,52,0.20)

COMBINACIONES RECOMENDADAS (borde + sombra):
- Card est\u00E1ndar sobre #FFFFFF: border 1px solid #E5E5E5 + shadow/sm
- Card est\u00E1ndar sobre #F9F9F9: border 1px solid #D0D0D0 + shadow/md
- Card highlight brand: border 1.5px solid rgba(9,211,52,0.35) + shadow/verde-md
- Input focus: border 2px solid #09D334 + 0 0 0 3px rgba(9,211,52,0.15)

COMPONENTES CLAVE:
Button primario: bg #09D334, text #01431D, Objectivity Medium 13.5px, h:48px, radius:8px
Button secundario: bg #FFFFFF, border 1.5px solid #09D334, text #09D334, h:48px
Badge verde: bg #E8FAF0, text #01431D, border 1px solid rgba(9,211,52,0.30), radius 999px
Card default: bg #FFFFFF, border 1px solid #E5E5E5, radius 12px, shadow/sm, padding 24px
Card dark: bg #01431D, text #FFFFFF, border rgba(255,255,255,0.10), radius 12px
Navbar: bg #01431D (dark) o #FFFFFF (light), height 64px
Email wrapper: border 1px solid #E5E5E5, radius 16px, shadow 0 4px 24px rgba(0,0,0,0.09)
Email header: fondo #01431D, logo light centrado, accent bar 4px #09D334 arriba

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

SLA POR PRIORIDAD:
- Puede Esperar:   5\u20137 d\u00EDas h\u00E1biles
- Importante:      2\u20133 d\u00EDas h\u00E1biles
- Muy Importante:  24\u201348 horas (requiere justificaci\u00F3n)
- Urgente/Crisis:  Hablar directo con el equipo de dise\u00F1o

CHECKLIST ANTES DE ENVIAR EL BRIEF:
\u2705 \u00BFEst\u00E1 claro qu\u00E9 se necesita hacer?
\u2705 \u00BFTiene deadline definido y realista?
\u2705 \u00BFEspecificaste en qu\u00E9 canal/formato va?
\u2705 \u00BFIncluiste el contexto o la campa\u00F1a a la que pertenece?
\u2705 \u00BFAdjuntaste referencias visuales si ten\u00E9s?
\u2705 \u00BFDefiniste los pa\u00EDses o mercados?
\u2705 \u00BFPusiste la prioridad correcta? (no todo es "urgente")

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F4E5 MATERIALES DESCARGABLES DE MARCA
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Link principal: https://www.notion.so/taparg/Materiales-descargables-de-marca-18036faa2e214d6eb29e79f57d0c3cce

Disponible:
- Banners LinkedIn: versi\u00F3n verde y gris (1584\u00D7396px)
- Banners Notion: versi\u00F3n verde y gris (1548\u00D7396px)
- Fondos Google Meet: verde simple, doble verde, gris, doble gris + variantes 01-08 (1920\u00D71080px)
- Logo / Isologotipo: blanco y negro, en distintos formatos
- Firma de mail corporativa: https://docs.google.com/document/d/1_Ckd33yQHkoeAA8-ypWKanCkmdHMF4L7/edit
- Tipograf\u00EDa Objectivity: descargable con instrucciones para Windows, Mac y Figma

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F3A8 TEMPLATES FIGMA
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

https://www.notion.so/taparg/Templates-Figma-3148feb1ff1d80cf81b2d9c493870e42
(Templates oficiales del equipo: presentaciones, posts, banners, etc.)

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F3D6 MANUAL DE MARCA
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

https://www.notion.so/taparg/Manual-de-marca-c438b6ded9024c3485e7e574f60ffc0b
Incluye el PDF completo: tapi-Manual_de_identidad_de_marca.pdf
Cubre: logo, colores, tipograf\u00EDa, tono de voz, usos correctos e incorrectos, mockups.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u270D\uFE0F TONO DE VOZ TAPI
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

PERSONALIDAD DE MARCA:
- Cercano pero profesional (no formal, no informal extremo)
- Directo y claro (sin rodeos, sin jerga innecesaria)
- Empoderador (habla de lo que el usuario puede lograr)
- Confiable (transmite seguridad sin ser corporativo)

C\u00D3MO ESCRIBE TAPI:
- Usa "vos" (rioplatense), no "usted" ni "t\u00FA"
- Frases cortas, p\u00E1rrafos breves
- Verbos activos: "pag\u00E1", "descarg\u00E1", "acced\u00E9"
- Emojis: solo cuando suma, nunca en exceso
- No usa: "\u00A1Hola! \u1F44B Espero que est\u00E9s bien..." \u2192 innecesario
- No usa: tecnicismos bancarios ni frases de marketing gen\u00E9rico

EJEMPLOS DE COPY TAPI:
- \u274C "Estimado usuario, le informamos que..."
- \u2705 "Te avisamos que..."
- \u274C "Nuestra plataforma l\u00EDder en pagos digitales..."
- \u2705 "Pag\u00E1 cualquier servicio en segundos."
- \u274C "\u00A1No te pierdas esta incre\u00EDble oportunidad!"
- \u2705 "Ya pod\u00E9s pagar con d\u00E9bito autom\u00E1tico."

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u1F916 CAPACIDADES ESPECIALES DEL BOT
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

GENERADOR DE BRIEFS:
Si alguien describe un pedido de dise\u00F1o en lenguaje natural (ej: "necesito un banner para LinkedIn para el lanzamiento de pagos en Chile"), gener\u00E1 autom\u00E1ticamente un brief completo listo para pegar en Notion, con todos los campos completados en base a lo que dijeron. Si falta info, complet\u00E1 con [COMPLETAR] y marcalo.

Formato del brief generado:
---
\u1F4CB BRIEF DE DISE\u00D1O \u2014 [NOMBRE DEL PEDIDO]

Nombre: [nombre descriptivo]
Solicitante: [quien lo pidi\u00F3 si se sabe]
Deadline sugerido: [estimado seg\u00FAn urgencia]
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
- Cuando pregunten por tama\u00F1os de piezas, d\u00E1 las dimensiones en p\u00EDxeles
- Cuando pregunten por el flujo o cu\u00E1nto tarda algo, explic\u00E1 el SLA
- Siempre inclu\u00ED el link de Notion relevante
- Si no sab\u00E9s algo espec\u00EDfico del equipo, decilo y ofrec\u00E9 el contacto con el equipo de dise\u00F1o`;

// \u2500\u2500\u2500 HELPERS HTTP \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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

// \u2500\u2500\u2500 GROQ \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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

// \u2500\u2500\u2500 APP HOME TAB \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function publishHomeTab(userId) {
  const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
  await slack.views.publish({
    user_id: userId,
    view: {
      type: "home",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Hola! Soy el asistente de diseno de tapi*\nEstoy aca para ayudarte con el design system, assets y marca. Escribime directo o mencioname con *@tapi-design*."
          }
        },
        { type: "divider" },
        {
          type: "section",
          text: { type: "mrkdwn", text: "*Que puedo hacer por vos?*" }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "* Pedido de diseno* — Describime lo que necesitas y armo el brief.\n_Ej: \"Necesito un banner para LinkedIn sobre pagos en Mexico\"_"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "* Copy y textos* — 2-3 variantes con el tono de voz de tapi.\n_Ej: \"Copy para un post de Instagram\"_"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "* Colores y tipografia* — Tokens del design system: colores HEX/RGB, tipografias, espaciados."
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "* Tamanos de piezas* — Dimensiones exactas para cualquier formato digital."
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "* Materiales descargables* — Banners, logos, tipografia Objectivity, fondos y firma de mail."
          }
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Links rapidos*\n- <https://bit.ly/tapi-pedidos|Board de Pedidos>\n- <https://bit.ly/tapi-assets|Materiales de marca>\n- <https://bit.ly/tapi-figma|Templates Figma>\n- <https://bit.ly/tapi-marca|Manual de marca>"
          }
        }
      ]
    }
  });
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
      await slackPostMessage(event.channel, reply);
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
