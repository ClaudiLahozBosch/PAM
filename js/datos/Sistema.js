// @ts-check
// Reglas y listas del Sistema Avadense (data/sistema.json), con una sola fuente para todo PAM.
// Los nombres son los oficiales; cada «contexto» da el nombre que usa un sitio concreto:
//   'oficial' → Esquivar (Sistema, Tabla de Canjes)   'ficha' → Esquiva (modelo de ficha del foro)
import { norm } from '../core/texto.js?v=2.0.0';

/** @typedef {'oficial'|'ficha'|'proezas'} Contexto */
/** @typedef {{ nombre: string, atributo: string, enFicha?: string, enProezas?: string, multiple?: boolean }} Habilidad */

export class Sistema {
  /** @param {any} datos contenido de data/sistema.json */
  constructor(datos) {
    if (!datos || datos.version !== 1) throw new Error('data/sistema.json: versión no soportada');
    this.datos = datos;
    /** @type {Habilidad[]} */
    this.listaHabilidades = datos.habilidades;
    /** @type {Map<string, Habilidad>} cualquier nombre conocido (oficial, de ficha, sin tildes) → habilidad */
    this.#porNombre = new Map();
    for (const h of this.listaHabilidades) for (const n of [h.nombre, h.enFicha, h.enProezas]) if (n) this.#porNombre.set(norm(n), h);
  }
  #porNombre;

  get atributos() { return this.datos.atributos; }
  get artes() { return this.datos.artes; }
  get artesanias() { return this.datos.artesanias; }
  get especializaciones() { return this.datos.especializaciones; }
  get tiposTrasfondo() { return this.datos.trasfondos.tipos; }

  /** Nombre de una habilidad en un contexto. @param {Habilidad} h @param {Contexto} contexto */
  nombreHabilidad(h, contexto = 'oficial') {
    if (contexto === 'proezas') return h.enProezas ?? h.enFicha ?? h.nombre;
    if (contexto === 'ficha') return h.enFicha ?? h.nombre;
    return h.nombre;
  }

  /** La habilidad a partir de cualquier forma de escribirla («Esquiva», «esquivar», «Seducción»…). */
  habilidad(texto) { return this.#porNombre.get(norm(texto)) ?? null; }

  /**
   * Habilidades agrupadas por atributo, en el orden oficial.
   * @param {Contexto} contexto
   * @param {{ conArte?: boolean }} [op] incluir «Arte/Artesanía» (va aparte porque se puede tener varias)
   */
  habilidadesPorAtributo(contexto = 'oficial', { conArte = true } = {}) {
    const out = Object.fromEntries(this.atributos.map(a => [a, /** @type {string[]} */ ([])]));
    for (const h of this.listaHabilidades) if (conArte || !h.multiple) out[h.atributo].push(this.nombreHabilidad(h, contexto));
    return out;
  }

  /** Nivel de habilidad 0–5: nombre y bonificador. @param {'oficial'|'canjes'} [contexto] */
  nivelHabilidad(n, contexto = 'oficial') {
    const x = this.datos.nivelesHabilidad[n];
    if (!x) return null;
    return { nombre: contexto === 'canjes' ? (x.enCanjes ?? x.nombre) : x.nombre, bonus: x.bonus };
  }

  /** Precio de subir de `desde` a `hasta` en una tabla de costes acumulados (atributo, habilidad, arte…). */
  coste(tabla, desde, hasta) {
    const t = this.datos.costes[tabla];
    if (!Array.isArray(t)) throw new Error('Tabla de costes desconocida: ' + tabla);
    if (hasta <= desde) return 0;
    if (hasta >= t.length) throw new Error(`${tabla}: nivel ${hasta} fuera de la tabla`);
    return t[hasta] - t[desde];
  }

  /** Categorías de un tipo de trasfondo: Biblioteca usa las de conocimiento; el resto, las sociales. */
  categoriasTrasfondo(tipo) {
    return norm(tipo) === 'biblioteca' ? this.datos.trasfondos.categoriasConocimiento : this.datos.trasfondos.categoriasSociales;
  }

  /** Nombre oficial de una categoría o específico si se reconoce (tildes, mayúsculas y alias aparte). */
  nombreOficialTrasfondo(texto, tipo) {
    const alias = this.datos.trasfondos.alias[texto];
    if (alias) return alias;
    const C = this.categoriasTrasfondo(tipo), n = norm(texto);
    for (const [cat, especificos] of Object.entries(C)) {
      if (norm(cat) === n) return cat;
      const e = especificos.find(s => norm(s) === n);
      if (e) return e;
    }
    return null;
  }

  ventaja(nombre) { return this.datos.ventajas.find(v => norm(v.nombre) === norm(nombre)) ?? null; }
  etapa(nombre) { return this.datos.etapas[nombre] ?? null; }
}
