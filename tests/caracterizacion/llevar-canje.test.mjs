// 2.3.0 · «Llevar a PAM» y «Aplicar cambio a la ficha» desde el Registro de Canjes.
//   · el lector: una petición escrita en el foro (armada por PAM o a mano) → cambios para Mi Ficha;
//   · PAM de verdad (index.html en jsdom): la puerta suma el canje a la ficha y descuenta la Bóveda una sola vez;
//   · el panel en el foro: la barra sale solo bajo tus peticiones aprobadas y los dos botones hacen lo suyo.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { abrir } from '../legado/abrirPam.mjs';

const RAIZ = new URL('../../', import.meta.url);
const j = f => JSON.parse(readFileSync(new URL('data/' + f, RAIZ), 'utf8'));
const MORTIMER = readFileSync(new URL('tests/fixtures/fichas/mortimer-compacta.bbcode', RAIZ), 'utf8');
const FORO = 'hp-avada-kedavra.foroactivo.com';
const PJ = 'Mortimer Gaunt';
const CUENTA = { id: 5203, nombre: PJ };
const espera = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (fn, ms = 15000) => { for (let t = 0; t < ms && !fn(); t += 50) await espera(50); return fn(); };

const { crearRevision } = await import('../../js/inspector/Revision.js');
const { tablaDeDatos, prepararTabla } = await import('../../js/inspector/Tabla.js');
const { cambiosDePedido, importeCanje, esMovimientoDe, CLAVE_LLEVAR } = await import('../../js/reglas/LlevarCanje.js');
const T = prepararTabla(tablaDeDatos(j('sistema.json'), j('arcanos-calculadora.json'), j('arcanos.json')));

/** Una petición como las del registro (el texto que arma PAM, con una línea escrita a mano). */
const PETICION = `ESTADÍSTICAS<br>Carisma: 0 → 4 — 1500 grageas<br>Voluntad: 2 → 3 — 400 grageas<br><br>HABILIDADES<br>
Artesanía (Forja): Sin nivel → Novato — 38 grageas<br>Rituales: Sin nivel → Experto — 475 grageas<br><br>ARCANOS<br>
Hechizo doméstico: Colovaria — 25 grageas<br>Ritual básico: Illusia Minoris — 100 grageas<br><br>TÍTULOS ACADÉMICOS<br>
TIMOs: Aceptable — 50 grageas<br><br>IDIOMAS<br>Coreano - Nativo — 0 grageas<br>Inglés (muggle): Ninguno → Alto — 150 grageas<br><br>
RAZA<br>Semigigante — 500 grageas<br><br>Total: 3238 grageas.`;

function leer(html) {
  const doc = new JSDOM(`<div class="post" id="p900"><div class="content">${html}</div></div>`).window.document;
  const R = crearRevision({ leer: async () => doc });
  const pedido = R.leerPedido(doc.querySelector('.content'));
  return { pedido, ...cambiosDePedido(pedido.items.map(it => { const c = R.clasificar(it, T); c.item = it; return c; })) };
}

test('lector: cada línea de la petición pasa a un cambio de la ficha; lo que no se entiende, a mano', () => {
  const { pedido, cambios, aMano } = leer(PETICION + '<br>Algo inventado rarísimo — 300 grageas');
  assert.equal(pedido.total, 3238);
  const por = t => cambios.filter(c => c.tipo === t);
  assert.deepEqual(por('stat').map(c => [c.nombre, c.hasta]), [['Carisma', 4], ['Voluntad', 3]]);
  assert.deepEqual(por('arte').map(c => [c.nombre, c.hasta]), [['Forja', 1]]);
  assert.deepEqual(por('skill').map(c => [c.habilidad, c.hasta]), [['Rituales', 3]]);
  assert.deepEqual(por('arcano').map(c => [c.type, c.tier, c.nombre]), [['hechizo', 'dom', 'Colovaria'], ['ritual', 'bas', 'Illusia Minoris']]);
  assert.deepEqual(por('titulo').map(c => c.texto), ['TIMOs: Aceptable']);
  assert.deepEqual(por('idioma').map(c => [c.nombre, c.nivel]), [['Coreano', 'Nativo'], ['Inglés', 'Alto']]);
  assert.deepEqual(por('raza').map(c => c.nombre), ['Semigigante']);
  assert.deepEqual(aMano, ['Algo inventado rarísimo']);
});

