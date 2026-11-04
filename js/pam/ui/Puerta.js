// @ts-check
// La puerta de validación (Aceptar / Modificar / Denegar) de Mi PJ, dentro de PAM: abrirPuerta() de
// pam-mi-pj.user.js 1.7.1, con los pasos de PAM (los del foro los hace la puerta del agente). Mismo HTML y mismos
// textos. Nada se toca en PAM hasta «Aceptar».
//
// accion = { titulo, explicacion?, avisos?, pasos, enlaceFinal?, antesDelEnlace?(resultados) }
// paso   = { tipo: 'pam', titulo, vista?: Node, editar?(), recoger?(), ejecutar(avisar) → Promise<{ estado, detalle? }>,
//            omitido?: texto, igual?: texto }
// Devuelve { resultado: 'aceptada'|'denegada'|'fallida'|'parcial'|'igual', pasos }.
import { CSS_PAM_VARS, CSS_PUERTA } from './estilosPuerta.js?v=0.6.2';

/** Los estilos de la puerta y de la pastilla (una vez). @param {Document} doc */
export function estilos(doc) {
  if (doc.getElementById('esc-css')) return;
  const s = doc.createElement('style'); s.id = 'esc-css';
  s.textContent = CSS_PAM_VARS + '\n' + CSS_PUERTA;
  doc.head.appendChild(s);
}

/** @param {Document} doc */
export function crearEl(doc) {
  return function el(tag, attrs, hijos) {
    const e = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      if (k === 'texto') e.textContent = attrs[k];
      else if (k === 'clase') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (hijos || []).forEach(h => { if (h) e.appendChild(h); });
    return e;
  };
}

/**
 * @param {Document} doc
 * @param {string} quien lo que sale arriba a la derecha (en el foro, la cuenta; aquí, de dónde viene)
 * @param {any} accion
 * @returns {Promise<{ resultado: string, pasos?: any[] }>}
 */
