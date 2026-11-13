// La «Sesión con código» (fase 7): js/nube/ tiene que verse y portarse como el bloque de index.html (tests/legado/
// sesion-antigua.mjs), salvo los dos arreglos:
//   · F10: dos dispositivos con el mismo código ya no se pisan (antes, el último que guardaba borraba lo del otro);
//   · F11: si los datos traídos de la nube no se pueden poner, el navegador queda como estaba y se avisa.
// Cada «dispositivo» es una ventana jsdom con su localStorage; recargar = una ventana nueva con lo mismo guardado.
// La nube es una Firestore de mentira con las mismas condiciones (currentDocument.updateTime / exists).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { iniciarSesion } from '../../js/nube/Sesion.js';
// Nube.js con el mismo «?v=» que usa Sesion.js: si no, para node son dos módulos y el Conflicto de uno no es
// `instanceof` el del otro (en PAM los dos lo cargan igual, js/nube/main.js)
const V = readFileSync(new URL('../../js/nube/Sesion.js', import.meta.url), 'utf8').match(/from '\.\/Nube\.js(\?v=[^']*)?'/)[1] || '';
const { crearNube } = await import('../../js/nube/Nube.js' + V);
import { RESTAURAR_ANTIGUO, SESION_ANTIGUA } from '../legado/sesion-antigua.mjs';

const PENDIENTE = readFileSync(new URL('../../js/nube/pendiente.js', import.meta.url), 'utf8');
const PAM = 'https://claudilahozbosch.github.io/PAM/';
const espera = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (cond, ms = 4000) => { for (let t = 0; t < ms; t += 10) { const r = cond(); if (r) return r; await espera(10); } throw new Error('no llegó'); };
const ventanas = [];
after(() => ventanas.forEach(w => { try { w.close(); } catch { /* ya cerrada */ } }));

/** Firestore de mentira: GET y PATCH con las condiciones de la de verdad. */
function firestore() {
  const docs = new Map(); let reloj = 0;
  const resp = (status, j) => ({ ok: status < 300, status, json: async () => j, text: async () => JSON.stringify(j) });
  async function fetch(url, op = {}) {
    const u = new URL(url), id = u.pathname.split('/').pop(), d = docs.get(id);
    if (!op.method) return d ? resp(200, { name: id, fields: d.fields, updateTime: d.updateTime }) : resp(404, { error: { status: 'NOT_FOUND' } });
    const pre = u.searchParams.get('currentDocument.updateTime'), ex = u.searchParams.get('currentDocument.exists');
    if (pre && (!d || d.updateTime !== pre)) return resp(d ? 400 : 404, { error: { status: d ? 'FAILED_PRECONDITION' : 'NOT_FOUND' } });
    if (ex === 'false' && d) return resp(409, { error: { status: 'ALREADY_EXISTS' } });
    const updateTime = '2026-11-04T10:00:' + String(++reloj).padStart(2, '0') + '.123456Z';
    docs.set(id, { fields: JSON.parse(op.body).fields, updateTime });
    return resp(200, { name: id, fields: docs.get(id).fields, updateTime });
  }
  return { fetch, docs, escrituras: () => reloj };
}

/** Lo que guarda un navegador (para «recargar»). */
const volcar = s => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)).map(k => [k, s.getItem(k)]));

/**
 * Un dispositivo con PAM abierto. version: 'vieja' (el bloque de index.html) o 'nueva' (js/nube/).
 * @param {{ version: 'vieja'|'nueva', fs: any, local?: Record<string,string>, sesion?: Record<string,string>, romper?: (k: string) => boolean }} op
 */
