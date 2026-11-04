// Fase 8a: index.html ya no lleva dentro el código ni los datos; js/pam/arranque.js los carga de js/paginas/pam/ y data/.
// Aquí se arranca PAM de las dos maneras en jsdom y se compara lo que queda en la página:
//   · «archivos»: el index.html de ahora, sus scripts de la cabecera y arrancar() (como en el navegador);
//   · «junto»: tests/legado/montarPam.mjs, todo dentro de un HTML, como estaba index.html antes de la fase 8a.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole, ResourceLoader } from 'jsdom';
import { arrancar, DATOS, PAGINAS } from '../../js/pam/arranque.js';
import { pamEntero } from '../legado/montarPam.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'https://jesleytherabbit-prog.github.io/PAM/';
const URL_PAM = BASE + 'index.html';
const sinVersion = s => s.replace(/\?v=[^"'&]*/, '');
/** Sirve los archivos de PAM desde el disco, como GitHub Pages (los scripts de la cabecera y los que añade arrancar). */
class Disco extends ResourceLoader {
  fetch(url, o) {
    if (!url.startsWith(BASE)) return super.fetch(url, o);
    const f = path.join(RAIZ, decodeURIComponent(new URL(url).pathname.slice(new URL(BASE).pathname.length)));
    return Promise.resolve(readFileSync(f));
  }
}

function preparar(w, tema) {
  if (w.HTMLDialogElement) { w.HTMLDialogElement.prototype.showModal = function () {}; w.HTMLDialogElement.prototype.close = function () {}; }
  w.scrollTo = () => {};
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.requestAnimationFrame = () => 0;
  let n = 0; w.Math.random = () => ((n++ * 0.37) % 1); // los efectos del tema y los id nuevos, iguales en los dos
  w.Date.now = () => 1767225600000;
  if (tema) w.localStorage.setItem('grimorio.tema', tema);
}

async function abrir(como, { tema, fetch } = {}) {
  const errores = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Could not parse CSS/.test(e.message)) errores.push(String(e.message).slice(0, 160)); });
  const html = como === 'junto' ? pamEntero() : readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: URL_PAM, runScripts: 'dangerously', resources: como === 'junto' ? undefined : new Disco(),
    pretendToBeVisual: true, virtualConsole: vc, beforeParse: w => preparar(w, tema)
  });
  const w = dom.window;
  let ok = true, skinAlCargar;
  const importados = [];
  if (como === 'archivos') {
    await new Promise(r => w.addEventListener('load', r));
    skinAlCargar = w.document.documentElement.dataset.skin; // tras la cabecera (tema-inicial.js), antes de las páginas
    ok = await arrancar({
      doc: w.document,
      fetch: fetch || (async src => ({ ok: true, status: 200, text: async () => readFileSync(path.join(RAIZ, sinVersion(src)), 'utf8') })),
      importar: async r => { importados.push(sinVersion(r)); }
    });
  }
  return { w, errores, ok, importados, skinAlCargar };
}

const pagina = w => {
  const c = w.document.body.cloneNode(true);
  c.querySelectorAll('script').forEach(s => s.remove());
  return c.innerHTML.replace(/\s+$/, ''); // sin los saltos de línea que dejan los <script> quitados
};
/** Igual, y si no, dónde empieza la diferencia (la página entera es muy larga para el mensaje). */
const igual = (a, b, que = 'la página') => {
  if (a === b) return;
  let i = 0; while (a[i] === b[i]) i++;
  assert.fail(`${que} cambia en el carácter ${i}:\n  archivos: ${JSON.stringify(a.slice(Math.max(0, i - 150), i + 150))}\n  junto:    ${JSON.stringify(b.slice(Math.max(0, i - 150), i + 150))}`);
};
const GLOBALES =['pamFicha', 'pamPjs', 'rrBoveda', 'rrOficiales', 'rrSync', 'rrGo', 'showSection', 'aplicarTema', 'reSetTab', 'grimorioFicha', 'pamRapido', 'pamForoListo'];

test('arrancar desde los archivos deja el mismo PAM que cuando todo estaba en index.html', async () => {
  const a = await abrir('archivos'), b = await abrir('junto');
  try {
    assert.equal(a.ok, true);
    assert.deepEqual(a.importados, ['../nube/main.js', './main.js'], 'y después lo nuevo, en el mismo orden');
    for (const g of GLOBALES) assert.equal(typeof a.w[g], typeof b.w[g], g);
    assert.notEqual(typeof a.w.pamFicha, 'undefined');
    igual(pagina(a.w), pagina(b.w));
    assert.deepEqual(a.errores, b.errores);
    // y se puede navegar igual
    for (const s of ['canjes', 'compendio', 'ficha', 'boveda', 'coloreador']) { a.w.showSection(s); b.w.showSection(s); igual(pagina(a.w), pagina(b.w), s); }
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

test('el orden y los datos son los de index.html antes de la fase 8a', () => {
  assert.deepEqual(PAGINAS, ['tabla-canjes', 'revisor', 'registro-roles', 'portada', 'temas', 'foro-antiguo']);
  assert.deepEqual(DATOS.map(d => d.src), ['data/empleos-foro.txt', 'data/arcanos.json']);
  const idx = readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  assert.doesNotMatch(idx, /<script>|<style>/, 'index.html ya no lleva código ni estilos dentro');
  assert.ok(idx.indexOf('js/nube/pendiente.js') < idx.indexOf('js/pam/tema-inicial.js'), 'el tema, después de traer la sesión');
  assert.ok(idx.indexOf('js/pam/tema-inicial.js') < idx.indexOf('css/pam.css'));
});
