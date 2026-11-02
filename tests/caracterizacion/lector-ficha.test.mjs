// Lector de fichas nuevo frente al antiguo (parseFichaForo).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cargarPam, cerrarPam } from '../legado/cargarPam.mjs';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';

const leerJson = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const S = new Sistema(leerJson('sistema.json'));
const C = new Compendio(leerJson('arcanos.json'));
const L = new LectorFicha(S, C);
const MORTIMER = readFileSync(new URL('../fixtures/fichas/mortimer-compacta.bbcode', import.meta.url), 'utf8');
const IRVIN = JSON.parse(readFileSync(new URL('../fixtures/fichas/varias-partes.json', import.meta.url), 'utf8'));
const P = cargarPam();
after(cerrarPam);
const antiguo = txt => { P.w.__t = txt; return P.ficha('parseFichaForo(window.__t).ficha'); };

test('Mortimer: todo igual que el lector antiguo salvo los arcanos', () => {
  const a = antiguo(MORTIMER);
  const n = L.leer(MORTIMER).ficha.aLegado(S);
  const { arcanos: arA, ...restoA } = a;
  const { arcanos: arN, ...restoN } = n;
  assert.deepEqual(restoN, restoA);
  assert.equal(arN.length, arA.length, 'mismos arcanos');
  arN.forEach((x, i) => {
    assert.equal(x.type, arA[i].type, x.name); assert.equal(x.tier, arA[i].tier, x.name);
  });
});
test('Mortimer: los arcanos conservan su descripción (R04)', () => {
  const a = antiguo(MORTIMER), f = L.leer(MORTIMER).ficha;
  const conDescA = a.arcanos.filter(x => x.nota).length, conDescN = f.arcanos.filter(x => x.descripcion).length;
  assert.ok(conDescA <= 2, `el antiguo las tiraba (${conDescA})`);
  assert.ok(conDescN >= f.arcanos.length - 2, `el nuevo las guarda (${conDescN} de ${f.arcanos.length})`);
  const fiendfyre = f.arcanos.find(x => /fiendfyre/i.test(x.nombre));
  assert.ok(fiendfyre && fiendfyre.descripcion.length > 5 && fiendfyre.ref, 'Fiendfyre con descripción y enlazado al Compendio');
});
test('Mortimer: los nombres quedan como en la ficha (R05) y se enlazan al Compendio', () => {
  const a = antiguo(MORTIMER), f = L.leer(MORTIMER).ficha;
  f.arcanos.forEach((x, i) => {
    if (x.nombre === a.arcanos[i].name) return;
    // donde difiere, el antiguo había puesto el nombre de la calculadora en lugar del escrito
    assert.ok(x.ref, `«${x.nombre}» enlazado`);
    assert.equal(C.porId(x.ref).nombreCalc, a.arcanos[i].name, x.nombre);
    assert.ok(MORTIMER.includes(x.nombre), `«${x.nombre}» está escrito así en la ficha`);
  });
  const conBarra = f.arcanos.filter(x => x.nombre.includes('|'));
  for (const x of conBarra) assert.ok(MORTIMER.includes(x.nombre));
});
test('Mortimer en dos mensajes da la misma ficha que en uno', () => {
  const corte = MORTIMER.indexOf('<div class="tabb"><input id="tabb-4"');
  assert.ok(corte > 0);
  const uno = L.leer(MORTIMER).ficha, dos = L.leer([{ post: 1, bbcode: MORTIMER.slice(0, corte) }, { post: 2, bbcode: MORTIMER.slice(corte) }]).ficha;
  assert.deepEqual(dos.aLegado(S), uno.aLegado(S));
  assert.equal(dos.partes.length, 2);
  assert.ok(dos.arcanos.every(x => x.origen.post === 2), 'la magia sale del segundo mensaje');
  assert.ok(dos.trasfondos.every(x => x.origen.post === 2));
});

test('ficha en cinco partes (ejemplos de la auditoría): cada dato de su mensaje', () => {
  const { ficha, resumen } = L.leer(IRVIN.partes, { tema: IRVIN.tema });
  assert.equal(ficha.partes.length, 5);
  assert.equal(ficha.nombre, 'Irvin Giles.');
  assert.equal(ficha.presentacion.pd, 13, 'Puntos de Destino: 13 (F06)');
  assert.equal(ficha.atributos.Inteligencia, 4);
  assert.equal(ficha.habilidades.Esquivar, 2);
  const bg = (tipo, nivel) => ficha.trasfondos.find(t => t.tipo === tipo && t.nivel === nivel);
  assert.deepEqual([bg('Biblioteca', 5).categoria, bg('Biblioteca', 5).especifico], ['Arcanismo', '']);
  assert.deepEqual([bg('Biblioteca', 6).categoria, bg('Biblioteca', 6).especifico], ['Arcanismo', 'Artes oscuras']);
  const zh = ficha.trasfondos.find(t => t.tipo === 'Informantes' && t.identidad === 'Zacharias Hayes');
  assert.deepEqual([zh.categoria, zh.especifico, zh.nivel], ['Bajos fondos', 'Contrabandistas', 3]);
  const inf5 = bg('Influencia', 5);
  assert.deepEqual([inf5.categoria, inf5.identidad], ['Política', 'Zacharias Hayes'], 'categoría del encabezado');
  assert.equal(bg('Influencia', 2).especifico, 'Gobierno Mágico de los Estados Unidos / MACUSA');
  assert.ok(ficha.trasfondos.every(t => t.origen.post === 339216 && t.origen.tema === 23113), 'todos del mensaje de trasfondos');
  assert.ok(ficha.arcanos.length >= 3 && ficha.arcanos.every(a => a.origen.post === 339215), 'la magia, del suyo');
  assert.equal(ficha.desconocidos.length, 1, 'la línea rara se guarda para revisar');
  assert.match(ficha.desconocidos[0].texto, /Biblioteca: algo sin nivel/);
  assert.match(resumen, /1 línea para revisar/);
});
test('el antiguo, con la misma ficha en cinco partes juntas, no veía los trasfondos', () => {
  const a = antiguo(IRVIN.partes.map(p => p.bbcode).join('\n'));
  const n = L.leer(IRVIN.partes).ficha;
  assert.ok(a.bgs.length < 2, `antiguo: ${a.bgs.length}`);
  assert.ok(n.trasfondos.length >= 6, `nuevo: ${n.trasfondos.length}`);
});
