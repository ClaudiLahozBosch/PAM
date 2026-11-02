// Prueba local: el agente (en un «foro» jsdom) y el panel (ClienteAgente) hablando por el protocolo.
// Uso: node tests/e2e.mjs   (desde poc-agente)
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PAM = 'https://claudilahozbosch.github.io';
const FORO = 'https://test-forito.foroactivo.com';
const espera = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0, total = 0;
const comprobar = (nombre, cond, extra = '') => { total++; if (!cond) fallos++; console.log((cond ? 'OK  ' : 'FALLA ') + nombre + (extra ? '  · ' + extra : '')); };

// ---------- «foro» ----------
const paginaForo = `<!doctype html><html><head><title>Foro de pruebas</title>
<script>var _userdata = {}; _userdata["user_id"] = 7; _userdata["username"] = "TEST"; _userdata["session_logged_in"] = 1;</script></head>
<body><a href="/t5-uno">uno</a><a href="/t8-dos">dos</a>
<form name="post" id="editor" action="/post" method="post"><textarea name="message"></textarea><input type="submit" name="post" value="Enviar"></form></body></html>`;
const formRespuesta = `<html><body><form name="post" action="/post" method="post">
<input type="hidden" name="t" value="5"><input type="hidden" name="mode" value="reply"><input type="hidden" name="auth[]" value="XYZ">
<input type="checkbox" name="attach_sig" value="on" checked><input type="checkbox" name="notify" value="on">
<textarea name="message"></textarea></form></body></html>`;

const peticiones = [];
const dom = new JSDOM(paginaForo, { url: FORO + '/t5-uno', runScripts: 'outside-only', pretendToBeVisual: true });
const W = dom.window;
W.fetch = async (url, op = {}) => {
  peticiones.push({ url: String(url), metodo: op.method || 'GET', cuerpo: op.body ? String(op.body) : '' });
  const u = new URL(url, FORO);
  let html = '<html></html>';
  if (op.method === 'POST') html = '<p>El mensaje ha sido enviado con éxito. <a href="/viewtopic?t=5&amp;p=99#99">ver</a></p>';
  else if (u.pathname === '/post') html = formRespuesta;
  else if (u.pathname === '/') html = paginaForo;
  return { status: 200, ok: true, url: u.href, text: async () => html };
};
const gm = {};
W.GM_getValue = (k, d) => (k in gm ? JSON.parse(gm[k]) : d);
W.GM_setValue = (k, v) => { gm[k] = JSON.stringify(v); };

// El iframe del panel: su ventana es nuestro «panel», que recibe con origen del foro.
const panelBus = new EventTarget();
const ventanaPanel = { postMessage: (data, destino) => {
  if (destino !== PAM) return; // el navegador lo descartaría
  panelBus.dispatchEvent(new MessageEvent('message', { data: structuredClone(data), origin: FORO }));
} };
Object.defineProperty(W.HTMLIFrameElement.prototype, 'contentWindow', { get() { return ventanaPanel; } });
const enviarAlForo = (data, origen = PAM) => W.dispatchEvent(new W.MessageEvent('message', { data: structuredClone(data), origin: origen }));

W.eval(readFileSync(path.join(raiz, 'agente/pam-agente-poc.user.js'), 'utf8'));

// ---------- «panel» ----------
globalThis.DOMParser = W.DOMParser;
const { ClienteAgente } = await import('../web/js/ClienteAgente.js');
const { RevisorBBCode } = await import('../web/js/RevisorBBCode.js');
const { LectorForo } = await import('../web/js/LectorForo.js');
const agente = new ClienteAgente({ destino: { postMessage: (d, o) => o === FORO && enviarAlForo(d) }, origen: FORO, escuchar: panelBus });

const sombra = () => W.document.getElementById('pam-agente').shadowRoot;
const boton = txt => [...sombra().querySelectorAll('.fondo button')].find(b => b.textContent === txt);

// 0 · hola
const h = await agente.hola();
comprobar('hola devuelve versión, protocolo y cuenta', h.agente === '0.1.0' && h.protocolo === 1 && h.cuenta?.nombre === 'TEST' && h.cuenta?.id === 7, JSON.stringify(h));
comprobar('el iframe apunta al panel de PAM', sombra().querySelector('iframe').getAttribute('src') === PAM + '/pam-poc/panel.html?foro=' + encodeURIComponent(FORO));

// 1 · leer
const doc = await agente.leer('/');
const res = LectorForo.resumenIndice(doc);
comprobar('foro.leer + LectorForo', res.titulo === 'Foro de pruebas' && res.temasEnlazados === 2 && res.conectado, JSON.stringify(res));
comprobar('la lectura va con credenciales del foro', peticiones.at(-1).url.startsWith(FORO + '/?_='));
for (const mala of ['//evil.com/x', 'https://evil.com/', 'javascript:alert(1)', '/\\evil.com', 'u1']) {
  let err = null; try { await agente.leer(mala); } catch (e) { err = e.message; }
  comprobar('rechaza la ruta ' + mala, err && /no permitida/.test(err), err || 'ACEPTADA');
}

