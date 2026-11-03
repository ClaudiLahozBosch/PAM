// @ts-check
// Mapa de las etiquetas BBCode y HTML de un texto: cuál abre, cuál cierra y cuál es su pareja.
// Sirve para editar una línea sin romper los bloques en los que está: en la ficha de Mortimer, la línea
// «✦ [b]Fiendfyre[/b]: …[/spoiler]» lleva al final el cierre del desplegable de HECHIZOS, que NO es de la línea.

const VACIAS_HTML = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'wbr', 'source', 'col', 'area', 'base', 'embed', 'param', 'track']);
const SUELTAS_BB = new Set(['*', 'hr', 'br']);

/**
 * @typedef {{ tipo: 'abre'|'cierra'|'suelta', nombre: string, ini: number, fin: number, pareja: number|null }} Etiqueta
 * `pareja` es el índice (en la lista) de la etiqueta que la cierra o abre; null si está sola o rota («[/colo]»).
 */

/** @param {string} texto @returns {Etiqueta[]} */
export function analizar(texto) {
  /** @type {Etiqueta[]} */
  const out = [];
  const re = /\[(\/?)([a-z*][a-z0-9]*)(?:=[^\]\n]*)?\]|<(\/?)([a-z][a-z0-9]*)\b[^<>]*?(\/?)>/gi;
  let m;
  while ((m = re.exec(texto))) {
    if (m[2] !== undefined) {
      const nombre = 'bb:' + m[2].toLowerCase();
      out.push({ tipo: SUELTAS_BB.has(m[2].toLowerCase()) ? 'suelta' : (m[1] ? 'cierra' : 'abre'), nombre, ini: m.index, fin: m.index + m[0].length, pareja: null });
    } else {
      const n = m[4].toLowerCase(), nombre = 'html:' + n;
      out.push({ tipo: VACIAS_HTML.has(n) || m[5] ? 'suelta' : (m[3] ? 'cierra' : 'abre'), nombre, ini: m.index, fin: m.index + m[0].length, pareja: null });
    }
  }
  // Emparejar con una pila; un cierre sin apertura (o con otra abierta encima) se queda sin pareja
  const pila = [];
  out.forEach((e, i) => {
    if (e.tipo === 'abre') pila.push(i);
    else if (e.tipo === 'cierra') {
      const k = pila.map(j => out[j].nombre).lastIndexOf(e.nombre);
      if (k >= 0) { const j = pila[k]; pila.length = k; out[j].pareja = i; e.pareja = j; }
    }
  });
  return out;
}

/** Cuántas etiquetas de cada nombre quedan sin pareja: si cambia al editar, se ha roto algo. */
export function balance(texto) {
  const b = {};
  for (const e of analizar(texto)) if (e.pareja == null && e.tipo !== 'suelta') b[e.nombre + ':' + e.tipo] = (b[e.nombre + ':' + e.tipo] ?? 0) + 1;
  return b;
}

// Etiquetas de BLOQUE (contienen listas y líneas). Las de texto (negrita, color, enlaces…) nunca cuentan como bloque.
const BLOQUE = new Set(['bb:spoiler', 'bb:quote', 'bb:hide', 'bb:list', 'bb:code', 'bb:center', 'bb:left', 'bb:right', 'bb:justify', 'bb:table', 'bb:tr', 'bb:td', 'bb:scroll',
  'html:div', 'html:details', 'html:summary', 'html:ul', 'html:ol', 'html:li', 'html:blockquote', 'html:p', 'html:table', 'html:tr', 'html:td', 'html:dl', 'html:dd', 'html:dt', 'html:center', 'html:section']);
export const esBloque = nombre => BLOQUE.has(nombre);

/**
 * Para la línea [a, b) del texto: dónde empieza y acaba lo que es SUYO.
 *  · `ini`: después de las aperturas de bloque del principio que cierran después del texto de la línea
 *    (p. ej. «[spoiler=POCIONES]»);
 *  · `fin`: antes del primer cierre de un bloque abierto antes de ese texto, en esta línea o en otra
 *    (p. ej. el «[/spoiler]» final de «✦ [b]Fiendfyre[/b]: …[/spoiler]» o de «[spoiler=VENTAJAS]✦ Recursos II[/spoiler]»).
 * Así una línea nueva siempre se mete DENTRO del bloque, y al quitar una línea los cierres se quedan.
 * @param {Etiqueta[]} mapa @param {number} a @param {number} b @param {string} texto
 */
export function partesDeLinea(mapa, a, b, texto) {
  const enLinea = mapa.map((e, i) => ({ ...e, i })).filter(e => e.ini >= a && e.ini < b);
  // última posición con texto visible de la línea
  let ultimoVisible = a - 1;
  { let p = a; for (const e of enLinea) { if (texto.slice(p, e.ini).trim()) ultimoVisible = e.ini - 1; p = e.fin; } if (texto.slice(p, b).trim()) ultimoVisible = b - 1; }
  let ini = a;
  for (const e of enLinea) {
    if (texto.slice(ini, e.ini).trim() !== '') break;
    if (e.tipo === 'abre' && esBloque(e.nombre) && (e.pareja == null || mapa[e.pareja].ini > ultimoVisible)) ini = e.fin;
    else if (e.tipo === 'abre' || e.tipo === 'suelta') break;
    else break;
  }
  let fin = b;
  for (const e of enLinea) {
    if (e.tipo !== 'cierra' || !esBloque(e.nombre) || e.pareja == null) continue;
    if (mapa[e.pareja].ini < ini) { fin = e.ini; break; }
  }
  return { ini, fin: Math.max(fin, ini) };
}

/** Separa un contenido en lo de delante del texto `desde`, el texto y las etiquetas que lo cierran al final. */
export function marco(contenido, desde) {
  const sufijo = (contenido.match(/(?:\s*(?:\[\/[a-z*][a-z0-9]*\]|<\/[a-z][a-z0-9]*>))*\s*$/i) ?? [''])[0];
  return { prefijo: contenido.slice(0, desde), sufijo };
}

/** Texto visible de un trozo (sin etiquetas). */
export function visible(s) {
  return String(s).replace(/\[\/?[a-z*][a-z0-9]*(?:=[^\]\n]*)?\]/gi, '').replace(/<[^>]*>/g, '');
}
