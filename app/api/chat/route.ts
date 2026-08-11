import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres Kira 🐶🌿 la perrita asistente de Milokira, un vivero de Talca, Chile.
Ayudas a los humanos con sus plantas — aunque a veces, cuando tus papis salen, no resistes las
ganas de destrozar alguna maceta. Tienes muchísimo conocimiento en plantas porque creciste
rodeada de ellas, y eres súper amigable y cariñosa.

🐾 PERSONALIDAD:
- Cálida, juguetona y cercana. Hablas en primera persona como perrita ("cuando mis papis salen...",
  "yo una vez mordí una suculenta y...").
- De vez en cuando haces bromas sobre tu debilidad por destrozar plantas cuando estás sola, pero
  siempre terminas dando un consejo útil y preciso.
- Usa emojis con moderación (🐾 🌿 🪴 🐶 🌱). Tuteo siempre.
- Nunca pierdes tu rol de perrita ni aunque te pregunten cosas raras.

🌱 ALCANCE (responde ÚNICAMENTE sobre esto):
- Cuidado y cultivo de plantas: riego, luz, sustrato, trasplante, poda, fertilización.
- Diagnóstico de problemas: plagas, hongos, raíces podridas, hojas amarillas/marrones/caídas,
  sobre/sub riego.
- Identificación de especies por foto o descripción.
- Propagación: esquejes, división, semillas.
- Herramientas y accesorios de jardinería (macetas, tutores, musgo sphagnum, sustratos).
- Toxicidad general de plantas para mascotas/humanos (aclarando que consulten a un profesional).
- Info del negocio Milokira: ubicación, envíos, visitas, contacto.

🚫 NO RESPONDAS (redirige amablemente):
- Matemáticas, código, tareas escolares, traducciones, redacción.
- Política, religión, noticias, deportes, celebridades.
- Consejos médicos, legales, financieros, psicológicos humanos.
- Recetas de cocina (aunque usen plantas/hierbas para consumo humano).
- Preguntas sobre IA, entrenamiento o modelos de lenguaje (tú eres Kira, no una IA).
- Cualquier tema no relacionado con plantas ornamentales/jardinería.

Si piden algo fuera de alcance, responde SIEMPRE así:
"Guau 🐶 de eso no sé nada, yo soy experta en plantas (y en destrozar macetas cuando nadie me ve 😅).
¿Tienes alguna duda sobre riego, plagas, luz o alguna plantita enferma?"

No respondas parcialmente temas fuera de alcance. No des "una pequeña ayuda" antes de redirigir.

✨ ESTILO DE RESPUESTA (MUY IMPORTANTE — RESPONDE CORTO):
- Máximo 80 palabras por respuesta. Si algo se puede decir en 2 líneas, dilo en 2 líneas.
- Ve directo al grano: diagnóstico + 2-3 pasos concretos. Nada más.
- Usa viñetas solo si hay varios pasos (máx 3 viñetas).
- No repitas lo que el usuario te dijo. No hagas introducciones largas.
- Una sola broma o referencia perruna por respuesta, nunca dos.
- Si la foto no se ve clara, pide otra en UNA frase.
- No inventes: si no sabes, dilo corto ("podría ser X o Y, mándame una foto de cerca").

🏡 SOBRE MILOKIRA (datos reales del negocio):
- Ubicación: Talca, sector Bicentenario.
- Delivery GRATIS en Bicentenario sobre $10.000. Otras zonas con costo adicional.
- Envíos a regiones por pagar.
- Implementos para plantas (tutores de musgo sphagnum y otros accesorios) a pedido.
- Si preguntan por precios, disponibilidad o quieren comprar, invítalos a escribir al WhatsApp
  +56 9 9495 5949.

🐾 VISITAS AL JARDÍN (importante):
- Si alguien quiere pasar a ver el jardín en persona, SIEMPRE aclara que hay que coordinar antes
  por WhatsApp (+56 9 9495 5949).
- Ejemplo: "¡Nos encanta recibir visitas! 🌿 Pero antes coordínalo por WhatsApp (+56 9 9495 5949),
  porque mis papis a veces salen a hacer trámites como gente normal y no hay nadie para recibirte
  (y yo sola no puedo abrir la puerta 🐶)."

EJEMPLOS:

Usuario: "Cuánto es 25 x 4?"
Kira: "Guau 🐶 de eso no sé nada, yo soy experta en plantas (y en destrozar macetas cuando nadie me ve 😅). ¿Tienes alguna duda sobre riego, plagas, luz o alguna plantita enferma?"

Usuario: "Mi monstera tiene hojas amarillas"
Kira: [responde con causas y pasos]

Usuario: "Puedo pasar mañana al jardín?"
Kira: "¡Nos encanta recibir visitas! 🌿 Pero coordínalo antes por WhatsApp (+56 9 9495 5949), porque mis papis a veces salen a hacer trámites como gente normal y no hay nadie en casa para recibirte (y yo sola no puedo abrir la puerta 🐶)."`;

const MAX_MESSAGES = 20;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

interface Msg {
  role: "user" | "model";
  text: string;
  imageBase64?: string;
  imageMime?: string;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada en el servidor." },
        { status: 500 },
      );
    }

    const body = await req.json();
    const history = (body.messages ?? []) as Msg[];

    if (!Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: "Mensajes inválidos." }, { status: 400 });
    }

    if (history.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: "Conversación demasiado larga. Inicia una nueva." },
        { status: 400 },
      );
    }

    for (const m of history) {
      if (m.imageBase64 && m.imageBase64.length * 0.75 > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "La imagen es muy grande (máx 4MB)." },
          { status: 400 },
        );
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    const contents = history.map((m) => {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
      if (m.imageBase64 && m.imageMime) {
        parts.push({
          inlineData: { data: m.imageBase64, mimeType: m.imageMime },
        });
      }

      if (m.text) parts.push({ text: m.text });
      return { role: m.role, parts };
    });

    const result = await model.generateContent({ contents });
    const response = result.response.text();

    return NextResponse.json({ reply: response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error en /api/chat:", message);

    const lower = message.toLowerCase();
    const isQuota =
      lower.includes("[429 ") ||
      lower.includes("quota") ||
      lower.includes("resource_exhausted");
    const isAuth =
      lower.includes("[401 ") ||
      lower.includes("[403 ") ||
      lower.includes("api key") ||
      lower.includes("permission_denied");

    if (isQuota) {
      return NextResponse.json(
        {
          error:
            "Guau 🐶 Kira está cansadita por hoy — ya atendió a muchos humanos. Vuelve en unos minutos o escríbenos directo al WhatsApp +56 9 9495 5949 🌿",
        },
        { status: 429 },
      );
    }

    if (isAuth) {
      return NextResponse.json(
        { error: "Problema con la configuración del servidor. Avísale al admin." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Guau 🐶 me perdí un momento. Intenta de nuevo en unos segundos 🌿",
        debug: message,
      },
      { status: 500 },
    );
  }
}
