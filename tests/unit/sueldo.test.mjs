// 2.5.0 · Pedir el sueldo de un rol de empleo y sumarlo a la bóveda: reglas (js/reglas/Sueldo.js), lectura del foro
// (js/servicios/SueldoDelForo.js) y la puerta de la bóveda (CanjesDelForo.accionSumarABoveda).
// Los «Empleos roleros» son como los del foro de verdad (22/11/2026); los temas, los nombres y los textos son inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { empleosDelPerfil, catalogoEmpleos, buscarEmpleo, sueldoDe, nivelDe, formularioEmpleo, montoSueldo, pedidoYRespuesta,
  ES_PEDIDO_DE_ROL, enlazaTema, estadoSueldo, paqueteSueldo, NIVELES } from '../../js/reglas/Sueldo.js';
import { crearSueldoDelForo, enZonaDeRol, temaCerrado, campoDelPerfil } from '../../js/servicios/SueldoDelForo.js';
import { crearCanjesDelForo } from '../../js/servicios/CanjesDelForo.js';
import { movimientoGrageas, codigoConEnlaces } from '../../js/reglas/Canjes.js';
import { registroDePrueba } from '../fixtures/canjes/registro.mjs';
import { paginaDe } from '../fixtures/actividad/foro.mjs';

const dato = f => readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8');
const CATALOGO = catalogoEmpleos(dato('empleos-foro.txt'));
const TABLA = JSON.parse(dato('sistema.json')).empleos.sueldos;
const FORO = 'https://hp-avada-kedavra.foroactivo.com';
const CFG = JSON.parse(dato('foros.json')).foros['hp-avada-kedavra.foroactivo.com'].actividad;
const doc = html => new JSDOM(html).window.document;

/* ---------------- reglas ---------------- */
test('perfil: cada línea de «Empleos roleros» es un empleo, con su nivel (sin mirar el género ni las mayúsculas)', () => {
  assert.deepEqual(empleosDelPerfil('Veterimago (competente)'), [{ nombre: 'Veterimago', nivel: 1, texto: 'Veterimago (competente)' }]);
  assert.deepEqual(empleosDelPerfil('Sanadora (Maestro)\nEnfermera de Hogwarts (Experto)').map(e => [e.nombre, e.nivel]), [['Sanadora', 3], ['Enfermera de Hogwarts', 2]]);
  assert.deepEqual(empleosDelPerfil('Jugadora de Quidditch Profesional (Cazadora, Maestra)').map(e => [e.nombre, e.nivel]), [['Jugadora de Quidditch Profesional', 3]]);
  assert.equal(empleosDelPerfil('Profesor de Cuidado de Criaturas Mágicas (Mestro)')[0].nivel, -1, 'una errata: el nivel lo elige el jugador');
  assert.deepEqual(empleosDelPerfil('-'), []);
  assert.deepEqual([nivelDe('Legendaria'), nivelDe('novato'), nivelDe('Cazadora')], [4, 0, -1]);
});

test('lista de empleos: la categoría de sueldo de cada empleo del perfil', () => {
  const cat = n => { const e = buscarEmpleo(n, CATALOGO); return e && [e.nombre, e.categoria]; };
  assert.deepEqual(cat('Veterimago'), ['VETERIMAGO', 'Medio']);
  assert.deepEqual(cat('Sanadora'), ['SANADOR', 'Medio']);
  assert.deepEqual(cat('Enfermera de Hogwarts'), ['ENFERMERO', 'Bajo']);
  assert.deepEqual(cat('Jugadora de Quidditch Profesional'), ['JUGADOR PROFESIONAL DE QUIDDITCH', 'Medio'], 'otro orden de palabras');
  assert.deepEqual(cat('Académico: Magizoologo'), ['ACADÉMICO', 'Medio']);
  assert.deepEqual(cat('Subdirector de San Mungo'), ['SUBDIRECTOR DE SAN MUNGO', 'Alto'], 'no «Director de San Mungo» ni «Sanador»');
  assert.deepEqual(cat('Médium'), ['ADIVINOS / MÉDIUMS', 'Medio'], 'uno de los nombres de «Adivinos / Médiums»');
  assert.deepEqual(cat('Heredera'), ['HEREDERA', ''], 'la lista no dice su categoría');
  assert.equal(cat('Domador de dragones'), null);
});

