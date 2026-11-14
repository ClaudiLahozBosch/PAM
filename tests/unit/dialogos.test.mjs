// 2.1.0: el Coloreador de diálogos sin pantalla (js/bbcode/Dialogos.js) y lo que usa el botón «Colorear diálogos» de
// Mi PJ en el foro (js/servicios/ColoreadorDelForo.js). Que la pantalla de PAM colorea igual que antes lo comprueba
// tests/caracterizacion/registro.test.mjs («8b: el Coloreador colorea igual»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorearConConfig, descolorear, quitarColores } from '../../js/bbcode/Dialogos.js';
import { crearColoreadorDelForo } from '../../js/servicios/ColoreadorDelForo.js';

const OPTS = { raya: true, guion: true, comillas: true, fix: false, center: false };
const CFG = { tag: '#A3000D', dlgf: {}, opts: OPTS, names: [{ name: 'Mortimer', g: 3, c: null, f: { b: true } }], marks: [{ m: 0, g: 'custom', c: '#B9A6D9', f: { i: true }, strip: true }] };
const col = (t, cfg = CFG) => colorearConConfig(t, cfg).code;

test('colorea el diálogo, los nombres y las marcas como la pantalla del Coloreador', () => {
  assert.equal(col('—Hola —dijo Mortimer—. ¿Vamos?'), '[color=#A3000D]—Hola[/color] —dijo [color=#005C1F][b]Mortimer[/b][/color]—. [color=#A3000D]¿Vamos?[/color]');
  assert.equal(col('Pensó *qué raro*.'), 'Pensó [color=#B9A6D9][i]qué raro[/i][/color].');
  assert.equal(col('"Comillas" y nada más.'), '[color=#A3000D]"Comillas"[/color] y nada más.');
  assert.equal(col('Sin color', { tag: '', names: [], marks: [] }), 'Sin color');
});

