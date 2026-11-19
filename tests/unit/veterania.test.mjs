// 2.4.0 · La veteranía: reglas (js/reglas/Veterania.js) y lectura del foro (js/servicios/VeteraniaDelForo.js).
// Los textos son como los del Registro de Veteranía de verdad (felicitación por el nombre de pila o un apodo, varias
// veteranías juntas, pedidos que no dicen «veteranía», citas de una aprobación); los nombres son inventados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { aprobacionDeVeterania, contarVeteranias, cobrosDe, cuentasVacias, resumenVeterania, fechaDMA, esElNombre } from '../../js/reglas/Veterania.js';
import { crearVeteraniaDelForo, activacionDelPerfil } from '../../js/servicios/VeteraniaDelForo.js';

test('aprobación: el nombre, y cuántas veteranías son por las grageas', () => {
  assert.deepEqual(aprobacionDeVeterania('¡Felicidades, Lia ! Te corresponden 2.000 grageas por tu veteranía y, desde ahora, tienes derecho a 1 PD extra.'), { nombre: 'Lia', cantidad: 1, grageas: 2000 });
  assert.equal(aprobacionDeVeterania('¡Enhorabuena, Bruno ! Te corresponden 4.000 grageas por tu veteranía y…').cantidad, 2);
  assert.equal(aprobacionDeVeterania('¡Cora Blest !, te corresponden 6.000 grageas por las dos veteranías y desde ahora…').cantidad, 3);
  assert.equal(aprobacionDeVeterania('¡Felicidades, por tu primer año Jun ! Te corresponden 2000 grageas por tu veteranía').nombre, 'Jun');
  assert.equal(aprobacionDeVeterania('¡Enhorabuena, @Kang-Dae Min ! Te corresponden 2.000 grageas por tu veteranía').nombre, 'Kang-Dae Min');
  assert.equal(aprobacionDeVeterania('Vengo a por 2 veteranías que me corresponden. Arcanos: Nebulus'), null);
  assert.equal(aprobacionDeVeterania('Tus arcanos de veteranía son correctos y puedes agregarlos.'), null);
  assert.ok(esElNombre('Min', 'Kang-Dae Min') && esElNombre('Lia', 'Lia Fenn') && !esElNombre('Lia', 'Liam Ford'));
});

const m = (id, autor, texto, fecha = 'Lun 4 Nov 2024 - 8:35') => ({ id, autor, fecha, texto });
const REGISTRO = [
  m(10, 'Admin', '{Registro de Veteranía» Cada año que tu PJ esté desde su creación…'),
  m(11, 'Lia Fenn', 'Vengo a por mi veteranía. Arcanos: Nebulus'),
  m(12, 'Kang-Dae Min', 'Un año más para el pelirrojo. Arcanos: Bombarda'), // no dice «veteranía»
  m(13, 'Staff Uno', '¡Felicidades, Lia ! Te corresponden 2.000 grageas por tu veteranía y, desde ahora, 1 PD extra.'),
  m(14, 'Staff Dos', '¡Enhorabuena, Doctor Min ! Te corresponden 4.000 grageas por tu veteranía.'), // apodo y dos juntas
  m(15, 'Lia Fenn', 'Staff Uno escribió: ¡Felicidades, Lia ! … ¡Gracias!'.replace('¡Felicidades, Lia ! …', '')), // la cita ya viene quitada
  m(16, 'Bruno Ketch', 'Mi veteranía, por favor.'),
  m(17, 'Staff Uno', '¡Felicidades! Te corresponden 2.000 grageas por tu veteranía.') // sin nombre: el último pedido
];

test('contar: cada aprobación va al pedido anterior de esa persona (por nombre de pila, apodo o, sin nombre, el último)', () => {
  const c = contarVeteranias(cuentasVacias(), REGISTRO);
  assert.deepEqual(cobrosDe(c, 'Lia Fenn').map(x => [x.post, x.cantidad, x.aprobo]), [[13, 1, 'Staff Uno']]);
  assert.deepEqual(cobrosDe(c, 'Kang-Dae Min').map(x => [x.post, x.cantidad]), [[14, 2]]);
  assert.deepEqual(cobrosDe(c, 'Bruno Ketch').map(x => x.post), [17]);
  assert.deepEqual(cobrosDe(c, 'Nadie Más'), []);
  // lo ya contado no se cuenta otra vez (al volver a leer la última página)
  const otra = contarVeteranias(c, REGISTRO);
  assert.deepEqual(otra, c);
});

