// Modelos nuevos frente al PAM antiguo: ninguna ficha ni bóveda guardada por el PAM antiguo pierde datos
// al pasar al modelo nuevo, y la migración no toca lo antiguo.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cargarPam, cerrarPam } from '../legado/cargarPam.mjs';
import { Sistema } from '../../js/datos/Sistema.js';
import { Ficha, ParteFicha } from '../../js/modelos/Ficha.js';
import { Personaje } from '../../js/modelos/Personaje.js';
import { Boveda } from '../../js/modelos/Boveda.js';
import { validarRegistro } from '../../js/modelos/RegistroRoles.js';
import { Almacen } from '../../js/core/Almacen.js';
import { leerLegado } from '../../js/servicios/MigracionLegado.js';

const S = new Sistema(JSON.parse(readFileSync(new URL('../../data/sistema.json', import.meta.url), 'utf8')));
const MORTIMER = readFileSync(new URL('../fixtures/fichas/mortimer-compacta.bbcode', import.meta.url), 'utf8');
const P = cargarPam();
after(cerrarPam);
const espera = ms => new Promise(r => setTimeout(r, ms));

/** La ficha tal como la deja el PAM antiguo al leer un código del foro. */
function fichaAntigua(bbcode) {
  P.w.__txt = bbcode;
  return P.ficha('normFicha(parseFichaForo(window.__txt).ficha)');
}

test('ficha de Mortimer: antiguo → nuevo → antiguo sin perder nada', () => {
  const f = fichaAntigua(MORTIMER);
  assert.ok(f.arcanos.length > 40, 'el PAM antiguo lee sus arcanos');
  const nueva = Ficha.desdeLegado(f, S);
  assert.deepEqual(nueva.aLegado(S), f);
  assert.equal(nueva.nombre, 'Mortimer Gaunt');
  assert.equal(nueva.arcanos.length, f.arcanos.length);
  assert.equal(nueva.trasfondos.length, f.bgs.length);
});
test('habilidades con el nombre oficial dentro, el de ficha fuera', () => {
  const f = fichaAntigua(MORTIMER);
  const nueva = Ficha.desdeLegado(f, S);
  assert.ok('Esquivar' in nueva.habilidades && !('Esquiva' in nueva.habilidades));
  assert.ok('Volar' in nueva.habilidades && 'Seducir' in nueva.habilidades);
  assert.equal(nueva.habilidades.Esquivar, f.skills.Esquiva);
  assert.ok('Esquiva' in nueva.aLegado(S).skills);
});
test('ficha de ejemplo de PAM y ficha vacía: ida y vuelta exacta', () => {
  for (const expr of ['exampleFicha()', 'emptyFicha()']) {
    const f = P.ficha(expr);
    assert.deepEqual(Ficha.desdeLegado(f, S).aLegado(S), f, expr);
  }
});
test('campos que el modelo no conoce se conservan', () => {
  const f = { ...P.ficha('emptyFicha()'), campoFuturo: { x: 1 } };
  assert.deepEqual(Ficha.desdeLegado(f, S).aLegado(S).campoFuturo, { x: 1 });
});

test('migración: lo que guardó el PAM antiguo llega entero y lo antiguo no se toca', async () => {
  const w = P.w;
  // El PAM antiguo importa a Mortimer y apunta su bóveda, como haría un jugador.
  const { id } = w.pamFicha.importar(MORTIMER, 'Mortimer Gaunt');
  assert.ok(w.rrBoveda.set(id, { ini: 1200, tot: 15000, act: 850, plt: 3, pla: 1, l1: '/t1-peticion', leido: '2026-11-03' }));
  P.crudo.ficha('flushSave()');
  await espera(900); // el Registro de Roles guarda con 700 ms de retraso
  const antes = { ...w.localStorage };
  const A = new Almacen({ storage: w.localStorage });
  const r = leerLegado(A, S);
  assert.deepEqual({ ...w.localStorage }, antes, 'la migración no cambia nada guardado');

  const pj = r.personajes.find(p => p.id === id);
  assert.ok(pj, 'Mortimer está, con el mismo id');
  assert.equal(pj.nombre, 'Mortimer Gaunt');
  assert.equal(pj.tema, null, 'todavía no sabe su tema del foro: no se inventa');
  assert.equal(pj.boveda.actual, 850);
  assert.equal(pj.boveda.disponibles, 850, 'la Tabla de Canjes la leerá de aquí (R08)');
  assert.deepEqual([pj.boveda.inicial, pj.boveda.total, pj.boveda.plTotal, pj.boveda.plActual], [1200, 15000, 3, 1]);
  assert.ok(pj.registro && Array.isArray(pj.registro.ganancias), 'su registro va con él');
  assert.equal(r.activo, id);
  // Cada ficha guardada por el PAM antiguo vuelve a salir igual
  const guardado = JSON.parse(w.localStorage.getItem('grimorio.personajes'));
  for (const p of guardado.lista) assert.deepEqual(r.personajes.find(x => x.id === p.id).ficha.aLegado(S), p.ficha);
  // Y la bóveda, igual que la guarda el Registro de Roles
  const reg = JSON.parse(w.localStorage.getItem('registro-roles-v1'));
  assert.deepEqual(pj.boveda.aLegado(), reg.personajes.find(x => x.pamId === id).boveda);
});
test('migración: un registro sin ficha no se une por el nombre, se avisa', () => {
  const m = new Map([
    ['grimorio.personajes', JSON.stringify({ activa: 'pj1', lista: [{ id: 'pj1', ficha: { ...P.ficha('emptyFicha()'), nombre: 'Irvin Giles' } }] })],
    ['registro-roles-v1', JSON.stringify({ v: 1, personajes: [{ id: 'r1', nombre: 'Irvin Giles.', roles: [], ganancias: [], boveda: { ini: 0, tot: 0, act: 40 } }] })]
  ]);
  const storage = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } };
  const r = leerLegado(new Almacen({ storage }), S);
  assert.equal(r.personajes[0].registro, null, 'no se unió solo');
  assert.equal(r.sinFicha.length, 1);
  assert.equal(r.sinFicha[0].sugerido, 'pj1', 'pero se sugiere (mismo nombre salvo el punto)');
  assert.equal(r.sinFicha[0].boveda.actual, 40);
  assert.match(r.avisos[0], /no está unido/);
});

