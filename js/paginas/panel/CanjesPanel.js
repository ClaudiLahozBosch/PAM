// @ts-check
// La tarjeta «⚖ Canjes» del panel «Mi PJ» (pam-mi-pj.user.js 1.7.1, pintarCanje y accionesCanjes), portada a PAM sin
// cambiar lo que se ve: los mismos elementos, clases y textos. Lo que lee y publica está en js/servicios/CanjesDelForo.js.
// Lo que cambia: lo guardado está en el almacén del agente (se lee al abrir el panel y después de cada cambio) y,
// al publicar, es el agente quien lleva la página del foro al mensaje nuevo (el panel está en un iframe).
// «Terminar en PAM» abre PAM por el canal oficial en los dos foros (Mi PJ, en el de pruebas, iba por su almacén).
import { formato, numero, describirAprobacion } from '../../reglas/Canjes.js?v=2.0.0';

/**
 * @param {{ documento: Document, servicio: ReturnType<typeof import('../../servicios/CanjesDelForo.js').crearCanjesDelForo> | null,
 *   datos: () => any, actualizar: () => Promise<any>, abrirPanel: () => void, irA: (ruta: string) => Promise<any>,
 *   puerta: (accion: any) => Promise<any>, enviarAPam: (op: { esperarCierre: boolean }) => void }} dep
 */
