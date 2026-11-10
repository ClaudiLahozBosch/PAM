// Lector de temas del foro y elección de las partes vigentes de una ficha (F01, F05).
// Se compara con el `postsDe` de Mi PJ, ejecutado tal cual desde pam-mi-pj.user.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { leerPaginaTema, unirMensajes, mismoAutor } from '../../js/lectores/LectorTema.js';
import { partesVigentes } from '../../js/lectores/PartesFicha.js';

const fixture = f => new JSDOM(readFileSync(new URL('../fixtures/foro/' + f, import.meta.url), 'utf8'), { url: 'https://hp-avada-kedavra.foroactivo.com/t1-x' }).window;

/** La función `postsDe` de Mi PJ, sacada del script y ejecutada en la misma ventana. */
function postsDeMiPj(w) {
  const src = readFileSync(new URL('../legado/pam-mi-pj.user.js', import.meta.url), 'utf8');
  const i = src.indexOf('function postsDe(doc) {');
  let j = src.indexOf('{', i), n = 0;
  for (; j < src.length; j++) { if (src[j] === '{') n++; else if (src[j] === '}' && --n === 0) break; }
  return w.eval('(' + src.slice(i, j + 1) + ')')(w.document);
}

for (const f of ['tema-invitado.html', 'tema-ficha.html']) {
  test(`${f}: mismos mensajes, autores y fechas que Mi PJ`, () => {
    const w = fixture(f);
    const nuevo = leerPaginaTema(w.document).posts;
    const viejo = postsDeMiPj(w).filter(p => p.id);
    assert.equal(nuevo.length, viejo.length);
    nuevo.forEach((p, i) => {
      assert.equal(String(p.id), viejo[i].id);
      assert.equal(p.autorId, viejo[i].autorId);
      if (viejo[i].autorNombre) assert.equal(p.autor, viejo[i].autorNombre);
      // sin sesión Mi PJ dejaba el nombre del autor pegado a la fecha; el nuevo lo quita
      assert.equal(p.fecha, viejo[i].autorNombre ? viejo[i].fecha : viejo[i].fecha.replace(p.autor + ' ', ''));
    });
  });
}
test('sin sesión: el nombre sale igual aunque no haya enlace al perfil (Mi PJ lo dejaba vacío)', () => {
  const t = leerPaginaTema(fixture('tema-invitado.html').document);
  assert.equal(t.tema, 21321);
  assert.deepEqual(t.posts.map(p => [p.id, p.autorId, p.autor, p.fecha]), [[315882, null, 'Henry Beckett', 'Lun 16 Oct - 22:35'], [326683, null, 'Tramas', 'Mar 20 Mar - 22:53']]);
});
test('tema de ficha: título, tema, páginas', () => {
  const t = leerPaginaTema(fixture('tema-ficha.html').document);
  assert.equal(t.tema, 23113);
  assert.equal(t.titulo, 'Irvin Giles');
  assert.deepEqual(t.paginas, ['/t23113p15-irvin-giles', '/t23113p30-irvin-giles']);
  assert.equal(t.posts.length, 8);
});
test('partes vigentes: las cinco de la ficha, sin las actualizaciones posteriores (F01, F05)', () => {
  const { dueno, partes, historial } = partesVigentes(leerPaginaTema(fixture('tema-ficha.html').document).posts);
  assert.deepEqual(dueno, { id: 5203, nombre: 'Irvin Giles' });
  assert.deepEqual(partes.map(p => p.id), [337672, 339214, 339215, 339216, 339217]);
  assert.deepEqual(historial.map(p => p.id), [373284, 402093], 'la actualización larga es historial, aunque tenga más de 800 caracteres o parezca ficha');
});
test('partes vigentes: un aviso corto del dueño cierra la ficha', () => {
  const m = (id, autorId, texto) => ({ id, autorId, autor: 'X' + autorId, fecha: '', html: texto, texto });
  const r = partesVigentes([m(1, 7, '▋ Nombre y Apellido: A'), m(2, 7, 'Ya está, gracias'), m(3, 7, '▋ Atributos: Vigor +1'), m(4, 2, 'sello')]);
  assert.deepEqual(r.partes.map(p => p.id), [1]);
  assert.deepEqual(r.historial.map(p => p.id), [2, 3]);
  assert.deepEqual(partesVigentes([]), { dueno: null, partes: [], historial: [] });
});
test('unir páginas y comparar autores', () => {
  const a = { id: 2, autorId: null, autor: 'Ána', fecha: '', html: '', texto: '' }, b = { id: 1, autorId: null, autor: 'ana', fecha: '', html: '', texto: '' };
  assert.deepEqual(unirMensajes([a], [b, a]).map(m => m.id), [1, 2]);
  assert.ok(mismoAutor(a, b), 'sin id, por nombre');
  assert.ok(!mismoAutor({ ...a, autorId: 1 }, { ...b, autorId: 2 }), 'con id manda el id');
});