test('importe: el corregido por el Inspector manda; si no, el total de la petición', () => {
  assert.equal(importeCanje({ clase: 'corregida', importe: 3000 }, { total: 3238 }, 3238), 3000);
  assert.equal(importeCanje({ clase: 'aprobada' }, { total: 3238 }, 10), 3238);
  assert.equal(importeCanje({ clase: 'aprobada' }, { total: NaN }, 125), 125);
  assert.ok(esMovimientoDe({ pet: 'https://x/viewtopic?p=900#900' }, '900'));
  assert.ok(!esMovimientoDe({ pet: 'https://x/viewtopic?p=9001#9001' }, '900'));
});

/* ---------------- PAM de verdad ---------------- */
const abiertas = [];
after(() => abiertas.forEach(w => { try { w.close(); } catch (e) { /* ya cerrada */ } }));
async function pam(gm) {
  // el PAM de ahora (index.html y sus módulos, como en el navegador): Mi Ficha tiene «aplicarCanje» desde la 2.3.0
  const { w } = await abrir('archivos', { antes: x => { x.confirm = () => true; x.alert = () => {}; } });
  abiertas.push(w);
  w.pamFicha.importar(MORTIMER, PJ);
  w.rrSync();
  const id = w.pamFicha.buscar(PJ).id;
  w.rrBoveda.set(id, { ini: 1000, tot: 9000, act: 5000 });
  const agente = { leerDato: async k => (k in gm ? JSON.parse(JSON.stringify(gm[k])) : null), guardarDato: async (k, v) => { gm[k] = JSON.parse(JSON.stringify(v)); } };
  return { w, id, agente };
}
const clic = (w, sel, texto) => { const b = [...w.document.querySelectorAll(sel)].find(x => !texto || x.textContent === texto); assert.ok(b, `${sel} «${texto}»`); b.click(); };

