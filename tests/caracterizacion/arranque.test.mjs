// Fase 8a: index.html ya no lleva dentro el código ni los datos; js/pam/arranque.js los carga de js/paginas/pam/ y data/.
// Aquí se arranca PAM de las dos maneras en jsdom (tests/legado/abrirPam.mjs) y se compara lo que queda en la página:
//   · «archivos»: el index.html de ahora, sus scripts de la cabecera y arrancar() (como en el navegador);
//   · «junto»: tests/legado/montarPam.mjs, todo dentro de un HTML, como estaba index.html antes de la fase 8a.
// Desde la 8b, el Registro de Roles es un módulo: en «archivos» se monta el nuevo y en «junto» está el antiguo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DATOS, PAGINAS, MODULOS } from '../../js/pam/arranque.js';
import { abrir, pagina, igual, RAIZ } from '../legado/abrirPam.mjs';

const GLOBALES =['pamFicha', 'pamPjs', 'rrBoveda', 'rrOficiales', 'rrSync', 'rrGo', 'showSection', 'aplicarTema', 'reSetTab', 'grimorioFicha', 'pamRapido', 'pamForoListo'];

test('arrancar desde los archivos deja el mismo PAM que cuando todo estaba en index.html', async () => {
  const a = await abrir('archivos'), b = await abrir('junto');
  try {
    assert.equal(a.ok, true);
    assert.deepEqual(a.importados, ['../paginas/revisor/main.js', '../paginas/registro/main.js', '../nube/main.js', './main.js'], 'Mi Ficha y el Registro en su sitio y después lo nuevo, en el mismo orden');
    for (const g of GLOBALES) assert.equal(typeof a.w[g], typeof b.w[g], g);
    assert.notEqual(typeof a.w.pamFicha, 'undefined');
    igual(pagina(a.w), pagina(b.w));
    assert.deepEqual(a.errores, b.errores);
    // y se puede navegar igual
    for (const s of ['canjes', 'compendio', 'ficha', 'boveda', 'coloreador']) { a.w.showSection(s); b.w.showSection(s); igual(pagina(a.w), pagina(b.w), s); }
    // N07 (0.5.3): y el editor nuevo del «Código para el foro», listo para la página de Mi Ficha
    assert.equal(typeof a.w.PAM_EDITOR?.actualizar, 'function');
  } finally { a.w.close(); b.w.close(); }
});

test('el tema elegido se pone antes de cargar las páginas (sin ver un momento el Avadense)', async () => {
  const a = await abrir('archivos', { tema: 'pixel' });
  try {
    assert.equal(a.skinAlCargar, 'pixel');
    assert.equal(a.w.document.documentElement.dataset.skin, 'pixel');
  } finally { a.w.close(); }
});

test('si no se pueden traer los datos, PAM lo dice arriba y no carga páginas a medias', async () => {
  const a = await abrir('archivos', { fetch: async src => ({ ok: !src.includes('arcanos'), status: 404, text: async () => '' }) });
  try {
    assert.equal(a.ok, false);
    assert.match(a.w.document.querySelector('.pam-arranque-error').textContent, /No se pudo cargar una parte de PAM \(data\/arcanos\.json \(HTTP 404\)\)\. Probá recargar la página\./);
    assert.equal(a.w.document.querySelectorAll('script[src*="js/paginas/pam/"]').length, 0);
    assert.deepEqual(a.importados, []);
  } finally { a.w.close(); }
});

test('si no se puede traer el Registro de Roles, PAM lo dice arriba', async () => {
  const a = await abrir('archivos', { fetch: async src => (src.includes('registro.css') ? { ok: false, status: 404, text: async () => '' } : { ok: true, status: 200, text: async () => readFileSync(path.join(RAIZ, src.replace(/\?v=.*/, '')), 'utf8') }) });
  try {
    assert.equal(a.ok, false);
    assert.match(a.w.document.querySelector('.pam-arranque-error').textContent, /No se pudo cargar una parte de PAM \(registro \(css\/registro\.css \(HTTP 404\)\)\)/);
  } finally { a.w.close(); }
});

test('el orden y los datos son los de index.html antes de la fase 8a', () => {
  assert.deepEqual(PAGINAS, ['tabla-canjes', 'revisor', 'registro', 'portada', 'temas', 'foro-antiguo']);
  assert.deepEqual(Object.keys(MODULOS), ['revisor', 'registro']);
  assert.deepEqual(DATOS.map(d => d.src), ['data/empleos-foro.txt', 'data/arcanos.json']);
  const idx = readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  assert.doesNotMatch(idx, /<script>|<style>/, 'index.html ya no lleva código ni estilos dentro');
  assert.ok(idx.indexOf('js/nube/pendiente.js') < idx.indexOf('js/pam/tema-inicial.js'), 'el tema, después de traer la sesión');
  assert.ok(idx.indexOf('js/pam/tema-inicial.js') < idx.indexOf('css/pam.css'));
});
