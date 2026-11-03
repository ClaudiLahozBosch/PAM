// @ts-check
// Los canjes en el foro (pam-mi-pj.user.js 1.7.1, crearCanjes): publicar la petición que preparó PAM en el
// Registro de Canjes y encontrar la respuesta de un Inspector de Canjes. La lectura es la misma que hacía Mi PJ
// (mismos mensajes, mismas páginas, mismos textos); lo que cambia es que se lee y se publica a través del agente.
//
// Dónde se guarda (almacén del agente, compartido entre el foro y PAM):
//   «pam.peticion»                        la petición que dejó PAM al «Preparar el canje» (la misma clave que Mi PJ);
//   «pam.cuentas.<foro>.<id de cuenta>»   { peticiones } de esa cuenta (Mi PJ lo guardaba en «cuentas.<foro>.<id>»).
// Los Inspectores de cada grupo se guardan un día en la memoria del panel («grupos.<foro>»).
import { numero, mismoTexto, enlacePost, temaNumero, peticionCapturada, textoPeticion, avisosPeticion, clasificarRespuesta, normNombre } from '../reglas/Canjes.js?v=0.3.8';

export const CLAVE_PETICION = 'pam.peticion';
const CADUCIDAD_GRUPOS_MS = 24 * 60 * 60 * 1000;
const ahoraISO = () => new Date().toISOString();

/* ---------------- lectura de páginas (las funciones de Mi PJ, con el documento que da el agente) ---------------- */

/** Texto de un bloque HTML línea a línea, incluido lo que está dentro de spoilers cerrados. @param {Element|null} elemento */
export function lineasDe(elemento) {
  if (!elemento) return [];
  const copia = /** @type {Element} */ (elemento.cloneNode(true));
  copia.querySelectorAll('style, script').forEach(e => e.remove());
  const html = copia.innerHTML
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|dd|dt|dl|li|ul|ol|tr|td|table|h[1-6]|center|label|blockquote)\b[^>]*>/gi, '\n');
  const tmp = elemento.ownerDocument.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || '').split('\n')
    .map(l => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(l => l !== '');
}

/** Mensajes de una página de tema, como los leían los canjes de Mi PJ. @param {Document} doc */
export function postsDe(doc) {
  return [...doc.querySelectorAll('.post')].map(p => {
    const a = p.querySelector('.author a[href^="/u"], .postprofile a[href^="/u"]');
    const autor = p.querySelector('p.author');
    const nombre = a ? (a.textContent ?? '').trim() : '';
    let fecha = autor ? (autor.textContent ?? '').replace(/\s+/g, ' ').replace(/^.*?por\s*/i, '') : '';
    if (nombre && fecha.indexOf(nombre) === 0) fecha = fecha.substring(nombre.length);
    return {
      id: (p.id || '').replace(/\D/g, ''),
      autorId: a ? parseInt(((a.getAttribute('href') ?? '').match(/^\/u(\d+)/) || [])[1], 10) : null,
      autorNombre: nombre,
      fecha: fecha.trim(),
      contenido: p.querySelector('.content')
    };
  });
}

/**
 * @param {{ leer(ruta: string): Promise<Document>, leerDato(k: string): Promise<any>, guardarDato(k: string, v: any): Promise<any>,
 *   puerta(accion: any): Promise<any> }} agente
 * @param {{ foroHost: string, cuenta: { id: number, nombre: string }, cfg: any, memoria: { gv(k: string, d: any): any, sv(k: string, v: any): void } }} op
 */
