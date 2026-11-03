// @ts-check
// El panel «Mi PJ» de Hana Park (pam-mi-pj.user.js 1.7.1, moduloMiPJ), portado a PAM sin cambiar lo que se ve:
// el mismo HTML, el mismo CSS (css/mipj.css), los mismos textos y el mismo tema.
// Lo que cambia es de dónde salen los datos (el agente y los lectores de PAM) y lo que obliga el iframe:
//   · el tamaño de la ventana es el del FORO (lo da el agente), y el panel le pide al agente el tamaño justo del iframe;
//   · al arrastrar la esquina se usa la posición en la pantalla (el iframe se mueve mientras crece);
//   · los enlaces abren la página del foro (<base target="_top"> en panel.html).
// Las tarjetas que aún no están en PAM (roles, sueldo, oficiales, biblioteca, canjes) lo dicen en vez de «Tocá Actualizar».

const TEMA_AVADENSE = { skin: 'avadense', ink: '#171a2b', panel: '#1e2236', 'panel-2': '#262a42', parchment: '#F1EADF', 'parchment-dim': '#a7a1b6', gold: '#B49768',
  'gold-bright': '#d6bd8f', 'arcane-bright': '#cf94a3', good: '#93b8a0', bad: '#d98377', 'line-strong': 'rgba(241,234,223,.16)', 'accent-ink': '#1b1e30',
  serif: '"Cormorant Garamond", Georgia, serif', sans: '"Nunito", system-ui, sans-serif' };

