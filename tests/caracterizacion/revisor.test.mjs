// Fase 8c: Mi Ficha, el Controlador de stats y el Revisor de Empleos como módulos (js/paginas/revisor/).
// Se abre PAM con el nuevo («archivos») y con el antiguo («junto», copia congelada en tests/legado/paginas/revisor.js)
// y se compara lo que se ve en cada pestaña, al importar una ficha real (Mortimer, con permiso), al usarlo, lo que
// deja para el foro y el resto de PAM (pamFicha, pamRapido, la Tabla de Canjes) y lo que guarda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { abrir, igual, RAIZ } from '../legado/abrirPam.mjs';

const MORTIMER = readFileSync(path.join(RAIZ, 'tests/fixtures/fichas/mortimer-compacta.bbcode'), 'utf8');
const MEDIODIA = Date.UTC(2026, 0, 15, 12);
const antes = w => {
  const D = w.Date;
  w.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(MEDIODIA); } static now() { return MEDIODIA; } };
  w.confirm = () => true; w.prompt = () => null; w.alert = () => {};
};

const raiz = w => w.document.getElementById('re-app');
const $ = (w, s) => raiz(w).querySelector(s);
// R07 (8c): Mi Ficha usa data/sistema.json, que añade «Gobierno mágico de (X país)» a las categorías de Política (le
// faltaba; texto oficial). Es la única diferencia a propósito: se quita para comparar y se comprueba aparte.
const GOBIERNO = /<option(?: [^>]*)?value="Gobierno mágico de \(X país\)"[^>]*>[^<]*<\/option>|<option[^>]*>Gobierno mágico de \(X país\)<\/option>/g;
const vista = w => raiz(w).outerHTML.replace(GOBIERNO, '') + '\n' + [...raiz(w).querySelectorAll('input,textarea,select')].map(e => (e.type === 'checkbox' ? e.checked : e.value)).join('|');
const fuera = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const esperar = ms => new Promise(r => setTimeout(r, ms));
const PESTANAS = ['empleos', 'ficha', 'control', 'editor'];
const FICHA = ['datos', 'caract', 'magia', 'otros', 'desc', 'codigo'];
// 2.0.1: el nuevo lee la ficha con el lector de Mi PJ (importar-ficha.test.mjs). Con Mortimer la única diferencia es un
// arcano que el antiguo no reconocía (errata de la ficha); aquí se le devuelve el nombre de antes para comparar todo lo demás.
const ARCANO_ANTES = { 'Transfiguración humana absoluta (Alter Humanus)': { name: 'Transfiguración humana absolutas | Alter Humanus', nota: 'Requiere Transfiguratio Mayoris.' } };
async function par() {
  const a = await abrir('archivos', { antes });
  const leer = a.w.PAM_EDITOR.leerFicha;
  a.w.PAM_EDITOR.leerFicha = t => { const r = leer(t); r.ficha.arcanos.forEach(x => Object.assign(x, ARCANO_ANTES[x.name])); return r; };
  return [a, await abrir('junto', { antes })];
}
const cerrar = (...xs) => xs.forEach(x => x.w.close());
function recorrer(a, b, que) {
  for (const t of PESTANAS) {
    for (const w of [a.w, b.w]) $(w, `nav.re-tabs button[data-tab="${t}"]`).click();
    igual(vista(a.w), vista(b.w), `${que}: ${t}`);
  }
  for (const f of FICHA) {
    for (const w of [a.w, b.w]) { $(w, 'nav.re-tabs button[data-tab="ficha"]').click(); $(w, `#fx-tabs button[data-ft="${f}"]`).click(); }
    igual(vista(a.w), vista(b.w), `${que}: ficha · ${f}`);
  }
}
function importar(w, txt) { $(w, '#f-parse').click(); $(w, '#dlg-ta').value = txt; $(w, '#dlg-ok').click(); }

test('8c: Mi Ficha, el Controlador y el Revisor se ven igual que antes (sin ficha y con la de ejemplo)', async () => {
  const [a, b] = await par();
  try {
    assert.equal(a.ok, true);
    assert.deepEqual(a.errores, b.errores);
    recorrer(a, b, 'vacío');
    for (const w of [a.w, b.w]) $(w, '#f-example').click();
    recorrer(a, b, 'ejemplo');
  } finally { cerrar(a, b); }
});

