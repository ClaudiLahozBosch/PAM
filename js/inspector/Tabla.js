// @ts-check
// La «Tabla de Canjes» que usa el Inspector de Canjes, con los mismos nombres y la misma forma que tenía cuando la
// sacaba de index.html ejecutando un trozo de su código (auditoría F12). Ahora sale de los datos de PAM:
// data/sistema.json, data/arcanos-calculadora.json (las listas de la calculadora) y data/arcanos.json (el Compendio:
// los arcanos inventados se añaden igual que hacía PAM). Diferencias con la de antes: las del Sistema reconciliado
// («Personal no-docente», «Gobierno mágico de (X país)»; ver sistema.json → reconciliado).

const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s ]+/g, ' ').trim();

/* Arcanos inventados del Compendio (index.html, «Compendio: descripciones + arcanos inventados»), tal cual. */
const TYPE_OF = { Hechizos: 'hechizo', Pociones: 'pocion', Rituales: 'ritual', Objetos: 'objeto' };
const TIER_OF = { 'Doméstico': 'dom', 'Básico': 'bas', 'Básica': 'bas', 'Intermedio': 'int', 'Intermedia': 'int', 'Avanzado': 'ava', 'Avanzada': 'ava', 'Legendario': 'leg' };
const INV_ALIAS = { 'Enervate': 'Ennervate', 'Aurium': 'Aurorium', 'Ritual de Clarividencia': 'Ritual clarividencia (Procul Visio)',
  'Modificación Mental Mayor': 'Ritual de modificación mental mayor (Mutatio Mentis Mayoris)', 'Confundo': 'Confundo' };
function parseInvReqs(txt) {
  if (!txt) return [];
  const s = txt.replace(/^\s*(Requiere|Require)\s+/i, '').replace(/\.$/, '');
  return s.split(/,\s*|\s+y\s+/).map(r => r.trim()).filter(Boolean).map(r => {
    r = r.replace(/^(la |el )?[Ee]specializaci[oó]n\s+/, '').replace(/^Medimagia/, 'Medimago');
    return INV_ALIAS[r] || r;
  });
}

/* Los nombres de data/*.json → los cortos de antes (lo contrario de scripts/claves-datos.mjs). «precio» era «p»,
   salvo en las legendarias («price», que además conservan «nombre»). */
const ANTES = { grupo: 'g', nombre: 'n', precio: 'p', ejemplo: 'ph', multiple: 'multi', requisito: 'req', descripcionHtml: 'desc', campo: 'field',
  tipo: 'type', etiqueta: 'label', limite: 'limit', maximoPorAno: 'maxPerYear', limitePorPD: 'pdLimit', clave: 'key', huecos: 'slots', maximo: 'max', arcanos: 'arc' };
const deshacer = (v, extra = {}) => Array.isArray(v) ? v.map(x => deshacer(x, extra))
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k in extra ? extra[k] : (ANTES[k] || k), deshacer(x)])) : v;

/**
 * La tabla con la forma de antes (STATS, SKILL_GROUPS, …, ARC, TIER, TALENTOS, LEGENDARIAS…).
 * @param {any} S data/sistema.json @param {any} calculadora data/arcanos-calculadora.json @param {any[]} compendio data/arcanos.json
 */
