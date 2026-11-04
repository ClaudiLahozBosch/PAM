// @ts-check
// Carga los datos del sistema. En el navegador, con fetch relativo a este archivo (funciona igual en
// producción y en el staging); en las pruebas se le pasa el lector de archivos.
import { Sistema } from './Sistema.js?v=0.6.5';
import { Compendio } from './Compendio.js?v=0.6.5';

// La pone scripts/versionar.mjs en cada versión: así el navegador nunca usa datos de la anterior.
const VERSION_DATOS = '0.6.5';
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

/**
 * Los tres archivos de los que sale la Tabla de Canjes del Inspector (js/inspector/Tabla.js).
 * `forzar`: sin la copia del navegador («↻ Actualizar tabla»).
 */
export async function cargarDatosTabla(forzar = false, leerJson = porRed) {
  const url = f => { const u = dato(f); if (forzar) u.searchParams.set('_', String(Date.now())); return u; };
  const [sistema, calculadora, compendio] = await Promise.all(['sistema.json', 'arcanos-calculadora.json', 'arcanos.json'].map(f => leerJson(url(f))));
  return { sistema, calculadora, compendio };
}

/** Configuración de los foros (data/foros.json): { host: { campoFicha, campoBoveda, … } }. */
export async function cargarForos(leerJson = porRed) {
  return (await leerJson(dato('foros.json'))).foros;
}

/**
 * Los avisos con los que el staff cierra un oficial (data/cierres-oficial.json, editable a mano).
 * Si el archivo tiene un error (una coma de más…), Mi PJ sigue funcionando: solo deja de detectar cierres.
 * @returns {Promise<string[][]>}
 */
export async function cargarCierresOficial(leerJson = porRed) {
  try { const j = await leerJson(dato('cierres-oficial.json')); return Array.isArray(j.avisos) ? j.avisos : []; }
  catch (e) { console.warn('[Mi PJ] data/cierres-oficial.json no se pudo leer (¿falta o sobra una coma?):', e); return []; }
}
