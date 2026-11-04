// @ts-check
// Arranque de la Tabla de Canjes y el Compendio (fase 8d). Lo importa js/pam/arranque.js en el mismo sitio en que
// estaba dentro de index.html (la primera página). Su HTML sigue en index.html y sus estilos en css/pam.css.
import { Almacen } from '../../core/Almacen.js?v=0.6.8';
import { datosTabla } from './datos.js?v=0.6.8';
import { montarTabla } from './Tabla.js?v=0.6.8';

/** La versión de este archivo (?v=…): los datos se piden con la misma. */
const V = new URL(import.meta.url).search;

/**
 * Trae los datos del sistema (R07: data/sistema.json y data/arcanos-calculadora.json; el Compendio ya está en la
 * página, en #arcanos-data) y monta la Tabla.
 * @param {Window} w la ventana de PAM
 * @param {{ traer: (src: string) => Promise<{ ok: boolean, status: number, text(): Promise<string> }> }} o
 */
export async function montar(w, { traer }) {
  const json = async src => {
    const r = await traer(src + V);
    if (!r.ok) throw new Error(`${src} (HTTP ${r.status})`);
    return JSON.parse(await r.text());
  };
  const [sistema, calculadora] = await Promise.all([json('data/sistema.json'), json('data/arcanos-calculadora.json')]);
  const arcanos = JSON.parse(w.document.getElementById('arcanos-data').textContent);
  montarTabla(w, { almacen: Almacen.de(w), datos: datosTabla({ sistema, calculadora, arcanos }) });
}
