// Fase 8e: la portada, los temas y «Datos del foro → PAM» como módulos (js/paginas/inicio/).
// Se abre PAM con los nuevos («archivos») y con los antiguos («junto», copias congeladas en tests/legado/paginas/) y se
// compara lo que se ve y lo que se guarda al usarlos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { abrir, pagina, igual, comoOficial, RAIZ } from '../legado/abrirPam.mjs';

const MORTIMER = readFileSync(path.join(RAIZ, 'tests/fixtures/fichas/mortimer-compacta.bbcode'), 'utf8');
const MEDIODIA = Date.UTC(2026, 0, 15, 12);
const antes = w => {
  const D = w.Date;
  w.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(MEDIODIA); } static now() { return MEDIODIA; } };
  w.alert = () => {};
};
async function par() {
  const a = await abrir('archivos', { antes }), b = await abrir('junto', { antes });
  for (const w of [a.w, b.w]) { w.showSection('compendio'); w.showSection('home'); } // el Compendio se arma al abrirlo (F16)
  return [a, b];
}
const cerrar = (...xs) => xs.forEach(x => x.w.close());
const d = w => w.document;
// las pestañas de la Tabla de Canjes se pintan al abrirlas (F16): se abren todas para comparar la página entera
const todo = w => { d(w).querySelectorAll('.tab-btn').forEach(x => x.click()); d(w).querySelector('.tab-btn').click(); w.pamTabla.renderAll(); d(w).querySelectorAll('.tab-btn').forEach(x => x.click()); d(w).querySelector('.tab-btn').click(); };
const ver = (a, b, que) => { todo(a.w); todo(b.w); igual(pagina(a.w), comoOficial(pagina(b.w)), que); };

test('8e: los temas: elegir uno, las calabazas y lo guardado, igual que antes', async () => {
  const [a, b] = await par();
  try {
    for (const w of [a.w, b.w]) { d(w).querySelector('[data-tt]').click(); d(w).querySelector('.theme-opt[data-skin-id="terror"]').click(); }
    ver(a, b, 'tema Gothic Horror');
    for (const w of [a.w, b.w]) { d(w).querySelector('[data-tt]').click(); d(w).querySelector('[data-pk="add"]')?.click(); }
    ver(a, b, 'con calabazas');
    for (const k of ['grimorio.tema', 'grimorio.calabazas']) assert.equal(a.w.localStorage.getItem(k), b.w.localStorage.getItem(k), k);
    assert.equal(a.w.localStorage.getItem('grimorio.tema'), 'terror', 'el tema, como texto suelto (lo lee tema-inicial.js)');
  } finally { cerrar(a, b); }
});

test('8e: la portada: el nombre, el saludo y la navegación, igual que antes', async () => {
  const [a, b] = await par();
  try {
    for (const w of [a.w, b.w]) {
      const g = d(w).getElementById('inpGenero'), n = d(w).getElementById('inpUsuario');
      g.value = 'a'; g.dispatchEvent(new w.Event('input')); n.value = 'Claudi'; n.dispatchEvent(new w.Event('input'));
    }
    ver(a, b, 'saludo');
    assert.equal(a.w.localStorage.getItem('grimorioAvadense.usuario'), b.w.localStorage.getItem('grimorioAvadense.usuario'));
    for (const s of ['canjes', 'ficha', 'empleos', 'roles', 'boveda', 'home']) { a.w.showSection(s); b.w.showSection(s); ver(a, b, 'sección ' + s); assert.equal(a.w.location.hash, b.w.location.hash, 'dirección ' + s); }
  } finally { cerrar(a, b); }
});

test('8e: «Datos del foro → PAM» abre la misma ventana con lo que manda el foro', async () => {
  const [a, b] = await par();
  try {
    const datos = { cuenta: 'Mortimer Gaunt', leido: '2026-01-15T11:50:00.000Z', ficha: { codigo: MORTIMER, url: 'https://test-forito.foroactivo.com/t5-mortimer' }, boveda: { url: 'https://test-forito.foroactivo.com/t8-boveda', act: 1200, tot: 5000, pla: 2 } };
    const respuestas = [];
    for (const w of [a.w, b.w]) {
      const fuente = { postMessage: (m, o) => respuestas.push([JSON.stringify(m), o]) };
      w.dispatchEvent(new w.MessageEvent('message', { data: { pamForo: 1, data: datos }, origin: 'https://test-forito.foroactivo.com', source: fuente }));
    }
    assert.equal(respuestas.length, 2);
    assert.equal(respuestas[0][0], respuestas[1][0], 'contesta lo mismo (pamForoOk y el tema)');
    const dlg = w => d(w).getElementById('foroDlg');
    assert.ok(dlg(a.w), 'abre la ventana');
    igual(dlg(a.w).outerHTML, dlg(b.w).outerHTML, 'la ventana');
    // de otro sitio no acepta nada
    a.w.dispatchEvent(new a.w.MessageEvent('message', { data: { pamForo: 1, data: { ...datos, leido: 'otro' } }, origin: 'https://otro.ejemplo', source: null }));
    assert.equal(d(a.w).querySelectorAll('#foroDlg').length, 1);
  } finally { cerrar(a, b); }
});

test('8e: ya no queda ninguna página antigua: todas son módulos y guardan con el almacén', () => {
  for (const f of ['portada.js', 'temas.js', 'foroAntiguo.js']) assert.doesNotMatch(readFileSync(path.join(RAIZ, 'js/paginas/inicio', f), 'utf8'), /localStorage/, f);
});
