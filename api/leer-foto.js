// POST /api/leer-foto
//
//   { usuario, hoy: "2026-11-05", imagen: "<base64>", tipo: "image/jpeg" }
//
// Manda la foto a Claude (la IA de Anthropic) y devuelve las citas que
// encuentre escritas, listas para revisar en la app:
//
//   { eventos: [{ titulo, fecha, hora, personas, notas }] }
//
// Variables de entorno en Vercel:
//   ANTHROPIC_API_KEY   clave de https://console.anthropic.com (obligatoria)
//   ANTHROPIC_MODEL     opcional; por defecto claude-sonnet-5-5

const USUARIOS = ["Daniel", "Diego", "Macu", "Marina"];
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

// La IA rellena esta "herramienta": así siempre devuelve datos ordenados.
const HERRAMIENTA = {
    name: "guardar_citas",
    description: "Guarda las citas o eventos encontrados en la imagen.",
    input_schema: {
        type: "object",
        properties: {
            eventos: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        titulo: { type: "string", description: "Qué es, corto y con mayúscula inicial. Ej.: «Médico», «Dentista», «Cumple de la abuela». Sin la persona ni la fecha." },
                        fecha: { type: "string", description: "Fecha en formato AAAA-MM-DD." },
                        hora: { type: ["string", "null"], description: "Hora en formato HH:MM (24 h) o null si no pone hora." },
                        personas: {
                            type: "array",
                            items: { type: "string", enum: USUARIOS },
                            description: "Para quién es. Vacío si no se dice o si es para toda la familia."
                        },
                        notas: { type: ["string", "null"], description: "Otros detalles escritos (lugar, qué llevar…) o null." }
                    },
                    required: ["titulo", "fecha", "hora", "personas", "notas"]
                }
            }
        },
        required: ["eventos"]
    }
};

function instrucciones(hoy) {
    const d = new Date(`${hoy}T12:00:00Z`);
    const dia = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);

    return `Eres el ayudante de la agenda de una familia de cuatro: ${USUARIOS.join(", ")}.
Hoy es ${dia} (${hoy}).

Lee lo que pone en la foto (puede ser una nota a mano, un papel del colegio, una cita médica, una captura de pantalla…) y saca cada cita o evento con fecha.

Reglas:
- Si no pone año, usa la próxima vez que llegue esa fecha a partir de hoy (si ya ha pasado este año, el año que viene).
- Entiende fechas relativas («mañana», «el lunes», «el 9») a partir de hoy.
- Horas en 24 h: «14.50», «2:50 de la tarde» → 14:50. Si no hay hora, null.
- Personas: «Dani» = Daniel, «Die»/«Dieguito» = Diego, «Mari» = Marina, «Macu» = Macu. Si no se nombra a nadie de la familia, deja la lista vacía. No inventes personas.
- El título va sin la persona ni la fecha: «médico Dani» → titulo «Médico», personas ["Daniel"].
- Si algo no se lee bien, haz tu mejor interpretación; la familia lo revisará antes de guardarlo.
- Si en la foto no hay ninguna cita con fecha, devuelve la lista vacía.

Responde solo llamando a la herramienta guardar_citas.`;
}

function leerCuerpo(req) {
    if (req.body && typeof req.body === "object") return req.body;
    try { return JSON.parse(req.body || "{}"); } catch (e) { return {}; }
}

// Comprueba y limpia lo que devuelve la IA
function limpiar(ev) {
    const titulo = String(ev?.titulo || "").trim().slice(0, 120);
    const fecha = String(ev?.fecha || "").trim();
    let hora = ev?.hora ? String(ev.hora).trim().replace(".", ":") : null;

    if (!titulo || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(Date.parse(fecha))) return null;

    if (hora) {
        const m = hora.match(/^(\d{1,2}):(\d{2})/);
        hora = m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
    }

    const personas = [...new Set((Array.isArray(ev.personas) ? ev.personas : []).filter(p => USUARIOS.includes(p)))];
    const notas = ev.notas ? String(ev.notas).trim().slice(0, 500) || null : null;

    return { titulo, fecha, hora, personas, notas };
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Método no permitido" });
    }

    const clave = process.env.ANTHROPIC_API_KEY;
    if (!clave)
        return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en Vercel" });

    const { usuario, hoy, imagen, tipo = "image/jpeg" } = leerCuerpo(req);

    if (!USUARIOS.includes(usuario))
        return res.status(400).json({ error: "Usuario no válido" });

    if (typeof imagen !== "string" || imagen.length < 100 || !TIPOS.includes(tipo))
        return res.status(400).json({ error: "Foto no válida" });

    if (imagen.length > 4_000_000)
        return res.status(413).json({ error: "La foto es demasiado grande" });

    const fechaHoy = /^\d{4}-\d{2}-\d{2}$/.test(hoy || "") ? hoy : new Date().toISOString().slice(0, 10);

    try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": clave,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            body: JSON.stringify({
                model: MODELO,
                max_tokens: 1500,
                system: instrucciones(fechaHoy),
                tools: [HERRAMIENTA],
                tool_choice: { type: "tool", name: HERRAMIENTA.name },
                messages: [{
                    role: "user",
                    content: [
                        { type: "image", source: { type: "base64", media_type: tipo, data: imagen } },
                        { type: "text", text: "Saca las citas de esta foto." }
                    ]
                }]
            })
        });

        const datos = await r.json().catch(() => ({}));

        if (!r.ok) {
            console.error("Anthropic", r.status, JSON.stringify(datos));
            return res.status(502).json({ error: "La IA no ha podido leer la foto. Prueba otra vez." });
        }

        const llamada = (datos.content || []).find(b => b.type === "tool_use");
        const eventos = (llamada?.input?.eventos || []).map(limpiar).filter(Boolean).slice(0, 20);

        return res.status(200).json({ eventos });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "No se pudo leer la foto" });
    }
};
