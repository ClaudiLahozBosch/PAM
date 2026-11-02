// @ts-check
// Carga los datos del sistema. En el navegador, con fetch relativo a este archivo (funciona igual en
// producción y en el staging); en las pruebas se le pasa el lector de archivos.
import { Sistema } from './Sistema.js';

const RAIZ = new URL('../../data/', import.meta.url);

/** @param {(url: URL) => Promise<any>} [leerJson] */
export async function cargarSistema(leerJson = url => fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`); return r.json(); })) {
  return new Sistema(await leerJson(new URL('sistema.json?v=1', RAIZ)));
}