test('PAM: «Llevar a PAM» suma a Mi Ficha y PREPARA el movimiento (sin «Ya lo publiqué»); la petición queda en el registro de la tarjeta', async () => {
  const { cambios, aMano } = leer(PETICION);
  const aprobacion = { post: '901', enlace: 'https://' + FORO + '/viewtopic?p=901#901', autor: 'Inspectora', clase: 'aprobada', confirmada: false };
  const paq = { v: 2, creado: new Date().toISOString(), foro: FORO, cuenta: { ...CUENTA, foro: FORO }, pj: PJ, post: '900',
    enlacePet: 'https://' + FORO + '/viewtopic?p=900#900', enlaceAce: aprobacion.enlace, aprobacion, total: 3238, cambios, aMano };
  const gm = { [CLAVE_LLEVAR]: paq };
  const { w, id, agente } = await pam(gm);
  const { crearLlevarCanjePam } = await import('../../js/pam/LlevarCanjePam.js');
  const { crearCanjesPam } = await import('../../js/pam/CanjesPam.js');
  const { crearPamActual } = await import('../../js/pam/PamActual.js');
  const { claveCuenta, paqueteCierre } = await import('../../js/reglas/Canjes.js');
  const P = crearPamActual(w);
  const L = crearLlevarCanjePam({ agente, pam: P, doc: w.document });
  const aceptar = async vuelta => {
    assert.ok(await hasta(() => w.document.querySelector('.puerta')), 'se abre la puerta de PAM');
    clic(w, '.puerta button', 'Aceptar');
    await hasta(() => [...w.document.querySelectorAll('.puerta button')].some(b => b.textContent === 'Cerrar'));
    clic(w, '.puerta button', 'Cerrar');
    await vuelta;
  };
  const antes = JSON.parse(JSON.stringify(w.grimorioFicha()));
  const vuelta = L.revisar();
  assert.ok(await hasta(() => w.document.querySelector('.puerta')));
  const txt = w.document.querySelector('.puerta').textContent;
  assert.match(txt, /Mi Ficha · sumar el canje a «Mortimer Gaunt»/);
  assert.match(txt, /Bóveda de PAM · preparar el movimiento \(−3\.238 grageas\)/);
  await aceptar(vuelta);
  const f = w.grimorioFicha();
  assert.equal(f.attrs.Carisma, Math.max(4, antes.attrs.Carisma));
  assert.ok(f.arcanos.some(a => a.name === 'Colovaria' && a.type === 'hechizo'));
  assert.ok(f.idiomas.some(x => x.n === 'Coreano' && x.nivel === 'Nativo'));
  assert.match(f.titulos, /TIMOs: Aceptable/);
  assert.equal(f.d.raza, 'Semigigante');
  let b = w.rrBoveda.get(id);
  assert.equal(b.act, 5000, 'la Bóveda todavía no cierra: nada se publicó en el foro');
  assert.equal(b.delta, '-3238', 'el movimiento queda preparado');
  assert.ok(!(b.log || []).some(m => esMovimientoDe(m, '900')));
  // la petición, en el registro que usan la tarjeta «⚖ Canjes» y la barra, lista para «Aplicar el canje»
  const x = gm[claveCuenta(FORO, CUENTA.id)].peticiones.find(y => y.post === '900');
  assert.equal(x.gastadas, 3238);
  assert.equal(x.aprobacion.confirmada, true);
  assert.equal(x.boveda.numeros.actuales, 5000 - 3238);
  assert.ok(x.cambiosFicha && JSON.stringify(x.cambiosFicha.antes) !== JSON.stringify(x.cambiosFicha.despues));
  assert.ok(!x.aplicada && !x.cerrada);

  // … y después del foro, el «Terminar en PAM» de siempre cierra la Bóveda una sola vez
  gm['pam.aprobacion'] = paqueteCierre(FORO, CUENTA, x);
  const C = crearCanjesPam({ agente, pam: P, doc: w.document, foros: {} });
  await aceptar(C.abrirCierre(false));
  b = w.rrBoveda.get(id);
  assert.equal(b.act, 5000 - 3238);
  assert.ok(esMovimientoDe(b.log[0], '900'), 'el movimiento lleva el enlace de la petición');
  assert.ok(gm[claveCuenta(FORO, CUENTA.id)].peticiones.find(y => y.post === '900').cerrada);

  // llevarlo otra vez: ya está cerrado en la Bóveda, no se toca
  gm[CLAVE_LLEVAR] = { ...paq, creado: new Date().toISOString() };
  const otra = L.revisar();
  assert.ok(await hasta(() => w.document.querySelector('.puerta')));
  assert.match(w.document.querySelector('.puerta').textContent, /ya está cerrado en la Bóveda de PAM/);
  await aceptar(otra);
  assert.equal(w.rrBoveda.get(id).act, 5000 - 3238, 'no se descuenta dos veces');
  assert.equal(w.rrBoveda.get(id).delta, '', 'ni queda otro movimiento preparado');
});

