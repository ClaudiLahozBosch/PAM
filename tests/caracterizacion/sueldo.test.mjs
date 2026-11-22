// 2.5.0 · El sueldo con Mi PJ, con PAM de verdad (index.html en jsdom) y con el panel:
//   · el movimiento que publica «Aplicar a la bóveda» es el mismo código que da la Bóveda de PAM («Código para la bóveda»);
//   · «Terminar en PAM»: la puerta de PAM apunta el sueldo en su Bóveda una sola vez, y no adivina si los números no cuadran;
//   · el panel: «Pedir el sueldo con este rol» solo en un rol cerrado donde escribiste, con el formulario relleno, y
//     «Aplicar a la bóveda» con el sueldo aprobado. Sin la pieza del sueldo, la tarjeta es la de siempre.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { abrir } from '../legado/abrirPam.mjs';

const RAIZ = new URL('../../', import.meta.url);
const MORTIMER = readFileSync(new URL('tests/fixtures/fichas/mortimer-compacta.bbcode', RAIZ), 'utf8');
const TABLA = JSON.parse(readFileSync(new URL('data/sistema.json', RAIZ), 'utf8')).empleos.sueldos;
const FORO = 'hp-avada-kedavra.foroactivo.com', ORIGEN = 'https://' + FORO;
const PJ = 'Mortimer Gaunt', CUENTA = { id: 5203, nombre: PJ };
const PET = ORIGEN + '/viewtopic?p=7002#7002', ACE = ORIGEN + '/viewtopic?p=7003#7003';
const espera = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (fn, ms = 15000) => { for (let t = 0; t < ms && !fn(); t += 50) await espera(50); return fn(); };

const { movimientoGrageas, codigoConEnlaces } = await import('../../js/reglas/Canjes.js');
const { CLAVE_SUELDO, paqueteSueldo, formularioEmpleo } = await import('../../js/reglas/Sueldo.js');
const { esMovimientoDe } = await import('../../js/reglas/LlevarCanje.js');

const abiertas = [];
after(() => abiertas.forEach(w => { try { w.close(); } catch (e) { /* ya cerrada */ } }));
async function pam(gm, bov = { ini: 1000, tot: 9000, act: 5000 }) {
  const { w } = await abrir('archivos', { antes: x => { x.confirm = () => true; x.alert = () => {}; } });
  abiertas.push(w);
  w.pamFicha.importar(MORTIMER, PJ);
  w.rrSync();
  const id = w.pamFicha.buscar(PJ).id;
  w.rrBoveda.set(id, bov);
  const agente = { leerDato: async k => (k in gm ? JSON.parse(JSON.stringify(gm[k])) : null), guardarDato: async (k, v) => { gm[k] = JSON.parse(JSON.stringify(v)); } };
  return { w, id, agente };
}
const clic = (w, sel, texto) => { const b = [...w.document.querySelectorAll(sel)].find(x => !texto || x.textContent === texto); assert.ok(b, `${sel} «${texto}»`); b.click(); };
async function aceptar(w, vuelta) {
  assert.ok(await hasta(() => w.document.querySelector('.puerta')), 'se abre la puerta de PAM');
  clic(w, '.puerta button', 'Aceptar');
  await hasta(() => [...w.document.querySelectorAll('.puerta button')].some(b => b.textContent === 'Cerrar'));
  clic(w, '.puerta button', 'Cerrar');
  await vuelta;
}

test('movimiento: el mismo código que el «Código para la bóveda» de PAM, con los mismos enlaces', async () => {
  const { w, id } = await pam({});
  for (const d of [75, 500, -300]) {
    const r = w.rrBoveda.preparar(id, { delta: (d > 0 ? '+' : '') + d, pet: PET, ace: ACE });
    const nuestro = codigoConEnlaces(movimientoGrageas({ ini: 5000, d }, 9000).html, PET, ACE, r.divisor);
    assert.equal(nuestro, r.html, 'delta ' + d);
  }
});

