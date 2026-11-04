// @ts-check
// N07: el «Código para el foro» de Mi Ficha (modo «Personalizada») con el editor nuevo (js/bbcode/EditorFicha.js).
// Mi Ficha (js/paginas/revisor/Revisor.js, actualizarCodigo) lo usa si está: js/pam/arranque.js lo deja en
// window.PAM_EDITOR antes de cargar las páginas. Si no está (o falla), PAM sigue con el «Personalizada» antiguo.
// Mismo resultado que antes ({ code, hechos, manual }), pero:
//   · las líneas nuevas van dentro de su desplegable (R01), al quitar no se lleva los cierres (R02) y quedan en orden (R03);
//   · también idiomas, trasfondos, ventajas, especializaciones, talentos y títulos (R06);
//   · cada cambio se comprueba volviendo a leer el código; lo que no queda, a «Revisá a mano».
import { EditorFicha } from '../bbcode/EditorFicha.js?v=0.7.0';
import { aplicarEdicion, yaAvisado } from '../reglas/CambiosFicha.js?v=0.7.0';

/**
 * @param {{ sistema: import('../datos/Sistema.js').Sistema, compendio: import('../datos/Compendio.js').Compendio,
 *   lector: import('../lectores/LectorFicha.js').LectorFicha }} datos
 */
export function crearEditorPam({ sistema, compendio, lector }) {
  const editor = new EditorFicha(sistema, compendio, lector);
  const copia = x => JSON.parse(JSON.stringify(x == null ? {} : x)); // la ficha llega de la página de PAM
  return {
    /**
     * Tu código del foro con lo que cambiaste en PAM desde que lo guardaste (como actualizarCodigo).
     * @param {string} codigo el código guardado @param {any} base la ficha de PAM de entonces @param {any} actual la de ahora
     * @returns {{ code: string, hechos: string[], manual: string[] }}
     */
    actualizar(codigo, base, actual) {
      const partes = [{ post: 1, bbcode: String(codigo) }];
      const foro = lector.leer(partes).ficha;
      const { despues, manual, comprobar } = aplicarEdicion(foro, copia(base), copia(actual), { sistema, compendio });
      const ed = editor.aplicar(foro, despues);
      const code = ed.partes[0].despues;
      const aMano = [...manual, ...ed.manual];
      for (const q of comprobar(lector.leer([{ post: 1, bbcode: code }]).ficha)) if (!yaAvisado(aMano, q)) aMano.push(q + ': no quedó en tu código; cambialo a mano');
      return { code, hechos: [...new Set(ed.hechos)], manual: aMano };
    }
  };
}
