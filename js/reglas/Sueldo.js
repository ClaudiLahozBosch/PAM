// @ts-check
// El sueldo del mes, de Mi PJ (pam-mi-pj.user.js 1.7.1) tal cual.
// Cada mes se abre «Sueldos de <mes anterior>» en Sueldos Mensuales: pedís con el formulario, un inspector
// contesta nombrándote y después lo sumás a la bóveda.
import { normPalabras as norm, escRe, numForo as num } from '../core/texto.js?v=0.3.3';

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
