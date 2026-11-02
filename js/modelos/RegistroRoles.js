// @ts-check
// Validación del Registro de Roles al importarlo (auditoría F08).
// Antes se aceptaba cualquier JSON con una lista `personajes` y algunos valores (el color `tono`)
// acababan dentro del HTML sin escapar: un código compartido manipulado podía ejecutar código en PAM.
// Ahora cada valor se comprueba: los que son de una lista cerrada deben estar en la lista; los colores,
// ser colores; los enlaces, http(s); el resto, texto o número. Lo que no cumple se cambia por un valor
// seguro y se avisa.

export const TONOS = ['mint', 'sky', 'terra', 'gold', 'lilac', 'rose', 'sage', 'peach', 'sand', 'gray'];
export const TIPOS_ROL = ['Oficial', 'Acontecimiento', 'Gesta', 'Evento', 'Misión', 'Clases', 'Libre', 'Grupal'];
export const ESTADOS_ROL = ['Sin Contestar', 'Contestado', 'Pausado', 'Terminado'];
export const ESTADOS_OFICIAL = ['Disponible', 'Ocupado'];
export const ESTADOS_GANANCIA = ['Cobrado', 'Sin Cobrar'];
export const TURNOS = ['Sin Postear', 'Rápido', 'Normal', 'Lento', 'Falta Justificada', 'Falta Injustificada'];

const esObj = v => v != null && typeof v === 'object' && !Array.isArray(v);
const COLOR = /^#[0-9a-f]{3,8}$/i;

/**
 * @param {unknown} entrada lo que se pega en «Importar código»
 * @returns {{ ok: true, datos: any, avisos: string[] } | { ok: false, error: string }}
 */
export function validarRegistro(entrada) {
  let d = entrada;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return { ok: false, error: 'No es un código válido.' }; } }
  if (!esObj(d) || !Array.isArray(/** @type {any} */ (d).personajes)) return { ok: false, error: 'Falta la lista de personajes.' };
  const avisos = [];
  const v = new Saneador(avisos);
  const D = /** @type {any} */ (d);
  const datos = {
    ...v.objeto(D, 'registro', ['personajes', 'fijos', 'turnos', 'oficiales']),
    personajes: D.personajes.filter(esObj).map((p, i) => {
      const r = v.objeto(p, `personaje ${i + 1}`, ['tono', 'roles', 'ganancias', 'wish', 'boveda']);
      r.tono = v.deLista(p.tono, TONOS, 'lilac', `personaje ${i + 1}: color`);
      r.roles = v.lista(p.roles, `personaje ${i + 1}: roles`).map((x, j) => {
        const o = v.objeto(x, `rol ${j + 1}`, ['tipo', 'estado', 'color', 'color2', 'enlace']);
        o.tipo = v.deLista(x.tipo, TIPOS_ROL, 'Libre', `rol ${j + 1}: tipo`);
        o.estado = v.deLista(x.estado, ESTADOS_ROL, 'Sin Contestar', `rol ${j + 1}: estado`);
        o.color = v.color(x.color, `rol ${j + 1}: color`);
        if ('color2' in x) o.color2 = v.color(x.color2, `rol ${j + 1}: color 2`);
        o.enlace = v.enlace(x.enlace, `rol ${j + 1}: enlace`);
        return o;
      });
      r.ganancias = v.lista(p.ganancias, 'ganancias').map((x, j) => {
        const o = v.objeto(x, `ganancia ${j + 1}`, ['estado']);
        o.estado = v.deLista(x.estado, ESTADOS_GANANCIA, 'Sin Cobrar', `ganancia ${j + 1}: estado`);
        return o;
      });
      if ('wish' in p) r.wish = v.lista(p.wish, 'futuros canjes').map((x, j) => v.objeto(x, `futuro canje ${j + 1}`));
      if ('boveda' in p) r.boveda = v.objeto(p.boveda, 'bóveda', ['l1', 'l2', 'l3', 'enl']);
      if (p.boveda && esObj(p.boveda)) for (const k of ['l1', 'l2', 'l3', 'enl']) if (k in p.boveda) r.boveda[k] = v.enlace(p.boveda[k], `bóveda: ${k}`);
      return r;
    }),
    fijos: v.lista(D.fijos, 'fijos').map((x, j) => v.objeto(x, `fijo ${j + 1}`)),
    oficiales: v.lista(D.oficiales, 'oficiales').map((x, j) => {
      const o = v.objeto(x, `oficial ${j + 1}`, ['estado', 'enlace']);
      o.estado = v.deLista(x.estado, ESTADOS_OFICIAL, 'Disponible', `oficial ${j + 1}: estado`);
      o.enlace = v.enlace(x.enlace, `oficial ${j + 1}: enlace`);
      return o;
    })
  };
  if ('turnos' in D) {
    const t = esObj(D.turnos) ? D.turnos : {};
    datos.turnos = {
      ...v.objeto(t, 'turnos', ['misiones']),
      misiones: v.lista(t.misiones, 'misiones').map((m, j) => {
        const o = v.objeto(m, `misión ${j + 1}`, ['t']);
        o.t = v.lista(m.t, `misión ${j + 1}: turnos`).map(x => v.deLista(x, TURNOS, 'Sin Postear', `misión ${j + 1}: turno`));
        return o;
      })
    };
  }
  return { ok: true, datos, avisos };
}

