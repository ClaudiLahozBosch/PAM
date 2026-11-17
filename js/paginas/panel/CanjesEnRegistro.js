// @ts-check
// 2.3.0 · En el Registro de Canjes, debajo de cada petición TUYA que un Inspector ya aprobó, una barra de Mi PJ con:
//   · «Llevar a PAM»: lee la petición tal como está en el foro (el lector del Inspector, js/inspector/Revision.js),
//     la deja para PAM («pam.llevar», js/reglas/LlevarCanje.js) y abre PAM, que suma el canje a «Mi Ficha» y descuenta
//     las grageas en su Bóveda (js/pam/LlevarCanjePam.js; la puerta de PAM pregunta antes).
//   · «Aplicar cambio a la ficha»: con lo que cambió en la ficha de PAM al llevarlo, edita tu ficha del foro mensaje a
//     mensaje (el mismo editor que «Aplicar el canje», CanjesDelForo.pasosFichaPorMensajes), por la puerta del agente:
//     nada se edita sin «Aceptar» viendo exactamente qué cambia.
// Solo lee el foro; lo que se pinta lo pone el agente («canje.pintar») y los clics vuelven aquí («canje.accion»).
import { crearRevision } from '../../inspector/Revision.js?v=2.3.1';
import { tablaDeDatos, prepararTabla } from '../../inspector/Tabla.js?v=2.3.1';
import { CSS_INSPECTOR } from '../../inspector/estilosInspector.js?v=2.3.1';
import { CLAVE_LLEVAR, claveLlevados, cambiosDePedido, paqueteLlevar, importeCanje } from '../../reglas/LlevarCanje.js?v=2.3.1';
import { enlacePost, formato, normNombre } from '../../reglas/Canjes.js?v=2.3.1';

const CSS_EXTRA = '.icj .cj-msg{flex-basis:100%;font-size:12.5px;color:var(--x-dim)}.icj .cj-msg.err{color:var(--x-bad)}.icj .cj-msg.ok{color:var(--x-good)}';
const APROBADA = ['aprobada', 'corregida'];
const fecha = iso => { try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }); } catch { return ''; } };

/**
 * @param {{ agente: any, hola: any, cfg: any, servicio: any, datos: () => any, actualizar: () => Promise<any>,
 *   memoria: { gv(k: string, d: any): any, sv(k: string, v: any): void },
 *   cargarDatos: (forzar: boolean) => Promise<{ sistema: any, calculadora: any, compendio: any }>,
 *   permitido?: () => boolean, documento?: Document }} dep
 */
