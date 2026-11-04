// Fase 8d: la Tabla de Canjes y el Compendio como módulo (js/paginas/canjes/).
// Se abre PAM con la nueva («archivos») y con la antigua («junto», copia congelada en tests/legado/paginas/tabla-canjes.js)
// y se compara lo que se ve en cada pestaña, al usarla (añadir al carrito, quitar, cambiar las grageas), el Compendio,
// el texto para copiar, el estado y lo que guarda. Se compara lo que está a la vista (la pestaña activa, el texto para
// copiar, la cabecera de grageas y la barra de pestañas): desde F16 las pestañas ocultas se pintan al abrirlas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrir, igual as igualTal, comoOficial } from '../legado/abrirPam.mjs';

// R07 (8d): la nueva usa data/sistema.json; a la antigua se le aplican las tres diferencias conocidas (comoOficial)
// y se compara todo lo demás. Abajo, una prueba que comprueba esas diferencias y que los datos son los mismos.
const igual = (a, b, que) => igualTal(a, comoOficial(b), que);

const MEDIODIA = Date.UTC(2026, 0, 15, 12);
const antes = w => {
  const D = w.Date;
  w.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(MEDIODIA); } static now() { return MEDIODIA; } };
  w.confirm = () => true; w.alert = () => {};
};
const TABS = ['stats', 'skills', 'especial', 'trasfondos', 'talentos', 'arcanos', 'armas', 'formacion', 'raza', 'veterania', 'legendarias', 'carrito', 'resumen'];
const d = w => w.document;
const campos = el => [...el.querySelectorAll('input,textarea,select')].map(e => (e.type === 'checkbox' ? e.checked : e.value)).join('|');
const vista = w => {
  const activa = d(w).querySelector('#tabContent .panel.active'), res = d(w).getElementById('panel-resumen'), led = d(w).getElementById('ledgerWrap');
  return [activa, res, led, d(w).getElementById('tabBar')].map(e => (e ? e.outerHTML + '\n' + campos(e) : '')).join('\n');
};
const fuera = v => JSON.parse(JSON.stringify(v));
async function par() { return [await abrir('archivos', { antes }), await abrir('junto', { antes })]; }
const cerrar = (...xs) => xs.forEach(x => x.w.close());
const pestana = (w, t) => d(w).querySelector(`.tab-btn[data-tab="${t}"]`).click();

test('8d: cada pestaña de la Tabla de Canjes se ve igual que antes', async () => {
  const [a, b] = await par();
  try {
    assert.equal(a.ok, true);
    assert.deepEqual(a.errores, b.errores);
    for (const t of TABS) { pestana(a.w, t); pestana(b.w, t); igual(vista(a.w), vista(b.w), t); }
  } finally { cerrar(a, b); }
});

test('8d: al usarla (añadir, quitar, grageas) hace, muestra y guarda lo mismo', async () => {
  const [a, b] = await par();
  try {
    for (const w of [a.w, b.w]) { const i = d(w).getElementById('inpDisponibles'); i.value = '5000'; i.dispatchEvent(new w.Event('input', { bubbles: true })); }
    igual(vista(a.w), vista(b.w), 'grageas disponibles');
    // en cada pestaña, los dos primeros botones de añadir (si hay)
    for (const t of TABS.filter(t => t !== 'carrito' && t !== 'resumen')) {
      for (let k = 0; k < 2; k++) {
        for (const w of [a.w, b.w]) {
          pestana(w, t);
          const bs = [...d(w).querySelectorAll('#tabContent .panel.active button.btn:not([disabled])')].filter(x => !x.classList.contains('ghost'));
          bs[k]?.click();
        }
        igual(vista(a.w), vista(b.w), `${t}, botón ${k + 1}`);
      }
    }
    for (const w of [a.w, b.w]) pestana(w, 'carrito');
    igual(vista(a.w), vista(b.w), 'carrito');
    assert.ok(a.w.pamTabla.state.cart.length > 3, 'hay cosas en el carrito: ' + a.w.pamTabla.state.cart.length);
    // quitar la primera línea del carrito
    for (const w of [a.w, b.w]) d(w).querySelector('#tabContent .panel.active .chip-remove')?.click();
    igual(vista(a.w), vista(b.w), 'carrito tras quitar');
    for (const w of [a.w, b.w]) pestana(w, 'resumen');
    igual(vista(a.w), vista(b.w), 'texto para copiar');
    assert.deepEqual(fuera(a.w.pamTabla.state), JSON.parse(comoOficial(JSON.stringify(b.w.pamTabla.state))), 'el estado');
    for (const w of [a.w, b.w]) w.dispatchEvent(new w.Event('pagehide'));
    assert.equal(a.w.localStorage.getItem('grimorio.canjes'), comoOficial(b.w.localStorage.getItem('grimorio.canjes')), 'lo guardado (R08)');
    // vaciar el carrito al cerrar un canje (R08)
    for (const w of [a.w, b.w]) w.pamCanjes.vaciarCarrito();
    igual(vista(a.w), vista(b.w), 'carrito vacío');
  } finally { cerrar(a, b); }
});

