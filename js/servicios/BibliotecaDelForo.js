// @ts-check
// La Biblioteca de oficiales de Mi PJ (pam-mi-pj.user.js 1.7.1, crearBibliotecaOficiales), la parte que lee el foro:
// los sucesos de El Profeta, la Lista de Roleos Oficiales y el estado real de cada rol. Tal cual, a través del agente.
// Solo lee el foro, y solo cuando se toca «Escanear».

const sleep = ms => new Promise(r => setTimeout(r, ms));
export const normBib = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
const topicId = url => { const m = (url || '').match(/\/t(\d+)/); return m ? m[1] : null; };
const postId = url => { const m = (url || '').match(/#(\d+)/); return m ? m[1] : null; };
/** La clave de un suceso: tema y mensaje («t123#456»). */
export const clave = u => { const m = String(u || '').match(/\/t(\d+)[^#\s]*(?:#(\d+))?/); return m ? 't' + m[1] + '#' + (m[2] || '') : ''; };

function maxPagina(d, id) { let max = 0; const re = new RegExp('/t' + id + 'p(\\d+)'); for (const a of d.querySelectorAll('a[href]')) { const m = (a.getAttribute('href') || '').match(re); if (m) max = Math.max(max, +m[1]); } return max; }
const postsDe = d => [...d.querySelectorAll('.post')].filter(p => p.querySelector('div.content'));
const autorDe = p => { const a = p.querySelector('a[href^="/u"]'); return a ? (a.textContent ?? '').trim() : ''; };
const fechaDe = p => { const t = (p.textContent ?? '').replace(/\s+/g, ' ').slice(0, 500); const m = t.match(/((?:Lun|Mar|Mi[ée]|Jue|Vie|S[áa]b|Dom)\.?\s+\d{1,2}\s+\S+\s+\d{4}[^0-9]{0,4}\d{1,2}:\d{2}(?:\s*[ap]m)?|(?:Hoy|Ayer) a las \d{1,2}:\d{2})/i); return m ? m[1] : ''; };

/* 1. Sucesos de El Profeta */
const RE_FECHA = /^\d{1,2}(?:\s+de)?\s+[a-záéíóú]+(?:\s+del?)?\s+\d{4}\.?$/i;
/** Los sucesos de una página de una edición de El Profeta. @param {Document} d */
export function sucesosDeEdicion(d, primeraPagina) {
  const out = [];
  [...d.querySelectorAll('div.content.clearfix')].forEach((c, idx) => {
    const post = c.closest('.post'); const pid = (post && post.id || '').replace(/^p/, ''); if (!pid) return;
    const w = d.createTreeWalker(c, 4); const ts = []; let n; // solo textos
    while ((n = w.nextNode())) { if (n.parentNode && /^(STYLE|SCRIPT)$/.test(n.parentNode.nodeName)) continue; const t = (n.textContent ?? '').replace(/\s+/g, ' ').trim(); if (t) ts.push(t); }
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

/* 2. Lista de Roleos Oficiales */
/** @param {Document} d la página de la lista */
export function leerListaDeRoles(d) {
  const items = [];
  for (const c of d.querySelectorAll('div.content.clearfix')) {
    const txt = c.textContent ?? ''; let sec = null;
    if (/oficiales abiertos/i.test(txt)) sec = 'abierto'; else if (/cerrados sin terminar/i.test(txt)) sec = 'cerrado sin terminar'; else if (/oficiales terminados/i.test(txt)) sec = 'terminado'; else continue;
    for (const ch of c.innerHTML.split('•').slice(1)) {
      const e = d.createElement('div'); e.innerHTML = ch; // en el documento leído (inerte: no carga imágenes ni ejecuta nada)
      const t = (e.textContent ?? '').replace(/\s+/g, ' ').trim();
      const hrefs = [...e.querySelectorAll('a')].map(a => a.getAttribute('href') || '');
      const prof = hrefs.find(h => /profeta/i.test(h)) || ''; const rol = hrefs.find(h => /\/t\d+/.test(h) && !/profeta/i.test(h)) || '';
      const partes = t.split('//').map(s => s.trim());
      items.push({ sec, titulo: partes[0], pjs: partes[1] || '', sucesoTxt: partes.slice(2).join(' / '), rol, rolId: topicId(rol), prof, profPid: postId(prof) });
    }
  }
  return items;
}

/* 3. Estado real de un rol, a partir de su última página */
/** @param {Document} d */
export function estadoDePagina(d, ahora = Date.now()) {
  const posts = postsDe(d), ultimo = posts[posts.length - 1];
  const fin = [...posts].reverse().find(p => /Ficha final de la aventura/i.test(p.textContent ?? ''));
  let estado = 'en curso', como = '';
  if (fin) { const m = (fin.textContent ?? '').replace(/\s+/g, ' ').match(/C[oó]mo se ha terminado:\s*(.+?)(?:-{2,}|Recompensas|$)/i); como = m ? m[1].trim() : ''; estado = /^no\b/i.test(como) ? 'abandonado' : 'terminado'; }
  return { estado, como, ultimoAutor: ultimo ? autorDe(ultimo) : '', ultimaFecha: ultimo ? fechaDe(ultimo) : '', verificado: ahora };
}

/** Cruza los sucesos con la lista: el estado de cada suceso sale de sus roles. */
export function cruzar(sucesos, lista, roles) {
  const porPid = new Map(sucesos.map(s => [s.pid, s])), porTitulo = new Map(sucesos.map(s => [normBib(s.titulo), s])), sinSuceso = [];
  for (const s of sucesos) s.roles = [];
  const mapSec = { 'abierto': 'en curso', 'terminado': 'terminado', 'cerrado sin terminar': 'abandonado' };
  for (const r of lista) {
    const real = r.rolId && roles[r.rolId];
    r.estado = real ? real.estado : mapSec[r.sec]; r.verificado = !!real; r.info = real || null; r.discrepancia = r.verificado && r.estado !== mapSec[r.sec];
    let s = r.profPid && porPid.get(r.profPid);
    if (!s) for (const t of r.sucesoTxt.split(' / ')) { s = porTitulo.get(normBib(t)); if (s) break; }
    if (s) s.roles.push(r); else sinSuceso.push(r);
  }
  for (const s of sucesos) { const e = s.roles.map(r => r.estado); s.estado = !e.length ? 'libre' : e.includes('en curso') ? 'en curso' : e.includes('terminado') ? 'terminado' : 'abandonado'; }
  return { sucesos, lista, sinSuceso, fecha: new Date().toISOString() };
}

/**
 * @param {{ leer(ruta: string): Promise<Document> }} agente
 * @param {{ origen: string, cfg: { foroProfeta: string, listaRoles: string }, store: { get(): any, set(v: any): void },
 *   concurrencia?: number, pausaMs?: number, edicionesFrescas?: number }} op
 */
export function crearLectorBiblioteca(agente, { origen, cfg, store, concurrencia = 4, pausaMs = 250, edicionesFrescas = 3 }) {
  const abs = h => { try { return new URL(h, origen).href; } catch (e) { return h || ''; } };
  const ruta = u => { const x = new URL(u, origen); return x.pathname + x.search; };
  async function getDoc(url, intentos = 3) {
    for (let i = 0; i < intentos; i++) {
      try { const d = await agente.leer(ruta(url)); await sleep(pausaMs); return d; }
      catch (e) { if (i === intentos - 1) throw e; await sleep(1500 * (i + 1)); }
    }
    throw new Error('sin respuesta');
  }
  async function pool(items, fn, onProgress) {
    let i = 0, hechos = 0; const out = new Array(items.length);
    async function worker() { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = { error: String(e) }; } hechos++; onProgress && onProgress(hechos, items.length); } }
    await Promise.all(Array.from({ length: concurrencia }, worker));
    return out;
  }
  async function leerProfeta(cache, log) {
    log('Leyendo el índice de El Profeta…');
    const ediciones = []; const d = await getDoc(cfg.foroProfeta); const paginas = new Set();
    const idForo = (cfg.foroProfeta.match(/\/f(\d+)/) || [0, '45'])[1];
    for (const a of d.querySelectorAll('a[href]')) { const h = a.getAttribute('href') || ''; if (new RegExp(`/f${idForo}p\\d+-`).test(h)) paginas.add(h.replace(/^https?:\/\/[^/]+/, '')); }
    const docs = [d]; for (const p of paginas) docs.push(await getDoc(p));
    for (const dd of docs) for (const a of dd.querySelectorAll('a.topictitle')) {
      if (/Edici[oó]n/i.test(a.textContent ?? '')) { const href = a.getAttribute('href') || ''; if (!ediciones.some(e => e.href === href)) ediciones.push({ nombre: (a.textContent ?? '').trim(), href, id: topicId(href) }); }
    }
    log(`Encontré ${ediciones.length} ediciones. Leyendo sucesos…`);
    const frescas = new Set(ediciones.slice(0, edicionesFrescas).map(e => e.id));
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
  async function estadoRol(rolId) {
    let d = await getDoc(`/t${rolId}-`); const max = maxPagina(d, rolId); if (max > 0) d = await getDoc(`/t${rolId}p${max}-`);
    return estadoDePagina(d);
  }
  /** @param {{ completo?: boolean, forzar?: boolean }} op @param {(m: string) => void} log */
  async function escanear({ completo, forzar }, log) {
    const cache = store.get(); if (forzar) cache.roles = {};
    const sucesos = await leerProfeta(cache, log); store.set(cache);
    log('Leyendo la Lista de Roleos Oficiales…');
    const lista = leerListaDeRoles(await getDoc(cfg.listaRoles));
    const aVerificar = lista.filter(r => r.rolId && (completo ? !(cache.roles[r.rolId] && cache.roles[r.rolId].estado !== 'en curso') : (r.sec === 'abierto' || (cache.roles[r.rolId] && cache.roles[r.rolId].estado === 'en curso'))));
    log(`Verificando ${aVerificar.length} roles…`);
    await pool(aVerificar, async r => { cache.roles[r.rolId] = await estadoRol(r.rolId); }, (h, t) => { log(`Roles verificados: ${h}/${t}`); if (h % 20 === 0) store.set(cache); });
    store.set(cache);
    return cruzar(sucesos, lista, cache.roles);
  }
  return { escanear };
}
