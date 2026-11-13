// 2.1.0: el botón «Colorear diálogos» del agente, junto al «Previsualizar» del editor del foro. PAM (el panel) usa la
// configuración que PAM dejó en el almacén del agente (`pam.coloreador`); aquí, con el servicio de verdad.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PAM = 'https://claudilahozbosch.github.io', FORO = 'https://hp-avada-kedavra.foroactivo.com';
const espera = ms => new Promise(r => setTimeout(r, ms));
const pagina = `<!doctype html><html><head><title>Foro</title><script>var _userdata = {}; _userdata["user_id"] = 7; _userdata["username"] = "Himmel Reich Bils"; _userdata["session_logged_in"] = 1;</script></head>
<body><form name="post" id="editor" action="/post" method="post"><textarea name="message"></textarea>
<div class="botones"><input type="submit" name="preview" value="Previsualizar"><input type="submit" name="post" value="Enviar"></div></form></body></html>`;

const dom = new JSDOM(pagina, { url: FORO + '/post?t=5&mode=reply', runScripts: 'outside-only', pretendToBeVisual: true });
const W = dom.window;
W.fetch = async u => ({ status: 200, ok: true, url: String(u), text: async () => '<html></html>' });
const CFG = { tag: '#A3000D', dlgf: {}, opts: { raya: true, guion: true, comillas: true }, names: [], marks: [] };
const gm = { 'pam.coloreador': { v: 1, general: { ...CFG, tag: '#111111' }, pjs: [{ nombre: 'Himmel Reich Bils.', config: CFG }] } };
W.GM_getValue = (k, d) => (k in gm ? gm[k] : d);
W.GM_setValue = (k, v) => { gm[k] = v; };
W.GM_listValues = () => Object.keys(gm);
const panelBus = new EventTarget();
Object.defineProperty(W.HTMLIFrameElement.prototype, 'contentWindow', { get() { return { postMessage: (data, destino) => { if (destino === PAM) panelBus.dispatchEvent(new MessageEvent('message', { data: structuredClone(data), origin: FORO })); } }; } });
const alForo = data => W.dispatchEvent(new W.MessageEvent('message', { data: structuredClone(data), origin: PAM }));
W.eval(readFileSync(new URL('../../agente/pam-agente.user.js', import.meta.url), 'utf8'));
after(() => W.close());

globalThis.DOMParser = W.DOMParser;
const { ClienteAgente } = await import('../../js/servicios/agente/ClienteAgente.js');
const { crearColoreadorDelForo } = await import('../../js/servicios/ColoreadorDelForo.js');
const { revisarEditor } = await import('../../js/reglas/RevisorBoveda.js');
const agente = new ClienteAgente({ destino: { postMessage: (d, o) => o === FORO && alForo(d) }, origen: FORO, escuchar: panelBus });
// lo mismo que js/paginas/panel/main.js
const C = crearColoreadorDelForo(agente, { cuenta: () => 'Himmel Reich Bils' });
agente.atender('editor.revisar', async d => { const r = revisarEditor(d, null); r.colorear = await C.contar(String(d.texto)); return r; });
agente.atender('editor.colorear', d => C.colorear(String(d.texto)));

const editor = W.document.getElementById('editor'), ta = editor.querySelector('textarea');
const prev = editor.querySelector('input[name="preview"]');
const host = () => editor.querySelector('.pam-agente-colorear');
const btn = () => host().shadowRoot.querySelector('.mipj-col');
const enviados = []; editor.addEventListener('submit', e => { enviados.push(e.submitter?.name); e.preventDefault(); });
const escribir = async t => { ta.value = t; await espera(1700); }; // el agente mira el editor cada 1,5 s

test('el botón va junto a «Previsualizar» y solo se ve si hay algún diálogo', async () => {
  await agente.hola();
  assert.equal(host().nextElementSibling, prev);
  await escribir('Solo narración, sin nadie que hable.');
  assert.equal(host().style.display, 'none');
  await escribir('Entró en la sala.\n—Buenas noches —dijo.');
  assert.equal(host().style.display, '');
  assert.equal(btn().textContent, '✦Colorear diálogosHimmel Reich Bils');
  assert.match(btn().title, /Colorea el diálogo con tu Coloreador de PAM \(Himmel Reich Bils\) y previsualiza/);
});

test('al pulsarlo pone el texto coloreado (la configuración de su personaje) y previsualiza; «Quitar colores» lo deja como estaba', async () => {
  const antes = ta.value;
  btn().click(); await espera(60);
  assert.equal(ta.value, 'Entró en la sala.\n[color=#A3000D]—Buenas noches[/color] —dijo.');
  assert.deepEqual(enviados, ['preview'], 'solo previsualiza: no publica');
  await espera(1700);
  assert.equal(btn().textContent, '↶Quitar colores');
  btn().click(); await espera(60);
  assert.equal(ta.value, antes);
  await espera(1700);
  assert.equal(btn().textContent, '✦Colorear diálogosHimmel Reich Bils');
});

test('ya coloreado (sin poder deshacer): no sale; sin nada de PAM, avisa en lugar de colorear', async () => {
  W.sessionStorage.clear();
  await escribir('[color=#A3000D]—Hola.[/color]');
  assert.equal(host().style.display, 'none');
  delete gm['pam.coloreador'];
  await espera(5100); // el panel vuelve a mirar el almacén cada 5 s
  await escribir('—Hola otra vez.');
  assert.equal(host().style.display, '');
  assert.match(btn().title, /Primero abrí PAM/);
  btn().click(); await espera(60);
  assert.equal(ta.value, '—Hola otra vez.');
  assert.match(btn().textContent, /Abrí PAM una vez/);
  assert.deepEqual(enviados, ['preview']);
});
