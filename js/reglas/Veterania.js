// @ts-check
// 2.4.0 · La veteranía: cada año desde que el personaje está activo le corresponden 2.000 grageas (y unos canjes
// especiales), que se piden en el Registro de Veteranía y aprueba el staff. Se pueden acumular: no hay que pedirla
// justo al cumplir el año. Aquí, sin leer ni escribir nada:
//   · qué mensaje del registro es una aprobación (y de cuántas veteranías: «4.000 grageas» = 2) y cuál un pedido;
//   · de quién es cada aprobación: el staff felicita por el nombre de pila («¡Felicidades, Jiho!») o un apodo, así que se
//     empareja con el mensaje anterior de esa persona que todavía no tenía respuesta (en el registro, todo lo que no es
//     una aprobación es un pedido, aunque no diga «veteranía»);
//   · cuántas le corresponden a un personaje y cuántas le faltan.
// Lo lee js/servicios/VeteraniaDelForo.js; lo enseña la tarjeta «Veteranía» del panel (MiPjPanel).

export const GRAGEAS_POR_ANIO = 2000;

export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[@¡!¿?.,:;«»"]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const palabras = s => norm(s).split(' ').filter(Boolean);
const numero = t => parseInt(String(t).replace(/[.,\s]/g, ''), 10);

const APROBACION = /corresponden?\s+(\d{1,2}[.,]\d{3}|\d{3,6})\s+grageas\s+por\s+(?:tu|tus|las?|los)\s+(?:\w+\s+)?veteran[ií]as?/gi;

/**
 * Las aprobaciones de veteranía de un mensaje. El staff a veces aprueba a varios en el mismo mensaje
 * («¡Felicidades, Anastasia! Te corresponden 4.000… ¡Felicidades, Alain! Te corresponden 2.000…»): cada una, con el
 * nombre que va entre «¡» y «!» después de la aprobación anterior.
 * @param {string} texto el mensaje SIN las citas (si alguien cita una aprobación, no es otra aprobación)
 * @returns {{ nombre: string, cantidad: number, grageas: number }[]}
 */
export function aprobacionesDeVeterania(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ');
  const out = [];
  let desde = 0;
  for (const m of t.matchAll(APROBACION)) {
    const grageas = numero(m[1]);
    const antes = t.slice(desde, m.index);
    desde = (m.index ?? 0) + m[0].length;
    if (!(grageas > 0)) continue;
    // el nombre: lo que va entre «¡» y «!» antes del importe, sin «Felicidades», «Enhorabuena» ni «por tu primer año»
    const ex = antes.match(/¡([^!¡]*)!/g);
    let nombre = ex ? ex[ex.length - 1].slice(1, -1) : '';
    nombre = nombre.replace(/^\s*(felicidades|enhorabuena|felicitaciones|feliz\s+\w+)\b\s*,?/i, '')
      .replace(/\bpor\s+tu\s+\w+\s+a[ñn]o\b/i, '').replace(/[@,]/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({ nombre, cantidad: Math.max(1, Math.round(grageas / GRAGEAS_POR_ANIO)), grageas });
  }
  return out;
}

/** La primera aprobación del mensaje, o null. */
export function aprobacionDeVeterania(texto) {
  return aprobacionesDeVeterania(texto)[0] || null;
}

/** ¿Pide la veteranía? (cualquier mensaje que la nombra y no es una aprobación) */
export const esPedidoDeVeterania = texto => /veteran[ií]a/i.test(String(texto || '')) && !aprobacionDeVeterania(texto);

/** ¿Es `nombre` (como lo escribe el staff: «Jiho», «Kang-Dae Jiho», «Hana Park») de esta persona? */
export function esElNombre(nombre, autor) {
  const n = palabras(nombre), a = palabras(autor);
  if (!n.length || !a.length) return false;
  if (n.join(' ') === a.join(' ')) return true;
  return n.every(x => a.includes(x)); // «Jiho» en «Kang-Dae Jiho», «Hana» en «Hana Park»
}

/**
 * @typedef {{ post: number, fecha: string, cantidad: number, aprobo: string }} Cobro
 * @typedef {{ v: number, ultimo: number, porPj: Record<string, Cobro[]>, sueltas: (Cobro & { nombre: string })[], pendientes: { autor: string, post: number }[] }} Cuentas
 */

/** 2: un mensaje puede aprobar a varios (antes solo se contaba el primero; lo guardado con 1 se vuelve a contar). */
export const VERSION_CUENTAS = 2;
/** @returns {Cuentas} */
export const cuentasVacias = () => ({ v: VERSION_CUENTAS, ultimo: 0, porPj: {}, sueltas: [], pendientes: [] });

/**
 * Suma a lo ya contado los mensajes nuevos del registro (en orden; los de id ≤ `ultimo` ya se contaron).
 * @param {Cuentas} previo @param {{ id: number, autor: string, fecha: string, texto: string }[]} posts (texto sin citas)
 * @returns {Cuentas}
 */
export function contarVeteranias(previo, posts) {
  const c = previo && previo.v === VERSION_CUENTAS ? JSON.parse(JSON.stringify(previo)) : cuentasVacias();
  for (const p of posts) {
    if (!p.id || p.id <= c.ultimo) continue;
    c.ultimo = p.id;
    const aps = aprobacionesDeVeterania(p.texto);
    for (const a of aps) {
      // el pedido más reciente, todavía sin respuesta, de alguien con ese nombre (y que no sea quien aprueba): primero con
      // el nombre entero; si no, con alguna palabra («¡Enhorabuena, Doctora Corazón Claire!»); sin nombre, el último pedido
      const otros = c.pendientes.map((x, i) => ({ x, i })).filter(({ x }) => norm(x.autor) !== norm(p.autor)).reverse();
      const n = palabras(a.nombre).filter(w => w.length >= 3);
      const hallado = otros.find(({ x }) => esElNombre(a.nombre, x.autor))
        || (n.length ? otros.find(({ x }) => palabras(x.autor).some(w => n.includes(w))) : otros[0]);
      const k = hallado ? hallado.i : -1;
      const cobro = { post: p.id, fecha: p.fecha, cantidad: a.cantidad, aprobo: p.autor };
      if (k !== -1) { const quien = norm(c.pendientes[k].autor); (c.porPj[quien] ||= []).push(cobro); c.pendientes.splice(k, 1); }
      else c.sueltas.push({ ...cobro, nombre: a.nombre });
    }
    if (!aps.length && p.autor) {
      // en el registro, todo lo que no es una aprobación es un pedido («Un año más para la pelirroja. Arcanos: …»)
      c.pendientes = c.pendientes.filter(x => norm(x.autor) !== norm(p.autor)); // un pedido nuevo de la misma persona reemplaza al anterior
      c.pendientes.push({ autor: p.autor, post: p.id });
      if (c.pendientes.length > 60) c.pendientes = c.pendientes.slice(-60);
    }
  }
  return c;
}

/** Los cobros de un personaje: los emparejados con su pedido y los sueltos que dicen su nombre completo. */
export function cobrosDe(cuentas, pj) {
  if (!cuentas) return [];
  const propios = cuentas.porPj[norm(pj)] || [];
  const sueltos = (cuentas.sueltas || []).filter(s => palabras(s.nombre).length > 1 && norm(s.nombre) === norm(pj));
  return [...propios, ...sueltos].sort((a, b) => a.post - b.post);
}

/** «16/11/2025» → Date (al mediodía, para que la zona horaria no cambie el día), o null. */
export function fechaDMA(t) {
  const m = String(t || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1], 12);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Cuántas le corresponden y cuántas le faltan.
 * @param {{ activacion: Date|null, cobradas: number, hoy?: Date }} d
 * @returns {{ anios: number, corresponden: number, cobradas: number, faltan: number, proxima: Date|null, dias: number|null } | null}
 */
export function resumenVeterania({ activacion, cobradas, hoy = new Date() }) {
  if (!activacion) return null;
  let anios = hoy.getFullYear() - activacion.getFullYear();
  const cumple = new Date(hoy.getFullYear(), activacion.getMonth(), activacion.getDate(), 12);
  if (hoy < cumple) anios--;
  anios = Math.max(0, anios);
  const proxima = new Date(activacion.getFullYear() + anios + 1, activacion.getMonth(), activacion.getDate(), 12);
  const dias = Math.ceil((proxima.getTime() - hoy.getTime()) / 864e5);
  return { anios, corresponden: anios, cobradas, faltan: Math.max(0, anios - cobradas), proxima, dias };
}
