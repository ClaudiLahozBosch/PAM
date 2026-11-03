// El agente (agente/pam-agente.user.js) en un «foro» jsdom, hablando con ClienteAgente por el protocolo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PAM = 'https://claudilahozbosch.github.io', FORO = 'https://hp-avada-kedavra.foroactivo.com';
const espera = ms => new Promise(r => setTimeout(r, ms));

// ---------- «foro» ----------
const pagina = `<!doctype html><html><head><title>Foro</title>
<script>var _userdata = {}; _userdata["user_id"] = 7; _userdata["username"] = "TEST"; _userdata["session_logged_in"] = 1;</script></head>
<body><form name="post" id="editor" action="/post" method="post"><textarea name="message"></textarea><input type="submit" name="post" value="Enviar"></form></body></html>`;
const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const servidor = { mensaje99: 'línea 1\nlínea 2\nlínea 3', peticiones: [] };
const formEditar = () => `<form name="post"><input type="hidden" name="p" value="99"><input type="hidden" name="mode" value="editpost"><input type="hidden" name="auth[]" value="XYZ"><input name="edit_reason" value=""><textarea name="message">${escH(servidor.mensaje99)}</textarea></form>`;
const formResponder = `<form name="post"><input type="hidden" name="t" value="5"><input type="hidden" name="mode" value="reply"><input type="hidden" name="auth[]" value="XYZ"><textarea name="message"></textarea></form>`;

const dom = new JSDOM(pagina, { url: FORO + '/t5-uno', runScripts: 'outside-only', pretendToBeVisual: true });
const W = dom.window;
W.fetch = async (url, op = {}) => {
  const u = new URL(url, FORO), cuerpo = op.body ? String(op.body) : '';
  servidor.peticiones.push({ ruta: u.pathname + u.search.replace(/[?&]_=\d+/, ''), metodo: op.method || 'GET', cuerpo });
  let html = '<html></html>';
  if (op.method === 'POST') {
    const c = new URLSearchParams(cuerpo);
    if (c.get('mode') === 'editpost') servidor.mensaje99 = c.get('message');
    html = '<p>El mensaje ha sido enviado con éxito. <a href="/viewtopic?t=5&amp;p=99#99">ver</a></p>';
  } else if (u.pathname === '/post') html = u.searchParams.get('mode') === 'editpost' ? formEditar() : formResponder;
  else if (u.pathname === '/') html = pagina;
  return { status: 200, ok: true, url: u.href, text: async () => html };
};
const gm = { 'mipj.ui': JSON.stringify({ abierto: true }), 'pam.x': JSON.stringify(1) };
W.GM_getValue = (k, d) => (k in gm ? JSON.parse(gm[k]) : d);
W.GM_setValue = (k, v) => { gm[k] = JSON.stringify(v); };
W.GM_listValues = () => Object.keys(gm);

const panelBus = new EventTarget();
const ventanaPanel = { postMessage: (data, destino) => { if (destino === PAM) panelBus.dispatchEvent(new MessageEvent('message', { data: structuredClone(data), origin: FORO })); } };
Object.defineProperty(W.HTMLIFrameElement.prototype, 'contentWindow', { get() { return ventanaPanel; } });
const alForo = (data, origen = PAM) => W.dispatchEvent(new W.MessageEvent('message', { data: structuredClone(data), origin: origen }));
W.eval(readFileSync(new URL('../../agente/pam-agente.user.js', import.meta.url), 'utf8'));

globalThis.DOMParser = W.DOMParser;
const { ClienteAgente } = await import('../../js/servicios/agente/ClienteAgente.js');
const agente = new ClienteAgente({ destino: { postMessage: (d, o) => o === FORO && alForo(d) }, origen: FORO, escuchar: panelBus });
const sombra = () => W.document.getElementById('pam-agente').shadowRoot;
const boton = txt => [...sombra().querySelectorAll('.fondo button')].find(b => b.textContent === txt);

test('hola, iframe del panel y lectura del foro', async () => {
  const h = await agente.hola();
  assert.deepEqual([h.agente, h.protocolo, h.foro, h.cuenta, h.ruta], ['0.2.0', 1, 'hp-avada-kedavra.foroactivo.com', { id: 7, nombre: 'TEST' }, '/t5-uno']);
  assert.equal(sombra().querySelector('iframe').getAttribute('src'), PAM + '/PAM/panel.html?foro=' + encodeURIComponent(FORO));
  const d = await agente.leer('/');
  assert.equal(d.title, 'Foro');
  for (const mala of ['//evil.com/x', 'https://evil.com/', 'javascript:alert(1)', '/\\evil.com', 'u1']) await assert.rejects(agente.leer(mala), /no permitida/, mala);
});

