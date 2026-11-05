/* ==========================================================
   Agenda familiar
   ========================================================== */

/* ---------- Usuarios ---------- */

// Mismos usuarios que la lista de la compra, en tonos de gris.
// "ini" son las dos letras del círculo (Daniel y Diego empiezan igual).
const USUARIOS = {
    Daniel: { tono: "#161616", ini: "Da" },
    Diego: { tono: "#545350", ini: "Di" },
    Macu: { tono: "#8F8D89", ini: "Mc" },
    Marina: { tono: "#C9C7C2", ini: "Ma", texto: "#161616" }
};

const NOMBRES = Object.keys(USUARIOS);

/* ---------- Utilidades ---------- */

function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

// Fecha local -> "2026-11-05"
function iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "2026-11-05" -> Date local (sin líos de zona horaria)
function aFecha(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function hoyIso() {
    return iso(new Date());
}

function sumarDias(s, n) {
    const d = aFecha(s);
    d.setDate(d.getDate() + n);
    return iso(d);
}

function diasEntre(a, b) {
    return Math.round((aFecha(b) - aFecha(a)) / 86400000);
}

function horaCorta(h) {
    return h ? h.slice(0, 5) : "";
}

// Quita acentos y mayúsculas para buscar
function normalizar(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const fmtLargo = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const fmtLargoAno = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtMes = new Intl.DateTimeFormat("es-ES", { month: "long" });
const fmtCorto = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" });

function mayuscula(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function fechaLarga(s) {
    const d = aFecha(s);
    return (d.getFullYear() === new Date().getFullYear() ? fmtLargo : fmtLargoAno).format(d);
}

function relativo(s) {
    const n = diasEntre(hoyIso(), s);
    if (n === 0) return "Hoy";
    if (n === 1) return "Mañana";
    if (n === 2) return "Pasado mañana";
    if (n === -1) return "Ayer";
    if (n > 2 && n < 7) return `En ${n} días`;
    return "";
}

function plural(n, uno, varios) {
    return `${n} ${n === 1 ? uno : varios}`;
}

/* ---------- Avatares ---------- */

function avatar(nombre) {
    const u = USUARIOS[nombre];
    if (!u) return "";
    return `<span class="avatar" style="--c:${u.tono};--t:${u.texto || "#fff"}">${u.ini}</span>`;
}

function etiquetasPersonas(personas) {
    const validas = (personas || []).filter(p => USUARIOS[p]);
    if (!validas.length) return `<span class="person-tag familia">Toda la familia</span>`;
    return validas.map(p => `<span class="person-tag">${avatar(p)}${escapar(p)}</span>`).join("");
}

/* ---------- Estado ---------- */

let usuario = null;
let eventos = [];
let filtroPersona = "todos";
let pestana = "calendario";
let mesVisto = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let diaSel = hoyIso();
let verPasadas = false;
let busqueda = "";

try {
    const f = localStorage.getItem("agenda-filtro");
    if (f === "todos" || USUARIOS[f]) filtroPersona = f;
} catch (e) { }

/* ---------- ¿Quién eres? ---------- */

const login = document.getElementById("login");
const userButtons = document.getElementById("userButtons");
const chipAvatar = document.getElementById("chipAvatar");
const chipName = document.getElementById("chipName");

function mostrarLogin() {
    userButtons.querySelectorAll(".user-card").forEach(b =>
        b.classList.toggle("active", b.dataset.nombre === usuario));
    login.classList.remove("hidden");
}

function elegirUsuario(nombre) {
    usuario = nombre;
    try { localStorage.setItem("usuario", nombre); } catch (e) { }
    login.classList.add("hidden");
    const u = USUARIOS[nombre];
    chipAvatar.textContent = u.ini;
    chipAvatar.style.setProperty("--c", u.tono);
    chipAvatar.style.setProperty("--t", u.texto || "#fff");
    chipName.textContent = nombre;
}

NOMBRES.forEach(nombre => {
    const b = document.createElement("button");
    b.className = "user-card";
    b.dataset.nombre = nombre;
    b.innerHTML = `${avatar(nombre)}${nombre}`;
    b.addEventListener("click", () => elegirUsuario(nombre));
    userButtons.appendChild(b);
});

document.getElementById("btnChangeUser").addEventListener("click", mostrarLogin);

try {
    const guardado = localStorage.getItem("usuario");
    if (USUARIOS[guardado]) usuario = guardado;
} catch (e) { }

if (usuario) elegirUsuario(usuario);
else mostrarLogin();

/* ---------- Aviso breve ---------- */

const toast = document.getElementById("toast");
let toastTimer;

function avisar(texto, ms = 2600) {
    toast.textContent = texto;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
}

/* ---------- Confirmación ---------- */

const confirmBox = document.getElementById("confirm");

function confirmar(texto, si = "Eliminar") {
    return new Promise(resolve => {
        document.getElementById("confirmText").innerHTML = texto;
        const yes = document.getElementById("confirmYes");
        yes.textContent = si;
        confirmBox.classList.remove("hidden");

        const cerrar = valor => {
            confirmBox.classList.add("hidden");
            confirmBox.onclick = null;
            resolve(valor);
        };

        yes.onclick = () => cerrar(true);
        document.getElementById("confirmNo").onclick = () => cerrar(false);
        confirmBox.onclick = e => { if (e.target === confirmBox) cerrar(false); };
    });
}

/* ---------- Datos ---------- */

function ordenar(lista, desc = false) {
    return [...lista].sort((a, b) => {
        // Las de "todo el día" van antes que las que tienen hora
        const ka = `${a.fecha} ${a.hora ? "1" + a.hora : "0"}`;
        const kb = `${b.fecha} ${b.hora ? "1" + b.hora : "0"}`;
        return desc ? kb.localeCompare(ka) : ka.localeCompare(kb);
    });
}

function pasaFiltro(ev) {
    if (filtroPersona === "todos") return true;
    const p = ev.personas || [];
    // Lo de toda la familia también le toca a cada uno
    return !p.length || p.includes(filtroPersona);
}

function visibles() {
    return eventos.filter(pasaFiltro);
}

async function cargar() {
    const { data, error } = await client
        .from("eventos")
        .select("*")
        .order("fecha", { ascending: true });

    if (error) {
        console.error(error);
        avisar("No se pudo cargar la agenda");
        return;
    }

    eventos = ordenar(data || []);
    pintar();
}

/* ---------- Pintar ---------- */

const summary = document.getElementById("summary");

function pintar() {
    pintarResumen();
    pintarFiltros();

    const buscando = busqueda.trim().length > 0;
    document.getElementById("viewBuscar").classList.toggle("hidden", !buscando);
    document.getElementById("viewNormal").classList.toggle("hidden", buscando);

    if (buscando) return pintarBusqueda();
    if (pestana === "calendario") pintarCalendario();
    else pintarTodas();
}

function pintarResumen() {
    const hoy = hoyIso();
    const n = visibles().filter(e => e.fecha === hoy).length;
    const quien = filtroPersona === "todos" ? "" : ` · ${filtroPersona}`;
    summary.textContent = `${n ? plural(n, "cosa hoy", "cosas hoy") : "Nada hoy"} · ${fmtCorto.format(new Date())}${quien}`;
}

/* Filtro por persona */

const filters = document.getElementById("filters");

function pintarFiltros() {
    const hoy = hoyIso();
    const opciones = ["todos", ...NOMBRES];

    filters.replaceChildren(...opciones.map(id => {
        const b = document.createElement("button");
        const activo = filtroPersona === id;
        b.className = "filter" + (activo ? " active" : "") + (id === "todos" ? " todos" : "");
        b.setAttribute("aria-pressed", activo);
        b.innerHTML = id === "todos" ? "Todos" : `${avatar(id)}${id}`;
        b.addEventListener("click", () => {
            filtroPersona = id;
            try { localStorage.setItem("agenda-filtro", id); } catch (e) { }
            pintar();
        });
        return b;
    }));
}

/* Tarjeta de una cita */

function crearCita(ev, { conFecha = false } = {}) {
    const li = document.createElement("li");
    const pasada = ev.fecha < hoyIso();
    const b = document.createElement("button");
    b.className = "event" + (pasada ? " pasada" : "");

    const hora = horaCorta(ev.hora);

    b.innerHTML = `
        <span class="event-hora ${hora ? "" : "sin-hora"}">${hora || "Todo<br>el día"}</span>
        <span class="event-main">
            ${conFecha ? `<span class="event-fecha">${escapar(fechaLarga(ev.fecha))}</span>` : ""}
            <span class="event-titulo">${escapar(ev.titulo)}</span>
            ${ev.notas ? `<span class="event-notas">${escapar(ev.notas)}</span>` : ""}
            <span class="event-tags">${etiquetasPersonas(ev.personas)}</span>
        </span>`;

    b.addEventListener("click", () => abrirEditor({ ev }));
    li.appendChild(b);
    return li;
}

// Lista agrupada por día ("Hoy · jueves 5 de noviembre")
function crearGrupos(lista) {
    const porDia = new Map();
    lista.forEach(ev => {
        if (!porDia.has(ev.fecha)) porDia.set(ev.fecha, []);
        porDia.get(ev.fecha).push(ev);
    });

    return [...porDia.entries()].map(([fecha, citas]) => {
        const g = document.createElement("section");
        g.className = "grupo";
        const rel = relativo(fecha);
        g.innerHTML = `<h3 class="grupo-titulo">${escapar(mayuscula(fechaLarga(fecha)))}${rel ? `<span class="rel">${rel}</span>` : ""}</h3>`;
        const ul = document.createElement("ul");
        ul.className = "events";
        ul.replaceChildren(...citas.map(ev => crearCita(ev)));
        g.appendChild(ul);
        return g;
    });
}

function separador(texto) {
    const d = document.createElement("div");
    d.className = "separador";
    d.textContent = texto;
    return d;
}

/* ---------- Calendario ---------- */

const calDias = document.getElementById("calDias");
const mesTitulo = document.getElementById("mesTitulo");

function pintarCalendario() {
    const hoy = hoyIso();
    const lista = visibles();

    const porDia = new Map();
    lista.forEach(ev => {
        if (!porDia.has(ev.fecha)) porDia.set(ev.fecha, []);
        porDia.get(ev.fecha).push(ev);
    });

    mesTitulo.textContent = `${mayuscula(fmtMes.format(mesVisto))} ${mesVisto.getFullYear()}`;

    // Empieza en el lunes de la semana del día 1
    const inicio = new Date(mesVisto);
    inicio.setDate(1 - ((inicio.getDay() + 6) % 7));

    const ultimo = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 0);
    const semanas = Math.ceil((((mesVisto.getDay() + 6) % 7) + ultimo.getDate()) / 7);

    const celdas = [];
    for (let i = 0; i < semanas * 7; i++) {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        const s = iso(d);
        const citas = porDia.get(s) || [];

        const b = document.createElement("button");
        b.className = "cal-day"
            + (d.getMonth() !== mesVisto.getMonth() ? " otro-mes" : "")
            + (d.getDay() === 0 || d.getDay() === 6 ? " finde" : "")
            + (s === hoy ? " hoy" : "")
            + (s === diaSel ? " sel" : "");
        b.setAttribute("aria-label", `${fechaLarga(s)}${citas.length ? `, ${plural(citas.length, "cita", "citas")}` : ""}`);

        const puntos = citas.slice(0, 3).map(ev => {
            const p = (ev.personas || []).find(n => USUARIOS[n]);
            return p
                ? `<span class="dot" style="--c:${USUARIOS[p].tono}"></span>`
                : `<span class="dot familia"></span>`;
        }).join("");

        b.innerHTML = `<span class="num">${d.getDate()}</span><span class="dots">${puntos}</span>`;
        b.addEventListener("click", () => {
            diaSel = s;
            if (d.getMonth() !== mesVisto.getMonth())
                mesVisto = new Date(d.getFullYear(), d.getMonth(), 1);
            pintar();
        });
        celdas.push(b);
    }

    calDias.replaceChildren(...celdas);

    // Citas del día elegido
    const delDia = porDia.get(diaSel) || [];
    const rel = relativo(diaSel);
    document.getElementById("diaTitulo").innerHTML =
        `${escapar(fechaLarga(diaSel))}${rel ? `<small>${rel}</small>` : ""}`;
    document.getElementById("diaLista").replaceChildren(...delDia.map(ev => crearCita(ev)));
    document.getElementById("diaVacio").classList.toggle("hidden", delDia.length > 0);
}

function moverMes(n) {
    mesVisto = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + n, 1);
    // Al cambiar de mes se elige el día 1 (o hoy, si es el mes actual)
    const hoy = new Date();
    diaSel = mesVisto.getFullYear() === hoy.getFullYear() && mesVisto.getMonth() === hoy.getMonth()
        ? hoyIso()
        : iso(mesVisto);
    pintar();
}

document.getElementById("mesAnterior").addEventListener("click", () => moverMes(-1));
document.getElementById("mesSiguiente").addEventListener("click", () => moverMes(1));
mesTitulo.addEventListener("click", () => {
    const d = new Date();
    mesVisto = new Date(d.getFullYear(), d.getMonth(), 1);
    diaSel = hoyIso();
    pintar();
});

// Deslizar el calendario a los lados para cambiar de mes
(() => {
    const cal = document.querySelector(".cal");
    let x0 = null, y0 = null;
    cal.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    cal.addEventListener("touchend", e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        const dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) moverMes(dx < 0 ? 1 : -1);
    });
})();