export function tablaDeDatos(S, calculadora, compendio) {
  const SKILL_GROUPS = {};
  for (const h of S.habilidades) { if (h.multiple) continue; (SKILL_GROUPS[h.atributo] = SKILL_GROUPS[h.atributo] || []).push(h.nombre); }
  const ALL_SKILLS = Object.values(SKILL_GROUPS).flat();
  const SKILL_STAT = {}; Object.entries(SKILL_GROUPS).forEach(([s, l]) => l.forEach(k => { SKILL_STAT[k] = s; }));
  const ARC = {};
  for (const [tipo, tiers] of Object.entries(calculadora)) {
    ARC[tipo] = {};
    for (const [t, lista] of Object.entries(tiers)) ARC[tipo][t] = lista.map(a => ({ name: a.nombre, reqs: a.requisitos || [] }));
  }
  for (const a of compendio) {
    const type = TYPE_OF[a.fuente], tier = TIER_OF[a.nivel] || 'bas';
    const calcName = a.origen === 'Oficial' ? (a.calc || a.nombre) : (a.nombre.includes('|') ? a.nombre.replace(/\s*\|\s*(.+)$/, ' ($1)') : a.nombre);
    if (a.origen !== 'Oficial' && tier !== 'leg' && ARC[type] && ARC[type][tier]) {
      ARC[type][tier].push({ name: calcName, reqs: parseInvReqs(a.requisito), inv: true, autor: a.autor ? a.autor.nombre : 'su autor', id: a.id });
    }
  }
  return {
    STATS: S.atributos.slice(), SKILL_GROUPS, ALL_SKILLS, SKILL_STAT,
    SKILL_LVL: S.nivelesHabilidad.map(n => n.enCanjes || n.nombre),
    STAT_ACUM: S.costes.atributo, SKILL_ACUM: S.costes.habilidad, ARTE_ACUM: S.costes.arte,
    TGEN_ACUM: S.costes.trasfondoGeneral, TESP_ACUM: S.costes.trasfondoEspecifico, VENT_ACUM: S.costes.ventaja,
    ARTES: S.artes, ARTESANIAS: S.artesanias, ESPEC_RAMAS: S.especializaciones,
    CONOCIMIENTO_CATEGORIAS: S.trasfondos.categoriasConocimiento, SOCIAL_CATEGORIAS: S.trasfondos.categoriasSociales,
    VENTAJAS: S.ventajas.map(v => v.nombre),
    NOTAS: S.academico.notas, TIMOS_PRECIO: S.academico.preciosTimos, EXTASIS_PRECIO: S.academico.preciosExtasis,
    IDIOMAS_MAGICOS: S.idiomas.magicos,
    RAZAS: deshacer(S.razas),
    ARMA_BASE: S.armas.precioBase,
    MATERIALES: deshacer(S.armas.materiales), RUNE_CHAINS: deshacer(S.armas.runas),
    RUNE_LVL: S.armas.nivelesRuna, RUNE_PRICE: S.armas.preciosRuna,
    ARC, ARC_TYPES: S.arcanos.tipos, TIER: S.arcanos.niveles,
    TALENTOS: deshacer(S.talentos),
    LEGENDARIAS: deshacer(S.legendarias, { nombre: 'nombre', precio: 'price' })
  };
}

/** Índices para reconocer nombres (prepararTabla del Inspector, tal cual). */
export function prepararTabla(T) {
  const alias = { esquiva: 'Esquivar', esquivar: 'Esquivar', vuelo: 'Volar', volar: 'Volar', seduccion: 'Seducir', seducir: 'Seducir' };
  T.habilidades = T.ALL_SKILLS.map(s => ({ n: s, k: norm(s) }));
  Object.keys(alias).forEach(k => { T.habilidades.push({ n: alias[k], k }); });
  T.habilidades.sort((a, b) => b.k.length - a.k.length);
  T.arcanos = [];
  Object.keys(T.ARC).forEach(tipo => {
    Object.keys(T.ARC[tipo]).forEach(tier => {
      T.ARC[tipo][tier].forEach(a => {
        const limpio = a.name.replace(/\s*✦\s*$/, '');
        const claves = [norm(limpio)], par = limpio.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (par) claves.push(norm(par[1]), norm(par[2]));
        T.arcanos.push({ n: limpio, k: norm(limpio), claves: claves.filter(c => c.length > 2), tipo, tier, reqs: a.reqs || [], inv: !!a.inv });
      });
    });
  });
  T.arcanos.sort((a, b) => b.k.length - a.k.length);
  T.talentos = T.TALENTOS.map(t => {
    const base = t.n.split(' [')[0].split(' / ')[0];
    return { t, k: norm(base), variantes: t.n.indexOf(' / ') > 0 ? t.n.split(' / ').map(norm) : [norm(base)] };
  });
  T.talentos.sort((a, b) => b.k.length - a.k.length);
  return T;
}