test('2.1.0: detecta más diálogos (revisado con las Crónicas del foro y los casos que fallaban)', () => {
  const v = t => col(t, { tag: '#C00', names: [], marks: [], opts: OPTS }).replace(/\[color=#C00\]/g, '⟦').replace(/\[\/color\]/g, '⟧');
  const casos = {
    '―Hola ―dijo.': '⟦―Hola⟧ ―dijo.', // otras rayas que salen al copiar
    '‒Hola ‒dijo.': '⟦‒Hola⟧ ‒dijo.',
    '--Hola --dijo--. ¿Vamos?': '⟦--Hola⟧ --dijo--. ⟦¿Vamos?⟧', // «--» como raya
    'Le miró y dijo:-Hola.': 'Le miró y dijo:⟦-Hola.⟧',
    '*—Hola —susurró.*': '*⟦—Hola⟧ —susurró.*',
    '„Hola“ dijo.': '⟦„Hola“⟧ dijo.',
    // la puntuación de después de cerrar el inciso es del narrador
    '—Además —añadió—, cuantas más personas.': '⟦—Además⟧ —añadió—, ⟦cuantas más personas.⟧',
    // lo que no es diálogo, igual que antes
    'Un niño-lobo corría.': 'Un niño-lobo corría.', 'Era —según dicen— muy alto.': 'Era —según dicen— muy alto.',
    'El 2-1 del partido.': 'El 2-1 del partido.', 'Pasó de 3 - 2 a 4.': 'Pasó de 3 - 2 a 4.', "'Hola' dijo.": "'Hola' dijo.",
    '—¿Vienes? —preguntó. —Sí.': '⟦—¿Vienes?⟧ —preguntó. ⟦—Sí.⟧'
  };
  for (const [t, esperado] of Object.entries(casos)) assert.equal(v(t), esperado, t);
  // con «Corregir guiones», «--» pasa a raya
  assert.equal(col('--Hola --dijo.', { tag: '#C00', opts: { ...OPTS, fix: true } }), '[color=#C00]—Hola[/color] —dijo.');
});

test('las etiquetas que ya tiene el texto no se tocan (antes se coloreaba lo de dentro de las comillas)', () => {
  assert.equal(col('[quote="Hana Park"]Hola[/quote]'), '[quote="Hana Park"]Hola[/quote]');
  assert.equal(col('<div style="color:red; margin-top:2px">texto</div>'), '<div style="color:red; margin-top:2px">texto</div>');
  assert.equal(col('[url=https://x.com/a-b]enlace[/url] -dijo.'), '[url=https://x.com/a-b]enlace[/url] -dijo.');
  // el diálogo dentro de una etiqueta se colorea dentro, sin cruzar la etiqueta
  assert.equal(col('[b]—Hola.[/b]'), '[b][color=#A3000D]—Hola.[/color][/b]');
  assert.equal(col('[center]—Hola —dijo.[/center]'), '[center][color=#A3000D]—Hola[/color] —dijo.[/center]');
  assert.equal(col('—Hola [i]amigo[/i] mío.'), '[color=#A3000D]—Hola[/color] [i][color=#A3000D]amigo[/color][/i] [color=#A3000D]mío.[/color]');
});

test('colorear dos veces da lo mismo que una (se quita lo de antes)', () => {
  const textos = ['—Hola —dijo Mortimer—. ¿Vamos?\nPensó *qué raro*.', '[quote="Hana"]x[/quote]\n—Sí, Mortimer.', '"Comillas" y —raya.'];
  for (const cfg of [CFG, { ...CFG, opts: { ...OPTS, center: true } }, { ...CFG, dlgf: { b: true, u: true } }]) {
    for (const t of textos) {
      const una = col(t, cfg);
      assert.equal(col(descolorear(una, cfg), cfg), una, t);
      assert.equal(descolorear(una, { ...cfg, marks: [] }).includes('[color=#A3000D]'), false);
    }
  }
  // lo que no puso el coloreador se queda
  assert.equal(descolorear('[color=red]rojo[/color] y [color=#A3000D]—Hola[/color]', CFG), '[color=red]rojo[/color] y —Hola');
});

test('2.1.4: lo coloreado a mano se respeta; «Quitar colores» quita todos los colores', () => {
  // un diálogo con su propio color (otro personaje): ni el diálogo ni los nombres se pintan por encima
  assert.equal(col('[color=#336699]—Soy Mortimer.[/color]\n—Y yo no.'), '[color=#336699]—Soy Mortimer.[/color]\n[color=#A3000D]—Y yo no.[/color]');
  assert.equal(col('[color=#336699]—Un diálogo\nen dos líneas.[/color]\n—Hola.'), '[color=#336699]—Un diálogo\nen dos líneas.[/color]\n[color=#A3000D]—Hola.[/color]');
  // quitarColores: los del Coloreador (con su formato) y los de mano
  const cfgI = { ...CFG, dlgf: { i: true } };
  const t = col('—Hola, Mortimer.\n[color=red]rojo[/color]', cfgI);
  assert.equal(t, '[color=#A3000D][i]—Hola, [color=#005C1F][b]Mortimer[/b][/color].[/i][/color]\n[color=red]rojo[/color]');
  assert.equal(quitarColores(t, cfgI), '—Hola, Mortimer.\nrojo');
  assert.equal(quitarColores('[COLOR=#fff]a[/COLOR] [b]b[/b]', CFG), 'a [b]b[/b]', 'los demás formatos, no');
});

test('Mi PJ en el foro: la configuración del personaje con el nombre de la cuenta; si no, la general', async () => {
  const guardado = { v: 1, general: { ...CFG, tag: '#111111' }, pjs: [{ nombre: 'Himmel Reich Bils.', config: { ...CFG, tag: '#222222' } }] };
  const agente = { leerDato: async () => guardado };
  let cuenta = 'Himmel Reich Bils';
  const C = crearColoreadorDelForo(agente, { cuenta: () => cuenta });
  let r = await C.colorear('—Hola.');
  assert.deepEqual([r.texto, r.quien, r.tramos, r.sinConfig], ['[color=#222222]—Hola.[/color]', 'Himmel Reich Bils', 1, false]);
  assert.deepEqual(await C.contar('—Hola.\n—Adiós.'), { dialogos: 2, colores: false, cambiaria: true, sinConfig: false, quien: 'Himmel Reich Bils' });
  const ya = await C.contar(r.texto);
  assert.deepEqual([ya.colores, ya.cambiaria], [true, false], 'ya coloreado: solo «Quitar colores»');
  // después de previsualizar (\r\n, colores en minúsculas) se ve igual
  const vuelta = await C.contar('Narración.\r\n' + r.texto.toLowerCase());
  assert.deepEqual([vuelta.colores, vuelta.cambiaria], [true, false]);
  assert.equal((await C.descolorear('[color=#AbCdEf]x[/color] ' + r.texto.toLowerCase())).texto, 'x —hola.');
  // coloreado y con un diálogo nuevo debajo: salen los dos
  const mas = await C.contar(r.texto + '\n—Otro.');
  assert.deepEqual([mas.colores, mas.cambiaria], [true, true]);
  assert.equal((await C.contar('Solo narración.')).dialogos, 0);
  cuenta = 'Otra Cuenta';
  r = await C.colorear('—Hola.');
  assert.deepEqual([r.texto, r.quien], ['[color=#111111]—Hola.[/color]', null]);
});

test('Mi PJ en el foro: sin nada de PAM, cuenta los diálogos pero no colorea', async () => {
  const C = crearColoreadorDelForo({ leerDato: async () => undefined }, { cuenta: () => 'TEST' });
  assert.deepEqual(await C.contar('—Hola.'), { dialogos: 1, colores: false, cambiaria: true, sinConfig: true, quien: null });
  assert.deepEqual(await C.colorear('—Hola.'), { sinConfig: true, texto: '—Hola.', tramos: 0, quien: null });
});
