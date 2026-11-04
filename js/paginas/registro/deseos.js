// @ts-check
// Lista de deseos del Registro de Roles («Canjes futuros»). Fase 8c (decisión del 4/11/2026): sus datos salen de los
// oficiales, los mismos que usa la Tabla de Canjes:
//   · data/sistema.json: atributos, habilidades, precios, trasfondos, ventajas, especializaciones, talentos, armas,
//     razas, legendarias, idiomas y títulos (nombres y orden de la ficha);
//   · data/arcanos-calculadora.json: los arcanos oficiales de cada nivel;
//   · data/arcanos.json (el Compendio): los inventados por los jugadores (con «✦», como antes) y los requisitos.
// Lo que la lista antigua tenía y los oficiales no (el Quidditch, «Evolución de Trasfondos», algunos requisitos)
// sigue saliendo: está en deseosExtra.js. Devuelve las mismas listas que usaba el código de la lista.
import { ROM, QUIDDITCH, LEGENDARIAS, ARMA, REQUISITOS, REQUISITOS_ARCANOS } from './deseosExtra.js?v=0.6.9';

/** Para comparar nombres: sin tildes ni mayúsculas y «Nombre | Latín» igual que «Nombre (Latín)». */
export const claveDeseo = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\s*\|\s*(.+)$/, ' ($1)').replace(/\s+/g, ' ').trim();

const TIERS = ['dom', 'bas', 'int', 'ava'];
const NIVEL_COMPENDIO = { 'doméstico': 0, 'doméstica': 0, 'básico': 1, 'básica': 1, 'intermedio': 2, 'intermedia': 2, 'avanzado': 3, 'avanzada': 3, 'legendario': 4, 'legendaria': 4 };
const TIPO_COMPENDIO = { Hechizos: 'hechizo', Pociones: 'pocion', Rituales: 'ritual', Objetos: 'objeto' };
const porNivel = acumulado => acumulado.map((x, i) => (i ? x - acumulado[i - 1] : 0));
const alfabetico = (a, b) => a.localeCompare(b, 'es');
const mayuscula = s => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * @param {{ sistema: any, calculadora: any, arcanos: any[] }} datos los JSON de data/
 */
export function crearDatosDeseos({ sistema: S, calculadora: C, arcanos: A }) {
  const req = (cat, nombre, oficial) => oficial || (REQUISITOS[cat] || {})[nombre] || '';

  const ATRS = [...S.atributos];
  const HABS = Object.fromEntries(ATRS.map(a => [a, S.habilidades.filter(h => h.atributo === a).map(h => h.nombre)]).filter(([, hs]) => hs.length));
  const ventajaLeg = S.legendarias.find(l => l.clave === 'ventLeg'), arcanoLeg = S.legendarias.find(l => l.clave === 'arcLeg');

  // arcanos: los oficiales de cada nivel y los inventados (✦), en orden alfabético; el nivel 4 es el legendario
  const ARC = {}, ARC_REQ = {};
  const compendio = new Map(A.map(a => [claveDeseo(a.nombre), a]));
  const delCompendio = n => compendio.get(claveDeseo(n)) || compendio.get(claveDeseo(n.replace(/\s*\(.*$/, '')));
  for (const tipo of Object.keys(S.arcanos.tipos)) {
    const niveles = [0, 1, 2, 3, 4].map(i => (i < 4 ? (C[tipo]?.[TIERS[i]] || []).map(x => x.nombre) : []));
    for (const a of A) if (a.autor && TIPO_COMPENDIO[a.fuente] === tipo && NIVEL_COMPENDIO[String(a.nivel).toLowerCase()] !== undefined) niveles[NIVEL_COMPENDIO[String(a.nivel).toLowerCase()]].push(a.nombre + ' ✦');
    ARC[tipo] = niveles.map(xs => xs.sort(alfabetico));
    for (const n of ARC[tipo].flat()) {
      const limpio = n.replace(/ ✦$/, ''), a = n.endsWith(' ✦') ? A.find(x => x.autor && x.nombre === limpio) : delCompendio(limpio);
      const claves = [claveDeseo(limpio), claveDeseo(limpio.replace(/\s*\(.*$/, ''))]; // «PARA (Peonza…)» era «PARA»
      const r = (a && a.requisito) || REQUISITOS_ARCANOS[Object.keys(REQUISITOS_ARCANOS).find(k => claves.includes(claveDeseo(k))) || ''];
      if (r) ARC_REQ[n] = r;
    }
  }

  const agrupar = (lista, grupo) => lista.reduce((o, x) => ((o[grupo(x)] ??= []).push(x), o), /** @type {Record<string, any[]>} */ ({}));
  const talentos = agrupar(S.talentos, t => t.grupo);
  const LISTAS = {
    talento: Object.fromEntries(Object.entries(talentos).map(([g, ts]) => [g, ts.map(t => [t.nombre, t.precio, t.pl || 0, req('talento', t.nombre, t.requisito)])])),
    arma: {
      'Arma': [[ARMA.nombre, S.armas.precioBase]],
      'Materiales': S.armas.materiales.map(m => [m.nombre, m.precio, 0, m.requisito || '']),
      ...Object.fromEntries([1, 2, 3].map(l => [ARMA.runas[l].grupo, S.armas.runas.filter(r => r.maximo >= l).map(r => [`Runa ${r.nombre}${r.maximo > 1 ? ' ' + S.armas.nivelesRuna[l] : ''}`, S.armas.preciosRuna[l], 0, ARMA.runas[l].req])]))
    },
    raza: { 'Razas': S.razas.map(r => [r.nombre, r.precio, 0, req('raza', r.nombre, '')]) },
    quidditch: QUIDDITCH,
    legendario: { 'Características legendarias': [...S.legendarias.map(l => [l.nombre, l.precio, l.pl || 0, req('legendario', l.nombre, l.requisito)]), ...LEGENDARIAS] }
  };

  return {
    ATRS,
    ATR_COST: porNivel(S.costes.atributo),
    HABS,
    HAB_LV: S.nivelesHabilidad.map(n => n.nombre),
    HAB_COST: porNivel(S.costes.habilidad),
    ARTE_COST: porNivel(S.costes.arte),
    ROM,
    TRAS_T: [...S.trasfondos.tipos],
    TRAS_CAT: [...Object.keys(S.trasfondos.categoriasConocimiento), ...Object.keys(S.trasfondos.categoriasSociales || {})],
    VENT: S.ventajas.map(v => v.nombre),
    VENT_COST: [...porNivel(S.costes.ventaja), ventajaLeg.precio],
    ESP_R: S.especializaciones.map(e => e.nombre ?? e),
    ARC_NV: [...TIERS.map(t => [mayuscula(S.arcanos.niveles[t].m), S.arcanos.niveles[t].price]), ['Legendario', arcanoLeg.precio]],
    ARC, ARC_REQ, LISTAS,
    IDI_MAG: [...S.idiomas.magicos],
    IDI_LV: [...S.idiomas.nivelesCanje],
    ASIG: [...S.academico.asignaturasExtasis],
    CALIF: [...S.academico.notas]
  };
}
