// @ts-check
/**
 * Un trasfondo de la ficha.
 * Además del nivel, guarda de dónde salió (tema y mensaje del foro) y el texto original, para poder
 * editar el mensaje correcto y para no perder lo que no se entendió (reglas del núcleo 2 y 3).
 */
export class Trasfondo {
  /**
   * @param {object} p
   * @param {string} p.tipo Biblioteca, Influencia, Informantes o Seguidores
   * @param {string} [p.categoria] p. ej. «Bajos fondos», «Arcanismo»
   * @param {string} [p.especifico] p. ej. «Contrabandistas», «Artes oscuras»
   * @param {number} p.nivel 1–6
   * @param {string} [p.identidad] persona o entidad concreta: «Zacharias Hayes»
   * @param {string} [p.nota]
   * @param {{tema?: number|null, post?: number|null}} [p.origen]
   * @param {string} [p.textoOriginal] la línea tal como está en la ficha
   * @param {'reconocido'|'revisar'} [p.estadoLectura]
   */
  constructor({ tipo, categoria = '', especifico = '', nivel, identidad = '', nota = '', origen = {}, textoOriginal = '', estadoLectura = 'reconocido' }) {
    this.tipo = tipo;
    this.categoria = categoria;
    this.especifico = especifico;
    this.nivel = nivel;
    this.identidad = identidad;
    this.nota = nota;
    this.origen = { tema: origen.tema ?? null, post: origen.post ?? null };
    this.textoOriginal = textoOriginal;
    this.estadoLectura = estadoLectura;
  }

  /** ¿Es el mismo trasfondo (sin mirar el nivel)? */
  mismo(otro) {
    const n = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
    return n(this.tipo) === n(otro.tipo) && n(this.categoria) === n(otro.categoria) && n(this.especifico) === n(otro.especifico) && n(this.identidad) === n(otro.identidad);
  }

  /** Desde el formato antiguo de PAM: { t, c, e, v, nota }. */
  static desdeLegado(b) {
    return new Trasfondo({ tipo: b.t, categoria: b.c ?? '', especifico: b.e ?? '', nivel: Number(b.v) || 0, nota: b.nota ?? '' });
  }

  /** Al formato antiguo. La identidad, que el formato antiguo no tenía, va en la nota. */
  aLegado() {
    const nota = this.identidad && !this.nota.includes(this.identidad) ? [this.identidad, this.nota].filter(Boolean).join(' — ') : this.nota;
    return { t: this.tipo, c: this.categoria, e: this.especifico, v: this.nivel, nota };
  }
}