class Saneador {
  constructor(avisos) { this.avisos = avisos; }
  aviso(t) { if (this.avisos.length < 50) this.avisos.push(t); }

  /** Texto, número o booleano tal cual; objetos y listas anidados, saneados igual; `saltar` se trata aparte. */
  objeto(o, donde, saltar = []) {
    if (!esObj(o)) { this.aviso(`${donde}: no es un objeto`); return {}; }
    const out = {};
    for (const [k, x] of Object.entries(o)) {
      if (saltar.includes(k) || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = this.valor(x, `${donde}.${k}`);
    }
    return out;
  }
  valor(x, donde) {
    if (x == null || typeof x === 'number' || typeof x === 'boolean') return typeof x === 'number' && !Number.isFinite(x) ? 0 : x;
    if (typeof x === 'string') return x.length > 20000 ? (this.aviso(`${donde}: texto recortado`), x.slice(0, 20000)) : x;
    if (Array.isArray(x)) return x.slice(0, 5000).map((y, i) => this.valor(y, `${donde}[${i}]`));
    if (esObj(x)) return this.objeto(x, donde);
    this.aviso(`${donde}: valor no válido`); return null;
  }
  lista(x, donde) {
    if (x == null) return [];
    if (!Array.isArray(x)) { this.aviso(`${donde}: no es una lista`); return []; }
    return x.filter(esObj);
  }
  deLista(x, lista, porDefecto, donde) {
    if (x == null || x === '') return porDefecto;
    if (lista.includes(x)) return x;
    this.aviso(`${donde}: «${String(x).slice(0, 40)}» no es válido; se usa «${porDefecto}»`); return porDefecto;
  }
  color(x, donde) {
    if (x == null || x === '') return '';
    if (typeof x === 'string' && COLOR.test(x)) return x;
    this.aviso(`${donde}: color no válido`); return '';
  }
  /** Se conserva lo que escribió el usuario (también sin «https://»); solo se quitan esquemas peligrosos (javascript:, data:…). */
  enlace(x, donde) {
    if (x == null || x === '') return '';
    const s = String(x).trim();
    const esquema = s.match(/^([a-z][a-z0-9+.-]*):/i);
    if (esquema && !/^https?$/i.test(esquema[1]) && !/^[^/]*\.[a-z]{2,}:\d+/i.test(s)) { this.aviso(`${donde}: enlace no permitido`); return ''; }
    return s.slice(0, 2000);
  }
}
