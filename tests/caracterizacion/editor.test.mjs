// Editor de la ficha (modo «Personalizada» nuevo) con la ficha de Mortimer.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cargarPam, cerrarPam } from '../legado/cargarPam.mjs';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { EditorFicha } from '../../js/bbcode/EditorFicha.js';
import { Ficha } from '../../js/modelos/Ficha.js';
import { Arcano } from '../../js/modelos/Arcano.js';
import { Trasfondo } from '../../js/modelos/Trasfondo.js';
import { analizar, balance } from '../../js/bbcode/Etiquetas.js';
import { combate, puntos } from '../../js/reglas/Combate.js';

const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const S = new Sistema(json('sistema.json')), C = new Compendio(json('arcanos.json'));
const L = new LectorFicha(S, C), E = new EditorFicha(S, C, L);
const MORTIMER = readFileSync(new URL('../fixtures/fichas/mortimer-compacta.bbcode', import.meta.url), 'utf8');
const P = cargarPam();
after(cerrarPam);

const leer = txt => L.leer([{ post: 1, bbcode: txt }]).ficha;
const ANTES = leer(MORTIMER);
const copia = f => new Ficha(JSON.parse(JSON.stringify(f)));
/** Aplica un cambio a la ficha de Mortimer y devuelve el código nuevo, lo hecho, lo manual y la ficha releída. */
function canje(cambiar) {
  const d = copia(ANTES); cambiar(d);
  const r = E.aplicar(ANTES, d);
  return { ...r, codigo: r.partes[0].despues, leida: leer(r.partes[0].despues), quiero: d };
}
/** Spoiler más interior que contiene la posición `pos`. */
function spoilerDe(texto, pos) {
  const m = analizar(texto);
  const abiertos = m.filter(e => e.tipo === 'abre' && e.nombre === 'bb:spoiler' && e.ini < pos && e.pareja != null && m[e.pareja].ini >= pos);
  return abiertos.length ? texto.slice(abiertos[abiertos.length - 1].ini, abiertos[abiertos.length - 1].fin) : null;
}
const arc = (nombre, tipo, nivel, descripcion = '') => new Arcano({ nombre, tipo, nivel, descripcion, ref: C.buscar(nombre, tipo)?.id ?? null });
const sinCambios = (r, ...menos) => { const quitar = new Set(menos); return r; };

test('reglas de combate y puntos: lo mismo que el PAM antiguo', () => {
  for (const [nombre, f] of [['Mortimer', ANTES], ['ejemplo de PAM', Ficha.desdeLegado(P.ficha('exampleFicha()'), S)]]) {
    P.w.__f = f.aLegado(S);
    const cA = P.ficha('withF(window.__f, () => combate({warlock:null}))'), pA = P.ficha('withF(window.__f, () => puntos({herbivicus:null}))');
    const cN = combate(f, S, { warlock: null, compendio: C }), pN = puntos(f, { compendio: C });
    for (const k of ['ini', 'atkF', 'def', 'atkM', 'luchaF', 'luchaM', 'pa', 'umbral', 'heridas']) assert.equal(cN[k], cA[k], `${nombre}: ${k}`);
    assert.deepEqual(cN.t, cA.t, `${nombre}: textos`);
    assert.deepEqual(pN, pA, `${nombre}: puntos`);
  }
});

