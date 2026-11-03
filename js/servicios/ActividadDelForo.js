// @ts-check
// Lo que Mi PJ leía del foro además de la ficha y la bóveda (pam-mi-pj.user.js 1.7.1), ahora a través del agente:
// dónde te toca responder (con las misiones), el sueldo del mes y los oficiales en curso.
// Mismas páginas, mismo orden y mismas reglas (js/reglas/Sueldo.js, Misiones.js, Oficiales.js).
import { normPalabras as norm } from '../core/texto.js?v=0.3.4';
import { FECHA, aFecha, partesDeFecha, aUTC } from '../lectores/FechaForo.js?v=0.3.4';
import { postsDeMiPj } from '../lectores/LectorTema.js?v=0.3.4';
import { temaDelMes, mesDelTema, pedidoYRespuesta, MESES } from '../reglas/Sueldo.js?v=0.3.4';
import { ES_MISION, analizarMision, esBot } from '../reglas/Misiones.js?v=0.3.4';
import { ES_OFICIAL, contarOficial, crearEsCierre } from '../reglas/Oficiales.js?v=0.3.4';

const tidDe = u => +((String(u || '').match(/\/t(\d+)/) || [0, 0])[1]);
const aviso = (que, e) => console.warn('[Mi PJ] ' + que, e);

/**
 * @typedef {{ leer(ruta: string): Promise<Document> }} Agente
 * @typedef {{ gv(k: string, d: any): any, sv(k: string, v: any): void }} Memoria lo guardado del panel
 * @typedef {{ categoriaRol: number, noRol: number[], sueldos: { foro: string, formulario: string } }} ConfigActividad
 */

/**
 * @param {Agente} agente
 * @param {{ yo: string, uid: number, origen: string, cfg: ConfigActividad, memoria: Memoria, cierres?: string[][] }} ctx
 *   `cierres`: los avisos de data/cierres-oficial.json
 */