export function crearTarjetaCanjes({ documento, servicio, datos, actualizar, abrirPanel, irA, puerta, enviarAPam }) {
  /** Lo guardado (se lee del agente): la petición preparada en PAM y las peticiones de la cuenta. */
  let captura = null, peticiones = [];
  let msgCanje = null;
  let caja = null;

  function el(tag, attrs, hijos) {
    const e = documento.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      if (k === 'texto') e.textContent = attrs[k];
      else if (k === 'clase') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (hijos || []).forEach(h => { if (h) e.appendChild(h); });
    return e;
  }

  /** Vuelve a leer lo guardado y repinta. */
  async function recargar() {
    if (!servicio) return;
    // cada cosa por su lado: si una no se puede leer, la otra se enseña igual
    const [c, d] = await Promise.allSettled([servicio.leerCaptura(), servicio.datosCuenta()]);
    if (c.status === 'fulfilled') captura = c.value;
    if (d.status === 'fulfilled') peticiones = d.value.peticiones || [];
    repintar();
  }
  const repintar = () => { if (caja && caja.isConnected) pintar(caja); };

  /** @param {HTMLElement|null} c la tarjeta #mipj-canjes del panel */
  function pintar(c) {
    if (!c || !servicio) return;
    caja = c;
    caja.innerHTML = '';
    caja.appendChild(el('div', { clase: 'ct', texto: '⚖ Canjes' }));
    if (msgCanje) caja.appendChild(el('div', { clase: msgCanje.error ? 'err' : 'nota', texto: msgCanje.texto }));
    const aviso = (texto, error) => { msgCanje = { texto, error: !!error }; repintar(); };
    const boton = (texto, pri, fn) => {
      const b = el('button', { clase: 'b' + (pri ? ' pri' : ''), type: 'button', texto });
      b.addEventListener('click', ev => { msgCanje = null; fn(b, ev); });
      return b;
    };
    const fila2 = hijos => { const d = el('div', { clase: 'row' }, hijos); d.style.display = 'flex'; d.style.flexWrap = 'wrap'; d.style.gap = '8px'; d.style.justifyContent = 'flex-end'; d.style.marginTop = '8px'; return d; };

    const capt = captura;
    if (capt) {
      caja.appendChild(el('div', { clase: 'row' }, [el('b', { texto: 'Petición preparada en PAM' })]));
      caja.appendChild(el('div', { clase: 'dim', texto: capt.pj + ' · ' + formato(numero(capt.gastadas)) + ' grageas · ' + new Date(capt.creado).toLocaleString('es-AR') }));
      caja.appendChild(fila2([
        boton('Descartar', false, () => { captura = null; repintar(); servicio.descartarCaptura(capt).catch(() => {}).then(recargar); }),
        boton('Publicar en el registro', true, b => { publicar(capt, b, aviso); })
      ]));
    }
    const pets = peticiones.filter(p => !p.cerrada).slice(-3).reverse();
    pets.forEach(p => {
      const a = p.aprobacion;
      const bloque = el('div', { clase: 'rol' });
      const rt = el('div', { clase: 'rt' }, [el('a', { href: p.enlace, target: '_blank', rel: 'noopener', texto: 'Petición · ' + formato(p.gastadas) + ' grageas' })]);
      bloque.appendChild(rt);
      caja.appendChild(bloque);
      if (p.noEncontrada) rt.appendChild(el('div', { clase: 'dim', texto: 'No la encuentro en las últimas páginas del registro.' }));
      if (!a) { rt.appendChild(el('div', { clase: 'dim', texto: 'Esperando a un Inspector de Canjes.' })); return; }
      const desc = describirAprobacion(a);
      rt.appendChild(el('span', { clase: 'badge ' + (a.confirmada ? 'ok' : 'warn'), texto: (a.confirmada ? '✓ ' : '◷ ') + desc }));
      rt.appendChild(el('div', { clase: 'dim' }, [documento.createTextNode(a.autor + ' · ' + a.fecha + ' · '), el('a', { href: a.enlace, target: '_blank', rel: 'noopener', texto: 'ver' })]));
      if (!a.confirmada) {
        rt.appendChild(el('div', { clase: 'nota', texto: '«' + a.extracto + '»' + (a.sinNombre ? ' — No te nombra: es la primera respuesta después de tu petición.' : '') + (!a.revisorConfirmado ? ' — No pude leer la lista de Inspectores: fijate vos.' : '') }));
        rt.appendChild(fila2([
          boton('No lo es', false, () => { confirmar(p, false); }),
          boton('Es la aprobación', true, () => { confirmar(p, true); })
        ]));
      } else if (!p.aplicada) {
        if (!p.boveda && !p.ficha && !p.cambiosFicha) rt.appendChild(el('div', { clase: 'dim', texto: 'Preparada sin los códigos de PAM: aplicala a mano.' }));
        rt.appendChild(fila2([boton('Aplicar el canje', true, b => { aplicar(p, b, aviso); })]));
      } else {
        rt.appendChild(el('div', { clase: 'dim', texto: 'Aplicado en el foro el ' + new Date(p.aplicada.fecha).toLocaleString('es-AR') + '.' + (p.enPAM ? ' Cerrado en PAM.' : '') }));
        rt.appendChild(fila2([boton(p.enPAM ? 'Volver a cerrar en PAM' : 'Terminar en PAM', !p.enPAM, () => { terminar(p).then(err => { if (err) aviso(err, true); }); })]));
      }
    });
    if (!capt && !pets.length) {
      caja.appendChild(el('div', { clase: 'dim', texto: 'Para pedir un canje: en PAM armá el carrito y tocá «Preparar el canje» en la pastilla Mi PJ.' }));
    }
  }

  /** «Publicar en el registro»: la puerta del agente; si se publica, el foro va al mensaje nuevo. */
  async function publicar(pet, b, aviso) {
    if (!datos()) { aviso('Primero tocá «Actualizar»: la cabecera de la petición necesita tu bóveda.', true); return; }
    b.disabled = true;
    try {
      const r = await servicio.publicar(pet, datos());
      if (r.enlace) { await irA(new URL(r.enlace).pathname + new URL(r.enlace).search + new URL(r.enlace).hash); }
      else if (r.sinEncontrar) aviso('Publicada, pero no encuentro el mensaje en el registro. Tocá «Actualizar».');
      else if (r.igual) aviso('Esta petición ya estaba publicada en el registro: no se publicó otra vez.');
    } catch (e) { aviso(e instanceof Error ? e.message : String(e), true); }
    await recargar();
  }

  function confirmar(p, si) { servicio.confirmar(p, si).catch(() => {}).then(recargar); }

  /**
   * «Aplicar el canje»: la puerta del agente con bóveda, movimiento, ficha y aviso. Si todo va bien, la petición queda
   * aplicada y se vuelve a leer el foro; con «Terminar en PAM» (en la misma puerta) se sigue en PAM.
   */
  async function aplicar(p, b, aviso) {
    b.disabled = true;
    try {
      const accion = await servicio.accionAplicarCanje(p, datos());
      accion.enlaceFinal = { texto: 'Terminar en PAM' };
      const res = await puerta(accion);
      if (res.resultado === 'aceptada' || res.resultado === 'igual') {
        await servicio.marcarAplicada(p, res.pasos && res.pasos[1] && res.pasos[1].post);
        // primero PAM (el navegador solo deja abrir la pestaña justo después del clic) y después se relee el foro
        if (res.siguiente) { const err = await terminar(p); if (err) aviso(err, true); }
        actualizar();
      }
    } catch (e) { aviso(e instanceof Error ? e.message : String(e), true); }
    await recargar();
  }

  /** «Terminar en PAM»: le deja a PAM lo que necesita para cerrar el canje y lo abre; los datos nuevos van después. */
  async function terminar(p) {
    if (!datos()) return 'Primero tocá «Actualizar».';
    await servicio.dejarCierre(p);
    enviarAPam({ esperarCierre: true });
    return null;
  }

  /** Llegada desde PAM con «Ir al foro a publicar la petición» (#escriba-publicar): se abre sola la puerta. */
  async function alCargarForo(cuentaNombre) {
    if (!servicio) return;
    abrirPanel();
    await recargar();
    if (!captura) {
      msgCanje = { texto: 'Llegaste desde PAM, pero no hay ninguna petición pendiente para esta cuenta (' + cuentaNombre + '). ¿Estás con la cuenta del personaje?', error: true };
      repintar();
      return;
    }
    const d = datos();
    const viejo = !d || Date.now() - new Date(d.leido).getTime() > 10 * 60 * 1000;
    if (viejo) await actualizar();
    await recargar();
    const aviso = (texto, error) => { msgCanje = { texto, error: !!error }; repintar(); };
    if (captura) await publicar(captura, el('button'), aviso);
  }

  return { pintar, recargar, alCargarForo, terminar, get captura() { return captura; }, get peticiones() { return peticiones; } };
}
