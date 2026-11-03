// @ts-check
// «Revisar la bóveda antes de publicar», de Mi PJ (pam-mi-pj.user.js 1.7.1), tal cual: comprueba el formulario
// de un movimiento de bóveda (iniciales + lo que se añade/quita = actuales, totales, enlaces, negativo) y el
// estilo libre («Grageas actuales: X … +N grageas … Grageas restantes: Y»).
// Los avisos salen con su parte en negrita aparte ({ b, t }) para que el agente los pinte sin interpretar HTML.

const num = t => { if (t == null) return null; const m = String(t).replace(/\s/g, '').match(/[+\-−]?\d[\d.,]*/); if (!m) return null; const v = parseInt(m[0].replace('−', '-').replace(/[.,]/g, ''), 10); return isNaN(v) ? null : v; };
const fmt = n => n == null ? '—' : Number(n).toLocaleString('es-AR');

const limpio = t => String(t || '').replace(/<[^>]+>/g, ' ').replace(/\[\/?[a-z*][^\]]*\]/gi, ' ').replace(/&nbsp;/g, ' ');
const sumaDelta = t => { const ns = String(t || '').replace(/\([^)]*\)/g, ' ').match(/[+\-−]\s*\d[\d.,]*|\d[\d.,]*/g) || []; return ns.reduce((s, x) => s + (num(x) || 0), 0); };
function bloques(texto, rotulo) {
  const T = limpio(texto), out = [];
  const re = new RegExp(`${rotulo}\\s+iniciales\\s*»\\s*:?([\\s\\S]*?)(?=${rotulo}\\s+iniciales\\s*»|$)`, 'gi'); let m;
  while ((m = re.exec(T))) {
    const s = m[1], campo = n => { const x = s.match(new RegExp(`${n}\\s*»\\s*:?\\s*([^{\\n]*)`, 'i')); return x ? x[1].trim() : null; };
    out.push({ ini: num(s.split(/[{\n]/)[0]), dTxt: campo(`${rotulo}\\s+que\\s+se\\s+añaden\\s*\\/\\s*quitan`), act: num(campo(`${rotulo}\\s+actuales`)), tot: num(campo(`${rotulo}\\s+totales`)), enl: campo('Enlaces') });
  }
  return out;
}

/**
 * Los problemas del mensaje, con el texto de Mi PJ («<b>Grageas:</b> …»).
 * @param {string} texto el mensaje del editor
 * @param {{ act?: number|null, tot?: number|null, pla?: number|null, plt?: number|null } | null} ref la bóveda del jugador, si el mensaje es en su bóveda
 * @returns {string[]}
 */
export function revisar(texto, ref) {
  const prob = [];
  [['Grageas', 'Grageas', ref && { act: ref.act, tot: ref.tot }], ['Puntos\\s+Legendarios', 'Puntos Legendarios', ref && { act: ref.pla, tot: ref.plt }]].forEach(([rot, nombre, r0]) => {
    const bs = bloques(texto, rot); let prev = r0 && r0.act != null ? r0 : null;
    bs.forEach((b, i) => {
      const n = bs.length > 1 ? ` (movimiento ${i + 1})` : '';
      const d = sumaDelta(b.dTxt);
      if (b.ini == null || b.act == null) { prob.push(`<b>${nombre}${n}:</b> falta algún número del formulario.`); return; }
      if (prev && prev.act != null && b.ini !== prev.act) prob.push(`<b>${nombre}${n}:</b> las iniciales dicen ${fmt(b.ini)}, pero ${i ? 'el movimiento anterior terminó' : 'tu bóveda está'} en ${fmt(prev.act)}.`);
      if (b.ini + d !== b.act) prob.push(`<b>${nombre}${n}:</b> ${fmt(b.ini)} ${d < 0 ? '−' : '+'} ${fmt(Math.abs(d))} da ${fmt(b.ini + d)}, no ${fmt(b.act)}.`);
      if (b.act < 0) prob.push(`<b>${nombre}${n}:</b> quedarías en negativo (${fmt(b.act)}).`);
      if (prev && prev.tot != null && b.tot != null && b.tot !== prev.tot + Math.max(d, 0)) prob.push(`<b>${nombre}${n}:</b> las totales deberían ser ${fmt(prev.tot + Math.max(d, 0))} (lo que gastás no resta de las totales), no ${fmt(b.tot)}.`);
      if (!b.enl || b.enl.replace(/[\s|·✦—-]/g, '').length < 3) prob.push(`<b>${nombre}${n}:</b> faltan los enlaces (son obligatorios).`);
      prev = { act: b.act, tot: b.tot != null ? b.tot : (prev && prev.tot) };
    });
  });
  /* estilo libre: «Grageas actuales: X» + líneas «+N grageas por…» = «Grageas restantes: Y» */
  [['grageas', 'Grageas', ref && ref.act], ['puntos\\s+legendarios', 'Puntos Legendarios', ref && ref.pla]].forEach(([rot, nombre, r0]) => {
    const T = limpio(texto);
    const ra = new RegExp(`${rot}\\s+actuales\\s*[:»]?\\s*([\\d.,]+)([\\s\\S]*?)${rot}\\s+restantes\\s*[:»]?\\s*([\\d.,]+)`, 'i');
    const m = T.match(ra); if (!m || /\{/.test(m[2])) return;
    const ini = num(m[1]), fin = num(m[3]);
    const deltas = [...m[2].matchAll(new RegExp(`([+\\-−]\\s?\\d[\\d.,]*)\\s*${rot}`, 'gi'))].map(x => num(x[1]));
    const d = deltas.reduce((a, b) => a + b, 0);
    if (r0 != null && ini !== r0) prob.push(`<b>${nombre}:</b> empezás con ${fmt(ini)}, pero tu bóveda está en ${fmt(r0)}.`);
    if (deltas.length && ini + d !== fin) prob.push(`<b>${nombre}:</b> ${fmt(ini)} ${d < 0 ? '−' : '+'} ${fmt(Math.abs(d))} da ${fmt(ini + d)}, no ${fmt(fin)}.`);
    if (fin < 0) prob.push(`<b>${nombre}:</b> quedarías en negativo (${fmt(fin)}).`);
  });
  const inv = limpio(texto).match(/Nuevo\s+inventario\s*»([\s\S]*?)(?:Enlaces\s*»([^{\n]*)|$)/i);
  if (inv && (!inv[2] || inv[2].replace(/[\s|·✦—-]/g, '').length < 3)) prob.push('<b>Inventario:</b> faltan los enlaces (son obligatorios).');
  return prob;
}

/** ¿Lleva el mensaje un formulario de bóveda? (si no, no se revisa ni se enseña la barra) */
export const tieneFormulario = t => /(Grageas|Puntos\s+Legendarios)\s+iniciales\s*»|Nuevo\s+inventario\s*»|(Grageas|Puntos\s+Legendarios)\s+restantes\s*[:»]/i.test(limpio(t));

/** «<b>Grageas:</b> falta…» → { b: 'Grageas:', t: ' falta…' } (para pintarlo sin interpretar HTML). */
export function aviso(p) {
  const m = String(p).match(/^<b>([^<]*)<\/b>([\s\S]*)$/);
  return m ? { b: m[1], t: m[2] } : { b: '', t: String(p) };
}

/** Número de tema de una ruta del foro («/t23175-…», «/post?t=23175&mode=reply»). */
export function temaDeRuta(ruta) {
  const r = String(ruta || '');
  const m = r.match(/^\/t(\d+)/); if (m) return +m[1];
  return +(new URLSearchParams(r.split('?')[1] || '').get('t') || 0);
}

/**
 * Lo que el agente necesita para la barra y para «Antes de publicar».
 * @param {{ texto: string, ruta: string }} d
 * @param {any} boveda la bóveda del jugador (datos de Mi PJ), o null
 */
export function revisarEditor({ texto, ruta }, boveda) {
  if (!tieneFormulario(texto)) return { formulario: false, avisos: [] };
  const tema = boveda && (boveda.tema ?? boveda.tid);
  const ref = tema && tema === temaDeRuta(ruta) ? boveda : null;
  return { formulario: true, conBoveda: !!ref, avisos: revisar(texto, ref).map(aviso), encabezado: 'Revisé el formulario de la bóveda y ' };
}