export function crearActividad(agente, { yo, uid, origen, cfg, memoria, cierres = [] }) {
  const esCierre = crearEsCierre(cierres);
  const abs = h => h ? new URL(h, origen).href : '';
  const ruta = u => { const x = new URL(u, origen); return x.pathname + x.search; };
  const get = u => agente.leer(ruta(u));
  const postsDe = doc => postsDeMiPj(doc, FECHA);

  async function paginas(urlTema) {
    const d1 = await get(urlTema);
    const base = ruta(urlTema).split('#')[0].split('?')[0];
    const m = base.match(/^\/t(\d+)(?:p\d+)?-(.*)$/);
    let max = 0;
    if (m) d1.querySelectorAll(`a[href*="/t${m[1]}p"]`).forEach(a => { const x = (a.getAttribute('href') || '').match(new RegExp(`/t${m[1]}p(\\d+)-`)); if (x) max = Math.max(max, +x[1]); });
    if (!max || !m) return { primera: d1, ultimas: [d1] };
    const ult = [await get(`/t${m[1]}p${max}-${m[2]}`)];
    if (max >= 15) { try { ult.unshift(await get(max - 15 ? `/t${m[1]}p${max - 15}-${m[2]}` : `/t${m[1]}-${m[2]}`)); } catch (e) { /* sin penúltima */ } }
    return { primera: d1, ultimas: ult };
  }
  const todosLosPosts = P => { const t = []; [P.primera, ...P.ultimas.filter(d => d !== P.primera)].forEach(d => postsDe(d).forEach(p => { if (!t.some(x => x.id === p.id)) t.push(p); })); return t.sort((a, b) => +a.id - +b.id); };

  /* ---------------- roles: dónde te toca responder ---------------- */
  /* un foro es de rol si su ruta pasa por la categoría «Zona del rol» (/c10-) */
  async function esForoDeRol(fid, cache) {
    if (cfg.noRol.includes(+fid)) return false;
    if (fid in cache) return cache[fid];
    try {
      const d = await agente.leer(`/f${fid}-`);
      const re = new RegExp(`^(?:https?://[^/]+)?/c${cfg.categoriaRol}-`);
      cache[fid] = [...d.querySelectorAll('a[href]')].some(a => re.test(a.getAttribute('href') || ''));
    } catch (e) { return false; }
    return cache[fid];
  }

  async function leerMisionDe(f) {
    const P = await paginas(f.url);
    return analizarMision(todosLosPosts(P).filter(p => !esBot(p.autor)), f.url, yo);
  }

  /** @returns {Promise<{ roles: any[], filas: any[] }>} `filas`: todos tus temas recientes (para buscar los oficiales) */
  async function leerRoles() {
    const filas = [];
    for (const pag of ['', '/50']) {
      let d; try { d = await agente.leer(`/sta/u${uid}${pag}`); } catch (e) { break; }
      d.querySelectorAll('a.topictitle').forEach(a => {
        const row = a.closest('li,tr'); if (!row) return;
        const fA = row.querySelector('.span-tab a[href*="/f"]') || row.querySelector('a[href*="/f"]');
        const fid = +(((fA && fA.getAttribute('href')) || '').match(/\/f(\d+)-/) || [0, 0])[1];
        const lp = row.querySelector('.lastpost'); if (!lp) return;
        const autor = (lp.querySelector('a[href*="/u"]') || {}).textContent || '';
        const ult = lp.querySelector('a[href*="#"]');
        filas.push({ titulo: (a.textContent ?? '').trim(), url: abs((a.getAttribute('href') || '').split('?')[0]), tid: tidDe(a.getAttribute('href')), fid,
          autor: autor.trim(), fecha: ((lp.textContent ?? '').match(FECHA) || [''])[0], ultUrl: ult ? abs(ult.getAttribute('href')) : '' });
      });
    }
    const todas = filas.map(f => ({ ...f }));
    const cache = memoria.gv('mipj.forosRol', {});
    /* si el último mensaje es de los Dados Mágicos, cuenta quién escribió antes que los dados */
    await Promise.all(filas.filter(f => f.fid && esBot(f.autor)).map(async f => {
      try {
        let ps = postsDe(await get(f.ultUrl || f.url)).filter(p => !esBot(p.autor));
        if (!ps.length) ps = todosLosPosts(await paginas(f.url)).filter(p => !esBot(p.autor));
        const u = ps[ps.length - 1];
        if (u) { f.autor = u.autor; if (u.fecha) f.fecha = u.fecha; } else f.soloBot = true;
      } catch (e) { f.soloBot = true; }
    }));
    const ajenos = filas.filter(f => f.fid && !f.soloBot && norm(f.autor) !== norm(yo));
    await Promise.all([...new Set(ajenos.map(f => f.fid))].map(fid => esForoDeRol(fid, cache)));
    const res = [];
    for (const f of ajenos) {
      if (res.some(x => x.tid === f.tid) || !(await esForoDeRol(f.fid, cache))) continue;
      res.push(Object.assign(f, { lpid: +((f.ultUrl.match(/#(\d+)/) || [0, 0])[1]) }));
    }
    memoria.sv('mipj.forosRol', cache);
    await Promise.all(res.filter(f => ES_MISION.test(f.titulo)).map(async f => {
      try { const M = await leerMisionDe(f); if (M && M.turno) f.mision = M; else f.misionSinTurno = true; } catch (e) { aviso('misión', e); }
    }));
    const roles = res.filter(f => !f.misionSinTurno).sort((a, b) => (+(aFecha(a.fecha) || 0)) - (+(aFecha(b.fecha) || 0)));
    return { roles, filas: todas };
  }

  /* ---------------- sueldo del mes ---------------- */
  async function leerSueldo() {
    const hoy = new Date(), mesAnt = (hoy.getMonth() + 11) % 12;
    const formulario = abs(cfg.sueldos.formulario); // absoluto: el panel está en un iframe de PAM
    const d = await agente.leer(cfg.sueldos.foro);
    const temas = [...d.querySelectorAll('a.topictitle')].map(a => ({ titulo: (a.textContent ?? '').trim(), url: abs((a.getAttribute('href') || '').split('?')[0].split('#')[0]) }));
    const t = temaDelMes(temas, hoy);
    if (!t) return { estado: 'sinTema', mes: MESES[mesAnt], leido: hoy.toISOString(), formulario };
    /* el tema entero: tu pedido puede estar en cualquier página */
    const tid = tidDe(t.url), slug = (t.url.match(/\/t\d+(?:p\d+)?-([^/?#]*)/) || [0, ''])[1];
    const d1 = await get(t.url);
    let max = 0;
    d1.querySelectorAll(`a[href*="/t${tid}p"]`).forEach(a => { const x = (a.getAttribute('href') || '').match(new RegExp(`/t${tid}p(\\d+)-`)); if (x) max = Math.max(max, +x[1]); });
    const otras = []; for (let o = 15; o <= max; o += 15) otras.push(o);
    const docs = [d1].concat(await Promise.all(otras.map(o => agente.leer(`/t${tid}p${o}-${slug}`).catch(() => null))));
    const posts = []; docs.filter(Boolean).forEach(x => postsDe(x).forEach(p => { if (!posts.some(q => q.id === p.id)) posts.push(p); }));
    posts.sort((a, b) => +a.id - +b.id);
    const { pedido, resp } = pedidoYRespuesta(posts, yo);
    return { estado: 'leido', mes: MESES[mesDelTema(t.titulo)], url: t.url, tid, pedido, resp, leido: hoy.toISOString(), formulario };
  }

  /* ---------------- oficiales ---------------- */
  /* zona horaria de la cuenta (perfil › preferencias); el foro muestra las horas en esa zona */
  async function zonaCuenta() {
    const k = 'mipj.tz.' + uid, c = memoria.gv(k, null);
    if (c && Date.now() - c.t < 7 * 864e5) return c.tz;
    let tz = 'Europe/Madrid';
    try {
      const d = await agente.leer('/profile?mode=editprofile&page_profil=preferences');
      const s = /** @type {HTMLSelectElement|null} */ (d.querySelector('select[name="timezone"]')); const v = s && s.value;
      if (v && /^[A-Za-z_]+\/[A-Za-z_/+-]+$/.test(v)) tz = v;
      else if (v && /^-?\d+(\.\d+)?$/.test(v)) tz = 'Etc/GMT' + (+v > 0 ? '-' : '+') + Math.abs(Math.round(+v));
    } catch (e) { /* hora de España */ }
    memoria.sv(k, { tz, t: Date.now() });
    return tz;
  }
  /** Todos los mensajes del tema, con fecha en UTC (y el texto, para ver si está cerrado). @param {(d: Document) => void} [primera] */
  async function postsDelTema(url, tz, primera) {
    const tid = tidDe(url), slug = (String(url).match(/\/t\d+(?:p\d+)?-([^/?#]*)/) || [0, ''])[1];
    const d1 = await agente.leer(`/t${tid}-${slug}`);
    if (primera) primera(d1);
    let max = 0; d1.querySelectorAll(`a[href*="/t${tid}p"]`).forEach(a => { const x = (a.getAttribute('href') || '').match(new RegExp(`/t${tid}p(\\d+)-`)); if (x) max = Math.max(max, +x[1]); });
    const offs = []; for (let o = 15; o <= max; o += 15) offs.push(o);
    const docs = [d1]; for (let i = 0; i < offs.length; i += 4) docs.push(...await Promise.all(offs.slice(i, i + 4).map(o => agente.leer(`/t${tid}p${o}-${slug}`).catch(() => null))));
    const vistos = new Set(), out = [];
    docs.filter(Boolean).forEach(d => postsDe(d).forEach(p => { if (vistos.has(p.id)) return; vistos.add(p.id); const P = partesDeFecha(p.fecha); out.push({ id: +p.id, autor: p.autor, utc: P ? aUTC(P, tz) : null, texto: p.texto }); }));
    return { titulo: ((d1.querySelector('h1.page-title') || {}).textContent || '').trim(), tid, url: abs(`/t${tid}-${slug}`), posts: out.sort((a, b) => a.id - b.id) };
  }
  async function leerMisOficiales(filas) {
    const tz = await zonaCuenta(), cache = memoria.gv('mipj.forosRol', {});
    const cands = []; filas.forEach(f => { if (ES_OFICIAL.test(f.titulo) && !cands.some(c => c.tid === f.tid)) cands.push(f); });
    const out = [];
    for (const f of cands) {
      try {
        if (f.fid && !(await esForoDeRol(f.fid, cache))) continue;
        const O = contarOficial(await postsDelTema(f.url, tz), esCierre);
        if (O.parts.some(p => norm(p.autor) === norm(yo))) out.push(O);
      } catch (e) { aviso('oficial', e); }
    }
    return out;
  }
  /** El oficial de la página donde está el jugador (para la barra de arriba de los mensajes). */
  async function leerOficialDeRuta(rutaTema, alEmpezar) {
    return contarOficial(await postsDelTema(rutaTema, await zonaCuenta(), alEmpezar), esCierre);
  }

  return { leerRoles, leerSueldo, leerMisOficiales, leerOficialDeRuta, zonaCuenta };
}

