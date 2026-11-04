// @ts-check
// Arranque de la Tabla de Canjes y el Compendio (fase 8d). Lo importa js/pam/arranque.js en el mismo sitio en que
// estaba dentro de index.html (la primera página). Su HTML sigue en index.html y sus estilos en css/pam.css.
import { Almacen } from '../../core/Almacen.js?v=0.6.4';
import { montarTabla } from './Tabla.js?v=0.6.4';

/**
 * @param {Window} w la ventana de PAM
 * @param {{ traer?: Function }} [o]
 */
export async function montar(w, o = {}) {
  montarTabla(w, { almacen: Almacen.de(w) });
}
