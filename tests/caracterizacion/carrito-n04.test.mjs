// N04 (fase 6b): el carrito de la Tabla de Canjes, con el PAM de verdad (index.html en jsdom).
// El caso que encontró el usuario: con «Informantes Académicos 0 → I» en el carrito, PAM dejaba volver a elegir 0 → I y
// 0 → II, y una subida I → II quedaba en otra línea. Ahora el nivel actual sale solo, las subidas se juntan y el
// carrito sale siempre en el mismo orden.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { cargarPam, cerrarPam } from '../legado/cargarPam.mjs';

const P = cargarPam();
after(cerrarPam);
const w = P.w, d = w.document;
const ev = (el, tipo) => el.dispatchEvent(new w.Event(tipo, { bubbles: true }));
/** El primer añadidor de trasfondos generales (pestaña Trasfondos). */
const adder = () => d.querySelector('#panel-trasfondos .adder');
const elegir = (sel, v) => { const s = adder().querySelector(sel); s.value = String(v); ev(s, 'change'); };
const opciones = sel => [...adder().querySelector(sel).options].map(o => o.textContent);
const carrito = () => P.global('state.cart.map(i => i.line)');

test('trasfondo: después de añadir 0 → I, no deja volver a elegir 0 → I; la subida I → II se junta en 0 → II', () => {
  P.global('state.cart = []; state.bgsBase = {}; activateTab("trasfondos"); renderAll(); 1');
  elegir('.ft', 'Informantes'); elegir('.fc', 'Académicos');
  assert.deepEqual([opciones('.la'), opciones('.lt')], [['0', 'I', 'II', 'III', 'IV', 'V'], ['I', 'II', 'III', 'IV', 'V']]);
  adder().querySelector('button.btn').click();
  assert.deepEqual(carrito(), ['Informantes Académicos: 0 → I — 100 grageas']);
  // el nivel actual ya es I y no se puede elegir otra vez 0 → I
  assert.equal(adder().querySelector('.la').value, '1');
  assert.deepEqual(opciones('.la'), ['I', 'II', 'III', 'IV', 'V']);
  assert.deepEqual(opciones('.lt'), ['II', 'III', 'IV', 'V']);
  adder().querySelector('button.btn').click(); // I → II
  assert.deepEqual(carrito(), ['Informantes Académicos: 0 → II — 300 grageas'], 'una sola línea, con el coste de 0 a II');
  assert.equal(P.global('state.cart[0].cost'), 300);
});

test('trasfondo: el nivel de la ficha sale solo (al «Llevar a la calculadora»)', () => {
  P.global('state.cart = []; state.bgsBase = { "Informantes Bajos fondos": 2 }; state.ui.trgenNom = ""; renderAll(); 1');
  elegir('.ft', 'Informantes'); elegir('.fc', 'Bajos fondos');
  assert.equal(adder().querySelector('.la').value, '2');
  assert.deepEqual(opciones('.la'), ['II', 'III', 'IV', 'V']);
  adder().querySelector('button.btn').click();
  assert.deepEqual(carrito(), ['Informantes Bajos fondos: II → III — 300 grageas']);
});

test('«Llevar a la calculadora» guarda los niveles de los trasfondos de la ficha', () => {
  P.global('state.cart = []; 1'); // con el carrito lleno, PAM pide confirmación
  const r = P.ficha(`ficha.bgs = [{ t: "Informantes", c: "Hogwarts", e: "", v: 3 }, { t: "Biblioteca", c: "Ciencias", e: "Pociones", v: 1 }]; llevarCalculadora(); 1`);
  assert.equal(r, 1);
  assert.deepEqual(P.global('state.bgsBase'), { 'Informantes Hogwarts': 3, 'Biblioteca Ciencias > Pociones': 1 });
});

test('estadística: dos subidas seguidas quedan en una línea con el coste recalculado', () => {
  P.global('state.cart = []; state.statsBase.Vigor = 2; state.statsTarget.Vigor = 3; activateTab("stats"); renderAll(); 1');
  const boton = () => [...d.querySelectorAll('#panel-stats .card')].find(c => c.querySelector('.card-name').textContent === 'Vigor').querySelector('button');
  boton().click(); boton().click();
  assert.deepEqual(P.global('state.cart.map(i => [i.line, i.cost, i.meta.from, i.meta.to])'), [['Vigor: 2 → 4 — 950 grageas', 950, 2, 4]]);
  // y al quitarla, el nivel vuelve a 2
  P.global('removeItem(state.cart[0].id); 1');
  assert.equal(P.global('state.statsBase.Vigor'), 2);
});

test('el carrito y el texto para copiar salen por categoría y, dentro, en orden alfabético', () => {
  P.global(`state.cart = [];
    addToCart("TRASFONDOS", "Seguidores Hogwarts: 0 → I — 100 grageas", 100, 0, null, {kind:"trasf", name:"Seguidores Hogwarts", from:0, to:1});
    addToCart("ESTADÍSTICAS", "Vigor: 2 → 3 — 400 grageas", 400, 0, null, {kind:"stat", name:"Vigor", from:2, to:3});
    addToCart("TRASFONDOS", "Biblioteca Ciencias: 0 → I — 100 grageas", 100, 0, null, {kind:"trasf", name:"Biblioteca Ciencias", from:0, to:1});
    addToCart("ESTADÍSTICAS", "Carisma: 1 → 2 — 300 grageas", 300, 0, null, {kind:"stat", name:"Carisma", from:1, to:2});
    addToCart("TRASFONDOS", "Informantes Hogwarts: 0 → I — 100 grageas", 100, 0, null, {kind:"trasf", name:"Informantes Hogwarts", from:0, to:1});
    activateTab("carrito"); renderAll(); 1`);
  const lineas = [...d.querySelectorAll('#panel-carrito .chip span')].map(s => s.textContent).filter(t => / — /.test(t));
  assert.deepEqual(lineas, ['Carisma: 1 → 2 — 300 grageas', 'Vigor: 2 → 3 — 400 grageas',
    'Biblioteca Ciencias: 0 → I — 100 grageas', 'Informantes Hogwarts: 0 → I — 100 grageas', 'Seguidores Hogwarts: 0 → I — 100 grageas']);
  P.global('activateTab("resumen"); renderAll(); 1');
  const texto = d.querySelector('#panel-resumen .summary-box').textContent;
  assert.ok(texto.indexOf('Carisma') < texto.indexOf('Vigor') && texto.indexOf('Biblioteca') < texto.indexOf('Informantes') && texto.indexOf('Informantes') < texto.indexOf('Seguidores'), texto);
});
