// @ts-check
// Los canjes dentro de PAM (Mi PJ 1.7.1, «hitos 4 y 5 en PAM», montarPuentePAM), con el mismo aspecto y los mismos
// textos, pero sin pulsar botones de PAM: todo pasa por PamActual (las funciones de pamFicha y rrBoveda).
//   · Preparar el canje: con el carrito hecho, se aplica a la ficha de PAM («Traer de la calculadora»), se deja en la
//     Bóveda de PAM el movimiento con las grageas que se quitan y se guardan en el almacén del agente («pam.peticion»)
//     la petición, el código de la bóveda y qué cambia en la ficha (N07: la ficha como se importó del foro y con el
//     carrito, js/reglas/CambiosFicha.js). Con eso el foro aplica el canje sin volver a pasar por PAM, editando solo
//     los mensajes de la ficha donde está cada cosa.
//   · Cierre: tras publicarlo todo en el foro («pam.aprobacion»), se ponen los dos enlaces en la Bóveda de PAM y se
//     hace su «Ya lo publiqué».
// La pastilla «✦ Mi PJ · Canjes» es la de siempre (abajo a la derecha de PAM).
import { abrirPuerta, crearEl, estilos } from './ui/Puerta.js?v=2.1.3';
import { claveCuenta } from '../reglas/Canjes.js?v=2.1.3';
import { cambiosDeCanje } from '../reglas/CambiosFicha.js?v=2.1.3';

const CLAVE_PAQUETE = 'pam.paquete', CLAVE_PETICION = 'pam.peticion', CLAVE_APROBACION = 'pam.aprobacion';
const numero = txt => { const l = String(txt == null ? '' : txt).replace(/[^\d-]/g, ''); return l === '' || l === '-' ? NaN : parseInt(l, 10); };
const normNombre = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const ahoraISO = () => new Date().toISOString();
/** Números del «Formulario» de la Bóveda de PAM. */
function numerosFormulario(form) {
  const v = et => { const m = String(form).match(new RegExp('\\{Grageas ' + et + '»\\s*([+-]?\\d+)', 'i')); return m ? parseInt(m[1], 10) : NaN; };
  return { iniciales: v('iniciales'), cambio: v('que se añaden/quitan'), actuales: v('actuales'), totales: v('totales') };
}

/**
 * @param {{ agente: { leerDato(k: string): Promise<any>, guardarDato(k: string, v: any): Promise<any> },
 *   pam: ReturnType<typeof import('./PamActual.js').crearPamActual>, doc: Document, foros: Record<string, any> }} dep
 */
