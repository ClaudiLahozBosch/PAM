// ==UserScript==
// @name         PAM · Inspector de Canjes (HP Avada Kedavra)
// @namespace    https://jesleytherabbit-prog.github.io/PAM/
// @version      1.1.0
// @description  Para los Inspectores de Canjes: revisa cada pedido del Registro de Canjes (también lo que está dentro de spoilers), lo compara con la Tabla de Canjes de PAM, con la ficha y con la bóveda del PJ, y arma la respuesta. Solo lee: no publica ni edita nada.
// @author       Hana Park
// @match        https://hp-avada-kedavra.foroactivo.com/t34430*
// @connect      jesleytherabbit-prog.github.io
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @noframes
// @run-at       document-idle
// ==/UserScript==

/* Cómo trabaja:
   1. En cada pedido aparece una barra con «Revisar canje» (y si alguien ya respondió); abajo a la derecha, la pastilla «Inspector».
   2. Al revisar, lee el pedido (spoilers incluidos) y busca la ficha y la bóveda en la pestaña «Fichas» del perfil.
   3. Cada canje se compara con la Tabla de Canjes de PAM (precios, requisitos) y con lo que dice la ficha.
   4. Con «Correcto» o «Con correcciones» se arma la respuesta; se pega en la respuesta rápida sin enviarla.
   Los precios y requisitos se leen en vivo de PAM, así no hay una segunda tabla que mantener. */

