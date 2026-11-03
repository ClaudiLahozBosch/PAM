// @ts-check
// Carga los datos del sistema. En el navegador, con fetch relativo a este archivo (funciona igual en
// producción y en el staging); en las pruebas se le pasa el lector de archivos.
import { Sistema } from './Sistema.js?v=0.3.3';
import { Compendio } from './Compendio.js?v=0.3.3';

// La pone scripts/versionar.mjs en cada versión: así el navegador nunca usa datos de la anterior.
const VERSION_DATOS = '0.3.3';
const RAIZ = new URL('../../data/', import.meta.url);
const porRed = url => fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`); return r.json(); });
const dato = f => new URL(`${f}?v=${VERSION_DATOS}`, RAIZ);

/** @param {(url: URL) => Promise<any>} [leerJson] */
export async function cargarSistema(leerJson = porRed) {
  return new Sistema(await leerJson(dato('sistema.json')));
}

/** @param {(url: URL) => Promise<any>} [leerJson] */
export async function cargarCompendio(leerJson = porRed) {
  return new Compendio(await leerJson(dato('arcanos.json')));
}

/** Configuración de los foros (data/foros.json): { host: { campoFicha, campoBoveda, … } }. */
export async function cargarForos(leerJson = porRed) {
  return (await leerJson(dato('foros.json'))).foros;
}
