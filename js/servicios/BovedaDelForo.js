// @ts-check
// Leer la bóveda de un personaje desde el foro (a través del agente): la primera página (cabecera) y las
// dos últimas (los movimientos recientes), como hacía Mi PJ.
import { leerPaginaTema, unirMensajes } from '../lectores/LectorTema.js?v=0.3.5';
import { analizarBoveda } from '../lectores/LectorBoveda.js?v=0.3.5';

/** Última página de un tema a partir de los enlaces de paginación («/t123p45-…»). @param {string[]} paginas */
export function ultimaPagina(paginas) {
  let max = -1, ruta = null;
  for (const p of paginas) { const off = Number(p.match(/\/t\d+p(\d+)-/)?.[1]); if (off > max) { max = off; ruta = p; } }
  return { ruta, desplazamiento: max };
}

/**
 * @param {{ leer(ruta: string): Promise<Document> }} agente
 * @param {string} ruta «/t23175-» (cualquier enlace al tema)
 */
export async function leerBovedaDelForo(agente, ruta) {
  const tema = String(ruta).match(/\/t(\d+)/)?.[1];
  if (!tema) throw new Error('Enlace de bóveda no válido: ' + ruta);
  const p1 = leerPaginaTema(await agente.leer(`/t${tema}-`));
  const { ruta: ult, desplazamiento } = ultimaPagina(p1.paginas);
  const listas = [p1.posts];
  if (ult) {
    // la penúltima también: si la última solo tiene una nota, el último movimiento queda antes
    const pen = desplazamiento > 15 ? ult.replace(/\/t(\d+)p\d+-/, `/t$1p${desplazamiento - 15}-`) : null;
    if (pen) { try { listas.push(leerPaginaTema(await agente.leer(pen)).posts); } catch { /* sin penúltima */ } }
    listas.push(leerPaginaTema(await agente.leer(ult)).posts);
  }
  return analizarBoveda(unirMensajes(...listas), { url: `/t${tema}-`, titulo: p1.titulo });
}
