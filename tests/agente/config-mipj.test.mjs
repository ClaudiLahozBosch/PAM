// 2.2.0: «Configurar Mi PJ» en el editor del foro, con el agente de verdad y lo que contesta el panel
// (js/servicios/EditorDelForo.js, el mismo que usa js/paginas/panel/main.js). El agente no cambia: el panel le contesta
// «sin barra» y «sin botones», y el agente ya sabía no enseñarlos ni parar el envío.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PAM = 'https://claudilahozbosch.github.io', FORO = 'https://hp-avada-kedavra.foroactivo.com';
const espera = ms => new Promise(r => setTimeout(r, ms));
const pagina = `<!doctype html><html><head><title>Foro</title><script>var _userdata = {}; _userdata["user_id"] = 7; _userdata["username"] = "Himmel Reich Bils"; _userdata["session_logged_in"] = 1;</script></head>
<body><form name="post" id="editor" action="/post" method="post"><textarea name="message"></textarea>
<div class="botones"><input type="submit" name="preview" value="Previsualizar"><input type="submit" name="post" value="Enviar"></div></form></body></html>`;

const dom = new JSDOM(pagina, { url: FORO + '/t9-boveda-de-himmel', runScripts: 'outside-only', pretendToBeVisual: true });
const W = dom.window;
W.fetch = async u => ({ status: 200, ok: true, url: String(u), text: async () => '<html></html>' });
const gm = { 'pam.coloreador': { v: 1, general: { tag: '#A3000D', dlgf: {}, opts: { raya: true, guion: true, comillas: true }, names: [], marks: [] }, pjs: [] } };
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
const { crearConfigDelForo } = await import('../../js/servicios/ConfigMiPjDelForo.js');
const { atenderEditor } = await import('../../js/servicios/EditorDelForo.js');
const { activo } = await import('../../js/reglas/ConfigMiPj.js');
const agente = new ClienteAgente({ destino: { postMessage: (d, o) => o === FORO && alForo(d) }, origen: FORO, escuchar: panelBus });
const config = crearConfigDelForo(agente, { cada: 0 });
const coloreador = crearColoreadorDelForo(agente, { cuenta: () => 'Himmel Reich Bils' });
atenderEditor(agente, { coloreador, boveda: () => null, on: (g, id) => activo(config.actual(), g, id), alPedir: () => { config.refrescar(); } });

const editor = W.document.getElementById('editor'), ta = editor.querySelector('textarea');
const barra = () => editor.querySelector('.pam-agente-check');
const col = () => editor.querySelector('.pam-agente-colorear');
const botones = () => (col().style.display === 'none' ? [] : [...col().shadowRoot.querySelectorAll('.mipj-col')].filter(b => b.style.display !== 'none').map(b => b.getAttribute('data-accion')));
const enviados = []; editor.addEventListener('submit', e => { enviados.push(e.submitter?.name); e.preventDefault(); });
// un movimiento de bóveda que no cuadra, con un diálogo y un color: barra con aviso y los dos botones
const TEXTO = '[b]Grageas iniciales»[/b] 1.200\n{[b]Grageas que se añaden / quitan»[/b] +125 (sueldo)\n{[b]Grageas actuales»[/b] 1.300\n{[b]Grageas totales»[/b] 9.125\n—Hola —dijo. [color=#123456]x[/color]';
const escribir = async t => { ta.value = t; await espera(1700); }; // el agente mira el editor cada 1,5 s
const poner = async c => { gm['pam.mipj'] = c; await config.refrescar(true); };

test('sin configuración: la barra de la bóveda y los dos botones, como siempre', async () => {
  await agente.hola();
  await escribir(TEXTO);
  assert.equal(barra().style.display, '');
  assert.deepEqual(botones(), ['colorear', 'quitar']);
});

test('apagar cada cosa en «Configurar Mi PJ»: el agente deja de enseñarla', async () => {
  await poner({ foro: { colorear: false } });
  await escribir(TEXTO + ' ');
  assert.deepEqual(botones(), ['quitar']);
  assert.equal(barra().style.display, '', 'la barra sigue');
  await poner({ foro: { colorear: false, quitar: false, boveda: false } });
  await escribir(TEXTO + '  ');
  assert.deepEqual(botones(), []);
  assert.equal(barra().style.display, 'none', 'sin barra de la bóveda');
  // y aunque el pedido llegue igual, el texto no cambia
  const h = {}; atenderEditor({ atender: (t, fn) => { h[t] = fn; } }, { coloreador, boveda: () => null, on: (g, id) => activo(config.actual(), g, id) });
  assert.deepEqual(await h['editor.colorear']({ texto: 'a —b— c' }), { texto: 'a —b— c' });
  assert.deepEqual(await h['editor.descolorear']({ texto: '[color=#1]x[/color]' }), { texto: '[color=#1]x[/color]' });
});

test('2.2.2: sin escribir nada, lo que se apaga o se enciende en PAM se ve en el editor en unos segundos', async () => {
  await poner({});
  await escribir(TEXTO + '\n');
  assert.deepEqual(botones(), ['colorear', 'quitar']);
  await poner({ foro: { colorear: false } });
  await espera(1700); // el agente vuelve a preguntar cada 1,5 s aunque el texto sea el mismo
  assert.deepEqual(botones(), ['quitar']);
  await poner({});
  await espera(1700);
  assert.deepEqual(botones(), ['colorear', 'quitar']);
});

test('«Desactivar todas las superposiciones»: nada en el editor y el envío no se para', async () => {
  await poner({ pausa: true });
  await escribir(TEXTO + '   ');
  assert.deepEqual(botones(), []);
  assert.equal(barra().style.display, 'none');
  editor.querySelector('input[name="post"]').click();
  await espera(50);
  assert.deepEqual(enviados, ['post'], 'se envía sin «Antes de publicar»');
  assert.equal(W.document.querySelector('#pam-agente').shadowRoot.querySelector('#mipj-modal'), null);
  // y al quitar la pausa vuelve todo
  await poner({ pausa: false });
  await escribir(TEXTO + '    ');
  assert.deepEqual(botones(), ['colorear', 'quitar']);
  assert.equal(barra().style.display, '');
});
