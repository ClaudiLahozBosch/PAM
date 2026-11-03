// ==UserScript==
// @name         PAM · Agente (staging)
// @namespace    https://claudilahozbosch.github.io/PAM/staging
// @version      0.2.1
// @description  El script mínimo de PAM: lee el foro con tu sesión, publica y edita SOLO tras tu «Aceptar» y muestra el panel de PAM. Toda la lógica está en PAM.
// @updateURL    https://claudilahozbosch.github.io/PAM/agente/pam-agente.user.js
// @downloadURL  https://claudilahozbosch.github.io/PAM/agente/pam-agente.user.js
// @match        https://test-forito.foroactivo.com/*
// @match        https://hp-avada-kedavra.foroactivo.com/*
// @match        https://claudilahozbosch.github.io/PAM/*
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

/* El agente hace SOLO lo que PAM no puede hacer desde su dominio:
   1. leer páginas del foro con tu sesión (solo rutas del propio foro, solo lectura);
   2. publicar y editar mensajes, siempre después de su propia ventana Aceptar / Modificar / Denegar,
      que enseña exactamente lo que se va a publicar (y, al editar, qué líneas cambian);
   3. guardar datos compartidos entre el foro y PAM (almacén de Tampermonkey, claves «pam.*»);
   4. mostrar el panel de PAM dentro del foro;
   5. pasar a PAM el texto del editor del foro antes de enviarlo, para que lo revise.
   No sabe nada de fichas ni de canjes. Habla con PAM con mensajes { pam, de, id, tipo, datos } (protocolo 1). */