test('R01: un hechizo nuevo tras la última línea del desplegable queda DENTRO del desplegable', () => {
  const hechizos = ANTES.arcanos.filter(a => a.tipo === 'hechizo');
  const ultimo = hechizos[hechizos.length - 1];
  // un hechizo oficial del mismo nivel que el último, que Mortimer no tenga
  const nuevo = C.lista.find(a => a.tipo === 'hechizo' && a.nivel === ultimo.nivel && a.oficial && !ANTES.arcanos.some(x => x.ref === a.id)).nombre;
  const r = canje(d => d.arcanos.push(arc(nuevo, ultimo.tipo, ultimo.nivel, 'Descripción de prueba.')));
  assert.deepEqual(r.manual, []);
  assert.ok(r.hechos.includes('Añadido: ' + nuevo));
  const pNuevo = r.codigo.indexOf(nuevo), pSib = r.codigo.indexOf(ultimo.nombre);
  assert.ok(pNuevo > pSib, 'detrás de su hermano');
  assert.equal(spoilerDe(r.codigo, pNuevo), spoilerDe(r.codigo, pSib), 'en el mismo spoiler que su hermano');
  assert.match(spoilerDe(r.codigo, pNuevo), /HECHIZOS/);
  assert.deepEqual(balance(r.codigo), balance(MORTIMER), 'ninguna etiqueta de más ni de menos');
  assert.ok(r.leida.arcanos.some(a => a.nombre === nuevo && a.descripcion === 'Descripción de prueba.'));
});
test('R01 en el editor antiguo: la misma línea quedaba fuera del desplegable', () => {
  P.w.__t = MORTIMER;
  const base = P.ficha('parseFichaForo(window.__t).ficha');
  const hechizos = base.arcanos.filter(a => a.type === 'hechizo'); const ult = hechizos[hechizos.length - 1];
  const cur = JSON.parse(JSON.stringify(base)); cur.arcanos.push({ type: ult.type, tier: ult.tier, name: 'Petrificus Totalus', nota: '' });
  P.w.__b = base; P.w.__c = cur;
  const out = P.ficha('actualizarCodigo(window.__t, window.__b, window.__c)').code;
  assert.notEqual(spoilerDe(out, out.indexOf('Petrificus Totalus')), spoilerDe(out, out.indexOf(ult.name)));
});

test('R02: quitar la única poción no se lleva el cierre del desplegable', () => {
  const pociones = ANTES.arcanos.filter(a => a.tipo === 'pocion');
  assert.equal(pociones.length, 1, 'Mortimer tiene una sola poción');
  const r = canje(d => { d.arcanos = d.arcanos.filter(a => a.tipo !== 'pocion'); });
  assert.deepEqual(r.manual, []);
  assert.deepEqual(balance(r.codigo), balance(MORTIMER));
  assert.equal(r.leida.arcanos.filter(a => a.tipo === 'pocion').length, 0);
  assert.equal(r.leida.arcanos.length, ANTES.arcanos.length - 1, 'los demás siguen');
  assert.match(r.codigo, /\[spoiler=POCIONES\][\s\S]*?\[\/spoiler\]/, 'el desplegable de pociones sigue entero');
});
test('R03: tres hechizos nuevos del mismo nivel quedan en el orden en que se añadieron', () => {
  const nivel = ANTES.arcanos.find(a => a.tipo === 'hechizo' && a.nivel === 'bas') ? 'bas' : 'int';
  const nuevos = ['Expelliarmus', 'Incarcerous', 'Confringo'].filter(n => !ANTES.arcanos.some(a => a.nombre === n));
  const r = canje(d => { for (const n of nuevos) d.arcanos.push(arc(n, 'hechizo', C.buscar(n, 'hechizo')?.nivel ?? nivel)); });
  assert.deepEqual(r.manual, []);
  const pos = nuevos.map(n => r.codigo.indexOf(n));
  assert.ok(pos.every(p => p > 0));
  const mismosNivel = nuevos.filter(n => C.buscar(n, 'hechizo')?.nivel === C.buscar(nuevos[0], 'hechizo')?.nivel);
  const p2 = mismosNivel.map(n => r.codigo.indexOf(n));
  assert.deepEqual(p2, [...p2].sort((a, b) => a - b), 'en orden');
});
test('arcano nuevo de un nivel que la ficha aún no tiene: se crea su encabezado', () => {
  const tiene = n => ANTES.arcanos.some(a => a.tipo === 'pocion' && a.nivel === n);
  const nivel = ['int', 'ava'].find(n => !tiene(n));
  const nombre = C.lista.find(a => a.tipo === 'pocion' && a.nivel === nivel && a.oficial).nombre;
  const r = canje(d => d.arcanos.push(arc(nombre, 'pocion', nivel, 'Descripción de prueba.')));
  assert.deepEqual(r.manual, [], r.manual.join('; '));
  assert.ok(r.leida.arcanos.some(a => a.nombre === nombre && a.nivel === nivel && a.tipo === 'pocion'));
  assert.match(spoilerDe(r.codigo, r.codigo.indexOf(nombre)), /POCIONES/);
});
test('R04: el arcano nuevo lleva descripción (la del Compendio si no se da otra)', () => {
  const nombre = C.lista.find(a => a.tipo === 'hechizo' && a.nivel === 'int' && a.oficial && !ANTES.arcanos.some(x => x.ref === a.id)).nombre;
  const r = canje(d => d.arcanos.push(arc(nombre, 'hechizo', 'int')));
  const leido = r.leida.arcanos.find(a => a.nombre === nombre);
  assert.ok(leido && leido.descripcion.length > 20, 'con descripción');
});

