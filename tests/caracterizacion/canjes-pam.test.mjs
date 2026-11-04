// Los canjes dentro de PAM (fase 6b·1): «Preparar el canje» y el cierre, con el PAM de verdad (index.html en jsdom).
// El Mi PJ antiguo y el código nuevo (js/pam/) trabajan con los mismos datos en dos copias de PAM, y tienen que:
//   · enseñar la misma pastilla y la misma puerta;
//   · dejar PAM igual (la ficha con el carrito, el movimiento preparado en la Bóveda);
//   · guardar la misma petición para el foro.
// La diferencia: el antiguo pulsaba botones de PAM y leía su pantalla; el nuevo usa pamFicha y rrBoveda.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pamEntero } from '../legado/montarPam.mjs';
import { JSDOM, VirtualConsole } from 'jsdom';

const RAIZ = new URL('../../', import.meta.url);
const VIEJO = readFileSync(new URL('pam-mi-pj.user.js', RAIZ), 'utf8');
const MORTIMER = readFileSync(new URL('tests/fixtures/fichas/mortimer-compacta.bbcode', RAIZ), 'utf8');
const FOROS = JSON.parse(readFileSync(new URL('data/foros.json', RAIZ), 'utf8')).foros;
const FORO = 'hp-avada-kedavra.foroactivo.com';
const PJ = 'Mortimer Gaunt';
const espera = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (fn, ms = 15000) => { for (let t = 0; t < ms && !fn(); t += 50) await espera(50); return fn(); };

/** Una copia de PAM (index.html) con un personaje, su bóveda y un carrito; `gm` es el almacén del script. */
function pam(gm) {
  const html = pamEntero().replace(/<script type="module"[^>]*><\/script>/, ''); // lo nuevo se carga a mano
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, {
    url: 'https://jesleytherabbit-prog.github.io/PAM/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = () => Promise.reject(new Error('sin red'));
      if (w.HTMLDialogElement) { w.HTMLDialogElement.prototype.showModal = function () {}; w.HTMLDialogElement.prototype.close = function () {}; }
      w.scrollTo = () => {}; w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
      w.HTMLCanvasElement.prototype.getContext = () => ctx;
      w.requestAnimationFrame = () => 0;
      w.confirm = () => true;
    }
  });
  const w = dom.window;
  abiertas.push(w);
  // el personaje (con su código del foro: modelo «Personalizada»), su bóveda y el carrito
  w.pamFicha.importar(MORTIMER, PJ);
  w.rrSync();
  const id = w.pamFicha.buscar(PJ).id;
  w.rrBoveda.set(id, { ini: 1000, tot: 5000, act: 1000 });
  w.eval(`addToCart("ESTADÍSTICAS", "Vigor: 2 → 3 — 300 grageas", 300, 0, null, {kind:"stat", name:"Vigor", from:2, to:3}); state.statsBase.Vigor = 3;
    document.getElementById("inpDisponibles").value = 1000; document.getElementById("inpDisponibles").dispatchEvent(new Event("input", {bubbles:true})); renderAll();`);
  w.GM_getValue = (k, d) => (k in gm ? gm[k] : d); w.GM_setValue = (k, v) => { gm[k] = JSON.parse(JSON.stringify(v)); }; w.GM_listValues = () => Object.keys(gm);
  w.unsafeWindow = w;
  return { w, id };
}
const abiertas = [];
after(() => abiertas.forEach(w => { try { w.close(); } catch (e) { /* ya cerrada */ } }));
const paquete = () => ({ v: 1, creado: new Date().toISOString(), foro: FORO, cuenta: { id: 5203, nombre: 'Irvin Giles', foro: FORO }, pj: PJ, usado: { fecha: new Date().toISOString(), canalOficial: true } });

