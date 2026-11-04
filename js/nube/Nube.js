// @ts-check
// La nube de la «Sesión con código» de PAM (index.html de Hana Park, «PAM · Sesión con código»): el código, el
// cifrado y Firestore, tal cual. Los datos se guardan en Firestore bajo un id que sale del código (SHA-256),
// cifrados con AES-GCM usando una llave que también sale del código: quien administra Firebase solo ve datos
// cifrados. Lo nuevo (auditoría F10): cada documento tiene una versión (su `updateTime` en Firestore) y cada
// guardado dice qué versión cree que hay; si otro dispositivo guardó por medio, Firestore lo rechaza y no se pisa
// nada (error `Conflicto`).

export const API = 'https://firestore.googleapis.com/v1/projects/pam-avadense/databases/(default)/documents/sesiones/';
export const APIKEY = 'AIzaSyCstBjW47_s8XNUQPw2L8e9RTXBL8nt304';
const ALF = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';            /* sin 0/O, 1/I/L ni U para no confundirse */

/** Otro dispositivo guardó después de la versión que conocíamos: no se escribió nada. */
export class Conflicto extends Error {
  constructor() { super('conflicto'); this.name = 'Conflicto'; }
}

/* ---------- código ---------- */
/** @param {Crypto} [cr] */
export function nuevoCodigo(cr = globalThis.crypto) {
  const r = cr.getRandomValues(new Uint8Array(16)); let c = '';
  for (let i = 0; i < 16; i++) c += ALF[r[i] % ALF.length];         /* 30^16 ≈ 4·10^23 combinaciones */
  return c;
}
export function normal(c) {
  const x = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^PAM/, '');
  return x.length === 16 && [...x].every(ch => ALF.includes(ch)) ? x : null;
}
export const formato = x => 'PAM-' + x.match(/.{4}/g).join('-');

/* ---------- cripto ---------- */
const te = new TextEncoder(), td = new TextDecoder();
const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(t) { const s = atob(t), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
async function comprimir(u8) {
  if (typeof CompressionStream === 'undefined') return { z: 0, u8 };
  const cs = new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'));
  return { z: 1, u8: new Uint8Array(await new Response(cs).arrayBuffer()) };
}
async function descomprimir(u8) {
  const ds = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}

/**
 * @param {{ fetch?: typeof fetch, crypto?: Crypto, api?: string, apiKey?: string }} [op]
 */
export function crearNube({ fetch: pedir = globalThis.fetch.bind(globalThis), crypto: cr = globalThis.crypto, api = API, apiKey = APIKEY } = {}) {
  const sha = async txt => new Uint8Array(await cr.subtle.digest('SHA-256', te.encode(txt)));
  async function llaves(code) {
    const x = normal(code);
    const id = hex(await sha('pam|id|' + x));
    const key = await cr.subtle.importKey('raw', await sha('pam|llave|' + x), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return { id, key };
  }

  /** Lo guardado con ese código: { datos, t, version } o null si no hay nada. */
  async function leer(code) {
    const { id, key } = await llaves(code);
    const r = await pedir(api + id + '?key=' + apiKey, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('http ' + r.status);
    const doc = await r.json(), f = doc.fields || {};
    const iv = unb64(f.iv.stringValue), z = +(f.z && f.z.integerValue || 0);
    let u8 = new Uint8Array(await cr.subtle.decrypt({ name: 'AES-GCM', iv }, key, unb64(f.d.stringValue)));
    if (z) u8 = await descomprimir(u8);
    return { datos: JSON.parse(td.decode(u8)), t: +f.t.integerValue, version: doc.updateTime || null };
  }

  /**
   * Guarda. Con `version`, solo si en la nube sigue esa versión; con `nuevo`, solo si no hay nada guardado.
   * @param {string} code @param {any} datos
   * @param {{ version?: string|null, nuevo?: boolean, tMin?: number }} [op] tMin: la marca de tiempo es al menos esta
   * @returns {Promise<{ t: number, version: string|null }>}
   */
  async function escribir(code, datos, { version = null, nuevo = false, tMin = 0 } = {}) {
    const { id, key } = await llaves(code);
    const iv = cr.getRandomValues(new Uint8Array(12));
    const c = await comprimir(te.encode(JSON.stringify(datos)));
    const enc = new Uint8Array(await cr.subtle.encrypt({ name: 'AES-GCM', iv }, key, c.u8));
    const t = Math.max(Date.now(), tMin);
    const body = { fields: { d: { stringValue: b64(enc) }, iv: { stringValue: b64(iv) }, z: { integerValue: String(c.z) }, v: { integerValue: '1' }, t: { integerValue: String(t) } } };
    const condicion = version ? '&currentDocument.updateTime=' + encodeURIComponent(version) : nuevo ? '&currentDocument.exists=false' : '';
    const r = await pedir(api + id + '?key=' + apiKey + condicion, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) {
      if (r.status === 403) throw new Error('permiso');
      // la condición no se cumplió: otro dispositivo guardó por medio (o ya existía)
      const txt = await r.text().catch(() => '');
      if (condicion && (r.status === 409 || r.status === 404 || /FAILED_PRECONDITION|ALREADY_EXISTS|NOT_FOUND/.test(txt))) throw new Conflicto();
      throw new Error('http ' + r.status);
    }
    let v = null; try { v = (await r.json()).updateTime || null; } catch { /* sin cuerpo */ }
    return { t, version: v };
  }

  return { leer, escribir };
}
