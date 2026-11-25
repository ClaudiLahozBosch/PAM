// @ts-check
// Lo que el panel contesta al agente sobre el editor del foro: la revisión de la bóveda (la barra de debajo y «Antes de
// publicar») y los botones «Colorear diálogos» / «Quitar colores» (2.1.0, 2.1.4). Desde la 2.2.0 cada cosa se puede
// apagar en «Configurar Mi PJ» (`on(grupo, id)`, js/reglas/ConfigMiPj.js):
//   · sin revisión de la bóveda: `formulario: false` y sin avisos (el agente no pinta la barra ni para el envío);
//   · sin un botón: el agente no lo enseña (cambiaria / colores en false) y, si igual llega el pedido, el texto no cambia.
import { revisarEditor } from '../reglas/RevisorBoveda.js?v=2.5.1';

/**
 * @param {{ atender: (tipo: string, fn: (d: any) => any) => any }} agente
 * @param {{ coloreador: { contar: (t: string) => Promise<any>, colorear: (t: string) => any, descolorear: (t: string) => any },
 *   boveda: () => any, on?: (g: 'foro', id: string) => boolean, alPedir?: () => any }} op
 */
export function atenderEditor(agente, { coloreador, boveda, on = () => true, alPedir = () => {} }) {
  agente.atender('editor.revisar', async d => {
    // 2.2.3: espera a tener la configuración (como mucho 0,6 s; el agente espera 3 s): si no, al abrir el foro la
    // primera respuesta podía salir con todo encendido, y un agente anterior a la 2.2.2 ya no volvía a preguntar
    await Promise.race([Promise.resolve(alPedir()).catch(() => {}), new Promise(r => setTimeout(r, 600))]);
    const texto = String(d.texto ?? '');
    const r = revisarEditor({ texto, ruta: String(d.ruta ?? '') }, boveda());
    if (!on('foro', 'boveda')) { r.formulario = false; r.avisos = []; }
    if (on('foro', 'colorear') || on('foro', 'quitar')) {
      try {
        r.colorear = await coloreador.contar(texto);
        if (!on('foro', 'colorear')) r.colorear.cambiaria = false;
        if (!on('foro', 'quitar')) r.colorear.colores = false;
      } catch { /* sin botón */ }
    }
    return r;
  });
  agente.atender('editor.colorear', d => (on('foro', 'colorear') ? coloreador.colorear(String(d.texto ?? '')) : { texto: String(d.texto ?? '') }));
  agente.atender('editor.descolorear', d => (on('foro', 'quitar') ? coloreador.descolorear(String(d.texto ?? '')) : { texto: String(d.texto ?? '') }));
}
