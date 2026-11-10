// 2.0.0: lo que se publica para los jugadores.
//   · pam-mi-pj.user.js sale de agente/pam-agente.user.js con scripts/publicar-agente.mjs y tiene que estar al día; son una actualización del «Mi PJ» de Hana (mismo @name y @namespace, versión mayor);
//     la de verdad no apunta al PAM de pruebas ni funciona en el foro de pruebas.
//   · pam-inspector-canjes.user.js: la última versión del Inspector de antes, que solo avisa de que ya está en Mi PJ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { archivos } from '../../scripts/publicar-agente.mjs';

const leer = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const meta = (txt, k) => [...txt.slice(0, txt.indexOf('// ==/UserScript==')).matchAll(new RegExp('^// @' + k + '\\s+(.+?)\\s*$', 'gm'))].map(m => m[1]);
const version = v => v.split('.').map(Number);
const mayor = (a, b) => { const x = version(a), y = version(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
const ANTIGUO = leer('tests/legado/pam-mi-pj.user.js'), INSP_ANTIGUO = leer('tests/legado/pam-inspector-canjes.user.js');

test('el script para los jugadores está al día con el agente (node scripts/publicar-agente.mjs)', () => {
  for (const [f, t] of Object.entries(archivos())) assert.equal(leer(f), t, f + ' no está al día: node scripts/publicar-agente.mjs');
});

test('pam-mi-pj.user.js es una actualización del Mi PJ de antes y solo habla con el PAM y el foro de verdad', () => {
  const nuevo = leer('pam-mi-pj.user.js');
  for (const k of ['name', 'namespace', 'updateURL', 'downloadURL']) assert.deepEqual(meta(nuevo, k), meta(ANTIGUO, k), k);
  assert.ok(mayor(meta(nuevo, 'version')[0], meta(ANTIGUO, 'version')[0]), 'versión mayor que la del Mi PJ de antes');
  assert.deepEqual(meta(nuevo, 'match'), meta(ANTIGUO, 'match'), 'los mismos sitios que antes');
  assert.doesNotMatch(nuevo, /claudilahozbosch|test-forito|staging/i);
  assert.match(nuevo, /var PAM = \{ origen: 'https:\/\/jesleytherabbit-prog\.github\.io', ruta: '\/PAM\/' \};/);
  assert.match(nuevo, /var FOROS = \['hp-avada-kedavra\.foroactivo\.com'\];/);
  assert.equal(meta(nuevo, 'version')[0], (nuevo.match(/var VERSION = '([^']+)'/) || [])[1], '@version y VERSION iguales');
  new vm.Script(nuevo); // se puede leer
});

test('el Inspector de antes: última versión que solo avisa (no lee PAM ni ejecuta nada)', () => {
  const adios = leer('pam-inspector-canjes.user.js');
  for (const k of ['name', 'namespace', 'match']) assert.deepEqual(meta(adios, k), meta(INSP_ANTIGUO, k), k);
  assert.ok(mayor(meta(adios, 'version')[0], meta(INSP_ANTIGUO, 'version')[0]), 'versión mayor');
  assert.doesNotMatch(adios, /new Function|GM_xmlhttpRequest|fetch\(|@connect/);
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://hp-avada-kedavra.foroactivo.com/t34430-registro-de-canjes', runScripts: 'outside-only' });
  const guardado = {};
  Object.assign(dom.window, { GM_getValue: (k, d) => (k in guardado ? guardado[k] : d), GM_setValue: (k, v) => { guardado[k] = v; } });
  dom.window.eval(adios);
  const caja = dom.window.document.querySelector('.icj-adios');
  assert.ok(caja, 'enseña el aviso');
  assert.match(caja.textContent, /dentro de Mi PJ/);
  caja.querySelector('button').click();
  assert.equal(dom.window.document.querySelector('.icj-adios'), null);
  dom.window.eval(adios);
  assert.equal(dom.window.document.querySelector('.icj-adios'), null, 'después de «Entendido» ya no sale');
});