export function abrirPuerta(doc, quien, accion) {
  const el = crearEl(doc);
  if (accion.pasos.length && accion.pasos.every(p => p.igual)) {
    return Promise.resolve({ resultado: 'igual', pasos: accion.pasos.map(() => ({ estado: 'igual' })) });
  }
  return new Promise(resolver => {
    const fondo = el('div', { clase: 'esc-ui puerta-fondo' });
    const dlg = el('div', { clase: 'puerta', role: 'dialog', 'aria-modal': 'true', 'aria-label': accion.titulo });
    fondo.appendChild(dlg);
    dlg.appendChild(el('div', { clase: 'p-cab' }, [el('b', { texto: accion.titulo }), el('small', { texto: quien })]));
    if (accion.explicacion) dlg.appendChild(el('div', { clase: 'p-expl', texto: accion.explicacion }));
    (accion.avisos || []).forEach(a => dlg.appendChild(el('div', { clase: 'aviso', texto: a })));

    const editables = [], estados = [];
    accion.pasos.forEach((paso, k) => {
      const caja = el('div', { clase: 'p-paso' });
      if (paso.igual) {
        const estadoIgual = el('span', { clase: 'p-estado ok', texto: 'Ya está igual' });
        estados.push(estadoIgual);
        caja.appendChild(el('div', { clase: 'p-paso-cab' }, [el('span', { texto: (k + 1) + '. ' + paso.titulo }), estadoIgual]));
        caja.appendChild(el('div', { clase: 'p-nota', texto: paso.igual + ' No se toca.' }));
        dlg.appendChild(caja);
        return;
      }
      const estadoPam = el('span', { clase: 'p-estado ' + (paso.omitido ? 'mal' : 'neutro'), texto: paso.omitido ? 'No se hará' : 'Pendiente' });
      estados.push(estadoPam);
      caja.appendChild(el('div', { clase: 'p-paso-cab' }, [el('span', { texto: (k + 1) + '. ' + paso.titulo }), estadoPam]));
      if (paso.omitido) caja.appendChild(el('div', { clase: 'aviso', texto: paso.omitido }));
      if (paso.vista) caja.appendChild(paso.vista);
      editables.push(paso);
      dlg.appendChild(caja);
    });

    const info = el('div', { clase: 'p-info' });
    dlg.appendChild(info);
    const bAceptar = el('button', { clase: 'p-btn ok', type: 'button', texto: 'Aceptar' });
    const bModificar = el('button', { clase: 'p-btn edit', type: 'button', texto: 'Modificar' });
    const bDenegar = el('button', { clase: 'p-btn no', type: 'button', texto: 'Denegar' });
    const botones = el('div', { clase: 'p-botones' }, [bDenegar, bModificar, bAceptar]);
    dlg.appendChild(botones);
    estilos(doc);
    doc.body.appendChild(fondo);
    bAceptar.focus();

    const cerrar = res => { fondo.remove(); resolver(res); };
    bDenegar.addEventListener('click', () => cerrar({ resultado: 'denegada' }));
    bModificar.addEventListener('click', () => {
      editables.forEach(p => { if (p.editar && !p.omitido) p.editar(); });
      bModificar.disabled = true;
      bAceptar.textContent = 'Aceptar con mis cambios';
      info.textContent = 'Cambiá los valores. Se pone en PAM exactamente lo que escribas.';
      const primero = /** @type {HTMLElement|null} */ (dlg.querySelector('textarea:not([readonly]), input:not([readonly])'));
      if (primero) primero.focus();
    });
    bAceptar.addEventListener('click', () => {
      editables.forEach(p => { if (p.recoger) p.recoger(); });
      bAceptar.disabled = true; bModificar.disabled = true; bDenegar.disabled = true;
      info.className = 'p-info';
      const resultados = [];
      let k = 0;
      const siguiente = () => {
        if (k >= accion.pasos.length) return Promise.resolve();
        const idx = k++, paso = accion.pasos[idx];
        if (paso.igual) { resultados.push({ estado: 'igual' }); return siguiente(); }
        if (paso.omitido) { resultados.push({ estado: 'omitido' }); estados[idx].textContent = 'Omitido'; return siguiente(); }
        estados[idx].className = 'p-estado warn';
        estados[idx].textContent = 'En curso…';
        const avisar = msg => { info.textContent = msg; };
        return Promise.resolve().then(() => paso.ejecutar(avisar)).catch(e => ({ estado: 'error', detalle: e.message })).then(r => {
          resultados.push(r);
          if (r.estado === 'ok') { estados[idx].className = 'p-estado ok'; estados[idx].textContent = 'Hecho'; info.textContent = ''; return siguiente(); }
          estados[idx].className = 'p-estado mal';
          estados[idx].textContent = 'No hecho';
          for (let q = idx + 1; q < estados.length; q++) { if (!accion.pasos[q].igual) estados[q].textContent = 'No ejecutado'; }
          info.className = 'p-info error';
          info.textContent = 'Paso ' + (idx + 1) + ': ' + (r.detalle || 'Error desconocido.') + (idx > 0 ? ' Los pasos anteriores sí se hicieron.' : '') +
            (idx + 1 < estados.length ? ' Los siguientes no se hicieron.' : '');
          return null;
        });
      };
      siguiente().then(() => {
        const algunoOk = resultados.some(r => r.estado === 'ok');
        const completos = resultados.length === accion.pasos.length && resultados.every(r => r.estado === 'ok' || r.estado === 'omitido' || r.estado === 'igual');
        const todosOk = algunoOk && completos;
        const nadaQueHacer = !algunoOk && completos && resultados.some(r => r.estado === 'igual');
        const resultado = todosOk ? 'aceptada' : (nadaQueHacer ? 'igual' : (algunoOk ? 'parcial' : 'fallida'));
        if (todosOk || nadaQueHacer) {
          const omitidos = resultados.filter(r => r.estado === 'omitido').length, iguales = resultados.filter(r => r.estado === 'igual').length;
          info.className = 'p-info okmsg';
          info.textContent = nadaQueHacer ? 'No había nada que cambiar.'
            : 'Hecho' + (iguales ? ' (los pasos que ya estaban igual no se tocaron)' : '') + (omitidos ? ', salvo los pasos marcados como «Omitido».' : '.');
        }
        const bCerrar = el('button', { clase: 'p-btn', type: 'button', texto: 'Cerrar' });
        botones.innerHTML = '';
        botones.appendChild(bCerrar);
        bCerrar.focus();
        bCerrar.addEventListener('click', () => cerrar({ resultado, pasos: resultados }));
        if ((todosOk || nadaQueHacer) && accion.enlaceFinal) {
          // antesDelEnlace puede devolver una promesa (p. ej. guardar la petición para el foro)
          Promise.resolve(accion.antesDelEnlace ? accion.antesDelEnlace(resultados) : null).then(() => {
            const bSig = accion.enlaceFinal.alPulsar
              ? el('button', { clase: 'p-btn ok', type: 'button', texto: accion.enlaceFinal.texto })
              : el('a', { clase: 'p-btn ok', href: accion.enlaceFinal.href, target: '_blank', rel: 'noopener', texto: accion.enlaceFinal.texto });
            bSig.style.textDecoration = 'none';
            bSig.addEventListener('click', () => { if (accion.enlaceFinal.alPulsar) accion.enlaceFinal.alPulsar(); cerrar({ resultado, pasos: resultados }); });
            botones.appendChild(bSig);
            bSig.focus();
          }).catch(e => {
            info.className = 'p-info error';
            info.textContent = 'Hecho, pero no pude preparar el paso siguiente: ' + (e instanceof Error ? e.message : String(e));
          });
        }
      });
    });
  });
}
