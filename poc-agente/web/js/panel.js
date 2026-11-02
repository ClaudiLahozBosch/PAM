// @ts-check
import { ClienteAgente } from './ClienteAgente.js';
import { PROTOCOLO } from './protocolo.js';
import { LectorForo } from './LectorForo.js';
import { RevisorBBCode } from './RevisorBBCode.js';

const CLAVE_FICHA = 'pam.poc.ficha';

class PaginaPanel {
  /** @param {ClienteAgente|null} agente */
  constructor(agente) {
    this.agente = agente;
    this.$ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
  }

  log(txt) { this.$('registro').textContent += new Date().toLocaleTimeString('es-ES') + ' ' + txt + '\n'; }

  pon(id, txt, clase = '') { const e = this.$(id); e.textContent = txt; e.className = 'res ' + clase; }

  async iniciar() {
    if (!this.agente) {
      this.pon('r-hola', 'Esta página tiene que abrirse desde el botón «PAM» del foro (con el script instalado).', 'mal');
      return;
    }
    this.agente.atender('editor.revisar', d => this.revisarEditor(d));
    this.$('b-leer').onclick = () => this.probarLectura();
    this.$('b-datos').onclick = () => this.probarDatos();
    this.$('b-publicar').onclick = () => this.probarPublicar();
    try {
      const h = await this.agente.hola();
      const cuenta = h.cuenta ? `${h.cuenta.nombre} (u${h.cuenta.id})` : 'sin sesión';
      const version = h.protocolo === PROTOCOLO ? '' : `\n⚠ El script habla el protocolo ${h.protocolo} y PAM el ${PROTOCOLO}: hay que actualizarlo.`;
      this.pon('r-hola', `✓ Agente ${h.agente} · protocolo ${h.protocolo}\nForo: ${h.foro} · Cuenta: ${cuenta}${version}`, version ? 'mal' : 'ok');
    } catch (e) { this.pon('r-hola', '✗ ' + e.message, 'mal'); }
  }

  async probarLectura() {
    this.pon('r-leer', 'Leyendo…');
    try {
      const t0 = performance.now();
      const doc = await this.agente.leer('/');
      const r = LectorForo.resumenIndice(doc);
      this.pon('r-leer', `✓ «${r.titulo}»\n${r.temasEnlazados} temas enlazados · ${r.conectado ? 'leído con tu sesión' : 'leído SIN sesión'} · ${Math.round(performance.now() - t0)} ms`, r.conectado ? 'ok' : 'mal');
    } catch (e) { this.pon('r-leer', '✗ ' + e.message, 'mal'); }
  }

  async probarDatos() {
    let directo;
    try { directo = localStorage.getItem(CLAVE_FICHA); } catch (e) { directo = 'error: ' + e.message; }
    let viaAgente;
    try { viaAgente = await this.agente.leerDato(CLAVE_FICHA); } catch (e) { viaAgente = 'error: ' + e.message; }
    const fmt = v => v == null ? 'vacío' : (typeof v === 'string' ? v : JSON.stringify(v));
    const ok = viaAgente && typeof viaAgente === 'object';
    this.pon('r-datos',
      `Guardado del navegador (directo): ${fmt(directo)}\nAlmacén del script (vía agente): ${fmt(viaAgente)}\n` +
      (ok ? (directo == null ? '✓ Lo esperado: dentro del foro PAM no ve su guardado, pero sí el del script.' : '✓ Llega por las dos vías (el navegador no separa el guardado).')
          : '✗ No hay ficha en el almacén del script: guárdala primero desde la página de PAM.'),
      ok ? 'ok' : 'mal');
  }

  async probarPublicar() {
    const tema = parseInt(/** @type {HTMLInputElement} */ (this.$('i-tema')).value, 10);
    if (!(tema > 0)) { this.pon('r-publicar', 'Pon el número de un tema de pruebas.', 'mal'); return; }
    this.pon('r-publicar', 'Esperando tu decisión en la ventana del script…');
    try {
      const r = await this.agente.responder(tema, `Prueba del agente de PAM (${new Date().toLocaleString('es-ES')}).\n[b]Negrita[/b] y [i]cursiva[/i].`, 'Prueba de concepto');
      if (!r.publicado) this.pon('r-publicar', r.decision === 'denegar' ? '✓ Denegado: no se ha publicado nada.' : `✗ No publicado (${r.estado}${r.detalle ? ': ' + r.detalle : ''}).`, r.decision === 'denegar' ? 'ok' : 'mal');
      else this.pon('r-publicar', `✓ Publicado${r.modificado ? ' (con tu modificación)' : ''}${r.post ? ' · mensaje ' + r.post : ''}.`, 'ok');
    } catch (e) { this.pon('r-publicar', '✗ ' + e.message, 'mal'); }
  }

  /** El agente pregunta antes de enviar un mensaje desde el editor del foro. */
  revisarEditor({ texto, ruta }) {
    const avisos = RevisorBBCode.revisar(String(texto || ''));
    this.pon('r-editor', `Revisado un mensaje en ${ruta}: ${avisos.length ? avisos.length + ' aviso(s)' : 'todo cuadra'}.`, avisos.length ? 'mal' : 'ok');
    this.log('editor.revisar → ' + avisos.length + ' avisos');
    return { avisos };
  }
}

new PaginaPanel(ClienteAgente.enPanel()).iniciar();