export function crearCanjesPam({ agente, pam, doc, foros }) {
  const el = crearEl(doc);
  const win = /** @type {any} */ (doc.defaultView);
  let abierta = false, abiertoPanel = false, aviso = { error: null, ok: null };
  /** @type {HTMLElement|null} */ let raiz = null;

  const leer = async k => { try { return await agente.leerDato(k); } catch (e) { return null; } };
  const pendiente = async k => { const p = await leer(k); return p && !p.usado ? p : null; };
  const marcarUsado = (k, paq, res) => { paq.usado = { fecha: ahoraISO(), resultado: res.resultado }; return agente.guardarDato(k, paq).catch(() => {}); };

  function tablaCambios(filas, origen) {
    const tb = el('tbody');
    filas.forEach(f => {
      const ahora = f.ahora === undefined || f.ahora === null ? '' : String(f.ahora);
      tb.appendChild(el('tr', {}, [el('td', { texto: f.etiqueta }), el('td', { clase: 'ahora', texto: ahora === '' ? '—' : ahora }), el('td', { clase: ahora !== String(f.input.value) ? 'cambia' : '' }, [f.input])]));
    });
    return el('table', { clase: 'p-tabla' }, [el('thead', {}, [el('tr', {}, [el('th', { texto: 'Campo' }), el('th', { texto: 'En PAM ahora' }), el('th', { texto: origen || 'Del foro' })])]), tb]);
  }
  const campoValor = valor => { const i = el('input', { type: 'text', value: String(valor), title: String(valor) }); i.readOnly = true; return i; };
  const avisoNombreCorto = (pj, nombrePj) => el('div', { clase: 'aviso', texto: 'En la Bóveda de PAM tu personaje se llama «' + pj.nombre + '», no «' + nombrePj + '». Se usará «' + pj.nombre + '». Si no es el correcto, tocá Denegar.' });

  /* ---------- lo que PAM muestra ahora en la Tabla de Canjes ---------- */
  async function leerPeticionPAM() {
    const base = await leer(CLAVE_PAQUETE);
    if (!base || !base.foro || !base.cuenta) return { error: 'Primero mandá tus datos desde el foro («Enviar a PAM»): así sé de qué cuenta es la petición.' };
    const t = pam.tablaCanjes();
    if (t.texto === null) return { error: 'PAM cambió: no encuentro el «Texto para copiar».' };
    if (!t.texto || /seleccionaste ningún canje/i.test(t.texto)) return { error: 'El carrito de PAM está vacío: elegí primero los canjes en la Tabla de Canjes.' };
    const a = pam.fichaActiva();
    const nombre = a && a.ficha && a.ficha.nombre;
    if (!nombre) return { error: 'No hay ninguna ficha activa en «Mi Ficha» de PAM.' };
    if (normNombre(nombre) !== normNombre(base.pj)) return { error: 'La ficha activa de PAM es «' + nombre + '», pero los últimos datos del foro son de «' + base.pj + '». Mandá los datos desde el foro con la cuenta de ese personaje.' };
    return { v: 2, foro: base.foro, cuenta: base.cuenta, pj: nombre, texto: t.texto, disponibles: t.disponibles, gastadas: t.gastadas, restantes: t.restantes, plantilla: a.ficha.plantilla || null };
  }

  /* ---------- Preparar el canje ---------- */
  function accionPreparar(pet, captura) {
    const gastadas = numero(pet.gastadas);
    const busca = pam.pjBoveda(pet.pj);
    // N07: ya no hace falta el código «Personalizada»: se apunta qué cambia y en el foro se edita mensaje a mensaje
    const pasoFicha = {
      tipo: 'pam', titulo: 'Mi Ficha · aplicar el carrito a la ficha',
      vista: el('div', { clase: 'p-nota', texto: 'Se pulsa «Traer de la calculadora»: los canjes del carrito pasan a la ficha de PAM y se apunta qué cambia. Cuando el canje esté aprobado, Mi PJ hace lo mismo en tu ficha del foro, solo en los mensajes donde está cada cosa. En el foro no se toca nada hasta entonces.' }),
      ejecutar: () => {
        const previa = pam.fichaEnMemoria();
        pam.traerCalculadora();
        const ahora = pam.fichaEnMemoria();
        pam.verSeccion('ficha');
        if (!ahora) throw new Error('No encuentro la ficha activa de PAM.');
        // «antes»: la ficha como se importó del foro (así preparar dos veces da lo mismo); si no se importó, la de un momento antes
        const base = ahora.plantilla && ahora.plantilla.base;
        captura.cambiosFicha = cambiosDeCanje(base || previa, ahora);
        return { estado: 'ok' };
      }
    };

    let pasoBoveda;
    if (busca.omitido) pasoBoveda = { tipo: 'pam', titulo: 'Bóveda de PAM · grageas que se quitan', omitido: busca.omitido };
    else {
      const pj = busca.pj, bv = pj.boveda || {};
      // Los enlaces de una petición anterior se vacían: los de esta se ponen al aplicar el canje.
      const campos = [{ k: 'delta', etiqueta: 'Grageas que se añaden/quitan', valor: '-' + gastadas }, { k: 'pet', etiqueta: 'Enlace de la petición', valor: '' }, { k: 'ace', etiqueta: 'Enlace de la aceptación', valor: '' }]
        .map(c => ({ ...c, ahora: bv[c.k], input: campoValor(c.valor) }));
      const cambian = campos.filter(c => String(c.ahora == null ? '' : c.ahora).trim() !== c.valor);
      // Lo que ya había en esos campos es un movimiento anterior que no se cerró con «Ya lo publiqué».
      const restos = campos.filter(c => { const v = String(c.ahora == null ? '' : c.ahora).trim(); return v && v !== c.valor; });
      pasoBoveda = {
        tipo: 'pam', titulo: 'Bóveda de PAM · grageas que se quitan',
        vista: el('div', { clase: 'p-vista' }, [
          busca.aproximado ? avisoNombreCorto(pj, pet.pj) : null,
          el('div', { clase: 'p-nota', texto: 'Con esto PAM prepara el «Código para la bóveda». Los enlaces de la petición y de la aprobación se añaden al aplicar el canje en el foro.' }),
          restos.length ? el('div', { clase: 'aviso', texto: 'La Bóveda de PAM de «' + pj.nombre + '» tenía a medias un movimiento anterior (' + restos.map(c => c.etiqueta + ': ' + c.ahora).join(' · ') + '): se preparó pero nunca se cerró con «Ya lo publiqué». Se sustituye por el de este canje. Si ese movimiento sí se publicó en el foro, tocá Denegar y cerralo antes en PAM.' }) : null,
          cambian.length ? tablaCambios(cambian, 'De este canje') : el('div', { clase: 'p-nota', texto: 'Ya está igual en PAM: solo se leen los códigos.' })
        ]),
        ejecutar: () => {
          // como Mi PJ: solo los campos que cambian
          const r = pam.prepararBoveda(pj.id, Object.fromEntries(cambian.map(c => [c.k, c.valor])));
          if (!r) throw new Error('No encuentro el personaje «' + pj.nombre + '» en la Bóveda de PAM.');
          const n = numerosFormulario(r.form);
          if (n.cambio !== -gastadas) return { estado: 'error', detalle: 'El código de PAM no quita ' + gastadas + ' grageas (dice ' + n.cambio + ').' };
          captura.boveda = { html: r.html, form: r.form, numeros: n, divisor: r.divisor || '✦', pjBoveda: pj.nombre };
          return { estado: 'ok' };
        }
      };
    }
    return {
      titulo: 'Preparar el canje',
      explicacion: 'Canjes de «' + pet.pj + '»: ' + pet.gastadas + ' grageas (tenés ' + pet.disponibles + ', quedarían ' + pet.restantes + '). Se prepara todo en PAM y se guarda para el foro: ahí publicás la petición y, cuando la aprueben, Mi PJ actualiza bóveda y ficha sin volver a PAM.',
      avisos: numero(pet.restantes) < 0 ? ['Según PAM no te llegan las grageas (quedarían ' + pet.restantes + ').'] : [],
      pasos: [pasoFicha, pasoBoveda]
    };
  }

  async function preparar() {
    if (!pam.hayCanjes()) { aviso = { error: 'No reconozco esta versión de PAM (no encuentro las funciones de los canjes). Pasá los datos a mano.', ok: null }; return pintar(); }
    const pet = await leerPeticionPAM();
    if (pet.error) { aviso = { error: pet.error, ok: null }; return pintar(); }
    const cfg = foros[pet.foro];
    if (!cfg || !cfg.registroCanjes) { aviso = { error: 'No conozco el foro «' + pet.foro + '».', ok: null }; return pintar(); }
    if (abierta) return;
    abierta = true;
    const captura = {};
    const accion = accionPreparar(pet, captura);
    accion.enlaceFinal = { texto: 'Ir al foro a publicar la petición', href: 'https://' + pet.foro + cfg.registroCanjes + '#escriba-publicar' };
    accion.antesDelEnlace = () => agente.guardarDato(CLAVE_PETICION, {
      v: 2, creado: ahoraISO(), foro: pet.foro, cuenta: pet.cuenta, pj: pet.pj, texto: pet.texto,
      disponibles: pet.disponibles, gastadas: pet.gastadas, restantes: pet.restantes, cambiosFicha: captura.cambiosFicha || null, boveda: captura.boveda || null
    });
    try { await abrirPuerta(doc, pet.cuenta.nombre, accion); }
    catch (e) { aviso = { error: e instanceof Error ? e.message : String(e), ok: null }; }
    finally { abierta = false; await pintar(); }
  }

  /* ---------- Cierre en PAM tras publicarlo todo en el foro ---------- */
  function accionCierre(paq) {
    const titulo1 = 'Bóveda de PAM · enlaces de la petición y la aprobación', titulo2 = 'Bóveda de PAM · «Ya lo publiqué»';
    const busca = pam.pjBoveda(paq.pj);
    if (busca.omitido) return { titulo: 'Canje publicado → PAM', pasos: [{ tipo: 'pam', titulo: titulo1, omitido: busca.omitido }] };
    const pj = busca.pj, bv = pj.boveda || {};
    const yaAplicado = String(bv.act) === String(paq.actuales) && !String(bv.delta || '').trim();
    let paso1, paso2;
    if (yaAplicado) {
      paso1 = { tipo: 'pam', titulo: titulo1, igual: 'El movimiento ya está aplicado en la Bóveda de PAM.' };
      paso2 = { tipo: 'pam', titulo: titulo2, igual: 'La Bóveda de PAM ya tiene ' + paq.actuales + ' grageas actuales.' };
    } else {
      const campos = [{ k: 'delta', etiqueta: 'Grageas que se añaden/quitan', valor: String(paq.delta) }, { k: 'pet', etiqueta: 'Enlace de la petición', valor: paq.pet }, { k: 'ace', etiqueta: 'Enlace de la aceptación', valor: paq.ace }]
        .map(c => ({ ...c, ahora: bv[c.k], input: campoValor(c.valor) }));
      const cambian = campos.filter(c => String(c.ahora == null ? '' : c.ahora).trim() !== c.valor);
      paso1 = cambian.length ? {
        tipo: 'pam', titulo: titulo1,
        vista: el('div', { clase: 'p-vista' }, [busca.aproximado ? avisoNombreCorto(pj, paq.pj) : null, tablaCambios(cambian)]),
        ejecutar: () => { const r = pam.prepararBoveda(pj.id, Object.fromEntries(cambian.map(c => [c.k, c.valor]))); if (!r) throw new Error('No encuentro el personaje «' + pj.nombre + '» en la Bóveda de PAM.'); return { estado: 'ok' }; }
      } : { tipo: 'pam', titulo: titulo1, igual: 'La Bóveda de PAM ya tiene estos enlaces y estas grageas.' };
      paso2 = {
        tipo: 'pam', titulo: titulo2,
        vista: el('div', { clase: 'p-nota', texto: 'Se pulsa «Ya lo publiqué: actualizar mis números»: PAM guarda el movimiento en su historial (con los dos enlaces) y deja ' + paq.actuales + ' grageas actuales.' }),
        ejecutar: () => {
          const r = pam.cerrarBoveda(pj.id, {});
          if (!r) throw new Error('No encuentro el personaje «' + pj.nombre + '» en la Bóveda de PAM.');
          return String(r.act) === String(paq.actuales) ? { estado: 'ok' } : { estado: 'error', detalle: 'PAM dejó ' + r.act + ' grageas actuales, y el foro dice ' + paq.actuales + '.' };
        }
      };
    }
    return { titulo: 'Canje publicado → PAM', explicacion: 'El canje de «' + paq.pj + '» ya está publicado en el foro. Se cierra también en PAM y después se comprueba que PAM quede igual que el foro.', pasos: [paso1, paso2] };
  }
  /** Avisa a la pestaña del foro que abrió PAM (ella manda después los datos nuevos). */
  function avisarAlForo(foro, mensaje) { try { if (win.opener && foro) win.opener.postMessage(mensaje, 'https://' + foro); } catch (e) { /* sin pestaña del foro */ } }
  async function abrirCierre(auto) {
    const paq = await pendiente(CLAVE_APROBACION);
    if (!paq) { if (!auto) mensaje('No hay ningún canje publicado pendiente de cerrar en PAM.'); return; }
    if (!pam.hayCanjes()) { mensaje('No reconozco esta versión de PAM (no encuentro las funciones de los canjes). Pasá los datos a mano.'); return; }
    if (abierta) return;
    abierta = true;
    try {
      const res = await abrirPuerta(doc, (paq.cuenta && paq.cuenta.nombre) || paq.pj, accionCierre(paq));
      await marcarUsado(CLAVE_APROBACION, paq, res);
      const hecho = res.resultado === 'aceptada' || res.resultado === 'igual';
      // como Mi PJ: la petición queda cerrada en PAM (la tarjeta del foro deja de enseñarla)
      if (hecho && paq.cuenta) {
        const k = claveCuenta(paq.cuenta.foro || paq.foro, paq.cuenta.id), d = (await leer(k)) || {};
        const x = (d.peticiones || []).find(y => y.post === paq.peticion);
        if (x) { x.enPAM = ahoraISO(); x.cerrada = true; await agente.guardarDato(k, d).catch(() => {}); }
      }
      if (hecho && pam.vaciarCarrito) pam.vaciarCarrito(); // R08: la Tabla de Canjes ya se guarda; lo de este canje no tiene que quedar en el carrito
      avisarAlForo(paq.foro, { escribaCierre: 1, hecho });
    } finally { abierta = false; pam.verSeccion('ficha'); await pintar(); }
  }
  function mensaje(txt) { aviso = { error: null, ok: txt }; abiertoPanel = true; pintar(); }

  /* ---------- la pastilla «Mi PJ» de PAM ---------- */
  const tarjeta = (titulo, hijos) => el('div', { clase: 'card' }, [el('div', { clase: 'ct', texto: titulo })].concat(hijos));
  const boton = (texto, pri, fn, desactivado) => { const b = el('button', { clase: 'b' + (pri ? ' pri' : ''), type: 'button', texto }); b.disabled = !!desactivado; b.addEventListener('click', fn); return b; };
  async function pintar() {
    if (!raiz) { estilos(doc); raiz = el('div', { id: 'esc-pam', clase: 'esc-ui esc-pam' }); doc.body.appendChild(raiz); }
    const [cierre, pet, base] = await Promise.all([pendiente(CLAVE_APROBACION), pendiente(CLAVE_PETICION), leer(CLAVE_PAQUETE)]);
    raiz.innerHTML = '';
    const n = (cierre ? 1 : 0) + (pet ? 1 : 0);
    if (!abiertoPanel) {
      const pill = el('div', { clase: 'pill', title: 'Abrir Mi PJ' }, [el('span', { clase: 'brand' }, [el('i', { texto: '✦' }), doc.createTextNode('Mi PJ')]), n ? el('span', { clase: 'n', texto: String(n) }) : null]);
      pill.addEventListener('click', () => { abiertoPanel = true; pintar(); });
      raiz.appendChild(pill);
      return;
    }
    const cfgBase = base && foros[base.foro];
    const hd = el('div', { clase: 'hd', title: 'Minimizar' }, [el('span', { clase: 'brand' }, [el('i', { texto: '✦' }), doc.createTextNode('Mi PJ')]), el('small', { texto: 'Canjes' })]);
    hd.addEventListener('click', () => { abiertoPanel = false; aviso = { error: null, ok: null }; pintar(); });
    const bd = el('div', { clase: 'bd' });
    if (aviso.error) bd.appendChild(el('div', { clase: 'error msg', texto: aviso.error }));
    if (aviso.ok) bd.appendChild(el('div', { clase: 'aviso msg', texto: aviso.ok }));
    const hijosPet = [el('div', { clase: 'dim', texto: 'Con el carrito armado: aplica los canjes a tu ficha de PAM, prepara el movimiento de la bóveda y guarda todo para publicarlo en ' + (cfgBase ? cfgBase.nombre : 'tu foro') + '.' })];
    if (pet) {
      hijosPet.push(el('div', { clase: 'row ok', texto: 'Pendiente de publicar: «' + pet.pj + '», ' + pet.gastadas + ' grageas.' }));
      const cfgPet = foros[pet.foro];
      if (cfgPet && cfgPet.registroCanjes) hijosPet.push(el('a', { href: 'https://' + pet.foro + cfgPet.registroCanjes + '#escriba-publicar', target: '_blank', rel: 'noopener', texto: 'Ir al foro a publicarla' }));
    }
    hijosPet.push(el('div', { clase: 'acciones' }, [boton('Preparar el canje', true, () => { preparar(); })]));
    bd.appendChild(tarjeta('❖ Canje', hijosPet));
    if (cierre) {
      bd.appendChild(tarjeta('⛁ Canje publicado', [
        el('div', { clase: 'row', texto: 'Canje de «' + cierre.pj + '» publicado en el foro, pendiente de cerrar en PAM.' }),
        el('div', { clase: 'acciones' }, [boton('Cerrar en PAM', true, () => { abrirCierre(false); })])
      ]));
    }
    raiz.appendChild(el('div', { clase: 'box' }, [hd, bd]));
  }

  /* Tras importar la ficha con «Datos del foro → PAM», «Llevar a la calculadora» para que la Tabla de Canjes parta de
     la ficha nueva (como hacía Mi PJ). */
  function vigilarImportacion() {
    new win.MutationObserver(cambios => cambios.forEach(c => c.addedNodes.forEach(nodo => {
      if (nodo.nodeType !== 1) return;
      if (nodo.classList && nodo.classList.contains('fd-toast') && /se actualizó[^.]*\bficha\b/i.test(nodo.textContent || '')) setTimeout(() => { try { pam.llevarCalculadora(); } catch (e) { /* PAM sin calculadora */ } }, 300);
    }))).observe(doc.body, { childList: true });
  }

  /** Al llegar desde el foro con un canje publicado pendiente, la puerta de cierre se abre sola (y al volver a la pestaña). */
  async function revisarPendientes() {
    if (abierta || doc.querySelector('.esc-ui.puerta-fondo')) return;
    if (await pendiente(CLAVE_APROBACION)) await abrirCierre(true); else await pintar();
  }

  return { pintar, preparar, abrirCierre, revisarPendientes, vigilarImportacion, accionPreparar, accionCierre };
}
