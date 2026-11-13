// @ts-check
// Tabla de Canjes y Compendio: los datos del sistema. Desde la 8d (R07) salen de data/*.json, igual que la Tabla del
// Inspector (js/inspector/Tabla.js, tablaDeDatos): data/sistema.json, data/arcanos-calculadora.json y el Compendio
// (data/arcanos.json, con los arcanos inventados). Devuelve lo mismo, con los mismos nombres, que las constantes que
// tenía escritas la página antigua. Diferencias, las del Sistema reconciliado (sistema.json → reconciliado):
// «Personal no-docente», los tipos de trasfondo en orden alfabético y «Arte/Artesanía» en las Proezas.
import { tablaDeDatos, deshacer } from '../../inspector/Tabla.js?v=2.1.2';

const TYPE_OF = { Hechizos: 'hechizo', Pociones: 'pocion', Rituales: 'ritual', Objetos: 'objeto' };
const TIER_OF = { 'Doméstico': 'dom', 'Básico': 'bas', 'Básica': 'bas', 'Intermedio': 'int', 'Intermedia': 'int', 'Avanzado': 'ava', 'Avanzada': 'ava', 'Legendario': 'leg' };

/**
 * @param {{ sistema: any, calculadora: any, arcanos: any[] }} d el contenido de data/sistema.json,
 *   data/arcanos-calculadora.json y data/arcanos.json (el Compendio; se le añaden type, tier y calcName como antes)
 */
export function datosTabla({ sistema: S, calculadora, arcanos }) {
  const T = tablaDeDatos(S, calculadora, arcanos);
  // el Compendio, con el tipo, el nivel y el nombre de la calculadora de cada arcano (como hacía la página antigua)
  const ARC_BY_ID = {}, DESC = {};
  for (const a of arcanos) {
    a.type = TYPE_OF[a.fuente];
    a.tier = TIER_OF[a.nivel] || 'bas';
    a.calcName = a.origen === 'Oficial' ? (a.calc || a.nombre) : (a.nombre.includes('|') ? a.nombre.replace(/\s*\|\s*(.+)$/, ' ($1)') : a.nombre);
    ARC_BY_ID[a.id] = a;
  }
  for (const a of arcanos) DESC[a.type + '|' + a.calcName] = a;
  const PROEZAS = Object.fromEntries(S.atributos.map(at => [at, S.habilidades.filter(h => h.atributo === at).map(h => h.enFicha || h.nombre)]));
  return {
    ...T,
    SKILL_BONUS: S.nivelesHabilidad.map(n => n.bonus),
    ROMAN: ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'],
    TIPOS_TRASF: [...S.trasfondos.tipos],
    VENT_LABELS: Object.fromEntries(S.ventajas.map(v => [v.nombre, ['—', ...v.niveles]])),
    EXTASIS_ASIG: [...S.academico.asignaturasExtasis],
    IDIOMA_NIVEL: [...S.idiomas.nivelesCanje],
    ARCANOS: arcanos, ARC_BY_ID, DESC,
    PROEZAS,
    LINK_PD: S.enlaces.puntosDestino, LINK_REGISTRO: S.enlaces.registroVeterania,
    VETERANIA: deshacer(S.veterania, { nombre: 'nombre', precio: 'price' })
  };
}