test('PAM: «Terminar en PAM» apunta el sueldo en la Bóveda una sola vez', async () => {
  const numeros = { iniciales: 5000, actuales: 5075, totales: 9075 };
  const gm = { [CLAVE_SUELDO]: paqueteSueldo({ foro: FORO, cuenta: CUENTA, pj: PJ, mes: 'octubre', monto: 75, enlacePet: PET, enlaceAce: ACE, numeros }) };
  const { w, id, agente } = await pam(gm);
  const { crearSueldoPam } = await import('../../js/pam/SueldoPam.js');
  const { crearPamActual } = await import('../../js/pam/PamActual.js');
  const S = crearSueldoPam({ agente, pam: crearPamActual(w), doc: w.document });
  const vuelta = S.revisar();
  assert.ok(await hasta(() => w.document.querySelector('.puerta')));
  assert.match(w.document.querySelector('.puerta').textContent, /Bóveda de PAM · sumar el sueldo de Octubre \(\+75 grageas\)/);
  assert.match(w.document.querySelector('.puerta').textContent, /5\.000 \+ 75 = 5\.075 grageas \(totales: 9\.075\)/);
  await aceptar(w, vuelta);
  let b = w.rrBoveda.get(id);
  assert.deepEqual([b.act, b.tot], [5075, 9075]);
  assert.ok(esMovimientoDe(b.log[0], '7002') && /p=7003/.test(b.log[0].ace), 'el movimiento lleva el pedido y la aprobación');
  assert.equal(gm[CLAVE_SUELDO].usado.resultado, 'aceptada');
  // el mismo paquete otra vez: no se abre (ya se usó); uno nuevo con el mismo sueldo: «ya está apuntado»
  await S.revisar();
  assert.ok(!w.document.querySelector('.puerta'));
  gm[CLAVE_SUELDO] = paqueteSueldo({ foro: FORO, cuenta: CUENTA, pj: PJ, mes: 'octubre', monto: 75, enlacePet: PET, enlaceAce: ACE, numeros });
  const r = await crearSueldoPam({ agente, pam: crearPamActual(w), doc: w.document }).revisar();
  b = w.rrBoveda.get(id);
  assert.deepEqual([b.act, b.log.filter(m => esMovimientoDe(m, '7002')).length, r], [5075, 1, undefined], 'todo igual: ni se abre la puerta');
  assert.equal(gm[CLAVE_SUELDO].usado.resultado, 'igual');
});

test('PAM: si la Bóveda de PAM tenía otro saldo, no se suma (se propone «Enviar a PAM»)', async () => {
  const numeros = { iniciales: 4000, actuales: 4075, totales: 9075 };
  const gm = { [CLAVE_SUELDO]: paqueteSueldo({ foro: FORO, cuenta: CUENTA, pj: PJ, mes: 'octubre', monto: 75, enlacePet: PET, enlaceAce: ACE, numeros }) };
  const { w, id, agente } = await pam(gm);
  const { crearSueldoPam } = await import('../../js/pam/SueldoPam.js');
  const { crearPamActual } = await import('../../js/pam/PamActual.js');
  const S = crearSueldoPam({ agente, pam: crearPamActual(w), doc: w.document });
  const vuelta = S.revisar();
  assert.ok(await hasta(() => w.document.querySelector('.puerta')));
  assert.match(w.document.querySelector('.puerta').textContent, /dice 5\.000 grageas, y tu bóveda del foro tenía 4\.000.*«Enviar a PAM»/);
  clic(w, '.puerta button', 'Denegar');
  await vuelta;
  assert.equal(w.rrBoveda.get(id).act, 5000);
});

/* ---------------- el panel ---------------- */
const ROL = { tid: 600, url: ORIGEN + '/t600-', titulo: 'Inquilinos ruidosos [Lia]', enRol: true, cerrado: true, mios: 3, ultimo: { id: 6017, fecha: 'Mié 4 Nov 2026 - 12:00' },
  empleos: [{ nombre: 'Veterimago', nivel: 1, texto: 'Veterimago (competente)' }, { nombre: 'Heredera', nivel: 0, texto: 'Heredera (Novato)' }] };
