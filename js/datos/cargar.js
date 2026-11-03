// @ts-check
// Carga los datos del sistema. En el navegador, con fetch relativo a este archivo (funciona igual en
// producción y en el staging); en las pruebas se le pasa el lector de archivos.
import { Sistema } from './Sistema.js';
import { Compendio } from './Compendio.js';

const RAIZ = new URL('../../data/', import.meta.url);
const porRed = url => fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`); return r.json(); });

/** @param {(url: URL) => Promise<any>} [leerJson] */
export async function cargarSistema(leerJson = porRed) {
  return new Sistema(await leerJson(new URL('sistema.json?v=1', RAIZ)));
}

/** @param {(url: URL) => Promise<any>} [leerJson] */
export async function cargarCompendio(leerJson = porRed) {
  return new Compendio(await leerJson(new URL('arcanos.json?v=1', RAIZ)));
}

/** Configuración de los foros (data/foros.json): { host: { campoFicha, campoBoveda, … } }. */
export async function cargarForos(leerJson = porRed) {
  return (await leerJson(new URL('foros.json?v=1', RAIZ))).foros;
}