document.getElementById("btnAnadirDia").addEventListener("click", () => abrirEditor({ fecha: diaSel }));

/* ---------- Todas ---------- */

const btnPasadas = document.getElementById("btnPasadas");

function pintarTodas() {
    const hoy = hoyIso();
    const lista = visibles();
    const proximas = lista.filter(e => e.fecha >= hoy);
    const pasadas = ordenar(lista.filter(e => e.fecha < hoy), true);

    const cont = document.getElementById("todasLista");
    const bloques = crearGrupos(proximas);

    if (verPasadas && pasadas.length) {
        bloques.push(separador("Pasadas"));
        bloques.push(...crearGrupos(pasadas));
    }

    cont.replaceChildren(...bloques);
    document.getElementById("todasVacio").classList.toggle("hidden", proximas.length > 0);

    btnPasadas.classList.toggle("hidden", !pasadas.length);
    btnPasadas.textContent = verPasadas
        ? "Ocultar las pasadas"
        : `Ver también las pasadas (${pasadas.length})`;
}

btnPasadas.addEventListener("click", () => {
    verPasadas = !verPasadas;
    pintar();
});

/* ---------- Pestañas ---------- */

const tabs = document.querySelectorAll(".tab");

function cambiarPestana(nombre) {
    pestana = nombre;
    tabs.forEach(t => {
        const activa = t.dataset.tab === nombre;
        t.classList.toggle("active", activa);
        t.setAttribute("aria-selected", activa);
    });
    document.getElementById("viewCalendario").classList.toggle("hidden", nombre !== "calendario");
    document.getElementById("viewTodas").classList.toggle("hidden", nombre !== "todas");
    pintar();
}