const SUELDO = { estado: 'leido', mes: 'octubre', url: ORIGEN + '/t700-sueldos-de-octubre', tid: 700, pedido: null, resp: null, formulario: ORIGEN + '/t89-' };

async function panel({ sueldo = SUELDO, rol = ROL, antes = { rolEsteMes: null, repetido: null }, ruta = '/t600-inquilinos-ruidosos', boveda = { url: ORIGEN + '/t301-', propios: [] } } = {}) {
  const { crearSueldoPanel } = await import('../../js/paginas/panel/SueldoPanel.js');
  const dom = new JSDOM('<!doctype html><body><div id="c"></div></body>');
  const d = dom.window.document, caja = d.getElementById('c');
  const llamadas = { puerta: [], guardado: {}, pam: [], actualizar: 0, leerRol: 0 };
  const mem = new Map();
  const respuestas = [];
  const P = crearSueldoPanel({
    documento: d, ruta, foro: FORO, cuenta: CUENTA,
    memoria: { gv: (k, x) => (mem.has(k) ? mem.get(k) : x), sv: (k, v) => mem.set(k, v) },
    servicio: {
      leerRol: async () => { llamadas.leerRol++; return rol; }, antesDePedir: async () => antes,
      accionPedir: (f, S, avisos) => ({ titulo: 'Pedir el sueldo', avisos, pasos: [{ tipo: 'publicar', tema: S.tid, texto: formularioEmpleo(f) }] }),
      enlaces: S => ({ enlacePet: ORIGEN + '/viewtopic?p=' + S.pedido.id + '#' + S.pedido.id, enlaceAce: ORIGEN + '/viewtopic?p=' + S.resp.id + '#' + S.resp.id })
    },
    canjes: { accionSumarABoveda: async op => ({ accion: { titulo: op.titulo, pasos: [{ tipo: 'publicar', texto: 'mov ' + op.delta }] }, numeros: { iniciales: 301, actuales: 376, totales: 1075 } }) },
    agente: {
      puerta: async a => { llamadas.puerta.push(a); return respuestas.shift() || { resultado: 'aceptada', pasos: [{ estado: 'ok' }] }; },
      guardarDato: async (k, v) => { llamadas.guardado[k] = v; }, abrirPam: async x => { llamadas.pam.push(x); return { abierta: true }; }
    },
    catalogo: async () => [{ nombre: 'VETERIMAGO', categoria: 'Medio' }], tabla: TABLA, divisor: () => '✦',
    datos: () => ({ pj: PJ, sueldo, boveda }), actualizar: async () => { llamadas.actualizar++; }
  });
  return { P, caja, d, llamadas, respuestas, pintar: async () => { P.pintar(caja); await espera(20); } };
}
const botones = caja => [...caja.querySelectorAll('button')].map(b => b.textContent);
const boton = (caja, t) => { const b = [...caja.querySelectorAll('button')].find(x => x.textContent === t); assert.ok(b, 'botón «' + t + '»'); return b; };

