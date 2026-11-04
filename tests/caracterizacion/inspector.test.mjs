// El Inspector de Canjes (fase 6c): la revisión de PAM tiene que dar EXACTAMENTE lo mismo que el script antiguo.
// En un Registro de Canjes inventado (fixtures/inspector/registro.mjs):
//   · el pam-inspector-canjes.user.js antiguo entero, en jsdom, con su Tabla sacada de index.html;
//   · la revisión de PAM (js/inspector/Revision.js) con la Tabla de data/*.json y un agente que sirve las mismas páginas.
// Diferencias permitidas: F05 (partes de la ficha), F06 (Puntos de Destino de dos cifras) y la reconciliación del Sistema.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { tablaDeDatos, prepararTabla } from '../../js/inspector/Tabla.js';
import { crearRevision } from '../../js/inspector/Revision.js';
import { paginaDe } from '../fixtures/actividad/foro.mjs';
import { registroInspector } from '../fixtures/inspector/registro.mjs';

const VIEJO = readFileSync(new URL('../../pam-inspector-canjes.user.js', import.meta.url), 'utf8');
const INDEX = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const FORO = 'https://hp-avada-kedavra.foroactivo.com';
const PAGINAS = registroInspector();
const ventanas = [];
after(() => ventanas.forEach(w => { try { w.close(); } catch { /* ya cerrada */ } }));

/* ---------- el Inspector antiguo ---------- */
const dom = new JSDOM(PAGINAS['/t34430-registro-de-canjes'], { url: FORO + '/t34430-registro-de-canjes', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const W = dom.window; ventanas.push(W);
const gm = {};
W.GM_getValue = (k, d) => (k in gm ? gm[k] : d);
W.GM_setValue = (k, v) => { gm[k] = v; };
W.unsafeWindow = W;
W.fetch = async url => {
  const u = String(url);
  if (u.startsWith('https://jesleytherabbit-prog.github.io/PAM/')) return { ok: true, status: 200, text: async () => INDEX };
  const html = paginaDe(PAGINAS, u);
  return { ok: html != null, status: html != null ? 200 : 404, text: async () => html ?? '' };
};
W.eval(VIEJO);
const API = W.PAM_INSPECTOR;
const Tvieja = await API.cargarPAM(false);

/* ---------- el de PAM ---------- */
const { window: w2 } = new JSDOM(''); ventanas.push(w2);
const leer = async ruta => { const html = paginaDe(PAGINAS, ruta); if (html == null) throw new Error('HTTP 404 en ' + ruta); return new w2.DOMParser().parseFromString(html, 'text/html'); };
const Tnueva = prepararTabla(tablaDeDatos(json('sistema.json'), json('arcanos-calculadora.json'), json('arcanos.json')));
const R = crearRevision({ leer });
const paginaNueva = await leer('/t34430-registro-de-canjes');

/** Lo revisado, sin los nodos del DOM (para comparar). */
const plano = v => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x === 'object' && 'nodeType' in x ? undefined : x)));
const revisarLosDos = async id => {
  const viejo = await API.revisar(W.document.getElementById('p' + id), Tvieja);
  const nuevo = await R.revisar(paginaNueva.getElementById('p' + id), Tnueva);
  return [plano(viejo), plano(nuevo)];
};
const [v1, n1] = await revisarLosDos(9700);
const [v2, n2] = await revisarLosDos(9701);

