// La Biblioteca de oficiales (fase 5d): la de PAM tiene que leer, guardar y pintar lo mismo que la de Mi PJ.
// Las dos escanean el mismo El Profeta inventado (fixtures/actividad/profeta.mjs), y se comparan lo guardado,
// la ventana (filtros, tabla, búsqueda, ★), lo que se prepara para PAM y la tarjeta del panel.
// Diferencias permitidas: los enlaces llevan el dominio del foro (el panel está en un iframe) y el mensaje de
// «Pasar a PAM» (recogerlos en PAM llega con la fase 6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { foroDePrueba, paginaDe } from '../fixtures/actividad/foro.mjs';
import { profetaDePrueba } from '../fixtures/actividad/profeta.mjs';
import { crearLectorBiblioteca } from '../../js/servicios/BibliotecaDelForo.js';
import { crearBibliotecaOficiales, CLAVES_BIBLIOTECA } from '../../js/paginas/panel/BibliotecaPanel.js';
import { crearPanelMiPj } from '../../js/paginas/panel/MiPjPanel.js';

const VIEJO = readFileSync(new URL('../../pam-mi-pj.user.js', import.meta.url), 'utf8');
const FORO = 'https://hp-avada-kedavra.foroactivo.com';
const CUENTA = { id: 5203, nombre: 'Irvin Giles' };
const PAGINAS = { ...foroDePrueba(new Date()), ...profetaDePrueba() };
const CFG = JSON.parse(readFileSync(new URL('../../data/foros.json', import.meta.url), 'utf8')).foros['hp-avada-kedavra.foroactivo.com'].actividad.biblioteca;
const espera = ms => new Promise(r => setTimeout(r, ms));
const DATOS = { v: 2, cuenta: CUENTA.nombre, pj: CUENTA.nombre, uid: CUENTA.id, leido: new Date().toISOString(), ficha: null, boveda: null, roles: [], sueldo: null, oficiales: [] };

