// @ts-check
// El Compendio Arcano (data/arcanos.json): 455 arcanos oficiales e inventados, con su texto.
import { norm } from '../core/texto.js?v=0.3.1';

const TIPO = { Hechizos: 'hechizo', Pociones: 'pocion', Rituales: 'ritual', Objetos: 'objeto' };
const NIVEL = { 'Doméstico': 'dom', 'Básico': 'bas', 'Básica': 'bas', 'Intermedio': 'int', 'Intermedia': 'int', 'Avanzado': 'ava', 'Avanzada': 'ava', 'Legendario': 'leg' };
const clave = s => norm(s).replace(/[^a-z0-9]/g, '');

/**
 * @typedef {{ id: string, tipo: string, nivel: string, nombre: string, nombreCalc: string, oficial: boolean, requisito: string, texto: string, autor?: any }} EntradaCompendio
 */
export class Compendio {
  /** @param {any[]} arcanos contenido de data/arcanos.json */
  constructor(arcanos) {
    /** @type {EntradaCompendio[]} */
    this.lista = arcanos.map(a => ({
      id: a.id, tipo: TIPO[a.fuente], nivel: NIVEL[a.nivel] || 'bas', nombre: a.nombre,
      // nombre con el que lo conocía la calculadora antigua (los inventados con «|» pasaban a «Nombre (Latín)»)
      nombreCalc: a.origen === 'Oficial' ? (a.calc || a.nombre) : (a.nombre.includes('|') ? a.nombre.replace(/\s*\|\s*(.+)$/, ' ($1)') : a.nombre),
      oficial: a.origen === 'Oficial', requisito: a.requisito || '', texto: a.texto || '', autor: a.autor
    }));
    /** @type {Map<string, EntradaCompendio[]>} */
    this.#porClave = new Map();
    for (const a of this.lista) {
      // también el nombre en latín suelto: «Mutatio Mentis Minoris» de «… | Mutatio Mentis Minoris» o de «… (Procul Visio)»
      const latin = a.nombre.match(/\(([^)]+)\)\s*$/)?.[1];
      const ks = new Set([a.nombreCalc, a.nombre, ...a.nombre.split('|'), latin ?? ''].map(clave));
      ks.delete('');
      for (const k of ks) { const l = this.#porClave.get(k) ?? []; l.push(a); this.#porClave.set(k, l); }
    }
  }
  #porClave;

  /**
   * El arcano por cualquier forma de su nombre: «Nombre | Latín», «Nombre (Latín)», «Latín», sin tildes…
   * @param {string} nombre @param {string} [tipo] si hay varios con el mismo nombre, el de este tipo
   */
  buscar(nombre, tipo) {
    let hits = this.#porClave.get(clave(nombre));
    if (!hits) { const p = String(nombre).match(/^(.*?)\s*\(([^)]+)\)\s*$/); if (p) hits = this.#porClave.get(clave(p[1] + '|' + p[2])) ?? this.#porClave.get(clave(p[2])); }
    // «Ritual de modificación mental básico | Mutatio Mentis Minoris» (el Compendio dice «menor»): por cada parte, el latín primero
    if (!hits && String(nombre).includes('|')) for (const parte of String(nombre).split('|').reverse()) { hits = this.#porClave.get(clave(parte)); if (hits) break; }
    if (!hits) return null;
    return hits.find(a => a.tipo === tipo) ?? hits[0];
  }

  porId(id) { return this.lista.find(a => a.id === id) ?? null; }
}
