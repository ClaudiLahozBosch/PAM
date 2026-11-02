// Carga el PAM antiguo (index.html) en jsdom para comparar el código nuevo con el que está en uso.
// Devuelve dos evaluadores: `global(expr)` para la Tabla de Canjes (código global)
// y `ficha(expr)` para el bloque de Mi Ficha (dentro de una función).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MARCA_FICHA = "setTab(ui.tab||'empleos');";

let cache = null;

/** @returns {{ w: any, global: (e: string) => any, ficha: (e: string) => any, errores: string[] }} */
export function cargarPam() {
  if (cache) return cache;
  let html = readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  if (!html.includes(MARCA_FICHA)) throw new Error('No encuentro la marca del bloque de Mi Ficha en index.html');
  html = html.replace(MARCA_FICHA, MARCA_FICHA + '\nwindow.__ficha = s => eval(s);');
  const errores = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errores.push(String(e.message).slice(0, 200)));
  const dom = new JSDOM(html, {
    url: 'https://jesleytherabbit-prog.github.io/PAM/',
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = () => Promise.reject(new Error('sin red en las pruebas'));
      if (w.HTMLDialogElement) { w.HTMLDialogElement.prototype.showModal = function () {}; w.HTMLDialogElement.prototype.close = function () {}; }
      w.scrollTo = () => {};
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      // Sin canvas en jsdom: un contexto que acepta todo (solo lo usan los efectos visuales)
      const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
      w.HTMLCanvasElement.prototype.getContext = () => ctx;
      w.requestAnimationFrame = () => 0; // sin animaciones: si no, node no termina nunca
    }
  });
  const w = dom.window;
  // JSON.parse(JSON.stringify()) saca los datos del contexto de jsdom (arrays y objetos «normales» para deepStrictEqual)
  const limpio = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  cache = {
    w,
    global: e => limpio(w.eval(e)),
    ficha: e => limpio(w.__ficha(e)),
    crudo: { global: e => w.eval(e), ficha: e => w.__ficha(e) },
    errores
  };
  return cache;
}

/** Cierra la ventana de jsdom (temporizadores incluidos) para que node pueda terminar. */
export function cerrarPam() { if (cache) { cache.w.close(); cache = null; } }
