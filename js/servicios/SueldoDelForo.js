// @ts-check
// 2.5.0 · Pedir el sueldo de un rol de empleo desde el propio rol, y sumar el sueldo aprobado a la bóveda.
// Lo que se lee del foro (siempre a través del agente, sin publicar nada):
//   · el rol donde está el jugador: si es de la zona de rol, si está cerrado, si escribió en él y sus «Empleos roleros»
//     (el campo del perfil que el foro enseña junto a cada mensaje; lo pone el staff);
//   · el tema de sueldos del mes y los de antes: si ya pidió un rol de empleo este mes y si ya pidió este rol.
// Lo que se publica va siempre por la puerta del agente (Aceptar / Modificar / Denegar).
import { leerPaginaTema, esDeCuenta } from '../lectores/LectorTema.js?v=2.5.0';
import { lineasDe } from './CanjesDelForo.js?v=2.5.0';
import { enlacePost } from '../reglas/Canjes.js?v=2.5.0';
import { empleosDelPerfil, formularioEmpleo, ES_PEDIDO_DE_ROL, enlazaTema } from '../reglas/Sueldo.js?v=2.5.0';

/** La marca de «tema cerrado» del foro (el candado de los botones: «Este tema está cerrado y no puedes…»). */
export const temaCerrado = doc => [...doc.querySelectorAll('img[alt]')].some(i => /tema\s+est[aá]\s+cerrado/i.test(i.getAttribute('alt') || ''));

/**
 * ¿Está el tema en la zona de rol? La ruta de navegación pasa por la categoría «Zona del rol» y por ningún subforo de
 * los que no son de rol (Sueldos Mensuales y Gringotts también están dentro de esa categoría).
 * @param {Document} doc @param {{ categoriaRol: number, noRol: number[] }} cfg
 */
export function enZonaDeRol(doc, cfg) {
  const navs = [...doc.querySelectorAll('a.nav[href]')].map(a => a.getAttribute('href') || '');
  const enCat = navs.some(h => new RegExp(`^(?:https?://[^/]+)?/c${cfg.categoriaRol}-`).test(h));
  const foros = navs.map(h => +((h.match(/^(?:https?:\/\/[^/]+)?\/f(\d+)-/) || [])[1] || 0)).filter(Boolean);
  return enCat && foros.length > 0 && !foros.some(f => cfg.noRol.includes(f));
}

/** Un campo del perfil junto a un mensaje («Empleos roleros : …»), línea a línea; null si el mensaje no lo tiene. */
export function campoDelPerfil(post, etiqueta) {
  for (const s of post.querySelectorAll('.profileField')) {
    const lab = s.querySelector('.label');
    if (!lab || !etiqueta.test(lab.textContent || '')) continue;
    const c = /** @type {Element} */ (s.cloneNode(true)); c.querySelector('.label')?.remove();
    return lineasDe(c).join('\n');
  }
  return null;
}

/**
 * @param {{ leer(ruta: string): Promise<Document> }} agente
 * @param {{ origen: string, cuenta: { id: number, nombre: string }, cfg: { categoriaRol: number, noRol: number[], sueldos: { foro: string } },
 *   memoria: { gv(k: string, d: any): any, sv(k: string, v: any): void }, ahora?: () => number }} op
 */