test('8c: al importar una ficha real (Mortimer) todo igual: pantallas, lo que ve el resto de PAM y lo que guarda', async () => {
  const [a, b] = await par();
  try {
    for (const w of [a.w, b.w]) importar(w, MORTIMER);
    recorrer(a, b, 'Mortimer');
    assert.deepEqual(fuera(a.w.grimorioFicha()), fuera(b.w.grimorioFicha()), 'grimorioFicha');
    assert.deepEqual(fuera(a.w.pamRapido()), fuera(b.w.pamRapido()), 'pamRapido (Mi PJ)');
    assert.deepEqual(fuera(a.w.pamPjs.lista()), fuera(b.w.pamPjs.lista()), 'pamPjs');
    assert.deepEqual(fuera(a.w.pamFicha.codigoPersonal()), fuera(b.w.pamFicha.codigoPersonal()), 'codigoPersonal');
    // Llevar a la calculadora: la Tabla de Canjes queda igual
    for (const w of [a.w, b.w]) w.pamFicha.llevarCalculadora();
    // (sin state.ui: lo que cada pestaña apunta al pintarse; desde F16 se pintan al abrirlas)
    const sinUi = s => { const c = fuera(s); delete c.ui; return c; };
    assert.deepEqual(sinUi(a.w.pamTabla.state), sinUi(b.w.pamTabla.state), 'la Tabla de Canjes tras «Llevar a la calculadora»');
    // un canje en el carrito y «Traer de la calculadora»: la ficha queda igual
    for (const w of [a.w, b.w]) {
      w.pamTabla.addToCart('ESTADÍSTICAS', 'Vigor: 4 → 5 — 300 grageas', 300, 0, null, { kind: 'stat', name: 'Vigor', from: 4, to: 5 }); w.pamTabla.state.statsBase.Vigor = 5;
      w.pamFicha.traerCalculadora();
    }
    assert.deepEqual(fuera(a.w.grimorioFicha()), fuera(b.w.grimorioFicha()), 'la ficha tras «Traer de la calculadora»');
    recorrer(a, b, 'Mortimer tras el canje');
    await esperar(300); // el antiguo guarda a los 150 ms
    for (const k of ['grimorio.personajes', 'revisorEmpleos.ficha', 'revisorEmpleos.jobs', 'revisorEmpleos.ui', 'grimorio.fichaTab', 'revisorEmpleos.foroVistos'])
      assert.equal(a.w.localStorage.getItem(k), b.w.localStorage.getItem(k), k);
  } finally { cerrar(a, b); }
});

test('8c: el Revisor de Empleos y el Controlador, al usarlos, hacen lo mismo', async () => {
  const [a, b] = await par();
  try {
    for (const w of [a.w, b.w]) importar(w, MORTIMER);
    // un empleo: abrirlo
    for (const w of [a.w, b.w]) $(w, 'nav.re-tabs button[data-tab="empleos"]').click();
    const empleo = [...raiz(a.w).querySelectorAll('.jobbtn')].slice(0, 4).map(e => e.dataset.id);
    assert.ok(empleo.length, 'hay empleos en la lista');
    for (const id of empleo) {
      for (const w of [a.w, b.w]) $(w, `.jobbtn[data-id="${id}"]`).click();
      igual(vista(a.w), vista(b.w), `empleo ${id}`);
    }
    // el Controlador de stats
    for (const w of [a.w, b.w]) { $(w, 'nav.re-tabs button[data-tab="control"]').click(); $(w, '#ct-run')?.click(); }
    igual(vista(a.w), vista(b.w), 'controlador');
    // el Editor: un empleo nuevo
    for (const w of [a.w, b.w]) { $(w, 'nav.re-tabs button[data-tab="editor"]').click(); $(w, '#e-new')?.click(); }
    igual(vista(a.w), vista(b.w), 'editor');
    assert.deepEqual(a.errores, b.errores);
  } finally { cerrar(a, b); }
});

test('R07: Mi Ficha usa los datos oficiales (data/sistema.json): igual que antes, más «Gobierno mágico de (X país)»', async () => {
  const [a, b] = await par();
  try {
    for (const w of [a.w, b.w]) { importar(w, MORTIMER); $(w, 'nav.re-tabs button[data-tab="ficha"]').click(); $(w, '#fx-tabs button[data-ft="otros"]').click(); }
    assert.match(raiz(a.w).innerHTML, GOBIERNO, 'el nuevo la tiene');
    assert.doesNotMatch(raiz(b.w).innerHTML, GOBIERNO, 'al antiguo le faltaba');
    const src = readFileSync(path.join(RAIZ, 'js/paginas/revisor/datos.js'), 'utf8');
    assert.doesNotMatch(src, /'Esquiva'|'Mago Oscuro'|'Combatiente'|'Infante'/, 'sin listas escritas a mano: salen de data/sistema.json');
  } finally { cerrar(a, b); }
});

test('8c: Mi Ficha guarda con las mismas claves y no escribe en el navegador por su cuenta', () => {
  const src = readFileSync(path.join(RAIZ, 'js/paginas/revisor/Revisor.js'), 'utf8');
  assert.doesNotMatch(src, /localStorage/);
  assert.match(src, /const TC = w\.pamTabla/);
});
