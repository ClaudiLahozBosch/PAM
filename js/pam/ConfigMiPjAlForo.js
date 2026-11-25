// @ts-check
// «Configurar Mi PJ»: PAM guarda la configuración en `grimorio.mipj.config` y el panel de Mi PJ, dentro del foro, no
// la ve (GUIA-AGENTES §5.2). Igual que el Coloreador (ColoreadorAlForo.js), PAM deja una copia en el almacén del
// agente, `pam.mipj`, al abrir PAM y cada vez que se cambia algo en la página (evento `pam:mipj`).
import { Almacen } from '../core/Almacen.js?v=2.5.1';
import { normalizarConfig } from '../reglas/ConfigMiPj.js?v=2.5.1';

export const CLAVE_PAM = 'grimorio.mipj.config';
/** La versión de PAM (la del ?v= con que se cargó este archivo), para avisar si el script de Tampermonkey es más viejo. */
const VERSION_PAM = (() => { try { return new URL(import.meta.url).searchParams.get('v') || ''; } catch { return ''; } })();
/** ¿Es `a` una versión anterior a `b`? («2.2.0» < «2.2.3») @param {string} a @param {string} b */
export function esAnterior(a, b) {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  if (!x.every(Number.isFinite) || !y.every(Number.isFinite)) return false;
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0; }
  return false;
}
export const CLAVE_AGENTE = 'pam.mipj';

/** @param {Window} w */
export function leerConfigMiPj(w) { return normalizarConfig(Almacen.de(w).leer(CLAVE_PAM, null)); }

/**
 * @param {{ guardarDato: (k: string, v: any) => Promise<any> }} agente @param {Window} w
 * @param {{ agente?: string }} [hola] lo que contestó el agente (para que la página diga que Mi PJ está instalado)
 */
export function publicarConfigMiPj(agente, w, hola = {}, versionPam = VERSION_PAM) {
  let ultima = '';
  const ventana = /** @type {any} */ (w);
  const avisar = (estado, detalle = '', enviado = ventana.pamMiPjEstado?.enviado || 0) => {
    ventana.pamMiPjEstado = { estado, agente: hola.agente || '', detalle, enviado, viejo: !!(hola.agente && versionPam && esAnterior(hola.agente, versionPam)), pam: versionPam };
    w.document.dispatchEvent(new w.CustomEvent('pam:mipj-estado', { detail: ventana.pamMiPjEstado }));
  };
  // forzar (2.2.1, botón «Enviar a Mi PJ ahora»): aunque no haya cambiado nada desde la última copia
  const copiar = (forzar = false) => {
    const c = leerConfigMiPj(w), txt = JSON.stringify(c);
    if (txt === ultima && !forzar) return Promise.resolve();
    ultima = txt;
    avisar('guardando');
    return agente.guardarDato(CLAVE_AGENTE, c).then(() => avisar('ok', '', Date.now()), e => { ultima = ''; avisar('error', String(e?.message || e)); });
  };
  w.document.addEventListener('pam:mipj', e => { copiar(!!(/** @type {any} */ (e).detail?.forzar)); });
  avisar('ok');
  copiar();
  return { copiar };
}
