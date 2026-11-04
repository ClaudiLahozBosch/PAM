// @ts-check
// Arranque del Registro de Roles y del Coloreador (fase 8b). Lo importa js/pam/arranque.js entre las páginas antiguas,
// en el mismo sitio en que estaba el Registro dentro de index.html (después de Mi Ficha, antes de la portada).
import { Almacen } from '../../core/Almacen.js?v=0.6.0';
import { montarRegistro } from './RegistroRoles.js?v=0.6.0';

/** La versión de este archivo (?v=…): los estilos y la plantilla se piden con la misma. */
const V = new URL(import.meta.url).search;

/**
 * Trae los estilos y el HTML del Registro y lo monta en la página.
 * @param {Window} w la ventana de PAM
 * @param {{ traer: (src: string) => Promise<{ ok: boolean, status: number, text(): Promise<string> }> }} o
 */
export async function montar(w, { traer }) {
  const texto = async src => {
    const r = await traer(src + V);
    if (!r.ok) throw new Error(`${src} (HTTP ${r.status})`);
    return r.text();
  };
  const [css, html] = await Promise.all([texto('css/registro.css'), texto('js/paginas/registro/plantilla.html')]);
  const almacen = Almacen.de(w);
  almacen.vigilarSalida(w); // F14: lo pendiente se guarda al cerrar o esconder la pestaña
  montarRegistro(w, { css, html, almacen });
}
