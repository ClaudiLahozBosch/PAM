// @ts-check
import { Trasfondo } from './Trasfondo.js?v=0.4.0';
import { Arcano } from './Arcano.js?v=0.4.0';
import { huella } from '../core/huella.js?v=0.4.0';

/**
 * Una parte de la ficha: un mensaje del foro.
 * Las fichas pueden ocupar varios mensajes (en Irvin Giles, cinco). Cada dato sabe de qué parte salió.
 */
export class ParteFicha {
  /** @param {{ post: number, orden?: number, seccion?: string, bbcode?: string, huella?: string }} p */
  constructor({ post, orden = 0, seccion = '', bbcode = '', huella: h }) {
    this.post = post;
    this.orden = orden;
    this.seccion = seccion;
    this.bbcode = bbcode;
    this.huella = h ?? huella(bbcode);
  }
  /** ¿El texto actual del mensaje es el mismo que se leyó? */
  sigueIgual(bbcodeActual) { return huella(bbcodeActual) === this.huella; }
}

/** Lo que estaba en la ficha y no se entendió: se guarda para revisarlo, nunca se tira (regla 3). */
export class EntradaDesconocida {
  /** @param {{ texto: string, seccion?: string, origen?: {tema?: number|null, post?: number|null} }} p */
  constructor({ texto, seccion = '', origen = {} }) {
    this.texto = texto;
    this.seccion = seccion;
    this.origen = { tema: origen.tema ?? null, post: origen.post ?? null };
  }
}

// Campos del formato antiguo que este modelo conoce. Cualquier otro se guarda tal cual en `extraLegado`.
const CONOCIDOS = ['nombre', 'attrs', 'skills', 'artes', 'bgs', 'adv', 'jobState', 'd', 'desc', 'extra', 'arcanos', 'idiomas', 'esp', 'talentos', 'vinculos', 'titulos', 'otros', 'plantilla'];

/** La ficha de un personaje: lo que dice el foro, ya interpretado, y de qué mensajes salió. */
export class Ficha {
  constructor(p = {}) {
    this.nombre = p.nombre ?? '';
    /** @type {ParteFicha[]} */ this.partes = (p.partes ?? []).map(x => x instanceof ParteFicha ? x : new ParteFicha(x));
    /** Datos personales (nacimiento, casa, sangre…), descripciones y extras de presentación. */
    this.datos = { ...(p.datos ?? {}) };
    this.descripcion = { ...(p.descripcion ?? {}) };
    this.presentacion = { ...(p.presentacion ?? {}) };
    /** @type {Record<string, number>} */ this.atributos = { ...(p.atributos ?? {}) };
    /** @type {Record<string, number>} por nombre OFICIAL (Esquivar, Volar…) */ this.habilidades = { ...(p.habilidades ?? {}) };
    /** @type {{nombre: string, nivel: number}[]} */ this.artes = (p.artes ?? []).map(a => ({ ...a }));
    /** @type {Trasfondo[]} */ this.trasfondos = (p.trasfondos ?? []).map(t => t instanceof Trasfondo ? t : new Trasfondo(t));
    /** @type {Record<string, number>} */ this.ventajas = { ...(p.ventajas ?? {}) };
    /** @type {Arcano[]} */ this.arcanos = (p.arcanos ?? []).map(a => a instanceof Arcano ? a : new Arcano(a));
    /** @type {{nombre: string, nivel: string, nota: string}[]} */ this.idiomas = (p.idiomas ?? []).map(i => ({ ...i }));
    /** @type {Record<string, number>} */ this.especializaciones = { ...(p.especializaciones ?? {}) };
    /** @type {{nombre: string, nota: string}[]} */ this.talentos = (p.talentos ?? []).map(t => ({ ...t }));
    /** @type {{tipo: string, pj: string, nota: string}[]} */ this.vinculos = (p.vinculos ?? []).map(v => ({ ...v }));
    /** @type {string[]} una línea por título */ this.titulos = [...(p.titulos ?? [])];
    this.otros = p.otros ?? '';
    /** @type {EntradaDesconocida[]} */ this.desconocidos = (p.desconocidos ?? []).map(e => e instanceof EntradaDesconocida ? e : new EntradaDesconocida(e));
    /** Código de la ficha en el foro (modo compacta / extendida / personalizada). */
    this.plantilla = p.plantilla ? { ...p.plantilla } : null;
    /** Estado del revisor de empleos. */
    this.empleos = p.empleos ?? {};
    this.extraLegado = p.extraLegado ?? {};
  }

