// @ts-check
// Leer la ficha de un personaje desde el foro, de principio a fin, a través del agente:
//   tema → mensajes → partes vigentes → código de cada parte → Ficha → a qué personaje corresponde.
// Lo usarán Mi PJ (tu ficha) y el Inspector (fichas de otros), con el mismo lector.
import { leerPaginaTema, unirMensajes, mismoAutor } from '../lectores/LectorTema.js?v=0.3.4';
import { partesVigentes } from '../lectores/PartesFicha.js?v=0.3.4';
import { normNombre } from '../core/texto.js?v=0.3.4';

const FORO_FICHAS_PENDIENTES = 21; // «Solicitud de Ficha de Personaje»

/**
 * Revisada o pendiente, como lo decidía Mi PJ: pendiente si está en el subforo de solicitudes o si el dueño
 * escribió después del último sello (mensaje de otra persona con imagen y casi sin texto).
 * @param {import('../lectores/LectorTema.js').Mensaje[]} posts @param {number|null} foro
 */
export function estadoFicha(posts, foro) {
  let sello = null, ultDueno = null;
  for (const p of posts.slice(1)) {
    if (mismoAutor(p, posts[0])) ultDueno = p;
    else if (p.imgs && p.texto.trim().length < 40) sello = p;
  }
  let estado = foro === FORO_FICHAS_PENDIENTES ? 'pendiente' : 'revisada';
  if (ultDueno && (!sello || ultDueno.id > sello.id)) estado = 'pendiente';
  return { estado, sello: sello ? { autor: sello.autor, fecha: sello.fecha } : null };
}

/**
 * @param {{ leer(ruta: string): Promise<Document> }} agente el ClienteAgente (o uno de prueba)
 * @param {string} ruta «/t23113-irvin-giles» o cualquier enlace al tema
 * @param {{ lector: import('../lectores/LectorFicha.js').LectorFicha, cuentaId?: number|null }} op
 *        si la ficha es de la cuenta conectada se lee el BBCode original (editar mensaje); si no, el HTML publicado
 */
export async function leerFichaDelForo(agente, ruta, { lector, cuentaId = null }) {
  const tema = String(ruta).match(/\/t(\d+)/)?.[1];
  if (!tema) throw new Error('Enlace de ficha no válido: ' + ruta);
  const pag = leerPaginaTema(await agente.leer(`/t${tema}-`));
  const { dueno, partes, historial } = partesVigentes(pag.posts);
  if (!partes.length) throw new Error('No encuentro mensajes en el tema t' + tema);
  const propia = cuentaId != null && dueno?.id === cuentaId;
  const entradas = [];
  for (const p of partes) {
    let bbcode = p.html, codigo = false;
    if (propia) {
      try {
        const d = await agente.leer(`/post?p=${p.id}&mode=editpost`);
        const ta = /** @type {HTMLTextAreaElement|null} */ (d.querySelector('form[name="post"] textarea[name="message"]'));
        if (ta) { bbcode = ta.value; codigo = true; }
      } catch { /* se queda con el HTML */ }
    }
    entradas.push({ post: p.id, bbcode, codigo });
  }
  const { ficha, resumen } = lector.leer(entradas, { tema: pag.tema ?? Number(tema) });
  entradas.forEach((e, i) => { ficha.partes[i].seccion = e.codigo ? 'bbcode' : 'html'; });
  // revisada o pendiente: con la primera y la última página, como Mi PJ
  let todos = pag.posts;
  const ultima = [...pag.paginas].sort((a, b) => Number(b.match(/p(\d+)-/)?.[1]) - Number(a.match(/p(\d+)-/)?.[1]))[0];
  if (ultima) { try { todos = unirMensajes(pag.posts, leerPaginaTema(await agente.leer(ultima)).posts); } catch { /* solo la primera */ } }
  const { estado, sello } = estadoFicha(todos, pag.foro);
  return { tema: pag.tema ?? Number(tema), foro: pag.foro, titulo: pag.titulo, dueno, ficha, resumen, historial: historial.map(h => h.id), propia, estado, sello,
    codigo: entradas.reduce((n, e) => n + e.bbcode.length, 0) };
}

/**
 * ¿A qué personaje guardado corresponde una ficha leída del foro? (auditoría F03)
 *  · «exacto»: ya estaba vinculado a ese tema → se actualiza ese, sin preguntar.
 *  · «sugerido»: no hay ninguno vinculado, pero uno sin tema se llama igual («Irvin Giles» = «Irvin Giles.») → preguntar.
 *  · «nuevo»: no hay ninguno parecido → se crea (también preguntando).
 * Nunca se reutiliza en silencio un personaje que ya es de otro tema.
 * @param {import('../modelos/Personaje.js').Personaje[]} personajes
 * @param {{ foro: string, tema: number, nombre: string }} ficha
 */
export function asociarPersonaje(personajes, { foro, tema, nombre }) {
  const exacto = personajes.find(p => p.esDelTema(foro, tema));
  if (exacto) return { tipo: 'exacto', personaje: exacto };
  const parecido = personajes.find(p => p.tema == null && normNombre(p.ficha.nombre) === normNombre(nombre));
  if (parecido) return { tipo: 'sugerido', personaje: parecido };
  return { tipo: 'nuevo', personaje: null };
}
