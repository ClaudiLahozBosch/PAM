// «Aplicar el canje» y «Terminar en PAM» en el foro (fase 6b·3), comparados con Mi PJ.
// El Mi PJ antiguo aplica DE VERDAD un canje aprobado sobre un foro inventado que recuerda lo que se edita y se publica
// (fixtures/canjes/registro.mjs); PAM prepara la misma puerta sobre el mismo foro. Se compara:
//   · la puerta (título, explicación, avisos y cada paso con su texto);
//   · lo que queda guardado (la petición «aplicada») y lo que se le deja a PAM para cerrar («pam.aprobacion»);
//   · el reintento: con todo ya hecho en el foro, los pasos salen «Ya está igual» y el enlace del movimiento es el que ya estaba.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { crearCanjesDelForo } from '../../js/servicios/CanjesDelForo.js';
import { mismoTexto } from '../../js/reglas/Canjes.js';
import { paginaDe } from '../fixtures/actividad/foro.mjs';
import { registroDePrueba, editar, mensaje } from '../fixtures/canjes/registro.mjs';

const VIEJO = readFileSync(new URL('../../pam-mi-pj.user.js', import.meta.url), 'utf8');
const foros = JSON.parse(readFileSync(new URL('../../data/foros.json', import.meta.url), 'utf8')).foros;
const HOST = 'hp-avada-kedavra.foroactivo.com', FORO = 'https://' + HOST;
const CUENTA = { id: 5203, nombre: 'Irvin Giles' };
const CLAVE_VIEJA = 'cuentas.' + HOST + '.' + CUENTA.id, CLAVE_NUEVA = 'pam.cuentas.' + HOST + '.' + CUENTA.id;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const espera = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (cond, ms = 6000) => { for (let t = 0; t < ms; t += 20) { const r = cond(); if (r) return r; await espera(20); } throw new Error('no llegó'); };
const ventanas = [];
after(() => ventanas.forEach(w => { try { w.close(); } catch { /* ya cerrada */ } }));

/** La petición aprobada, con los códigos que preparó PAM. */
const PET = {
  post: '9600', enlace: FORO + '/viewtopic?p=9600#9600', creado: '2026-11-02T09:00:00.000Z', fecha: '', pj: 'Irvin Giles', gastadas: 500, estado: 'aprobada', descartadas: [],
  aprobacion: { post: '9603', enlace: FORO + '/viewtopic?p=9603#9603', autor: 'Cora Blest', fecha: 'Lun 2 Nov 2026 - 12:00', clase: 'aprobada', importe: null, extracto: 'Irvin Giles: los canjes son correctos', revisorConfirmado: true, sinNombre: false, confirmada: true },
  ficha: { codigo: 'Nombre y Apellido: Irvin Giles\nEdad: 30\n[spoiler]Vigor 3[/spoiler]', base: 'Nombre y Apellido: Irvin Giles\nEdad: 30', hechos: 'Vigor 2 → 3', manual: ['Ventajas: Suerte'] },
  boveda: { numeros: { iniciales: 2500, actuales: 2000, totales: 5500 }, divisor: '✦',
    html: 'Grageas iniciales: 2500\nGrageas que se añaden/quitan: -500\nGrageas actuales: 2000\nGrageas totales: 5500\n{Enlaces»' }
};

/** Un foro que recuerda lo que se edita y se publica. */
function foroVivo() {
  const P = registroDePrueba();
  let siguiente = 9900;
  const exito = id => `El mensaje se ha enviado con éxito. <a href="/viewtopic?t=1&start=0#${id}">ver</a>`;
  return {
    P,
    leer: ruta => paginaDe(P, ruta),
    enviar(cuerpo) {
      const c = new URLSearchParams(cuerpo), msg = c.get('message') || '';
      if (c.get('mode') === 'editpost') { const p = c.get('p'); P['/post?p=' + p + '&mode=editpost'] = editar(msg, p); return exito(p); }
      const t = c.get('t'), id = siguiente++, k = Object.keys(P).find(x => x.startsWith('/t' + t + '-'));
      P[k] = P[k].replace('</body>', mensaje(id, 'Irvin Giles', 'Mar 3 Nov 2026 - 12:00', esc(msg).replace(/\n/g, '<br>')) + '</body>');
      P['/post?p=' + id + '&mode=editpost'] = editar(msg, id);
      return exito(id);
    }
  };
}