test('sueldo: la tabla del foro (categoría × nivel)', () => {
  assert.equal(sueldoDe(TABLA, 'Medio', 1), 75, 'Veterimago competente, como el pedido de verdad de Mortimer');
  assert.equal(sueldoDe(TABLA, 'muy alto', 4), 500);
  assert.equal(sueldoDe(TABLA, 'Sin sueldo', 1), null);
  assert.equal(sueldoDe(TABLA, 'Medio', -1), null);
});

const F = { empleo: 'Veterimago', categoria: 'Medio', nivel: 1, sueldo: 75, rol: { url: FORO + '/t600-', titulo: 'Inquilinos ruidosos [Lia]' }, resumen: 'Cura a una kneazle herida.' };

test('formulario: el «Empleo rolero» oficial, y lo que el foro y Mi PJ leen de él', () => {
  const t = formularioEmpleo(F);
  assert.equal(t.split('\n').length, 6);
  assert.equal(t.split('\n')[0], '[size=14][font=Cinzel][color=#6d5737][b]{Nombre del empleo»[/b][/color][/font][/size] Veterimago');
  assert.match(t, /\{Enlaces de los roles»\[\/b\]\[\/color\]\[\/font\]\[\/size\] \[url=https:\/\/hp-avada-kedavra\.foroactivo\.com\/t600-\]Inquilinos ruidosos \[Lia\]\[\/url\]/);
  const visto = t.replace(/\[[^\]]*\]/g, ''); // como sale en el foro
  assert.equal(montoSueldo(visto), 75, 'la tarjeta del sueldo lee lo pedido');
  assert.ok(ES_PEDIDO_DE_ROL.test(visto) && ES_PEDIDO_DE_ROL.test('{Enlace del rol» Inquilinos') && !ES_PEDIDO_DE_ROL.test('{Panel» Misiones {Actividad mensual» …'));
  const { pedido } = pedidoYRespuesta([{ id: '1', autor: 'Admin', texto: '' }, { id: '2', autor: 'Lia Fenn', fecha: 'x', texto: visto }], 'Lia Fenn');
  assert.deepEqual([pedido.id, pedido.monto], [2, 75]);
  assert.ok(enlazaTema('<a href="https://x/t600-inquilinos">', 600) && enlazaTema('<a href="/t600p15-x">', 600) && !enlazaTema('<a href="/t6001-x">', 600));
});

test('estado: con un movimiento que enlaza el pedido, el sueldo queda «cobrado»', () => {
  const S = { estado: 'leido', tid: 700, pedido: { id: 7002, monto: 75 }, resp: { v: 'aprobado', id: 7003, autor: 'Staff' } };
  assert.equal(estadoSueldo(S, { propios: [] }).k, 'aprobado');
  const html = codigoConEnlaces(movimientoGrageas({ ini: 301, d: 75 }, 1000).html, FORO + '/viewtopic?p=7002#7002', FORO + '/viewtopic?p=7003#7003', '✦');
  const enl = [...html.matchAll(/\[url=([^\]]+)\]/g)].map(m => m[1]).join(' ');
  assert.equal(estadoSueldo(S, { propios: [{ id: 9000, d: 75, enl }] }).k, 'cobrado');
  const p = paqueteSueldo({ foro: 'f', cuenta: { id: 1, nombre: 'Lia Fenn' }, pj: 'Lia Fenn', mes: 'octubre', monto: 75, enlacePet: 'a', enlaceAce: 'b', numeros: { iniciales: 301, actuales: 376, totales: 1075 } });
  assert.deepEqual([p.v, p.cuenta.foro, p.numeros.actuales], [1, 'f', 376]);
});

