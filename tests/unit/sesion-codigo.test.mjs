// La «Sesión con código» de PAM sube a la nube solo las claves del localStorage con ciertos prefijos (lista PRE/EXC,
// escrita dos veces en index.html: al traer y al subir). Si las listas no coinciden o el código nuevo guarda en el
// localStorage de PAM por su cuenta, algún dato dejaría de viajar con la sesión. Ver REFACTOR.md, «Dónde guarda PAM
// los datos».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

const listas = nombre => [...html.matchAll(new RegExp(nombre + '\\s*=\\s*(\\[[^\\]]*\\])', 'g'))].map(m => JSON.parse(m[1]));

test('index.html: las dos listas de lo que viaja con la sesión son iguales', () => {
  const pre = listas('PRE'), exc = listas('EXC');
  assert.equal(pre.length, 2, 'PRE tendría que estar dos veces (traer y subir)');
  assert.equal(exc.length, 2, 'EXC tendría que estar dos veces (traer y subir)');
  assert.deepEqual(pre[0], pre[1]);
  assert.deepEqual(exc[0], exc[1]);
});

test('el código nuevo no escribe en el localStorage de PAM por su cuenta', () => {
  // permitidos: el almacén (lo usarán las páginas, con claves de la lista), el adaptador (solo lee) y el panel de
  // Mi PJ (vive dentro del foro: su almacenamiento no es el de PAM)
  const PERMITIDOS = ['js/core/Almacen.js', 'js/pam/PamActual.js', 'js/paginas/panel/main.js'];
  const archivos = [];
  const recorrer = dir => readdirSync(dir).forEach(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p); else if (p.endsWith('.js')) archivos.push(relative(RAIZ, p).split(sep).join('/'));
  });
  recorrer(join(RAIZ, 'js'));
  const usan = archivos.filter(a => !PERMITIDOS.includes(a) && /localStorage/.test(readFileSync(join(RAIZ, a), 'utf8')));
  assert.deepEqual(usan, [], 'si un módulo nuevo guarda datos de PAM, que use una clave con un prefijo de la lista PRE');
  const adaptador = readFileSync(join(RAIZ, 'js/pam/PamActual.js'), 'utf8');
  assert.doesNotMatch(adaptador, /localStorage\.(setItem|removeItem|clear)/, 'PamActual solo lee; para cambiar datos, las funciones de PAM');
});