/** El Mi PJ antiguo en el foro (almacén `gm`, se modifica). */
function antiguo(gm, foro) {
  const ud = `<script>_userdata["user_id"] = ${CUENTA.id}; _userdata["username"] = "${CUENTA.nombre}"; _userdata["session_logged_in"] = 1;</script>`;
  const dom = new JSDOM(`<!doctype html><html><head>${ud}</head><body></body></html>`, { url: FORO + '/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window; ventanas.push(w);
  w.GM_getValue = (k, d) => (k in gm ? structuredClone(gm[k]) : d);
  w.GM_setValue = (k, v) => { gm[k] = structuredClone(v); };
  w.GM_listValues = () => Object.keys(gm);
  w._userdata = { session_logged_in: 1, username: CUENTA.nombre, user_id: CUENTA.id };
  w.unsafeWindow = w;
  w.fetch = async (url, op) => {
    if (op && op.method === 'POST') { const t = foro.enviar(String(op.body)); return { ok: true, status: 200, text: async () => t }; }
    const html = foro.leer(String(url));
    return { ok: html != null, status: html != null ? 200 : 404, url: String(url), text: async () => html ?? '' };
  };
  w.console.warn = () => {};
  w.eval(VIEJO);
  return w;
}

/** PAM con un agente de prueba sobre el foro `foro` (almacén `alm`). */
function nuevo(alm, foro) {
  const { window: w } = new JSDOM('');
  ventanas.push(w);
  const agente = {
    async leer(ruta) { const html = foro.leer(ruta); if (html == null) throw new Error('HTTP 404 en ' + ruta); return new w.DOMParser().parseFromString(html, 'text/html'); },
    leerDato: async k => (k in alm ? structuredClone(alm[k]) : null),
    guardarDato: async (k, v) => { alm[k] = structuredClone(v); return { guardado: true }; },
    puerta: async () => { throw new Error('no se usa'); }
  };
  const mem = new Map();
  const memoria = { gv: (k, d) => (mem.has(k) ? JSON.parse(mem.get(k)) : d), sv: (k, v) => mem.set(k, JSON.stringify(v)) };
  return crearCanjesDelForo(agente, { foroHost: HOST, cuenta: CUENTA, cfg: foros[HOST], memoria });
}

/* ---------------- Mi PJ aplica el canje ---------------- */
// Primero Mi PJ lee el foro (para tener su «foto» de ficha y bóveda), con la petición aprobada guardada.
const foroViejo = foroVivo();
const gm = { 'mipj.ui': { abierto: true }, [CLAVE_VIEJA]: { peticiones: [structuredClone(PET)] } };
antiguo(gm, foroViejo);
await hasta(() => gm[CLAVE_VIEJA].foto && gm['mipj.' + CUENTA.id]);
const w = antiguo(gm, foroViejo);
const bAplicar = await hasta(() => [...w.document.querySelectorAll('#mipj-canjes button')].find(b => b.textContent === 'Aplicar el canje'));
bAplicar.click();
const dlg = await hasta(() => w.document.querySelector('.puerta'));
const puertaVieja = {
  titulo: dlg.querySelector('.p-cab b').textContent, explicacion: dlg.querySelector('.p-expl').textContent,
  avisos: [...dlg.querySelectorAll(':scope > .aviso')].map(a => a.textContent),
  pasos: [...dlg.querySelectorAll('.p-paso')].map(c => ({ cab: c.querySelector('.p-paso-cab span').textContent, estado: c.querySelector('.p-estado').textContent, texto: c.querySelector('textarea')?.value ?? null }))
};
[...dlg.querySelectorAll('button')].find(b => b.textContent === 'Aceptar').click();
const bTerminar = await hasta(() => [...dlg.querySelectorAll('button')].find(b => b.textContent === 'Terminar en PAM'));
const finalViejo = { info: dlg.querySelector('.p-info').textContent, estados: [...dlg.querySelectorAll('.p-estado')].map(e => e.textContent) };
bTerminar.click();
await hasta(() => gm['pam.aprobacion']);

/** La puerta de PAM, como la enseña el agente. */
function comoPuerta(a) {
  return {
    titulo: a.titulo, explicacion: a.explicacion, avisos: a.avisos,
    pasos: a.pasos.map((p, k) => {
      const tit = p.tipo === 'editar' ? 'Editar mensaje' : 'Publicar en el tema';
      const igual = p.igual || (p.tipo === 'editar' && !p.omitido && mismoTexto(p.original, p.nuevo));
      if (igual) return { cab: (k + 1) + '. ' + tit, estado: 'Ya está igual', texto: null };
      return { cab: (k + 1) + '. ' + tit + (p.descripcion ? ' · ' + p.descripcion : ''), estado: p.omitido ? 'No se hará' : 'Pendiente', texto: p.omitido ? null : (p.tipo === 'editar' ? p.nuevo : p.texto) };
    })
  };
}
const datos = { pj: 'Irvin Giles', leido: new Date().toISOString(), ficha: { url: FORO + '/t300-' }, boveda: { url: FORO + '/t301-', titulo: 'Bóveda de Irvin Giles', act: 2500 } };

test('la puerta «Aplicar el canje aprobado»: la misma que Mi PJ (bóveda, movimiento, ficha y aviso)', async () => {
  const S = nuevo({}, foroVivo());
  const a = await S.accionAplicarCanje(structuredClone(PET), datos);
  assert.deepEqual(comoPuerta(a), puertaVieja);
  assert.equal(a.pasos.length, 4);
  assert.match(a.pasos[0].nuevo, /Grageas Totales:\[\/b\] 5\.500\n\[b\]Grageas Actuales:\[\/b\] 2\.000/, 'actuales y totales, con puntos de miles como estaban');
  assert.match(a.pasos[1].texto, /\{Enlaces» \[url=.*9600#9600\]Petición\[\/url\] ✦ \[url=.*9603#9603\]Aceptación\[\/url\]/);
  assert.match(a.pasos[3].texto, /«enlace del paso 2»/);
  assert.ok(a.avisos.some(x => /PAM pide revisar a mano en la ficha: Ventajas: Suerte/.test(x)));
});

test('Mi PJ aplica los cuatro pasos y enseña «Terminar en PAM»', () => {
  assert.deepEqual(finalViejo.estados, ['Hecho', 'Hecho', 'Hecho', 'Hecho']);
  assert.equal(finalViejo.info, 'Hecho.');
});

test('después: la petición aplicada y lo que se le deja a PAM para cerrar, igual que Mi PJ', async () => {
  const vieja = gm[CLAVE_VIEJA].peticiones[0];
  const alm = { [CLAVE_NUEVA]: { peticiones: [structuredClone(PET)] } };
  const S = nuevo(alm, foroVivo());
  await S.marcarAplicada(PET, vieja.aplicada.movimiento);
  await S.dejarCierre(PET);
  const sinFecha = p => ({ ...p, aplicada: { ...p.aplicada, fecha: 'x' } });
  assert.deepEqual(sinFecha(alm[CLAVE_NUEVA].peticiones[0]), sinFecha(vieja));
  const sinCreado = ({ creado, ...p }) => p;
  assert.deepEqual(sinCreado(alm['pam.aprobacion']), sinCreado(gm['pam.aprobacion']));
  assert.deepEqual([alm['pam.aprobacion'].delta, alm['pam.aprobacion'].actuales], ['-500', 2000]);
});

test('reintento: con todo ya hecho en el foro, nada se repite y el aviso enlaza el movimiento que ya estaba', async () => {
  const S = nuevo({}, foroViejo); // el foro como lo dejó Mi PJ
  const a = await S.accionAplicarCanje(structuredClone(PET), datos);
  const mov = gm[CLAVE_VIEJA].peticiones[0].aplicada.movimiento;
  assert.ok(mismoTexto(a.pasos[0].original, a.pasos[0].nuevo), 'la bóveda ya dice 2.000');
  assert.deepEqual([a.pasos[1].igual, a.pasos[1].postExistente], ['El movimiento ya está publicado en tu bóveda.', mov]);
  assert.ok(mismoTexto(a.pasos[2].original, a.pasos[2].nuevo), 'la ficha ya es la nueva');
  assert.equal(a.pasos[3].igual, 'El aviso ya está publicado en tu ficha.');
});

test('lo que no se puede aplicar: los mismos errores que Mi PJ', async () => {
  const S = nuevo({}, foroVivo());
  const con = cambio => { const p = structuredClone(PET); cambio(p); return S.accionAplicarCanje(p, datos); };
  await assert.rejects(con(p => { p.aprobacion.confirmada = false; }), /todavía no está confirmada/);
  await assert.rejects(con(p => { p.aprobacion.importe = 450; }), /El revisor corrigió el importe \(500 → 450\)/);
  await assert.rejects(con(p => { p.boveda.numeros.iniciales = 3000; p.boveda.numeros.actuales = 2500 - 1; }), /Tu bóveda del foro dice 2\.500 grageas actuales, pero el movimiento que preparó PAM empieza en 3\.000/);
  await assert.rejects(con(p => { p.ficha.base = 'otra cosa'; }), /Tu ficha del foro cambió desde que preparaste el canje/);
  await assert.rejects(S.accionAplicarCanje(structuredClone(PET), { ...datos, ficha: null }), /Tocá «Actualizar»: necesito tu bóveda y tu ficha/);
  const sinBoveda = await con(p => { p.boveda = null; });
  assert.deepEqual(sinBoveda.pasos.map(p => p.omitido || 'hace'), ['Sin código de bóveda de PAM.', 'Sin código de bóveda de PAM.', 'hace', 'Sin movimiento de bóveda no hay enlace que poner.']);
});

test('la tarjeta: «Aplicar el canje» → puerta → aplicada; «Terminar en PAM» deja el cierre y abre PAM esperando el cierre', async () => {
  const { crearTarjetaCanjes } = await import('../../js/paginas/panel/CanjesPanel.js');
  const { window: w2 } = new JSDOM('<div class="card" id="mipj-canjes"></div>'); ventanas.push(w2);
  const alm = { [CLAVE_NUEVA]: { peticiones: [structuredClone(PET)] } };
  const S = nuevo(alm, foroVivo());
  const visto = { puertas: [], pam: [], lecturas: 0 };
  const T = crearTarjetaCanjes({ documento: w2.document, servicio: S, datos: () => datos, actualizar: async () => { visto.lecturas++; }, abrirPanel: () => {}, irA: async () => {},
    puerta: async a => { visto.puertas.push(a); return { resultado: 'aceptada', pasos: [{ estado: 'ok' }, { estado: 'ok', post: '9950' }, { estado: 'ok' }, { estado: 'ok' }], siguiente: true }; },
    enviarAPam: op => { visto.pam.push({ op, aprobacion: alm['pam.aprobacion'] }); } });
  const caja = w2.document.getElementById('mipj-canjes');
  T.pintar(caja); await T.recargar();
  [...caja.querySelectorAll('button')].find(b => b.textContent === 'Aplicar el canje').click();
  await hasta(() => /Aplicado en el foro/.test(caja.textContent));
  assert.deepEqual(visto.puertas[0].enlaceFinal, { texto: 'Terminar en PAM' });
  const p = alm[CLAVE_NUEVA].peticiones[0];
  assert.deepEqual([p.estado, p.aplicada.movimiento], ['aplicada', '9950']);
  assert.equal(visto.pam.length, 1);
  assert.deepEqual(visto.pam[0].op, { esperarCierre: true });
  assert.equal(visto.pam[0].aprobacion.peticion, '9600', 'el cierre ya estaba guardado al abrir PAM');
  assert.equal(visto.lecturas, 1, 'y se vuelve a leer el foro');
  assert.match(caja.textContent, /Terminar en PAM/);
});