test('resumen: años cumplidos, las que faltan y la próxima', () => {
  const act = fechaDMA('16/11/2023');
  let r = resumenVeterania({ activacion: act, cobradas: 1, hoy: new Date(2026, 10, 19, 12) });
  assert.deepEqual([r.anios, r.faltan, r.proxima.toLocaleDateString('es-AR'), r.dias], [3, 2, '16/11/2027', 362]);
  r = resumenVeterania({ activacion: act, cobradas: 3, hoy: new Date(2026, 10, 15, 12) }); // un día antes del cumpleaños
  assert.deepEqual([r.anios, r.faltan, r.dias], [2, 0, 1]);
  assert.equal(resumenVeterania({ activacion: null, cobradas: 0 }), null);
});

/* ---------------- el servicio, con un foro de mentira ---------------- */
const post = (id, autor, html) => `<div class="post" id="p${id}"><p class="author">por <span class="usr_grp_clr"><strong>${autor}</strong></span> Lun 4 Nov 2024 - 8:35</p><div class="content">${html}</div></div>`;
const pagina = (posts, paginas = []) => `<html><body><h1 class="page-title"><a href="/t500-registro-de-veterania">Registro de Veteranía</a></h1>${paginas.map(o => `<a href="/t500p${o}-registro-de-veterania">x</a>`).join('')}${posts.join('')}</body></html>`;
const FICHA = `<html><body><h1 class="page-title"><a href="/t300-lia-fenn">Lia Fenn</a></h1><div class="post" id="p300"><p class="author">por <strong>Lia Fenn</strong></p><div class="content">Ficha</div>
  <div class="postprofile"><span class="profileField"><span class="label">Fecha de inscripción : </span> 01/01/2020<br></span><span class="profileField"><span class="label">Fecha de Activación : </span> 16/11/2023<br></span></div></div></body></html>`;

function foro(paginas) {
  const leidas = [];
  return {
    leidas,
    leer: async ruta => { leidas.push(ruta); const html = paginas[ruta.split('?')[0]]; if (html == null) throw new Error('404 ' + ruta); return new JSDOM(html).window.document; }
  };
}
const memoria = () => { const mem = new Map(); return { gv: (k, d) => (mem.has(k) ? mem.get(k) : d), sv: (k, v) => mem.set(k, JSON.parse(JSON.stringify(v))) }; };

test('perfil: la «Fecha de Activación» (y si no está, la de inscripción)', () => {
  assert.deepEqual(activacionDelPerfil(new JSDOM(FICHA).window.document), { fecha: '16/11/2023', campo: 'Fecha de Activación' });
  const sinActivacion = FICHA.replace('<span class="profileField"><span class="label">Fecha de Activación : </span> 16/11/2023<br></span>', '');
  assert.notEqual(sinActivacion, FICHA);
  assert.equal(activacionDelPerfil(new JSDOM(sinActivacion).window.document).fecha, '01/01/2020');
});

