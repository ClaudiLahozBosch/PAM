// 2.0.1: Mi Ficha lee la ficha del foro («Datos del foro → PAM», «Importar ficha del foro» y el código guardado) con
// el lector de Mi PJ (EditorPam.leerFicha → js/lectores/LectorFicha.js), no con el antiguo (parseFichaForo), que tiraba
// los trasfondos «Biblioteca V: Arcanismo.» sin avisar (F02; visto el 11/11/2026 con la ficha de Robert Stevenson:
// 0 trasfondos en PAM, 29 en el panel de Mi PJ). Se comprueba:
//   · que con la ficha de Mortimer da lo mismo que el antiguo (salvo un arcano que ahora sí reconoce);
//   · que con la de cinco partes (Irvin) da lo mismo más los trasfondos;
//   · que PAM lo usa al importar y que, si el lector nuevo falla o no está, sigue con el antiguo.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cargarPam, cerrarPam } from '../legado/cargarPam.mjs';
import { abrir } from '../legado/abrirPam.mjs';
import { crearEditorPam } from '../../js/pam/EditorPam.js';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';

const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const sistema = new Sistema(json('sistema.json')), compendio = new Compendio(json('arcanos.json'));
const E = crearEditorPam({ sistema, compendio, lector: new LectorFicha(sistema, compendio) });
const MORTIMER = readFileSync(new URL('../fixtures/fichas/mortimer-compacta.bbcode', import.meta.url), 'utf8');
const IRVIN = JSON.parse(readFileSync(new URL('../fixtures/fichas/varias-partes.json', import.meta.url), 'utf8')).partes.map(p => p.bbcode).join('\n');
const P = cargarPam();
const antiguo = t => { P.w.__t = t; return P.ficha('parseFichaForo(window.__t)'); };
const limpio = v => JSON.parse(JSON.stringify(v));
const abiertas = [];
after(() => { cerrarPam(); abiertas.forEach(w => { try { w.close(); } catch { /* ya cerrada */ } }); });

test('Mortimer: lo mismo que el lector antiguo; el único cambio, un arcano que ahora se reconoce', () => {
  const a = antiguo(MORTIMER), n = limpio(E.leerFicha(MORTIMER));
  assert.equal(n.resumen, a.resumen);
  const { arcanos: arA, ...restoA } = a.ficha, { arcanos: arN, ...restoN } = n.ficha;
  assert.deepEqual(restoN, restoA);
  assert.equal(arN.length, arA.length);
  const distintos = arN.map((x, i) => [x, arA[i]]).filter(([x, y]) => JSON.stringify(x) !== JSON.stringify(y));
  assert.equal(distintos.length, 1, JSON.stringify(distintos));
  const [[x, y]] = distintos;
  assert.equal(y.name, 'Transfiguración humana absolutas | Alter Humanus', 'el antiguo no lo encontraba (errata de la ficha)');
  assert.equal(x.name, 'Transfiguración humana absoluta (Alter Humanus)', 'el nuevo: el nombre de la calculadora');
  assert.deepEqual([x.type, x.tier], [y.type, y.tier]);
});

test('ficha en cinco partes (Irvin): lo mismo que el antiguo y además los trasfondos «Tipo NIVEL: categoría»', () => {
  const a = antiguo(IRVIN), n = limpio(E.leerFicha(IRVIN));
  const { bgs: bA, ...restoA } = a.ficha, { bgs: bN, ...restoN } = n.ficha;
  assert.deepEqual(restoN, restoA);
  assert.equal(bA.length, 0, 'el antiguo no veía ninguno');
  assert.equal(bN.length, 6);
  assert.deepEqual(bN[0], { t: 'Biblioteca', c: 'Arcanismo', e: '', v: 5, nota: '' }, '«Biblioteca V: Arcanismo.»');
  assert.match(n.resumen, /6 trasfondos/);
});

test('PAM importa la ficha con el lector nuevo y, si falla o no está, con el antiguo', async () => {
  const { w } = await abrir('archivos', { antes: x => { x.confirm = () => true; x.alert = () => {}; } });
  abiertas.push(w);
  w.console.warn = () => {};
  const bgsDe = nombre => {
    const pjs = JSON.parse(w.localStorage.getItem('grimorio.personajes'));
    return pjs.lista.find(p => p.ficha.nombre === nombre).ficha.bgs.length;
  };
  assert.equal(typeof w.PAM_EDITOR?.leerFicha, 'function', 'lo deja js/pam/arranque.js');
  const r = w.pamFicha.importar(IRVIN, 'Irvin Giles');
  assert.match(r.resumen, /6 trasfondos/);
  assert.equal(bgsDe('Irvin Giles.'), 6);
  const aviso = console.warn; console.warn = () => {}; // «[PAM] lector de fichas: roto» (Mi Ficha usa la consola de node)
  try {
    for (const editor of [{ leerFicha() { throw new Error('roto'); } }, undefined]) {
      w.PAM_EDITOR = editor;
      assert.match(w.pamFicha.importar(IRVIN, 'Irvin Giles').resumen, /0 trasfondos/, 'el antiguo');
    }
  } finally { console.warn = aviso; }
});