test('editar: la puerta enseña las diferencias; Aceptar edita y lo comprueba', async () => {
  servidor.mensaje99 = 'línea 1\nlínea 2\nlínea 3'; servidor.peticiones.length = 0;
  const p = agente.editar(99, 'línea 1\nlínea 2\nlínea 3', 'línea 1\nlínea DOS\nlínea 3\nlínea 4', { motivo: 'Canje', titulo: 'Ficha' });
  await espera(30);
  const dif = sombra().querySelector('.fondo .dif');
  assert.deepEqual([...dif.querySelectorAll('.menos')].map(x => x.textContent), ['- línea 2']);
  assert.deepEqual([...dif.querySelectorAll('.mas')].map(x => x.textContent), ['+ línea DOS', '+ línea 4']);
  boton('Aceptar').click();
  const r = await p;
  assert.deepEqual([r.editado, r.estado, r.modificado], [true, 'ok', false]);
  const post = servidor.peticiones.find(x => x.metodo === 'POST'), c = new URLSearchParams(post.cuerpo);
  assert.deepEqual([c.get('message'), c.get('edit_reason'), c.get('auth[]'), c.get('p')], ['línea 1\nlínea DOS\nlínea 3\nlínea 4', 'Canje', 'XYZ', '99']);
  assert.equal(servidor.mensaje99, 'línea 1\nlínea DOS\nlínea 3\nlínea 4');
});
test('editar: Denegar no toca nada; si el mensaje cambió por el camino, tampoco', async () => {
  servidor.mensaje99 = 'A'; servidor.peticiones.length = 0;
  let p = agente.editar(99, 'A', 'B'); await espera(30); boton('Denegar').click();
  assert.deepEqual([(await p).editado, (await p).decision], [false, 'denegar']);
  p = agente.editar(99, 'texto que PAM leyó', 'nuevo'); await espera(30); boton('Aceptar').click();
  const r = await p;
  assert.deepEqual([r.editado, r.estado], [false, 'cambiado']);
  assert.equal(servidor.peticiones.filter(x => x.metodo === 'POST').length, 0);
  assert.equal(servidor.mensaje99, 'A');
  assert.deepEqual(await agente.editar(99, 'igual', 'igual'), { editado: false, decision: 'igual' });
});
test('editar: Modificar deja retocar el texto final', async () => {
  servidor.mensaje99 = 'uno';
  const p = agente.editar(99, 'uno', 'dos'); await espera(30);
  boton('Modificar').click();
  const ta = sombra().querySelector('.fondo textarea');
  assert.ok(!ta.hasAttribute('readonly'));
  ta.value = 'tres'; boton('Aceptar').click();
  const r = await p;
  assert.deepEqual([r.editado, r.modificado], [true, true]);
  assert.equal(servidor.mensaje99, 'tres');
});
test('publicar sigue pasando por su puerta', async () => {
  servidor.peticiones.length = 0;
  const p = agente.responder(5, 'Hola'); await espera(30); boton('Aceptar').click();
  const r = await p;
  assert.equal(r.publicado, true);
  assert.equal(new URLSearchParams(servidor.peticiones.find(x => x.metodo === 'POST').cuerpo).get('message'), 'Hola');
});
test('almacén, datos del Mi PJ antiguo y tamaño del panel', async () => {
  await agente.guardarDato('pam.ficha', { a: 1 });
  assert.deepEqual(await agente.leerDato('pam.ficha'), { a: 1 });
  await assert.rejects(agente.guardarDato('mipj.ui', 1), /no permitida/, 'no puede pisar lo del script antiguo');
  assert.deepEqual(await agente.legado(), { 'mipj.ui': { abierto: true } }, 'lo antiguo, sin las claves pam.*');
  assert.deepEqual(await agente.tamano(5000, 10), { ancho: 900, alto: 300 });
  assert.equal(sombra().querySelector('.marco').style.width, '900px');
  await agente.mostrar(true);
  assert.ok(sombra().querySelector('.marco').classList.contains('abierto'));
});
test('canal: ignora otros orígenes y pide actualizar si el protocolo no coincide', async () => {
  const recibidos = []; const oir = e => recibidos.push(e.data);
  panelBus.addEventListener('message', oir);
  alForo({ pam: 1, de: 'pam', id: 'x1', tipo: 'hola' }, 'https://evil.com');
  alForo({ pam: 2, de: 'pam', id: 'x2', tipo: 'foro.leer', datos: { ruta: '/' } });
  await espera(30);
  panelBus.removeEventListener('message', oir);
  assert.equal(recibidos.length, 1);
  assert.match(recibidos[0].error, /Actualiza el script/);
});
test('editor del foro: pregunta a PAM antes de enviar', async () => {
  agente.atender('editor.revisar', d => ({ avisos: d.texto.includes('mal') ? ['algo va mal'] : [] }));
  const form = W.document.getElementById('editor');
  let envios = 0; form.addEventListener('submit', e => { envios++; e.preventDefault(); });
  form.querySelector('textarea').value = 'todo bien'; form.requestSubmit(); await espera(40);
  assert.equal(envios, 1);
  form.querySelector('textarea').value = 'esto va mal'; form.requestSubmit(); await espera(40);
  assert.equal(envios, 1);
  assert.match(sombra().querySelector('.fondo li').textContent, /algo va mal/);
  boton('Volver a editar').click(); await espera(10);
  assert.equal(envios, 1);
});
