// @ts-check
// Lee una página de tema de Foroactivo (ya convertida en Document) y saca los mensajes.
// Sustituye a las dos copias de Mi PJ (`postsDe`) y a la del Inspector (`mensajesDe`).
// Funciona con y sin sesión: sin sesión el foro no enlaza el perfil del autor, y entonces solo hay nombre.
import { limpiarForo } from './LectorFicha.js';

/**
 * @typedef {{ id: number, autorId: number|null, autor: string, fecha: string, html: string, texto: string }} Mensaje
 * @typedef {{ tema: number|null, titulo: string, posts: Mensaje[], paginas: string[] }} PaginaTema
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
  return { tema, titulo, posts, paginas };
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
  return { id, autorId, autor, fecha, html, texto: limpiarForo(html).trim() }; // texto con sus saltos de línea
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
