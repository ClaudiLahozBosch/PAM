// Fase 8a: index.html ya no lleva dentro el código ni los datos; js/pam/arranque.js trae data/ y monta las páginas (js/paginas/).
// Aquí se arranca PAM de las dos maneras en jsdom (tests/legado/abrirPam.mjs) y se compara lo que queda en la página:
//   · «archivos»: el index.html de ahora, sus scripts de la cabecera y arrancar() (como en el navegador);
//   · «junto»: tests/legado/montarPam.mjs, todo dentro de un HTML, como estaba index.html antes de la fase 8a.
// Desde la 8b, el Registro de Roles es un módulo: en «archivos» se monta el nuevo y en «junto» está el antiguo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DATOS, PAGINAS, MODULOS } from '../../js/pam/arranque.js';
import { abrir, pagina as paginaDe, igual, RAIZ, comoOficial } from '../legado/abrirPam.mjs';

// 8d (R07): la Tabla de Canjes usa data/sistema.json; el antiguo se pasa a esa forma (tres diferencias conocidas)
const pagina = w => (w.__pamAntiguo ? comoOficial(paginaDe(w)) : paginaDe(w));

const GLOBALES =['pamFicha', 'pamPjs', 'rrBoveda', 'rrOficiales', 'rrSync', 'rrGo', 'showSection', 'aplicarTema', 'reSetTab', 'grimorioFicha', 'pamRapido', 'pamForoListo'];

test('arrancar desde los archivos deja el mismo PAM que cuando todo estaba en index.html', async () => {
  const a = await abrir('archivos'), b = await abrir('junto');
  b.w.__pamAntiguo = true;
  // F16 (8d): la Tabla de Canjes pinta cada pestaña al abrirla; se abren todas para comparar la página entera
  // (y el Compendio, que desde F16 se arma la primera vez que se abre)
  // (dos veces, como el antiguo al cargar: la segunda marca «selected» la opción que la primera dejó elegida)
  const abrirTodas = w => { w.document.querySelectorAll('.tab-btn').forEach(x => x.click()); w.document.querySelector('.tab-btn').click(); };
  for (const w of [a.w, b.w]) { abrirTodas(w); w.pamTabla.renderAll(); abrirTodas(w); w.showSection('compendio'); w.showSection('home'); }
  try {
    assert.equal(a.ok, true);
    assert.deepEqual(a.importados, ['../paginas/canjes/main.js', '../paginas/revisor/main.js', '../paginas/registro/main.js', '../paginas/inicio/portada.js', '../paginas/inicio/temas.js', '../paginas/inicio/foroAntiguo.js', '../nube/main.js', './main.js'], 'las páginas en su orden y después lo nuevo');
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
  assert.deepEqual(Object.keys(MODULOS), PAGINAS, 'desde la 8e todas son módulos');
  assert.deepEqual(DATOS.map(d => d.src), ['data/empleos-foro.txt', 'data/arcanos.json']);
  const idx = readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  assert.doesNotMatch(idx, /<script>|<style>/, 'index.html ya no lleva código ni estilos dentro');
  assert.ok(idx.indexOf('js/nube/pendiente.js') < idx.indexOf('js/pam/tema-inicial.js'), 'el tema, después de traer la sesión');
  assert.ok(idx.indexOf('js/pam/tema-inicial.js') < idx.indexOf('css/pam.css'));
});

test('F17: los estilos de PAM, un archivo por página, son los de antes y en el mismo orden; los efectos, una sola vez', () => {
  const idx = readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const archivos = [...idx.matchAll(/<link rel="stylesheet" href="(css\/[\w-]+\.css)\?v=[^"]*">/g)].map(m => m[1]);
  assert.deepEqual(archivos, JSON.parse(readFileSync(path.join(RAIZ, 'scripts/css-pam.json'), 'utf8')).map(f => 'css/' + f));
  const sinCabecera = f => readFileSync(path.join(RAIZ, f), 'utf8').replace(/^\/\* PAM · .*\*\/\n/, '');
  const juntos = archivos.map(sinCabecera).join('');
  const antes = readFileSync(path.join(RAIZ, 'tests/legado/pam.css'), 'utf8');
  // lo único que cambia de sitio: las dos reglas de .pk-bar pasan delante de los efectos (no se tocan entre sí)
  const pkBar = antes.split('\n').filter(l => l.startsWith('.pk-bar')).join('\n') + '\n';
  const sinPk = s => s.replace(pkBar, '').replace(/\n{2,}/g, '\n'); // (y sin líneas en blanco)
  assert.equal(sinPk(juntos), sinPk(antes));
  const reg = readFileSync(path.join(RAIZ, 'css/registro.css'), 'utf8');
  for (const l of sinCabecera('css/efectos.css').split('\n').filter(Boolean)) assert.ok(!reg.includes(l), 'el Registro ya no los copia: ' + l.slice(0, 40));
});
