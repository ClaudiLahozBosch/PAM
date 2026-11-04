// @ts-check
// Los canjes en el foro (pam-mi-pj.user.js 1.7.1, crearCanjes): publicar la petición que preparó PAM en el
// Registro de Canjes y encontrar la respuesta de un Inspector de Canjes. La lectura es la misma que hacía Mi PJ
// (mismos mensajes, mismas páginas, mismos textos); lo que cambia es que se lee y se publica a través del agente.
//
// Dónde se guarda (almacén del agente, compartido entre el foro y PAM):
//   «pam.peticion»                        la petición que dejó PAM al «Preparar el canje» (la misma clave que Mi PJ);
//   «pam.cuentas.<foro>.<id de cuenta>»   { peticiones } de esa cuenta (Mi PJ lo guardaba en «cuentas.<foro>.<id>»).
// Los Inspectores de cada grupo se guardan un día en la memoria del panel («grupos.<foro>»).
import { numero, formato, esNumero, mismoTexto, enlacePost, temaNumero, peticionCapturada, textoPeticion, avisosPeticion, clasificarRespuesta, normNombre,
  claveCuenta, paqueteCierre, cambiarNumeroTras, descuadres, codigoConEnlaces } from '../reglas/Canjes.js?v=0.4.1';
import { leerSaldos } from '../lectores/LectorBoveda.js?v=0.4.1';
import { revisar } from '../reglas/RevisorBoveda.js?v=0.4.1';

