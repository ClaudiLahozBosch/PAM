// Los canjes en el foro (fase 6b·2): la tarjeta «⚖ Canjes», publicar la petición y encontrar la respuesta del
// Inspector tienen que ser EXACTAMENTE como en Mi PJ. Se monta un foro inventado (fixtures/canjes/registro.mjs) y:
//   · el pam-mi-pj.user.js antiguo entero, en jsdom, lo lee y publica con su fetch apuntando a ese foro;
//   · PAM (CanjesDelForo + la tarjeta) hace lo mismo con un agente de prueba que sirve las mismas páginas.
// Única diferencia permitida: «Aplicar el canje» y «Terminar en PAM» todavía no hacen nada (fase 6b·3).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { crearCanjesDelForo } from '../../js/servicios/CanjesDelForo.js';
import { crearTarjetaCanjes } from '../../js/paginas/panel/CanjesPanel.js';
import { paginaDe } from '../fixtures/actividad/foro.mjs';
import { registroDePrueba, peticionesGuardadas, PETICION_PAM, BB_PUBLICADA } from '../fixtures/canjes/registro.mjs';

const VIEJO = readFileSync(new URL('../../pam-mi-pj.user.js', import.meta.url), 'utf8');
const foros = JSON.parse(readFileSync(new URL('../../data/foros.json', import.meta.url), 'utf8')).foros;
const HOST = 'hp-avada-kedavra.foroactivo.com', FORO = 'https://' + HOST;
const CUENTA = { id: 5203, nombre: 'Irvin Giles' };
const CLAVE_VIEJA = 'cuentas.' + HOST + '.' + CUENTA.id, CLAVE_NUEVA = 'pam.cuentas.' + HOST + '.' + CUENTA.id;
const PAGINAS = registroDePrueba();
const espera = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (cond, ms = 6000) => { for (let t = 0; t < ms; t += 20) { const r = cond(); if (r) return r; await espera(20); } throw new Error('no llegó'); };
const ventanas = [];
after(() => ventanas.forEach(w => { try { w.close(); } catch { /* ya cerrada */ } }));

