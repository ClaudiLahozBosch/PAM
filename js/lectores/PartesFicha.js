// @ts-check
// Qué mensajes de un tema de ficha son la ficha VIGENTE y cuáles son historial (auditoría F01 y F05).
//
// Regla: la ficha son los mensajes seguidos del dueño desde el principio del tema, hasta el primer
// mensaje de otra persona (normalmente la revisión o el sello). Lo que el dueño escribe después
// (avisos de canje, actualizaciones, copias de partes antiguas) es historial: no se mezcla con la ficha
// aunque sea largo. Antes, Mi PJ leía solo el primer mensaje y el Inspector cogía cualquier mensaje del
// dueño de más de 800 caracteres.
import { mismoAutor } from './LectorTema.js';

// Marcas típicas de una parte de ficha: etiquetas «▋ Algo:», flechas «→ Vigor:», o secciones conocidas.
const MARCAS = /▋|→\s*[A-ZÁÉÍÓÚ][^:\n]{1,40}:|\b(?:Nombre y Apellido|Atributos|Habilidades|HECHIZOS|POCIONES|RITUALES|TRASFONDOS|BIBLIOTECA|INFORMANTES|INFLUENCIA|SEGUIDORES|VENTAJAS|IDIOMAS|TALENTOS|RAZA)\b/;

/**
 * @param {import('./LectorTema.js').Mensaje[]} posts mensajes del tema en orden
 * @returns {{ dueno: {id: number|null, nombre: string} | null, partes: import('./LectorTema.js').Mensaje[], historial: import('./LectorTema.js').Mensaje[] }}
 */
export function partesVigentes(posts) {
  if (!posts.length) return { dueno: null, partes: [], historial: [] };
  const primero = posts[0];
  const partes = [primero];
  let i = 1;
  for (; i < posts.length; i++) {
    const p = posts[i];
    if (!mismoAutor(p, primero)) break;
    if (!MARCAS.test(p.texto || p.html)) break; // un mensaje corto del dueño (p. ej. «ya está») cierra la ficha
    partes.push(p);
  }
  const historial = posts.slice(i).filter(p => mismoAutor(p, primero));
  return { dueno: { id: primero.autorId, nombre: primero.autor }, partes, historial };
}
