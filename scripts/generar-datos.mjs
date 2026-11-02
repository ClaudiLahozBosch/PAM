// Genera data/*.json a partir del PAM antiguo (index.html), para que los datos nuevos salgan
// exactamente de los mismos valores y no copiados a mano. Se ejecuta una vez por cambio de datos:
//   cd tests && node ../scripts/generar-datos.mjs
// Las diferencias entre las dos copias antiguas se resuelven con el texto oficial del Sistema Avadense
// (docs 03_las-habilidades y 04_los-trasfondos) y quedan anotadas en RECONCILIADO.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cargarPam, cerrarPam } from '../tests/legado/cargarPam.mjs';
import { CLAVES } from './claves-datos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = cargarPam();
const G = P.global, F = P.ficha;

const renombrar = v => Array.isArray(v) ? v.map(renombrar)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [CLAVES[k] || k, renombrar(x)])) : v;

const RECONCILIADO = [
  'Habilidades: nombre oficial del Sistema (Esquivar, Volar, Seducir); «enFicha» es el que usa el modelo de ficha (Esquiva, Vuelo, Seducción).',
  'Hogwarts: «Personal no-docente» (texto oficial); «Personal no docente» queda como alias.',
  'Política: incluye «Gobierno mágico de (X país)» (texto oficial: «Gobierno mágico de [X país]»); faltaba en Mi Ficha.',
  'Tipos de trasfondo en orden alfabético (la Tabla de Canjes los listaba Biblioteca, Informantes, Influencia, Seguidores).'
];

// ---------- habilidades ----------
const EN_FICHA = { Esquivar: 'Esquiva', Volar: 'Vuelo', Seducir: 'Seducción' };
const habilidades = [];
for (const [atributo, lista] of Object.entries(G('SKILL_GROUPS'))) {
  if (atributo === 'Voluntad') habilidades.push({ nombre: 'Arte/Artesanía', atributo, multiple: true, enProezas: 'Arte / Artesanía' });
  for (const nombre of lista) habilidades.push(EN_FICHA[nombre] ? { nombre, atributo, enFicha: EN_FICHA[nombre] } : { nombre, atributo });
}

const bonus = G('SKILL_BONUS');
const nivelesHabilidad = F('SKILL_NAME').map((nombre, i) => ({ nombre, bonus: bonus[i], ...(G('SKILL_LVL')[i] !== nombre ? { enCanjes: G('SKILL_LVL')[i] } : {}) }));

// ---------- trasfondos ----------
const social = G('SOCIAL_CATEGORIAS');
social.Hogwarts = social.Hogwarts.map(s => (s === 'Personal no docente' ? 'Personal no-docente' : s));

const vent = G('VENT_LABELS');
const etapas = Object.fromEntries(Object.entries(F('ETAPAS')).map(([k, e]) => [k, { pa: e.pa, umbral: e.u, heridas: e.h, limites: e.lim }]));

const sistema = {
  version: 1,
  origen: 'PAM main b1dedad (2/11/2026), reconciliado con el Sistema Avadense',
  reconciliado: RECONCILIADO,
  atributos: G('STATS'),
  habilidades,
  nivelesHabilidad,
  artes: G('ARTES'),
  artesanias: G('ARTESANIAS'),
  costes: {
    nota: 'Coste acumulado desde 0 hasta el nivel N (posición N de la lista).',
    atributo: G('STAT_ACUM'), habilidad: G('SKILL_ACUM'), arte: G('ARTE_ACUM'),
    trasfondoGeneral: G('TGEN_ACUM'), trasfondoEspecifico: G('TESP_ACUM'), ventaja: G('VENT_ACUM')
  },
  especializaciones: G('ESPEC_RAMAS'),
  trasfondos: {
    tipos: [...G('TIPOS_TRASF')].sort((a, b) => a.localeCompare(b, 'es')),
    categoriasConocimiento: G('CONOCIMIENTO_CATEGORIAS'),
    categoriasSociales: social,
    alias: { 'Personal no docente': 'Personal no-docente' }
  },
  ventajas: G('VENTAJAS').map(nombre => ({ nombre, niveles: vent[nombre].slice(1) })),
  academico: { asignaturasExtasis: G('EXTASIS_ASIG'), notas: G('NOTAS'), preciosTimos: G('TIMOS_PRECIO'), preciosExtasis: G('EXTASIS_PRECIO') },
  idiomas: { magicos: G('IDIOMAS_MAGICOS'), nivelesCanje: G('IDIOMA_NIVEL'), nivelesFicha: F('IDIOMA_NIV') },
  razas: renombrar(G('RAZAS')),
  armas: { precioBase: G('ARMA_BASE'), materiales: renombrar(G('MATERIALES')), runas: renombrar(G('RUNE_CHAINS')), nivelesRuna: G('RUNE_LVL'), preciosRuna: G('RUNE_PRICE') },
  talentos: renombrar(G('TALENTOS')),
  veterania: renombrar(G('VETERANIA')),
  legendarias: renombrar(G('LEGENDARIAS')),
  arcanos: { tipos: G('ARC_TYPES'), niveles: G('TIER') },
  etapas,
  vinculos: F('VINC'),
  empleos: { rangos: F('RANKS'), rangosCortos: F('RANK_SHORT'), sueldos: F('SUELDOS') },
  enlaces: { puntosDestino: G('LINK_PD'), registroVeterania: G('LINK_REGISTRO') }
};

// ---------- arcanos ----------
const html = readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const entre = (a, b) => { const i = html.indexOf(a); if (i < 0) throw new Error('No encuentro ' + a); const j = html.indexOf(b, i + a.length); return html.slice(i + a.length, j); };
const compendio = JSON.parse(entre('<script id="arcanos-data" type="application/json">', '</script>'));
// Listas oficiales de la Tabla de Canjes (con requisitos), antes de añadir los inventados.
const listas = G(`Object.fromEntries(Object.entries(ARC_RAW).map(([t,ts])=>[t,Object.fromEntries(Object.entries(ts).map(([k,s])=>[k,parseArc(s)]))]))`);
const calculadora = Object.fromEntries(Object.entries(listas).map(([t, ts]) => [t, Object.fromEntries(Object.entries(ts).map(([k, l]) => [k, l.map(a => ({ nombre: a.name, requisitos: a.reqs }))]))]));
const empleosForo = entre('<script type="text/plain" id="empleos-foro">', '</script>');

mkdirSync(path.join(RAIZ, 'data'), { recursive: true });
const escribir = (f, v) => { writeFileSync(path.join(RAIZ, 'data', f), typeof v === 'string' ? v : JSON.stringify(v, null, 1) + '\n'); console.log('data/' + f); };
escribir('sistema.json', sistema);
escribir('arcanos.json', compendio);
escribir('arcanos-calculadora.json', calculadora);
escribir('empleos-foro.txt', empleosForo);
cerrarPam();
