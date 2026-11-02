// @ts-check
/** Un hechizo, poción, ritual u objeto de la ficha, con su descripción y su origen en el foro. */
export class Arcano {
  /**
   * @param {object} p
   * @param {'hechizo'|'pocion'|'ritual'|'objeto'} p.tipo
   * @param {'dom'|'bas'|'int'|'ava'|'leg'} p.nivel
   * @param {string} p.nombre
   * @param {string} [p.descripcion] lo que la ficha dice del arcano (se conserva al editar)
   * @param {{tema?: number|null, post?: number|null}} [p.origen]
   * @param {string} [p.textoOriginal]
   * @param {'reconocido'|'revisar'} [p.estadoLectura]
   */
  constructor({ tipo, nivel, nombre, descripcion = '', origen = {}, textoOriginal = '', estadoLectura = 'reconocido' }) {
    this.tipo = tipo;
    this.nivel = nivel;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.origen = { tema: origen.tema ?? null, post: origen.post ?? null };
    this.textoOriginal = textoOriginal;
    this.estadoLectura = estadoLectura;
  }

  /** Desde el formato antiguo: { type, tier, name, nota }. */
  static desdeLegado(a) {
    return new Arcano({ tipo: a.type, nivel: a.tier, nombre: a.name, descripcion: a.nota ?? '' });
  }

  aLegado() { return { type: this.tipo, tier: this.nivel, name: this.nombre, nota: this.descripcion }; }
}
