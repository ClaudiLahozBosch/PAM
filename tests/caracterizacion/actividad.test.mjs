// Roles, misiones, sueldo y oficiales (fase 5c): PAM tiene que leer EXACTAMENTE lo mismo que Mi PJ.
// Se monta un foro inventado (fixtures/actividad/foro.mjs) y lo leen los dos:
//   · el pam-mi-pj.user.js antiguo entero, en jsdom, con su fetch apuntando al foro inventado;
//   · PAM (leerMiPj) con un agente de prueba que sirve las mismas páginas.
// Y después el panel nuevo y el antiguo pintan esos datos. Las únicas diferencias son los arreglos R09 y R10.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { leerMiPj, aDatosMiPj } from '../../js/servicios/MiPj.js';
import { crearPanelMiPj } from '../../js/paginas/panel/MiPjPanel.js';
import { partesDeFecha } from '../../js/lectores/FechaForo.js';
import { foroDePrueba, rutaDe } from '../fixtures/actividad/foro.mjs';

const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const sistema = new Sistema(json('sistema.json')), compendio = new Compendio(json('arcanos.json'));
const deps = { sistema, compendio, lector: new LectorFicha(sistema, compendio), foros: json('foros.json').foros, cierres: json('cierres-oficial.json').avisos };
const VIEJO = readFileSync(new URL('../../pam-mi-pj.user.js', import.meta.url), 'utf8');
const CUENTA = { id: 5203, nombre: 'Irvin Giles' };
const FORO = 'https://hp-avada-kedavra.foroactivo.com';
const PAGINAS = foroDePrueba(new Date());
const espera = ms => new Promise(r => setTimeout(r, ms));
const callar = async fn => { const w = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = w; } };