test('PAM: «Traer de la calculadora» y «Llevar a PAM» usan la misma regla (lazos y PD incluidos; los idiomas solo suben)', async () => {
  const { w } = await pam({});
  const f = () => w.grimorioFicha();
  w.pamFicha.aplicarCanje([{ tipo: 'idioma', nombre: 'Francés', nivel: 'Alto', texto: 'Francés' }]);
  const TC = w.pamTabla;
  TC.state.cart = [];
  TC.addToCart('IDIOMAS', 'Francés (muggle): Ninguno → Bajo — 50 grageas', 50, 0, null, { name: 'Francés' });
  TC.addToCart('TALENTOS', 'Lazo con Ana Pérez — 100 grageas', 100, 0, null, { kind: 'lazo', talent: 'Lazo', detalle: 'Ana Pérez' });
  TC.state.pdActuales = 9;
  w.pamFicha.traerCalculadora();
  assert.equal(f().idiomas.find(x => x.n === 'Francés').nivel, 'Alto', 'la calculadora no baja un idioma');
  assert.ok(f().vinculos.some(v => v.pj === 'Ana Pérez' && v.tipo === 'Lazo'));
  assert.ok(Number(f().extra.pd) >= 9);
  const r = w.pamFicha.aplicarCanje([{ tipo: 'lazo', vinculo: 'Lazo', pj: 'Ana Pérez', texto: 'Lazo con Ana Pérez' }]);
  assert.deepEqual(r.hechos, [], 'lo mismo dos veces no repite nada');
  const { cambios } = leer('TALENTOS<br>Lazo con Bruno Díaz — 100 grageas<br>Total: 100 grageas.');
  assert.deepEqual(cambios.map(c => [c.tipo, c.vinculo, c.pj]), [['lazo', 'Lazo', 'Bruno Díaz']]);
});

/* ---------------- el panel en el foro ---------------- */
const pedido = (id, autorId, autor, html) => `<div class="post" id="p${id}"><div class="postprofile"><a href="/u${autorId}">${autor}</a></div><p class="author">por <a href="/u${autorId}">${autor}</a> Hoy</p><div class="content">${html}</div></div>`;
const REGISTRO = '/t34430p210-registro-de-canjes';
function paginaRegistro() {
  return `<html><body><h1 class="page-title">Registro de Canjes</h1>${pedido(900, CUENTA.id, PJ, PETICION)}${pedido(950, 77, 'Otra Persona', 'HABILIDADES<br>Pelea: Novato → Competente — 150 grageas<br>Total: 150 grageas.')}${pedido(901, 12, 'Inspectora', 'Mortimer, tus canjes son correctos, puedes añadirlos.')}</body></html>`;
}
function agenteFalso(gm) {
  const doc = new JSDOM(paginaRegistro()).window.document;
  const llamadas = [], manejadores = {};
  return {
    llamadas, manejadores,
    leer: async () => doc,
    leerDato: async k => (k in gm ? JSON.parse(JSON.stringify(gm[k])) : null),
    guardarDato: async (k, v) => { gm[k] = JSON.parse(JSON.stringify(v)); },
    pedir: async (tipo, d) => { llamadas.push([tipo, d]); return {}; },
    atender: (tipo, fn) => { manejadores[tipo] = fn; },
    abrirPam: async d => { llamadas.push(['pam.abrir', d]); return { abierta: true }; },
    puerta: async accion => { llamadas.push(['puerta', accion]); return { resultado: 'aceptada' }; }
  };
}
const { crearCanjesEnRegistro } = await import('../../js/paginas/panel/CanjesEnRegistro.js');
const { claveCuenta } = await import('../../js/reglas/Canjes.js');
const CLAVE_CUENTA = claveCuenta(FORO, CUENTA.id);
function enRegistro(gm, extra = {}) {
  const agente = agenteFalso(gm);
  const servicio = {
    leerGruposRevisores: async () => ({ grupos: { canjes: [{ id: 12, nombre: 'Inspectora' }] } }),
    buscarAprobacion: async (rev, pet) => (pet.post === '900' ? { post: '901', enlace: 'https://' + FORO + '/viewtopic?p=901#901', autor: 'Inspectora', clase: 'aprobada', confirmada: true } : { ninguna: true }),
    datosCuenta: async () => gm[CLAVE_CUENTA] || {}
  };
  // la tarjeta «⚖ Canjes»: la barra usa sus «Aplicar el canje» y «Terminar en PAM»
  const tarjeta = {
    aplicarCanje: async x => { agente.llamadas.push(['aplicar', x]); gm[CLAVE_CUENTA].peticiones[0].aplicada = { fecha: 'x' }; return null; },
    terminar: async x => { agente.llamadas.push(['terminar', x]); return null; },
    recargar: async () => {}
  };
  const mem = new Map();
  const R = crearCanjesEnRegistro({
    agente, hola: { foro: FORO, cuenta: CUENTA, ruta: REGISTRO }, cfg: { registroCanjes: '/t34430-registro-de-canjes' }, servicio, tarjeta,
    memoria: { gv: (k, d) => (mem.has(k) ? mem.get(k) : d), sv: (k, v) => mem.set(k, v) },
    cargarDatos: async () => ({ sistema: j('sistema.json'), calculadora: j('arcanos-calculadora.json'), compendio: j('arcanos.json') }),
    documento: new JSDOM('').window.document, ...extra
  });
  return { R, agente };
}
const ultimaBarra = agente => { const p = agente.llamadas.filter(l => l[0] === 'canje.pintar').pop(); return p && p[1].barras; };
const registrada = cambios => ({ [CLAVE_CUENTA]: { peticiones: [{ post: '900', enlace: 'e', pj: PJ, gastadas: 3238, estado: 'aprobada', aprobacion: { autor: 'Inspectora', clase: 'aprobada', confirmada: true, enlace: 'a' }, ...cambios }] } });

