// @ts-nocheck
// Coloreador de diálogos: lo que convierte un texto en BBCode con los diálogos, los nombres y las marcas de color.
// Es el código del Coloreador de PAM (js/paginas/registro/Coloreador.js, antes en index.html) sin la pantalla, para
// usarlo también desde el foro (2.1.0: el botón «Colorear diálogos» de Mi PJ, debajo del editor). Lo nuevo:
//   · las etiquetas que ya tiene el texto ([quote="…"], [url=…], <div style="…">) no se tocan: antes las comillas
//     o los guiones de dentro se coloreaban y se rompía el código;
//   · detecta más diálogos: las rayas ―, ‒ y −, «--» como raya, «dijo:-Hola», «*—Hola*», «(—Hola)», „comillas“; y la
//     puntuación que sigue al cierre de un inciso («—dijo—. ¿Vamos?») ya no se pinta;
//   · `descolorear` quita lo que puso un coloreado anterior con la misma configuración (para no pintar dos veces).

/** Grupos de color de la lista de nombres y de las marcas: [nombre, color]. */
export const GROUPS = [
  ['Gryffindor', '#A3000D'], ['Hufflepuff', '#DAA515'], ['Ravenclaw', '#316996'], ['Slytherin', '#005C1F'], ['Otros menores', '#b25228'],
  ['Ex-Gryffindor', '#803E3A'], ['Ex-Hufflepuff', '#d1cb9e'], ['Ex-Ravenclaw', '#769aaf'], ['Ex-Slytherin', '#4ca07d'], ['Otros Adultos', '#ae7952']];
/** Formatos: [clave, botón, título, etiqueta BBCode]. */
export const FMTS = [['b', 'B', 'Negrita', 'b'], ['i', 'I', 'Cursiva', 'i'], ['u', 'U', 'Subrayado', 'u'], ['s', 'S', 'Tachado', 'strike']];
/** Marcas: [abre, cierra]. */
export const MARKERS = [['*', '*'], ['**', '**'], ['_', '_'], ['~', '~'], ['"', '"'], ['“', '”'], ['«', '»'], ['‘', '’'], ['(', ')'], ['<', '>'], ['|', '|']];

// ---------- Etiquetas ----------
export function parseTag(s) {
  s = (s || '').trim();
  if (!s) return null;
  if (/^#?[0-9a-f]{3,8}$/i.test(s)) { const h = s[0] === '#' ? s : '#' + s; return { open: `[color=${h}]`, close: '[/color]', color: h }; }
  if (/^[a-z]+$/i.test(s)) return { open: `[color=${s}]`, close: '[/color]', color: s };
  const i = s.indexOf('[/');
  let open, close;
  if (i > 0) { open = s.slice(0, i).trim(); close = s.slice(i).trim(); }
  else {
    open = s;
    const names = [...s.matchAll(/\[([a-z0-9]+)(?:=[^\]]*)?\]/gi)].map(m => m[1]);
    close = names.reverse().map(n => `[/${n}]`).join('');
  }
  const m = open.match(/\[color=([^\]]+)\]/i);
  return { open, close, color: m ? m[1].trim() : null };
}

