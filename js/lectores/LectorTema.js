// @ts-check
// Lee una página de tema de Foroactivo (ya convertida en Document) y saca los mensajes.
// Sustituye a las dos copias de Mi PJ (`postsDe`) y a la del Inspector (`mensajesDe`).
// Funciona con y sin sesión: sin sesión el foro no enlaza el perfil del autor, y entonces solo hay nombre.
import { limpiarForo } from './LectorFicha.js?v=0.6.1';

/**
 * @typedef {{ id: number, autorId: number|null, autor: string, fecha: string, html: string, texto: string, imgs: number }} Mensaje
 * @typedef {{ tema: number|null, foro: number|null, titulo: string, posts: Mensaje[], paginas: string[] }} PaginaTema
 * `foro`: el subforo donde está el tema (el último de la ruta de navegación: «Fichas de personaje › Adultos › Ex-Slytherin»).
 */

/** @param {Document} doc @returns {PaginaTema} */
export function leerPaginaTema(doc) {
  const h1 = doc.querySelector('h1.page-title');
  const titulo = (h1?.textContent ?? '').trim();
  const enlaceTema = h1?.querySelector('a[href]')?.getAttribute('href') ?? '';
  let tema = numero(enlaceTema.match(/\/t(\d+)/)?.[1]);
  const posts = [...doc.querySelectorAll('div.post[id^="p"]')].map(leerMensaje).filter(p => p.id);
  if (tema == null) tema = numero(doc.querySelector('h2.topic-title a[href]')?.getAttribute('href')?.match(/\/t(\d+)/)?.[1]);
  const paginas = [...new Set([...doc.querySelectorAll('a[href]')].map(a => a.getAttribute('href') ?? '')
    .filter(h => tema != null && new RegExp(`^/t${tema}p\\d+-`).test(h)).map(h => h.replace(/#.*$/, '')))];
  const nav = [...doc.querySelectorAll('a.nav[href]')].map(a => numero((a.getAttribute('href') ?? '').match(/^(?:https?:\/\/[^/]+)?\/f(\d+)-/)?.[1])).filter(x => x != null);
  // la ruta sale arriba y abajo de la página: vale la primera, hasta que se repite
  const ruta = nav.slice(0, Math.max(1, nav.indexOf(nav[0], 1) > 0 ? nav.indexOf(nav[0], 1) : nav.length));
  return { tema, foro: ruta.length ? ruta[ruta.length - 1] : null, titulo, posts, paginas };
}

/** @param {Element} p */
function leerMensaje(p) {
  const id = numero(p.id.replace(/\D/g, '')) ?? 0;
  const autorP = p.querySelector('p.author');
  const enlace = p.querySelector('.author a[href^="/u"], .postprofile a[href^="/u"]');
  const autorId = numero(enlace?.getAttribute('href')?.match(/^\/u(\d+)/)?.[1]);
  const autor = (enlace?.textContent || autorP?.querySelector('strong')?.textContent || '').trim();
  let fecha = (autorP?.textContent ?? '').replace(/\s+/g, ' ').replace(/^.*?\bpor\s*/i, '').trim();
  if (autor && fecha.startsWith(autor)) fecha = fecha.slice(autor.length).trim();
  const contenido = p.querySelector('.content');
  const html = contenido?.innerHTML ?? '';
  const imgs = contenido ? contenido.querySelectorAll('img').length : 0;
  return { id, autorId, autor, fecha, html, texto: limpiarForo(html).trim(), imgs }; // texto con sus saltos de línea
}

/** Une los mensajes de varias páginas del mismo tema, sin repetir y en orden. @param {Mensaje[][]} listas */
export function unirMensajes(...listas) {
  const vistos = new Map();
  for (const l of listas) for (const m of l) if (!vistos.has(m.id)) vistos.set(m.id, m);
  return [...vistos.values()].sort((a, b) => a.id - b.id);
}

/** ¿Escribieron los dos mensajes la misma persona? Por id si lo hay; si no, por nombre. */
export function mismoAutor(a, b) {
  if (a.autorId != null && b.autorId != null) return a.autorId === b.autorId;
  const n = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return !!a.autor && n(a.autor) === n(b.autor);
}

function numero(s) { const n = Number(s); return s != null && s !== '' && Number.isFinite(n) ? n : null; }

/**
 * Texto de un mensaje con espacios entre etiquetas y saltos en los bloques: el que leía Mi PJ para el sueldo,
 * las misiones y los oficiales (sus reglas buscan frases y líneas en este texto).
 * @param {Element} el
 */
export function textoDe(el) {
  const out = []; const w = /** @type {Document} */ (el.ownerDocument).createTreeWalker(el, 1 | 4); // elementos y textos
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) { if (!/^(STYLE|SCRIPT)$/.test(n.parentNode ? n.parentNode.nodeName : '')) out.push(n.nodeValue); }
    else if (/^(BR|DIV|P|LI|TR|H\d)$/.test(n.nodeName)) out.push('\n');
    else if (/^(TD|SPAN|STRONG|B|I|EM|FONT|DD|DT|LABEL|A)$/.test(n.nodeName)) out.push(' ');
  }
  return out.join('').replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
}

/**
 * Los mensajes de una página como los leía Mi PJ (`postsDe`): id en texto, autor, la fecha tal como sale
 * («Lun 2 Mar 2026 - 10:00») y el texto de `textoDe`.
 * @param {Document} doc
 * @param {RegExp} fecha la expresión de FechaForo.FECHA
 * @returns {{ id: string, autor: string, fecha: string, texto: string, imgs: number }[]}
 */
export function postsDeMiPj(doc, fecha) {
  return [...doc.querySelectorAll('div.post')].filter(e => /^p\d+$/.test(e.id)).map(p => {
    const a = p.querySelector('.author a[href*="/u"]'), au = p.querySelector('.author'), c = p.querySelector('.content') || p;
    return { id: p.id.slice(1), autor: a ? (a.textContent ?? '').trim() : '', fecha: ((au ? au.textContent ?? '' : '').match(fecha) || [''])[0],
      texto: textoDe(c), imgs: c.querySelectorAll('img').length };
  });
}
