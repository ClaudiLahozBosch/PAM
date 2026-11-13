// @ts-check
// 2.1.0: el botón «Colorear diálogos» de Mi PJ (debajo del editor del foro) usa la configuración del Coloreador de
// PAM. El panel de Mi PJ está dentro del foro y Chrome no le deja ver lo que PAM guarda en el navegador (GUIA-AGENTES
// §5.2), así que PAM deja una copia en el almacén del agente, `pam.coloreador`:
//   { v: 1, general: config, pjs: [{ nombre, config }] }
// con config = { names, marks, dlgf, tag, opts } (lo de `cd_pj.<id>`; `general` es lo de ahora, cd_names, cd_tag…).
// Se copia al abrir PAM y cada vez que se cambia algo en el Coloreador (evento `pam:coloreador`).
import { Almacen } from '../core/Almacen.js?v=2.1.2';

/** La configuración actual del Coloreador y la de cada personaje de Mi Ficha, como la guarda PAM. @param {Window} w */
export function configuracionColoreador(w) {
  const almacen = Almacen.de(w);
  const leer = (k, d) => almacen.leer(k, d);
  const general = { names: leer('cd_names', []), marks: leer('cd_marks', []), dlgf: leer('cd_dlgf', {}), tag: leer('cd_tag', ''), opts: leer('cd_opts', null) };
  /** @type {{ nombre: string, config: any }[]} */
  const pjs = [];
  let lista = [];
  try { lista = /** @type {any} */ (w).pamPjs?.lista() || []; } catch { /* sin Mi Ficha */ }
  for (const p of lista) {
    const c = leer('cd_pj.' + p.id, null);
    if (c && typeof c === 'object' && p.nombre) pjs.push({ nombre: p.nombre, config: c });
  }
  return { v: 1, general, pjs };
}

/**
 * Copia la configuración al almacén del agente ahora y después de cada cambio (agrupando los cambios seguidos).
 * @param {{ guardarDato: (k: string, v: any) => Promise<any> }} agente @param {Window} w
 */
export function publicarColoreador(agente, w) {
  let ultima = '', espera = null;
  const copiar = () => {
    espera = null;
    const c = configuracionColoreador(w), txt = JSON.stringify(c);
    if (txt === ultima) return;
    ultima = txt;
    agente.guardarDato('pam.coloreador', c).catch(e => { ultima = ''; console.warn('[PAM] coloreador para Mi PJ:', e); });
  };
  const luego = () => { if (espera) clearTimeout(espera); espera = setTimeout(copiar, 800); };
  w.document.addEventListener('pam:coloreador', luego);
  w.document.addEventListener('pam:pjs', luego); // un personaje nuevo o con otro nombre
  copiar();
  return { copiar };
}
