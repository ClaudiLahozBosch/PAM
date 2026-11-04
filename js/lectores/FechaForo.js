// @ts-check
// Las fechas tal como las enseña el foro, de Mi PJ (pam-mi-pj.user.js 1.7.1).
// El foro muestra la fecha según cada cuenta: «Lun 2 Mar 2026 - 10:00», «Dom 25 Oct 2026, 11:03 pm», «Hoy a las 10:00»
// o, si la cuenta tiene la preferencia «D j M - G:i», sin año: «Mié 5 Nov - 10:00».
//
// Arreglo R09: sin año, Mi PJ suponía el año actual (o el anterior si la fecha quedaba en el futuro), y un rol
// cerrado hace un año salía como reciente. Ahora el año se deduce del día de la semana: el año más reciente
// (sin pasarse de hoy) en el que ese día cae en ese día de la semana.

import { norm } from '../core/texto.js?v=0.6.3';

/** Una fecha del foro dentro de un texto (la cabecera de un mensaje, la columna «último mensaje»…). */
export const FECHA = /((?:Lun|Mar|Mi[ée]r?|Jue|Vie|S[áa]b|Dom)\.?\s+\d{1,2}\s+[A-Za-zé]+\.?(?:\s+\d{4})?\s*(?:,|-)\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s?m\.?)?|(?:Hoy|Ayer)\s+a\s+las\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s?m\.?)?)/i;
const MES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11 };
const DIA_SEM = { dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6 };

/**
 * La fecha en partes, en la hora de reloj de la cuenta.
 * @param {string} t
 * @param {Date} [hoy]
 * @returns {{ y: number, mo: number, d: number, h: number, mi: number, rel?: boolean, sinAno?: boolean } | null}
 */
export function partesDeFecha(t, hoy = new Date()) {
  t = String(t || '');
  const ampm = (h, s) => { s = String(s || '').toLowerCase().replace(/[.\s]/g, ''); if (s === 'pm' && h < 12) return h + 12; if (s === 'am' && h === 12) return 0; return h; };
  let m = t.match(/(Hoy|Ayer)\s+a\s+las\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?/i);
  if (m) { const d = new Date(hoy.getTime()); if (/ayer/i.test(m[1])) d.setDate(d.getDate() - 1); return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: ampm(+m[2], m[4]), mi: +m[3], rel: true }; }
  m = t.match(/(?:(Lun|Mar|Mi[ée]r?|Jue|Vie|S[áa]b|Dom)\.?\s+)?(\d{1,2})\s+([A-Za-zé]+)\.?(?:\s+(\d{4}))?\s*(?:,|-)\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?/i);
  if (!m) return null;
  const mes = MES[norm(m[3]).slice(0, 3)]; if (mes == null) return null;
  const dia = +m[2];
  let y = m[4] ? +m[4] : hoy.getFullYear();
  if (!m[4]) {
    if (new Date(y, mes, dia) > hoy) y--;
    const ds = m[1] ? DIA_SEM[norm(m[1]).slice(0, 3)] : undefined;
    if (ds != null) { for (let k = 0; k < 28; k++) if (new Date(y - k, mes, dia).getDay() === ds && new Date(y - k, mes, dia).getMonth() === mes) { y -= k; break; } }
  }
  return { y, mo: mes, d: dia, h: ampm(+m[5], m[7]), mi: +m[6], ...(m[4] ? {} : { sinAno: true }) };
}

/** La fecha del foro como Date (hora local del navegador = la de la cuenta, como hacía Mi PJ). */
export function aFecha(t, hoy = new Date()) {
  const P = partesDeFecha(t, hoy); if (!P) return null;
  return new Date(P.y, P.mo, P.d, P.h, P.mi);
}

/** Minutos de diferencia de una zona con UTC en una fecha dada (horario de verano incluido). */
export function offsetZona(tz, fecha) {
  try { const a = new Date(fecha.toLocaleString('en-US', { timeZone: tz })), b = new Date(fecha.toLocaleString('en-US', { timeZone: 'UTC' })); return (a.getTime() - b.getTime()) / 60000; } catch (e) { return 120; }
}

/** Partes de una fecha en la zona `tz` → milisegundos UTC. */
export function aUTC(P, tz) {
  const base = Date.UTC(P.y, P.mo, P.d, P.h, P.mi);
  let off = offsetZona(tz, new Date(base)); off = offsetZona(tz, new Date(base - off * 60000));
  return base - off * 60000;
}

const fmtMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
/** Día, semana (lunes) y mes en hora de España: los topes de los oficiales se cuentan así. */
export function clavesMadrid(utc) {
  const p = Object.fromEntries(fmtMadrid.formatToParts(new Date(utc)).map(x => [x.type, x.value]));
  const dow = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[p.weekday] || 0;
  const lunes = new Date(Date.UTC(+p.year, +p.month - 1, +p.day) - dow * 864e5).toISOString().slice(0, 10);
  return { dia: `${p.year}-${p.month}-${p.day}`, semana: lunes, mes: `${p.year}-${p.month}` };
}
