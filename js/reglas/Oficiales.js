// @ts-check
// Oficiales: posts que cuentan y recompensas. De Mi PJ (pam-mi-pj.user.js 1.7.1) tal cual, más el arreglo R09.
// 20 grageas por post, con tope de 3 por día, 15 por semana (lunes a domingo) y 45 por mes, por usuario y en hora
// de España; +60 por el Suceso de cierre. Un segundo oficial (suceso de más de dos años) se cobra a un cuarto.
import { normPalabras as norm, fmtForo as fmt } from '../core/texto.js?v=0.3.5';
import { clavesMadrid } from '../lectores/FechaForo.js?v=0.3.5';
import { esBot } from './Misiones.js?v=0.3.5';

export const ES_OFICIAL = /\[\s*(?:rol(?:eo)?\s+)?oficial\s*\]|\boficial\b\s*[\]|:·•-]/i;
export const TOPE = { dia: 3, semana: 15, mes: 45 };
/** Cuentas de staff que abren y cierran temas: no cobran ni cuentan como actividad. */
const NO_COBRAN = ['tramas'];

/*
 * Arreglo R09: un oficial cerrado seguía en «Oficiales en curso». Se da por cerrado si uno de sus tres últimos
 * mensajes tiene uno de los avisos de cierre del staff. Los avisos NO están aquí: están en data/cierres-oficial.json,
 * para poder añadir frases sin tocar el código.
 */
/** Para comparar avisos: sin mayúsculas, sin tildes y con los espacios juntos (los signos se quedan). */
const plano = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * La función que dice si un mensaje cierra el oficial, a partir de los avisos de data/cierres-oficial.json
 * (cada aviso: los trozos de texto que tiene que tener el mensaje, en ese orden).
 * @param {string[][]} avisos
 * @returns {(texto: string) => boolean}
 */
export function crearEsCierre(avisos) {
  const lista = (avisos || []).map(a => (Array.isArray(a) ? a : [a]).map(plano).filter(Boolean)).filter(a => a.length);
  return texto => {
    const T = plano(texto);
    return lista.some(trozos => { let desde = 0; return trozos.every(t => { const i = T.indexOf(t, desde); if (i < 0) return false; desde = i + t.length; return true; }); });
  };
}

/**
 * @param {{ titulo: string, tid: number, url: string, posts: { id: number, autor: string, utc: number|null, texto?: string }[] }} T
 * @param {(texto: string) => boolean} [esCierre] de crearEsCierre (sin ella, ningún oficial se da por cerrado)
 */
export function contarOficial(T, esCierre = () => false) {
  const por = new Map();
  const vale = p => p.autor && !esBot(p.autor) && !NO_COBRAN.includes(norm(p.autor));
  T.posts.filter(vale).forEach(p => {
    let r = por.get(p.autor); if (!r) { r = { autor: p.autor, posts: 0, cuentan: 0, fuera: { dia: 0, semana: 0, mes: 0, fecha: 0 }, c: { dia: {}, semana: {}, mes: {} }, ultimo: null, ultimoId: 0 }; por.set(p.autor, r); }
    r.posts++; if (p.utc) r.ultimo = Math.max(r.ultimo || 0, p.utc);
    r.ultimoId = Math.max(r.ultimoId, p.id);
    if (!p.utc) { r.fuera.fecha++; return; }
    const k = clavesMadrid(p.utc);
    const lleno = ['dia', 'semana', 'mes'].find(x => (r.c[x][k[x]] || 0) >= TOPE[x]);
    if (lleno) { r.fuera[lleno]++; return; }
    ['dia', 'semana', 'mes'].forEach(x => { r.c[x][k[x]] = (r.c[x][k[x]] || 0) + 1; });
    r.cuentan++;
  });
  const parts = [...por.values()].map(r => ({ autor: r.autor, posts: r.posts, cuentan: r.cuentan, fuera: r.fuera, ultimo: r.ultimo, ultimoId: r.ultimoId }));
  const ult = Math.max(0, ...T.posts.filter(vale).map(p => p.utc || 0));
  const cerrado = T.posts.slice(-3).some(p => esCierre(p.texto));
  return { titulo: T.titulo, tid: T.tid, url: T.url, parts, ultimo: ult || null, leido: Date.now(), ...(cerrado ? { cerrado: true } : {}) };
}

/** Segundo oficial: se marca por participante ({tid: {autor normalizado: 1}}). */
export const cuartoDe = (marcas, tid, autor) => { const m = (marcas || {})[tid]; return !!(m && typeof m === 'object' && m[norm(autor)]); };
export function grageasOf(O, autor, marcas) { const q = cuartoDe(marcas, O.tid, autor); const r = O.parts.find(p => norm(p.autor) === norm(autor)); return r ? r.cuentan * (q ? 5 : 20) : 0; }

/** Marca o desmarca el segundo oficial de un participante; devuelve las marcas nuevas. */
export function marcarCuarto(marcas, tid, autor, si) {
  const m = { ...(marcas || {}) };
  const t = (m[tid] && typeof m[tid] === 'object') ? { ...m[tid] } : {};
  const a = norm(autor);
  if (si) t[a] = 1; else delete t[a];
  if (Object.keys(t).length) m[tid] = t; else delete m[tid];
  return m;
}

/** El aviso de «parado» (21 días) o «abandonado» (30), o null. */
export function avisoParado(O, ahora = Date.now()) {
  if (!O.ultimo) return null;
  const d = Math.floor((ahora - O.ultimo) / 864e5);
  if (d >= 30) return { mal: true, texto: `Lleva ${d} días sin posts: queda como abandonado y no aparece en tu panel hasta que alguien vuelva a postear.` };
  if (d >= 21) return { mal: false, texto: `Lleva ${d} días sin posts: quedan ${30 - d} para llegar al mes.` };
  return null;
}

/** «no cuentan 2 por el tope diario, 1 sin fecha legible» (o ''). */
export function detalleFuera(f) {
  const t = []; if (f.dia) t.push(`${f.dia} por el tope diario`); if (f.semana) t.push(`${f.semana} por el semanal`); if (f.mes) t.push(`${f.mes} por el mensual`); if (f.fecha) t.push(`${f.fecha} sin fecha legible`);
  return t.length ? `no cuentan ${t.join(', ')}` : '';
}

/**
 * Lo que enseña la barra de arriba de un tema de oficial (el agente la pinta tal cual la pintaba Mi PJ).
 * @param {ReturnType<typeof contarOficial>} O
 * @param {any} marcas las de «segundo oficial»
 */
export function barraDeOficial(O, marcas, ahora = Date.now()) {
  return {
    tid: O.tid,
    total: O.parts.reduce((a, p) => a + p.posts, 0),
    filas: O.parts.map(p => { const q = cuartoDe(marcas, O.tid, p.autor); return { autor: p.autor, posts: p.posts, cuentan: p.cuentan, grageas: fmt(p.cuentan * (q ? 5 : 20)), cuarto: q, fuera: detalleFuera(p.fuera) }; }),
    aviso: avisoParado(O, ahora)
  };
}
