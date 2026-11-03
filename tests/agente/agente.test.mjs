// El agente (agente/pam-agente.user.js) en un «foro» jsdom, hablando con ClienteAgente por el protocolo.
// Las puertas son la del Escriba (varios pasos, diferencias, «enlace del paso n») y «Antes de publicar» de Mi PJ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const PAM = 'https://claudilahozbosch.github.io', FORO = 'https://hp-avada-kedavra.foroactivo.com';
const espera = ms => new Promise(r => setTimeout(r, ms));

// ---------- «foro» ----------
const ud = id => `<script>var _userdata = {}; _userdata["user_id"] = ${id}; _userdata["username"] = "TEST"; _userdata["session_logged_in"] = 1;</script>`;
const pagina = `<!doctype html><html><head><title>Foro</title>${ud(7)}</head>
<body><form name="post" id="editor" action="/post" method="post"><textarea name="message"></textarea><input type="submit" name="post" value="Enviar"></form></body></html>`;
const escH = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const srv = { mensajes: { 99: 'línea 1\nlínea 2\nlínea 3' }, publicados: [], peticiones: [], siguiente: 500 };
const formEditar = id => `<form name="post"><input type="hidden" name="p" value="${id}"><input type="hidden" name="mode" value="editpost"><input type="hidden" name="auth[]" value="XYZ"><input name="edit_reason" value=""><textarea name="message">${escH(srv.mensajes[id] ?? '')}</textarea></form>`;
const formResponder = t => `<form name="post"><input type="hidden" name="t" value="${t}"><input type="hidden" name="mode" value="reply"><input type="hidden" name="auth[]" value="XYZ"><textarea name="message"></textarea></form>`;
const temaHtml = t => `<html><body>${srv.publicados.filter(p => p.t === t).map(p => `<div id="p${p.id}" class="post"><p class="author"><a href="/u7">TEST</a></p><div class="content">${escH(p.m)}</div></div>`).join('')}</body></html>`;

const dom = new JSDOM(pagina, { url: FORO + '/t5-uno', runScripts: 'outside-only', pretendToBeVisual: true });
const W = dom.window;
W.fetch = async (url, op = {}) => {
  const u = new URL(url, FORO), cuerpo = op.body ? String(op.body) : '';
  srv.peticiones.push({ ruta: u.pathname + u.search.replace(/[?&]_=\d+/, ''), metodo: op.method || 'GET', cuerpo });
  let html = '<html></html>';
  if (op.method === 'POST') {
    const c = new URLSearchParams(cuerpo);
    if (c.get('mode') === 'editpost') { srv.mensajes[c.get('p')] = c.get('message'); html = `<p>El mensaje ha sido enviado con éxito. <a href="/viewtopic?t=5&amp;p=${c.get('p')}#${c.get('p')}">ver</a></p>`; }
    else { const id = srv.siguiente++; srv.publicados.push({ id, t: c.get('t'), m: c.get('message') }); srv.mensajes[id] = c.get('message'); html = `<p>El mensaje ha sido enviado con éxito. <a href="/viewtopic?t=${c.get('t')}&amp;p=${id}#${id}">ver</a></p>`; }
  } else if (u.pathname === '/post') html = u.searchParams.get('mode') === 'editpost' ? formEditar(u.searchParams.get('p')) : formResponder(u.searchParams.get('t'));
  else if (/^\/t\d+-/.test(u.pathname)) html = temaHtml(u.pathname.match(/^\/t(\d+)/)[1]);
  else if (u.pathname === '/') html = pagina;
  return { status: 200, ok: true, url: u.href, text: async () => html };
};
const gm = { 'mipj.ui': JSON.stringify({ abierto: true }), 'pam.x': 1 };
W.GM_getValue = (k, d) => (k in gm ? gm[k] : d);
W.GM_setValue = (k, v) => { gm[k] = v; };
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
const boton = txt => [...sombra().querySelectorAll('.puerta-fondo button, #mipj-modal button')].find(b => b.textContent === txt);
const estados = () => [...sombra().querySelectorAll('.p-estado')].map(e => e.textContent);
const esperarFin = async () => { for (let i = 0; i < 100 && !boton('Cerrar'); i++) await espera(10); boton('Cerrar').click(); };

