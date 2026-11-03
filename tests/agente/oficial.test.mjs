// La barra «🎓 Este oficial» de arriba de los mensajes (fase 5c): la pinta el agente con las cuentas de PAM
// y tiene que salir igual que la del Mi PJ antiguo en la misma página.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { foroDePrueba, rutaDe } from '../fixtures/actividad/foro.mjs';

const PAM = 'https://claudilahozbosch.github.io', FORO = 'https://hp-avada-kedavra.foroactivo.com';
const CUENTA = { id: 5203, nombre: 'Irvin Giles' };
const PAGINAS = foroDePrueba(new Date());
const RUTA = '/t800-oficial-el-robo';
const espera = ms => new Promise(r => setTimeout(r, ms));
const ud = `<script>var _userdata = {}; _userdata["user_id"] = ${CUENTA.id}; _userdata["username"] = "${CUENTA.nombre}"; _userdata["session_logged_in"] = 1;</script>`;
const pagina = PAGINAS[RUTA].replace('<body>', '<body>' + ud);
const fetchFalso = async url => { const html = PAGINAS[rutaDe(String(url))]; return { ok: html != null, status: html != null ? 200 : 404, url: String(url), text: async () => html ?? '', json: async () => ({}) }; };

/** La barra del Mi PJ antiguo en la página del oficial. */
async function barraAntigua(marcas) {
  const dom = new JSDOM(pagina, { url: FORO + RUTA, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, gm = { 'mipj.ui': JSON.stringify({ abierto: false }), 'mipj.of.cuarto': JSON.stringify(marcas), ['mipj.' + CUENTA.id]: JSON.stringify({ v: 2, leido: new Date().toISOString() }) };
  w.GM_getValue = (k, d) => (k in gm ? gm[k] : d); w.GM_setValue = (k, v) => { gm[k] = v; }; w.GM_listValues = () => Object.keys(gm);
  w._userdata = { session_logged_in: 1, username: CUENTA.nombre, user_id: CUENTA.id }; w.unsafeWindow = w; w.fetch = fetchFalso;
  const warn = console.warn; console.warn = () => {};
  w.eval(readFileSync(new URL('../../pam-mi-pj.user.js', import.meta.url), 'utf8'));
  for (let i = 0; i < 200 && !/posts<\/small>/.test(w.document.querySelector('.mipj-of')?.innerHTML ?? ''); i++) await espera(20);
  console.warn = warn;
  const el = w.document.querySelector('.mipj-of');
  const r = { html: el.outerHTML, antesDe: el.nextElementSibling?.id };
  w.close();
  return r;
}

// ---------- el agente en la misma página, y el arranque del panel (main.js) contra él ----------
const dom = new JSDOM(pagina, { url: FORO + RUTA, runScripts: 'outside-only', pretendToBeVisual: true });
const W = dom.window;
W.fetch = fetchFalso;
const gm = {};
W.GM_getValue = (k, d) => (k in gm ? gm[k] : d); W.GM_setValue = (k, v) => { gm[k] = v; }; W.GM_listValues = () => Object.keys(gm);
const panelBus = new EventTarget();
const ventanaPanel = { postMessage: (data, destino) => { if (destino === PAM) panelBus.dispatchEvent(new MessageEvent('message', { data: structuredClone(data), origin: FORO })); } };
Object.defineProperty(W.HTMLIFrameElement.prototype, 'contentWindow', { get() { return ventanaPanel; } });
const alForo = d => W.dispatchEvent(new W.MessageEvent('message', { data: structuredClone(d), origin: PAM }));
W.eval(readFileSync(new URL('../../agente/pam-agente.user.js', import.meta.url), 'utf8'));
globalThis.DOMParser = W.DOMParser;
const { ClienteAgente } = await import('../../js/servicios/agente/ClienteAgente.js');
const agente = new ClienteAgente({ destino: { postMessage: (d, o) => o === FORO && alForo(d) }, origen: FORO, escuchar: panelBus });
const { crearActividad } = await import('../../js/servicios/ActividadDelForo.js');
const { ES_OFICIAL, barraDeOficial, marcarCuarto } = await import('../../js/reglas/Oficiales.js');
const foros = JSON.parse(readFileSync(new URL('../../data/foros.json', import.meta.url), 'utf8')).foros;
const mem = new Map();
const memoria = { gv: (k, d) => (mem.has(k) ? JSON.parse(mem.get(k)) : d), sv: (k, v) => mem.set(k, JSON.stringify(v)) };

const caja = () => W.document.querySelector('.pam-agente-oficial');
const barra = () => caja().shadowRoot.querySelector('.mipj-of');

test('hola trae el título del tema; el panel reconoce el oficial', async () => {
  const h = await agente.hola();
  assert.equal(h.titulo, '[Oficial] El robo');
  assert.ok(ES_OFICIAL.test(h.titulo));
});

test('la barra sale igual que la de Mi PJ y en el mismo sitio', async () => {
  const act = crearActividad(agente, { yo: CUENTA.nombre, uid: CUENTA.id, origen: FORO, cfg: foros['hp-avada-kedavra.foroactivo.com'].actividad, memoria });
  let vioLeyendo = false;
  const O = await act.leerOficialDeRuta(RUTA, () => { agente.oficial({ estado: 'leyendo', abierta: true }).then(() => { vioLeyendo = /leyendo…/.test(barra().innerHTML); }); });
  await agente.oficial({ estado: 'ok', abierta: true, barra: barraDeOficial(O, {}) });
  await espera(10);
  assert.ok(vioLeyendo, 'primero «Mi PJ · leyendo…»');
  const viejo = await barraAntigua({});
  const igualar = s => s.replace(/\s+/g, ' ').replace(/> </g, '><').replace(/ open=""/, ' open').trim();
  assert.equal(igualar(barra().outerHTML), igualar(viejo.html));
  assert.equal(caja().nextElementSibling.id, viejo.antesDe, 'justo antes del primer mensaje');
  assert.match(barra().innerHTML, /Irvin Giles<\/b> · 4 posts · <b>3<\/b> cuentan → <b class="of-g">60 grageas<\/b>/);
});

test('marcar «segundo oficial»: PAM lo guarda y la barra cobra a un cuarto, igual que Mi PJ', async () => {
  let O = null;
  agente.atender('oficial.cuarto', d => { memoria.sv('mipj.of.cuarto', marcarCuarto(memoria.gv('mipj.of.cuarto', {}), d.tid, d.autor, d.si)); return { estado: 'ok', abierta: true, barra: barraDeOficial(O, memoria.gv('mipj.of.cuarto', {})) }; });
  const act = crearActividad(agente, { yo: CUENTA.nombre, uid: CUENTA.id, origen: FORO, cfg: foros['hp-avada-kedavra.foroactivo.com'].actividad, memoria });
  O = await act.leerOficialDeRuta(RUTA);
  const c = barra().querySelector('input[data-autor="Bruno Ketch"]');
  c.checked = true; c.dispatchEvent(new W.Event('change', { bubbles: true }));
  await espera(30);
  assert.deepEqual(memoria.gv('mipj.of.cuarto', {}), { 800: { 'bruno ketch': 1 } });
  const viejo = await barraAntigua({ 800: { 'bruno ketch': 1 } });
  const igualar = s => s.replace(/\s+/g, ' ').replace(/> </g, '><').replace(/ open=""/, ' open').replace(/ checked=""/g, ' checked').trim();
  assert.equal(igualar(barra().outerHTML), igualar(viejo.html));
  assert.match(barra().innerHTML, /Bruno Ketch<\/b> · 2 posts · <b>2<\/b> cuentan → <b class="of-g">10 grageas<\/b> <span class="dim">\(segundo oficial, a un cuarto\)<\/span>/);
});

test('cerrar la barra se recuerda (avisa al panel)', async () => {
  let abierta = null; agente.atender('oficial.abierta', d => { abierta = d.abierta; return {}; });
  barra().open = false; barra().dispatchEvent(new W.Event('toggle'));
  await espera(20);
  assert.equal(abierta, false);
});

test('si no se puede leer el tema, lo dice como Mi PJ', async () => {
  await agente.oficial({ estado: 'error', abierta: true, error: 'HTTP 500' });
  assert.equal(barra().querySelector('.of-bd').innerHTML, '<div class="dim">No pude leer el tema: HTTP 500</div>');
  W.close();
});
