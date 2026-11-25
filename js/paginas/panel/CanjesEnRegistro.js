// @ts-check
// En el Registro de Canjes, debajo de cada petición TUYA que un Inspector ya aprobó, una barra de Mi PJ. Es otra
// entrada al MISMO camino que la tarjeta «⚖ Canjes» del panel (2.3.1: antes eran dos caminos que no se veían entre sí):
// la barra y la tarjeta leen y escriben el mismo registro de la petición («pam.cuentas.<foro>.<cuenta>», CanjesDelForo)
// y sus botones son los de la tarjeta.
//   1. «Llevar a PAM» (si la petición no se preparó en PAM): lee la petición tal como está en el foro (el lector del
//      Inspector), la deja para PAM («pam.llevar») y abre PAM. Ahí (js/pam/LlevarCanjePam.js) se suma a «Mi Ficha» y se
//      prepara el movimiento en su Bóveda, como «Preparar el canje»; y la petición queda registrada con sus códigos.
//   2. «Aplicar en el foro»: el «Aplicar el canje» de la tarjeta: primer mensaje de la bóveda, movimiento, ficha (solo
//      los mensajes que cambian) y aviso en la ficha, por la puerta del agente.
//   3. «Terminar en PAM»: el de la tarjeta: PAM pone los enlaces y hace «Ya lo publiqué» en su Bóveda.
//   Hecho todo (por la barra o por la tarjeta): «✓ Canje terminado».
// Solo lee el foro; lo que se pinta lo pone el agente («canje.pintar») y los clics vuelven aquí («canje.accion»).
import { crearRevision } from '../../inspector/Revision.js?v=2.5.1';
import { tablaDeDatos, prepararTabla } from '../../inspector/Tabla.js?v=2.5.1';
import { CSS_INSPECTOR } from '../../inspector/estilosInspector.js?v=2.5.1';
import { CLAVE_LLEVAR, cambiosDePedido, paqueteLlevar, importeCanje } from '../../reglas/LlevarCanje.js?v=2.5.1';
import { enlacePost, formato } from '../../reglas/Canjes.js?v=2.5.1';
import { autorDeMensaje, esDeCuenta } from '../../lectores/LectorTema.js?v=2.5.1';

const CSS_EXTRA = '.icj .cj-msg{flex-basis:100%;font-size:12.5px;color:var(--x-dim)}.icj .cj-msg.err{color:var(--x-bad)}.icj .cj-msg.ok{color:var(--x-good)}';
const APROBADA = ['aprobada', 'corregida'];

/**
 * @param {{ agente: any, hola: any, cfg: any, servicio: any, tarjeta: any, memoria: { gv(k: string, d: any): any, sv(k: string, v: any): void },
 *   cargarDatos: (forzar: boolean) => Promise<{ sistema: any, calculadora: any, compendio: any }>,
 *   permitido?: () => boolean, documento?: Document }} dep  `tarjeta`: la de «⚖ Canjes» (CanjesPanel: aplicarCanje, terminar)
 */
