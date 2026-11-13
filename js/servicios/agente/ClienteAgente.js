// @ts-check
import { PROTOCOLO, FOROS } from './protocolo.js?v=2.0.2';

/** Habla con el agente (el script de Tampermonkey). Toda la lógica está en PAM; el agente solo ejecuta. */
export class ClienteAgente {
  /** @type {Map<string, {ok: Function, ko: Function, t: any}>} */
  #pendientes = new Map();
  /** @type {Record<string, (datos: any) => any>} */
  #manejadores = {};
  #siguiente = 1;
  #destino;
  #origen;

  /**
   * @param {{ destino: {postMessage: Function}, origen: string, escuchar?: {addEventListener: Function} }} op
   */
  constructor({ destino, origen, escuchar = window }) {
    this.#destino = destino;
    this.#origen = origen;
    escuchar.addEventListener('message', (/** @type {MessageEvent} */ e) => this.#recibir(e));
  }

  /** Panel dentro de un iframe del foro: el agente es la ventana madre. */
  static enPanel() {
    if (window.parent === window) return null;
    const madre = (location.ancestorOrigins && location.ancestorOrigins[0]) || new URLSearchParams(location.search).get('foro') || '';
    if (!FOROS.includes(madre)) return null;
    return new ClienteAgente({ destino: window.parent, origen: madre });
  }

  /** PAM abierto como pestaña normal: el agente está en la misma ventana. */
  static enPagina() {
    return new ClienteAgente({ destino: window, origen: location.origin });
  }

  /** @param {MessageEvent} e */
  async #recibir(e) {
    if (e.origin !== this.#origen) return;
    const m = e.data;
    if (!m || typeof m !== 'object' || m.de !== 'agente') return;
    if (m.re) {
      const p = this.#pendientes.get(m.re);
      if (!p) return;
      this.#pendientes.delete(m.re); clearTimeout(p.t);
      m.ok ? p.ok(m.resultado) : p.ko(new Error(m.error || 'Error en el agente'));
      return;
    }
    const responder = (/** @type {object} */ r) => this.#destino.postMessage({ pam: PROTOCOLO, de: 'pam', re: m.id, ...r }, this.#origen);
    const h = this.#manejadores[m.tipo];
    if (!h) return responder({ ok: false, error: 'PAM no atiende ' + m.tipo });
    try { responder({ ok: true, resultado: await h(m.datos || {}) }); }
    catch (err) { responder({ ok: false, error: String(err instanceof Error ? err.message : err) }); }
  }

  /** @param {string} tipo @param {object} [datos] @param {number} [ms] */
  pedir(tipo, datos = {}, ms = 8000) {
    const id = 'p' + (this.#siguiente++);
    return new Promise((ok, ko) => {
      const t = setTimeout(() => { this.#pendientes.delete(id); ko(new Error('El agente no responde (¿está instalado el script?)')); }, ms);
      this.#pendientes.set(id, { ok, ko, t });
      this.#destino.postMessage({ pam: PROTOCOLO, de: 'pam', id, tipo, datos }, this.#origen);
    });
  }

  /** Registra qué hace PAM cuando el agente le pide algo (p. ej. 'editor.revisar'). */
  atender(tipo, fn) { this.#manejadores[tipo] = fn; return this; }

  // --- atajos con nombre ---
  /** @returns {Promise<{agente: string, protocolo: number, foro: string|null, cuenta: {id: number, nombre: string}|null}>} */
  hola() { return this.pedir('hola', {}, 3000); }

  /** Lee una página del foro con la sesión del usuario y la devuelve ya parseada. @param {string} ruta */
  async leer(ruta) {
    const r = await this.pedir('foro.leer', { ruta }, 20000);
    if (r.estado !== 200) throw new Error(`HTTP ${r.estado} en ${ruta}`);
    return new DOMParser().parseFromString(r.html, 'text/html');
  }

  /** Pide publicar. El agente enseña su propia puerta; puede tardar lo que tarde el usuario. */
  responder(tema, mensaje, motivo = '') { return this.pedir('foro.publicar', { tipo: 'responder', tema, mensaje, motivo }, 10 * 60000); }

  /** Pide editar un mensaje propio. El agente enseña las diferencias y no toca nada si el mensaje cambió. */
  editar(post, original, nuevo, { motivo = '', titulo = '' } = {}) { return this.pedir('foro.editar', { post, original, nuevo, motivo, titulo }, 10 * 60000); }

  /**
   * La puerta del Escriba con varios pasos (p. ej. publicar la petición y editar la ficha y la bóveda).
   * @param {{ titulo: string, explicacion?: string, avisos?: string[], pasos: any[] }} accion
   * @returns {Promise<{ resultado: 'aceptada'|'denegada'|'fallida'|'parcial'|'igual', pasos: any[] }>}
   */
  puerta(accion) { return this.pedir('foro.puerta', accion, 30 * 60000); }

  /** Lleva la página del foro a otra ruta del mismo foro (p. ej. el mensaje que se acaba de publicar). @param {string} ruta */
  ir(ruta) { return this.pedir('foro.ir', { ruta }); }

  /** @param {string} clave */
  async leerDato(clave) { return (await this.pedir('almacen.leer', { clave })).valor; }
  /** @param {string} clave @param {any} valor */
  guardarDato(clave, valor) { return this.pedir('almacen.guardar', { clave, valor }); }
  /** Lo que guardaba el «Mi PJ» antiguo en Tampermonkey. */
  async legado() { return (await this.pedir('almacen.legado', {})).valores; }

  /** Tamaño del iframe del panel (lo que ocupa Mi PJ, con su margen). */
  tamano(ancho, alto) { return this.pedir('panel.tamano', { ancho, alto }); }
  /** El tema de Mi PJ también para las puertas del agente. */
  tema(t) { return this.pedir('panel.tema', { tema: t }); }
  /**
   * La barra de Mi PJ arriba de los mensajes de un tema de oficial (el agente la pinta en la página del foro).
   * @param {{ estado: 'leyendo'|'ok'|'error', abierta: boolean, barra?: any, error?: string }} d
   */
  oficial(d) { return this.pedir('foro.oficial', d); }
  /**
   * Abre PAM en otra pestaña desde el foro y le pasa `mensaje` hasta que conteste con `respuesta`
   * (el «Datos del foro → PAM» de PAM solo acepta datos que vengan del foro).
   * @param {{ hash?: string, mensaje?: any, respuesta?: string }} d
   * @returns {Promise<{ abierta: boolean, respuesta?: any }>}
   */
  abrirPam(d) { return this.pedir('pam.abrir', d, 45000); }
  /**
   * Pasa `mensaje` a la pestaña de PAM que se abrió con abrirPam, hasta que conteste con `respuesta`.
   * @param {{ mensaje: any, respuesta: string }} d
   * @returns {Promise<{ abierta: boolean, respuesta?: any }>}
   */
  enviarPam(d) { return this.pedir('pam.enviar', d, 45000); }
}