test('servicio: cuenta el registro entero la primera vez y después solo lo nuevo; el anterior, si no se puede abrir, se avisa', async () => {
  const paginas = {
    '/t300-': FICHA,
    '/t500-registro-de-veterania': pagina([post(11, 'Lia Fenn', 'Vengo a por mi veteranía'), post(13, 'Staff Uno', '¡Felicidades, Lia ! Te corresponden 2.000 grageas por tu veteranía.')], [15]),
    '/t500p15-': pagina([post(20, 'Lia Fenn', 'Otra vez yo'), post(21, 'Staff Dos', '<blockquote>¡Felicidades, Lia ! Te corresponden 2.000 grageas por tu veteranía.</blockquote> ¡Enhorabuena, Lia ! Te corresponden 2.000 grageas por tu veteranía.')], [0]),
    '/t400-registro-viejo': '<html><body>Por favor escribe tu nombre de usuario y tu contraseña para conectarte.</body></html>'
  };
  const F = foro(paginas), mem = memoria();
  const vet = crearVeteraniaDelForo(F, { cfg: { registro: '/t500-registro-de-veterania', anterior: '/t400-registro-viejo' }, memoria: mem, ahora: () => new Date(2026, 10, 19, 12).getTime() });
  const r = await vet.leer({ pj: 'Lia Fenn', rutaFicha: '/t300-' });
  assert.equal(r.activacion, '16/11/2023');
  assert.deepEqual([r.anios, r.cobradas, r.faltan], [3, 2, 1], 'la cita de la aprobación no cuenta dos veces');
  assert.equal(r.ultima.post, 21);
  assert.equal(r.sinAnterior, true);
  // la segunda vez: solo la página 1 (para ver cuántas hay) y la última; las de en medio, no
  paginas['/t500p15-'] = paginas['/t500p15-'].replace('</body>', post(30, 'Lia Fenn', 'Y otra') + post(31, 'Staff Uno', '¡Felicidades, Lia ! Te corresponden 2.000 grageas por tu veteranía.') + '</body>');
  F.leidas.length = 0;
  const r2 = await vet.leer({ pj: 'Lia Fenn', rutaFicha: '/t300-' });
  assert.equal(r2.cobradas, 3);
  assert.equal(r2.faltan, 0);
  assert.deepEqual(F.leidas.filter(x => x.startsWith('/t500')), ['/t500-registro-de-veterania', '/t500p15-']);
  assert.ok(!F.leidas.includes('/t400-registro-viejo'), 'el registro anterior, sin acceso, se reintenta una vez al día');
});

/* ---------------- la tarjeta del panel ---------------- */
test('panel: la tarjeta «Veteranía» (te falta cobrar, la última, la próxima) y el aviso en la pastilla', async () => {
  const { crearPanelMiPj } = await import('../../js/paginas/panel/MiPjPanel.js');
  const CU = { id: 7, nombre: 'Lia Fenn' };
  const datos = {
    v: 2, cuenta: CU.nombre, pj: CU.nombre, uid: CU.id, leido: new Date().toISOString(), ficha: null, boveda: null, roles: [], sueldo: null, oficiales: [],
    veterania: { v: 1, activacion: '16/11/2023', anios: 3, corresponden: 3, faltan: 1, cobradas: 2, proxima: new Date(2027, 10, 16, 12).toISOString(), dias: 362,
      ultima: { post: 21, fecha: 'Lun 4 Nov 2024 - 8:35', aprobo: 'Staff Dos', enBoveda: true }, sinAnterior: false, registro: '/t500-registro-de-veterania' }
  };
  const pintar = (ui) => {
    const { window: w } = new JSDOM('<!doctype html><html><body><div id="mipj"></div></body></html>', { url: 'https://claudilahozbosch.github.io/PAM/panel.html' });
    const mem = new Map([['mipj.' + CU.id, JSON.stringify(datos)], ['mipj.ui', JSON.stringify(ui)]]);
    const p = crearPanelMiPj({ root: w.document.getElementById('mipj'), documento: w.document, guardado: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }, cargar: async () => datos, ventana: { ancho: 1400, alto: 900 }, pamUrl: 'https://x/', cuenta: CU, foroHost: 'foro.example' });
    p.pintar();
    return w.document.getElementById('mipj');
  };
  const abierto = pintar({ abierto: true });
  const card = [...abierto.querySelectorAll('.card')].find(c => /Veteranía/.test(c.textContent));
  assert.ok(card, 'hay tarjeta');
  assert.match(card.textContent, /Te falta cobrar 1/);
  assert.match(card.textContent, /Activo desde el 16\/11\/2023 · 3 años · cobraste 2/);
  assert.match(card.textContent, /Última: aprobada por Staff Dos, Lun 4 Nov 2024 · ver/);
  assert.match(card.textContent, /La próxima: 16\/11\/2027 \(en 362 días\)/);
  assert.equal(card.querySelector('a').getAttribute('href'), 'https://foro.example/t500-registro-de-veterania');
  const pill = pintar({ abierto: false });
  assert.ok(pill.querySelector('.pill [title="Veteranía sin cobrar"]'), 'aviso en la pastilla');
  datos.veterania.faltan = 0;
  assert.match([...pintar({ abierto: true }).querySelectorAll('.card')].find(c => /Veteranía/.test(c.textContent)).textContent, /✓ Al día/);
  assert.ok(!pintar({ abierto: false }).querySelector('.pill [title="Veteranía sin cobrar"]'));
});
