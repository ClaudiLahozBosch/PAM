// @ts-check
/**
 * La bóveda de un personaje (grageas y puntos legendarios).
 * Va dentro del personaje: la Tabla de Canjes la lee de aquí, así ya no llega a 0 (R08).
 */
export class Boveda {
  constructor(p = {}) {
    this.inicial = num(p.inicial);       // grageas iniciales del último movimiento
    this.total = num(p.total);           // grageas totales (todo lo ganado)
    this.actual = num(p.actual);         // grageas disponibles
    this.plTotal = num(p.plTotal);       // puntos legendarios totales
    this.plActual = num(p.plActual);     // puntos legendarios disponibles
    this.enlaces = Array.isArray(p.enlaces) ? p.enlaces.map(String) : [];
    /** Lo demás que guardaba el Registro de Roles (movimiento en curso, historial…), sin tocar. */
    this.resto = p.resto && typeof p.resto === 'object' ? p.resto : {};
  }

  get disponibles() { return this.actual; }

  /** Desde el Registro de Roles antiguo: { ini, tot, act, plt, pla, l1, l2, l3, … }. */
  static desdeLegado(b = {}) {
    const { ini, tot, act, plt, pla, l1, l2, l3, ...resto } = b || {};
    return new Boveda({ inicial: ini, total: tot, actual: act, plTotal: plt, plActual: pla, enlaces: [l1, l2, l3].filter(x => x != null), resto });
  }

  aLegado() {
    const [l1, l2, l3] = this.enlaces;
    const out = { ...this.resto, ini: this.inicial, tot: this.total, act: this.actual, plt: this.plTotal, pla: this.plActual };
    if (l1 != null) out.l1 = l1; if (l2 != null) out.l2 = l2; if (l3 != null) out.l3 = l3;
    return out;
  }
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
