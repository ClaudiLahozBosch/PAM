// Lo que llega del foro a PAM (fase 6a): los oficiales de la Biblioteca. La puerta de js/pam/ tiene que ser la
// misma que enseñaba el Mi PJ antiguo dentro de PAM (recibirOficialesEnPAM), con los mismos datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { crearControladorForo } from '../../js/pam/ControladorForo.js';
import { crearPamActual } from '../../js/pam/PamActual.js';

const VIEJO = readFileSync(new URL('../../pam-mi-pj.user.js', import.meta.url), 'utf8');
const PAM = 'https://jesleytherabbit-prog.github.io/PAM/';
const espera = ms => new Promise(r => setTimeout(r, ms));
const PAQUETE = { v: 1, creado: '2026-11-03T10:00:00.000Z', modo: 'favoritos', usado: null,
  items: [{ nombre: 'Niebla en el muelle', relacion: 'El Profeta · Edición 3', fecha: '2026-10-03', estado: 'Disponible', enlace: 'https://hp-avada-kedavra.foroactivo.com/t901-x#9502', fav: true },
    { nombre: 'El tren <fantasma>', relacion: 'Abandonado · El Profeta · Edición 1', fecha: '2026-08-30', estado: 'Disponible', enlace: 'https://hp-avada-kedavra.foroactivo.com/t903-x#9701', fav: false }],
  estados: { 't901#9502': 'Disponible', 't903#9701': 'Disponible', 't901#9501': 'Ocupado' } };
/** rrOficiales de mentira, como el de la Bóveda de PAM. */
function rrOficiales(registro) {
  return {
    previa: () => ({ nuevos: [{ nombre: 'Niebla en el muelle', relacion: 'El Profeta · Edición 3', fav: true }, { nombre: 'El tren <fantasma>', relacion: 'Abandonado · El Profeta · Edición 1', fav: false }],
      cambios: [{ nombre: 'El robo del banco', estado: 'Ocupado', antes: 'Disponible', fav: false }] }),
    aplicar: (items, estados) => { registro.push({ items, estados }); return { nuevos: 2, cambios: 1 }; }
  };
}

/** La puerta que enseña el Mi PJ antiguo en PAM. */
async function puertaAntigua() {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: PAM, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, gm = { 'pam.oficiales': structuredClone(PAQUETE) };
  w.GM_getValue = (k, d) => (k in gm ? gm[k] : d); w.GM_setValue = (k, v) => { gm[k] = v; }; w.GM_listValues = () => Object.keys(gm);
  w.unsafeWindow = w; w.rrOficiales = rrOficiales([]); w.fetch = () => Promise.reject(new Error('sin red'));
  w.eval(VIEJO);
  for (let i = 0; i < 200 && !w.document.querySelector('.puerta'); i++) await espera(25);
  const html = w.document.querySelector('.puerta').outerHTML;
  w.close();
  return html;
}

/** La de PAM nuevo, con un agente de mentira. */
function controladorNuevo(paquete = structuredClone(PAQUETE)) {
  const { window: w } = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: PAM });
  const almacen = { 'pam.oficiales': paquete }, aplicados = [], secciones = [];
  w.rrOficiales = rrOficiales(aplicados); w.showSection = s => secciones.push(s);
  const agente = { leerDato: async k => structuredClone(almacen[k] ?? null), guardarDato: async (k, v) => { almacen[k] = structuredClone(v); } };
  const ctl = crearControladorForo({ agente, pam: crearPamActual(w), doc: w.document });
  return { w, ctl, almacen, aplicados, secciones };
}

test('la puerta de los oficiales es la misma que la de Mi PJ en PAM', async () => {
  const viejo = await puertaAntigua();
  const n = controladorNuevo(); n.ctl.revisarOficiales(); await espera(20);
  const nuevo = n.w.document.querySelector('.puerta').outerHTML;
  assert.equal(nuevo, viejo);
  assert.match(nuevo, /Oficiales del foro → PAM.*Biblioteca de oficiales/s);
  assert.match(nuevo, /★ Niebla en el muelle/);
  assert.match(nuevo, /El tren &lt;fantasma&gt;/, 'escapado');
  assert.ok(n.w.document.getElementById('esc-css').textContent.includes('--m-gold:var(--gold)'), 'con los colores del tema de PAM');
});

test('Aceptar: los suma a «Posibles oficiales», los marca como usados y ofrece verlos', async () => {
  const n = controladorNuevo(); const fin = n.ctl.revisarOficiales(); await espera(20);
  const boton = t => [...n.w.document.querySelectorAll('.puerta button')].find(b => b.textContent === t);
  boton('Aceptar').click(); await espera(20);
  assert.equal(n.aplicados.length, 1);
  assert.deepEqual(n.aplicados[0].items.map(x => x.nombre), ['Niebla en el muelle', 'El tren <fantasma>']);
  assert.match(n.w.document.querySelector('.p-info').textContent, /^Hecho/);
  boton('Ver Posibles oficiales').click(); await fin;
  assert.deepEqual(n.secciones, ['oficiales']);
  assert.equal(n.almacen['pam.oficiales'].usado.resultado, 'aceptada');
  assert.equal(n.w.document.querySelector('.puerta'), null);
  await n.ctl.revisarOficiales(); await espera(10);
  assert.equal(n.w.document.querySelector('.puerta'), null, 'ya usado: no vuelve a salir');
});

test('Denegar: no toca PAM y no vuelve a preguntar', async () => {
  const n = controladorNuevo(); const fin = n.ctl.revisarOficiales(); await espera(20);
  [...n.w.document.querySelectorAll('.puerta button')].find(b => b.textContent === 'Denegar').click(); await fin;
  assert.equal(n.aplicados.length, 0);
  assert.equal(n.almacen['pam.oficiales'].usado.resultado, 'denegada');
});

test('si PAM ya los tiene igual, no abre nada y lo marca', async () => {
  const n = controladorNuevo();
  n.w.rrOficiales.previa = () => ({ nuevos: [], cambios: [] });
  await n.ctl.revisarOficiales();
  assert.equal(n.w.document.querySelector('.puerta'), null);
  assert.equal(n.almacen['pam.oficiales'].usado.resultado, 'igual');
});

test('sin paquete, sin la Bóveda de PAM o con un paquete raro: no hace nada', async () => {
  for (const [paq, sinRr] of [[null, false], [structuredClone(PAQUETE), true], [{ v: 1, items: 'mal' }, false]]) {
    const n = controladorNuevo(paq); if (sinRr) delete n.w.rrOficiales;
    await n.ctl.revisarOficiales();
    assert.equal(n.w.document.querySelector('.puerta'), null);
  }
});

test('PAM carga js/pam/main.js con la versión, al final, y acepta el foro de pruebas', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /<script type="module" src="js\/pam\/arranque\.js\?v=[\d.]+"><\/script>\s*<\/body>/);
  const arranque = readFileSync(new URL('../../js/pam/arranque.js', import.meta.url), 'utf8');
  assert.match(arranque, /const V = '\?v=[\d.]+';/);
  assert.match(arranque, /await importar\('\.\.\/nube\/main\.js' \+ V\);\n  await importar\('\.\/main\.js' \+ V\);\n  return true;/);
  assert.match(readFileSync(new URL('../../js/paginas/inicio/foroAntiguo.js', import.meta.url), 'utf8'), /FOROS_PRUEBA = \["https:\/\/test-forito\.foroactivo\.com"\]/);
});
