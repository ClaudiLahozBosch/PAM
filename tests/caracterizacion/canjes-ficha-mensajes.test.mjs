// N07 (0.5.2): «Aplicar el canje» edita la ficha del foro con el editor por mensajes, no con el código «Personalizada»
// entero en el primer mensaje. Con la ficha inventada de cinco mensajes (fixtures/fichas/varias-partes.json):
//   · solo se editan los mensajes donde está lo que cambia (F04/F07);
//   · las líneas nuevas quedan dentro de su desplegable (R01) y en orden (R03);
//   · lo que se editó en el foro después de importar la ficha a PAM no se pisa;
//   · un reintento no repite nada;
//   · las peticiones preparadas antes (código «Personalizada») se siguen aplicando como entonces (canjes-aplicar.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { crearCanjesDelForo } from '../../js/servicios/CanjesDelForo.js';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { cambiosDeCanje, aplicarCanje, recorte } from '../../js/reglas/CambiosFicha.js';
import { balance } from '../../js/bbcode/Etiquetas.js';
import { paginaDe } from '../fixtures/actividad/foro.mjs';
import { registroDePrueba, editar } from '../fixtures/canjes/registro.mjs';

const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const foros = json('foros.json').foros;
const sistema = new Sistema(json('sistema.json')), compendio = new Compendio(json('arcanos.json')), lector = new LectorFicha(sistema, compendio);
const FICHA = JSON.parse(readFileSync(new URL('../fixtures/fichas/varias-partes.json', import.meta.url), 'utf8'));
const HOST = 'hp-avada-kedavra.foroactivo.com', FORO = 'https://' + HOST;
const CUENTA = { id: 5203, nombre: 'Irvin Giles' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const { window: w } = new JSDOM('');

/** El foro de los canjes con la ficha de cinco mensajes de Irvin en el tema 300. */
function foro(partes = FICHA.partes) {
  const P = registroDePrueba();
  P['/t300-ficha-de-irvin-giles'] = `<!doctype html><html><body><h1 class="page-title"><a href="/t300-ficha-de-irvin-giles">Ficha de Irvin Giles</a></h1><div class="pagination"></div>
${partes.map(p => `<div class="post" id="p${p.post}"><p class="author">por <a href="/u${CUENTA.id}">Irvin Giles</a> Lun 2 Mar 2026 - 10:00</p><div class="content">${esc(p.bbcode).replace(/\n/g, '<br>')}</div></div>`).join('\n')}
</body></html>`;
  for (const p of partes) P['/post?p=' + p.post + '&mode=editpost'] = editar(p.bbcode, p.post);
  return P;
}
function servicio(P) {
  const agente = {
    async leer(ruta) { const html = paginaDe(P, ruta); if (html == null) throw new Error('HTTP 404 en ' + ruta); return new w.DOMParser().parseFromString(html, 'text/html'); },
    leerDato: async () => null, guardarDato: async () => ({ guardado: true }), puerta: async () => { throw new Error('no se usa'); }
  };
  const mem = new Map();
  return crearCanjesDelForo(agente, { foroHost: HOST, cuenta: CUENTA, cfg: foros[HOST], memoria: { gv: (k, d) => (mem.has(k) ? JSON.parse(mem.get(k)) : d), sv: (k, v) => mem.set(k, JSON.stringify(v)) }, ficha: { sistema, compendio, lector } });
}

// Lo que tenía PAM: la ficha importada del foro y, con el carrito pasado, esta:
const fichaForo = lector.leer(FICHA.partes, { tema: 300 }).ficha;
const ANTES = fichaForo.aLegado(sistema);
const DESPUES = structuredClone(ANTES);
DESPUES.attrs.Vigor = 3;                                                      // mensaje 2
DESPUES.skills[Object.keys(DESPUES.skills).find(k => /sigilo/i.test(k))] = 2;  // mensaje 2
DESPUES.arcanos.push({ type: 'hechizo', tier: 'bas', name: 'Alohomora', nota: '' }, { type: 'hechizo', tier: 'bas', name: 'Aparecium', nota: '' }); // mensaje 3
DESPUES.bgs.find(b => b.t === 'Informantes').v = 4;                           // mensaje 4
DESPUES.idiomas.find(i => /franc/i.test(i.n)).nivel = 'Alto';                  // mensaje 5
DESPUES.desc = { ...(DESPUES.desc || {}), historia: 'Un texto cambiado en PAM que NO tiene que ir al foro' };

const PET = {
  post: '9600', enlace: FORO + '/viewtopic?p=9600#9600', creado: '2026-11-02T09:00:00.000Z', fecha: '', pj: 'Irvin Giles', gastadas: 500, estado: 'aprobada', descartadas: [],
  aprobacion: { post: '9603', enlace: FORO + '/viewtopic?p=9603#9603', autor: 'Cora Blest', fecha: 'Lun 2 Nov 2026 - 12:00', clase: 'aprobada', importe: null, confirmada: true },
  boveda: { numeros: { iniciales: 2500, actuales: 2000, totales: 5500 }, divisor: '✦', html: 'Grageas iniciales: 2500\nGrageas que se añaden/quitan: -500\nGrageas actuales: 2000\nGrageas totales: 5500\n{Enlaces»' },
  cambiosFicha: cambiosDeCanje(ANTES, DESPUES)
};
const datos = { pj: 'Irvin Giles', ficha: { url: FORO + '/t300-' }, boveda: { url: FORO + '/t301-', titulo: 'Bóveda de Irvin Giles', act: 2500 } };
const fichaDe = a => a.pasos.filter(p => p.tipo === 'editar' && /^ficha/.test(p.descripcion || ''));

let primera;
test('solo se editan los mensajes donde está lo que cambia', async () => {
  primera = await servicio(foro()).accionAplicarCanje(structuredClone(PET), datos);
  const f = fichaDe(primera);
  assert.deepEqual(f.map(p => p.post), [339214, 339215, 339216, 339217], 'el primero (datos y descripción) no se toca');
  assert.deepEqual(f.map(p => p.descripcion.replace(/ \(.*$/, '')), ['ficha, mensaje 2 de 5', 'ficha, mensaje 3 de 5', 'ficha, mensaje 4 de 5', 'ficha, mensaje 5 de 5']);
  assert.equal(primera.pasos[1].tipo, 'publicar', 'el movimiento sigue siendo el paso 2 («enlace del paso 2»)');
  assert.match(primera.pasos[primera.pasos.length - 1].texto, /«enlace del paso 2»/, 'y el aviso, el último');
  for (const p of f) {
    assert.equal(p.original, FICHA.partes.find(x => x.post === p.post).bbcode, 'sobre el texto de ahora');
    assert.deepEqual(balance(p.nuevo), balance(p.original), 'sin descuadrar etiquetas');
  }
  // la ficha inventada no tiene bloque «▋ Combate» (las de verdad sí): es lo único que queda para hacer a mano
  assert.deepEqual(primera.avisos.map(x => x.replace(/^.*: (?=Combate)/, '')), ['Combate: no encontré el bloque «▋ Combate» para recalcularlo.'], String(primera.avisos));
  assert.match(primera.explicacion, /solo los mensajes donde está lo que cambia/);
});

test('cada cosa queda bien: niveles cambiados y líneas nuevas dentro de su desplegable, en orden', () => {
  const nuevo = post => fichaDe(primera).find(p => p.post === post).nuevo;
  assert.match(nuevo(339214), /→ Vigor:\[\/color\] \+3/);
  assert.match(nuevo(339214), /→ Sigilo:\[\/color\] Competente \(\+2\)/);
  // R01 y R03: dentro de HECHIZOS, en BÁSICOS, en orden alfabético como los demás, con el formato de sus hermanos
  assert.match(nuevo(339215), /BÁSICOS\n✦ \[b\]Alohomora\[\/b\]: [^\n]+\n✦ \[b\]Aparecium\[\/b\]: [^\n]+\n✦ \[b\]Expelliarmus\[\/b\]: desarma\.\n✦ \[b\]Incendio\[\/b\]: fuego\.\[\/spoiler\]\n\[spoiler=POCIONES\]/);
  assert.match(nuevo(339216), /→ Informantes IV: Contrabandistas \(Zacharias Hayes\)\./);
  assert.match(nuevo(339217), /Francés — Alto\[\/spoiler\]/);
  // y releída, la ficha entera es la de PAM en todo lo del canje
  const r = lector.leer(FICHA.partes.map(p => ({ post: p.post, bbcode: fichaDe(primera).find(x => x.post === p.post)?.nuevo ?? p.bbcode })), { tema: 300 }).ficha;
  assert.equal(r.atributos.Vigor, 3);
  assert.ok(r.arcanos.some(a => a.nombre === 'Alohomora') && r.arcanos.some(a => a.nombre === 'Aparecium'));
  assert.equal(r.descripcion.historia, fichaForo.descripcion.historia, 'la historia de PAM no va al foro');
});

test('lo que se cambió en el foro después de importar la ficha a PAM no se pisa', async () => {
  const partes = structuredClone(FICHA.partes);
  partes[1].bbcode = partes[1].bbcode.replace('→ Destreza:[/color] +3', '→ Destreza:[/color] +4'); // subida hecha en el foro, que PAM no sabe
  partes[3].bbcode += '\n[spoiler=NOTAS]Una nota nueva del foro[/spoiler]';
  const a = await servicio(foro(partes)).accionAplicarCanje(structuredClone(PET), datos);
  const m2 = fichaDe(a).find(p => p.post === 339214).nuevo, m4 = fichaDe(a).find(p => p.post === 339216).nuevo;
  assert.match(m2, /→ Destreza:\[\/color\] \+4/);
  assert.match(m2, /→ Vigor:\[\/color\] \+3/);
  assert.match(m4, /Una nota nueva del foro/);
  assert.match(m4, /Informantes IV/);
});

test('reintento: con la ficha ya cambiada, el paso de la ficha sale «ya está igual»', async () => {
  const hechas = FICHA.partes.map(p => ({ post: p.post, bbcode: fichaDe(primera).find(x => x.post === p.post)?.nuevo ?? p.bbcode }));
  const a = await servicio(foro(hechas)).accionAplicarCanje(structuredClone(PET), datos);
  const f = fichaDe(a);
  assert.equal(f.length, 1);
  assert.equal(f[0].igual, 'Tu ficha ya tiene estos canjes.');
  assert.equal(f[0].original, f[0].nuevo);
});

test('lo que no se puede hacer solo va a los avisos, con su nombre', async () => {
  const D = structuredClone(DESPUES);
  D.vinculos = [...(D.vinculos || []), { tipo: 'Lazo', pj: 'Cora Blest', nota: '' }];
  const a = await servicio(foro()).accionAplicarCanje({ ...structuredClone(PET), cambiosFicha: cambiosDeCanje(ANTES, D) }, datos);
  assert.ok(a.avisos.some(x => /no se pudo cambiar solo.*Lazo con Cora Blest: agregalo a mano/.test(x)), String(a.avisos));
});

test('si no puede leer el código de todos los mensajes, no toca nada', async () => {
  const P = foro();
  delete P['/post?p=339216&mode=editpost'];
  await assert.rejects(servicio(P).accionAplicarCanje(structuredClone(PET), datos), /No pude leer el código de todos los mensajes de tu ficha/);
});

test('con la ficha real de Mortimer (un mensaje, con «▋ Combate»): todo solo, y el combate recalculado', async () => {
  const bb = readFileSync(new URL('../fixtures/fichas/mortimer-compacta.bbcode', import.meta.url), 'utf8');
  const partes = [{ post: 9800, bbcode: bb }];
  const f = lector.leer(partes, { tema: 300 }).ficha;
  const A = f.aLegado(sistema), D = structuredClone(A);
  D.attrs.Vigor = Number(D.attrs.Vigor) + 1;
  const hab = Object.keys(D.skills).find(k => Number(D.skills[k]) > 0 && Number(D.skills[k]) < 5); D.skills[hab] = Number(D.skills[hab]) + 1;
  const ya = new Set(A.arcanos.map(a => a.name));
  const nuevo = json('arcanos.json').find(x => x.fuente === 'Hechizos' && x.nivel === 'Básico' && x.origen === 'Oficial' && !ya.has(x.nombre));
  D.arcanos.push({ type: 'hechizo', tier: 'bas', name: nuevo.nombre, nota: '' });
  const a = await servicio(foro(partes)).accionAplicarCanje({ ...structuredClone(PET), cambiosFicha: cambiosDeCanje(A, D) }, datos);
  assert.deepEqual(a.avisos, [], String(a.avisos));
  const [p] = fichaDe(a);
  assert.equal(p.post, 9800);
  assert.deepEqual(balance(p.nuevo), balance(bb));
  const r = lector.leer([{ post: 9800, bbcode: p.nuevo }], { tema: 300 }).ficha;
  assert.equal(r.atributos.Vigor, f.atributos.Vigor + 1);
  assert.ok(r.arcanos.some(x => x.nombre === nuevo.nombre), nuevo.nombre);
  assert.match(p.descripcion, /Combate/, 'el combate, recalculado: ' + p.descripcion);
});

test('aplicarCanje: un canje solo sube; lo que ya está no se repite', () => {
  const r1 = aplicarCanje(fichaForo, PET.cambiosFicha, { sistema, compendio });
  assert.equal(r1.despues.atributos.Vigor, 3);
  const r2 = aplicarCanje(r1.despues, PET.cambiosFicha, { sistema, compendio });
  assert.equal(r2.despues.arcanos.length, r1.despues.arcanos.length, 'no añade dos veces');
  // si el foro ya tiene más, se queda con lo del foro
  const alto = structuredClone(JSON.parse(JSON.stringify(fichaForo))); alto.atributos.Vigor = 5;
  const r3 = aplicarCanje(new (fichaForo.constructor)(alto), PET.cambiosFicha, { sistema, compendio });
  assert.equal(r3.despues.atributos.Vigor, 5);
  assert.deepEqual(r3.comprobar(r3.despues), []);
});

test('recorte: sin descripciones, historia ni empleos (lo que viaja en la petición)', () => {
  const r = recorte(DESPUES);
  assert.equal(r.desc, undefined);
  assert.equal(r.jobState, undefined);
  assert.equal(r.attrs.Vigor, 3);
  assert.ok(JSON.stringify(r).length < JSON.stringify(DESPUES).length);
});
