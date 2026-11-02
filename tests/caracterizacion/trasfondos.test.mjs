// Lector de trasfondos nuevo: entiende los formatos de la auditoría (F02) y da lo mismo que el
// antiguo en todos los que el antiguo ya entendía.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cargarPam, cerrarPam } from '../legado/cargarPam.mjs';
import { Sistema } from '../../js/datos/Sistema.js';
import { LectorTrasfondo } from '../../js/lectores/LectorTrasfondo.js';

const S = new Sistema(JSON.parse(readFileSync(new URL('../../data/sistema.json', import.meta.url), 'utf8')));
const L = new LectorTrasfondo(S);
const P = cargarPam();
after(cerrarPam);
const antiguo = linea => { P.w.__l = linea; return P.ficha('leerTrasfondo(window.__l)'); };
const corto = t => t && { tipo: t.tipo, categoria: t.categoria, especifico: t.especifico, nivel: t.nivel, identidad: t.identidad, estado: t.estadoLectura };

test('auditoría F02: Biblioteca V: Arcanismo.', () => {
  assert.equal(antiguo('Biblioteca V: Arcanismo.'), null, 'el antiguo no lo entendía');
  assert.deepEqual(corto(L.leer('Biblioteca V: Arcanismo.')), { tipo: 'Biblioteca', categoria: 'Arcanismo', especifico: '', nivel: 5, identidad: '', estado: 'reconocido' });
});
test('auditoría F02: Biblioteca VI: Arcanismo > Artes Oscuras.', () => {
  assert.deepEqual(corto(L.leer('Biblioteca VI: Arcanismo > Artes Oscuras.')), { tipo: 'Biblioteca', categoria: 'Arcanismo', especifico: 'Artes oscuras', nivel: 6, identidad: '', estado: 'reconocido' });
});
test('auditoría F02: Informantes III: Contrabandistas (Zacharias Hayes).', () => {
  const esperado = { tipo: 'Informantes', categoria: 'Bajos fondos', especifico: 'Contrabandistas', nivel: 3, identidad: 'Zacharias Hayes', estado: 'reconocido' };
  assert.deepEqual(corto(L.leer('Informantes III: Contrabandistas (Zacharias Hayes).', { categoria: 'Bajos Fondos' })), esperado, 'con el encabezado');
  assert.deepEqual(corto(L.leer('Informantes III: Contrabandistas (Zacharias Hayes).')), esperado, 'sin encabezado: Contrabandistas solo está en Bajos fondos');
});
test('auditoría F02: Influencia V (Zacharias Hayes):', () => {
  assert.deepEqual(corto(L.leer('Influencia V (Zacharias Hayes):', { categoria: 'Política' })), { tipo: 'Influencia', categoria: 'Política', especifico: '', nivel: 5, identidad: 'Zacharias Hayes', estado: 'reconocido' });
  const sin = L.leer('Influencia V (Zacharias Hayes):');
  assert.equal(sin.estadoLectura, 'revisar', 'sin encabezado no se sabe la categoría: se marca, no se tira');
  assert.equal(sin.nivel, 5);
});
test('auditoría F02: Influencia II: Gobierno Mágico de los Estados Unidos / MACUSA.', () => {
  assert.deepEqual(corto(L.leer('Influencia II: Gobierno Mágico de los Estados Unidos / MACUSA.')), { tipo: 'Influencia', categoria: 'Política', especifico: 'Gobierno Mágico de los Estados Unidos / MACUSA', nivel: 2, identidad: '', estado: 'reconocido' });
});
test('lo que no es un trasfondo sigue sin serlo', () => {
  for (const l of ['Fama II', 'Biblioteca', 'Lazo con Henry', '', 'Biblioteca: (sin nivel)']) assert.equal(L.leer(l), null, l);
  const raro = L.leer('Biblioteca IV: Cosas Inventadas');
  assert.equal(raro.estadoLectura, 'revisar', 'categoría que no existe: se conserva y se marca');
  assert.equal(raro.categoria, 'Cosas Inventadas');
});
test('guarda el texto original y el origen', () => {
  const t = L.leer('Biblioteca V: Arcanismo.', { origen: { tema: 23113, post: 339216 } });
  assert.equal(t.textoOriginal, 'Biblioteca V: Arcanismo.');
  assert.deepEqual(t.origen, { tema: 23113, post: 339216 });
});

// ---- mismo resultado que el antiguo en lo que el antiguo ya entendía ----
const MORTIMER = readFileSync(new URL('../fixtures/fichas/mortimer-compacta.bbcode', import.meta.url), 'utf8');
function lineasDeMortimer() {
  P.w.__t = MORTIMER;
  return P.ficha('cleanForo(window.__t)').split('\n').map(l => l.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/, '')).filter(Boolean);
}
const FORMATOS_ANTIGUOS = [
  'Biblioteca — Medicina — Heridas mágicas III: nota', 'Biblioteca Medicina IV', 'Biblioteca: Medicina (IV)',
  'Trasfondo Biblioteca de Medicina nivel 4', 'IV Biblioteca — Medicina', 'Biblioteca — Medicina — Heridas mágicas: III — nota',
  'Informantes Bajos fondos Ladrones II', 'Influencia — Política — Ministerio de Magia II', 'Seguidores — Sociedad — Prensa I',
  'Biblioteca — Arcanismo — Artes oscuras III', 'Informantes — Hogwarts — Personal no-docente II', 'Biblioteca Herbología II: estudia en casa',
  'Influencia — Seres mágicos — Duendes I', 'Biblioteca — Cultura Mágica — Hogwarts IV'
];
test('formatos antiguos (y los trasfondos de Mortimer): idéntico al lector antiguo', () => {
  let comparadas = 0;
  for (const l of [...FORMATOS_ANTIGUOS, ...lineasDeMortimer()]) {
    const a = antiguo(l);
    if (!a) continue;
    comparadas++;
    const n = L.leer(l);
    assert.ok(n, `el nuevo no entiende «${l}»`);
    assert.deepEqual(n.aLegado(), a, `«${l}»`);
  }
  assert.ok(comparadas >= FORMATOS_ANTIGUOS.length, `comparadas ${comparadas}`);
});