export function crearCanjesDelForo(agente, { foroHost, cuenta, cfg, memoria }) {
  const origen = 'https://' + foroHost;
  // (el agente solo acepta letras, números, «.», «_» y «-» en las claves: un foro con puerto, como el banco local, lleva «:»)
  const CLAVE_CUENTA = 'pam.cuentas.' + foroHost.replace(/[^\w.-]/g, '_') + '.' + cuenta.id;
  const enlace = id => enlacePost(origen, id);

  /** La primera página y, si hay más, la última (y la anteúltima). */
  async function leerTema(urlTema) {
    const d1 = await agente.leer(urlTema);
    const titulo = (d1.querySelector('h1.page-title')?.textContent ?? '').trim();
    const enlaces = [...d1.querySelectorAll('.pagination a[href]')].map(a => a.getAttribute('href') ?? '').filter(h => /\/t\d+p\d+-/.test(h));
    let ultima = null, max = -1;
    for (const h of enlaces) { const off = parseInt((h.match(/\/t\d+p(\d+)-/) || [])[1], 10); if (off > max) { max = off; ultima = h; } }
    const primeros = postsDe(d1);
    if (!ultima) return { titulo, posts: primeros, paginas: 1 };
    // También la anteúltima: si la última solo tiene una nota, el último movimiento queda antes.
    const anteultima = max > 15 ? ultima.replace(/\/t(\d+)p\d+-/, '/t$1p' + (max - 15) + '-') : null;
    const ds = await Promise.all([agente.leer(ultima), anteultima ? agente.leer(anteultima).catch(() => null) : null]);
    const vistos = {};
    const todos = primeros.concat(ds[1] ? postsDe(ds[1]) : [], postsDe(ds[0])).filter(p => { if (vistos[p.id]) return false; vistos[p.id] = true; return true; });
    todos.sort((x, y) => parseInt(x.id, 10) - parseInt(y.id, 10));
    return { titulo, posts: todos, paginas: ds[1] ? 3 : 2 };
  }

  /** El BBCode de un mensaje (de su página de edición); si no se puede, null. */
  async function leerBBCode(idPost) {
    try {
      const d = await agente.leer('/post?p=' + idPost + '&mode=editpost');
      const t = /** @type {HTMLTextAreaElement|null} */ (d.querySelector('form[name="post"] textarea[name="message"]'));
      return t ? t.value : null;
    } catch { return null; }
  }

  /** Miembros de un grupo (tabla de miembros; no la lista de conectados). */
  async function leerGrupo(url) {
    const d = await agente.leer(url);
    const main = d.querySelector('#main-content') || d.body;
    // Fuera la lista de conectados y similares: no son miembros del grupo.
    main.querySelectorAll('#whosonline, .whosonline, #picture_legend, .stat-block').forEach(e => e.remove());
    const vistos = {}, miembros = [];
    main.querySelectorAll('table a[href^="/u"], ul.topiclist a[href^="/u"]').forEach(a => {
      const id = parseInt(((a.getAttribute('href') ?? '').match(/^\/u(\d+)/) || [])[1], 10);
      const n = (a.textContent ?? '').trim();
      if (id && n && !vistos[id]) { vistos[id] = true; miembros.push({ id, nombre: n }); }
    });
    return miembros;
  }

  /** Los Inspectores de cada grupo (se guardan un día). */
  async function leerGruposRevisores(forzar = false) {
    const clave = 'grupos.' + foroHost;
    const cache = memoria.gv(clave, null);
    if (!forzar && cache && (Date.now() - cache.leido) < CADUCIDAD_GRUPOS_MS) return cache;
    const nombres = Object.keys(cfg.grupos || {});
    if (!nombres.length) return { leido: Date.now(), grupos: {} };
    const listas = await Promise.all(nombres.map(n => leerGrupo(cfg.grupos[n]).catch(() => null)));
    const res = { leido: Date.now(), grupos: {} };
    nombres.forEach((n, i) => { res.grupos[n] = listas[i]; });
    memoria.sv(clave, res);
    return res;
  }

  /* ---------------- lo guardado de la cuenta ---------------- */
  const datosCuenta = async () => (await agente.leerDato(CLAVE_CUENTA)) || {};
  async function guardarDatosCuenta(cambiar) {
    const d = await datosCuenta();
    cambiar(d);
    await agente.guardarDato(CLAVE_CUENTA, d);
    return d;
  }
  /** La petición que dejó PAM para esta cuenta, si todavía no se publicó. */
  const leerCaptura = async () => peticionCapturada(await agente.leerDato(CLAVE_PETICION), foroHost, cuenta);

  /** ¿Ya está publicada esta petición? Mira tus últimos mensajes del registro. */
  async function buscarPeticionPublicada(texto) {
    const t = await leerTema(cfg.registroCanjes);
    const propios = t.posts.filter(p => p.autorId === cuenta.id).slice(-3).reverse();
    for (const p of propios) { const bb = await leerBBCode(p.id); if (bb !== null && mismoTexto(bb, texto)) return p; }
    return null;
  }

  async function registrarPeticion(pet, post, fecha) {
    await guardarDatosCuenta(d => {
      d.peticiones = d.peticiones || [];
      if (d.peticiones.some(x => x.post === String(post))) return;
      d.peticiones.push({
        post: String(post), enlace: enlace(post), creado: ahoraISO(), fecha: fecha || '',
        pj: pet.pj, gastadas: numero(pet.gastadas), estado: 'esperando', aprobacion: null, descartadas: [],
        // Textos que generó PAM al preparar el canje (para aplicarlo sin volver a PAM).
        ficha: pet.ficha || null, boveda: pet.boveda || null
      });
      if (d.peticiones.length > 20) d.peticiones = d.peticiones.slice(-20);
    });
    const p = await agente.leerDato(CLAVE_PETICION);
    if (p && p.creado === pet.creado) { p.usado = { fecha: ahoraISO(), post: String(post) }; await agente.guardarDato(CLAVE_PETICION, p); }
  }

  /**
   * La puerta para publicar la petición. `datos` es lo que leyó el panel (bóveda y nombre del personaje).
   * @param {any} pet @param {any} datos
   */
  async function accionPublicarPeticion(pet, datos) {
    const b = datos && datos.boveda;
    const texto = textoPeticion(pet, b ? { url: b.url, titulo: b.titulo } : null);
    const ya = await buscarPeticionPublicada(texto);
    const avisos = avisosPeticion(pet, { actForo: b && b.act != null ? b.act : NaN, nombreFicha: datos && datos.ficha ? datos.pj : cuenta.nombre });
    /** @type {any} */
    const paso = { tipo: 'publicar', tema: temaNumero(cfg.registroCanjes), texto, descripcion: 'Registro de Canjes' };
    if (ya) {
      paso.igual = 'Ya publicaste esta misma petición en el registro.';
      await registrarPeticion(pet, ya.id, ya.fecha);
    }
    return {
      titulo: 'Publicar la petición de canje',
      explicacion: 'Texto armado por PAM (' + new Date(pet.creado).toLocaleString('es-AR') + '), con la cabecera de personaje, bóveda y grageas. El registro no se puede editar: si hay que corregir algo, va en un mensaje nuevo.',
      avisos,
      pasos: [paso]
    };
  }

  /**
   * Publicar: la puerta del agente y, si se publicó, se apunta la petición.
   * @returns {Promise<{ post?: string, enlace?: string, igual?: boolean, sinEncontrar?: boolean, resultado: string }>}
   */
  async function publicar(pet, datos) {
    const accion = await accionPublicarPeticion(pet, datos);
    const res = await agente.puerta(accion);
    const r = res.pasos && res.pasos[0];
    if (r && r.estado === 'ok') {
      // Si el foro no ha devuelto el número del mensaje, se busca.
      const p = r.post ? { id: String(r.post), fecha: '' } : await buscarPeticionPublicada(accion.pasos[0].texto);
      if (!p) return { resultado: res.resultado, sinEncontrar: true };
      await registrarPeticion(pet, p.id, p.fecha);
      return { resultado: res.resultado, post: p.id, enlace: enlace(p.id) };
    }
    return { resultado: res.resultado, igual: res.resultado === 'igual' };
  }

  async function descartarCaptura(pet) {
    const p = await agente.leerDato(CLAVE_PETICION);
    if (p && p.creado === pet.creado) { p.usado = { fecha: ahoraISO(), descartada: true }; await agente.guardarDato(CLAVE_PETICION, p); }
  }

  /** «Es la aprobación» / «No lo es». */
  async function confirmar(pet, si) {
    await guardarDatosCuenta(d => {
      const x = (d.peticiones || []).find(y => y.post === pet.post);
      if (!x || !x.aprobacion) return;
      if (si) { x.aprobacion.confirmada = true; x.estado = 'aprobada'; }
      else { x.descartadas = (x.descartadas || []).concat([x.aprobacion.post]); x.aprobacion = null; x.estado = 'esperando'; }
    });
  }

  /* ---------------- la respuesta del Inspector ---------------- */

  /** Mensajes del registro posteriores a la petición (se lee hacia atrás desde la última página). */
  async function postsTrasPeticion(idPost) {
    const tema = temaNumero(cfg.registroCanjes);
    const d1 = await agente.leer(cfg.registroCanjes);
    const offs = [...d1.querySelectorAll('.pagination a[href]')].map(a => parseInt(((a.getAttribute('href') ?? '').match(/\/t\d+p(\d+)-/) || [])[1], 10)).filter(n => !isNaN(n));
    const max = offs.length ? Math.max(...offs) : 0;
    const positivos = offs.filter(n => n > 0);
    const paso = positivos.length ? Math.min(...positivos) : 15;
    let despues = [];
    async function pagina(off, n) {
      const d = off <= 0 ? d1 : await agente.leer('/t' + tema + 'p' + off + '-');
      const posts = postsDe(d);
      const i = posts.map(p => p.id).indexOf(String(idPost));
      if (i !== -1) return posts.slice(i + 1).concat(despues);
      despues = posts.concat(despues);
      if (off <= 0 || n >= 6) return null;
      return pagina(Math.max(0, off - paso), n + 1);
    }
    return pagina(max, 1);
  }

  /** Busca la respuesta de un revisor a una petición. No decide nada: deja el candidato anotado. */
  async function buscarAprobacion(revisores, pet) {
    const g = revisores && revisores.grupos && revisores.grupos.canjes;
    const conGrupo = Array.isArray(g) && g.length > 0;
    const idsRev = conGrupo ? g.map(m => m.id) : [];
    const nombre = normNombre(pet.pj);
    const pila = nombre.split(' ')[0];
    const posts = await postsTrasPeticion(pet.post);
    if (posts === null) return { noEncontrada: true };
    const reNombre = new RegExp('(^|[^a-z])' + pila.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)');
    const teNombra = p => {
      const txt = normNombre(lineasDe(p.contenido).join(' '));
      const enlazaPeticion = p.contenido && p.contenido.querySelector('a[href*="' + pet.post + '"]');
      return !!enlazaPeticion || txt.indexOf(nombre) !== -1 || reNombre.test(txt);
    };
    // Candidato: un revisor que te nombra (o enlaza la petición) o, si no te nombra, la
    // primera respuesta de un revisor sin otras peticiones por medio (siempre se pregunta).
    let cand = null, sinNombre = false, otrosPorMedio = false;
    for (let k = 0; k < posts.length && !cand; k++) {
      const p = posts[k];
      if (!p.autorId || p.autorId === cuenta.id) continue;
      if (conGrupo && idsRev.indexOf(p.autorId) === -1) { otrosPorMedio = true; continue; }
      if ((pet.descartadas || []).indexOf(p.id) !== -1) continue;
      if (teNombra(p)) cand = p;
      else if (!otrosPorMedio) { cand = p; sinNombre = true; }
    }
    if (!cand) return { ninguna: true };
    const texto = lineasDe(cand.contenido).join(' ');
    const c = clasificarRespuesta(texto);
    return {
      post: cand.id, enlace: enlace(cand.id), autor: cand.autorNombre, fecha: cand.fecha,
      clase: c.clase, importe: c.importe, extracto: texto.substring(0, 280),
      revisorConfirmado: conGrupo, sinNombre,
      // Solo se da por buena sin preguntar si es de un Inspector de Canjes, te nombra y es clara.
      confirmada: conGrupo && !sinNombre && (c.clase === 'aprobada' || c.clase === 'corregida')
    };
  }

  /** Al leer el foro: busca la respuesta de las peticiones que esperan (o cuya respuesta no está confirmada). */
  async function actualizarAprobaciones() {
    if (!cfg.registroCanjes) return;
    const pendientes = ((await datosCuenta()).peticiones || []).filter(p => p.estado === 'esperando' || (p.aprobacion && !p.aprobacion.confirmada));
    if (!pendientes.length) return;
    const revisores = await leerGruposRevisores(false).catch(() => null);
    for (const pet of pendientes) {
      try {
        const r = await buscarAprobacion(revisores, pet);
        await guardarDatosCuenta(d => {
          const x = (d.peticiones || []).find(y => y.post === pet.post);
          if (!x) return;
          x.revisado = ahoraISO();
          x.noEncontrada = !!r.noEncontrada;
          if (r.post && !(x.aprobacion && x.aprobacion.post === r.post && x.aprobacion.confirmada)) {
            x.aprobacion = r;
            x.estado = r.confirmada ? 'aprobada' : 'revisar';
          }
        });
      } catch { /* se reintenta en la próxima lectura */ }
    }
  }

  return {
    clave: CLAVE_CUENTA, enlace,
    leerCaptura, datosCuenta, publicar, accionPublicarPeticion, buscarPeticionPublicada, registrarPeticion,
    descartarCaptura, confirmar, actualizarAprobaciones, buscarAprobacion, leerGruposRevisores
  };
}