/** Lo que lee el Mi PJ antiguo: su «actualizar» con el foro inventado; devuelve sus datos guardados. */
async function leidoPorElAntiguo() {
  const ud = `<script>_userdata["user_id"] = ${CUENTA.id}; _userdata["username"] = "${CUENTA.nombre}"; _userdata["session_logged_in"] = 1;</script>`;
  const dom = new JSDOM(`<!doctype html><html><head>${ud}</head><body></body></html>`, { url: FORO + '/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, gm = { 'mipj.ui': JSON.stringify({ abierto: false }) };
  w.GM_getValue = (k, d) => (k in gm ? gm[k] : d);
  w.GM_setValue = (k, v) => { gm[k] = v; };
  w.GM_listValues = () => Object.keys(gm);
  w._userdata = { session_logged_in: 1, username: CUENTA.nombre, user_id: CUENTA.id };
  w.unsafeWindow = w;
  w.fetch = async url => { const html = PAGINAS[rutaDe(String(url))]; return { ok: html != null, status: html != null ? 200 : 404, url: String(url), text: async () => html ?? '', json: async () => ({}) }; };
  w.eval(VIEJO);
  for (let i = 0; i < 300 && !gm['mipj.' + CUENTA.id]; i++) await espera(20);
  const d = JSON.parse(gm['mipj.' + CUENTA.id]);
  w.close();
  return d;
}

/** Lo que lee PAM con el agente (las mismas páginas). */
async function leidoPorPam() {
  const { window: w } = new JSDOM('');
  globalThis.DOMParser = w.DOMParser;
  const agente = {
    hola: async () => ({ agente: 'x', protocolo: 1, foro: 'hp-avada-kedavra.foroactivo.com', cuenta: CUENTA }),
    async leer(ruta) { const html = PAGINAS[rutaDe(ruta)]; if (html == null) throw new Error('HTTP 404 en ' + ruta); return new w.DOMParser().parseFromString(html, 'text/html'); }
  };
  const mem = new Map();
  const memoria = { gv: (k, d) => (mem.has(k) ? JSON.parse(mem.get(k)) : d), sv: (k, v) => mem.set(k, JSON.stringify(v)) };
  return aDatosMiPj(await leerMiPj(agente, { ...deps, memoria }), sistema);
}

const [antiguo, nuevo] = await callar(() => Promise.all([leidoPorElAntiguo(), leidoPorPam()]));

test('roles: los mismos, con las misiones y en el mismo orden', () => {
  assert.deepEqual(nuevo.roles, antiguo.roles);
  assert.deepEqual(nuevo.roles.map(r => r.titulo), ['La cabaña', 'Tirada en el bosque', '[Oficial] La boda', 'Rol en la taberna', '[Misión] La cripta'],
    'fuera: los míos, el sueldo (no es rol), el foro de fuera del rol y la misión cuyo turno es de otro');
  const tirada = nuevo.roles.find(r => r.tid === 520);
  assert.deepEqual([tirada.autor, tirada.fecha], ['Bruno Ketch', 'Sáb 31 Oct 2026 - 22:10'], 'si el último es de los dados, cuenta el anterior');
  const M = nuevo.roles.find(r => r.tid === 700).mision;
  assert.deepEqual([M.turno, M.n, M.master, M.post, M.supuesta], [true, '2', 'Ofelia Marsh', 9104, false]);
  assert.equal(new Date(M.vence).toISOString().slice(0, 13), '2026-11-12T17', 'jueves 12 a las 18.00 de España');
});

test('sueldo: el mismo pedido y la misma respuesta', () => {
  const sin = ({ leido, formulario, ...S }) => S;
  assert.deepEqual(sin(nuevo.sueldo), sin(antiguo.sueldo));
  assert.equal(nuevo.sueldo.pedido.monto, 300);
  assert.deepEqual([nuevo.sueldo.resp.v, nuevo.sueldo.resp.autor, nuevo.sueldo.resp.id], ['aprobado', 'Cora Blest', 9403]);
  assert.equal(nuevo.sueldo.formulario, FORO + '/t89-formularios-para-solicitar-sueldo', 'el enlace al formulario, absoluto (el panel está en un iframe)');
});

test('oficiales: las mismas cuentas; el cerrado queda marcado (R09)', () => {
  const comun = O => ({ ...O, url: new URL(O.url, FORO).href, leido: 0, cerrado: undefined, parts: O.parts.map(({ ultimoId, ...p }) => p) });
  assert.deepEqual(nuevo.oficiales.map(comun), antiguo.oficiales.map(comun));
  const robo = nuevo.oficiales.find(O => O.tid === 800), irvin = robo.parts.find(p => p.autor === 'Irvin Giles');
  assert.deepEqual([irvin.posts, irvin.cuentan, irvin.fuera.dia, irvin.ultimoId], [4, 3, 1, 9207], 'cuatro el mismo día: el cuarto no cuenta');
  assert.ok(!robo.parts.some(p => p.autor === 'Tramas' || p.autor === 'Dados Mágicos'));
  assert.equal(robo.cerrado, undefined);
  assert.equal(nuevo.oficiales.find(O => O.tid === 810).cerrado, true, '«¡AVISO! … cerrado» del staff');
});

test('R09: sin año en la fecha, el año sale del día de la semana', () => {
  const hoy = new Date(2026, 10, 3, 12); // martes 3/11/2026
  assert.equal(partesDeFecha('Lun 2 Nov - 10:00', hoy).y, 2026);
  assert.equal(partesDeFecha('Sáb 2 Nov - 10:00', hoy).y, 2024, 'el 2/11 fue sábado en 2024 (Mi PJ decía 2026)');
  assert.equal(partesDeFecha('Mié 5 Nov - 10:00', hoy).y, 2025, 'en el futuro no: el año anterior');
  assert.equal(partesDeFecha('Mar 2 Mar 2021 - 10:00', hoy).y, 2021, 'con año, el año');
  assert.deepEqual(partesDeFecha('Lun 2 Mar 2026, 11:03 pm', hoy), { y: 2026, mo: 2, d: 2, h: 23, mi: 3 });
  assert.equal(partesDeFecha('Hoy a las 10:00', hoy).d, 3);
});

/* ---------------- el panel con esos datos ---------------- */
const OTRA = { id: 999, nombre: 'Otra Cuenta' };
// otra cuenta del mismo navegador, con un turno de misión y un oficial (lo que leyó la última vez)
const otraCuenta = () => {
  const r = structuredClone(nuevo.roles.find(x => x.tid === 700)); r.tid = 701;
  const O = structuredClone(nuevo.oficiales.find(x => x.tid === 800)); O.parts[0].autor = OTRA.nombre;
  return { 'mipj.cuentas': JSON.stringify({ [CUENTA.id]: { nombre: CUENTA.nombre }, [OTRA.id]: { nombre: OTRA.nombre } }), ['mipj.' + OTRA.id]: JSON.stringify({ v: 2, pj: OTRA.nombre, roles: [r], oficiales: [O], leido: new Date().toISOString() }) };
};

function pintarAntiguo(datos, ui, extra = {}) {
  const ud = `<script>_userdata["user_id"] = ${CUENTA.id}; _userdata["username"] = "${CUENTA.nombre}"; _userdata["session_logged_in"] = 1;</script>`;
  const dom = new JSDOM(`<!doctype html><html><head>${ud}</head><body></body></html>`, { url: FORO + '/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const gm = { ['mipj.' + CUENTA.id]: JSON.stringify(datos), 'mipj.ui': JSON.stringify(ui), ...extra };
  w.GM_getValue = (k, d) => (k in gm ? gm[k] : d);
  w.GM_setValue = (k, v) => { gm[k] = v; };
  w.GM_listValues = () => Object.keys(gm);
  w._userdata = { session_logged_in: 1, username: CUENTA.nombre, user_id: CUENTA.id };
  w.unsafeWindow = w;
  w.fetch = () => Promise.reject(new Error('sin red'));
  w.eval(VIEJO);
  const html = w.document.getElementById('mipj').innerHTML;
  w.close();
  return html;
}
function panelNuevo(datos, ui, extra = {}) {
  const { window: w } = new JSDOM('<!doctype html><html><head></head><body><div id="mipj"></div></body></html>', { url: 'https://claudilahozbosch.github.io/PAM/panel.html' });
  const mem = new Map([['mipj.' + CUENTA.id, JSON.stringify(datos)], ['mipj.ui', JSON.stringify(ui)], ...Object.entries(extra)]);
  const guardado = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const p = crearPanelMiPj({ root: w.document.getElementById('mipj'), documento: w.document, guardado, cargar: async () => datos, ventana: { ancho: 1400, alto: 900 }, pamUrl: 'https://x/', cuenta: CUENTA });
  p.pintar();
  return { w, p, root: w.document.getElementById('mipj'), mem };
}
const pintarNuevo = (datos, ui, extra) => panelNuevo(datos, ui, extra).root.innerHTML;

// Diferencias permitidas: la biblioteca y los canjes (aún no están), el ✕ de los oficiales (R10)
// y el enlace del formulario del sueldo (absoluto, porque el panel está en un iframe)
const igualar = s => s
  .replaceAll('Todavía no está en esta versión de prueba.', 'Tocá «Actualizar».')
  .replace(/<button class="x" data-a="ocultar-of"[^>]*>✕<\/button>/g, '')
  .replaceAll(FORO + '/t89-formularios-para-solicitar-sueldo', '/t89-formularios-para-solicitar-sueldo')
  .replace(/<div class="card" id="mipj-canjes">.*?<\/div><\/div>/s, '').replace(/<div class="card" id="mipj-canjes"><\/div>/, '')
  .replace(/<div class="card"><div class="ct">📜 Biblioteca de oficiales.*?<\/button><\/div><\/div>/s, '')
  .replace(/\s+/g, ' ').replace(/> </g, '><').trim();
// el antiguo no sabe que la boda está cerrada (R09): se le quita para comparar el resto
const sinCerrados = d => ({ ...d, oficiales: d.oficiales.filter(O => !O.cerrado) });

test('panel abierto con roles, misión, oficiales y sueldo: igual que Mi PJ (salvo R09 y R10)', () => {
  const ui = { abierto: true };
  const nuevoH = igualar(pintarNuevo(nuevo, ui)), viejoH = igualar(pintarAntiguo(sinCerrados(nuevo), ui));
  assert.equal(nuevoH, viejoH);
  assert.match(nuevoH, /✒ Te toca responder<span class="n">4<\/span>/);
  assert.match(nuevoH, /⚔ \[Misión\] La cripta|⚔ La cripta/);
  assert.match(nuevoH, /🎓 Oficiales en curso/);
  assert.match(nuevoH, /✓ Aprobado · falta sumarlo/);
  assert.doesNotMatch(nuevoH, /La boda<\/a><div class="dim">\d+ posts/, 'R09: el oficial cerrado no sale en curso');
});

test('panel: «ver todos», viejos y otras cuentas, igual que Mi PJ', () => {
  for (const ui of [{ abierto: true, todos: true, viejos: true }, { abierto: true, viejos: false }]) {
    const extra = otraCuenta();
    assert.equal(igualar(pintarNuevo(nuevo, ui, extra)), igualar(pintarAntiguo(sinCerrados(nuevo), ui, extra)), JSON.stringify(ui));
  }
  assert.match(pintarNuevo(nuevo, { abierto: true }, otraCuenta()), /Tus otras cuentas.*Otra Cuenta/s);
});

test('pastilla: roles, turnos que vencen y sueldo, igual que Mi PJ', () => {
  const d = structuredClone(nuevo);
  d.roles.find(r => r.tid === 700).mision.vence = Date.now() + 5 * 36e5; // vence en 5 h
  d.sueldo.pedido = null; d.sueldo.resp = null; // sin pedir
  const nuevoH = pintarNuevo(d, { abierto: false }), viejoH = pintarAntiguo(sinCerrados(d), { abierto: false });
  assert.equal(igualar(nuevoH), igualar(viejoH));
  assert.match(nuevoH, /<span class="n" title="Roles donde te toca responder">4<\/span><span class="ms"[^>]*>⚔1<\/span><span class="sd" title="Sueldo del mes sin pedir">⚜<\/span>/);
});

test('sueldo: cada estado, igual que Mi PJ', () => {
  const casos = {
    sinTema: S => ({ estado: 'sinTema', mes: S.mes, formulario: S.formulario }),
    sinPedir: S => ({ ...S, pedido: null, resp: null }),
    esperando: S => ({ ...S, resp: null }),
    corregir: S => ({ ...S, resp: { v: 'corregir', frase: 'falta el enlace', id: 9403, autor: 'Cora Blest', fecha: 'Lun 2 Nov 2026 - 11:00' } }),
    aprobado: S => S
  };
  for (const [k, f] of Object.entries(casos)) {
    const d = { ...nuevo, sueldo: f(structuredClone(nuevo.sueldo)) };
    assert.equal(igualar(pintarNuevo(d, { abierto: true })), igualar(pintarAntiguo(sinCerrados(d), { abierto: true })), k);
  }
  const d = { ...nuevo, sueldo: { ...nuevo.sueldo, pedido: null, resp: null } };
  assert.match(pintarNuevo(d, { abierto: true }), new RegExp(`<a href="${FORO}/t89-formularios-para-solicitar-sueldo">Formulario</a>`), 'el formulario se abre en el foro');
});

test('R10: ✕ oculta un oficial hasta que vuelvas a escribir en él', () => {
  const { root, p, mem } = panelNuevo(nuevo, { abierto: true });
  const x = root.querySelector('[data-a="ocultar-of"][data-t="800"]');
  assert.equal(x.getAttribute('data-l'), '9207', 'tu último mensaje en el oficial');
  assert.equal(x.getAttribute('title'), 'Ocultar hasta que vuelvas a escribir en él');
  x.click();
  assert.ok(!/El robo/.test(root.innerHTML), 'oculto');
  assert.deepEqual(JSON.parse(mem.get('mipj.ocultosOf.' + CUENTA.id)), { 800: 9207 });
  // vuelves a escribir: tu último mensaje es otro y vuelve a salir
  const d = structuredClone(nuevo); d.oficiales.find(O => O.tid === 800).parts.find(q => q.autor === 'Irvin Giles').ultimoId = 9300;
  const otro = panelNuevo(d, { abierto: true }, { ['mipj.ocultosOf.' + CUENTA.id]: JSON.stringify({ 800: 9207 }) });
  assert.match(otro.root.innerHTML, /El robo/);
  assert.equal(p.datos.oficiales.length, 2);
});

test('✕ de un rol: se oculta hasta que haya un mensaje nuevo, como en Mi PJ', () => {
  const { root, mem } = panelNuevo(nuevo, { abierto: true });
  root.querySelector('[data-a="ocultar"][data-t="500"]').click();
  assert.ok(!/Rol en la taberna/.test(root.innerHTML));
  assert.deepEqual(JSON.parse(mem.get('mipj.ocultos.' + CUENTA.id)), { 500: 9010 });
});

test('R09: los avisos de cierre salen de data/cierres-oficial.json y se editan a mano', async () => {
  const { crearEsCierre } = await import('../../js/reglas/Oficiales.js');
  const esCierre = crearEsCierre(json('cierres-oficial.json').avisos);
  assert.ok(esCierre('¡AVISO! Este oficial queda cerrado. Gracias.'));
  assert.ok(esCierre('¡Aviso!\nLa trama queda CERRADA por inactividad.'), 'sin importar mayúsculas ni saltos');
  assert.ok(esCierre('Os dejo la ficha final de la aventura.'));
  assert.ok(!esCierre('La puerta estaba cerrada. ¡AVISO! al resto'), 'los trozos van en orden');
  assert.ok(!esCierre('AVISO: queda cerrado'), 'los signos cuentan: «¡AVISO!» no es «AVISO:»');
  // una frase nueva, añadida como lo haría Hana: una lista de trozos
  const conNueva = crearEsCierre([...json('cierres-oficial.json').avisos, ['Oficial finalizado']]);
  assert.ok(conNueva('Oficial FINALIZADO, gracias a todos.'));
  assert.ok(crearEsCierre(['Tema terminado'])('tema   terminado'), 'un aviso de un solo trozo también puede ir sin corchetes');
});

test('cierres-oficial.json mal escrito: Mi PJ sigue funcionando, sin detectar cierres', async () => {
  const { cargarCierresOficial } = await import('../../js/datos/cargar.js');
  const w = console.warn; let aviso = ''; console.warn = m => { aviso = String(m); };
  try {
    assert.deepEqual(await cargarCierresOficial(async () => { throw new SyntaxError('Unexpected token ]'); }), []);
    assert.match(aviso, /cierres-oficial\.json/);
    assert.deepEqual(await cargarCierresOficial(async () => ({ avisos: 'mal' })), []);
  } finally { console.warn = w; }
  assert.deepEqual(await cargarCierresOficial(async url => json(String(url).match(/data\/([^?]+)/)[1])), json('cierres-oficial.json').avisos);
});

test('«Enviar a PAM»: el agente abre PAM con los datos de Mi PJ y PAM devuelve su tema', async () => {
  const { window: w } = new JSDOM('<!doctype html><html><head></head><body><div id="mipj"></div></body></html>', { url: 'https://claudilahozbosch.github.io/PAM/panel.html' });
  const mem = new Map([['mipj.' + CUENTA.id, JSON.stringify(nuevo)], ['mipj.ui', JSON.stringify({ abierto: true })]]);
  const guardado = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  let pedido = null, respuesta = { abierta: true, respuesta: { pamForoOk: 1, tema: { skin: 'pixel', gold: '#abcdef' } } };
  const agente = { tamano: async () => ({}), tema: async () => ({}), abrirPam: async d => { pedido = d; return respuesta; } };
  const p = crearPanelMiPj({ root: w.document.getElementById('mipj'), documento: w.document, guardado, cargar: async () => nuevo, ventana: { ancho: 1400, alto: 900 }, pamUrl: 'https://x/', cuenta: CUENTA, agente });
  p.pintar();
  const pam = () => w.document.querySelector('[data-a="pam"]');
  pam().click(); await espera(10);
  assert.equal(pedido.hash, '#foro');
  assert.equal(pedido.respuesta, 'pamForoOk');
  assert.equal(pedido.mensaje.pamForo, 1);
  assert.equal(pedido.mensaje.data.cuenta, nuevo.pj, 'como Mi PJ: «cuenta» es el nombre del personaje');
  assert.deepEqual(pedido.mensaje.data.roles, nuevo.roles);
  assert.match(w.document.head.innerHTML, /--m-gold:#abcdef/, 'se queda con el tema de PAM');
  assert.equal(JSON.parse(mem.get('mipj.tema')).skin, 'pixel');
  respuesta = { abierta: false }; pam().click(); await espera(10);
  assert.match(w.document.querySelector('.err').textContent, /bloqueó la ventana de PAM/);
  respuesta = { abierta: true, respuesta: null }; pam().click(); await espera(10);
  assert.match(w.document.querySelector('.err').textContent, /PAM no respondió/);
});