(function () {
  'use strict';

  var VERSION = '0.2.1';
  var PROTOCOLO = 1;
  // Staging: el fork de pruebas (otro dominio que PAM real, así no ve los datos de los jugadores).
  var PAM = { origen: 'https://claudilahozbosch.github.io', ruta: '/PAM/' };
  var FOROS = ['test-forito.foroactivo.com', 'hp-avada-kedavra.foroactivo.com'];

  var enForo = FOROS.indexOf(location.host) !== -1;
  var enPam = location.origin === PAM.origen && location.pathname.indexOf(PAM.ruta) === 0;
  if (!enForo && !enPam) { return; }
  var W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ---------------------------------------------------------------
  // Almacén compartido (no está particionado: lo ven el foro y PAM)
  // ---------------------------------------------------------------
  function validarClave(c) {
    if (typeof c !== 'string' || !/^pam\.[\w.-]{1,80}$/.test(c)) { throw new Error('Clave no permitida: ' + c); }
  }
  var almacen = {
    leer: function (d) { validarClave(d.clave); return { valor: GM_getValue(d.clave, null) }; },
    guardar: function (d) {
      validarClave(d.clave);
      var txt = JSON.stringify(d.valor === undefined ? null : d.valor);
      if (txt.length > 2000000) { throw new Error('Demasiado grande para el almacén.'); }
      GM_setValue(d.clave, JSON.parse(txt));
      return { guardado: true };
    },
    // Lo que guardaba el «Mi PJ» antiguo (mismo script, mismo almacén): PAM lo pasa al formato nuevo.
    legado: function () {
      var out = {};
      (typeof GM_listValues === 'function' ? GM_listValues() : []).forEach(function (k) { if (!/^pam\./.test(k)) { out[k] = GM_getValue(k, null); } });
      return { valores: out };
    }
  };

  // ---------------------------------------------------------------
  // Canal de mensajes con PAM
  // ---------------------------------------------------------------
  function crearCanal(destino, origen, manejadores) {
    var siguiente = 1, pendientes = {};
    window.addEventListener('message', function (e) {
      if (e.origin !== origen) { return; }
      var m = e.data;
      if (!m || typeof m !== 'object' || m.de !== 'pam' || typeof m.pam !== 'number') { return; }
      if (m.re) {
        var p = pendientes[m.re]; if (!p) { return; }
        delete pendientes[m.re]; clearTimeout(p.t);
        if (m.ok) { p.ok(m.resultado); } else { p.ko(new Error(m.error || 'Error en PAM')); }
        return;
      }
      var responder = function (r) { r.pam = PROTOCOLO; r.de = 'agente'; r.re = m.id; destino().postMessage(r, origen); };
      if (m.pam !== PROTOCOLO && m.tipo !== 'hola') {
        responder({ ok: false, error: 'Protocolo ' + m.pam + ' no soportado: este agente habla el ' + PROTOCOLO + '. Actualiza el script.' });
        return;
      }
      var h = Object.prototype.hasOwnProperty.call(manejadores, m.tipo) ? manejadores[m.tipo] : null;
      if (!h) { responder({ ok: false, error: 'Tipo desconocido: ' + m.tipo }); return; }
      Promise.resolve().then(function () { return h(m.datos || {}); }).then(
        function (res) { responder({ ok: true, resultado: res }); },
        function (err) { responder({ ok: false, error: String((err && err.message) || err) }); }
      );
    });
    return {
      pedir: function (tipo, datos, ms) {
        var id = 'a' + (siguiente++);
        return new Promise(function (ok, ko) {
          var t = setTimeout(function () { delete pendientes[id]; ko(new Error('PAM no responde')); }, ms || 5000);
          pendientes[id] = { ok: ok, ko: ko, t: t };
          destino().postMessage({ pam: PROTOCOLO, de: 'agente', id: id, tipo: tipo, datos: datos || {} }, origen);
        });
      }
    };
  }

  function hola() {
    return {
      agente: VERSION, protocolo: PROTOCOLO, foro: enForo ? location.host : null,
      cuenta: enForo ? cuentaConectada() : null, ruta: enForo ? location.pathname + location.search : null
    };
  }

  // En PAM (pestaña normal): solo el almacén
  if (enPam) {
    crearCanal(function () { return window; }, location.origin, {
      'hola': hola, 'almacen.leer': almacen.leer, 'almacen.guardar': almacen.guardar, 'almacen.legado': almacen.legado
    });
    return;
  }

  // ---------------------------------------------------------------
  // En el foro: lectura
  // ---------------------------------------------------------------
  function cuentaConectada() {
    var html = document.documentElement.innerHTML;
    var id = (html.match(/_userdata\["user_id"\]\s*=\s*(\d+)/) || [])[1];
    var nombre = (html.match(/_userdata\["username"\]\s*=\s*"([^"]*)"/) || [])[1];
    var logado = (html.match(/_userdata\["session_logged_in"\]\s*=\s*(\d)/) || [])[1];
    if (logado !== '1' || !id || id === '-1') { return null; }
    return { id: parseInt(id, 10), nombre: nombre };
  }

  function rutaSegura(ruta) {
    if (typeof ruta !== 'string' || ruta.charAt(0) !== '/' || ruta.charAt(1) === '/' || ruta.indexOf('\\') !== -1) { throw new Error('Ruta no permitida: ' + ruta); }
    var u = new URL(ruta, location.origin);
    if (u.origin !== location.origin) { throw new Error('Ruta no permitida: ' + ruta); }
    return u;
  }

  function leer(d) {
    var u = rutaSegura(d.ruta);
    u.searchParams.set('_', String(Date.now()));
    return fetch(u.href, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      return r.text().then(function (html) { return { estado: r.status, ruta: d.ruta, url: r.url.replace(location.origin, ''), html: html }; });
    });
  }

  function pedirDoc(ruta) {
    return leer({ ruta: ruta }).then(function (r) {
      if (r.estado !== 200) { throw new Error('HTTP ' + r.estado + ' en ' + ruta); }
      return new DOMParser().parseFromString(r.html, 'text/html');
    });
  }

  // ---------------------------------------------------------------
  // En el foro: escritura (solo la llama la puerta)
  // ---------------------------------------------------------------
  function camposDe(f, cambios) {
    var p = new URLSearchParams();
    Array.prototype.forEach.call(f.elements, function (e) {
      if (!e.name || e.disabled || e.type === 'submit' || e.type === 'button' || e.type === 'file' || e.type === 'reset') { return; }
      if ((e.type === 'checkbox' || e.type === 'radio') && !e.checked) { return; }
      if (Object.prototype.hasOwnProperty.call(cambios, e.name)) { return; }
      p.append(e.name, e.value);
    });
    Object.keys(cambios).forEach(function (k) { p.append(k, cambios[k]); });
    p.append('post', 'Enviar');
    return p;
  }

  function enviarFormulario(p) {
    return fetch('/post', { method: 'POST', credentials: 'same-origin', body: p, headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } })
      .then(function (r) { return r.text(); }).then(function (t) {
        var plano = t.replace(/\s+/g, ' ');
        var fl = plano.match(/Espera\s+(\d+)\s+segundos/i);
        if (fl) { return { estado: 'flood', segundos: parseInt(fl[1], 10) }; }
        if (/antispam/i.test(plano)) { return { estado: 'antispam' }; }
        if (/éxito/i.test(plano)) { var m = plano.match(/viewtopic\?t=\d+[^"#]*#(\d+)/); return { estado: 'ok', post: m ? m[1] : null }; }
        return { estado: 'desconocido' };
      });
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Reintenta solo si el foro pide esperar (antiflood), hasta 3 veces.
  function conReintentos(fn) {
    var n = 0;
    function uno() { return fn().then(function (r) { if (r.estado === 'flood' && n < 3) { n++; return esperar(((r.segundos || 10) + 1) * 1000).then(uno); } return r; }); }
    return uno();
  }

  function formularioEdicion(post) {
    return pedirDoc('/post?p=' + post + '&mode=editpost').then(function (d) {
      var f = d.querySelector('form[name="post"]');
      if (!f || !f.elements.message) { throw new Error('No puedo editar el mensaje ' + post + ' (¿no es tuyo?).'); }
      return f;
    });
  }

  function responderTema(tema, texto) {
    return conReintentos(function () {
      return pedirDoc('/post?t=' + tema + '&mode=reply').then(function (d) {
        var f = d.querySelector('form[name="post"]');
        if (!f) { return { estado: 'error', detalle: 'No puedes responder en este tema.' }; }
        return enviarFormulario(camposDe(f, { message: texto }));
      });
    });
  }

  function editarMensaje(post, original, nuevo, motivo) {
    return formularioEdicion(post).then(function (f) {
      // Si alguien lo cambió desde que PAM lo leyó, no se toca.
      if (f.elements.message.value !== original) { return { estado: 'cambiado' }; }
      return conReintentos(function () {
        return formularioEdicion(post).then(function (f2) { return enviarFormulario(camposDe(f2, { message: nuevo, edit_reason: motivo || '' })); });
      }).then(function (r) {
        if (r.estado === 'flood' || r.estado === 'antispam') { return r; }
        // Se comprueba volviendo a leer el mensaje.
        return formularioEdicion(post).then(function (f3) {
          return f3.elements.message.value === nuevo ? { estado: 'ok', post: post } : { estado: 'error', detalle: 'El mensaje no quedó como se esperaba.' };
        });
      });
    });
  }

  // ---------------------------------------------------------------
  // Interfaz del agente (shadow DOM: el CSS del foro no le afecta)
  // ---------------------------------------------------------------
  var host = document.createElement('div');
  host.id = 'pam-agente';
  document.body.appendChild(host);
  var raiz = host.attachShadow({ mode: 'open' });
  var estilo = document.createElement('style');
  estilo.textContent = [
    ':host{all:initial}',
    '.pastilla{position:fixed;right:16px;bottom:16px;z-index:2147483000;background:#2b2440;color:#f3ead7;border:1px solid #6b62ae;border-radius:999px;padding:8px 14px;font:600 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}',
    '.marco{position:fixed;right:16px;bottom:60px;z-index:2147483000;width:400px;height:600px;max-width:calc(100vw - 32px);max-height:calc(100vh - 80px);border:1px solid #6b62ae;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.45);background:#1d1830;display:none}',
    '.marco.abierto{display:block}',
    '.marco iframe{width:100%;height:100%;border:0;border-radius:10px}',
    '.fondo{position:fixed;inset:0;z-index:2147483600;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif}',
    '.caja{background:#f6f1e6;color:#222;border-radius:10px;max-width:760px;width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.5)}',
    '.caja h3{margin:0 0 6px;font-size:17px}', '.caja p{margin:6px 0}', '.caja small{color:#555}',
    '.caja textarea{width:100%;box-sizing:border-box;min-height:160px;font:12px ui-monospace,Consolas,monospace;margin:8px 0;padding:8px}',
    '.caja textarea[readonly]{background:#ebe5d6}', '.caja ul{margin:6px 0 6px 18px;padding:0}',
    '.dif{font:12px ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #d8cfbb;border-radius:6px;padding:6px 8px;max-height:45vh;overflow:auto}',
    '.dif .mas{background:#e3f4e6;color:#005c1f}', '.dif .menos{background:#f9e1e3;color:#a3000d;text-decoration:line-through}', '.dif .corte{color:#999}',
    '.botones{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:8px}',
    '.botones button{font:600 13px system-ui,sans-serif;padding:7px 14px;border-radius:6px;border:1px solid #888;background:#fff;cursor:pointer}',
    '.botones .si{background:#005c1f;border-color:#005c1f;color:#fff}', '.botones .no{background:#a3000d;border-color:#a3000d;color:#fff}'
  ].join('\n');
  raiz.appendChild(estilo);

  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'texto') { e.textContent = attrs[k]; } else if (k === 'clase') { e.className = attrs[k]; } else { e.setAttribute(k, attrs[k]); }
    });
    (hijos || []).forEach(function (h) { if (h) { e.appendChild(h); } });
    return e;
  }

  function dialogo(titulo, cuerpo, botones) {
    return new Promise(function (resolver) {
      var fila = el('div', { clase: 'botones' });
      var caja = el('div', { clase: 'caja', role: 'dialog', 'aria-modal': 'true' }, [el('h3', { texto: titulo })].concat(cuerpo, [fila]));
      var fondo = el('div', { clase: 'fondo' }, [caja]);
      botones.forEach(function (b) {
        var bt = el('button', { texto: b.texto, clase: b.clase || '', type: 'button' });
        bt.addEventListener('click', function () { if (b.alPulsar && b.alPulsar() === false) { return; } fondo.remove(); resolver(b.id); });
        fila.appendChild(bt);
      });
      raiz.appendChild(fondo);
      var primero = fila.querySelector('button'); if (primero) { primero.focus(); }
    });
  }

  // Comparación por líneas con dos de contexto (la de la puerta del Escriba).
  function compararLineas(antes, despues) {
    var A = antes.split('\n'), B = despues.split('\n'), ini = 0;
    while (ini < A.length && ini < B.length && A[ini] === B[ini]) { ini++; }
    var fa = A.length - 1, fb = B.length - 1;
    while (fa >= ini && fb >= ini && A[fa] === B[fb]) { fa--; fb--; }
    var ma = A.slice(ini, fa + 1), mb = B.slice(ini, fb + 1), medio = [];
    if (ma.length * mb.length <= 250000) {
      var n = ma.length, m = mb.length, tabla = [], i, j;
      for (i = 0; i <= n; i++) { tabla.push(new Uint16Array(m + 1)); }
      for (i = n - 1; i >= 0; i--) { for (j = m - 1; j >= 0; j--) { tabla[i][j] = ma[i] === mb[j] ? tabla[i + 1][j + 1] + 1 : Math.max(tabla[i + 1][j], tabla[i][j + 1]); } }
      i = 0; j = 0;
      while (i < n && j < m) {
        if (ma[i] === mb[j]) { medio.push({ t: '=', l: ma[i] }); i++; j++; }
        else if (tabla[i + 1][j] >= tabla[i][j + 1]) { medio.push({ t: '-', l: ma[i] }); i++; }
        else { medio.push({ t: '+', l: mb[j] }); j++; }
      }
      while (i < n) { medio.push({ t: '-', l: ma[i++] }); }
      while (j < m) { medio.push({ t: '+', l: mb[j++] }); }
    } else {
      ma.forEach(function (l) { medio.push({ t: '-', l: l }); }); mb.forEach(function (l) { medio.push({ t: '+', l: l }); });
    }
    var todo = A.slice(0, ini).map(function (l) { return { t: '=', l: l }; }).concat(medio).concat(A.slice(fa + 1).map(function (l) { return { t: '=', l: l }; }));
    var mostrar = todo.map(function () { return false; });
    todo.forEach(function (x, k) { if (x.t !== '=') { for (var d = -2; d <= 2; d++) { if (todo[k + d]) { mostrar[k + d] = true; } } } });
    var res = [], corte = false;
    todo.forEach(function (x, k) { if (mostrar[k]) { res.push(x); corte = false; } else if (!corte) { res.push({ t: '…', l: '' }); corte = true; } });
    return res;
  }

  function vistaDiferencias(antes, despues) {
    var caja = el('div', { clase: 'dif' });
    compararLineas(antes, despues).forEach(function (x) {
      caja.appendChild(el('div', { clase: x.t === '+' ? 'mas' : x.t === '-' ? 'menos' : x.t === '…' ? 'corte' : '', texto: (x.t === '=' ? '  ' : x.t === '…' ? '…' : x.t + ' ') + x.l }));
    });
    return caja;
  }

  // Puerta para publicar: nada se publica sin pasar por aquí.
  function puertaPublicar(d) {
    var tema = parseInt(d.tema, 10);
    if (!(tema > 0)) { throw new Error('Tema no válido.'); }
    if (typeof d.mensaje !== 'string' || !d.mensaje.trim()) { throw new Error('Mensaje vacío.'); }
    var area = el('textarea', { readonly: 'readonly' }); area.value = d.mensaje;
    var cuerpo = [
      el('p', { texto: 'PAM quiere responder en el tema t' + tema + ' con tu cuenta (' + ((cuentaConectada() || {}).nombre || 'sin sesión') + ').' }),
      d.motivo ? el('p', { texto: 'Motivo: ' + d.motivo }) : null, area,
      el('small', { texto: 'Esta ventana es del script, no de PAM: lo que ves aquí es exactamente lo que se publicará.' })
    ];
    return dialogo('Publicar en el foro', cuerpo, [
      { id: 'denegar', texto: 'Denegar', clase: 'no' },
      { id: 'modificar', texto: 'Modificar', alPulsar: function () { area.removeAttribute('readonly'); area.focus(); return false; } },
      { id: 'aceptar', texto: 'Aceptar', clase: 'si' }
    ]).then(function (dec) {
      if (dec !== 'aceptar') { return { publicado: false, decision: dec }; }
      var texto = area.value;
      return responderTema(tema, texto).then(function (r) {
        return { publicado: r.estado === 'ok', decision: 'aceptar', modificado: texto !== d.mensaje, estado: r.estado, post: r.post || null, detalle: r.detalle || null };
      });
    });
  }

  // Puerta para editar: enseña qué líneas cambian; «Modificar» deja retocar el texto final.
  function puertaEditar(d) {
    var post = parseInt(d.post, 10);
    if (!(post > 0)) { throw new Error('Mensaje no válido.'); }
    if (typeof d.original !== 'string' || typeof d.nuevo !== 'string') { throw new Error('Faltan los textos.'); }
    if (d.original === d.nuevo) { return Promise.resolve({ editado: false, decision: 'igual' }); }
    var area = el('textarea', { readonly: 'readonly' }); area.value = d.nuevo; area.style.display = 'none';
    var dif = vistaDiferencias(d.original, d.nuevo);
    var cuerpo = [
      el('p', { texto: 'PAM quiere editar tu mensaje ' + post + (d.titulo ? ' (' + d.titulo + ')' : '') + '. En verde lo que se añade, en rojo lo que se quita:' }),
      d.motivo ? el('p', { texto: 'Motivo: ' + d.motivo }) : null, dif, area,
      el('small', { texto: 'Esta ventana es del script, no de PAM. Si el mensaje ha cambiado desde que PAM lo leyó, no se tocará.' })
    ];
    return dialogo('Editar un mensaje del foro', cuerpo, [
      { id: 'denegar', texto: 'Denegar', clase: 'no' },
      { id: 'modificar', texto: 'Modificar', alPulsar: function () { dif.style.display = 'none'; area.style.display = ''; area.removeAttribute('readonly'); area.focus(); return false; } },
      { id: 'aceptar', texto: 'Aceptar', clase: 'si' }
    ]).then(function (dec) {
      if (dec !== 'aceptar') { return { editado: false, decision: dec }; }
      var texto = area.value;
      return editarMensaje(post, d.original, texto, d.motivo).then(function (r) {
        return { editado: r.estado === 'ok', decision: 'aceptar', modificado: texto !== d.nuevo, estado: r.estado, detalle: r.detalle || null };
      });
    });
  }

  // ---------------------------------------------------------------
  // Panel de PAM dentro del foro
  // ---------------------------------------------------------------
  var marco = el('div', { clase: 'marco' });
  var iframe = el('iframe', { title: 'PAM', src: PAM.origen + PAM.ruta + 'panel.html?foro=' + encodeURIComponent(location.origin) });
  marco.appendChild(iframe);
  var pastilla = el('button', { clase: 'pastilla', type: 'button', texto: 'PAM' });
  pastilla.addEventListener('click', function () { marco.classList.toggle('abierto'); });
  raiz.appendChild(marco);
  raiz.appendChild(pastilla);

  var canal = crearCanal(function () { return iframe.contentWindow; }, PAM.origen, {
    'hola': hola,
    'foro.leer': leer,
    'foro.publicar': puertaPublicar,
    'foro.editar': puertaEditar,
    'almacen.leer': almacen.leer,
    'almacen.guardar': almacen.guardar,
    'almacen.legado': almacen.legado,
    'panel.tamano': function (d) {
      var an = Math.max(300, Math.min(900, parseInt(d.ancho, 10) || 400)), al = Math.max(300, Math.min(1200, parseInt(d.alto, 10) || 600));
      marco.style.width = an + 'px'; marco.style.height = al + 'px'; return { ancho: an, alto: al };
    },
    'panel.mostrar': function (d) { marco.classList.toggle('abierto', !!d.abierto); return { abierto: marco.classList.contains('abierto') }; },
    'panel.pastilla': function (d) { pastilla.textContent = String(d.texto || 'PAM').slice(0, 40); return { ok: true }; }
  });

  // ---------------------------------------------------------------
  // Editor del foro: antes de enviar, PAM lo revisa
  // ---------------------------------------------------------------
  function textoEditor(ta) {
    try { var $ = W.jQuery || W.$; var inst = $ && $(ta).sceditor && $(ta).sceditor('instance'); if (inst && inst.val) { return inst.val(); } } catch (e) {}
    return ta.value;
  }

  function engancharEditor(form) {
    if (form.getAttribute('data-pam-agente')) { return; }
    form.setAttribute('data-pam-agente', '1');
    var ta = form.querySelector('textarea[name="message"]'), pasar = false;
    form.addEventListener('submit', function (e) {
      if (pasar) { pasar = false; return; }
      var sub = e.submitter;
      if (sub && /preview|draft|borrador|previsual/i.test((sub.name || '') + ' ' + (sub.value || ''))) { return; }
      e.preventDefault(); e.stopImmediatePropagation();
      var seguir = function () { pasar = true; try { form.requestSubmit(sub || undefined); } catch (err) { form.submit(); } };
      canal.pedir('editor.revisar', { texto: textoEditor(ta), ruta: location.pathname + location.search }, 3000).then(function (r) {
        var avisos = (r && r.avisos) || [];
        if (!avisos.length) { seguir(); return; }
        var lista = el('ul', {}, avisos.map(function (a) { return el('li', { texto: String(a) }); }));
        dialogo('Antes de publicar', [el('p', { texto: 'PAM ha revisado el mensaje y ha encontrado:' }), lista], [
          { id: 'volver', texto: 'Volver a editar' },
          { id: 'seguir', texto: 'Publicar igualmente', clase: 'no' }
        ]).then(function (dec) { if (dec === 'seguir') { seguir(); } });
      }, function (err) {
        console.warn('[PAM agente] sin revisión:', err.message); // si PAM no contesta, no se bloquea al usuario
        seguir();
      });
    }, true);
  }

  function buscarEditores() {
    Array.prototype.forEach.call(document.querySelectorAll('form'), function (f) { if (f.querySelector('textarea[name="message"]')) { engancharEditor(f); } });
  }
  buscarEditores(); setTimeout(buscarEditores, 1500); setTimeout(buscarEditores, 4000);
})();
