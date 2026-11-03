// Panel «Mi PJ»: servicio (lo que se lee del foro a través del agente) y vista, con un agente de prueba.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { leerMiPj } from '../../js/servicios/MiPj.js';

const { window: W } = new JSDOM('<!doctype html><body><main id="c"></main></body>');
globalThis.DOMParser = W.DOMParser; globalThis.document = W.document; globalThis.Node = W.Node;
const { PanelMiPj } = await import('../../js/paginas/panel/PanelMiPj.js');

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

test('vista: pinta ficha, stats y bóveda; guarda y usa la caché', async () => {
  const raiz = W.document.getElementById('c');
  const mem = new Map(); const guardado = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  let ahora = Date.parse('2026-11-04T12:00:00Z'), cargas = 0;
  // el mismo reloj para la vista y para la hora de lectura
  const cargar = async () => { cargas++; return { ...(await leerMiPj(agente(), deps)), leido: new Date(ahora).toISOString() }; };
  const panel = new PanelMiPj(raiz, { cargar, guardado, ahora: () => ahora });
  await panel.iniciar();
  const t = raiz.textContent;
  assert.match(t, /Irvin Giles\./);
  assert.match(t, /Grageas\s*1\.525/);
  assert.match(t, /Destino\s*13/);
  assert.equal(raiz.querySelector('h2 a').getAttribute('href'), 'https://hp-avada-kedavra.foroactivo.com/t23113-');
  assert.equal(raiz.querySelector('h2 a').getAttribute('target'), '_top');
  assert.equal(cargas, 1);
  ahora += 5 * 60000;
  await new PanelMiPj(raiz, { cargar, guardado, ahora: () => ahora }).iniciar();
  assert.equal(cargas, 1, 'con la caché reciente no vuelve a leer el foro');
  ahora += 31 * 60000;
  await new PanelMiPj(raiz, { cargar, guardado, ahora: () => ahora }).iniciar();
  assert.equal(cargas, 2, 'pasada media hora, sí');
});
test('vista: un nombre con HTML se ve como texto (nunca se interpreta)', async () => {
  const raiz = W.document.getElementById('c');
  // escrito con entidades en el BBCode: el lector lo convierte en el texto «<img …>», que llega a la vista
  const panel = new PanelMiPj(raiz, { cargar: () => leerMiPj(agente({ nombre: '&lt;img src=x onerror=alert(1)&gt;' }), deps) });
  await panel.iniciar();
  assert.equal(raiz.querySelector('img'), null);
  assert.match(raiz.textContent, /<img src=x onerror=alert\(1\)>/);
});