// 2 · almacén
await agente.guardarDato('pam.poc.ficha', { nombre: 'Mortimer' });
comprobar('almacén: guardar y leer', (await agente.leerDato('pam.poc.ficha'))?.nombre === 'Mortimer');
let errClave = null; try { await agente.guardarDato('otra.clave', 1); } catch (e) { errClave = e.message; }
comprobar('almacén: rechaza claves fuera de pam.*', /no permitida/.test(errClave || ''), errClave || 'ACEPTADA');

// 3 · publicar: denegar, aceptar, modificar
let p = agente.responder(5, 'Hola [b]foro[/b]', 'prueba');
await espera(20);
comprobar('la puerta aparece en el foro', !!sombra().querySelector('.fondo textarea'));
comprobar('la puerta muestra el texto exacto', sombra().querySelector('.fondo textarea').value === 'Hola [b]foro[/b]');
const antes = peticiones.length;
boton('Denegar').click();
let r = await p;
comprobar('Denegar: no publica', r.publicado === false && r.decision === 'denegar' && peticiones.length === antes);

p = agente.responder(5, 'Hola [b]foro[/b]');
await espera(20); boton('Aceptar').click(); r = await p;
const post = peticiones.find(x => x.metodo === 'POST');
const campos = new URLSearchParams(post?.cuerpo || '');
comprobar('Aceptar: publica', r.publicado === true && r.post === '99', JSON.stringify(r));
comprobar('POST con mensaje y campos del formulario', campos.get('message') === 'Hola [b]foro[/b]' && campos.get('auth[]') === 'XYZ' && campos.get('t') === '5' && campos.get('attach_sig') === 'on' && !campos.has('notify'));

p = agente.responder(5, 'original');
await espera(20); boton('Modificar').click();
const ta = sombra().querySelector('.fondo textarea');
comprobar('Modificar: deja editar sin cerrar', !ta.hasAttribute('readonly') && !!sombra().querySelector('.fondo'));
ta.value = 'cambiado a mano'; boton('Aceptar').click(); r = await p;
const ultimo = new URLSearchParams(peticiones.filter(x => x.metodo === 'POST').at(-1).cuerpo);
comprobar('Modificar: publica lo editado', r.modificado === true && ultimo.get('message') === 'cambiado a mano');

let errTema = null; try { await agente.responder(0, 'x'); } catch (e) { errTema = e.message; }
comprobar('rechaza tema no válido', /Tema no válido/.test(errTema || ''));

// 4 · seguridad del canal
const recibidos = [];
panelBus.addEventListener('message', e => recibidos.push(e.data));
enviarAlForo({ pam: 1, de: 'pam', id: 'x1', tipo: 'hola' }, 'https://evil.com');
enviarAlForo({ pam: 1, de: 'agente', id: 'x2', tipo: 'hola' });
await espera(20);
comprobar('ignora otro origen y mensajes que no son de PAM', recibidos.length === 0, JSON.stringify(recibidos));
enviarAlForo({ pam: 2, de: 'pam', id: 'x3', tipo: 'foro.leer', datos: { ruta: '/' } });
await espera(20);
comprobar('protocolo distinto: responde que se actualice', recibidos[0]?.ok === false && /Actualiza el script/.test(recibidos[0]?.error), JSON.stringify(recibidos[0]));
enviarAlForo({ pam: 1, de: 'pam', id: 'x4', tipo: 'constructor' });
await espera(20);
comprobar('tipo desconocido (incluido «constructor»)', recibidos[1]?.ok === false && /desconocido/.test(recibidos[1]?.error));

// 5 · editor del foro → PAM revisa
agente.atender('editor.revisar', d => ({ avisos: RevisorBBCode.revisar(d.texto) }));
const form = W.document.getElementById('editor');
let envios = 0; form.addEventListener('submit', e => { envios++; e.preventDefault(); });
form.querySelector('textarea').value = '[spoiler=X]sin cerrar';
form.requestSubmit();
await espera(50);
comprobar('editor: frena el envío y avisa', envios === 0 && /1 abiertas y 0 cerradas/.test(sombra().querySelector('.fondo li')?.textContent || ''));
boton('Publicar igualmente').click(); await espera(20);
comprobar('editor: «Publicar igualmente» envía', envios === 1);
form.querySelector('textarea').value = '[spoiler=X]bien[/spoiler]';
form.requestSubmit(); await espera(50);
comprobar('editor: si todo cuadra, envía sin preguntar', envios === 2 && !sombra().querySelector('.fondo'));
agente.atender('editor.revisar', () => new Promise(() => {})); // PAM colgado
form.requestSubmit(); await espera(3300);
comprobar('editor: si PAM no contesta en 3 s, no bloquea', envios === 3);

console.log(`\n${total - fallos}/${total} correctas`);
process.exit(fallos ? 1 : 0);
