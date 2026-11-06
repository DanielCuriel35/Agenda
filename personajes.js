// Dibujos de la familia (los usan la portada y el minijuego)

const TINTA = "#1B1B1B";
const PIEL = "#F2CFB6";

// Cada uno con su pelo, gafas, ropa y su frase. Todos miran a la derecha;
// para ir a la izquierda se da la vuelta el dibujo.
const FAMILIA = [
    {
        nombre: "Daniel",
        frase: "Ya está bueno, eh",
        camiseta: "#F7F6F2", pantalon: "#8EA8C3", vel: 30,
        detrasCabeza: "",
        pelo: `<path d="M13 30Q11 11 32 10Q53 11 51 29Q47 22 41 24Q37 18 31 22Q25 18 20 24Q16 24 13 30Z" fill="#2A221E"/>
               <circle cx="20" cy="15" r="5" fill="#2A221E"/><circle cx="28" cy="10.5" r="5.5" fill="#2A221E"/>
               <circle cx="37" cy="10.5" r="5.5" fill="#2A221E"/><circle cx="45" cy="15" r="5" fill="#2A221E"/>`,
        cara: `<path d="M33 46q3 2.5 6 0" fill="none" stroke="#2A221E" stroke-width="2.4" stroke-linecap="round"/>
               <path d="M31 40.5q4-1.6 8 0" fill="none" stroke="#2A221E" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`,
        gafas: { color: TINTA, grosor: 1.8, radio: 2 },
        ropa: `<path d="M26 53q6 4 12 0" fill="none" stroke="#1F2A44" stroke-width="2.4" stroke-linecap="round"/>`
    },
    {
        nombre: "Diego",
        frase: "¡Cuánto trabaja mi hijo!",
        camiseta: "#232323", pantalon: "#2F3B50", vel: 22,
        detrasCabeza: "",
        pelo: `<path d="M14 27Q13 13 22 11Q24 5 30 7.5Q34 3 39 7Q42 4.5 45 9Q51 13 50 27Q46 20 32 20Q18 20 14 27Z" fill="#B99C68"/>
               <path d="M24 12q3-3 6-2M33 9.5q3-2.5 6-1" fill="none" stroke="#9C8152" stroke-width="1.6" stroke-linecap="round"/>`,
        cara: `<path d="M15 33Q16 51 32 51Q48 51 49 33Q47 44 40 44Q36 40.5 32 41.5Q28 40.5 24 44Q17 44 15 33Z" fill="#A7A196"/>
               <path d="M29 40.5q4-2 8 0" fill="none" stroke="#8C867B" stroke-width="2.6" stroke-linecap="round"/>`,
        gafas: { color: TINTA, grosor: 3, radio: 1.6 },
        ropa: ""
    },
    {
        nombre: "Macu",
        frase: "¡Arlo, que me dejes en paz!",
        camiseta: "#EDE3CF", pantalon: "#E2D6BE", vel: 24,
        detrasCabeza: "",
        // pelo corto oscuro, con flequillo de lado
        pelo: `<path d="M12.5 33Q10 10 31 9Q52 8.5 51.5 29Q50 24 47 22.5Q45 26.5 41 26Q32 25 26 20.5Q22 25 16.5 26.5Q15 30 12.5 33Z" fill="#2B211D"/>
               <path d="M26 20.5Q33 24.5 41 26" fill="none" stroke="#45362F" stroke-width="1.4" stroke-linecap="round"/>
               <path d="M20 13Q27 9.5 35 11" fill="none" stroke="#45362F" stroke-width="1.4" stroke-linecap="round"/>
               <circle cx="13.5" cy="41" r="2.6" fill="none" stroke="#C9A227" stroke-width="1.6"/>
               <circle cx="50.5" cy="41" r="2.6" fill="none" stroke="#C9A227" stroke-width="1.6"/>`,
        cara: "",
        // gafas de pasta gris azulado
        gafas: { color: "#4B5E72", grosor: 2.8, radio: 4 },
        // collar largo con medalla y bolso blanco cruzado
        ropa: `<path d="M27 51L32 62L37 51" fill="none" stroke="#3A2E28" stroke-width="1.2" stroke-linejoin="round"/>
               <circle cx="32" cy="63.5" r="2.6" fill="#6B4A35" stroke="#3A2E28" stroke-width="1.2"/>
               <path d="M43 51.5L21 69" stroke="${TINTA}" stroke-width="4.6" stroke-linecap="round"/>
               <path d="M43 51.5L21 69" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
               <rect x="11" y="66" width="16" height="12" rx="3" fill="#FFFFFF" stroke="${TINTA}" stroke-width="2"/>
               <path d="M14 70h10" stroke="#C9C4BA" stroke-width="1.4" stroke-linecap="round"/>`
    },
    {
        nombre: "Marina",
        frase: "¡ESPERAAAA!",
        camiseta: "#F4EFE7", pantalon: "#4B2D2A", vel: 38,
        // pelo largo por detrás
        detrasCabeza: `<path d="M12 28Q12 8 32 8Q52 8 52 28L53 62Q53 66 48 66L16 66Q11 66 11 62Z" fill="#5B3B29" stroke="${TINTA}" stroke-width="2.5"/>`,
        // flequillo recto
        pelo: `<path d="M13.5 29Q13 11 32 11Q51 11 50.5 29L50 25.5Q32 27.5 14 25.5Z" fill="#5B3B29"/>`,
        cara: "",
        gafas: null,
        // patito amarillo en brazos
        ropa: `<g transform="translate(36 60)">
                   <ellipse cx="0" cy="3" rx="9" ry="7" fill="#F6C836" stroke="${TINTA}" stroke-width="2"/>
                   <circle cx="2" cy="-5" r="5.5" fill="#F6C836" stroke="${TINTA}" stroke-width="2"/>
                   <path d="M7 -5.5l4.5 1.5-4.5 1.5z" fill="#F08A24" stroke="${TINTA}" stroke-width="1.2" stroke-linejoin="round"/>
                   <circle cx="3.6" cy="-6.2" r="1.1" fill="${TINTA}"/>
               </g>`
    }
];