test('R06: trasfondo nuevo, subir uno, idioma, talento, ventaja y especialización', () => {
  const t0 = ANTES.trasfondos[0];
  const r = canje(d => {
    d.trasfondos.push(new Trasfondo({ tipo: 'Influencia', categoria: 'Sociedad', especifico: 'Prensa', nivel: 1 }));
    d.trasfondos[0].nivel = t0.nivel + 1;
    d.idiomas.push({ nombre: 'Alemán', nivel: 'Bajo', nota: '' });
    d.talentos.push({ nombre: 'Ataque Rápido', nota: '' });
    d.ventajas.Recursos = ANTES.ventajas.Recursos + 1;
    d.especializaciones.Medimago = Math.min(3, ANTES.especializaciones.Medimago + 1);
  });
  assert.deepEqual(r.manual, [], r.manual.join('; '));
  const f = r.leida;
  assert.ok(f.trasfondos.some(t => t.tipo === 'Influencia' && t.especifico === 'Prensa' && t.nivel === 1));
  assert.equal(f.trasfondos.find(t => t.tipo === t0.tipo && t.categoria === t0.categoria && t.especifico === t0.especifico).nivel, t0.nivel + 1);
  assert.ok(f.idiomas.some(i => i.nombre === 'Alemán' && i.nivel === 'Bajo'));
  assert.ok(f.talentos.some(t => t.nombre === 'Ataque Rápido'));
  assert.equal(f.ventajas.Recursos, ANTES.ventajas.Recursos + 1);
  assert.equal(f.especializaciones.Medimago, Math.min(3, ANTES.especializaciones.Medimago + 1));
  assert.deepEqual(balance(r.codigo), balance(MORTIMER));
  assert.equal(f.trasfondos.length, ANTES.trasfondos.length + 1, 'nada más se movió');
  assert.equal(f.arcanos.length, ANTES.arcanos.length);
});
test('R01 con el bloque en una sola línea: se quita la única poción y se añade otra de otro nivel', () => {
  const pi = C.lista.find(a => a.tipo === 'pocion' && a.nivel === 'int' && a.oficial);
  const r = canje(d => { d.arcanos = d.arcanos.filter(a => a.tipo !== 'pocion'); d.arcanos.push(arc(pi.nombre, 'pocion', 'int', 'Descripción breve.')); });
  assert.deepEqual(r.manual, []);
  assert.match(spoilerDe(r.codigo, r.codigo.indexOf(pi.nombre)) ?? '', /POCIONES/, 'dentro del desplegable de pociones');
  assert.deepEqual(balance(r.codigo), balance(MORTIMER));
});
test('las líneas nuevas copian el formato de sus hermanas («✦ [b]…[/b]»)', () => {
  const r = canje(d => {
    d.trasfondos.push(new Trasfondo({ tipo: 'Influencia', categoria: 'Sociedad', especifico: 'Prensa', nivel: 1 }));
    d.idiomas.push({ nombre: 'Alemán', nivel: 'Bajo', nota: '' });
    d.talentos.push({ nombre: 'Ataque Rápido', nota: '' });
  });
  assert.deepEqual(r.manual, []);
  assert.match(r.codigo, /\n✦ \[b\]Influencia — Sociedad — Prensa I\[\/b\](?:\n|\[\/spoiler\])/);
  assert.match(r.codigo, /\n✦ \[b\]Alemán — Bajo\[\/b\]/);
  assert.match(r.codigo, /\n✦ \[b\]Ataque Rápido\[\/b\]/);
});
test('quitar un ritual con «|» (R05) y un trasfondo', () => {
  const ritual = ANTES.arcanos.find(a => a.nombre.includes('|'));
  const r = canje(d => { d.arcanos = d.arcanos.filter(a => a.nombre !== ritual.nombre); d.trasfondos.pop(); });
  assert.deepEqual(r.manual, []);
  assert.ok(!r.codigo.includes(ritual.nombre));
  assert.equal(r.leida.arcanos.length, ANTES.arcanos.length - 1);
  assert.equal(r.leida.trasfondos.length, ANTES.trasfondos.length - 1);
  assert.deepEqual(balance(r.codigo), balance(MORTIMER));
});