/** El Mi PJ antiguo entero en el foro; devuelve su ventana de la biblioteca y su almacén. */
function bibliotecaAntigua(gmExtra = {}) {
  const ud = `<script>_userdata["user_id"] = ${CUENTA.id}; _userdata["username"] = "${CUENTA.nombre}"; _userdata["session_logged_in"] = 1;</script>`;
  const dom = new JSDOM(`<!doctype html><html><head>${ud}</head><body></body></html>`, { url: FORO + '/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, gm = { 'mipj.ui': JSON.stringify({ abierto: true }), ['mipj.' + CUENTA.id]: JSON.stringify(DATOS), ...gmExtra };
  w.GM_getValue = (k, d) => (k in gm ? gm[k] : d); w.GM_setValue = (k, v) => { gm[k] = v; }; w.GM_listValues = () => Object.keys(gm);
  w._userdata = { session_logged_in: 1, username: CUENTA.nombre, user_id: CUENTA.id }; w.unsafeWindow = w;
  w.fetch = async url => { const html = paginaDe(PAGINAS, String(url)); return { ok: html != null, status: html != null ? 200 : 404, url: String(url), text: async () => html ?? '', json: async () => ({}) }; };
  w.open = () => null;
  w.eval(VIEJO);
  return { w, gm, root: w.document.getElementById('mipj-ofic').shadowRoot, panel: w.document.getElementById('mipj') };
}

/** La de PAM, con un agente de prueba que sirve las mismas páginas. */
function bibliotecaNueva(memInicial = {}) {
  const { window: w } = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://claudilahozbosch.github.io/PAM/panel.html' });
  const agente = { async leer(ruta) { const html = paginaDe(PAGINAS, ruta); if (html == null) throw new Error('HTTP 404 en ' + ruta); return new w.DOMParser().parseFromString(html, 'text/html'); } };
  const mem = new Map(Object.entries(memInicial));
  const gv = (k, d) => { try { return mem.has(k) ? JSON.parse(mem.get(k)) : d; } catch { return d; } }, sv = (k, v) => mem.set(k, JSON.stringify(v));
  const lector = crearLectorBiblioteca(agente, { origen: FORO, cfg: CFG, pausaMs: 0, store: { get: () => gv(CLAVES_BIBLIOTECA.cache, { ediciones: {}, roles: {} }), set: v => sv(CLAVES_BIBLIOTECA.cache, v) } });
  const guardadoEnAgente = {};
  const B = crearBibliotecaOficiales({ documento: w.document, gv, sv, borrar: k => mem.delete(k), escanear: lector.escanear, origen: FORO, guardarEnAgente: async (k, v) => { guardadoEnAgente[k] = v; } });
  return { w, B, mem, gv, guardadoEnAgente, root: w.document.getElementById('mipj-ofic').shadowRoot };
}

const hasta = async (fn, ms = 30000) => { for (let t = 0; t < ms && !fn(); t += 25) await espera(25); assert.ok(fn(), 'no terminó a tiempo'); };
const listo = root => /^(Listo|Algo falló)/.test(root.getElementById('log').textContent);
const sinFecha = s => s.replace(/\d\d\/\d\d(,)? \d\d:\d\d/g, '(fecha)');
const absolutos = s => s.replace(/href="\//g, `href="${FORO}/`);
const vista = root => sinFecha(['filters', 'body', 'log', 'pamFav', 'pamTodos'].map(id => root.getElementById(id).innerHTML).join('\n')).replace(/\s+/g, ' ');
const clic = (root, sel) => root.querySelector(sel).click();

const viejo = bibliotecaAntigua(), nuevo = bibliotecaNueva();
clic(viejo.root, '#scan'); clic(nuevo.root, '#scan');
await hasta(() => listo(viejo.root) && listo(nuevo.root));

test('escaneo: lo mismo guardado que Mi PJ (sucesos, roles, estados, discrepancias, sin suceso)', () => {
  const ultimo = s => { const d = typeof s === 'string' ? JSON.parse(s) : s; delete d.fecha; return d; };
  const v = ultimo(viejo.gm[CLAVES_BIBLIOTECA.ultimo]), n = ultimo(nuevo.mem.get(CLAVES_BIBLIOTECA.ultimo));
  assert.deepEqual(n, v);
  assert.deepEqual(n.sucesos.map(s => [s.titulo, s.estado]), [
    ['El robo del banco', 'en curso'], ['Niebla en el muelle', 'libre'], ['Duendes en la biblioteca', 'libre'], ['La boda de los Lestrange', 'terminado'],
    ['El dragón de Gales', 'terminado'], ['Cartas sin remitente', 'en curso'], ['El tren fantasma', 'abandonado']]);
  assert.ok(n.sucesos.find(s => s.titulo === 'El dragón de Gales').roles[0].discrepancia, 'la lista dice abierto y está terminado');
  assert.deepEqual(n.sinSuceso.map(r => r.titulo), ['Un oficial perdido']);
  assert.match(nuevo.root.getElementById('log').textContent, /^Listo · 7 sucesos · 3 se pueden tomar · 1 con discrepancias/);
});

test('ventana: la misma tabla, filtros y botones que Mi PJ (con los enlaces del foro)', () => {
  assert.equal(vista(nuevo.root), absolutos(vista(viejo.root)));
  assert.match(nuevo.root.getElementById('body').innerHTML, new RegExp(`<a href="${FORO}/t800-oficial-el-robo" target="_blank">El robo</a>`));
});

test('ventana: cada filtro, la búsqueda y las ★, igual que Mi PJ', async () => {
  for (const f of ['libre', 'abandonado', 'en curso', 'terminado', 'discrepancias', 'todos']) {
    clic(viejo.root, `.chip[data-f="${f}"]`); clic(nuevo.root, `.chip[data-f="${f}"]`);
    assert.equal(vista(nuevo.root), absolutos(vista(viejo.root)), f);
  }
  for (const r of [viejo.root, nuevo.root]) { const q = r.getElementById('q'); q.value = 'bruno'; q.dispatchEvent(new q.ownerDocument.defaultView.Event('input')); }
  assert.equal(vista(nuevo.root), absolutos(vista(viejo.root)), 'búsqueda');
  for (const r of [viejo.root, nuevo.root]) { const q = r.getElementById('q'); q.value = ''; q.dispatchEvent(new q.ownerDocument.defaultView.Event('input')); }
  for (const r of [viejo.root, nuevo.root]) [...r.querySelectorAll('.star')].slice(0, 2).forEach(b => b.click());
  for (const r of [viejo.root, nuevo.root]) r.querySelector('.chip[data-f="fav"]').click();
  assert.equal(vista(nuevo.root), absolutos(vista(viejo.root)), 'favoritos');
  assert.deepEqual(nuevo.gv(CLAVES_BIBLIOTECA.favs, {}) && Object.keys(nuevo.gv(CLAVES_BIBLIOTECA.favs, {})), Object.keys(JSON.parse(viejo.gm[CLAVES_BIBLIOTECA.favs])));
  for (const r of [viejo.root, nuevo.root]) r.querySelector('.chip[data-f="todos"]').click();
});

test('«Pasar a PAM»: prepara lo mismo que Mi PJ; sumarlo en PAM queda para la fase 6', async () => {
  for (const [id, modo] of [['pamFav', 'favoritos'], ['pamTodos', 'todos']]) {
    clic(viejo.root, '#' + id); clic(nuevo.root, '#' + id); await espera(20);
    const sin = p => { const { creado, ...r } = JSON.parse(JSON.stringify(p)); return r; };
    assert.deepEqual(sin(nuevo.guardadoEnAgente['pam.oficiales']), sin(viejo.gm['pam.oficiales']), modo);
    assert.equal(nuevo.guardadoEnAgente['pam.oficiales'].modo, modo);
  }
  assert.match(nuevo.root.getElementById('log').textContent, /^Listo: 3 oficiales preparados\. Sumarlos a «Posibles oficiales» de PAM todavía no está en esta versión de prueba/);
});

test('escaneo completo: verifica también los terminados y cerrados, igual que Mi PJ', async () => {
  clic(viejo.root, '#scanFull'); clic(nuevo.root, '#scanFull');
  await espera(50);
  await hasta(() => listo(viejo.root) && listo(nuevo.root) && !viejo.root.getElementById('scan').disabled && !nuevo.root.getElementById('scan').disabled);
  const ultimo = s => { const d = typeof s === 'string' ? JSON.parse(s) : s; delete d.fecha; return d; };
  assert.deepEqual(ultimo(nuevo.mem.get(CLAVES_BIBLIOTECA.ultimo)), ultimo(viejo.gm[CLAVES_BIBLIOTECA.ultimo]));
  assert.equal(vista(nuevo.root), absolutos(vista(viejo.root)));
  viejo.w.close();
});

test('tarjeta del panel: el mismo resumen que Mi PJ tras escanear', () => {
  const ultimo = nuevo.mem.get(CLAVES_BIBLIOTECA.ultimo), favs = nuevo.mem.get(CLAVES_BIBLIOTECA.favs);
  const antiguo = bibliotecaAntigua({ [CLAVES_BIBLIOTECA.ultimo]: ultimo, [CLAVES_BIBLIOTECA.favs]: favs });
  const tarjeta = h => (h.match(/<div class="card"><div class="ct">📜 Biblioteca de oficiales.*?Abrir la biblioteca<\/button><\/div><\/div>/s) || [''])[0].replace(/\s+/g, ' ');
  const viejaT = tarjeta(antiguo.panel.innerHTML);
  antiguo.w.close();
  const { window: w } = new JSDOM('<!doctype html><html><head></head><body><div id="mipj"></div></body></html>', { url: 'https://claudilahozbosch.github.io/PAM/panel.html' });
  const mem = new Map([['mipj.' + CUENTA.id, JSON.stringify(DATOS)], ['mipj.ui', JSON.stringify({ abierto: true })], [CLAVES_BIBLIOTECA.ultimo, ultimo], [CLAVES_BIBLIOTECA.favs, favs]]);
  const guardado = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const p = crearPanelMiPj({ root: w.document.getElementById('mipj'), documento: w.document, guardado, cargar: async () => DATOS, ventana: { ancho: 1400, alto: 900 }, pamUrl: 'https://x/', cuenta: CUENTA,
    biblioteca: { origen: FORO, escanear: async () => { throw new Error('no'); } } });
  p.pintar();
  const nuevaT = tarjeta(w.document.getElementById('mipj').innerHTML);
  assert.ok(viejaT.length > 50);
  assert.equal(nuevaT, viejaT);
  assert.match(nuevaT, /2 libres · 1 abandonados · ★ 2/);
  // el botón abre la ventana (y el panel pide toda la ventana del foro)
  w.document.querySelector('[data-a="oficiales"]').click();
  assert.ok(w.document.getElementById('mipj-ofic').shadowRoot.getElementById('panel').classList.contains('open'));
});

test('al abrir la biblioteca el iframe ocupa toda la ventana del foro, y al cerrarla vuelve', async () => {
  const { window: w } = new JSDOM('<!doctype html><html><head></head><body><div id="mipj"></div></body></html>', { url: 'https://claudilahozbosch.github.io/PAM/panel.html' });
  const tamanos = [];
  const mem = new Map([['mipj.ui', JSON.stringify({ abierto: false })]]);
  const guardado = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const p = crearPanelMiPj({ root: w.document.getElementById('mipj'), documento: w.document, guardado, cargar: async () => DATOS, ventana: { ancho: 1300, alto: 800 }, pamUrl: 'https://x/', cuenta: CUENTA,
    agente: { tamano: async (an, al) => { tamanos.push([an, al]); return {}; } }, biblioteca: { origen: FORO, escanear: async () => { throw new Error('no'); } } });
  p.pintar();
  const sombra = w.document.getElementById('mipj-ofic').shadowRoot;
  const pill = w.document.querySelector('[data-a="abrir"]'); pill.click();
  w.document.querySelector('[data-a="oficiales"]').click();
  assert.deepEqual(tamanos.at(-1), [1300, 800], 'toda la ventana');
  sombra.getElementById('close').click();
  assert.notDeepEqual(tamanos.at(-1), [1300, 800], 'vuelve al tamaño del panel');
  sombra.getElementById('fondo').click(); // cerrar otra vez no rompe nada
});