export function crearCanjesEnRegistro({ agente, hola, cfg, servicio, tarjeta, memoria, cargarDatos, permitido = () => true, documento = document }) {
  const tema = String(cfg?.registroCanjes || '').match(/\/t(\d+)/)?.[1];
  const enRegistro = !!(tema && servicio && hola.cuenta && new RegExp('^/t' + tema + '(p\\d+)?-').test(hola.ruta || ''));
  const origen = 'https://' + hola.foro;
  const R = crearRevision({ leer: r => agente.leer(r) });
  const docUI = documento.implementation.createHTMLDocument('');
  /** @type {Map<string, { id: string, pedido: any, aprobacion: any, msg: { texto: string, clase: string } | null, ocupado: string }>} */
  const peticiones = new Map();
  /** El registro compartido con la tarjeta: post → petición. */
  let registradas = {}, puesto = false, tabla = null, esperando = false;

  const cargarTabla = () => (tabla ??= cargarDatos(false).then(d => prepararTabla(tablaDeDatos(d.sistema, d.calculadora, d.compendio)), e => { tabla = null; throw e; }));
  const releer = async () => { try { registradas = Object.fromEntries(((await servicio.datosCuenta()).peticiones || []).map(x => [String(x.post), x])); } catch { /* lo de antes */ } };

  function el(tag, attrs, hijos) {
    const e = docUI.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'texto') e.textContent = v; else if (k === 'clase') e.className = v; else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : String(v)); });
    (hijos || []).forEach(h => { if (h) e.appendChild(h); });
    return e;
  }
  const boton = (p, accion, texto, pri, extra = {}) => el('button', { clase: 'b' + (pri ? ' pri' : ''), type: 'button', 'data-cj': accion, 'data-p': p.id, disabled: !!p.ocupado, ...extra, texto });

  /** En qué punto está: sin preparar · preparada (falta aplicar en el foro) · aplicada (falta cerrar en PAM) · terminada. */
  function estado(p) {
    const x = registradas[p.id];
    if (!x) return { paso: 'llevar' };
    if (x.enPAM || x.cerrada) return { paso: 'hecho', x };
    if (x.aplicada) return { paso: 'terminar', x };
    if (x.boveda || x.cambiosFicha || x.ficha) return { paso: 'aplicar', x };
    return { paso: 'llevar', x };
  }

  /** La barra de una petición aprobada. */
  function barra(p) {
    const a = p.aprobacion, e = estado(p);
    const quien = a.clase === 'corregida' ? '✓ Aprobado por ' + a.autor + ' · ' + formato(a.importe) + ' grageas' : '✓ Aprobado por ' + a.autor;
    const hijos = [el('span', { clase: 'marca', texto: 'Mi PJ' }), el('span', { clase: 'chip ' + (a.confirmada ? 'ok' : 'warn'), texto: quien, title: a.confirmada ? '' : 'No pude confirmar que sea un Inspector de Canjes: fijate vos.' })];
    if (e.paso === 'aplicar') hijos.push(el('span', { clase: 'chip ok', texto: '✓ Preparado en PAM' }));
    if (e.paso === 'terminar') hijos.push(el('span', { clase: 'chip ok', texto: '✓ Aplicado en el foro' }));
    if (e.paso === 'hecho') hijos.push(el('span', { clase: 'chip ok', texto: '✓ Canje terminado' }));
    hijos.push(el('span', { clase: 'esp' }));
    if (e.paso === 'llevar') hijos.push(boton(p, 'llevar', p.ocupado === 'llevar' ? 'Abriendo PAM…' : '✦ Llevar a PAM', true));
    if (e.paso === 'aplicar') {
      hijos.push(boton(p, 'llevar', '↻ Llevar a PAM otra vez', false));
      hijos.push(boton(p, 'aplicar', p.ocupado === 'aplicar' ? 'Leyendo tu bóveda y tu ficha…' : 'Aplicar en el foro', true, { title: 'Bóveda (números y movimiento), ficha y aviso en la ficha. Te muestra todo antes de tocar nada.' }));
    }
    if (e.paso === 'terminar') hijos.push(boton(p, 'terminar', 'Terminar en PAM', true, { title: 'PAM pone los enlaces en su Bóveda y hace «Ya lo publiqué».' }));
    if (p.msg) hijos.push(el('div', { clase: 'cj-msg ' + p.msg.clase, texto: p.msg.texto }));
    return el('div', { clase: 'icj icj-barra' }, hijos).outerHTML;
  }

  function pintar() {
    if (!puesto) return Promise.resolve();
    const barras = {};
    peticiones.forEach(p => { if (p.aprobacion) barras[p.id] = barra(p); });
    return agente.pedir('canje.pintar', { css: CSS_INSPECTOR + '\n' + CSS_EXTRA, barras }).catch(() => {});
  }

  /** Lee la página: tus peticiones, y para cada una la respuesta del Inspector (la aprobada se recuerda). */
  async function iniciar() {
    if (!enRegistro || !permitido() || puesto) return;
    puesto = true;
    cargarTabla().catch(() => {}); // ya cargada al tocar «Llevar a PAM» (así PAM se abre enseguida tras el clic)
    const doc = await agente.leer(hola.ruta);
    // el autor, por id si el foro enlaza su perfil y si no por el nombre (LectorTema, el mismo para todo Mi PJ)
    const propios = R.mensajesDe(doc).filter(post => esDeCuenta(autorDeMensaje(post), hola.cuenta));
    for (const post of propios) {
      const id = post.id.replace(/\D/g, '');
      const pedido = R.leerPedido(post.querySelector('.content'));
      if (pedido.items.length) peticiones.set(id, { id, pedido, aprobacion: null, msg: null, ocupado: '' });
    }
    if (!peticiones.size) return;
    await releer();
    const revisores = await servicio.leerGruposRevisores(false).catch(() => null);
    for (const p of peticiones.values()) {
      const x = registradas[p.id], k = 'mipj.cj.apr.' + p.id, guardada = memoria.gv(k, null);
      if (x && x.aprobacion && x.aprobacion.confirmada) p.aprobacion = x.aprobacion; // ya la confirmó la tarjeta
      else if (guardada && guardada.confirmada) p.aprobacion = guardada;
      else {
        try {
          const a = await servicio.buscarAprobacion(revisores, { post: p.id, pj: hola.cuenta.nombre, descartadas: (x && x.descartadas) || [] }, { fueraDelGrupo: true });
          if (a && a.post && APROBADA.includes(a.clase)) { p.aprobacion = a; memoria.sv(k, a); }
        } catch { /* se reintenta al volver a abrir la página */ }
      }
      if (!puesto) return;
      if (p.aprobacion) await pintar();
    }
  }

  function quitar() {
    if (!puesto) return;
    puesto = false;
    agente.pedir('canje.quitar', {}).catch(() => {});
  }

  /** Al volver a la pestaña del foro (o cuando PAM avisa): se relee el registro y se repinta. */
  async function refrescar() {
    if (!puesto || !peticiones.size) return;
    const antes = JSON.stringify(registradas);
    await releer();
    if (JSON.stringify(registradas) === antes) return;
    if (tarjeta && tarjeta.recargar) tarjeta.recargar().catch(() => {}); // la tarjeta del panel, igual
    peticiones.forEach(p => {
      if (p.ocupado === 'pam') { p.ocupado = ''; p.msg = estado(p).paso === 'aplicar' ? { texto: 'Listo en PAM. Ahora «Aplicar en el foro»: bóveda, ficha y aviso.', clase: 'ok' } : null; }
    });
    esperando = [...peticiones.values()].some(p => p.ocupado === 'pam');
    await pintar();
  }

  async function llevar(p) {
    p.ocupado = 'llevar'; p.msg = null; await pintar();
    try {
      const T = await cargarTabla();
      const clasificados = p.pedido.items.map(it => { const c = R.clasificar(it, T); c.item = it; return c; });
      const { cambios, aMano } = cambiosDePedido(clasificados);
      const suma = p.pedido.items.reduce((s, it) => s + (it.precio || 0), 0);
      const total = importeCanje(p.aprobacion, p.pedido, suma);
      await agente.guardarDato(CLAVE_LLEVAR, paqueteLlevar({ foro: hola.foro, cuenta: hola.cuenta, post: p.id, enlacePet: enlacePost(origen, p.id), aprobacion: p.aprobacion, total, cambios, aMano }));
      const r = await agente.abrirPam({ hash: '#ficha' });
      if (!r || !r.abierta) { p.ocupado = ''; p.msg = { texto: 'El navegador bloqueó la ventana de PAM: permití ventanas emergentes para el foro y volvé a tocar «Llevar a PAM».', clase: 'err' }; }
      else { p.ocupado = 'pam'; esperando = true; p.msg = { texto: 'En PAM: revisá y tocá «Aceptar». Cuando vuelvas acá se actualiza solo.', clase: '' }; }
    } catch (e) { p.ocupado = ''; p.msg = { texto: e instanceof Error ? e.message : String(e), clase: 'err' }; }
    await pintar();
  }

  /** «Aplicar en el foro» y «Terminar en PAM»: los mismos de la tarjeta «⚖ Canjes». */
  async function deLaTarjeta(p, que) {
    const x = registradas[p.id];
    if (!x || !tarjeta) return;
    p.ocupado = que; p.msg = null; await pintar();
    let err = null;
    try { err = que === 'aplicar' ? await tarjeta.aplicarCanje(x) : await tarjeta.terminar(x); }
    catch (e) { err = e instanceof Error ? e.message : String(e); }
    p.ocupado = '';
    if (err) p.msg = { texto: err, clase: 'err' };
    else if (que === 'terminar') { p.ocupado = 'pam'; esperando = true; p.msg = { texto: 'En PAM: revisá y tocá «Aceptar».', clase: '' }; }
    await releer();
    if (tarjeta && tarjeta.recargar) tarjeta.recargar().catch(() => {});
    await pintar();
  }

  /** Los clics de la barra (los pasa el agente). */
  function accion(d) {
    const p = peticiones.get(String(d && d.p));
    if (!p || p.ocupado && p.ocupado !== 'pam') return {};
    if (d.accion === 'llevar') llevar(p);
    else if (d.accion === 'aplicar' || d.accion === 'terminar') deLaTarjeta(p, d.accion);
    return {};
  }

  if (enRegistro) {
    agente.atender('canje.accion', accion);
    documento.addEventListener('visibilitychange', () => { if (!documento.hidden) refrescar(); });
    const t = setInterval(() => { if (esperando) refrescar(); }, 3000);
    if (typeof t === 'object' && t && 'unref' in t) t.unref(); // (en las pruebas, que no deje el proceso abierto)
  }

  return {
    enRegistro,
    iniciar: () => iniciar().catch(e => console.warn('[Mi PJ] canjes en el registro', e)),
    quitar,
    /** «Configurar Mi PJ» cambió. */
    revisar() { if (!permitido()) quitar(); else if (!puesto) iniciar().catch(() => {}); },
    /** PAM avisó que terminó (pam.cierre) o la tarjeta cambió algo: se relee y se repinta. */
    refrescar,
    alCierrePam: () => refrescar(),
    accion, barra, get peticiones() { return peticiones; }
  };
}