  /** La parte (mensaje) que contiene un post concreto. */
  parte(post) { return this.partes.find(p => p.post === post) ?? null; }

  /**
   * Desde el formato antiguo de PAM (lo que guarda `grimorio.personajes`).
   * @param {any} f ficha antigua (como la deja normFicha)
   * @param {import('../datos/Sistema.js').Sistema} sistema para pasar «Esquiva» → «Esquivar»
   */
  static desdeLegado(f, sistema) {
    const habilidades = {};
    for (const [k, v] of Object.entries(f.skills ?? {})) habilidades[sistema.habilidad(k)?.nombre ?? k] = v;
    const extraLegado = Object.fromEntries(Object.entries(f).filter(([k]) => !CONOCIDOS.includes(k)));
    return new Ficha({
      nombre: f.nombre,
      datos: f.d, descripcion: f.desc, presentacion: f.extra,
      atributos: f.attrs, habilidades,
      artes: (f.artes ?? []).map(a => ({ nombre: a.n, nivel: a.v, ...resto(a, ['n', 'v']) })),
      trasfondos: (f.bgs ?? []).map(Trasfondo.desdeLegado),
      ventajas: f.adv,
      arcanos: (f.arcanos ?? []).map(Arcano.desdeLegado),
      idiomas: (f.idiomas ?? []).map(i => ({ nombre: i.n, nivel: i.nivel, nota: i.nota ?? '', ...resto(i, ['n', 'nivel', 'nota']) })),
      especializaciones: f.esp,
      talentos: (f.talentos ?? []).map(t => ({ nombre: t.n, nota: t.nota ?? '', ...resto(t, ['n', 'nota']) })),
      vinculos: (f.vinculos ?? []).map(v => ({ ...v })),
      titulos: f.titulos ? String(f.titulos).split('\n') : [],
      otros: f.otros ?? '',
      plantilla: f.plantilla ?? null,
      empleos: f.jobState ?? {},
      extraLegado
    });
  }

  /** Al formato antiguo (para la convivencia con el PAM antiguo y para comprobar que no se pierde nada). */
  aLegado(sistema) {
    const skills = {};
    for (const [k, v] of Object.entries(this.habilidades)) { const h = sistema.habilidad(k); skills[h ? sistema.nombreHabilidad(h, 'ficha') : k] = v; }
    const f = {
      ...this.extraLegado,
      nombre: this.nombre,
      attrs: { ...this.atributos }, skills,
      artes: this.artes.map(({ nombre, nivel, ...r }) => ({ n: nombre, v: nivel, ...r })),
      bgs: this.trasfondos.map(t => t.aLegado()),
      adv: { ...this.ventajas },
      jobState: this.empleos,
      d: { ...this.datos }, desc: { ...this.descripcion }, extra: { ...this.presentacion },
      arcanos: this.arcanos.map(a => a.aLegado()),
      idiomas: this.idiomas.map(({ nombre, nivel, nota, ...r }) => ({ n: nombre, nivel, nota, ...r })),
      esp: { ...this.especializaciones },
      talentos: this.talentos.map(({ nombre, nota, ...r }) => ({ n: nombre, nota, ...r })),
      vinculos: this.vinculos.map(v => ({ ...v })),
      titulos: this.titulos.join('\n'),
      otros: this.otros
    };
    if (this.plantilla) f.plantilla = { ...this.plantilla };
    return f;
  }
}

function resto(o, quitar) { return Object.fromEntries(Object.entries(o).filter(([k]) => !quitar.includes(k))); }
