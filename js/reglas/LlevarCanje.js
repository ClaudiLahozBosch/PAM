// @ts-check
// 2.3.0 · «Llevar a PAM» desde el Registro de Canjes. Una petición ya aprobada, tal como está escrita en el foro (la
// haya armado PAM o no), se lee con el lector del Inspector (js/inspector/Revision.js: leerPedido + clasificar) y se
// pasa a una lista de cambios que entiende Mi Ficha (js/paginas/revisor/Revisor.js, sumarCanje: la misma regla que
// «Traer de la calculadora»). Lo que no se reconoce va a «hacelo a mano»: nunca se inventa.
// Lógica pura: sin leer ni escribir.

/** Lo que el foro deja para PAM (almacén del agente; solo [\w.-] en las claves). */
export const CLAVE_LLEVAR = 'pam.llevar';

const NIVEL_IDIOMA = ['', 'Bajo', 'Medio', 'Alto', 'Nativo'];
const VINCULO = { lazo: 'Lazo', union: 'Unión', vinculo: 'Vínculo' };
const sinPrecio = s => String(s || '').replace(/\s*[—–-]\s*$/, '').trim();

/**
 * @typedef {{ tipo: 'stat', nombre: string, hasta: number } | { tipo: 'skill', habilidad: string, hasta: number }
 *   | { tipo: 'arte', nombre: string, hasta: number } | { tipo: 'vent', nombre: string, hasta: number }
 *   | { tipo: 'esp', rama: string, hasta: number } | { tipo: 'bg', bgTipo: string, bgCat: string, bgEsp: string, hasta: number }
 *   | { tipo: 'arcano', type: string, tier: string, nombre: string } | { tipo: 'idioma', nombre: string, nivel: string }
 *   | { tipo: 'titulo', texto: string } | { tipo: 'raza', nombre: string } | { tipo: 'talento', nombre: string, detalle: string }
 *   | { tipo: 'lazo', vinculo: string, pj: string }} Cambio
 * (Un Punto de Destino va «a mano»: sumar 1 no da lo mismo si se lleva dos veces.)
 */

/**
 * Los canjes reconocidos por el Inspector → cambios para Mi Ficha. Cada uno lleva `texto` (la línea del foro).
 * @param {any[]} clasificados lo que devuelve `R.clasificar(item, T)` (con `item`) para cada línea del pedido
 * @returns {{ cambios: (Cambio & { texto: string })[], aMano: string[] }}
 */
export function cambiosDePedido(clasificados) {
  /** @type {any[]} */ const cambios = [];
  /** @type {string[]} */ const aMano = [];
  for (const x of clasificados || []) {
    const texto = sinPrecio(x.item ? x.item.desc : x.nombre);
    const n = x.hasta;
    const conNivel = typeof n === 'number' && n > 0;
    let c = null;
    if (x.tipo === 'stat' && conNivel) c = { tipo: 'stat', nombre: x.nombre, hasta: n };
    else if (x.tipo === 'skill' && conNivel && x.arte) c = { tipo: 'arte', nombre: x.arte, hasta: n };
    else if (x.tipo === 'skill' && conNivel && x.habilidad) c = { tipo: 'skill', habilidad: x.habilidad, hasta: n };
    else if (x.tipo === 'vent' && conNivel && x.nombre) c = { tipo: 'vent', nombre: x.nombre, hasta: n };
    else if (x.tipo === 'esp' && conNivel && x.rama) c = { tipo: 'esp', rama: x.rama, hasta: n };
    else if (x.tipo === 'bg' && conNivel && x.bgCat) c = { tipo: 'bg', bgTipo: x.bgTipo, bgCat: x.bgCat, bgEsp: x.bgEsp || '', hasta: n };
    else if (x.tipo === 'arc' && x.arcano) c = { tipo: 'arcano', type: x.arcano.tipo, tier: x.arcano.tier, nombre: x.arcano.n };
    else if (x.tipo === 'idioma' && NIVEL_IDIOMA[n]) c = { tipo: 'idioma', nombre: x.nombre, nivel: NIVEL_IDIOMA[n] };
    else if (x.tipo === 'tit' && texto) c = { tipo: 'titulo', texto };
    else if (x.tipo === 'raza' && x.nombre && !/licantrop/i.test(x.nombre)) c = { tipo: 'raza', nombre: x.nombre };
    else if (x.tipo === 'tal' && /^(lazo|uni[oó]n|v[ií]nculo)\b/i.test(texto)) { // «Lazo con Fulano», «Unión: Fulano»
      const v = texto.match(/^(lazo|uni[oó]n|v[ií]nculo)\b\s*(?:con|:|[-—–])?\s*([^()]+?)\s*(?:\(|$)/i);
      if (v && v[2]) c = { tipo: 'lazo', vinculo: VINCULO[v[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()], pj: v[2].trim() };
    }
    else if (x.tipo === 'tal' && x.talento) c = { tipo: 'talento', nombre: x.talento, detalle: ((texto.match(/\(([^)]+)\)\s*$/) || [])[1] || '').trim() };
    // «Coreano - Nativo» (idioma escrito a mano, sin «→»)
    if (!c && !x.tipo && x.item && x.item.cat === 'idi') { const m = texto.match(/^(.+?)\s*(?:\((?:muggle|m[aá]gico)\))?\s*[-—–:]\s*(Bajo|Medio|Alto|Nativo)$/i); if (m) c = { tipo: 'idioma', nombre: m[1].trim(), nivel: m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase() }; }
    if (c) cambios.push({ ...c, texto });
    else if (texto) aMano.push(texto);
  }
  return { cambios, aMano };
}

/**
 * El paquete que el foro deja para PAM con «Llevar a PAM». `aprobacion` es la respuesta del Inspector
 * (CanjesDelForo.buscarAprobacion): PAM la guarda con la petición, para que la tarjeta y la barra sigan el mismo camino.
 * @param {{ foro: string, cuenta: { id: number, nombre: string }, post: string, enlacePet: string, aprobacion: any,
 *   total: number, cambios: any[], aMano: string[], ahora?: string }} d
 */
export function paqueteLlevar({ foro, cuenta, post, enlacePet, aprobacion, total, cambios, aMano, ahora = new Date().toISOString() }) {
  return { v: 2, creado: ahora, foro, cuenta: { id: cuenta.id, nombre: cuenta.nombre, foro }, pj: cuenta.nombre, post: String(post), enlacePet, enlaceAce: aprobacion.enlace, aprobacion, total, cambios, aMano };
}

/** ¿Este movimiento de la Bóveda de PAM es el de esta petición? (su enlace de petición apunta a ese mensaje) */
export const esMovimientoDe = (mov, post) => !!mov && new RegExp('(^|\\D)' + String(post) + '(\\D|$)').test(String(mov.pet || ''));

/** El importe del canje: el que corrigió el Inspector, si lo hizo; si no, el total de la petición (o la suma). */
export function importeCanje(aprobacion, pedido, suma) {
  if (aprobacion && aprobacion.clase === 'corregida' && aprobacion.importe > 0) return aprobacion.importe;
  if (pedido && pedido.total > 0) return pedido.total;
  return suma > 0 ? suma : NaN;
}
