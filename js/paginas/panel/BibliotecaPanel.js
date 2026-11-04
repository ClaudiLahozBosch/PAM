// @ts-check
// La ventana «Biblioteca de oficiales» de Mi PJ (pam-mi-pj.user.js 1.7.1), portada a PAM sin cambiar lo que se ve:
// el mismo HTML, el mismo CSS y los mismos textos. La lectura del foro está en js/servicios/BibliotecaDelForo.js.
// Lo que cambia:
//   · vive en el panel (iframe): al abrirla, el panel le pide al agente toda la ventana del foro, y al cerrarla vuelve;
//   · los enlaces llevan el dominio del foro (dentro del iframe, uno relativo iría a PAM);
//   · «Pasar a PAM» deja los oficiales en el almacén del agente (antes, en el de Mi PJ); en PAM los recoge js/pam/.
import { clave, normBib as norm } from '../../servicios/BibliotecaDelForo.js?v=0.6.3';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const isoDe = f => { const m = norm(f).match(/(\d{1,2}) (?:de )?([a-z]+) (?:del? )?(\d{4})/); if (!m || !MESES[m[2]]) return f || ''; return `${m[3]}-${String(MESES[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
const TOMABLE = s => s.estado === 'libre' || s.estado === 'abandonado';
export const CLAVES_BIBLIOTECA = { cache: 'avk_roles_cache_v1', ultimo: 'mipj.ofic.ultimo', favs: 'mipj.ofic.favs' };

const CSS = `
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
  `;
const HTML = `
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

/**
 * @param {{ documento: Document, gv(k: string, d: any): any, sv(k: string, v: any): void, borrar(k: string): void,
 *   escanear(op: { completo?: boolean, forzar?: boolean }, log: (m: string) => void): Promise<any>,
 *   origen: string, guardarEnAgente?: (clave: string, valor: any) => Promise<any>,
 *   alEscanear?: () => void, alAbrir?: () => void, alCerrar?: () => void, abrirPam?: () => void }} opc
 */
export function crearBibliotecaOficiales(opc) {
  const { documento } = opc;
  const win = /** @type {Window} */ (documento.defaultView);
  const abs = h => { try { return h ? new URL(h, opc.origen).href : ''; } catch (e) { return h || ''; } };
  let favs = opc.gv(CLAVES_BIBLIOTECA.favs, {});
  const esFav = s => !!favs[clave(s.url)];
  function alternarFav(s) { const k = clave(s.url); if (favs[k]) delete favs[k]; else favs[k] = { titulo: s.titulo, url: s.url, desde: new Date().toISOString() }; opc.sv(CLAVES_BIBLIOTECA.favs, favs); }
  /** Lo que el Mi PJ antiguo dejaba en «pam.oficiales» para PAM (mismo formato). */
  function aPAM(soloFavs) {
    if (!datos) return { n: 0, paquete: null };
    const elegidos = datos.sucesos.filter(s => TOMABLE(s) && (!soloFavs || esFav(s)));
    const items = elegidos.map(s => ({ nombre: s.titulo, relacion: (s.estado === 'abandonado' ? 'Abandonado · ' : '') + s.edicion, fecha: isoDe(s.fecha), estado: 'Disponible', enlace: s.url, fav: esFav(s) }));
    const estados = {}; datos.sucesos.forEach(s => { const k = clave(s.url); if (k) estados[k] = TOMABLE(s) ? 'Disponible' : 'Ocupado'; });
    return { n: items.length, paquete: { v: 1, creado: new Date().toISOString(), modo: soloFavs ? 'favoritos' : 'todos', items, estados, usado: null } };
  }

  /* ---------- interfaz (estética de Mi PJ / PAM) ---------- */
  const host = documento.createElement('div'); host.id = 'mipj-ofic'; host.className = 'esc-ui'; documento.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${CSS}</style>${HTML}`;
  const $ = s => /** @type {HTMLElement} */ (root.getElementById(s));
  let datos = opc.gv(CLAVES_BIBLIOTECA.ultimo, null), filtro = 'todos', busqueda = '';
  const log = (m, ok) => { $('log').textContent = m; $('log').className = 'log' + (ok ? ' ok' : ''); };
  const fechaTxt = iso => { try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return ''; } };
  function abrir() { if (opc.alAbrir) opc.alAbrir(); $('panel').classList.add('open'); $('fondo').classList.add('open'); if (datos) { log(`Último escaneo: ${fechaTxt(datos.fecha)} · ${datos.sucesos.length} sucesos. Tocá «Escanear» para actualizar.`); pintar(); } }
  function cerrar() { $('panel').classList.remove('open'); $('fondo').classList.remove('open'); if (opc.alCerrar) opc.alCerrar(); }
  $('close').onclick = cerrar; $('fondo').onclick = cerrar;
  root.addEventListener('keydown', e => { if (/** @type {KeyboardEvent} */ (e).key === 'Escape') cerrar(); });
  $('q').oninput = e => { busqueda = norm(/** @type {HTMLInputElement} */ (e.target).value); pintar(); };
  async function correr(op) {
    for (const id of ['scan', 'scanFull', 'clear']) /** @type {HTMLButtonElement} */ ($(id)).disabled = true;
    try {
      datos = await opc.escanear(op, log);
      /* lo que hace falta para volver a mostrarla y pasarla a PAM sin escanear de nuevo */
      opc.sv(CLAVES_BIBLIOTECA.ultimo, { fecha: datos.fecha, sinSuceso: datos.sinSuceso.map(r => ({ sec: r.sec, titulo: r.titulo, pjs: r.pjs, sucesoTxt: r.sucesoTxt, rol: r.rol, prof: r.prof, estado: r.estado, discrepancia: r.discrepancia, info: r.info ? { como: r.info.como, ultimoAutor: r.info.ultimoAutor, ultimaFecha: r.info.ultimaFecha } : null })),
        sucesos: datos.sucesos.map(s => ({ pid: s.pid, fecha: s.fecha, titulo: s.titulo, edicion: s.edicion, url: s.url, estado: s.estado,
          roles: s.roles.map(r => ({ sec: r.sec, titulo: r.titulo, pjs: r.pjs, rol: r.rol, estado: r.estado, discrepancia: r.discrepancia, info: r.info ? { como: r.info.como, ultimoAutor: r.info.ultimoAutor, ultimaFecha: r.info.ultimaFecha } : null })) })) });
      datos = opc.gv(CLAVES_BIBLIOTECA.ultimo, datos);
      const n = datos.sucesos.filter(s => s.roles.some(r => r.discrepancia)).length;
      log(`Listo · ${datos.sucesos.length} sucesos · ${datos.sucesos.filter(TOMABLE).length} se pueden tomar · ${n} con discrepancias · ${fechaTxt(datos.fecha)}`, true);
      pintar(); if (opc.alEscanear) opc.alEscanear();
    } catch (e) { log('Algo falló: ' + (e instanceof Error ? e.message : String(e)) + '. Probá de nuevo en un ratito.'); }
    finally { for (const id of ['scan', 'scanFull', 'clear']) /** @type {HTMLButtonElement} */ ($(id)).disabled = false; }
  }
  $('scan').onclick = () => correr({ completo: false });
  $('scanFull').onclick = () => correr({ completo: true });
  $('clear').onclick = () => { if (win.confirm('¿Borrar la caché y volver a leer todo?')) { opc.borrar(CLAVES_BIBLIOTECA.cache); correr({ completo: false, forzar: true }); } };
  const pasar = async solo => {
    if (!datos) { log('Primero tocá «Escanear».'); return; }
    const { n, paquete } = aPAM(solo);
    if (!n) { log(solo ? 'No tenés favoritos ★ entre los sucesos libres o abandonados.' : 'No hay sucesos libres ni abandonados para pasar.'); return; }
    try { if (opc.guardarEnAgente) await opc.guardarEnAgente('pam.oficiales', paquete); } catch (e) { /* queda sin guardar */ }
    log(`Listo: ${n} ${n === 1 ? 'oficial preparado' : 'oficiales preparados'}. Abrí PAM (con Mi PJ instalado) y aceptá el cuadro para sumarlos a «Posibles oficiales».`, true);
    if (opc.abrirPam) opc.abrirPam();
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
    $('filters').querySelectorAll('.chip').forEach(c => { /** @type {HTMLElement} */ (c).onclick = () => { filtro = /** @type {HTMLElement} */ (c).dataset.f || 'todos'; pintar(); }; });
    $('pamFav').textContent = `★ Solo favoritos (${datos.sucesos.filter(s => TOMABLE(s) && esFav(s)).length})`;
    $('pamTodos').textContent = `Todos los que se pueden tomar (${datos.sucesos.filter(TOMABLE).length})`;
    const rows = filtrados();
    let html = rows.length ? `<table><thead><tr><th style="width:34px"></th><th>Suceso</th><th>Edición</th><th>Estado</th><th>Roles</th></tr></thead><tbody>` +
      rows.map(s => `<tr><td>${TOMABLE(s) ? `<button class="star${esFav(s) ? ' on' : ''}" data-k="${esc(clave(s.url))}" title="${esFav(s) ? 'Quitar de favoritos' : 'Marcar como favorito'}" aria-label="Favorito">★</button>` : ''}</td>
        <td class="suc"><a href="${esc(abs(s.url))}" target="_blank">${esc(s.titulo)}</a><div class="muted">${esc(s.fecha)}</div></td>
        <td class="muted">${esc(s.edicion)}</td><td>${tag(s.estado)}</td>
        <td>${s.roles.map(filaRol).join('') || '<span class="muted">Nadie lo tomó todavía</span>'}</td></tr>`).join('') + `</tbody></table>`
      : '<div class="empty">No hay nada con este filtro ✧</div>';
    const sueltos = (datos.sinSuceso || []).filter(r => !busqueda || norm(r.titulo + ' ' + r.pjs + ' ' + r.sucesoTxt).includes(busqueda)).filter(r => filtro !== 'discrepancias' || r.discrepancia);
    if (sueltos.length && (filtro === 'todos' || filtro === 'discrepancias'))
      html += `<details><summary>Roles de la lista cuyo suceso no encontré en El Profeta (${sueltos.length})</summary>${sueltos.map(r => `<div style="margin:8px 0">${filaRol(r)}<div class="muted">Suceso según la lista: ${esc(r.sucesoTxt || '—')}</div></div>`).join('')}</details>`;
    $('body').innerHTML = html;
    $('body').querySelectorAll('.star').forEach(b => { /** @type {HTMLElement} */ (b).onclick = () => { const s = datos.sucesos.find(x => clave(x.url) === /** @type {HTMLElement} */ (b).dataset.k); if (s) { alternarFav(s); pintar(); if (opc.alEscanear) opc.alEscanear(); } }; });
  }
  function filaRol(r) {
    const i = r.info;
    const meta = i ? (r.estado === 'en curso' ? `último post: ${esc(i.ultimoAutor)}${i.ultimaFecha ? ' · ' + esc(i.ultimaFecha) : ''}` : esc(i.como)) : 'según la lista (sin verificar)';
    const aviso = r.discrepancia ? `<div class="warn">⚠ En la lista figura como «${esc(r.sec)}»</div>` : '';
    return `<div class="rol">${tag(r.estado)} <a href="${esc(abs(r.rol))}" target="_blank">${esc(r.titulo)}</a><div class="meta">${esc(r.pjs)} · ${meta}</div>${aviso}</div>`;
  }
  $('exportBB').onclick = async () => {
    if (!datos) return;
    const rows = filtrados();
    const lineas = rows.map(s => `• [url=${s.url}]${s.titulo}[/url] // ${s.edicion} // ${s.roles.length ? s.roles.map(r => `[url=${r.rol}]${r.titulo}[/url] (${r.estado}${r.discrepancia ? ' (!) lista: ' + r.sec : ''})`).join(' · ') : 'libre'}`);
    const titulo = { todos: 'Sucesos', libre: 'Sucesos libres', 'en curso': 'Sucesos en curso', terminado: 'Sucesos terminados', abandonado: 'Sucesos abandonados', fav: 'Sucesos favoritos', discrepancias: 'Discrepancias con la lista' }[filtro];
    const txt = `[b]${titulo}[/b]\n` + lineas.join('\n');
    try { await win.navigator.clipboard.writeText(txt); log(`Copiado (${rows.length} sucesos).`, true); }
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
    const a = documento.createElement('a'); a.href = win.URL.createObjectURL(new win.Blob(['﻿' + filas.map(f => f.map(q).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `roles-oficiales-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  return {
    abrir, cerrar,
    resumen: () => datos ? { fecha: datos.fecha, libres: datos.sucesos.filter(s => s.estado === 'libre').length, abandonados: datos.sucesos.filter(s => s.estado === 'abandonado').length,
      favs: datos.sucesos.filter(s => TOMABLE(s) && esFav(s)).length } : null
  };
}