// ---------- Detección de diálogo ----------
// Las etiquetas del texto se cambian por un carácter de uso privado (U+F000…); para el diálogo cuentan como un
// espacio (no cortan una frase ni impiden que una raya abra el diálogo) y nunca quedan dentro de un tramo pintado.
const ETQ0 = 0xF000, ETQ1 = 0xF8FF;
const esEtq = c => !!c && c.charCodeAt(0) >= ETQ0 && c.charCodeAt(0) <= ETQ1;
const SPACE = /\s/;
const PUNCT_AFTER = /[\s.,;:!?…)"»”'\]]/;
// 2.1.0: también las otras rayas que salen al copiar de otros sitios (―, ‒, −)
const RAYAS = '—–―‒−';
// 2.1.0: lo que puede ir justo antes de la raya sin que deje de abrir el diálogo: «*—Hola*», «(—Hola)», «¡—…»
const ABRE = /[*_~(¿¡]/;
/** Cuántos caracteres ocupa la raya que empieza en i (0 si no hay): 1, o 2 con «--» (2.1.0: hay quien la escribe así). */
function dashLen(line, i, o) {
  const c = line[i];
  if (RAYAS.includes(c)) return o.raya ? 1 : 0;
  if (c !== '-' || !o.guion) return 0;
  const doble = line[i + 1] === '-' && line[i + 2] !== '-' && line[i - 1] !== '-';
  if (!doble && (line[i + 1] === '-' || line[i - 1] === '-')) return 0;
  const k = doble ? 2 : 1;
  const prev = i === 0 || esEtq(line[i - 1]) ? ' ' : line[i - 1], next = i + k >= line.length || esEtq(line[i + k]) ? ' ' : line[i + k];
  // 2.1.0: «dijo:-Hola» (pegado a los dos puntos) también abre
  return SPACE.test(prev) || PUNCT_AFTER.test(next) || /[(«"“:]/.test(prev) || ABRE.test(prev) || (doble && /[\p{L}¿¡]/u.test(next)) ? k : 0;
}
function opening(line, i) { return i === 0 || /[\s(«"“]/.test(line[i - 1]) || esEtq(line[i - 1]) || ABRE.test(line[i - 1]); }
function afterSentence(line, i) {
  let j = i - 1; while (j >= 0 && (SPACE.test(line[j]) || esEtq(line[j]) || ABRE.test(line[j]))) j--;
  return j < 0 || /[.!?…:]/.test(line[j]);
}
const Q_OPEN = { '"': '"', '“': '”', '«': '»', '„': '“' };

// devuelve array de {t, c} por carácter (una raya «--» va como un solo tramo)
function markLine(line, o) {
  const res = []; let st = 'N', qClose = null;
  for (let i = 0; i < line.length; i++) {
    let ch = line[i];
    if (esEtq(ch)) { res.push({ t: ch, c: false, e: true }); continue; }
    const k = st === 'Q' ? 0 : dashLen(line, i, o);
    if (k) { ch = line.slice(i, i + k); if (o.fix && ch[0] === '-') ch = '—'; }
    if (st === 'Q') { res.push({ t: ch, c: true }); if (ch === qClose) st = 'N'; continue; }
    if (k) {
      if (st === 'N') { if (afterSentence(line, i)) { st = 'D'; res.push({ t: ch, c: true }); } else { st = 'A'; res.push({ t: ch, c: false }); } }
      else if (st === 'A') { st = 'N'; res.push({ t: ch, c: false }); }
      else if (st === 'D') { st = 'I'; res.push({ t: ch, c: false }); }
      else if (st === 'I') { st = 'D'; res.push({ t: ch, c: opening(line, i) && afterSentence(line, i) }); }
      i += k - 1;
      continue;
    }
    if (st === 'N' && o.comillas && Q_OPEN[ch]) { st = 'Q'; qClose = Q_OPEN[ch]; res.push({ t: ch, c: true }); continue; }
    res.push({ t: ch, c: st === 'D' });
  }
  return res;
}

export function fmtTags(f) { f = f || {}; const on = FMTS.filter(x => f[x[0]]); return { open: on.map(x => `[${x[3]}]`).join(''), close: on.reverse().map(x => `[/${x[3]}]`).join('') }; }
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function ruleColor(r) { return r.g === 'none' ? null : r.g === 'custom' ? (r.c || '#ffffff') : (GROUPS[r.g] || GROUPS[0])[1]; }
function wrapStyle(t, c, f) { const ff = fmtTags(f); const inner = ff.open + t + ff.close; return c ? `[color=${c}]${inner}[/color]` : inner; }
function markRegex(rules) {
  const list = rules.map(r => ({ r, m: MARKERS[r.m] })).filter(x => x.m).sort((a, b) => b.m[0].length - a.m[0].length);
  if (!list.length) return null;
  const re = new RegExp(list.map(x => '(?<!' + reEsc(x.m[0][0]) + ')' + reEsc(x.m[0]) + '([^\\n' + reEsc(x.m[1][0]) + ']+)' + reEsc(x.m[1]) + '(?!' + reEsc(x.m[1].slice(-1)) + ')').join('|'), 'g');
  return { re, list };
}
function nameRegex(rules) {
  const list = rules.filter(r => r.name.trim()).map(r => ({ n: r.name.trim(), c: ruleColor(r), f: fmtTags(r.f) }))
    .sort((a, b) => b.n.length - a.n.length);
  if (!list.length) return null;
  const map = new Map(list.map(x => [x.n.toLowerCase(), x]));
  const re = new RegExp('(?<![\\p{L}\\p{N}_])(' + list.map(x => reEsc(x.n)).join('|') + ')(?![\\p{L}\\p{N}_])', 'giu');
  return { re, map };
}
function paintNames(t, nr, cnt) {
  if (!nr) return t;
  return t.replace(nr.re, m => { cnt.n++; const x = nr.map.get(m.toLowerCase()); return x.c ? `[color=${x.c}]${x.f.open}${m}${x.f.close}[/color]` : x.f.open + m + x.f.close; });
}

/** Las etiquetas BBCode y HTML del texto, cambiadas por marcadores; `volver` las pone de nuevo. */
function protegerEtiquetas(text) {
  const etq = [];
  const t = text.replace(/\[\/?[a-z*][^\]\n]*\]|<\/?[a-z!][^>\n]*>/gi, m => {
    if (etq.length > ETQ1 - ETQ0) return m;
    etq.push(m); return String.fromCharCode(ETQ0 + etq.length - 1);
  });
  return { t, volver: s => etq.length ? s.replace(/[-]/g, ch => etq[ch.charCodeAt(0) - ETQ0] ?? ch) : s };
}

/**
 * El texto en BBCode. tg: la etiqueta del diálogo ({open, close}); o: opciones (raya, guion, comillas, fix, center);
 * rules: la lista de nombres; mrules: las marcas.
 */
export function colorize(text, tg, o, rules, mrules) {
  let n = 0; const nr = nameRegex(rules || []); const cnt = { n: 0 }; const mr = markRegex(mrules || []); const slots = [];
  const PH = 0xE000;
  const P = protegerEtiquetas(text);
  text = P.t;
  if (mr) text = text.replace(mr.re, (...a) => {
    const g = a.slice(1, 1 + mr.list.length); const k = g.findIndex(v => v !== undefined); const x = mr.list[k];
    const body = x.r.strip ? g[k] : x.m[0] + g[k] + x.m[1];
    slots.push({ body, c: ruleColor(x.r), f: x.r.f }); return String.fromCharCode(PH + slots.length - 1);
  });
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(line => {
    const marks = markLine(line, o);
    // agrupar en tramos (una etiqueta siempre corta el tramo)
    const runs = [];
    for (const m of marks) { const last = runs[runs.length - 1]; if (last && !m.e && !last.e && last.c === m.c) last.t += m.t; else runs.push({ t: m.t, c: m.c, e: m.e }); }
    return runs.map(r => {
      if (r.e) return r.t;
      if (!r.c || !r.t.trim()) return paintNames(r.t, nr, cnt);
      // 2.1.0: la puntuación que sigue al cierre de un inciso («—dijo—. ¿Vamos?») es del narrador: queda sin color
      const lead = r.t.match(/^[\s.,;:]*/)[0], trail = r.t.match(/\s*$/)[0], dentro = r.t.slice(lead.length, r.t.length - trail.length);
      if (!dentro) return paintNames(r.t, nr, cnt);
      n++;
      return paintNames(lead, nr, cnt) + tg.open + paintNames(dentro, nr, cnt) + tg.close + trail;
    }).join('');
  });
  let code = lines.join('\n');
  if (slots.length) code = code.replace(/[-]/g, ch => { const sl = slots[ch.charCodeAt(0) - PH]; return sl ? wrapStyle(paintNames(sl.body, nr, { n: 0 }), sl.c, sl.f) : ch; });
  code = P.volver(code);
  if (o.center && code.trim()) code = '[center]' + code + '[/center]';
  return { code, count: n, names: cnt.n, marks: slots.length };
}

/**
 * Una configuración guardada del Coloreador ({names, marks, dlgf, tag, opts}, la de `cd_pj.<id>`) aplicada a un texto,
 * como lo hace la pantalla del Coloreador.
 */
export function colorearConConfig(text, cfg) {
  cfg = cfg || {};
  const o = Object.assign({ raya: true, guion: true, comillas: true, fix: false, center: false }, cfg.opts || {});
  const base = parseTag(cfg.tag), df = fmtTags(cfg.dlgf);
  const tg = base && { open: base.open + df.open, close: df.close + base.close, color: base.color };
  const rules = Array.isArray(cfg.names) ? cfg.names : [], mrules = Array.isArray(cfg.marks) ? cfg.marks : [];
  return tg ? colorize(text, tg, o, rules, mrules)
    : colorize(text, { open: '', close: '' }, { raya: false, guion: false, comillas: false, fix: false, center: o.center }, rules, mrules);
}

/**
 * Quita lo que puso un coloreado anterior con esta configuración: el diálogo, los nombres, las marcas y el [center]
 * de fuera. Así «Colorear» dos veces da lo mismo que una. Las marcas con «Quitar símbolos» no recuperan el símbolo.
 */
export function descolorear(text, cfg) {
  cfg = cfg || {};
  const pares = [];
  const base = parseTag(cfg.tag), df = fmtTags(cfg.dlgf);
  for (const r of Array.isArray(cfg.names) ? cfg.names : []) { if (!String(r.name || '').trim()) continue; const c = ruleColor(r), f = fmtTags(r.f); pares.push(c ? [`[color=${c}]${f.open}`, `${f.close}[/color]`] : [f.open, f.close]); }
  // las marcas con «Quitar símbolos» recuperan el símbolo (si no, al volver a colorear ya no se reconocerían)
  for (const r of Array.isArray(cfg.marks) ? cfg.marks : []) {
    const c = ruleColor(r), f = fmtTags(r.f), m = r.strip !== false && MARKERS[r.m] ? MARKERS[r.m] : ['', ''];
    pares.push(c ? [`[color=${c}]${f.open}`, `${f.close}[/color]`, m] : [f.open, f.close, m]);
  }
  // el diálogo, el último: los nombres van dentro
  if (base) pares.push([base.open + df.open, df.close + base.close]);
  let t = String(text);
  if (cfg.opts && cfg.opts.center && /^\[center\][\s\S]*\[\/center\]$/i.test(t.trim())) t = t.trim().slice(8, -9);
  // de dentro hacia fuera: se repite mientras quite algo (un nombre dentro de un diálogo)
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const antes = t;
    for (const [a, c, m] of pares) {
      if (!a || !c) continue;
      // 2.1.3: sin distinguir mayúsculas (al volver del foro puede ser #a3000d)
      t = t.replace(new RegExp(reEsc(a) + '((?:(?!' + reEsc(a) + ')[^\\n])*?)' + reEsc(c), 'gi'), (_, dentro) => (m ? m[0] + dentro + m[1] : dentro));
    }
    if (t === antes) break;
  }
  return t;
}
