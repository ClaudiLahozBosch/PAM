// Hace la versión del agente para los jugadores a partir de agente/pam-agente.user.js (la de pruebas, la que se
// edita). Se ejecuta después de scripts/versionar.mjs, en cada versión: node scripts/publicar-agente.mjs
//
//   · pam-mi-pj.user.js (raíz): la de verdad. Mismo @name y @namespace que el «Mi PJ» de Hana, así Tampermonkey la toma
//     como una actualización de Mi PJ y conserva lo guardado (el panel lo pasa al formato nuevo). Habla con el PAM de
//     verdad y solo funciona en el foro de verdad (sin el foro de pruebas).
// tests/agente/produccion.test.mjs comprueba que está al día.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAM_REAL = 'https://jesleytherabbit-prog.github.io';
const FORO_REAL = 'hp-avada-kedavra.foroactivo.com';
const URL_SCRIPT = PAM_REAL + '/PAM/pam-mi-pj.user.js';

/** @param {string} fuente el agente de pruebas @param {{ origen: string, version: string }} o */
export function construir(fuente, { origen, version }) {
  const fin = fuente.indexOf('// ==/UserScript==');
  if (!fuente.startsWith('// ==UserScript==') || fin < 0) throw new Error('agente sin cabecera');
  const desc = (fuente.match(/^\/\/ @description\s+(.*)$/m) || [])[1];
  if (!desc) throw new Error('agente sin @description');
  const cabecera = [
    '// ==UserScript==',
    '// @name         PAM · Mi PJ (HP Avada Kedavra)',
    '// @namespace    https://jesleytherabbit-prog.github.io/PAM/',
    '// @version      ' + version,
    '// @description  ' + desc,
    '// @author       Hana Park',
    '// @match        https://' + FORO_REAL + '/*',
    '// @match        ' + origen + '/PAM/*',
    '// @updateURL    ' + URL_SCRIPT,
    '// @downloadURL  ' + URL_SCRIPT,
    '// @noframes',
    '// @grant        GM_getValue',
    '// @grant        GM_setValue',
    '// @grant        GM_listValues',
    '// @grant        unsafeWindow',
    '// @run-at       document-idle',
    ''
  ].join('\n');
  let cuerpo = fuente.slice(fin);
  const cambiar = (re, por, que) => { if (!re.test(cuerpo)) throw new Error('no encuentro ' + que + ' en el agente'); cuerpo = cuerpo.replace(re, por); };
  cambiar(/^ {2}\/\/ Staging: .*\n/m, '', 'el comentario del staging');
  cambiar(/var PAM = \{ origen: '[^']*', ruta: '\/PAM\/' \};/, "var PAM = { origen: '" + origen + "', ruta: '/PAM/' };", 'PAM.origen');
  cambiar(/var FOROS = \[[^\]]*\];/, "var FOROS = ['" + FORO_REAL + "'];", 'FOROS');
  return cabecera + cuerpo;
}

/** La versión del agente de pruebas (la de toda la rama). @param {string} fuente */
export function versionDe(fuente) {
  const v = (fuente.match(/^\/\/ @version\s+(\d+)\.(\d+)\.(\d+)\s*$/m) || []).slice(1).map(Number);
  if (v.length !== 3) throw new Error('agente sin @version x.y.z');
  return v;
}

/** { 'pam-mi-pj.user.js': texto } */
export function archivos() {
  const fuente = readFileSync(path.join(RAIZ, 'agente/pam-agente.user.js'), 'utf8');
  const [ma, mi, pa] = versionDe(fuente);
  if (ma < 2) throw new Error('La versión para los jugadores tiene que ser 2.x o más (el Mi PJ de antes es 1.7.1)');
  return {
    'pam-mi-pj.user.js': construir(fuente, { origen: PAM_REAL, version: `${ma}.${mi}.${pa}` })
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [f, t] of Object.entries(archivos())) { writeFileSync(path.join(RAIZ, f), t); console.log('escrito', f); }
}
