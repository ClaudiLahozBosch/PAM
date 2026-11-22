// @ts-check
// El sueldo del mes, de Mi PJ (pam-mi-pj.user.js 1.7.1) tal cual.
// Cada mes se abre «Sueldos de <mes anterior>» en Sueldos Mensuales: pedís con el formulario, un inspector
// contesta nombrándote y después lo sumás a la bóveda.
import { normPalabras as norm, escRe, numForo as num } from '../core/texto.js?v=2.5.0';

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const S_NEG = /\b(falta|faltan|vuelve a postear|volve a postear|corrige|corregi|no es correct|no son correct|no esta correct|incorrect|no (se )?puede cobrar|no puedes cobrar|no podes cobrar|desgraciadamente|lamentablemente|no es valid|no son valid|no cuenta|no computa|denegad|rechazad)/;
const S_POS = /\b(es correct|son correct|esta correct|estan correct|pued(e|es|en) (agregar|anadir|sumar)|podeis (agregar|anadir|sumar)|podes (agregar|anadir|sumar)|aprobad|validad|disfrut)/;

export function montoSueldo(t) {
  const m = String(t).match(/Sueldo\s+total\s*»\s*:?\s*([\d.,]+)/i) || String(t).match(/Sueldo\s*»\s*:?\s*([\d.,]+)/i);
  return m ? num(m[1]) : null;
}

/** Lo que dice un inspector de vos: la frase que te nombra (o la siguiente, si esa es solo tu nombre). */
export function veredicto(texto, reNom) {
  const frases = String(texto).split(/[.!?¡¿\n]+|(?=@)/);
  let out = null;
  frases.forEach((f, i) => {
    const n = norm(f); if (!reNom.test(n)) return;
    const cand = [n]; if (n.length < 40 && frases[i + 1]) cand.push(norm(frases[i + 1]));
    for (const g of cand) {
      if (S_NEG.test(g)) { out = { v: 'corregir', frase: f.replace(/\s+/g, ' ').trim().slice(0, 220) }; break; }
      if (S_POS.test(g)) { out = { v: 'aprobado' }; break; }
    }
  });
  return out;
}

/** Mes (0-11) de un tema «Sueldos de octubre», o -1. */
export const mesDelTema = titulo => MESES.indexOf(norm(String(titulo).replace(/^Sueldos\s+de\s+/i, '')).split(' ')[0]);

/** De los temas del subforo, el de este mes (o el del anterior); si no está abierto, null. */
export function temaDelMes(temas, hoy = new Date()) {
  const mesAnt = (hoy.getMonth() + 11) % 12;
  const t = temas.find(x => /^Sueldos\s+de\s+\S+/i.test(x.titulo));
  if (!t || (mesDelTema(t.titulo) !== mesAnt && mesDelTema(t.titulo) !== hoy.getMonth())) return null;
  return t;
}

/**
 * Tu pedido y la última respuesta de un inspector, a partir de todos los mensajes del tema.
 * @param {{ id: string, autor: string, fecha: string, texto: string }[]} posts en orden
 * @param {string} yo el nombre de la cuenta
 */
export function pedidoYRespuesta(posts, yo) {
  const n = norm(yo), pila = n.split(' ')[0];
  const reNom = new RegExp(`(^| )(${escRe(n)}${pila.length >= 3 && pila !== n ? '|' + escRe(pila) : ''})( |$)`);
  let pedido = null, resp = null;
  posts.slice(1).forEach(p => {
    if (norm(p.autor) === n) { if (/sueldo/i.test(p.texto)) { pedido = { id: +p.id, fecha: p.fecha, monto: montoSueldo(p.texto) }; resp = null; } return; }
    if (!pedido) return;
    const v = veredicto(p.texto, reNom);
    if (v) resp = Object.assign(v, { id: +p.id, autor: p.autor, fecha: p.fecha });
  });
  return { pedido, resp };
}

/** Estado final, con la bóveda: ¿ya sumaste el sueldo aprobado? */
export function estadoSueldo(S, B) {
  if (!S) return null;
  if (S.estado === 'sinTema') return { k: 'sinTema' };
  if (!S.pedido) return { k: 'sinPedir' };
  if (!S.resp) return { k: 'esperando' };
  if (S.resp.v === 'corregir') return { k: 'corregir' };
  /* enlace a tu pedido o a la aprobación (aunque sea un mensaje viejo editado); si no, un movimiento posterior que hable de sueldo o sume lo mismo */
  const P = (B && B.propios) || [], ids = [S.resp.id, S.pedido.id].join('|');
  const fuerte = new RegExp(`(/t${S.tid}[^#\\s]*#|[?&]p=)(${ids})\\b`);
  const suma = P.find(p => fuerte.test(p.enl)) || P.find(p => p.id > S.resp.id && (p.sueldo || (S.pedido.monto && p.d === S.pedido.monto)));
  return suma ? { k: 'cobrado', post: suma.id } : { k: 'aprobado', sinBoveda: !B };
}

/* ---------------- 2.5.0 · pedir el sueldo de un rol de empleo ---------------- */
// Lo que dice el foro (Sueldos Mensuales: «Funcionamiento y listado de Sueldos» y «Formularios para solicitar sueldo»):
//   · el rol tiene que estar terminado, y un rol de empleo no se cobra dos veces;
//   · cada mes se cobra 1 cargo y 1 rol de empleo por personaje;
//   · se cobra con el nivel de empleo que se tenía al terminar el rol (no el de ahora);
//   · el sueldo sale de la tabla: categoría del empleo (Muy Bajo … Muy Alto) × nivel (Novato … Legendario).