test('foro: la barra sale solo bajo tu petición aprobada; sin preparar, solo «Llevar a PAM»', async () => {
  const { R, agente } = enRegistro({});
  await R.iniciar();
  const barras = ultimaBarra(agente);
  assert.deepEqual(Object.keys(barras), ['900'], 'ni la de otra persona ni la respuesta del Inspector');
  assert.match(barras['900'], /✓ Aprobado por Inspectora/);
  assert.match(barras['900'], /data-cj="llevar"[^>]*>✦ Llevar a PAM</);
  assert.doesNotMatch(barras['900'], /data-cj="aplicar"|data-cj="terminar"/);
});

test('foro: apagado en «Configurar Mi PJ», no se pinta nada', async () => {
  const { R, agente } = enRegistro({}, { permitido: () => false });
  await R.iniciar();
  assert.equal(ultimaBarra(agente), undefined);
});

test('foro: «Llevar a PAM» deja la petición leída (con la aprobación) para PAM y lo abre', async () => {
  const gm = {};
  const { R, agente } = enRegistro(gm);
  await R.iniciar();
  R.accion({ accion: 'llevar', p: '900' });
  await hasta(() => agente.llamadas.some(l => l[0] === 'pam.abrir'));
  const paq = gm[CLAVE_LLEVAR];
  assert.equal(paq.post, '900');
  assert.equal(paq.total, 3238);
  assert.equal(paq.enlaceAce, 'https://' + FORO + '/viewtopic?p=901#901');
  assert.equal(paq.aprobacion.autor, 'Inspectora');
  assert.ok(paq.cambios.some(c => c.tipo === 'raza' && c.nombre === 'Semigigante'));
  await hasta(() => /En PAM: revisá/.test(ultimaBarra(agente)['900']));
});

test('foro: preparada en PAM → «Aplicar en el foro» (el de la tarjeta) → «Terminar en PAM» (el de la tarjeta)', async () => {
  const gm = registrada({ boveda: { numeros: {} }, cambiosFicha: { v: 1 } });
  const { R, agente } = enRegistro(gm);
  await R.iniciar();
  assert.match(ultimaBarra(agente)['900'], /✓ Preparado en PAM/);
  assert.match(ultimaBarra(agente)['900'], /class="b pri"[^>]*data-cj="aplicar"[^>]*>Aplicar en el foro</);
  R.accion({ accion: 'aplicar', p: '900' });
  await hasta(() => /data-cj="terminar"/.test(ultimaBarra(agente)['900']));
  assert.equal(agente.llamadas.find(l => l[0] === 'aplicar')[1].post, '900', 'la tarjeta aplica esa petición');
  assert.match(ultimaBarra(agente)['900'], /✓ Aplicado en el foro/);
  R.accion({ accion: 'terminar', p: '900' });
  await hasta(() => agente.llamadas.some(l => l[0] === 'terminar'));
});

