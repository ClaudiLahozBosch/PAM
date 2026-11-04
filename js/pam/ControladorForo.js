// @ts-check
// El «controlador» de PAM para lo que llega del foro a través del agente. Es la única puerta de entrada:
// lee lo que el foro dejó en el almacén del agente, lo comprueba y se lo pasa a PAM (PamActual), siempre después
// de la puerta Aceptar / Denegar: los oficiales de la Biblioteca y los canjes (preparar la petición y cerrarla).
import { abrirPuerta } from './ui/Puerta.js?v=0.7.0';
import { crearCanjesPam } from './CanjesPam.js?v=0.7.0';

const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * @param {{ agente: { leerDato(k: string): Promise<any>, guardarDato(k: string, v: any): Promise<any> },
 *   pam: ReturnType<typeof import('./PamActual.js').crearPamActual>, doc: Document, foros?: Record<string, any> }} dep
 */
export function crearControladorForo({ agente, pam, doc, foros = {} }) {
  let abierta = false;
  const canjes = crearCanjesPam({ agente, pam, doc, foros });

  /* Los oficiales que mandó la Biblioteca (pam.oficiales) se muestran en la puerta y se suman a «Posibles oficiales».
     Como recibirOficialesEnPAM() de Mi PJ 1.7.1, con el mismo texto. */
  async function revisarOficiales() {
    if (abierta) return;
    let p = null;
    try { p = await agente.leerDato('pam.oficiales'); } catch (e) { return; }
    if (!p || p.usado || !Array.isArray(p.items) || !pam.hayOficiales()) return;
    let prev; try { prev = pam.previaOficiales(p.items, p.estados || {}); } catch (e) { return; }
    const marcar = r => { p.usado = { fecha: new Date().toISOString(), resultado: r }; return agente.guardarDato('pam.oficiales', p).catch(() => {}); };
    if (!prev.nuevos.length && !prev.cambios.length) { await marcar('igual'); return; }
    abierta = true;
    const lista = (t, xs) => xs.length ? `<div class="p-nota" style="margin-top:4px"><b>${t}</b></div><div class="p-diff" style="white-space:normal;max-height:260px;font-family:inherit;font-size:13px">${xs.join('')}</div>` : '';
    const vista = doc.createElement('div'); vista.className = 'p-vista';
    vista.innerHTML = lista(`Nuevos (${prev.nuevos.length})`, prev.nuevos.map(x => `<div class="d mas">${x.fav ? '★ ' : ''}${esc(x.nombre)} <span style="opacity:.7">· ${esc(x.relacion)}</span></div>`))
      + lista(`Se actualizan (${prev.cambios.length})`, prev.cambios.map(c => `<div class="d">${esc(c.nombre)}: ${c.estado ? `${esc(c.antes)} → <b>${esc(c.estado)}</b>` : ''}${c.fav ? ' ★ favorito' : ''}</div>`));
    const accion = {
      titulo: 'Oficiales del foro → PAM',
      explicacion: `Desde la Biblioteca de oficiales de Mi PJ (${p.modo === 'favoritos' ? 'solo tus ★' : 'todos los libres y abandonados'}). Los que ya tenés no se repiten.`,
      pasos: [{ tipo: 'pam', titulo: 'Posibles oficiales', vista, ejecutar: () => { const r = pam.aplicarOficiales(p.items, p.estados || {}); marcar('aceptada'); return Promise.resolve({ estado: 'ok', detalle: r }); } }],
      enlaceFinal: { texto: 'Ver Posibles oficiales', alPulsar: () => pam.verSeccion('oficiales') }
    };
    try {
      const res = await abrirPuerta(doc, 'Biblioteca de oficiales', accion);
      await marcar(res && res.resultado);
    } finally { abierta = false; }
  }

  return { revisarOficiales, canjes };
}
