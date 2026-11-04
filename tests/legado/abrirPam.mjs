// Abre PAM en jsdom de las dos maneras, para comparar el nuevo con el antiguo:
//   · «archivos»: el index.html de ahora, sus scripts de la cabecera y arrancar() de js/pam/arranque.js (como en el
//     navegador). Las páginas que ya son módulos (fase 8b en adelante) se montan de verdad con su montar(ventana, {traer});
//   · «junto»: tests/legado/montarPam.mjs, todo dentro de un HTML, como estaba index.html antes de la fase 8a
//     (con las copias congeladas de las páginas reescritas): el PAM antiguo.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole, ResourceLoader } from 'jsdom';
import { arrancar } from '../../js/pam/arranque.js';
import { pamEntero } from './montarPam.mjs';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'https://jesleytherabbit-prog.github.io/PAM/';
const URL_PAM = BASE + 'index.html';
export const sinVersion = s => s.replace(/\?v=[^"'&]*/, '');
/** Sirve los archivos de PAM desde el disco, como GitHub Pages (los scripts de la cabecera y los que añade arrancar). */
class Disco extends ResourceLoader {
  fetch(url, o) {
    if (!url.startsWith(BASE)) return super.fetch(url, o);
    const f = path.join(RAIZ, decodeURIComponent(new URL(url).pathname.slice(new URL(BASE).pathname.length)));
    return Promise.resolve(readFileSync(f));
  }
}
/** Lo que pide arrancar(), leído del disco. */
export const traerDisco = async src => ({ ok: true, status: 200, text: async () => readFileSync(path.join(RAIZ, sinVersion(src)), 'utf8') });

function preparar(w, { tema, antes }) {
  if (w.HTMLDialogElement) { w.HTMLDialogElement.prototype.showModal = function () {}; w.HTMLDialogElement.prototype.close = function () {}; }
  w.scrollTo = () => {};
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.requestAnimationFrame = () => 0;
  let n = 0; w.Math.random = () => ((n++ * 0.37) % 1); // los efectos del tema y los id nuevos, iguales en los dos
  w.Date.now = () => 1767225600000;
  if (tema) w.localStorage.setItem('grimorio.tema', tema);
  if (antes) antes(w);
}

/**
 * @param {'archivos'|'junto'} como
 * @param {{ tema?: string, fetch?: Function, antes?: (w: any) => void }} [o] antes: se ejecuta antes que PAM (p. ej. datos guardados)
 */
export async function abrir(como, { tema, fetch, antes } = {}) {
  const errores = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Could not parse CSS/.test(e.message)) errores.push(String(e.message).slice(0, 160)); });
  const html = como === 'junto' ? pamEntero() : readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: URL_PAM, runScripts: 'dangerously', resources: como === 'junto' ? undefined : new Disco(),
    pretendToBeVisual: true, virtualConsole: vc, beforeParse: w => preparar(w, { tema, antes })
  });
  const w = dom.window;
  let ok = true, skinAlCargar;
  const importados = [];
  if (como === 'archivos') {
    await new Promise(r => w.addEventListener('load', r));
    skinAlCargar = w.document.documentElement.dataset.skin; // tras la cabecera (tema-inicial.js), antes de las páginas
    ok = await arrancar({
      doc: w.document,
      fetch: fetch || traerDisco,
      // los módulos de páginas se montan de verdad; js/nube/main.js y js/pam/main.js no (los prueban sus pruebas)
      importar: async r => {
        importados.push(sinVersion(r));
        if (r.startsWith('../paginas/')) return import(pathToFileURL(path.join(RAIZ, 'js/pam', sinVersion(r))).href);
      }
    });
  }
  return { w, errores, ok, importados, skinAlCargar };
}

/**
 * El HTML del PAM antiguo con las tres diferencias a propósito de la 8d (R07: la Tabla de Canjes usa data/sistema.json,
 * ver sistema.json → reconciliado): los tipos de trasfondo en orden alfabético, «Personal no-docente» y
 * «Arte/Artesanía» en las Proezas. Así se compara todo lo demás.
 */
export const comoOficial = html => html
  .replace(/(<option value="Informantes"( selected="")?>Informantes<\/option>)(<option value="Influencia"( selected="")?>Influencia<\/option>)/g, '$3$1')
  .replace(/Personal no docente/g, 'Personal no-docente')
  .replace(/value="Arte \/ Artesanía"/g, 'value="Arte/Artesanía"').replace(/>Arte \/ Artesanía<\/option>/g, '>Arte/Artesanía</option>')
  .replace(/Arte \/ Artesanía \(Voluntad\)/g, 'Arte/Artesanía (Voluntad)') // el valor de la Proeza: «habilidad (atributo)»
  .replace(/"Arte \/ Artesanía"/g, '"Arte/Artesanía"'); // en los datos (JSON)

/** El HTML de la página sin los <script>. */
export const pagina = w => {
  const c = w.document.body.cloneNode(true);
  c.querySelectorAll('script').forEach(s => s.remove());
  return c.innerHTML.replace(/\s+$/, ''); // sin los saltos de línea que dejan los <script> quitados
};
/** Igual, y si no, dónde empieza la diferencia (la página entera es muy larga para el mensaje). */
export const igual = (a, b, que = 'la página') => {
  if (a === b) return;
  let i = 0; while (a[i] === b[i]) i++;
  assert.fail(`${que} cambia en el carácter ${i}:\n  archivos: ${JSON.stringify(a.slice(Math.max(0, i - 150), i + 150))}\n  junto:    ${JSON.stringify(b.slice(Math.max(0, i - 150), i + 150))}`);
};