/** Los niveles de empleo, en el orden de las columnas de `empleos.sueldos` (data/sistema.json). */
export const NIVELES = ['Novato', 'Competente', 'Experto', 'Maestro', 'Legendario'];
const LEMA = s => norm(s).replace(/(as|os|es|a|o|e|s)$/, ''); // «Sanadora» y «Sanador», «Maestra» y «Maestro»
const VACIAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'en', 'contra', 'a', 'por']);
const lemas = s => norm(s).split(' ').filter(w => w && !VACIAS.has(w)).map(LEMA);

/** El nivel de un texto («competente», «Maestra»); si no lo reconoce, -1. */
export function nivelDe(t) {
  const l = LEMA(t);
  return NIVELES.findIndex(n => LEMA(n) === l);
}

/**
 * El campo «Empleos roleros» del perfil (uno por línea: «Veterimago (competente)», «Jugadora de Quidditch Profesional
 * (Cazadora, Maestra)»): el nombre y el nivel (índice de NIVELES, o -1 si no lo pone o no se entiende).
 * @param {string} texto @returns {{ nombre: string, nivel: number, texto: string }[]}
 */
export function empleosDelPerfil(texto) {
  return String(texto || '').split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l && l !== '-').map(l => {
    const m = l.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    const nombre = (m ? m[1] : l).trim();
    const nivel = m ? m[2].split(',').map(nivelDe).find(i => i >= 0) ?? -1 : -1;
    return { nombre, nivel, texto: l };
  });
}

/**
 * Los empleos de data/empleos-foro.txt con su categoría de sueldo («! VETERIMAGO | Medio |»).
 * La categoría queda vacía si el archivo no la dice; «Sin sueldo» se conserva tal cual.
 * @param {string} txt @returns {{ nombre: string, categoria: string }[]}
 */
export function catalogoEmpleos(txt) {
  const out = [];
  String(txt || '').split(/\r?\n/).forEach(l => {
    const m = l.match(/^!\s*([^|]+?)\s*\|\s*([^|]*?)\s*(\||$)/);
    if (m) out.push({ nombre: m[1], categoria: m[2] });
  });
  return out;
}

/**
 * El empleo del catálogo que corresponde a un nombre del perfil: todas sus palabras (sin artículos y sin mirar el
 * género) están en el nombre del perfil; si encajan varios, el más largo («Subdirector de San Mungo» antes que
 * «Sanador»). «Adivinos / Médiums» vale por cualquiera de los dos. Si no encaja ninguno, null.
 */
export function buscarEmpleo(nombre, catalogo) {
  const mios = new Set(lemas(nombre));
  let mejor = null, largo = 0;
  for (const e of catalogo || []) {
    for (const alt of e.nombre.split('/')) {
      const L = lemas(alt);
      if (L.length && L.every(w => mios.has(w)) && L.length > largo) { mejor = e; largo = L.length; }
    }
  }
  return mejor;
}

/**
 * El sueldo de la tabla. @param {Record<string, number[]>} tabla `empleos.sueldos` de data/sistema.json
 * @returns {number|null} null si la categoría no está en la tabla o el nivel no se sabe
 */
export function sueldoDe(tabla, categoria, nivel) {
  const k = Object.keys(tabla || {}).find(c => norm(c) === norm(categoria));
  const v = k && nivel >= 0 ? tabla[k][nivel] : null;
  return typeof v === 'number' ? v : null;
}

// El formulario «Empleo rolero» de «Formularios para solicitar sueldo» (copiado del foro el 22/11/2026).
const ETIQUETA = t => `[size=14][font=Cinzel][color=#6d5737][b]{${t}»[/b][/color][/font][/size]`;

/**
 * El texto del pedido, con el formulario oficial.
 * @param {{ empleo: string, categoria: string, nivel: number, sueldo: number, rol: { url: string, titulo: string }, resumen: string }} f
 */
export function formularioEmpleo(f) {
  return [
    [ETIQUETA('Nombre del empleo'), f.empleo],
    [ETIQUETA('Categoría'), f.categoria],
    [ETIQUETA('Nivel de empleo'), NIVELES[f.nivel] ?? ''],
    [ETIQUETA('Sueldo'), f.sueldo + ' grageas'],
    [ETIQUETA('Enlaces de los roles'), `[url=${f.rol.url}]${f.rol.titulo}[/url]`],
    [ETIQUETA('Resumenes'), String(f.resumen || '').trim()]
  ].map(x => x.join(' ')).join('\n');
}

/** ¿Es (o lleva) un formulario de rol de empleo? El oficial dice «Enlaces de los roles»; hay quien pone «Enlace del rol». */
export const ES_PEDIDO_DE_ROL = /enlaces?\s+de(l|\s+los)?\s+rol/i;

/** ¿El mensaje (su HTML) enlaza el tema `tid`? */
export const enlazaTema = (html, tid) => new RegExp(`/t${tid}(p\\d+)?-`).test(String(html || ''));

/* ---------------- 2.5.0 · el sueldo aplicado en el foro, a la Bóveda de PAM («Terminar en PAM») ---------------- */
/** En el almacén del agente: lo que PAM necesita para apuntar el sueldo en su Bóveda (js/pam/SueldoPam.js). */
export const CLAVE_SUELDO = 'pam.sueldo';

/**
 * @param {{ foro: string, cuenta: { id: number, nombre: string }, pj: string, mes: string, monto: number, enlacePet: string, enlaceAce: string,
 *   numeros: { iniciales: number, actuales: number, totales: number } }} x `numeros`: la bóveda del foro antes y después
 */
export function paqueteSueldo({ foro, cuenta, pj, mes, monto, enlacePet, enlaceAce, numeros }) {
  return { v: 1, creado: new Date().toISOString(), foro, cuenta: { id: cuenta.id, nombre: cuenta.nombre, foro }, pj, mes, monto, enlacePet, enlaceAce, numeros };
}
