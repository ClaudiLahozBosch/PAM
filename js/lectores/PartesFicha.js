// @ts-check
// Qué mensajes de un tema de ficha son la ficha VIGENTE y cuáles son historial (auditoría F01 y F05).
//
// Regla (comprobada con la ficha real de Irvin Giles, cinco partes con el sello de revisión en medio):
//   · las partes son los mensajes del dueño que parecen ficha, en orden desde el principio del tema;
//   · los mensajes de otras personas entre medio (sello, revisión, un consejo) no cortan la ficha;
//   · la ficha termina en el primer mensaje del dueño que no parece ficha o que es una actualización
//     («Ficha actualizada…», enlace al Registro de Canjes o a la bóveda). Desde ahí, lo del dueño es historial,
//     aunque sea largo y tenga líneas que parecen trasfondos («● Biblioteca I: Cultura Muggle»).
// Antes, Mi PJ leía solo el primer mensaje y el Inspector cogía cualquier mensaje del dueño de más de 800 caracteres.
import { mismoAutor } from './LectorTema.js?v=0.6.2';

// Marcas típicas de una parte de ficha: etiquetas «▋ Algo:», flechas «→ Vigor:», o secciones conocidas.
const MARCAS = /▋|→\s*[A-ZÁÉÍÓÚ][^:\n]{1,40}:|\b(?:Nombre y Apellido|Atributos|Habilidades|HECHIZOS|POCIONES|RITUALES|TRASFONDOS|Trasfondos|BIBLIOTECA|INFORMANTES|INFLUENCIA|SEGUIDORES|VENTAJAS|IDIOMAS|Idiomas|TALENTOS|Talentos|RAZA)\b/;
// Un aviso de actualización empieza así. (Los enlaces al Registro de Canjes NO sirven de señal: la parte
// «Otros» de una ficha también los tiene, para justificar talentos y vínculos.)
const ACTUALIZACION = /^\W*(?:ficha\s+actualizada|actualizaci[oó]n\b|canjes?\s*:)/i;

/** @param {import('./LectorTema.js').Mensaje} p */
export function esActualizacion(p) {
  const primera = (p.texto || '').split('\n').find(l => l.trim()) ?? '';
  return ACTUALIZACION.test(primera);
}

/**
 * @param {import('./LectorTema.js').Mensaje[]} posts mensajes del tema en orden
 * @returns {{ dueno: {id: number|null, nombre: string} | null, partes: import('./LectorTema.js').Mensaje[], historial: import('./LectorTema.js').Mensaje[] }}
 */
export function partesVigentes(posts) {
  if (!posts.length) return { dueno: null, partes: [], historial: [] };
  const primero = posts[0];
  const delDueno = posts.filter(p => mismoAutor(p, primero));
  const partes = [primero];
  let i = 1;
  for (; i < delDueno.length; i++) {
    const p = delDueno[i];
    if (esActualizacion(p) || !MARCAS.test(p.texto || p.html)) break;
    partes.push(p);
  }
  return { dueno: { id: primero.autorId, nombre: primero.autor }, partes, historial: delDueno.slice(i) };
}