export const CLAVE_APROBACION = 'pam.aprobacion';
const aNum = v => (typeof v === 'number' ? v : NaN);
/** El texto que sigue a una etiqueta («Grageas Iniciales: 1.000» → «1.000»). */
function valorTras(lineas, etiqueta) {
  const re = new RegExp(etiqueta + '\\s*:?', 'i');
  const l = lineas.filter(x => re.test(x))[0];
  if (!l) return null;
  return l.replace(/^.*?:/, '').trim();
}

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
  const CLAVE_CUENTA = claveCuenta(foroHost, cuenta.id);
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

  /* ---------------- aplicar el canje aprobado (fase 6b·3) ---------------- */

  /** La bóveda como la leían los canjes de Mi PJ: el primer mensaje (cabecera) y el saldo del último movimiento. */
  async function leerBoveda(urlTema) {
    const t = await leerTema(urlTema);
    const primero = t.posts[0];
    if (!primero) throw new Error('No pude abrir la bóveda.');
    if (primero.autorId !== cuenta.id) throw new Error('El primer mensaje de la bóveda no es tuyo.');
    const l = lineasDe(primero.contenido);
    // Saldo: el primer mensaje es solo el respaldo; manda el último movimiento (tuyo o de una revisión).
    const cab = leerSaldos(l.join('\n'));
    const saldo = {
      gr: { act: cab.gr ? cab.gr.fin : NaN, tot: cab.gr ? aNum(cab.gr.tot) : NaN, ini: cab.gr ? aNum(cab.gr.ini) : NaN },
      pl: { act: cab.pl ? cab.pl.fin : NaN, tot: cab.pl ? aNum(cab.pl.tot) : NaN }
    };
    t.posts.slice(1).forEach(p => {
      let esRevision = false;
      if (p.autorId !== cuenta.id && p.autorId) esRevision = /Revisi[oó]n\s+de\s+B[oó]veda/i.test(lineasDe(p.contenido).join(' '));
      if (p.autorId === cuenta.id || esRevision) {
        const s2 = leerSaldos(lineasDe(p.contenido).join('\n'));
        if (s2.gr) { saldo.gr.act = s2.gr.fin; if (s2.gr.tot != null) saldo.gr.tot = s2.gr.tot; }
        if (s2.pl) { saldo.pl.act = s2.pl.fin; if (s2.pl.tot != null) saldo.pl.tot = s2.pl.tot; }
      }
    });
    return {
      post: primero.id,
      grageas: { iniciales: saldo.gr.ini, totales: saldo.gr.tot, actuales: saldo.gr.act },
      pl: { totales: saldo.pl.tot, actuales: saldo.pl.act },
      cabecera: { iniciales: numero(valorTras(l, 'Grageas Iniciales')), totales: numero(valorTras(l, 'Grageas Totales')), actuales: numero(valorTras(l, 'Grageas Actuales')) }
    };
  }

  /** La ficha como la leían los canjes de Mi PJ: el primer mensaje y su BBCode (N07: los canjes editan un solo mensaje). */
  async function leerFicha(urlTema) {
    const t = await leerTema(urlTema);
    const primero = t.posts[0];
    if (!primero) throw new Error('No pude abrir la ficha.');
    if (primero.autorId !== cuenta.id) throw new Error('El primer mensaje de la ficha no es tuyo.');
    return { post: primero.id, bbcode: await leerBBCode(primero.id) };
  }

  /** Tu último mensaje de un tema (sin contar el primero) cuyo BBCode cumple `cond`, o null. */
  async function buscarMensajePropio(urlTema, cond) {
    const t = await leerTema(urlTema);
    const propios = t.posts.slice(1).filter(p => p.autorId === cuenta.id).slice(-3).reverse();
    for (const p of propios) { const bb = await leerBBCode(p.id); if (bb !== null && cond(bb)) return p; }
    return null;
  }

  /**
   * La puerta «Aplicar el canje aprobado»: primer mensaje de la bóveda, movimiento, ficha y aviso, con los textos
   * que preparó PAM (aquí no se calcula nada). `datos` es lo que leyó el panel (dónde están la bóveda y la ficha).
   */
  async function accionAplicarCanje(pet, datos) {
    const a = pet.aprobacion;
    if (!a || !a.confirmada) throw new Error('La aprobación todavía no está confirmada.');
    if (!pet.boveda && !pet.ficha) throw new Error('Esta petición se preparó sin los códigos de PAM (versión anterior): aplicala a mano.');
    if (esNumero(a.importe) && a.importe !== pet.gastadas) {
      throw new Error('El revisor corrigió el importe (' + formato(pet.gastadas) + ' → ' + formato(a.importe) + '). Los códigos de PAM son del importe original: aplicalo a mano o volvé a preparar el canje en PAM.');
    }
    if (!datos || !datos.boveda || !datos.ficha) throw new Error('Tocá «Actualizar»: necesito tu bóveda y tu ficha.');
    const avisos = [], pasos = [];
    const ruta = u => { const x = new URL(u, origen); return x.pathname; };
    const urlBov = ruta(datos.boveda.url), urlFicha = ruta(datos.ficha.url);
    const [bov, fic] = await Promise.all([leerBoveda(urlBov), leerFicha(urlFicha)]);
    const bbBov = await leerBBCode(bov.post);
    // 1 y 2. Bóveda
    if (pet.boveda) {
      const n = pet.boveda.numeros;
      // Vale si la bóveda está como antes del canje o ya con el canje aplicado (reintento).
      if (bov.grageas.actuales !== n.iniciales && bov.grageas.actuales !== n.actuales) {
        throw new Error('Tu bóveda del foro dice ' + formato(bov.grageas.actuales) + ' grageas actuales, pero el movimiento que preparó PAM empieza en ' + formato(n.iniciales) + '. ¿Hubo otro movimiento desde entonces? No se tocó nada: volvé a preparar el canje en PAM.');
      }
      if (bbBov === null) throw new Error('No puedo leer el primer mensaje de tu bóveda.');
      let nuevoBov = cambiarNumeroTras(bbBov, 'Grageas Actuales', n.actuales);
      if (nuevoBov && n.totales !== bov.cabecera.totales) {
        const t2 = cambiarNumeroTras(nuevoBov.texto, 'Grageas Totales', n.totales);
        nuevoBov = t2 ? { texto: t2.texto, antes: t2.antes } : null;
      }
      pasos.push(nuevoBov
        ? { tipo: 'editar', post: bov.post, original: bbBov, nuevo: nuevoBov.texto, motivo: 'Canje aprobado', descripcion: 'primer mensaje de la bóveda' }
        : { tipo: 'editar', post: bov.post, original: bbBov, nuevo: bbBov, descripcion: 'primer mensaje de la bóveda', omitido: 'No encuentro «Grageas Actuales» en el primer mensaje de la bóveda: ponelo a mano (' + formato(n.actuales) + ').' });
      const mov = codigoConEnlaces(pet.boveda.html, pet.enlace, a.enlace, pet.boveda.divisor);
      if (!mov) throw new Error('No encuentro la línea «{Enlaces»» en el código de bóveda de PAM.');
      pasos.push({ tipo: 'publicar', tema: temaNumero(urlBov), texto: mov, descripcion: 'movimiento en la bóveda' });
      // Segunda opinión: la revisión de bóveda de Mi PJ sobre el movimiento.
      try {
        const probs = revisar(mov, { act: bov.grageas.actuales, tot: bov.grageas.totales, pla: bov.pl && bov.pl.actuales, plt: bov.pl && bov.pl.totales });
        if (probs && probs.length) avisos.push('La revisión de bóveda de Mi PJ ve: ' + probs.map(t => String(t).replace(/<[^>]+>/g, '')).join(' · '));
      } catch { /* sin revisor: no pasa nada */ }
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
      const desc = descuadres(fic.bbcode, pet.ficha.codigo);
      if (desc.length) avisos.push('El código de la ficha que generó PAM descuadra etiquetas respecto a tu ficha actual (' + desc.join(' · ') + '). Puede verse algo como «[/spoiler]» suelto: revisá la comparación y tocá «Modificar» si hay que arreglarlo.');
      if (pet.ficha.manual && pet.ficha.manual.length) avisos.push('PAM pide revisar a mano en la ficha: ' + pet.ficha.manual.join(' · ') + '. Tocá «Modificar» y corregilo antes de aceptar.');
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
    if (!pasos[1].omitido) {
      const movYa = await buscarMensajePropio(urlBov, bb => mismoTexto(bb, pasos[1].texto));
      if (movYa) {
        pasos[1].igual = 'El movimiento ya está publicado en tu bóveda.';
        pasos[1].postExistente = movYa.id;
        if (!pasos[3].omitido) {
          const enlaceMov = enlace(movYa.id);
          const avYa = await buscarMensajePropio(urlFicha, bb => bb.indexOf(enlaceMov) !== -1 || bb.indexOf('#' + movYa.id) !== -1);
          if (avYa) { pasos[3].igual = 'El aviso ya está publicado en tu ficha.'; pasos[3].postExistente = avYa.id; }
        }
      }
    }
    return {
      titulo: 'Aplicar el canje aprobado',
      explicacion: 'Aprobado por ' + a.autor + ' (' + a.fecha + '). Se edita la bóveda, se publica el movimiento, se edita la ficha y se publica el aviso, con los textos que preparó PAM. Solo se editan mensajes tuyos.',
      avisos,
      pasos
    };
  }

  /** Después de aplicarlo: la petición queda «aplicada» (con el mensaje del movimiento). */
  async function marcarAplicada(pet, movimiento) {
    await guardarDatosCuenta(d => {
      const x = (d.peticiones || []).find(y => y.post === pet.post);
      if (x) { x.aplicada = { fecha: ahoraISO(), movimiento: movimiento || null }; x.estado = 'aplicada'; }
    });
  }

  /** Deja a PAM lo que necesita para cerrar el canje («pam.aprobacion»). */
  async function dejarCierre(pet) {
    const x = ((await datosCuenta()).peticiones || []).find(y => y.post === pet.post) || pet;
    await agente.guardarDato(CLAVE_APROBACION, paqueteCierre(foroHost, cuenta, x));
  }

  return {
    clave: CLAVE_CUENTA, enlace, accionAplicarCanje, marcarAplicada, dejarCierre,
    leerCaptura, datosCuenta, publicar, accionPublicarPeticion, buscarPeticionPublicada, registrarPeticion,
    descartarCaptura, confirmar, actualizarAprobaciones, buscarAprobacion, leerGruposRevisores
  };
}
