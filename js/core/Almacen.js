// @ts-check
// Guardado en el navegador (localStorage) con tres garantías que el PAM antiguo no daba:
//  · se guarda al salir de la página aunque haya un guardado pendiente (auditoría F14);
//  · una restauración completa (p. ej. desde la nube) se hace entera o no se hace: si falla a mitad,
//    se deja todo como estaba (auditoría F11);
//  · los errores se devuelven, no se tragan.

/**
 * @typedef {{ getItem(k: string): string|null, setItem(k: string, v: string): void, removeItem(k: string): void, key(i: number): string|null, readonly length: number }} AlmacenamientoWeb
 */

export class Almacen {
  /** @type {Map<string, {valor: any, t: any}>} */
  #pendientes = new Map();
  #storage;

  /** @param {{ storage?: AlmacenamientoWeb }} [op] */
  constructor({ storage } = {}) {
    this.#storage = storage ?? globalThis.localStorage;
  }

  /** Valor guardado (JSON) o `porDefecto` si no hay o está roto. */
  leer(clave, porDefecto = null) {
    if (this.#pendientes.has(clave)) return this.#pendientes.get(clave)?.valor;
    try {
      const t = this.#storage.getItem(clave);
      return t == null ? porDefecto : JSON.parse(t);
    } catch { return porDefecto; }
  }

  /** Guarda ya. Devuelve `{ok}` o `{ok:false, error}` (p. ej. sin espacio). */
  guardar(clave, valor) {
    this.#cancelar(clave);
    try { this.#storage.setItem(clave, JSON.stringify(valor)); return { ok: true }; }
    catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
  }

  /** Guarda dentro de `ms` (para no escribir a cada tecla). `vaciar()` lo adelanta. */
  guardarLuego(clave, valor, ms = 700) {
    this.#cancelar(clave);
    const t = setTimeout(() => { this.#pendientes.delete(clave); this.guardar(clave, valor); }, ms);
    this.#pendientes.set(clave, { valor, t });
  }

  /** Escribe todo lo pendiente ahora mismo. */
  vaciar() {
    for (const [clave, { valor }] of [...this.#pendientes]) this.guardar(clave, valor);
  }

  /** Guarda lo pendiente al cerrar o esconder la pestaña. */
  vigilarSalida(ventana = globalThis.window) {
    ventana.addEventListener('pagehide', () => this.vaciar());
    ventana.document?.addEventListener('visibilitychange', () => { if (ventana.document.visibilityState === 'hidden') this.vaciar(); });
  }

  borrar(clave) { this.#cancelar(clave); this.#storage.removeItem(clave); }

  /** Claves que cumplen `filtro`. */
  claves(filtro = () => true) {
    const out = [];
    for (let i = 0; i < this.#storage.length; i++) { const k = this.#storage.key(i); if (k != null && filtro(k)) out.push(k); }
    return out.sort();
  }

  /** Copia en texto de las claves que cumplen `filtro`: { clave: textoGuardado }. */
  instantanea(filtro = () => true) {
    this.vaciar();
    return Object.fromEntries(this.claves(filtro).map(k => [k, this.#storage.getItem(k) ?? '']));
  }

  /**
   * Sustituye todas las claves que cumplen `filtro` por las de `datos` ({ clave: texto }).
   * Todo o nada: si una escritura falla o no se lee igual, se vuelve a lo que había.
   * @returns {{ ok: true, escritas: number } | { ok: false, error: string, restaurado: boolean }}
   */
  restaurar(datos, filtro) {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return { ok: false, error: 'Datos no válidos', restaurado: true };
    const nuevas = Object.entries(datos).filter(([k, v]) => filtro(k) && typeof v === 'string');
    const antes = this.instantanea(filtro);
    const aplicar = (pares, borrarResto) => {
      if (borrarResto) for (const k of this.claves(filtro)) this.#storage.removeItem(k);
      for (const [k, v] of pares) {
        this.#storage.setItem(k, v);
        if (this.#storage.getItem(k) !== v) throw new Error('No se guardó bien ' + k);
      }
    };
    try {
      aplicar(nuevas, true);
      return { ok: true, escritas: nuevas.length };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      try { aplicar(Object.entries(antes), true); return { ok: false, error, restaurado: true }; }
      catch { return { ok: false, error, restaurado: false }; }
    }
  }

  #cancelar(clave) {
    const p = this.#pendientes.get(clave);
    if (p) { clearTimeout(p.t); this.#pendientes.delete(clave); }
  }
}
