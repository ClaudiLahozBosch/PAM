// Lector de bóveda: `leerSaldos` igual que la de Mi PJ (ejecutada tal cual desde el script) y el estado de una bóveda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { leerSaldos, analizarBoveda } from '../../js/lectores/LectorBoveda.js';
import { leerPaginaTema, unirMensajes } from '../../js/lectores/LectorTema.js';
import { ultimaPagina } from '../../js/servicios/BovedaDelForo.js';

/** La función `leerSaldos` de pam-mi-pj.user.js, sacada del script. */
function leerSaldosMiPj() {
  const src = readFileSync(new URL('../legado/pam-mi-pj.user.js', import.meta.url), 'utf8');
  // hasta la función siguiente (contar llaves no sirve: sus expresiones regulares llevan «{»)
  const i = src.indexOf('function leerSaldos(texto) {'), j = src.indexOf('\nfunction crearCanjes', i);
  return new Function(src.slice(i, j) + '\nreturn leerSaldos;')();
}
const antigua = leerSaldosMiPj();

const TEXTOS = [
  '{Grageas iniciales» 1.200\n{Grageas que se añaden / quitan» +125 (sueldo)\n{Grageas actuales» 1.325\n{Grageas totales» 9.125',
  'GRAGEAS Iniciales 1.025 Actuales 1.525 Totales 9.625\n+500 por misión',
  'Grageas actuales: 1.325 / -300 por canje / Grageas restantes: 1.025 / Grageas totales: 9.125',
  '{Grageas iniciales» 800\n{Grageas actuales» 900\n{Puntos Legendarios iniciales» 2\n{Puntos Legendarios actuales» 5\n{Puntos Legendarios totales» 7',
  'Grageas · Inventario · PL · Registro\nGrageas actuales: 2.000\nPL actuales: 4',
  'Puntos legendarios\nIniciales 3\nActuales 1\nTotales 6',
  'Sin números de bóveda aquí.',
  '{Grageas actuales» 1.000,50\n{Grageas totales» −200'
];
test('leerSaldos: igual que la de Mi PJ en todos los formatos', () => {
  for (const t of TEXTOS) assert.deepEqual(leerSaldos(t), antigua(t), t);
  assert.deepEqual(leerSaldos(TEXTOS[2]).gr, { ini: 1325, fin: 1025, tot: 9125, delta: -300 });
  assert.deepEqual(leerSaldos(TEXTOS[3]).pl, { ini: 2, fin: 5, tot: 7, delta: 3 });
});

test('bóveda de dos páginas: saldo, movimientos, revisión y enlaces', () => {
  const doc = f => new JSDOM(readFileSync(new URL('../fixtures/foro/' + f, import.meta.url), 'utf8')).window.document;
  const p1 = leerPaginaTema(doc('boveda-p1.html')), p2 = leerPaginaTema(doc('boveda-p2.html'));
  assert.deepEqual(ultimaPagina(p1.paginas), { ruta: '/t23175p15-boveda-de-irvin-giles', desplazamiento: 15 });
  const b = analizarBoveda(unirMensajes(p1.posts, p2.posts), { url: '/t23175-', titulo: p1.titulo });
  assert.equal(b.act, 1525, 'manda el último movimiento');
  assert.equal(b.tot, 9625);
  assert.equal(b.pla, 3); assert.equal(b.plt, 5);
  assert.deepEqual(b.movs.map(m => m.d), [500, -300, 125], 'los tres últimos, del más nuevo al más viejo');
  assert.equal(b.revision.autor, 'Gringotts');
  assert.equal(b.l1, '/t23175-#400001'); assert.equal(b.l2, '/t23175-#400070'); assert.equal(b.l3, '/t23175-#400060');
  assert.equal(b.propios.find(p => p.id === 400010).sueldo, true);
});
