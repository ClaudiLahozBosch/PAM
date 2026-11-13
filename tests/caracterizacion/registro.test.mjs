// Fase 8b: el Registro de Roles y el Coloreador como módulos (js/paginas/registro/).
// Se abre PAM con el Registro nuevo («archivos») y con el antiguo («junto», copia congelada en
// tests/legado/paginas/registro-roles.js), con los mismos datos guardados, y se compara lo que se ve en cada pestaña,
// después de usarlo y lo que queda guardado. Diferencias a propósito: F14 (guarda al cerrar la página) y N08
// (el Coloreador recuerda lo de cada personaje), con sus pruebas abajo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { abrir, igual, RAIZ } from '../legado/abrirPam.mjs';
import { XLSX_URL, parseWorkbook } from '../../js/paginas/registro/importarExcel.js';
import { crearDatosDeseos, claveDeseo } from '../../js/paginas/registro/deseos.js';
import { configuracionColoreador } from '../../js/pam/ColoreadorAlForo.js';

const MEDIODIA = Date.UTC(2026, 0, 15, 12); // a mediodía: el día es el mismo en UTC y aquí (F15 no cambia nada)
function horaFija(w) {
  const D = w.Date;
  w.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(MEDIODIA); } static now() { return MEDIODIA; } };
}

/** Un registro con un poco de todo (inventado). */
const REGISTRO = {
  v: 1, ejemplo: false, owner: 'Claudi', skin: 'pastel', trato: 'persona',
  personajes: [
    { id: 'r1', nombre: 'Mortimer Gaunt', emoji: '🐍', tono: 'sage',
      roles: [
        { id: 'a1', nombre: 'Entre jardines', con: 'Hana Park', color: '#3B6E8C', con2: 'Robert', color2: '#C0587E', dos: true, tipo: 'Libre', fecha: 'Marzo 2033', estado: 'Contestado', limite: '2026-01-16', enlace: 'https://hp-avada-kedavra.foroactivo.com/t1-entre-jardines' },
        { id: 'a2', nombre: 'Trama grupal', con: 'Grupal', color: '', tipo: 'Grupal', fecha: '', estado: 'Sin Contestar', limite: '2026-01-10' },
        { id: 'a3', nombre: 'Oficial', con: 'Otro', color: '#9B4A5F', tipo: 'Oficial', fecha: 'Octubre 2033', estado: 'Terminado', limite: '' }],
      ganancias: [{ id: 'g1', concepto: '💰 Sueldo mensual', monto: 0, fijo: 'f1', estado: 'Cobrado' }, { id: 'g2', concepto: '⭐ Puntos', monto: 90, fijo: '', estado: 'Sin Cobrar' }],
      boveda: { ini: 35, tot: 27314, act: 35, plt: 3, pla: 1, l1: 'https://hp-avada-kedavra.foroactivo.com/t35871-boveda-990#677949', l2: '', l3: '', delta: '+125', enl: '',
        log: [{ id: 'l1', at: '2026-01-02T10:00:00.000Z', ini0: 0, act0: 0, tot0: 0, ini: 0, d: 35, act: 35, tot: 35, enl: '', pet: '', ace: '' }] },
      wishCfg: { esp: 1 }, wish: [{ id: 'w1', cat: 'talento', n: 'Aparecerse', g: 200, pl: 0, req: 'Poder 2 y 17 años', prio: 'alta', hecho: false }, { id: 'w2', cat: 'hechizo', n: 'Hechizo intermedio: Expelliarmus', g: 300, pl: 0, req: '', prio: 'baja', hecho: true }] },
    { id: 'r2', nombre: 'Elena Whitlock', emoji: '🌷', tono: 'lilac', roles: [], ganancias: [{ id: 'g3', concepto: '📚 Clases', monto: 40, fijo: '', estado: 'Cobrado' }] }],
  fijos: [{ id: 'f1', nombre: '💰 Sueldo mensual', monto: 125 }],
  turnos: { tarifas: { rapido: 25, normal: 20, lento: 15, falta: 20 }, misiones: [{ id: 'm1', nombre: 'La Batalla de Blackpool', faltasMaster: 1, n: 8, t: ['Rápido', 'Normal', 'Lento', 'Falta Injustificada'] }] },
  oficiales: [
    { id: 'o1', nombre: 'Suceso en San Mungo', relacion: 'San Mungo', fecha: '2029-06-14', estado: 'Disponible', enlace: 'https://hp-avada-kedavra.foroactivo.com/t5-suceso#9', fav: true },
    { id: 'o2', nombre: 'Otro suceso', relacion: '', fecha: '', estado: 'Ocupado' }]
};
const conDatos = { antes: w => { horaFija(w); w.localStorage.setItem('registro-roles-v1', JSON.stringify(REGISTRO)); w.localStorage.setItem('cd_tag', JSON.stringify('[color=#A3000D] [/color]')); } };

