// @ts-check
// Lectura de la bóveda de un personaje (tema del foro de bóvedas).
// `leerSaldos` es la de Mi PJ tal cual (entiende formularios «{…»», tablas «GRAGEAS Iniciales…» y el estilo
// «Grageas actuales: X / +N por… / Grageas restantes: Y / Grageas totales: Z»). `analizarBoveda` es su
// `leerBoveda`, pero sobre los mensajes ya leídos (LectorTema), así se puede probar sin el foro.
import { norm } from '../core/texto.js?v=0.3.6';
import { mismoAutor } from './LectorTema.js?v=0.3.6';

/**
 * Saldos de un mensaje, por sección (gr = grageas, pl = puntos legendarios):
 * { ini, fin, tot, delta } con fin = saldo final del mensaje.
 * @param {string} texto
 */
export function leerSaldos(texto) {
  const T = String(texto || '').replace(/ /g, ' ');
  const num2 = t => { const m = String(t).replace(/\s/g, '').match(/[+\-−]?\d[\d.,]*/); if (!m) return null; const v = parseInt(m[0].replace('−', '-').replace(/[.,](?=\d{3}(\D|$))/g, '').replace(/[.,]\d{1,2}$/, ''), 10); return isNaN(v) ? null : v; };
  const re = /(puntos\s+legendarios|\bPL\b|grageas)?[\s{]*\b(iniciales|actuales|restantes|totales)(?![a-záéíóúñ])\s*(?:de\s+la\s+b[oó]veda)?\s*[»:]?\s*(?:de\s+)?([+\-−]?\s*\d[\d.,]*)/gi;
  const sec = { gr: { campos: [] }, pl: { campos: [] } };
  let m;
  // el contexto cambia cuando aparece «Puntos Legendarios»/«PL» o «Grageas» como encabezado
  const marcas = [];
  const reM = /(puntos\s+legendarios|\bPL\b)|(grageas)/gi; let mm;
  while ((mm = reM.exec(T))) {
    // pestañas «Grageas · Inventario · PL · Registro»: no son encabezados
    if (/^[\s:»]*(grageas|inventario|puntos\s+legendarios|registro|\bPL\b)/i.test(T.slice(mm.index + mm[0].length, mm.index + mm[0].length + 30))) continue;
    marcas.push({ i: mm.index, s: mm[1] ? 'pl' : 'gr' });
  }
  const seccionEn = i => { let s = 'gr'; for (const k of marcas) { if (k.i > i) break; s = k.s; } return s; };
  while ((m = re.exec(T))) {
    const s = m[1] ? (/grageas/i.test(m[1]) ? 'gr' : 'pl') : seccionEn(m.index);
    sec[s].campos.push({ c: m[2].toLowerCase(), v: num2(m[3]) });
  }
  /** @type {{gr?: {ini: number|null, fin: number, tot: number|null, delta: number|null}, pl?: {ini: number|null, fin: number, tot: number|null, delta: number|null}}} */
  const out = {};
  for (const s of ['gr', 'pl']) {
    const C = sec[s].campos.filter(x => x.v != null); if (!C.length) continue;
    const res = C.filter(x => x.c === 'restantes'), act = C.filter(x => x.c === 'actuales'), ini = C.filter(x => x.c === 'iniciales'), tot = C.filter(x => x.c === 'totales');
    let fin, inicio;
    if (res.length) { fin = res[res.length - 1].v; inicio = act.length ? act[0].v : (ini.length ? ini[0].v : null); }
    else if (act.length) { fin = act[act.length - 1].v; inicio = ini.length ? ini[0].v : null; }
    else continue;
    out[s] = { ini: inicio, fin, tot: tot.length ? tot[tot.length - 1].v : null, delta: inicio != null ? fin - inicio : null };
  }
  return out;
}

/**
 * Estado de la bóveda a partir de los mensajes de su tema. El primer mensaje es la cabecera (respaldo);
 * manda el último movimiento, del dueño o de una «Revisión de Bóveda» de Gringotts.
 * @param {import('./LectorTema.js').Mensaje[]} posts mensajes del tema, en orden
 * @param {{ url: string, titulo?: string }} tema
 */
export function analizarBoveda(posts, { url, titulo = '' }) {
  if (!posts.length) return null;
  const p0 = posts[0];
  const base = url.split('#')[0];
  const deDueno = p => mismoAutor(p, p0);
  let act = null, tot = null, pla = null, plt = null, ini = null, revision = null, nota = null;
  const movs = [];
  const cab = leerSaldos(p0.texto);
  if (cab.gr) { ini = cab.gr.ini; act = cab.gr.fin; tot = cab.gr.tot; }
  if (cab.pl) { pla = cab.pl.fin; plt = cab.pl.tot; }
  for (const p of posts.slice(1)) {
    const tuyo = deDueno(p), tx = p.texto, sal = leerSaldos(tx);
    const esRev = !tuyo && /Revisi[oó]n\s+de\s+B[oó]veda/i.test(tx);
    if (!tuyo && !esRev) { const t2 = tx.replace(/\s+/g, ' ').trim(); if (t2.length > 6) nota = { autor: p.autor, fecha: p.fecha, texto: t2.slice(0, 280) }; continue; }
    if (esRev) {
      revision = { autor: p.autor, fecha: p.fecha, url: `${base}#${p.id}` };
      const resto = tx.replace(/\{[^»]*»\s*[^{]*/g, ' ').replace(/\s+/g, ' ').trim();
      nota = resto.length > 6 ? { autor: p.autor, fecha: p.fecha, texto: resto.slice(0, 280) } : null;
      if (sal.gr && ini == null && sal.gr.ini != null) ini = sal.gr.ini;
    }
    if (sal.gr) { act = sal.gr.fin; if (sal.gr.tot != null) tot = sal.gr.tot; if (tuyo && sal.gr.delta != null) movs.push({ d: sal.gr.delta, act: sal.gr.fin, fecha: p.fecha }); }
    if (sal.pl) { pla = sal.pl.fin; if (sal.pl.tot != null) plt = sal.pl.tot; }
  }
  const propiosTodos = posts.slice(1).filter(deDueno);
  const ultTuyo = propiosTodos[propiosTodos.length - 1];
  // últimos mensajes propios (para saber, p. ej., si ya se sumó el sueldo)
  const propios = propiosTodos.slice(-8).map(p => {
    const s2 = leerSaldos(p.texto);
    return { id: p.id, d: s2.gr ? s2.gr.delta : null, sueldo: /sueldo/i.test(p.texto), enl: (p.html.match(/href="([^"]*)"/g) ?? []).map(h => h.slice(6, -1)).join(' ') };
  });
  return {
    url: base, tema: Number(base.match(/\/t(\d+)/)?.[1]) || null, titulo, dueno: p0.autor,
    act, tot, ini, pla, plt, movs: movs.slice(-3).reverse(), revision, nota, propios,
    l1: `${base}#${p0.id}`, l2: ultTuyo ? `${base}#${ultTuyo.id}` : '', l3: revision ? revision.url : ''
  };
}

/** ¿Es este nombre el del dueño? (sin tildes ni mayúsculas) */
export const esDueno = (a, b) => norm(a) === norm(b);
