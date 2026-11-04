// N07 (0.5.3): el «Código para el foro» de Mi Ficha (modo «Personalizada») con el editor nuevo (js/pam/EditorPam.js).
// PAM de verdad en jsdom, con la ficha real de Mortimer importada con su código, dos veces: con el editor nuevo
// (window.PAM_EDITOR, como lo deja js/pam/arranque.js) y sin él (el «Personalizada» antiguo). Se comprueba:
//   · lo que el antiguo ya hacía bien (atributos, habilidades, combate, datos) da el mismo código;
//   · lo que hacía mal: líneas nuevas fuera de su desplegable (R01), cierres que se van al quitar (R02), orden (R03);
//   · lo que dejaba «a mano»: idiomas y trasfondos nuevos (R06);
//   · desde 0.7.0 el antiguo ya no está en PAM (sigue en la copia congelada, para comparar): si el editor nuevo falla,
//     el código queda como estaba y se avisa.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { pamEntero } from '../legado/montarPam.mjs';
import { abrir } from '../legado/abrirPam.mjs';
import { crearEditorPam } from '../../js/pam/EditorPam.js';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { balance } from '../../js/bbcode/Etiquetas.js';

const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const sistema = new Sistema(json('sistema.json')), compendio = new Compendio(json('arcanos.json')), lector = new LectorFicha(sistema, compendio);
const MORTIMER = readFileSync(new URL('../fixtures/fichas/mortimer-compacta.bbcode', import.meta.url), 'utf8');
const MARCA = "setTab(ui.tab||'empleos');";
const abiertas = [];
after(() => abiertas.forEach(w => { try { w.close(); } catch { /* ya cerrada */ } }));

/** PAM con Mortimer importado con su código; `editor`: con el editor nuevo o sin él. */
function pam(editor) {
  const html = pamEntero().replace(/<script type="module"[^>]*><\/script>/g, '').replace(MARCA, MARCA + '\nwindow.__ficha = s => eval(s);');
  const dom = new JSDOM(html, {
    url: 'https://jesleytherabbit-prog.github.io/PAM/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: new VirtualConsole(),
    beforeParse(w) {
      w.fetch = () => Promise.reject(new Error('sin red'));
      if (w.HTMLDialogElement) { w.HTMLDialogElement.prototype.showModal = function () {}; w.HTMLDialogElement.prototype.close = function () {}; }
      w.scrollTo = () => {}; w.requestAnimationFrame = () => 0; w.confirm = () => true;
      const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
      w.HTMLCanvasElement.prototype.getContext = () => ctx;
      if (editor) w.PAM_EDITOR = editor;
    }
  });
  const w = dom.window; abiertas.push(w);
  w.pamFicha.importar(MORTIMER, 'Mortimer Gaunt');
  return { w, cambiar: js => w.__ficha(js + '; 1'), codigo: () => JSON.parse(JSON.stringify(w.pamFicha.codigoPersonal())) };
}
const nuevo = () => pam(crearEditorPam({ sistema, compendio, lector }));
const viejo = () => pam(null);
const leer = code => lector.leer([{ post: 1, bbcode: code }]).ficha;
const linea = (code, re) => code.split('\n').findIndex(l => re.test(l));

test('lo que ya funcionaba da el mismo código: atributo, habilidad, combate y datos', () => {
  const cambio = 'ficha.attrs.Vigor = Number(ficha.attrs.Vigor) + 1; ficha.skills.Sigilo = 3; ficha.d.edad = "34"';
  const n = nuevo(), v = viejo();
  n.cambiar(cambio); v.cambiar(cambio);
  const cn = n.codigo(), cv = v.codigo();
  assert.equal(cn.codigo, cv.codigo);
  assert.match(cn.codigo, /▋ Edad:\[\/color\] 34/);
  assert.match(cn.hechos, /Combate/, 'el combate, recalculado: ' + cn.hechos);
  assert.deepEqual(cn.manual, []);
});

test('R01 y R03: dos hechizos nuevos van dentro de HECHIZOS, en BÁSICOS y en orden', () => {
  const ya = new Set(leer(MORTIMER).arcanos.map(a => a.nombre));
  const [a, b] = json('arcanos.json').filter(x => x.fuente === 'Hechizos' && x.nivel === 'Básico' && x.origen === 'Oficial' && !ya.has(x.nombre)).map(x => x.nombre).slice(0, 2);
  const n = nuevo();
  n.cambiar(`ficha.arcanos.push({type:"hechizo",tier:"bas",name:${JSON.stringify(a)},nota:""},{type:"hechizo",tier:"bas",name:${JSON.stringify(b)},nota:""})`);
  const { codigo, manual } = n.codigo();
  assert.deepEqual(manual, []);
  assert.deepEqual(balance(codigo), balance(MORTIMER));
  const r = leer(codigo);
  for (const x of [a, b]) assert.ok(r.arcanos.some(y => y.nombre === x && y.tipo === 'hechizo' && y.nivel === 'bas'), x);
  const ia = linea(codigo, new RegExp('\\[b\\]' + a + '\\[/b\\]')), ib = linea(codigo, new RegExp('\\[b\\]' + b + '\\[/b\\]'));
  assert.ok(ia > linea(codigo, /^\[b\]BÁSICOS\[\/b\]/) && ib < linea(codigo, /^\[b\]INTERMEDIOS\[\/b\]/) && ia < ib, `${ia} ${ib}`);
});

