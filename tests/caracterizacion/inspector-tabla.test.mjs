// F12: la Tabla del Inspector ya no se saca ejecutando un trozo de index.html, sino de data/*.json.
// Tiene que ser la misma: aquí se ejecuta el trozo de index.html como lo hacía el Inspector antiguo y se compara.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tablaDeDatos } from '../../js/inspector/Tabla.js';
import { pamEntero } from '../legado/montarPam.mjs';

const html = pamEntero(); // index.html con sus páginas y datos dentro, como lo leía el Inspector antiguo
const json = f => JSON.parse(readFileSync(new URL('../../data/' + f, import.meta.url), 'utf8'));
// extraerPAM y evaluarPAM del Inspector antiguo
const entre = (ini, fin) => { const a = html.indexOf(ini); const b = html.indexOf(fin, a); return html.slice(a, b); };
const bloque = entre('const STATS = [', '   ESTADO\n');
const arcanos = html.match(/<script id="arcanos-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const NOMBRES = ['STATS', 'SKILL_GROUPS', 'ALL_SKILLS', 'SKILL_STAT', 'SKILL_LVL', 'STAT_ACUM', 'SKILL_ACUM', 'ARTE_ACUM', 'TGEN_ACUM', 'TESP_ACUM', 'VENT_ACUM',
  'ARTES', 'ARTESANIAS', 'ESPEC_RAMAS', 'CONOCIMIENTO_CATEGORIAS', 'SOCIAL_CATEGORIAS', 'VENTAJAS', 'NOTAS', 'TIMOS_PRECIO', 'EXTASIS_PRECIO', 'IDIOMAS_MAGICOS',
  'RAZAS', 'ARMA_BASE', 'MATERIALES', 'RUNE_CHAINS', 'RUNE_LVL', 'RUNE_PRICE', 'ARC', 'ARC_TYPES', 'TIER', 'TALENTOS', 'LEGENDARIAS'];
const vieja = new Function('document', bloque.slice(0, bloque.lastIndexOf('/* ====')) + '\nreturn {' + NOMBRES.join(',') + '};')({ getElementById: id => (id === 'arcanos-data' ? { textContent: arcanos } : null) });
const nueva = tablaDeDatos(json('sistema.json'), json('arcanos-calculadora.json'), json('arcanos.json'));
const plano = v => JSON.parse(JSON.stringify(v));

test('la Tabla de data/*.json es la de index.html, nombre por nombre (también los arcanos inventados del Compendio)', () => {
  for (const k of NOMBRES) if (k !== 'SOCIAL_CATEGORIAS') assert.deepEqual(plano(nueva[k]), plano(vieja[k]), k);
  assert.ok(Object.values(nueva.ARC).some(ts => Object.values(ts).some(l => l.some(a => a.inv))), 'con los inventados');
});

test('la única diferencia: la reconciliada con el texto oficial del Sistema («Personal no-docente»)', () => {
  const v = plano(vieja.SOCIAL_CATEGORIAS), n = plano(nueva.SOCIAL_CATEGORIAS);
  v.Hogwarts = v.Hogwarts.map(s => (s === 'Personal no docente' ? 'Personal no-docente' : s));
  assert.deepEqual(n, v);
});