test('8d: el Compendio busca y filtra igual', async () => {
  const [a, b] = await par();
  try {
    const comp = w => d(w).getElementById('panel-compendio') || d(w).querySelector('[data-section="compendio"]') || d(w).getElementById('cmpQ')?.closest('section');
    for (const w of [a.w, b.w]) w.showSection('compendio');
    igual(comp(a.w).outerHTML, comp(b.w).outerHTML, 'compendio');
    for (const q of ['expelliarmus', 'niebla', 'curación']) {
      for (const w of [a.w, b.w]) { const i = d(w).getElementById('cmpQ'); i.value = q; i.dispatchEvent(new w.Event('input', { bubbles: true })); }
      igual(comp(a.w).outerHTML, comp(b.w).outerHTML, 'búsqueda ' + q);
    }
  } finally { cerrar(a, b); }
});

test('R07: los datos de la Tabla salen de data/*.json y son los de antes (salvo lo reconciliado con el texto oficial)', async () => {
  const { readFileSync } = await import('node:fs');
  const { datosTabla } = await import('../../js/paginas/canjes/datos.js');
  const { pamEntero } = await import('../legado/montarPam.mjs');
  const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
  // las constantes de la página antigua, ejecutando su zona de datos (como hacía el Inspector antiguo)
  const html = pamEntero(), a = html.indexOf('const STATS = ['), z = html.indexOf('/* =========================================================\n   UTILIDADES', a);
  const arcanosTxt = html.match(/<script id="arcanos-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  const N = datosTabla({ sistema: json('sistema.json'), calculadora: json('arcanos-calculadora.json'), arcanos: JSON.parse(arcanosTxt) });
  const nombres = Object.keys(N).filter(k => !['SKILL_STAT'].includes(k));
  const V = new Function('document', html.slice(a, z) + '\nreturn {' + nombres.join(',') + ', SKILL_STAT};')({ getElementById: () => ({ textContent: arcanosTxt }) });
  const plano = v => JSON.parse(comoOficial(JSON.stringify(v)));
  for (const k of nombres) {
    if (k === 'TIPOS_TRASF') { assert.deepEqual(N[k], ['Biblioteca', 'Influencia', 'Informantes', 'Seguidores']); assert.deepEqual([...N[k]].sort(), [...V[k]].sort()); continue; }
    assert.deepEqual(JSON.parse(JSON.stringify(N[k])), plano(V[k]), k);
  }
  const src = readFileSync(new URL('../../js/paginas/canjes/Tabla.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /const ARC_RAW|const TALENTOS = \[|const STAT_ACUM/, 'sin los datos escritos a mano');
});

test('8d: la Tabla guarda con el almacén y lo que usan los demás está en window.pamTabla', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../../js/paginas/canjes/Tabla.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /localStorage/);
  const a = await abrir('archivos', { antes });
  try {
    for (const k of ['state', 'ARCANOS', 'COMP', 'addToCart', 'renderAll', 'activateTab', 'compResults', 'costoSubida', 'fmt']) assert.notEqual(a.w.pamTabla[k], undefined, k);
    assert.equal(typeof a.w.pamCanjes.vaciarCarrito, 'function');
  } finally { a.w.close(); }
});
