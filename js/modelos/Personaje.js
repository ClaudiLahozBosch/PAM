// @ts-check
import { Ficha } from './Ficha.js?v=0.6.1';
import { Boveda } from './Boveda.js?v=0.6.1';

/**
 * Un personaje del jugador.
 * Identidad (regla 1 del núcleo): el foro y el número de tema de su ficha. El nombre es solo lo que se
 * muestra: puede cambiar o venir escrito distinto («Irvin Giles.») sin crear otro personaje.
 * Los personajes que vienen del PAM antiguo aún no saben su tema: se les asigna la primera vez que se
 * importan desde el foro (con confirmación si hay dudas), nunca adivinándolo por el nombre.
 */
export class Personaje {
  /**
   * @param {object} p
   * @param {string} p.id identificador interno estable (el del PAM antiguo se conserva: el Registro de Roles se enlaza con él)
   * @param {string|null} [p.foro] p. ej. «hp-avada-kedavra.foroactivo.com»
   * @param {number|null} [p.tema] número de tema de la ficha
   * @param {Ficha} [p.ficha]
   * @param {Boveda} [p.boveda]
   * @param {any} [p.registro] roles, ganancias y futuros canjes del Registro de Roles (sin la bóveda)
   */
  constructor({ id, foro = null, tema = null, ficha = new Ficha(), boveda = new Boveda(), registro = null }) {
    if (!id) throw new Error('Personaje sin id');
    this.id = id;
    this.foro = foro;
    this.tema = tema;
    this.ficha = ficha;
    this.boveda = boveda;
    this.registro = registro;
  }

  get nombre() { return this.ficha.nombre || 'Sin nombre'; }

  /** Clave de identidad en el foro, o null si todavía no se sabe. */
  get identidad() { return this.foro && this.tema ? Personaje.clave(this.foro, this.tema) : null; }

  static clave(foro, tema) { return `${foro}#t${tema}`; }

  /** ¿Es la ficha de este tema? */
  esDelTema(foro, tema) { return this.foro === foro && this.tema === Number(tema); }

  /** Se le asigna su tema del foro (solo si aún no tenía, o era el mismo). */
  vincular(foro, tema) {
    const t = Number(tema);
    if (this.tema != null && (this.foro !== foro || this.tema !== t)) throw new Error(`${this.nombre} ya es la ficha de otro tema (t${this.tema})`);
    this.foro = foro; this.tema = t;
  }
}
