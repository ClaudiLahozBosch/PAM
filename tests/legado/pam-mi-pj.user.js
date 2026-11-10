// ==UserScript==
// @name         PAM · Mi PJ (HP Avada Kedavra)
// @namespace    https://jesleytherabbit-prog.github.io/PAM/
// @version      1.7.1
// @description  Tus grageas, tu ficha, tu bóveda, tus roles y tu sueldo del mes; revisa la bóveda antes de publicar, manda todo a PAM y lleva tus canjes de punta a punta. Nada se publica ni se edita sin que vos lo aceptes.
// @author       Hana Park
// @match        https://hp-avada-kedavra.foroactivo.com/*
// @match        https://jesleytherabbit-prog.github.io/PAM/*
// @updateURL    https://jesleytherabbit-prog.github.io/PAM/pam-mi-pj.user.js
// @downloadURL  https://jesleytherabbit-prog.github.io/PAM/pam-mi-pj.user.js
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

/* «Mi PJ», el compañero de PAM en el foro. Un solo script con dos partes:
   - El panel: grageas, ficha, bóveda, «Te toca responder», sueldo del mes y la revisión de la bóveda
     antes de publicar. Esta parte solo lee el foro.
   - Los canjes: petición, aprobación y aplicar el canje en bóveda y ficha. Esta parte sí publica
     y edita, pero siempre después de mostrarte qué va a cambiar y de que toques «Aceptar».
   En PAM aparece como una pastilla «Mi PJ» abajo a la derecha. */

/* ======================= Compartido ======================= */
/* Lector genérico de movimientos de bóveda: entiende formularios {…», tablas «GRAGEAS Iniciales…» y el estilo
   «Grageas actuales: X / +N por… / Grageas restantes: Y / Grageas totales: Z». Devuelve por sección (gr / pl):
   {ini, fin, tot, delta} con fin = saldo final del mensaje. */