test('hola (con la ventana del foro), iframe sin marco y lectura del foro', async () => {
  const h = await agente.hola();
  assert.deepEqual([h.agente, h.protocolo, h.foro, h.cuenta, h.ruta], ['0.3.4', 1, 'hp-avada-kedavra.foroactivo.com', { id: 7, nombre: 'TEST' }, '/t5-uno']);
  assert.ok(h.ventana.ancho > 0 && h.ventana.alto > 0);
  const f = sombra().querySelector('iframe');
  assert.equal(f.getAttribute('src'), PAM + '/PAM/panel.html?foro=' + encodeURIComponent(FORO) + '&v=0.3.4', 'con la versión: el navegador no mezcla archivos');
  assert.equal(f.className, 'marco');
  assert.equal(sombra().querySelector('.pastilla'), null, 'la pastilla es la de Mi PJ, dentro del panel');
  assert.equal((await agente.leer('/')).title, 'Foro');
  for (const mala of ['//evil.com/x', 'https://evil.com/', 'javascript:alert(1)', '/\\evil.com', 'u1']) await assert.rejects(agente.leer(mala), /no permitida/, mala);
});

test('editar: la puerta del Escriba enseña las diferencias; Aceptar edita, guarda copia y lo comprueba', async () => {
  srv.mensajes[99] = 'línea 1\nlínea 2\nlínea 3'; srv.peticiones.length = 0;
  const p = agente.editar(99, 'línea 1\nlínea 2\nlínea 3', 'línea 1\nlínea DOS\nlínea 3\nlínea 4', { motivo: 'Canje', titulo: 'Ficha' });
  await espera(30);
  assert.equal(sombra().querySelector('.p-cab b').textContent, 'Ficha');
  assert.equal(sombra().querySelector('.p-cab small').textContent, 'TEST', 'la cuenta conectada');
  const dif = sombra().querySelector('.p-diff');
  assert.deepEqual([...dif.querySelectorAll('.menos')].map(x => x.textContent), ['- línea 2']);
  assert.deepEqual([...dif.querySelectorAll('.mas')].map(x => x.textContent), ['+ línea DOS', '+ línea 4']);
  boton('Aceptar').click();
  await esperarFin();
  const r = await p;
  assert.deepEqual([r.editado, r.estado, r.modificado], [true, 'ok', false]);
  const c = new URLSearchParams(srv.peticiones.find(x => x.metodo === 'POST').cuerpo);
  assert.deepEqual([c.get('message'), c.get('edit_reason'), c.get('auth[]'), c.get('p')], ['línea 1\nlínea DOS\nlínea 3\nlínea 4', 'Canje', 'XYZ', '99']);
  assert.equal(gm['pam.copias.hp-avada-kedavra.foroactivo.com.7'].at(-1).bbcode, 'línea 1\nlínea 2\nlínea 3', 'copia de lo que había');
});
test('editar: Denegar no toca nada; si el mensaje cambió por el camino, tampoco; si ya está igual, ni se abre', async () => {
  srv.mensajes[99] = 'A'; srv.peticiones.length = 0;
  let p = agente.editar(99, 'A', 'B'); await espera(30); boton('Denegar').click();
  assert.deepEqual([(await p).editado, (await p).decision], [false, 'denegar']);
  p = agente.editar(99, 'texto que PAM leyó', 'nuevo'); await espera(30); boton('Aceptar').click(); await esperarFin();
  const r = await p;
  assert.deepEqual([r.editado, r.estado], [false, 'cambiado']);
  assert.equal(srv.peticiones.filter(x => x.metodo === 'POST').length, 0);
  assert.equal(srv.mensajes[99], 'A');
  assert.deepEqual((await agente.editar(99, 'igual', 'igual ')).decision, 'igual');
});
test('editar: Modificar deja retocar el texto final', async () => {
  srv.mensajes[99] = 'uno';
  const p = agente.editar(99, 'uno', 'dos'); await espera(30);
  boton('Modificar').click();
  const ta = sombra().querySelector('.p-texto');
  assert.ok(!ta.readOnly && !ta.hidden);
  assert.equal(boton('Aceptar con mis cambios')?.textContent, 'Aceptar con mis cambios');
  ta.value = 'tres'; boton('Aceptar con mis cambios').click(); await esperarFin();
  const r = await p;
  assert.deepEqual([r.editado, r.modificado], [true, true]);
  assert.equal(srv.mensajes[99], 'tres');
});
test('puerta con varios pasos: publicar y luego editar con «enlace del paso 1»', async () => {
  srv.mensajes[99] = 'Ficha vieja'; srv.peticiones.length = 0;
  const p = agente.puerta({ titulo: 'Aplicar el canje', explicacion: 'Dos pasos', pasos: [
    { tipo: 'publicar', tema: 5, texto: 'Petición de canje', descripcion: 'Registro' },
    { tipo: 'editar', post: 99, original: 'Ficha vieja', nuevo: 'Ficha nueva\nVer «enlace del paso 1»', motivo: 'Canje' },
    { tipo: 'editar', post: 98, original: 'x', nuevo: 'x', igual: 'Ya está.' }
  ] });
  await espera(30);
  assert.deepEqual(estados(), ['Pendiente', 'Pendiente', 'Ya está igual']);
  boton('Aceptar').click(); await esperarFin();
  const r = await p;
  assert.equal(r.resultado, 'aceptada');
  assert.deepEqual(r.pasos.map(x => x.estado), ['ok', 'ok', 'igual']);
  const id = r.pasos[0].post;
  assert.equal(srv.mensajes[99], `Ficha nueva\nVer ${FORO}/viewtopic?p=${id}#${id}`);
});
test('puerta: si cambia la cuenta conectada antes de aceptar, no se hace nada', async () => {
  srv.peticiones.length = 0;
  const p = agente.responder(5, 'Hola');
  await espera(30);
  const s = W.document.querySelector('head script'); const viejo = s.textContent;
  s.textContent = viejo.replace('= 7;', '= 8;');
  boton('Aceptar').click(); await espera(30);
  assert.match(sombra().querySelector('.p-info').textContent, /ya no es TEST/);
  assert.equal(srv.peticiones.filter(x => x.metodo === 'POST').length, 0);
  s.textContent = viejo;
  boton('Denegar').click();
  assert.equal((await p).publicado, false);
});
test('publicar: devuelve el número del mensaje publicado y publica una sola vez', async () => {
  srv.publicados.length = 0;
  const p = agente.responder(5, 'Una sola vez'); await espera(30); boton('Aceptar').click(); await esperarFin();
  const r = await p;
  assert.deepEqual([r.publicado, r.post], [true, String(srv.publicados[0].id)]);
  assert.equal(srv.publicados.length, 1);
});
test('almacén, datos del Mi PJ antiguo, tamaño y tema del panel', async () => {
  await agente.guardarDato('pam.ficha', { a: 1 });
  assert.deepEqual(await agente.leerDato('pam.ficha'), { a: 1 });
  await assert.rejects(agente.guardarDato('mipj.ui', 1), /no permitida/, 'no puede pisar lo del script antiguo');
  assert.deepEqual(Object.keys(await agente.legado()), ['mipj.ui'], 'lo antiguo, sin las claves pam.*');
  const t = await agente.tamano(390, 600);
  assert.deepEqual(t, { ancho: 390, alto: 600 });
  assert.equal(sombra().querySelector('iframe').style.width, '390px');
  assert.deepEqual(await agente.tema({ skin: 'pixel', gold: '#ff0' }), { skin: 'pixel' });
  assert.equal(W.document.getElementById('pam-agente').getAttribute('data-skin'), 'pixel');
  assert.ok(W.document.getElementById('mipj-fonts'), 'carga las fuentes del tema, como Mi PJ');
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

// ---------- editor del foro: la barra y «Antes de publicar» de Mi PJ, con la revisión de verdad de PAM ----------
const { revisarEditor } = await import('../../js/reglas/RevisorBoveda.js');
const formBoveda = (ini, act, tot) => `Grageas iniciales» ${ini}\n{Grageas que se añaden / quitan» +125 (sueldo)\n{Grageas actuales» ${act}\n{Grageas totales» ${tot}\n{Enlaces» [url=/t172-sueldos]sueldo[/url]`;
const BIEN = formBoveda('1.200', '1.325', '9.125'), MAL = formBoveda('1.200', '1.300', '9.125');
let bovedaPanel = { tema: 5, act: 1200, tot: 9000 }; // la página es /t5-uno: el jugador está en su bóveda
agente.atender('editor.revisar', d => revisarEditor(d, bovedaPanel));
const editor = W.document.getElementById('editor'), ta = editor.querySelector('textarea');
const caja = () => editor.querySelector('.pam-agente-check');
const barra = () => caja().shadowRoot.querySelector('.mipj-check');
const tocarBarra = async () => { barra().click(); await espera(40); };
let envios = 0; editor.addEventListener('submit', e => { envios++; e.preventDefault(); });

test('editor: la barra va justo debajo del editor y no se ve si no hay formulario de bóveda', async () => {
  assert.equal(ta.nextElementSibling, caja());
  ta.value = 'Un mensaje normal.'; await tocarBarra();
  assert.equal(caja().style.display, 'none');
  assert.equal(sombra().querySelector('#mipj-modal'), null);
});

test('editor: barra «las cuentas cuadran», con el mismo HTML que Mi PJ', async () => {
  ta.value = BIEN; await tocarBarra();
  assert.equal(caja().style.display, '');
  assert.equal(barra().outerHTML, '<div class="mipj-check ok"><span class="ic">✦</span>Bóveda: las cuentas cuadran<small>Mi PJ</small></div>');
  assert.equal(sombra().querySelector('#mipj-modal'), null, 'si cuadra, tocarla no abre nada');
  bovedaPanel = null; ta.value = BIEN + ' '; await tocarBarra();
  assert.equal(barra().outerHTML, '<div class="mipj-check ok"><span class="ic">✦</span>Bóveda: las cuentas cuadran (sin comparar con tu bóveda)<small>Mi PJ</small></div>');
  bovedaPanel = { tema: 5, act: 1200, tot: 9000 };
});

test('editor: barra «N cosas para revisar»; tocarla abre «Antes de publicar» solo con «Entendido»', async () => {
  ta.value = MAL; await tocarBarra();
  assert.equal(barra().outerHTML, '<div class="mipj-check mal"><span class="ic">⚠</span>Bóveda: 1 cosa para revisar<small>Mi PJ · tocá para ver</small></div>');
  const m = sombra().querySelector('#mipj-modal');
  assert.equal(m.querySelector('p').textContent, 'Revisé el formulario de la bóveda y hay algo que no cuadra:');
  assert.equal(m.querySelector('li').innerHTML, '<b>Grageas:</b> 1.200 + 125 da 1.325, no 1.300.');
  assert.deepEqual([...m.querySelectorAll('button')].map(b => b.textContent), ['Entendido']);
  boton('Entendido').click(); await espera(10);
  assert.equal(sombra().querySelector('#mipj-modal'), null);
  ta.value = formBoveda('1.000', '1.300', '9.000'); await tocarBarra(); // empieza en 1.000 (bóveda: 1.200), suma mal y totales mal
  assert.match(barra().textContent, /Bóveda: 3 cosas para revisar/);
  assert.match(sombra().querySelector('#mipj-modal p').textContent, /hay 3 cosas que no cuadran:$/);
  boton('Entendido').click(); await espera(10);
});

test('editor: al enviar con problemas, «Publicar igual» / «Volver a corregir»; sin problemas, se envía en el acto', async () => {
  envios = 0;
  ta.value = MAL; editor.requestSubmit(); await espera(40);
  assert.equal(envios, 0);
  assert.deepEqual([...sombra().querySelectorAll('#mipj-modal button')].map(b => b.textContent), ['Publicar igual', 'Volver a corregir']);
  boton('Volver a corregir').click(); await espera(10);
  assert.equal(envios, 0);
  editor.requestSubmit(); await espera(40); boton('Publicar igual').click(); await espera(20);
  assert.equal(envios, 1);
  ta.value = BIEN; await tocarBarra();
  editor.requestSubmit();
  assert.equal(envios, 2, 'ya revisado y sin problemas: no espera a PAM');
  ta.value = 'Un mensaje normal, nuevo.'; editor.requestSubmit(); await espera(40);
  assert.equal(envios, 3, 'sin formulario: se pregunta a PAM y se envía');
});

test('editor: si PAM no contesta, no hay barra y se puede enviar igual', async () => {
  agente.atender('editor.revisar', () => new Promise(() => {}));
  envios = 0; ta.value = MAL + ' sin PAM';
  editor.requestSubmit(); await espera(3100);
  assert.equal(envios, 1);
  assert.equal(caja().style.display, 'none');
  agente.atender('editor.revisar', d => revisarEditor(d, bovedaPanel));
});

test('editor: la barra sigue el tema de Mi PJ', async () => {
  await agente.tema({ skin: 'pixel', bad: '#f00' });
  assert.equal(caja().getAttribute('data-skin'), 'pixel');
  assert.match(caja().shadowRoot.querySelectorAll('style')[1].textContent, /--m-bad:#f00/);
  await agente.tema(null);
  assert.equal(caja().getAttribute('data-skin'), 'avadense');
});

test('hola dice si la página tiene editor (para releer la bóveda al escribir en ella)', async () => {
  assert.equal((await agente.hola()).editor, true);
  W.close(); // para los temporizadores del agente (la barra se revisa cada 1,5 s)
});