const raiz = w => w.document.getElementById('rr-host').shadowRoot;
const $ = (w, sel) => raiz(w).querySelector(sel);
/** Lo que se ve (sin los <style>, que se comparan aparte) y lo escrito en los campos (que no sale en el HTML). */
// 8c: el formulario de «Canjes futuros» (lista de deseos) usa los datos oficiales y cambia a propósito: de esa pestaña
// se compara lo demás (los deseos apuntados, los totales), y el formulario tiene su prueba abajo.
// 2.1.0: el Coloreador ya no pinta la puntuación que sigue al cierre de un inciso («—repitió—. Eran…»); para comparar
// con el antiguo se saca esa puntuación del color en los dos (las mejoras tienen su prueba en tests/unit/dialogos.test.mjs).
const sinPuntoDelInciso = t => t.replace(/\[color=([^\]]+)\]([.,;:]+\s*)/g, '$2[color=$1]').replace(/(<span style="color:[^"]+">)([.,;:]+\s*)/g, '$2$1');
const vista = w => {
  const sinForm = e => { const c = e.cloneNode(true); c.querySelectorAll('.w-add').forEach(f => f.remove()); return c.outerHTML; };
  return sinPuntoDelInciso([...raiz(w).children].filter(e => e.tagName !== 'STYLE').map(sinForm).join('')
    + '\n' + [...raiz(w).querySelectorAll('input,textarea,select')].filter(e => !e.closest('.w-add')).map(e => (e.type === 'checkbox' ? e.checked : e.value)).join('|'));
};
const estilos = w => [...raiz(w).querySelectorAll('style')].map(s => s.textContent).join('');
const TABS = ['inicio', 'personajes', 'turnos', 'oficiales', 'ganancias', 'boveda', 'canjes', 'copia', 'coloreador'];
const esperar = ms => new Promise(r => setTimeout(r, ms));
const guardado = w => JSON.parse(w.localStorage.getItem('registro-roles-v1'));
async function par(o) { return [await abrir('archivos', o), await abrir('junto', o)]; }
const cerrar = (...xs) => xs.forEach(x => x.w.close());

test('8b: el Registro nuevo se ve igual que el antiguo en todas sus pestañas (datos de ejemplo)', async () => {
  const [a, b] = await par({ antes: horaFija });
  try {
    assert.equal(a.ok, true);
    assert.deepEqual(a.errores, b.errores);
    // los mismos estilos (en css/registro.css; desde la 8e, las partículas y las calabazas de css/efectos.css, juntas)
    const reglas = css => css.split('\n').map(l => l.trim()).filter(Boolean).sort();
    assert.deepEqual(reglas(estilos(a.w)), reglas(estilos(b.w)), 'los mismos estilos');
    for (const t of TABS) { a.w.rrGo(t); b.w.rrGo(t); igual(vista(a.w), vista(b.w), t); }
  } finally { cerrar(a, b); }
});

test('8b: con un registro guardado, cada pestaña igual y lo mismo en Mi Ficha', async () => {
  const [a, b] = await par(conDatos);
  try {
    const fuera = v => JSON.parse(JSON.stringify(v)); // de la ventana de prueba a objetos normales
    assert.deepEqual(fuera(a.w.pamPjs.lista()), fuera(b.w.pamPjs.lista()), 'los personajes de Mi Ficha que crea el Registro');
    for (const t of TABS) { a.w.rrGo(t); b.w.rrGo(t); igual(vista(a.w), vista(b.w), t); }
    for (const w of [a.w, b.w]) w.document.documentElement.dataset.skin = 'terror'; // otro tema: el Registro se vuelve a pintar
    await esperar(0);
    a.w.rrGo('boveda'); b.w.rrGo('boveda'); igual(vista(a.w), vista(b.w), 'bóveda con el tema Gothic Horror');
    assert.deepEqual(JSON.parse(JSON.stringify(a.w.rrOficiales.lista())), JSON.parse(JSON.stringify(b.w.rrOficiales.lista())));
    const id = a.w.pamPjs.lista()[0].id;
    assert.deepEqual(JSON.parse(JSON.stringify(a.w.rrBoveda.get(id))), JSON.parse(JSON.stringify(b.w.rrBoveda.get(id))));
  } finally { cerrar(a, b); }
});

test('8b: al usarlo (botones y campos) hace lo mismo y guarda lo mismo', async () => {
  const [a, b] = await par(conDatos);
  try {
    const pasos = [
      ['personajes', w => $(w, '[data-act="addRol"]').click()],
      ['personajes', w => { const i = $(w, 'tr[data-rid="a2"] input[data-f="nombre"]'); i.value = 'Trama grupal (cambiada)'; i.dispatchEvent(new w.Event('input', { bubbles: true })); i.dispatchEvent(new w.Event('change', { bubbles: true })); }],
      ['personajes', w => $(w, 'tr[data-rid="a1"] [data-act="del2"]').click()],
      ['turnos', w => $(w, 'tr[data-mid="m1"] [data-act="turn"][data-i="5"]').click()],
      ['turnos', w => $(w, '[data-act="addMis"]').click()],
      ['oficiales', w => $(w, '[data-act="ofF"][data-k="fav"]').click()],
      ['oficiales', w => $(w, 'tr[data-oid="o2"] [data-act="ofFav"]').click()],
      ['ganancias', w => $(w, '[data-act="resetMes"]').click()],
      ['boveda', w => $(w, '[data-act="bovApply"]').click()],
      ['boveda', w => $(w, '[data-act="bovUndo"]').click()],
      ['canjes', w => $(w, '[data-act="wDone"]')?.click()],
      ['inicio', w => $(w, '[data-act="trato"][data-k="chica"]')?.click()]
    ];
    for (const [t, hacer] of pasos) {
      a.w.rrGo(t); b.w.rrGo(t);
      hacer(a.w); hacer(b.w);
      igual(vista(a.w), vista(b.w), `${t} tras ${hacer}`);
    }
    await esperar(800); // el antiguo guarda a los 700 ms
    assert.deepEqual(guardado(a.w), guardado(b.w));
  } finally { cerrar(a, b); }
});

test('8b: el Coloreador colorea igual', async () => {
  const [a, b] = await par(conDatos);
  try {
    const texto = '—Hola —dijo Mortimer—. ¿Vamos?\nNarración con Miss Alpha y "comillas".\n-Guion de diálogo -susurró.';
    for (const w of [a.w, b.w]) {
      w.rrGo('coloreador');
      const src = $(w, '#cd-src'); src.value = texto; src.dispatchEvent(new w.Event('input'));
      const op = $(w, '#cd-optCenter'); op.checked = true; op.dispatchEvent(new w.Event('change'));
    }
    assert.ok($(a.w, '#cd-out').value.includes('[color=#A3000D]'));
    igual(vista(a.w), vista(b.w), 'coloreador');
    for (const k of ['cd_src', 'cd_tag', 'cd_opts', 'cd_names', 'cd_marks', 'cd_dlgf']) assert.equal(a.w.localStorage.getItem(k), b.w.localStorage.getItem(k), k);
  } finally { cerrar(a, b); }
});

test('F14: lo que se cambia en el Registro se guarda aunque se cierre la página enseguida', async () => {
  const [a, b] = await par(conDatos);
  try {
    for (const w of [a.w, b.w]) { w.rrGo('personajes'); $(w, '[data-act="addRol"]').click(); w.dispatchEvent(new w.Event('pagehide')); }
    assert.equal(guardado(a.w).personajes[0].roles.length, 4, 'el nuevo ya lo guardó');
    assert.equal(guardado(b.w).personajes[0].roles.length, 3, 'el antiguo todavía no (lo perdía si se cerraba la página)');
  } finally { cerrar(a, b); }
});

test('N08: el Coloreador recuerda lo de cada personaje de Mi Ficha', async () => {
  const a = await abrir('archivos', conDatos);
  try {
    const w = a.w, P = w.pamPjs, [uno, dos] = P.lista().map(x => x.id);
    const usar = (tag, nombre) => {
      const t = $(w, '#cd-tag'); t.value = tag; t.dispatchEvent(new w.Event('input'));
      const n = $(w, '#cd-names input[type="text"]'); n.value = nombre; n.dispatchEvent(new w.Event('input'));
    };
    w.rrGo('coloreador');
    P.cambiar(uno); usar('[color=#111111] [/color]', 'Hana');
    P.cambiar(dos);
    assert.equal($(w, '#cd-tag').value, '[color=#111111] [/color]', 'el segundo todavía no tiene nada suyo: queda lo de ahora');
    usar('[color=#222222] [/color]', 'Robert');
    P.cambiar(uno);
    assert.equal($(w, '#cd-tag').value, '[color=#111111] [/color]');
    assert.equal($(w, '#cd-names input[type="text"]').value, 'Hana');
    P.cambiar(dos);
    assert.equal($(w, '#cd-tag').value, '[color=#222222] [/color]');
    assert.equal($(w, '#cd-names input[type="text"]').value, 'Robert');
    assert.equal(JSON.parse(w.localStorage.getItem('cd_pj.' + uno)).tag, '[color=#111111] [/color]');
  } finally { a.w.close(); }
});

test('2.1.0: lo que PAM pasa a Mi PJ para «Colorear diálogos»: la configuración general y la de cada personaje, por su nombre', async () => {
  const a = await abrir('archivos', conDatos);
  try {
    const w = a.w, P = w.pamPjs, [uno, dos] = P.lista();
    let avisos = 0; w.document.addEventListener('pam:coloreador', () => avisos++);
    const usar = tag => { const t = $(w, '#cd-tag'); t.value = tag; t.dispatchEvent(new w.Event('input')); };
    w.rrGo('coloreador');
    P.cambiar(uno.id); usar('[color=#111111] [/color]');
    assert.ok(avisos > 0, 'avisa al cambiar algo (js/pam/main.js lo copia al almacén del agente)');
    const c = configuracionColoreador(w);
    assert.equal(c.v, 1);
    assert.equal(c.general.tag, '[color=#111111] [/color]');
    assert.deepEqual(c.pjs.map(p => [p.nombre, p.config.tag]), [[uno.nombre, '[color=#111111] [/color]']], 'solo los personajes que ya usaron el Coloreador');
    assert.ok(!c.pjs.some(p => p.nombre === dos.nombre));
  } finally { a.w.close(); }
});

test('8b: el Registro solo guarda claves que viajan con la sesión con código', async () => {
  const a = await abrir('archivos', conDatos);
  try {
    a.w.rrGo('coloreador');
    const src = $(a.w, '#cd-src'); src.value = '—Hola.'; src.dispatchEvent(new a.w.Event('input'));
    a.w.rrGo('personajes'); $(a.w, '[data-act="addRol"]').click(); a.w.dispatchEvent(new a.w.Event('pagehide'));
    const claves = Object.keys(a.w.localStorage).filter(k => k === 'registro-roles-v1' || k.startsWith('cd_'));
    assert.ok(claves.includes('registro-roles-v1') && claves.some(k => k.startsWith('cd_pj.')));
    // la lista de js/nube/pendiente.js; cd_bg (el fondo de la vista previa) se queda fuera a propósito, como antes
    for (const k of claves) if (k !== 'cd_bg') assert.ok(a.w.PAM_SESION.esDePAM(k), k);
  } finally { a.w.close(); }
});

test('8c: la lista de deseos usa los datos oficiales y no pierde nada de la antigua', async () => {
  const leer = f => JSON.parse(readFileSync(path.join(RAIZ, f), 'utf8'));
  const N = crearDatosDeseos({ sistema: leer('data/sistema.json'), calculadora: leer('data/arcanos-calculadora.json'), arcanos: leer('data/arcanos.json') });
  const V = await import('../legado/paginas/datosDeseos.js'); // la lista antigua, congelada
  // los precios son los mismos
  for (const k of ['ATR_COST', 'HAB_COST', 'ARTE_COST', 'VENT_COST', 'ROM', 'IDI_MAG', 'IDI_LV']) assert.deepEqual(N[k], V[k], k);
  assert.deepEqual(N.ARC_NV.map(x => x[1]), V.ARC_NV.map(x => x[1]));
  assert.deepEqual(N.LISTAS.quidditch, V.LISTAS.quidditch, 'el Quidditch, como estaba');
  // cada canje de la antigua sigue estando, con el mismo precio y PL (Lazo, Unión y Vínculo son un solo talento oficial)
  const JUNTOS = { 'Maestría en [animal o bestia]': 'Maestría en [Animal Muggle o Bestia Mágica]', 'Lazo': 'Lazo / Unión / Vínculo', 'Unión': 'Lazo / Unión / Vínculo', 'Vínculo': 'Lazo / Unión / Vínculo' };
  for (const cat of ['talento', 'arma', 'raza', 'legendario', 'quidditch']) {
    const nuevos = new Map(Object.values(N.LISTAS[cat]).flat().map(x => [claveDeseo(x[0]), x]));
    for (const x of Object.values(V.LISTAS[cat]).flat()) {
      const n = nuevos.get(claveDeseo(JUNTOS[x[0]] || x[0]));
      assert.ok(n, `${cat}: ${x[0]}`);
      assert.deepEqual([n[1], n[2] || 0], [x[1], x[2] || 0], `${cat}: ${x[0]} cuesta lo mismo`);
      if (x[3]) assert.ok(n[3], `${cat}: ${x[0]} sigue con requisito`);
    }
  }
  // cada arcano de la antigua (los inventados, con ✦) sigue en el mismo tipo y nivel, con su requisito si lo tenía
  for (const [tipo, niveles] of Object.entries(V.ARC)) niveles.forEach((xs, i) => {
    const nuevos = new Map(N.ARC[tipo][i].map(n => [claveDeseo(n), n]));
    for (const x of xs) {
      const n = nuevos.get(claveDeseo(x)) || [...nuevos.entries()].find(([k]) => k.startsWith(claveDeseo(x).replace(/ ✦$/, '') + ' ('))?.[1];
      assert.ok(n, `${tipo} nivel ${i}: ${x}`);
      if (V.ARC_REQ[x]) assert.ok(N.ARC_REQ[n], `${x}: sigue con requisito`);
    }
  });
  // y gana lo que le faltaba, con los nombres y el orden oficiales
  assert.ok(N.ARC.objeto[3].includes('Capa de Invisibilidad'));
  assert.ok(N.ARC.objeto[1].includes('PARA (Peonza Antiapariciones de Rápida Actuación)'));
  const leg = N.LISTAS.legendario['Características legendarias'].map(x => x[0]);
  for (const x of ['Ventaja Legendaria', 'Trasfondo General Avanzado Legendario', 'Evolución de Trasfondos']) assert.ok(leg.includes(x), x);
  assert.equal(N.ATRS[0], 'Vigor');
  assert.ok(N.ESP_R.includes('Mago Oscuro') && N.CALIF.includes('Supera las Expectativas'));
  assert.equal(N.ARC.hechizo[0].filter(n => n.endsWith(' ✦')).length + N.ARC.hechizo.slice(1).flat().filter(n => n.endsWith(' ✦')).length > 0, true);
  assert.equal(Object.values(N.ARC).flat(2).filter(n => n.endsWith(' ✦')).length, 46, 'los 46 inventados del Compendio');
});

test('8c: en «Canjes futuros» cada tipo de canje se puede elegir y calcula su precio', async () => {
  const a = await abrir('archivos', conDatos);
  try {
    const w = a.w;
    w.rrGo('canjes');
    const cats = [...$(w, '[data-wd="cat"]').options].map(o => o.value);
    assert.equal(cats.length, 18);
    for (const c of cats) {
      const s = $(w, '[data-wd="cat"]'); s.value = c; s.dispatchEvent(new w.Event('change', { bubbles: true }));
      if (c === 'otro') continue; // lo escribe la persona
      assert.match($(w, '#wPrev').textContent, /grageas/, c);
    }
    assert.deepEqual(a.errores, []);
  } finally { a.w.close(); }
});

test('F09: «Importar desde Excel» usa SheetJS 0.20.3 (de su web) y lee la planilla igual', () => {
  assert.equal(XLSX_URL, 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js');
  // una planilla de mentira con la forma que devuelve SheetJS
  const hojas = {
    '🌷 Mortimer': [['🌷 Mortimer'], ['Nombre de rol', 'Con', 'Tipo de Rol', 'Fecha', 'Estado', 'Fecha Límite', 'Enlace'], ['Entre jardines', 'Hana', 'libre', 'Marzo 2033', 'contestado', 46037, 'https://x/t1'], ['', '', '', '', '', '', '']],
    'Oficiales': [['Oficial', 'Relación', 'Fecha', 'Estado'], ['Suceso', 'San Mungo', '14/06/2029', 'Ocupado']]
  };
  const X = { utils: { sheet_to_json: h => h } };
  let n = 0; const uid = () => 'id' + (n++);
  const r = parseWorkbook({ SheetNames: Object.keys(hojas), Sheets: hojas }, X, uid);
  assert.equal(r.personajes.length, 1);
  assert.deepEqual(r.personajes[0].roles[0], { id: 'id1', nombre: 'Entre jardines', con: 'Hana', color: '', tipo: 'Libre', fecha: 'Marzo 2033', estado: 'Contestado', limite: '2026-01-15', enlace: 'https://x/t1' });
  assert.deepEqual(r.oficiales.map(o => [o.nombre, o.fecha, o.estado]), [['Suceso', '2029-06-14', 'Ocupado']]);
});