/** PAM con el Mi PJ antiguo. */
async function conAntiguo(gmExtra = {}, antes = null) {
  const gm = { 'pam.paquete': paquete(), ...gmExtra };
  const P = pam(gm);
  if (antes) antes(P);
  await espera(900); // PAM guarda la Bóveda en el navegador con 0,7 s de retraso, y el antiguo la lee de ahí
  P.w.eval(VIEJO);
  await hasta(() => P.w.document.querySelector('#esc-pam .pill'));
  return { ...P, gm };
}
/** PAM con lo nuevo (js/pam/) y un agente de mentira con el mismo almacén. */
async function conNuevo(gmExtra = {}, antes = null) {
  const gm = { 'pam.paquete': paquete(), ...gmExtra };
  const P = pam(gm);
  if (antes) antes(P);
  const { crearControladorForo } = await import('../../js/pam/ControladorForo.js');
  const { crearPamActual } = await import('../../js/pam/PamActual.js');
  const agente = { leerDato: async k => (k in gm ? JSON.parse(JSON.stringify(gm[k])) : null), guardarDato: async (k, v) => { gm[k] = JSON.parse(JSON.stringify(v)); } };
  const ctl = crearControladorForo({ agente, pam: crearPamActual(P.w), doc: P.w.document, foros: FOROS });
  await ctl.canjes.pintar();
  return { ...P, gm, ctl };
}
const clic = (w, sel, texto) => { const b = [...w.document.querySelectorAll(sel)].find(x => !texto || x.textContent === texto); assert.ok(b, `${sel} «${texto}»`); b.click(); };
/** Igual, y si no, dónde empieza la diferencia. */
const mismoHtml = (a, b) => { if (a === b) return; let i = 0; while (a[i] === b[i]) i++; assert.fail(`difieren en ${i}:
 nuevo: …${a.slice(Math.max(0, i - 60), i + 160)}
 viejo: …${b.slice(Math.max(0, i - 60), i + 160)}`); };
const sinFechas = s => s.replace(/\(\d{1,2}\/\d{1,2}\/\d{4}[^)]*\)/g, '(fecha)');