test('panel: en un rol cerrado donde escribiste, «Pedir el sueldo con este rol»; el formulario sale relleno', async () => {
  const X = await panel();
  await X.pintar();
  assert.equal(X.llamadas.leerRol, 1);
  assert.match(X.caja.textContent, /Este rol está cerrado: Inquilinos ruidosos \[Lia\]/);
  boton(X.caja, 'Pedir el sueldo con este rol').click();
  await espera(30);
  const sel = [...X.caja.querySelectorAll('select')];
  assert.deepEqual([...sel[0].options].map(o => o.textContent), ['Veterimago (competente)', 'Heredera (Novato)']);
  assert.equal(sel[1].value, '1', 'el nivel del perfil');
  assert.match(X.caja.textContent, /CategoríaMedio/);
  assert.match(X.caja.textContent, /Sueldo75 grageas/);
  assert.match(X.caja.textContent, /Escribí el resumen del rol/);
  assert.ok(boton(X.caja, 'Revisar y publicar').disabled);
  const ta = X.caja.querySelector('textarea');
  ta.value = 'Cura a la kneazle de la casa.'; ta.dispatchEvent(new X.d.defaultView.Event('input'));
  assert.ok(!boton(X.caja, 'Revisar y publicar').disabled);
  // otro empleo: la lista de PAM no lo tiene, la categoría se elige
  sel[0].value = '1'; sel[0].dispatchEvent(new X.d.defaultView.Event('change'));
  assert.match(X.caja.textContent, /No encuentro este empleo en la lista de PAM/);
  assert.ok(boton(X.caja, 'Revisar y publicar').disabled);
  const cat = X.caja.querySelectorAll('select')[2];
  cat.value = 'Muy Alto'; cat.dispatchEvent(new X.d.defaultView.Event('change'));
  assert.match(X.caja.textContent, /Sueldo75 grageas/, 'Muy Alto · Novato');
  assert.equal(X.caja.querySelector('textarea').value, 'Cura a la kneazle de la casa.', 'el resumen no se pierde al repintar');
  boton(X.caja, 'Revisar y publicar').click();
  await espera(30);
  const a = X.llamadas.puerta[0];
  assert.equal(a.pasos[0].tema, 700);
  assert.match(a.pasos[0].texto, /\{Nombre del empleo»\[\/b\]\[\/color\]\[\/font\]\[\/size\] Heredera\n/);
  assert.match(a.pasos[0].texto, /\{Categoría»\[\/b\]\[\/color\]\[\/font\]\[\/size\] Muy Alto\n/);
  assert.match(a.pasos[0].texto, /\{Resumenes»\[\/b\]\[\/color\]\[\/font\]\[\/size\] Cura a la kneazle de la casa\.$/);
  assert.deepEqual(a.avisos, ['«Heredera» no está en la lista de empleos de PAM: la categoría la elegiste vos.']);
  assert.equal(X.llamadas.actualizar, 1);
  assert.match(X.caja.textContent, /Pedido publicado en «Sueldos de Octubre»/);
  assert.ok(!botones(X.caja).includes('Pedir el sueldo con este rol'), 'ya pedido: el botón no vuelve a salir en este rol');
});

test('panel: no se ofrece si no toca (rol abierto, sin tus mensajes, el tema de sueldos) y no deja pedir dos veces', async () => {
  for (const rol of [{ ...ROL, cerrado: false }, { ...ROL, mios: 0 }, { ...ROL, enRol: false }, null]) {
    const X = await panel({ rol }); await X.pintar(); await X.pintar();
    assert.deepEqual(botones(X.caja), []);
  }
  const enSueldos = await panel({ ruta: '/t700p15-sueldos-de-octubre' }); await enSueldos.pintar();
  assert.equal(enSueldos.llamadas.leerRol, 0, 'en el propio tema de sueldos no se lee nada');
  const sinTema = await panel({ sueldo: { estado: 'sinTema', mes: 'octubre' } }); await sinTema.pintar();
  assert.equal(sinTema.llamadas.leerRol, 0);
  const fuera = await panel({ ruta: '/f180-otros-lugares' }); await fuera.pintar();
  assert.equal(fuera.llamadas.leerRol, 0);
  // ya pediste un rol de empleo este mes / este rol ya lo pediste
  for (const [antes, re] of [[{ rolEsteMes: { post: 7002 }, repetido: null }, /Ya pediste un rol de empleo este mes/], [{ rolEsteMes: null, repetido: { tema: 'x', titulo: 'Sueldos de Septiembre', post: 1 } }, /ya lo pediste en «Sueldos de Septiembre»/]]) {
    const X = await panel({ antes }); await X.pintar();
    boton(X.caja, 'Pedir el sueldo con este rol').click(); await espera(30);
    const ta = X.caja.querySelector('textarea'); ta.value = 'Resumen'; ta.dispatchEvent(new X.d.defaultView.Event('input'));
    assert.match(X.caja.textContent, re);
    assert.ok(boton(X.caja, 'Revisar y publicar').disabled);
  }
  // te pidieron corregir: el pedido corregido va en un mensaje nuevo (lo de este mes no bloquea)
  const C = await panel({ antes: { rolEsteMes: { post: 7002 }, repetido: { tema: 'x', post: 7002 } }, sueldo: { ...SUELDO, pedido: { id: 7002, monto: 75 }, resp: { v: 'corregir', id: 7003, autor: 'Staff', frase: 'falta el resumen' } } });
  await C.pintar();
  boton(C.caja, 'Pedir el sueldo con este rol').click(); await espera(30);
  const ta = C.caja.querySelector('textarea'); ta.value = 'Resumen'; ta.dispatchEvent(new C.d.defaultView.Event('input'));
  assert.ok(!boton(C.caja, 'Revisar y publicar').disabled);
});

test('panel: con el sueldo aprobado, «Aplicar a la bóveda» y, desde la puerta, «Terminar en PAM»', async () => {
  const S = { ...SUELDO, pedido: { id: 7002, monto: 75, fecha: 'x' }, resp: { v: 'aprobado', id: 7003, autor: 'Hazel Grim', fecha: 'Ayer' } };
  const X = await panel({ sueldo: S, ruta: '/t301-boveda', rol: { ...ROL, enRol: false } });
  X.respuestas.push({ resultado: 'aceptada', siguiente: true, pasos: [{ estado: 'ok' }, { estado: 'ok' }] });
  await X.pintar();
  assert.deepEqual(botones(X.caja), ['Aplicar a la bóveda']);
  boton(X.caja, 'Aplicar a la bóveda').click();
  await espera(30);
  const a = X.llamadas.puerta[0];
  assert.equal(a.titulo, 'Sumar el sueldo a la bóveda');
  assert.deepEqual(a.enlaceFinal, { texto: 'Terminar en PAM' });
  const paq = X.llamadas.guardado[CLAVE_SUELDO];
  assert.deepEqual([paq.pj, paq.monto, paq.enlacePet, paq.enlaceAce, paq.numeros.actuales], [PJ, 75, PET, ACE, 376]);
  assert.deepEqual(X.llamadas.pam, [{ hash: '#boveda' }]);
  assert.equal(X.llamadas.actualizar, 1);
  // cobrado: ya no hay botón
  const Y = await panel({ sueldo: S, boveda: { url: 'x', propios: [{ id: 9999, d: 75, enl: PET }] } });
  await Y.pintar();
  assert.ok(!botones(Y.caja).includes('Aplicar a la bóveda'));
});

test('panel Mi PJ: con la pieza del sueldo hay un sitio en la tarjeta; sin ella, la tarjeta de siempre', async () => {
  const { crearPanelMiPj } = await import('../../js/paginas/panel/MiPjPanel.js');
  const datos = { v: 2, pj: PJ, leido: new Date().toISOString(), sueldo: SUELDO, boveda: null, ficha: null, roles: [], oficiales: [] };
  const pinta = sueldo => {
    const dom = new JSDOM('<!doctype html><body><div id="mipj"></div></body>', { url: 'https://pam.test/panel.html' });
    const d = dom.window.document;
    d.defaultView.localStorage.setItem('mipj.' + CUENTA.id, JSON.stringify(datos));
    d.defaultView.localStorage.setItem('mipj.ui', JSON.stringify({ abierto: true }));
    const vistos = [];
    crearPanelMiPj({ root: d.getElementById('mipj'), documento: d, guardado: d.defaultView.localStorage, cargar: async () => datos, ventana: { ancho: 1200, alto: 800 }, pamUrl: 'x', cuenta: CUENTA,
      sueldo: sueldo ? { pintar: c => vistos.push(c && c.id) } : null });
    return { html: d.getElementById('mipj').innerHTML, vistos };
  };
  const con = pinta(true), sin = pinta(false);
  assert.deepEqual(con.vistos, ['mipj-sueldo']);
  assert.equal(con.html.replace('<div id="mipj-sueldo"></div>', ''), sin.html);
});
