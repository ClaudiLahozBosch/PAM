// «Configurar Mi PJ» (2.2.0): las reglas (qué se puede apagar), la página de PAM, la copia para el agente y lo que el
// panel deja de enseñar. Sin configuración, todo como siempre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { OPCIONES, configPorDefecto, normalizarConfig, activo } from '../../js/reglas/ConfigMiPj.js';
import { montar } from '../../js/paginas/mipj/main.js';
import { publicarConfigMiPj, CLAVE_PAM, CLAVE_AGENTE } from '../../js/pam/ConfigMiPjAlForo.js';
import { crearConfigDelForo } from '../../js/servicios/ConfigMiPjDelForo.js';
import { crearPanelMiPj } from '../../js/paginas/panel/MiPjPanel.js';

const espera = ms => new Promise(r => setTimeout(r, ms));

test('reglas: sin configuración o con basura, todo activo; «pausa» apaga solo lo del foro', () => {
  const d = configPorDefecto();
  assert.deepEqual(normalizarConfig(null), d);
  assert.deepEqual(normalizarConfig('nada'), d);
  for (const g of ['foro', 'panel', 'pastilla']) for (const o of OPCIONES[g]) assert.equal(activo(null, g, o.id), true, g + '.' + o.id);
  const c = normalizarConfig({ pausa: true, foro: { oficial: false, raro: false, boveda: 'no' }, panel: { sueldo: false }, lectura: { cada: 7, boveda: false } });
  assert.equal(c.foro.oficial, false);
  assert.equal(c.foro.boveda, true, 'lo que no es sí/no queda como siempre');
  assert.equal('raro' in c.foro, false, 'lo desconocido no entra');
  assert.equal(c.lectura.cada, 30, 'un intervalo que no está en la lista queda como siempre');
  assert.equal(c.lectura.boveda, false);
  assert.equal(activo(c, 'foro', 'colorear'), false, 'en pausa');
  assert.equal(activo(c, 'panel', 'responder'), true, 'la pausa no toca el panel');
  assert.equal(activo(c, 'panel', 'sueldo'), false);
});

function pam() {
  const { window: w } = new JSDOM('<!doctype html><body><div id="mipj-host"></div></body>', { url: 'https://jesleytherabbit-prog.github.io/PAM/index.html', pretendToBeVisual: true });
  return w;
}

test('la página: cada interruptor se guarda con el almacén (viaja con la sesión) y avisa con «pam:mipj»', async () => {
  const w = pam();
  try {
    let avisos = 0; w.document.addEventListener('pam:mipj', () => avisos++);
    await montar(w);
    const doc = w.document;
    assert.equal(doc.querySelectorAll('#mipj-host input[role="switch"]').length, 1 + OPCIONES.foro.length + OPCIONES.panel.length + OPCIONES.pastilla.length + 1);
    assert.ok([...doc.querySelectorAll('#mipj-host input[role="switch"]')].filter(i => i.id !== 'cmPausa').every(i => i.checked), 'todo activo de entrada');
    assert.match(CLAVE_PAM, /^grimorio\./, 'la clave viaja con la Sesión con código');
    const cambiar = (sel, v) => { const i = doc.querySelector(sel); i.checked = v; i.dispatchEvent(new w.Event('change', { bubbles: true })); };
    cambiar('input[data-g="foro"][data-id="oficial"]', false);
    assert.equal(JSON.parse(w.localStorage.getItem(CLAVE_PAM)).foro.oficial, false);
    assert.equal(avisos, 1);
    cambiar('#cmPausa', true);
    assert.equal(JSON.parse(w.localStorage.getItem(CLAVE_PAM)).pausa, true);
    assert.ok(doc.querySelector('[data-grupo="foro"].cm-pausado .cm-nota-pausa'), 'el grupo del foro se ve en pausa');
    assert.equal(doc.querySelector('input[data-g="foro"][data-id="oficial"]').checked, false, 'y se acuerda de lo elegido');
    doc.querySelector('[data-todo="pastilla"][data-v="0"]').click();
    assert.equal(doc.querySelector('.cm-pill').textContent.trim(), '✦Mi PJ', 'la vista previa de la pastilla, sin marcas');
    const sel = doc.getElementById('cmCada'); sel.value = '0'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(JSON.parse(w.localStorage.getItem(CLAVE_PAM)).lectura.cada, 0);
    doc.getElementById('cmRestablecer').click();
    assert.deepEqual(JSON.parse(w.localStorage.getItem(CLAVE_PAM)), configPorDefecto());
    assert.ok(doc.querySelector('.cm-siempre'), 'y dice qué no se puede apagar');
  } finally { w.close(); }
});