let viejo, nuevo;
test('la pastilla «Mi PJ» de PAM y la tarjeta de canjes, iguales', async () => {
  viejo = await conAntiguo(); nuevo = await conNuevo();
  assert.equal(nuevo.w.document.getElementById('esc-pam').outerHTML, viejo.w.document.getElementById('esc-pam').outerHTML);
  assert.equal(nuevo.w.document.getElementById('esc-css').textContent, viejo.w.document.getElementById('esc-css').textContent.replace(/^(?!\.esc-ui\{--m-ink)/, ''), 'los mismos estilos, ya desde la pastilla');
  clic(viejo.w, '#esc-pam .pill'); clic(nuevo.w, '#esc-pam .pill'); await espera(100);
  assert.equal(nuevo.w.document.getElementById('esc-pam').outerHTML, viejo.w.document.getElementById('esc-pam').outerHTML);
  assert.match(nuevo.w.document.getElementById('esc-pam').textContent, /HP Avada Kedavra/);
});

test('«Preparar el canje»: la misma puerta', async () => {
  clic(viejo.w, '#esc-pam button', 'Preparar el canje'); clic(nuevo.w, '#esc-pam button', 'Preparar el canje');
  await hasta(() => viejo.w.document.querySelector('.puerta') && nuevo.w.document.querySelector('.puerta'));
  assert.equal(sinFechas(nuevo.w.document.querySelector('.puerta').outerHTML), sinFechas(viejo.w.document.querySelector('.puerta').outerHTML));
  assert.match(nuevo.w.document.querySelector('.puerta').textContent, /Mi Ficha · aplicar el carrito a la ficha.*Bóveda de PAM · grageas que se quitan/s);
});

test('Aceptar: PAM queda igual y se guarda la misma petición para el foro', async () => {
  for (const P of [viejo, nuevo]) clic(P.w, '.puerta button', 'Aceptar');
  await hasta(() => [viejo, nuevo].every(P => [...P.w.document.querySelectorAll('.puerta a, .puerta button')].some(b => b.textContent === 'Ir al foro a publicar la petición')));
  for (const P of [viejo, nuevo]) assert.match(P.w.document.querySelector('.puerta .p-info').textContent, /^Hecho/);
  const sin = p => { const { creado, ...r } = p; return r; };
  assert.deepEqual(sin(nuevo.gm['pam.peticion']), sin(viejo.gm['pam.peticion']));
  const pet = nuevo.gm['pam.peticion'];
  assert.equal(pet.pj, PJ);
  assert.match(pet.texto, /Vigor/);
  assert.equal(pet.gastadas, '300');
  assert.ok(pet.ficha.codigo.length > 1000 && pet.ficha.base.length > 1000, 'el código «Personalizada» y el de antes');
  assert.deepEqual(pet.boveda.numeros, { iniciales: 1000, cambio: -300, actuales: 700, totales: 5000 });
  assert.match(pet.boveda.html, /Grageas que se añaden\/quitan»<\/span> -300/);
  // PAM, igual en las dos copias: la ficha con el carrito y el movimiento preparado
  const estado = P => ({ vigor: JSON.parse(P.w.localStorage.getItem('grimorio.personajes')).lista.find(x => x.ficha.nombre === PJ).ficha.attrs.Vigor,
    boveda: (({ delta, pet, ace, act, ini, tot }) => ({ delta, pet, ace, act, ini, tot }))(P.w.rrBoveda.get(P.id)) });
  assert.deepEqual(estado(nuevo), estado(viejo));
  assert.equal(estado(nuevo).boveda.delta, '-300');
});

test('«Canje publicado → PAM»: la misma puerta, y PAM cierra el movimiento con los enlaces', async () => {
  const ap = { v: 2, creado: new Date().toISOString(), foro: FORO, cuenta: { id: 5203, nombre: 'Irvin Giles', foro: FORO }, pj: PJ, peticion: '9001',
    pet: `https://${FORO}/viewtopic?p=9001#9001`, ace: `https://${FORO}/viewtopic?p=9002#9002`, delta: '-300', actuales: 700 };
  const preparado = P => P.w.rrBoveda.preparar(P.id, { delta: '-300' }); // como tras «Preparar el canje»
  const v = await conAntiguo({ 'pam.aprobacion': ap, 'pam.peticion': { ...nuevo.gm['pam.peticion'], usado: { fecha: 'x' } } }, preparado);
  const n = await conNuevo({ 'pam.aprobacion': ap }, preparado);
  n.ctl.canjes.revisarPendientes(); // se abre sola (la promesa termina al cerrar la puerta)
  await hasta(() => v.w.document.querySelector('.puerta') && n.w.document.querySelector('.puerta'));
  mismoHtml(n.w.document.querySelector('.puerta').outerHTML, v.w.document.querySelector('.puerta').outerHTML);
  for (const P of [v, n]) clic(P.w, '.puerta button', 'Aceptar');
  await hasta(() => [v, n].every(P => /^Hecho/.test(P.w.document.querySelector('.puerta .p-info')?.textContent || '')));
  const bov = P => (({ act, ini, tot, delta, pet, ace, log }) => ({ act, ini, tot, delta, pet, ace, ultimo: log && (({ d, act: a, pet: p, ace: c }) => ({ d, act: a, pet: p, ace: c }))(log[0]) }))(P.w.rrBoveda.get(P.id));
  assert.deepEqual(bov(n), bov(v));
  assert.deepEqual(bov(n).ultimo, { d: -300, act: 700, pet: ap.pet, ace: ap.ace });
  clic(n.w, '.puerta button', 'Cerrar'); await hasta(() => n.gm['pam.aprobacion'].usado);
  assert.equal(n.gm['pam.aprobacion'].usado.resultado, 'aceptada', 'como Mi PJ: se marca al cerrar la puerta');
});