(function () {
  'use strict';

  var PAM_URL = 'https://jesleytherabbit-prog.github.io/PAM/';
  var CLAVE_PAM = 'insp.pam';
  var CADUCIDAD_PAM = 12 * 60 * 60 * 1000;
  var ICONO_FICHA = 'zu0MvZg';
  var ICONO_BOVEDA = 'e4PVpbK';

  /* ============================== utilidades ============================== */
  var norm = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s ]+/g, ' ').trim(); };
  var escRe = function (s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  var fmt = function (n) { return (typeof n === 'number' && !isNaN(n)) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—'; };
  var aNumero = function (t) { var m = String(t == null ? '' : t).match(/\d{1,3}(?:[.,]\d{3})+|\d+/); return m ? parseInt(m[0].replace(/[.,]/g, ''), 10) : NaN; };
  var nombrePila = function (n) { return String(n || '').trim().split(/\s+/)[0] || n; };

  function pedirTexto(url) {
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    return fetch(url + sep + '_=' + Date.now(), { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status + ' al abrir ' + url); }
      return r.text();
    });
  }
  function pedirDoc(url) { return pedirTexto(url).then(function (h) { return new DOMParser().parseFromString(h, 'text/html'); }); }
  /* Mensajes de un tema (el bloque de normas del foro también lleva la clase .post: se descarta). */
  function mensajesDe(doc) { return Array.prototype.filter.call(doc.querySelectorAll('.post'), function (p) { return /^p\d+$/.test(p.id || '') && p.querySelector('.content'); }); }

  /* Fechas de Foroactivo: «Lun 03 Feb 2025, 10:43 pm», «Hoy a las 4:41 pm», «Ayer a las 2:26 pm». */
  var MESES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11 };
  function leerFecha(txt) {
    var t = norm(txt), d = null, m;
    if ((m = t.match(/(\d{1,2}) (ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)\w* (\d{4})/))) { d = new Date(+m[3], MESES[m[2]], +m[1]); }
    else if (/\bhoy\b/.test(t)) { d = new Date(); }
    else if (/\bayer\b/.test(t)) { d = new Date(Date.now() - 864e5); }
    if (!d) { return null; }
    var h = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
    if (h) { var hh = +h[1] % 12 + (h[3] === 'pm' ? 12 : 0); if (!h[3]) { hh = +h[1]; } d.setHours(hh, +h[2], 0, 0); }
    return d.getTime();
  }

  /* Texto de un mensaje línea a línea, con lo que está dentro de spoilers cerrados (está en la página, solo oculto). */
  var BLOQUES = /<\/?(p|div|dd|dt|dl|li|ul|ol|tr|td|th|table|h[1-6]|center|label|blockquote|section|article|details|summary|header|footer|figure|figcaption)\b[^>]*>/gi;
  function lineasDe(el) {
    if (!el) { return []; }
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('style, script'), function (e) { e.remove(); });
    var tmp = document.createElement('div');
    tmp.innerHTML = c.innerHTML.replace(/<(br|hr)\s*\/?>/gi, '\n').replace(BLOQUES, '\n');
    return (tmp.textContent || '').split('\n').map(function (l) { return l.replace(/[ \t ]+/g, ' ').trim(); }).filter(Boolean);
  }
  /* Lo mismo pero cortando en cada elemento (fichas hechas a medida: «II» y «Carisma» en cajitas distintas). */
  function fichasDe(el) {
    var out = [];
    if (!el) { return out; }
    var w = (el.ownerDocument || document).createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */, null);
    var n;
    while ((n = w.nextNode())) {
      var p = n.parentNode && n.parentNode.nodeName;
      if (p === 'STYLE' || p === 'SCRIPT') { continue; }
      var t = n.nodeValue.replace(/[ \t \r\n]+/g, ' ').trim();
      if (t) { out.push(t); }
    }
    return out;
  }

  /* ---------- niveles ---------- */
  var ROMANO = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
  var PALABRA_NIVEL = [
    [/^(sin nivel|sin entrenar|ningun[oa]|desentrenad[oa])$/, 0], [/^novat[oa]$/, 1], [/^competente$/, 2],
    [/^expert[oa]$/, 3], [/^maestr[oa]$/, 4], [/^legendari[oa]$/, 5]
  ];
  var NIVEL_IDIOMA = { ninguno: 0, bajo: 1, medio: 2, alto: 3, nativo: 4 };
  var BONO_NIVEL = { 0: 0, 1: 1, 2: 2, 4: 3, 7: 4, 9: 5 };
  var TOKEN_NIVEL = /(sin nivel|sin entrenar|ningun[oa]|desentrenad[oa]|novat[oa]|competente|expert[oa]|maestr[oa]|legendari[oa]|\b(?:VIII|VII|VI|IV|V|III|II|I)\b|\b\d\b|—|–)/gi;
  function nivelDe(tok) {
    if (tok == null) { return null; }
    var t = String(tok).trim();
    if (/^[—–-]$/.test(t)) { return 0; }
    if (/^\d$/.test(t)) { return +t; }
    if (ROMANO[t] !== undefined) { return ROMANO[t]; }
    var n = norm(t);
    for (var i = 0; i < PALABRA_NIVEL.length; i++) { if (PALABRA_NIVEL[i][0].test(n)) { return PALABRA_NIVEL[i][1]; } }
    return null;
  }
  /* Primer nivel que aparece en un trozo de texto (los romanos solo en mayúscula, para no leer «i»/«v» sueltas). */
  function primerNivel(txt) {
    var re = new RegExp(TOKEN_NIVEL.source, 'gi'), m;
    while ((m = re.exec(txt))) {
      if (/^[ivx]+$/i.test(m[0]) && m[0] !== m[0].toUpperCase()) { continue; }
      var v = nivelDe(m[0]);
      if (v !== null) { return v; }
    }
    return null;
  }
  /* «X → Y», «X > Y», «X -> Y», «a Y», «Y» suelto: {desde, hasta}. */
  function desdeHasta(txt) {
    var t = String(txt || '').replace(/^[\s:·,-]+/, '');
    var partes = t.split(/\s*(?:→|->|=>|⇒|>|›|\bhasta\b)\s*/);
    if (partes.length >= 2) {
      return { desde: primerNivel(partes[0]), hasta: primerNivel(partes.slice(1).join(' ')) };
    }
    var a = t.match(/^\s*(?:a|al)\s+(.+)$/i);
    if (a) { return { desde: null, hasta: primerNivel(a[1]) }; }
    var ay = t.match(/^(.*?\S)\s+(?:a|al)\s+(.+)$/i);
    if (ay && primerNivel(ay[1]) !== null && primerNivel(ay[2]) !== null) { return { desde: primerNivel(ay[1]), hasta: primerNivel(ay[2]) }; }
    return { desde: null, hasta: primerNivel(t) };
  }

  /* ============================== PAM ============================== */
  /* Se toma de index.html de PAM: (1) la Tabla de Canjes, (2) el Compendio Arcano. Se guarda una copia por si GitHub falla. */
  function extraerPAM(html) {
    function entre(ini, fin) {
      var a = html.indexOf(ini);
      if (a < 0) { throw new Error('PAM cambió: no encuentro «' + ini.slice(0, 24) + '»'); }
      var b = html.indexOf(fin, a);
      if (b < 0) { throw new Error('PAM cambió: no encuentro el final de «' + ini.slice(0, 24) + '»'); }
      return html.slice(a, b);
    }
    var bloque = entre('const STATS = [', '   ESTADO\n');
    var jm = html.match(/<script id="arcanos-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!jm) { throw new Error('PAM cambió: no encuentro el Compendio Arcano'); }
    return { tabla: bloque.slice(0, bloque.lastIndexOf('/* ====')), arcanos: jm[1] };
  }
  function evaluarPAM(p) {
    var NOMBRES = ['STATS', 'SKILL_GROUPS', 'ALL_SKILLS', 'SKILL_STAT', 'SKILL_LVL', 'STAT_ACUM', 'SKILL_ACUM', 'ARTE_ACUM', 'TGEN_ACUM',
      'TESP_ACUM', 'VENT_ACUM', 'ARTES', 'ARTESANIAS', 'ESPEC_RAMAS', 'TIPOS_TRASF', 'CONOCIMIENTO_CATEGORIAS', 'SOCIAL_CATEGORIAS',
      'VENTAJAS', 'VENT_LABELS', 'EXTASIS_ASIG', 'NOTAS', 'TIMOS_PRECIO', 'EXTASIS_PRECIO', 'IDIOMAS_MAGICOS', 'RAZAS', 'ARMA_BASE',
      'MATERIALES', 'RUNE_CHAINS', 'RUNE_LVL', 'RUNE_PRICE', 'ARC', 'ARC_TYPES', 'TIER', 'TALENTOS', 'VETERANIA', 'LEGENDARIAS'];
    var docFalso = { getElementById: function (id) { return id === 'arcanos-data' ? { textContent: p.arcanos } : null; } };
    /* eslint-disable-next-line no-new-func */
    return new Function('document', p.tabla + '\nreturn {' + NOMBRES.join(',') + '};')(docFalso);
  }
  function bajarPAM() {
    var url = PAM_URL + 'index.html?_=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.text();
    }).catch(function () {
      return new Promise(function (ok, mal) {
        if (typeof GM_xmlhttpRequest !== 'function') { mal(new Error('No pude abrir PAM')); return; }
        GM_xmlhttpRequest({ method: 'GET', url: url, onload: function (r) { if (r.status === 200) { ok(r.responseText); } else { mal(new Error('HTTP ' + r.status)); } }, onerror: function () { mal(new Error('No pude abrir PAM')); } });
      });
    });
  }
  var pamPromesa = null;
  function cargarPAM(forzar) {
    if (pamPromesa && !forzar) { return pamPromesa; }
    var guardado = null;
    try { guardado = JSON.parse(GM_getValue(CLAVE_PAM, 'null')); } catch (e) { guardado = null; }
    var fresco = guardado && (Date.now() - guardado.cuando < CADUCIDAD_PAM);
    pamPromesa = (fresco && !forzar ? Promise.resolve(guardado) : bajarPAM().then(function (html) {
      var g = { cuando: Date.now(), partes: extraerPAM(html) };
      evaluarPAM(g.partes); // si no se puede evaluar, no se guarda
      GM_setValue(CLAVE_PAM, JSON.stringify(g));
      return g;
    }).catch(function (e) {
      if (guardado) { guardado.viejo = e.message; return guardado; }
      throw new Error('No pude leer la Tabla de Canjes de PAM (' + e.message + ').');
    })).then(function (g) {
      var T = evaluarPAM(g.partes);
      T._cuando = g.cuando; T._viejo = g.viejo || null;
      prepararTabla(T);
      return T;
    });
    pamPromesa.catch(function () { pamPromesa = null; });
    return pamPromesa;
  }

  /* Índices para reconocer nombres. */
  function prepararTabla(T) {
    var alias = { esquiva: 'Esquivar', esquivar: 'Esquivar', vuelo: 'Volar', volar: 'Volar', seduccion: 'Seducir', seducir: 'Seducir' };
    T.habilidades = T.ALL_SKILLS.map(function (s) { return { n: s, k: norm(s) }; });
    Object.keys(alias).forEach(function (k) { T.habilidades.push({ n: alias[k], k: k }); });
    T.habilidades.sort(function (a, b) { return b.k.length - a.k.length; });
    T.arcanos = [];
    Object.keys(T.ARC).forEach(function (tipo) {
      Object.keys(T.ARC[tipo]).forEach(function (tier) {
        T.ARC[tipo][tier].forEach(function (a) {
          var limpio = a.name.replace(/\s*✦\s*$/, '');
          var claves = [norm(limpio)], par = limpio.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
          if (par) { claves.push(norm(par[1]), norm(par[2])); }
          T.arcanos.push({ n: limpio, k: norm(limpio), claves: claves.filter(function (c) { return c.length > 2; }), tipo: tipo, tier: tier, reqs: a.reqs || [], inv: !!a.inv });
        });
      });
    });
    T.arcanos.sort(function (a, b) { return b.k.length - a.k.length; });
    T.talentos = T.TALENTOS.map(function (t) {
      var base = t.n.split(' [')[0].split(' / ')[0];
      return { t: t, k: norm(base), variantes: t.n.indexOf(' / ') > 0 ? t.n.split(' / ').map(norm) : [norm(base)] };
    });
    T.talentos.sort(function (a, b) { return b.k.length - a.k.length; });
  }

  /* ============================== Quidditch ============================== */
  /* Maniobras y equipamiento de las Reglas del Sistema de Quidditch (t24952). No están en la Tabla de Canjes de PAM:
     si se agregan allá, esto se puede borrar. Nivel: D doméstica · B básica · I intermedia · A avanzada. */
  var QUIDDITCH = {
    precioManiobra: { D: 25, B: 75, I: 250, A: 500 },
    maniobras: {
      'Cazador': { D: ['Gol'], B: ['Pared de Pases', 'Pinza de Parkin'], I: ['Formación Cabeza de Halcón', 'Vals de Woollongong'], A: ['Pase Reverso', 'Múltiple Gol'] },
      'Golpeador': { D: ['Golpe de Bludger'], B: ['Devolución Hongo-Shingo', 'Revés Trasero de Bludger'], I: ['Despeje de bludger', 'Golpeo penetrante'], A: ['Dopplebeater Defence', 'Placaje de Transilvania'] },
      'Guardián': { D: ['Parada'], B: ['Cuarto cazador', 'Despeje'], I: ['Bandeja Wang', 'Estrella de Mar y Escoba'], A: ['Bucle DobleOcho', 'Cobertura de O’Hare'] },
      'Juego sucio': { B: ['Trampa básica'], I: ['Trampa intermedia'], A: ['Trampa avanzada'] }
    },
    precioEquipo: { 0: 0, B: 100, I: 200, A: 300 },
    equipo: {
      'Escoba': { 0: ['Barredora 1', 'Barredora 2', 'Barredora 3', 'Cometa 140', 'Cometa 180', 'Flecha de Plata'], B: ['Barredora 5', 'Barredora 6', 'Barredora 7', 'Cometa 260', 'Cometa 280', 'Nimbus 1000', 'Twigger 90'], I: ['Barredora 11', 'Cometa 290', 'Nimbus 2000', 'Nimbus 2001', 'Saeta de Fuego', 'Saeta de Trueno V'], A: ['Saeta de Fuego Suprema', 'Saeta de Trueno VII'] },
      'Protección': { B: ['Yelmo de Whisp'], I: ['Brazales de Whisp'], A: ['Pechera de Whisp'] },
      'Guantes': { B: ['Guantes de Todoroki'], I: ['Agarraderas de Llewellyn'], A: ['Magnetos de Weasley'] },
      'Bate': { B: ['Golpeabludgers de Quigley'], I: ['Quebrantahuesos de Draganov'], A: ['Lucesfuera de Jones'] }
    }
  };
  var NIVEL_Q = { 0: 'sin equipamiento', D: 'doméstica', B: 'básica', I: 'intermedia', A: 'avanzada' };
  var ANTERIOR_Q = { I: 'B', A: 'I' };
  function listaQuidditch() {
    if (listaQuidditch.cache) { return listaQuidditch.cache; }
    var out = [];
    Object.keys(QUIDDITCH.maniobras).forEach(function (g) { Object.keys(QUIDDITCH.maniobras[g]).forEach(function (t) { QUIDDITCH.maniobras[g][t].forEach(function (n) { out.push({ n: n, k: norm(n).replace(/[’']/g, ''), grupo: g, nivel: t, maniobra: true }); }); }); });
    Object.keys(QUIDDITCH.equipo).forEach(function (g) { Object.keys(QUIDDITCH.equipo[g]).forEach(function (t) { QUIDDITCH.equipo[g][t].forEach(function (n) { out.push({ n: n, k: norm(n), grupo: g, nivel: t, maniobra: false }); }); }); });
    out.sort(function (a, b) { return b.k.length - a.k.length; });
    return (listaQuidditch.cache = out);
  }
  function buscarQuidditch(desc, cat) {
    var crudo = norm(desc).replace(/[’']/g, '');
    var sinPrefijo = crudo.replace(/^(maniobra|equipamiento|escoba|proteccion|guantes?|bates?)\s*(domestica|basica|intermedia|avanzada)?\s*[:\-—>→]+\s*/, '');
    return listaQuidditch().filter(function (q) {
      return [crudo, sinPrefijo].some(function (n) {
        if (q.k.length <= 7) { return n === q.k; }
        return new RegExp('(^|[^a-z0-9])' + escRe(q.k) + '($|[^a-z0-9])').test(n);
      });
    })[0] || null;
  }

  /* ============================== el pedido ============================== */
  var CATEGORIAS = [
    [/^(estadisticas?|stats?|atributos?)$/, 'stat'], [/^habilidades?$/, 'skill'], [/^especializacion(es)?$/, 'esp'],
    [/^(trasfondos?|transfondos?|bibliotecas?|informantes|influencias?|seguidores)$/, 'bg'], [/^ventajas?$/, 'vent'],
    [/^talentos?$/, 'tal'], [/^(arcanos?|hechizos?|pociones|rituales|objetos?( \/ armas)?|magia)$/, 'arc'],
    [/^(titulos?( academicos)?|timos?|extasis)$/, 'tit'], [/^idiomas?$/, 'idi'], [/^veteran[ií]a$/, 'vet'],
    [/^((caracteristicas )?legendarias?)$/, 'leg'], [/^raza$/, 'raza'], [/^armas?$/, 'arma'], [/^(maniobras?( de quidditch)?|quidditch|juego sucio|equipamiento( de quidditch)?|escobas?|protecciones|guantes|bates)$/, 'man'],
    [/^devolucion(es)?$/, 'dev']
  ];
  var PRECIO = /(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:g|gr|grs|grag|grageas?|grajeas?)\b\.?/gi;

  function categoriaDe(linea) {
    var n = norm(linea).replace(/[^a-z0-9ñ\/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
    // «STATS: 800 grageas:» → «stats»
    var sinPrecio = n.replace(/\b\d[\d ]*\s*(g|gr|grs|grageas?|grajeas?)\b/g, '').replace(/\s+/g, ' ').trim();
    for (var i = 0; i < CATEGORIAS.length; i++) { if (CATEGORIAS[i][0].test(sinPrecio)) { return CATEGORIAS[i][1]; } }
    return null;
  }

  /* Lee un pedido: líneas con precio = canjes; encabezados = categoría; «Total» y la cabecera de PAM aparte. */
  function leerPedido(contenido) {
    var lineas = lineasDe(contenido);
    var r = { items: [], devoluciones: [], total: NaN, actualesDeclaradas: NaN, lineas: lineas };
    var cat = null;
    lineas.forEach(function (l) {
      var n = norm(l);
      var mt = n.match(/^\W*total\W*(?:[a-z ]*?)[:=]?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)/);
      if (mt) { r.total = aNumero(mt[1]); return; }
      var ma = n.match(/grageas actuales\s*:?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)/);
      if (ma) { r.actualesDeclaradas = aNumero(ma[1]); return; }
      if (/^\W*(peticion de canje|boveda\s*:|coste\s*:|costo\s*:)/.test(n)) { return; }
      var c = categoriaDe(l);
      if (c) { cat = c; return; }
      var precios = [], m;
      PRECIO.lastIndex = 0;
      while ((m = PRECIO.exec(l))) { precios.push(m); }
      if (!precios.length && cat) {
        var suelto = l.match(/^(.*\S)\s*[—–\-=:→]\s*(\d{1,3}(?:[.,]\d{3})+|\d{2,5})\s*\.?$/);
        if (suelto) { precios.push({ index: suelto[1].length, 1: suelto[2] }); }
      }
      if (!precios.length) { return; }
      var ult = precios[precios.length - 1];
      var desc = l.slice(0, ult.index).replace(/[\s—–\-=:→>·,(]+$/, '').replace(/^[\s•✦✧\-–—*·→]+/, '').trim();
      if (!desc) { return; }
      var item = { texto: l, desc: desc, precio: aNumero(ult[1]), cat: cat };
      if (cat === 'dev') { r.devoluciones.push(item); } else { r.items.push(item); }
    });
    return r;
  }

  /* ---------- reconocer un canje y su precio según la tabla ---------- */
  function clasificar(it, T) {
    var d = it.desc, n = norm(d), c = it.cat, m;
    var x = { tipo: null, nombre: d, esperado: null, alternativas: null, reqs: [], notas: [] };

    // Veteranía
    if (/punto(s)? de destino/.test(n)) { x.tipo = 'pd'; x.nombre = 'Punto de Destino'; x.esperado = 1000; x.notas.push('Máximo un Punto de Destino por año de veteranía.'); return x; }
    if (/^talentos[oa]\b/.test(n)) {
      x.tipo = 'talentoso'; x.esperado = 1000;
      x.atributo = T.STATS.filter(function (s) { return n.indexOf(norm(s)) >= 0; })[0] || null;
      x.nombre = 'Talentoso' + (x.atributo ? ' (' + x.atributo + ')' : '');
      x.reqs.push('#limites5');
      return x;
    }
    if (/l[ií]mite/.test(n) && (c === 'vet' || /extra|\+ ?1|ampli|subir|veteran/.test(n) || !c)) { x.tipo = 'limite'; x.nombre = '+1 al límite de un Atributo'; x.esperado = 500; x.notas.push('Máximo dos ampliaciones de límite por año; el límite debe estar entre 1 y 4.'); return x; }
    if (/^proeza/.test(n)) { x.tipo = 'proeza'; x.esperado = 300; x.notas.push('Una Proeza por cada Punto de Destino; requiere +9 entre Habilidad y Atributo.'); return x; }
    // Legendarias
    var leg = T.LEGENDARIAS.filter(function (L) { return n.indexOf(norm(L.nombre)) >= 0; })[0];
    if (leg) { x.tipo = 'leg'; x.nombre = leg.nombre; x.esperado = leg.price; if (leg.req) { x.notas.push(leg.req); } return x; }
    // Raza
    var raza = T.RAZAS.filter(function (R) { return n.indexOf(norm(R.n).slice(0, 7)) === 0; })[0];
    if (raza) { x.tipo = 'raza'; x.nombre = raza.n; x.esperado = raza.p; x.notas.push(raza.nota); return x; }
    // Títulos
    if (/^timos?\b/.test(n)) {
      x.tipo = 'tit'; x.nombre = 'TIMOs';
      var nt = T.NOTAS.filter(function (k) { return n.indexOf(norm(k)) >= 0; })[0];
      if (nt) { x.esperado = T.TIMOS_PRECIO[T.NOTAS.indexOf(nt)]; x.nombre += ': ' + nt; }
      x.reqs.push('#curso6');
      return x;
    }
    if (/^extasis\b/.test(n) || /^e\.?x\.?t\.?a\.?s\.?i\.?s\b/.test(n)) {
      x.tipo = 'tit';
      var nt2 = T.NOTAS.filter(function (k) { return n.indexOf(norm(k)) >= 0; })[0];
      if (nt2) { x.esperado = T.EXTASIS_PRECIO[T.NOTAS.indexOf(nt2)]; }
      x.reqs.push('#joven');
      return x;
    }
    // Idiomas
    m = d.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñü' ]{2,30}?)\s*(\((?:muggle|m[aá]gico)\))?\s*:?\s*(ninguno|bajo|medio|alto|nativo)?\s*(?:→|->|>|a)?\s*(bajo|medio|alto|nativo)\s*$/i);
    if (m && (c === 'idi' || m[3] || /\((muggle|m[aá]gico)\)/i.test(d))) {
      var magico = /m[aá]gico/i.test(m[2] || '') || T.IDIOMAS_MAGICOS.some(function (k) { return norm(k) === norm(m[1]); });
      var dI = m[3] ? NIVEL_IDIOMA[norm(m[3])] : null, hI = NIVEL_IDIOMA[norm(m[4])];
      x.tipo = 'idioma'; x.nombre = m[1].trim(); x.desde = dI; x.hasta = hI; x.magico = magico;
      if (dI !== null) { x.esperado = Math.max(0, hI - dI) * (magico ? 100 : 50); }
      else { x.porNivel = magico ? 100 : 50; }
      return x;
    }
    // Trasfondos
    if ((m = d.match(/^(Biblioteca|Informantes|Influencia|Seguidores)s?\b\s*[:—–\-·]?\s*(.+)$/i))) { return clasificarTrasfondo(m, x, T); }
    // Ventajas
    if ((m = d.match(/^(Fama|Orden de Merl[ií]n|Patr[oó]n|Recursos)\b\s*(.*)$/i))) {
      var vk = T.VENTAJAS.filter(function (v) { return norm(v) === norm(m[1]); })[0];
      var rest = m[2].replace(/·\s*[A-Za-zÁÉÍÓÚáéíóú ]+$/, '');
      var dh = desdeHasta(rest);
      x.tipo = 'vent'; x.nombre = vk; x.desde = dh.desde; x.hasta = dh.hasta; x.acum = T.VENT_ACUM;
      return x;
    }
    // Especializaciones
    if ((m = d.match(/^(Combatiente|Encantador|Hechicero|Jugador de Quidditch|Magizo[oó]logo|Mago Oscuro|Medimago)\b\s*(.*)$/i))) {
      var rama = T.ESPEC_RAMAS.filter(function (r) { return norm(r) === norm(m[1]); })[0];
      var sinNota = m[2].replace(/\(.*?\)/g, '');
      var nv = primerNivel(sinNota), todos = [], rr = /\b(III|II|I|[1-3])\b/g, q;
      while ((q = rr.exec(sinNota))) { todos.push(nivelDe(q[1])); }
      var nth = (m[2].match(/\((\d+)\s*[ªº°]?/) || [])[1];
      x.tipo = 'esp'; x.rama = rama; x.enesima = nth ? +nth : null;
      if (todos.length > 1) { x.hasta = Math.max.apply(null, todos); x.cuantas = todos.length; x.desdeEsp = Math.min.apply(null, todos) - 1; x.nombre = rama + ' ' + todos.join(' y '); }
      else { x.hasta = nv; x.cuantas = 1; x.nombre = rama + (nv ? ' ' + nv : ''); }
      return x;
    }
    // Quidditch: maniobras y equipamiento
    var q = buscarQuidditch(d, c);
    if (q) {
      x.tipo = 'man'; x.nombre = q.n; x.quidditch = q;
      x.esperado = q.maniobra ? QUIDDITCH.precioManiobra[q.nivel] : QUIDDITCH.precioEquipo[q.nivel];
      if (q.nivel === 'B') { x.reqs.push('Jugador de Quidditch 1'); }
      if (q.nivel === 'I' || q.nivel === 'A') { x.reqs.push('Jugador de Quidditch 2'); }
      if (ANTERIOR_Q[q.nivel]) {
        x.notas.push(q.maniobra
          ? 'Como los arcanos: necesita una maniobra ' + NIVEL_Q[ANTERIOR_Q[q.nivel]] + ' por cada ' + NIVEL_Q[q.nivel] + '.'
          : 'Va en orden: antes necesita ' + q.grupo.toLowerCase() + ' ' + NIVEL_Q[ANTERIOR_Q[q.nivel]] + ' (' + QUIDDITCH.equipo[q.grupo][ANTERIOR_Q[q.nivel]].join(' / ') + ').');
      }
      if (q.maniobra && q.grupo !== 'Juego sucio' && q.nivel !== 'D') { x.notas.push('Maniobra de ' + q.grupo + ': si juega en otra posición, necesita Jugador de Quidditch 3.'); }
      if (q.grupo === 'Juego sucio') { x.notas.push('Precio de juego sucio tomado como el de las maniobras de su nivel.'); }
      return x;
    }
    // Talentos (antes que atributos y habilidades: «Maestría en …», «Primeros Auxilios»…)
    var tal = T.talentos.filter(function (t) { return t.variantes.some(function (v) { return n.indexOf(v) === 0; }); })[0];
    if (tal) {
      x.tipo = 'tal'; x.nombre = d.replace(/\s*[—–-]\s*$/, ''); x.talento = tal.t.n; x.reqs = (tal.t.req || []).slice();
      var hermanos = T.talentos.filter(function (t) { return t.k === tal.k && t.t.p !== tal.t.p; });
      if (hermanos.length) { x.alternativas = [tal.t.p].concat(hermanos.map(function (h) { return h.t.p; })); x.esperado = null; x.notas.push('Según la criatura: ' + [tal.t.n + ' ' + tal.t.p].concat(hermanos.map(function (h) { return h.t.n + ' ' + h.t.p; })).join(' · ')); }
      else { x.esperado = tal.t.p; }
      if (tal.t.pl) { x.notas.push('Además cuesta ' + tal.t.pl + ' Puntos Legendarios.'); }
      return x;
    }
    // Atributos
    var stat = T.STATS.filter(function (s) { return new RegExp('^' + escRe(norm(s)) + '\\b').test(n); })[0];
    if (stat) {
      var dhs = desdeHasta(d.slice(stat.length));
      x.tipo = 'stat'; x.nombre = stat; x.desde = dhs.desde; x.hasta = dhs.hasta; x.acum = T.STAT_ACUM;
      return x;
    }
    // Habilidades (y Arte / Artesanía)
    if ((m = d.match(/^(Arte|Artesan[ií]a)\s*(?:\/\s*Artesan[ií]a)?\s*\(([^)]+)\)\s*(.*)$/i))) {
      var dha = desdeHasta(m[3]);
      x.tipo = 'skill'; x.nombre = 'Arte (' + m[2].trim() + ')'; x.arte = m[2].trim(); x.habilidad = null; x.stat = 'Voluntad';
      x.desde = dha.desde; x.hasta = dha.hasta; x.acum = T.ARTE_ACUM;
      return x;
    }
    var hab = T.habilidades.filter(function (h) { return new RegExp('^' + escRe(h.k) + '\\b').test(n); })[0];
    if (hab) {
      var resto = d.slice(hab.k.length);
      var dhk = desdeHasta(resto);
      x.tipo = 'skill'; x.nombre = hab.n; x.habilidad = hab.n; x.stat = T.SKILL_STAT[hab.n];
      x.desde = dhk.desde; x.hasta = dhk.hasta; x.acum = T.SKILL_ACUM;
      return x;
    }
    // Arcanos (hechizos, pociones, rituales, objetos)
    var pistaTipo = /\bpoci[oó]n/i.test(d) ? 'pocion' : /\britual/i.test(d) ? 'ritual' : /\bobjeto/i.test(d) ? 'objeto' : /\bhechizo/i.test(d) ? 'hechizo' : null;
    var cands = [];
    T.arcanos.forEach(function (a) {
      var mejor = 0;
      a.claves.forEach(function (k) { if (k.length > mejor && new RegExp('(^|[^a-z0-9])' + escRe(k) + '($|[^a-z0-9])').test(n)) { mejor = k.length; } });
      if (mejor) { cands.push({ a: a, largo: mejor }); }
    });
    if (cands.length) {
      var largo = Math.max.apply(null, cands.map(function (c) { return c.largo; }));
      cands = cands.filter(function (c) { return c.largo === largo; }).map(function (c) { return c.a; });
      var arc = (pistaTipo && cands.filter(function (a) { return a.tipo === pistaTipo; })[0]) || cands[0];
      x.tipo = 'arc'; x.nombre = arc.n; x.arcano = arc; x.esperado = T.TIER[arc.tier] ? T.TIER[arc.tier].price : null;
      x.reqs = arc.reqs.slice();
      var AT = T.ARC_TYPES[arc.tipo];
      if (AT && AT.skill && T.TIER[arc.tier] && T.TIER[arc.tier].gate) { x.reqs.unshift(AT.skill + ' ' + T.TIER[arc.tier].gate); }
      if ((arc.tier === 'int' || arc.tier === 'ava') && arc.tipo !== 'objeto') { x.notas.push('Necesita un arcano ' + (arc.tier === 'int' ? 'básico' : 'intermedio') + ' del mismo tipo por cada ' + T.TIER[arc.tier].m + '.'); }
      if (arc.inv) { x.notas.push('Arcano inventado: requiere permiso de su autor.'); }
      return x;
    }
    // Armas
    var mat = T.MATERIALES.filter(function (k) { return n.indexOf(norm(k.n)) >= 0; })[0];
    if (mat) { x.tipo = 'arma'; x.nombre = mat.n; x.esperado = mat.p; return x; }
    if ((m = d.match(/runa\s+(\w+)\s*(m[ií]nima|media|m[aá]xima)?/i))) {
      var cad = T.RUNE_CHAINS.filter(function (k) { return norm(k.n) === norm(m[1]); })[0];
      if (cad) {
        var lv = m[2] ? T.RUNE_LVL.map(norm).indexOf(norm(m[2])) : (cad.max === 1 ? 1 : -1);
        x.tipo = 'arma'; x.nombre = 'Runa ' + cad.n + (m[2] ? ' ' + m[2] : ''); x.esperado = lv > 0 ? T.RUNE_PRICE[lv] : null;
        if (lv > 0) { x.reqs.push('Combatiente ' + lv); }
        return x;
      }
    }
    if (/^arma (f[ií]sica|base)?/.test(n)) { x.tipo = 'arma'; x.esperado = T.ARMA_BASE; return x; }
    // Lazo / Unión / Vínculo (también si lo escriben «Vínculo con X»)
    if (/^(lazo|union|vinculo)\b/.test(n)) {
      var lz = T.TALENTOS.filter(function (t) { return /^Lazo/.test(t.n); })[0];
      x.tipo = 'tal'; x.esperado = lz ? lz.p : null; x.talento = lz ? lz.n : null; return x;
    }
    // Maniobras de Quidditch u otros: no están en la Tabla de Canjes de PAM
    x.tipo = null;
    return x;
  }

  function clasificarTrasfondo(m, x, T) {
    var tipo = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    var resto = m[2];
    var cats = tipo === 'Biblioteca' ? T.CONOCIMIENTO_CATEGORIAS : T.SOCIAL_CATEGORIAS;
    var nr = norm(resto);
    var cat = Object.keys(cats).sort(function (a, b) { return b.length - a.length; }).filter(function (k) { return nr.indexOf(norm(k)) === 0; })[0];
    x.tipo = 'bg'; x.bgTipo = tipo;
    if (!cat) { x.bgCat = null; x.notas.push('No reconozco la categoría «' + resto + '».'); return x; }
    x.bgCat = cat;
    var tras = resto.slice(cat.length);
    // ¿hay específico? «> Bastión Woodcroft: 0 → III», «> Historia de la Magia III», «Ladrones II»
    var esp = null, niveles = tras;
    var NIV = '(?:VIII|VII|VI|IV|V|III|II|I|\\d)';
    var sep = tras.match(new RegExp('^\\s*(?:' + NIV + '\\s*)?[>›—–·\\/]\\s*(.+)$'));
    var cola = sep ? sep[1] : (tras.match(new RegExp('^\\s+(?!(?:' + NIV + '|a|al|de)\\b)(\\S.*)$')) || [])[1];
    if (cola) {
      var lista = cats[cat] || [];
      var e = lista.slice().sort(function (a, b) { return b.length - a.length; }).filter(function (k) { return norm(cola).indexOf(norm(k)) === 0; })[0];
      if (e) { esp = e; niveles = cola.slice(e.length); }
      else if (new RegExp('^\\s*' + NIV + '\\b').test(cola)) { niveles = tras; /* «IV > V»: el «>» es la flecha */ }
      else {
        var mm = cola.match(new RegExp('^(.+?)\\s*(?::\\s*|\\s+(?=' + NIV + '\\b)|$)(.*)$'));
        esp = mm ? mm[1].trim() : cola.trim(); niveles = mm ? mm[2] : '';
        x.notas.push('«' + esp + '» no está en la lista oficial de ' + cat + ': revisá el nombre.');
      }
    }
    var dh = desdeHasta(niveles);
    // «Biblioteca Política III > V» (sin específico): «>» es la flecha
    if (!esp && dh.hasta === null) { dh = desdeHasta(tras); }
    x.bgEsp = esp; x.desde = dh.desde; x.hasta = dh.hasta;
    x.nombre = tipo + ' ' + cat + (esp ? ' > ' + esp : '');
    x.acum = esp ? T.TESP_ACUM : T.TGEN_ACUM;
    return x;
  }

  /* ============================== ficha ============================== */
  function leerFicha(url, T) {
    var tema = (String(url).match(/\/t(\d+)/) || [])[1];
    if (!tema) { return Promise.reject(new Error('Enlace de ficha raro: ' + url)); }
    return pedirDoc('/t' + tema + '-').then(function (d) {
      var posts = mensajesDe(d);
      if (!posts.length) { throw new Error('No pude abrir la ficha.'); }
      var autor = function (p) { var a = p.querySelector('.author a[href^="/u"]'); return a ? a.getAttribute('href') : null; };
      var duenyo = autor(posts[0]);
      // la ficha puede estar repartida en varios mensajes del dueño (los avisos cortos no cuentan)
      var partes = posts.filter(function (p, i) {
        if (autor(p) !== duenyo) { return false; }
        var c = p.querySelector('.content');
        return i === 0 || (c && c.textContent.length > 800);
      }).map(function (p) { return p.querySelector('.content'); });
      var lineas = [], finas = [];
      partes.forEach(function (c) { lineas = lineas.concat(lineasDe(c)); finas = finas.concat(fichasDe(c)); });
      return {
        url: '/t' + tema + '-', titulo: ((d.querySelector('h1.page-title') || {}).textContent || '').trim(), duenyo: duenyo,
        lineas: lineas, L: lineas.map(norm), finas: finas, F: finas.map(norm), todo: norm(lineas.join('\n')), mensajes: partes.length
      };
    });
  }

  var ES_VALOR = /^\+?\s*(\d|VIII|VII|VI|IV|V|III|II|I)$/;
  function valorSuelto(tok) { if (tok == null) { return null; } var m = String(tok).trim().match(ES_VALOR); return m ? nivelDe(m[1]) : null; }

  /* Atributo: «→ Vigor: +2» en una línea, o cajitas «II» + «Carisma» (antes o después, según la ficha). */
  function fichaAtributo(f, T, attr) {
    var k = norm(attr), re = new RegExp('^\\W*' + escRe(k) + '\\s*[:\\-–—]?\\s*\\+?\\s*(\\d)\\b');
    for (var i = 0; i < f.L.length; i++) { var m = f.L[i].match(re); if (m) { return +m[1]; } }
    var orient = f._orient;
    if (orient === undefined) {
      orient = null;
      for (var j = 0; j < f.F.length && orient === null; j++) {
        if (T.STATS.some(function (s) { return f.F[j].replace(/[:→\s]+$/, '') === norm(s); })) {
          if (valorSuelto(f.finas[j - 1]) !== null) { orient = 'antes'; } else if (valorSuelto(f.finas[j + 1]) !== null) { orient = 'despues'; } else { orient = 'despues'; }
        }
      }
      f._orient = orient;
    }
    for (var q = 0; q < f.F.length; q++) {
      if (f.F[q].replace(/^[→\-•\s]+/, '').replace(/[:\s]+$/, '') !== k) { continue; }
      var v = orient === 'antes' ? valorSuelto(f.finas[q - 1]) : valorSuelto(f.finas[q + 1]);
      if (v !== null) { return v; }
    }
    return null;
  }

  function fichaHabilidad(f, T, nombre, arte) {
    var claves = [norm(nombre)];
    var al = { esquivar: 'esquiva', volar: 'vuelo', seducir: 'seduccion' };
    if (al[claves[0]]) { claves.push(al[claves[0]]); }
    if (arte) { claves = ['arte (' + norm(arte) + ')', 'artesania (' + norm(arte) + ')', 'arte / artesania (' + norm(arte) + ')', norm(arte)]; }
    var palabra = '(sin nivel|sin entrenar|desentrenad[oa]|novat[oa]|competente|expert[oa]|maestr[oa]|legendari[oa])';
    for (var c = 0; c < claves.length; c++) {
      var re = new RegExp('^\\W*' + escRe(claves[c]) + '\\s*[:\\-–—]\\s*' + palabra);
      for (var i = 0; i < f.L.length; i++) { var m = f.L[i].match(re); if (m) { return nivelDe(m[1]); } }
      // cajitas: «Coordinación» · «Experta» · «+4» (o «Proeza» en el medio)
      for (var j = 0; j < f.F.length; j++) {
        if (f.F[j].replace(/^[→\-•\s]+/, '').replace(/[:\s]+$/, '') !== claves[c]) { continue; }
        for (var s = 1; s <= 3 && j + s < f.F.length; s++) {
          var t = f.F[j + s];
          var lv = nivelDe(t.replace(/\s*\(.*\)$/, ''));
          if (lv !== null && !/^\d$/.test(t)) { return lv; }
          var b = t.match(/^\+(\d)$/);
          if (b && BONO_NIVEL[+b[1]] !== undefined) { return BONO_NIVEL[+b[1]]; }
          if (T.habilidades.some(function (h) { return h.k === t; })) { break; }
        }
      }
    }
    return null;
  }

  function fichaTrasfondo(f, tipo, cat, esp) {
    var LV = '(vi|v|iv|iii|ii|i|[1-6])';
    var tk = norm(tipo), ck = escRe(norm(cat)), ek = esp ? escRe(norm(esp)) : null;
    var mejor = null, guardar = function (v) { if (v !== null && (mejor === null || v > mejor)) { mejor = v; } };
    var aNum = function (s) { return s ? ({ i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 }[s] || +s) : null; };
    // en una línea: «Biblioteca Callejeo II > Contrabando II - …», «Biblioteca — Medicina — Heridas mágicas III»
    var reG = new RegExp('^\\W*' + tk + 's?\\s*[:\\-—–>·]?\\s*(?:de |del )?' + ck + '\\s*[:\\-—–(]?\\s*(?:nivel\\s*)?' + LV + '\\b');
    var reE = ek ? new RegExp('^\\W*' + tk + 's?\\s*[:\\-—–>·]?\\s*(?:de |del )?' + ck + '(?:\\s*' + LV + ')?\\s*(?:>|›|—|–|-|·|\\/)?\\s*' + ek + '\\s*[:\\-—–(]?\\s*(?:nivel\\s*)?' + LV + '\\b') : null;
    f.L.forEach(function (l) {
      if (ek) { var m = l.match(reE); if (m) { guardar(aNum(m[2])); } }
      else { var g = l.match(reG); if (g) { guardar(aNum(g[1])); } }
    });
    if (mejor !== null) { return mejor; }
    // cajitas bajo un encabezado «Biblioteca»: «Cultura Mágica» · «III», o «Cultura Mágica ›» · «Historia de la Magia» · «II»
    var tipoActual = null;
    for (var i = 0; i < f.F.length; i++) {
      var t = f.F[i];
      var mt = t.match(/^(biblioteca|informantes|influencia|seguidores)s?\b/);
      if (mt && t.length < 40) { tipoActual = mt[1]; }
      if (tipoActual !== tk) { continue; }
      var limpio = t.replace(/[:\s]+$/, '');
      if (!ek && limpio === norm(cat)) { guardar(valorSuelto(f.finas[i + 1])); }
      if (ek) {
        var conCat = new RegExp('^' + ck + '\\s*[›>]?\\s*$').test(limpio) && new RegExp('^' + ek + '$').test((f.F[i + 1] || '').replace(/[:\s]+$/, ''));
        if (conCat) { guardar(valorSuelto(f.finas[i + 2])); }
        if (new RegExp('^' + ck + '\\s*[›>]\\s*' + ek + '$').test(limpio)) { guardar(valorSuelto(f.finas[i + 1])); }
      }
    }
    return mejor;
  }

  function fichaEspecializacion(f, rama) {
    var re = new RegExp('\\b' + escRe(norm(rama)) + '\\s*[:\\-—]?\\s*(?:nivel\\s*)?(iii|ii|i|[1-3])\\b', 'g');
    var max = 0, m, txt = f.todo + '\n' + f.F.join(' ');
    while ((m = re.exec(txt))) { var v = { i: 1, ii: 2, iii: 3 }[m[1]] || +m[1]; if (v > max) { max = v; } }
    return max;
  }
  function fichaVentaja(f, v) {
    var re = new RegExp('(^|\\n|\\s)' + escRe(norm(v)) + '\\s*[:\\-—]?\\s*(iv|iii|ii|i|[1-4])\\b', 'g');
    var max = 0, m, txt = f.todo + '\n' + f.F.join(' ');
    while ((m = re.exec(txt))) { var x = { i: 1, ii: 2, iii: 3, iv: 4 }[m[2]] || +m[2]; if (x > max) { max = x; } }
    if (/orden de merlin/.test(norm(v))) {
      var mo = txt.match(/orden de merlin[^\n]{0,30}?(primera|segunda|tercera) clase/);
      if (mo) { max = Math.max(max, { tercera: 1, segunda: 2, primera: 3 }[mo[1]]); }
    }
    return max;
  }
  /* «Ritual de castigo (Damnum)» también vale escrito «Ritual de castigo | Damnum», o solo con uno de los dos nombres. */
  function variantes(nombre) {
    var k = norm(nombre).replace(/\s*✦$/, ''), out = [k], par = k.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (par) { out.push(par[1].trim(), par[2].trim()); }
    return out.filter(function (v) { return v.length > 2; });
  }
  function fichaTiene(f, nombre) {
    return variantes(nombre).some(function (k) {
      var re = new RegExp('(^|[^a-z0-9])' + escRe(k) + '($|[^a-z0-9])');
      return re.test(f.todo) || f.F.some(function (t) { return re.test(t); });
    });
  }
  function fichaPD(f) {
    var m = (f.todo + '\n' + f.F.join(' ')).match(/puntos de destino\s*[:\-]?\s*(\d)/);
    return m ? +m[1] : null;
  }
  function fichaTalentoso(f, attr) {
    var a = escRe(norm(attr));
    return new RegExp('talentos[oa]\\s*[\\(:\\-—]?\\s*(de |en )?' + a + '|' + a + '[^\\n]{0,40}talentos[oa]').test(f.todo + '\n' + f.F.join(' | '));
  }

  /* ============================== bóveda ============================== */
  /* Lector de movimientos de bóveda de «Mi PJ» (pam-mi-pj.user.js), copiado tal cual. */
  function leerSaldos(texto) {
    const T = String(texto || '').replace(/ /g, ' ');
    const num2 = t => { const m = String(t).replace(/\s/g, '').match(/[+\-−]?\d[\d.,]*/); if (!m) return null; const v = parseInt(m[0].replace('−', '-').replace(/[.,](?=\d{3}(\D|$))/g, '').replace(/[.,]\d{1,2}$/, ''), 10); return isNaN(v) ? null : v; };
    const re = /(puntos\s+legendarios|\bPL\b|grageas)?[\s{]*\b(iniciales|actuales|restantes|totales)(?![a-záéíóúñ])\s*(?:de\s+la\s+b[oó]veda)?\s*[»:]?\s*(?:de\s+)?([+\-−]?\s*\d[\d.,]*)/gi;
    const sec = { gr: { campos: [] }, pl: { campos: [] } };
    let m;
    const marcas = [];
    const reM = /(puntos\s+legendarios|\bPL\b)|(grageas)/gi; let mm;
    while ((mm = reM.exec(T))) { if (/^[\s:»]*(grageas|inventario|puntos\s+legendarios|registro|\bPL\b)/i.test(T.slice(mm.index + mm[0].length, mm.index + mm[0].length + 30))) continue; marcas.push({ i: mm.index, s: mm[1] ? 'pl' : 'gr' }); }
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

  function postsDe(doc) {
    return mensajesDe(doc).map(function (p) {
      var a = p.querySelector('.author a[href^="/u"]');
      var au = p.querySelector('p.author');
      var ed = (p.textContent || '').match(/[ÚU]ltima edici[oó]n por .+? el (.+?), editado/);
      return {
        editado: ed ? leerFecha(ed[1]) : null,
        id: parseInt((p.id || '').replace(/\D/g, ''), 10) || 0,
        autor: a ? a.getAttribute('href') : null,
        autorNombre: a ? a.textContent.trim() : '',
        fecha: au ? au.textContent.replace(/\s+/g, ' ').replace(/^.*?por\s*/i, '').replace(a ? a.textContent.trim() : '', '').trim() : '',
        contenido: p.querySelector('.content')
      };
    }).map(function (x) { x.cuando = leerFecha(x.fecha); return x; });
  }

  function leerBoveda(url, idPedido) {
    var tema = (String(url).match(/\/t(\d+)/) || [])[1];
    if (!tema) { return Promise.reject(new Error('Enlace de bóveda raro: ' + url)); }
    return pedirDoc('/t' + tema + '-').then(function (d1) {
      var titulo = ((d1.querySelector('h1.page-title') || {}).textContent || '').trim();
      var max = 0;
      Array.prototype.forEach.call(d1.querySelectorAll('a[href]'), function (a) {
        var m = (a.getAttribute('href') || '').match(new RegExp('/t' + tema + 'p(\\d+)-'));
        if (m && +m[1] > max) { max = +m[1]; }
      });
      var extra = [];
      if (max) { extra.push('/t' + tema + 'p' + max + '-'); if (max >= 15) { extra.push('/t' + tema + 'p' + (max - 15) + '-'); } }
      return Promise.all(extra.map(function (u) { return pedirDoc(u).catch(function () { return null; }); })).then(function (ds) {
        var vistos = {}, posts = [];
        [d1].concat(ds).forEach(function (d, i) { if (d) { postsDe(d).forEach(function (p) { if (!vistos[p.id]) { vistos[p.id] = 1; p.final = i > 0; posts.push(p); } }); } });
        var saltadas = max > 30; // hay páginas en el medio que no se leyeron
        posts.sort(function (a, b) { return a.id - b.id; });
        var primero = posts[0];
        if (!primero) { throw new Error('No pude abrir la bóveda.'); }
        var duenyo = primero.autor;
        var cab = leerSaldos(lineasDe(primero.contenido).join('\n'));
        var cabecera = cab.gr && cab.gr.fin != null ? cab.gr.fin : NaN;
        var movido = NaN, ultimo = null, posteriores = [], antes = NaN, antesFiable = false;
        posts.slice(1).forEach(function (p) {
          var txt = lineasDe(p.contenido).join('\n');
          var esRevision = p.autor !== duenyo && /Revisi[oó]n\s+de\s+B[oó]veda/i.test(txt);
          if (p.autor !== duenyo && !esRevision) { return; }
          var s = leerSaldos(txt);
          if (!s.gr || s.gr.fin == null) { return; }
          movido = s.gr.fin; ultimo = { id: p.id, fecha: p.fecha, cuando: p.cuando, delta: s.gr.delta, autor: p.autorNombre, saldo: s.gr.fin };
          if (idPedido && p.id > idPedido && p.autor === duenyo) { posteriores.push(ultimo); }
          if (idPedido && p.id < idPedido) { antes = s.gr.fin; antesFiable = p.final || !saltadas; }
        });
        /* Manda el último movimiento, salvo que el primer mensaje se haya editado después (bóvedas que llevan el registro arriba). */
        var saldo, fuente;
        if (isNaN(movido)) { saldo = cabecera; fuente = 'cabecera'; }
        else if (isNaN(cabecera) || cabecera === movido) { saldo = movido; fuente = 'movimiento'; }
        else if (primero.editado && ultimo.cuando && primero.editado > ultimo.cuando) { saldo = cabecera; fuente = 'cabecera'; }
        else { saldo = movido; fuente = 'movimiento'; }
        return { url: '/t' + tema + '-', titulo: titulo, saldo: saldo, fuente: fuente, cabecera: cabecera, movido: movido, editado: primero.editado,
          alPedir: posteriores.length && antesFiable ? antes : NaN,
          ultimo: ultimo, posteriores: posteriores, paginas: 1 + extra.length };
      });
    });
  }

  /* ============================== la revisión ============================== */
  var cacheDocs = {};
  function enCache(clave, fn) { if (!cacheDocs[clave]) { cacheDocs[clave] = fn(); cacheDocs[clave].catch(function () { delete cacheDocs[clave]; }); } return cacheDocs[clave]; }

  function datosDelPost(postEl) {
    var a = postEl.querySelector('.author a[href^="/u"]');
    var perfil = {};
    Array.prototype.forEach.call(postEl.querySelectorAll('.profileField'), function (s) {
      var lab = s.querySelector('.label');
      if (!lab) { return; }
      perfil[norm(lab.textContent).replace(/[\s:]+$/, '')] = s.textContent.replace(lab.textContent, '').replace(/\s+/g, ' ').trim();
    });
    var ficha = null, boveda = null, otros = [];
    var tabs = postEl.querySelectorAll('.tab_content');
    var zona = tabs.length ? tabs[tabs.length - 1] : postEl;
    Array.prototype.forEach.call(zona.querySelectorAll('a[href*="/t"]'), function (l) {
      var img = l.querySelector('img'), src = img ? (img.getAttribute('src') || '') : '';
      if (src.indexOf(ICONO_FICHA) >= 0 && !ficha) { ficha = l.getAttribute('href'); }
      else if (src.indexOf(ICONO_BOVEDA) >= 0 && !boveda) { boveda = l.getAttribute('href'); }
      else { otros.push(l.getAttribute('href')); }
    });
    if (!ficha && otros.length) { ficha = otros.shift(); }
    if (!boveda && otros.length) { boveda = otros.shift(); }
    return {
      id: parseInt((postEl.id || '').replace(/\D/g, ''), 10) || 0,
      autor: a ? a.getAttribute('href') : null,
      nombre: a ? a.textContent.trim() : '',
      etapa: perfil.etapa || '', raza: perfil.raza || '', edad: parseInt(perfil.edad, 10) || null, curso: perfil.curso || '',
      ficha: ficha, boveda: boveda
    };
  }

  function revisar(postEl, T) {
    var D = datosDelPost(postEl);
    var pedido = leerPedido(postEl.querySelector('.content'));
    var avisos = [];
    var pF = D.ficha ? enCache('f' + D.ficha, function () { return leerFicha(D.ficha, T); }).catch(function (e) { avisos.push('Ficha: ' + e.message); return null; }) : Promise.resolve(null);
    var pB = D.boveda ? enCache('b' + D.boveda + '#' + D.id, function () { return leerBoveda(D.boveda, D.id); }).catch(function (e) { avisos.push('Bóveda: ' + e.message); return null; }) : Promise.resolve(null);
    if (!D.ficha) { avisos.push('No encontré el enlace a la ficha en la pestaña «Fichas» del perfil.'); }
    if (!D.boveda) { avisos.push('No encontré el enlace a la bóveda en la pestaña «Fichas» del perfil.'); }
    return Promise.all([pF, pB]).then(function (r) {
      var ficha = r[0], boveda = r[1];
      var items = pedido.items.map(function (it) { var c = clasificar(it, T); c.item = it; return c; });
      evaluar(items, ficha, D, T);
      var suma = items.reduce(function (s, x) { return s + (x.item.precio || 0); }, 0);
      var esperadoTotal = items.every(function (x) { return x.esperado != null; }) ? items.reduce(function (s, x) { return s + x.esperado; }, 0) : null;
      return { D: D, pedido: pedido, items: items, ficha: ficha, boveda: boveda, suma: suma, esperadoTotal: esperadoTotal, avisos: avisos };
    });
  }

  /* Compara cada canje con la tabla y con la ficha. estado: ok · warn · bad · unk */
  function evaluar(items, f, D, T) {
    // lo que el mismo pedido ya trae (sirve de requisito para lo siguiente)
    var carrito = { stat: {}, skill: {}, esp: {}, nombres: [], talentoso: {} };
    items.forEach(function (x) {
      if (x.tipo === 'stat' && x.hasta != null) { carrito.stat[x.nombre] = Math.max(carrito.stat[x.nombre] || 0, x.hasta); }
      if (x.tipo === 'skill' && x.habilidad && x.hasta != null) { carrito.skill[x.habilidad] = Math.max(carrito.skill[x.habilidad] || 0, x.hasta); }
      if (x.tipo === 'esp' && x.hasta) { carrito.esp[x.rama] = Math.max(carrito.esp[x.rama] || 0, x.hasta); }
      if (x.tipo === 'talentoso' && x.atributo) { carrito.talentoso[x.atributo] = true; }
      if (x.tipo === 'arc' || x.tipo === 'tal' || x.tipo === 'man') { carrito.nombres = carrito.nombres.concat(variantes(x.talento || x.nombre)); }
    });
    // especializaciones: la n-ésima cuesta 150 × n (cuentan las que ya tiene)
    var espYa = f ? T.ESPEC_RAMAS.reduce(function (s, r) { return s + fichaEspecializacion(f, r); }, 0) : null;
    // si la ficha ya muestra alguna de las pedidas, no cuenta para el precio
    if (espYa != null) { items.forEach(function (x) { if (x.tipo === 'esp' && x.hasta && fichaEspecializacion(f, x.rama) >= x.hasta) { espYa -= (x.cuantas || 1); } }); espYa = Math.max(0, espYa); }
    var espN = 0;

    items.forEach(function (x) {
      x.estado = 'ok'; x.ficha = null; x.problemas = [];
      var p = x.item.precio;
      var problema = function (txt, grave) { x.problemas.push({ t: txt, grave: !!grave }); };

      if (!x.tipo) { x.estado = 'unk'; problema('No lo reconozco en la Tabla de Canjes de PAM: revisalo a mano.'); return; }

      // niveles y precio de las subidas
      if (x.acum) {
        var actual = null;
        if (f) {
          if (x.tipo === 'stat') { actual = fichaAtributo(f, T, x.nombre); }
          if (x.tipo === 'skill') { actual = fichaHabilidad(f, T, x.habilidad || '', x.arte); }
          if (x.tipo === 'bg' && x.bgCat) { actual = fichaTrasfondo(f, x.bgTipo, x.bgCat, x.bgEsp); if (actual === null) { actual = 0; x.fichaNoVista = true; } }
          if (x.tipo === 'vent') { actual = fichaVentaja(f, x.nombre); }
        }
        x.ficha = actual;
        var yaAplicado = actual != null && x.hasta != null && actual >= x.hasta && !(x.tipo === 'bg' && x.fichaNoVista);
        var desde = x.desde != null ? x.desde : (yaAplicado ? null : actual);
        if (yaAplicado) { problema('La ficha ya lo muestra en ' + etiquetaNivel(x, actual) + ': parece que ya lo aplicó.'); }
        if (x.hasta == null) { problema('No entiendo a qué nivel lo sube.'); x.estado = 'unk'; }
        else if (desde == null) { if (!yaAplicado) { problema('No dice desde qué nivel y no lo encontré en la ficha.'); } }
        else {
          x.desdeUsado = desde;
          x.esperado = Math.max(0, (x.acum[x.hasta] || 0) - (x.acum[desde] || 0));
          if (x.hasta <= desde) { problema('El nivel nuevo no es mayor que el actual.', true); }
        }
        if (actual != null && x.desde != null && actual !== x.desde && !yaAplicado && !(x.tipo === 'bg' && x.fichaNoVista)) {
          problema('En la ficha figura ' + etiquetaNivel(x, actual) + ', no ' + etiquetaNivel(x, x.desde) + '.');
        }
        if (x.tipo === 'bg' && x.fichaNoVista && x.desde) { problema('No lo encontré en la ficha (dice que lo tiene en ' + etiquetaNivel(x, x.desde) + ').'); }
        if (x.tipo === 'bg' && x.fichaNoVista && x.desde == null) { problema('No dice desde qué nivel y no lo encontré en la ficha: lo calculé desde 0.'); }
        if (x.tipo === 'stat' && x.hasta != null) {
          if (x.hasta > 5 && x.hasta < 8 && !carrito.talentoso[x.nombre] && !(f && fichaTalentoso(f, x.nombre))) { problema('Por encima de 5 necesita Talentoso (' + x.nombre + ').', true); }
          else if (x.hasta === 5 && (desde == null || desde < 5)) { x.notas.push('Necesita tener el límite de ' + x.nombre + ' en 5.'); }
          if (x.hasta === 8) { x.notas.push('Atributo Legendario: necesita Veteranía Legendaria (17 PL).'); }
        }
        if (x.tipo === 'skill' && x.hasta != null && x.stat) {
          if (x.hasta >= 4 && (desde == null || desde < 4) && !carrito.talentoso[x.stat] && !(f && fichaTalentoso(f, x.stat))) { problema('Maestro necesita Talentoso de ' + x.stat + ' (no lo veo en la ficha ni en el pedido).', true); }
          if (x.hasta === 5) { x.notas.push('Habilidad Legendaria: necesita Veteranía Legendaria (7 PL).'); }
        }
      }
      if (x.tipo === 'idioma' && x.esperado == null && x.porNivel && f) {
        var mi = f.todo.match(new RegExp(escRe(norm(x.nombre)) + '\\s*[:\\-—(]?\\s*(bajo|medio|alto|nativo|basico|intermedio|avanzado)'));
        var dI = mi ? ({ basico: 1, intermedio: 2, avanzado: 3 }[mi[1]] || NIVEL_IDIOMA[mi[1]]) : 0;
        x.ficha = dI; x.esperado = Math.max(0, x.hasta - dI) * x.porNivel;
      }
      if (x.tipo === 'esp') {
        var cuantas = x.cuantas || 1, suma = 0, primera = null;
        for (var k = 0; k < cuantas; k++) {
          espN += 1;
          var n = espYa != null ? espYa + espN : (x.enesima ? x.enesima + k : null);
          if (primera === null) { primera = n; }
          suma = n ? suma + 150 * n : NaN;
        }
        x.esperado = isNaN(suma) ? null : suma;
        if (f) {
          var ya = fichaEspecializacion(f, x.rama);
          x.ficha = ya;
          var minimo = cuantas > 1 ? x.desdeEsp + 1 : x.hasta;
          if (x.hasta && ya >= x.hasta) { problema('La ficha ya muestra ' + x.rama + ' ' + ya + ': parece que ya lo aplicó.'); }
          else if (x.hasta && minimo > ya + 1 && !(carrito.esp[x.rama] >= minimo - 1 && carrito.esp[x.rama] < x.hasta)) { problema('Salta niveles: en la ficha tiene ' + x.rama + ' ' + ya + '.', true); }
          if (x.enesima && espYa != null && primera && x.enesima !== primera) { problema('Dice que es la ' + x.enesima + 'ª especialización, pero con las de la ficha sería la ' + primera + 'ª.'); }
        }
      }
      if (x.tipo === 'pd' && f) { x.ficha = fichaPD(f); }
      if (x.tipo === 'talentoso') {
        if (!x.atributo) { problema('No dice para qué Atributo.', true); }
        else if (f && fichaTalentoso(f, x.atributo)) { problema('Ya figura Talentoso (' + x.atributo + ') en la ficha.'); }
        x.notas.push('Verificar que todos los Atributos tengan el límite en 5 y que haya hueco de Talentoso para su Etapa.');
      }
      if ((x.tipo === 'arc' || x.tipo === 'tal' || x.tipo === 'man') && f) {
        var nombre = x.tipo !== 'tal' ? x.nombre : (x.talento && x.talento.indexOf('[') < 0 && !/^Lazo/.test(x.talento) ? x.talento : null);
        if (nombre && fichaTiene(f, nombre)) { problema('«' + nombre + '» ya aparece en la ficha.'); }
      }
      if (x.tipo === 'raza' && /semigigante/i.test(x.nombre) && D.raza && !/semigigant/i.test(D.raza)) { problema('Es exclusivo de Semigigantes y el perfil dice ' + D.raza + '.', true); }

      // requisitos
      (x.reqs || []).forEach(function (r) {
        var st = cumpleRequisito(r, f, D, T, carrito);
        if (st.ok === false) { problema('Requisito: ' + st.txt, true); }
        else if (st.ok === null) { problema('Verificar requisito: ' + st.txt); }
      });

      // precio
      if (x.alternativas) {
        if (p != null && x.alternativas.indexOf(p) < 0) { problema('El precio es ' + x.alternativas.join(' o ') + ', no ' + fmt(p) + '.', true); }
      } else if (x.esperado != null && p != null && p !== x.esperado) {
        problema('Según la tabla cuesta ' + fmt(x.esperado) + ', no ' + fmt(p) + '.', true);
      } else if (x.esperado == null) {
        problema('No pude calcular el precio: revisalo a mano.');
      }
      // equipamiento de Quidditch en orden: el del nivel anterior tiene que estar en la ficha o en el mismo pedido
      if (x.tipo === 'man' && x.quidditch && !x.quidditch.maniobra && ANTERIOR_Q[x.quidditch.nivel]) {
        var previos = QUIDDITCH.equipo[x.quidditch.grupo][ANTERIOR_Q[x.quidditch.nivel]];
        var loTiene = previos.some(function (pv) { return carrito.nombres.indexOf(norm(pv)) >= 0 || (f && fichaTiene(f, pv)); });
        if (!loTiene) { problema('No veo ' + x.quidditch.grupo.toLowerCase() + ' ' + NIVEL_Q[ANTERIOR_Q[x.quidditch.nivel]] + ' en la ficha ni en el pedido (' + previos.join(' / ') + ').'); }
      }

      x.estado = x.problemas.some(function (q) { return q.grave; }) ? 'bad' : (x.problemas.length ? (x.estado === 'unk' ? 'unk' : 'warn') : 'ok');
    });
  }

  function etiquetaNivel(x, v) {
    if (v == null) { return '—'; }
    if (x.tipo === 'skill') { return ['Sin nivel', 'Novato', 'Competente', 'Experto', 'Maestro', 'Legendario'][v] || v; }
    if (x.tipo === 'bg' || x.tipo === 'vent') { return ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'][v] || v; }
    return String(v);
  }

  function cumpleRequisito(r, f, D, T, carrito) {
    var m;
    if (r === '#curso6') {
      var cur = parseInt(D.curso, 10);
      if (/graduad/i.test(D.curso)) { return { ok: true }; }
      return isNaN(cur) ? { ok: null, txt: 'estar en 6º curso o más' } : { ok: cur >= 6, txt: 'estar en 6º curso o más (perfil: ' + D.curso + ')' };
    }
    if (r === '#joven') {
      var orden = ['infante', 'adolescente', 'joven', 'adulto', 'experimentado', 'veterano'];
      var e = orden.indexOf(norm(D.etapa).replace(/a$/, 'o').replace(/^jove(n|na)$/, 'joven'));
      if (/joven/.test(norm(D.etapa))) { e = 2; }
      return e < 0 ? { ok: null, txt: 'etapa Joven o más' } : { ok: e >= 2, txt: 'etapa Joven o más (perfil: ' + D.etapa + ')' };
    }
    if (r === '#limites5') { return { ok: null, txt: 'todos los Atributos con límite 5' }; }
    if ((m = r.match(/^PJ de (\d+) años/))) { return D.edad == null ? { ok: null, txt: r } : { ok: D.edad >= +m[1], txt: r + ' (perfil: ' + D.edad + ')' }; }
    if ((m = r.match(/^(Combatiente|Encantador|Hechicero|Jugador de Quidditch|Magizo[oó]logo|Mago Oscuro|Medimago)\s+(\d)$/i))) {
      var rama = T.ESPEC_RAMAS.filter(function (k) { return norm(k) === norm(m[1]); })[0] || m[1];
      var tiene = Math.max(f ? fichaEspecializacion(f, rama) : 0, carrito.esp[rama] || 0);
      return f || carrito.esp[rama] ? { ok: tiene >= +m[2], txt: rama + ' ' + m[2] + (f ? ' (ficha: ' + tiene + ')' : '') } : { ok: null, txt: rama + ' ' + m[2] };
    }
    if ((m = r.match(/^(.+?)\s+(\d)$/))) {
      var st = T.STATS.filter(function (s) { return norm(s) === norm(m[1]); })[0];
      if (st) {
        var fa = f ? fichaAtributo(f, T, st) : null;
        if (fa == null && !carrito.stat[st]) { return { ok: null, txt: r + (f ? ' (no lo encontré en la ficha)' : '') }; }
        var vs = Math.max(fa || 0, carrito.stat[st] || 0);
        return { ok: vs >= +m[2], txt: st + ' ' + m[2] + ' (tiene ' + vs + ')' };
      }
      var hb = T.habilidades.filter(function (h) { return h.k === norm(m[1]); })[0];
      if (hb) {
        var nom = ['Sin nivel', 'Novato', 'Competente', 'Experto', 'Maestro', 'Legendario'];
        var fh = f ? fichaHabilidad(f, T, hb.n) : null;
        if (fh == null && !carrito.skill[hb.n]) { return { ok: null, txt: hb.n + ' ' + nom[+m[2]] + (f ? ' (no lo encontré en la ficha)' : '') }; }
        var vh = Math.max(fh || 0, carrito.skill[hb.n] || 0);
        return { ok: vh >= +m[2], txt: hb.n + ' ' + nom[+m[2]] + ' (tiene ' + nom[vh] + ')' };
      }
    }
    if ((m = r.match(/^(.+?)\s+(Novato|Competente|Experto|Maestro)$/i))) { return { ok: null, txt: r }; }
    // un arcano, un talento u otra cosa con nombre
    if (variantes(r).some(function (v) { return carrito.nombres.indexOf(v) >= 0; })) { return { ok: true }; }
    if (/^Un (Compa[ñn]ero Animal|Reanimado)/i.test(r)) { var k = /reanimado/i.test(r) ? 'reanimado' : 'companero animal'; return f ? { ok: f.todo.indexOf(k) >= 0 || null, txt: r } : { ok: null, txt: r }; }
    if (f) {
      var limpio = r.replace(/\[[^\]]*\]/g, '').trim();
      if (fichaTiene(f, limpio)) { return { ok: true }; }
      return { ok: /\[/.test(r) ? null : false, txt: r + ' (no lo veo en la ficha)' };
    }
    return { ok: null, txt: r };
  }

  /* ============================== interfaz ============================== */
  var CSS = [
    '.icj{--x-ink:var(--m-ink,#171a2b);--x-panel:var(--m-panel,#1e2236);--x-panel2:var(--m-panel-2,#262a42);--x-parch:var(--m-parchment,#F1EADF);--x-dim:var(--m-parchment-dim,#a7a1b6);',
    '--x-gold:var(--m-gold,#B49768);--x-goldb:var(--m-gold-bright,#d6bd8f);--x-arc:var(--m-arcane-bright,#cf94a3);--x-good:var(--m-good,#93b8a0);--x-bad:var(--m-bad,#d98377);--x-line:var(--m-line-strong,rgba(241,234,223,.16));',
    '--x-acc:var(--m-accent-ink,#1b1e30);--x-serif:var(--m-serif,"Cormorant Garamond",Georgia,serif);--x-sans:var(--m-sans,"Nunito",system-ui,sans-serif);font-family:var(--x-sans);color:var(--x-parch);font-size:13.5px;line-height:1.45;text-align:left}',
    '.icj *{box-sizing:border-box}',
    '.icj a{color:var(--x-goldb);text-decoration:none;border-bottom:1px dotted color-mix(in srgb,var(--x-gold) 60%,transparent)}',
    '.icj-barra{margin:12px 0 4px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;background:var(--x-panel);border:1px solid color-mix(in srgb,var(--x-gold) 40%,transparent)}',
    '.icj-barra .marca{font-family:var(--x-serif);font-style:italic;font-size:17px;color:var(--x-goldb);margin-right:4px}',
    '.icj .chip{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;border:1px solid var(--x-line);white-space:nowrap}',
    '.icj .chip.ok{color:var(--x-good);border-color:color-mix(in srgb,var(--x-good) 50%,transparent)}',
    '.icj .chip.bad{color:var(--x-bad);border-color:color-mix(in srgb,var(--x-bad) 50%,transparent)}',
    '.icj .chip.warn{color:var(--x-goldb);border-color:color-mix(in srgb,var(--x-gold) 55%,transparent)}',
    '.icj .chip.dim{color:var(--x-dim)}',
    '.icj .esp{flex:1}',
    '.icj .b{font:700 12px var(--x-sans);border-radius:999px;padding:6px 13px;cursor:pointer;border:1px solid var(--x-line);background:color-mix(in srgb,var(--x-panel2) 90%,transparent);color:var(--x-parch);transition:border-color .2s,transform .2s}',
    '.icj .b:hover{border-color:var(--x-gold);transform:translateY(-1px)}',
    '.icj .b.pri{background:var(--x-gold);border-color:var(--x-gold);color:var(--x-acc)}',
    '.icj .b.si{border-color:var(--x-good);color:var(--x-good);background:transparent}',
    '.icj .b.si.on{background:var(--x-good);color:var(--x-acc)}',
    '.icj .b.no{border-color:var(--x-bad);color:var(--x-bad);background:transparent}',
    '.icj .b.no.on{background:var(--x-bad);color:var(--x-acc)}',
    '.icj .b:disabled{opacity:.5;cursor:default;transform:none}',
    '.icj-caja{margin:6px 0 14px;padding:14px 16px;border-radius:16px;background:radial-gradient(500px 200px at 0% 0%,color-mix(in srgb,var(--x-arc) 14%,transparent),transparent 70%),var(--x-panel);border:1px solid var(--x-gold);box-shadow:0 20px 50px -30px #000;display:grid;gap:10px}',
    '.icj-caja .cab{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px}',
    '.icj-caja .cab b{font-family:var(--x-serif);font-style:italic;font-weight:500;font-size:24px;color:var(--x-goldb)}',
    '.icj-caja .cab small{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--x-dim)}',
    '.icj .fila{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.icj .tarjetas{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}',
    '.icj .tj{padding:9px 11px;border-radius:12px;background:color-mix(in srgb,var(--x-panel2) 70%,transparent);border:1px solid var(--x-line)}',
    '.icj .tj .k{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--x-dim);font-weight:700}',
    '.icj .tj .v{font-family:var(--x-serif);font-size:22px;line-height:1.1;font-variant-numeric:tabular-nums}',
    '.icj .tj .s{font-size:11.5px;color:var(--x-dim)}',
    '.icj .tj.ok{border-color:color-mix(in srgb,var(--x-good) 45%,transparent)}.icj .tj.ok .v{color:var(--x-good)}',
    '.icj .tj.bad{border-color:color-mix(in srgb,var(--x-bad) 50%,transparent)}.icj .tj.bad .v{color:var(--x-bad)}',
    '.icj .tj.warn{border-color:color-mix(in srgb,var(--x-gold) 50%,transparent)}.icj .tj.warn .v{color:var(--x-goldb)}',
    '.icj table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}',
    '.icj th{text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--x-dim);padding:4px 6px;border-bottom:1px solid var(--x-line)}',
    '.icj td{padding:6px;border-bottom:1px dashed var(--x-line);vertical-align:top}',
    '.icj td.n{text-align:right;white-space:nowrap}',
    '.icj td.e{width:22px;font-weight:700;text-align:center}',
    '.icj .ok{color:var(--x-good)}.icj .bad{color:var(--x-bad)}.icj .warn{color:var(--x-goldb)}.icj .unk{color:var(--x-arc)}.icj .dim{color:var(--x-dim)}',
    '.icj .prob{font-size:12px;margin-top:2px}',
    '.icj .prob label{display:flex;gap:6px;align-items:flex-start;cursor:pointer}',
    '.icj .prob input{margin-top:3px;accent-color:var(--x-gold)}',
    '.icj .nota{font-size:11.5px;color:var(--x-dim);margin-top:2px}',
    '.icj .orig{font-size:11.5px;color:var(--x-dim)}',
    '.icj .aviso{padding:7px 10px;border-radius:10px;border-left:3px solid var(--x-gold);background:color-mix(in srgb,var(--x-gold) 12%,transparent);font-size:12.5px}',
    '.icj .cargando{color:var(--x-dim);font-style:italic}',
    '.icj .dev{font-size:12.5px;padding:7px 10px;border-radius:10px;border:1px dashed var(--x-line)}',
    // panel flotante
    '.icj.flot{position:fixed;right:16px;bottom:16px;z-index:99990;width:380px;max-width:calc(100vw - 24px)}',
    '.icj.flot .box{background:radial-gradient(420px 180px at 0% 0%,color-mix(in srgb,var(--x-arc) 16%,transparent),transparent 70%),var(--x-panel);border:1px solid color-mix(in srgb,var(--x-gold) 45%,transparent);border-radius:16px;box-shadow:0 24px 60px -24px rgba(0,0,0,.75);max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden}',
    '.icj.flot .hd{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;cursor:pointer;user-select:none;border-bottom:1px solid var(--x-line)}',
    '.icj.flot .brand{font-family:var(--x-serif);font-style:italic;font-size:20px}',
    '.icj.flot .brand i{font-style:normal;color:var(--x-goldb);font-size:13px;margin-right:4px}',
    '.icj.flot .hd small{margin-left:auto;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--x-dim)}',
    '.icj.flot .bd{padding:6px 16px 14px;overflow:auto;display:grid;gap:10px}',
    '.icj.flot .card{padding:11px 13px;border-radius:12px;background:color-mix(in srgb,var(--x-panel2) 70%,transparent);border:1px solid var(--x-line);display:grid;gap:7px}',
    '.icj.flot .ct{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--x-goldb);font-weight:700}',
    '.icj.flot .pill{display:flex;align-items:center;gap:10px;margin-left:auto;width:max-content;padding:8px 16px;border-radius:999px;cursor:pointer;background:var(--x-panel);border:1px solid color-mix(in srgb,var(--x-gold) 50%,transparent);box-shadow:0 14px 34px -14px rgba(0,0,0,.7)}',
    '.icj.flot .pill .brand{font-size:17px}',
    '.icj.flot .pill .n{font-size:11px;font-weight:700;padding:1px 8px;border-radius:999px;background:var(--x-arc);color:var(--x-acc)}',
    '.icj .lista{display:grid;gap:4px;font-size:12.5px}',
    '.icj .lista a{border:0}',
    '.icj .lista .it{display:flex;gap:8px;align-items:center;justify-content:space-between}',
    '.icj textarea{display:block;width:100%;min-height:130px;resize:vertical;font:12.5px/1.5 var(--x-sans);background:var(--x-ink);color:var(--x-parch);border:1px solid var(--x-gold);border-radius:10px;padding:8px 10px}',
    '.icj .acciones{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}',
    '.icj .msg{font-size:12px;color:var(--x-dim);min-height:1.2em}',
    'html[data-mipj-skin="pixel"] .icj-barra,html[data-mipj-skin="pixel"] .icj-caja,html[data-mipj-skin="pixel"] .icj .b,html[data-mipj-skin="pixel"] .icj .tj,html[data-mipj-skin="pixel"] .icj.flot .box,html[data-mipj-skin="pixel"] .icj.flot .card,html[data-mipj-skin="pixel"] .icj.flot .pill{border-radius:0}'
  ].join('\n');

  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'clase') { e.className = attrs[k]; }
      else if (k === 'texto') { e.textContent = attrs[k]; }
      else if (k === 'html') { e.innerHTML = attrs[k]; }
      else if (k.indexOf('on') === 0) { e.addEventListener(k.slice(2), attrs[k]); }
      else { e.setAttribute(k, attrs[k]); }
    });
    (hijos || []).forEach(function (h) { if (h) { e.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); } });
    return e;
  }

  /* Estado de la página: un registro por pedido. */
  var pedidos = [];   // {post, D, barra, caja, res, decision:'ok'|'fix'|null, revisadoPor}
  var panel = null;

  function iniciar() {
    if (!document.querySelector('.post')) { return; }
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    if (!document.querySelector('link[href*="Cormorant+Garamond"]')) {
      document.head.appendChild(el('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Nunito:wght@400;700&display=swap' }));
    }
    var posts = mensajesDe(document);
    var datos = posts.map(function (p) { return { post: p, D: datosDelPost(p), pedido: leerPedido(p.querySelector('.content')) }; });
    datos.forEach(function (x, i) {
      if (!x.pedido.items.length && !x.pedido.devoluciones.length) { return; }
      // ¿alguien respondió después nombrando al PJ?
      var pila = norm(nombrePila(x.D.nombre));
      var resp = null;
      for (var j = i + 1; j < datos.length && !resp; j++) {
        var y = datos[j];
        if (y.D.autor === x.D.autor || y.pedido.items.length) { continue; }
        var txt = norm(lineasDe(y.post.querySelector('.content')).join(' '));
        if (new RegExp('(^|[^a-z])' + escRe(pila) + '([^a-z]|$)').test(txt)) { resp = { nombre: y.D.nombre, id: y.D.id, positivo: /correct|pued(e|en|es) (anadir|agregar)|podeis/.test(txt) }; }
      }
      var reg = { post: x.post, D: x.D, res: null, decision: null, revisadoPor: resp };
      pedidos.push(reg);
      ponerBarra(reg);
    });
    ponerPanel();
    cargarPAM(false).catch(function () { /* se avisa al revisar */ });
  }

  function ponerBarra(reg) {
    var cont = reg.post.querySelector('.content');
    var r = reg.revisadoPor;
    var estado = r ? el('span', { clase: 'chip ' + (r.positivo ? 'ok' : 'warn'), texto: (r.positivo ? '✓ Aprobado por ' : '✎ Respondido por ') + r.nombre }) : el('span', { clase: 'chip dim', texto: '◷ Sin respuesta' });
    var boton = el('button', { clase: 'b pri', type: 'button', texto: '✦ Revisar canje', onclick: function () { revisarUno(reg); } });
    reg.barra = el('div', { clase: 'icj icj-barra' }, [el('span', { clase: 'marca', texto: 'Inspector' }), estado, el('span', { clase: 'esp' }), boton]);
    reg.boton = boton;
    cont.parentNode.insertBefore(reg.barra, cont.nextSibling);
  }

  function revisarUno(reg) {
    reg.boton.disabled = true; reg.boton.textContent = 'Revisando…';
    if (!reg.caja) { reg.caja = el('div', { clase: 'icj icj-caja' }); reg.barra.parentNode.insertBefore(reg.caja, reg.barra.nextSibling); }
    reg.caja.innerHTML = '<div class="cargando">Leyendo la Tabla de PAM, la ficha y la bóveda…</div>';
    return cargarPAM(false).then(function (T) { return revisar(reg.post, T).then(function (res) { res.T = T; return res; }); }).then(function (res) {
      reg.res = res;
      pintarCaja(reg);
      reg.boton.disabled = false; reg.boton.textContent = '↻ Volver a revisar';
      repintarPanel();
    }).catch(function (e) {
      reg.caja.innerHTML = '';
      reg.caja.appendChild(el('div', { clase: 'aviso', texto: e.message }));
      reg.boton.disabled = false; reg.boton.textContent = '✦ Revisar canje';
    });
  }

  var ICONO = { ok: '✓', warn: '!', bad: '✕', unk: '?' };
  function pintarCaja(reg) {
    var res = reg.res, D = res.D, caja = reg.caja;
    caja.innerHTML = '';
    var malos = res.items.filter(function (x) { return x.estado === 'bad'; }).length;
    var dudas = res.items.filter(function (x) { return x.estado === 'warn' || x.estado === 'unk'; }).length;
    caja.appendChild(el('div', { clase: 'cab' }, [
      el('b', { texto: 'Canje de ' + D.nombre }),
      el('small', { texto: res.items.length + ' canje' + (res.items.length !== 1 ? 's' : '') + ' · ' + (malos ? malos + ' con error' : 'sin errores') + (dudas ? ' · ' + dudas + ' para mirar' : '') })
    ]));

    // tarjetas: bóveda, total, ficha
    var B = res.boveda, total = !isNaN(res.pedido.total) ? res.pedido.total : res.suma;
    var tarjetas = el('div', { clase: 'tarjetas' });
    if (B && !isNaN(B.saldo)) {
      var base = !isNaN(B.alPedir) ? B.alPedir : B.saldo;
      var queda = base - total;
      tarjetas.appendChild(el('div', { clase: 'tj ' + (queda >= 0 ? 'ok' : 'bad') }, [
        el('div', { clase: 'k', texto: !isNaN(B.alPedir) ? 'Bóveda al pedir' : 'Bóveda' }), el('div', { clase: 'v', texto: fmt(base) }),
        el('div', { clase: 's', texto: (queda >= 0 ? 'Quedan ' + fmt(queda) : 'Faltan ' + fmt(-queda)) + (!isNaN(B.alPedir) ? ' · hoy tiene ' + fmt(B.saldo) : '') })
      ]));
    } else {
      tarjetas.appendChild(el('div', { clase: 'tj warn' }, [el('div', { clase: 'k', texto: 'Bóveda' }), el('div', { clase: 'v', texto: '?' }), el('div', { clase: 's', texto: 'No pude leer el saldo' })]));
    }
    var sumaOk = isNaN(res.pedido.total) || res.pedido.total === res.suma;
    var espOk = res.esperadoTotal == null || res.esperadoTotal === total;
    tarjetas.appendChild(el('div', { clase: 'tj ' + (sumaOk && espOk ? 'ok' : 'bad') }, [
      el('div', { clase: 'k', texto: 'Total pedido' }), el('div', { clase: 'v', texto: fmt(total) }),
      el('div', { clase: 's', texto: (!sumaOk ? 'Los canjes suman ' + fmt(res.suma) + '. ' : '') + (res.esperadoTotal != null ? (espOk ? 'Coincide con la tabla' : 'Según la tabla: ' + fmt(res.esperadoTotal)) : 'Hay precios sin calcular') })
    ]));
    var F = res.ficha;
    tarjetas.appendChild(el('div', { clase: 'tj ' + (F ? '' : 'warn') }, [
      el('div', { clase: 'k', texto: 'Ficha' }), el('div', { clase: 'v', texto: F ? (F.titulo || 'Ficha') : '?' }),
      el('div', { clase: 's', texto: [D.raza, D.etapa, D.edad ? D.edad + ' años' : ''].filter(Boolean).join(' · ') })
    ]));
    caja.appendChild(tarjetas);

    var enl = [];
    if (F) { enl.push(el('a', { href: F.url, target: '_blank', texto: 'Abrir ficha' })); }
    if (B) { enl.push(el('a', { href: B.url, target: '_blank', texto: 'Abrir bóveda' })); }
    if (B && B.ultimo) { enl.push(el('span', { clase: 'dim', texto: 'Último movimiento: ' + (B.ultimo.fecha || '') })); }
    if (enl.length) { caja.appendChild(el('div', { clase: 'fila' }, enl)); }

    var avisos = res.avisos.slice();
    if (B && B.posteriores.length) { avisos.push('La bóveda tiene ' + B.posteriores.length + ' movimiento(s) posteriores al pedido: puede que ya haya descontado el canje. ' + (!isNaN(B.alPedir) ? 'Comparo con lo que tenía al pedir.' : 'No encontré el saldo de antes del pedido: el de arriba es el de hoy.')); }
    if (!isNaN(res.pedido.actualesDeclaradas) && B && !isNaN(B.saldo) && res.pedido.actualesDeclaradas !== B.saldo) { avisos.push('En el pedido dice que tiene ' + fmt(res.pedido.actualesDeclaradas) + ' grageas; la bóveda dice ' + fmt(B.saldo) + '.'); }
    if (B && !isNaN(B.cabecera) && !isNaN(B.movido) && B.cabecera !== B.movido) {
      avisos.push('En la bóveda, el primer mensaje dice ' + fmt(B.cabecera) + ' y el último movimiento ' + fmt(B.movido) + (B.ultimo && B.ultimo.fecha ? ' (' + B.ultimo.fecha + ')' : '') + '. Tomo ' + (B.fuente === 'cabecera' ? 'el primer mensaje, que se editó después.' : 'el último movimiento.'));
    }
    if (res.T._viejo) { avisos.push('No pude actualizar la Tabla de PAM (' + res.T._viejo + '): uso la copia guardada.'); }
    avisos.forEach(function (a) { caja.appendChild(el('div', { clase: 'aviso', texto: a })); });

    // tabla de canjes
    var tb = el('tbody');
    res.items.forEach(function (x, i) {
      var desc = el('td', {}, [el('div', { texto: x.nombre && x.tipo ? describir(x) : x.item.desc })]);
      if (norm(x.item.desc) !== norm(describir(x))) { desc.appendChild(el('div', { clase: 'orig', texto: 'Escribió: ' + x.item.texto })); }
      x.problemas.forEach(function (q, k) {
        var id = 'icj-' + D.id + '-' + i + '-' + k;
        var cb = el('input', { type: 'checkbox', id: id });
        cb.checked = q.grave; q.incluir = q.grave;
        cb.addEventListener('change', function () { q.incluir = cb.checked; repintarPanel(); });
        desc.appendChild(el('div', { clase: 'prob ' + (q.grave ? 'bad' : 'warn') }, [el('label', { for: id }, [cb, el('span', { texto: q.t })])]));
      });
      (x.notas || []).forEach(function (n) { desc.appendChild(el('div', { clase: 'nota', texto: '· ' + n })); });
      tb.appendChild(el('tr', {}, [
        el('td', { clase: 'e ' + x.estado, texto: ICONO[x.estado] }),
        desc,
        el('td', { clase: 'n', texto: fmt(x.item.precio) }),
        el('td', { clase: 'n ' + (x.esperado != null && x.esperado !== x.item.precio ? 'bad' : ''), texto: x.alternativas ? x.alternativas.join(' / ') : fmt(x.esperado) }),
        el('td', { clase: 'n dim', texto: x.ficha != null ? etiquetaNivel(x, x.ficha) : '' })
      ]));
    });
    caja.appendChild(el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', {}), el('th', { texto: 'Canje' }), el('th', { texto: 'Pide' }), el('th', { texto: 'Tabla' }), el('th', { texto: 'Ficha' })])]), tb]));

    if (res.pedido.devoluciones.length) {
      caja.appendChild(el('div', { clase: 'dev' }, [el('b', { texto: 'Devoluciones (revisar a mano): ' }), document.createTextNode(res.pedido.devoluciones.map(function (d) { return d.desc + ' — ' + fmt(d.precio); }).join(' · '))]));
    }

    // decisión
    var bSi = el('button', { clase: 'b si' + (reg.decision === 'ok' ? ' on' : ''), type: 'button', texto: '✓ Correcto', onclick: function () { decidir(reg, reg.decision === 'ok' ? null : 'ok'); } });
    var bNo = el('button', { clase: 'b no' + (reg.decision === 'fix' ? ' on' : ''), type: 'button', texto: '✎ Con correcciones', onclick: function () { decidir(reg, reg.decision === 'fix' ? null : 'fix'); } });
    reg.bSi = bSi; reg.bNo = bNo;
    caja.appendChild(el('div', { clase: 'fila' }, [el('span', { clase: 'dim', texto: 'Para la respuesta:' }), el('span', { clase: 'esp' }), bSi, bNo]));
    if (reg.decision === null && !malos && !dudas) { /* nada marcado: decide el inspector */ }
  }

  function describir(x) {
    var h = x.hasta != null ? etiquetaNivel(x, x.hasta) : null, d = x.desdeUsado != null ? etiquetaNivel(x, x.desdeUsado) : (x.desde != null ? etiquetaNivel(x, x.desde) : null);
    if (x.acum && h != null) { return x.nombre + ': ' + (d != null ? d : '?') + ' → ' + h; }
    if (x.tipo === 'idioma') { return 'Idioma ' + x.nombre + (x.magico ? ' (mágico)' : '') + ': → ' + (['Ninguno', 'Bajo', 'Medio', 'Alto', 'Nativo'][x.hasta] || '?'); }
    if (x.tipo === 'man' && x.quidditch) { return x.nombre + ' · ' + (x.quidditch.maniobra ? (x.quidditch.grupo === 'Juego sucio' ? 'juego sucio' : 'maniobra de ' + x.quidditch.grupo.toLowerCase()) + ' ' + NIVEL_Q[x.quidditch.nivel] : x.quidditch.grupo.toLowerCase() + ' ' + NIVEL_Q[x.quidditch.nivel]); }
    if (x.tipo === 'arc' && x.arcano) { return x.nombre + ' · ' + x.arcano.tipo + ' ' + ({ dom: 'doméstico', bas: 'básico', int: 'intermedio', ava: 'avanzado' }[x.arcano.tier] || ''); }
    return x.nombre || x.item.desc;
  }

  function decidir(reg, d) {
    reg.decision = d;
    if (reg.bSi) { reg.bSi.classList.toggle('on', d === 'ok'); reg.bNo.classList.toggle('on', d === 'fix'); }
    repintarPanel();
  }

  /* ---------- respuesta ---------- */
  function textoRespuesta() {
    var ok = pedidos.filter(function (r) { return r.decision === 'ok'; });
    var fix = pedidos.filter(function (r) { return r.decision === 'fix'; });
    var partes = [];
    if (ok.length) {
      var nombres = ok.map(function (r) { return nombrePila(r.D.nombre); });
      var conTras = ok.some(function (r) { return r.res && r.res.items.some(function (x) { return x.tipo === 'bg'; }); });
      if (ok.length === 1) {
        partes.push(nombres[0] + ', tus canjes son correctos y puedes añadirlos a tu ficha' + (conTras ? ' junto a la descripción de tus trasfondos' : '') + '. Recuerda descontar las grageas y utilizar los enlaces correspondientes.');
      } else {
        partes.push(nombres.join(', ') + ', sus canjes son correctos y pueden añadirlos a su ficha' + (conTras ? ' junto a la descripción de sus trasfondos' : '') + '. Recuerden descontar las grageas y utilizar los enlaces correspondientes.');
      }
    }
    fix.forEach(function (r) {
      var lineas = [];
      if (r.res) {
        r.res.items.forEach(function (x) {
          x.problemas.filter(function (q) { return q.incluir; }).forEach(function (q) { lineas.push('✦ ' + describir(x) + ': ' + q.t); });
        });
        var B = r.res.boveda, total = !isNaN(r.res.pedido.total) ? r.res.pedido.total : r.res.suma;
        var base = B ? (!isNaN(B.alPedir) ? B.alPedir : B.saldo) : NaN;
        if (!isNaN(base) && base < total) { lineas.push('✦ En la bóveda tienes ' + fmt(base) + ' grageas y el canje es de ' + fmt(total) + '.'); }
        if (!isNaN(r.res.pedido.total) && r.res.pedido.total !== r.res.suma) { lineas.push('✦ Los canjes suman ' + fmt(r.res.suma) + ', no ' + fmt(r.res.pedido.total) + '.'); }
      }
      partes.push(nombrePila(r.D.nombre) + ', antes de aprobar tu canje hay que corregir:\n' + (lineas.length ? lineas.join('\n') : '✦ (escribí acá qué corregir)') + '\nCuando lo corrijas, edita el mensaje y avísanos.');
    });
    return partes.join('\n\n');
  }

  function pegarEnRespuesta(texto) {
    var W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
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

  function ponerPanel() {
    panel = el('div', { clase: 'icj flot' });
    document.body.appendChild(panel);
    panel._abierto = false;
    repintarPanel();
  }

  function repintarPanel() {
    if (!panel) { return; }
    panel.innerHTML = '';
    var pendientes = pedidos.filter(function (r) { return !r.revisadoPor; });
    if (!panel._abierto) {
      panel.appendChild(el('div', { clase: 'pill', onclick: function () { panel._abierto = true; repintarPanel(); } }, [
        el('span', { clase: 'brand', html: '<i>✦</i>Inspector' }),
        pendientes.length ? el('span', { clase: 'n', texto: pendientes.length + ' sin respuesta' }) : null
      ]));
      return;
    }
    var bd = el('div', { clase: 'bd' });
    var box = el('div', { clase: 'box' }, [
      el('div', { clase: 'hd', onclick: function () { panel._abierto = false; repintarPanel(); } }, [el('span', { clase: 'brand', html: '<i>✦</i>Inspector de Canjes' }), el('small', { texto: 'cerrar' })]),
      bd
    ]);
    panel.appendChild(box);

    // pedidos de la página
    var lista = el('div', { clase: 'lista' });
    pedidos.forEach(function (r) {
      var est = r.decision === 'ok' ? el('span', { clase: 'chip ok', texto: '✓ correcto' }) : r.decision === 'fix' ? el('span', { clase: 'chip bad', texto: '✎ corregir' }) :
        r.res ? el('span', { clase: 'chip ' + (r.res.items.some(function (x) { return x.estado === 'bad'; }) ? 'bad' : r.res.items.some(function (x) { return x.estado !== 'ok'; }) ? 'warn' : 'ok'), texto: 'revisado' }) :
          r.revisadoPor ? el('span', { clase: 'chip dim', texto: 'respondido' }) : el('span', { clase: 'chip dim', texto: 'sin revisar' });
      lista.appendChild(el('div', { clase: 'it' }, [el('a', { href: '#p' + r.D.id, texto: r.D.nombre, onclick: function (ev) { ev.preventDefault(); r.post.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }), est]));
    });
    var bTodos = el('button', { clase: 'b pri', type: 'button', texto: pendientes.length ? 'Revisar los ' + pendientes.length + ' sin respuesta' : 'No hay pedidos sin respuesta', onclick: function () {
      bTodos.disabled = true;
      pendientes.reduce(function (p, r) { return p.then(function () { return r.res ? null : revisarUno(r); }); }, Promise.resolve()).then(function () { bTodos.disabled = false; });
    } });
    if (!pendientes.length) { bTodos.disabled = true; }
    bd.appendChild(el('div', { clase: 'card' }, [el('div', { clase: 'ct', texto: 'Pedidos en esta página' }), pedidos.length ? lista : el('div', { clase: 'dim', texto: 'No encontré pedidos en esta página.' }), el('div', { clase: 'acciones' }, [bTodos])]));

    // respuesta
    var txt = textoRespuesta();
    var ta = el('textarea', { 'aria-label': 'Respuesta' });
    ta.value = txt;
    var msg = el('div', { clase: 'msg' });
    var marcados = pedidos.filter(function (r) { return r.decision; }).length;
    bd.appendChild(el('div', { clase: 'card' }, [
      el('div', { clase: 'ct', texto: 'Respuesta' }),
      marcados ? ta : el('div', { clase: 'dim', texto: 'Marcá cada pedido revisado como «Correcto» o «Con correcciones» y acá se arma el mensaje. Podés editarlo antes de pegarlo.' }),
      marcados ? el('div', { clase: 'acciones' }, [
        el('button', { clase: 'b', type: 'button', texto: 'Copiar', onclick: function () { (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(function () { msg.textContent = 'Copiado.'; }, function () { ta.select(); msg.textContent = 'Seleccionado: copialo con Ctrl+C.'; }); } }),
        el('button', { clase: 'b pri', type: 'button', texto: 'Pegar en la respuesta rápida', onclick: function () { msg.textContent = pegarEnRespuesta(ta.value) ? 'Listo: quedó en la respuesta rápida, sin enviar.' : 'No encontré la respuesta rápida: usá «Copiar».'; } })
      ]) : null,
      msg
    ]));

    // tabla de PAM
    var info = el('div', { clase: 'dim', texto: 'Tabla de Canjes de PAM: cargando…' });
    cargarPAM(false).then(function (T) { info.textContent = 'Tabla de Canjes de PAM del ' + new Date(T._cuando).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) + (T._viejo ? ' (copia guardada)' : ''); }, function (e) { info.textContent = e.message; });
    bd.appendChild(el('div', { clase: 'card' }, [info, el('div', { clase: 'acciones' }, [el('button', { clase: 'b', type: 'button', texto: '↻ Actualizar tabla', onclick: function () { info.textContent = 'Actualizando…'; cargarPAM(true).then(function () { repintarPanel(); }, function (e) { info.textContent = e.message; }); } })])]));
  }

  /* para probar a mano desde la consola */
  var API = { leerPedido: leerPedido, clasificar: clasificar, cargarPAM: cargarPAM, leerFicha: leerFicha, leerBoveda: leerBoveda, revisar: revisar, pedidos: pedidos, textoRespuesta: textoRespuesta };
  try { (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).PAM_INSPECTOR = API; } catch (e) { /* nada */ }

  iniciar();
})();
