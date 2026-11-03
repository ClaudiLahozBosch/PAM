// Leer una ficha del foro de principio a fin con un agente de prueba que sirve páginas guardadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { Personaje } from '../../js/modelos/Personaje.js';
import { Ficha } from '../../js/modelos/Ficha.js';
import { leerFichaDelForo, asociarPersonaje } from '../../js/servicios/FichaDelForo.js';

const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const lector = new LectorFicha(new Sistema(json('sistema.json')), new Compendio(json('arcanos.json')));
const { window: W } = new JSDOM('');
globalThis.DOMParser = W.DOMParser;
const TEMA = readFileSync(new URL('../fixtures/foro/tema-ficha.html', import.meta.url), 'utf8');
const editar = codigo => `<form name="post"><textarea name="message">${codigo.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea></form>`;

/** Agente de prueba: sirve el tema y, para editar mensajes, un BBCode distinto del HTML (para saber cuál se usó). */
function agente({ editarFalla = false } = {}) {
  const pedidas = [];
  return {
    pedidas,
    async leer(ruta) {
      pedidas.push(ruta);
      if (ruta === '/t23113-') return new W.DOMParser().parseFromString(TEMA, 'text/html');
      const m = ruta.match(/^\/post\?p=(\d+)&mode=editpost$/);
      if (m) {
        if (editarFalla) throw new Error('403');
        const codigos = { 339216: '[spoiler=TRASFONDOS]→ Biblioteca VI: Arcanismo > Artes Oscuras.[/spoiler]', 339214: '▋ Atributos:\n→ Vigor: +2\n[color=#6B62AE]▋ Puntos de Destino:[/color] [b]13[/b]' };
        return new W.DOMParser().parseFromString(editar(codigos[m[1]] ?? '(parte)'), 'text/html');
      }
      throw new Error('ruta no prevista: ' + ruta);
    }
  };
}

test('ficha ajena: lee las cinco partes con el HTML publicado (como el Inspector)', async () => {
  const a = agente();
  const r = await leerFichaDelForo(a, 'https://hp-avada-kedavra.foroactivo.com/t23113-irvin-giles#337672', { lector, cuentaId: 999 });
  assert.equal(r.tema, 23113);
  assert.equal(r.propia, false);
  assert.equal(a.pedidas[0], '/t23113-');
  assert.ok(!a.pedidas.some(r => r.includes('editpost')), 'no intenta editar mensajes ajenos');
  assert.ok(a.pedidas.includes('/t23113p30-irvin-giles'), 'lee también la última página (para saber si está revisada, como Mi PJ)');
  assert.deepEqual(r.ficha.partes.map(p => [p.post, p.seccion]), [[337672, 'html'], [339214, 'html'], [339215, 'html'], [339216, 'html'], [339217, 'html']]);
  assert.deepEqual(r.historial, [373284, 402093]);
  assert.equal(r.ficha.presentacion.pd, 13, 'el 14 de la actualización posterior no se mezcla (F05)');
  const bib = r.ficha.trasfondos.find(t => t.tipo === 'Biblioteca');
  assert.deepEqual([bib.nivel, bib.categoria, bib.origen.post], [5, 'Arcanismo', 339216]);
  assert.equal(r.ficha.trasfondos.filter(t => t.nivel === 6).length, 0, 'el VI solo está en la actualización');
});
test('ficha propia: usa el BBCode original de cada parte', async () => {
  const a = agente();
  const r = await leerFichaDelForo(a, '/t23113-irvin-giles', { lector, cuentaId: 5203 });
  assert.equal(r.propia, true);
  assert.equal(a.pedidas.filter(x => x.includes('editpost')).length, 5);
  assert.ok(r.ficha.partes.every(p => p.seccion === 'bbcode'));
  assert.equal(r.ficha.trasfondos.find(t => t.tipo === 'Biblioteca').nivel, 6, 'del BBCode, no del HTML');
});
test('ficha propia sin permiso para editar: se queda con el HTML', async () => {
  const r = await leerFichaDelForo(agente({ editarFalla: true }), '/t23113-x', { lector, cuentaId: 5203 });
  assert.ok(r.ficha.partes.every(p => p.seccion === 'html'));
  await assert.rejects(leerFichaDelForo(agente(), '/u5203', { lector }), /no válido/);
});

test('asociar: por tema, sugerido por nombre o nuevo; nunca el de otro tema (F03)', () => {
  const foro = 'hp-avada-kedavra.foroactivo.com';
  const pj = (id, nombre, tema = null) => { const p = new Personaje({ id, ficha: new Ficha({ nombre }) }); if (tema) p.vincular(foro, tema); return p; };
  const lista = [pj('a', 'Irvin Giles'), pj('b', 'Mortimer Gaunt', 37969), pj('c', 'Irvin Giles', 99)];
  assert.equal(asociarPersonaje(lista, { foro, tema: 37969, nombre: 'Otro nombre' }).personaje.id, 'b', 'por tema aunque cambie el nombre');
  const s = asociarPersonaje(lista, { foro, tema: 23113, nombre: 'Irvin Giles.' });
  assert.deepEqual([s.tipo, s.personaje.id], ['sugerido', 'a'], 'el «c» se llama igual pero ya es de otro tema');
  assert.equal(asociarPersonaje(lista, { foro, tema: 1, nombre: 'Nadie' }).tipo, 'nuevo');
});
