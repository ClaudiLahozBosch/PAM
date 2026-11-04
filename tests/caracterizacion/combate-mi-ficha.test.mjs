// 0.7.0: Mi Ficha calcula el combate y los puntos de pociones/rituales con js/reglas/Combate.js (la misma copia que
// usan el editor y Mi PJ) en lugar de su copia propia. Se abre PAM nuevo («archivos») y antiguo («junto», con la copia
// congelada de tests/legado/paginas/revisor.js) con las mismas 60 fichas inventadas al azar (semilla fija): todas las
// razas que cambian algo, las seis etapas y ninguna, los objetos y arcanos que modifican stats (escritos de varias
// maneras), Arte/Artesanía, y en el Controlador las opciones de escena (poción de fuerza, de actividad, licantropía,
// Armadura de Warlock, Herbivicus). Tiene que salir lo mismo: números, textos de cómo se calcula y el código del foro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { abrir, igual, RAIZ } from '../legado/abrirPam.mjs';

const SISTEMA = JSON.parse(readFileSync(path.join(RAIZ, 'data/sistema.json'), 'utf8'));
const ATRIBUTOS = SISTEMA.atributos;
const HABILIDADES = SISTEMA.habilidades.map(h => h.enFicha || h.nombre).filter(n => n !== 'Arte/Artesanía');
const ETAPAS = [...Object.keys(SISTEMA.etapas), '', 'Desconocida'];
const RAZAS = ['Humana', 'Semigigante', 'Semiduende', 'Semi-duende', 'semigigante (por parte de madre)', 'Licántropo', ''];
const OBJETOS = ['Anillo de los Carstein', 'Armadura de Warlock', 'Maletín del pocionista inquieto', 'Bisutería Arcana', 'Herbivicus',
  'Poción herbicida', 'Planta Vitae', 'Solución del ritualista', 'Altar del ritualista',
  'anillo de los carstein', 'ARMADURA DE WARLOCK', 'Maletin del pocionista inquieto', 'Pocion herbicida', 'Desmaius', 'Protego'];
const ARTES = ['Forja', 'Pintura', 'Carpintería', 'Canto'];

/** Números al azar con semilla fija (mulberry32): siempre las mismas fichas. */
function azar(semilla) {
  let a = semilla >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { n: (min, max) => min + Math.floor(r() * (max - min + 1)), de: xs => xs[Math.floor(r() * xs.length)], si: (p = 0.5) => r() < p };
}

function fichas(cuantas) {
  const z = azar(20261105), lista = [];
  for (let i = 0; i < cuantas; i++) {
    const attrs = Object.fromEntries(ATRIBUTOS.map(a => [a, z.n(0, 7)]));
    const skills = Object.fromEntries(HABILIDADES.map(s => [s, z.si(0.6) ? z.n(0, 5) : 0]));
    const arcanos = OBJETOS.filter(() => z.si(0.25)).map(name => ({ type: 'objeto', tier: 'bas', name, nota: '' }));
    const artes = ARTES.filter(() => z.si(0.3)).map(n => ({ n, v: z.n(0, 5) }));
    lista.push({ id: 'pj' + i, ficha: { nombre: 'Prueba ' + i, attrs, skills, artes, arcanos,
      d: { raza: z.de(RAZAS), etapa: z.de(ETAPAS) }, extra: { pd: z.n(0, 4) } } });
  }
  return { activa: 'pj0', lista };
}

const DATOS = JSON.stringify(fichas(60));
const antes = w => { w.localStorage.setItem('grimorio.personajes', DATOS); w.confirm = () => true; w.prompt = () => null; w.alert = () => {}; };
const raiz = w => w.document.getElementById('re-app');
const $ = (w, s) => raiz(w).querySelector(s);
const fuera = v => JSON.parse(JSON.stringify(v));
const cambiar = (w, sel, prop, valor) => { const e = $(w, sel); if (!e) return; e[prop] = valor; e.dispatchEvent(new w.Event('change')); };

test('0.7.0: el combate de Mi Ficha con js/reglas/Combate.js da lo mismo que su copia antigua (60 fichas al azar)', async () => {
  const a = await abrir('archivos', { antes }), b = await abrir('junto', { antes });
  try {
    assert.equal(a.ok, true);
    assert.deepEqual(a.errores, b.errores);
    assert.equal(a.w.pamPjs.lista().length, 60);
    assert.deepEqual(fuera(a.w.pamRapido()), fuera(b.w.pamRapido()), 'pamRapido (lo que ve Mi PJ): números de las 60 fichas');
    const escenas = [
      { fz: '0', act: false, lic: false, warlock: false, herbi: true },
      { fz: '2', act: true, lic: false, warlock: true, herbi: false },
      { fz: '1', act: false, lic: true, warlock: true, herbi: true },
      { fz: '3', act: true, lic: true, warlock: false, herbi: false }
    ];
    let comparadas = 0;
    for (const { id } of a.w.pamPjs.lista()) {
      for (const w of [a.w, b.w]) { w.pamPjs.cambiar(id); $(w, 'nav.re-tabs button[data-tab="control"]').click(); }
      for (const e of escenas) {
        for (const w of [a.w, b.w]) {
          cambiar(w, '#ct-fz', 'value', e.fz); cambiar(w, '#ct-act', 'checked', e.act); cambiar(w, '#ct-lic', 'checked', e.lic);
          cambiar(w, '#ct-warlock', 'checked', e.warlock); cambiar(w, '#ct-herbi', 'checked', e.herbi);
        }
        igual($(a.w, '#ctrl-body').innerHTML, $(b.w, '#ctrl-body').innerHTML, `Controlador · ${id} · ${JSON.stringify(e)}`);
        comparadas++;
      }
      // el código del foro (lleva el bloque de combate y los puntos)
      for (const w of [a.w, b.w]) { $(w, 'nav.re-tabs button[data-tab="ficha"]').click(); $(w, '#fx-tabs button[data-ft="codigo"]').click(); }
      const codigo = w => [...raiz(w).querySelectorAll('[data-fc-out]')].map(t => t.value).join('\n----\n');
      assert.ok(codigo(a.w).includes('Iniciativa'), 'hay código con el combate');
      igual(codigo(a.w), codigo(b.w), `código del foro · ${id}`);
    }
    assert.equal(comparadas, 240);
  } finally { a.w.close(); b.w.close(); }
});