export function crearSueldoDelForo(agente, { origen, cuenta, cfg, memoria, ahora = () => Date.now() }) {
  const esMio = m => esDeCuenta(m, cuenta);
  const ruta = u => { const x = new URL(u, origen); return x.pathname; };

  /** Todas las páginas de un tema (la primera ya leída), de 4 en 4. */
  async function todasLasPaginas(d1, max = 20) {
    const P = leerPaginaTema(d1);
    const otras = P.paginas.filter(h => !h.startsWith(`/t${P.tema}-`)).slice(0, max);
    const docs = [d1];
    for (let i = 0; i < otras.length; i += 4) docs.push(...(await Promise.all(otras.slice(i, i + 4).map(h => agente.leer(h).catch(() => null)))).filter(Boolean));
    return docs;
  }

  /**
   * El rol de la página donde está el jugador. Primero la primera página: si no es de la zona de rol o no está
   * cerrado, no se lee más. Un rol cerrado ya no cambia: se guarda (y el perfil, una semana).
   * @param {string} rutaTema «/t38034-inquilinos-desagradables»
   * @returns {Promise<null | { tid: number, url: string, titulo: string, enRol: boolean, cerrado: boolean, mios: number, empleos: ReturnType<typeof empleosDelPerfil>|null, ultimo: { id: number, fecha: string }|null }>}
   */
  async function leerRol(rutaTema) {
    const tid = +((String(rutaTema).match(/^\/t(\d+)/) || [])[1] || 0);
    if (!tid) return null;
    const K = 'mipj.sueldoRol.' + cuenta.id + '.' + tid, c = memoria.gv(K, null);
    if (c && ahora() - c.t < 7 * 864e5) return c.r;
    const d1 = await agente.leer(`/t${tid}-`);
    const P1 = leerPaginaTema(d1);
    const base = { tid, url: new URL(`/t${tid}-`, origen).href, titulo: P1.titulo, enRol: enZonaDeRol(d1, cfg), cerrado: temaCerrado(d1), mios: 0, empleos: null, ultimo: null };
    if (!base.enRol || !base.cerrado) return base; // no se guarda: puede cerrarse más tarde
    const docs = await todasLasPaginas(d1);
    const posts = [];
    let empleos = null;
    for (const d of docs) {
      for (const m of leerPaginaTema(d).posts) {
        if (posts.some(x => x.id === m.id)) continue;
        posts.push(m);
        const el = d.getElementById('p' + m.id);
        if (el && esMio(m) && empleos == null) { const t = campoDelPerfil(el, /empleos?\s+roleros?/i); if (t != null) empleos = empleosDelPerfil(t); }
      }
    }
    posts.sort((a, b) => a.id - b.id);
    const ult = posts[posts.length - 1];
    const r = { ...base, mios: posts.filter(esMio).length, empleos, ultimo: ult ? { id: ult.id, fecha: ult.fecha } : null };
    memoria.sv(K, { t: ahora(), r });
    return r;
  }

  /** Tus mensajes de un tema de sueldos (todas sus páginas). */
  async function misPedidos(urlTema) {
    const d1 = await agente.leer(ruta(urlTema));
    const out = [];
    for (const d of await todasLasPaginas(d1)) for (const m of leerPaginaTema(d).posts) if (esMio(m) && !out.some(x => x.id === m.id)) out.push(m);
    return out;
  }

  /**
   * Antes de pedir: ¿ya pediste un rol de empleo este mes? ¿ya pediste este rol (este mes o uno de antes)?
   * Los meses de antes: solo los temas de sueldos con mensajes posteriores al último del rol (antes no se podía pedir).
   * @param {{ tid: number, ultimo: { id: number }|null }} rol @param {{ url: string }} S el sueldo del mes (leerSueldo)
   */
  async function antesDePedir(rol, S) {
    const deEsteMes = await misPedidos(S.url);
    const rolEsteMes = deEsteMes.find(m => ES_PEDIDO_DE_ROL.test(m.texto)) || null;
    const aqui = deEsteMes.find(m => enlazaTema(m.html, rol.tid));
    /** @type {{ tema: string, titulo?: string, post: number }|null} */
    let repetido = aqui ? { tema: S.url, post: aqui.id } : null;
    if (!repetido && rol.ultimo) {
      try {
        const d = await agente.leer(cfg.sueldos.foro);
        const temas = [...d.querySelectorAll('a.topictitle')].map(a => {
          const fila = a.closest('li, tr');
          const ult = [...(fila ? fila.querySelectorAll('a[href*="#"]') : [])].map(x => +((x.getAttribute('href') || '').match(/#(\d+)$/) || [])[1] || 0).reduce((x, y) => Math.max(x, y), 0);
          return { titulo: (a.textContent || '').trim(), url: (a.getAttribute('href') || '').split('#')[0].split('?')[0], ult };
        }).filter(t => /^Sueldos\s+de\s+\S+/i.test(t.titulo) && ruta(t.url) !== ruta(S.url) && (!t.ult || t.ult > rol.ultimo.id)).slice(0, 4);
        for (const t of temas) {
          const m = (await misPedidos(t.url)).find(x => enlazaTema(x.html, rol.tid));
          if (m) { repetido = { tema: new URL(t.url, origen).href, titulo: t.titulo, post: m.id }; break; }
        }
      } catch (e) { console.warn('[Mi PJ] sueldos de otros meses', e); }
    }
    return { rolEsteMes: rolEsteMes ? { post: rolEsteMes.id } : null, repetido };
  }

  /**
   * La puerta para publicar el pedido en el tema del mes.
   * @param {Parameters<typeof formularioEmpleo>[0]} f @param {{ url: string, tid: number, mes: string }} S
   * @param {string[]} [avisos]
   */
  function accionPedir(f, S, avisos = []) {
    const mes = S.mes ? S.mes[0].toUpperCase() + S.mes.slice(1) : '';
    return {
      titulo: 'Pedir el sueldo',
      explicacion: 'Tu pedido en «Sueldos de ' + mes + '», con el formulario «Empleo rolero» del foro. Revisalo y, si hace falta, tocá «Modificar». Un inspector lo revisa y te contesta en el mismo tema.',
      avisos,
      pasos: [{ tipo: 'publicar', tema: S.tid, texto: formularioEmpleo(f), descripcion: 'pedido en «Sueldos de ' + mes + '»' }]
    };
  }

  /** Enlaces del pedido y de la aprobación (los que lleva el movimiento de la bóveda). @param {{ pedido: { id: number }, resp: { id: number } }} S */
  const enlaces = S => ({ enlacePet: enlacePost(origen, S.pedido.id), enlaceAce: enlacePost(origen, S.resp.id) });

  return { leerRol, antesDePedir, accionPedir, enlaces };
}