export function crearCanjesEnRegistro({ agente, hola, cfg, servicio, datos, actualizar, memoria, cargarDatos, permitido = () => true, documento = document }) {
  const tema = String(cfg?.registroCanjes || '').match(/\/t(\d+)/)?.[1];
  const enRegistro = !!(tema && servicio && hola.cuenta && new RegExp('^/t' + tema + '(p\\d+)?-').test(hola.ruta || ''));
  const origen = 'https://' + hola.foro;
  const CLAVE = claveLlevados(hola.foro || '', hola.cuenta?.id);
  const R = crearRevision({ leer: r => agente.leer(r) });
  const docUI = documento.implementation.createHTMLDocument('');
  /** @type {Map<string, { id: string, pedido: any, aprobacion: any, msg: { texto: string, clase: string } | null, ocupado: string, desde: string }>} */
  const peticiones = new Map();
  let llevados = {}, puesto = false, tabla = null, esperando = 0;

  const cargarTabla = () => (tabla ??= cargarDatos(false).then(d => prepararTabla(tablaDeDatos(d.sistema, d.calculadora, d.compendio)), e => { tabla = null; throw e; }));
  const releerLlevados = async () => { try { llevados = ((await agente.leerDato(CLAVE)) || {}).posts || {}; } catch { /* lo de antes */ } };

  function el(tag, attrs, hijos) {
    const e = docUI.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'texto') e.textContent = v; else if (k === 'clase') e.className = v; else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : String(v)); });
    (hijos || []).forEach(h => { if (h) e.appendChild(h); });
    return e;
  }

  /** La barra de una petición aprobada. */
  function barra(p) {
    const a = p.aprobacion, ll = llevados[p.id];
    const quien = a.clase === 'corregida' ? '✓ Aprobado por ' + a.autor + ' · ' + formato(a.importe) + ' grageas' : '✓ Aprobado por ' + a.autor;
    const hijos = [el('span', { clase: 'marca', texto: 'Mi PJ' }), el('span', { clase: 'chip ' + (a.confirmada ? 'ok' : 'warn'), texto: quien, title: a.confirmada ? '' : 'No pude confirmar que sea un Inspector de Canjes: fijate vos.' })];
    if (ll) hijos.push(el('span', { clase: 'chip ok', texto: '✓ En PAM el ' + fecha(ll.fecha) }));
    if (ll && ll.ficha) hijos.push(el('span', { clase: 'chip ok', texto: '✓ Ficha editada el ' + fecha(ll.ficha) }));
    hijos.push(el('span', { clase: 'esp' }));
    const ocupado = !!p.ocupado;
    hijos.push(el('button', { clase: 'b' + (ll ? '' : ' pri'), type: 'button', 'data-cj': 'llevar', 'data-p': p.id, disabled: ocupado, texto: p.ocupado === 'llevar' ? 'Abriendo PAM…' : ll ? '↻ Llevar a PAM otra vez' : '✦ Llevar a PAM' }));
    const puedeFicha = !!(ll && ll.cambiosFicha);
    hijos.push(el('button', { clase: 'b' + (puedeFicha && !ll.ficha ? ' pri' : ''), type: 'button', 'data-cj': 'ficha', 'data-p': p.id, disabled: ocupado || !puedeFicha,
      title: puedeFicha ? '' : 'Primero «Llevar a PAM»: así sé qué cambia en tu ficha.', texto: p.ocupado === 'ficha' ? 'Leyendo tu ficha…' : 'Aplicar cambio a la ficha' }));
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
    // 2.3.1: el foro no enlaza el perfil del autor de cada mensaje (ni con sesión): si no hay enlace, por el nombre
    const yo = normNombre(hola.cuenta.nombre);
    const esMio = post => {
      const a = post.querySelector('p.author a[href^="/u"]');
      if (a) return parseInt(((a.getAttribute('href') || '').match(/^\/u(\d+)/) || [])[1], 10) === hola.cuenta.id;
      const n = post.querySelector('p.author strong') || post.querySelector('p.author .usr_grp_clr');
      return !!n && normNombre(n.textContent) === yo;
    };
    const propios = R.mensajesDe(doc).filter(esMio);
    for (const post of propios) {
      const id = post.id.replace(/\D/g, '');
      const pedido = R.leerPedido(post.querySelector('.content'));
      if (pedido.items.length) peticiones.set(id, { id, pedido, aprobacion: null, msg: null, ocupado: '', desde: '' });
    }
    if (!peticiones.size) return;
    await releerLlevados();
    const revisores = await servicio.leerGruposRevisores(false).catch(() => null);
    for (const p of peticiones.values()) {
      const k = 'mipj.cj.apr.' + p.id, guardada = memoria.gv(k, null);
      if (guardada && guardada.confirmada) { p.aprobacion = guardada; continue; }
      try {
        const a = await servicio.buscarAprobacion(revisores, { post: p.id, pj: hola.cuenta.nombre, descartadas: [] }, { fueraDelGrupo: true });
        if (a && a.post && APROBADA.includes(a.clase)) { p.aprobacion = a; memoria.sv(k, a); }
      } catch { /* se reintenta al volver a abrir la página */ }
      if (!puesto) return;
      if (p.aprobacion) await pintar();
    }
  }

  function quitar() {
    if (!puesto) return;
    puesto = false;
    agente.pedir('canje.quitar', {}).catch(() => {});
  }

  /** Tras «Llevar a PAM»: al volver a la pestaña del foro (o cada tanto un rato) se mira si PAM ya lo cerró. */
  async function comprobarPam() {
    if (!esperando) return;
    await releerLlevados();
    let cambio = false;
    peticiones.forEach(p => { if (p.ocupado === 'pam' && llevados[p.id] && llevados[p.id].fecha > p.desde) { p.ocupado = ''; p.msg = { texto: 'Listo en PAM. Ahora podés tocar «Aplicar cambio a la ficha».', clase: 'ok' }; cambio = true; } });
    if (cambio) { esperando = [...peticiones.values()].filter(p => p.ocupado === 'pam').length; await pintar(); }
  }

  async function llevar(p) {
    p.ocupado = 'llevar'; p.msg = null; await pintar();
    try {
      const T = await cargarTabla();
      const clasificados = p.pedido.items.map(it => { const c = R.clasificar(it, T); c.item = it; return c; });
      const { cambios, aMano } = cambiosDePedido(clasificados);
      const suma = p.pedido.items.reduce((s, it) => s + (it.precio || 0), 0);
      const total = importeCanje(p.aprobacion, p.pedido, suma);
      await agente.guardarDato(CLAVE_LLEVAR, paqueteLlevar({ foro: hola.foro, cuenta: hola.cuenta, post: p.id, enlacePet: enlacePost(origen, p.id), enlaceAce: p.aprobacion.enlace, total, cambios, aMano }));
      const r = await agente.abrirPam({ hash: '#ficha' });
      if (!r || !r.abierta) { p.ocupado = ''; p.msg = { texto: 'El navegador bloqueó la ventana de PAM: permití ventanas emergentes para el foro y volvé a tocar «Llevar a PAM».', clase: 'err' }; }
      else { p.ocupado = 'pam'; p.desde = new Date().toISOString(); esperando++; p.msg = { texto: 'En PAM: revisá y tocá «Aceptar». Cuando vuelvas acá se actualiza solo.', clase: '' }; }
    } catch (e) { p.ocupado = ''; p.msg = { texto: e instanceof Error ? e.message : String(e), clase: 'err' }; }
    await pintar();
  }

  async function aplicarFicha(p) {
    const ll = llevados[p.id];
    if (!ll || !ll.cambiosFicha) { p.msg = { texto: 'Primero «Llevar a PAM».', clase: 'err' }; return pintar(); }
    p.ocupado = 'ficha'; p.msg = null; await pintar();
    try {
      let d = datos();
      if (!d || !d.ficha) { await actualizar(); d = datos(); }
      if (!d || !d.ficha || !d.ficha.url) throw new Error('No encuentro tu ficha: abrí Mi PJ y tocá «Actualizar».');
      const avisos = [];
      const pasos = await servicio.pasosFichaPorMensajes({ cambiosFicha: ll.cambiosFicha }, new URL(d.ficha.url, origen).pathname, avisos);
      if (ll.manual && ll.manual.length) avisos.push('PAM no pudo sumar esto a la ficha; hacelo a mano: ' + ll.manual.join(' · ') + '.');
      const res = await agente.puerta({
        titulo: 'Aplicar el canje a tu ficha',
        explicacion: 'Lo que cambió en tu ficha de PAM al llevar el canje (' + formato(ll.total) + ' grageas), aplicado a tu ficha del foro tal como está ahora: solo los mensajes que cambian.',
        avisos, pasos
      });
      if (res.resultado === 'aceptada' || res.resultado === 'igual' || res.resultado === 'parcial') {
        const dd = (await agente.leerDato(CLAVE)) || { posts: {} };
        if (dd.posts && dd.posts[p.id]) { dd.posts[p.id].ficha = new Date().toISOString(); await agente.guardarDato(CLAVE, dd); }
        await releerLlevados();
        p.msg = { texto: res.resultado === 'igual' ? 'Tu ficha ya tenía este canje.' : res.resultado === 'parcial' ? 'Se hizo una parte: mirá qué faltó en la puerta.' : 'Ficha editada.', clase: res.resultado === 'parcial' ? 'err' : 'ok' };
      }
    } catch (e) { p.msg = { texto: e instanceof Error ? e.message : String(e), clase: 'err' }; }
    p.ocupado = '';
    await pintar();
  }

  /** Los clics de la barra (los pasa el agente). */
  function accion(d) {
    const p = peticiones.get(String(d && d.p));
    if (!p || p.ocupado && p.ocupado !== 'pam') return {};
    if (d.accion === 'llevar') llevar(p);
    else if (d.accion === 'ficha') aplicarFicha(p);
    return {};
  }

  if (enRegistro) {
    agente.atender('canje.accion', accion);
    documento.addEventListener('visibilitychange', () => { if (!documento.hidden) comprobarPam(); });
    const t = setInterval(() => { if (esperando) comprobarPam(); }, 3000);
    if (typeof t === 'object' && t && 'unref' in t) t.unref(); // (en las pruebas, que no deje el proceso abierto)
  }

  return {
    enRegistro,
    iniciar: () => iniciar().catch(e => console.warn('[Mi PJ] canjes en el registro', e)),
    quitar,
    /** «Configurar Mi PJ» cambió. */
    revisar() { if (!permitido()) quitar(); else if (!puesto) iniciar().catch(() => {}); },
    /** PAM avisó que terminó (pam.cierre). */
    alCierrePam: () => comprobarPam(),
    accion, barra, get peticiones() { return peticiones; }
  };
}
