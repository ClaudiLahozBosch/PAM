// @ts-check
// 2.5.0 · Lo nuevo de la tarjeta «⚜ Sueldo» del panel Mi PJ (lo de siempre lo sigue pintando MiPjPanel, igual que antes):
//   · en un rol cerrado de la zona de rol donde escribiste: «Pedir el sueldo con este rol». Se rellena solo con tus
//     «Empleos roleros» del perfil, la categoría de la lista de empleos de PAM (data/empleos-foro.txt) y la tabla de
//     sueldos (data/sistema.json); vos elegís el empleo, revisás el nivel y escribís el resumen. Se publica por la puerta.
//   · con el sueldo aprobado: «Aplicar a la bóveda» (el primer mensaje y el movimiento, como «Aplicar el canje») y,
//     desde la misma puerta, «Terminar en PAM» para que la Bóveda de PAM lo apunte también (js/pam/SueldoPam.js).
import { estadoSueldo, NIVELES, buscarEmpleo, sueldoDe, CLAVE_SUELDO, paqueteSueldo } from '../../reglas/Sueldo.js?v=2.5.0';

/**
 * @param {{ documento: Document, servicio: ReturnType<typeof import('../../servicios/SueldoDelForo.js').crearSueldoDelForo>,
 *   canjes: any, agente: { puerta(a: any): Promise<any>, guardarDato(k: string, v: any): Promise<any>, abrirPam(d: any): Promise<any> },
 *   ruta: string, foro: string, cuenta: { id: number, nombre: string }, memoria: { gv(k: string, d: any): any, sv(k: string, v: any): void },
 *   catalogo: () => Promise<{ nombre: string, categoria: string }[]>, tabla: Record<string, number[]>, divisor: () => string,
 *   datos: () => any, actualizar: () => Promise<any> }} dep
 */
