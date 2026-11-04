// @ts-check
// Mi Ficha y Revisor de Empleos: los datos del sistema (rangos, habilidades, trasfondos, ventajas, sueldos, etapas…).
// Desde la 8c (R07) salen de data/sistema.json, los mismos que usan la Tabla de Canjes, el panel de Mi PJ y el
// Inspector: iniciarDatos() los rellena al arrancar (js/paginas/revisor/main.js), antes de montar las pantallas.
// Son los mismos valores que tenía Mi Ficha, con los nombres de la ficha (Esquiva, Vuelo, Seducción), más
// «Gobierno mágico de (X país)» en Política, que le faltaba (texto oficial).

/** @type {string[]} */ export let RANKS = [];
/** @type {string[]} */ export let RANK_SHORT = [];
/** Niveles de habilidad con su bonificador: «Novato (+1)»… @type {string[]} */ export let SKILL_LV = [];
/** @type {string[]} */ export let SKILL_NAME = [];
/** @type {string[]} */ export let ATTRS = [];
/** Habilidades por atributo, con el nombre de la ficha. @type {Record<string, string[]>} */ export let SKILLS = {};
/** @type {string[]} */ export let ALL_SKILLS = [];
/** @type {string[]} */ export let BG_TYPES = [];
/** @type {string[]} */ export let ADVS = [];
/** @type {Record<string, string[]>} */ export let CAT_CONOC = {};
/** @type {Record<string, string[]>} */ export let CAT_SOC = {};
/** @type {Record<string, number[]>} */ export let SUELDOS = {};
/** Puntos de atributo, umbral, heridas y límites de cada etapa. @type {Record<string, {pa:number,u:number,h:number,lim:string}>} */
export let ETAPAS = {};
/** @type {string[]} */ export let ESP_RAMAS = [];
/** @type {string[]} */ export let IDIOMA_NIV = [];
/** @type {string[]} */ export let VINC = [];
/** Nombre de la habilidad en la Tabla de Canjes → en la ficha (Esquivar → Esquiva…). @type {Record<string, string>} */
export let SK_MAP = {};

export const ART = 'Arte/Artesanía';
/** @param {string} t */
export const cats = t => (t === 'Biblioteca' ? CAT_CONOC : CAT_SOC);

const copia = x => JSON.parse(JSON.stringify(x));

/** @param {any} S el contenido de data/sistema.json */
export function iniciarDatos(S) {
  RANKS = [...S.empleos.rangos];
  RANK_SHORT = [...S.empleos.rangosCortos];
  SKILL_NAME = S.nivelesHabilidad.map(n => n.nombre);
  SKILL_LV = S.nivelesHabilidad.map(n => `${n.nombre} (+${n.bonus})`);
  ATTRS = [...S.atributos];
  SKILLS = Object.fromEntries(ATTRS.map(a => [a, S.habilidades.filter(h => h.atributo === a).map(h => h.enFicha || h.nombre)]));
  ALL_SKILLS = Object.values(SKILLS).flat();
  BG_TYPES = [...S.trasfondos.tipos];
  ADVS = S.ventajas.map(v => v.nombre);
  CAT_CONOC = copia(S.trasfondos.categoriasConocimiento);
  CAT_SOC = copia(S.trasfondos.categoriasSociales);
  SUELDOS = copia(S.empleos.sueldos);
  ETAPAS = Object.fromEntries(Object.entries(S.etapas).map(([k, e]) => [k, { pa: e.pa, u: e.umbral, h: e.heridas, lim: e.limites }]));
  ESP_RAMAS = S.especializaciones.map(e => e.nombre ?? e);
  IDIOMA_NIV = [...S.idiomas.nivelesFicha];
  VINC = S.vinculos.map(v => v.nombre ?? v);
  SK_MAP = Object.fromEntries(S.habilidades.filter(h => h.enFicha).map(h => [h.nombre, h.enFicha]));
}
