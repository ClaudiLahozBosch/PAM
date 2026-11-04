// @ts-check
// Arranque del Registro de Roles y del Coloreador (fase 8b). Lo importa js/pam/arranque.js entre las páginas antiguas,
// en el mismo sitio en que estaba el Registro dentro de index.html (después de Mi Ficha, antes de la portada).
import { Almacen } from '../../core/Almacen.js?v=0.6.8';
import { montarRegistro } from './RegistroRoles.js?v=0.6.8';
import { crearDatosDeseos } from './deseos.js?v=0.6.8';

/** La versión de este archivo (?v=…): los estilos, la plantilla y los datos se piden con la misma. */
const V = new URL(import.meta.url).search;

/**
 * Trae los estilos, el HTML y los datos de la lista de deseos (8c) y monta el Registro en la página.
 * @param {Window} w la ventana de PAM
 * @param {{ traer: (src: string) => Promise<{ ok: boolean, status: number, text(): Promise<string> }> }} o
 */
export async function montar(w, { traer }) {
  const texto = async src => {
    const r = await traer(src + V);
    if (!r.ok) throw new Error(`${src} (HTTP ${r.status})`);
    return r.text();
  };
  const [cssRegistro, efectos, html, sistema, calculadora, arcanos] = await Promise.all([
    texto('css/registro.css'), texto('css/efectos.css'), texto('js/paginas/registro/plantilla.html'),
    texto('data/sistema.json'), texto('data/arcanos-calculadora.json'), texto('data/arcanos.json')]);
  // F17 (8e): las partículas y las calabazas, una sola vez (css/efectos.css, también los usa la página), en su sitio
  const MARCA = '/* @efectos: aquí va css/efectos.css (lo pone js/paginas/registro/main.js) */';
  if (!cssRegistro.includes(MARCA)) throw new Error('css/registro.css sin la marca de los efectos');
  const css = cssRegistro.replace(MARCA, () => efectos.replace(/^\/\*.*\*\/\n/, ''));
  const deseos = crearDatosDeseos({ sistema: JSON.parse(sistema), calculadora: JSON.parse(calculadora), arcanos: JSON.parse(arcanos) });
  const almacen = Almacen.de(w);
  almacen.vigilarSalida(w); // F14: lo pendiente se guarda al cerrar o esconder la pestaña
  montarRegistro(w, { css, html, almacen, deseos });
}
