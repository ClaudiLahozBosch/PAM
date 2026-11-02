// ==UserScript==
// @name         PAM · Agente (staging)
// @namespace    https://claudilahozbosch.github.io/PAM/staging
// @version      0.1.0
// @description  Prueba: el script solo lee el foro, publica tras tu «Aceptar» y muestra el panel de PAM. Toda la lógica vive en PAM.
// @match        https://test-forito.foroactivo.com/*
// @match        https://claudilahozbosch.github.io/PAM/*
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

/* El agente hace SOLO lo que PAM no puede hacer desde su dominio:
   1. leer páginas del foro con tu sesión (solo rutas del propio foro, solo GET);
   2. publicar en el foro, siempre después de su propia puerta Aceptar / Modificar / Denegar;
   3. guardar datos compartidos entre el foro y PAM (almacén de Tampermonkey, claves «pam.*»);
   4. mostrar el panel de PAM dentro del foro (un iframe);
   5. avisar a PAM antes de que publiques desde el editor del foro, para que lo revise.
   No sabe nada de fichas ni de canjes. Habla con PAM con mensajes { pam, id, tipo, datos }. */

(function () {
  'use strict';

  var VERSION = '0.1.0';
  var PROTOCOLO = 1;
  // Staging: el fork de pruebas (otro dominio que PAM real, así no ve los datos de los jugadores).
  var PAM = { origen: 'https://claudilahozbosch.github.io', ruta: '/PAM/poc-agente/web/' };
  var FOROS = ['test-forito.foroactivo.com'];

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
    }
  };

  // ---------------------------------------------------------------
  // Canal de mensajes con PAM
  // ---------------------------------------------------------------
  // destino(): ventana a la que se responde; origen: único origen aceptado.
  // Los mensajes llevan «de» para que, en la misma ventana, cada lado ignore los suyos.
  function crearCanal(destino, origen, manejadores) {
    var siguiente = 1;
    var pendientes = {};
    window.addEventListener('message', function (e) {
      if (e.origin !== origen) { return; }
      var m = e.data;
      if (!m || typeof m !== 'object' || m.de !== 'pam' || typeof m.pam !== 'number') { return; }
      if (m.re) {
        var p = pendientes[m.re];
        if (!p) { return; }
        delete pendientes[m.re]; clearTimeout(p.t);
        if (m.ok) { p.ok(m.resultado); } else { p.ko(new Error(m.error || 'Error en PAM')); }
        return;
      }
      var responder = function (r) {
        r.pam = PROTOCOLO; r.de = 'agente'; r.re = m.id;
        destino().postMessage(r, origen);
      };
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
    return { agente: VERSION, protocolo: PROTOCOLO, foro: enForo ? location.host : null, cuenta: enForo ? cuentaConectada() : null };
  }

  // ---------------------------------------------------------------
  // En PAM (pestaña normal): solo el almacén
  // ---------------------------------------------------------------
  if (enPam) {
    crearCanal(function () { return window; }, location.origin, {
      'hola': hola,
      'almacen.leer': almacen.leer,
      'almacen.guardar': almacen.guardar
    });
    return;
  }

  // ---------------------------------------------------------------
  // En el foro
  // ---------------------------------------------------------------
  function cuentaConectada() {
    var html = document.documentElement.innerHTML;
    var id = (html.match(/_userdata\["user_id"\]\s*=\s*(\d+)/) || [])[1];
    var nombre = (html.match(/_userdata\["username"\]\s*=\s*"([^"]*)"/) || [])[1];
    var logado = (html.match(/_userdata\["session_logged_in"\]\s*=\s*(\d)/) || [])[1];
    if (logado !== '1' || !id || id === '-1') { return null; }
    return { id: parseInt(id, 10), nombre: nombre };
  }

  // Solo rutas del propio foro: "/t5-algo", "/u1", "/post?p=3&mode=editpost"...
  function rutaSegura(ruta) {
    if (typeof ruta !== 'string' || ruta.charAt(0) !== '/' || ruta.charAt(1) === '/' || ruta.indexOf('\\') !== -1) {
      throw new Error('Ruta no permitida: ' + ruta);
    }
    var u = new URL(ruta, location.origin);
    if (u.origin !== location.origin) { throw new Error('Ruta no permitida: ' + ruta); }
    return u;
  }

  function leer(d) {
    var u = rutaSegura(d.ruta);
    u.searchParams.set('_', String(Date.now()));
    return fetch(u.href, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      return r.text().then(function (html) {
        return { estado: r.status, ruta: d.ruta, html: html };
      });
    });
  }

  function pedirDoc(ruta) {
    return leer({ ruta: ruta }).then(function (r) {
      if (r.estado !== 200) { throw new Error('HTTP ' + r.estado + ' en ' + ruta); }
      return new DOMParser().parseFromString(r.html, 'text/html');
    });
  }

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
    return fetch('/post', {
      method: 'POST', credentials: 'same-origin', body: p,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
    }).then(function (r) { return r.text(); }).then(function (t) {
      var plano = t.replace(/\s+/g, ' ');
      var fl = plano.match(/Espera\s+(\d+)\s+segundos/i);
      if (fl) { return { estado: 'flood', segundos: parseInt(fl[1], 10) }; }
      if (/antispam/i.test(plano)) { return { estado: 'antispam' }; }
      if (/éxito/i.test(plano)) {
        var m = plano.match(/viewtopic\?t=\d+[^"#]*#(\d+)/);
        return { estado: 'ok', post: m ? m[1] : null };
      }
      return { estado: 'desconocido' };
    });
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function responderTema(tema, texto) {
    var intentos = 0;
    function uno() {
      return pedirDoc('/post?t=' + tema + '&mode=reply').then(function (d) {
        var f = d.querySelector('form[name="post"]');
        if (!f) { return { estado: 'error', detalle: 'No puedes responder en este tema.' }; }
        return enviarFormulario(camposDe(f, { message: texto }));
      }).then(function (r) {
        if (r.estado === 'flood' && intentos < 3) { intentos++; return esperar(((r.segundos || 10) + 1) * 1000).then(uno); }
        return r;
      });
    }
    return uno();
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
    '.marco{position:fixed;right:16px;bottom:60px;z-index:2147483000;width:380px;height:560px;max-width:calc(100vw - 32px);max-height:calc(100vh - 80px);border:1px solid #6b62ae;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.45);background:#1d1830;display:none}',
    '.marco.abierto{display:block}',
    '.marco iframe{width:100%;height:100%;border:0;border-radius:10px}',
    '.fondo{position:fixed;inset:0;z-index:2147483600;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif}',
    '.caja{background:#f6f1e6;color:#222;border-radius:10px;max-width:640px;width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.5)}',
    '.caja h3{margin:0 0 6px;font-size:17px}',
    '.caja p{margin:6px 0}',
    '.caja small{color:#555}',
    '.caja textarea{width:100%;box-sizing:border-box;min-height:160px;font:12px ui-monospace,Consolas,monospace;margin:8px 0;padding:8px}',
    '.caja textarea[readonly]{background:#ebe5d6}',
    '.caja ul{margin:6px 0 6px 18px;padding:0}',
    '.botones{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:8px}',
    '.botones button{font:600 13px system-ui,sans-serif;padding:7px 14px;border-radius:6px;border:1px solid #888;background:#fff;cursor:pointer}',
    '.botones .si{background:#005c1f;border-color:#005c1f;color:#fff}',
    '.botones .no{background:#a3000d;border-color:#a3000d;color:#fff}'
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

  // Diálogo propio del agente. Devuelve la etiqueta del botón pulsado.
  function dialogo(titulo, cuerpo, botones) {
    return new Promise(function (resolver) {
      var fila = el('div', { clase: 'botones' });
      var caja = el('div', { clase: 'caja', role: 'dialog', 'aria-modal': 'true' }, [el('h3', { texto: titulo })].concat(cuerpo, [fila]));
      var fondo = el('div', { clase: 'fondo' }, [caja]);
      botones.forEach(function (b) {
        var bt = el('button', { texto: b.texto, clase: b.clase || '', type: 'button' });
        bt.addEventListener('click', function () {
          if (b.alPulsar && b.alPulsar() === false) { return; }
          fondo.remove(); resolver(b.id);
        });
        fila.appendChild(bt);
      });
      raiz.appendChild(fondo);
      var primero = fila.querySelector('button'); if (primero) { primero.focus(); }
    });
  }

  // Puerta: nada se publica sin pasar por aquí.
  function puertaPublicar(d) {
    var tema = parseInt(d.tema, 10);
    if (!(tema > 0)) { throw new Error('Tema no válido.'); }
    if (typeof d.mensaje !== 'string' || !d.mensaje.trim()) { throw new Error('Mensaje vacío.'); }
    var area = el('textarea', { readonly: 'readonly' });
    area.value = d.mensaje;
    var cuerpo = [
      el('p', { texto: 'PAM quiere responder en el tema t' + tema + ' con tu cuenta (' + ((cuentaConectada() || {}).nombre || 'sin sesión') + ').' }),
      d.motivo ? el('p', { texto: 'Motivo: ' + d.motivo }) : null,
      area,
      el('small', { texto: 'Esta ventana es del script, no de PAM: lo que ves aquí es exactamente lo que se publicará.' })
    ];
    return dialogo('Publicar en el foro', cuerpo, [
      { id: 'denegar', texto: 'Denegar', clase: 'no' },
      { id: 'modificar', texto: 'Modificar', alPulsar: function () { area.removeAttribute('readonly'); area.focus(); return false; } },
      { id: 'aceptar', texto: 'Aceptar', clase: 'si' }
    ]).then(function (decision) {
      if (decision !== 'aceptar') { return { publicado: false, decision: decision }; }
      var texto = area.value;
      return responderTema(tema, texto).then(function (r) {
        return { publicado: r.estado === 'ok', decision: 'aceptar', modificado: texto !== d.mensaje, estado: r.estado, post: r.post || null, detalle: r.detalle || null };
      });
    });
  }

  // Panel de PAM dentro del foro
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
    'almacen.leer': almacen.leer,
    'almacen.guardar': almacen.guardar
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
    var ta = form.querySelector('textarea[name="message"]');
    var pasar = false;
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
        // Si PAM no contesta, no se bloquea al usuario.
        console.warn('[PAM agente] sin revisión:', err.message);
        seguir();
      });
    }, true);
  }

  function buscarEditores() {
    Array.prototype.forEach.call(document.querySelectorAll('form'), function (f) {
      if (f.querySelector('textarea[name="message"]')) { engancharEditor(f); }
    });
  }
  buscarEditores(); setTimeout(buscarEditores, 1500); setTimeout(buscarEditores, 4000);
})();
