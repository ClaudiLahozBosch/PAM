// @ts-check
// Arranque de Mi Ficha, el Controlador de stats y el Revisor de Empleos (fase 8c). Lo importa js/pam/arranque.js en el
// mismo sitio en que estaba dentro de index.html (después de la Tabla de Canjes, antes del Registro de Roles).
// Su HTML sigue en index.html (<template id="re-template">) y sus estilos en css/pam.css, como antes.
import { Almacen } from '../../core/Almacen.js?v=2.1.1';
import { iniciarDatos } from './datos.js?v=2.1.1';
import { montarRevisor } from './Revisor.js?v=2.1.1';

/** La versión de este archivo (?v=…): los datos se piden con la misma. */
const V = new URL(import.meta.url).search;

/**
 * Trae los datos del sistema (R07: data/sistema.json) y monta las pantallas.
 * @param {Window} w la ventana de PAM
 * @param {{ traer: (src: string) => Promise<{ ok: boolean, status: number, text(): Promise<string> }> }} o
 */
export async function montar(w, { traer }) {
  const r = await traer('data/sistema.json' + V);
  if (!r.ok) throw new Error(`data/sistema.json (HTTP ${r.status})`);
  iniciarDatos(JSON.parse(await r.text()));
  montarRevisor(w, { almacen: Almacen.de(w) });
}