test('foro: si el canje ya se terminó por la tarjeta, la barra lo dice y no ofrece nada', async () => {
  const { R, agente } = enRegistro(registrada({ boveda: { numeros: {} }, aplicada: { fecha: 'x' }, enPAM: 'x', cerrada: true }));
  await R.iniciar();
  const b = ultimaBarra(agente)['900'];
  assert.match(b, /✓ Canje terminado/);
  assert.doesNotMatch(b, /<button/);
});

/* ---------------- 2.3.1 · el foro de verdad no enlaza el perfil del autor ---------------- */
// Así sale el autor en el Registro (con sesión y sin ella): «por <span class="usr_grp_clr"><strong>Nombre</strong></span> fecha»
const real = (id, autor, html) => `<div id="p${id}" class="post row2 post--${id}"><div class="inner"><div class="postbody"><p class="author"><img class="sprite-icon_post_target" alt="Mensaje">&nbsp;por&nbsp;<span class="group-9 usr_grp_clr" style="color:#769aaf"><strong>${autor}</strong></span> Mar 10 Nov 2026 - 20:19</p><div class="content clearfix"><div>${html}</div></div></div><div class="postprofile" id="profile${id}"><dl><dt><img alt="${autor}"></dt></dl></div></div></div>`;
function foroReal() {
  const pag1 = `<html><body><h1 class="page-title">Registro de Canjes</h1><div class="pagination"><a href="/t34430p15-registro-de-canjes">2</a></div>${real(100, 'Alguien', 'Normas del registro')}</body></html>`;
  const pag2 = `<html><body><h1 class="page-title">Registro de Canjes</h1><div class="pagination"><a href="/t34430-registro-de-canjes">1</a></div>
    ${real(739660, 'Hana Park', PETICION)}${real(739690, 'Claire Pusset-Strauss', 'Hana tus canjes son correctos y puedes agregarlos a la ficha. Recuerda que debes descontar las grageas de la bóveda.')}
    ${real(739702, 'Woojin Moon', 'HABILIDADES<br>Rituales: Sin nivel → Novato — 75 grageas<br>Total: 75 grageas.')}</body></html>`;
  const grupo = `<html><body><div id="main-content"><table><tr><td><a href="/u5800">Claire Pusset-Strauss</a></td></tr><tr><td><a href="/u4775">Betjelli Bray</a></td></tr></table></div></body></html>`;
  const paginas = { '/t34430-registro-de-canjes': pag1, '/t34430p15-registro-de-canjes': pag2, '/t34430p15-': pag2, '/g121-inspectores-de-canjes': grupo };
  return async ruta => { const k = Object.keys(paginas).find(r => ruta.split('?')[0] === r || ruta.startsWith(r)); if (!k) throw new Error('sin página ' + ruta); return new JSDOM(paginas[k]).window.document; };
}

