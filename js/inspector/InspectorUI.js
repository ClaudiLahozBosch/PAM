// @ts-check
// Lo que se ve del Inspector de Canjes (pam-inspector-canjes.user.js 1.1.0: ponerBarra, pintarCaja, repintarPanel), con
// el mismo HTML. PAM lo arma aquí como texto y el agente lo pinta en el foro (en una caja propia, con el tema de Mi PJ).
// Lo que antes eran funciones en los botones ahora son marcas `data-icj` (qué hacer) y `data-p` (de qué pedido):
// el agente le devuelve a PAM el clic y PAM vuelve a pintar.

/**
 * @param {Document} doc un documento donde construir (no se añade nada a él)
 * @param {ReturnType<typeof import('./Revision.js').crearRevision>} R
 */
export function crearInspectorUI(doc, R) {
  const { fmt, norm, describir, etiquetaNivel, ICONO } = R;
  function el(tag, attrs, hijos) {
    const e = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      if (k === 'clase') e.className = attrs[k];
      else if (k === 'texto') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (hijos || []).forEach(h => { if (h) e.appendChild(typeof h === 'string' ? doc.createTextNode(h) : h); });
    return e;
  }

  /** La barra de un pedido. reg: { D, revisadoPor, estado: 'listo'|'revisando', res } */
  function barra(reg) {
    const r = reg.revisadoPor;
    const estado = r ? el('span', { clase: 'chip ' + (r.positivo ? 'ok' : 'warn'), texto: (r.positivo ? '✓ Aprobado por ' : '✎ Respondido por ') + r.nombre }) : el('span', { clase: 'chip dim', texto: '◷ Sin respuesta' });
    const revisando = reg.estado === 'revisando';
    const boton = el('button', { clase: 'b pri', type: 'button', 'data-icj': 'revisar', 'data-p': String(reg.D.id), disabled: revisando,
      texto: revisando ? 'Revisando…' : reg.res ? '↻ Volver a revisar' : '✦ Revisar canje' });
    return el('div', { clase: 'icj icj-barra' }, [el('span', { clase: 'marca', texto: 'Inspector' }), estado, el('span', { clase: 'esp' }), boton]).outerHTML;
  }

  /** La caja de la revisión (o el «leyendo…» o el error); vacía si el pedido no se revisó. */
  function caja(reg) {
    if (reg.estado === 'revisando') return el('div', { clase: 'icj icj-caja', html: '<div class="cargando">Leyendo la Tabla de PAM, la ficha y la bóveda…</div>' }).outerHTML;
    if (reg.error) return el('div', { clase: 'icj icj-caja' }, [el('div', { clase: 'aviso', texto: reg.error })]).outerHTML;
    if (!reg.res) return '';
    const res = reg.res, D = res.D, c = el('div', { clase: 'icj icj-caja' });
    const malos = res.items.filter(x => x.estado === 'bad').length;
    const dudas = res.items.filter(x => x.estado === 'warn' || x.estado === 'unk').length;
    c.appendChild(el('div', { clase: 'cab' }, [
      el('b', { texto: 'Canje de ' + D.nombre }),
      el('small', { texto: res.items.length + ' canje' + (res.items.length !== 1 ? 's' : '') + ' · ' + (malos ? malos + ' con error' : 'sin errores') + (dudas ? ' · ' + dudas + ' para mirar' : '') })
    ]));

    // tarjetas: bóveda, total, ficha
    const B = res.boveda, total = !isNaN(res.pedido.total) ? res.pedido.total : res.suma;
    const tarjetas = el('div', { clase: 'tarjetas' });
    if (B && !isNaN(B.saldo)) {
      const base = !isNaN(B.alPedir) ? B.alPedir : B.saldo;
      const queda = base - total;
      tarjetas.appendChild(el('div', { clase: 'tj ' + (queda >= 0 ? 'ok' : 'bad') }, [
        el('div', { clase: 'k', texto: !isNaN(B.alPedir) ? 'Bóveda al pedir' : 'Bóveda' }), el('div', { clase: 'v', texto: fmt(base) }),
        el('div', { clase: 's', texto: (queda >= 0 ? 'Quedan ' + fmt(queda) : 'Faltan ' + fmt(-queda)) + (!isNaN(B.alPedir) ? ' · hoy tiene ' + fmt(B.saldo) : '') })
      ]));
    } else {
      tarjetas.appendChild(el('div', { clase: 'tj warn' }, [el('div', { clase: 'k', texto: 'Bóveda' }), el('div', { clase: 'v', texto: '?' }), el('div', { clase: 's', texto: 'No pude leer el saldo' })]));
    }
    const sumaOk = isNaN(res.pedido.total) || res.pedido.total === res.suma;
    const espOk = res.esperadoTotal == null || res.esperadoTotal === total;
    tarjetas.appendChild(el('div', { clase: 'tj ' + (sumaOk && espOk ? 'ok' : 'bad') }, [
      el('div', { clase: 'k', texto: 'Total pedido' }), el('div', { clase: 'v', texto: fmt(total) }),
      el('div', { clase: 's', texto: (!sumaOk ? 'Los canjes suman ' + fmt(res.suma) + '. ' : '') + (res.esperadoTotal != null ? (espOk ? 'Coincide con la tabla' : 'Según la tabla: ' + fmt(res.esperadoTotal)) : 'Hay precios sin calcular') })
    ]));
    const F = res.ficha;
    tarjetas.appendChild(el('div', { clase: 'tj ' + (F ? '' : 'warn') }, [
      el('div', { clase: 'k', texto: 'Ficha' }), el('div', { clase: 'v', texto: F ? (F.titulo || 'Ficha') : '?' }),
      el('div', { clase: 's', texto: [D.raza, D.etapa, D.edad ? D.edad + ' años' : ''].filter(Boolean).join(' · ') })
    ]));
    c.appendChild(tarjetas);

    const enl = [];
    if (F) enl.push(el('a', { href: F.url, target: '_blank', texto: 'Abrir ficha' }));
    if (B) enl.push(el('a', { href: B.url, target: '_blank', texto: 'Abrir bóveda' }));
    if (B && B.ultimo) enl.push(el('span', { clase: 'dim', texto: 'Último movimiento: ' + (B.ultimo.fecha || '') }));
    if (enl.length) c.appendChild(el('div', { clase: 'fila' }, enl));

    const avisos = res.avisos.slice();
    if (B && B.posteriores.length) avisos.push('La bóveda tiene ' + B.posteriores.length + ' movimiento(s) posteriores al pedido: puede que ya haya descontado el canje. ' + (!isNaN(B.alPedir) ? 'Comparo con lo que tenía al pedir.' : 'No encontré el saldo de antes del pedido: el de arriba es el de hoy.'));
    if (!isNaN(res.pedido.actualesDeclaradas) && B && !isNaN(B.saldo) && res.pedido.actualesDeclaradas !== B.saldo) avisos.push('En el pedido dice que tiene ' + fmt(res.pedido.actualesDeclaradas) + ' grageas; la bóveda dice ' + fmt(B.saldo) + '.');
    if (B && !isNaN(B.cabecera) && !isNaN(B.movido) && B.cabecera !== B.movido) {
      avisos.push('En la bóveda, el primer mensaje dice ' + fmt(B.cabecera) + ' y el último movimiento ' + fmt(B.movido) + (B.ultimo && B.ultimo.fecha ? ' (' + B.ultimo.fecha + ')' : '') + '. Tomo ' + (B.fuente === 'cabecera' ? 'el primer mensaje, que se editó después.' : 'el último movimiento.'));
    }
    if (res.T && res.T._viejo) avisos.push('No pude actualizar la Tabla de PAM (' + res.T._viejo + '): uso la copia guardada.');
    avisos.forEach(a => c.appendChild(el('div', { clase: 'aviso', texto: a })));

    // tabla de canjes
    const tb = el('tbody');
    res.items.forEach((x, i) => {
      const desc = el('td', {}, [el('div', { texto: x.nombre && x.tipo ? describir(x) : x.item.desc })]);
      if (norm(x.item.desc) !== norm(describir(x))) desc.appendChild(el('div', { clase: 'orig', texto: 'Escribió: ' + x.item.texto }));
      x.problemas.forEach((q, k) => {
        const id = 'icj-' + D.id + '-' + i + '-' + k;
        const cb = el('input', { type: 'checkbox', id, 'data-icj': 'prob', 'data-p': String(D.id), 'data-i': String(i), 'data-k': String(k), checked: !!q.incluir });
        desc.appendChild(el('div', { clase: 'prob ' + (q.grave ? 'bad' : 'warn') }, [el('label', { for: id }, [cb, el('span', { texto: q.t })])]));
      });
      (x.notas || []).forEach(n => desc.appendChild(el('div', { clase: 'nota', texto: '· ' + n })));
      tb.appendChild(el('tr', {}, [
        el('td', { clase: 'e ' + x.estado, texto: ICONO[x.estado] }),
        desc,
        el('td', { clase: 'n', texto: fmt(x.item.precio) }),
        el('td', { clase: 'n ' + (x.esperado != null && x.esperado !== x.item.precio ? 'bad' : ''), texto: x.alternativas ? x.alternativas.join(' / ') : fmt(x.esperado) }),
        el('td', { clase: 'n dim', texto: x.ficha != null ? etiquetaNivel(x, x.ficha) : '' })
      ]));
    });
    c.appendChild(el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', {}), el('th', { texto: 'Canje' }), el('th', { texto: 'Pide' }), el('th', { texto: 'Tabla' }), el('th', { texto: 'Ficha' })])]), tb]));

    if (res.pedido.devoluciones.length) {
      c.appendChild(el('div', { clase: 'dev' }, [el('b', { texto: 'Devoluciones (revisar a mano): ' }), doc.createTextNode(res.pedido.devoluciones.map(d => d.desc + ' — ' + fmt(d.precio)).join(' · '))]));
    }

    // decisión
    const bSi = el('button', { clase: 'b si' + (reg.decision === 'ok' ? ' on' : ''), type: 'button', 'data-icj': 'decidir', 'data-p': String(D.id), 'data-v': 'ok', texto: '✓ Correcto' });
    const bNo = el('button', { clase: 'b no' + (reg.decision === 'fix' ? ' on' : ''), type: 'button', 'data-icj': 'decidir', 'data-p': String(D.id), 'data-v': 'fix', texto: '✎ Con correcciones' });
    c.appendChild(el('div', { clase: 'fila' }, [el('span', { clase: 'dim', texto: 'Para la respuesta:' }), el('span', { clase: 'esp' }), bSi, bNo]));
    return c.outerHTML;
  }

  /**
   * El panel flotante: la pastilla o la caja con los pedidos de la página, la respuesta y la Tabla.
   * @param {any[]} pedidos @param {{ abierto: boolean, todos: boolean, tabla: string, respuesta: string }} est
   */
  function panel(pedidos, est) {
    const p = el('div', { clase: 'icj flot' });
    const pendientes = pedidos.filter(r => !r.revisadoPor);
    if (!est.abierto) {
      p.appendChild(el('div', { clase: 'pill', 'data-icj': 'abrir' }, [
        el('span', { clase: 'brand', html: '<i>✦</i>Inspector' }),
        pendientes.length ? el('span', { clase: 'n', texto: pendientes.length + ' sin respuesta' }) : null
      ]));
      return p.outerHTML;
    }
    const bd = el('div', { clase: 'bd' });
    p.appendChild(el('div', { clase: 'box' }, [
      el('div', { clase: 'hd', 'data-icj': 'cerrar' }, [el('span', { clase: 'brand', html: '<i>✦</i>Inspector de Canjes' }), el('small', { texto: 'cerrar' })]),
      bd
    ]));

    // pedidos de la página
    const lista = el('div', { clase: 'lista' });
    pedidos.forEach(r => {
      const est2 = r.decision === 'ok' ? el('span', { clase: 'chip ok', texto: '✓ correcto' }) : r.decision === 'fix' ? el('span', { clase: 'chip bad', texto: '✎ corregir' }) :
        r.res ? el('span', { clase: 'chip ' + (r.res.items.some(x => x.estado === 'bad') ? 'bad' : r.res.items.some(x => x.estado !== 'ok') ? 'warn' : 'ok'), texto: 'revisado' }) :
          r.revisadoPor ? el('span', { clase: 'chip dim', texto: 'respondido' }) : el('span', { clase: 'chip dim', texto: 'sin revisar' });
      lista.appendChild(el('div', { clase: 'it' }, [el('a', { href: '#p' + r.D.id, 'data-icj': 'ir', 'data-p': String(r.D.id), texto: r.D.nombre }), est2]));
    });
    const bTodos = el('button', { clase: 'b pri', type: 'button', 'data-icj': 'todos', disabled: !pendientes.length || est.todos,
      texto: pendientes.length ? 'Revisar los ' + pendientes.length + ' sin respuesta' : 'No hay pedidos sin respuesta' });
    bd.appendChild(el('div', { clase: 'card' }, [el('div', { clase: 'ct', texto: 'Pedidos en esta página' }), pedidos.length ? lista : el('div', { clase: 'dim', texto: 'No encontré pedidos en esta página.' }), el('div', { clase: 'acciones' }, [bTodos])]));

    // respuesta
    const ta = el('textarea', { 'aria-label': 'Respuesta', texto: est.respuesta });
    const marcados = pedidos.filter(r => r.decision).length;
    bd.appendChild(el('div', { clase: 'card' }, [
      el('div', { clase: 'ct', texto: 'Respuesta' }),
      marcados ? ta : el('div', { clase: 'dim', texto: 'Marcá cada pedido revisado como «Correcto» o «Con correcciones» y acá se arma el mensaje. Podés editarlo antes de pegarlo.' }),
      marcados ? el('div', { clase: 'acciones' }, [
        el('button', { clase: 'b', type: 'button', 'data-icj': 'copiar', texto: 'Copiar' }),
        el('button', { clase: 'b pri', type: 'button', 'data-icj': 'pegar', texto: 'Pegar en la respuesta rápida' })
      ]) : null,
      el('div', { clase: 'msg' })
    ]));

    // tabla de PAM
    bd.appendChild(el('div', { clase: 'card' }, [el('div', { clase: 'dim', texto: est.tabla }), el('div', { clase: 'acciones' }, [el('button', { clase: 'b', type: 'button', 'data-icj': 'tabla', texto: '↻ Actualizar tabla' })])]));
    return p.outerHTML;
  }

  return { barra, caja, panel };
}
