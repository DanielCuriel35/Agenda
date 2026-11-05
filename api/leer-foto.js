// POST /api/leer-foto
//
//   { usuario, hoy: "2026-11-05", imagen: "<base64>", tipo: "image/jpeg" }
//
// Manda la foto a Gemini (la IA de Google, con nivel gratuito) y devuelve las citas que
// encuentre escritas, listas para revisar en la app:
//
//   { eventos: [{ titulo, fecha, hora, personas, notas }] }
//
// Variables de entorno en Vercel:
//   GEMINI_API_KEY   clave gratis de https://aistudio.google.com/apikey (obligatoria)
//   GEMINI_MODEL     opcional; por defecto gemini-flash-latest

const USUARIOS = ["Daniel", "Diego", "Macu", "Marina"];
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MODELO = process.env.GEMINI_MODEL || "gemini-flash-latest";

// Forma que debe tener la respuesta de la IA (JSON)
const ESQUEMA = {
    type: "OBJECT",
    properties: {
        eventos: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    titulo: { type: "STRING", description: "Qué es, corto y con mayúscula inicial. Ej.: «Médico», «Dentista», «Cumple de la abuela». Sin la persona ni la fecha." },
                    fecha: { type: "STRING", description: "Fecha en formato AAAA-MM-DD." },
                    hora: { type: "STRING", nullable: true, description: "Hora en formato HH:MM (24 h) o null si no pone hora." },
                    personas: {
                        type: "ARRAY",
                        items: { type: "STRING", enum: USUARIOS },
                        description: "Para quién es. Vacío si no se dice o si es para toda la familia."
                    },
                    notas: { type: "STRING", nullable: true, description: "Otros detalles escritos (lugar, qué llevar…) o null." }
                },
                required: ["titulo", "fecha", "personas"]
            }
        }
    },
    required: ["eventos"]
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

Responde solo con el JSON pedido.`;
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

    const clave = process.env.GEMINI_API_KEY;
    if (!clave)
        return res.status(500).json({ error: "Falta GEMINI_API_KEY en Vercel" });

    const { usuario, hoy, imagen, tipo = "image/jpeg" } = leerCuerpo(req);

    if (!USUARIOS.includes(usuario))
        return res.status(400).json({ error: "Usuario no válido" });

    if (typeof imagen !== "string" || imagen.length < 100 || !TIPOS.includes(tipo))
        return res.status(400).json({ error: "Foto no válida" });

    if (imagen.length > 4_000_000)
        return res.status(413).json({ error: "La foto es demasiado grande" });

    const fechaHoy = /^\d{4}-\d{2}-\d{2}$/.test(hoy || "") ? hoy : new Date().toISOString().slice(0, 10);

    try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODELO)}:generateContent`, {
            method: "POST",
            headers: {
                "x-goog-api-key": clave,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: instrucciones(fechaHoy) }] },
                contents: [{
                    role: "user",
                    parts: [
                        { inline_data: { mime_type: tipo, data: imagen } },
                        { text: "Saca las citas de esta foto." }
                    ]
                }],
                generationConfig: {
                    temperature: 0,
                    responseMimeType: "application/json",
                    responseSchema: ESQUEMA
                }
            })
        });

        const datos = await r.json().catch(() => ({}));

        if (!r.ok) {
            console.error("Gemini", r.status, JSON.stringify(datos));
            const msg = r.status === 429
                ? "Se ha acabado el cupo gratis de hoy. Prueba mañana."
                : "La IA no ha podido leer la foto. Prueba otra vez.";
            return res.status(502).json({ error: msg });
        }

        const texto = (datos.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
        let json = {};
        try { json = JSON.parse(texto); } catch (e) { console.error("JSON no válido", texto); }

        const eventos = (json.eventos || []).map(limpiar).filter(Boolean).slice(0, 20);

        return res.status(200).json({ eventos });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "No se pudo leer la foto" });
    }
};