/* ---------------- utilidades (las de Mi PJ) ---------------- */
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => n == null ? '—' : Number(n).toLocaleString('es-AR');
const leidoTxt = iso => { try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const PENDIENTE = 'Todavía no está en esta versión de prueba.';

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
const BONO = [0, 1, 2, 4, 7, 9];
const NIVEL_TXT = ['Desentrenado', 'Novato', 'Competente', 'Experto', 'Maestro', 'Legendario'];
const COMBATE = [['Iniciativa', 'Iniciativa'], ['Ataque Físico', 'Ataque F.'], ['Ataque Mágico', 'Ataque M.'], ['Defensa', 'Defensa'],
  ['Lucha Física', 'Lucha F.'], ['Lucha Mágica', 'Lucha M.'], ['PAs', 'PAs'], ['Umbral de heridas', 'Umbral'], ['Heridas', 'Heridas']];
const DIFICULTADES = [['Rutinaria', 5], ['Fácil', 7], ['Moderada', 9], ['Complicada', 12], ['Difícil', 15], ['Heroica', 18], ['Épica', 21], ['Imposible', 25]];
const TIRADA_BG = { Biblioteca: ['Percepción', 'Investigación'], Influencia: ['Carisma', 'Intimidación'], Informantes: ['Percepción', 'Empatía'], Seguidores: ['Carisma', 'Coordinación'] };
const ROMANO = ['0', 'I', 'II', 'III', 'IV', 'V'];
const deRomano = r => ({ I: 1, II: 2, III: 3, IV: 4, V: 5 })[String(r).trim().toUpperCase()] || parseInt(r, 10) || 0;
function bgsDe(R) {
  if (Array.isArray(R.bgs) && R.bgs.length) return R.bgs.map(x => ({ t: x.t, c: x.c || '', e: x.e || '', v: +x.v || 0, nota: x.nota || '' }));
  return (R.trasf || []).map(x => { const p = String(x.t).split(/\s*›\s*/); return { t: p[0] || '', c: p[1] || '', e: p.slice(2).join(' › '), v: deRomano(x.v), nota: x.nota || '' }; })
    .filter(x => x.t && x.v);
}

/**
 * @param {{ root: HTMLElement, documento: Document, guardado?: Storage|null, cargar: () => Promise<any>,
 *   agente?: { tamano(an: number, al: number): Promise<any>, tema?(t: any): Promise<any> } | null,
 *   ventana: { ancho: number, alto: number }, pamUrl: string, cuenta?: { id: number, nombre: string } | null, ahora?: () => number }} dep
 */
export function crearPanelMiPj({ root, documento, guardado = null, cargar, agente = null, ventana, pamUrl, cuenta = null }) {
  const gv = (k, d) => { try { const v = guardado?.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const sv = (k, v) => { try { guardado?.setItem(k, JSON.stringify(v)); } catch (e) { /* sin espacio */ } };
  const YO = (cuenta && cuenta.nombre) || '', UID = (cuenta && cuenta.id) || 0;
  const K = { datos: 'mipj.' + UID, ui: 'mipj.ui', tema: 'mipj.tema' };
  let foro = { ...ventana };

  /* ---------------- tema (el mismo de PAM) ---------------- */
  let tema = Object.assign({}, TEMA_AVADENSE, gv(K.tema, {}));
  const familias = () => [tema.serif, tema.sans].map(f => String(f || '').split(',')[0].replace(/["']/g, '').trim()).filter(f => f && !/^(Georgia|system-ui|serif|sans-serif|monospace)$/i.test(f));
  function cargarFuentes() {
    const fams = [...new Set(['Cormorant Garamond', 'Nunito'].concat(familias()))];
    let l = documento.getElementById('mipj-fonts'); if (!l) { l = documento.createElement('link'); l.id = 'mipj-fonts'; l.setAttribute('rel', 'stylesheet'); documento.head.appendChild(l); }
    l.setAttribute('href', 'https://fonts.googleapis.com/css2?' + fams.map(f => 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':ital,wght@0,400;0,600;0,700;1,500').join('&') + '&display=swap');
  }
  let temaEl = null;
  function aplicarTema() {
    if (!temaEl) { temaEl = documento.createElement('style'); documento.head.appendChild(temaEl); }
    temaEl.textContent = '#mipj,#mipj-modal,.mipj-check,.mipj-of,.esc-ui{' + Object.entries(tema).filter(([k]) => k !== 'skin').map(([k, v]) => `--m-${k}:${v}`).join(';') + '}';
    documento.documentElement.dataset.mipjSkin = tema.skin || 'avadense';
    cargarFuentes();
    if (agente && agente.tema) agente.tema(tema).catch(() => {}); // las puertas del agente, con el mismo tema
  }
  function ponerTema(t) { tema = Object.assign({}, TEMA_AVADENSE, t || {}); sv(K.tema, t || {}); aplicarTema(); pintar(); }

  /* ---------------- panel ---------------- */
  let datos = gv(K.datos, null), cargando = false, error = '';
  const ui = Object.assign({ abierto: foro.ancho > 600 }, gv(K.ui, {}));
  const pend = k => !!(datos && datos.pendientes && datos.pendientes.includes(k));

  const vistaRapidaFn = () => vistaRapida();
  function pintar() {
    const B = datos && datos.boveda, F = datos && datos.ficha, R = [];
    const pendF = F && F.estado === 'pendiente';
    if (!ui.abierto) {
      root.innerHTML = `<div class="pill" data-a="abrir" title="Abrir Mi PJ"><span class="brand"><i>✦</i>Mi PJ</span>${B && B.act != null ? `<b>${fmt(B.act)}</b>` : ''}${R.length ? `<span class="n" title="Roles donde te toca responder">${R.length}</span>` : ''}${pendF ? '<span class="dot" title="Ficha pendiente de revisión"></span>' : ''}</div>`;
      sincronizarTamano();
      return;
    }
    let h = `<div class="box"><span class="grip" title="Arrastrá para cambiar el tamaño · doble clic: tamaño normal"></span><div class="hd" data-a="cerrar" title="Minimizar"><span class="brand"><i>✦</i>Mi PJ</span><small>HP Avada Kedavra</small>
      <span class="zm"><button data-a="zoom-" title="Achicar el texto" aria-label="Achicar el texto">A−</button><button data-a="zoom+" title="Agrandar el texto" aria-label="Agrandar el texto">A+</button></span><span class="car">▾</span></div><div class="bd">`;
    h += `<div class="nmrow"><h3 class="nm">${esc((datos && datos.pj) || YO)}</h3>${datos ? `<button class="rbtn${ui.rapido ? ' on' : ''}" data-a="rapido" title="Atributos, habilidades y combate para tus tiradas">${ui.rapido ? '← Volver' : '⚡ Acceso rápido'}</button>` : ''}</div>`;
    if (datos && ui.rapido) h += vistaRapidaFn();
    else if (!datos) h += `<p class="dim">${cargando ? 'Leyendo tu ficha, tu bóveda y tus roles…' : 'Tocá «Actualizar» para leer tu ficha y tu bóveda.'}</p>`;
    else {
      if (B) h += `<div class="rule">☾</div><div class="big">${fmt(B.act)}<span>grageas</span></div>
        <div class="stats"><div class="stat"><b>${fmt(B.tot)}</b><small>Totales</small></div><div class="stat"><b>${fmt(B.ini)}</b><small>Iniciales</small></div><div class="stat"><b>${B.pla != null ? fmt(B.pla) + '<span class="dim"> / ' + fmt(B.plt) + '</span>' : '—'}</b><small>Legendarios</small></div></div>`;
      h += `<div class="card"><div class="ct">✒ Te toca responder${R.length ? `<span class="n">${R.length}</span>` : ''}</div>`;
      if (!datos.roles) h += `<div class="dim">${pend('roles') ? PENDIENTE : cargando ? 'Buscando…' : 'Tocá «Actualizar».'}</div>`;
      else if (!R.length) h += `<div class="dim">Estás al día con todos tus roles ✦</div>`;
      h += `</div>`;
      h += tarjetaSueldo();
      h += `<div class="card"><div class="ct">❖ Ficha</div>${F ? `<a class="tl" href="${esc(F.url)}">${esc(F.titulo)}</a><br>
        <span class="badge ${pendF ? 'warn' : 'ok'}">${pendF ? '◷ Pendiente de revisión' : '✓ Revisada'}</span>
        <div class="row">${F.sello ? `Último sello: ${esc(F.sello.fecha)}${F.sello.autor ? ` <span class="dim">· ${esc(F.sello.autor)}</span>` : ''}` : 'Todavía sin sello'}</div>
        <div class="dim">Código leído · ${fmt(F.codigo ? F.codigo.length : 0)} caracteres</div>` : '<div class="dim">No encontré tu ficha.</div>'}</div>`;
      h += `<div class="card"><div class="ct">⛁ Bóveda</div>${B ? `<a class="tl" href="${esc(B.url)}">${esc(B.titulo)}</a>
        ${(B.movs || []).map(m => `<div class="row"><span class="${m.d < 0 ? 'neg' : 'pos'}">${m.d == null ? '' : (m.d > 0 ? '+' : '') + fmt(m.d)}</span> → ${fmt(m.act)} <span class="dim">· ${esc(m.fecha)}</span></div>`).join('')}
        ${B.revision ? `<div class="row dim">Última revisión: ${esc(B.revision.autor)}, ${esc(B.revision.fecha)}</div>` : ''}
        ${B.nota ? `<div class="nota">Nota de ${esc(B.nota.autor)}: ${esc(B.nota.texto)}</div>` : ''}` : '<div class="dim">No encontré tu bóveda en el Panel de Bóvedas.</div>'}</div>`;
    }
    if (!(datos && ui.rapido)) {
      h += `<div class="card"><div class="ct">📜 Biblioteca de oficiales<span class="sp"></span><a href="#" data-a="oficiales">abrir</a></div>
        <div class="dim">Biblioteca de sucesos de El Profeta: cuáles están libres, en curso o abandonados. Marcalos con ★ y pasalos a PAM.</div>
        <div class="row" style="margin-top:6px"><button class="b" data-a="oficiales">Abrir la biblioteca</button></div></div>`;
      h += `<div class="card" id="mipj-canjes"><div class="ct">⚖ Canjes</div><div class="dim">Para pedir un canje: en PAM armá el carrito y tocá «Preparar el canje» en la pastilla Mi PJ.</div></div>`;
    }
    if (error) h += `<div class="err">${esc(error)}</div>`;
    h += `</div><div class="ft"><span class="sp">${datos ? 'Leído<br>' + esc(leidoTxt(datos.leido)) : ''}</span>
      <button class="b" data-a="act" ${cargando ? 'disabled' : ''}>${cargando ? 'Leyendo…' : 'Actualizar'}</button>
      <button class="b pri" data-a="pam" ${datos ? '' : 'disabled'} title="Abre PAM y te muestra qué se va a cambiar antes de aplicarlo">Enviar a PAM</button></div></div>`;
    root.innerHTML = h;
    if (ui.rapido && ui.rapidoQ) filtrarRapido(ui.rapidoQ);
    aplicarTam();
  }

  /* ---------------- sueldo del mes (aún no está en PAM) ---------------- */
  function tarjetaSueldo() {
    if (ui.sinSueldo) return `<div class="card fino"><div class="ct">⚜ Sueldo<span class="sp"></span><a href="#" data-a="sueldo-ver">mostrar</a></div></div>`;
    const h = `<div class="card"><div class="ct">⚜ Sueldo<span class="sp"></span><a href="#" data-a="sueldo-ocultar" title="Si no cobrás sueldo, ocultalo">ocultar</a></div>`;
    return h + `<div class="dim">${pend('sueldo') ? PENDIENTE : cargando ? 'Buscando…' : 'Tocá «Actualizar».'}</div></div>`;
  }

  function vistaRapida() {
    let h = '<div class="rapido">';
    const R = datos && datos.rapido;
    if (!R || !R.ok) return h + `<div class="card"><div class="ct">⚡ Acceso rápido</div><div class="row">Todavía no tengo los datos de ${esc((datos && datos.pj) || YO)}.</div>
      <div class="dim" style="margin-top:4px">Tocá «Actualizar» para leer tu ficha.</div></div></div>`;
    const cuando = R.leido ? leidoTxt(R.leido) : '';
    h += `<div class="rsrc">Leído de tu ficha del foro${cuando ? ' · ' + esc(cuando) : ''}${R.etapa ? '' : ' · sin etapa'}</div>`;
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
      const filas = HAB_DE[a].map(s => ({ s, nv: R.skills[s], arte: false })).concat(a === 'Voluntad' ? R.artes.map(x => ({ s: x.n, nv: x.nv, arte: true })) : []);
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
    root.querySelectorAll('.rapido .rit').forEach(r => { /** @type {HTMLElement} */ (r).hidden = !!t && !(/** @type {HTMLElement} */ (r)).dataset.q.includes(t); });
    root.querySelectorAll('.rapido .rgrp').forEach(g => {
      let n = g.nextElementSibling, alguno = false;
      while (n && n.classList.contains('rit')) { if (!(/** @type {HTMLElement} */ (n)).hidden) alguno = true; n = n.nextElementSibling; }
      /** @type {HTMLElement} */ (g).hidden = !!t && !alguno;
    });
    root.querySelectorAll('.rapido .r-sec').forEach(c => { const e = /** @type {HTMLElement} */ (c); if (!['habilidades', 'trasfondos'].includes(e.dataset.s)) e.hidden = !!t; else e.hidden = !!t && !e.querySelector('.rit:not([hidden])'); });
    root.querySelectorAll('.rapido .radv').forEach(x => { /** @type {HTMLElement} */ (x).hidden = !!t; });
    /* si queda una sola, se abre sola */
    const vis = [...root.querySelectorAll('.rapido [data-s="habilidades"] .rit:not([hidden])')];
    if (t && vis.length === 1) { /** @type {HTMLElement} */ (vis[0].querySelector('.rdet')).hidden = false; vis[0].classList.add('abierto'); }
  }
  function copiarTexto(t, el) {
    const ok = () => { if (!el) return; el.classList.add('copiado'); setTimeout(() => el.classList.remove('copiado'), 900); };
    const nav = documento.defaultView?.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) nav.clipboard.writeText(t).then(ok, ok);
    else { const ta = documento.createElement('textarea'); ta.value = t; documento.body.appendChild(ta); ta.select(); try { documento.execCommand('copy'); } catch (e) { /* sin portapapeles */ } ta.remove(); ok(); }
  }

  async function actualizar() {
    if (cargando) return; cargando = true; error = ''; pintar();
    try {
      const d = await cargar();
      if (d) { datos = d; sv(K.datos, datos); if (d.errores && d.errores.length && !(d.ficha && d.boveda)) error = d.errores.join(' '); }
      else error = 'No se pudo leer el foro.';
    } catch (e) { error = 'No se pudo leer el foro: ' + (e instanceof Error ? e.message : String(e)); }
    cargando = false; pintar();
  }

  root.addEventListener('click', e => {
    const a = /** @type {HTMLElement|null} */ ((/** @type {HTMLElement} */ (e.target)).closest('[data-a]')); if (!a) return;
    const k = a.dataset.a;
    if (k === 'cerrar') { ui.abierto = false; sv(K.ui, ui); pintar(); }
    else if (k === 'abrir') { ui.abierto = true; sv(K.ui, ui); pintar(); }
    else if (k === 'act') actualizar();
    else if (k === 'pam') { error = 'Enviar a PAM llega con los canjes (fase 6).'; pintar(); }
    else if (k === 'zoom-' || k === 'zoom+') { ui.zoom = Math.min(1.4, Math.max(0.8, Math.round(((ui.zoom || 1) + (k === 'zoom+' ? 0.1 : -0.1)) * 10) / 10)); sv(K.ui, ui); aplicarTam(); }
    else if (k === 'oficiales') { e.preventDefault(); error = 'La Biblioteca de oficiales ' + PENDIENTE.toLowerCase(); pintar(); }
    else if (k === 'pam-abrir') { documento.defaultView?.open(pamUrl + '#ficha', 'pam'); }
    else if (k === 'rapido') { ui.rapido = !ui.rapido; ui.rapidoQ = ''; sv(K.ui, ui); pintar(); const bd = root.querySelector('.bd'); if (bd) bd.scrollTop = 0; }
    else if (k === 'sueldo-ocultar' || k === 'sueldo-ver') { e.preventDefault(); ui.sinSueldo = k === 'sueldo-ocultar'; sv(K.ui, ui); pintar(); }
  });
  /* acceso rápido: buscar y copiar */
  root.addEventListener('input', e => { const t = /** @type {HTMLInputElement} */ (e.target); if (!t.matches('.rq')) return; ui.rapidoQ = t.value; filtrarRapido(ui.rapidoQ); sincronizarTamano(); });
  root.addEventListener('click', e => {
    const tg = /** @type {HTMLElement} */ (e.target);
    const c = /** @type {HTMLElement|null} */ (tg.closest('[data-copiar]')); if (c && root.contains(c)) { copiarTexto(c.dataset.copiar, c); return; }
    const r = tg.closest('[data-abrir]'); if (r && root.contains(r)) { const it = /** @type {HTMLElement} */ (r.parentElement), d = /** @type {HTMLElement} */ (it.querySelector('.rdet')); d.hidden = !d.hidden; it.classList.toggle('abierto', !d.hidden); sincronizarTamano(); }
  });
  root.addEventListener('keydown', e => { const r = /** @type {HTMLElement} */ (e.target).closest && /** @type {HTMLElement} */ (e.target).closest('[data-abrir]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); /** @type {HTMLElement} */ (r).click(); } });

  /* ---------------- tamaño de la ventana: arrastrar la esquina, A− / A+ ---------------- */
  const tamEl = documento.createElement('style'); tamEl.id = 'mipj-tam'; documento.head.appendChild(tamEl);
  const entre = (v, a, b) => Math.min(b, Math.max(a, v));
  function aplicarTam() {
    const z = ui.zoom || 1, W0 = foro.ancho - 24, H0 = foro.alto - 32;
    documento.documentElement.style.setProperty('--vw', foro.ancho + 'px');
    documento.documentElement.style.setProperty('--vh', foro.alto + 'px');
    root.classList.toggle('estrecho', foro.ancho <= 520);
    let c = '';
    if (ui.ancho) c += `#mipj{width:${Math.round(entre(ui.ancho, 280, W0))}px}`;
    if (z !== 1) c += `#mipj .box{zoom:${z};max-height:${Math.round(H0 / z)}px}`;
    if (ui.alto) c += `#mipj .box{height:${Math.round(entre(ui.alto, 240, H0) / z)}px}`;
    tamEl.textContent = c;
    sincronizarTamano();
  }
  // El iframe mide justo lo que ocupa el panel, más su margen (16 px) y sitio para la sombra.
  const SOMBRA = 32;
  let ultimoTam = '';
  function sincronizarTamano() {
    if (!agente) return;
    const r = root.getBoundingClientRect();
    const margen = root.classList.contains('estrecho') ? 8 : 16;
    const an = Math.ceil(r.width) + margen + SOMBRA, al = Math.ceil(r.height) + margen + SOMBRA;
    const k = an + 'x' + al; if (k === ultimoTam) return; ultimoTam = k;
    agente.tamano(an, al).catch(() => {});
  }
  const RO = documento.defaultView && /** @type {any} */ (documento.defaultView).ResizeObserver;
  if (RO) new RO(() => sincronizarTamano()).observe(root);
  root.addEventListener('pointerdown', e => {
    if (!(/** @type {HTMLElement} */ (e.target)).closest('.grip')) return;
    e.preventDefault();
    const box = root.querySelector('.box'); if (!box) return;
    // en la pantalla, no en el iframe: el iframe se mueve mientras crece
    const r0 = box.getBoundingClientRect(), x0 = e.screenX, y0 = e.screenY, z = ui.zoom || 1;
    root.classList.add('moviendo');
    const mover = ev => { ui.ancho = Math.round(r0.width * (z !== 1 ? 1 : 1) + (x0 - ev.screenX)); ui.alto = Math.round(r0.height + (y0 - ev.screenY)); aplicarTam(); };
    const soltar = () => { documento.defaultView?.removeEventListener('pointermove', mover); documento.defaultView?.removeEventListener('pointerup', soltar); root.classList.remove('moviendo'); sv(K.ui, ui); };
    documento.defaultView?.addEventListener('pointermove', mover); documento.defaultView?.addEventListener('pointerup', soltar);
  });
  root.addEventListener('dblclick', e => { if (!(/** @type {HTMLElement} */ (e.target)).closest('.grip')) return; delete ui.ancho; delete ui.alto; ui.zoom = 1; sv(K.ui, ui); aplicarTam(); });

  aplicarTema();
  pintar();
  return {
    pintar, actualizar, ponerTema,
    /** El agente avisa cuando cambia el tamaño de la ventana del foro. */
    ventana(v) { foro = { ...v }; aplicarTam(); },
    get datos() { return datos; }, get ui() { return ui; }
  };
}