test('atributos, habilidades, puntos de destino y combate: idéntico al editor antiguo', () => {
  const r = canje(d => { d.atributos.Destreza += 1; d.habilidades.Pociones = Math.min(5, d.habilidades.Pociones + 1); d.presentacion.pd += 1; });
  P.w.__t = MORTIMER;
  const base = P.ficha('parseFichaForo(window.__t).ficha');
  const cur = JSON.parse(JSON.stringify(base)); cur.attrs.Destreza += 1; cur.skills.Pociones = Math.min(5, cur.skills.Pociones + 1); cur.extra.pd += 1;
  P.w.__b = base; P.w.__c = cur;
  const antiguo = P.ficha('actualizarCodigo(window.__t, window.__b, window.__c)');
  assert.equal(r.codigo, antiguo.code);
  assert.deepEqual(r.manual, []);
  assert.equal(r.leida.atributos.Destreza, ANTES.atributos.Destreza + 1);
  assert.equal(r.leida.presentacion.pd, ANTES.presentacion.pd + 1);
});
test('F04/F07: en una ficha de cinco partes cada cambio va a SU mensaje', () => {
  const IRVIN = JSON.parse(readFileSync(new URL('../fixtures/fichas/varias-partes.json', import.meta.url), 'utf8'));
  const antes = L.leer(IRVIN.partes, { tema: IRVIN.tema }).ficha;
  const d = copia(antes);
  d.trasfondos.push(new Trasfondo({ tipo: 'Biblioteca', categoria: 'Política', especifico: 'Ley mágica', nivel: 2 }));
  d.trasfondos.find(t => t.tipo === 'Biblioteca' && t.nivel === 5).nivel = 6;
  d.idiomas.push({ nombre: 'Alemán', nivel: 'Bajo', nota: '' });
  d.atributos.Vigor += 1;
  const r = E.aplicar(antes, d, { tema: IRVIN.tema });
  // esta ficha de prueba no tiene bloque de combate: el editor lo dice en vez de darlo por hecho
  assert.deepEqual(r.manual, ['Combate: no encontré el bloque «▋ Combate» para recalcularlo']);
  const cambiados = r.partes.filter(p => p.antes !== p.despues).map(p => p.post);
  assert.deepEqual(cambiados, [339214, 339216, 339217], 'atributos, trasfondos e idiomas; datos y magia sin tocar');
  const t = r.partes.find(p => p.post === 339216).despues;
  assert.match(t, /→ Biblioteca II: Política > Ley mágica\./, 'con el formato de la ficha («Tipo NIVEL: …»)');
  assert.match(t, /→ Biblioteca VI: Arcanismo\./);
});
test('sin cambios, el código no se toca', () => {
  const r = canje(() => {});
  assert.equal(r.codigo, MORTIMER);
  assert.deepEqual([r.hechos, r.manual], [[], []]);
});
test('lo que no se puede hacer va a «a mano» y no se da por hecho', () => {
  const r = canje(d => { d.arcanos.push(new Arcano({ nombre: 'Algo legendario', tipo: 'hechizo', nivel: 'leg' })); });
  assert.ok(r.manual.some(m => m.includes('Algo legendario')));
  assert.ok(!r.hechos.some(h => h.includes('Algo legendario')));
  assert.equal(r.codigo, MORTIMER, 'si no se pudo, el código queda como estaba');
});