test('personaje: identidad por foro + tema', () => {
  const pj = new Personaje({ id: 'pj1' });
  assert.equal(pj.identidad, null);
  pj.vincular('hp-avada-kedavra.foroactivo.com', '37969');
  assert.equal(pj.identidad, 'hp-avada-kedavra.foroactivo.com#t37969');
  assert.ok(pj.esDelTema('hp-avada-kedavra.foroactivo.com', 37969));
  pj.vincular('hp-avada-kedavra.foroactivo.com', 37969); // el mismo: no pasa nada
  assert.throws(() => pj.vincular('hp-avada-kedavra.foroactivo.com', 1), /otro tema/);
  assert.throws(() => new Personaje({ id: '' }));
});
test('parte de ficha: sabe si el mensaje cambió', () => {
  const p = new ParteFicha({ post: 339216, bbcode: 'Biblioteca V: Arcanismo.' });
  assert.ok(p.sigueIgual('Biblioteca V: Arcanismo.'));
  assert.ok(!p.sigueIgual('Biblioteca VI: Arcanismo.'));
});
test('bóveda: ida y vuelta con los valores por defecto del PAM antiguo', () => {
  const b = { ini: 0, tot: 0, act: 0, plt: 0, pla: 0, l1: '', l2: '', l3: '', delta: '', enl: '' };
  assert.deepEqual(Boveda.desdeLegado(b).aLegado(), b);
});

test('Registro de Roles: un código manipulado no mete HTML (auditoría F08)', () => {
  const malo = { v: 1, personajes: [{ id: 'a', nombre: 'X', emoji: '🌿', tono: 'mint"><img src=x onerror=alert(1)>', roles: [{ nombre: 'r', tipo: 'Libre"><b>', estado: 'Contestado', color: 'red;background:url(x)', enlace: 'javascript:alert(1)' }], ganancias: [], __proto__: { malo: 1 } }], oficiales: [{ nombre: 'o', estado: 'Disponible', enlace: 'hp-avada-kedavra.foroactivo.com/t1-x' }] };
  const r = validarRegistro(JSON.stringify(malo));
  assert.ok(r.ok);
  const p = r.datos.personajes[0];
  assert.equal(p.tono, 'lilac');
  assert.equal(p.roles[0].tipo, 'Libre');
  assert.equal(p.roles[0].color, '');
  assert.equal(p.roles[0].enlace, '');
  assert.equal(r.datos.oficiales[0].enlace, 'hp-avada-kedavra.foroactivo.com/t1-x', 'un enlace sin https:// se conserva');
  assert.ok(r.avisos.length >= 4);
  // «__proto__» escrito en el código (así llega de verdad): no se copia ni cambia el prototipo
  const proto = validarRegistro('{"personajes":[{"id":"a","nombre":"X","__proto__":{"esAdmin":true},"roles":[{"__proto__":{"x":1},"tipo":"Libre"}]}]}');
  assert.ok(proto.ok);
  const q = proto.datos.personajes[0];
  assert.equal(Object.getPrototypeOf(q), Object.prototype);
  assert.equal(q.esAdmin, undefined);
  assert.ok(!Object.prototype.hasOwnProperty.call(q, '__proto__'));
  assert.equal(q.roles[0].x, undefined);
  assert.equal(({}).esAdmin, undefined, 'el prototipo global sigue limpio');
  assert.equal(validarRegistro('{roto').ok, false);
  assert.equal(validarRegistro({ sinPersonajes: 1 }).ok, false);
});
test('Registro de Roles: lo que guarda el PAM antiguo pasa la validación sin cambios', async () => {
  const reg = JSON.parse(P.w.localStorage.getItem('registro-roles-v1'));
  assert.ok(reg, 'hay registro guardado (de la prueba de migración)');
  const r = validarRegistro(reg);
  assert.ok(r.ok);
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.datos, reg);
});