/** El Mi PJ antiguo en una página del foro, con su almacén de Tampermonkey `gm` (se modifica). */
function antiguo(gm, ruta = '/', publicados = []) {
  const ud = `<script>_userdata["user_id"] = ${CUENTA.id}; _userdata["username"] = "${CUENTA.nombre}"; _userdata["session_logged_in"] = 1;</script>`;
  const vc = new VirtualConsole(); // jsdom no navega: «location.href = …» solo avisa
  const dom = new JSDOM(`<!doctype html><html><head>${ud}</head><body></body></html>`, { url: FORO + ruta, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window; ventanas.push(w);
  w.GM_getValue = (k, d) => (k in gm ? structuredClone(gm[k]) : d);
  w.GM_setValue = (k, v) => { gm[k] = structuredClone(v); };
  w.GM_listValues = () => Object.keys(gm);
  w._userdata = { session_logged_in: 1, username: CUENTA.nombre, user_id: CUENTA.id };
  w.unsafeWindow = w;
  w.fetch = async (url, op) => {
    if (op && op.method === 'POST') { publicados.push(String(op.body)); return { ok: true, status: 200, text: async () => 'Tu mensaje se publicó con éxito. <a href="/viewtopic?t=34430&start=15#9650">ver</a>' }; }
    const html = paginaDe(PAGINAS, String(url));
    return { ok: html != null, status: html != null ? 200 : 404, url: String(url), text: async () => html ?? '', json: async () => ({}) };
  };
  w.console.warn = () => {};
  w.eval(VIEJO);
  return w;
}

/** PAM: el servicio y la tarjeta con un agente de prueba (almacén `alm`, se modifica). */
function nuevo(alm, { datos = null, puerta = async () => ({ resultado: 'denegada', pasos: [] }) } = {}) {
  const { window: w } = new JSDOM('<!doctype html><html><body><div class="card" id="mipj-canjes"></div></body></html>', { url: 'https://claudilahozbosch.github.io/PAM/panel.html' });
  ventanas.push(w);
  const visto = { puertas: [], ir: [] };
  const agente = {
    async leer(ruta) { const html = paginaDe(PAGINAS, ruta); if (html == null) throw new Error('HTTP 404 en ' + ruta); return new w.DOMParser().parseFromString(html, 'text/html'); },
    leerDato: async k => (k in alm ? structuredClone(alm[k]) : null),
    guardarDato: async (k, v) => { alm[k] = structuredClone(v); return { guardado: true }; },
    puerta: async a => { visto.puertas.push(structuredClone(a)); return puerta(a); }
  };
  const mem = new Map();
  const memoria = { gv: (k, d) => (mem.has(k) ? JSON.parse(mem.get(k)) : d), sv: (k, v) => mem.set(k, JSON.stringify(v)) };
  const servicio = crearCanjesDelForo(agente, { foroHost: HOST, cuenta: CUENTA, cfg: foros[HOST], memoria });
  const tarjeta = crearTarjetaCanjes({ documento: w.document, servicio, datos: () => datos, actualizar: async () => {}, abrirPanel: () => {}, irA: async r => { visto.ir.push(r); } });
  return { w, servicio, tarjeta, visto, caja: w.document.getElementById('mipj-canjes'), mem };
}

/* ---------------- 1. leer el registro: la respuesta de cada petición ---------------- */
const gmLeido = { 'mipj.ui': { abierto: false }, [CLAVE_VIEJA]: { peticiones: peticionesGuardadas() } };
antiguo(gmLeido); // sin datos guardados, Mi PJ lee el foro al arrancar (perfil, ficha, bóveda y registro)
await hasta(() => (gmLeido[CLAVE_VIEJA].peticiones || []).every(p => p.revisado));
const almLeido = { [CLAVE_NUEVA]: { peticiones: peticionesGuardadas() } };
const N1 = nuevo(almLeido);
await N1.servicio.actualizarAprobaciones();

const sinHora = ps => ps.map(({ revisado, ...p }) => p);

test('la respuesta de cada petición: la misma que encuentra Mi PJ', () => {
  assert.deepEqual(sinHora(almLeido[CLAVE_NUEVA].peticiones), sinHora(gmLeido[CLAVE_VIEJA].peticiones));
  const P = Object.fromEntries(almLeido[CLAVE_NUEVA].peticiones.map(p => [p.post, p]));
  assert.equal(P['1234'].noEncontrada, true, 'ya no está en el registro');
  assert.deepEqual([P['9600'].estado, P['9600'].aprobacion.autor, P['9600'].aprobacion.clase, P['9600'].aprobacion.confirmada], ['aprobada', 'Cora Blest', 'aprobada', true],
    'te nombra una Inspectora (Lia no es Inspectora y Bruno pide otra cosa por medio)');
  assert.deepEqual([P['9610'].estado, P['9610'].aprobacion.sinNombre, P['9610'].aprobacion.clase, P['9610'].aprobacion.importe], ['revisar', true, 'corregida', 350], 'no te nombra: se pregunta');
  assert.deepEqual([P['9620'].estado, P['9620'].aprobacion.autor, P['9620'].aprobacion.importe, P['9620'].aprobacion.confirmada], ['aprobada', 'Ofelia Marsh', 250, true]);
  assert.equal(P['9630'].aprobacion, null);
});

test('los Inspectores de Canjes: los del grupo, sin los conectados', () => {
  const g = JSON.parse(N1.mem.get('grupos.' + HOST));
  assert.deepEqual(g.grupos.canjes, [{ id: 31, nombre: 'Cora Blest' }, { id: 12, nombre: 'Ofelia Marsh' }]);
  assert.deepEqual(g.grupos, gmLeido['grupos.' + HOST].grupos);
});

/* ---------------- 2. la tarjeta ---------------- */
/** La tarjeta que pinta Mi PJ con su almacén. */
async function tarjetaAntigua(gm) {
  const w = antiguo({ ...structuredClone(gm), 'mipj.ui': { abierto: true } });
  const c = await hasta(() => w.document.getElementById('mipj-canjes'));
  return c.innerHTML;
}
async function tarjetaNueva(alm) {
  const N = nuevo(alm);
  N.tarjeta.pintar(N.caja);
  await N.tarjeta.recargar();
  return N;
}

test('la tarjeta con peticiones (esperando, aprobada, a confirmar, no encontrada): igual que Mi PJ', async () => {
  const N = await tarjetaNueva(structuredClone(almLeido));
  const viejo = await tarjetaAntigua(gmLeido);
  assert.equal(N.caja.innerHTML, viejo);
  assert.match(viejo, /Esperando a un Inspector de Canjes/);
  assert.match(viejo, /Es la aprobación/);
  assert.match(viejo, /Aplicar el canje/);
});

test('la tarjeta con la petición preparada en PAM: igual que Mi PJ', async () => {
  const N = await tarjetaNueva({ ...structuredClone(almLeido), 'pam.peticion': PETICION_PAM });
  const viejo = await tarjetaAntigua({ ...gmLeido, 'pam.peticion': PETICION_PAM });
  assert.equal(N.caja.innerHTML, viejo);
  assert.match(viejo, /Petición preparada en PAM/);
});

test('la tarjeta vacía y la de otra cuenta: igual que Mi PJ', async () => {
  const otra = { ...PETICION_PAM, cuenta: { id: 1, nombre: 'Otra' } };
  for (const [gm, alm] of [[{}, {}], [{ 'pam.peticion': otra }, { 'pam.peticion': otra }]]) {
    const N = await tarjetaNueva(alm);
    assert.equal(N.caja.innerHTML, await tarjetaAntigua({ ...gmLeido, ...gm, [CLAVE_VIEJA]: {} }));
  }
});

test('«Es la aprobación» y «No lo es»: lo mismo guardado', async () => {
  const N = await tarjetaNueva(structuredClone(almLeido));
  const botones = [...N.caja.querySelectorAll('button')];
  botones.find(b => b.textContent === 'No lo es').click();
  await hasta(() => !N.caja.textContent.includes('No lo es'));
  const x = (await N.servicio.datosCuenta()).peticiones.find(p => p.post === '9610');
  assert.deepEqual([x.estado, x.aprobacion, x.descartadas], ['esperando', null, ['9611']]);
});

/* ---------------- 3. publicar la petición (llegando desde PAM con #escriba-publicar) ---------------- */
test('publicar la petición: la misma puerta, el mismo mensaje y lo mismo guardado', async () => {
  // Mi PJ: llega al registro con #escriba-publicar, abre la puerta sola y se acepta
  const gm = { ...structuredClone(gmLeido), 'pam.peticion': PETICION_PAM };
  const enviados = [];
  const w = antiguo(gm, '/t34430-registro-de-canjes#escriba-publicar', enviados);
  const dlg = await hasta(() => w.document.querySelector('.puerta'));
  const vieja = {
    titulo: dlg.querySelector('.p-cab b').textContent, explicacion: dlg.querySelector('.p-expl').textContent,
    avisos: [...dlg.querySelectorAll(':scope > .aviso')].map(a => a.textContent), texto: dlg.querySelector('textarea').value,
    paso: dlg.querySelector('.p-paso-cab span').textContent
  };
  [...dlg.querySelectorAll('button')].find(b => b.textContent === 'Aceptar').click();
  // Mi PJ apunta la petición al cerrar la puerta
  const cerrar = await hasta(() => [...dlg.querySelectorAll('button')].find(b => b.textContent === 'Cerrar'));
  cerrar.click();
  await hasta(() => gm['pam.peticion'].usado);

  // PAM: lo mismo, con los datos que leyó Mi PJ (ficha y bóveda)
  const foto = gm[CLAVE_VIEJA].foto;
  const datos = { pj: foto.ficha.nombre, leido: new Date().toISOString(), ficha: { url: FORO + foto.ficha.url }, boveda: { url: FORO + foto.boveda.url, titulo: foto.boveda.titulo, act: foto.boveda.grageas.actuales } };
  const alm = { ...structuredClone(almLeido), 'pam.peticion': PETICION_PAM };
  const N = nuevo(alm, { datos, puerta: async () => ({ resultado: 'aceptada', pasos: [{ estado: 'ok', post: '9650' }] }) });
  N.tarjeta.pintar(N.caja);
  await N.tarjeta.alCargarForo(CUENTA.nombre);
  const [a] = N.visto.puertas;
  assert.deepEqual({ titulo: a.titulo, explicacion: a.explicacion, avisos: a.avisos, texto: a.pasos[0].texto, paso: '1. Publicar en el tema · ' + a.pasos[0].descripcion }, vieja);
  assert.deepEqual([a.pasos[0].tipo, a.pasos[0].tema], ['publicar', '34430']);
  assert.equal(new URLSearchParams(enviados[0]).get('message'), a.pasos[0].texto, 'Mi PJ publicó ese mismo texto');
  assert.match(a.avisos[0], /pusiste 2\.400 grageas disponibles, pero tu bóveda del foro dice 2\.500/);

  const sinCreado = ({ creado, ...p }) => p;
  const ultima = l => sinCreado(l[l.length - 1]);
  assert.deepEqual(ultima(alm[CLAVE_NUEVA].peticiones), ultima(gm[CLAVE_VIEJA].peticiones), 'la petición nueva, apuntada igual');
  assert.equal(ultima(alm[CLAVE_NUEVA].peticiones).post, '9650');
  assert.deepEqual(alm[CLAVE_NUEVA].peticiones.map(p => p.post), gm[CLAVE_VIEJA].peticiones.map(p => p.post));
  assert.deepEqual(alm['pam.peticion'].usado.post, gm['pam.peticion'].usado.post);
  assert.deepEqual(N.visto.ir, ['/viewtopic?p=9650#9650'], 'el foro va al mensaje publicado');
});

test('publicar una petición que ya está en el registro: no se publica otra vez', async () => {
  const yaPub = { ...PETICION_PAM, creado: '2026-11-02T08:00:00.000Z', pj: 'Irvin Giles', disponibles: '3.000', gastadas: '500', restantes: '2.500', texto: 'ESTADÍSTICAS\nVigor: 2 → 3 — 400 grageas' };
  const datos = { pj: 'Irvin Giles', leido: new Date().toISOString(), ficha: {}, boveda: { url: FORO + '/t301-', titulo: 'Bóveda de Irvin Giles', act: 2500 } };
  const alm = { 'pam.peticion': yaPub };
  const N = nuevo(alm, { datos, puerta: async a => ({ resultado: a.pasos.every(p => p.igual) ? 'igual' : 'aceptada', pasos: [{ estado: 'igual' }] }) });
  N.tarjeta.pintar(N.caja);
  await N.tarjeta.recargar();
  [...N.caja.querySelectorAll('button')].find(b => b.textContent === 'Publicar en el registro').click();
  await hasta(() => N.caja.textContent.includes('ya estaba publicada'));
  assert.equal(N.visto.puertas[0].pasos[0].texto, BB_PUBLICADA);
  assert.equal(N.visto.puertas[0].pasos[0].igual, 'Ya publicaste esta misma petición en el registro.');
  assert.deepEqual(alm[CLAVE_NUEVA].peticiones.map(p => p.post), ['9630'], 'apuntada con el mensaje que ya estaba');
  assert.equal(alm['pam.peticion'].usado.post, '9630');
  assert.deepEqual(N.visto.ir, []);
});

test('llegar desde PAM sin petición para esta cuenta: el mismo aviso que Mi PJ', async () => {
  const N = nuevo({}, { datos: { leido: new Date().toISOString() } });
  N.tarjeta.pintar(N.caja);
  await N.tarjeta.alCargarForo(CUENTA.nombre);
  const w = antiguo({ ...structuredClone(gmLeido), [CLAVE_VIEJA]: { foto: gmLeido[CLAVE_VIEJA].foto } }, '/t34430-registro-de-canjes#escriba-publicar');
  const c = await hasta(() => { const x = w.document.getElementById('mipj-canjes'); return x && x.querySelector('.err') ? x : null; });
  assert.equal(N.caja.innerHTML, c.innerHTML);
  assert.match(c.textContent, /no hay ninguna petición pendiente para esta cuenta \(Irvin Giles\)/);
});