function leerSaldos(texto) {
  const T = String(texto || '').replace(/ /g, ' ');
  const num2 = t => { const m = String(t).replace(/\s/g, '').match(/[+\-−]?\d[\d.,]*/); if (!m) return null; const v = parseInt(m[0].replace('−', '-').replace(/[.,](?=\d{3}(\D|$))/g, '').replace(/[.,]\d{1,2}$/, ''), 10); return isNaN(v) ? null : v; };
  const re = /(puntos\s+legendarios|\bPL\b|grageas)?[\s{]*\b(iniciales|actuales|restantes|totales)(?![a-záéíóúñ])\s*(?:de\s+la\s+b[oó]veda)?\s*[»:]?\s*(?:de\s+)?([+\-−]?\s*\d[\d.,]*)/gi;
  const sec = { gr: { campos: [] }, pl: { campos: [] } };
  let actual = 'gr', m, ultimaPos = 0;
  /* el contexto cambia cuando aparece «Puntos Legendarios»/«PL» o «Grageas» como encabezado */
  const marcas = [];
  const reM = /(puntos\s+legendarios|\bPL\b)|(grageas)/gi; let mm;
  while ((mm = reM.exec(T))) { if (/^[\s:»]*(grageas|inventario|puntos\s+legendarios|registro|\bPL\b)/i.test(T.slice(mm.index + mm[0].length, mm.index + mm[0].length + 30))) continue; /* pestañas: «Grageas · Inventario · PL · Registro» */ marcas.push({ i: mm.index, s: mm[1] ? 'pl' : 'gr' }); }
  const seccionEn = i => { let s = 'gr'; for (const k of marcas) { if (k.i > i) break; s = k.s; } return s; };
  while ((m = re.exec(T))) {
    const s = m[1] ? (/grageas/i.test(m[1]) ? 'gr' : 'pl') : seccionEn(m.index);
    sec[s].campos.push({ c: m[2].toLowerCase(), v: num2(m[3]) });
  }
  const out = {};
  for (const s of ['gr', 'pl']) {
    const C = sec[s].campos.filter(x => x.v != null); if (!C.length) continue;
    const res = C.filter(x => x.c === 'restantes'), act = C.filter(x => x.c === 'actuales'), ini = C.filter(x => x.c === 'iniciales'), tot = C.filter(x => x.c === 'totales');
    let fin, inicio;
    if (res.length) { fin = res[res.length - 1].v; inicio = act.length ? act[0].v : (ini.length ? ini[0].v : null); }
    else if (act.length) { fin = act[act.length - 1].v; inicio = ini.length ? ini[0].v : null; }
    else continue;
    out[s] = { ini: inicio, fin, tot: tot.length ? tot[tot.length - 1].v : null, delta: inicio != null ? fin - inicio : null };
  }
  return out;
}

function crearCanjes(PUENTE) {
  'use strict';

  // ---------------------------------------------------------------
  // Configuracion por foro
  // ---------------------------------------------------------------
  var FOROS = {
    'hp-avada-kedavra.foroactivo.com': {
      nombre: 'HP Avada Kedavra',
      campoFicha: 'profile_field_3_-10',
      campoBoveda: 'profile_field_3_24',
      registroCanjes: '/t34430-registro-de-canjes',
      grupos: {
        canjes: '/g121-inspectores-de-canjes',
        gringotts: '/g28-personal-de-gringotts',
        aventuras: '/g81-inspectores-de-aventuras'
      }
    }
  };

  // Sellos de revision (imagenes). Se reconocen por el codigo de imgur.
  // Se iran anadiendo cuando aparezcan.
  var SELLOS = {
    '0LPnzxG': 'Ficha aceptada',
    'ne5ZhyC': 'Ficha correcta'
  };

  var VERSION = 'mipj-1.7.2';
  var PAM_URL = 'https://jesleytherabbit-prog.github.io/PAM/';
  var CLAVE_PAQUETE = 'pam.paquete';
  var CLAVE_PETICION = 'pam.peticion';     // peticion capturada en PAM, pendiente de publicar
  var CLAVE_APROBACION = 'pam.aprobacion'; // enlaces e importe aprobados, pendientes de llevar a PAM
  var CADUCIDAD_GRUPOS_MS = 24 * 60 * 60 * 1000;

  // ---------------------------------------------------------------
  // Estilo: el de «Mi PJ» de Hana Park. Usa sus variables --m-* (en el
  // foro las pone su tema; en PAM se toman de los colores de PAM).
  // ---------------------------------------------------------------
  var CSS_ESC = [
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
    '.esc-ui .p-nota,.esc-ui .mov.neutro{color:var(--x-dim);font-size:12.5px}',
    '.esc-ui .mov{font-size:13px}',
    '.esc-ui .p-vista{display:grid;gap:8px;min-width:0}',
    '.esc-ui .p-tabla{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}',
    '.esc-ui .p-tabla th{text-align:left;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--x-dim);padding:4px 6px;border-bottom:1px solid var(--x-line)}',
    '.esc-ui .p-tabla td{padding:4px 6px;border-bottom:1px dashed var(--x-line);vertical-align:middle}',
    '.esc-ui .p-tabla td.ahora{word-break:break-all;font-size:12px;color:var(--x-dim)}',
    '.esc-ui .p-tabla td.cambia,.esc-ui .p-tabla td.cambia input{color:var(--x-goldb);font-weight:700}',
    '.esc-ui .p-tabla input{width:100%;min-width:0;background:var(--x-ink);color:var(--x-parch);border:1px solid var(--x-line);border-radius:8px;padding:4px 6px;font:13px var(--x-sans)}',
    '.esc-ui .p-tabla input[readonly]{border-color:transparent;background:transparent}',
    '.esc-ui .p-tabla input:not([readonly]){border-color:var(--x-gold)}',
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
    // Panel en PAM: la misma caja y la misma pastilla que «Mi PJ» en el foro.
    '.esc-ui.esc-pam{position:fixed;right:16px;bottom:16px;z-index:99990;width:350px;max-width:calc(100vw - 24px)}',
    '.esc-pam .box{background:radial-gradient(420px 180px at 0% 0%,color-mix(in srgb,var(--x-arc) 16%,transparent),transparent 70%),var(--x-panel);border:1px solid color-mix(in srgb,var(--x-gold) 45%,transparent);border-radius:16px;box-shadow:0 24px 60px -24px rgba(0,0,0,.75);max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden}',
    '.esc-pam .hd{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;cursor:pointer;user-select:none;border-bottom:1px solid var(--x-line)}',
    '.esc-pam .brand{font-family:var(--x-serif);font-style:italic;font-size:20px}',
    '.esc-pam .brand i{font-style:normal;color:var(--x-goldb);font-size:13px;margin-right:4px}',
    '.esc-pam .hd small{margin-left:auto;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--x-dim)}',
    '.esc-pam .bd{padding:6px 16px 14px;overflow:auto}',
    '.esc-pam .card{margin-top:12px;padding:11px 13px;border-radius:12px;background:color-mix(in srgb,var(--x-panel2) 70%,transparent);border:1px solid var(--x-line);display:grid;gap:6px}',
    '.esc-pam .ct{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--x-goldb);font-weight:700}',
    '.esc-pam .row{font-size:13px}.esc-pam .dim{color:var(--x-dim);font-size:12.5px}',
    '.esc-pam .acciones{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}',
    '.esc-pam .pill{display:flex;align-items:center;gap:10px;margin-left:auto;width:max-content;padding:8px 16px;border-radius:999px;cursor:pointer;background:var(--x-panel);border:1px solid color-mix(in srgb,var(--x-gold) 50%,transparent);box-shadow:0 14px 34px -14px rgba(0,0,0,.7)}',
    '.esc-pam .pill .brand{font-size:17px}',
    '.esc-pam .pill .n{font-size:11px;font-weight:700;padding:1px 8px;border-radius:999px;background:var(--x-arc);color:var(--x-acc)}',
    '.esc-pam .msg{margin-top:10px}',
    'html[data-mipj-skin="pixel"] .esc-ui .puerta,html[data-mipj-skin="pixel"] .esc-ui .p-paso,html[data-mipj-skin="pixel"] .esc-ui .p-btn,html[data-mipj-skin="pixel"] .esc-pam .box,html[data-mipj-skin="pixel"] .esc-pam .card,html[data-mipj-skin="pixel"] .esc-pam .pill{border-radius:0}'
  ].join('\n');
  // En PAM, las variables --m-* salen de los colores del tema de PAM.
  var CSS_PAM_VARS = '.esc-ui{--m-ink:var(--ink);--m-panel:var(--panel);--m-panel-2:var(--panel-2);--m-parchment:var(--parchment);--m-parchment-dim:var(--parchment-dim);--m-gold:var(--gold);--m-gold-bright:var(--gold-bright);--m-arcane-bright:var(--arcane-bright);--m-good:var(--good);--m-bad:var(--bad);--m-line-strong:var(--line-strong);--m-accent-ink:var(--accent-ink);--m-serif:var(--serif);--m-sans:var(--sans)}';
  function estilosCanjes() {
    if (document.getElementById('esc-css')) { return; }
    var s = document.createElement('style');
    s.id = 'esc-css';
    s.textContent = (enPAM() ? CSS_PAM_VARS + '\n' : '') + CSS_ESC;
    document.head.appendChild(s);
  }
  function enPAM() { return location.host === 'jesleytherabbit-prog.github.io' && location.pathname.indexOf('/PAM') === 0; }

  // ---------------------------------------------------------------
  // Almacen (Tampermonkey). Si no existe (pruebas fuera de la
  // extension), se usa localStorage con el mismo formato.
  // ---------------------------------------------------------------
  var almacen = {
    leer: function (clave, defecto) {
      try {
        if (typeof GM_getValue === 'function') { return GM_getValue(clave, defecto); }
        var v = localStorage.getItem('escriba.' + clave);
        return v === null ? defecto : JSON.parse(v);
      } catch (e) { return defecto; }
    },
    escribir: function (clave, valor) {
      try {
        if (typeof GM_setValue === 'function') { GM_setValue(clave, valor); return; }
        localStorage.setItem('escriba.' + clave, JSON.stringify(valor));
      } catch (e) { /* sin almacen: el panel sigue funcionando */ }
    }
  };

  // ---------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------
  function pedirDoc(url) {
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    return fetch(url + sep + '_=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status + ' en ' + url); }
        return r.text();
      })
      .then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
  }

  function numero(txt) {
    var limpio = String(txt == null ? '' : txt).replace(/[^\d-]/g, '');
    if (limpio === '' || limpio === '-') { return NaN; }
    return parseInt(limpio, 10);
  }

  function formato(n) {
    if (typeof n !== 'number' || isNaN(n)) { return '—'; }
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Texto de un bloque HTML linea a linea, incluido lo que esta
  // dentro de spoilers cerrados.
  function lineasDe(elemento) {
    if (!elemento) { return []; }
    var copia = elemento.cloneNode(true);
    Array.prototype.forEach.call(copia.querySelectorAll('style, script'), function (e) { e.remove(); });
    var html = copia.innerHTML
      .replace(/<(br|hr)\s*\/?>/gi, '\n')
      .replace(/<\/?(p|div|dd|dt|dl|li|ul|ol|tr|td|table|h[1-6]|center|label|blockquote)\b[^>]*>/gi, '\n');
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || '').split('\n')
      .map(function (l) { return l.replace(/[ \t\u00a0]+/g, ' ').trim(); })
      .filter(function (l) { return l !== ''; });
  }

  // "/t37784-mark-jordan#73229" -> "/t37784-" (se ignoran las anclas,
  // que a veces estan mal copiadas). Rechaza enlaces a otros dominios.
  function temaDeEnlace(enlace) {
    if (!enlace) { return null; }
    var m = String(enlace).trim().match(/^(?:https?:\/\/([^\/]+))?\/t(\d+)/);
    if (!m) { return null; }
    if (m[1] && m[1] !== location.host) { return null; }
    return '/t' + m[2] + '-';
  }

  function ahoraISO() { return new Date().toISOString(); }

  // ---------------------------------------------------------------
  // Cuenta conectada: se lee del HTML de la pagina (no hace falta
  // acceder a las variables de la pagina desde la extension).
  // ---------------------------------------------------------------
  function cuentaConectada() {
    var html = document.documentElement.innerHTML;
    var id = (html.match(/_userdata\["user_id"\]\s*=\s*(\d+)/) || [])[1];
    var nombre = (html.match(/_userdata\["username"\]\s*=\s*"([^"]*)"/) || [])[1];
    var logado = (html.match(/_userdata\["session_logged_in"\]\s*=\s*(\d)/) || [])[1];
    if (logado !== '1' || !id || id === '-1') { return null; }
    return { id: parseInt(id, 10), nombre: nombre };
  }

  // En PAM no hay cuenta del foro: se usa el foro guardado en el paquete.
  function claveCuenta(cuenta) { return 'cuentas.' + (cuenta.foro || location.host) + '.' + cuenta.id; }

  function enlacePost(idPost) { return location.origin + '/viewtopic?p=' + idPost + '#' + idPost; }

  // ---------------------------------------------------------------
  // LECTOR
  // ---------------------------------------------------------------

  // Posts de una pagina de tema.
  function postsDe(doc) {
    return Array.prototype.map.call(doc.querySelectorAll('.post'), function (p) {
      var a = p.querySelector('.author a[href^="/u"], .postprofile a[href^="/u"]');
      var autor = p.querySelector('p.author');
      var nombre = a ? a.textContent.trim() : '';
      var fecha = autor ? autor.textContent.replace(/\s+/g, ' ').replace(/^.*?por\s*/i, '') : '';
      if (nombre && fecha.indexOf(nombre) === 0) { fecha = fecha.substring(nombre.length); }
      return {
        id: (p.id || '').replace(/\D/g, ''),
        autorId: a ? parseInt((a.getAttribute('href').match(/^\/u(\d+)/) || [])[1], 10) : null,
        autorNombre: nombre,
        fecha: fecha.trim(),
        contenido: p.querySelector('.content')
      };
    });
  }

  // Lee la primera pagina y, si hay mas, la ultima.
  function leerTema(urlTema) {
    return pedirDoc(urlTema).then(function (d1) {
      var titulo = ((d1.querySelector('h1.page-title') || {}).textContent || '').trim();
      var enlaces = Array.prototype.map.call(d1.querySelectorAll('.pagination a[href]'), function (a) { return a.getAttribute('href'); })
        .filter(function (h) { return /\/t\d+p\d+-/.test(h); });
      var ultima = null, max = -1;
      enlaces.forEach(function (h) {
        var off = parseInt((h.match(/\/t\d+p(\d+)-/) || [])[1], 10);
        if (off > max) { max = off; ultima = h; }
      });
      var primeros = postsDe(d1);
      if (!ultima) { return { titulo: titulo, posts: primeros, paginas: 1 }; }
      // También la anteúltima: si la última solo tiene una nota, el último movimiento queda antes.
      var anteultima = max > 15 ? ultima.replace(/\/t(\d+)p\d+-/, '/t$1p' + (max - 15) + '-') : null;
      return Promise.all([pedirDoc(ultima), anteultima ? pedirDoc(anteultima).catch(function () { return null; }) : null]).then(function (ds) {
        var vistos = {};
        var todos = primeros.concat(ds[1] ? postsDe(ds[1]) : [], postsDe(ds[0])).filter(function (p) {
          if (vistos[p.id]) { return false; }
          vistos[p.id] = true;
          return true;
        });
        todos.sort(function (x, y) { return parseInt(x.id, 10) - parseInt(y.id, 10); });
        return { titulo: titulo, posts: todos, paginas: ds[1] ? 3 : 2 };
      });
    });
  }

  function leerPerfil() {
    var cfg = FOROS[location.host];
    return pedirDoc('/profile?mode=editprofile&page_profil=informations').then(function (d) {
      var f = d.querySelector('[name="' + cfg.campoFicha + '"]');
      var b = d.querySelector('[name="' + cfg.campoBoveda + '"]');
      return { ficha: f ? f.value.trim() : '', boveda: b ? b.value.trim() : '' };
    });
  }

  function leerBBCode(idPost) {
    return pedirDoc('/post?p=' + idPost + '&mode=editpost').then(function (d) {
      var t = d.querySelector('form[name="post"] textarea[name="message"]');
      return t ? t.value : null;
    }).catch(function () { return null; });
  }

  function valorTras(lineas, etiqueta) {
    var re = new RegExp(etiqueta + '\\s*:?', 'i');
    var l = lineas.filter(function (x) { return re.test(x); })[0];
    if (!l) { return null; }
    var resto = l.replace(/^.*?:/, '');
    return resto.trim();
  }

  // Estado de revision de la ficha a partir de las respuestas.
  function estadoFicha(posts, idDuenyo) {
    var ultimoSello = null, ultimoPostDuenyo = null, sinIdentificar = null;
    posts.slice(1).forEach(function (p, i) {
      if (p.autorId === idDuenyo) { ultimoPostDuenyo = { idx: i, post: p }; return; }
      var imgs = p.contenido ? Array.prototype.map.call(p.contenido.querySelectorAll('img'), function (im) { return im.getAttribute('src') || ''; }) : [];
      var texto = lineasDe(p.contenido).join(' ');
      var encontrado = null;
      imgs.forEach(function (src) {
        Object.keys(SELLOS).forEach(function (cod) { if (src.indexOf(cod) !== -1) { encontrado = SELLOS[cod]; } });
      });
      if (encontrado) { ultimoSello = { idx: i, nombre: encontrado, post: p }; }
      else if (imgs.length && texto.length < 5) { sinIdentificar = { idx: i, post: p, img: imgs[0] }; ultimoSello = { idx: i, nombre: 'Revisión sin identificar', post: p }; }
    });
    var pendiente = !!(ultimoPostDuenyo && (!ultimoSello || ultimoPostDuenyo.idx > ultimoSello.idx));
    return {
      sello: ultimoSello ? ultimoSello.nombre : null,
      selloFecha: ultimoSello ? ultimoSello.post.fecha : null,
      selloAutor: ultimoSello ? ultimoSello.post.autorNombre : null,
      pendiente: pendiente,
      sinIdentificar: sinIdentificar ? sinIdentificar.img : null
    };
  }

  // Movimiento de bóveda -> objeto. Usa el lector genérico (leerSaldos), que entiende el formulario
  // {…», las tablas de la caja automática y el estilo libre «Grageas actuales: X … restantes: Y»,
  // aunque haya varios movimientos en el mismo mensaje.
  function aNum(v) { return typeof v === 'number' ? v : NaN; }
  function leerMovimiento(p) {
    var sal = leerSaldos(lineasDe(p.contenido).join('\n'));
    if (!sal.gr && !sal.pl) { return null; }
    var g = sal.gr || {};
    var enlaces = p.contenido ? Array.prototype.map.call(p.contenido.querySelectorAll('a[href]'), function (a) { return a.getAttribute('href'); }) : [];
    return {
      post: p.id,
      fecha: p.fecha,
      iniciales: aNum(g.ini),
      cambio: aNum(g.delta),
      actuales: aNum(g.fin),
      totales: aNum(g.tot),
      pl: sal.pl || null,
      enlaces: enlaces
    };
  }

  function leerBoveda(urlTema, idDuenyo) {
    return leerTema(urlTema).then(function (t) {
      var primero = t.posts[0];
      if (!primero) { throw new Error('No pude abrir la bóveda.'); }
      if (primero.autorId !== idDuenyo) { throw new Error('El primer mensaje de la bóveda no es tuyo.'); }
      var l = lineasDe(primero.contenido);
      var movimientos = [], notas = [], ultimoPropio = -1, postUltimoPropio = null;
      // Saldo: el primer mensaje es solo el respaldo; manda el último movimiento (tuyo o de una revisión).
      var cab = leerSaldos(l.join('\n'));
      var saldo = {
        gr: { act: cab.gr ? cab.gr.fin : NaN, tot: cab.gr ? aNum(cab.gr.tot) : NaN, ini: cab.gr ? aNum(cab.gr.ini) : NaN },
        pl: { act: cab.pl ? cab.pl.fin : NaN, tot: cab.pl ? aNum(cab.pl.tot) : NaN }
      };
      t.posts.slice(1).forEach(function (p, i) {
        var esRevision = false;
        if (p.autorId === idDuenyo) {
          ultimoPropio = i;
          postUltimoPropio = p.id;
          var m = leerMovimiento(p);
          if (m) { movimientos.push(m); }
        } else if (p.autorId) {
          var txt = lineasDe(p.contenido).join(' ');
          esRevision = /Revisi[oó]n\s+de\s+B[oó]veda/i.test(txt);
          notas.push({ idx: i, post: p.id, autor: p.autorNombre, fecha: p.fecha, texto: txt.substring(0, 300) });
        }
        if (p.autorId === idDuenyo || esRevision) {
          var s2 = leerSaldos(lineasDe(p.contenido).join('\n'));
          if (s2.gr) { saldo.gr.act = s2.gr.fin; if (s2.gr.tot != null) { saldo.gr.tot = s2.gr.tot; } }
          if (s2.pl) { saldo.pl.act = s2.pl.fin; if (s2.pl.tot != null) { saldo.pl.tot = s2.pl.tot; } }
        }
      });
      // Una nota esta pendiente si es posterior a tu ultimo mensaje en la boveda.
      notas.forEach(function (n) { n.pendiente = n.idx > ultimoPropio; });
      var ultMov = movimientos[movimientos.length - 1];
      var ultNota = notas[notas.length - 1];
      return {
        // Enlaces que PAM guarda en su Boveda (primer post, ultimo post, ultima correccion).
        enlaces: {
          primero: enlacePost(primero.id),
          ultimo: ultMov ? enlacePost(ultMov.post) : (postUltimoPropio ? enlacePost(postUltimoPropio) : ''),
          correccion: ultNota ? enlacePost(ultNota.post) : '',
          correccionAutor: ultNota ? ultNota.autor : ''
        },
        url: urlTema,
        titulo: t.titulo,
        post: primero.id,
        // Saldo real (último movimiento). «cabecera» es lo que dice el primer mensaje.
        grageas: { iniciales: saldo.gr.ini, totales: saldo.gr.tot, actuales: saldo.gr.act },
        pl: { totales: saldo.pl.tot, actuales: saldo.pl.act },
        cabecera: {
          iniciales: numero(valorTras(l, 'Grageas Iniciales')),
          totales: numero(valorTras(l, 'Grageas Totales')),
          actuales: numero(valorTras(l, 'Grageas Actuales'))
        },
        movimientos: movimientos,
        notas: notas
      };
    });
  }

  function leerFicha(urlTema, idDuenyo) {
    return leerTema(urlTema).then(function (t) {
      var primero = t.posts[0];
      if (!primero) { throw new Error('No pude abrir la ficha.'); }
      if (primero.autorId !== idDuenyo) { throw new Error('El primer mensaje de la ficha no es tuyo.'); }
      var l = lineasDe(primero.contenido);
      var nombre = valorTras(l, 'Nombre y Apellido') || t.titulo;
      return leerBBCode(primero.id).then(function (bbcode) {
        return {
          url: urlTema,
          titulo: t.titulo,
          post: primero.id,
          nombre: nombre,
          bbcode: bbcode,
          estado: estadoFicha(t.posts, idDuenyo)
        };
      });
    });
  }

  // Miembros de un grupo (tabla de miembros; no la lista de conectados).
  function leerGrupo(url) {
    return pedirDoc(url).then(function (d) {
      var main = d.querySelector('#main-content') || d.body;
      // Fuera la lista de conectados y similares: no son miembros del grupo.
      Array.prototype.forEach.call(main.querySelectorAll('#whosonline, .whosonline, #picture_legend, .stat-block'), function (e) { e.remove(); });
      var vistos = {}, miembros = [];
      Array.prototype.forEach.call(main.querySelectorAll('table a[href^="/u"], ul.topiclist a[href^="/u"]'), function (a) {
        var id = parseInt((a.getAttribute('href').match(/^\/u(\d+)/) || [])[1], 10);
        var n = a.textContent.trim();
        if (id && n && !vistos[id]) { vistos[id] = true; miembros.push({ id: id, nombre: n }); }
      });
      return miembros;
    });
  }

  function leerGruposRevisores(forzar) {
    var cfg = FOROS[location.host];
    var clave = 'grupos.' + location.host;
    var cache = almacen.leer(clave, null);
    if (!forzar && cache && (Date.now() - cache.leido) < CADUCIDAD_GRUPOS_MS) { return Promise.resolve(cache); }
    var nombres = Object.keys(cfg.grupos || {});
    if (!nombres.length) { return Promise.resolve({ leido: Date.now(), grupos: {} }); }
    return Promise.all(nombres.map(function (n) {
      return leerGrupo(cfg.grupos[n]).catch(function () { return null; });
    })).then(function (listas) {
      var res = { leido: Date.now(), grupos: {} };
      nombres.forEach(function (n, i) { res.grupos[n] = listas[i]; });
      almacen.escribir(clave, res);
      return res;
    });
  }

  // Lectura completa -> foto guardada por cuenta.
  function leerTodo(cuenta) {
    var errores = [];
    return leerPerfil().then(function (perfil) {
      var tFicha = temaDeEnlace(perfil.ficha);
      var tBoveda = temaDeEnlace(perfil.boveda);
      if (!tFicha) { errores.push('Falta el enlace «Ficha de PJ» en tu perfil (o no apunta a un tema del foro).'); }
      if (!tBoveda) { errores.push('Falta el enlace «Bóveda» en tu perfil (o no apunta a un tema del foro).'); }
      return Promise.all([
        tFicha ? leerFicha(tFicha, cuenta.id).catch(function (e) { errores.push('Ficha: ' + e.message); return null; }) : null,
        tBoveda ? leerBoveda(tBoveda, cuenta.id).catch(function (e) { errores.push('Bóveda: ' + e.message); return null; }) : null,
        leerGruposRevisores(false).catch(function () { return null; })
      ]);
    }).then(function (r) {
      var foto = {
        version: VERSION,
        leidoEn: ahoraISO(),
        cuenta: cuenta,
        foro: location.host,
        ficha: r[0],
        boveda: r[1],
        revisores: r[2],
        errores: errores
      };
      var datos = almacen.leer(claveCuenta(cuenta), {}) || {};
      datos.usuario = cuenta;
      datos.foto = foto;
      almacen.escribir(claveCuenta(cuenta), datos);
      return foto;
    });
  }

  // Comprobaciones rapidas sobre la foto (solo avisos, no corrige nada).
  function avisosDe(foto) {
    var av = [];
    var b = foto.boveda;
    if (b) {
      if (!isNaN(b.cabecera.actuales) && !isNaN(b.grageas.actuales) && b.cabecera.actuales !== b.grageas.actuales) {
        av.push('El primer mensaje de la bóveda dice ' + formato(b.cabecera.actuales) + ' grageas actuales, pero el último movimiento deja ' + formato(b.grageas.actuales) + '.');
      }
      if (isNaN(b.grageas.actuales)) { av.push('No encuentro tus grageas actuales en la bóveda.'); }
      b.movimientos.forEach(function (m) {
        if (!isNaN(m.iniciales) && !isNaN(m.cambio) && !isNaN(m.actuales) && m.iniciales + m.cambio !== m.actuales) {
          av.push('Movimiento de ' + m.fecha + ': ' + formato(m.iniciales) + ' + (' + m.cambio + ') no da ' + formato(m.actuales) + '.');
        }
      });
    }
    if (foto.ficha && foto.ficha.estado.sinIdentificar) {
      av.push('Hay un sello de revisión que no reconozco en tu ficha.');
    }
    return av;
  }

  // ---------------------------------------------------------------
  // ESCRITOR: publica y edita con los formularios normales del foro,
  // con la sesion del jugador. Solo lo llama la puerta de validacion.
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

  function formularioEdicion(idPost) {
    return pedirDoc('/post?p=' + idPost + '&mode=editpost').then(function (d) {
      var f = d.querySelector('form[name="post"]');
      if (!f || !f.elements.message) { throw new Error('No puedo editar el mensaje ' + idPost + ' (¿no es tuyo?).'); }
      return f;
    });
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Reintenta solo si el foro pide esperar (antiflood), hasta 3 veces.
  function conReintentos(fn, avisar) {
    var intentos = 0;
    function uno() {
      return fn().then(function (r) {
        if (r.estado === 'flood' && intentos < 3) {
          intentos++;
          var s = (r.segundos || 10) + 1;
          if (avisar) { avisar('El foro pide esperar ' + s + ' s entre mensajes. Vuelvo a intentar…'); }
          return esperar(s * 1000).then(uno);
        }
        return r;
      });
    }
    return uno();
  }

  function guardarCopia(cuenta, idPost, texto) {
    var datos = almacen.leer(claveCuenta(cuenta), {}) || {};
    datos.copias = datos.copias || [];
    datos.copias.push({ post: idPost, fecha: ahoraISO(), bbcode: texto });
    if (datos.copias.length > 30) { datos.copias = datos.copias.slice(-30); }
    almacen.escribir(claveCuenta(cuenta), datos);
  }

  function registrarHistorial(cuenta, entrada) {
    var datos = almacen.leer(claveCuenta(cuenta), {}) || {};
    datos.historial = datos.historial || [];
    entrada.fecha = ahoraISO();
    datos.historial.push(entrada);
    if (datos.historial.length > 100) { datos.historial = datos.historial.slice(-100); }
    almacen.escribir(claveCuenta(cuenta), datos);
  }

  // Paso: { tipo: 'editar', post, original, nuevo, motivo }
  //    o  { tipo: 'publicar', tema, texto }
  function ejecutarPaso(cuenta, paso, avisar) {
    if (paso.tipo === 'editar') {
      return formularioEdicion(paso.post).then(function (f) {
        // Si alguien lo ha cambiado desde la vista previa, no se toca.
        if (f.elements.message.value !== paso.original) { return { estado: 'cambiado' }; }
        guardarCopia(cuenta, paso.post, paso.original);
        return conReintentos(function () {
          return formularioEdicion(paso.post).then(function (f2) {
            return enviarFormulario(camposDe(f2, { message: paso.nuevo, edit_reason: paso.motivo || '' }));
          });
        }, avisar).then(function (r) {
          if (r.estado === 'flood' || r.estado === 'antispam') { return r; }
          // Se comprueba leyendo el mensaje otra vez.
          return formularioEdicion(paso.post).then(function (f3) {
            return f3.elements.message.value === paso.nuevo
              ? { estado: 'ok', post: paso.post }
              : { estado: 'error', detalle: 'El mensaje no quedó como se esperaba.' };
          });
        });
      });
    }
    if (paso.tipo === 'publicar') {
      // ¿Ya está en el tema? (mismo texto en tus últimos mensajes). Se mira antes de cada reintento
      // y cuando el foro no confirma o se corta la conexión, para no publicar dos veces lo mismo.
      var yaPublicado = function () {
        return buscarMensajePropio(cuenta, '/t' + paso.tema + '-', function (bb) { return mismoTexto(bb, paso.texto); })
          .catch(function () { return null; });
      };
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
          return ya ? { estado: 'ok', post: ya.id }
            : { estado: 'error', detalle: 'El foro no confirmó la publicación y no la encuentro en el tema. Mirá el tema antes de volver a intentarlo.' };
        });
      }).then(function (r) {
        if (r.estado !== 'ok' || r.post) { return r; }
        // Sin número de mensaje en la respuesta: es tu último mensaje del tema.
        return leerTema('/t' + paso.tema + '-').then(function (t) {
          var propios = t.posts.filter(function (p) { return p.autorId === cuenta.id; });
          r.post = propios.length ? propios[propios.length - 1].id : null;
          return r;
        }).catch(function () { return r; });
      });
    }
    return Promise.resolve({ estado: 'error', detalle: 'Tipo de paso desconocido.' });
  }

  // ---------------------------------------------------------------
  // Comparacion por lineas (antes / despues)
  // ---------------------------------------------------------------
  function compararLineas(antes, despues) {
    var A = antes.split('\n'), B = despues.split('\n');
    var ini = 0;
    while (ini < A.length && ini < B.length && A[ini] === B[ini]) { ini++; }
    var fa = A.length - 1, fb = B.length - 1;
    while (fa >= ini && fb >= ini && A[fa] === B[fb]) { fa--; fb--; }
    var ma = A.slice(ini, fa + 1), mb = B.slice(ini, fb + 1);
    var medio = [];
    if (ma.length * mb.length <= 250000) {
      // LCS sobre el tramo que cambia.
      var n = ma.length, m = mb.length, tabla = [];
      for (var i = 0; i <= n; i++) { tabla.push(new Uint16Array(m + 1)); }
      for (i = n - 1; i >= 0; i--) {
        for (var j = m - 1; j >= 0; j--) {
          tabla[i][j] = ma[i] === mb[j] ? tabla[i + 1][j + 1] + 1 : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
        }
      }
      i = 0; j = 0;
      while (i < n && j < m) {
        if (ma[i] === mb[j]) { medio.push({ t: '=', l: ma[i] }); i++; j++; }
        else if (tabla[i + 1][j] >= tabla[i][j + 1]) { medio.push({ t: '-', l: ma[i] }); i++; }
        else { medio.push({ t: '+', l: mb[j] }); j++; }
      }
      while (i < n) { medio.push({ t: '-', l: ma[i++] }); }
      while (j < m) { medio.push({ t: '+', l: mb[j++] }); }
    } else {
      ma.forEach(function (l) { medio.push({ t: '-', l: l }); });
      mb.forEach(function (l) { medio.push({ t: '+', l: l }); });
    }
    var todo = A.slice(0, ini).map(function (l) { return { t: '=', l: l }; })
      .concat(medio)
      .concat(A.slice(fa + 1).map(function (l) { return { t: '=', l: l }; }));
    // Solo se ensenan los cambios con 2 lineas de contexto.
    var mostrar = todo.map(function () { return false; });
    todo.forEach(function (x, k) {
      if (x.t !== '=') { for (var d = -2; d <= 2; d++) { if (todo[k + d]) { mostrar[k + d] = true; } } }
    });
    var res = [], corte = false;
    todo.forEach(function (x, k) {
      if (mostrar[k]) { res.push(x); corte = false; }
      else if (!corte) { res.push({ t: '…', l: '' }); corte = true; }
    });
    return res;
  }

  // ---------------------------------------------------------------
  // PUERTA DE VALIDACION
  // accion = { titulo, explicacion, pasos: [...], sinCuenta }
  // Pasos del foro: 'editar' y 'publicar' (ver ejecutarPaso).
  // Pasos de PAM: { tipo: 'pam', titulo, vista (nodo), editar(), recoger(),
  //   ejecutar(avisar) -> promesa { estado, detalle }, omitido (texto) }.
  // igual (texto): el paso ya está hecho (el destino ya tiene lo mismo) y no se toca.
  // sinCuenta: en PAM no hay cuenta del foro que comprobar.
  // Devuelve una promesa con { resultado: 'aceptada'|'denegada'|'fallida'|'parcial'|'igual', pasos }
  // ---------------------------------------------------------------
  function mismoTexto(a, b) {
    var n = function (s) { return String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim(); };
    return n(a) === n(b);
  }

  function abrirPuerta(raiz, cuenta, accion) {
    accion.pasos.forEach(function (paso) {
      if (paso.tipo === 'editar' && !paso.omitido && !paso.igual && mismoTexto(paso.original, paso.nuevo)) {
        paso.igual = 'El mensaje ya tiene exactamente este texto.';
      }
    });
    // Si todo ya está igual, no hay nada que aceptar: no se abre la puerta.
    if (accion.pasos.length && accion.pasos.every(function (p) { return p.igual; })) {
      registrarHistorial(cuenta, { accion: accion.titulo, resultado: 'igual' });
      return Promise.resolve({ resultado: 'igual', pasos: accion.pasos.map(function () { return { estado: 'igual' }; }) });
    }
    return new Promise(function (resolver) {
      var fondo = el('div', { clase: 'esc-ui puerta-fondo' });
      var dlg = el('div', { clase: 'puerta', role: 'dialog', 'aria-modal': 'true', 'aria-label': accion.titulo });
      fondo.appendChild(dlg);

      dlg.appendChild(el('div', { clase: 'p-cab' }, [
        el('b', { texto: accion.titulo }),
        el('small', { texto: cuenta.nombre })
      ]));
      if (accion.explicacion) { dlg.appendChild(el('div', { clase: 'p-expl', texto: accion.explicacion })); }
      (accion.avisos || []).forEach(function (a) { dlg.appendChild(el('div', { clase: 'aviso', texto: a })); });

      var editables = [];
      var estados = [];
      accion.pasos.forEach(function (paso, k) {
        var caja = el('div', { clase: 'p-paso' });
        if (paso.igual) {
          var estadoIgual = el('span', { clase: 'p-estado ok', texto: 'Ya está igual' });
          estados.push(estadoIgual);
          caja.appendChild(el('div', { clase: 'p-paso-cab' }, [el('span', { texto: (k + 1) + '. ' + (paso.titulo || (paso.tipo === 'editar' ? 'Editar mensaje' : 'Publicar en el tema')) }), estadoIgual]));
          caja.appendChild(el('div', { clase: 'p-nota', texto: paso.igual + ' No se toca.' }));
          dlg.appendChild(caja);
          return;
        }
        if (paso.tipo === 'pam') {
          var estadoPam = el('span', { clase: 'p-estado ' + (paso.omitido ? 'mal' : 'neutro'), texto: paso.omitido ? 'No se hará' : 'Pendiente' });
          estados.push(estadoPam);
          caja.appendChild(el('div', { clase: 'p-paso-cab' }, [el('span', { texto: (k + 1) + '. ' + paso.titulo }), estadoPam]));
          if (paso.omitido) { caja.appendChild(el('div', { clase: 'aviso', texto: paso.omitido })); }
          if (paso.vista) { caja.appendChild(paso.vista); }
          editables.push({ paso: paso, pam: true });
          dlg.appendChild(caja);
          return;
        }
        var tituloPaso = paso.tipo === 'editar' ? 'Editar mensaje' : 'Publicar en el tema';
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
        caja.appendChild(el('div', { clase: 'p-paso-cab' }, [
          el('span', { texto: (k + 1) + '. ' + tituloPaso + (paso.descripcion ? ' · ' + paso.descripcion : '') }),
          estado
        ]));
        caja.appendChild(el('a', { href: enlace, target: '_blank', rel: 'noopener', texto: paso.tipo === 'editar' ? 'Ver el mensaje' : 'Ver el tema' }));

        var area = el('textarea', { clase: 'p-texto', spellcheck: 'false' });
        area.value = paso.tipo === 'editar' ? paso.nuevo : paso.texto;
        area.readOnly = true;
        var vista = el('div', { clase: 'p-diff' });
        function pintarDiff() {
          vista.innerHTML = '';
          compararLineas(paso.original, area.value).forEach(function (x) {
            vista.appendChild(el('div', { clase: 'd' + (x.t === '+' ? ' mas' : x.t === '-' ? ' menos' : x.t === '…' ? ' corte' : ''), texto: (x.t === '=' ? '  ' : x.t + ' ') + x.l }));
          });
        }
        if (paso.tipo === 'editar') {
          pintarDiff();
          caja.appendChild(vista);
          area.hidden = true;
          var t;
          area.addEventListener('input', function () { clearTimeout(t); t = setTimeout(pintarDiff, 250); });
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
      estilosCanjes();
      document.body.appendChild(fondo);
      bAceptar.focus();

      function cerrar(res) {
        fondo.remove();
        resolver(res);
      }

      bDenegar.addEventListener('click', function () {
        registrarHistorial(cuenta, { accion: accion.titulo, resultado: 'denegada' });
        cerrar({ resultado: 'denegada' });
      });

      bModificar.addEventListener('click', function () {
        editables.forEach(function (x) {
          if (x.pam) { if (x.paso.editar && !x.paso.omitido) { x.paso.editar(); } return; }
          x.area.readOnly = false; x.area.hidden = false;
        });
        bModificar.disabled = true;
        bAceptar.textContent = 'Aceptar con mis cambios';
        info.textContent = accion.sinCuenta ? 'Cambiá los valores. Se pone en PAM exactamente lo que escribas.'
          : 'Editá el texto. Se publica exactamente lo que escribas.';
        var primero = dlg.querySelector('textarea:not([readonly]), input:not([readonly])');
        if (primero) { primero.focus(); }
      });

      bAceptar.addEventListener('click', function () {
        if (!accion.sinCuenta) {
          var ahora = cuentaConectada();
          if (!ahora || ahora.id !== cuenta.id) {
            info.className = 'p-info error';
            info.textContent = 'La cuenta conectada ya no es ' + cuenta.nombre + '. No se hizo nada.';
            return;
          }
        }
        editables.forEach(function (x) {
          if (x.pam) { if (x.paso.recoger) { x.paso.recoger(); } return; }
          x.area.readOnly = true;
          if (x.paso.tipo === 'editar') { x.paso.nuevo = x.area.value; } else { x.paso.texto = x.area.value; }
        });
        bAceptar.disabled = true; bModificar.disabled = true; bDenegar.disabled = true;
        info.className = 'p-info';
        var resultados = [];
        var k = 0;
        function siguiente() {
          if (k >= accion.pasos.length) { return Promise.resolve(); }
          var idx = k++;
          var paso = accion.pasos[idx];
          if (paso.igual) {
            resultados.push({ estado: 'igual', post: paso.postExistente || null });
            return siguiente();
          }
          if (paso.omitido) {
            resultados.push({ estado: 'omitido' });
            estados[idx].textContent = 'Omitido';
            return siguiente();
          }
          // «enlace del paso n»: enlace al mensaje que ha publicado (o ya tenía) el paso n.
          var faltaEnlace = null;
          var conEnlaces = function (t) {
            return String(t).replace(/«enlace del paso (\d+)»/g, function (m, n) {
              var r0 = resultados[parseInt(n, 10) - 1];
              if (!r0 || !r0.post) { faltaEnlace = n; return m; }
              return enlacePost(r0.post);
            });
          };
          if (paso.tipo === 'publicar') { paso.texto = conEnlaces(paso.texto); }
          if (paso.tipo === 'editar') { paso.nuevo = conEnlaces(paso.nuevo); }
          if (faltaEnlace) {
            resultados.push({ estado: 'error', detalle: 'Falta el enlace del paso ' + faltaEnlace + '.' });
            estados[idx].className = 'p-estado mal';
            estados[idx].textContent = 'No hecho';
            info.className = 'p-info error';
            info.textContent = 'Paso ' + (idx + 1) + ': no tengo el enlace del mensaje del paso ' + faltaEnlace + '. Los pasos anteriores sí se hicieron.';
            return Promise.resolve();
          }
          estados[idx].className = 'p-estado warn';
          estados[idx].textContent = 'En curso…';
          var avisar = function (msg) { info.textContent = msg; };
          var ejecucion = paso.tipo === 'pam' ? Promise.resolve().then(function () { return paso.ejecutar(avisar); }) : ejecutarPaso(cuenta, paso, avisar);
          return ejecucion.catch(function (e) {
            return { estado: 'error', detalle: e.message };
          }).then(function (r) {
            resultados.push(r);
            if (r.estado === 'ok') {
              estados[idx].className = 'p-estado ok';
              estados[idx].textContent = 'Hecho';
              info.textContent = '';
              return siguiente();
            }
            estados[idx].className = 'p-estado mal';
            estados[idx].textContent = 'No hecho';
            var motivo = r.estado === 'cambiado' ? 'El mensaje cambió desde la vista previa; no se tocó.'
              : r.estado === 'flood' ? 'El foro sigue pidiendo esperar.'
              : r.estado === 'antispam' ? 'El foro pide una comprobación antispam: publicalo a mano.'
              : (r.detalle || 'Error desconocido.');
            for (var q = idx + 1; q < estados.length; q++) { if (!accion.pasos[q].igual) { estados[q].textContent = 'No ejecutado'; } }
            info.className = 'p-info error';
            info.textContent = 'Paso ' + (idx + 1) + ': ' + motivo + (idx > 0 ? ' Los pasos anteriores sí se hicieron.' : '') +
              (idx + 1 < estados.length ? ' Los siguientes no se hicieron.' : '');
            return null;
          });
        }
        siguiente().then(function () {
          var algunoOk = resultados.some(function (r) { return r.estado === 'ok'; });
          var completos = resultados.length === accion.pasos.length && resultados.every(function (r) { return r.estado === 'ok' || r.estado === 'omitido' || r.estado === 'igual'; });
          var todosOk = algunoOk && completos;
          var nadaQueHacer = !algunoOk && completos && resultados.some(function (r) { return r.estado === 'igual'; });
          var resultado = todosOk ? 'aceptada' : (nadaQueHacer ? 'igual' : (algunoOk ? 'parcial' : 'fallida'));
          registrarHistorial(cuenta, { accion: accion.titulo, resultado: resultado, pasos: resultados });
          if (todosOk || nadaQueHacer) {
            var omitidos = resultados.filter(function (r) { return r.estado === 'omitido'; }).length;
            var iguales = resultados.filter(function (r) { return r.estado === 'igual'; }).length;
            info.className = 'p-info okmsg';
            info.textContent = nadaQueHacer ? 'No había nada que cambiar.'
              : 'Hecho' + (iguales ? ' (los pasos que ya estaban igual no se tocaron)' : '') + (omitidos ? ', salvo los pasos marcados como «Omitido».' : '.');
          }
          var bCerrar = el('button', { clase: 'p-btn', type: 'button', texto: 'Cerrar' });
          botones.innerHTML = '';
          botones.appendChild(bCerrar);
          bCerrar.focus();
          bCerrar.addEventListener('click', function () { cerrar({ resultado: resultado, pasos: resultados }); });
          // Siguiente paso en otra pestaña (enlace normal: el navegador no lo bloquea).
          if ((todosOk || nadaQueHacer) && accion.enlaceFinal) {
            // antesDelEnlace puede devolver una promesa (p. ej. volver a leer el foro).
            Promise.resolve(accion.antesDelEnlace ? accion.antesDelEnlace(resultados) : null).then(function () {
              // alPulsar: una acción (p. ej. abrir PAM por el canal oficial) en lugar de un enlace.
              var bSig = accion.enlaceFinal.alPulsar
                ? el('button', { clase: 'p-btn ok', type: 'button', texto: accion.enlaceFinal.texto })
                : el('a', { clase: 'p-btn ok', href: accion.enlaceFinal.href, target: '_blank', rel: 'noopener', texto: accion.enlaceFinal.texto });
              bSig.style.textDecoration = 'none';
              bSig.addEventListener('click', function () {
                if (accion.enlaceFinal.alPulsar) { accion.enlaceFinal.alPulsar(); }
                cerrar({ resultado: resultado, pasos: resultados });
              });
              botones.appendChild(bSig);
              bSig.focus();
            }).catch(function (e) {
              info.className = 'p-info error';
              info.textContent = 'Hecho, pero no pude preparar el paso siguiente: ' + e.message;
            });
          }
        });
      });
    });
  }

  // ---------------------------------------------------------------
  // CANJES EN EL FORO (hito 4): publicar la peticion que PAM ha
  // redactado y detectar la aprobacion en el Registro de Canjes.
  // El texto y las cuentas son de PAM; aqui solo se publica y se lee.
  // ---------------------------------------------------------------
  function datosCuenta(cuenta) { return almacen.leer(claveCuenta(cuenta), {}) || {}; }
  function guardarDatosCuenta(cuenta, cambiar) {
    var d = datosCuenta(cuenta);
    cambiar(d);
    almacen.escribir(claveCuenta(cuenta), d);
    return d;
  }
  function temaNumero(url) { return (String(url || '').match(/\/t(\d+)/) || [])[1] || null; }

  // Peticion capturada en PAM para este foro y esta cuenta (o null).
  function peticionCapturada(cuenta) {
    var p = almacen.leer(CLAVE_PETICION, null);
    if (!p || p.usado || p.foro !== location.host) { return null; }
    if (p.cuenta && p.cuenta.id !== cuenta.id) { return null; }
    return p;
  }

  function textoPeticion(pet, foto) {
    var b = foto && foto.boveda;
    var cab = '[b]Petición de canje[/b] — ' + pet.pj + '\n';
    if (b) { cab += 'Bóveda: [url=' + location.origin + b.url + ']' + (b.titulo || 'Bóveda') + '[/url]\n'; }
    cab += 'Grageas actuales: ' + formato(numero(pet.disponibles)) + ' · Coste: ' + formato(numero(pet.gastadas)) + ' · Quedarían: ' + formato(numero(pet.restantes)) + '\n';
    return cab + '\n' + pet.texto.trim();
  }

  // ¿Ya está publicada esta peticion? Mira tus ultimos mensajes del registro.
  function buscarPeticionPublicada(cuenta, texto) {
    var cfg = FOROS[location.host];
    return leerTema(cfg.registroCanjes).then(function (t) {
      var propios = t.posts.filter(function (p) { return p.autorId === cuenta.id; }).slice(-3).reverse();
      var cadena = Promise.resolve(null);
      propios.forEach(function (p) {
        cadena = cadena.then(function (hallado) {
          if (hallado) { return hallado; }
          return leerBBCode(p.id).then(function (bb) { return bb !== null && mismoTexto(bb, texto) ? p : null; });
        });
      });
      return cadena;
    });
  }

  function registrarPeticion(cuenta, pet, post, fecha) {
    guardarDatosCuenta(cuenta, function (d) {
      d.peticiones = d.peticiones || [];
      if (d.peticiones.some(function (x) { return x.post === String(post); })) { return; }
      d.peticiones.push({
        post: String(post), enlace: enlacePost(post), creado: ahoraISO(), fecha: fecha || '',
        pj: pet.pj, gastadas: numero(pet.gastadas), estado: 'esperando', aprobacion: null, descartadas: [],
        // Textos que generó PAM al preparar el canje (para aplicarlo sin volver a PAM).
        ficha: pet.ficha || null, boveda: pet.boveda || null
      });
      if (d.peticiones.length > 20) { d.peticiones = d.peticiones.slice(-20); }
    });
    var p = almacen.leer(CLAVE_PETICION, null);
    if (p && p.creado === pet.creado) { p.usado = { fecha: ahoraISO(), post: String(post) }; almacen.escribir(CLAVE_PETICION, p); }
  }

  function accionPublicarPeticion(cuenta, foto, pet) {
    var cfg = FOROS[location.host];
    var texto = textoPeticion(pet, foto);
    return buscarPeticionPublicada(cuenta, texto).then(function (ya) {
      var avisos = [];
      var actForo = foto && foto.boveda ? foto.boveda.grageas.actuales : NaN;
      if (esNumero(actForo) && numero(pet.disponibles) !== actForo) {
        avisos.push('Ojo: en PAM pusiste ' + formato(numero(pet.disponibles)) + ' grageas disponibles, pero tu bóveda del foro dice ' + formato(actForo) + '.');
      }
      if (numero(pet.restantes) < 0) {
        avisos.push('Ojo: según PAM te quedarían ' + formato(numero(pet.restantes)) + ' grageas: no te llegan para estos canjes.');
      }
      if (normNombre(pet.pj) !== normNombre(foto && foto.ficha ? foto.ficha.nombre : cuenta.nombre)) {
        avisos.push('Ojo: la petición es de «' + pet.pj + '» y tu ficha es de «' + (foto && foto.ficha ? foto.ficha.nombre : cuenta.nombre) + '».');
      }
      var paso = { tipo: 'publicar', tema: temaNumero(cfg.registroCanjes), texto: texto, descripcion: 'Registro de Canjes' };
      if (ya) {
        paso.igual = 'Ya publicaste esta misma petición en el registro.';
        registrarPeticion(cuenta, pet, ya.id, ya.fecha);
      }
      return {
        titulo: 'Publicar la petición de canje',
        explicacion: 'Texto armado por PAM (' + new Date(pet.creado).toLocaleString('es-AR') + '), con la cabecera de personaje, bóveda y grageas. El registro no se puede editar: si hay que corregir algo, va en un mensaje nuevo.',
        avisos: avisos,
        pasos: [paso]
      };
    });
  }

  // Lo que dice un revisor: aprobada, corregida (otro importe), revisar o dudosa.
  function clasificarRespuesta(texto) {
    var t = normNombre(texto);
    var neg = /no son correct|no es correct|no esta correct|no estan correct|incorrect|denegad|rechazad|no se puede|no pueden|no podeis|te falta|os falta/.test(t);
    var pos = /son correct|es correct|esta correct|estan correct|pueden? anadir|podeis anadir|puedes anadir|aprobad|aceptad/.test(t);
    var m = t.match(/(?:suma correcta es de|dara un total de|total correcto es de|el total es de|un total de)\s*(\d[\d.\s]*\d|\d)/);
    var importe = m ? numero(m[1]) : null;
    if (neg && pos) { return { clase: 'dudosa', importe: importe }; }
    if (neg) { return { clase: 'revisar', importe: importe }; }
    if (importe) { return { clase: 'corregida', importe: importe }; }
    if (pos) { return { clase: 'aprobada', importe: null }; }
    return { clase: 'dudosa', importe: null };
  }

  // Mensajes del registro posteriores a la peticion (se lee hacia atras desde la ultima pagina).
  function postsTrasPeticion(idPost) {
    var cfg = FOROS[location.host];
    var tema = temaNumero(cfg.registroCanjes);
    return pedirDoc(cfg.registroCanjes).then(function (d1) {
      var offs = Array.prototype.map.call(d1.querySelectorAll('.pagination a[href]'), function (a) {
        return parseInt((a.getAttribute('href').match(/\/t\d+p(\d+)-/) || [])[1], 10);
      }).filter(function (n) { return !isNaN(n); });
      var max = offs.length ? Math.max.apply(null, offs) : 0;
      var positivos = offs.filter(function (n) { return n > 0; });
      var paso = positivos.length ? Math.min.apply(null, positivos) : 15;
      var despues = [];
      function pagina(off, n) {
        var prom = off <= 0 ? Promise.resolve(d1) : pedirDoc('/t' + tema + 'p' + off + '-');
        return prom.then(function (d) {
          var posts = postsDe(d);
          var i = posts.map(function (p) { return p.id; }).indexOf(String(idPost));
          if (i !== -1) { return posts.slice(i + 1).concat(despues); }
          despues = posts.concat(despues);
          if (off <= 0 || n >= 6) { return null; }
          return pagina(Math.max(0, off - paso), n + 1);
        });
      }
      return pagina(max, 1);
    });
  }

  // Busca la respuesta de un revisor a una peticion. No decide nada: deja el candidato anotado.
  function buscarAprobacion(cuenta, foto, pet) {
    var g = foto && foto.revisores && foto.revisores.grupos && foto.revisores.grupos.canjes;
    var conGrupo = Array.isArray(g) && g.length > 0;
    var idsRev = conGrupo ? g.map(function (m) { return m.id; }) : [];
    var nombre = normNombre(pet.pj);
    var pila = nombre.split(' ')[0];
    return postsTrasPeticion(pet.post).then(function (posts) {
      if (posts === null) { return { noEncontrada: true }; }
      var reNombre = new RegExp('(^|[^a-z])' + pila.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)');
      function teNombra(p) {
        var txt = normNombre(lineasDe(p.contenido).join(' '));
        var enlazaPeticion = p.contenido && p.contenido.querySelector('a[href*="' + pet.post + '"]');
        return !!enlazaPeticion || txt.indexOf(nombre) !== -1 || reNombre.test(txt);
      }
      // Candidato: un revisor que te nombra (o enlaza la peticion) o, si no te nombra, la
      // primera respuesta de un revisor sin otras peticiones por medio (siempre se pregunta).
      var cand = null, sinNombre = false, otrosPorMedio = false;
      for (var k = 0; k < posts.length && !cand; k++) {
        var p = posts[k];
        if (!p.autorId || p.autorId === cuenta.id) { continue; }
        if (conGrupo && idsRev.indexOf(p.autorId) === -1) { otrosPorMedio = true; continue; }
        if ((pet.descartadas || []).indexOf(p.id) !== -1) { continue; }
        if (teNombra(p)) { cand = p; }
        else if (!otrosPorMedio) { cand = p; sinNombre = true; }
      }
      if (!cand) { return { ninguna: true }; }
      var texto = lineasDe(cand.contenido).join(' ');
      var c = clasificarRespuesta(texto);
      return {
        post: cand.id, enlace: enlacePost(cand.id), autor: cand.autorNombre, fecha: cand.fecha,
        clase: c.clase, importe: c.importe, extracto: texto.substring(0, 280),
        revisorConfirmado: conGrupo, sinNombre: sinNombre,
        // Solo se da por buena sin preguntar si es de un Inspector de Canjes, te nombra y es clara.
        confirmada: conGrupo && !sinNombre && (c.clase === 'aprobada' || c.clase === 'corregida')
      };
    });
  }

  function actualizarAprobaciones(cuenta, foto) {
    var pendientes = (datosCuenta(cuenta).peticiones || []).filter(function (p) { return p.estado === 'esperando' || (p.aprobacion && !p.aprobacion.confirmada); });
    var cadena = Promise.resolve();
    pendientes.forEach(function (pet) {
      cadena = cadena.then(function () {
        return buscarAprobacion(cuenta, foto, pet).then(function (r) {
          guardarDatosCuenta(cuenta, function (d) {
            var x = (d.peticiones || []).filter(function (y) { return y.post === pet.post; })[0];
            if (!x) { return; }
            x.revisado = ahoraISO();
            x.noEncontrada = !!r.noEncontrada;
            if (r.post && !(x.aprobacion && x.aprobacion.post === r.post && x.aprobacion.confirmada)) {
              x.aprobacion = r;
              x.estado = r.confirmada ? 'aprobada' : 'revisar';
            }
          });
        }).catch(function () { /* se reintenta en la proxima lectura */ });
      });
    });
    return cadena;
  }

  // Paquete para cerrar el canje en PAM (enlaces y «Ya lo publiqué»).
  function paqueteCierre(cuenta, pet) {
    return {
      v: 2, creado: ahoraISO(), foro: location.host,
      cuenta: { id: cuenta.id, nombre: cuenta.nombre, foro: location.host },
      pj: pet.pj, peticion: pet.post,
      pet: pet.enlace, ace: pet.aprobacion.enlace, delta: '-' + pet.gastadas,
      actuales: pet.boveda ? pet.boveda.numeros.actuales : null
    };
  }

  // Cambia el numero que sigue a una etiqueta («Grageas Actuales») en el BBCode,
  // respetando si se escribia con puntos de miles. Devuelve null si no lo encuentra.
  function cambiarNumeroTras(bb, etiqueta, valor) {
    var lineas = String(bb).split('\n');
    var re = new RegExp(etiqueta.replace(/ /g, '\\s+'), 'i');
    for (var i = 0; i < lineas.length; i++) {
      var pos = lineas[i].search(re);
      if (pos === -1) { continue; }
      var antes = lineas[i].slice(0, pos), despues = lineas[i].slice(pos);
      // Primer numero tras la etiqueta que no forme parte de un color (#7c623e) ni de una palabra.
      var m = despues.match(/(^|[^#\w])(\d{1,3}(?:[.,]\d{3})+|\d+)(?!\w)/);
      if (!m) { return null; }
      var viejo = m[2];
      var nuevoTxt = /[.,]/.test(viejo) ? formato(valor) : String(valor);
      var at = m.index + m[1].length;
      lineas[i] = antes + despues.slice(0, at) + nuevoTxt + despues.slice(at + viejo.length);
      return { texto: lineas.join('\n'), antes: numero(viejo) };
    }
    return null;
  }

  // Etiquetas abiertas menos cerradas ([spoiler], <div>…). Si el código nuevo cambia este
  // equilibrio respecto al original, algo se ha roto (p. ej. un [/spoiler] de más).
  var ETIQUETAS_EQUILIBRIO = ['spoiler', 'div', 'center', 'table', 'tr', 'td', 'span', 'font', 'label', 'details', 'color', 'size', 'b', 'i', 'u', 'url', 'quote', 'list'];
  function equilibrioEtiquetas(t) {
    var res = {};
    ETIQUETAS_EQUILIBRIO.forEach(function (tag) {
      var abre = (String(t).match(new RegExp('\\[' + tag + '(=[^\\]]*)?\\]|<' + tag + '(\\s[^>]*)?>', 'gi')) || []).length;
      var cierra = (String(t).match(new RegExp('\\[\\/' + tag + '\\]|<\\/' + tag + '>', 'gi')) || []).length;
      res[tag] = abre - cierra;
    });
    return res;
  }
  function descuadres(original, nuevo) {
    var a = equilibrioEtiquetas(original), b = equilibrioEtiquetas(nuevo);
    return ETIQUETAS_EQUILIBRIO.filter(function (tag) { return a[tag] !== b[tag]; }).map(function (tag) {
      var dif = b[tag] - a[tag];
      return (/^(div|center|table|tr|td|span|font|label|details)$/.test(tag) ? '<' + tag + '>' : '[' + tag + ']') + ': ' + (dif > 0 ? dif + ' apertura(s) de más' : (-dif) + ' cierre(s) de más');
    });
  }

  // Añade los enlaces de la peticion y de la aprobacion a la linea {Enlaces» del codigo de PAM,
  // en el mismo orden y con el mismo divisor que usa PAM.
  function codigoConEnlaces(html, enlacePet, enlaceAce, divisor) {
    var d = ' ' + (divisor || '✦') + ' ';
    var nuevos = '[url=' + enlacePet + ']Petición[/url]' + d + '[url=' + enlaceAce + ']Aceptación[/url]';
    var hecho = false;
    var t = String(html).replace(/(\{Enlaces»(?:<\/span>)?)[ \t]*([^\n<]*)/, function (m, cab, resto) {
      hecho = true;
      return cab + ' ' + nuevos + (resto.trim() ? d + resto.trim() : '');
    });
    return hecho ? t : null;
  }

  // Ultimo mensaje propio de un tema cuyo BBCode cumple cond (o null).
  function buscarMensajePropio(cuenta, urlTema, cond) {
    return leerTema(urlTema).then(function (t) {
      var propios = t.posts.slice(1).filter(function (p) { return p.autorId === cuenta.id; }).slice(-3).reverse();
      var cadena = Promise.resolve(null);
      propios.forEach(function (p) {
        cadena = cadena.then(function (hallado) {
          if (hallado) { return hallado; }
          return leerBBCode(p.id).then(function (bb) { return bb !== null && cond(bb) ? p : null; });
        });
      });
      return cadena;
    });
  }

  // Aplicar el canje aprobado en el foro: primer post de la bóveda, movimiento,
  // ficha y aviso. Todo con los textos que preparó PAM; aquí no se calcula nada.
  function accionAplicarCanje(cuenta, foto, pet) {
    var a = pet.aprobacion;
    if (!a || !a.confirmada) { return Promise.reject(new Error('La aprobación todavía no está confirmada.')); }
    if (!pet.boveda && !pet.ficha) { return Promise.reject(new Error('Esta petición se preparó sin los códigos de PAM (versión anterior): aplicala a mano.')); }
    if (esNumero(a.importe) && a.importe !== pet.gastadas) {
      return Promise.reject(new Error('El revisor corrigió el importe (' + formato(pet.gastadas) + ' → ' + formato(a.importe) + '). Los códigos de PAM son del importe original: aplicalo a mano o volvé a preparar el canje en PAM.'));
    }
    if (!foto || !foto.boveda || !foto.ficha) { return Promise.reject(new Error('Tocá «Actualizar»: necesito tu bóveda y tu ficha.')); }
    var avisos = [];
    var pasos = [];
    var urlBov = foto.boveda.url, urlFicha = foto.ficha.url;
    return Promise.all([
      leerBoveda(urlBov, cuenta.id),
      leerFicha(urlFicha, cuenta.id)
    ]).then(function (r) {
      var bov = r[0], fic = r[1];
      return leerBBCode(bov.post).then(function (bbBov) {
        // 1 y 2. Bóveda
        if (pet.boveda) {
          var n = pet.boveda.numeros;
          // Vale si la bóveda está como antes del canje o ya con el canje aplicado (reintento).
          if (bov.grageas.actuales !== n.iniciales && bov.grageas.actuales !== n.actuales) {
            throw new Error('Tu bóveda del foro dice ' + formato(bov.grageas.actuales) + ' grageas actuales, pero el movimiento que preparó PAM empieza en ' + formato(n.iniciales) + '. ¿Hubo otro movimiento desde entonces? No se tocó nada: volvé a preparar el canje en PAM.');
          }
          if (bbBov === null) { throw new Error('No puedo leer el primer mensaje de tu bóveda.'); }
          var nuevoBov = cambiarNumeroTras(bbBov, 'Grageas Actuales', n.actuales);
          if (nuevoBov && n.totales !== bov.cabecera.totales) {
            var t2 = cambiarNumeroTras(nuevoBov.texto, 'Grageas Totales', n.totales);
            nuevoBov = t2 ? { texto: t2.texto } : null;
          }
          pasos.push(nuevoBov
            ? { tipo: 'editar', post: bov.post, original: bbBov, nuevo: nuevoBov.texto, motivo: 'Canje aprobado', descripcion: 'primer mensaje de la bóveda' }
            : { tipo: 'editar', post: bov.post, original: bbBov, nuevo: bbBov, descripcion: 'primer mensaje de la bóveda', omitido: 'No encuentro «Grageas Actuales» en el primer mensaje de la bóveda: ponelo a mano (' + formato(n.actuales) + ').' });
          var mov = codigoConEnlaces(pet.boveda.html, pet.enlace, a.enlace, pet.boveda.divisor);
          if (!mov) { throw new Error('No encuentro la línea «{Enlaces»» en el código de bóveda de PAM.'); }
          pasos.push({ tipo: 'publicar', tema: temaNumero(urlBov), texto: mov, descripcion: 'movimiento en la bóveda' });
          // Segunda opinión: el revisor de bóveda de «Mi PJ» (Hana Park) sobre el movimiento.
          if (PUENTE.revisar) {
            try {
              var probs = PUENTE.revisar(mov, { act: bov.grageas.actuales, tot: bov.grageas.totales, pla: bov.pl && bov.pl.actuales, plt: bov.pl && bov.pl.totales });
              if (probs && probs.length) { avisos.push('La revisión de bóveda de Mi PJ ve: ' + probs.map(function (t) { return String(t).replace(/<[^>]+>/g, ''); }).join(' · ')); }
            } catch (e) { /* sin revisor: no pasa nada */ }
          }
        } else {
          avisos.push('No hay código de bóveda de PAM: la bóveda no se toca.');
          pasos.push({ tipo: 'editar', descripcion: 'primer mensaje de la bóveda', omitido: 'Sin código de bóveda de PAM.' });
          pasos.push({ tipo: 'publicar', descripcion: 'movimiento en la bóveda', omitido: 'Sin código de bóveda de PAM.' });
        }
        // 3 y 4. Ficha
        if (pet.ficha) {
          if (!mismoTexto(fic.bbcode, pet.ficha.base) && !mismoTexto(fic.bbcode, pet.ficha.codigo)) {
            throw new Error('Tu ficha del foro cambió desde que preparaste el canje en PAM, y editarla ahora borraría esos cambios. No se tocó nada: en el foro tocá «Enviar a PAM» y volvé a preparar el canje.');
          }
          var desc = descuadres(fic.bbcode, pet.ficha.codigo);
          if (desc.length) {
            avisos.push('El código de la ficha que generó PAM descuadra etiquetas respecto a tu ficha actual (' + desc.join(' · ') + '). Puede verse algo como «[/spoiler]» suelto: revisá la comparación y tocá «Modificar» si hay que arreglarlo.');
          }
          if (pet.ficha.manual && pet.ficha.manual.length) {
            avisos.push('PAM pide revisar a mano en la ficha: ' + pet.ficha.manual.join(' · ') + '. Tocá «Modificar» y corregilo antes de aceptar.');
          }
          pasos.push({ tipo: 'editar', post: fic.post, original: fic.bbcode, nuevo: pet.ficha.codigo, motivo: 'Canjes aprobados', descripcion: 'ficha' + (pet.ficha.hechos ? ' (' + pet.ficha.hechos + ')' : '') });
          pasos.push(pet.boveda
            ? { tipo: 'publicar', tema: temaNumero(urlFicha), texto: 'Ficha actualizada con los canjes aprobados.\nMovimiento en la bóveda: [url=«enlace del paso 2»]enlace[/url]', descripcion: 'aviso en la ficha («enlace del paso 2» se cambia por el enlace real del movimiento al publicar)' }
            : { tipo: 'publicar', descripcion: 'aviso en la ficha', omitido: 'Sin movimiento de bóveda no hay enlace que poner.' });
        } else {
          avisos.push('No hay código de ficha de PAM: la ficha no se toca.');
          pasos.push({ tipo: 'editar', descripcion: 'ficha', omitido: 'Sin código de ficha de PAM.' });
          pasos.push({ tipo: 'publicar', descripcion: 'aviso en la ficha', omitido: 'Sin código de ficha de PAM.' });
        }
        // ¿Movimiento ya publicado? (mismo texto en tus últimos mensajes de la bóveda)
        if (pasos[1].omitido) { return null; }
        return buscarMensajePropio(cuenta, urlBov, function (bb) { return mismoTexto(bb, pasos[1].texto); });
      }).then(function (movYa) {
        if (!movYa) { return null; }
        pasos[1].igual = 'El movimiento ya está publicado en tu bóveda.';
        pasos[1].postExistente = movYa.id;
        if (pasos[3].omitido) { return null; }
        var enlaceMov = enlacePost(movYa.id);
        return buscarMensajePropio(cuenta, urlFicha, function (bb) { return bb.indexOf(enlaceMov) !== -1 || bb.indexOf('#' + movYa.id) !== -1; }).then(function (avYa) {
          if (avYa) { pasos[3].igual = 'El aviso ya está publicado en tu ficha.'; pasos[3].postExistente = avYa.id; }
        });
      }).then(function () {
        return {
          titulo: 'Aplicar el canje aprobado',
          explicacion: 'Aprobado por ' + a.autor + ' (' + a.fecha + '). Se edita la bóveda, se publica el movimiento, se edita la ficha y se publica el aviso, con los textos que preparó PAM. Solo se editan mensajes tuyos.',
          avisos: avisos,
          pasos: pasos
        };
      });
    });
  }

  function pintarCanjes(zona, cuenta, foto, acciones) {
    zona.innerHTML = '';
    var capt = peticionCapturada(cuenta);
    if (capt) {
      var bPub = el('button', { clase: 'acc', type: 'button', texto: 'Publicar en el registro' });
      var bDesc = el('button', { clase: 'acc', type: 'button', texto: 'Descartar' });
      bPub.addEventListener('click', function () { acciones.publicar(capt, bPub); });
      bDesc.addEventListener('click', function () { acciones.descartarCaptura(capt); });
      zona.appendChild(el('div', { clase: 'caja' }, [
        el('h4', { texto: 'Petición preparada en PAM' }),
        fila(capt.pj, 'Coste: ' + formato(numero(capt.gastadas))),
        el('div', { clase: 'mov', texto: 'Redactada el ' + new Date(capt.creado).toLocaleString('es-AR') + '.' }),
        el('div', { clase: 'acciones' }, [bDesc, bPub])
      ]));
    }
    var pets = (datosCuenta(cuenta).peticiones || []).filter(function (p) { return !p.cerrada; }).slice(-3).reverse();
    if (!pets.length) { return; }
    var hijos = [el('h4', { texto: 'Peticiones de canje' })];
    pets.forEach(function (p) {
      var a = p.aprobacion;
      var linea = [el('a', { href: p.enlace, target: '_blank', rel: 'noopener', texto: 'Petición · ' + formato(p.gastadas) + ' gr' })];
      var caja = el('div', { clase: 'mov' }, linea);
      hijos.push(caja);
      if (p.noEncontrada) { hijos.push(el('div', { clase: 'aviso', texto: 'No encuentro esta petición en las últimas páginas del registro.' })); }
      if (!a) {
        hijos.push(el('div', { clase: 'mov neutro', texto: 'Esperando la respuesta de un Inspector de Canjes.' }));
      } else {
        var desc = a.clase === 'aprobada' ? 'Aprobada' : a.clase === 'corregida' ? 'Aprobada con otro importe: ' + formato(a.importe) : a.clase === 'revisar' ? 'Parece que hay algo que corregir' : 'Respuesta que no sé interpretar';
        hijos.push(el('div', { clase: a.confirmada ? 'mov ok' : 'aviso' }, [
          el('span', { texto: desc + ' · ' + a.autor + ' (' + a.fecha + ') ' }),
          el('a', { href: a.enlace, target: '_blank', rel: 'noopener', texto: 'ver' })
        ]));
        if (!a.confirmada) {
          hijos.push(el('div', { clase: 'mov', texto: '«' + a.extracto + '»' }));
          if (a.sinNombre) { hijos.push(el('div', { clase: 'mov neutro', texto: 'No te nombra: es la primera respuesta después de tu petición.' })); }
          if (!a.revisorConfirmado) { hijos.push(el('div', { clase: 'mov neutro', texto: 'No pude leer la lista de Inspectores de Canjes: fijate vos.' })); }
          var bSi = el('button', { clase: 'acc', type: 'button', texto: 'Es la aprobación' });
          var bNo = el('button', { clase: 'acc', type: 'button', texto: 'No lo es' });
          bSi.addEventListener('click', function () { acciones.confirmar(p, true); });
          bNo.addEventListener('click', function () { acciones.confirmar(p, false); });
          hijos.push(el('div', { clase: 'acciones' }, [bNo, bSi]));
        } else if (!p.aplicada) {
          var bApl = el('button', { clase: 'acc', type: 'button', texto: 'Aplicar el canje' });
          bApl.addEventListener('click', function () { acciones.aplicar(p, bApl); });
          hijos.push(el('div', { clase: 'acciones' }, [bApl]));
          if (!p.boveda && !p.ficha) { hijos.push(el('div', { clase: 'mov neutro', texto: 'Preparada con una versión anterior: sin los códigos de PAM.' })); }
        } else {
          hijos.push(el('div', { clase: 'mov ok', texto: 'Canje aplicado en el foro el ' + new Date(p.aplicada.fecha).toLocaleString('es-AR') + '.' }));
          var bPAM = el('a', { clase: 'acc enlace-acc', href: PAM_URL + '#ficha', target: '_blank', rel: 'noopener', texto: p.enPAM ? 'Volver a cerrar en PAM' : 'Terminar en PAM' });
          bPAM.addEventListener('click', function (ev) { acciones.terminarEnPAM(p, ev); });
          hijos.push(el('div', { clase: 'acciones' }, [bPAM]));
          if (p.enPAM) { hijos.push(el('div', { clase: 'mov neutro', texto: 'Cerrado en PAM el ' + new Date(p.enPAM).toLocaleString('es-AR') + '.' })); }
        }
      }
    });
    zona.appendChild(el('div', { clase: 'caja' }, hijos));
  }

  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'texto') { e.textContent = attrs[k]; }
      else if (k === 'clase') { e.className = attrs[k]; }
      else { e.setAttribute(k, attrs[k]); }
    });
    (hijos || []).forEach(function (h) { if (h) { e.appendChild(h); } });
    return e;
  }

  function fila(etq, valor, claseValor) {
    return el('div', { clase: 'fila' }, [el('span', { texto: etq }), el('span', { texto: valor, clase: claseValor || '' })]);
  }

  // ---------------------------------------------------------------
  // PUENTE FORO -> PAM (hito 3)
  // El panel del foro deja un paquete en el almacen; en PAM se ensena
  // en la puerta y, si se acepta, se rellena PAM por su interfaz (los
  // mismos botones y campos que usaria el jugador), para que PAM guarde
  // a su manera (en el navegador o en la nube si hay sesion).
  // ---------------------------------------------------------------
  function paqueteParaPAM(foto) {
    if (!foto) { return { error: 'Primero tocá «Actualizar».' }; }
    if (!foto.ficha && !foto.boveda) { return { error: 'No hay ficha ni bóveda leídas: no hay nada que enviar a PAM.' }; }
    var b = foto.boveda;
    return {
      v: 1,
      creado: ahoraISO(),
      leidoEn: foto.leidoEn,
      foro: foto.foro,
      cuenta: { id: foto.cuenta.id, nombre: foto.cuenta.nombre, foro: foto.foro },
      pj: (foto.ficha && foto.ficha.nombre) || foto.cuenta.nombre,
      ficha: foto.ficha && foto.ficha.bbcode ? { bbcode: foto.ficha.bbcode } : null,
      boveda: b ? { grageas: b.grageas, pl: b.pl || {}, enlaces: b.enlaces || {} } : null
    };
  }

  function normNombre(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function esNumero(n) { return typeof n === 'number' && !isNaN(n); }

  function leerJSONLocal(clave) {
    try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }

  // Espera hasta que cond() devuelva algo (o se acabe el tiempo: null).
  function esperarA(cond, ms) {
    var fin = Date.now() + (ms || 5000);
    return new Promise(function (ok) {
      (function mirar() {
        var r = null;
        try { r = cond(); } catch (e) { r = null; }
        if (r) { ok(r); return; }
        if (Date.now() > fin) { ok(null); return; }
        setTimeout(mirar, 150);
      })();
    });
  }

  // Escribe en un campo como lo haria una persona (PAM escucha estos eventos).
  function teclear(campo, valor, conChange) {
    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    if (conChange) { campo.dispatchEvent(new Event('change', { bubbles: true, composed: true })); }
  }

  // «Llevar a la calculadora» de Mi Ficha (solo cambia la Tabla de Canjes de PAM).
  function llevarALaCalculadora() {
    try { irA('ficha'); } catch (e) { return Promise.resolve(false); }
    return esperar(300).then(function () {
      var bp = document.getElementById('f-push');
      if (!bp) { return false; }
      bp.click();
      return esperar(400).then(function () { return true; });
    });
  }

  function irA(seccion) {
    var b = document.querySelector('[data-go="' + seccion + '"]');
    if (!b) { throw new Error('PAM cambió: no encuentro la sección «' + seccion + '».'); }
    b.click();
  }

  // Lectura (solo lectura) de lo que PAM tiene guardado.
  function pamFichas() {
    var g = leerJSONLocal('grimorio.personajes');
    return g && Array.isArray(g.lista) ? g : null;
  }
  function pamActiva() {
    var g = pamFichas();
    return g ? (g.lista.filter(function (x) { return x.id === g.activa; })[0] || null) : null;
  }
  function pamRegistro() {
    var r = leerJSONLocal('registro-roles-v1');
    return r && Array.isArray(r.personajes) ? r : null;
  }

  // origen: de dónde sale el valor nuevo (por defecto, del foro).
  function tablaCambios(filas, origen) {
    var tb = el('tbody');
    filas.forEach(function (f) {
      var ahora = f.ahora === undefined || f.ahora === null ? '' : String(f.ahora);
      tb.appendChild(el('tr', {}, [
        el('td', { texto: f.etiqueta }),
        el('td', { clase: 'ahora', texto: ahora === '' ? '—' : ahora }),
        el('td', { clase: ahora !== String(f.input.value) ? 'cambia' : '' }, [f.input])
      ]));
    });
    return el('table', { clase: 'p-tabla' }, [
      el('thead', {}, [el('tr', {}, [el('th', { texto: 'Campo' }), el('th', { texto: 'En PAM ahora' }), el('th', { texto: origen || 'Del foro' })])]),
      tb
    ]);
  }

  function campoValor(valor) {
    var i = el('input', { type: 'text', value: String(valor), title: String(valor) });
    i.readOnly = true;
    return i;
  }

  // Paso 1: importar la ficha en el personaje correcto de «Mi Ficha».
  function pasoFichaPAM(paq) {
    var titulo = 'Mi Ficha · importar la ficha del foro';
    if (!paq.ficha) { return { tipo: 'pam', titulo: titulo, omitido: 'No pude leer la ficha del foro.' }; }
    var g = pamFichas();
    var lista = g ? g.lista : [];
    var objetivo = normNombre(paq.pj);
    var activa = pamActiva();
    var igual = lista.filter(function (x) { return x.ficha && normNombre(x.ficha.nombre) === objetivo; })[0] || null;
    var modo, plan;
    // Si PAM ya guarda este mismo código en «Código para el foro», no se reimporta:
    // así no se pierde lo que tengas a medias en PAM (un canje sin publicar).
    var plantilla = igual && igual.ficha && igual.ficha.plantilla;
    if (igual && activa && igual.id === activa.id && plantilla && plantilla.modo === 'personal' && mismoTexto(plantilla.codigo, paq.ficha.bbcode)) {
      return { tipo: 'pam', titulo: titulo, igual: 'PAM ya tiene esta misma ficha de «' + paq.pj + '»: el código guardado en «Código para el foro» es idéntico al del foro. Solo se pulsará «Llevar a la calculadora».' };
    }
    if (igual && activa && igual.id === activa.id) {
      modo = 'activa'; plan = '«' + paq.pj + '» ya es el personaje activo de PAM: se reemplaza su ficha por la del foro.';
    } else if (igual) {
      modo = 'seleccionar'; plan = 'Se selecciona «' + paq.pj + '» en PAM y se reemplaza su ficha por la del foro.';
    } else if (activa && !(activa.ficha && activa.ficha.nombre)) {
      modo = 'vacio'; plan = 'El personaje activo de PAM está vacío («Sin nombre»): se usa para «' + paq.pj + '».';
    } else {
      modo = 'nuevo'; plan = 'En PAM no hay ningún personaje llamado «' + paq.pj + '»: se crea uno nuevo. Los demás no se tocan.';
    }
    var area = el('textarea', { clase: 'p-texto', spellcheck: 'false' });
    area.value = paq.ficha.bbcode;
    area.readOnly = true;
    area.hidden = true;
    var paso = {
      tipo: 'pam',
      titulo: titulo,
      texto: paq.ficha.bbcode,
      vista: el('div', { clase: 'p-vista' }, [
        el('div', { texto: plan }),
        el('div', { clase: 'p-nota', texto: 'Ficha del foro: ' + formato(paq.ficha.bbcode.length) + ' caracteres. Se importa con «Importar ficha del foro» de PAM y luego se pulsa «Llevar a la calculadora».' }),
        area
      ]),
      editar: function () { area.readOnly = false; area.hidden = false; },
      recoger: function () { area.readOnly = true; paso.texto = area.value; },
      ejecutar: function () {
        var n0 = lista.length;
        return Promise.resolve().then(function () {
          if (modo === 'seleccionar') {
            var b = document.querySelector('#pjWrap [data-pj="' + igual.id + '"]');
            if (!b) { throw new Error('PAM cambió: no encuentro el selector de personajes.'); }
            b.click();
            return esperarA(function () { var g2 = pamFichas(); return g2 && g2.activa === igual.id; }, 3000).then(function (ok) {
              if (!ok) { throw new Error('PAM no cambió al personaje «' + paq.pj + '».'); }
            });
          }
          if (modo === 'nuevo') {
            // Por si PAM ha terminado de cargar después de abrir la puerta: nunca se duplica.
            var ya = (pamFichas() || { lista: [] }).lista.filter(function (x) { return x.ficha && normNombre(x.ficha.nombre) === objetivo; })[0];
            if (ya) {
              var bya = document.querySelector('#pjWrap [data-pj="' + ya.id + '"]');
              if (!bya) { throw new Error('«' + paq.pj + '» ya existe en PAM, pero no encuentro su botón. No se creó otro.'); }
              bya.click();
              return esperarA(function () { var g2 = pamFichas(); return g2 && g2.activa === ya.id; }, 3000).then(function (ok) {
                if (!ok) { throw new Error('PAM no cambió al personaje «' + paq.pj + '».'); }
              });
            }
            var bn = document.querySelector('#pjWrap [data-pja="new"]');
            if (!bn) { throw new Error('PAM cambió: no encuentro «+ Nuevo personaje».'); }
            bn.click();
            return esperarA(function () {
              var g2 = pamFichas(), a2 = pamActiva();
              return g2 && g2.lista.length === n0 + 1 && a2 && !(a2.ficha && a2.ficha.nombre);
            }, 3000).then(function (ok) {
              if (!ok) { throw new Error('PAM no creó el personaje nuevo.'); }
            });
          }
        }).then(function () {
          // Ultima comprobacion: nunca se importa encima de otro personaje.
          var a = pamActiva();
          if (!a) { throw new Error('No encuentro el personaje activo de PAM.'); }
          var na = a.ficha && a.ficha.nombre ? normNombre(a.ficha.nombre) : '';
          if (na && na !== objetivo) { throw new Error('El personaje activo de PAM es «' + a.ficha.nombre + '», no «' + paq.pj + '». No se importó nada.'); }
          irA('ficha');
          return esperar(300);
        }).then(function () {
          var bi = document.getElementById('f-parse');
          if (!bi) { throw new Error('PAM cambió: no encuentro «Importar ficha del foro».'); }
          bi.click();
          return esperarA(function () { var d = document.getElementById('dlg'); return d && d.open && document.getElementById('dlg-ta'); }, 2000);
        }).then(function (ta) {
          if (!ta) { throw new Error('PAM no abrió el diálogo de importar.'); }
          teclear(ta, paso.texto);
          var ok = document.getElementById('dlg-ok');
          if (!ok) { throw new Error('PAM cambió: no encuentro el botón «Importar» del diálogo.'); }
          ok.click();
          return esperarA(function () { var a = pamActiva(); return a && a.ficha && normNombre(a.ficha.nombre) === objetivo; }, 4000);
        }).then(function (ok) {
          if (!ok) { throw new Error('PAM no importó la ficha: el personaje activo no se llama «' + paq.pj + '». Revisá PAM.'); }
          var bp = document.getElementById('f-push');
          if (!bp) { throw new Error('Ficha importada, pero no encuentro «Llevar a la calculadora».'); }
          bp.click();
          return esperar(400);
        }).then(function () { return { estado: 'ok' }; });
      }
    };
    return paso;
  }

  // Paso 2: grageas disponibles en la Tabla de Canjes.
  function pasoCanjesPAM(paq) {
    var titulo = 'Tabla de Canjes · grageas disponibles';
    var act = paq.boveda && paq.boveda.grageas && esNumero(paq.boveda.grageas.actuales) ? paq.boveda.grageas.actuales : null;
    if (act === null) { return { tipo: 'pam', titulo: titulo, omitido: 'No pude leer tus grageas actuales de la bóveda del foro.' }; }
    var inp = document.getElementById('inpDisponibles');
    if (inp && String(inp.value).trim() === String(act)) {
      return { tipo: 'pam', titulo: titulo, igual: 'PAM ya tiene ' + act + ' grageas disponibles.' };
    }
    var campo = campoValor(act);
    var paso = {
      tipo: 'pam',
      titulo: titulo,
      valor: String(act),
      vista: tablaCambios([{ etiqueta: 'Grageas disponibles', ahora: inp ? inp.value : '', input: campo }]),
      editar: function () { campo.readOnly = false; },
      recoger: function () { campo.readOnly = true; paso.valor = String(numero(campo.value)); },
      ejecutar: function () {
        if (isNaN(numero(paso.valor))) { return Promise.resolve({ estado: 'error', detalle: 'El valor de grageas no es un número.' }); }
        irA('canjes');
        return esperar(300).then(function () {
          var i = document.getElementById('inpDisponibles');
          if (!i) { throw new Error('PAM cambió: no encuentro «Grageas disponibles».'); }
          teclear(i, paso.valor, true);
          return esperar(200).then(function () {
            return String(i.value) === paso.valor ? { estado: 'ok' } : { estado: 'error', detalle: 'PAM no aceptó el valor.' };
          });
        });
      }
    };
    return paso;
  }

  // Paso 3: numeros y enlaces en la Boveda de PAM (otra lista de personajes).
  var CAMPOS_ENLACE = ['l1', 'l2', 'l3'];
  // Personaje de la Boveda de PAM por nombre (otra lista distinta de la de Mi Ficha).
  // Devuelve { pj, aproximado } o { omitido: texto }.
  function pjBovedaPAM(nombrePj) {
    var R = pamRegistro();
    var comoEmpezar = ' En PAM: ☰ → «Mi Ficha», creá el personaje «' + nombrePj + '» (su bóveda se crea sola) y volvé a enviar los datos desde el foro.';
    if (!R || R.ejemplo) { return { omitido: 'La Bóveda de PAM todavía muestra los datos de ejemplo, y Mi PJ no escribe en ellos.' + comoEmpezar }; }
    var objetivo = normNombre(nombrePj);
    // Desde PAM 1.5 cada personaje de «Mi Ficha» tiene su bóveda (pamId): primero se busca por ahí.
    var fichas = pamFichas();
    var deFicha = fichas ? fichas.lista.filter(function (x) { return x.ficha && normNombre(x.ficha.nombre) === objetivo; })[0] : null;
    var pj = (deFicha && R.personajes.filter(function (p) { return p.pamId === deFicha.id; })[0]) ||
      R.personajes.filter(function (p) { return normNombre(p.nombre) === objetivo; })[0];
    var aproximado = false;
    if (!pj) {
      // Nombre corto en PAM («Mark» para «Mark Jordan»): vale si todas sus
      // palabras estan en el nombre de la ficha y solo hay un candidato.
      var palabrasFicha = objetivo.split(' ');
      var candidatos = R.personajes.filter(function (p) {
        var n = normNombre(p.nombre);
        return n && n.split(' ').every(function (w) { return palabrasFicha.indexOf(w) !== -1; });
      });
      if (candidatos.length === 1) { pj = candidatos[0]; aproximado = true; }
    }
    if (!pj) { return { omitido: 'En la Bóveda de PAM no hay ningún personaje llamado «' + nombrePj + '».' + comoEmpezar }; }
    return { pj: pj, aproximado: aproximado };
  }

  // Abre la Boveda de PAM con ese personaje seleccionado; devuelve su shadow root.
  function abrirPjBovedaPAM(pj) {
    irA('boveda');
    return esperar(500).then(function () {
      var host = document.getElementById('rr-host');
      var sr = host && host.shadowRoot;
      if (!sr) { throw new Error('PAM cambió: no encuentro la Bóveda.'); }
      var b = sr.querySelector('[data-act="pj"][data-id="' + pj.id + '"]');
      if (!b) { throw new Error('No encuentro el botón del personaje «' + pj.nombre + '» en la Bóveda de PAM.'); }
      b.click();
      return esperar(400).then(function () { return sr; });
    });
  }

  function avisoNombreCorto(pj, nombrePj) {
    return el('div', { clase: 'aviso', texto: 'En la Bóveda de PAM tu personaje se llama «' + pj.nombre + '», no «' + nombrePj + '». Se usará «' + pj.nombre + '». Si no es el correcto, tocá Denegar.' });
  }

  function pasoBovedaPAM(paq) {
    var titulo = 'Bóveda de PAM · números y enlaces';
    if (!paq.boveda) { return { tipo: 'pam', titulo: titulo, omitido: 'No pude leer la bóveda del foro.' }; }
    var busca = pjBovedaPAM(paq.pj);
    if (busca.omitido) { return { tipo: 'pam', titulo: titulo, omitido: busca.omitido }; }
    var pj = busca.pj, aproximado = busca.aproximado;
    var bv = pj.boveda || {};
    var g = paq.boveda.grageas || {}, pl = paq.boveda.pl || {}, en = paq.boveda.enlaces || {};
    var campos = [];
    function poner(k, etiqueta, valor) {
      if (valor === null || valor === undefined || valor === '' || (typeof valor === 'number' && isNaN(valor))) { return; }
      campos.push({ k: k, etiqueta: etiqueta, ahora: bv[k], valor: String(valor), input: campoValor(valor) });
    }
    // En PAM, «Iniciales» es el saldo con el que empezó el último movimiento (lo deja
    // «Ya lo publiqué»). Solo se toca si PAM no cuadra con el foro en «Actuales».
    if (String(bv.act) !== String(g.actuales)) { poner('ini', 'Grageas Iniciales', esNumero(g.actuales) ? g.actuales : null); }
    poner('tot', 'Grageas Totales', g.totales);
    poner('act', 'Grageas Actuales', g.actuales);
    poner('plt', 'Puntos Legendarios Totales', pl.totales);
    poner('pla', 'Puntos Legendarios Actuales', pl.actuales);
    poner('l1', 'Enlace: primer post', en.primero);
    poner('l2', 'Enlace: último post', en.ultimo);
    poner('l3', 'Enlace: última corrección' + (en.correccionAutor ? ' (' + en.correccionAutor + ')' : ''), en.correccion);
    if (!campos.length) { return { tipo: 'pam', titulo: titulo, omitido: 'No hay datos de la bóveda del foro que llevar a PAM.' }; }
    // Solo se escriben los campos que cambian.
    var esperadoDe = function (c) { return CAMPOS_ENLACE.indexOf(c.k) !== -1 ? c.valor : String(numero(c.valor)); };
    var yaIguales = campos.filter(function (c) { return String(c.ahora == null ? '' : c.ahora).trim() === esperadoDe(c); });
    campos = campos.filter(function (c) { return yaIguales.indexOf(c) === -1; });
    if (!campos.length) {
      return { tipo: 'pam', titulo: titulo, igual: 'La Bóveda de PAM de «' + pj.nombre + '» ya tiene los mismos números y enlaces que el foro.' };
    }
    var paso = {
      tipo: 'pam',
      titulo: titulo,
      vista: el('div', { clase: 'p-vista' }, [
        aproximado ? avisoNombreCorto(pj, paq.pj) : null,
        el('div', { clase: 'p-nota', texto: 'Personaje «' + pj.nombre + '» de la Bóveda de PAM. «Grageas Iniciales» solo se cambia si PAM no cuadra con el foro en «Actuales».' }),
        yaIguales.length ? el('div', { clase: 'p-nota', texto: 'Ya iguales, no se tocan: ' + yaIguales.map(function (c) { return c.etiqueta; }).join(', ') + '.' }) : null,
        tablaCambios(campos)
      ]),
      editar: function () { campos.forEach(function (c) { c.input.readOnly = false; }); },
      recoger: function () { campos.forEach(function (c) { c.input.readOnly = true; c.valor = c.input.value.trim(); }); },
      ejecutar: function () {
        return abrirPjBovedaPAM(pj).then(function (sr) {
          // Primero los numeros y despues los enlaces (los enlaces redibujan la vista).
          var orden = campos.filter(function (c) { return CAMPOS_ENLACE.indexOf(c.k) === -1; })
            .concat(campos.filter(function (c) { return CAMPOS_ENLACE.indexOf(c.k) !== -1; }));
          var cadena = Promise.resolve();
          orden.forEach(function (c) {
            cadena = cadena.then(function () {
              var e = sr.querySelector('[data-bf="' + c.k + '"]');
              if (!e) { throw new Error('PAM cambió: no encuentro el campo «' + c.etiqueta + '».'); }
              var esEnlace = CAMPOS_ENLACE.indexOf(c.k) !== -1;
              teclear(e, esEnlace ? c.valor : String(numero(c.valor)), esEnlace);
              return esperar(150);
            });
          });
          return cadena;
        }).then(function () {
          // PAM guarda con un pequeno retraso; despues se comprueba lo guardado.
          return esperar(1200);
        }).then(function () {
          var R2 = pamRegistro();
          var p2 = R2 && R2.personajes.filter(function (p) { return p.id === pj.id; })[0];
          var b2 = (p2 && p2.boveda) || {};
          var mal = campos.filter(function (c) {
            var esperado = CAMPOS_ENLACE.indexOf(c.k) !== -1 ? c.valor : String(numero(c.valor));
            return String(b2[c.k]) !== esperado;
          });
          return mal.length
            ? { estado: 'error', detalle: 'PAM no guardó: ' + mal.map(function (c) { return c.etiqueta; }).join(', ') + '.' }
            : { estado: 'ok' };
        });
      }
    };
    return paso;
  }

  function accionPAM(paq) {
    var min = Math.max(0, Math.round((Date.now() - new Date(paq.leidoEn).getTime()) / 60000));
    return {
      titulo: 'Datos del foro → PAM',
      sinCuenta: true,
      explicacion: 'Personaje «' + paq.pj + '» (cuenta ' + paq.cuenta.nombre + ' en ' + paq.foro + '), leído del foro hace ' + min + ' min. ' +
        'Esto es lo que va a cambiar en PAM; no se toca nada hasta que aceptes.' +
        (min > 30 ? ' Ojo: los datos tienen más de media hora. Si cambiaste algo en el foro, tocá «Actualizar» y «Enviar a PAM» otra vez.' : ''),
      pasos: [pasoFichaPAM(paq), pasoCanjesPAM(paq), pasoBovedaPAM(paq)]
    };
  }

  // ---------------------------------------------------------------
  // HITOS 4 Y 5 EN PAM
  // - Preparar el canje: con el carrito hecho, se aplica a la ficha de
  //   PAM («Traer de la calculadora»), se ponen en la Bóveda de PAM las
  //   grageas que se quitan y se guardan los textos que genera PAM: la
  //   petición, el código de la ficha (Personalizada) y el de la bóveda.
  //   Con eso el foro aplica el canje sin volver a pasar por PAM.
  // - Cierre: tras publicarlo todo en el foro, se ponen los dos enlaces
  //   en la Bóveda de PAM y se pulsa su «Ya lo publiqué» (historial).
  // ---------------------------------------------------------------
  function textoDe(sel) { var e = document.querySelector(sel); return e ? e.textContent.trim() : ''; }
  function bovedaRaiz() { var h = document.getElementById('rr-host'); return h && h.shadowRoot; }

  // Lo que PAM muestra ahora en la Tabla de Canjes (solo lectura).
  function leerPeticionPAM() {
    var base = almacen.leer(CLAVE_PAQUETE, null);
    if (!base || !base.foro || !base.cuenta) {
      return { error: 'Primero mandá tus datos desde el foro («Enviar a PAM»): así sé de qué cuenta es la petición.' };
    }
    var box = document.querySelector('#panel-resumen .summary-box');
    if (!box) { return { error: 'PAM cambió: no encuentro el «Texto para copiar».' }; }
    var texto = box.textContent.trim();
    if (!texto || /seleccionaste ningún canje/i.test(texto)) { return { error: 'El carrito de PAM está vacío: elegí primero los canjes en la Tabla de Canjes.' }; }
    var a = pamActiva();
    var nombre = a && a.ficha && a.ficha.nombre;
    if (!nombre) { return { error: 'No hay ninguna ficha activa en «Mi Ficha» de PAM.' }; }
    if (normNombre(nombre) !== normNombre(base.pj)) {
      return { error: 'La ficha activa de PAM es «' + nombre + '», pero los últimos datos del foro son de «' + base.pj + '». Mandá los datos desde el foro con la cuenta de ese personaje.' };
    }
    var inp = document.getElementById('inpDisponibles');
    return {
      v: 2, foro: base.foro, cuenta: base.cuenta, pj: nombre, texto: texto,
      disponibles: inp ? String(inp.value) : '', gastadas: textoDe('#valGastadas'), restantes: textoDe('#valRestantes'),
      plantilla: a.ficha.plantilla || null
    };
  }

  // «Código para el foro» en modo Personalizada (pestaña ya abierta).
  function leerCodigoFichaPAM() {
    var out = document.querySelector('[data-fc-out="0"]');
    var orig = document.getElementById('fc-orig');
    if (!out || !orig) { return null; }
    var ok = document.querySelector('.fc-ok');
    return {
      codigo: out.value,
      base: orig.value,
      hechos: ok ? ok.textContent.replace(/^\s*Actualizado:\s*/i, '').trim() : '',
      manual: Array.prototype.map.call(document.querySelectorAll('.fc-warn li'), function (li) { return li.textContent.trim(); })
    };
  }

  // Numeros del «Formulario» de la Bóveda de PAM.
  function numerosFormulario(form) {
    function v(et) { var m = String(form).match(new RegExp('\\{Grageas ' + et + '»\\s*([+-]?\\d+)', 'i')); return m ? parseInt(m[1], 10) : NaN; }
    return { iniciales: v('iniciales'), cambio: v('que se añaden/quitan'), actuales: v('actuales'), totales: v('totales') };
  }

  function accionPrepararPAM(pet, captura) {
    var titulo = 'Preparar el canje';
    var a = pamActiva();
    var P = a && a.ficha && a.ficha.plantilla;
    var personal = P && P.modo === 'personal' && P.codigo;
    var gastadas = numero(pet.gastadas);
    var busca = pjBovedaPAM(pet.pj);

    var pasoFicha = personal ? {
      tipo: 'pam',
      titulo: 'Mi Ficha · aplicar el carrito a la ficha',
      vista: el('div', { clase: 'p-nota', texto: 'Se pulsa «Traer de la calculadora»: los canjes del carrito pasan a la ficha de PAM, y PAM actualiza tu código del foro (modelo «Personalizada»). En el foro no se toca nada hasta que el canje esté aprobado.' }),
      ejecutar: function () {
        irA('ficha');
        return esperar(300).then(function () {
          var bs = document.getElementById('f-sync');
          if (!bs) { throw new Error('PAM cambió: no encuentro «Traer de la calculadora».'); }
          bs.click();
          return esperar(500);
        }).then(function () {
          var bb = document.getElementById('f-bb');
          if (!bb) { throw new Error('PAM cambió: no encuentro «Código para el foro».'); }
          bb.click();
          return esperarA(leerCodigoFichaPAM, 3000);
        }).then(function (f) {
          if (!f) { throw new Error('No encuentro tu código en «Código para el foro» (¿está en «Personalizada»?).'); }
          captura.ficha = f;
          return { estado: 'ok' };
        });
      }
    } : { tipo: 'pam', titulo: 'Mi Ficha · aplicar el carrito a la ficha', omitido: 'Tu ficha de PAM no tiene guardado el código del foro (modelo «Personalizada»), así que Mi PJ no va a poder actualizar la ficha del foro. Para tenerlo: en el foro tocá «Enviar a PAM» y volvé a preparar el canje.' };

    var pasoBoveda;
    if (busca.omitido) {
      pasoBoveda = { tipo: 'pam', titulo: 'Bóveda de PAM · grageas que se quitan', omitido: busca.omitido };
    } else {
      var pj = busca.pj, bv = pj.boveda || {};
      // Los enlaces de una peticion anterior se vacian: los de esta se ponen al aplicar el canje.
      var campos = [
        { k: 'delta', etiqueta: 'Grageas que se añaden/quitan', valor: '-' + gastadas },
        { k: 'pet', etiqueta: 'Enlace de la petición', valor: '' },
        { k: 'ace', etiqueta: 'Enlace de la aceptación', valor: '' }
      ].map(function (c) { c.ahora = bv[c.k]; c.input = campoValor(c.valor); return c; });
      var cambian = campos.filter(function (c) { return String(c.ahora == null ? '' : c.ahora).trim() !== c.valor; });
      // Lo que ya había en esos campos es un movimiento anterior que no se cerró con «Ya lo publiqué».
      var restos = campos.filter(function (c) { var v = String(c.ahora == null ? '' : c.ahora).trim(); return v && v !== c.valor; });
      pasoBoveda = {
        tipo: 'pam',
        titulo: 'Bóveda de PAM · grageas que se quitan',
        vista: el('div', { clase: 'p-vista' }, [
          busca.aproximado ? avisoNombreCorto(pj, pet.pj) : null,
          el('div', { clase: 'p-nota', texto: 'Con esto PAM prepara el «Código para la bóveda». Los enlaces de la petición y de la aprobación se añaden al aplicar el canje en el foro.' }),
          restos.length ? el('div', { clase: 'aviso', texto: 'La Bóveda de PAM de «' + pj.nombre + '» tenía a medias un movimiento anterior (' + restos.map(function (c) { return c.etiqueta + ': ' + c.ahora; }).join(' · ') + '): se preparó pero nunca se cerró con «Ya lo publiqué». Se sustituye por el de este canje. Si ese movimiento sí se publicó en el foro, tocá Denegar y cerralo antes en PAM.' }) : null,
          cambian.length ? tablaCambios(cambian, 'De este canje') : el('div', { clase: 'p-nota', texto: 'Ya está igual en PAM: solo se leen los códigos.' })
        ]),
        ejecutar: function () {
          return abrirPjBovedaPAM(pj).then(function (sr) {
            var cadena = Promise.resolve();
            cambian.forEach(function (c) {
              cadena = cadena.then(function () {
                var e = sr.querySelector('[data-bf="' + c.k + '"]');
                if (!e) { throw new Error('PAM cambió: no encuentro el campo «' + c.etiqueta + '».'); }
                teclear(e, c.valor, c.k !== 'delta');
                return esperar(150);
              });
            });
            return cadena.then(function () { return esperar(1200); });
          }).then(function () {
            var sr = bovedaRaiz();
            var html = sr && sr.querySelector('#bovHtml'), form = sr && sr.querySelector('#bovForm');
            if (!html || !form) { throw new Error('PAM cambió: no encuentro el «Código para la bóveda».'); }
            var n = numerosFormulario(form.value);
            if (n.cambio !== -gastadas) { return { estado: 'error', detalle: 'El código de PAM no quita ' + gastadas + ' grageas (dice ' + n.cambio + ').' }; }
            var div = sr.querySelector('.bov-div');
            captura.boveda = { html: html.value, form: form.value, numeros: n, divisor: div ? div.textContent.trim() : '✦', pjBoveda: pj.nombre };
            return { estado: 'ok' };
          });
        }
      };
    }

    return {
      titulo: titulo,
      sinCuenta: true,
      explicacion: 'Canjes de «' + pet.pj + '»: ' + pet.gastadas + ' grageas (tenés ' + pet.disponibles + ', quedarían ' + pet.restantes + '). Se prepara todo en PAM y se guarda para el foro: ahí publicás la petición y, cuando la aprueben, Mi PJ actualiza bóveda y ficha sin volver a PAM.',
      avisos: numero(pet.restantes) < 0 ? ['Según PAM no te llegan las grageas (quedarían ' + pet.restantes + ').'] : [],
      pasos: [pasoFicha, pasoBoveda]
    };
  }

  // Cierre en PAM tras publicarlo todo en el foro.
  function accionCierrePAM(paq) {
    var titulo1 = 'Bóveda de PAM · enlaces de la petición y la aprobación';
    var titulo2 = 'Bóveda de PAM · «Ya lo publiqué»';
    var busca = pjBovedaPAM(paq.pj);
    if (busca.omitido) {
      return { titulo: 'Canje publicado → PAM', sinCuenta: true, pasos: [{ tipo: 'pam', titulo: titulo1, omitido: busca.omitido }] };
    }
    var pj = busca.pj, bv = pj.boveda || {};
    var yaAplicado = String(bv.act) === String(paq.actuales) && !String(bv.delta || '').trim();
    var paso1, paso2;
    if (yaAplicado) {
      paso1 = { tipo: 'pam', titulo: titulo1, igual: 'El movimiento ya está aplicado en la Bóveda de PAM.' };
      paso2 = { tipo: 'pam', titulo: titulo2, igual: 'La Bóveda de PAM ya tiene ' + paq.actuales + ' grageas actuales.' };
    } else {
      var campos = [
        { k: 'delta', etiqueta: 'Grageas que se añaden/quitan', valor: String(paq.delta) },
        { k: 'pet', etiqueta: 'Enlace de la petición', valor: paq.pet },
        { k: 'ace', etiqueta: 'Enlace de la aceptación', valor: paq.ace }
      ].map(function (c) { c.ahora = bv[c.k]; c.input = campoValor(c.valor); return c; });
      var cambian = campos.filter(function (c) { return String(c.ahora == null ? '' : c.ahora).trim() !== c.valor; });
      paso1 = cambian.length ? {
        tipo: 'pam', titulo: titulo1,
        vista: el('div', { clase: 'p-vista' }, [busca.aproximado ? avisoNombreCorto(pj, paq.pj) : null, tablaCambios(cambian)]),
        ejecutar: function () {
          return abrirPjBovedaPAM(pj).then(function (sr) {
            var cadena = Promise.resolve();
            cambian.forEach(function (c) {
              cadena = cadena.then(function () {
                var e = sr.querySelector('[data-bf="' + c.k + '"]');
                if (!e) { throw new Error('PAM cambió: no encuentro el campo «' + c.etiqueta + '».'); }
                teclear(e, c.valor, c.k !== 'delta');
                return esperar(150);
              });
            });
            return cadena;
          }).then(function () { return esperar(1200); }).then(function () { return { estado: 'ok' }; });
        }
      } : { tipo: 'pam', titulo: titulo1, igual: 'La Bóveda de PAM ya tiene estos enlaces y estas grageas.' };
      paso2 = {
        tipo: 'pam', titulo: titulo2,
        vista: el('div', { clase: 'p-nota', texto: 'Se pulsa «Ya lo publiqué: actualizar mis números»: PAM guarda el movimiento en su historial (con los dos enlaces) y deja ' + paq.actuales + ' grageas actuales.' }),
        ejecutar: function () {
          return abrirPjBovedaPAM(pj).then(function (sr) {
            var b = sr.querySelector('[data-act="bovApply"]');
            if (!b) { throw new Error('PAM cambió: no encuentro «Ya lo publiqué».'); }
            b.click();
            return esperar(1200);
          }).then(function () {
            var R2 = pamRegistro();
            var p2 = R2 && R2.personajes.filter(function (p) { return p.id === pj.id; })[0];
            var b2 = (p2 && p2.boveda) || {};
            return String(b2.act) === String(paq.actuales)
              ? { estado: 'ok' }
              : { estado: 'error', detalle: 'PAM dejó ' + b2.act + ' grageas actuales, y el foro dice ' + paq.actuales + '.' };
          });
        }
      };
    }
    return {
      titulo: 'Canje publicado → PAM',
      sinCuenta: true,
      explicacion: 'El canje de «' + paq.pj + '» ya está publicado en el foro. Se cierra también en PAM y después se comprueba que PAM quede igual que el foro.',
      pasos: [paso1, paso2]
    };
  }

  function montarPuentePAM() {
    if (document.getElementById('esc-pam')) { return; }
    estilosCanjes();
    var raiz = el('div', { id: 'esc-pam', clase: 'esc-ui esc-pam' });
    document.body.appendChild(raiz);
    var abiertoPanel = false;
    var aviso = { error: null, ok: null };
    var abierta = false;

    function pendiente(clave) {
      var p = almacen.leer(clave, null);
      return p && !p.usado ? p : null;
    }
    function mensaje(txt) {
      aviso = { error: null, ok: txt };
      abiertoPanel = true;
      pintar();
    }
    function marcarUsado(clave, paq, res) {
      paq.usado = { fecha: ahoraISO(), resultado: res.resultado };
      almacen.escribir(clave, paq);
    }

    // Puerta de los datos del foro (hito 3). En el foro real los datos llegan por el
    // canal oficial de PAM (su propia puerta); esta solo se usa en el foro de pruebas.
    function abrirDatos(auto) {
      var paq = pendiente(CLAVE_PAQUETE);
      if (!paq) {
        if (!auto) { mensaje('No hay datos del foro pendientes. En el foro, tocá «Enviar a PAM».'); }
        return Promise.resolve();
      }
      var accion = accionPAM(paq);
      return abrirPuerta(raiz, paq.cuenta, accion).then(function (res) {
        marcarUsado(CLAVE_PAQUETE, paq, res);
        // Ficha igual: no se reimporta, pero la Tabla de Canjes tiene que partir de ella.
        var fichaIgual = accion.pasos[0] && accion.pasos[0].igual;
        var llevar = fichaIgual && res.resultado !== 'denegada' ? llevarALaCalculadora() : Promise.resolve(false);
        return llevar.then(function (llevada) {
          if (res.resultado === 'igual') {
            mensaje('PAM ya tiene lo mismo que el foro (ficha, grageas y bóveda).' + (llevada ? ' Solo se llevó la ficha a la calculadora.' : ' No se tocó nada.'));
          }
        });
      });
    }

    // Cierre del canje (hito 5). Al terminar se avisa a la pestaña del foro que abrió
    // PAM, que entonces manda los datos nuevos por el canal oficial.
    function abrirCierre(auto) {
      var paq = pendiente(CLAVE_APROBACION);
      if (!paq) {
        if (!auto) { mensaje('No hay ningún canje publicado pendiente de cerrar en PAM.'); }
        return Promise.resolve();
      }
      return abrirPuerta(raiz, paq.cuenta, accionCierrePAM(paq)).then(function (res) {
        marcarUsado(CLAVE_APROBACION, paq, res);
        var hecho = res.resultado === 'aceptada' || res.resultado === 'igual';
        if (hecho) {
          guardarDatosCuenta(paq.cuenta, function (d) {
            var x = (d.peticiones || []).filter(function (y) { return y.post === paq.peticion; })[0];
            if (x) { x.enPAM = ahoraISO(); x.cerrada = true; }
          });
        }
        avisarAlForo(paq.foro, { escribaCierre: 1, hecho: hecho });
      });
    }

    function enCola(fn, auto) {
      if (abierta) { return; }
      abierta = true;
      // Se espera a que PAM haya montado sus piezas (también la Bóveda) y cargado sus datos.
      esperarA(function () { return document.getElementById('f-parse') && document.getElementById('inpDisponibles') && bovedaRaiz() && pamFichas(); }, 10000).then(function (listo) {
        if (!listo) {
          mensaje('No reconozco esta versión de PAM (no encuentro «Importar ficha del foro» o la Bóveda). Pasá los datos a mano.');
          return null;
        }
        return esperar(800).then(function () { return fn(auto); });
      }).catch(function (e) { aviso = { error: e.message, ok: null }; }).then(function () {
        abierta = false;
        // PAM queda en «Mi Ficha», no en la Bóveda.
        try { irA('ficha'); } catch (e) { /* PAM sin esa sección */ }
        pintar();
      });
    }

    // Preparar el canje: puerta en PAM y, al terminar, enlace al registro del foro.
    function preparar() {
      var pet = leerPeticionPAM();
      if (pet.error) { aviso = { error: pet.error, ok: null }; pintar(); return; }
      var cfg = FOROS[pet.foro];
      if (!cfg) { aviso = { error: 'No conozco el foro «' + pet.foro + '».', ok: null }; pintar(); return; }
      var captura = {};
      var accion = accionPrepararPAM(pet, captura);
      accion.enlaceFinal = { texto: 'Ir al foro a publicar la petición', href: 'https://' + pet.foro + cfg.registroCanjes + '#escriba-publicar' };
      accion.antesDelEnlace = function () {
        almacen.escribir(CLAVE_PETICION, {
          v: 2, creado: ahoraISO(), foro: pet.foro, cuenta: pet.cuenta, pj: pet.pj, texto: pet.texto,
          disponibles: pet.disponibles, gastadas: pet.gastadas, restantes: pet.restantes,
          ficha: captura.ficha || null, boveda: captura.boveda || null
        });
      };
      if (abierta) { return; }
      abierta = true;
      abrirPuerta(raiz, pet.cuenta, accion).catch(function (e) { aviso = { error: e.message, ok: null }; }).then(function () { abierta = false; pintar(); });
    }

    function tarjeta(titulo, hijos) {
      return el('div', { clase: 'card' }, [el('div', { clase: 'ct', texto: titulo })].concat(hijos));
    }
    function boton(texto, pri, fn, desactivado) {
      var b = el('button', { clase: 'b' + (pri ? ' pri' : ''), type: 'button', texto: texto });
      b.disabled = !!desactivado;
      b.addEventListener('click', fn);
      return b;
    }

    function pintar() {
      raiz.innerHTML = '';
      var datos = pendiente(CLAVE_PAQUETE), cierre = pendiente(CLAVE_APROBACION), pet = pendiente(CLAVE_PETICION);
      var n = (datos ? 1 : 0) + (cierre ? 1 : 0) + (pet ? 1 : 0);
      if (!abiertoPanel) {
        var pill = el('div', { clase: 'pill', title: 'Abrir Mi PJ' }, [
          el('span', { clase: 'brand' }, [el('i', { texto: '✦' }), document.createTextNode('Mi PJ')]),
          n ? el('span', { clase: 'n', texto: String(n) }) : null
        ]);
        pill.addEventListener('click', function () { abiertoPanel = true; pintar(); });
        raiz.appendChild(pill);
        return;
      }
      var base = almacen.leer(CLAVE_PAQUETE, null);
      var cfgBase = base && FOROS[base.foro];
      var hd = el('div', { clase: 'hd', title: 'Minimizar' }, [
        el('span', { clase: 'brand' }, [el('i', { texto: '✦' }), document.createTextNode('Mi PJ')]),
        el('small', { texto: 'Canjes' })
      ]);
      hd.addEventListener('click', function () { abiertoPanel = false; aviso = { error: null, ok: null }; pintar(); });
      var bd = el('div', { clase: 'bd' });
      if (aviso.error) { bd.appendChild(el('div', { clase: 'error msg', texto: aviso.error })); }
      if (aviso.ok) { bd.appendChild(el('div', { clase: 'aviso msg', texto: aviso.ok })); }

      if (datos) {
        bd.appendChild(tarjeta('✦ Datos del foro', [
          el('div', { clase: 'row', texto: 'Datos de «' + datos.pj + '» pendientes de poner en PAM.' }),
          el('div', { clase: 'acciones' }, [boton('Traer datos del foro', true, function () { enCola(abrirDatos, false); })])
        ]));
      }

      var hijosPet = [el('div', { clase: 'dim', texto: 'Con el carrito armado: aplica los canjes a tu ficha de PAM, prepara el movimiento de la bóveda y guarda todo para publicarlo en ' + (cfgBase ? cfgBase.nombre : 'tu foro') + '.' })];
      if (pet) {
        hijosPet.push(el('div', { clase: 'row ok', texto: 'Pendiente de publicar: «' + pet.pj + '», ' + pet.gastadas + ' grageas.' }));
        var cfgPet = FOROS[pet.foro];
        if (cfgPet) { hijosPet.push(el('a', { href: 'https://' + pet.foro + cfgPet.registroCanjes + '#escriba-publicar', target: '_blank', rel: 'noopener', texto: 'Ir al foro a publicarla' })); }
      }
      hijosPet.push(el('div', { clase: 'acciones' }, [boton('Preparar el canje', true, preparar)]));
      bd.appendChild(tarjeta('❖ Canje', hijosPet));

      if (cierre) {
        bd.appendChild(tarjeta('⛁ Canje publicado', [
          el('div', { clase: 'row', texto: 'Canje de «' + cierre.pj + '» publicado en el foro, pendiente de cerrar en PAM.' }),
          el('div', { clase: 'acciones' }, [boton('Cerrar en PAM', true, function () { enCola(abrirCierre, false); })])
        ]));
      }
      raiz.appendChild(el('div', { clase: 'box' }, [hd, bd]));
    }

    // Mientras la puerta oficial de PAM («Datos del foro → PAM», de Hana Park) no lo haga:
    // se desmarca lo que ya está igual en PAM. Los datos son los mismos que el foro le
    // manda: el foro los deja también en el almacén al pulsar «Enviar a PAM».
    var fichaIgualOficial = false;
    function ajustarPuertaOficial(dlg) {
      fichaIgualOficial = false;
      var paq = almacen.leer(CLAVE_PAQUETE, null);
      if (!paq || !paq.usado || !paq.usado.canalOficial) { return; }
      if (Date.now() - new Date(paq.creado).getTime() > 5 * 60 * 1000) { return; }
      var nombreDlg = (dlg.querySelector('.fd-head span') || {}).textContent || '';
      if (normNombre(nombreDlg) !== normNombre(paq.pj)) { return; }
      var iguales = [];
      function marcar(id, crearPaso, etiqueta) {
        var cb = dlg.querySelector('#' + id);
        if (!cb || cb.disabled || !cb.checked) { return; }
        var paso = null;
        try { paso = crearPaso(paq); } catch (e) { return; }
        if (!paso || !paso.igual) { return; }
        cb.checked = false;
        iguales.push(etiqueta);
        var sec = cb.closest('.fd-sec');
        if (sec) { sec.appendChild(el('small', { texto: '✓ Ya está igual en PAM: no se toca (Mi PJ).' })); }
      }
      marcar('fdF', pasoFichaPAM, 'ficha');
      marcar('fdG', pasoCanjesPAM, 'grageas');
      marcar('fdB', pasoBovedaPAM, 'bóveda');
      if (!iguales.length) { return; }
      fichaIgualOficial = iguales.indexOf('ficha') !== -1;
      var quedan = ['fdF', 'fdG', 'fdB'].map(function (id) { return dlg.querySelector('#' + id); })
        .filter(function (cb) { return cb && !cb.disabled && cb.checked; });
      if (!quedan.length) {
        // Todo igual: no hay nada que aceptar.
        var no = dlg.querySelector('#fdNo');
        if (no) { no.click(); }
        (fichaIgualOficial ? llevarALaCalculadora() : Promise.resolve(false)).then(function (llevada) {
          mensaje('PAM ya tiene lo mismo que el foro (' + iguales.join(', ') + ').' + (llevada ? ' Solo se llevó la ficha a la calculadora.' : ' No se tocó nada.'));
        });
        return;
      }
      // Ficha igual pero hay otras cosas: al aceptar, también se lleva la ficha a la calculadora.
      var ok = dlg.querySelector('#fdOk');
      if (ok && fichaIgualOficial) { ok.addEventListener('click', function () { esperar(500).then(llevarALaCalculadora); }); }
    }

    // Mientras la puerta oficial de PAM no lo haga: tras importar la ficha con ella,
    // «Llevar a la calculadora» para que la Tabla de Canjes parta de la ficha nueva.
    new MutationObserver(function (cambios) {
      cambios.forEach(function (c) {
        Array.prototype.forEach.call(c.addedNodes, function (nodo) {
          if (nodo.nodeType !== 1) { return; }
          if (nodo.id === 'foroDlg') { esperar(50).then(function () { ajustarPuertaOficial(nodo); }); }
          if (nodo.classList && nodo.classList.contains('fd-toast') && /se actualizó[^.]*\bficha\b/i.test(nodo.textContent || '')) {
            esperar(300).then(llevarALaCalculadora);
          }
        });
      });
    }).observe(document.body, { childList: true });

    pintar();
    // Al llegar desde el foro con algo pendiente, se abren las puertas solas:
    // primero el cierre del canje y después los datos del foro (foro de pruebas).
    // Si PAM ya estaba abierto, el foro solo cambia el «#» (no recarga): se mira también
    // al volver a la pestaña.
    function revisarPendientes() {
      if (abierta || document.querySelector('.esc-ui.puerta-fondo')) { return; }
      if (pendiente(CLAVE_APROBACION) || pendiente(CLAVE_PAQUETE)) {
        enCola(function () { return abrirCierre(true).then(function () { return abrirDatos(true); }); }, true);
      } else { pintar(); }
    }
    revisarPendientes();
    window.addEventListener('focus', revisarPendientes);
    window.addEventListener('hashchange', revisarPendientes);
  }

  // Avisa a la pestaña del foro que abrió PAM (canal oficial: ella manda luego los datos).
  function avisarAlForo(foro, mensajeForo) {
    try {
      var W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      if (W.opener && foro) { W.opener.postMessage(mensajeForo, 'https://' + foro); }
    } catch (e) { /* sin pestaña del foro: no pasa nada */ }
  }

  // ---------------------------------------------------------------
  // API para el panel «Mi PJ» (foro)
  // El panel usa de acá la lectura por el
  // perfil, la tarjeta «Canjes» y las puertas que publican o editan.
  // ---------------------------------------------------------------
  function nn(v) { return esNumero(v) ? v : null; }
  function fotoGuardada(cuenta) { var d = almacen.leer(claveCuenta(cuenta), null); return (d && d.foto) || null; }
  function canalOficial() { return location.host === 'hp-avada-kedavra.foroactivo.com'; }

  // Foto leída por el perfil -> formato del panel (el mismo que espera el canal oficial de PAM).
  function aMiPJ(foto) {
    var res = { pj: null, ficha: null, boveda: null };
    if (!foto) { return res; }
    var f = foto.ficha, b = foto.boveda;
    if (f) {
      res.pj = f.nombre;
      res.ficha = {
        url: location.origin + f.url, titulo: f.titulo, foro: null,
        estado: f.estado.pendiente ? 'pendiente' : 'revisada', codigo: f.bbcode || '',
        sello: f.estado.selloFecha ? { autor: f.estado.selloAutor || '', fecha: f.estado.selloFecha } : null
      };
    }
    if (b) {
      var notas = b.notas || [], ult = notas[notas.length - 1];
      res.boveda = {
        url: location.origin + b.url, tid: parseInt(temaNumero(b.url), 10), titulo: b.titulo,
        act: nn(b.grageas.actuales), tot: nn(b.grageas.totales), ini: nn(b.grageas.iniciales),
        pla: nn(b.pl && b.pl.actuales), plt: nn(b.pl && b.pl.totales),
        movs: b.movimientos.slice(-3).reverse().map(function (m) { return { d: nn(m.cambio), act: nn(m.actuales), fecha: m.fecha }; }),
        revision: ult ? { autor: ult.autor, fecha: ult.fecha, url: enlacePost(ult.post) } : null,
        nota: ult && ult.pendiente ? { autor: ult.autor, fecha: ult.fecha, texto: ult.texto } : null,
        l1: b.enlaces.primero, l2: b.enlaces.ultimo, l3: b.enlaces.correccion
      };
    }
    return res;
  }

  function leerParaMiPJ() {
    var c = cuentaConectada();
    if (!c || !FOROS[location.host]) { return Promise.resolve(null); }
    return leerTodo(c).then(function (foto) {
      return actualizarAprobaciones(c, foto).catch(function () { /* se reintenta en la próxima lectura */ }).then(function () { return foto; });
    });
  }

  // Contexto para PAM (foro, cuenta, personaje). Con el canal oficial va marcado como
  // usado: PAM lo necesita para preparar canjes, pero no abre la puerta de canjes.
  function dejarContextoPAM(foto, conPuerta) {
    var paq = paqueteParaPAM(foto);
    if (paq.error) { return paq; }
    if (!conPuerta) { paq.usado = { fecha: ahoraISO(), canalOficial: true }; }
    almacen.escribir(CLAVE_PAQUETE, paq);
    return paq;
  }

  // «Enviar a PAM» en el foro de pruebas (el canal oficial solo acepta el foro real).
  function enviarPorAlmacen(foto) {
    var paq = dejarContextoPAM(foto, true);
    if (paq.error) { return paq.error; }
    window.open(PAM_URL + '#ficha', 'pam');
    return null;
  }

  // Tarjeta «Canjes» dentro del panel «Mi PJ».
  var msgCanje = null;
  function pintarCanje(caja) {
    var cuenta = cuentaConectada();
    if (!caja || !cuenta) { return; }
    var foto = fotoGuardada(cuenta);
    caja.innerHTML = '';
    caja.appendChild(el('div', { clase: 'ct', texto: '⚖ Canjes' }));
    if (msgCanje) { caja.appendChild(el('div', { clase: msgCanje.error ? 'err' : 'nota', texto: msgCanje.texto })); }
    var repintar = function () { pintarCanje(caja); };
    var aviso = function (texto, error) { msgCanje = { texto: texto, error: !!error }; repintar(); };
    var boton = function (texto, pri, fn) {
      var b = el('button', { clase: 'b' + (pri ? ' pri' : ''), type: 'button', texto: texto });
      b.addEventListener('click', function (ev) { msgCanje = null; fn(b, ev); });
      return b;
    };
    var fila2 = function (hijos) { var d = el('div', { clase: 'row' }, hijos); d.style.display = 'flex'; d.style.flexWrap = 'wrap'; d.style.gap = '8px'; d.style.justifyContent = 'flex-end'; d.style.marginTop = '8px'; return d; };

    var capt = peticionCapturada(cuenta);
    if (capt) {
      caja.appendChild(el('div', { clase: 'row' }, [el('b', { texto: 'Petición preparada en PAM' })]));
      caja.appendChild(el('div', { clase: 'dim', texto: capt.pj + ' · ' + formato(numero(capt.gastadas)) + ' grageas · ' + new Date(capt.creado).toLocaleString('es-AR') }));
      caja.appendChild(fila2([
        boton('Descartar', false, function () { accionesCanjes.descartarCaptura(capt); repintar(); }),
        boton('Publicar en el registro', true, function (b) { accionesCanjes.publicar(capt, b, aviso, repintar); })
      ]));
    }
    var pets = (datosCuenta(cuenta).peticiones || []).filter(function (p) { return !p.cerrada; }).slice(-3).reverse();
    pets.forEach(function (p) {
      var a = p.aprobacion;
      var bloque = el('div', { clase: 'rol' });
      var rt = el('div', { clase: 'rt' }, [el('a', { href: p.enlace, target: '_blank', rel: 'noopener', texto: 'Petición · ' + formato(p.gastadas) + ' grageas' })]);
      bloque.appendChild(rt);
      caja.appendChild(bloque);
      if (p.noEncontrada) { rt.appendChild(el('div', { clase: 'dim', texto: 'No la encuentro en las últimas páginas del registro.' })); }
      if (!a) { rt.appendChild(el('div', { clase: 'dim', texto: 'Esperando a un Inspector de Canjes.' })); return; }
      var desc = a.clase === 'aprobada' ? 'Aprobada' : a.clase === 'corregida' ? 'Aprobada con otro importe: ' + formato(a.importe) : a.clase === 'revisar' ? 'Parece que hay algo que corregir' : 'Respuesta que no sé interpretar';
      rt.appendChild(el('span', { clase: 'badge ' + (a.confirmada ? 'ok' : 'warn'), texto: (a.confirmada ? '✓ ' : '◷ ') + desc }));
      rt.appendChild(el('div', { clase: 'dim' }, [document.createTextNode(a.autor + ' · ' + a.fecha + ' · '), el('a', { href: a.enlace, target: '_blank', rel: 'noopener', texto: 'ver' })]));
      if (!a.confirmada) {
        rt.appendChild(el('div', { clase: 'nota', texto: '«' + a.extracto + '»' + (a.sinNombre ? ' — No te nombra: es la primera respuesta después de tu petición.' : '') + (!a.revisorConfirmado ? ' — No pude leer la lista de Inspectores: fijate vos.' : '') }));
        rt.appendChild(fila2([
          boton('No lo es', false, function () { accionesCanjes.confirmar(p, false); repintar(); }),
          boton('Es la aprobación', true, function () { accionesCanjes.confirmar(p, true); repintar(); })
        ]));
      } else if (!p.aplicada) {
        if (!p.boveda && !p.ficha) { rt.appendChild(el('div', { clase: 'dim', texto: 'Preparada sin los códigos de PAM: aplicala a mano.' })); }
        rt.appendChild(fila2([boton('Aplicar el canje', true, function (b) { accionesCanjes.aplicar(p, b, aviso, repintar); })]));
      } else {
        rt.appendChild(el('div', { clase: 'dim', texto: 'Aplicado en el foro el ' + new Date(p.aplicada.fecha).toLocaleString('es-AR') + '.' + (p.enPAM ? ' Cerrado en PAM.' : '') }));
        rt.appendChild(fila2([boton(p.enPAM ? 'Volver a cerrar en PAM' : 'Terminar en PAM', !p.enPAM, function () { accionesCanjes.terminarEnPAM(p, aviso); })]));
      }
    });
    if (!capt && !pets.length) {
      caja.appendChild(el('div', { clase: 'dim', texto: 'Para pedir un canje: en PAM armá el carrito y tocá «Preparar el canje» en la pastilla Mi PJ.' }));
    }
  }

  var accionesCanjes = {
    publicar: function (pet, b, aviso, repintar) {
      var cuenta = cuentaConectada(), foto = fotoGuardada(cuenta);
      if (!foto) { aviso('Primero tocá «Actualizar»: la cabecera de la petición necesita tu bóveda.', true); return; }
      b.disabled = true;
      accionPublicarPeticion(cuenta, foto, pet).then(function (accion) {
        return abrirPuerta(null, cuenta, accion).then(function (res) {
          var r = res.pasos && res.pasos[0];
          if (r && r.estado === 'ok') {
            // Si el foro no ha devuelto el número del mensaje, se busca.
            return (r.post ? Promise.resolve({ id: r.post, fecha: '' }) : buscarPeticionPublicada(cuenta, accion.pasos[0].texto)).then(function (p) {
              // Se va al mensaje publicado (queda en la última página del registro).
              if (p) { registrarPeticion(cuenta, pet, p.id, p.fecha); location.href = enlacePost(p.id); }
              else { aviso('Publicada, pero no encuentro el mensaje en el registro. Tocá «Actualizar».'); }
            });
          }
          if (res.resultado === 'igual') { aviso('Esta petición ya estaba publicada en el registro: no se publicó otra vez.'); }
        });
      }).catch(function (e) { aviso(e.message, true); }).then(repintar);
    },
    descartarCaptura: function (pet) {
      var p = almacen.leer(CLAVE_PETICION, null);
      if (p && p.creado === pet.creado) { p.usado = { fecha: ahoraISO(), descartada: true }; almacen.escribir(CLAVE_PETICION, p); }
    },
    confirmar: function (pet, si) {
      guardarDatosCuenta(cuentaConectada(), function (d) {
        var x = (d.peticiones || []).filter(function (y) { return y.post === pet.post; })[0];
        if (!x || !x.aprobacion) { return; }
        if (si) { x.aprobacion.confirmada = true; x.estado = 'aprobada'; }
        else { x.descartadas = (x.descartadas || []).concat([x.aprobacion.post]); x.aprobacion = null; x.estado = 'esperando'; }
      });
    },
    aplicar: function (pet, b, aviso, repintar) {
      var cuenta = cuentaConectada();
      b.disabled = true;
      accionAplicarCanje(cuenta, fotoGuardada(cuenta), pet).then(function (accion) {
        accion.enlaceFinal = { texto: 'Terminar en PAM', alPulsar: function () { terminar(pet); } };
        // Al terminar: se vuelve a leer el foro para que PAM reciba los datos nuevos.
        accion.antesDelEnlace = function (res) {
          var mov = res[1] && res[1].post;
          guardarDatosCuenta(cuenta, function (d) {
            var x = (d.peticiones || []).filter(function (y) { return y.post === pet.post; })[0];
            if (x) { x.aplicada = { fecha: ahoraISO(), movimiento: mov || null }; x.estado = 'aplicada'; }
          });
          return Promise.resolve(PUENTE.actualizar ? PUENTE.actualizar() : leerParaMiPJ());
        };
        return abrirPuerta(null, cuenta, accion);
      }).catch(function (e) { aviso(e.message, true); }).then(repintar);
    },
    terminarEnPAM: function (pet, aviso) {
      var err = terminar(pet);
      if (err) { aviso(err, true); }
    }
  };

  // Cierre del canje en PAM y, después, los datos nuevos del foro. En el foro real los
  // datos van por el canal oficial cuando PAM avisa de que el cierre ha terminado.
  function terminar(pet) {
    var cuenta = cuentaConectada(), foto = fotoGuardada(cuenta);
    if (!foto) { return 'Primero tocá «Actualizar».'; }
    var x = (datosCuenta(cuenta).peticiones || []).filter(function (y) { return y.post === pet.post; })[0] || pet;
    almacen.escribir(CLAVE_APROBACION, paqueteCierre(cuenta, x));
    if (canalOficial() && PUENTE.enviarAPam) {
      dejarContextoPAM(foto, false);
      PUENTE.enviarAPam({ esperarCierre: true });
      return null;
    }
    dejarContextoPAM(foto, true);
    window.open(PAM_URL + '#ficha', 'pam');
    return null;
  }

  // Llegada desde PAM con «Ir al foro a publicar la petición»: se abre sola la puerta.
  function alCargarForo() {
    if (location.hash !== '#escriba-publicar') { return; }
    history.replaceState(null, '', location.pathname + location.search);
    var cuenta = cuentaConectada();
    if (!cuenta) { return; }
    if (PUENTE.abrirPanel) { PUENTE.abrirPanel(); }
    if (!peticionCapturada(cuenta)) {
      msgCanje = { texto: 'Llegaste desde PAM, pero no hay ninguna petición pendiente para esta cuenta (' + cuenta.nombre + '). ¿Estás con la cuenta del personaje?', error: true };
      if (PUENTE.repintar) { PUENTE.repintar(); }
      return;
    }
    var foto = fotoGuardada(cuenta);
    var viejo = !foto || Date.now() - new Date(foto.leidoEn).getTime() > 10 * 60 * 1000;
    Promise.resolve(viejo && PUENTE.actualizar ? PUENTE.actualizar() : null).then(function () {
      var capt = peticionCapturada(cuenta);
      var aviso = function (texto, error) { msgCanje = { texto: texto, error: !!error }; if (PUENTE.repintar) { PUENTE.repintar(); } };
      if (capt) { accionesCanjes.publicar(capt, el('button'), aviso, function () { if (PUENTE.repintar) { PUENTE.repintar(); } }); }
    });
  }

  return {
    version: VERSION,
    enPAM: enPAM,
    montarPuentePAM: montarPuentePAM,
    foroConocido: function () { return !!FOROS[location.host]; },
    canalOficial: canalOficial,
    leer: leerParaMiPJ,
    aMiPJ: aMiPJ,
    dejarContextoPAM: function () { var c = cuentaConectada(); return c ? dejarContextoPAM(fotoGuardada(c), false) : null; },
    enviarPorAlmacen: function () { var c = cuentaConectada(); return enviarPorAlmacen(c ? fotoGuardada(c) : null); },
    pintarCanje: pintarCanje,
    alCargarForo: alCargarForo,
    estilos: estilosCanjes,
    puerta: abrirPuerta,
    el: el
  };
}

// ======================= Panel del foro =======================
/* Solo LEE páginas del foro. Nunca publica ni edita nada: si te avisa de un error en la bóveda,
   el mensaje se envía únicamente si vos tocás «Publicar igual». */
function moduloMiPJ(ESC, PUENTE) {
  'use strict';
  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const PAM_URL = 'https://jesleytherabbit-prog.github.io/PAM/';
  const PAM_ORIGIN = 'https://jesleytherabbit-prog.github.io';
  const FICHA_FOROS = [21, 29, 30, 31, 32, 263, 296, 33, 297, 298, 299, 300, 301, 34];
  const BOVEDA_FORO = 175;
  const CACHE_MIN = 30;
  const DIAS_ROL = 60;   /* roles con más días sin movimiento se juntan en «viejos» */
  const NO_ROL = [172, 175, 75, 36, 52, 272, 20, 21, 78, 193, 39, 10, 234, 192, 257];   /* sueldos, bóvedas, misiones (organización), registros… */

  const ud = W._userdata;
  if (!ud || !ud.session_logged_in || !ud.username) return;
  const YO = String(ud.username).trim(), UID = ud.user_id;
  const K = { datos: 'mipj.' + UID, ui: 'mipj.ui', tema: 'mipj.tema', foros: 'mipj.forosRol', ocultos: 'mipj.ocultos.' + UID };

  /* ---------------- utilidades ---------------- */
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = t => { if (t == null) return null; const m = String(t).replace(/\s/g, '').match(/[+\-−]?\d[\d.,]*/); if (!m) return null; const v = parseInt(m[0].replace('−', '-').replace(/[.,]/g, ''), 10); return isNaN(v) ? null : v; };
  const fmt = n => n == null ? '—' : Number(n).toLocaleString('es-AR');
  const abs = h => h ? new URL(h, location.origin).href : '';
  const gv = (k, d) => { try { const v = GM_getValue(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const sv = (k, v) => GM_setValue(k, JSON.stringify(v));
  const get = async url => { const r = await fetch(url, { credentials: 'same-origin' }); if (!r.ok) throw new Error(r.status + ' ' + url); return new DOMParser().parseFromString(await r.text(), 'text/html'); };
  /* el foro muestra la fecha según cada cuenta: «Lun 2 Mar 2026 - 10:00» o «Dom 25 Oct 2026, 11:03 pm» */
  const FECHA = /((?:Lun|Mar|Mi[ée]r?|Jue|Vie|S[áa]b|Dom)\.?\s+\d{1,2}\s+[A-Za-zé]+\.?(?:\s+\d{4})?\s*(?:,|-)\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s?m\.?)?|(?:Hoy|Ayer)\s+a\s+las\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s?m\.?)?)/i;
  const MES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11 };
  function aFecha(t) {
    t = String(t || '');
    const P = partesDeFecha(t); if (!P) return null;
    return new Date(P.y, P.mo, P.d, P.h, P.mi);
  }
  /* la fecha tal como la muestra el foro, en partes (hora de reloj de la cuenta) */
  function partesDeFecha(t) {
    t = String(t || '');
    const ampm = (h, s) => { s = String(s || '').toLowerCase().replace(/[.\s]/g, ''); if (s === 'pm' && h < 12) return h + 12; if (s === 'am' && h === 12) return 0; return h; };
    let m = t.match(/(Hoy|Ayer)\s+a\s+las\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?/i);
    if (m) { const d = new Date(); if (/ayer/i.test(m[1])) d.setDate(d.getDate() - 1); return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: ampm(+m[2], m[4]), mi: +m[3], rel: true }; }
    m = t.match(/(\d{1,2})\s+([A-Za-zé]+)\.?(?:\s+(\d{4}))?\s*(?:,|-)\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?/i);
    if (!m) return null;
    const mes = MES[norm(m[2]).slice(0, 3)]; if (mes == null) return null;
    const hoy = new Date(); let y = m[3] ? +m[3] : hoy.getFullYear();
    if (!m[3] && new Date(y, mes, +m[1]) > hoy) y--;
    return { y, mo: mes, d: +m[1], h: ampm(+m[4], m[6]), mi: +m[5] };
  }
  const dias = d => d ? Math.floor((Date.now() - d) / 864e5) : null;
  const haceTxt = d => { const n = dias(d); return n == null ? '' : n <= 0 ? 'hoy' : n === 1 ? 'hace 1 día' : `hace ${n} días`; };

  /* texto de un mensaje con espacios entre etiquetas (en una página leída por fetch, innerText pega todo) */
  function textoDe(el) {
    const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) { if (!/^(STYLE|SCRIPT)$/.test(n.parentNode && n.parentNode.nodeName)) out.push(n.nodeValue); } else if (/^(BR|DIV|P|LI|TR|H\d)$/.test(n.nodeName)) out.push('\n'); else if (/^(TD|SPAN|STRONG|B|I|EM|FONT|DD|DT|LABEL|A)$/.test(n.nodeName)) out.push(' '); }
    return out.join('').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ');
  }
  function postsDe(doc) {
    return [...doc.querySelectorAll('div.post')].filter(e => /^p\d+$/.test(e.id)).map(p => {
      const a = p.querySelector('.author a[href*="/u"]'), au = p.querySelector('.author'), c = p.querySelector('.content') || p;
      return { id: p.id.slice(1), autor: a ? a.textContent.trim() : '', fecha: ((au ? au.textContent : '').match(FECHA) || [''])[0],
        texto: textoDe(c), imgs: c.querySelectorAll('img').length, el: c };
    });
  }
  async function paginas(urlTema) {
    const d1 = await get(urlTema);
    const base = urlTema.replace(location.origin, '').split('#')[0].split('?')[0];
    const m = base.match(/^\/t(\d+)(?:p\d+)?-(.*)$/);
    let max = 0;
    if (m) d1.querySelectorAll(`a[href*="/t${m[1]}p"]`).forEach(a => { const x = (a.getAttribute('href') || '').match(new RegExp(`/t${m[1]}p(\\d+)-`)); if (x) max = Math.max(max, +x[1]); });
    if (!max) return { primera: d1, ultimas: [d1] };
    const ult = [await get(`/t${m[1]}p${max}-${m[2]}`)];
    if (max >= 15) { try { ult.unshift(await get(max - 15 ? `/t${m[1]}p${max - 15}-${m[2]}` : `/t${m[1]}-${m[2]}`)); } catch (e) {} }
    return { primera: d1, ultimas: ult };
  }
  const todosLosPosts = P => { const t = []; [P.primera, ...P.ultimas.filter(d => d !== P.primera)].forEach(d => postsDe(d).forEach(p => { if (!t.some(x => x.id === p.id)) t.push(p); })); return t.sort((a, b) => +a.id - +b.id); };
  async function buscarTemas(qs) {
    const d = await get('/search?' + qs);
    return [...d.querySelectorAll('a.topictitle')].map(a => {
      const row = a.closest('tr,li');
      const f = row ? [...row.querySelectorAll('a[href*="/f"]')].map(x => +((x.getAttribute('href') || '').match(/\/f(\d+)-/) || [0, 0])[1]).filter(Boolean) : [];
      return { titulo: a.textContent.trim(), url: abs((a.getAttribute('href') || '').split('?')[0]), foro: f[f.length - 1] || 0 };
    });
  }
  const tidDe = u => +((String(u || '').match(/\/t(\d+)/) || [0, 0])[1]);

  /* ---------------- ficha ---------------- */
  async function leerFicha() {
    const toks = norm(YO).split(' ').filter(t => t.length > 1);
    const cands = (await buscarTemas('search_keywords=' + encodeURIComponent(YO) + '&show_results=topics&search_terms=all&search_fields=titleonly'))
      .filter(t => FICHA_FOROS.includes(t.foro) && toks.every(k => norm(t.titulo).split(' ').includes(k)));
    for (const t of cands) {
      const P = await paginas(t.url);
      const ps = postsDe(P.primera);
      if (!ps.length || norm(ps[0].autor) !== norm(YO)) continue;
      let codigo = '';
      try { const e = await get(`/post?p=${ps[0].id}&mode=editpost`); const ta = e.querySelector('textarea#text_editor_textarea, textarea[name=message]'); if (ta) codigo = ta.value; } catch (e) {}
      if (!codigo) codigo = ps[0].el.innerHTML;
      let sello = null, ultDuenio = null;
      todosLosPosts(P).slice(1).forEach(p => { if (norm(p.autor) === norm(YO)) ultDuenio = p; else if (p.imgs && p.texto.trim().length < 40) sello = p; });
      let estado = t.foro === 21 ? 'pendiente' : 'revisada';
      if (ultDuenio && (!sello || +ultDuenio.id > +sello.id)) estado = 'pendiente';
      return { url: t.url, titulo: t.titulo, foro: t.foro, estado, codigo, sello: sello ? { autor: sello.autor, fecha: sello.fecha } : null };
    }
    return null;
  }

  /* ---------------- bóveda ---------------- */
  /* urlConocida: la bóveda que dice tu perfil (si la hay, no hace falta buscarla) */
  async function leerBoveda(urlConocida) {
    const temas = urlConocida ? [{ url: abs(urlConocida), titulo: '', foro: BOVEDA_FORO }]
      : await buscarTemas('search_author=' + encodeURIComponent(YO) + '&search_where=f' + BOVEDA_FORO + '&show_results=topics&search_terms=all');
    for (const t of temas.filter(x => x.foro === BOVEDA_FORO)) {
      const P = await paginas(t.url);
      const p0 = postsDe(P.primera);
      if (!p0.length || norm(p0[0].autor) !== norm(YO)) continue;
      if (!t.titulo) t.titulo = ((P.primera.querySelector('h1.page-title') || {}).textContent || 'Bóveda').trim();
      const todos = todosLosPosts(P);
      const movs = []; let act = null, tot = null, pla = null, plt = null, revision = null, nota = null, ini = null;
      /* cabecera (primer mensaje): saldo de respaldo e «Iniciales» */
      const cab = leerSaldos(p0[0].texto);
      if (cab.gr) { ini = cab.gr.ini; act = cab.gr.fin; tot = cab.gr.tot; }
      if (cab.pl) { pla = cab.pl.fin; plt = cab.pl.tot; }
      todos.forEach(p => {
        if (p.id === p0[0].id) return;
        const tuyo = norm(p.autor) === norm(YO), tx = p.texto, sal = leerSaldos(tx);
        const esRev = !tuyo && /Revisi[oó]n\s+de\s+B[oó]veda/i.test(tx);
        if (!tuyo && !esRev) { const t2 = tx.replace(/\s+/g, ' ').trim(); if (t2.length > 6) nota = { autor: p.autor, fecha: p.fecha, texto: t2.slice(0, 280) }; return; }
        if (esRev) {
          revision = { autor: p.autor, fecha: p.fecha, url: `${t.url.split('#')[0]}#${p.id}` };
          const resto = tx.replace(/\{[^»]*»\s*[^{]*/g, ' ').replace(/\s+/g, ' ').trim();
          nota = resto.length > 6 ? { autor: p.autor, fecha: p.fecha, texto: resto.slice(0, 280) } : null;
          if (sal.gr && ini == null && sal.gr.ini != null) ini = sal.gr.ini;
        }
        if (sal.gr) { act = sal.gr.fin; if (sal.gr.tot != null) tot = sal.gr.tot; if (tuyo && sal.gr.delta != null) movs.push({ d: sal.gr.delta, act: sal.gr.fin, fecha: p.fecha }); }
        if (sal.pl) { pla = sal.pl.fin; if (sal.pl.tot != null) plt = sal.pl.tot; }
      });
      const ultTuyo = [...todos].reverse().find(p => norm(p.autor) === norm(YO));
      /* tus últimos mensajes (para saber si ya sumaste el sueldo) */
      const propios = todos.filter(p => p.id !== p0[0].id && norm(p.autor) === norm(YO)).slice(-8).map(p => {
        const s2 = leerSaldos(p.texto);
        return { id: +p.id, d: s2.gr ? s2.gr.delta : null, sueldo: /sueldo/i.test(p.texto), enl: [...p.el.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).join(' ') };
      });
      return { url: t.url, tid: tidDe(t.url), titulo: t.titulo, act, tot, ini, pla, plt, movs: movs.slice(-3).reverse(), revision, nota, propios,
        l1: `${t.url.split('#')[0]}#${p0[0].id}`, l2: ultTuyo ? `${t.url.split('#')[0]}#${ultTuyo.id}` : '', l3: revision ? revision.url : '' };
    }
    return null;
  }



  /* ---------------- acceso rápido: atributos, habilidades y combate para tirar ---------------- */
  /* Tirada de habilidad = 1d10 + Atributo + bono de la Habilidad. Valor pasivo = 5 + Atributo + bono. */
  const ATRS = ['Vigor', 'Destreza', 'Carisma', 'Voluntad', 'Percepción', 'Inteligencia', 'Poder'];
  const HAB_DE = {
    Vigor: ['Atletismo', 'Pelea'], Destreza: ['Esquiva', 'Latrocinio', 'Sigilo', 'Vuelo'],
    Carisma: ['Coordinación', 'Intimidación', 'Oratoria', 'Seducción', 'Subterfugio'], Voluntad: ['Estilo', 'Frialdad'],
    Percepción: ['Alerta', 'Consciencia', 'Empatía', 'Iniciativa', 'Investigación'],
    Inteligencia: ['Adivinación', 'Arcanismo', 'Callejeo', 'Cultura Mágica', 'Cultura Muggle', 'Herbología', 'Magizoología', 'Medicina', 'Política', 'Supervivencia'],
    Poder: ['Duelo', 'Pociones', 'Rituales']
  };
  const NIVELES = ['desentrenado', 'novato', 'competente', 'experto', 'maestro', 'legendario'], BONO = [0, 1, 2, 4, 7, 9];
  const NIVEL_TXT = ['Desentrenado', 'Novato', 'Competente', 'Experto', 'Maestro', 'Legendario'];
  const COMBATE = [['Iniciativa', 'Iniciativa'], ['Ataque Físico', 'Ataque F.'], ['Ataque Mágico', 'Ataque M.'], ['Defensa', 'Defensa'],
    ['Lucha Física', 'Lucha F.'], ['Lucha Mágica', 'Lucha M.'], ['PAs', 'PAs'], ['Umbral de heridas', 'Umbral'], ['Heridas', 'Heridas']];
  const DIFICULTADES = [['Rutinaria', 5], ['Fácil', 7], ['Moderada', 9], ['Complicada', 12], ['Difícil', 15], ['Heroica', 18], ['Épica', 21], ['Imposible', 25]];
  /* el código de la ficha (BBCode + HTML) pasado a líneas de texto */
  function lineasFicha(codigo) {
    const html = String(codigo || '').replace(/\[(?:br|hr)\]/gi, '<br>').replace(/\[\/?(?:list|\*|quote|spoiler|center|tr|td|table)[^\]]*\]/gi, '<br>').replace(/\[\/?[a-z*][^\]]*\]/gi, '');
    const d = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    d.querySelectorAll('style,script').forEach(e => e.remove());
    return textoDe(d.body).split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }
  let rapidoCache = { k: null, v: null };
  function leerRapido(codigo) {
    if (rapidoCache.k === codigo) return rapidoCache.v;
    const L0 = lineasFicha(codigo), sinS = t => norm(t);
    /* «Vigor» / «+2» en líneas separadas (fichas con tablas o cajas): se juntan */
    const nombres = new Set(ATRS.concat(Object.values(HAB_DE).flat()).map(x => norm(x)));
    const L = [];
    for (let i = 0; i < L0.length; i++) {
      const solo = norm(L0[i].replace(/[:»]\s*$/, ''));
      if (nombres.has(solo) && L0[i + 1] && /^[+\-]?\s*\d+$|^(desentrenad|novat|competente|expert|maestr|legendari)/i.test(L0[i + 1].trim())) { L.push(L0[i].replace(/[:»]\s*$/, '') + ': ' + L0[i + 1]); i++; }
      else L.push(L0[i]);
    }
    const attrs = {}, skills = {}, artes = [], combate = {}, puntos = {}, trasf = [];
    const NIV = '(desentrenad[oa]|novat[oa]|competente|expert[oa]|maestr[oa]|legendari[oa])';
    const todasHab = Object.values(HAB_DE).flat();
    let enTrasf = false, enHab = false, raza = '';
    L.forEach(l => {
      const lim = l.replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ]+/, '');
      const n = sinS(lim);
      /* secciones */
      if (/^trasfondos\b/.test(n)) { enTrasf = true; return; }
      if (/^(ventajas|especializaciones|talentos|titulos|idiomas|raza)\b/.test(n)) enTrasf = false;
      if (/^habilidades\b/.test(n)) enHab = true; else if (/^(combate|puntos de|magia|hechizos)\b/.test(n)) enHab = false;
      const mr = lim.match(/^Raza\s*:\s*(.+)$/i); if (mr && !raza) raza = mr[1].trim();
      if (enTrasf) { const mt = lim.match(/^(.+?)\s+(I{1,3}|IV|V)\b\s*(?::\s*(.*))?$/); if (mt) trasf.push({ t: mt[1].replace(/\s*[—–-]\s*/g, ' › '), v: mt[2], nota: (mt[3] || '').trim(), esp: mt[1].split(/\s*[—–-]\s*/).length > 2 }); return; }
      /* atributos: «Vigor: +2» */
      const ma = lim.match(/^(Vigor|Destreza|Carisma|Voluntad|Percepci[oó]n|Inteligencia|Poder)\s*[:»\-–]?\s*\+?\s*(\d+)\s*$/i);
      if (ma) { const k = ATRS.find(a => sinS(a) === sinS(ma[1])); if (k && attrs[k] == null) attrs[k] = +ma[2]; return; }
      /* combate y puntos: «… = 4» */
      const mc = lim.match(/^([^:]{2,30}?)\s*:\s*(.*=\s*(-?\d+)|\s*(-?\d+)\s*)$/);
      if (mc) {
        const k = COMBATE.find(([c]) => sinS(c) === sinS(mc[1]));
        const v = +(mc[3] != null ? mc[3] : mc[4]);
        if (k && mc[3] != null && combate[k[0]] == null) { combate[k[0]] = v; return; }
        const mp = sinS(mc[1]).match(/^puntos de (pociones|rituales|destino)$/);
        if (mp && puntos[mp[1]] == null) { puntos[mp[1]] = v; return; }
      }
      /* habilidades y artes: «Alerta: Competente (+2)» */
      const mh = lim.match(new RegExp('^(.+?)\\s*[:»\\-–]?\\s*' + NIV + '\\b', 'i'));
      if (mh) {
        const nv = NIVELES.findIndex(x => sinS(mh[2]).startsWith(x.slice(0, 6)));
        const k = todasHab.find(h => sinS(h) === sinS(mh[1]));
        if (k) { if (skills[k] == null) skills[k] = nv; }
        else if (enHab && !/^(arte|artesania)/.test(sinS(mh[1])) && !ATRS.some(a => sinS(a) === sinS(mh[1]))) artes.push({ n: mh[1].trim(), nv });
      }
    });
    const v = { attrs, skills, artes, combate, puntos, trasf, raza, semiG: /semigigant/.test(sinS(raza)), ok: Object.keys(attrs).length >= 4 };
    rapidoCache = { k: codigo, v };
    return v;
  }
  /* la ficha de este personaje en PAM (la guarda el script cuando abrís PAM) */
  function rapidoDePAM() {
    let d = null; try { d = GM_getValue('pam.fichas', null); } catch (e) {}
    if (!d || !Array.isArray(d.lista)) return null;
    const quien = [...new Set([datos && datos.pj, YO].filter(Boolean).map(norm))];
    const p = d.lista.find(x => x.nombre && quien.includes(norm(x.nombre)))
      || d.lista.find(x => x.nombre && quien.some(q => q.startsWith(norm(x.nombre) + ' ') || norm(x.nombre).startsWith(q + ' ')));
    if (!p) return null;
    const A = p.attrs || {}, S = p.skills || {}, b = k => BONO[S[k] || 0] || 0, semiG = /semigigant/.test(norm(p.raza));
    let comb = p.combate;
    if (!comb) {   /* PAM viejo: lo básico se calcula acá */
      const ini = (A['Percepción'] || 0) + b('Iniciativa'), atkF = (A.Vigor || 0) + b('Pelea') + (semiG ? 2 : 0), atkM = (A.Poder || 0) + b('Duelo'), def = 5 + (A.Destreza || 0) + b('Esquiva');
      comb = { Iniciativa: ini, 'Ataque Físico': atkF, 'Ataque Mágico': atkM, Defensa: def, 'Lucha Física': Math.round((atkF + def - 5 + ini) / 3), 'Lucha Mágica': Math.round((atkM + def - 5 + ini) / 3) };
    }
    return { attrs: A, skills: S, artes: p.artes || [], combate: comb, puntos: p.puntos || {}, trasf: p.trasf || [], bgs: p.bgs || null, adv: p.adv || null, raza: p.raza, semiG,
      ok: Object.keys(A).length >= 4, fuente: 'pam', leido: d.leido, nombre: p.nombre, etapa: p.etapa };
  }
  const TIRADA_BG = { Biblioteca: ['Percepción', 'Investigación'], Influencia: ['Carisma', 'Intimidación'], Informantes: ['Percepción', 'Empatía'], Seguidores: ['Carisma', 'Coordinación'] };
  const ROMANO = ['0', 'I', 'II', 'III', 'IV', 'V'];
  const deRomano = r => ({ I: 1, II: 2, III: 3, IV: 4, V: 5 })[String(r).trim().toUpperCase()] || parseInt(r, 10) || 0;
  function bgsDe(R) {
    if (Array.isArray(R.bgs) && R.bgs.length) return R.bgs.map(x => ({ t: x.t, c: x.c || '', e: x.e || '', v: +x.v || 0, nota: x.nota || '' }));
    return (R.trasf || []).map(x => { const p = String(x.t).split(/\s*›\s*/); return { t: p[0] || '', c: p[1] || '', e: p.slice(2).join(' › '), v: deRomano(x.v), nota: x.nota || '' }; })
      .filter(x => x.t && x.v);
  }
  function vistaRapida() {
    const F = datos && datos.ficha, cod = F && F.codigo;
    let h = '<div class="rapido">';
    let R = rapidoDePAM();
    if (!R || !R.ok) { R = cod ? leerRapido(cod) : null; if (R) R.fuente = 'foro'; }
    if (!R || !R.ok) return h + `<div class="card"><div class="ct">⚡ Acceso rápido</div><div class="row">Todavía no tengo los datos de ${esc((datos && datos.pj) || YO)}.</div>
      <div class="dim" style="margin-top:4px">Abrí PAM una vez con este personaje cargado en «Mi Ficha» (con Mi PJ instalado): los atributos, habilidades y stats se traen solos y quedan acá.</div>
      <div class="row" style="margin-top:8px"><button class="b pri" data-a="pam-abrir">Abrir PAM</button></div></div></div>`;
    const cuando = R.leido ? leidoTxt(R.leido) : '';
    h += `<div class="rsrc">${R.fuente === 'pam' ? `De tu ficha de PAM${cuando ? ' · ' + esc(cuando) : ''}${R.etapa ? '' : ' · sin etapa'}` : 'Leído de tu ficha del foro · abrí PAM para usar la de PAM'}</div>`;
    h += `<input class="rq" type="search" placeholder="Buscar habilidad… (ej. alerta)" aria-label="Buscar habilidad" value="${esc(ui.rapidoQ || '')}">`;
    /* combate */
    const C = COMBATE.filter(([k]) => R.combate[k] != null);
    if (C.length) h += `<div class="card r-sec" data-s="combate"><div class="ct">⚔ Combate</div><div class="rgrid">${C.map(([k, c]) => `<div class="rst" data-copiar="${esc(k)}: ${R.combate[k]}"><b>${R.combate[k]}</b><small>${esc(c)}</small></div>`).join('')}</div></div>`;
    /* atributos */
    h += `<div class="card r-sec" data-s="atributos"><div class="ct">✦ Atributos</div><div class="rgrid a">${ATRS.map(a => `<div class="rst" data-copiar="${esc(a)}: ${R.attrs[a] != null ? R.attrs[a] : '—'}"><b>${R.attrs[a] != null ? R.attrs[a] : '—'}</b><small title="${esc(a)}">${esc(a.slice(0, 3))}</small></div>`).join('')}</div></div>`;
    /* habilidades: solo el nivel; la tirada completa se abre aparte */
    const tiradaTxt = (a, s, nv, extra) => {
      const av = R.attrs[a] || 0, bo = BONO[nv || 0] || 0, plus = (R.semiG && a === 'Vigor' ? 2 : 0);
      const ex = (extra || []).map(([n, v]) => ` + ${n} (${v})`).join('');
      const tot = av + bo + plus + (extra || []).reduce((t, [, v]) => t + v, 0);
      return `${a} (${av}) + ${s} (${NIVEL_TXT[nv || 0]} +${bo})${plus ? ' + Semigigante (2)' : ''}${ex} = ${tot}`;
    };
    const item = (q, fila, detalle, clase) => `<div class="rit${clase ? ' ' + clase : ''}" data-q="${esc(q)}"><div class="rrow" data-abrir role="button" tabindex="0">${fila}<span class="rx">▸</span></div><div class="rdet" hidden>${detalle}</div></div>`;
    const copiar = t => `<div class="rcalc"><span>${esc(t)}</span><button class="rcp" data-copiar="${esc(t)}">Copiar</button></div>`;
    h += `<div class="card r-sec" data-s="habilidades"><div class="ct">❖ Habilidades<span class="sp"></span><span class="rleg">▸ ver tirada</span></div>`;
    ATRS.forEach(a => {
      const filas = HAB_DE[a].map(s => ({ s, nv: R.skills[s] })).concat(a === 'Voluntad' ? R.artes.map(x => ({ s: x.n, nv: x.nv, arte: true })) : []);
      h += `<div class="rgrp">${esc(a)} <span>${R.attrs[a] != null ? R.attrs[a] : '—'}</span></div>`;
      filas.forEach(({ s, nv, arte }) => {
        const n = nv || 0;
        h += item(norm(s + ' ' + a), `<span class="rn">${esc(s)}${arte ? ' <i>arte</i>' : ''}</span><span class="rl${n ? '' : ' cero'}">${NIVEL_TXT[n]} (+${BONO[n]})</span>`,
          copiar(tiradaTxt(a, s, n)) + '<div class="dim">Sumale el 1d10 del dado.</div>', n ? '' : 'cero');
      });
    });
    h += `${R.semiG ? '<div class="dim" style="margin-top:6px">Semigigante: las tiradas de Vigor llevan +2.</div>' : ''}</div>`;
    /* puntos */
    const P = [['pociones', 'Pociones'], ['rituales', 'Rituales'], ['destino', 'Destino']].filter(([k]) => R.puntos[k] != null);
    if (P.length) h += `<div class="card r-sec" data-s="puntos"><div class="ct">⚗ Puntos</div><div class="rgrid p">${P.map(([k, c]) => `<div class="rst" data-copiar="Puntos de ${c}: ${R.puntos[k]}"><b>${R.puntos[k]}</b><small>${c}</small></div>`).join('')}</div></div>`;
    /* trasfondos: el general da los usos por misión; el específico, un bonificador a la tirada si es sobre eso */
    const BG = bgsDe(R);
    if (BG.length) {
      h += `<div class="card r-sec" data-s="trasfondos"><div class="ct">☾ Trasfondos</div><div class="dim" style="margin:-2px 0 4px">El general marca cuántas veces podés hacer esa tirada por misión. El específico suma su nivel a la tirada cuando es sobre ese tema.</div>`;
      Object.keys(TIRADA_BG).forEach(tipo => {
        const del = BG.filter(x => norm(x.t) === norm(tipo)); if (!del.length) return;
        const [at, sk] = TIRADA_BG[tipo], nv = R.skills[sk] || 0;
        h += `<div class="rgrp">${esc(tipo)} <span class="rtir">tirada de ${esc(sk)}</span></div>`;
        const cats = [...new Set(del.map(x => x.c))];
        cats.forEach(c => {
          const gen = del.find(x => x.c === c && !x.e), esps = del.filter(x => x.c === c && x.e);
          const usos = gen ? gen.v : 0;
          h += item(norm(tipo + ' ' + c), `<span class="rn">${esc(c)}</span><span class="rl">${gen ? `${ROMANO[gen.v]} · ${usos} ${usos === 1 ? 'uso' : 'usos'}` : 'sin general'}</span>`,
            (gen ? `<div class="dim">${usos} ${usos === 1 ? 'tirada' : 'tiradas'} por misión sobre ${esc(c)}, salgan bien o mal.</div>` : `<div class="dim">No tenés ${esc(tipo)} › ${esc(c)} general: los usos salen del general.</div>`)
            + copiar(tiradaTxt(at, sk, nv)) + (gen && gen.nota ? `<div class="dim">${esc(gen.nota)}</div>` : ''));
          esps.forEach(x => {
            h += item(norm(tipo + ' ' + c + ' ' + x.e), `<span class="rn">› ${esc(x.e)}</span><span class="rl">${ROMANO[x.v]} · +${x.v}</span>`,
              `<div class="dim">Si la tirada es sobre ${esc(x.e)}, suma +${x.v}. Gasta uno de los usos de ${esc(c)}.</div>` + copiar(tiradaTxt(at, sk, nv, [[x.e, x.v]])) + (x.nota ? `<div class="dim">${esc(x.nota)}</div>` : ''), 'esp');
          });
        });
      });
      const AD = R.adv || {}, adv = [];
      if (AD.Fama) adv.push(`<b>Fama ${ROMANO[AD.Fama]}:</b> ${AD.Fama} ${AD.Fama === 1 ? 'uso extra' : 'usos extra'} de cualquier trasfondo por partida, cuando se te agoten.`);
      if (AD['Orden de Merlín']) adv.push(`<b>Orden de Merlín ${ROMANO[AD['Orden de Merlín']]}:</b> ${AD['Orden de Merlín']} ${AD['Orden de Merlín'] === 1 ? 'vez' : 'veces'} +4 a una tirada de trasfondo (se declara antes de tirar).`);
      if (AD['Patrón']) adv.push(`<b>Patrón ${ROMANO[AD['Patrón']]}:</b> una vez por partida, una tirada de un trasfondo general que no tengas, con +${[0, 2, 4, 7][AD['Patrón']] || 7}.`);
      if (AD.Recursos) adv.push(`<b>Recursos ${ROMANO[AD.Recursos]}:</b> en una tirada de trasfondo podés contar el resultado ${AD.Recursos === 1 ? 'un grado' : AD.Recursos + ' grados'} de dificultad más arriba.`);
      if (adv.length) h += `<div class="rgrp">Ventajas</div>${adv.map(x => `<div class="radv">${x}</div>`).join('')}`;
      h += '</div>';
    }
    /* dificultades */
    h += `<div class="card r-sec" data-s="dificultades"><div class="ct">⚖ Dificultades</div><div class="rdif">${DIFICULTADES.map(([n, v]) => `<span><b>${v}</b> ${n}</span>`).join('')}</div>
      <div class="dim" style="margin-top:6px">La tirada es 1d10 + atributo + habilidad: superás la acción si igualás o pasás la dificultad.</div></div>`;
    return h + '</div>';
  }
  function filtrarRapido(q) {
    const t = norm(q);
    root.querySelectorAll('.rapido .rit').forEach(r => { r.hidden = !!t && !r.dataset.q.includes(t); });
    root.querySelectorAll('.rapido .rgrp').forEach(g => {
      let n = g.nextElementSibling, alguno = false;
      while (n && n.classList.contains('rit')) { if (!n.hidden) alguno = true; n = n.nextElementSibling; }
      g.hidden = !!t && !alguno;
    });
    root.querySelectorAll('.rapido .r-sec').forEach(c => { if (!['habilidades', 'trasfondos'].includes(c.dataset.s)) c.hidden = !!t; else c.hidden = !!t && !c.querySelector('.rit:not([hidden])'); });
    root.querySelectorAll('.rapido .radv').forEach(x => { x.hidden = !!t; });
    /* si queda una sola, se abre sola */
    const vis = [...root.querySelectorAll('.rapido [data-s="habilidades"] .rit:not([hidden])')];
    if (t && vis.length === 1) { vis[0].querySelector('.rdet').hidden = false; vis[0].classList.add('abierto'); }
  }
  function copiarTexto(t, el) {
    const ok = () => { if (!el) return; el.classList.add('copiado'); setTimeout(() => el.classList.remove('copiado'), 900); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, ok);
    else { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); ok(); }
  }

  /* ---------------- sueldo del mes ---------------- */
  /* Cada mes se abre «Sueldos de <mes anterior>» en Sueldos Mensuales: pedís con el formulario, un inspector
     contesta nombrándote y después lo sumás a la bóveda. */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const SUELDOS_FORO = '/f172-sueldos-mensuales', SUELDOS_FORM = '/t89-formularios-para-solicitar-sueldo';
  const escRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const S_NEG = /\b(falta|faltan|vuelve a postear|volve a postear|corrige|corregi|no es correct|no son correct|no esta correct|incorrect|no (se )?puede cobrar|no puedes cobrar|no podes cobrar|desgraciadamente|lamentablemente|no es valid|no son valid|no cuenta|no computa|denegad|rechazad)/;
  const S_POS = /\b(es correct|son correct|esta correct|estan correct|pued(e|es|en) (agregar|anadir|sumar)|podeis (agregar|anadir|sumar)|podes (agregar|anadir|sumar)|aprobad|validad|disfrut)/;
  function montoSueldo(t) {
    const m = String(t).match(/Sueldo\s+total\s*»\s*:?\s*([\d.,]+)/i) || String(t).match(/Sueldo\s*»\s*:?\s*([\d.,]+)/i);
    return m ? num(m[1]) : null;
  }
  /* lo que dice un inspector de vos: la frase que te nombra (o la siguiente, si esa es solo tu nombre) */
  function veredicto(texto, reNom) {
    const frases = String(texto).split(/[.!?¡¿\n]+|(?=@)/);
    let out = null;
    frases.forEach((f, i) => {
      const n = norm(f); if (!reNom.test(n)) return;
      const cand = [n]; if (n.length < 40 && frases[i + 1]) cand.push(norm(frases[i + 1]));
      for (const g of cand) {
        if (S_NEG.test(g)) { out = { v: 'corregir', frase: f.replace(/\s+/g, ' ').trim().slice(0, 220) }; break; }
        if (S_POS.test(g)) { out = { v: 'aprobado' }; break; }
      }
    });
    return out;
  }
  async function leerSueldo() {
    const hoy = new Date(), mesAnt = (hoy.getMonth() + 11) % 12;
    const d = await get(SUELDOS_FORO);
    const t = [...d.querySelectorAll('a.topictitle')].map(a => ({ titulo: a.textContent.trim(), url: abs((a.getAttribute('href') || '').split('?')[0].split('#')[0]) }))
      .find(x => /^Sueldos\s+de\s+\S+/i.test(x.titulo));
    const mesDe = x => MESES.indexOf(norm(x.titulo.replace(/^Sueldos\s+de\s+/i, '')).split(' ')[0]);
    if (!t || (mesDe(t) !== mesAnt && mesDe(t) !== hoy.getMonth())) return { estado: 'sinTema', mes: MESES[mesAnt], leido: hoy.toISOString() };
    /* el tema entero: tu pedido puede estar en cualquier página */
    const tid = tidDe(t.url), slug = (t.url.match(/\/t\d+(?:p\d+)?-([^/?#]*)/) || [0, ''])[1];
    const d1 = await get(t.url);
    let max = 0;
    d1.querySelectorAll(`a[href*="/t${tid}p"]`).forEach(a => { const x = (a.getAttribute('href') || '').match(new RegExp(`/t${tid}p(\\d+)-`)); if (x) max = Math.max(max, +x[1]); });
    const otras = []; for (let o = 15; o <= max; o += 15) otras.push(o);
    const docs = [d1].concat(await Promise.all(otras.map(o => get(`/t${tid}p${o}-${slug}`).catch(() => null))));
    const posts = []; docs.filter(Boolean).forEach(x => postsDe(x).forEach(p => { if (!posts.some(q => q.id === p.id)) posts.push(p); }));
    posts.sort((a, b) => +a.id - +b.id);
    const yo = norm(YO), pila = yo.split(' ')[0];
    const reNom = new RegExp(`(^| )(${escRe(yo)}${pila.length >= 3 && pila !== yo ? '|' + escRe(pila) : ''})( |$)`);
    let pedido = null, resp = null;
    posts.slice(1).forEach(p => {
      if (norm(p.autor) === yo) { if (/sueldo/i.test(p.texto)) { pedido = { id: +p.id, fecha: p.fecha, monto: montoSueldo(p.texto) }; resp = null; } return; }
      if (!pedido) return;
      const v = veredicto(p.texto, reNom);
      if (v) resp = Object.assign(v, { id: +p.id, autor: p.autor, fecha: p.fecha });
    });
    return { estado: 'leido', mes: MESES[mesDe(t)], url: t.url, tid, pedido, resp, leido: hoy.toISOString() };
  }
  /* estado final, con la bóveda: ¿ya sumaste el sueldo aprobado? */
  function estadoSueldo(S, B) {
    if (!S) return null;
    if (S.estado === 'sinTema') return { k: 'sinTema' };
    if (!S.pedido) return { k: 'sinPedir' };
    if (!S.resp) return { k: 'esperando' };
    if (S.resp.v === 'corregir') return { k: 'corregir' };
    /* enlace a tu pedido o a la aprobación (aunque sea un mensaje viejo editado); si no, un movimiento posterior que hable de sueldo o sume lo mismo */
    const P = (B && B.propios) || [], ids = [S.resp.id, S.pedido.id].join('|');
    const fuerte = new RegExp(`(/t${S.tid}[^#\\s]*#|[?&]p=)(${ids})\\b`);
    const suma = P.find(p => fuerte.test(p.enl)) || P.find(p => p.id > S.resp.id && (p.sueldo || (S.pedido.monto && p.d === S.pedido.monto)));
    return suma ? { k: 'cobrado', post: suma.id } : { k: 'aprobado', sinBoveda: !B };
  }
  const finDeMes = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth() + 1, 0).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }); };
  const Mayus = t => t ? t[0].toUpperCase() + t.slice(1) : '';
  function tarjetaSueldo() {
    const S = datos && datos.sueldo, E = estadoSueldo(S, datos && datos.boveda);
    if (ui.sinSueldo) return `<div class="card fino"><div class="ct">⚜ Sueldo<span class="sp"></span><a href="#" data-a="sueldo-ver">mostrar</a></div></div>`;
    let h = `<div class="card"><div class="ct">⚜ Sueldo${S && S.mes ? ' de ' + Mayus(S.mes) : ''}<span class="sp"></span><a href="#" data-a="sueldo-ocultar" title="Si no cobrás sueldo, ocultalo">ocultar</a></div>`;
    if (!E) return h + `<div class="dim">${cargando ? 'Buscando…' : 'Tocá «Actualizar».'}</div></div>`;
    const yo = id => `${esc(S.url)}#${id}`, monto = S.pedido && S.pedido.monto ? ` (${fmt(S.pedido.monto)} grageas)` : '';
    if (E.k === 'sinTema') h += `<div class="dim">Todavía no abrieron el tema de «Sueldos de ${esc(Mayus(S.mes))}». Suele abrirse en los primeros días del mes.</div>`;
    else if (E.k === 'sinPedir') h += `<span class="badge warn">◷ Sin pedir</span><div class="row">Todavía no lo pediste. Tenés hasta el ${finDeMes()}.</div>
      <div class="row"><a href="${esc(S.url)}">Ir a pedirlo</a> <span class="dim">·</span> <a href="${SUELDOS_FORM}">Formulario</a></div>`;
    else if (E.k === 'esperando') h += `<span class="badge warn">◷ Pedido</span><div class="row">Lo pediste${S.pedido.fecha ? ' el ' + esc(S.pedido.fecha) : ''}${monto}. Falta que lo revise un inspector.</div>
      <div class="row"><a href="${yo(S.pedido.id)}">Ver tu pedido</a></div>`;
    else if (E.k === 'corregir') h += `<span class="badge bad">✕ Hay que corregir</span><div class="nota">${esc(S.resp.autor)}: «${esc(S.resp.frase)}»</div>
      <div class="row"><a href="${yo(S.resp.id)}">Ver la respuesta</a> <span class="dim">·</span> <a href="${SUELDOS_FORM}">Formulario</a></div>`;
    else if (E.k === 'aprobado') h += `<span class="badge warn">✓ Aprobado · falta sumarlo</span><div class="row">Lo aprobó ${esc(S.resp.autor)}${S.resp.fecha ? ', ' + esc(S.resp.fecha) : ''}. ${E.sinBoveda ? 'No encontré tu bóveda para ver si ya lo sumaste.' : `Todavía no lo veo en tu bóveda: sumá${monto ? ' las' + monto.replace(/[()]/g, '') : ' el sueldo'}.`}</div>
      <div class="row"><a href="${yo(S.resp.id)}">Aprobación</a>${datos.boveda ? ` <span class="dim">·</span> <a href="${esc(datos.boveda.url.split('#')[0])}">Tu bóveda</a>` : ''}</div>`;
    else h += `<span class="badge ok">✓ Cobrado</span><div class="row">Aprobado por ${esc(S.resp.autor)} y sumado a tu bóveda${monto}.</div>`;
    return h + '</div>';
  }
  const sueldoPendiente = () => { const E = !ui.sinSueldo && datos && estadoSueldo(datos.sueldo, datos.boveda); return E && ['sinPedir', 'corregir', 'aprobado'].includes(E.k) ? E.k : null; };
  const SUELDO_TXT = { sinPedir: 'Sueldo del mes sin pedir', corregir: 'Te pidieron corregir el pedido de sueldo', aprobado: 'Sueldo aprobado: falta sumarlo a la bóveda' };

  /* ---------------- roles: dónde te toca responder ---------------- */
  /* un foro es de rol si su ruta pasa por la categoría «Zona del rol» (/c10-) */
  async function esForoDeRol(fid, cache) {
    if (NO_ROL.includes(+fid)) return false;
    if (fid in cache) return cache[fid];
    try { const r = await fetch(`/f${fid}-`, { credentials: 'same-origin' }); const h = await r.text(); cache[fid] = /href="(?:https:\/\/hp-avada-kedavra\.foroactivo\.com)?\/c10-/.test(h); }
    catch (e) { return false; }
    return cache[fid];
  }

  /* ---------------- misiones y acontecimientos: turno del master y plazo ---------------- */
  const ES_MISION = /\b(misi[oó]n|acontecimiento)\b/i;
  const PLAZO_KW = /(pr[oó]ximo\s+turno|hora\s+l[ií]mite|l[ií]mite\s+de\s+poste[oa]|fecha\s+l[ií]mite|plazo|l[ií]mite\s+para\s+postear|deadline)/i;
  const DIAS_SEM = 'lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo';
  const MESES_N = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };
  /* minutos de diferencia de una zona con UTC en una fecha dada (horario de verano incluido) */
  function offsetZona(tz, fecha) {
    try { const a = new Date(fecha.toLocaleString('en-US', { timeZone: tz })), b = new Date(fecha.toLocaleString('en-US', { timeZone: 'UTC' })); return (a - b) / 60000; } catch (e) { return 120; }
  }
  /* «Jueves 22 de octubre · HORA LÍMITE 18.00 hora peninsular española» / «Viernes 23, 7:59 pm (Hora de Madrid GMT +2)» */
  function leerPlazo(texto, fechaPost) {
    const T = String(texto || '');
    const idx = []; let m; const re = new RegExp(PLAZO_KW.source, 'gi');
    while ((m = re.exec(T))) idx.push(m.index);
    if (!idx.length) return null;
    /* el último bloque de plazo del mensaje («PRÓXIMO TURNO … HORA LÍMITE …» cuenta como uno) */
    let i = idx[idx.length - 1];
    for (let k = idx.length - 2; k >= 0 && i - idx[k] < 200; k--) i = idx[k];
    const seg = T.slice(Math.max(0, i - 10), i + 500);
    const lineas = seg.split('\n').map(l => l.trim()).filter(Boolean);
    const reDia = new RegExp(`(?:(?:${DIAS_SEM})\\s*,?\\s*)?(\\d{1,2})(?:\\s+de\\s+([a-záé]+))?`, 'i');
    const reHora = /(\d{1,2})\s*[:.]\s*(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?|hs?\b)?/i;
    let dia = null, mes = null;
    const cands = [];
    lineas.forEach(l => {
      const lh = l.replace(reHora, ' ');
      const md = lh.match(new RegExp(`(?:${DIAS_SEM})\\s*,?\\s*(\\d{1,2})(?:\\s+de\\s+([a-záé]+))?|(\\d{1,2})\\s+de\\s+([a-záé]+)`, 'i'));
      if (md && dia == null) { dia = +(md[1] || md[3]); const ms = (md[2] || md[4] || '').toLowerCase(); if (ms in MESES_N) mes = MESES_N[ms]; }
      const mh = l.match(reHora); if (!mh) return;
      let h = +mh[1]; const mi = +mh[2], ap = (mh[3] || '').toLowerCase().replace(/[.\s]/g, '');
      if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
      const g = l.match(/GMT\s*([+\-−])\s*(\d{1,2})(?::?(\d{2}))?/i);
      const zona = g ? { off: (g[1] === '+' ? 1 : -1) * (+g[2] * 60 + +(g[3] || 0)) }
        : /peninsular|espa[nñ]a|madrid/i.test(l) ? { tz: 'Europe/Madrid' } : /argentin/i.test(l) ? { tz: 'America/Argentina/Buenos_Aires' } : /m[eé]xico/i.test(l) ? { tz: 'America/Mexico_City' } : null;
      const mdl = lh.match(reDia);
      cands.push({ h, mi, zona, dia: mdl && /\d/.test(mdl[0]) && new RegExp(DIAS_SEM, 'i').test(lh) ? +mdl[1] : null });
    });
    if (!cands.length) return null;
    const c = cands.find(x => x.zona && x.zona.off != null) || cands.find(x => x.zona) || cands[0];
    const d = c.dia || dia; if (!d) return null;
    const base = fechaPost || new Date();
    let y = base.getFullYear(), mo = mes != null ? mes : base.getMonth();
    if (mes == null && d < base.getDate() - 1) { mo++; if (mo > 11) { mo = 0; y++; } }
    if (mes != null && mes < base.getMonth() - 6) y++;
    const utc = Date.UTC(y, mo, d, c.h, c.mi);
    const off = c.zona ? (c.zona.off != null ? c.zona.off : offsetZona(c.zona.tz, new Date(utc))) : offsetZona('Europe/Madrid', new Date(utc));
    return { t: utc - off * 60000, supuesta: !c.zona };
  }
  /* el turno del master, ¿te nombra? (encabezado con tu nombre, o «TODOS») */
  function turnoParaMi(texto, participantes) {
    const lineas = String(texto).split('\n').map(l => norm(l)).filter(l => l && l.length <= 45);
    const formas = n => { const t = norm(n).split(' ').filter(Boolean); return [t.join(' '), t[0], t.length > 1 ? t[0] + ' ' + t[t.length - 1] : ''].filter(x => x && x.length >= 3); };
    const mias = formas(YO);
    const esEnc = (l, fs) => fs.some(f => l === f || l === 'turno ' + f || new RegExp(`^turno [0-9ivxlc]+ ${f}$`).test(l));
    if (lineas.some(l => esEnc(l, mias))) return 'si';
    if (lineas.some(l => /^(turno [0-9ivxlc]+ )?(todos|todos los pjs?|todos los personajes|general)$/.test(l))) return 'si';
    const otros = participantes.filter(p => norm(p) !== norm(YO));
    if (otros.some(p => lineas.some(l => esEnc(l, formas(p))))) return 'no';     /* hay encabezados, pero no el tuyo */
    return 'si';                                                                   /* turno general, sin encabezados */
  }
  async function analizarMision(f) {
    const P = await paginas(f.url), todos = todosLosPosts(P).filter(p => !esBot(p.autor));
    if (!todos.length) return null;
    const master = todos[0].autor;
    if (norm(master) === norm(YO)) return { sos: 'master', master };
    const delMaster = todos.filter(p => norm(p.autor) === norm(master) && p.id !== todos[0].id || (p.id === todos[0].id && PLAZO_KW.test(p.texto)));
    const ult = delMaster[delMaster.length - 1];
    const mio = [...todos].reverse().find(p => norm(p.autor) === norm(YO));
    if (!ult || (mio && +mio.id > +ult.id)) return { sos: 'jugador', master, turno: false };
    const participantes = [...new Set(todos.map(p => p.autor))].filter(a => norm(a) !== norm(master));
    const paraMi = turnoParaMi(ult.texto, participantes) === 'si';
    const num = (ult.texto.match(/\bturno\s+([0-9]+|[ivxlc]+)\b/i) || [])[1];
    const plazo = leerPlazo(ult.texto, aFecha(ult.fecha));
    return { sos: 'jugador', master, turno: paraMi, n: num ? num.toUpperCase() : '', post: +ult.id, url: `${f.url.split('#')[0].replace(/\/t(\d+)(?:p\d+)?-/, '/t$1-')}`, fechaTurno: ult.fecha,
      vence: plazo ? plazo.t : null, supuesta: plazo ? plazo.supuesta : false };
  }
  const restaTxt = ms => { const h = Math.round(ms / 36e5); if (h < 1) return 'menos de 1 h'; if (h < 48) return `${h} h`; const d = Math.floor(h / 24); return `${d} días${h % 24 ? ' y ' + (h % 24) + ' h' : ''}`; };
  function venceTxt(t) {
    const d = new Date(t), hoy = new Date(), man = new Date(); man.setDate(hoy.getDate() + 1);
    const hh = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dia = d.toDateString() === hoy.toDateString() ? 'hoy' : d.toDateString() === man.toDateString() ? 'mañana' : d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' });
    return `${dia} a las ${hh}`;
  }
  function filaMision(r, cuenta) {
    const M = r.mision, ahora = Date.now();
    let cls = '', plazo = '<span class="dim">sin plazo escrito</span>';
    if (M.vence) { const q = M.vence - ahora; cls = q < 0 ? 'vencida' : q < 864e5 ? 'urge' : ''; plazo = q < 0 ? `Venció ${venceTxt(M.vence)}` : `Vence ${venceTxt(M.vence)} (tu hora) · quedan ${restaTxt(q)}${M.supuesta ? ' · <span class="dim">supuse hora de España</span>' : ''}`; }
    return `<div class="rol mis ${cls}"><div class="rt"><a href="${esc(M.url)}#${M.post}">⚔ ${esc(r.titulo.replace(/\s*\[(misi[oó]n|acontecimiento)\]\s*/i, ' ').trim())}</a>
      <div class="dim">${M.n ? 'Turno ' + esc(M.n) + ' · ' : 'Turno nuevo · '}master ${esc(M.master)}${cuenta ? ' · <b>' + esc(cuenta) + '</b>' : ''}</div><div class="pz">${plazo}</div></div>
      ${cuenta ? '' : `<button class="x" data-a="ocultar" data-t="${r.tid}" data-l="${r.lpid}" title="Ocultar hasta el próximo mensaje">✕</button>`}</div>`;
  }

  /* ---------------- oficiales: posts que cuentan y recompensas ---------------- */
  /* 20 grageas por post, con tope de 3 por día, 15 por semana (lunes a domingo) y 45 por mes, por usuario y en hora
     de España; +60 por el Suceso de cierre. Un segundo oficial (suceso de más de dos años) se cobra a un cuarto. */
  const ES_OFICIAL = /\[\s*(?:rol(?:eo)?\s+)?oficial\s*\]|\boficial\b\s*[\]|:·•-]/i;
  const TOPE = { dia: 3, semana: 15, mes: 45 };
  /* zona horaria de la cuenta (perfil › preferencias); el foro muestra las horas en esa zona */
  async function zonaCuenta() {
    const k = 'mipj.tz.' + UID, c = gv(k, null);
    if (c && Date.now() - c.t < 7 * 864e5) return c.tz;
    let tz = 'Europe/Madrid';
    try {
      const d = await get('/profile?mode=editprofile&page_profil=preferences');
      const s = d.querySelector('select[name="timezone"]'); const v = s && s.value;
      if (v && /^[A-Za-z_]+\/[A-Za-z_/+-]+$/.test(v)) tz = v;
      else if (v && /^-?\d+(\.\d+)?$/.test(v)) tz = 'Etc/GMT' + (+v > 0 ? '-' : '+') + Math.abs(Math.round(+v));
    } catch (e) {}
    sv(k, { tz, t: Date.now() });
    return tz;
  }
  function aUTC(P, tz) {
    const base = Date.UTC(P.y, P.mo, P.d, P.h, P.mi);
    let off = offsetZona(tz, new Date(base)); off = offsetZona(tz, new Date(base - off * 60000));
    return base - off * 60000;
  }
  const fmtMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  function clavesMadrid(utc) {
    const p = Object.fromEntries(fmtMadrid.formatToParts(new Date(utc)).map(x => [x.type, x.value]));
    const dow = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[p.weekday] || 0;
    const lunes = new Date(Date.UTC(+p.year, +p.month - 1, +p.day) - dow * 864e5).toISOString().slice(0, 10);
    return { dia: `${p.year}-${p.month}-${p.day}`, semana: lunes, mes: `${p.year}-${p.month}` };
  }
  /* todos los mensajes del tema, con fecha en UTC */
  async function postsDelTema(url, tz) {
    const tid = tidDe(url), slug = (String(url).match(/\/t\d+(?:p\d+)?-([^/?#]*)/) || [0, ''])[1];
    const d1 = await get(`/t${tid}-${slug}`);
    let max = 0; d1.querySelectorAll(`a[href*="/t${tid}p"]`).forEach(a => { const x = (a.getAttribute('href') || '').match(new RegExp(`/t${tid}p(\\d+)-`)); if (x) max = Math.max(max, +x[1]); });
    const offs = []; for (let o = 15; o <= max; o += 15) offs.push(o);
    const docs = [d1]; for (let i = 0; i < offs.length; i += 4) docs.push(...await Promise.all(offs.slice(i, i + 4).map(o => get(`/t${tid}p${o}-${slug}`).catch(() => null))));
    const vistos = new Set(), out = [];
    docs.filter(Boolean).forEach(d => postsDe(d).forEach(p => { if (vistos.has(p.id)) return; vistos.add(p.id); const P = partesDeFecha(p.fecha); out.push({ id: +p.id, autor: p.autor, utc: P ? aUTC(P, tz) : null }); }));
    return { titulo: ((d1.querySelector('h1.page-title') || {}).textContent || '').trim(), tid, url: `/t${tid}-${slug}`, posts: out.sort((a, b) => a.id - b.id) };
  }
  /* cuentas de staff que abren y cierran temas: no cobran ni cuentan como actividad */
  const NO_COBRAN = ['tramas'];
  function contarOficial(T) {
    const por = new Map();
    const vale = p => p.autor && !esBot(p.autor) && !NO_COBRAN.includes(norm(p.autor));
    T.posts.filter(vale).forEach(p => {
      let r = por.get(p.autor); if (!r) { r = { autor: p.autor, posts: 0, cuentan: 0, fuera: { dia: 0, semana: 0, mes: 0, fecha: 0 }, c: { dia: {}, semana: {}, mes: {} }, ultimo: null }; por.set(p.autor, r); }
      r.posts++; if (p.utc) r.ultimo = Math.max(r.ultimo || 0, p.utc);
      if (!p.utc) { r.fuera.fecha++; return; }
      const k = clavesMadrid(p.utc);
      const lleno = ['dia', 'semana', 'mes'].find(x => (r.c[x][k[x]] || 0) >= TOPE[x]);
      if (lleno) { r.fuera[lleno]++; return; }
      ['dia', 'semana', 'mes'].forEach(x => { r.c[x][k[x]] = (r.c[x][k[x]] || 0) + 1; });
      r.cuentan++;
    });
    const parts = [...por.values()].map(r => ({ autor: r.autor, posts: r.posts, cuentan: r.cuentan, fuera: r.fuera, ultimo: r.ultimo }));
    const ult = Math.max(0, ...T.posts.filter(vale).map(p => p.utc || 0));
    return { titulo: T.titulo, tid: T.tid, url: T.url, parts, ultimo: ult || null, leido: Date.now() };
  }
  /* segundo oficial: se marca por participante ({tid: {autor normalizado: 1}}) */
  const cuartoDe = (tid, autor) => { const m = gv('mipj.of.cuarto', {})[tid]; return !!(m && typeof m === 'object' && m[norm(autor)]); };
  function grageasOf(O, autor) { const q = cuartoDe(O.tid, autor); const r = O.parts.find(p => norm(p.autor) === norm(autor)); return r ? r.cuentan * (q ? 5 : 20) : 0; }
  function avisoParado(O) {
    if (!O.ultimo) return '';
    const d = Math.floor((Date.now() - O.ultimo) / 864e5);
    if (d >= 30) return `<div class="of-av mal">Lleva ${d} días sin posts: queda como abandonado y no aparece en tu panel hasta que alguien vuelva a postear.</div>`;
    if (d >= 21) return `<div class="of-av">Lleva ${d} días sin posts: quedan ${30 - d} para llegar al mes.</div>`;
    return '';
  }
  function detalleFuera(f) {
    const t = []; if (f.dia) t.push(`${f.dia} por el tope diario`); if (f.semana) t.push(`${f.semana} por el semanal`); if (f.mes) t.push(`${f.mes} por el mensual`); if (f.fecha) t.push(`${f.fecha} sin fecha legible`);
    return t.length ? ` <span class="dim">· no cuentan ${t.join(', ')}</span>` : '';
  }
  /* la tabla del oficial (en el tema y en el panel) */
  function htmlOficial(O, compacto) {
    const fila = p => { const q = cuartoDe(O.tid, p.autor), pp = q ? 5 : 20;
      return `<div class="of-p"><b>${esc(p.autor)}</b> · ${p.posts} ${p.posts === 1 ? 'post' : 'posts'} · <b>${p.cuentan}</b> cuentan → <b class="of-g">${fmt(p.cuentan * pp)} grageas</b>${q ? ' <span class="dim">(segundo oficial, a un cuarto)</span>' : ''}${detalleFuera(p.fuera)}
        ${compacto ? '' : `<label class="of-q"><input type="checkbox" data-of-cuarto="${O.tid}" data-autor="${esc(p.autor)}" ${q ? 'checked' : ''}> Es su segundo oficial (suceso con más de dos años): cobra a un cuarto</label>`}</div>`; };
    return `${O.parts.map(fila).join('')}
      <div class="dim">+60 grageas para quien envíe el Suceso de cierre (15 si está en su segundo oficial), o repartidas si así lo indica el reporte.</div>
      ${avisoParado(O)}
      ${compacto ? '' : `<div class="dim">Topes por usuario en hora de España: 3 por día, 15 por semana (lunes a domingo), 45 por mes. Los mensajes de Tramas no se cuentan.</div>`}`;
  }
  let ultimasFilas = [];
  async function leerMisOficiales() {
    const tz = await zonaCuenta(), cache = gv(K.foros, {});
    const cands = []; ultimasFilas.forEach(f => { if (ES_OFICIAL.test(f.titulo) && !cands.some(c => c.tid === f.tid)) cands.push(f); });
    const out = [];
    for (const f of cands) {
      try { if (f.fid && !(await esForoDeRol(f.fid, cache))) continue; const O = contarOficial(await postsDelTema(f.url, tz)); if (O.parts.some(p => norm(p.autor) === norm(YO))) out.push(O); } catch (e) { console.warn('[Mi PJ] oficial', e); }
    }
    return out;
  }
  function tarjetaOficiales() {
    /* abandonados: un mes o más sin posts de los participantes (Tramas no cuenta); vuelven si alguien postea */
    const vivo = O => !O.ultimo || Date.now() - O.ultimo < 30 * 864e5;
    const mios = ((datos && datos.oficiales) || []).filter(vivo), otras = [];
    const C = gv('mipj.cuentas', {});
    Object.keys(C).forEach(uid => { if (String(uid) === String(UID)) return; const d = gv('mipj.' + uid, null); ((d && d.oficiales) || []).filter(vivo).forEach(O => otras.push({ O, cuenta: (d && d.pj) || C[uid].nombre })); });
    if (!mios.length && !otras.length) return '';
    const fila = (O, quien) => { const r = O.parts.find(p => norm(p.autor) === norm(quien)) || { posts: 0, cuentan: 0, fuera: {} }; const d = O.ultimo ? Math.floor((Date.now() - O.ultimo) / 864e5) : null;
      return `<div class="rol"><div class="rt"><a href="${esc(O.url)}">${esc(O.titulo.replace(/\s*\[\s*oficial\s*\]\s*/i, ' ').trim())}</a><div class="dim">${quien !== YO ? '<b>' + esc(quien) + '</b> · ' : ''}${r.posts} posts · ${r.cuentan} cuentan → <b class="of-g">${fmt(grageasOf(O, quien))} grageas</b></div>${d != null && d >= 21 ? `<div class="of-av">${d} días sin posts: quedan ${30 - d} para que se dé por abandonado</div>` : ''}</div></div>`; };
    return `<div class="card"><div class="ct">🎓 Oficiales en curso</div>${mios.map(O => fila(O, YO)).join('')}${otras.map(x => fila(x.O, x.cuenta)).join('')}<div class="dim" style="margin-top:4px">Abrí el tema para ver a todos los participantes.</div></div>`;
  }
  /* en el tema de un oficial: la barra con las cuentas, arriba de los mensajes */
  async function barraOficial() {
    const h1 = document.querySelector('h1.page-title'); const tid = tidActual();
    if (!h1 || !tid || !ES_OFICIAL.test(h1.textContent)) return;
    const p0 = document.querySelector('div.post'); if (!p0) return;
    const caja = document.createElement('details'); caja.className = 'mipj-of'; caja.open = gv('mipj.of.abierta', true);
    caja.innerHTML = '<summary><span class="ic">🎓</span>Este oficial<small>Mi PJ · leyendo…</small></summary><div class="of-bd"></div>';
    p0.parentElement.insertBefore(caja, p0);
    caja.addEventListener('toggle', () => sv('mipj.of.abierta', caja.open));
    const pintarB = O => { caja.querySelector('summary small').textContent = `Mi PJ · ${O.parts.reduce((a, p) => a + p.posts, 0)} posts`; caja.querySelector('.of-bd').innerHTML = htmlOficial(O, false); };
    try {
      const O = contarOficial(await postsDelTema(location.pathname, await zonaCuenta()));
      pintarB(O);
      caja.addEventListener('change', e => { const c = e.target.closest('[data-of-cuarto]'); if (!c) return; const m = gv('mipj.of.cuarto', {}); const t = (m[O.tid] && typeof m[O.tid] === 'object') ? m[O.tid] : {}; const a = norm(c.dataset.autor); if (c.checked) t[a] = 1; else delete t[a]; if (Object.keys(t).length) m[O.tid] = t; else delete m[O.tid]; sv('mipj.of.cuarto', m); pintarB(O); });
    } catch (e) { caja.querySelector('.of-bd').innerHTML = `<div class="dim">No pude leer el tema: ${esc(e.message)}</div>`; }
  }
  const BOTS = ['dados magicos', 'dado magico', 'dados'];
  const esBot = n => BOTS.includes(norm(n));
  async function leerRoles() {
    const filas = [];
    for (const pag of ['', '/50']) {
      let d; try { d = await get(`/sta/u${UID}${pag}`); } catch (e) { break; }
      d.querySelectorAll('a.topictitle').forEach(a => {
        const row = a.closest('li,tr'); if (!row) return;
        const fA = row.querySelector('.span-tab a[href*="/f"]') || row.querySelector('a[href*="/f"]');
        const fid = +(((fA && fA.getAttribute('href')) || '').match(/\/f(\d+)-/) || [0, 0])[1];
        const lp = row.querySelector('.lastpost'); if (!lp) return;
        const autor = (lp.querySelector('a[href*="/u"]') || {}).textContent || '';
        const ult = lp.querySelector('a[href*="#"]');
        filas.push({ titulo: a.textContent.trim(), url: abs((a.getAttribute('href') || '').split('?')[0]), tid: tidDe(a.getAttribute('href')), fid,
          autor: autor.trim(), fecha: (lp.textContent.match(FECHA) || [''])[0], ultUrl: ult ? abs(ult.getAttribute('href')) : '' });
      });
    }
    ultimasFilas = filas.slice();
    const cache = gv(K.foros, {});
    /* si el último mensaje es de los Dados Mágicos, cuenta quién escribió antes que los dados */
    await Promise.all(filas.filter(f => f.fid && esBot(f.autor)).map(async f => {
      try {
        let ps = postsDe(await get(f.ultUrl || f.url)).filter(p => !esBot(p.autor));
        if (!ps.length) ps = todosLosPosts(await paginas(f.url)).filter(p => !esBot(p.autor));
        const u = ps[ps.length - 1];
        if (u) { f.autor = u.autor; if (u.fecha) f.fecha = u.fecha; } else f.soloBot = true;
      } catch (e) { f.soloBot = true; }
    }));
    const ajenos = filas.filter(f => f.fid && !f.soloBot && norm(f.autor) !== norm(YO));
    await Promise.all([...new Set(ajenos.map(f => f.fid))].map(fid => esForoDeRol(fid, cache)));
    const res = [];
    for (const f of ajenos) {
      if (res.some(x => x.tid === f.tid) || !(await esForoDeRol(f.fid, cache))) continue;
      res.push(Object.assign(f, { lpid: +((f.ultUrl.match(/#(\d+)/) || [0, 0])[1]) }));
    }
    sv(K.foros, cache);
    await Promise.all(res.filter(f => ES_MISION.test(f.titulo)).map(async f => {
      try { const M = await analizarMision(f); if (M && M.turno) f.mision = M; else f.misionSinTurno = true; } catch (e) { console.warn('[Mi PJ] misión', e); }
    }));
    return res.filter(f => !f.misionSinTurno).sort((a, b) => (aFecha(a.fecha) || 0) - (aFecha(b.fecha) || 0));
  }

  /* ---------------- tema (el mismo de PAM) ---------------- */
  const TEMA_AVADENSE = { skin: 'avadense', ink: '#171a2b', panel: '#1e2236', 'panel-2': '#262a42', parchment: '#F1EADF', 'parchment-dim': '#a7a1b6', gold: '#B49768',
    'gold-bright': '#d6bd8f', 'arcane-bright': '#cf94a3', good: '#93b8a0', bad: '#d98377', 'line-strong': 'rgba(241,234,223,.16)', 'accent-ink': '#1b1e30',
    serif: '"Cormorant Garamond", Georgia, serif', sans: '"Nunito", system-ui, sans-serif' };
  let tema = Object.assign({}, TEMA_AVADENSE, gv(K.tema, {}));
  const familias = () => [tema.serif, tema.sans].map(f => String(f || '').split(',')[0].replace(/["']/g, '').trim()).filter(f => f && !/^(Georgia|system-ui|serif|sans-serif|monospace)$/i.test(f));
  function cargarFuentes() {
    const fams = [...new Set(['Cormorant Garamond', 'Nunito'].concat(familias()))];
    let l = document.getElementById('mipj-fonts'); if (!l) { l = document.createElement('link'); l.id = 'mipj-fonts'; l.rel = 'stylesheet'; document.head.appendChild(l); }
    l.href = 'https://fonts.googleapis.com/css2?' + fams.map(f => 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':ital,wght@0,400;0,600;0,700;1,500').join('&') + '&display=swap';
  }
  let temaEl = null;
  function aplicarTema() {
    if (!temaEl) { temaEl = document.createElement('style'); document.head.appendChild(temaEl); }
    temaEl.textContent = '#mipj,#mipj-modal,.mipj-check,.mipj-of,.esc-ui{' /* canjes */ + Object.entries(tema).filter(([k]) => k !== 'skin').map(([k, v]) => `--m-${k}:${v}`).join(';') + '}';
    document.documentElement.dataset.mipjSkin = tema.skin || 'avadense';
    cargarFuentes();
  }

  const CSS = `
  #mipj,#mipj-modal{--m-r:16px;font-family:var(--m-sans);color:var(--m-parchment);font-size:14px;line-height:1.45;text-align:left}
  #mipj *,#mipj-modal *{box-sizing:border-box}
  #mipj{position:fixed;right:16px;bottom:16px;z-index:99990;width:350px;max-width:calc(100vw - 24px)}
  #mipj .box{position:relative;overflow:hidden;background:radial-gradient(420px 180px at 0% 0%,color-mix(in srgb,var(--m-arcane-bright) 16%,transparent),transparent 70%),linear-gradient(180deg,color-mix(in srgb,var(--m-parchment) 3%,transparent),transparent),var(--m-panel);
    border:1px solid color-mix(in srgb,var(--m-gold) 45%,transparent);border-radius:var(--m-r);box-shadow:0 24px 60px -24px rgba(0,0,0,.75),0 0 0 4px color-mix(in srgb,var(--m-gold) 6%,transparent);max-height:calc(100vh - 32px);display:flex;flex-direction:column}
  #mipj .hd{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;cursor:pointer;user-select:none;border-bottom:1px solid var(--m-line-strong)}
  #mipj .brand{font-family:var(--m-serif);font-style:italic;font-size:20px;color:var(--m-parchment)}
  #mipj .brand i{font-style:normal;color:var(--m-gold-bright);font-size:13px;margin-right:4px}
  #mipj .hd small{margin-left:auto;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--m-parchment-dim)}
  #mipj .hd .car{color:var(--m-parchment-dim);font-size:11px}
  #mipj .bd{padding:14px 16px 6px;overflow:auto;flex:1 1 auto}
  #mipj .grip{position:absolute;left:0;top:0;width:22px;height:22px;cursor:nwse-resize;z-index:3;touch-action:none}
  #mipj .grip::before{content:"";position:absolute;left:6px;top:6px;width:9px;height:9px;border-left:2px solid;border-top:2px solid;border-color:color-mix(in srgb,var(--m-gold) 55%,transparent);border-top-left-radius:5px;transition:border-color .2s}
  #mipj .grip:hover::before,#mipj.moviendo .grip::before{border-color:var(--m-gold-bright)}
  #mipj.moviendo{user-select:none}
  #mipj .hd .zm{display:flex;gap:2px}
  #mipj .hd .zm button{font:700 10.5px var(--m-sans);color:var(--m-parchment-dim);background:none;border:1px solid transparent;border-radius:999px;padding:1px 6px;cursor:pointer;line-height:1.4}
  #mipj .hd .zm button:hover{color:var(--m-gold-bright);border-color:color-mix(in srgb,var(--m-gold) 45%,transparent)}
  #mipj .ct .sp{flex:1}
  #mipj .ct a{letter-spacing:.04em;text-transform:none;font-weight:600;font-size:11px;color:var(--m-parchment-dim);border:0}
  #mipj .ct a:hover{color:var(--m-gold-bright)}
  #mipj .card.fino{padding:7px 13px}#mipj .card.fino .ct{margin:0}
  #mipj .badge.bad{color:var(--m-bad);border-color:var(--m-bad);background:color-mix(in srgb,var(--m-bad) 10%,transparent)}
  #mipj .pill .sd{font-size:14px;line-height:1;color:var(--m-gold-bright)}
  #mipj .of-g,.mipj-of .of-g{color:var(--m-gold-bright)}
  #mipj .of-av,.mipj-of .of-av{margin-top:3px;font-size:12px;color:var(--m-gold-bright)}
  #mipj .of-av.mal,.mipj-of .of-av.mal{color:var(--m-bad);font-weight:700}
  .mipj-of{margin:10px 0;border-radius:14px;font:13.5px/1.5 var(--m-sans);color:var(--m-parchment);text-align:left;
    background:radial-gradient(420px 160px at 0% 0%,color-mix(in srgb,var(--m-arcane-bright) 14%,transparent),transparent 70%),var(--m-panel);border:1px solid color-mix(in srgb,var(--m-gold) 45%,transparent)}
  .mipj-of summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:10px 14px;font-family:var(--m-serif);font-style:italic;font-size:19px;color:var(--m-gold-bright)}
  .mipj-of summary::-webkit-details-marker{display:none}
  .mipj-of summary .ic{font-style:normal;font-size:15px}
  .mipj-of summary small{margin-left:auto;font:600 10.5px var(--m-sans);letter-spacing:.12em;text-transform:uppercase;color:var(--m-parchment-dim)}
  .mipj-of .of-bd{padding:2px 14px 12px;display:grid;gap:4px}
  .mipj-of .of-p b{color:var(--m-parchment)}
  .mipj-of .dim{color:var(--m-parchment-dim);font-size:12px}
  .mipj-of .of-q{display:flex;gap:6px;align-items:center;font-size:12px;margin:1px 0 4px 2px;cursor:pointer;color:var(--m-parchment-dim)}
  .mipj-of .of-bt{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px}
  .mipj-of button.b{font:700 12px var(--m-sans);border-radius:999px;padding:6px 12px;cursor:pointer;border:1px solid var(--m-gold);background:transparent;color:var(--m-gold-bright)}
  .mipj-of button.b:hover{background:color-mix(in srgb,var(--m-gold) 14%,transparent)}
  html[data-mipj-skin="pixel"] .mipj-of{border-radius:0}
  #mipj .rol.mis .rt a{font-style:normal;font-family:var(--m-serif)}
  #mipj .rol.mis .pz{margin-top:2px;font-size:12px;color:var(--m-gold-bright)}
  #mipj .rol.mis.urge .pz{color:var(--m-bad);font-weight:700}
  #mipj .rol.mis.vencida .pz{color:var(--m-bad);font-weight:700;opacity:.8}
  #mipj .rol.mis{border-left:2px solid var(--m-gold);padding-left:8px;margin-left:-2px}
  #mipj .rol.mis.urge{border-left-color:var(--m-bad)}
  #mipj .otras{margin-top:6px}
  #mipj .pill .ms{font-size:12px;font-weight:700;color:var(--m-bad)}
  #mipj .nmrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  #mipj .nmrow .nm{flex:1;min-width:0}
  #mipj .rbtn{font:700 11.5px var(--m-sans);color:var(--m-gold-bright);background:color-mix(in srgb,var(--m-gold) 10%,transparent);border:1px solid color-mix(in srgb,var(--m-gold) 50%,transparent);border-radius:999px;padding:5px 11px;cursor:pointer;white-space:nowrap;transition:background .2s,border-color .2s}
  #mipj .rbtn:hover{border-color:var(--m-gold-bright);background:color-mix(in srgb,var(--m-gold) 18%,transparent)}
  #mipj .rbtn.on{background:var(--m-gold);color:var(--m-accent-ink);border-color:var(--m-gold)}
  #mipj .rsrc{margin-top:4px;font-size:11px;color:var(--m-parchment-dim);letter-spacing:.02em}
  #mipj .rapido .rq{width:100%;margin:10px 0 0;padding:8px 12px;border-radius:999px;border:1px solid var(--m-line-strong);background:color-mix(in srgb,var(--m-panel-2) 80%,transparent);color:var(--m-parchment);font:13px var(--m-sans);outline:none}
  #mipj .rapido .rq:focus{border-color:var(--m-gold)}
  #mipj .rapido [hidden]{display:none!important}
  #mipj .rgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
  #mipj .rgrid.a{grid-template-columns:repeat(4,1fr)}
  #mipj .rst{text-align:center;padding:6px 4px;border-radius:10px;background:color-mix(in srgb,var(--m-panel) 70%,transparent);border:1px solid var(--m-line-strong);cursor:copy;transition:border-color .2s}
  #mipj .rst:hover{border-color:var(--m-gold)}
  #mipj .rst b{display:block;font-family:var(--m-serif);font-size:19px;font-weight:600;color:var(--m-gold-bright);line-height:1.1}
  #mipj .rst small{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--m-parchment-dim)}
  #mipj .rgrp{display:flex;justify-content:space-between;margin:9px 0 2px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--m-parchment-dim);font-weight:700;border-bottom:1px solid var(--m-line-strong);padding-bottom:2px}
  #mipj .rgrp span{color:var(--m-gold-bright);letter-spacing:0;font-size:11.5px}
  #mipj .rrow{display:grid;grid-template-columns:1fr auto 14px;gap:8px;align-items:baseline;padding:4px 6px;border-radius:7px;font-size:13px;cursor:pointer;user-select:none}
  #mipj .rrow .rx{color:var(--m-parchment-dim);font-size:10px;transition:transform .2s;text-align:center}
  #mipj .rit.abierto > .rrow{background:color-mix(in srgb,var(--m-gold) 10%,transparent)}
  #mipj .rit.abierto .rx{transform:rotate(90deg);color:var(--m-gold-bright)}
  #mipj .rdet{margin:2px 0 6px 6px;padding:7px 10px;border-left:2px solid color-mix(in srgb,var(--m-gold) 55%,transparent);display:grid;gap:4px;font-size:12.5px}
  #mipj .rcalc{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  #mipj .rcalc span{flex:1;min-width:0;color:var(--m-parchment)}
  #mipj .rcp{font:700 11px var(--m-sans);border-radius:999px;padding:3px 10px;cursor:pointer;border:1px solid color-mix(in srgb,var(--m-gold) 55%,transparent);background:transparent;color:var(--m-gold-bright)}
  #mipj .rcp:hover{background:color-mix(in srgb,var(--m-gold) 14%,transparent)}
  #mipj .rtir{font-size:10px!important;letter-spacing:.06em!important;text-transform:none;color:var(--m-parchment-dim)!important}
  #mipj .radv{font-size:12.5px;margin:4px 0;color:var(--m-parchment)}
  #mipj .radv b{color:var(--m-gold-bright)}
  #mipj .rrow:hover{background:color-mix(in srgb,var(--m-gold) 10%,transparent)}
  #mipj .rrow .rn i{font-style:normal;font-size:10px;color:var(--m-parchment-dim);text-transform:uppercase;letter-spacing:.08em}
  #mipj .rrow .rl{font-size:11px;color:var(--m-parchment-dim)}
  #mipj .rrow .rl{color:var(--m-gold-bright)}#mipj .rrow .rl.cero{color:var(--m-parchment-dim)}
  #mipj .rrow .rp{text-align:right;font-size:11.5px;color:var(--m-parchment-dim);font-variant-numeric:tabular-nums}
  #mipj .rit.cero{opacity:.62}
  #mipj .rit.esp .rn{padding-left:12px;color:var(--m-parchment-dim);font-size:12px}#mipj .rrow .rl{white-space:nowrap}
  #mipj .rleg{font-size:9.5px;letter-spacing:.08em;color:var(--m-parchment-dim);font-weight:600;white-space:nowrap}
  #mipj .rdif{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12px;color:var(--m-parchment-dim)}
  #mipj .rdif b{color:var(--m-parchment);font-variant-numeric:tabular-nums}
  #mipj .copiado{border-color:var(--m-good)!important;background:color-mix(in srgb,var(--m-good) 16%,transparent)!important}
  #mipj .nm{font-family:var(--m-serif);font-style:italic;font-weight:500;font-size:26px;line-height:1.1;margin:0;
    background:linear-gradient(100deg,var(--m-gold-bright) 10%,var(--m-parchment) 55%,var(--m-arcane-bright) 95%);-webkit-background-clip:text;background-clip:text;color:transparent}
  #mipj .rule{display:flex;align-items:center;gap:10px;color:var(--m-gold);font-size:11px;margin:8px 0 6px}
  #mipj .rule::before,#mipj .rule::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--m-gold) 60%,transparent),transparent)}
  #mipj .big{font-family:var(--m-serif);font-weight:600;font-size:40px;line-height:1;color:var(--m-gold-bright);text-align:center}
  #mipj .big span{font-size:17px;font-style:italic;color:var(--m-parchment-dim);font-weight:500;margin-left:6px}
  #mipj .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0 4px}
  #mipj .stat{text-align:center;padding:6px 4px;border-radius:10px;background:color-mix(in srgb,var(--m-panel-2) 80%,transparent);border:1px solid var(--m-line-strong)}
  #mipj .stat b{display:block;font-family:var(--m-serif);font-size:17px;font-weight:600;color:var(--m-parchment)}
  #mipj .stat small{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--m-parchment-dim)}
  #mipj .card{margin-top:12px;padding:11px 13px;border-radius:12px;background:color-mix(in srgb,var(--m-panel-2) 70%,transparent);border:1px solid var(--m-line-strong)}
  #mipj .ct{display:flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--m-gold-bright);font-weight:700;margin-bottom:6px}
  #mipj .ct .n{margin-left:auto;letter-spacing:0;font-size:11px;padding:1px 8px;border-radius:999px;background:color-mix(in srgb,var(--m-gold) 18%,transparent);color:var(--m-gold-bright)}
  #mipj a{color:var(--m-gold-bright);text-decoration:none;border-bottom:1px dotted color-mix(in srgb,var(--m-gold) 60%,transparent)}
  #mipj a:hover{color:var(--m-parchment)}
  #mipj .tl{font-family:var(--m-serif);font-size:17px;font-style:italic}
  #mipj .badge{display:inline-flex;align-items:center;gap:6px;margin:6px 0 2px;padding:2px 10px;border-radius:999px;border:1px solid;font-size:11.5px;font-weight:700}
  #mipj .badge.warn{color:var(--m-gold-bright);border-color:var(--m-gold);background:color-mix(in srgb,var(--m-gold) 10%,transparent)}
  #mipj .badge.ok{color:var(--m-good);border-color:var(--m-good);background:color-mix(in srgb,var(--m-good) 10%,transparent)}
  #mipj .row{margin-top:3px;color:var(--m-parchment);font-size:13px}
  #mipj .dim{color:var(--m-parchment-dim);font-size:12.5px}
  #mipj .neg{color:var(--m-bad);font-weight:700}#mipj .pos{color:var(--m-good);font-weight:700}
  #mipj .nota{margin-top:8px;padding:8px 10px;border-radius:10px;border-left:3px solid var(--m-gold);background:color-mix(in srgb,var(--m-gold) 12%,transparent);font-size:12.5px;font-style:italic}
  #mipj .rol{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px dashed var(--m-line-strong)}
  #mipj .ct + .rol{border-top:0;padding-top:2px}
  #mipj .rol .rt{flex:1;min-width:0}
  #mipj .rol .rt a{font-family:var(--m-serif);font-size:15.5px;font-style:italic;border:0;line-height:1.2}
  #mipj .rol .d{white-space:nowrap;font-size:11.5px;color:var(--m-parchment-dim);padding-top:2px}
  #mipj .rol .d.old{color:var(--m-bad);font-weight:700}
  #mipj .rol button.x{background:none;border:0;color:var(--m-parchment-dim);padding:2px;font-size:13px;cursor:pointer;line-height:1}
  #mipj .rol button.x:hover{color:var(--m-bad)}
  #mipj .ft{display:flex;align-items:center;gap:8px;padding:10px 16px 12px;border-top:1px solid var(--m-line-strong)}
  #mipj .ft .sp{flex:1;font-size:11px;color:var(--m-parchment-dim);line-height:1.3}
  #mipj button.b,#mipj-modal button.b{font:700 12.5px var(--m-sans);border-radius:999px;padding:8px 14px;cursor:pointer;border:1px solid var(--m-line-strong);background:color-mix(in srgb,var(--m-panel-2) 90%,transparent);color:var(--m-parchment);transition:border-color .2s,transform .2s}
  #mipj button.b:hover,#mipj-modal button.b:hover{border-color:var(--m-gold);transform:translateY(-1px)}
  #mipj button.b.pri,#mipj-modal button.b.pri{background:var(--m-gold);border-color:var(--m-gold);color:var(--m-accent-ink)}
  #mipj button.b:disabled{opacity:.5;cursor:default;transform:none}
  #mipj .err{color:var(--m-bad);font-size:12px;margin:8px 0}
  #mipj .pill{display:flex;align-items:center;gap:10px;margin-left:auto;width:max-content;padding:8px 16px;border-radius:999px;cursor:pointer;
    background:var(--m-panel);border:1px solid color-mix(in srgb,var(--m-gold) 50%,transparent);box-shadow:0 14px 34px -14px rgba(0,0,0,.7)}
  #mipj .pill .brand{font-size:17px}
  #mipj .pill b{font-family:var(--m-serif);font-size:17px;color:var(--m-gold-bright)}
  #mipj .pill .n{font-size:11px;font-weight:700;padding:1px 8px;border-radius:999px;background:var(--m-arcane-bright);color:var(--m-accent-ink)}
  #mipj .pill .dot{width:8px;height:8px;border-radius:50%;background:var(--m-gold-bright)}
  .mipj-check{margin:8px 0;padding:9px 14px;border-radius:12px;font:600 13px var(--m-sans);display:flex;gap:10px;align-items:center;cursor:pointer;text-align:left;
    background:var(--m-panel);color:var(--m-parchment);border:1px solid var(--m-line-strong)}
  .mipj-check .ic{font-family:var(--m-serif);font-size:18px;line-height:1}
  .mipj-check.ok{border-color:color-mix(in srgb,var(--m-good) 60%,transparent)} .mipj-check.ok .ic{color:var(--m-good)}
  .mipj-check.mal{border-color:var(--m-bad)} .mipj-check.mal .ic{color:var(--m-bad)}
  .mipj-check small{color:var(--m-parchment-dim);font-weight:500;margin-left:auto;font-size:11px}
  #mipj-modal{position:fixed;inset:0;z-index:99999;background:rgba(8,7,14,.6);display:flex;align-items:center;justify-content:center;padding:16px}
  #mipj-modal .mb{width:min(520px,100%);max-height:90vh;overflow:auto;border-radius:var(--m-r);padding:20px 22px;background:radial-gradient(500px 200px at 0% 0%,color-mix(in srgb,var(--m-arcane-bright) 14%,transparent),transparent 70%),var(--m-panel);border:1px solid var(--m-gold);box-shadow:0 30px 80px -30px #000}
  #mipj-modal h3{margin:0 0 4px;font-family:var(--m-serif);font-style:italic;font-weight:500;font-size:28px;color:var(--m-gold-bright)}
  #mipj-modal p{margin:6px 0 10px;color:var(--m-parchment-dim)}
  #mipj-modal ul{margin:0 0 14px;padding:0;list-style:none}
  #mipj-modal li{padding:8px 10px;margin:6px 0;border-radius:10px;border-left:3px solid var(--m-bad);background:color-mix(in srgb,var(--m-bad) 10%,transparent);color:var(--m-parchment)}
  #mipj-modal .bt{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
  html[data-mipj-skin="pixel"] #mipj .box,html[data-mipj-skin="pixel"] #mipj .card,html[data-mipj-skin="pixel"] #mipj .stat,html[data-mipj-skin="pixel"] #mipj button.b,html[data-mipj-skin="pixel"] #mipj .pill,html[data-mipj-skin="pixel"] #mipj-modal .mb{border-radius:0}
  @media (max-width:520px){#mipj{right:8px;bottom:8px}}`;

  /* ---------------- panel ---------------- */
  let datos = gv(K.datos, null), cargando = false, error = '';
  const ui = Object.assign({ abierto: window.innerWidth > 600 }, gv(K.ui, {}));
  const ocultos = gv(K.ocultos, {});
  const rolesTodos = () => ((datos && datos.roles) || []).filter(r => !(ocultos[r.tid] && ocultos[r.tid] >= r.lpid));
  const esViejo = r => { if (r.mision) return false; const n = dias(aFecha(r.fecha)); return n != null && n > DIAS_ROL; };
  const rolesVisibles = () => { const L = rolesTodos().filter(r => !esViejo(r)); const M = L.filter(r => r.mision).sort((a, b) => (a.mision.vence || 9e15) - (b.mision.vence || 9e15)); return M.concat(L.filter(r => !r.mision)); };
  /* misiones con turno en tus otras cuentas (lo que leyó Mi PJ la última vez que entraste con cada una) */
  function misionesOtras() {
    const C = gv('mipj.cuentas', {}), out = [];
    Object.keys(C).forEach(uid => {
      if (String(uid) === String(UID)) return;
      const d = gv('mipj.' + uid, null), oc = gv('mipj.ocultos.' + uid, {});
      ((d && d.roles) || []).filter(r => r.mision && !(oc[r.tid] && oc[r.tid] >= r.lpid) && (!r.mision.vence || r.mision.vence > Date.now() - 3 * 864e5))
        .forEach(r => out.push({ r, cuenta: (d && d.pj) || C[uid].nombre, leido: d && d.leido }));
    });
    return out.sort((a, b) => (a.r.mision.vence || 9e15) - (b.r.mision.vence || 9e15));
  }

  const stEl = document.createElement('style'); stEl.textContent = CSS; document.head.appendChild(stEl);
  const BIB = crearBibliotecaOficiales({ PAM_URL, alEscanear: () => pintar() });
  aplicarTema();
  const root = document.createElement('div'); root.id = 'mipj'; document.body.appendChild(root);
  const leidoTxt = iso => { try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

  function pintar() {
    const B = datos && datos.boveda, F = datos && datos.ficha, R = rolesVisibles();
    const pend = F && F.estado === 'pendiente';
    if (!ui.abierto) {
      root.innerHTML = `<div class="pill" data-a="abrir" title="Abrir Mi PJ"><span class="brand"><i>✦</i>Mi PJ</span>${B && B.act != null ? `<b>${fmt(B.act)}</b>` : ''}${R.length ? `<span class="n" title="Roles donde te toca responder">${R.length}</span>` : ''}${(() => { const u = R.filter(r => r.mision && r.mision.vence && r.mision.vence - Date.now() < 864e5).length + misionesOtras().filter(x => x.r.mision.vence && x.r.mision.vence - Date.now() < 864e5 && x.r.mision.vence > Date.now()).length; return u ? `<span class="ms" title="Turnos de misión que vencen en menos de 24 h">⚔${u}</span>` : ''; })()}${sueldoPendiente() ? `<span class="sd" title="${SUELDO_TXT[sueldoPendiente()]}">⚜</span>` : ''}${pend ? '<span class="dot" title="Ficha pendiente de revisión"></span>' : ''}</div>`;
      return;
    }
    let h = `<div class="box"><span class="grip" title="Arrastrá para cambiar el tamaño · doble clic: tamaño normal"></span><div class="hd" data-a="cerrar" title="Minimizar"><span class="brand"><i>✦</i>Mi PJ</span><small>HP Avada Kedavra</small>
      <span class="zm"><button data-a="zoom-" title="Achicar el texto" aria-label="Achicar el texto">A−</button><button data-a="zoom+" title="Agrandar el texto" aria-label="Agrandar el texto">A+</button></span><span class="car">▾</span></div><div class="bd">`;
    h += `<div class="nmrow"><h3 class="nm">${esc((datos && datos.pj) || YO)}</h3>${datos ? `<button class="rbtn${ui.rapido ? ' on' : ''}" data-a="rapido" title="Atributos, habilidades y combate para tus tiradas">${ui.rapido ? '← Volver' : '⚡ Acceso rápido'}</button>` : ''}</div>`;
    if (datos && ui.rapido) h += vistaRapida();
    else if (!datos) h += `<p class="dim">${cargando ? 'Leyendo tu ficha, tu bóveda y tus roles…' : 'Tocá «Actualizar» para leer tu ficha y tu bóveda.'}</p>`;
    else {
      if (B) h += `<div class="rule">☾</div><div class="big">${fmt(B.act)}<span>grageas</span></div>
        <div class="stats"><div class="stat"><b>${fmt(B.tot)}</b><small>Totales</small></div><div class="stat"><b>${fmt(B.ini)}</b><small>Iniciales</small></div><div class="stat"><b>${B.pla != null ? fmt(B.pla) + '<span class="dim"> / ' + fmt(B.plt) + '</span>' : '—'}</b><small>Legendarios</small></div></div>`;
      h += `<div class="card"><div class="ct">✒ Te toca responder${R.length ? `<span class="n">${R.length}</span>` : ''}</div>`;
      if (!datos.roles) h += `<div class="dim">${cargando ? 'Buscando…' : 'Tocá «Actualizar».'}</div>`;
      else if (!R.length) h += `<div class="dim">Estás al día con todos tus roles ✦</div>`;
      else h += R.slice(0, ui.todos ? 60 : 5).map(r => { if (r.mision) return filaMision(r); const d = aFecha(r.fecha), n = dias(d);
        return `<div class="rol"><div class="rt"><a href="${esc(r.ultUrl || r.url)}">${esc(r.titulo)}</a><div class="dim">Respondió ${esc(r.autor || 'alguien')}</div></div><span class="d ${n != null && n >= 7 ? 'old' : ''}">${esc(haceTxt(d))}</span><button class="x" data-a="ocultar" data-t="${r.tid}" data-l="${r.lpid}" title="No me toca o ya terminó (vuelve a aparecer si hay un mensaje nuevo)">✕</button></div>`; }).join('')
        + (R.length > 5 ? `<div class="row"><a href="#" data-a="todos">${ui.todos ? 'Ver menos' : `Ver los ${R.length}`}</a></div>` : '');
      const O = misionesOtras();
      if (O.length) h += `<div class="otras"><div class="rgrp">Tus otras cuentas</div>${O.map(x => filaMision(x.r, x.cuenta)).join('')}<div class="dim" style="margin-top:4px">Según la última vez que entraste con cada cuenta.</div></div>`;
      const V = rolesTodos().filter(esViejo);
      if (V.length) h += ui.viejos ? `<div class="row dim" style="margin-top:8px">Sin movimiento hace más de ${DIAS_ROL} días:</div>` + V.map(r => `<div class="rol"><div class="rt"><a href="${esc(r.ultUrl || r.url)}">${esc(r.titulo)}</a><div class="dim">Respondió ${esc(r.autor || 'alguien')}</div></div><span class="d">${esc(haceTxt(aFecha(r.fecha)))}</span><button class="x" data-a="ocultar" data-t="${r.tid}" data-l="${r.lpid}" title="Ya terminó">✕</button></div>`).join('') + `<div class="row"><a href="#" data-a="viejos">Ocultar los viejos</a></div>`
        : `<div class="row dim" style="margin-top:6px">y ${V.length} ${V.length === 1 ? 'rol viejo' : 'roles viejos'} (más de ${DIAS_ROL} días quietos) · <a href="#" data-a="viejos">ver</a></div>`;
      h += `</div>`;
      h += tarjetaOficiales();
      h += tarjetaSueldo();
      h += `<div class="card"><div class="ct">❖ Ficha</div>${F ? `<a class="tl" href="${esc(F.url)}">${esc(F.titulo)}</a><br>
        <span class="badge ${pend ? 'warn' : 'ok'}">${pend ? '◷ Pendiente de revisión' : '✓ Revisada'}</span>
        <div class="row">${F.sello ? `Último sello: ${esc(F.sello.fecha)}${F.sello.autor ? ` <span class="dim">· ${esc(F.sello.autor)}</span>` : ''}` : 'Todavía sin sello'}</div>
        <div class="dim">Código leído · ${fmt(F.codigo ? F.codigo.length : 0)} caracteres</div>` : '<div class="dim">No encontré tu ficha.</div>'}</div>`;
      h += `<div class="card"><div class="ct">⛁ Bóveda</div>${B ? `<a class="tl" href="${esc(B.url)}">${esc(B.titulo)}</a>
        ${(B.movs || []).map(m => `<div class="row"><span class="${m.d < 0 ? 'neg' : 'pos'}">${m.d == null ? '' : (m.d > 0 ? '+' : '') + fmt(m.d)}</span> → ${fmt(m.act)} <span class="dim">· ${esc(m.fecha)}</span></div>`).join('')}
        ${B.revision ? `<div class="row dim">Última revisión: ${esc(B.revision.autor)}, ${esc(B.revision.fecha)}</div>` : ''}
        ${B.nota ? `<div class="nota">Nota de ${esc(B.nota.autor)}: ${esc(B.nota.texto)}</div>` : ''}` : '<div class="dim">No encontré tu bóveda en el Panel de Bóvedas.</div>'}</div>`;
    }
    if (!(datos && ui.rapido)) {
      const rb = BIB.resumen();
      h += `<div class="card"><div class="ct">📜 Biblioteca de oficiales<span class="sp"></span><a href="#" data-a="oficiales">abrir</a></div>${rb
        ? `<div class="row">${rb.libres} libres · ${rb.abandonados} abandonados${rb.favs ? ` · ★ ${rb.favs}` : ''}</div><div class="dim">Último escaneo: ${esc(leidoTxt(rb.fecha))}</div>`
        : '<div class="dim">Biblioteca de sucesos de El Profeta: cuáles están libres, en curso o abandonados. Marcalos con ★ y pasalos a PAM.</div>'}
        <div class="row" style="margin-top:6px"><button class="b" data-a="oficiales">Abrir la biblioteca</button></div></div>`;
      h += '<div class="card" id="mipj-canjes"></div>'; /* canjes */
    }
    if (error) h += `<div class="err">${esc(error)}</div>`;
    h += `</div><div class="ft"><span class="sp">${datos ? 'Leído<br>' + esc(leidoTxt(datos.leido)) : ''}</span>
      <button class="b" data-a="act" ${cargando ? 'disabled' : ''}>${cargando ? 'Leyendo…' : 'Actualizar'}</button>
      <button class="b pri" data-a="pam" ${datos ? '' : 'disabled'} title="Abre PAM y te muestra qué se va a cambiar antes de aplicarlo">Enviar a PAM</button></div></div>`;
    root.innerHTML = h;
    ESC.pintarCanje(root.querySelector('#mipj-canjes')); /* canjes */
    if (ui.rapido && ui.rapidoQ) filtrarRapido(ui.rapidoQ);
  }

  async function actualizar() {
    if (cargando) return; cargando = true; error = ''; pintar();
    try {
      /* CANJES: ficha y bóveda se ubican por los campos del perfil; si no están, se buscan */
      const [foto, roles, sueldo] = await Promise.all([
        ESC.leer().catch(e => { console.warn('[Mi PJ] perfil', e); return null; }),
        leerRoles().catch(e => { console.warn('[Mi PJ] roles', e); return null; }),
        leerSueldo().catch(e => { console.warn('[Mi PJ] sueldo', e); return null; })]);
      const M = ESC.aMiPJ(foto);
      const ficha = M.ficha || await leerFicha().catch(e => { console.warn('[Mi PJ] ficha', e); return null; });
      /* los números de la bóveda siempre con el lector de Mi PJ: entiende el formulario, la caja automática y el estilo libre */
      let boveda = M.boveda ? await leerBoveda(M.boveda.url).catch(e => { console.warn('[Mi PJ] bóveda', e); return null; }) : null;
      if (boveda && M.boveda) boveda = Object.assign({}, M.boveda, boveda);
      if (!boveda) boveda = await leerBoveda().catch(e => { console.warn('[Mi PJ] bóveda', e); return null; }) || M.boveda;
      if (foto && foto.errores && foto.errores.length && !(ficha && boveda)) error = foto.errores.join(' ');
      const oficiales = await leerMisOficiales().catch(e => { console.warn('[Mi PJ] oficiales', e); return (datos && datos.oficiales) || []; });
      datos = { v: 2, cuenta: YO, pj: M.pj || YO, uid: UID, leido: new Date().toISOString(), ficha, boveda, roles, sueldo, oficiales };
      sv(K.datos, datos);
      const C = gv('mipj.cuentas', {}); C[UID] = { nombre: YO, leido: datos.leido }; sv('mipj.cuentas', C);
    } catch (e) { error = 'No se pudo leer el foro: ' + e.message; }
    cargando = false; pintar();
  }

  function enviarAPam(op) {
    if (!datos) return;
    /* canjes: el canal oficial de PAM solo acepta el foro real; en el de pruebas va por el almacén */
    if (!ESC.canalOficial()) { const err = ESC.enviarPorAlmacen(); if (err) { error = err; pintar(); } return; }
    ESC.dejarContextoPAM();
    const w = window.open(PAM_URL + '#foro', 'pam');
    if (!w) { error = 'El navegador bloqueó la ventana de PAM: permití ventanas emergentes para el foro.'; pintar(); return; }
    let ok = false, n = 0;
    const onMsg = e => {
      if (e.origin !== PAM_ORIGIN || !e.data || !e.data.pamForoOk) return;
      ok = true; window.removeEventListener('message', onMsg);
      if (e.data.tema) { tema = Object.assign({}, TEMA_AVADENSE, e.data.tema); sv(K.tema, e.data.tema); aplicarTema(); pintar(); }
    };
    window.addEventListener('message', onMsg);
    const enviar = () => { const t = setInterval(() => {
      if (ok || ++n > 60) { clearInterval(t); if (!ok) { error = 'PAM no respondió. ¿Está actualizado a la última versión?'; pintar(); } return; }
      try { w.postMessage({ pamForo: 1, data: Object.assign({}, datos, { cuenta: datos.pj || YO }) }, PAM_ORIGIN); } catch (e) {}
    }, 500); };
    /* canjes: tras aplicar un canje, primero se cierra en PAM y luego se mandan los datos */
    if (op && op.esperarCierre) {
      const alCierre = e => { if (e.origin !== PAM_ORIGIN || !e.data || !e.data.escribaCierre) return; window.removeEventListener('message', alCierre); enviar(); };
      window.addEventListener('message', alCierre);
    } else enviar();
  }
  /* canjes: lo que los canjes usan del panel */
  PUENTE.enviarAPam = enviarAPam;
  PUENTE.actualizar = actualizar;
  PUENTE.repintar = pintar;
  PUENTE.abrirPanel = () => { ui.abierto = true; sv(K.ui, ui); pintar(); };

  root.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return;
    const k = a.dataset.a;
    if (k === 'cerrar') { ui.abierto = false; sv(K.ui, ui); pintar(); }
    else if (k === 'abrir') { ui.abierto = true; sv(K.ui, ui); pintar(); }
    else if (k === 'act') actualizar();
    else if (k === 'pam') enviarAPam();
    else if (k === 'todos') { e.preventDefault(); ui.todos = !ui.todos; sv(K.ui, ui); pintar(); }
    else if (k === 'viejos') { e.preventDefault(); ui.viejos = !ui.viejos; sv(K.ui, ui); pintar(); }
    else if (k === 'ocultar') { ocultos[a.dataset.t] = +a.dataset.l || 1; sv(K.ocultos, ocultos); pintar(); }
    else if (k === 'zoom-' || k === 'zoom+') { ui.zoom = Math.min(1.4, Math.max(0.8, Math.round(((ui.zoom || 1) + (k === 'zoom+' ? 0.1 : -0.1)) * 10) / 10)); sv(K.ui, ui); aplicarTam(); }
    else if (k === 'oficiales') { e.preventDefault(); BIB.abrir(); }
    else if (k === 'pam-abrir') { window.open(PAM_URL + '#ficha', 'pam'); }
    else if (k === 'rapido') { ui.rapido = !ui.rapido; ui.rapidoQ = ''; sv(K.ui, ui); pintar(); const bd = root.querySelector('.bd'); if (bd) bd.scrollTop = 0; }
    else if (k === 'sueldo-ocultar' || k === 'sueldo-ver') { e.preventDefault(); ui.sinSueldo = k === 'sueldo-ocultar'; sv(K.ui, ui); pintar(); }
  });

  /* acceso rápido: buscar y copiar */
  root.addEventListener('input', e => { if (!e.target.matches('.rq')) return; ui.rapidoQ = e.target.value; filtrarRapido(ui.rapidoQ); });
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-copiar]'); if (c && root.contains(c)) { copiarTexto(c.dataset.copiar, c); return; }
    const r = e.target.closest('[data-abrir]'); if (r && root.contains(r)) { const it = r.parentElement, d = it.querySelector('.rdet'); d.hidden = !d.hidden; it.classList.toggle('abierto', !d.hidden); }
  });
  root.addEventListener('keydown', e => { const r = e.target.closest && e.target.closest('[data-abrir]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); r.click(); } });

  /* ---------------- tamaño de la ventana: arrastrar la esquina, A− / A+ ---------------- */
  const tamEl = document.createElement('style'); tamEl.id = 'mipj-tam'; document.head.appendChild(tamEl);
  const entre = (v, a, b) => Math.min(b, Math.max(a, v));
  function aplicarTam() {
    const z = ui.zoom || 1, W0 = window.innerWidth - 24, H0 = window.innerHeight - 32;
    let c = '';
    if (ui.ancho) c += `#mipj{width:${Math.round(entre(ui.ancho, 280, W0))}px}`;
    if (z !== 1) c += `#mipj .box{zoom:${z};max-height:${Math.round(H0 / z)}px}`;
    if (ui.alto) c += `#mipj .box{height:${Math.round(entre(ui.alto, 240, H0) / z)}px}`;
    tamEl.textContent = c;
  }
  aplicarTam();
  window.addEventListener('resize', aplicarTam);
  root.addEventListener('pointerdown', e => {
    if (!e.target.closest('.grip')) return;
    e.preventDefault();
    const box = root.querySelector('.box'); if (!box) return;
    const r0 = box.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
    root.classList.add('moviendo');
    const mover = ev => { ui.ancho = Math.round(r0.width + (x0 - ev.clientX)); ui.alto = Math.round(r0.height + (y0 - ev.clientY)); aplicarTam(); };
    const soltar = () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); root.classList.remove('moviendo'); sv(K.ui, ui); };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
  });
  root.addEventListener('dblclick', e => { if (!e.target.closest('.grip')) return; delete ui.ancho; delete ui.alto; ui.zoom = 1; sv(K.ui, ui); aplicarTam(); });

  /* ======================= Revisar la bóveda antes de publicar ======================= */
  const limpio = t => String(t || '').replace(/<[^>]+>/g, ' ').replace(/\[\/?[a-z*][^\]]*\]/gi, ' ').replace(/&nbsp;/g, ' ');
  const sumaDelta = t => { const ns = String(t || '').replace(/\([^)]*\)/g, ' ').match(/[+\-−]\s*\d[\d.,]*|\d[\d.,]*/g) || []; return ns.reduce((s, x) => s + (num(x) || 0), 0); };
  function bloques(texto, rotulo) {
    const T = limpio(texto), out = [];
    const re = new RegExp(`${rotulo}\\s+iniciales\\s*»\\s*:?([\\s\\S]*?)(?=${rotulo}\\s+iniciales\\s*»|$)`, 'gi'); let m;
    while ((m = re.exec(T))) {
      const s = m[1], campo = n => { const x = s.match(new RegExp(`${n}\\s*»\\s*:?\\s*([^{\\n]*)`, 'i')); return x ? x[1].trim() : null; };
      out.push({ ini: num(s.split(/[{\n]/)[0]), dTxt: campo(`${rotulo}\\s+que\\s+se\\s+añaden\\s*\\/\\s*quitan`), act: num(campo(`${rotulo}\\s+actuales`)), tot: num(campo(`${rotulo}\\s+totales`)), enl: campo('Enlaces') });
    }
    return out;
  }
  function revisar(texto, ref) {
    const prob = [];
    [['Grageas', 'Grageas', ref && { act: ref.act, tot: ref.tot }], ['Puntos\\s+Legendarios', 'Puntos Legendarios', ref && { act: ref.pla, tot: ref.plt }]].forEach(([rot, nombre, r0]) => {
      const bs = bloques(texto, rot); let prev = r0 && r0.act != null ? r0 : null;
      bs.forEach((b, i) => {
        const n = bs.length > 1 ? ` (movimiento ${i + 1})` : '';
        const d = sumaDelta(b.dTxt);
        if (b.ini == null || b.act == null) { prob.push(`<b>${nombre}${n}:</b> falta algún número del formulario.`); return; }
        if (prev && prev.act != null && b.ini !== prev.act) prob.push(`<b>${nombre}${n}:</b> las iniciales dicen ${fmt(b.ini)}, pero ${i ? 'el movimiento anterior terminó' : 'tu bóveda está'} en ${fmt(prev.act)}.`);
        if (b.ini + d !== b.act) prob.push(`<b>${nombre}${n}:</b> ${fmt(b.ini)} ${d < 0 ? '−' : '+'} ${fmt(Math.abs(d))} da ${fmt(b.ini + d)}, no ${fmt(b.act)}.`);
        if (b.act < 0) prob.push(`<b>${nombre}${n}:</b> quedarías en negativo (${fmt(b.act)}).`);
        if (prev && prev.tot != null && b.tot != null && b.tot !== prev.tot + Math.max(d, 0)) prob.push(`<b>${nombre}${n}:</b> las totales deberían ser ${fmt(prev.tot + Math.max(d, 0))} (lo que gastás no resta de las totales), no ${fmt(b.tot)}.`);
        if (!b.enl || b.enl.replace(/[\s|·✦—-]/g, '').length < 3) prob.push(`<b>${nombre}${n}:</b> faltan los enlaces (son obligatorios).`);
        prev = { act: b.act, tot: b.tot != null ? b.tot : (prev && prev.tot) };
      });
    });
    /* estilo libre: «Grageas actuales: X» + líneas «+N grageas por…» = «Grageas restantes: Y» */
    [['grageas', 'Grageas', ref && ref.act], ['puntos\\s+legendarios', 'Puntos Legendarios', ref && ref.pla]].forEach(([rot, nombre, r0]) => {
      const T = limpio(texto);
      const ra = new RegExp(`${rot}\\s+actuales\\s*[:»]?\\s*([\\d.,]+)([\\s\\S]*?)${rot}\\s+restantes\\s*[:»]?\\s*([\\d.,]+)`, 'i');
      const m = T.match(ra); if (!m || /\{/.test(m[2])) return;
      const ini = num(m[1]), fin = num(m[3]);
      const deltas = [...m[2].matchAll(new RegExp(`([+\\-−]\\s?\\d[\\d.,]*)\\s*${rot}`, 'gi'))].map(x => num(x[1]));
      const d = deltas.reduce((a, b) => a + b, 0);
      if (r0 != null && ini !== r0) prob.push(`<b>${nombre}:</b> empezás con ${fmt(ini)}, pero tu bóveda está en ${fmt(r0)}.`);
      if (deltas.length && ini + d !== fin) prob.push(`<b>${nombre}:</b> ${fmt(ini)} ${d < 0 ? '−' : '+'} ${fmt(Math.abs(d))} da ${fmt(ini + d)}, no ${fmt(fin)}.`);
      if (fin < 0) prob.push(`<b>${nombre}:</b> quedarías en negativo (${fmt(fin)}).`);
    });
    const inv = limpio(texto).match(/Nuevo\s+inventario\s*»([\s\S]*?)(?:Enlaces\s*»([^{\n]*)|$)/i);
    if (inv && (!inv[2] || inv[2].replace(/[\s|·✦—-]/g, '').length < 3)) prob.push('<b>Inventario:</b> faltan los enlaces (son obligatorios).');
    return prob;
  }
  const tieneFormulario = t => /(Grageas|Puntos\s+Legendarios)\s+iniciales\s*»|Nuevo\s+inventario\s*»|(Grageas|Puntos\s+Legendarios)\s+restantes\s*[:»]/i.test(limpio(t));
  function textoEditor(ta) {
    try { const $ = W.jQuery || W.$; const inst = $ && $(ta).sceditor && $(ta).sceditor('instance'); if (inst && inst.val) return inst.val(); } catch (e) {}
    return ta.value;
  }
  const tidActual = () => { const m = location.pathname.match(/^\/t(\d+)/); if (m) return +m[1]; return +(new URLSearchParams(location.search).get('t') || 0); };
  const refBoveda = () => { const B = datos && datos.boveda; return B && B.tid && B.tid === tidActual() ? B : null; };
  function modal(probs, alSeguir) {
    const m = document.createElement('div'); m.id = 'mipj-modal';
    m.innerHTML = `<div class="mb" role="dialog" aria-modal="true"><h3>Antes de publicar</h3><p>Revisé el formulario de la bóveda y ${probs.length === 1 ? 'hay algo que no cuadra' : `hay ${probs.length} cosas que no cuadran`}:</p>
      <ul>${probs.map(p => `<li>${p}</li>`).join('')}</ul><div class="bt">${alSeguir ? '<button class="b" data-m="seguir">Publicar igual</button>' : ''}<button class="b pri" data-m="volver">${alSeguir ? 'Volver a corregir' : 'Entendido'}</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-m="volver"]').focus();
    m.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (e.target === m || (b && b.dataset.m === 'volver')) m.remove(); else if (b && b.dataset.m === 'seguir') { m.remove(); alSeguir(); } });
  }
  function engancharEditor(form) {
    if (form.dataset.mipj) return; form.dataset.mipj = '1';
    const ta = form.querySelector('textarea[name="message"]'); if (!ta) return;
    const bar = document.createElement('div'); bar.className = 'mipj-check'; bar.style.display = 'none';
    (form.querySelector('.sceditor-container') || ta).insertAdjacentElement('afterend', bar);
    let ult = null, probs = [];
    const chequear = () => {
      const t = textoEditor(ta); if (t === ult) return probs; ult = t;
      if (!tieneFormulario(t)) { bar.style.display = 'none'; probs = []; return probs; }
      const ref = refBoveda();
      probs = revisar(t, ref);
      bar.style.display = '';
      bar.className = 'mipj-check ' + (probs.length ? 'mal' : 'ok');
      bar.innerHTML = probs.length ? `<span class="ic">⚠</span>Bóveda: ${probs.length === 1 ? '1 cosa para revisar' : probs.length + ' cosas para revisar'}<small>Mi PJ · tocá para ver</small>`
        : `<span class="ic">✦</span>Bóveda: las cuentas cuadran${ref ? '' : ' (sin comparar con tu bóveda)'}<small>Mi PJ</small>`;
      return probs;
    };
    bar.addEventListener('click', () => { const p = chequear(); if (p.length) modal(p, null); });
    setInterval(chequear, 1500);
    let pasar = false;
    form.addEventListener('submit', e => {
      if (pasar) { pasar = false; return; }
      const sub = e.submitter;
      if (sub && /preview|draft|borrador|previsual/i.test((sub.name || '') + ' ' + (sub.value || ''))) return;
      ult = null; const p = chequear(); if (!p.length) return;
      e.preventDefault(); e.stopImmediatePropagation();
      modal(p, () => { pasar = true; try { form.requestSubmit(sub || undefined); } catch (err) { form.submit(); } });
    }, true);
  }
  const buscarEditores = () => document.querySelectorAll('form').forEach(f => { if (f.querySelector('textarea[name="message"]')) engancharEditor(f); });
  buscarEditores(); setTimeout(buscarEditores, 1500); setTimeout(buscarEditores, 4000);
  barraOficial();

  pintar();
  const viejo = !datos || datos.v !== 2 || (Date.now() - new Date(datos.leido)) > CACHE_MIN * 60000;
  const enMiBoveda = datos && datos.boveda && datos.boveda.tid === tidActual() && document.querySelector('textarea[name="message"]') && (Date.now() - new Date(datos.leido)) > 2 * 60000;
  if (viejo || enMiBoveda) actualizar();
  /* canjes */
  PUENTE.revisar = revisar;
  window.addEventListener('focus', () => { if (ui.abierto) pintar(); });
  ESC.alCargarForo();
}

// ===================== Biblioteca de oficiales =====================
/* Lee los sucesos de El Profeta, los cruza con la Lista de Roleos Oficiales y revisa cada rol (en curso, terminado o
   abandonado). Los libres y abandonados se pueden marcar con ★ y pasar a «Posibles oficiales» en PAM.
   Solo lee el foro, y solo cuando tocás «Escanear». */
function crearBibliotecaOficiales(opc) {
  'use strict';
  const CFG = { foroProfeta: '/f45-diario-el-profeta', listaRoles: '/t26725-lista-de-roleos-oficiales', concurrencia: 4, pausaMs: 250, edicionesFrescas: 3 };
  const KEY = 'avk_roles_cache_v1', K_ULT = 'mipj.ofic.ultimo', K_FAV = 'mipj.ofic.favs', K_PAM = 'pam.oficiales';
  const leerG = (k, d) => { try { const v = GM_getValue(k, null); return v == null ? d : (typeof v === 'string' ? JSON.parse(v) : v); } catch (e) { return d; } };
  const guardarG = (k, v) => { try { GM_setValue(k, JSON.stringify(v)); } catch (e) {} };
  const store = { get: () => leerG(KEY, { ediciones: {}, roles: {} }), set: v => guardarG(KEY, v), clear: () => { try { GM_setValue(KEY, ''); } catch (e) {} } };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const abs = h => { try { return new URL(h, location.origin).href; } catch (e) { return h || ''; } };
  const topicId = url => { const m = (url || '').match(/\/t(\d+)/); return m ? m[1] : null; };
  const postId = url => { const m = (url || '').match(/#(\d+)/); return m ? m[1] : null; };
  const clave = u => { const m = String(u || '').match(/\/t(\d+)[^#\s]*(?:#(\d+))?/); return m ? 't' + m[1] + '#' + (m[2] || '') : ''; };

  async function getDoc(url, intentos = 3) {
    for (let i = 0; i < intentos; i++) {
      try {
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const html = await r.text();
        await sleep(CFG.pausaMs);
        return new DOMParser().parseFromString(html, 'text/html');
      } catch (e) { if (i === intentos - 1) throw e; await sleep(1500 * (i + 1)); }
    }
  }
  async function pool(items, fn, onProgress) {
    let i = 0, hechos = 0; const out = new Array(items.length);
    async function worker() { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = { error: String(e) }; } hechos++; onProgress && onProgress(hechos, items.length); } }
    await Promise.all(Array.from({ length: CFG.concurrencia }, worker));
    return out;
  }
  function maxPagina(d, id) { let max = 0; const re = new RegExp('/t' + id + 'p(\\d+)'); for (const a of d.querySelectorAll('a[href]')) { const m = a.getAttribute('href').match(re); if (m) max = Math.max(max, +m[1]); } return max; }
  const postsDe = d => [...d.querySelectorAll('.post')].filter(p => p.querySelector('div.content'));
  const autorDe = p => { const a = p.querySelector('a[href^="/u"]'); return a ? a.textContent.trim() : ''; };
  const fechaDe = p => { const t = p.textContent.replace(/\s+/g, ' ').slice(0, 500); const m = t.match(/((?:Lun|Mar|Mi[ée]|Jue|Vie|S[áa]b|Dom)\.?\s+\d{1,2}\s+\S+\s+\d{4}[^0-9]{0,4}\d{1,2}:\d{2}(?:\s*[ap]m)?|(?:Hoy|Ayer) a las \d{1,2}:\d{2})/i); return m ? m[1] : ''; };

  /* 1. Sucesos de El Profeta */
  const RE_FECHA = /^\d{1,2}(?:\s+de)?\s+[a-záéíóú]+(?:\s+del?)?\s+\d{4}\.?$/i;
  function sucesosDeEdicion(d, primeraPagina) {
    const out = [];
    [...d.querySelectorAll('div.content.clearfix')].forEach((c, idx) => {
      const post = c.closest('.post'); const pid = (post && post.id || '').replace(/^p/, ''); if (!pid) return;
      const w = d.createTreeWalker(c, NodeFilter.SHOW_TEXT); const ts = []; let n;
      while ((n = w.nextNode())) { if (n.parentNode && /^(STYLE|SCRIPT)$/.test(n.parentNode.nodeName)) continue; const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) ts.push(t); }
      const i = ts.findIndex(t => RE_FECHA.test(t));
      if (i >= 0 && ts[i + 1]) { out.push({ pid, fecha: ts[i], titulo: ts[i + 1] }); return; }
      const j = ts.findIndex(t => t.length <= 40 && /^\d{1,2}\s*(?:de\s+)?[a-záéíóú]{3,}/i.test(t));
      if (j >= 0 && ts[j + 1]) { out.push({ pid, fecha: ts[j], titulo: ts[j + 1] }); return; }
      if (primeraPagina && idx === 0) return;
      const t = ts.find(x => x.length >= 3 && x.length <= 150);
      if (t) out.push({ pid, fecha: '', titulo: t });
    });
    return out;
  }
  async function leerProfeta(cache, log) {
    log('Leyendo el índice de El Profeta…');
    const ediciones = []; const d = await getDoc(CFG.foroProfeta); const paginas = new Set();
    for (const a of d.querySelectorAll('a[href]')) { const h = a.getAttribute('href'); if (/\/f45p\d+-/.test(h)) paginas.add(h.replace(/^https?:\/\/[^/]+/, '')); }
    const docs = [d]; for (const p of paginas) docs.push(await getDoc(p));
    for (const dd of docs) for (const a of dd.querySelectorAll('a.topictitle')) {
      if (/Edici[oó]n/i.test(a.textContent)) { const href = a.getAttribute('href'); if (!ediciones.some(e => e.href === href)) ediciones.push({ nombre: a.textContent.trim(), href, id: topicId(href) }); }
    }
    log(`Encontré ${ediciones.length} ediciones. Leyendo sucesos…`);
    const frescas = new Set(ediciones.slice(0, CFG.edicionesFrescas).map(e => e.id));
    await pool(ediciones, async ed => {
      if (cache.ediciones[ed.id] && !frescas.has(ed.id)) return;
      const doc = await getDoc(ed.href); let sucesos = sucesosDeEdicion(doc, true);
      const max = maxPagina(doc, ed.id);
      for (let p = 15; p <= max; p += 15) sucesos = sucesos.concat(sucesosDeEdicion(await getDoc(`/t${ed.id}p${p}-`), false));
      cache.ediciones[ed.id] = { nombre: ed.nombre, href: ed.href, sucesos };
    }, (h, t) => log(`Ediciones: ${h}/${t}`));
    const todos = [];
    for (const ed of ediciones) { const e = cache.ediciones[ed.id]; if (!e) continue; for (const s of e.sucesos) todos.push(Object.assign({}, s, { edicion: e.nombre, url: abs(`${e.href.split('#')[0]}#${s.pid}`) })); }
    return todos;
  }
  /* 2. Lista de Roleos Oficiales */
  async function leerLista(log) {
    log('Leyendo la Lista de Roleos Oficiales…');
    const d = await getDoc(CFG.listaRoles); const items = [];
    for (const c of d.querySelectorAll('div.content.clearfix')) {
      const txt = c.textContent; let sec = null;
      if (/oficiales abiertos/i.test(txt)) sec = 'abierto'; else if (/cerrados sin terminar/i.test(txt)) sec = 'cerrado sin terminar'; else if (/oficiales terminados/i.test(txt)) sec = 'terminado'; else continue;
      for (const ch of c.innerHTML.split('•').slice(1)) {
        const e = document.createElement('div'); e.innerHTML = ch;
        const t = e.textContent.replace(/\s+/g, ' ').trim();
        const hrefs = [...e.querySelectorAll('a')].map(a => a.getAttribute('href') || '');
        const prof = hrefs.find(h => /profeta/i.test(h)) || ''; const rol = hrefs.find(h => /\/t\d+/.test(h) && !/profeta/i.test(h)) || '';
        const partes = t.split('//').map(s => s.trim());
        items.push({ sec, titulo: partes[0], pjs: partes[1] || '', sucesoTxt: partes.slice(2).join(' / '), rol, rolId: topicId(rol), prof, profPid: postId(prof) });
      }
    }
    return items;
  }
  /* 3. Estado real de cada rol */
  async function estadoRol(rolId) {
    let d = await getDoc(`/t${rolId}-`); const max = maxPagina(d, rolId); if (max > 0) d = await getDoc(`/t${rolId}p${max}-`);
    const posts = postsDe(d), ultimo = posts[posts.length - 1];
    const fin = [...posts].reverse().find(p => /Ficha final de la aventura/i.test(p.textContent));
    let estado = 'en curso', como = '';
    if (fin) { const m = fin.textContent.replace(/\s+/g, ' ').match(/C[oó]mo se ha terminado:\s*(.+?)(?:-{2,}|Recompensas|$)/i); como = m ? m[1].trim() : ''; estado = /^no\b/i.test(como) ? 'abandonado' : 'terminado'; }
    return { estado, como, ultimoAutor: ultimo ? autorDe(ultimo) : '', ultimaFecha: ultimo ? fechaDe(ultimo) : '', verificado: Date.now() };
  }
  async function escanear({ completo, forzar }, log) {
    const cache = store.get(); if (forzar) cache.roles = {};
    const sucesos = await leerProfeta(cache, log); store.set(cache);
    const lista = await leerLista(log);
    const aVerificar = lista.filter(r => r.rolId && (completo ? !(cache.roles[r.rolId] && cache.roles[r.rolId].estado !== 'en curso') : (r.sec === 'abierto' || (cache.roles[r.rolId] && cache.roles[r.rolId].estado === 'en curso'))));
    log(`Verificando ${aVerificar.length} roles…`);
    await pool(aVerificar, async r => { cache.roles[r.rolId] = await estadoRol(r.rolId); }, (h, t) => { log(`Roles verificados: ${h}/${t}`); if (h % 20 === 0) store.set(cache); });
    store.set(cache);
    const porPid = new Map(sucesos.map(s => [s.pid, s])), porTitulo = new Map(sucesos.map(s => [norm(s.titulo), s])), sinSuceso = [];
    for (const s of sucesos) s.roles = [];
    const mapSec = { 'abierto': 'en curso', 'terminado': 'terminado', 'cerrado sin terminar': 'abandonado' };
    for (const r of lista) {
      const real = r.rolId && cache.roles[r.rolId];
      r.estado = real ? real.estado : mapSec[r.sec]; r.verificado = !!real; r.info = real || null; r.discrepancia = r.verificado && r.estado !== mapSec[r.sec];
      let s = r.profPid && porPid.get(r.profPid);
      if (!s) for (const t of r.sucesoTxt.split(' / ')) { s = porTitulo.get(norm(t)); if (s) break; }
      if (s) s.roles.push(r); else sinSuceso.push(r);
    }
    for (const s of sucesos) { const e = s.roles.map(r => r.estado); s.estado = !e.length ? 'libre' : e.includes('en curso') ? 'en curso' : e.includes('terminado') ? 'terminado' : 'abandonado'; }
    return { sucesos, lista, sinSuceso, fecha: new Date().toISOString() };
  }

  /* ---------- favoritos y pase a PAM ---------- */
  const TOMABLE = s => s.estado === 'libre' || s.estado === 'abandonado';
  let favs = leerG(K_FAV, {});
  const esFav = s => !!favs[clave(s.url)];
  function alternarFav(s) { const k = clave(s.url); if (favs[k]) delete favs[k]; else favs[k] = { titulo: s.titulo, url: s.url, desde: new Date().toISOString() }; guardarG(K_FAV, favs); }
  const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const isoDe = f => { const m = norm(f).match(/(\d{1,2}) (?:de )?([a-z]+) (?:del? )?(\d{4})/); if (!m || !MESES[m[2]]) return f || ''; return `${m[3]}-${String(MESES[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
  function aPAM(soloFavs) {
    if (!datos) return 0;
    const elegidos = datos.sucesos.filter(s => TOMABLE(s) && (!soloFavs || esFav(s)));
    const items = elegidos.map(s => ({ nombre: s.titulo, relacion: (s.estado === 'abandonado' ? 'Abandonado · ' : '') + s.edicion, fecha: isoDe(s.fecha), estado: 'Disponible', enlace: s.url, fav: esFav(s) }));
    const estados = {}; datos.sucesos.forEach(s => { const k = clave(s.url); if (k) estados[k] = TOMABLE(s) ? 'Disponible' : 'Ocupado'; });
    try { GM_setValue(K_PAM, { v: 1, creado: new Date().toISOString(), modo: soloFavs ? 'favoritos' : 'todos', items, estados, usado: null }); } catch (e) {}
    return items.length;
  }

  /* ---------- interfaz (estética de Mi PJ / PAM) ---------- */
  const host = document.createElement('div'); host.id = 'mipj-ofic'; host.className = 'esc-ui'; document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
  :host{all:initial}
  *{box-sizing:border-box;font-family:var(--m-sans,"Nunito",system-ui,sans-serif)}
  .fondo{position:fixed;inset:0;z-index:2147483000;background:rgba(8,7,14,.6);display:none}
  .fondo.open{display:block}
  .panel{position:fixed;inset:4vh 4vw;z-index:2147483001;color:var(--m-parchment,#F1EADF);font-size:13.5px;display:none;flex-direction:column;overflow:hidden;
    background:radial-gradient(600px 220px at 0% 0%,color-mix(in srgb,var(--m-arcane-bright,#cf94a3) 14%,transparent),transparent 70%),var(--m-panel,#1e2236);
    border:1px solid color-mix(in srgb,var(--m-gold,#B49768) 50%,transparent);border-radius:16px;box-shadow:0 30px 80px -30px #000}
  .panel.open{display:flex}
  header{padding:14px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--m-line-strong,rgba(241,234,223,.16))}
  h1{margin:0;flex:1;min-width:200px;font-family:var(--m-serif,"Cormorant Garamond",Georgia,serif);font-style:italic;font-weight:500;font-size:28px;color:var(--m-gold-bright,#d6bd8f)}
  h1 small{display:block;font-family:var(--m-sans,"Nunito",sans-serif);font-style:normal;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--m-parchment-dim,#a7a1b6)}
  button.b{font:700 12.5px var(--m-sans,"Nunito",sans-serif);border-radius:999px;padding:7px 13px;cursor:pointer;border:1px solid var(--m-line-strong,rgba(241,234,223,.16));background:color-mix(in srgb,var(--m-panel-2,#262a42) 90%,transparent);color:var(--m-parchment,#F1EADF)}
  button.b:hover{border-color:var(--m-gold,#B49768)}
  button.b.pri{background:var(--m-gold,#B49768);border-color:var(--m-gold,#B49768);color:var(--m-accent-ink,#1b1e30)}
  button.b:disabled{opacity:.5;cursor:wait}
  .x{background:none;border:0;color:var(--m-parchment-dim,#a7a1b6);font-size:18px;cursor:pointer;padding:2px 8px}
  .bar{padding:10px 20px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--m-line-strong,rgba(241,234,223,.16))}
  .chip{border:1px solid var(--m-line-strong,rgba(241,234,223,.16));background:transparent;border-radius:999px;padding:5px 11px;cursor:pointer;font-size:12px;color:var(--m-parchment,#F1EADF)}
  .chip.on{background:var(--m-gold,#B49768);border-color:var(--m-gold,#B49768);color:var(--m-accent-ink,#1b1e30)}
  input.q{flex:1;min-width:180px;border:1px solid var(--m-line-strong,rgba(241,234,223,.16));border-radius:999px;padding:7px 12px;font-size:12.5px;color:var(--m-parchment,#F1EADF);background:color-mix(in srgb,var(--m-panel-2,#262a42) 80%,transparent);outline:none}
  input.q:focus{border-color:var(--m-gold,#B49768)}
  .pasar{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .pasar span{font-size:11px;color:var(--m-parchment-dim,#a7a1b6);letter-spacing:.08em;text-transform:uppercase}
  .log{padding:7px 20px;font-size:12px;color:var(--m-parchment-dim,#a7a1b6);min-height:28px}
  .log.ok{color:var(--m-good,#93b8a0)}
  .body{overflow:auto;flex:1;padding:0 20px 20px}
  table{width:100%;border-collapse:collapse}
  th{position:sticky;top:0;background:var(--m-panel,#1e2236);text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--m-gold-bright,#d6bd8f);padding:9px 6px;border-bottom:1px solid var(--m-line-strong,rgba(241,234,223,.16));z-index:1}
  td{padding:8px 6px;border-bottom:1px dashed var(--m-line-strong,rgba(241,234,223,.16));vertical-align:top}
  a{color:var(--m-gold-bright,#d6bd8f);text-decoration:none;border-bottom:1px dotted color-mix(in srgb,var(--m-gold,#B49768) 60%,transparent)}
  a:hover{color:var(--m-parchment,#F1EADF)}
  .suc a{font-family:var(--m-serif,"Cormorant Garamond",serif);font-size:16px;border:0}
  .tag{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid}
  .t-libre{color:var(--m-good,#93b8a0);border-color:var(--m-good,#93b8a0);background:color-mix(in srgb,var(--m-good,#93b8a0) 12%,transparent)}
  .t-encurso{color:var(--m-gold-bright,#d6bd8f);border-color:var(--m-gold,#B49768);background:color-mix(in srgb,var(--m-gold,#B49768) 12%,transparent)}
  .t-terminado{color:var(--m-parchment-dim,#a7a1b6);border-color:var(--m-line-strong,rgba(241,234,223,.3))}
  .t-abandonado{color:var(--m-arcane-bright,#cf94a3);border-color:var(--m-arcane-bright,#cf94a3);background:color-mix(in srgb,var(--m-arcane-bright,#cf94a3) 12%,transparent)}
  .star{background:none;border:0;cursor:pointer;font-size:18px;line-height:1;color:var(--m-parchment-dim,#a7a1b6);opacity:.45;padding:0 4px}
  .star.on{color:var(--m-gold-bright,#d6bd8f);opacity:1}
  .star:hover{opacity:1}
  .rol{margin:2px 0 6px;line-height:1.45}
  .meta,.muted{color:var(--m-parchment-dim,#a7a1b6);font-size:11.5px}
  .warn{color:var(--m-bad,#d98377);font-weight:700;font-size:11px}
  .empty{text-align:center;padding:40px;color:var(--m-parchment-dim,#a7a1b6)}
  textarea{width:100%;height:180px;border:1px solid var(--m-line-strong,rgba(241,234,223,.16));border-radius:10px;padding:8px;font:11px monospace;background:var(--m-ink,#171a2b);color:var(--m-parchment,#F1EADF)}
  details{margin:12px 0} summary{cursor:pointer;color:var(--m-gold-bright,#d6bd8f);font-weight:700}
  @media (max-width:640px){.panel{inset:8px}.pasar{margin-left:0}}
  </style>
  <div class="fondo" id="fondo"></div>
  <div class="panel" id="panel" role="dialog" aria-modal="true" aria-label="Biblioteca de oficiales">
    <header>
      <h1>Biblioteca de oficiales<small id="sub">Sucesos de El Profeta cruzados con la Lista de Roleos Oficiales</small></h1>
      <button class="b pri" id="scan">Escanear</button>
      <button class="b" id="scanFull" title="Revisa también los roles marcados como terminados o cerrados (tarda bastante la primera vez)">Escaneo completo</button>
      <button class="b" id="clear" title="Borra lo guardado y vuelve a leer todo desde cero">Vaciar caché</button>
      <button class="x" id="close" aria-label="Cerrar">✕</button>
    </header>
    <div class="bar" id="filters"></div>
    <div class="bar"><input class="q" id="q" type="search" placeholder="Buscar suceso, rol o personaje…">
      <div class="pasar"><span>Pasar a PAM</span><button class="b" id="pamFav">★ Solo favoritos</button><button class="b" id="pamTodos">Todos los que se pueden tomar</button></div></div>
    <div class="bar"><button class="b" id="exportBB">Copiar BBCode</button><button class="b" id="exportCSV">Descargar CSV</button></div>
    <div class="log" id="log">Tocá «Escanear» para empezar.</div>
    <div class="body" id="body"></div>
  </div>`;
  const $ = s => root.getElementById(s);
  let datos = leerG(K_ULT, null), filtro = 'todos', busqueda = '';
  const log = (m, ok) => { $('log').textContent = m; $('log').className = 'log' + (ok ? ' ok' : ''); };
  const fechaTxt = iso => { try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return ''; } };
  function abrir() { $('panel').classList.add('open'); $('fondo').classList.add('open'); if (datos) { log(`Último escaneo: ${fechaTxt(datos.fecha)} · ${datos.sucesos.length} sucesos. Tocá «Escanear» para actualizar.`); pintar(); } }
  function cerrar() { $('panel').classList.remove('open'); $('fondo').classList.remove('open'); if (opc && opc.alCerrar) opc.alCerrar(); }
  $('close').onclick = cerrar; $('fondo').onclick = cerrar;
  root.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  $('q').oninput = e => { busqueda = norm(e.target.value); pintar(); };
  async function correr(op) {
    for (const id of ['scan', 'scanFull', 'clear']) $(id).disabled = true;
    try {
      datos = await escanear(op, log);
      /* lo que hace falta para volver a mostrarla y pasarla a PAM sin escanear de nuevo */
      guardarG(K_ULT, { fecha: datos.fecha, sinSuceso: datos.sinSuceso.map(r => ({ sec: r.sec, titulo: r.titulo, pjs: r.pjs, sucesoTxt: r.sucesoTxt, rol: r.rol, prof: r.prof, estado: r.estado, discrepancia: r.discrepancia, info: r.info ? { como: r.info.como, ultimoAutor: r.info.ultimoAutor, ultimaFecha: r.info.ultimaFecha } : null })),
        sucesos: datos.sucesos.map(s => ({ pid: s.pid, fecha: s.fecha, titulo: s.titulo, edicion: s.edicion, url: s.url, estado: s.estado,
          roles: s.roles.map(r => ({ sec: r.sec, titulo: r.titulo, pjs: r.pjs, rol: r.rol, estado: r.estado, discrepancia: r.discrepancia, info: r.info ? { como: r.info.como, ultimoAutor: r.info.ultimoAutor, ultimaFecha: r.info.ultimaFecha } : null })) })) });
      datos = leerG(K_ULT, datos);
      const n = datos.sucesos.filter(s => s.roles.some(r => r.discrepancia)).length;
      log(`Listo · ${datos.sucesos.length} sucesos · ${datos.sucesos.filter(TOMABLE).length} se pueden tomar · ${n} con discrepancias · ${fechaTxt(datos.fecha)}`, true);
      pintar(); if (opc && opc.alEscanear) opc.alEscanear();
    } catch (e) { log('Algo falló: ' + e.message + '. Probá de nuevo en un ratito.'); }
    finally { for (const id of ['scan', 'scanFull', 'clear']) $(id).disabled = false; }
  }
  $('scan').onclick = () => correr({ completo: false });
  $('scanFull').onclick = () => correr({ completo: true });
  $('clear').onclick = () => { if (confirm('¿Borrar la caché y volver a leer todo?')) { store.clear(); correr({ completo: false, forzar: true }); } };
  const pasar = solo => {
    if (!datos) { log('Primero tocá «Escanear».'); return; }
    const n = aPAM(solo);
    if (!n) { log(solo ? 'No tenés favoritos ★ entre los sucesos libres o abandonados.' : 'No hay sucesos libres ni abandonados para pasar.'); return; }
    log(`Listo: ${n} ${n === 1 ? 'oficial preparado' : 'oficiales preparados'}. Abrí PAM (con Mi PJ instalado) y aceptá el cuadro para sumarlos a «Posibles oficiales».`, true);
    const w = window.open(opc.PAM_URL + '#oficiales', 'pam'); if (w) try { w.focus(); } catch (e) {}
  };
  $('pamFav').onclick = () => pasar(true);
  $('pamTodos').onclick = () => pasar(false);

  const tag = e => `<span class="tag t-${e.replace(/\s/g, '')}">${esc(e)}</span>`;
  const coincide = s => !busqueda || norm([s.titulo, s.edicion, ...s.roles.map(r => r.titulo + ' ' + r.pjs)].join(' ')).includes(busqueda);
  function filtrados() {
    if (!datos) return [];
    return datos.sucesos.filter(s => filtro === 'discrepancias' ? s.roles.some(r => r.discrepancia) : filtro === 'fav' ? esFav(s) : (filtro === 'todos' || s.estado === filtro)).filter(coincide);
  }
  function pintar() {
    if (!datos) return;
    const cuenta = k => datos.sucesos.filter(s => k === 'todos' || s.estado === k).length;
    const disc = datos.sucesos.filter(s => s.roles.some(r => r.discrepancia)).length, nf = datos.sucesos.filter(esFav).length;
    const ops = [['todos', 'Todos'], ['libre', 'Libres'], ['abandonado', 'Abandonados'], ['en curso', 'En curso'], ['terminado', 'Terminados']];
    $('filters').innerHTML = ops.map(([k, n]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-f="${k}">${n} <b>${cuenta(k)}</b></button>`).join('')
      + `<button class="chip ${filtro === 'fav' ? 'on' : ''}" data-f="fav">★ Favoritos <b>${nf}</b></button><button class="chip ${filtro === 'discrepancias' ? 'on' : ''}" data-f="discrepancias">⚠ Discrepancias <b>${disc}</b></button>`;
    $('filters').querySelectorAll('.chip').forEach(c => c.onclick = () => { filtro = c.dataset.f; pintar(); });
    $('pamFav').textContent = `★ Solo favoritos (${datos.sucesos.filter(s => TOMABLE(s) && esFav(s)).length})`;
    $('pamTodos').textContent = `Todos los que se pueden tomar (${datos.sucesos.filter(TOMABLE).length})`;
    const rows = filtrados();
    let html = rows.length ? `<table><thead><tr><th style="width:34px"></th><th>Suceso</th><th>Edición</th><th>Estado</th><th>Roles</th></tr></thead><tbody>` +
      rows.map(s => `<tr><td>${TOMABLE(s) ? `<button class="star${esFav(s) ? ' on' : ''}" data-k="${esc(clave(s.url))}" title="${esFav(s) ? 'Quitar de favoritos' : 'Marcar como favorito'}" aria-label="Favorito">★</button>` : ''}</td>
        <td class="suc"><a href="${esc(s.url)}" target="_blank">${esc(s.titulo)}</a><div class="muted">${esc(s.fecha)}</div></td>
        <td class="muted">${esc(s.edicion)}</td><td>${tag(s.estado)}</td>
        <td>${s.roles.map(filaRol).join('') || '<span class="muted">Nadie lo tomó todavía</span>'}</td></tr>`).join('') + `</tbody></table>`
      : '<div class="empty">No hay nada con este filtro ✧</div>';
    const sueltos = (datos.sinSuceso || []).filter(r => !busqueda || norm(r.titulo + ' ' + r.pjs + ' ' + r.sucesoTxt).includes(busqueda)).filter(r => filtro !== 'discrepancias' || r.discrepancia);
    if (sueltos.length && (filtro === 'todos' || filtro === 'discrepancias'))
      html += `<details><summary>Roles de la lista cuyo suceso no encontré en El Profeta (${sueltos.length})</summary>${sueltos.map(r => `<div style="margin:8px 0">${filaRol(r)}<div class="muted">Suceso según la lista: ${esc(r.sucesoTxt || '—')}</div></div>`).join('')}</details>`;
    $('body').innerHTML = html;
    $('body').querySelectorAll('.star').forEach(b => b.onclick = () => { const s = datos.sucesos.find(x => clave(x.url) === b.dataset.k); if (s) { alternarFav(s); pintar(); if (opc && opc.alEscanear) opc.alEscanear(); } });
  }
  function filaRol(r) {
    const i = r.info;
    const meta = i ? (r.estado === 'en curso' ? `último post: ${esc(i.ultimoAutor)}${i.ultimaFecha ? ' · ' + esc(i.ultimaFecha) : ''}` : esc(i.como)) : 'según la lista (sin verificar)';
    const aviso = r.discrepancia ? `<div class="warn">⚠ En la lista figura como «${esc(r.sec)}»</div>` : '';
    return `<div class="rol">${tag(r.estado)} <a href="${esc(r.rol)}" target="_blank">${esc(r.titulo)}</a><div class="meta">${esc(r.pjs)} · ${meta}</div>${aviso}</div>`;
  }
  $('exportBB').onclick = async () => {
    if (!datos) return;
    const rows = filtrados();
    const lineas = rows.map(s => `• [url=${s.url}]${s.titulo}[/url] // ${s.edicion} // ${s.roles.length ? s.roles.map(r => `[url=${r.rol}]${r.titulo}[/url] (${r.estado}${r.discrepancia ? ' (!) lista: ' + r.sec : ''})`).join(' · ') : 'libre'}`);
    const titulo = { todos: 'Sucesos', libre: 'Sucesos libres', 'en curso': 'Sucesos en curso', terminado: 'Sucesos terminados', abandonado: 'Sucesos abandonados', fav: 'Sucesos favoritos', discrepancias: 'Discrepancias con la lista' }[filtro];
    const txt = `[b]${titulo}[/b]\n` + lineas.join('\n');
    try { await navigator.clipboard.writeText(txt); log(`Copiado (${rows.length} sucesos).`, true); }
    catch (e) { $('body').innerHTML = `<p class="muted">No pude copiar solo. Seleccioná y copiá:</p><textarea>${esc(txt)}</textarea>`; }
  };
  $('exportCSV').onclick = () => {
    if (!datos) return;
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = [['Suceso', 'Fecha', 'Edición', 'Estado suceso', 'Favorito', 'Rol', 'Personajes', 'Estado real', 'Sección en la lista', 'Discrepancia', 'Detalle', 'Link suceso', 'Link rol']];
    for (const s of datos.sucesos) {
      if (!s.roles.length) filas.push([s.titulo, s.fecha, s.edicion, s.estado, esFav(s) ? '★' : '', '', '', '', '', '', '', s.url, '']);
      for (const r of s.roles) filas.push([s.titulo, s.fecha, s.edicion, s.estado, esFav(s) ? '★' : '', r.titulo, r.pjs, r.estado, r.sec, r.discrepancia ? 'SÍ' : '', r.info ? (r.estado === 'en curso' ? `último: ${r.info.ultimoAutor} ${r.info.ultimaFecha}` : r.info.como) : 'sin verificar', s.url, r.rol]);
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + filas.map(f => f.map(q).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `roles-oficiales-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  return {
    abrir,
    resumen: () => datos ? { fecha: datos.fecha, libres: datos.sucesos.filter(s => s.estado === 'libre').length, abandonados: datos.sucesos.filter(s => s.estado === 'abandonado').length,
      favs: datos.sucesos.filter(s => TOMABLE(s) && esFav(s)).length } : null
  };
}

/* En PAM: los oficiales que mandó la Biblioteca se muestran en la puerta (Aceptar / Denegar) y se suman a «Posibles oficiales» */
function recibirOficialesEnPAM(ESC) {
  'use strict';
  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  let abierta = false;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function revisar() {
    if (abierta) return;
    let p = null; try { p = GM_getValue('pam.oficiales', null); } catch (e) {}
    if (!p || p.usado || !W.rrOficiales) return;
    let prev; try { prev = W.rrOficiales.previa(p.items, p.estados); } catch (e) { return; }
    const marcar = r => { p.usado = { fecha: new Date().toISOString(), resultado: r }; try { GM_setValue('pam.oficiales', p); } catch (e) {} };
    if (!prev.nuevos.length && !prev.cambios.length) { marcar('igual'); return; }
    abierta = true;
    const lista = (t, xs) => xs.length ? `<div class="p-nota" style="margin-top:4px"><b>${t}</b></div><div class="p-diff" style="white-space:normal;max-height:260px;font-family:inherit;font-size:13px">${xs.join('')}</div>` : '';
    const vista = ESC.el('div', { clase: 'p-vista' });
    vista.innerHTML = lista(`Nuevos (${prev.nuevos.length})`, prev.nuevos.map(x => `<div class="d mas">${x.fav ? '★ ' : ''}${esc(x.nombre)} <span style="opacity:.7">· ${esc(x.relacion)}</span></div>`))
      + lista(`Se actualizan (${prev.cambios.length})`, prev.cambios.map(c => `<div class="d">${esc(c.nombre)}: ${c.estado ? `${esc(c.antes)} → <b>${esc(c.estado)}</b>` : ''}${c.fav ? ' ★ favorito' : ''}</div>`));
    const accion = {
      titulo: 'Oficiales del foro → PAM', sinCuenta: true,
      explicacion: `Desde la Biblioteca de oficiales de Mi PJ (${p.modo === 'favoritos' ? 'solo tus ★' : 'todos los libres y abandonados'}). Los que ya tenés no se repiten.`,
      pasos: [{ tipo: 'pam', titulo: 'Posibles oficiales', vista, ejecutar: () => { const r = W.rrOficiales.aplicar(p.items, p.estados); marcar('aceptada'); return Promise.resolve({ estado: 'ok', detalle: r }); } }],
      enlaceFinal: { texto: 'Ver Posibles oficiales', alPulsar: () => { try { W.showSection('oficiales'); } catch (e) {} } }
    };
    ESC.puerta(null, { id: 0, nombre: 'Biblioteca de oficiales', foro: 'hp-avada-kedavra.foroactivo.com' }, accion).then(res => { marcar(res && res.resultado); abierta = false; }).catch(() => { abierta = false; });
  }
  setTimeout(revisar, 2500);
  window.addEventListener('focus', () => setTimeout(revisar, 600));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(revisar, 600); });
}

// ===================== Fichas de PAM → Mi PJ =====================
/* Estando en PAM, se guardan tus fichas (con los stats que calcula PAM) en el almacén del script.
   Así el «Acceso rápido» del foro muestra exactamente lo que tenés en PAM. */
function copiarFichasDePAM() {
  'use strict';
  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const num = v => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
  const RN = ['', 'I', 'II', 'III', 'IV', 'V'];
  /* PAM viejo (sin pamRapido): se leen las fichas guardadas y el combate se calcula en el foro */
  function crudas() {
    let g = null; try { g = JSON.parse(localStorage.getItem('grimorio.personajes') || 'null'); } catch (e) {}
    if (!g || !Array.isArray(g.lista)) return null;
    return { v: 0, activa: g.activa, lista: g.lista.map(p => { const f = p.ficha || {}, sk = f.skills || {};
      return { id: p.id, nombre: (f.nombre || '').trim(), raza: (f.d && f.d.raza) || '', etapa: (f.d && f.d.etapa) || '',
        attrs: Object.fromEntries(Object.entries(f.attrs || {}).map(([k, v]) => [k, num(v)])),
        skills: Object.fromEntries(Object.entries(sk).filter(([k]) => k !== 'Arte/Artesanía').map(([k, v]) => [k, num(v)])),
        artes: (f.artes || []).filter(x => x && x.n).map(x => ({ n: x.n, nv: num(x.v) })), combate: null,
        puntos: { destino: num(f.extra && f.extra.pd) },
        trasf: (f.bgs || []).filter(b => b && b.t && num(b.v)).map(b => ({ t: [b.t, b.c, b.e].filter(Boolean).join(' › '), v: RN[num(b.v)] || String(b.v), nota: b.nota || '', esp: !!b.e })) }; }) };
  }
  let ultimo = '';
  function guardar() {
    let d = null;
    try { if (typeof W.pamRapido === 'function') d = JSON.parse(JSON.stringify(W.pamRapido())); } catch (e) { d = null; }
    if (!d) d = crudas();
    if (!d || !d.lista || !d.lista.some(x => x.nombre)) return;
    const firma = JSON.stringify(d.lista);
    if (firma === ultimo) return;
    ultimo = firma;
    d.leido = new Date().toISOString();
    try { GM_setValue('pam.fichas', d); } catch (e) {}
  }
  setTimeout(guardar, 1500);
  setInterval(guardar, 6000);
  document.addEventListener('pam:pjs', () => setTimeout(guardar, 900));
  document.addEventListener('visibilitychange', guardar);
  window.addEventListener('pagehide', guardar);
}

// ===================== Arranque =====================
(function () {
  'use strict';
  var PUENTE = {};                 // lo que el panel presta a los canjes (enviar a PAM, releer, revisar…)
  var ESC = crearCanjes(PUENTE);
  if (ESC.enPAM()) { copiarFichasDePAM(); ESC.montarPuentePAM(); recibirOficialesEnPAM(ESC); return; }
  if (!ESC.foroConocido()) { return; }
  ESC.estilos();
  moduloMiPJ(ESC, PUENTE);
})();
