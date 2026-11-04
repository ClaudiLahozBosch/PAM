// Desde la fase 8a, index.html ya no lleva dentro el código ni los datos (los carga js/pam/arranque.js).
// Para las pruebas que cargan PAM en jsdom, esto lo vuelve a juntar en un solo HTML, como estaba antes:
// el CSS en <style>, los datos de data/ y las páginas de js/paginas/pam/ en su sitio y en el mismo orden,
// y al final los dos módulos de antes (js/nube/main.js y js/pam/main.js), que jsdom no ejecuta.
// La prueba tests/caracterizacion/arranque.test.mjs comprueba que arrancar desde los archivos da el mismo PAM.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DATOS, PAGINAS } from '../../js/pam/arranque.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = f => readFileSync(path.join(RAIZ, f), 'utf8');

let cache = null;

/** @returns {string} PAM entero en un solo HTML */
export function pamEntero() {
  if (cache) return cache;
  let html = leer('index.html');
  const css = html.match(/<link rel="stylesheet" href="css\/pam\.css(\?v=[^"]*)?">\n/);
  const arr = html.match(/<script type="module" src="js\/pam\/arranque\.js(\?v=[^"]*)?"><\/script>\n/);
  if (!css || !arr) throw new Error('index.html ya no carga css/pam.css o js/pam/arranque.js como se esperaba');
  const v = arr[1] || '';
  html = html.replace(css[0], () => `<style>\n${leer('css/pam.css')}</style>\n`);
  const cuerpo = DATOS.map(d => `<script${d.tipo === 'text/plain' ? ' type="text/plain"' : ''} id="${d.id}"${d.tipo === 'text/plain' ? '' : ` type="${d.tipo}"`}>${leer(d.src)}</script>\n`).join('')
    + PAGINAS.map(p => `<script>\n${leer(`js/paginas/pam/${p}.js`)}</script>\n`).join('')
    + `<script type="module" src="js/nube/main.js${v}"></script>\n<script type="module" src="js/pam/main.js${v}"></script>\n`;
  html = html.replace(arr[0], () => cuerpo);
  return (cache = html);
}