export function crearSueldoPanel({ documento, servicio, canjes, agente, ruta, foro, cuenta, memoria, catalogo, tabla, divisor, datos, actualizar }) {
  const enTema = /^\/t\d+/.test(ruta || '');
  /** @type {any} */ let rol;          // undefined: sin leer · 'leyendo' · null: no hay · el rol leído (servicio.leerRol)
  /** @type {any} */ let form = null;  // el formulario abierto
  /** @type {{ texto: string, error: boolean }|null} */ let msg = null;
  let ocupado = false;
  let pedidoAqui = false; // ya publicaste el pedido de este rol desde aquí
  /** @type {HTMLElement|null} */ let ultima = null; // el sitio de la tarjeta donde se pintó la última vez
  const repintar = () => { if (ultima && ultima.isConnected) pintar(ultima); };
  /** @type {any[]} */ let cat = [];
  const kBorrador = tid => 'mipj.sueldoBorrador.' + cuenta.id + '.' + tid;

  function el(tag, attrs, hijos) {
    const e = documento.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      if (k === 'texto') e.textContent = attrs[k];
      else if (k === 'clase') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (hijos || []).forEach(h => { if (h) e.appendChild(typeof h === 'string' ? documento.createTextNode(h) : h); });
    return e;
  }
  const boton = (texto, pri, fn, desactivado = false) => {
    const b = el('button', { clase: 'b' + (pri ? ' pri' : ''), type: 'button', texto });
    if (desactivado || ocupado) b.disabled = true;
    b.addEventListener('click', () => { msg = null; fn(b); });
    return b;
  };
  const fila = hijos => el('div', { clase: 'row sd-bt' }, hijos);
  const aviso = (texto, error = false) => { msg = { texto, error }; repintar(); };
  const errorDe = e => (e instanceof Error ? e.message : String(e));
  const Mes = S => (S.mes ? S.mes[0].toUpperCase() + S.mes.slice(1) : '');

  /** ¿Se puede ofrecer pedir en esta página? (el tema del mes abierto y no es el propio tema de sueldos) */
  function sePuedePedir(S) {
    if (!enTema || !S || S.estado !== 'leido' || !S.tid) return false;
    return !new RegExp(`^/t${S.tid}(p\\d+)?-`).test(ruta);
  }

  function leerRol() {
    rol = 'leyendo';
    servicio.leerRol(ruta.split('?')[0].split('#')[0])
      .then(r => { rol = r; }, e => { console.warn('[Mi PJ] el rol de esta página', e); rol = null; })
      .then(repintar);
  }

  /* ---------------- pedir ---------------- */
  async function abrirFormulario(S, corregir) {
    ocupado = true; repintar();
    try {
      if (!cat.length) cat = await catalogo();
      const emp = (rol.empleos || [])[0] || null;
      form = { i: 0, nivel: emp ? emp.nivel : -1, categoria: '', resumen: memoria.gv(kBorrador(rol.tid), ''), antes: null, leyendoAntes: true, corregir };
      ponerCategoria();
      ocupado = false; repintar();
      form.antes = await servicio.antesDePedir(rol, S);
    } catch (e) { if (form) form.antes = { error: errorDe(e) }; }
    ocupado = false;
    if (form) form.leyendoAntes = false;
    repintar();
  }
  function empleoElegido() { return (rol.empleos || [])[form.i] || null; }
  function ponerCategoria() {
    const e = empleoElegido(), m = e ? buscarEmpleo(e.nombre, cat) : null;
    form.enLista = m;
    form.categoria = m && m.categoria && tabla[Object.keys(tabla).find(k => k.toLowerCase() === m.categoria.toLowerCase()) || ''] ? m.categoria : '';
  }
  const sueldo = () => sueldoDe(tabla, form.categoria, form.nivel);

  /** Lo que impide publicar (null si nada). */
  function bloqueo() {
    const A = form.antes;
    if (form.leyendoAntes) return 'Mirando tus pedidos de sueldo…';
    // si te pidieron corregir, el pedido corregido va en un mensaje nuevo: lo de este mes no cuenta
    if (A && A.rolEsteMes && !form.corregir) return 'Ya pediste un rol de empleo este mes: el foro deja cobrar uno por mes.';
    if (A && A.repetido && !(form.corregir && !A.repetido.titulo)) return 'Este rol ya lo pediste' + (A.repetido.titulo ? ' en «' + A.repetido.titulo + '»' : ' este mes') + ': un rol de empleo no se cobra dos veces.';
    if (!empleoElegido()) return 'Elegí el empleo.';
    if (form.nivel < 0) return 'Elegí el nivel de empleo.';
    if (!form.categoria) return 'Elegí la categoría del empleo.';
    if (sueldo() == null) return 'No encuentro el sueldo de esa categoría y nivel en la tabla.';
    if (!String(form.resumen).trim()) return 'Escribí el resumen del rol.';
    return null;
  }

  async function publicar(S) {
    const e = empleoElegido();
    const f = { empleo: e.nombre, categoria: form.categoria, nivel: form.nivel, sueldo: /** @type {number} */ (sueldo()), rol: { url: rol.url, titulo: rol.titulo }, resumen: form.resumen };
    const avisos = [];
    if (e.nivel >= 0 && form.nivel !== e.nivel) avisos.push('Tu perfil dice ' + NIVELES[e.nivel] + ' y pedís como ' + NIVELES[form.nivel] + ': cuenta el nivel que tenías al terminar el rol.');
    if (!form.enLista) avisos.push('«' + e.nombre + '» no está en la lista de empleos de PAM: la categoría la elegiste vos.');
    if (form.antes && form.antes.error) avisos.push('No pude mirar tus pedidos de sueldo de antes (' + form.antes.error + '): fijate que no hayas pedido ya este rol.');
    if (form.corregir) avisos.push('Te pidieron corregir el pedido de este mes: este es el pedido corregido, en un mensaje nuevo.');
    else if (S.pedido) avisos.push('Ya tenés un pedido este mes (sin rol de empleo): este va en un mensaje aparte.');
    ocupado = true; repintar();
    try {
      const res = await agente.puerta(servicio.accionPedir(f, S, avisos));
      const r = res && res.pasos && res.pasos[0];
      if (r && r.estado === 'ok') {
        memoria.sv(kBorrador(rol.tid), '');
        form = null; pedidoAqui = true;
        aviso('Pedido publicado en «Sueldos de ' + Mes(S) + '».');
        actualizar();
      }
    } catch (err) { aviso(errorDe(err), true); }
    ocupado = false; repintar();
  }

  /* ---------------- aplicar a la bóveda ---------------- */
  async function aplicar(S) {
    const d = datos();
    if (!S.pedido || !S.pedido.monto) { aviso('No encuentro cuánto pediste en tu pedido: sumalo a mano.', true); return; }
    ocupado = true; repintar();
    try {
      const { enlacePet, enlaceAce } = servicio.enlaces(S);
      const mes = Mes(S);
      const { accion, numeros } = await canjes.accionSumarABoveda({
        delta: S.pedido.monto, enlacePet, enlaceAce, divisor: divisor(), motivo: 'Sueldo aprobado',
        titulo: 'Sumar el sueldo a la bóveda',
        explicacion: 'Sueldo de ' + mes + ' (' + S.pedido.monto + ' grageas), aprobado por ' + S.resp.autor + (S.resp.fecha ? ' (' + S.resp.fecha + ')' : '') + '. Se edita el primer mensaje de tu bóveda y se publica el movimiento con los enlaces del pedido y de la aprobación. Solo se editan mensajes tuyos.'
      }, d);
      accion.enlaceFinal = { texto: 'Terminar en PAM' };
      const res = await agente.puerta(accion);
      if (res && (res.resultado === 'aceptada' || res.resultado === 'igual')) {
        if (res.siguiente) {
          // primero PAM (el navegador solo deja abrir la pestaña justo después del clic) y después se relee el foro
          await agente.guardarDato(CLAVE_SUELDO, paqueteSueldo({ foro, cuenta, pj: (d && d.pj) || cuenta.nombre, mes: S.mes, monto: S.pedido.monto, enlacePet, enlaceAce, numeros }));
          const r = await agente.abrirPam({ hash: '#boveda' });
          if (!r || !r.abierta) aviso('El navegador bloqueó la ventana de PAM: permití ventanas emergentes para el foro.', true);
        }
        actualizar();
      }
    } catch (err) { aviso(errorDe(err), true); }
    ocupado = false; repintar();
  }

  /* ---------------- pintar ---------------- */
  /** @param {HTMLElement|null} caja el sitio dentro de la tarjeta (#mipj-sueldo) */
  function pintar(caja) {
    if (!caja) return;
    ultima = caja;
    const d = datos(), S = d && d.sueldo, E = S ? estadoSueldo(S, d.boveda) : null;
    // al repintar con el resumen a medio escribir, el cursor vuelve donde estaba
    const activo = /** @type {any} */ (documento.activeElement);
    const cursor = activo && activo.tagName === 'TEXTAREA' && caja.contains(activo) ? activo.selectionStart : null;
    caja.replaceChildren();
    if (!E) return;
    if (msg) caja.appendChild(el('div', { clase: msg.error ? 'err' : 'nota', texto: msg.texto }));
    if (E.k === 'aprobado' && canjes && !E.sinBoveda) {
      caja.appendChild(fila([boton('Aplicar a la bóveda', true, () => aplicar(S))]));
    }
    if (!sePuedePedir(S)) return;
    if (rol === undefined) { leerRol(); return; }
    if (!rol || rol === 'leyendo' || !rol.enRol || !rol.cerrado || !rol.mios || pedidoAqui) return;
    if (!form) {
      caja.appendChild(el('div', { clase: 'row sd-rol' }, ['Este rol está cerrado: ', el('b', { texto: rol.titulo })]));
      caja.appendChild(fila([boton('Pedir el sueldo con este rol', false, () => abrirFormulario(S, E.k === 'corregir'))]));
      return;
    }
    pintarFormulario(caja, S, cursor);
  }

  function pintarFormulario(caja, S, cursor) {
    const f = el('div', { clase: 'sd-form' });
    f.appendChild(el('div', { clase: 'row' }, [el('b', { texto: 'Pedir el sueldo con «' + rol.titulo + '»' })]));
    const empleos = rol.empleos || [];
    if (!empleos.length) {
      f.appendChild(el('div', { clase: 'dim', texto: 'Tu perfil no tiene «Empleos roleros». Pedilo a mano con el formulario del foro.' }));
      f.appendChild(fila([boton('Cerrar', false, () => { form = null; repintar(); })]));
      caja.appendChild(f); return;
    }
    const campo = (etiqueta, control, nota) => el('label', { clase: 'sd-campo' }, [el('span', { texto: etiqueta }), control, nota ? el('small', { clase: 'dim', texto: nota }) : null]);
    const select = (opciones, valor, fn) => {
      const s = /** @type {HTMLSelectElement} */ (el('select', {}));
      opciones.forEach(([v, t]) => { const o = /** @type {HTMLOptionElement} */ (el('option', { value: String(v), texto: t })); if (String(v) === String(valor)) o.selected = true; s.appendChild(o); });
      s.addEventListener('change', () => { fn(s.value); repintar(); });
      return s;
    };
    f.appendChild(campo('Empleo', select(empleos.map((e, i) => [i, e.texto]), form.i, v => { form.i = +v; const e = empleoElegido(); form.nivel = e ? e.nivel : -1; ponerCategoria(); }),
      empleos.length > 1 ? 'Tenés más de un empleo: elegí el de este rol.' : ''));
    f.appendChild(campo('Nivel de empleo', select([[-1, 'Elegí…'], ...NIVELES.map((n, i) => [i, n])], form.nivel, v => { form.nivel = +v; }),
      'El que tenías cuando terminó el rol' + (rol.ultimo && rol.ultimo.fecha ? ' (' + rol.ultimo.fecha.replace(/\s*-\s*\d{1,2}:\d{2}.*$/, '') + ')' : '') + ', no el de ahora.'));
    if (form.enLista && form.categoria) f.appendChild(campo('Categoría', el('b', { texto: form.categoria }), 'De la lista de empleos de PAM.'));
    else f.appendChild(campo('Categoría', select([['', 'Elegí…'], ...Object.keys(tabla).map(k => [k, k])], form.categoria, v => { form.categoria = v; }),
      form.enLista ? 'La lista de empleos de PAM no dice la categoría de este empleo.' : 'No encuentro este empleo en la lista de PAM.'));
    const s = sueldo();
    f.appendChild(campo('Sueldo', el('b', { texto: s == null ? '—' : s + ' grageas' })));
    const ta = /** @type {HTMLTextAreaElement} */ (el('textarea', { rows: '4', placeholder: 'Qué pasó en el rol y por qué es de tu empleo (lo leen los inspectores).' }));
    ta.value = form.resumen;
    ta.addEventListener('input', () => {
      form.resumen = ta.value; memoria.sv(kBorrador(rol.tid), ta.value);
      const b = /** @type {HTMLButtonElement|null} */ (caja.querySelector('.sd-publicar')); const q = bloqueo();
      if (b) b.disabled = !!q || ocupado; const n = caja.querySelector('.sd-falta'); if (n) n.textContent = q || '';
    });
    f.appendChild(campo('Resumen', ta));
    const q = bloqueo();
    f.appendChild(el('div', { clase: 'dim sd-falta', texto: q || '' }));
    const pub = boton('Revisar y publicar', true, () => publicar(S), !!q);
    pub.classList.add('sd-publicar');
    f.appendChild(fila([boton('Cancelar', false, () => { form = null; repintar(); }), pub]));
    caja.appendChild(f);
    if (cursor != null) { ta.focus(); ta.setSelectionRange(cursor, cursor); }
  }

  return { pintar };
}
