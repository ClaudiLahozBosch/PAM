// Panel «Mi PJ»: el servicio (lo que se lee del foro a través del agente), con un agente de prueba.
// (Que la vista pinte lo mismo que Mi PJ se comprueba en caracterizacion/panel-mipj.test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { leerMiPj, aDatosMiPj } from '../../js/servicios/MiPj.js';
import { crearPanelMiPj } from '../../js/paginas/panel/MiPjPanel.js';

const { window: W } = new JSDOM('<!doctype html><body><main id="c"></main></body>');
globalThis.DOMParser = W.DOMParser; globalThis.document = W.document; globalThis.Node = W.Node;

const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const sistema = new Sistema(json('sistema.json')), compendio = new Compendio(json('arcanos.json'));
const foros = json('foros.json').foros, lector = new LectorFicha(sistema, compendio);
const fx = f => readFileSync(new URL('../fixtures/' + f, import.meta.url), 'utf8');
const PARTES = JSON.parse(fx('fichas/varias-partes.json')).partes;
const dom = html => new W.DOMParser().parseFromString(html, 'text/html');
const textarea = t => `<form name="post"><textarea name="message">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea></form>`;

/** Agente de prueba con la cuenta de Irvin (u5203) en el foro real. */
function agente({ cuenta = { id: 5203, nombre: 'Irvin Giles' }, perfil = { ficha: 'https://hp-avada-kedavra.foroactivo.com/t23113-irvin-giles', boveda: '/t23175-boveda-de-irvin-giles' }, nombre } = {}) {
  const pedidas = [];
  return {
    pedidas,
    hola: async () => ({ agente: '0.2.0', protocolo: 1, foro: 'hp-avada-kedavra.foroactivo.com', cuenta, ruta: '/' }),
    async leer(ruta) {
      pedidas.push(ruta);
      if (ruta.startsWith('/profile')) return dom(`<form><input name="profile_field_3_-10" value="${perfil.ficha}"><input name="profile_field_3_24" value="${perfil.boveda}"></form>`);
      if (ruta === '/t23113-') return dom(fx('foro/tema-ficha.html'));
      const ed = ruta.match(/^\/post\?p=(\d+)&mode=editpost$/);
      if (ed) { let b = PARTES.find(p => p.post === Number(ed[1]))?.bbcode ?? ''; if (nombre) b = b.replace('Irvin Giles.', nombre); return dom(textarea(b)); }
      if (ruta === '/t23175-') return dom(fx('foro/boveda-p1.html'));
      if (ruta === '/t23175p15-boveda-de-irvin-giles') return dom(fx('foro/boveda-p2.html'));
      throw new Error('ruta no prevista: ' + ruta);
    }
  };
}
const deps = { sistema, compendio, lector, foros };

test('Mi PJ: perfil → ficha (BBCode propio, cinco partes) → stats → bóveda', async () => {
  const a = agente();
  const d = await leerMiPj(a, deps);
  assert.equal(d.estado, 'ok');
  assert.deepEqual(d.errores, []);
  assert.equal(d.ficha.tema, 23113);
  assert.equal(d.ficha.propia, true);
  assert.equal(d.ficha.ficha.partes.length, 5);
  assert.equal(d.ficha.ficha.presentacion.pd, 13);
  assert.ok(d.stats.combate.def > 0 && d.stats.puntos.pp >= 0);
  assert.equal(d.boveda.act, 1525);
  assert.equal(a.pedidas.filter(r => r.includes('editpost')).length, 5, 'su BBCode, mensaje a mensaje');
});
test('Mi PJ: sin sesión, foro desconocido y perfil sin enlaces', async () => {
  assert.equal((await leerMiPj(agente({ cuenta: null }), deps)).estado, 'sinSesion');
  const otro = { ...agente(), hola: async () => ({ agente: '0.2.0', protocolo: 1, foro: 'otro.foroactivo.com', cuenta: { id: 1, nombre: 'X' } }) };
  assert.equal((await leerMiPj(otro, deps)).estado, 'foroDesconocido');
  const d = await leerMiPj(agente({ perfil: { ficha: '', boveda: '' } }), deps);
  assert.equal(d.estado, 'ok');
  assert.match(d.errores.join(' '), /no tiene el enlace a la ficha/);
  assert.equal(d.ficha, null);
});
test('Mi PJ: si falla la bóveda, la ficha se ve igual', async () => {
  const a = agente({ perfil: { ficha: '/t23113-', boveda: '/t99999-' } });
  const d = await leerMiPj(a, deps);
  assert.ok(d.ficha);
  assert.match(d.errores.join(' '), /Bóveda: ruta no prevista/);
});

test('estado de la ficha como Mi PJ: pendiente si el dueño escribió después del último sello', async () => {
  const d = await leerMiPj(agente(), deps);
  assert.equal(d.ficha.estado, 'pendiente');
  assert.deepEqual(d.ficha.sello, { autor: 'Revisor', fecha: 'Dom 2 Ago 2020 - 18:03' });
  const datos = aDatosMiPj(d, sistema);
  assert.equal(datos.ficha.url, 'https://hp-avada-kedavra.foroactivo.com/t23113-');
  assert.equal(datos.boveda.url, 'https://hp-avada-kedavra.foroactivo.com/t23175-');
  assert.equal(datos.rapido.skills.Esquiva, 2, 'con los nombres de la ficha, como Mi PJ');
  assert.equal(datos.rapido.combate.Defensa, d.stats.combate.def);
});
test('vista: un nombre con HTML se ve como texto (nunca se interpreta)', async () => {
  const raiz = W.document.getElementById('c');
  const datos = aDatosMiPj(await leerMiPj(agente({ nombre: '&lt;img src=x onerror=alert(1)&gt;' }), deps), sistema);
  const p = crearPanelMiPj({ root: raiz, documento: W.document, cargar: async () => datos, ventana: { ancho: 1200, alto: 800 }, pamUrl: 'https://x/', cuenta: { id: 5203, nombre: 'Irvin Giles' } });
  await p.actualizar();
  assert.equal(raiz.querySelector('img'), null);
  assert.match(raiz.textContent, /<img src=x onerror=alert\(1\)>/);
});