test('foro real (sin enlace al perfil): reconoce tu petición y la aprobación de la Inspectora por el nombre', async () => {
  const { crearCanjesDelForo } = await import('../../js/servicios/CanjesDelForo.js');
  const leerForo = foroReal();
  const gm = {}, llamadas = [];
  const HANA = { id: 5709, nombre: 'Hana Park' };
  const agente = {
    leer: leerForo, leerDato: async k => gm[k] ?? null, guardarDato: async (k, v) => { gm[k] = v; },
    pedir: async (tipo, d) => { llamadas.push([tipo, d]); return {}; }, atender: () => {}, abrirPam: async () => ({ abierta: true }), puerta: async () => ({ resultado: 'aceptada' })
  };
  const cfg = { registroCanjes: '/t34430-registro-de-canjes', grupos: { canjes: '/g121-inspectores-de-canjes' } };
  const mem = new Map(), memoria = { gv: (k, d) => (mem.has(k) ? mem.get(k) : d), sv: (k, v) => mem.set(k, v) };
  const servicio = crearCanjesDelForo(agente, { foroHost: FORO, cuenta: HANA, cfg, memoria });
  const R = crearCanjesEnRegistro({
    agente, hola: { foro: FORO, cuenta: HANA, ruta: '/t34430p15-registro-de-canjes' }, cfg, servicio, tarjeta: null, memoria,
    cargarDatos: async () => ({ sistema: j('sistema.json'), calculadora: j('arcanos-calculadora.json'), compendio: j('arcanos.json') }),
    documento: new JSDOM('').window.document
  });
  await R.iniciar();
  const p = llamadas.filter(l => l[0] === 'canje.pintar').pop();
  assert.ok(p, 'pinta la barra');
  assert.deepEqual(Object.keys(p[1].barras), ['739660'], 'solo bajo la petición de Hana (ni la de Woojin ni la respuesta)');
  assert.match(p[1].barras['739660'], /chip ok[^>]*>✓ Aprobado por Claire Pusset-Strauss/, 'Claire, reconocida como Inspectora por su nombre');
});

test('Inspector: sin enlace al perfil, el autor sale del nombre', () => {
  const doc = new JSDOM(real(5, 'Hana Park', 'hola')).window.document;
  const D = crearRevision({ leer: async () => doc }).datosDelPost(doc.querySelector('.post'));
  assert.equal(D.nombre, 'Hana Park');
  assert.equal(D.autor, '@hana park');
});

test('si quien aprobó no figura en el grupo, la barra sale igual, marcada «sin confirmar»', async () => {
  const { crearCanjesDelForo } = await import('../../js/servicios/CanjesDelForo.js');
  const leerForo = foroReal();
  const sinClaire = async ruta => { const d = await leerForo(ruta); if (/g121/.test(ruta)) d.querySelector('a[href="/u5800"]').remove(); return d; };
  const llamadas = [], HANA = { id: 5709, nombre: 'Hana Park' };
  const agente = { leer: sinClaire, leerDato: async () => null, guardarDato: async () => {}, pedir: async (t, d) => { llamadas.push([t, d]); return {}; }, atender: () => {} };
  const cfg = { registroCanjes: '/t34430-registro-de-canjes', grupos: { canjes: '/g121-inspectores-de-canjes' } };
  const mem = new Map(), memoria = { gv: (k, d) => (mem.has(k) ? mem.get(k) : d), sv: (k, v) => mem.set(k, v) };
  const servicio = crearCanjesDelForo(agente, { foroHost: FORO, cuenta: HANA, cfg, memoria });
  const R = crearCanjesEnRegistro({ agente, hola: { foro: FORO, cuenta: HANA, ruta: '/t34430p15-registro-de-canjes' }, cfg, servicio, tarjeta: null, memoria,
    cargarDatos: async () => ({ sistema: j('sistema.json'), calculadora: j('arcanos-calculadora.json'), compendio: j('arcanos.json') }), documento: new JSDOM('').window.document });
  await R.iniciar();
  const p = llamadas.filter(l => l[0] === 'canje.pintar').pop();
  assert.match(p[1].barras['739660'], /chip warn[^>]*>✓ Aprobado por Claire Pusset-Strauss/);
  // la tarjeta del panel (sin la opción) sigue como siempre: solo Inspectores del grupo
  assert.deepEqual(await servicio.buscarAprobacion(await servicio.leerGruposRevisores(true), { post: '739660', pj: 'Hana Park' }), { ninguna: true });
});
