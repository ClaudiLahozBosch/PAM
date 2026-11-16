// @ts-check
// «Configurar Mi PJ»: PAM guarda la configuración en `grimorio.mipj.config` y el panel de Mi PJ, dentro del foro, no
// la ve (GUIA-AGENTES §5.2). Igual que el Coloreador (ColoreadorAlForo.js), PAM deja una copia en el almacén del
// agente, `pam.mipj`, al abrir PAM y cada vez que se cambia algo en la página (evento `pam:mipj`).
import { Almacen } from '../core/Almacen.js?v=2.2.0';
import { normalizarConfig } from '../reglas/ConfigMiPj.js?v=2.2.0';

export const CLAVE_PAM = 'grimorio.mipj.config';
export const CLAVE_AGENTE = 'pam.mipj';

/** @param {Window} w */
export function leerConfigMiPj(w) { return normalizarConfig(Almacen.de(w).leer(CLAVE_PAM, null)); }

/**
 * @param {{ guardarDato: (k: string, v: any) => Promise<any> }} agente @param {Window} w
 * @param {{ agente?: string }} [hola] lo que contestó el agente (para que la página diga que Mi PJ está instalado)
 */
export function publicarConfigMiPj(agente, w, hola = {}) {
  let ultima = '';
  const ventana = /** @type {any} */ (w);
  const avisar = (estado, detalle = '') => {
    ventana.pamMiPjEstado = { estado, agente: hola.agente || '', detalle };
    w.document.dispatchEvent(new w.CustomEvent('pam:mipj-estado', { detail: ventana.pamMiPjEstado }));
  };
  const copiar = () => {
    const c = leerConfigMiPj(w), txt = JSON.stringify(c);
    if (txt === ultima) return Promise.resolve();
    ultima = txt;
    avisar('guardando');
    return agente.guardarDato(CLAVE_AGENTE, c).then(() => avisar('ok'), e => { ultima = ''; avisar('error', String(e?.message || e)); });
  };
  w.document.addEventListener('pam:mipj', () => { copiar(); });
  avisar('ok');
  copiar();
  return { copiar };
}