test('R01: una poción nueva tras la última de su lista (la que cierra el desplegable) queda dentro', () => {
  const ya = new Set(leer(MORTIMER).arcanos.map(a => a.nombre));
  const p = json('arcanos.json').find(x => x.fuente === 'Pociones' && x.nivel === 'Básica' && x.origen === 'Oficial' && !ya.has(x.nombre) && x.nombre > 'Solución animadora').nombre;
  const n = nuevo();
  n.cambiar(`ficha.arcanos.push({type:"pocion",tier:"bas",name:${JSON.stringify(p)},nota:""})`);
  const { codigo } = n.codigo();
  assert.deepEqual(balance(codigo), balance(MORTIMER));
  assert.match(codigo, new RegExp('\\[spoiler=POCIONES\\]\\[b\\]BÁSICAS\\[/b\\]\\n✦ \\[b\\]Solución animadora\\[/b\\][^\\n]*\\n✦ \\[b\\]' + p + '\\[/b\\][^\\n]*\\[/spoiler\\]'));
  assert.ok(leer(codigo).arcanos.some(a => a.nombre === p && a.tipo === 'pocion'));
});

test('R02: quitar el último trasfondo de la lista no se lleva el cierre del desplegable', () => {
  const n = nuevo();
  n.cambiar('ficha.bgs = ficha.bgs.filter(b => !(b.t === "Informantes" && /Acad/.test(b.c)))');
  const { codigo, manual } = n.codigo();
  assert.deepEqual(manual, []);
  assert.deepEqual(balance(codigo), balance(MORTIMER));
  assert.match(codigo, /Informantes — Política — Ministerio de Magia I\[\/b\]\[\/spoiler\]\n\[spoiler=VENTAJAS\]/);
  assert.ok(!leer(codigo).trasfondos.some(t => /Magizo.logos/.test(t.especifico + t.categoria) && t.tipo === 'Informantes'));
});

test('R06: un idioma nuevo, que el antiguo dejaba «a mano», va dentro de IDIOMAS', () => {
  const n = nuevo(), v = viejo();
  const cambio = 'ficha.idiomas.push({n:"Alemán", nivel:"Bajo", nota:""})';
  n.cambiar(cambio); v.cambiar(cambio);
  assert.ok(v.codigo().manual.some(m => /Idioma Alemán/.test(m)), 'el antiguo no lo hacía');
  const { codigo, manual } = n.codigo();
  assert.deepEqual(manual, []);
  assert.match(codigo, /\[spoiler=IDIOMAS\][^\n]*\n✦ \[b\]Francés — Alto\[\/b\]\n✦ \[b\]Alemán — Bajo\[\/b\]\[\/spoiler\]/);
});

test('sin cambios: el código es el guardado y no dice que haya hecho nada', () => {
  const { codigo, hechos, manual } = nuevo().codigo();
  assert.equal(codigo, MORTIMER);
  assert.equal(hechos, '');
  assert.deepEqual(manual, []);
});

test('0.7.0: ya no está el «Personalizada» antiguo; si el editor nuevo falla o no está, el código queda igual y se avisa', async () => {
  // con el Mi Ficha de ahora (módulos, js/paginas/revisor/Revisor.js), no con la copia congelada
  const { w } = await abrir('archivos', { antes: x => { x.confirm = () => true; x.alert = () => {}; } });
  abiertas.push(w);
  w.console.warn = () => {};
  w.pamFicha.importar(MORTIMER, 'Mortimer Gaunt');
  assert.equal(typeof w.PAM_EDITOR?.actualizar, 'function', 'lo deja js/pam/arranque.js');
  for (const editor of [{ actualizar() { throw new Error('roto'); } }, undefined]) {
    w.PAM_EDITOR = editor;
    const { codigo, manual } = w.pamFicha.codigoPersonal();
    assert.equal(codigo, MORTIMER);
    assert.match(manual.join(' '), /No pude actualizar tu código: queda como estaba/);
  }
});

test('la pestaña «Código para el foro» enseña lo del editor nuevo', () => {
  const n = nuevo();
  n.cambiar('ficha.idiomas.push({n:"Alemán", nivel:"Bajo", nota:""})');
  n.w.reSetTab('ficha'); n.cambiar('fichaTab = "codigo"; renderFicha()');
  const ta = n.w.document.querySelector('[data-fc-out="0"]');
  assert.ok(ta, 'la pestaña con el código');
  assert.match(ta.value, /Alemán — Bajo/);
  assert.match(n.w.document.querySelector('.fc-ok').textContent, /Actualizado: .*idioma Alemán/);
});
