// R08 (fase 8): la Tabla de Canjes se guarda. Antes, al recargar PAM se perdían el carrito y las «Grageas disponibles»
// (las que pone «Datos del foro → PAM»), y la petición de canje salía con 0 grageas.
// Al cerrar un canje en PAM, el carrito queda vacío (si no, se podría volver a preparar lo mismo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';
import { pamEntero } from '../legado/montarPam.mjs';
import { crearPamActual } from '../../js/pam/PamActual.js';

/** PAM en jsdom, con lo que haya en el localStorage. */
function abrir(guardado = {}) {
  const dom = new JSDOM(pamEntero().replace(/<script type="module"[^>]*><\/script>/g, ''), {
    url: 'https://jesleytherabbit-prog.github.io/PAM/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole(),
    beforeParse(w) {
      w.fetch = () => Promise.reject(new Error('sin red'));
      if (w.HTMLDialogElement) { w.HTMLDialogElement.prototype.showModal = function () {}; w.HTMLDialogElement.prototype.close = function () {}; }
      w.scrollTo = () => {}; w.requestAnimationFrame = () => 0;
      const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
      w.HTMLCanvasElement.prototype.getContext = () => ctx;
      for (const [k, v] of Object.entries(guardado)) w.localStorage.setItem(k, v);
    }
  });
  const w = dom.window, d = w.document;
  const plano = e => JSON.parse(JSON.stringify(w.eval(e)));
  return { w, d, plano, ev: (el, tipo) => el.dispatchEvent(new w.Event(tipo, { bubbles: true })) };
}
const guardado = w => ({ 'grimorio.canjes': w.localStorage.getItem('grimorio.canjes') });
const vigor = d => [...d.querySelectorAll('#panel-stats .card')].find(c => c.querySelector('.card-name').textContent === 'Vigor').querySelector('button');

test('al recargar PAM siguen las grageas disponibles, el carrito y los niveles', () => {
  const a = abrir();
  try {
    const inp = a.d.getElementById('inpDisponibles');
    inp.value = '1234'; a.ev(inp, 'input');
    a.w.eval('activateTab("stats"); renderAll();');
    vigor(a.d).click();
    assert.equal(a.d.getElementById('valRestantes').textContent, a.w.eval('fmt(1234 - 250)'));
    const b = abrir(guardado(a.w));
    try {
      assert.equal(b.d.getElementById('inpDisponibles').value, '1234');
      assert.deepEqual(b.plano('state.cart.map(i => i.line)'), ['Vigor: 0 → 1 — 250 grageas']);
      assert.equal(b.plano('state.statsBase.Vigor'), 1, 'el nivel actual avanzado también');
      assert.equal(b.d.getElementById('valRestantes').textContent, a.d.getElementById('valRestantes').textContent);
      assert.equal(b.d.getElementById('valCartQuick').textContent, '1 ítem(s) · 250 gr');
      // lo nuevo que se añada no repite el id de lo que ya estaba
      b.w.eval('state.statsTarget.Destreza = 1; renderAll();');
      [...b.d.querySelectorAll('#panel-stats .card')].find(c => c.querySelector('.card-name').textContent === 'Destreza').querySelector('button').click();
      const ids = b.plano('state.cart.map(i => i.id)');
      assert.equal(new Set(ids).size, 2, String(ids));
    } finally { b.w.close(); }
  } finally { a.w.close(); }
});

test('viaja con la sesión con código (la clave empieza por «grimorio.»)', async () => {
  const { readFileSync } = await import('node:fs');
  const p = readFileSync(new URL('../../js/nube/pendiente.js', import.meta.url), 'utf8');
  assert.match(p, /PRE\s*=\s*\[[^\]]*'grimorio\.'/);
});

test('«Reiniciar todo» también se guarda', () => {
  const a = abrir();
  try {
    const inp = a.d.getElementById('inpDisponibles');
    inp.value = '500'; a.ev(inp, 'input');
    const r = a.d.getElementById('resetAllBtn'); r.click(); r.click(); // pide confirmación
    const b = abrir(guardado(a.w));
    try {
      assert.equal(b.d.getElementById('inpDisponibles').value, '0');
      assert.deepEqual(b.plano('state.cart'), []);
    } finally { b.w.close(); }
  } finally { a.w.close(); }
});

test('al cerrar el canje en PAM el carrito queda vacío; las grageas disponibles se quedan', () => {
  const a = abrir();
  try {
    const inp = a.d.getElementById('inpDisponibles');
    inp.value = '800'; a.ev(inp, 'input');
    a.w.eval('activateTab("stats"); renderAll();');
    vigor(a.d).click();
    crearPamActual(a.w).vaciarCarrito();
    assert.deepEqual(a.plano('state.cart'), []);
    assert.equal(a.d.getElementById('valCartQuick').textContent, '0 ítem(s) · 0 gr');
    assert.equal(JSON.parse(a.w.localStorage.getItem('grimorio.canjes')).disponibles, 800);
  } finally { a.w.close(); }
});

test('si lo guardado está roto o es de otra forma, PAM arranca como siempre', () => {
  for (const malo of ['{roto', '[]', '"texto"', JSON.stringify({ cart: 'no', disponibles: 'x', armas: [] })]) {
    const a = abrir({ 'grimorio.canjes': malo });
    try {
      assert.deepEqual(a.plano('state.cart'), [], malo);
      assert.equal(a.plano('state.disponibles'), 0, malo);
      assert.equal(a.plano('state.armas.length'), 1, malo);
    } finally { a.w.close(); }
  }
});
