// La «Sesión con código» de PAM sube a la nube solo las claves del localStorage con ciertos prefijos (lista PRE/EXC).
// Desde la fase 7 la lista está UNA vez, en js/nube/pendiente.js (antes, dos veces en index.html). Si alguien la vuelve
// a copiar en otro sitio, o el código nuevo guarda en el localStorage de PAM por su cuenta, algún dato dejaría de viajar
// con la sesión. Ver REFACTOR.md, «Dónde guarda PAM los datos».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const leer = f => readFileSync(join(RAIZ, f), 'utf8');
const listas = (txt, nombre) => [...txt.matchAll(new RegExp('\\b' + nombre + '\\s*=\\s*(\\[[^\\]]*\\])', 'g'))].map(m => JSON.parse(m[1].replace(/'/g, '"')));
const archivos = (() => {
  const out = [];
  const recorrer = dir => readdirSync(dir).forEach(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p); else if (p.endsWith('.js')) out.push(relative(RAIZ, p).split(sep).join('/'));
  });
  recorrer(join(RAIZ, 'js'));
  return out;
})();

test('la lista de lo que viaja con la sesión está una sola vez: js/nube/pendiente.js', () => {
  const p = leer('js/nube/pendiente.js');
  assert.deepEqual(listas(p, 'PRE'), [['grimorio.', 'grimorioAvadense.', 'revisorEmpleos.', 'registro-roles-v1', 'cd_']]);
  assert.deepEqual(listas(p, 'EXC'), [['cd_bg']]);
  assert.deepEqual(listas(leer('index.html'), 'PRE'), [], 'index.html ya no la tiene');
  const otros = archivos.filter(a => a !== 'js/nube/pendiente.js' && /grimorioAvadense\./.test(leer(a)));
  assert.deepEqual(otros, [], 'nadie más la copia');
  assert.match(leer('index.html'), /<script src="js\/nube\/pendiente\.js[^"]*"><\/script>/, 'y va al principio de PAM, antes que la app');
  assert.ok(leer('index.html').indexOf('js/nube/pendiente.js') < leer('index.html').indexOf('<style>'));
});

test('el código nuevo no escribe en el localStorage de PAM por su cuenta', () => {
  // permitidos: el almacén (lo usarán las páginas, con claves de la lista), el adaptador (solo lee), el panel de
  // Mi PJ (vive dentro del foro: su almacenamiento no es el de PAM) y la propia sesión (js/nube/)
  const PERMITIDOS = ['js/core/Almacen.js', 'js/pam/PamActual.js', 'js/paginas/panel/main.js', 'js/nube/pendiente.js', 'js/nube/Sesion.js'];
  const usan = archivos.filter(a => !PERMITIDOS.includes(a) && /localStorage/.test(leer(a)));
  assert.deepEqual(usan, [], 'si un módulo nuevo guarda datos de PAM, que use una clave con un prefijo de la lista PRE');
  assert.doesNotMatch(leer('js/pam/PamActual.js'), /localStorage\.(setItem|removeItem|clear)/, 'PamActual solo lee; para cambiar datos, las funciones de PAM');
  // la sesión solo escribe su propia clave («pam.sesion», que no viaja) y no tiene lista propia
  const ses = leer('js/nube/Sesion.js');
  assert.deepEqual([...ses.matchAll(/localStorage\.setItem\(([^,]+),/g)].map(m => m[1].trim()), ['K_SES']);
  assert.match(ses, /const esDePAM = claves\.esDePAM;/);
});
