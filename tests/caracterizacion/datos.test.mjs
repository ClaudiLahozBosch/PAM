// Los datos nuevos (data/*.json + Sistema) tienen que dar lo mismo que el PAM antiguo,
// salvo las correcciones anotadas en sistema.json → «reconciliado».
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cargarPam, cerrarPam } from '../legado/cargarPam.mjs';
import { Sistema } from '../../js/datos/Sistema.js';
import { CLAVES } from '../../scripts/claves-datos.mjs';

const leer = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const datos = leer('sistema.json');
const S = new Sistema(datos);
const P = cargarPam();
after(cerrarPam);

const INVERSO = Object.fromEntries(Object.entries(CLAVES).map(([a, b]) => [b, a]));
// «precio» venía de «p» o de «price», y «nombre» de «n» o ya era «nombre», según la lista.
const deshacer = (v, precio = 'p', nombre = 'n') => Array.isArray(v) ? v.map(x => deshacer(x, precio, nombre))
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k === 'precio' ? precio : k === 'nombre' ? nombre : (INVERSO[k] || k), deshacer(x, precio, nombre)])) : v;

test('habilidades: vista oficial = Tabla de Canjes (SKILL_GROUPS)', () => {
  assert.deepEqual(S.habilidadesPorAtributo('oficial', { conArte: false }), P.global('SKILL_GROUPS'));
});
test('habilidades: vista de ficha = Mi Ficha (SKILLS)', () => {
  assert.deepEqual(S.habilidadesPorAtributo('ficha'), P.ficha('SKILLS'));
});
test('habilidades: vista de proezas = PROEZAS', () => {
  assert.deepEqual(S.habilidadesPorAtributo('proezas'), P.global('PROEZAS'));
});
test('habilidad() reconoce cualquier forma de escribirla', () => {
  for (const t of ['Esquiva', 'esquivar', 'ESQUIVAR', 'Vuelo', 'seduccion', 'Seducir']) assert.ok(S.habilidad(t), t);
  assert.equal(S.habilidad('Vuelo').nombre, 'Volar');
  assert.equal(S.habilidad('Seducción').atributo, 'Carisma');
  assert.equal(S.habilidad('Natación'), null);
});
test('niveles de habilidad (SKILL_LV, SKILL_NAME, SKILL_LVL, BONUS)', () => {
  const n = [0, 1, 2, 3, 4, 5];
  assert.deepEqual(n.map(i => `${S.nivelHabilidad(i).nombre} (+${S.nivelHabilidad(i).bonus})`), P.ficha('SKILL_LV'));
  assert.deepEqual(n.map(i => S.nivelHabilidad(i).nombre), P.ficha('SKILL_NAME'));
  assert.deepEqual(n.map(i => S.nivelHabilidad(i, 'canjes').nombre), P.global('SKILL_LVL'));
  assert.deepEqual(n.map(i => S.nivelHabilidad(i).bonus), P.ficha('BONUS'));
});
test('costes acumulados y precio de una subida', () => {
  const t = { atributo: 'STAT_ACUM', habilidad: 'SKILL_ACUM', arte: 'ARTE_ACUM', trasfondoGeneral: 'TGEN_ACUM', trasfondoEspecifico: 'TESP_ACUM', ventaja: 'VENT_ACUM' };
  for (const [k, v] of Object.entries(t)) assert.deepEqual(datos.costes[k], P.global(v), k);
  assert.equal(S.coste('atributo', 0, 1), 250);
  assert.equal(S.coste('atributo', 3, 5), 2250 - 950);
  assert.equal(S.coste('habilidad', 2, 2), 0);
  assert.throws(() => S.coste('habilidad', 0, 9));
});
test('listas simples', () => {
  assert.deepEqual(S.atributos, P.global('STATS'));
  assert.deepEqual(S.atributos, P.ficha('ATTRS'));
  assert.deepEqual(S.artes, P.global('ARTES'));
  assert.deepEqual(S.artesanias, P.global('ARTESANIAS'));
  assert.deepEqual(S.especializaciones, P.global('ESPEC_RAMAS'));
  assert.deepEqual(S.especializaciones, P.ficha('ESP_RAMAS'));
  assert.deepEqual(datos.academico, { asignaturasExtasis: P.global('EXTASIS_ASIG'), notas: P.global('NOTAS'), preciosTimos: P.global('TIMOS_PRECIO'), preciosExtasis: P.global('EXTASIS_PRECIO') });
  assert.deepEqual(datos.idiomas, { magicos: P.global('IDIOMAS_MAGICOS'), nivelesCanje: P.global('IDIOMA_NIVEL'), nivelesFicha: P.ficha('IDIOMA_NIV') });
  assert.deepEqual(datos.vinculos, P.ficha('VINC'));
  assert.deepEqual(datos.empleos, { rangos: P.ficha('RANKS'), rangosCortos: P.ficha('RANK_SHORT'), sueldos: P.ficha('SUELDOS') });
  assert.deepEqual(datos.enlaces, { puntosDestino: P.global('LINK_PD'), registroVeterania: P.global('LINK_REGISTRO') });
});
test('ventajas (VENTAJAS, ADVS, VENT_LABELS)', () => {
  assert.deepEqual(datos.ventajas.map(v => v.nombre), P.global('VENTAJAS'));
  assert.deepEqual(datos.ventajas.map(v => v.nombre), P.ficha('ADVS'));
  assert.deepEqual(Object.fromEntries(datos.ventajas.map(v => [v.nombre, ['—', ...v.niveles]])), P.global('VENT_LABELS'));
});
test('trasfondos: tipos y categorías (con las correcciones oficiales)', () => {
  assert.deepEqual([...S.tiposTrasfondo].sort(), [...P.global('TIPOS_TRASF')].sort());
  assert.deepEqual(S.tiposTrasfondo, P.ficha('BG_TYPES'));
  assert.deepEqual(S.categoriasTrasfondo('Biblioteca'), P.global('CONOCIMIENTO_CATEGORIAS'));
  assert.deepEqual(S.categoriasTrasfondo('Biblioteca'), P.ficha('CAT_CONOC'));
  const canjes = P.global('SOCIAL_CATEGORIAS'), ficha = P.ficha('CAT_SOC'), nuevo = S.categoriasTrasfondo('Informantes');
  for (const cat of Object.keys(canjes)) {
    if (cat === 'Hogwarts') assert.deepEqual(nuevo[cat], ficha[cat], 'Hogwarts: «Personal no-docente» como en Mi Ficha y en el texto oficial');
    else if (cat === 'Política') assert.deepEqual(nuevo[cat], canjes[cat], 'Política: con «Gobierno mágico de (X país)» como la Tabla de Canjes');
    else { assert.deepEqual(nuevo[cat], canjes[cat], cat); assert.deepEqual(nuevo[cat], ficha[cat], cat); }
  }
  assert.equal(S.nombreOficialTrasfondo('Personal no docente', 'Informantes'), 'Personal no-docente');
  assert.equal(S.nombreOficialTrasfondo('bajos fondos', 'Informantes'), 'Bajos fondos');
  assert.equal(S.nombreOficialTrasfondo('artes oscuras', 'Biblioteca'), 'Artes oscuras');
  assert.equal(S.nombreOficialTrasfondo('Inventado', 'Biblioteca'), null);
});
test('talentos, veteranía, legendarias, razas, armas y etapas: mismos datos con nombres claros', () => {
  assert.deepEqual(deshacer(datos.talentos), P.global('TALENTOS'));
  assert.deepEqual(deshacer(datos.veterania, 'price', 'nombre'), P.global('VETERANIA'));
  assert.deepEqual(deshacer(datos.legendarias, 'price', 'nombre'), P.global('LEGENDARIAS'));
  assert.deepEqual(deshacer(datos.razas), P.global('RAZAS'));
  assert.deepEqual(deshacer(datos.armas.materiales), P.global('MATERIALES'));
  assert.deepEqual(deshacer(datos.armas.runas), P.global('RUNE_CHAINS'));
  assert.deepEqual([datos.armas.precioBase, datos.armas.nivelesRuna, datos.armas.preciosRuna], [P.global('ARMA_BASE'), P.global('RUNE_LVL'), P.global('RUNE_PRICE')]);
  const etapas = Object.fromEntries(Object.entries(datos.etapas).map(([k, e]) => [k, { pa: e.pa, u: e.umbral, h: e.heridas, lim: e.limites }]));
  assert.deepEqual(etapas, P.ficha('ETAPAS'));
  assert.deepEqual(datos.arcanos, { tipos: P.global('ARC_TYPES'), niveles: P.global('TIER') });
});
test('arcanos: compendio completo y listas oficiales de la calculadora', () => {
  const compendio = leer('arcanos.json');
  const calculados = ['type', 'tier', 'calcName'];
  assert.equal(compendio.length, 455);
  assert.deepEqual(compendio, P.global('ARCANOS').map(a => Object.fromEntries(Object.entries(a).filter(([k]) => !calculados.includes(k)))));
  const calc = leer('arcanos-calculadora.json');
  const antiguo = P.global(`Object.fromEntries(Object.entries(ARC_RAW).map(([t,ts])=>[t,Object.fromEntries(Object.entries(ts).map(([k,s])=>[k,parseArc(s)]))]))`);
  for (const [t, ts] of Object.entries(antiguo)) for (const [k, l] of Object.entries(ts))
    assert.deepEqual(calc[t][k], l.map(a => ({ nombre: a.name, requisitos: a.reqs })), `${t}/${k}`);
});
test('empleos del foro: el texto completo', () => {
  const txt = readFileSync(new URL('../../data/empleos-foro.txt', import.meta.url), 'utf8');
  assert.equal(txt, P.crudo.global(`document.getElementById('empleos-foro').textContent`));
});
