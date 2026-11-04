// @ts-check
// Misiones y acontecimientos: turno del master y plazo. De Mi PJ (pam-mi-pj.user.js 1.7.1) tal cual.
import { normPalabras as norm } from '../core/texto.js?v=0.6.7';
import { aFecha, offsetZona } from '../lectores/FechaForo.js?v=0.6.7';

export const ES_MISION = /\b(misi[oó]n|acontecimiento)\b/i;
export const PLAZO_KW = /(pr[oó]ximo\s+turno|hora\s+l[ií]mite|l[ií]mite\s+de\s+poste[oa]|fecha\s+l[ií]mite|plazo|l[ií]mite\s+para\s+postear|deadline)/i;
const DIAS_SEM = 'lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo';
const MESES_N = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };

/** Los Dados Mágicos: sus mensajes no cuentan como de nadie. */
const BOTS = ['dados magicos', 'dado magico', 'dados'];
export const esBot = n => BOTS.includes(norm(n));

/**
 * «Jueves 22 de octubre · HORA LÍMITE 18.00 hora peninsular española» / «Viernes 23, 7:59 pm (Hora de Madrid GMT +2)»
 * @returns {{ t: number, supuesta: boolean } | null} el plazo en milisegundos UTC; `supuesta` si no decía la zona
 */
export function leerPlazo(texto, fechaPost) {
  const T = String(texto || '');
  const idx = []; let m; const re = new RegExp(PLAZO_KW.source, 'gi');
  while ((m = re.exec(T))) idx.push(m.index);
  if (!idx.length) return null;
  /* el último bloque de plazo del mensaje («PRÓXIMO TURNO … HORA LÍMITE …» cuenta como uno) */
  let i = idx[idx.length - 1];
  for (let k = idx.length - 2; k >= 0 && i - idx[k] < 200; k--) i = idx[k];
  const seg = T.slice(Math.max(0, i - 10), i + 500);
  const lineas = seg.split('\n').map(l => l.trim()).filter(Boolean);
  const reDia = new RegExp(`(?:(?:${DIAS_SEM})\\s*,?\\s*)?(\\d{1,2})(?:\\s+de\\s+([a-záé]+))?`, 'i');
  const reHora = /(\d{1,2})\s*[:.]\s*(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?|hs?\b)?/i;
  let dia = null, mes = null;
  const cands = [];
  lineas.forEach(l => {
    const lh = l.replace(reHora, ' ');
    const md = lh.match(new RegExp(`(?:${DIAS_SEM})\\s*,?\\s*(\\d{1,2})(?:\\s+de\\s+([a-záé]+))?|(\\d{1,2})\\s+de\\s+([a-záé]+)`, 'i'));
    if (md && dia == null) { dia = +(md[1] || md[3]); const ms = (md[2] || md[4] || '').toLowerCase(); if (ms in MESES_N) mes = MESES_N[ms]; }
    const mh = l.match(reHora); if (!mh) return;
    let h = +mh[1]; const mi = +mh[2], ap = (mh[3] || '').toLowerCase().replace(/[.\s]/g, '');
    if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
    const g = l.match(/GMT\s*([+\-−])\s*(\d{1,2})(?::?(\d{2}))?/i);
    const zona = g ? { off: (g[1] === '+' ? 1 : -1) * (+g[2] * 60 + +(g[3] || 0)) }
      : /peninsular|espa[nñ]a|madrid/i.test(l) ? { tz: 'Europe/Madrid' } : /argentin/i.test(l) ? { tz: 'America/Argentina/Buenos_Aires' } : /m[eé]xico/i.test(l) ? { tz: 'America/Mexico_City' } : null;
    const mdl = lh.match(reDia);
    cands.push({ h, mi, zona, dia: mdl && /\d/.test(mdl[0]) && new RegExp(DIAS_SEM, 'i').test(lh) ? +mdl[1] : null });
  });
  if (!cands.length) return null;
  const c = cands.find(x => x.zona && x.zona.off != null) || cands.find(x => x.zona) || cands[0];
  const d = c.dia || dia; if (!d) return null;
  const base = fechaPost || new Date();
  let y = base.getFullYear(), mo = mes != null ? mes : base.getMonth();
  if (mes == null && d < base.getDate() - 1) { mo++; if (mo > 11) { mo = 0; y++; } }
  if (mes != null && mes < base.getMonth() - 6) y++;
  const utc = Date.UTC(y, mo, d, c.h, c.mi);
  const off = c.zona ? (c.zona.off != null ? c.zona.off : offsetZona(c.zona.tz, new Date(utc))) : offsetZona('Europe/Madrid', new Date(utc));
  return { t: utc - off * 60000, supuesta: !c.zona };
}

/** El turno del master, ¿te nombra? (encabezado con tu nombre, o «TODOS») */
export function turnoParaMi(texto, participantes, yo) {
  const lineas = String(texto).split('\n').map(l => norm(l)).filter(l => l && l.length <= 45);
  const formas = n => { const t = norm(n).split(' ').filter(Boolean); return [t.join(' '), t[0], t.length > 1 ? t[0] + ' ' + t[t.length - 1] : ''].filter(x => x && x.length >= 3); };
  const mias = formas(yo);
  const esEnc = (l, fs) => fs.some(f => l === f || l === 'turno ' + f || new RegExp(`^turno [0-9ivxlc]+ ${f}$`).test(l));
  if (lineas.some(l => esEnc(l, mias))) return 'si';
  if (lineas.some(l => /^(turno [0-9ivxlc]+ )?(todos|todos los pjs?|todos los personajes|general)$/.test(l))) return 'si';
  const otros = participantes.filter(p => norm(p) !== norm(yo));
  if (otros.some(p => lineas.some(l => esEnc(l, formas(p))))) return 'no';     /* hay encabezados, pero no el tuyo */
  return 'si';                                                                   /* turno general, sin encabezados */
}

/**
 * ¿Te toca en esta misión? A partir de sus mensajes (la primera página y las últimas, sin los Dados Mágicos).
 * @param {{ id: string, autor: string, fecha: string, texto: string }[]} posts todos los leídos, en orden, sin bots
 * @param {string} url el enlace al tema
 * @param {string} yo
 */
export function analizarMision(posts, url, yo) {
  const todos = posts;
  if (!todos.length) return null;
  const master = todos[0].autor;
  if (norm(master) === norm(yo)) return { sos: 'master', master };
  const delMaster = todos.filter(p => norm(p.autor) === norm(master) && p.id !== todos[0].id || (p.id === todos[0].id && PLAZO_KW.test(p.texto)));
  const ult = delMaster[delMaster.length - 1];
  const mio = [...todos].reverse().find(p => norm(p.autor) === norm(yo));
  if (!ult || (mio && +mio.id > +ult.id)) return { sos: 'jugador', master, turno: false };
  const participantes = [...new Set(todos.map(p => p.autor))].filter(a => norm(a) !== norm(master));
  const paraMi = turnoParaMi(ult.texto, participantes, yo) === 'si';
  const n = (ult.texto.match(/\bturno\s+([0-9]+|[ivxlc]+)\b/i) || [])[1];
  const plazo = leerPlazo(ult.texto, aFecha(ult.fecha));
  return { sos: 'jugador', master, turno: paraMi, n: n ? n.toUpperCase() : '', post: +ult.id, url: `${url.split('#')[0].replace(/\/t(\d+)(?:p\d+)?-/, '/t$1-')}`, fechaTurno: ult.fecha,
    vence: plazo ? plazo.t : null, supuesta: plazo ? plazo.supuesta : false };
}