test('movimiento: los números de la Bóveda de PAM (solo lo que se suma cuenta en las totales)', () => {
  const m = movimientoGrageas({ ini: 301, d: 75 }, 32639);
  assert.deepEqual([m.act, m.tot], [376, 32714]);
  assert.match(m.html, /\{Grageas que se añaden\/quitan»<\/span> \+75\n/);
  assert.deepEqual((({ act, tot }) => [act, tot])(movimientoGrageas({ ini: 500, d: -200 }, 900)), [300, 900]);
  assert.equal(NIVELES.length, TABLA.Medio.length);
});

/* ---------------- el foro (inventado) ---------------- */
const YO = { id: 45, nombre: 'Lia Fenn' };
const nav = foros => `<a class="nav" href="/">Índice</a> <a class="nav" href="/c10-zona-del-rol">● ZONA DEL ROL ●</a> ${foros.map(f => `<a class="nav" href="/f${f}-x">f${f}</a>`).join(' ')}`;
const candado = '<img src="/cerrado.png" alt="Este tema está cerrado y no puedes editar mensajes o responder">';
const perfil = empleos => `<div class="postprofile"><span class="profileField"><span class="label">Etapa : </span> Adulto<br></span><span class="profileField"><span class="label">Empleos roleros : </span> ${empleos}<br><br></span></div>`;
const msg = (id, autor, uid, fecha, html, extra = '') => `<div class="post" id="p${id}"><p class="author">por <a href="/u${uid}">${autor}</a> ${fecha}</p><div class="content">${html}</div>${extra}</div>`;
const tema = (tid, slug, titulo, foros, posts, { cerrado = false, paginas = [] } = {}) =>
  `<html><body>${nav(foros)}<h1 class="page-title"><a href="/t${tid}-${slug}">${titulo}</a></h1>${cerrado ? candado : ''}${paginas.map(o => `<a href="/t${tid}p${o}-${slug}">${o / 15 + 1}</a>`).join('')}${posts.join('')}</body></html>`;

function foro(paginas) {
  const leidas = [];
  return { leidas, leer: async ruta => { leidas.push(ruta); const h = paginaDe(paginas, ruta); if (h == null) throw new Error('404 ' + ruta); return doc(h); } };
}
const memoria = () => { const m = new Map(); return { gv: (k, d) => (m.has(k) ? m.get(k) : d), sv: (k, v) => m.set(k, JSON.parse(JSON.stringify(v))) }; };

const ROL = {
  '/t600-inquilinos-ruidosos': tema(600, 'inquilinos-ruidosos', 'Inquilinos ruidosos [Lia]', [171, 180], [
    msg(6001, 'Bruno Ketch', 77, 'Lun 2 Nov 2026 - 10:00', 'Llama a la puerta.', perfil('Maleante (Experto)'))
  ], { cerrado: true, paginas: [15] }),
  '/t600p15-inquilinos-ruidosos': tema(600, 'inquilinos-ruidosos', 'Inquilinos ruidosos [Lia]', [171, 180], [
    msg(6016, 'Lia Fenn', 45, 'Mar 3 Nov 2026 - 11:00', 'Cura a la kneazle.', perfil('Veterimago (competente)<br>\nSanadora (Novato)')),
    msg(6017, 'Bruno Ketch', 77, 'Mié 4 Nov 2026 - 12:00', 'Fin.', perfil('Maleante (Experto)'))
  ], { cerrado: true })
};

test('zona de rol y tema cerrado: la ruta de navegación y el candado', () => {
  const d = doc(ROL['/t600-inquilinos-ruidosos']);
  assert.ok(enZonaDeRol(d, CFG) && temaCerrado(d));
  assert.ok(!enZonaDeRol(doc(tema(700, 's', 'Sueldos de Octubre', [171, 72, 75, 172], [])), CFG), 'Sueldos Mensuales también cuelga de la zona de rol');
  assert.ok(!enZonaDeRol(doc('<html><body><a class="nav" href="/f20-x">x</a></body></html>'), CFG));
  assert.ok(!temaCerrado(doc(tema(601, 'a', 'Abierto', [171], []))));
  const p = doc(ROL['/t600p15-inquilinos-ruidosos']).getElementById('p6016');
  assert.equal(campoDelPerfil(p, /empleos?\s+roleros?/i), 'Veterimago (competente)\nSanadora (Novato)');
  assert.equal(campoDelPerfil(p, /cargos/i), null);
});

test('el rol de la página: cerrado, en la zona de rol, con tus mensajes y tus empleos; después, de lo guardado', async () => {
  const f = foro(ROL), mem = memoria();
  const S = crearSueldoDelForo(f, { origen: FORO, cuenta: YO, cfg: CFG, memoria: mem });
  const r = await S.leerRol('/t600p15-inquilinos-ruidosos#6016');
  assert.deepEqual([r.tid, r.titulo, r.enRol, r.cerrado, r.mios, r.ultimo.id], [600, 'Inquilinos ruidosos [Lia]', true, true, 1, 6017]);
  assert.deepEqual(r.empleos.map(e => [e.nombre, e.nivel]), [['Veterimago', 1], ['Sanadora', 0]], 'los tuyos, no los de Bruno');
  const n = f.leidas.length;
  await S.leerRol('/t600-inquilinos-ruidosos');
  assert.equal(f.leidas.length, n, 'un rol cerrado no se vuelve a leer');
  // un rol abierto: solo la primera página, y no se guarda (puede cerrarse después)
  const f2 = foro({ '/t601-abierto': tema(601, 'abierto', 'Abierto', [171, 180], [msg(6101, 'Lia Fenn', 45, 'x', 'Hola', perfil('Veterimago (competente)'))], { paginas: [15] }) });
  const S2 = crearSueldoDelForo(f2, { origen: FORO, cuenta: YO, cfg: CFG, memoria: memoria() });
  const r2 = await S2.leerRol('/t601-abierto');
  assert.deepEqual([r2.cerrado, r2.empleos, f2.leidas.length], [false, null, 1]);
  await S2.leerRol('/t601-abierto');
  assert.equal(f2.leidas.length, 2);
});

test('antes de pedir: un rol de empleo por mes, y un rol no se pide dos veces', async () => {
  const lista = (temas) => `<html><body>${temas.map(([tid, slug, titulo, ult]) => `<li class="row"><a class="topictitle" href="/t${tid}-${slug}">${titulo}</a><a href="/t${tid}-${slug}#${ult}">último</a></li>`).join('')}</body></html>`;
  const P = {
    ...ROL,
    '/f172-sueldos-mensuales': lista([[89, 'formularios', 'Formularios para solicitar sueldo', 100], [700, 'sueldos-de-octubre', 'Sueldos de Octubre', 7010], [690, 'sueldos-de-septiembre', 'Sueldos de Septiembre', 6900], [680, 'sueldos-de-agosto', 'Sueldos de Agosto', 5000]]),
    '/t700-sueldos-de-octubre': tema(700, 'sueldos-de-octubre', 'Sueldos de Octubre', [171, 75, 172], [
      msg(7000, 'Staff', 1, 'x', 'Abrimos los sueldos.'),
      msg(7002, 'Lia Fenn', 45, 'x', '{Nombre del cargo» Inspectora {Panel» Fichas {Sueldo» 125 grageas')]),
    '/t690-sueldos-de-septiembre': tema(690, 'sueldos-de-septiembre', 'Sueldos de Septiembre', [171, 75, 172], [
      msg(6900, 'Lia Fenn', 45, 'x', '{Nombre del empleo» Veterimago {Enlaces de los roles» <a href="https://hp-avada-kedavra.foroactivo.com/t600-inquilinos-ruidosos">Inquilinos</a> {Sueldo» 75 grageas')])
  };
  const f = foro(P);
  const S = crearSueldoDelForo(f, { origen: FORO, cuenta: YO, cfg: CFG, memoria: memoria() });
  const rol = await S.leerRol('/t600-inquilinos-ruidosos');
  const Smes = { url: FORO + '/t700-sueldos-de-octubre', tid: 700, mes: 'octubre' };
  const a = await S.antesDePedir(rol, Smes);
  assert.equal(a.rolEsteMes, null, 'este mes pediste un cargo, no un rol');
  assert.deepEqual(a.repetido, { tema: FORO + '/t690-sueldos-de-septiembre', titulo: 'Sueldos de Septiembre', post: 6900 });
  assert.ok(!f.leidas.some(r => r.startsWith('/t680')), 'agosto terminó antes que el rol: no se lee');
  assert.ok(!f.leidas.some(r => r.startsWith('/t89')), 'el tema de los formularios no es un mes');
  // este mes ya hay un rol de empleo
  P['/t700-sueldos-de-octubre'] = P['/t700-sueldos-de-octubre'].replace('{Nombre del cargo» Inspectora {Panel» Fichas', '{Nombre del empleo» Sanadora {Enlaces de los roles» Otro rol');
  const b = await crearSueldoDelForo(foro(P), { origen: FORO, cuenta: YO, cfg: CFG, memoria: memoria() }).antesDePedir(rol, Smes);
  assert.deepEqual(b.rolEsteMes, { post: 7002 });
});

test('la puerta del pedido: un solo paso, publicar el formulario en el tema del mes', () => {
  const S = crearSueldoDelForo(foro({}), { origen: FORO, cuenta: YO, cfg: CFG, memoria: memoria() });
  const a = S.accionPedir(F, { url: FORO + '/t700-', tid: 700, mes: 'octubre' }, ['aviso']);
  assert.equal(a.titulo, 'Pedir el sueldo');
  assert.deepEqual(a.avisos, ['aviso']);
  assert.deepEqual(a.pasos.map(p => [p.tipo, p.tema, p.descripcion]), [['publicar', 700, 'pedido en «Sueldos de Octubre»']]);
  assert.equal(a.pasos[0].texto, formularioEmpleo(F));
  assert.deepEqual(S.enlaces({ pedido: { id: 7002 }, resp: { id: 7003 } }), { enlacePet: FORO + '/viewtopic?p=7002#7002', enlaceAce: FORO + '/viewtopic?p=7003#7003' });
});

/* ---------------- sumar a la bóveda (la puerta de los canjes, sin nada preparado en PAM) ---------------- */
test('bóveda: primer mensaje y movimiento con los números de la bóveda del foro; si ya está, «igual»', async () => {
  const P = registroDePrueba();
  const agente = { leer: async r => doc(paginaDe(P, r)) };
  const C = crearCanjesDelForo(agente, { foroHost: 'hp-avada-kedavra.foroactivo.com', cuenta: { id: 5203, nombre: 'Irvin Giles' }, cfg: { registroCanjes: '/t400-' }, memoria: memoria() });
  const datos = { boveda: { url: FORO + '/t301-boveda-de-irvin-giles' } };
  const op = { delta: 125, enlacePet: FORO + '/viewtopic?p=7002#7002', enlaceAce: FORO + '/viewtopic?p=7003#7003', motivo: 'Sueldo aprobado', titulo: 'Sumar el sueldo a la bóveda', explicacion: 'x' };
  const { accion, numeros, yaPublicado } = await C.accionSumarABoveda(op, datos);
  assert.deepEqual(numeros, { iniciales: 2500, actuales: 2625, totales: 5625 }, 'el saldo es el del último movimiento (2.500), no el de la cabecera');
  assert.equal(yaPublicado, false);
  const [cab, mov] = accion.pasos;
  assert.deepEqual([cab.tipo, cab.post, cab.motivo], ['editar', '9810', 'Sueldo aprobado']);
  assert.match(cab.nuevo, /Grageas Actuales:\[\/b\] 2\.625/);
  assert.match(cab.nuevo, /Grageas Totales:\[\/b\] 5\.625/);
  assert.deepEqual([mov.tipo, mov.tema], ['publicar', '301']);
  assert.equal(mov.texto, codigoConEnlaces(movimientoGrageas({ ini: 2500, d: 125 }, 5500).html, op.enlacePet, op.enlaceAce, '✦'));
  assert.match(mov.texto, /\[url=https:\/\/hp-avada-kedavra\.foroactivo\.com\/viewtopic\?p=7002#7002\]Petición\[\/url\] ✦ \[url=[^\]]+p=7003#7003\]Aceptación\[\/url\]/);
  // ya publicado: un movimiento tuyo en la bóveda que enlaza la aprobación
  P['/t301-boveda-de-irvin-giles'] = P['/t301-boveda-de-irvin-giles'].replace('</body>', '<div class="post" id="p9812"><p class="author">por <a href="/u5203">Irvin Giles</a> x</p><div class="content">Grageas iniciales» 2500</div></div></body>');
  P['/post?p=9812&mode=editpost'] = '<html><body><form name="post"><textarea name="message">{Enlaces» [url=' + op.enlacePet + ']Petición[/url] ✦ [url=' + op.enlaceAce + ']Aceptación[/url]</textarea></form></body></html>';
  const otra = await C.accionSumarABoveda(op, datos);
  assert.equal(otra.yaPublicado, true);
  assert.ok(otra.accion.pasos[1].igual && otra.accion.pasos[0].omitido);
  await assert.rejects(C.accionSumarABoveda(op, {}), /Actualizar/);
});
