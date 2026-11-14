// @ts-check
// 2.1.0: el botón «Colorear diálogos» de Mi PJ en el editor del foro. Usa la configuración del Coloreador de PAM que
// PAM deja en el almacén del agente (`pam.coloreador`, js/pam/ColoreadorAlForo.js): la del personaje que tiene el
// nombre de la cuenta con la que se escribe y, si no tiene, la general.
import { colorearConConfig, descolorear } from '../bbcode/Dialogos.js?v=2.1.3';
import { normNombre } from '../core/texto.js?v=2.1.3';

/** Solo para contar diálogos cuando PAM todavía no pasó ninguna configuración. */
const POR_DEFECTO = { tag: '#ffffff', names: [], marks: [], dlgf: {}, opts: { raya: true, guion: true, comillas: true } };

/**
 * @param {{ leerDato: (k: string) => Promise<any> }} agente
 * @param {{ cuenta: () => (string|null) }} op el nombre de la cuenta del foro (puede llegar después)
 */
export function crearColoreadorDelForo(agente, { cuenta }) {
  let copia = null, leida = 0;
  async function guardado() {
    if (Date.now() - leida > 5000) { // PAM puede haber cambiado algo en otra pestaña
      try { copia = await agente.leerDato('pam.coloreador'); } catch { /* sin almacén */ }
      leida = Date.now();
    }
    return copia && copia.v === 1 ? copia : null;
  }

  /** La configuración que toca: la del personaje con el nombre de la cuenta, o la general. */
  function elegir(g) {
    const yo = normNombre(cuenta() || '');
    const pj = yo ? (g.pjs || []).find(p => normNombre(p.nombre) === yo) : null;
    if (pj) return { config: pj.config, quien: String(pj.nombre).trim().replace(/[.]+$/, '') };
    return { config: g.general, quien: null };
  }

  return {
    /**
     * Para la barra del editor: cuántos tramos de diálogo hay y si ya está coloreado con esta configuración.
     * @param {string} texto
     */
    async contar(texto) {
      const g = await guardado();
      const { config, quien } = g ? elegir(g) : { config: POR_DEFECTO, quien: null };
      const t = String(texto).replace(/\r\n?/g, '\n'); // el foro lo devuelve con \r\n al previsualizar
      const limpio = descolorear(t, config);
      const r = colorearConConfig(limpio, config);
      // coloreado: tiene colores de esta configuración (sale «Quitar colores»); cambiaria: «Colorear» haría algo
      // (2.1.3: si se añadió otro diálogo después de colorear, vuelve a salir «Colorear diálogos»)
      return { dialogos: r.count, coloreado: limpio !== t, cambiaria: r.count > 0 && r.code.toLowerCase() !== t.toLowerCase(), sinConfig: !g, quien };
    },
    /**
     * 2.1.3: el texto sin los colores de esta configuración («Quitar colores» cuando el agente ya no tiene el de antes,
     * p. ej. después de previsualizar o de pasar de la respuesta rápida al editor completo).
     * @param {string} texto
     */
    async descolorear(texto) {
      const g = await guardado();
      const { config } = g ? elegir(g) : { config: POR_DEFECTO };
      return { texto: descolorear(String(texto).replace(/\r\n?/g, '\n'), config) };
    },
    /**
     * El texto coloreado (sin pintar dos veces lo que ya estaba coloreado con esta configuración).
     * @param {string} texto
     */
    async colorear(texto) {
      const g = await guardado();
      if (!g) return { sinConfig: true, texto, tramos: 0, quien: null };
      const { config, quien } = elegir(g);
      const r = colorearConConfig(descolorear(texto, config), config);
      return { sinConfig: false, texto: r.code, tramos: r.count, nombres: r.names, quien };
    }
  };
}