tabs.forEach(t => t.addEventListener("click", () => cambiarPestana(t.dataset.tab)));

/* ---------- Buscador ---------- */

const txtBuscar = document.getElementById("txtBuscar");
const btnLimpiar = document.getElementById("btnLimpiar");

function textoDe(ev) {
    const personas = (ev.personas || []).length ? ev.personas.join(" ") : "familia todos";
    return normalizar(`${ev.titulo} ${ev.notas || ""} ${personas} ${fechaLarga(ev.fecha)}`);
}

function pintarBusqueda() {
    const terminos = normalizar(busqueda).split(/\s+/).filter(Boolean);
    const hoy = hoyIso();
    const encontrados = visibles().filter(ev => {
        const t = textoDe(ev);
        return terminos.every(x => t.includes(x));
    });

    const proximas = encontrados.filter(e => e.fecha >= hoy);
    const pasadas = ordenar(encontrados.filter(e => e.fecha < hoy), true);

    const info = document.getElementById("buscarInfo");
    info.textContent = encontrados.length
        ? `${plural(encontrados.length, "resultado", "resultados")}${filtroPersona !== "todos" ? ` para ${filtroPersona}` : ""}`
        : `No hay nada con «${busqueda.trim()}»${filtroPersona !== "todos" ? ` para ${filtroPersona}` : ""}.`;

    const bloques = [];
    if (proximas.length) {
        const ul = document.createElement("ul");
        ul.className = "events";
        ul.replaceChildren(...proximas.map(ev => crearCita(ev, { conFecha: true })));
        bloques.push(ul);
    }
    if (pasadas.length) {
        bloques.push(separador("Pasadas"));
        const ul = document.createElement("ul");
        ul.className = "events";
        ul.style.marginTop = "12px";
        ul.replaceChildren(...pasadas.map(ev => crearCita(ev, { conFecha: true })));
        bloques.push(ul);
    }
    document.getElementById("buscarLista").replaceChildren(...bloques);
}

