// Prueba con la página REAL de una ficha guardada en el ordenador (no se sube: lleva datos de sesión y es de
// otro jugador). Se activa indicando dónde está:
//   PAM_FICHA_IRVIN="C:\ruta\Irvin Giles.htm" npm test
// Sin la variable, se salta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Sistema } from '../../js/datos/Sistema.js';
import { Compendio } from '../../js/datos/Compendio.js';
import { LectorFicha } from '../../js/lectores/LectorFicha.js';
import { leerPaginaTema } from '../../js/lectores/LectorTema.js';
import { partesVigentes } from '../../js/lectores/PartesFicha.js';

const RUTA = process.env.PAM_FICHA_IRVIN;
const hay = !!RUTA && existsSync(RUTA);

test('ficha real de Irvin Giles (auditoría): cinco partes, 64 trasfondos y todos los arcanos', { skip: hay ? false : 'sin PAM_FICHA_IRVIN' }, async () => {
  const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
  const L = new LectorFicha(new Sistema(json('sistema.json')), new Compendio(json('arcanos.json')));
  const t = leerPaginaTema(new JSDOM(readFileSync(RUTA, 'utf8')).window.document);
  assert.equal(t.tema, 23113);

  // F01/F05: las cinco partes de la auditoría, con el sello de revisión en medio; las actualizaciones fuera
  const { partes, historial } = partesVigentes(t.posts);
  assert.deepEqual(partes.map(p => p.id), [337672, 339214, 339215, 339216, 339217]);
  for (const id of [373284, 402093, 443196]) assert.ok(historial.some(p => p.id === id), `${id} es historial`);

  const { ficha: f } = L.leer(partes.map(p => ({ post: p.id, bbcode: p.html })), { tema: t.tema });
  assert.equal(f.nombre, 'Irvin Giles.');
  assert.equal(f.presentacion.pd, 13, 'F06');

  // F02: las 64 líneas de trasfondo del mensaje 339216, todas leídas y del mensaje correcto
  const lineas = partes[3].texto.split('\n').map(l => l.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+/, '')).filter(l => /^(Biblioteca|Influencia|Informantes|Seguidores)\b/.test(l));
  assert.equal(lineas.length, 64);
  assert.equal(f.trasfondos.length, 64);
  assert.equal(f.desconocidos.length, 0);
  assert.ok(f.trasfondos.every(x => x.origen.post === 339216));
  assert.ok(f.trasfondos.some(x => x.tipo === 'Informantes' && x.especifico === 'Contrabandistas' && x.identidad === 'Zacharias Hayes' && x.nivel === 3));

  // Arcanos: tantos como dice la propia ficha en cada encabezado «RITUALES BÁSICOS | 24»
  const magia = partes[2].texto.split('\n');
  const CODIGO = { HECHIZOS: 'hechizo', POCIONES: 'pocion', RITUALES: 'ritual', OBJETOS: 'objeto' };
  const NIV = { BASIC: 'bas', INTERMEDI: 'int', AVANZAD: 'ava' };
  let comprobados = 0;
  for (const l of magia) {
    const m = l.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/^(HECHIZOS|POCIONES|RITUALES|OBJETOS)\s+(BASIC|INTERMEDI|AVANZAD)\w*\s*\|\s*(\d+)/);
    if (!m) continue;
    const n = f.arcanos.filter(a => a.tipo === CODIGO[m[1]] && a.nivel === NIV[m[2]]).length;
    if (m[1] === 'OBJETOS' && m[2] === 'AVANZAD') assert.ok(n >= Number(m[3]), 'la ficha dice 1 pero lista 3');
    else assert.equal(n, Number(m[3]), l.trim());
    comprobados++;
  }
  assert.equal(comprobados, 12);
  assert.ok(f.arcanos.every(a => a.origen.post === 339215));
  assert.equal(f.idiomas.length, 12);
  // (El editor no se prueba aquí: esta página es el HTML que muestra el foro, en una sola línea; lo que se
  //  edita de verdad es el BBCode original, que solo puede abrir el dueño de la ficha.)
});