/* ---------------- lo que se ve: barra, caja y panel ---------------- */
const { crearInspectorUI } = await import('../../js/inspector/InspectorUI.js');
const { crearInspector } = await import('../../js/inspector/Inspector.js');
const espera = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (cond, ms = 6000) => { for (let t = 0; t < ms; t += 20) { const r = cond(); if (r) return r; await espera(20); } throw new Error('no llegó'); };
// el antiguo: «Revisar canje» en los dos pedidos sin respuesta
const regV = id => API.pedidos.find(r => r.D.id === id);
API.pedidos.length = 0; // (la prueba de la respuesta los cambió) → se vuelven a leer de la página
const domUI = new JSDOM(PAGINAS['/t34430-registro-de-canjes'], { url: FORO + '/t34430-registro-de-canjes', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
const WU = domUI.window; ventanas.push(WU);
Object.assign(WU, { GM_getValue: W.GM_getValue, GM_setValue: W.GM_setValue, unsafeWindow: WU, fetch: W.fetch });
WU.eval(VIEJO);
const APIU = WU.PAM_INSPECTOR;
for (const id of [9700, 9701]) { APIU.pedidos.find(r => r.D.id === id).boton.click(); await hasta(() => APIU.pedidos.find(r => r.D.id === id).res); }
// el de PAM, con un agente de prueba que guarda lo que se le manda pintar
const pintados = [];
const agenteUI = { leer, pedir: async (tipo, d) => { if (tipo === 'inspector.pintar') pintados.push(d); return {}; } };
const I = crearInspector({ agente: agenteUI, R, ui: crearInspectorUI(w2.document.implementation.createHTMLDocument(''), R), ruta: '/t34430-registro-de-canjes',
  cargarDatos: async () => ({ sistema: json('sistema.json'), calculadora: json('arcanos-calculadora.json'), compendio: json('arcanos.json') }) });
await I.iniciar();
for (const id of [9700, 9701]) { await I.accion({ accion: 'revisar', p: String(id) }); await hasta(() => I.pedidos.find(r => r.D.id === id).res && I.pedidos.find(r => r.D.id === id).estado === 'listo'); }
const ultimo = () => pintados[pintados.length - 1];
/** Para comparar: sin las marcas data-icj (antes eran funciones), sin «checked» (antes era una propiedad) ni el texto del textarea. */
const igualar = h => String(h).replace(/ data-(icj|p|i|k|v)="[^"]*"/g, '').replace(/ checked=""/g, '').replace(/ disabled=""/g, ' disabled')
  .replace(/<textarea([^>]*)>[\s\S]*?<\/textarea>/g, '<textarea$1></textarea>').replace(/Tabla de Canjes de PAM del [^<]*/g, 'Tabla de Canjes de PAM del …');


test('Irvin: cada canje reconocido, con el mismo precio y los mismos problemas que el Inspector antiguo (salvo F06)', () => {
  assert.deepEqual(n1.items.map(x => [x.tipo, x.nombre]), v1.items.map(x => [x.tipo, x.nombre]));
  const pd = i => i.tipo === 'pd';
  // F06: el Inspector antiguo leía «Puntos de Destino: 13» como 1
  assert.deepEqual([v1.items.find(pd).ficha, n1.items.find(pd).ficha], [1, 13]);
  const sinPD = r => ({ ...r, items: r.items.map(x => (pd(x) ? { ...x, ficha: null } : x)) });
  // F05: la ficha son los mensajes seguidos del dueño que parecen ficha (el aviso largo «Ficha actualizada…» ya no)
  const sinFicha = r => ({ ...sinPD(r), ficha: { ...r.ficha, lineas: null, L: null, finas: null, F: null, todo: null, mensajes: null, _orient: null } });
  assert.deepEqual(sinFicha(n1), sinFicha(v1));
  assert.equal(v1.ficha.mensajes, 2, 'antes: el aviso largo contaba como parte de la ficha');
  assert.equal(n1.ficha.mensajes, 1);
});

test('Bruno: errores de precio, saltos de nivel, lo que no se reconoce y las devoluciones, igual que el antiguo', () => {
  assert.deepEqual(n2, v2);
  assert.ok(n2.items.some(x => x.estado === 'bad'));
  assert.ok(n2.items.some(x => x.estado === 'unk'), 'Una cosa rara');
  assert.equal(n2.pedido.devoluciones.length, 1);
});

test('la respuesta armada con los pedidos marcados, igual que el antiguo', () => {
  const marcar = (res, decision, D) => ({ D, res, decision });
  const pedidosV = [marcar(v1, 'ok', v1.D), marcar(v2, 'fix', v2.D)], pedidosN = [marcar(n1, 'ok', n1.D), marcar(n2, 'fix', n2.D)];
  // los problemas que van en la respuesta: los graves (como marca la casilla al pintar)
  for (const P of [pedidosV, pedidosN]) P.forEach(p => p.res.items.forEach(x => x.problemas.forEach(q => { q.incluir = q.grave; })));
  API.pedidos.length = 0; pedidosV.forEach(p => API.pedidos.push(p));
  assert.equal(R.textoRespuesta(pedidosN), API.textoRespuesta());
  assert.match(R.textoRespuesta(pedidosN), /^Irvin, tus canjes son correctos/);
  assert.match(R.textoRespuesta(pedidosN), /Bruno, antes de aprobar tu canje hay que corregir:\n✦ /);
});

test('la barra de cada pedido: igual que el Inspector antiguo (sin respuesta, revisado y ya respondido)', () => {
  for (const id of [9700, 9701, 9703]) assert.equal(igualar(ultimo().barras[id]), igualar(APIU.pedidos.find(r => r.D.id === id).barra.outerHTML), 'pedido ' + id);
  assert.match(ultimo().barras[9703], /✓ Aprobado por Cora Blest/);
  assert.deepEqual(I.pedidos.map(r => r.D.id), [...APIU.pedidos].map(r => r.D.id));
});

test('la caja de la revisión: igual que el Inspector antiguo (salvo F06)', () => {
  // F06: la columna «Ficha» del Punto de Destino (antes 1, ahora 13)
  const f06 = h => h.replace(/(Punto de Destino[\s\S]*?<td class="n dim">)(1|13)(<\/td>)/, '$1PD$3');
  assert.equal(f06(igualar(ultimo().cajas[9701])), f06(igualar(APIU.pedidos.find(r => r.D.id === 9701).caja.outerHTML)));
  assert.equal(f06(igualar(ultimo().cajas[9700])), f06(igualar(APIU.pedidos.find(r => r.D.id === 9700).caja.outerHTML)));
  assert.match(ultimo().cajas[9700], /<td class="n dim">13<\/td>/);
  assert.match(ultimo().cajas[9701], /data-icj="prob"[^>]*checked=""/, 'los problemas graves, marcados para la respuesta');
});

test('el panel: la pastilla y, abierto, los pedidos, la respuesta y la Tabla, igual que el antiguo', async () => {
  const panelViejo = () => WU.document.querySelector('.icj.flot');
  assert.equal(igualar(ultimo().panel), igualar(panelViejo().outerHTML));
  panelViejo().querySelector('.pill').click();
  await I.accion({ accion: 'abrir' });
  assert.equal(igualar(ultimo().panel), igualar(panelViejo().outerHTML));
  // marcar «Correcto» y «Con correcciones»: la misma respuesta
  for (const [id, v] of [[9700, 'ok'], [9701, 'fix']]) {
    [...APIU.pedidos.find(r => r.D.id === id).caja.querySelectorAll('button')].find(b => b.textContent === (v === 'ok' ? '✓ Correcto' : '✎ Con correcciones')).click();
    await I.accion({ accion: 'decidir', p: String(id), v });
  }
  assert.equal(igualar(ultimo().panel), igualar(panelViejo().outerHTML));
  const textoNuevo = new w2.DOMParser().parseFromString(ultimo().panel, 'text/html').querySelector('textarea').textContent;
  assert.equal(textoNuevo, panelViejo().querySelector('textarea').value);
  assert.match(textoNuevo, /^Irvin, tus canjes son correctos/);
});
