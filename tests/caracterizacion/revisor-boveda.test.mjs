// La revisión de la bóveda antes de publicar (fase 5b) tiene que decir EXACTAMENTE lo mismo que la de Mi PJ.
// Se sacan del script antiguo sus funciones (num, fmt, limpio, bloques, revisar, tieneFormulario) tal cual,
// y se comparan con js/reglas/RevisorBoveda.js mensaje a mensaje.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { revisar, tieneFormulario, revisarEditor, temaDeRuta, aviso } from '../../js/reglas/RevisorBoveda.js';

const VIEJO = readFileSync(new URL('../legado/pam-mi-pj.user.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const trozo = (desde, hasta) => { const i = VIEJO.indexOf(desde); const j = VIEJO.indexOf(hasta, i + desde.length); assert.ok(i > 0 && j > i, desde); return VIEJO.slice(i, j); };
const antiguo = new Function(
  trozo('  const num = t => {', '\n  const fmt') + trozo('\n  const fmt = n =>', '\n', ) + '\n' +
  trozo('  const limpio = t =>', '  function textoEditor(ta)') +
  'return { revisar, tieneFormulario };')();

// Formularios como los de las bóvedas del foro (con {, <br> y BBCode alrededor)
const form = ({ ini = '1.200', d = '+125 (sueldo)', act = '1.325', tot = '9.125', enl = '[url=/t172-sueldos]sueldo[/url]', rot = 'Grageas' } = {}) =>
  `[b]${rot} iniciales»[/b] ${ini}\n{[b]${rot} que se añaden / quitan»[/b] ${d}\n{[b]${rot} actuales»[/b] ${act}\n{[b]${rot} totales»[/b] ${tot}\n{[b]Enlaces»[/b] ${enl}`;
const BOVEDA = { tema: 23175, tid: 23175, act: 1200, tot: 9000, pla: 3, plt: 5 };

const CASOS = {
  'sin formulario': 'Hola, esto es un mensaje cualquiera con 1.000 grageas.',
  'correcto': form(),
  'suma mal': form({ act: '1.300' }),
  'gasto': form({ d: '-200 (varita) -50', act: '950', tot: '9.000' }),
  'gasto que deja en negativo': form({ ini: '100', d: '−300', act: '-200', tot: '9.000' }),
  'totales mal': form({ tot: '9.000' }),
  'sin enlaces': form({ enl: ' — ' }),
  'falta un número': form({ act: '' }),
  'dos movimientos': form() + '\n\n' + form({ ini: '1.300', d: '+10', act: '1.335', tot: '9.135' }),
  'puntos legendarios': form({ rot: 'Puntos Legendarios', ini: '3', d: '+1', act: '4', tot: '6' }),
  'puntos legendarios mal': form({ rot: 'Puntos Legendarios', ini: '2', d: '+1', act: '4', tot: '7' }),
  'estilo libre bien': 'Grageas actuales: 1.200\n+100 grageas por el sueldo\n-50 grageas por una pluma\nGrageas restantes: 1.250',
  'estilo libre mal': 'Grageas actuales: 1.000\n+100 grageas por el sueldo\nGrageas restantes: 1.250',
  'estilo libre negativo': 'Puntos legendarios actuales: 1\n-3 puntos legendarios por algo\nPuntos legendarios restantes: -2',
  'inventario sin enlaces': 'Nuevo inventario» Varita de saúco, capa',
  'inventario con enlaces': 'Nuevo inventario» Varita\nEnlaces» [url=/t1-x]compra[/url]',
  'html del editor': '<b>Grageas iniciales»</b> 1.200<br>{<b>Grageas que se añaden / quitan»</b> +125&nbsp;(sueldo)<br>{<b>Grageas actuales»</b> 1.325<br>{<b>Grageas totales»</b> 9.125<br>{<b>Enlaces»</b> <a href="/t172">sueldo</a>'
};

test('revisar: mismos avisos que Mi PJ, sin bóveda y con la bóveda del jugador', () => {
  for (const [nombre, texto] of Object.entries(CASOS)) {
    assert.equal(tieneFormulario(texto), antiguo.tieneFormulario(texto), `${nombre}: tieneFormulario`);
    for (const ref of [null, BOVEDA, { ...BOVEDA, act: 1000, tot: null }]) {
      assert.deepEqual(revisar(texto, ref), antiguo.revisar(texto, ref), `${nombre} (ref ${JSON.stringify(ref)})`);
    }
  }
});

test('los casos de prueba cubren de verdad los avisos', () => {
  // si un cambio dejara revisar() sin avisos, la comparación pasaría sin probar nada
  const todos = Object.values(CASOS).flatMap(t => revisar(t, BOVEDA)).join('\n');
  for (const trozoAviso of ['da', 'negativo', 'totales deberían', 'faltan los enlaces', 'falta algún número', 'las iniciales dicen', 'empezás con', '<b>Inventario:</b>', 'movimiento 2', 'Puntos Legendarios'])
    assert.ok(todos.includes(trozoAviso), trozoAviso);
  assert.deepEqual(revisar(CASOS.correcto, BOVEDA), []);
  assert.deepEqual(revisar(CASOS['estilo libre bien'], BOVEDA), []);
});

test('temaDeRuta: tema de la página o del formulario de respuesta', () => {
  assert.equal(temaDeRuta('/t23175-boveda-de-irvin-giles'), 23175);
  assert.equal(temaDeRuta('/t23175p15-boveda'), 23175);
  assert.equal(temaDeRuta('/post?t=23175&mode=reply'), 23175);
  assert.equal(temaDeRuta('/post?p=99&mode=editpost'), 0);
  assert.equal(temaDeRuta(''), 0);
});

test('revisarEditor: compara con la bóveda solo en el propio tema de la bóveda', () => {
  const mal = form({ ini: '1.000', act: '1.125', tot: '9.125' }); // empieza en 1.000 y la bóveda está en 1.200
  const enSuBoveda = revisarEditor({ texto: mal, ruta: '/post?t=23175&mode=reply' }, BOVEDA);
  assert.equal(enSuBoveda.formulario, true);
  assert.equal(enSuBoveda.conBoveda, true);
  assert.deepEqual(enSuBoveda.avisos, [{ b: 'Grageas:', t: ' las iniciales dicen 1.000, pero tu bóveda está en 1.200.' }]);
  assert.equal(enSuBoveda.encabezado, 'Revisé el formulario de la bóveda y ');

  const otroTema = revisarEditor({ texto: mal, ruta: '/t999-otra' }, BOVEDA);
  assert.equal(otroTema.conBoveda, false);
  assert.deepEqual(otroTema.avisos, []);

  // la bóveda tal como la guarda MiPj.js (campo «tema») y sin datos todavía
  assert.equal(revisarEditor({ texto: mal, ruta: '/t23175-b' }, { tema: 23175, act: 1200, tot: 9000 }).conBoveda, true);
  assert.equal(revisarEditor({ texto: mal, ruta: '/t23175-b' }, null).conBoveda, false);

  assert.deepEqual(revisarEditor({ texto: 'hola', ruta: '/t23175-b' }, BOVEDA), { formulario: false, avisos: [] });
});

test('aviso: separa la parte en negrita sin interpretar HTML', () => {
  assert.deepEqual(aviso('<b>Grageas (movimiento 2):</b> faltan los enlaces.'), { b: 'Grageas (movimiento 2):', t: ' faltan los enlaces.' });
  assert.deepEqual(aviso('texto suelto'), { b: '', t: 'texto suelto' });
});
