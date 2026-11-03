// El panel «Mi PJ» portado a PAM tiene que pintar EXACTAMENTE lo mismo que el de pam-mi-pj.user.js.
// Se ejecuta el script antiguo entero en un foro jsdom (Tampermonkey de mentira, sin red) con unos datos,
// y el panel nuevo con los mismos datos, y se compara el HTML. Las únicas diferencias permitidas están
// listadas aquí (tarjetas que todavía no están en PAM y el origen de los datos del acceso rápido).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { leerMiPj, aDatosMiPj } from '../../js/servicios/MiPj.js';
import { crearPanelMiPj } from '../../js/paginas/panel/MiPjPanel.js';

const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
const sistema = new Sistema(json('sistema.json')), compendio = new Compendio(json('arcanos.json'));
const deps = { sistema, compendio, lector: new LectorFicha(sistema, compendio), foros: json('foros.json').foros };
const fx = f => readFileSync(new URL('../fixtures/' + f, import.meta.url), 'utf8');
const PARTES = JSON.parse(fx('fichas/varias-partes.json')).partes;
const VIEJO = readFileSync(new URL('../../pam-mi-pj.user.js', import.meta.url), 'utf8');
const CUENTA = { id: 5203, nombre: 'Irvin Giles' };

/** Los datos de Irvin leídos con el agente de prueba (perfil, ficha en cinco partes y bóveda de dos páginas). */
async function datosDeIrvin() {
  const { window: w } = new JSDOM('');
  globalThis.DOMParser = w.DOMParser;
  const dom = html => new w.DOMParser().parseFromString(html, 'text/html');
  const agente = {
    hola: async () => ({ agente: 'x', protocolo: 1, foro: 'hp-avada-kedavra.foroactivo.com', cuenta: CUENTA }),
    async leer(ruta) {
      if (ruta.startsWith('/profile')) return dom('<input name="profile_field_3_-10" value="/t23113-irvin-giles"><input name="profile_field_3_24" value="/t23175-boveda">');
      if (ruta === '/t23113-') return dom(fx('foro/tema-ficha.html'));
      const ed = ruta.match(/^\/post\?p=(\d+)&mode=editpost$/);
      if (ed) return dom(`<form name="post"><textarea name="message">${(PARTES.find(p => p.post === +ed[1])?.bbcode ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea></form>`);
      if (ruta === '/t23175-') return dom(fx('foro/boveda-p1.html'));
      if (ruta === '/t23175p15-boveda-de-irvin-giles') return dom(fx('foro/boveda-p2.html'));
      throw new Error('sin red: ' + ruta);
    }
  };
  const d = aDatosMiPj(await leerMiPj(agente, deps), sistema);
  d.leido = new Date().toISOString(); // reciente: el antiguo no intenta volver a leer
  return d;
}

/** HTML del panel antiguo: el script entero en un foro jsdom, con `datos` y `ui` en su almacén. */
function pintarAntiguo(datos, ui, extra = {}) {
  // la cuenta también en el HTML, como en el foro (los canjes la leen de ahí)
  const ud = `<script>_userdata["user_id"] = ${CUENTA.id}; _userdata["username"] = "${CUENTA.nombre}"; _userdata["session_logged_in"] = 1;</script>`;
  const dom = new JSDOM(`<!doctype html><html><head>${ud}</head><body></body></html>`, { url: 'https://hp-avada-kedavra.foroactivo.com/', runScripts: 'outside-only', pretendToBeVisual: true });
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

/** HTML del panel nuevo con los mismos datos y la misma ui. */
function pintarNuevo(datos, ui) {
  const { window: w } = new JSDOM('<!doctype html><html><head></head><body><div id="mipj"></div></body></html>', { url: 'https://claudilahozbosch.github.io/PAM/panel.html' });
  const mem = new Map([['mipj.' + CUENTA.id, JSON.stringify(datos)], ['mipj.ui', JSON.stringify(ui)]]);
  const guardado = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const p = crearPanelMiPj({ root: w.document.getElementById('mipj'), documento: w.document, guardado, cargar: async () => datos, ventana: { ancho: 1400, alto: 900 }, pamUrl: 'https://x/', cuenta: CUENTA });
  p.pintar();
  return w.document.getElementById('mipj').innerHTML;
}

// Diferencias permitidas (texto que dice que algo aún no está en PAM, y el origen del acceso rápido)
const PERMITIDO = s => s
  .replaceAll('Todavía no está en esta versión de prueba.', 'Tocá «Actualizar».')
  .replace(/<div class="rsrc">[^<]*<\/div>/, '<div class="rsrc">(origen)</div>');
const igualar = s => PERMITIDO(s).replace(/\s+/g, ' ').replace(/> </g, '><').trim();

test('pastilla cerrada: igual que la de Mi PJ', async () => {
  const d = await datosDeIrvin();
  assert.equal(igualar(pintarNuevo(d, { abierto: false })), igualar(pintarAntiguo(d, { abierto: false })));
  assert.match(pintarNuevo(d, { abierto: false }), /<div class="pill" data-a="abrir"/);
});

test('panel abierto: igual que el de Mi PJ', async () => {
  const d = await datosDeIrvin();
  const viejo = igualar(pintarAntiguo(d, { abierto: true })), nuevo = igualar(pintarNuevo(d, { abierto: true }));
  assert.equal(nuevo, viejo);
  assert.match(nuevo, /1\.525<span>grageas<\/span>/);
});

test('acceso rápido: igual que el de Mi PJ con los mismos datos de la ficha', async () => {
  const d = await datosDeIrvin();
  const R = d.rapido;
  // el antiguo lo sacaba de la ficha de PAM («pam.fichas»): se le dan los mismos datos por ahí
  const fichasPAM = JSON.stringify({ leido: d.leido, lista: [{ nombre: d.pj, attrs: R.attrs, skills: R.skills, artes: R.artes, combate: R.combate, puntos: R.puntos, bgs: R.bgs, adv: R.adv, raza: R.raza, etapa: R.etapa }] });
  const viejo = igualar(pintarAntiguo(d, { abierto: true, rapido: true }, { 'pam.fichas': JSON.parse(fichasPAM) }));
  const nuevo = igualar(pintarNuevo(d, { abierto: true, rapido: true }));
  assert.equal(nuevo, viejo);
  assert.match(nuevo, /⚔ Combate/);
});