txtBuscar.addEventListener("input", () => {
    busqueda = txtBuscar.value;
    btnLimpiar.classList.toggle("hidden", !busqueda);
    pintar();
});

txtBuscar.addEventListener("keydown", e => {
    if (e.key === "Enter") txtBuscar.blur();
    if (e.key === "Escape") limpiarBusqueda();
});

function limpiarBusqueda() {
    txtBuscar.value = "";
    busqueda = "";
    btnLimpiar.classList.add("hidden");
    pintar();
}

btnLimpiar.addEventListener("click", limpiarBusqueda);

/* ---------- Añadir / editar ---------- */

const editor = document.getElementById("editor");
const form = document.getElementById("form");
const fTitulo = document.getElementById("fTitulo");
const fFecha = document.getElementById("fFecha");
const fHora = document.getElementById("fHora");
const fNotas = document.getElementById("fNotas");
const fPersonas = document.getElementById("fPersonas");
const fPersonasHint = document.getElementById("fPersonasHint");
const btnBorrar = document.getElementById("btnBorrar");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");
const fotoInfo = document.getElementById("fotoInfo");

let editando = null;          // cita que se está editando (o null si es nueva)
let personasSel = new Set();
let colaFoto = null;          // { citas: [...], i, foto } cuando vienen de una foto

