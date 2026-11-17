// 2.3.0 · El agente de verdad en una página del Registro de Canjes: pinta la barra de Mi PJ debajo del mensaje (limpia
// de scripts), devuelve los clics al panel («canje.accion») y la quita.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PAM = 'https://claudilahozbosch.github.io', FORO = 'https://hp-avada-kedavra.foroactivo.com';
const CUENTA = { id: 5203, nombre: 'Mortimer Gaunt' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const ud = `<script>var _userdata = {}; _userdata["user_id"] = ${CUENTA.id}; _userdata["username"] = "${CUENTA.nombre}"; _userdata["session_logged_in"] = 1;</script>`;
const pagina = `<html><body>${ud}<h1 class="page-title">Registro de Canjes</h1><div class="post" id="p900"><div class="content">Carisma: 0 → 4 — 1500 grageas</div><div class="pie">pie</div></div></body></html>`;

const W = new JSDOM(pagina, { url: FORO + '/t34430p210-registro-de-canjes', runScripts: 'outside-only', pretendToBeVisual: true }).window;
W.fetch = async () => ({ ok: false, status: 404, text: async () => '', json: async () => ({}) });
const gm = {};
W.GM_getValue = (k, d) => (k in gm ? gm[k] : d); W.GM_setValue = (k, v) => { gm[k] = v; }; W.GM_listValues = () => Object.keys(gm);
const panelBus = new EventTarget();
const ventanaPanel = { postMessage: (data, destino) => { if (destino === PAM) panelBus.dispatchEvent(new MessageEvent('message', { data: structuredClone(data), origin: FORO })); } };
Object.defineProperty(W.HTMLIFrameElement.prototype, 'contentWindow', { get() { return ventanaPanel; } });
const alForo = d => W.dispatchEvent(new W.MessageEvent('message', { data: structuredClone(d), origin: PAM }));
W.eval(readFileSync(new URL('../../agente/pam-agente.user.js', import.meta.url), 'utf8'));
const { ClienteAgente } = await import('../../js/servicios/agente/ClienteAgente.js');
const agente = new ClienteAgente({ destino: { postMessage: (d, o) => o === FORO && alForo(d) }, origen: FORO, escuchar: panelBus });

const host = () => W.document.querySelector('.pam-agente-canje');
const barra = '<div class="icj icj-barra"><span class="marca">Mi PJ</span><button class="b pri" data-cj="llevar" data-p="900" onclick="alert(1)">✦ Llevar a PAM</button><button class="b" data-cj="ficha" data-p="900" disabled>Aplicar cambio a la ficha</button><script>window.malo = 1</script></div>';

test('pinta la barra justo debajo del mensaje, sin scripts ni on…', async () => {
  await agente.hola();
  const r = await agente.pedir('canje.pintar', { css: '.icj{color:red}', barras: { 900: barra } });
  assert.deepEqual(r, { pintado: true });
  const h = host();
  assert.ok(h, 'hay barra');
  assert.equal(h.previousElementSibling.className, 'content', 'debajo del texto del mensaje');
  const html = h.shadowRoot.innerHTML;
  assert.match(html, /✦ Llevar a PAM/);
  assert.doesNotMatch(html, /<script|onclick/);
  // pintarla otra vez no la duplica
  await agente.pedir('canje.pintar', { css: '', barras: { 900: barra.replace('✦ Llevar a PAM', 'Abriendo PAM…') } });
  assert.equal(W.document.querySelectorAll('.pam-agente-canje').length, 1);
  assert.match(host().shadowRoot.innerHTML, /Abriendo PAM…/);
});

test('el clic vuelve al panel como «canje.accion»; un botón apagado no hace nada', async () => {
  const clics = [];
  agente.atender('canje.accion', d => { clics.push(d); return {}; });
  await agente.pedir('canje.pintar', { css: '', barras: { 900: barra } });
  const s = host().shadowRoot;
  s.querySelector('[data-cj="ficha"]').click();
  s.querySelector('[data-cj="llevar"]').click();
  for (let i = 0; i < 50 && !clics.length; i++) await espera(10);
  assert.deepEqual(clics, [{ accion: 'llevar', p: '900' }]);
});

test('«canje.quitar» la saca', async () => {
  await agente.pedir('canje.quitar', {});
  assert.equal(host(), null);
});
