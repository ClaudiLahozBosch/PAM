// ==UserScript==
// @name         PAM · Agente (staging)
// @namespace    https://claudilahozbosch.github.io/PAM/staging
// @version      0.6.1
// @description  El script mínimo de PAM: lee el foro con tu sesión, publica y edita SOLO tras tu «Aceptar» y muestra el panel «Mi PJ» de PAM. Toda la lógica está en PAM.
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
   2. publicar y editar mensajes, siempre después de su propia puerta Aceptar / Modificar / Denegar
      (la del Escriba: todos los pasos a la vista, con las diferencias de cada mensaje que se edita);
   3. guardar datos compartidos entre el foro y PAM (almacén de Tampermonkey, claves «pam.*»);
   4. mostrar el panel «Mi PJ», que es una página de PAM;
   5. pasar a PAM el texto del editor del foro antes de enviarlo, para que lo revise;
   6. abrir PAM y pasarle un mensaje desde el foro («Enviar a PAM»: PAM solo acepta datos que vengan del foro).
   No sabe nada de fichas ni de canjes. Habla con PAM con mensajes { pam, de, id, tipo, datos } (protocolo 1). */

(function () {
  'use strict';

  var VERSION = '0.6.1';
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
      },
      avisar: function (tipo, datos) { destino().postMessage({ pam: PROTOCOLO, de: 'agente', id: 'av' + (siguiente++), tipo: tipo, datos: datos || {} }, origen); }
    };
  }

  function ventana() { return { ancho: window.innerWidth, alto: window.innerHeight }; }
  // «#escriba-publicar» (llegada desde PAM a publicar la petición): se apunta para PAM y se quita de la dirección,
  // así al recargar no se vuelve a abrir la puerta.
  var hashInicial = '';
  if (enForo && /^#escriba-[a-z]{1,20}$/.test(location.hash)) {
    hashInicial = location.hash;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ }
  }
  function hola() {
    return {
      agente: VERSION, protocolo: PROTOCOLO, foro: enForo ? location.host : null, hash: hashInicial,
      cuenta: enForo ? cuentaConectada() : null, ruta: enForo ? location.pathname + location.search : null, ventana: ventana(),
      editor: enForo ? !!document.querySelector('textarea[name="message"]') : false,
      titulo: enForo ? ((document.querySelector('h1.page-title') || {}).textContent || '').trim() : ''
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

  // Mensajes de una página de tema (lo justo para no publicar dos veces lo mismo).
  function postsDe(doc) {
    return Array.prototype.map.call(doc.querySelectorAll('div.post[id^="p"]'), function (p) {
      var a = p.querySelector('.author a[href^="/u"], .postprofile a[href^="/u"]');
      return { id: (p.id || '').replace(/\D/g, ''), autorId: a ? parseInt((a.getAttribute('href').match(/^\/u(\d+)/) || [])[1], 10) : null };
    }).filter(function (p) { return p.id; });
  }
  // Los mensajes de las dos últimas páginas del tema.
  function ultimosMensajes(tema) {
    return pedirDoc('/t' + tema + '-').then(function (d1) {
      var max = 0;
      Array.prototype.forEach.call(d1.querySelectorAll('a[href*="/t' + tema + 'p"]'), function (a) { var x = (a.getAttribute('href') || '').match(new RegExp('/t' + tema + 'p(\\d+)-')); if (x) { max = Math.max(max, +x[1]); } });
      if (!max) { return postsDe(d1); }
      return pedirDoc('/t' + tema + 'p' + max + '-').then(function (dn) { return postsDe(d1).concat(postsDe(dn)); });
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
  function conReintentos(fn, avisar) {
    var n = 0;
    function uno() {
      return fn().then(function (r) {
        if (r.estado === 'flood' && n < 3) {
          n++; var s = (r.segundos || 10) + 1;
          if (avisar) { avisar('El foro pide esperar ' + s + ' s entre mensajes. Vuelvo a intentar…'); }
          return esperar(s * 1000).then(uno);
        }
        return r;
      });
    }
    return uno();
  }

  function formularioEdicion(post) {
    return pedirDoc('/post?p=' + post + '&mode=editpost').then(function (d) {
      var f = d.querySelector('form[name="post"]');
      if (!f || !f.elements.message) { throw new Error('No puedo editar el mensaje ' + post + ' (¿no es tuyo?).'); }
      return f;
    });
  }

  function mismoTexto(a, b) {
    var n = function (s) { return String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim(); };
    return n(a) === n(b);
  }

  // ¿Ya está publicado este texto entre tus últimos mensajes del tema? (para no publicar dos veces)
  function buscarMensajePropio(cuenta, tema, texto) {
    return ultimosMensajes(tema).then(function (posts) {
      var propios = posts.filter(function (p) { return p.autorId === cuenta.id; }).slice(-3).reverse();
      var i = 0;
      function sig() {
        if (i >= propios.length) { return null; }
        var p = propios[i++];
        return formularioEdicion(p.id).then(function (f) { return mismoTexto(f.elements.message.value, texto) ? p : sig(); }, sig);
      }
      return sig();
    });
  }

  // Copia del mensaje antes de editarlo (las últimas 30, por cuenta), por si hay que volver atrás.
  function guardarCopia(cuenta, post, texto) {
    var k = 'pam.copias.' + location.host + '.' + cuenta.id, l = GM_getValue(k, []) || [];
    l.push({ post: post, fecha: new Date().toISOString(), bbcode: texto });
    GM_setValue(k, l.slice(-30));
  }

  // Paso: { tipo: 'editar', post, original, nuevo, motivo }  o  { tipo: 'publicar', tema, texto }
  function ejecutarPaso(cuenta, paso, avisar) {
    if (paso.tipo === 'editar') {
      return formularioEdicion(paso.post).then(function (f) {
        // Si alguien lo ha cambiado desde que PAM lo leyó, no se toca.
        if (f.elements.message.value !== paso.original) { return { estado: 'cambiado' }; }
        guardarCopia(cuenta, paso.post, paso.original);
        return conReintentos(function () {
          return formularioEdicion(paso.post).then(function (f2) { return enviarFormulario(camposDe(f2, { message: paso.nuevo, edit_reason: paso.motivo || '' })); });
        }, avisar).then(function (r) {
          if (r.estado === 'flood' || r.estado === 'antispam') { return r; }
          // Se comprueba leyendo el mensaje otra vez.
          return formularioEdicion(paso.post).then(function (f3) {
            return f3.elements.message.value === paso.nuevo ? { estado: 'ok', post: paso.post } : { estado: 'error', detalle: 'El mensaje no quedó como se esperaba.' };
          });
        });
      });
    }
    if (paso.tipo === 'publicar') {
      var yaPublicado = function () { return buscarMensajePropio(cuenta, paso.tema, paso.texto).catch(function () { return null; }); };
      var intento = 0;
      return conReintentos(function () {
        var antes = intento++ ? yaPublicado() : Promise.resolve(null);
        return antes.then(function (ya) {
          if (ya) { return { estado: 'ok', post: ya.id }; }
          return pedirDoc('/post?t=' + paso.tema + '&mode=reply').then(function (d) {
            var f = d.querySelector('form[name="post"]');
            if (!f) { return { estado: 'error', detalle: 'No podés responder en este tema.' }; }
            return enviarFormulario(camposDe(f, { message: paso.texto })).catch(function () { return { estado: 'desconocido' }; });
          });
        });
      }, avisar).then(function (r) {
        if (r.estado !== 'desconocido') { return r; }
        return yaPublicado().then(function (ya) {
          return ya ? { estado: 'ok', post: ya.id } : { estado: 'error', detalle: 'El foro no confirmó la publicación y no la encuentro en el tema. Mirá el tema antes de volver a intentarlo.' };
        });
      }).then(function (r) {
        if (r.estado !== 'ok' || r.post) { return r; }
        // Sin número de mensaje en la respuesta: es tu último mensaje del tema.
        return ultimosMensajes(paso.tema).then(function (posts) {
          var propios = posts.filter(function (p) { return p.autorId === cuenta.id; });
          r.post = propios.length ? propios[propios.length - 1].id : null;
          return r;
        }).catch(function () { return r; });
      });
    }
    return Promise.resolve({ estado: 'error', detalle: 'Tipo de paso desconocido.' });
  }

  function enlacePost(post) { return location.origin + '/viewtopic?p=' + post + '#' + post; }

  // ---------------------------------------------------------------
  // Estilos y tema: los de «Mi PJ» y el Escriba (variables --m-*)
  // ---------------------------------------------------------------
  var TEMA_AVADENSE = { skin: 'avadense', ink: '#171a2b', panel: '#1e2236', 'panel-2': '#262a42', parchment: '#F1EADF', 'parchment-dim': '#a7a1b6', gold: '#B49768',
    'gold-bright': '#d6bd8f', 'arcane-bright': '#cf94a3', good: '#93b8a0', bad: '#d98377', 'line-strong': 'rgba(241,234,223,.16)', 'accent-ink': '#1b1e30',
    serif: '"Cormorant Garamond", Georgia, serif', sans: '"Nunito", system-ui, sans-serif' };
  var CSS_ESC = [
    ':host{all:initial}',
    '.esc-ui{--x-ink:var(--m-ink,#171a2b);--x-panel:var(--m-panel,#1e2236);--x-panel2:var(--m-panel-2,#262a42);--x-parch:var(--m-parchment,#F1EADF);--x-dim:var(--m-parchment-dim,#a7a1b6);',
    '--x-gold:var(--m-gold,#B49768);--x-goldb:var(--m-gold-bright,#d6bd8f);--x-arc:var(--m-arcane-bright,#cf94a3);--x-good:var(--m-good,#93b8a0);--x-bad:var(--m-bad,#d98377);--x-line:var(--m-line-strong,rgba(241,234,223,.16));',
    '--x-acc:var(--m-accent-ink,#1b1e30);--x-serif:var(--m-serif,"Cormorant Garamond",Georgia,serif);--x-sans:var(--m-sans,"Nunito",system-ui,sans-serif);font-family:var(--x-sans);color:var(--x-parch);font-size:14px;line-height:1.45;text-align:left}',
    '.esc-ui *{box-sizing:border-box}',
    '.esc-ui a{color:var(--x-goldb);text-decoration:none;border-bottom:1px dotted color-mix(in srgb,var(--x-gold) 60%,transparent)}',
    '.esc-ui.puerta-fondo{position:fixed;inset:0;z-index:99999;background:rgba(8,7,14,.6);display:flex;align-items:flex-start;justify-content:center;padding:4vh 16px;overflow:auto}',
    '.esc-ui .puerta{width:min(760px,100%);border-radius:16px;padding:20px 22px;display:grid;gap:12px;background:radial-gradient(500px 200px at 0% 0%,color-mix(in srgb,var(--x-arc) 14%,transparent),transparent 70%),var(--x-panel);border:1px solid var(--x-gold);box-shadow:0 30px 80px -30px #000}',
    '.esc-ui .p-cab{display:flex;justify-content:space-between;align-items:baseline;gap:10px}',
    '.esc-ui .p-cab b{font-family:var(--x-serif);font-style:italic;font-weight:500;font-size:28px;color:var(--x-goldb)}',
    '.esc-ui .p-cab small{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--x-dim)}',
    '.esc-ui .p-expl{color:var(--x-dim)}',
    '.esc-ui .aviso{padding:8px 10px;border-radius:10px;border-left:3px solid var(--x-gold);background:color-mix(in srgb,var(--x-gold) 12%,transparent);font-size:13px}',
    '.esc-ui .error{padding:8px 10px;border-radius:10px;border-left:3px solid var(--x-bad);background:color-mix(in srgb,var(--x-bad) 10%,transparent);font-size:13px}',
    '.esc-ui .p-paso{padding:11px 13px;border-radius:12px;background:color-mix(in srgb,var(--x-panel2) 70%,transparent);border:1px solid var(--x-line);display:grid;gap:8px;min-width:0}',
    '.esc-ui .p-paso-cab{display:flex;justify-content:space-between;gap:10px;font-weight:700}',
    '.esc-ui .p-estado{font-size:11.5px;font-weight:700;white-space:nowrap}',
    '.esc-ui .ok{color:var(--x-good)}.esc-ui .mal{color:var(--x-bad)}.esc-ui .warn{color:var(--x-goldb)}.esc-ui .neutro{color:var(--x-dim)}',
    '.esc-ui .p-nota{color:var(--x-dim);font-size:12.5px}',
    '.esc-ui .p-diff{font:12px/1.5 Consolas,"Courier New",monospace;background:var(--x-ink);border-radius:10px;padding:8px 10px;overflow:auto;white-space:pre;max-height:320px}',
    '.esc-ui .p-diff .mas{background:color-mix(in srgb,var(--x-good) 22%,transparent)}',
    '.esc-ui .p-diff .menos{background:color-mix(in srgb,var(--x-bad) 22%,transparent)}',
    '.esc-ui .p-diff .corte{color:var(--x-dim)}',
    '.esc-ui .p-texto{display:block;width:100%;min-height:120px;max-height:320px;resize:vertical;font:12px/1.5 Consolas,"Courier New",monospace;background:var(--x-ink);color:var(--x-parch);border:1px solid var(--x-line);border-radius:10px;padding:8px 10px}',
    '.esc-ui .p-texto[hidden]{display:none}',
    '.esc-ui .p-texto:not([readonly]){border-color:var(--x-gold)}',
    '.esc-ui .p-info{min-height:1.4em;color:var(--x-dim)}',
    '.esc-ui .p-info.error{color:var(--x-parch)}',
    '.esc-ui .p-info.okmsg{padding:8px 10px;border-radius:10px;border-left:3px solid var(--x-good);background:color-mix(in srgb,var(--x-good) 12%,transparent);color:var(--x-parch)}',
    '.esc-ui .p-botones{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px}',
    '.esc-ui .p-btn,.esc-ui .b{font:700 12.5px var(--x-sans);border-radius:999px;padding:8px 14px;cursor:pointer;border:1px solid var(--x-line);background:color-mix(in srgb,var(--x-panel2) 90%,transparent);color:var(--x-parch);transition:border-color .2s,transform .2s;display:inline-block}',
    '.esc-ui .p-btn:hover,.esc-ui .b:hover{border-color:var(--x-gold);transform:translateY(-1px)}',
    '.esc-ui .p-btn.ok,.esc-ui .b.pri{background:var(--x-gold);border-color:var(--x-gold);color:var(--x-acc)}',
    '.esc-ui .p-btn.edit{background:transparent;border-color:var(--x-gold);color:var(--x-goldb)}',
    '.esc-ui .p-btn.no{background:transparent;border-color:var(--x-bad);color:var(--x-bad)}',
    '.esc-ui .p-btn:disabled,.esc-ui .b:disabled{opacity:.5;cursor:default;transform:none}',
    // «Antes de publicar» (la ventana de Mi PJ)
    '#mipj-modal{--m-r:16px;font-family:var(--m-sans);color:var(--m-parchment);font-size:14px;line-height:1.45;text-align:left;position:fixed;inset:0;z-index:99999;background:rgba(8,7,14,.6);display:flex;align-items:center;justify-content:center;padding:16px}',
    '#mipj-modal *{box-sizing:border-box}',
    '#mipj-modal .mb{width:min(520px,100%);max-height:90vh;overflow:auto;border-radius:var(--m-r);padding:20px 22px;background:radial-gradient(500px 200px at 0% 0%,color-mix(in srgb,var(--m-arcane-bright) 14%,transparent),transparent 70%),var(--m-panel);border:1px solid var(--m-gold);box-shadow:0 30px 80px -30px #000}',
    '#mipj-modal h3{margin:0 0 4px;font-family:var(--m-serif);font-style:italic;font-weight:500;font-size:28px;color:var(--m-gold-bright)}',
    '#mipj-modal p{margin:6px 0 10px;color:var(--m-parchment-dim)}',
    '#mipj-modal ul{margin:0 0 14px;padding:0;list-style:none}',
    '#mipj-modal li{padding:8px 10px;margin:6px 0;border-radius:10px;border-left:3px solid var(--m-bad);background:color-mix(in srgb,var(--m-bad) 10%,transparent);color:var(--m-parchment)}',
    '#mipj-modal .bt{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}',
    '#mipj-modal button.b{font:700 12.5px var(--m-sans);border-radius:999px;padding:8px 14px;cursor:pointer;border:1px solid var(--m-line-strong);background:color-mix(in srgb,var(--m-panel-2) 90%,transparent);color:var(--m-parchment);transition:border-color .2s,transform .2s}',
    '#mipj-modal button.b:hover{border-color:var(--m-gold);transform:translateY(-1px)}',
    '#mipj-modal button.b.pri{background:var(--m-gold);border-color:var(--m-gold);color:var(--m-accent-ink)}',
    // El panel: un iframe sin marco ni fondo; lo que se ve es el «Mi PJ» de siempre, dibujado por PAM
    '.marco{position:fixed;right:0;bottom:0;z-index:99990;width:1px;height:1px;border:0;background:transparent;color-scheme:normal}',
    ':host([data-skin="pixel"]) .esc-ui .puerta,:host([data-skin="pixel"]) .esc-ui .p-paso,:host([data-skin="pixel"]) .esc-ui .p-btn,:host([data-skin="pixel"]) #mipj-modal .mb{border-radius:0}'
  ].join('\n');

  // La barra de debajo del editor («✦ Bóveda: las cuentas cuadran»), la de Mi PJ
  var CSS_CHECK = [
    ':host{display:block}',
    '.mipj-check{margin:8px 0;padding:9px 14px;border-radius:12px;font:600 13px var(--m-sans);display:flex;gap:10px;align-items:center;cursor:pointer;text-align:left;',
    '  background:var(--m-panel);color:var(--m-parchment);border:1px solid var(--m-line-strong)}',
    '.mipj-check .ic{font-family:var(--m-serif);font-size:18px;line-height:1}',
    '.mipj-check.ok{border-color:color-mix(in srgb,var(--m-good) 60%,transparent)} .mipj-check.ok .ic{color:var(--m-good)}',
    '.mipj-check.mal{border-color:var(--m-bad)} .mipj-check.mal .ic{color:var(--m-bad)}',
    '.mipj-check small{color:var(--m-parchment-dim);font-weight:500;margin-left:auto;font-size:11px}',
    ':host([data-skin="pixel"]) .mipj-check{border-radius:0}'
  ].join('\n');
  // La barra de arriba de los mensajes de un tema de oficial («🎓 Este oficial»), la de Mi PJ
  var CSS_OF = [
    ':host{display:block}',
    '.mipj-of .of-g{color:var(--m-gold-bright)}',
    '.mipj-of .of-av{margin-top:3px;font-size:12px;color:var(--m-gold-bright)}',
    '.mipj-of .of-av.mal{color:var(--m-bad);font-weight:700}',
    '.mipj-of{margin:10px 0;border-radius:14px;font:13.5px/1.5 var(--m-sans);color:var(--m-parchment);text-align:left;',
    '  background:radial-gradient(420px 160px at 0% 0%,color-mix(in srgb,var(--m-arcane-bright) 14%,transparent),transparent 70%),var(--m-panel);border:1px solid color-mix(in srgb,var(--m-gold) 45%,transparent)}',
    '.mipj-of summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:10px 14px;font-family:var(--m-serif);font-style:italic;font-size:19px;color:var(--m-gold-bright)}',
    '.mipj-of summary::-webkit-details-marker{display:none}',
    '.mipj-of summary .ic{font-style:normal;font-size:15px}',
    '.mipj-of summary small{margin-left:auto;font:600 10.5px var(--m-sans);letter-spacing:.12em;text-transform:uppercase;color:var(--m-parchment-dim)}',
    '.mipj-of .of-bd{padding:2px 14px 12px;display:grid;gap:4px}',
    '.mipj-of .of-p b{color:var(--m-parchment)}',
    '.mipj-of .dim{color:var(--m-parchment-dim);font-size:12px}',
    '.mipj-of .of-q{display:flex;gap:6px;align-items:center;font-size:12px;margin:1px 0 4px 2px;cursor:pointer;color:var(--m-parchment-dim)}',
    ':host([data-skin="pixel"]) .mipj-of{border-radius:0}'
  ].join('\n');
  var estilosTema = []; // el del agente y el de cada barra del editor
  var temaActual = { css: '', skin: 'avadense' };

  var host = document.createElement('div');
  host.id = 'pam-agente';
  document.body.appendChild(host);
  var raiz = host.attachShadow({ mode: 'open' });
  var estilo = document.createElement('style'); estilo.textContent = CSS_ESC; raiz.appendChild(estilo);
  var estiloTema = document.createElement('style'); raiz.appendChild(estiloTema);
  estilosTema.push({ estilo: estiloTema, host: host });

  function aplicarTema(tema) {
    var t = Object.assign({}, TEMA_AVADENSE, tema || {});
    temaActual = { css: ':host{' + Object.keys(t).filter(function (k) { return k !== 'skin'; }).map(function (k) { return '--m-' + k + ':' + t[k]; }).join(';') + '}', skin: t.skin || 'avadense' };
    estilosTema.forEach(function (x) { x.estilo.textContent = temaActual.css; x.host.setAttribute('data-skin', temaActual.skin); });
    // las fuentes del tema, como hacía Mi PJ
    var fams = ['Cormorant Garamond', 'Nunito'];
    [t.serif, t.sans].forEach(function (f) { var n = String(f || '').split(',')[0].replace(/["']/g, '').trim(); if (n && !/^(Georgia|system-ui|serif|sans-serif|monospace)$/i.test(n) && fams.indexOf(n) < 0) { fams.push(n); } });
    var l = document.getElementById('mipj-fonts');
    if (!l) { l = document.createElement('link'); l.id = 'mipj-fonts'; l.rel = 'stylesheet'; document.head.appendChild(l); }
    l.href = 'https://fonts.googleapis.com/css2?' + fams.map(function (f) { return 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':ital,wght@0,400;0,600;0,700;1,500'; }).join('&') + '&display=swap';
    return { skin: t.skin || 'avadense' };
  }
  aplicarTema(GM_getValue('mipj.tema', null) ? (function () { try { return JSON.parse(GM_getValue('mipj.tema', 'null')); } catch (e) { return null; } })() : null);

  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'texto') { e.textContent = attrs[k]; } else if (k === 'clase') { e.className = attrs[k]; } else { e.setAttribute(k, attrs[k]); }
    });
    (hijos || []).forEach(function (h) { if (h) { e.appendChild(h); } });
    return e;
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

  // ---------------------------------------------------------------
  // PUERTA DE VALIDACIÓN (la del Escriba)
  // accion = { titulo, explicacion, avisos, pasos: [{ tipo:'editar', post, original, nuevo, motivo, descripcion } |
  //                                                  { tipo:'publicar', tema, texto, descripcion }] }
  // «enlace del paso n» en un texto se cambia por el enlace al mensaje que publicó (o editó) el paso n.
  // Un paso con `omitido` (texto) no se hará: se enseña por qué. Uno con `igual` ya está hecho (`postExistente`: su mensaje).
  // `enlaceFinal: { texto }`: al terminar bien, un botón más; si se pulsa, la respuesta lleva `siguiente: true`.
  // Devuelve { resultado: 'aceptada'|'denegada'|'fallida'|'parcial'|'igual', pasos, siguiente? }
  // ---------------------------------------------------------------
  function abrirPuerta(accion) {
    var cuenta = cuentaConectada();
    if (!cuenta) { return Promise.reject(new Error('No hay ninguna cuenta conectada en el foro.')); }
    if (!accion || !Array.isArray(accion.pasos) || !accion.pasos.length) { return Promise.reject(new Error('La puerta no tiene pasos.')); }
    accion.pasos.forEach(function (paso) {
      if (paso.omitido) { if (paso.tipo !== 'editar' && paso.tipo !== 'publicar') { throw new Error('Tipo de paso desconocido: ' + paso.tipo); } return; }
      if (paso.tipo === 'editar') {
        if (!(parseInt(paso.post, 10) > 0) || typeof paso.original !== 'string' || typeof paso.nuevo !== 'string') { throw new Error('Paso de edición incompleto.'); }
        if (!paso.igual && mismoTexto(paso.original, paso.nuevo)) { paso.igual = 'El mensaje ya tiene exactamente este texto.'; }
      } else if (paso.tipo === 'publicar') {
        if (!(parseInt(paso.tema, 10) > 0) || typeof paso.texto !== 'string' || !paso.texto.trim()) { throw new Error('Paso de publicación incompleto.'); }
      } else { throw new Error('Tipo de paso desconocido: ' + paso.tipo); }
    });
    // Si todo ya está igual, no hay nada que aceptar: no se abre la puerta.
    if (accion.pasos.every(function (p) { return p.igual; })) {
      return Promise.resolve({ resultado: 'igual', pasos: accion.pasos.map(function () { return { estado: 'igual' }; }) });
    }
    return new Promise(function (resolver) {
      var fondo = el('div', { clase: 'esc-ui puerta-fondo' });
      var dlg = el('div', { clase: 'puerta', role: 'dialog', 'aria-modal': 'true', 'aria-label': accion.titulo || 'Puerta' });
      fondo.appendChild(dlg);
      dlg.appendChild(el('div', { clase: 'p-cab' }, [el('b', { texto: accion.titulo || 'Confirmar' }), el('small', { texto: cuenta.nombre })]));
      if (accion.explicacion) { dlg.appendChild(el('div', { clase: 'p-expl', texto: accion.explicacion })); }
      (accion.avisos || []).forEach(function (a) { dlg.appendChild(el('div', { clase: 'aviso', texto: a })); });

      var editables = [], estados = [];
      accion.pasos.forEach(function (paso, k) {
        var caja = el('div', { clase: 'p-paso' });
        var tituloPaso = paso.tipo === 'editar' ? 'Editar mensaje' : 'Publicar en el tema';
        if (paso.igual) {
          var estadoIgual = el('span', { clase: 'p-estado ok', texto: 'Ya está igual' });
          estados.push(estadoIgual);
          caja.appendChild(el('div', { clase: 'p-paso-cab' }, [el('span', { texto: (k + 1) + '. ' + (paso.titulo || tituloPaso) }), estadoIgual]));
          caja.appendChild(el('div', { clase: 'p-nota', texto: paso.igual + ' No se toca.' }));
          dlg.appendChild(caja);
          return;
        }
        if (paso.omitido) {
          var estadoOm = el('span', { clase: 'p-estado mal', texto: 'No se hará' });
          estados.push(estadoOm);
          caja.appendChild(el('div', { clase: 'p-paso-cab' }, [el('span', { texto: (k + 1) + '. ' + tituloPaso + (paso.descripcion ? ' · ' + paso.descripcion : '') }), estadoOm]));
          caja.appendChild(el('div', { clase: 'aviso', texto: paso.omitido }));
          dlg.appendChild(caja);
          return;
        }
        var enlace = paso.tipo === 'editar' ? '/post?p=' + paso.post + '&mode=editpost' : '/t' + paso.tema + '-';
        var estado = el('span', { clase: 'p-estado neutro', texto: 'Pendiente' });
        estados.push(estado);
        caja.appendChild(el('div', { clase: 'p-paso-cab' }, [el('span', { texto: (k + 1) + '. ' + tituloPaso + (paso.descripcion ? ' · ' + paso.descripcion : '') }), estado]));
        caja.appendChild(el('a', { href: enlace, target: '_blank', rel: 'noopener', texto: paso.tipo === 'editar' ? 'Ver el mensaje' : 'Ver el tema' }));
        var area = el('textarea', { clase: 'p-texto', spellcheck: 'false' });
        area.value = paso.tipo === 'editar' ? paso.nuevo : paso.texto;
        area.readOnly = true;
        var vista = el('div', { clase: 'p-diff' });
        var pintarDiff = function () {
          vista.replaceChildren();
          compararLineas(paso.original, area.value).forEach(function (x) {
            vista.appendChild(el('div', { clase: 'd' + (x.t === '+' ? ' mas' : x.t === '-' ? ' menos' : x.t === '…' ? ' corte' : ''), texto: (x.t === '=' ? '  ' : x.t + ' ') + x.l }));
          });
        };
        if (paso.tipo === 'editar') {
          pintarDiff(); caja.appendChild(vista); area.hidden = true;
          var t; area.addEventListener('input', function () { clearTimeout(t); t = setTimeout(pintarDiff, 250); });
        }
        caja.appendChild(area);
        editables.push({ paso: paso, area: area });
        dlg.appendChild(caja);
      });

      var info = el('div', { clase: 'p-info' });
      dlg.appendChild(info);
      var bAceptar = el('button', { clase: 'p-btn ok', type: 'button', texto: 'Aceptar' });
      var bModificar = el('button', { clase: 'p-btn edit', type: 'button', texto: 'Modificar' });
      var bDenegar = el('button', { clase: 'p-btn no', type: 'button', texto: 'Denegar' });
      var botones = el('div', { clase: 'p-botones' }, [bDenegar, bModificar, bAceptar]);
      dlg.appendChild(botones);
      raiz.appendChild(fondo);
      bAceptar.focus();

      function cerrar(res) { fondo.remove(); resolver(res); }
      bDenegar.addEventListener('click', function () { cerrar({ resultado: 'denegada', pasos: [] }); });
      bModificar.addEventListener('click', function () {
        editables.forEach(function (x) { x.area.readOnly = false; x.area.hidden = false; });
        bModificar.disabled = true;
        bAceptar.textContent = 'Aceptar con mis cambios';
        info.textContent = 'Editá el texto. Se publica exactamente lo que escribas.';
        var primero = dlg.querySelector('textarea:not([readonly])'); if (primero) { primero.focus(); }
      });
      bAceptar.addEventListener('click', function () {
        var ahora = cuentaConectada();
        if (!ahora || ahora.id !== cuenta.id) { info.className = 'p-info error'; info.textContent = 'La cuenta conectada ya no es ' + cuenta.nombre + '. No se hizo nada.'; return; }
        editables.forEach(function (x) { x.area.readOnly = true; x.paso.modificado = (x.paso.tipo === 'editar' ? x.paso.nuevo : x.paso.texto) !== x.area.value; if (x.paso.tipo === 'editar') { x.paso.nuevo = x.area.value; } else { x.paso.texto = x.area.value; } });
        bAceptar.disabled = true; bModificar.disabled = true; bDenegar.disabled = true;
        info.className = 'p-info';
        var resultados = [], k = 0;
        function siguiente() {
          if (k >= accion.pasos.length) { return Promise.resolve(); }
          var idx = k++, paso = accion.pasos[idx];
          if (paso.igual) { resultados.push({ estado: 'igual', post: paso.postExistente || paso.post || null }); return siguiente(); }
          if (paso.omitido) { resultados.push({ estado: 'omitido' }); estados[idx].textContent = 'Omitido'; return siguiente(); }
          var faltaEnlace = null;
          var conEnlaces = function (tx) {
            return String(tx).replace(/«enlace del paso (\d+)»/g, function (m, n) {
              var r0 = resultados[parseInt(n, 10) - 1];
              if (!r0 || !r0.post) { faltaEnlace = n; return m; }
              return enlacePost(r0.post);
            });
          };
          if (paso.tipo === 'publicar') { paso.texto = conEnlaces(paso.texto); }
          if (paso.tipo === 'editar') { paso.nuevo = conEnlaces(paso.nuevo); }
          if (faltaEnlace) {
            resultados.push({ estado: 'error', detalle: 'Falta el enlace del paso ' + faltaEnlace + '.' });
            estados[idx].className = 'p-estado mal'; estados[idx].textContent = 'No hecho';
            info.className = 'p-info error';
            info.textContent = 'Paso ' + (idx + 1) + ': no tengo el enlace del mensaje del paso ' + faltaEnlace + '. Los pasos anteriores sí se hicieron.';
            return Promise.resolve();
          }
          estados[idx].className = 'p-estado warn'; estados[idx].textContent = 'En curso…';
          var avisar = function (msg) { info.textContent = msg; };
          return ejecutarPaso(cuenta, paso, avisar).catch(function (e) { return { estado: 'error', detalle: e.message }; }).then(function (r) {
            r.modificado = !!paso.modificado;
            resultados.push(r);
            if (r.estado === 'ok') { estados[idx].className = 'p-estado ok'; estados[idx].textContent = 'Hecho'; info.textContent = ''; return siguiente(); }
            estados[idx].className = 'p-estado mal'; estados[idx].textContent = 'No hecho';
            var motivo = r.estado === 'cambiado' ? 'El mensaje cambió desde la vista previa; no se tocó.'
              : r.estado === 'flood' ? 'El foro sigue pidiendo esperar.'
              : r.estado === 'antispam' ? 'El foro pide una comprobación antispam: publicalo a mano.'
              : (r.detalle || 'Error desconocido.');
            for (var q = idx + 1; q < estados.length; q++) { if (!accion.pasos[q].igual) { estados[q].textContent = 'No ejecutado'; } }
            info.className = 'p-info error';
            info.textContent = 'Paso ' + (idx + 1) + ': ' + motivo + (idx > 0 ? ' Los pasos anteriores sí se hicieron.' : '') + (idx + 1 < estados.length ? ' Los siguientes no se hicieron.' : '');
            return null;
          });
        }
        siguiente().then(function () {
          var algunoOk = resultados.some(function (r) { return r.estado === 'ok'; });
          var completos = resultados.length === accion.pasos.length && resultados.every(function (r) { return r.estado === 'ok' || r.estado === 'omitido' || r.estado === 'igual'; });
          var todosOk = algunoOk && completos;
          var nadaQueHacer = !algunoOk && completos && resultados.some(function (r) { return r.estado === 'igual'; });
          var resultado = todosOk ? 'aceptada' : (nadaQueHacer ? 'igual' : (algunoOk ? 'parcial' : 'fallida'));
          if (todosOk || nadaQueHacer) {
            var omitidos = resultados.filter(function (r) { return r.estado === 'omitido'; }).length;
            var iguales = resultados.filter(function (r) { return r.estado === 'igual'; }).length;
            info.className = 'p-info okmsg';
            info.textContent = nadaQueHacer ? 'No había nada que cambiar.'
              : 'Hecho' + (iguales ? ' (los pasos que ya estaban igual no se tocaron)' : '') + (omitidos ? ', salvo los pasos marcados como «Omitido».' : '.');
          }
          var bCerrar = el('button', { clase: 'p-btn', type: 'button', texto: 'Cerrar' });
          botones.replaceChildren(bCerrar);
          bCerrar.focus();
          bCerrar.addEventListener('click', function () { cerrar({ resultado: resultado, pasos: resultados }); });
          // El paso siguiente (p. ej. «Terminar en PAM»): lo hace PAM cuando la puerta contesta con `siguiente`.
          if ((todosOk || nadaQueHacer) && accion.enlaceFinal && accion.enlaceFinal.texto) {
            var bSig = el('button', { clase: 'p-btn ok', type: 'button', texto: String(accion.enlaceFinal.texto) });
            bSig.addEventListener('click', function () { cerrar({ resultado: resultado, pasos: resultados, siguiente: true }); });
            botones.appendChild(bSig);
            bSig.focus();
          }
        });
      });
    });
  }

  // «Antes de publicar» (la de Mi PJ): problemas que PAM ha visto en el mensaje del editor.
  // Cada aviso es { b: 'Grageas:', t: ' falta…' } (la parte en negrita y el resto) o un texto.
  // conSeguir: al enviar («Publicar igual» / «Volver a corregir»); si no, solo «Entendido» (al tocar la barra).
  function modalAntesDePublicar(probs, encabezado, conSeguir) {
    return new Promise(function (resolver) {
      var m = el('div', { id: 'mipj-modal' });
      var lista = el('ul', {}, probs.map(function (p) {
        return p && typeof p === 'object' ? el('li', {}, [p.b ? el('b', { texto: p.b }) : null, document.createTextNode(String(p.t || ''))]) : el('li', { texto: String(p) });
      }));
      var bSeguir = conSeguir ? el('button', { clase: 'b', type: 'button', texto: 'Publicar igual' }) : null;
      var bVolver = el('button', { clase: 'b pri', type: 'button', texto: conSeguir ? 'Volver a corregir' : 'Entendido' });
      m.appendChild(el('div', { clase: 'mb', role: 'dialog', 'aria-modal': 'true' }, [
        el('h3', { texto: 'Antes de publicar' }),
        el('p', { texto: (encabezado || 'Revisé el mensaje y ') + (probs.length === 1 ? 'hay algo que no cuadra' : 'hay ' + probs.length + ' cosas que no cuadran') + ':' }),
        lista, el('div', { clase: 'bt' }, [bSeguir, bVolver])
      ]));
      var fin = function (v) { m.remove(); resolver(v); };
      if (bSeguir) { bSeguir.addEventListener('click', function () { fin('seguir'); }); }
      bVolver.addEventListener('click', function () { fin('volver'); });
      m.addEventListener('click', function (e) { if (e.target === m) { fin('volver'); } });
      raiz.appendChild(m);
      bVolver.focus();
    });
  }

  // ---------------------------------------------------------------
  // Panel «Mi PJ» (página de PAM en un iframe que ocupa justo lo que ocupa el panel)
  // ---------------------------------------------------------------
  var iframe = el('iframe', { clase: 'marco', title: 'Mi PJ', allowtransparency: 'true', allow: 'clipboard-write', src: PAM.origen + PAM.ruta + 'panel.html?foro=' + encodeURIComponent(location.origin) + '&v=0.6.1' });
  raiz.appendChild(iframe);
  // Si el panel no arranca (no pide tamaño), se enseña al menos su pastilla, para que nunca quede invisible.
  var panelVivo = false;
  setTimeout(function () { if (!panelVivo) { iframe.style.width = '190px'; iframe.style.height = '92px'; } }, 15000);

  // Las tres formas de publicar/editar llegan a la misma puerta.
  function resultadoUnPaso(res, tipo) {
    var r = (res.pasos && res.pasos[0]) || {};
    var hecho = res.resultado === 'aceptada';
    var base = { decision: res.resultado === 'denegada' ? 'denegar' : res.resultado === 'igual' ? 'igual' : 'aceptar', estado: r.estado || null, detalle: r.detalle || null, modificado: !!r.modificado };
    if (tipo === 'publicar') { base.publicado = hecho; base.post = r.post || null; } else { base.editado = hecho; }
    return base;
  }

  var canal = crearCanal(function () { return iframe.contentWindow; }, PAM.origen, {
    'hola': hola,
    'foro.leer': leer,
    'foro.puerta': function (d) { return abrirPuerta(d); },
    'foro.publicar': function (d) {
      return abrirPuerta({ titulo: d.titulo || 'Publicar en el foro', explicacion: d.motivo || '', pasos: [{ tipo: 'publicar', tema: d.tema, texto: d.mensaje, descripcion: d.descripcion || '' }] })
        .then(function (res) { return resultadoUnPaso(res, 'publicar'); });
    },
    'foro.editar': function (d) {
      return abrirPuerta({ titulo: d.titulo || 'Editar un mensaje', explicacion: d.motivo || '', pasos: [{ tipo: 'editar', post: d.post, original: d.original, nuevo: d.nuevo, motivo: d.motivo || '', descripcion: d.descripcion || '' }] })
        .then(function (res) { return resultadoUnPaso(res, 'editar'); });
    },
    'almacen.leer': almacen.leer,
    'almacen.guardar': almacen.guardar,
    'almacen.legado': almacen.legado,
    // El panel pide el tamaño exacto que ocupa (pastilla o caja abierta, con su margen y su sombra).
    'panel.tamano': function (d) {
      panelVivo = true;
      var an = Math.max(1, Math.min(window.innerWidth, parseInt(d.ancho, 10) || 1)), al = Math.max(1, Math.min(window.innerHeight, parseInt(d.alto, 10) || 1));
      iframe.style.width = an + 'px'; iframe.style.height = al + 'px'; return { ancho: an, alto: al };
    },
    'panel.tema': function (d) { return aplicarTema(d.tema); },
    'foro.oficial': function (d) { return pintarOficial(d); },
    'inspector.pintar': function (d) { return pintarInspector(d); },
    'inspector.quitar': function () { return quitarInspector(); },
    // Solo a rutas del propio foro (p. ej. el mensaje que se acaba de publicar).
    'foro.ir': function (d) { var u = rutaSegura(d.ruta); setTimeout(function () { location.href = u.href; }, 0); return { ido: true }; },
    'pam.abrir': function (d) { return abrirPam(d); },
    'pam.enviar': function (d) { return enviarPam(d); }
  });
  // El panel calcula su tamaño con la ventana del foro (dentro del iframe no la ve).
  window.addEventListener('resize', function () { canal.avisar('ventana.cambio', ventana()); });

  // ---------------------------------------------------------------
  // Abrir PAM en otra pestaña y pasarle un mensaje desde el foro (p. ej. «Enviar a PAM»: PAM solo acepta
  // los datos si vienen del foro). El agente no mira el mensaje: lo reenvía hasta que PAM contesta con `respuesta`.
  // ---------------------------------------------------------------
  // La última pestaña de PAM que se abrió desde aquí: cuando PAM termina de cerrar un canje («escribaCierre»), se avisa
  // al panel, y el panel le manda después los datos nuevos con «pam.enviar».
  var ventanaPam = null;
  window.addEventListener('message', function (e) {
    if (!ventanaPam || e.source !== ventanaPam || e.origin !== PAM.origen || !e.data || !e.data.escribaCierre) { return; }
    canal.avisar('pam.cierre', { hecho: !!e.data.hecho });
  });
  function abrirPam(d) {
    var hash = /^#[a-z]{0,20}$/.test(d.hash || '') ? d.hash : '';
    var w = window.open(PAM.origen + PAM.ruta + hash, 'pam');
    if (!w) { return { abierta: false }; }
    ventanaPam = w;
    if (!d.mensaje || !d.respuesta) { return { abierta: true }; }
    return enviarAPestana(w, d);
  }
  function enviarPam(d) {
    if (!ventanaPam || ventanaPam.closed) { return { abierta: false }; }
    if (!d.mensaje || !d.respuesta) { return { abierta: true }; }
    return enviarAPestana(ventanaPam, d);
  }
  function enviarAPestana(w, d) {
    return new Promise(function (resolver) {
      var n = 0, hecho = false;
      var alResponder = function (e) {
        if (e.origin !== PAM.origen || e.source !== w || !e.data || !e.data[d.respuesta]) { return; }
        hecho = true; window.removeEventListener('message', alResponder);
        resolver({ abierta: true, respuesta: e.data });
      };
      window.addEventListener('message', alResponder);
      var t = setInterval(function () {
        if (hecho || ++n > 60) { clearInterval(t); if (!hecho) { window.removeEventListener('message', alResponder); resolver({ abierta: true, respuesta: null }); } return; }
        try { w.postMessage(d.mensaje, PAM.origen); } catch (e) { /* todavía cargando */ }
      }, 500);
    });
  }

  // ---------------------------------------------------------------
  // Inspector de Canjes (Registro de Canjes): PAM revisa y arma lo que se ve; aquí solo se pinta, con el tema de
  // Mi PJ, debajo de cada pedido (barra y caja) y abajo a la izquierda (el panel). Los clics vuelven a PAM.
  // Lo que llega se limpia antes de pintarlo (sin scripts, sin on…, sin enlaces javascript:).
  // ---------------------------------------------------------------
  function limpiarHtml(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html || '');
    Array.prototype.forEach.call(t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form'), function (x) { x.remove(); });
    Array.prototype.forEach.call(t.content.querySelectorAll('*'), function (x) {
      Array.prototype.slice.call(x.attributes).forEach(function (a) {
        var n = a.name.toLowerCase();
        if (n.indexOf('on') === 0 || ((n === 'href' || n === 'src' || n === 'action' || n === 'formaction') && /^\s*(javascript|data|vbscript):/i.test(a.value))) { x.removeAttribute(a.name); }
      });
    });
    return t.content;
  }
  var icj = { hosts: {}, panel: null };
  function cajaIcj(css) {
    var h = document.createElement('div'); h.className = 'pam-agente-icj';
    var s = h.attachShadow({ mode: 'open' });
    var e1 = document.createElement('style'); e1.textContent = css; s.appendChild(e1);
    var e2 = document.createElement('style'); e2.textContent = temaActual.css; s.appendChild(e2);
    h.setAttribute('data-skin', temaActual.skin);
    estilosTema.push({ estilo: e2, host: h });
    var cuerpo = document.createElement('div'); s.appendChild(cuerpo);
    s.addEventListener('click', alClicIcj);
    s.addEventListener('change', alCambioIcj);
    return { host: h, cuerpo: cuerpo, sombra: s };
  }
  function alClicIcj(e) {
    var b = e.target.closest && e.target.closest('[data-icj]');
    if (!b || b.matches('input')) { return; }
    var a = b.getAttribute('data-icj'), p = b.getAttribute('data-p');
    if (a === 'ir') { e.preventDefault(); var post = document.getElementById('p' + p); if (post) { post.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    if (a === 'copiar' || a === 'pegar') { respuestaIcj(a); return; }
    if (b.disabled) { return; }
    canal.pedir('inspector.accion', { accion: a, p: p, v: b.getAttribute('data-v') }, 10 * 60000).catch(function () {});
  }
  function alCambioIcj(e) {
    var c = e.target; if (!c || !c.matches || !c.matches('input[data-icj="prob"]')) { return; }
    canal.pedir('inspector.accion', { accion: 'prob', p: c.getAttribute('data-p'), i: c.getAttribute('data-i'), k: c.getAttribute('data-k'), checked: c.checked }).catch(function () {});
  }
  /* «Copiar» y «Pegar en la respuesta rápida» (en el editor del foro, sin enviar), como el Inspector antiguo. */
  function respuestaIcj(a) {
    if (!icj.panel) { return; }
    var ta = icj.panel.cuerpo.querySelector('textarea'), msg = icj.panel.cuerpo.querySelector('.msg');
    if (!ta || !msg) { return; }
    if (a === 'copiar') {
      (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(function () { msg.textContent = 'Copiado.'; }, function () { ta.select(); msg.textContent = 'Seleccionado: copialo con Ctrl+C.'; });
      return;
    }
    msg.textContent = pegarEnRespuesta(ta.value) ? 'Listo: quedó en la respuesta rápida, sin enviar.' : 'No encontré la respuesta rápida: usá «Copiar».';
  }
  function pegarEnRespuesta(texto) {
    var ta = document.getElementById('text_editor_textarea') || document.querySelector('form textarea[name="message"]');
    if (!ta) { return false; }
    try {
      var $ = W.jQuery;
      var inst = $ && $.fn && $.fn.sceditor ? $(ta).sceditor('instance') : null;
      if (inst && inst.val) {
        var previo = inst.val();
        inst.val((previo && previo.trim() ? previo.replace(/\s+$/, '') + '\n\n' : '') + texto);
        if (inst.focus) { inst.focus(); }
        return true;
      }
    } catch (e) { /* sin editor: va directo al textarea */ }
    ta.value = (ta.value && ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n\n' : '') + texto;
    ta.focus();
    return true;
  }
  function pintarInspector(d) {
    var css = String(d.css || '');
    Object.keys(d.barras || {}).forEach(function (id) {
      var post = document.getElementById('p' + parseInt(id, 10));
      var cont = post && post.querySelector('.content');
      if (!cont) { return; }
      var c = icj.hosts[id];
      if (!c || !c.host.isConnected) { c = icj.hosts[id] = cajaIcj(css); cont.parentNode.insertBefore(c.host, cont.nextSibling); }
      c.cuerpo.replaceChildren(limpiarHtml(String(d.barras[id] || '') + String((d.cajas || {})[id] || '')));
    });
    if (d.panel != null) {
      if (!icj.panel || !icj.panel.host.isConnected) { icj.panel = cajaIcj(css); document.body.appendChild(icj.panel.host); }
      icj.panel.cuerpo.replaceChildren(limpiarHtml(d.panel));
    }
    return { pintado: true };
  }
  function quitarInspector() {
    Object.keys(icj.hosts).forEach(function (id) { icj.hosts[id].host.remove(); });
    if (icj.panel) { icj.panel.host.remove(); }
    icj = { hosts: {}, panel: null };
    return { quitado: true };
  }

  // ---------------------------------------------------------------
  // Tema de un oficial: la barra de Mi PJ arriba de los mensajes (las cuentas las hace PAM)
  // ---------------------------------------------------------------
  var barraOf = null;
  function pintarOficial(d) {
    var p0 = document.querySelector('div.post');
    if (!p0) { return { pintada: false }; }
    if (!barraOf) {
      var caja = document.createElement('div'); caja.className = 'pam-agente-oficial';
      var sombra = caja.attachShadow({ mode: 'open' });
      var est = document.createElement('style'); est.textContent = CSS_OF; sombra.appendChild(est);
      var estT = document.createElement('style'); estT.textContent = temaActual.css; sombra.appendChild(estT);
      caja.setAttribute('data-skin', temaActual.skin);
      estilosTema.push({ estilo: estT, host: caja });
      var det = el('details', { clase: 'mipj-of' }); det.open = d.abierta !== false;
      var peq = el('small', { texto: 'Mi PJ · leyendo…' });
      det.appendChild(el('summary', {}, [el('span', { clase: 'ic', texto: '🎓' }), document.createTextNode('Este oficial'), peq]));
      var cuerpo = el('div', { clase: 'of-bd' }); det.appendChild(cuerpo);
      sombra.appendChild(det);
      p0.parentElement.insertBefore(caja, p0);
      det.addEventListener('toggle', function () { canal.avisar('oficial.abierta', { abierta: det.open }); });
      det.addEventListener('change', function (e) {
        var c = e.target.closest && e.target.closest('[data-of-cuarto]'); if (!c) { return; }
        canal.pedir('oficial.cuarto', { tid: +c.getAttribute('data-of-cuarto'), autor: c.getAttribute('data-autor'), si: c.checked })
          .then(function (r) { pintarOficial(r); }, function () {});
      });
      barraOf = { caja: caja, det: det, peq: peq, cuerpo: cuerpo };
    }
    var cu = barraOf.cuerpo;
    if (d.estado === 'error') { cu.replaceChildren(el('div', { clase: 'dim', texto: 'No pude leer el tema: ' + (d.error || '') })); return { pintada: true }; }
    if (d.estado !== 'ok' || !d.barra) { return { pintada: true }; }
    var B = d.barra;
    barraOf.peq.textContent = 'Mi PJ · ' + B.total + ' posts';
    var hijos = B.filas.map(function (f) {
      var caja = el('input', { type: 'checkbox', 'data-of-cuarto': String(B.tid), 'data-autor': f.autor }); caja.checked = !!f.cuarto;
      if (f.cuarto) { caja.setAttribute('checked', ''); }
      return el('div', { clase: 'of-p' }, [
        el('b', { texto: f.autor }), document.createTextNode(' · ' + f.posts + ' ' + (f.posts === 1 ? 'post' : 'posts') + ' · '),
        el('b', { texto: String(f.cuentan) }), document.createTextNode(' cuentan → '), el('b', { clase: 'of-g', texto: f.grageas + ' grageas' }),
        f.cuarto ? document.createTextNode(' ') : null, f.cuarto ? el('span', { clase: 'dim', texto: '(segundo oficial, a un cuarto)' }) : null,
        f.fuera ? document.createTextNode(' ') : null, f.fuera ? el('span', { clase: 'dim', texto: '· ' + f.fuera }) : null,
        el('label', { clase: 'of-q' }, [caja, document.createTextNode(' Es su segundo oficial (suceso con más de dos años): cobra a un cuarto')])
      ]);
    });
    hijos.push(el('div', { clase: 'dim', texto: '+60 grageas para quien envíe el Suceso de cierre (15 si está en su segundo oficial), o repartidas si así lo indica el reporte.' }));
    if (B.aviso) { hijos.push(el('div', { clase: 'of-av' + (B.aviso.mal ? ' mal' : ''), texto: B.aviso.texto })); }
    hijos.push(el('div', { clase: 'dim', texto: 'Topes por usuario en hora de España: 3 por día, 15 por semana (lunes a domingo), 45 por mes. Los mensajes de Tramas no se cuentan.' }));
    cu.replaceChildren.apply(cu, hijos);
    return { pintada: true };
  }

  // ---------------------------------------------------------------
  // Editor del foro: antes de enviar, PAM lo revisa
  // ---------------------------------------------------------------
  function textoEditor(ta) {
    try { var $ = W.jQuery || W.$; var inst = $ && $(ta).sceditor && $(ta).sceditor('instance'); if (inst && inst.val) { return inst.val(); } } catch (e) {}
    return ta.value;
  }

  function revisarTexto(texto) {
    return canal.pedir('editor.revisar', { texto: texto, ruta: location.pathname + location.search }, 3000);
  }

  // Como Mi PJ: una barra debajo del editor que se revisa cada 1,5 s, y la ventana «Antes de publicar» al enviar.
  function engancharEditor(form) {
    if (form.getAttribute('data-pam-agente')) { return; }
    form.setAttribute('data-pam-agente', '1');
    var ta = form.querySelector('textarea[name="message"]'); if (!ta) { return; }
    var caja = document.createElement('div'); caja.className = 'pam-agente-check'; caja.style.display = 'none';
    var sombra = caja.attachShadow({ mode: 'open' });
    var est = document.createElement('style'); est.textContent = CSS_CHECK; sombra.appendChild(est);
    var estT = document.createElement('style'); estT.textContent = temaActual.css; sombra.appendChild(estT);
    caja.setAttribute('data-skin', temaActual.skin);
    estilosTema.push({ estilo: estT, host: caja });
    var bar = el('div', { clase: 'mipj-check' }); sombra.appendChild(bar);
    (form.querySelector('.sceditor-container') || ta).insertAdjacentElement('afterend', caja);

    var ult = null, res = null, enCurso = false; // res: lo que PAM contestó para el texto «ult»
    function pintarBarra(r) {
      if (!r || !r.formulario) { caja.style.display = 'none'; return; }
      var n = r.avisos.length;
      caja.style.display = '';
      bar.className = 'mipj-check ' + (n ? 'mal' : 'ok');
      bar.replaceChildren(
        el('span', { clase: 'ic', texto: n ? '⚠' : '✦' }),
        document.createTextNode(n ? 'Bóveda: ' + (n === 1 ? '1 cosa para revisar' : n + ' cosas para revisar') : 'Bóveda: las cuentas cuadran' + (r.conBoveda ? '' : ' (sin comparar con tu bóveda)')),
        el('small', { texto: n ? 'Mi PJ · tocá para ver' : 'Mi PJ' })
      );
    }
    function chequear(forzar) {
      var t = textoEditor(ta);
      if (!forzar && (t === ult || enCurso)) { return Promise.resolve(res); }
      enCurso = true;
      return revisarTexto(t).then(function (r) {
        enCurso = false; ult = t; res = r; pintarBarra(r); return r;
      }, function (err) {
        enCurso = false; ult = null; res = null; pintarBarra(null); throw err; // PAM no contesta: sin barra
      });
    }
    bar.addEventListener('click', function () {
      chequear(false).then(function (r) { if (r && r.avisos.length) { modalAntesDePublicar(r.avisos, r.encabezado, false); } }, function () {});
    });
    setInterval(function () { chequear(false).catch(function () {}); }, 1500);

    var pasar = false;
    form.addEventListener('submit', function (e) {
      if (pasar) { pasar = false; return; }
      var sub = e.submitter;
      if (sub && /preview|draft|borrador|previsual/i.test((sub.name || '') + ' ' + (sub.value || ''))) { return; }
      // texto ya revisado y sin nada que decir: se envía sin esperar, como antes
      if (res && ult === textoEditor(ta) && !res.avisos.length) { return; }
      e.preventDefault(); e.stopImmediatePropagation();
      var seguir = function () { pasar = true; try { form.requestSubmit(sub || undefined); } catch (err) { form.submit(); } };
      chequear(true).then(function (r) {
        if (!r || !r.avisos.length) { seguir(); return; }
        modalAntesDePublicar(r.avisos, r.encabezado, true).then(function (dec) { if (dec === 'seguir') { seguir(); } });
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