function pintarSelectorPersonas() {
    fPersonas.replaceChildren(...NOMBRES.map(nombre => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "person-opt";
        b.setAttribute("aria-pressed", personasSel.has(nombre));
        b.innerHTML = `${avatar(nombre)}${nombre}`;
        b.addEventListener("click", () => {
            personasSel.has(nombre) ? personasSel.delete(nombre) : personasSel.add(nombre);
            pintarSelectorPersonas();
        });
        return b;
    }));

    fPersonasHint.textContent = personasSel.size
        ? `Para ${[...personasSel].join(", ").replace(/, ([^,]*)$/, " y $1")}.`
        : "Sin marcar a nadie, es de toda la familia.";
}

function abrirEditor({ ev = null, fecha = null, borrador = null } = {}) {
    if (!usuario) return mostrarLogin();

    editando = ev;
    const datos = ev || borrador || {};

    document.getElementById("formTitle").textContent = ev ? "Editar cita" : "Nueva cita";
    fTitulo.value = datos.titulo || "";
    fFecha.value = datos.fecha || fecha || (pestana === "calendario" ? diaSel : hoyIso());
    fHora.value = horaCorta(datos.hora);
    fNotas.value = datos.notas || "";

    personasSel = new Set(datos.personas || (filtroPersona !== "todos" && !ev && !borrador ? [filtroPersona] : []));
    pintarSelectorPersonas();

    btnBorrar.classList.toggle("hidden", !ev);

    // Si viene de una foto, se enseña la foto y cuántas quedan
    if (colaFoto && !ev) {
        fotoInfo.classList.remove("hidden");
        document.getElementById("fotoThumb").src = colaFoto.foto;
        document.getElementById("fotoCuenta").textContent = colaFoto.citas.length > 1
            ? `Cita ${colaFoto.i + 1} de ${colaFoto.citas.length} · revísala y guarda`
            : "Revísala y guarda";
        btnCancelar.textContent = colaFoto.i < colaFoto.citas.length - 1 ? "Saltar" : "Cancelar";
    } else {
        fotoInfo.classList.add("hidden");
        btnCancelar.textContent = "Cancelar";
    }

    editor.classList.remove("hidden");
    editor.querySelector(".sheet").scrollTop = 0;
    if (!ev && !borrador) setTimeout(() => fTitulo.focus(), 60);
}

function cerrarEditor() {
    editor.classList.add("hidden");
    editando = null;
}

// Pasa a la siguiente cita leída de la foto (si hay)
function siguienteDeFoto() {
    if (!colaFoto) return cerrarEditor();
    colaFoto.i++;
    if (colaFoto.i < colaFoto.citas.length) {
        abrirEditor({ borrador: colaFoto.citas[colaFoto.i] });
    } else {
        colaFoto = null;
        cerrarEditor();
    }
}

btnCancelar.addEventListener("click", () => colaFoto ? siguienteDeFoto() : cerrarEditor());

editor.addEventListener("click", e => {
    if (e.target === editor && !colaFoto) cerrarEditor();
});