test('la página dice si Mi PJ está instalado y le pasa la copia al agente al abrir y al cambiar', async () => {
  const w = pam();
  try {
    w.localStorage.setItem(CLAVE_PAM, JSON.stringify({ panel: { canjes: false } }));
    await montar(w);
    assert.match(w.document.getElementById('cmEstado').textContent, /Buscando Mi PJ/);
    const guardados = [];
    publicarConfigMiPj({ guardarDato: async (k, v) => { guardados.push([k, v]); } }, w, { agente: '2.2.0' });
    await espera(0);
    assert.equal(guardados.length, 1);
    assert.equal(guardados[0][0], CLAVE_AGENTE);
    assert.equal(guardados[0][1].panel.canjes, false);
    assert.match(w.document.getElementById('cmEstado').textContent, /Mi PJ conectado · 2\.2\.0/);
    const i = w.document.querySelector('input[data-g="pastilla"][data-id="grageas"]'); i.checked = false; i.dispatchEvent(new w.Event('change', { bubbles: true }));
    await espera(0);
    assert.equal(guardados.length, 2);
    assert.equal(guardados[1][1].pastilla.grageas, false);
  } finally { w.close(); }
});

test('en el foro: se lee del almacén del agente, sin volver a pedirla a cada rato; si falla, se queda la que había', async () => {
  let t = 0, valor = null, pedidas = 0, falla = false;
  const C = crearConfigDelForo({ leerDato: async k => { pedidas++; assert.equal(k, 'pam.mipj'); if (falla) throw new Error('x'); return valor; } }, { ahora: () => t });
  assert.equal(C.actual().pausa, false);
  valor = { pausa: true };
  assert.equal(await C.refrescar(), true);
  assert.equal(C.actual().pausa, true);
  t = 1000; assert.equal(await C.refrescar(), false); assert.equal(pedidas, 1, 'dentro de los 5 s no se vuelve a leer');
  t = 6000; falla = true; assert.equal(await C.refrescar(), false); assert.equal(C.actual().pausa, true);
});

const DATOS = {
  v: 2, pj: 'Irvin Giles', leido: new Date().toISOString(),
  boveda: { act: 1240, tot: 5000, ini: 100, url: 'https://f/t1', titulo: 'Bóveda', movs: [] },
  ficha: { estado: 'pendiente', url: 'https://f/t2', titulo: 'Ficha', codigo: 'x' },
  roles: [{ tid: 3, lpid: 9, titulo: 'Rol en la taberna', fecha: new Date().toISOString(), url: 'https://f/t3', autor: 'Bruno' }]
};
function panel(config, ancho) {
  const { window: w } = new JSDOM('<!doctype html><head></head><body><div id="mipj"></div></body>', { pretendToBeVisual: true });
  const mem = new Map([['mipj.5203', JSON.stringify(DATOS)]]);
  const guardado = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const p = crearPanelMiPj({ root: w.document.getElementById('mipj'), documento: w.document, guardado, cargar: async () => DATOS, ventana: { ancho, alto: 900 }, pamUrl: 'https://x/', cuenta: { id: 5203, nombre: 'Irvin Giles' }, config: () => config });
  p.pintar();
  const html = w.document.getElementById('mipj').innerHTML;
  w.close();
  return html;
}

test('el panel: sin configuración y con la de siempre se ve exactamente igual', () => {
  assert.equal(panel(configPorDefecto(), 1400), panel(null, 1400));
  assert.equal(panel(configPorDefecto(), 400), panel(null, 400));
});

test('el panel: las tarjetas y las marcas de la pastilla apagadas no se ven', () => {
  const abierto = panel(null, 1400);
  for (const t of ['✒ Te toca responder', '❖ Ficha', '⛁ Bóveda', '📜 Biblioteca de oficiales', '⚖ Canjes']) assert.ok(abierto.includes(t), t);
  const c = configPorDefecto();
  Object.assign(c.panel, { responder: false, ficha: false, biblioteca: false, canjes: false });
  const menos = panel(c, 1400);
  for (const t of ['✒ Te toca responder', '❖ Ficha', '📜 Biblioteca de oficiales', '⚖ Canjes']) assert.ok(!menos.includes(t), t);
  assert.ok(menos.includes('⛁ Bóveda'), 'lo demás sigue');
  const pastilla = panel(null, 400);
  assert.match(pastilla, /<b>1\.240<\/b>|<b>1240<\/b>/);
  assert.match(pastilla, /class="n"/);
  assert.match(pastilla, /class="dot"/);
  Object.assign(c.pastilla, { grageas: false, roles: false, ficha: false });
  const sola = panel(c, 400);
  assert.doesNotMatch(sola, /<b>|class="n"|class="dot"/);
  assert.match(sola, /Mi PJ/, 'la pastilla siempre está');
});
