// @ts-check
// El Inspector de Canjes en la página del Registro de Canjes (pam-inspector-canjes.user.js 1.1.0: iniciar,
// revisarUno, decidir, repintarPanel), dentro de PAM. PAM lee la página a través del agente, revisa y arma lo que
// se ve; el agente lo pinta en el foro y le devuelve los clics (`accion`). Solo lee: no publica ni edita nada
// («Pegar en la respuesta rápida» lo deja en el editor del foro, sin enviar; eso lo hace el agente).
import { tablaDeDatos, prepararTabla } from './Tabla.js?v=2.1.1';
import { CSS_INSPECTOR } from './estilosInspector.js?v=2.1.1';

/**
 * @param {{ agente: { leer(ruta: string): Promise<Document>, pedir(tipo: string, datos?: any, ms?: number): Promise<any> },
 *   R: ReturnType<typeof import('./Revision.js').crearRevision>, ui: ReturnType<typeof import('./InspectorUI.js').crearInspectorUI>,
 *   cargarDatos: (forzar: boolean) => Promise<{ sistema: any, calculadora: any, compendio: any }>, ruta: string }} dep
 */
export function crearInspector({ agente, R, ui, cargarDatos, ruta }) {
  const { norm, escRe, nombrePila, lineasDe } = R;
  /** @type {any[]} */ let pedidos = [];   // { post, D, res, decision: 'ok'|'fix'|null, revisadoPor, estado, error }
  const est = { abierto: false, todos: false, tabla: 'Tabla de Canjes de PAM: cargando…' };

  /* ---------- la Tabla (data/*.json; F12) ---------- */
  let tablaPromesa = null;
  function cargarTabla(forzar) {
    if (tablaPromesa && !forzar) return tablaPromesa;
    tablaPromesa = cargarDatos(forzar).then(d => {
      const T = prepararTabla(tablaDeDatos(d.sistema, d.calculadora, d.compendio));
      T._cuando = Date.now(); T._viejo = null;
      est.tabla = 'Tabla de Canjes de PAM del ' + new Date(T._cuando).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
      return T;
    }, e => {
      tablaPromesa = null;
      const m = 'No pude leer la Tabla de Canjes de PAM (' + (e instanceof Error ? e.message : String(e)) + ').';
      est.tabla = m;
      throw new Error(m);
    });
    return tablaPromesa;
  }

  /* ---------- lo que se pinta ---------- */
  function pintar() {
    const barras = {}, cajas = {};
    pedidos.forEach(r => { barras[r.D.id] = ui.barra(r); cajas[r.D.id] = ui.caja(r); });
    return agente.pedir('inspector.pintar', { css: CSS_INSPECTOR, barras, cajas, panel: ui.panel(pedidos, { ...est, respuesta: R.textoRespuesta(pedidos) }) }).catch(() => {});
  }

  /** Lee los pedidos de la página (y si alguien ya respondió nombrando al PJ), como el Inspector antiguo. */
  async function iniciar() {
    const doc = await agente.leer(ruta);
    const posts = R.mensajesDe(doc);
    const datos = posts.map(p => ({ post: p, D: R.datosDelPost(p), pedido: R.leerPedido(p.querySelector('.content')) }));
    pedidos = [];
    datos.forEach((x, i) => {
      if (!x.pedido.items.length && !x.pedido.devoluciones.length) return;
      // ¿alguien respondió después nombrando al PJ?
      const pila = norm(nombrePila(x.D.nombre));
      let resp = null;
      for (let j = i + 1; j < datos.length && !resp; j++) {
        const y = datos[j];
        if (y.D.autor === x.D.autor || y.pedido.items.length) continue;
        const txt = norm(lineasDe(y.post.querySelector('.content')).join(' '));
        if (new RegExp('(^|[^a-z])' + escRe(pila) + '([^a-z]|$)').test(txt)) resp = { nombre: y.D.nombre, id: y.D.id, positivo: /correct|pued(e|en|es) (anadir|agregar)|podeis/.test(txt) };
      }
      pedidos.push({ post: x.post, D: x.D, res: null, decision: null, revisadoPor: resp, estado: 'listo', error: null });
    });
    await pintar();
    cargarTabla(false).then(pintar, pintar); // se avisa al revisar
  }

  async function revisarUno(reg) {
    reg.estado = 'revisando'; reg.error = null;
    await pintar();
    try {
      const T = await cargarTabla(false);
      const res = await R.revisar(reg.post, T);
      res.T = T;
      // las casillas de los problemas: marcadas las graves (las que van en la respuesta)
      res.items.forEach(x => x.problemas.forEach(q => { q.incluir = q.grave; }));
      reg.res = res;
    } catch (e) { reg.error = e instanceof Error ? e.message : String(e); }
    reg.estado = 'listo';
    await pintar();
  }

  /** Lo que el agente devuelve al tocar algo marcado con `data-icj`. */
  async function accion(d) {
    const reg = pedidos.find(r => String(r.D.id) === String(d.p));
    switch (d.accion) {
      case 'revisar': if (reg && reg.estado !== 'revisando') revisarUno(reg); break;
      case 'decidir': if (reg) { reg.decision = reg.decision === d.v ? null : (d.v === 'ok' || d.v === 'fix' ? d.v : null); await pintar(); } break;
      case 'prob': {
        const q = reg && reg.res && reg.res.items[+d.i] && reg.res.items[+d.i].problemas[+d.k];
        if (q) { q.incluir = !!d.checked; await pintar(); }
        break;
      }
      case 'abrir': est.abierto = true; await pintar(); break;
      case 'cerrar': est.abierto = false; await pintar(); break;
      case 'todos': {
        const pendientes = pedidos.filter(r => !r.revisadoPor && !r.res);
        est.todos = true; await pintar();
        for (const r of pendientes) await revisarUno(r);
        est.todos = false; await pintar();
        break;
      }
      case 'tabla': est.tabla = 'Actualizando…'; await pintar(); cargarTabla(true).then(pintar, pintar); break;
      default: break;
    }
    return {};
  }

  /** Quita todo lo del Inspector de la página (al apagar el modo Inspector). */
  const quitar = () => agente.pedir('inspector.quitar', {}).catch(() => {});

  return { iniciar, accion, quitar, get pedidos() { return pedidos; } };
}