document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!confirmBox.classList.contains("hidden")) return confirmBox.click();
    if (!editor.classList.contains("hidden")) { colaFoto = null; cerrarEditor(); }
});

form.addEventListener("submit", async e => {
    e.preventDefault();

    const datos = {
        titulo: fTitulo.value.trim(),
        fecha: fFecha.value,
        hora: fHora.value || null,
        personas: NOMBRES.filter(n => personasSel.has(n)),
        notas: fNotas.value.trim() || null
    };

    if (!datos.titulo) return fTitulo.focus();
    if (!datos.fecha) return fFecha.focus();

    btnGuardar.disabled = true;

    const { error } = editando
        ? await client.from("eventos").update(datos).eq("id", editando.id)
        : await client.from("eventos").insert({ ...datos, usuario });

    btnGuardar.disabled = false;

    if (error) {
        console.error(error);
        avisar("No se pudo guardar. Inténtalo otra vez.");
        return;
    }

    avisar(editando ? "Cita actualizada" : `Apuntado: ${fmtCorto.format(aFecha(datos.fecha))}`);

    // Si con el filtro actual no se vería, se quita el filtro
    if (!pasaFiltro(datos)) {
        filtroPersona = "todos";
        try { localStorage.setItem("agenda-filtro", "todos"); } catch (e) { }
    }

    // Se lleva el calendario al día de la cita
    diaSel = datos.fecha;
    const d = aFecha(datos.fecha);
    mesVisto = new Date(d.getFullYear(), d.getMonth(), 1);

    if (colaFoto && !editando) siguienteDeFoto();
    else cerrarEditor();

    await cargar();
});

btnBorrar.addEventListener("click", async () => {
    if (!editando) return;
    const ev = editando;
    if (!await confirmar(`¿Eliminar <strong>${escapar(ev.titulo)}</strong> del ${escapar(fechaLarga(ev.fecha))}?`)) return;

    const { error } = await client.from("eventos").delete().eq("id", ev.id);
    if (error) {
        console.error(error);
        avisar("No se pudo eliminar");
        return;
    }
    cerrarEditor();
    avisar("Cita eliminada");
    await cargar();
});

document.getElementById("btnNueva").addEventListener("click", () => {
    colaFoto = null;
    abrirEditor();
});

/* ---------- Foto de una nota -> citas ---------- */

const inputFoto = document.getElementById("foto");
const leyendo = document.getElementById("leyendo");

document.getElementById("btnFoto").addEventListener("click", () => {
    if (!usuario) return mostrarLogin();
    inputFoto.value = "";
    inputFoto.click();
});

// Reduce la foto para que el envío sea rápido (máx. 1600 px, JPEG)
function comprimir(archivo, max = 1600) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload = () => {
            const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.naturalWidth * escala);
            canvas.height = Math.round(img.naturalHeight * escala);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo abrir la foto")); };
        img.src = url;
    });
}

inputFoto.addEventListener("change", async () => {
    const archivo = inputFoto.files && inputFoto.files[0];
    if (!archivo) return;

    leyendo.classList.remove("hidden");

    try {
        const foto = await comprimir(archivo);

        const res = await fetch("/api/leer-foto", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario,
                hoy: hoyIso(),
                imagen: foto.split(",")[1],
                tipo: "image/jpeg"
            })
        });

        const datos = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(datos.error || "No se pudo leer la foto");

        const citas = datos.eventos || [];
        if (!citas.length) {
            avisar("No he encontrado ninguna cita en la foto", 3200);
            return;
        }

        colaFoto = { citas, i: 0, foto };
        abrirEditor({ borrador: citas[0] });

    } catch (e) {
        console.error(e);
        avisar(e.message || "No se pudo leer la foto", 3500);
    } finally {
        leyendo.classList.add("hidden");
    }
});

/* ---------- Tiempo real ---------- */

let recarga;
function recargarPronto() {
    clearTimeout(recarga);
    recarga = setTimeout(cargar, 250);
}

client
    .channel("eventos-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, recargarPronto)
    .subscribe();

// Al volver a la app (o cambiar de día) se refresca
let ultimoDia = hoyIso();
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (ultimoDia !== hoyIso()) {
        ultimoDia = hoyIso();
        diaSel = ultimoDia;
        const d = new Date();
        mesVisto = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    cargar();
});

pintar();
cargar();