function dispositivo({ version, fs, local = {}, sesion = {}, romper = null }) {
  const dom = new JSDOM('<!doctype html><html><body><div id="sesWrap"></div><div id="homeSes"></div></body></html>', { url: PAM, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const W = dom.window; ventanas.push(W);
  for (const [k, v] of Object.entries(local)) W.localStorage.setItem(k, v);
  for (const [k, v] of Object.entries(sesion)) W.sessionStorage.setItem(k, v);
  if (romper) { const orig = W.localStorage.setItem.bind(W.localStorage); W.Storage.prototype.setItem = function (k, v) { if (romper(k)) { const e = new Error('lleno'); e.name = 'QuotaExceededError'; throw e; } return orig.call(this, k, v); }; }
  let recargas = 0;
  // lo que el navegador tiene y jsdom no: la cripto y la compresión de Node, la nube de mentira
  Object.assign(W, { fetch: fs.fetch, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream });
  Object.defineProperty(W, 'crypto', { value: globalThis.crypto });
  const win = { localStorage: W.localStorage, sessionStorage: W.sessionStorage, location: { reload: () => { recargas++; } }, alert: () => {}, scrollTo: () => {}, navigator: W.navigator, setInterval: W.setInterval.bind(W) };
  if (version === 'vieja') {
    W.eval('(function(){' + RESTAURAR_ANTIGUO + '})();');
    W.__recargar = () => { recargas++; };
    W.eval(SESION_ANTIGUA.replace(/\blocation\.reload\(\)/g, 'window.__recargar()'));
  } else {
    W.eval(PENDIENTE);
    iniciarSesion({ doc: W.document, win, nube: crearNube({ fetch: fs.fetch }), claves: W.PAM_SESION });
  }
  const api = () => (version === 'vieja' ? W.pamSesion : win.pamSesion);
  return {
    W, version,
    get recargas() { return recargas; },
    wrap: () => W.document.getElementById('sesWrap').innerHTML,
    home: () => W.document.getElementById('homeSes').innerHTML,
    clic: sel => W.document.querySelector(sel).click(),
    estado: () => api().estado(),
    guardar: () => api().guardar(),
    poner: (k, v) => W.localStorage.setItem(k, v),
    local: () => volcar(W.localStorage),
    /** recargar la página: otra ventana con lo mismo guardado */
    recargar(extra = {}) { return dispositivo({ version, fs, local: volcar(W.localStorage), sesion: volcar(W.sessionStorage), ...extra }); }
  };
}

/** Un dispositivo que entra con un código (pegarlo, «Sí, traer mis datos» y recargar). */
async function entrarCon(version, fs, codigo, local = {}) {
  const d = dispositivo({ version, fs, local });
  d.clic('[data-ses="toggle"]');
  d.W.document.getElementById('sesIn').value = codigo;
  d.clic('[data-ses="entrar"]');
  d.clic('[data-ses="entrarOk"]');
  await hasta(() => d.recargas);
  const d2 = d.recargar();
  await espera(50);
  return d2;
}

/** Crear el código en un dispositivo y leerlo (se enseña con «Mostrar»). */
async function crearCodigo(d) {
  d.clic('[data-ses="toggle"]');
  d.clic('[data-ses="crear"]');
  await hasta(() => d.estado().ses && d.estado().estado === 'on');
  return d.estado().ses.code;
}

const DATOS = { 'grimorio.personajes': '{"lista":[{"id":"a","ficha":{"nombre":"Irvin"}}],"activa":"a"}', 'registro-roles-v1': '{"personajes":[]}', 'otra.cosa': 'no viaja' };

for (const version of ['vieja', 'nueva']) {
  test(`(${version}) crear el código, entrar desde otro dispositivo y traer los datos`, async () => {
    const fs = firestore();
    const A = dispositivo({ version, fs, local: DATOS });
    const code = await crearCodigo(A);
    const B = await entrarCon(version, fs, code, { 'grimorio.personajes': '{"viejo":1}', 'otra.cosa': 'mía' });
    assert.deepEqual(B.local()['grimorio.personajes'], DATOS['grimorio.personajes']);
    assert.equal(B.local()['registro-roles-v1'], DATOS['registro-roles-v1']);
    assert.equal(B.local()['otra.cosa'], 'mía', 'lo que no es de PAM no viaja ni se toca');
  });
}

test('se ve igual que antes: sin sesión, al crear el código y con la sesión abierta', async () => {
  const html = async version => {
    const fs = firestore();
    const d = dispositivo({ version, fs, local: DATOS });
    const out = { cerrado: d.wrap(), home: d.home() };
    d.clic('[data-ses="toggle"]'); out.abierto = d.wrap();
    const code = await crearCodigo(d);
    out.creado = d.wrap().replaceAll(code.slice(-4), '····').replace(/PAM-[A-Z0-9·-]{19}/g, 'PAM-…'); // el código es al azar
    out.homeCreado = d.home().replaceAll(code.slice(-4), '····');
    return out;
  };
  assert.deepEqual(await html('nueva'), await html('vieja'));
});

test('F10 · antes: dos dispositivos con el mismo código, el último en guardar borraba lo del otro', async () => {
  const fs = firestore();
  const A = dispositivo({ version: 'vieja', fs, local: DATOS });
  const code = await crearCodigo(A);
  const B = await entrarCon('vieja', fs, code);
  A.poner('grimorio.nota', 'hecho en A'); await A.guardar();
  B.poner('grimorio.nota', 'hecho en B'); await B.guardar(); // B no se entera de que A guardó
  const C = await entrarCon('vieja', fs, code);
  assert.equal(C.local()['grimorio.nota'], 'hecho en B', 'lo de A se perdió sin aviso');
});

test('F10 · ahora: B no pisa lo de A; le sale «Traer los de la nube / Guardar los de acá»', async () => {
  const fs = firestore();
  const A = dispositivo({ version: 'nueva', fs, local: DATOS });
  const code = await crearCodigo(A);
  const B = await entrarCon('nueva', fs, code);
  A.poner('grimorio.nota', 'hecho en A'); await A.guardar();
  B.poner('grimorio.nota', 'hecho en B'); await B.guardar();
  await hasta(() => B.estado().conflicto);
  B.clic('[data-ses="toggle"]');
  assert.match(B.wrap(), /Hay cambios más nuevos guardados desde otro dispositivo y también cambios en este\./);
  const C = await entrarCon('nueva', fs, code);
  assert.equal(C.local()['grimorio.nota'], 'hecho en A', 'lo de A sigue en la nube');

  // «Traer los de la nube»: B se queda con lo de A
  B.clic('[data-ses="traer"]');
  await hasta(() => B.recargas);
  const B2 = B.recargar();
  await espera(50);
  assert.equal(B2.local()['grimorio.nota'], 'hecho en A');
  assert.equal(B2.estado().conflicto, false);
});

test('F10 · «Guardar los de acá» sí pisa lo de la nube (el jugador lo eligió)', async () => {
  const fs = firestore();
  const A = dispositivo({ version: 'nueva', fs, local: DATOS });
  const code = await crearCodigo(A);
  const B = await entrarCon('nueva', fs, code);
  A.poner('grimorio.nota', 'hecho en A'); await A.guardar();
  B.poner('grimorio.nota', 'hecho en B'); await B.guardar();
  await hasta(() => B.estado().conflicto);
  B.clic('[data-ses="toggle"]');
  B.clic('[data-ses="pisar"]');
  await hasta(() => !B.estado().conflicto && B.estado().estado === 'on');
  const C = await entrarCon('nueva', fs, code);
  assert.equal(C.local()['grimorio.nota'], 'hecho en B');
  // y A, al volver a la pestaña, ve que hay algo más nuevo: como no cambió nada, se lo trae
  A.W.document.dispatchEvent(new A.W.Event('visibilitychange'));
  await hasta(() => A.recargas);
});

test('F10 · una sesión abierta con el PAM de antes (sin versión): primero mira la nube, no la pisa', async () => {
  const fs = firestore();
  const A = dispositivo({ version: 'nueva', fs, local: DATOS });
  const code = await crearCodigo(A);
  A.poner('grimorio.nota', 'hecho en A'); await A.guardar();
  // B tenía la sesión del PAM antiguo (sin «version») y un cambio sin guardar
  const B = dispositivo({ version: 'nueva', fs, local: { ...DATOS, 'pam.sesion': JSON.stringify({ code, t: 1, firma: 'vieja' }), 'grimorio.nota': 'hecho en B' } });
  await hasta(() => B.estado().conflicto);
  const C = await entrarCon('nueva', fs, code);
  assert.equal(C.local()['grimorio.nota'], 'hecho en A');
});

test('F11 · si los datos traídos no caben, el navegador queda como estaba y se avisa (antes quedaba a medias)', async () => {
  for (const version of ['vieja', 'nueva']) {
    const fs = firestore();
    const A = dispositivo({ version, fs, local: { ...DATOS, 'grimorio.grande': 'x' } });
    const code = await crearCodigo(A);
    const B = dispositivo({ version, fs, local: { 'grimorio.personajes': '{"de":"B"}', 'grimorio.mio': 'B' } });
    B.clic('[data-ses="toggle"]'); B.W.document.getElementById('sesIn').value = code; B.clic('[data-ses="entrar"]'); B.clic('[data-ses="entrarOk"]');
    await hasta(() => B.recargas);
    // al recargar, una clave no cabe
    const B2 = B.recargar({ romper: k => k === 'grimorio.grande' });
    await espera(50);
    if (version === 'vieja') {
      assert.equal(B2.local()['grimorio.mio'], undefined, 'antes: lo de B se borró…');
      assert.equal(B2.local()['grimorio.grande'], undefined, '…y lo de la nube no entró entero');
    } else {
      assert.deepEqual([B2.local()['grimorio.personajes'], B2.local()['grimorio.mio']], ['{"de":"B"}', 'B'], 'ahora: todo como estaba');
      B2.clic('[data-ses="toggle"]');
      assert.match(B2.wrap(), /No se pudieron poner acá los datos de la nube \(el navegador no tiene espacio\): este navegador quedó como estaba\./);
      await hasta(() => B2.estado().conflicto); // y no guarda lo de este navegador encima: pregunta
      assert.equal(fs.escrituras(), 1, 'solo la de A al crear el código');
    }
  }
});