function dibujo(p, { piernaA = null, piernaB = null } = {}) {
    const g = p.gafas;
    const gafas = g ? `<g fill="none" stroke="${g.color}" stroke-width="${g.grosor}">
            <rect x="21.5" y="28" width="11" height="8.5" rx="${g.radio}"/>
            <rect x="35" y="28" width="11" height="8.5" rx="${g.radio}"/>
            <path d="M32.5 31.5q1.25-1.2 2.5 0"/>
        </g>` : "";

    return `<svg viewBox="0 0 64 92" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="89" rx="16" ry="3" fill="#000" opacity=".1"/>
        <g class="pierna-a"${piernaA === null ? "" : ` transform="rotate(${piernaA} 26 74)"`}>
            <line x1="26" y1="74" x2="26" y2="85" stroke="${p.pantalon}" stroke-width="6" stroke-linecap="round"/>
            <ellipse cx="27.5" cy="86.5" rx="4.5" ry="2.6" fill="#fff" stroke="${TINTA}" stroke-width="1.8"/>
        </g>
        <g class="pierna-b"${piernaB === null ? "" : ` transform="rotate(${piernaB} 38 74)"`}>
            <line x1="38" y1="74" x2="38" y2="85" stroke="${p.pantalon}" stroke-width="6" stroke-linecap="round"/>
            <ellipse cx="39.5" cy="86.5" rx="4.5" ry="2.6" fill="#fff" stroke="${TINTA}" stroke-width="1.8"/>
        </g>
        <g class="cuerpo">
            ${p.detrasCabeza}
            <rect x="18" y="50" width="28" height="27" rx="11" fill="${p.camiseta}" stroke="${TINTA}" stroke-width="2.5"/>
            <circle cx="32" cy="30" r="19" fill="${PIEL}" stroke="${TINTA}" stroke-width="2.5"/>
            ${p.cara}
            ${p.pelo}
            <g class="ojos">
                <circle cx="27.5" cy="32.5" r="2.2" fill="${TINTA}"/>
                <circle cx="40.5" cy="32.5" r="2.2" fill="${TINTA}"/>
            </g>
            ${gafas}
            <circle cx="22" cy="40" r="2.6" fill="#E8828B" opacity=".45"/>
            <circle cx="46" cy="40" r="2.6" fill="#E8828B" opacity=".45"/>
            ${p.nombre === "Diego" ? "" : `<path d="M31 43q3.5 3 7 0" fill="none" stroke="${TINTA}" stroke-width="2.2" stroke-linecap="round"/>`}
            ${p.ropa}
        </g>
    </svg>`;
}

// Solo la cabeza (para avatares pequeños)
function retrato(p) {
    return dibujo(p, { piernaA: 0, piernaB: 0 }).replace('viewBox="0 0 64 92"', 'viewBox="7 3 50 50"');
}

function personaje(nombre) {
    return FAMILIA.find(p => p.nombre === nombre || (nombre === "Dani" && p.nombre === "Daniel")) || null;
}
