// @ts-check
// Arranque de Mi Ficha, el Controlador de stats y el Revisor de Empleos (fase 8c). Lo importa js/pam/arranque.js en el
// mismo sitio en que estaba dentro de index.html (después de la Tabla de Canjes, antes del Registro de Roles).
// Su HTML sigue en index.html (<template id="re-template">) y sus estilos en css/pam.css, como antes.
import { Almacen } from '../../core/Almacen.js?v=0.6.2';
import { montarRevisor } from './Revisor.js?v=0.6.2';

/**
 * @param {Window} w la ventana de PAM
 * @param {{ traer?: Function }} [o]
 */
export async function montar(w, o = {}) {
  montarRevisor(w, { almacen: Almacen.de(w) });
}
