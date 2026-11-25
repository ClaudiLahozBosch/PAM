// @ts-check
// 2.4.0 · La veteranía del personaje, leída del foro a través del agente (las reglas, en js/reglas/Veterania.js):
//   · la fecha de activación: el perfil de tu primer mensaje de la ficha («Fecha de Activación», o si no está, la de
//     inscripción);
//   · las veteranías cobradas: el Registro de Veteranía (data/foros.json → veterania.registro) y, si con tu sesión se
//     puede abrir, el registro anterior (veterania.anterior).
// El registro se cuenta entero una vez y queda en la memoria del panel («mipj.vet.<tema>»); después solo se leen las
// páginas nuevas (lo ya contado se salta por el número de mensaje). El anterior está cerrado: se lee una sola vez.
import { leerPaginaTema } from '../lectores/LectorTema.js?v=2.5.1';
import { contarVeteranias, cobrosDe, fechaDMA, resumenVeterania, cuentasVacias } from '../reglas/Veterania.js?v=2.5.1';

const POR_PAGINA = 15;
const DIA = 864e5;

/** Los mensajes de una página, con el texto sin las citas (quien cita una aprobación no es otra aprobación). */
function mensajes(doc) {
  doc.querySelectorAll('.content blockquote, .content .quote, .content cite').forEach(e => e.remove());
  return leerPaginaTema(doc);
}
/** ¿Pidió iniciar sesión? (el tema no se puede ver con esta cuenta) */
const sinAcceso = doc => !doc.querySelector('div.post[id^="p"]') && /iniciar sesi[oó]n|conectarse|contrase[ñn]a/i.test(doc.body?.textContent ?? '');

/**
 * La fecha de activación del personaje: un campo del perfil que el foro enseña junto a cada mensaje.
 * @param {Document} doc la primera página de la ficha
 * @returns {{ fecha: string, campo: string } | null}
 */
export function activacionDelPerfil(doc) {
  const post = doc.querySelector('div.post[id^="p"]');
  if (!post) return null;
  const campos = [...post.querySelectorAll('.profileField')].map(s => {
    const lab = s.querySelector('.label');
    return { label: (lab?.textContent ?? '').replace(/[\s:]+$/, '').trim(), valor: (s.textContent ?? '').replace(lab?.textContent ?? '', '').trim() };
  });
  for (const re of [/activaci[oó]n/i, /inscripci[oó]n/i]) {
    const c = campos.find(x => re.test(x.label) && /\d{1,2}\/\d{1,2}\/\d{4}/.test(x.valor));
    if (c) return { fecha: (c.valor.match(/\d{1,2}\/\d{1,2}\/\d{4}/) || [''])[0], campo: c.label };
  }
  return null;
}

/**
 * @param {{ leer(ruta: string): Promise<Document> }} agente
 * @param {{ cfg: { registro: string, anterior?: string } | null, memoria: { gv(k: string, d: any): any, sv(k: string, v: any): void },
 *   ahora?: () => number }} op
 */
export function crearVeteraniaDelForo(agente, { cfg, memoria, ahora = () => Date.now() }) {
  const tema = r => Number(String(r || '').match(/\/t(\d+)/)?.[1]) || null;

  /** Cuenta un registro: desde la última página contada hasta la última que hay. */
  async function contarRegistro(ruta, cerrado) {
    const t = tema(ruta);
    const clave = 'mipj.vet.' + t;
    const guardado = memoria.gv(clave, null);
    // lo contado con otra versión de las reglas se vuelve a contar desde el principio
    const previo = guardado && guardado.cuentas && guardado.cuentas.v !== cuentasVacias().v ? null : guardado;
    if (cerrado && previo && previo.completo) return previo;
    if (cerrado && previo && previo.sinAcceso && ahora() - previo.cuando < DIA) return previo; // se reintenta una vez al día
    const d1 = await agente.leer(ruta);
    if (sinAcceso(d1)) { const r = { sinAcceso: true, cuando: ahora() }; memoria.sv(clave, r); return r; }
    const p1 = mensajes(d1);
    const offs = p1.paginas.map(h => parseInt((h.match(/\/t\d+p(\d+)-/) || [])[1], 10)).filter(n => !isNaN(n));
    const max = offs.length ? Math.max(...offs) : 0;
    let c = previo && previo.cuentas ? previo.cuentas : cuentasVacias();
    const desde = previo && previo.cuentas ? Math.max(0, Math.min(previo.hasta ?? 0, max)) : 0;
    const rutas = [];
    for (let off = desde; off <= max; off += POR_PAGINA) rutas.push(off);
    // de cuatro en cuatro (la primera vez son unas cincuenta páginas), y en orden al contarlas
    for (let i = 0; i < rutas.length; i += 4) {
      const docs = await Promise.all(rutas.slice(i, i + 4).map(off => (off === 0 ? Promise.resolve(d1) : agente.leer('/t' + t + 'p' + off + '-'))));
      for (const doc of docs) c = contarVeteranias(c, (doc === d1 ? p1 : mensajes(doc)).posts);
    }
    const r = { cuentas: c, hasta: max, completo: !!cerrado, cuando: ahora() };
    memoria.sv(clave, r);
    return r;
  }

  /**
   * @param {{ pj: string, rutaFicha: string | null, boveda?: { propios?: { enl: string }[] } | null, hoy?: Date }} d
   */
  async function leer({ pj, rutaFicha, boveda = null, hoy = new Date(ahora()) }) {
    if (!cfg || !cfg.registro) return null;
    const errores = [];
    const [act, actual, anterior] = await Promise.all([
      rutaFicha ? agente.leer(rutaFicha).then(activacionDelPerfil, e => { errores.push('Ficha: ' + (e?.message || e)); return null; }) : null,
      contarRegistro(cfg.registro, false).catch(e => { errores.push('Registro de Veteranía: ' + (e?.message || e)); return null; }),
      cfg.anterior ? contarRegistro(cfg.anterior, true).catch(() => null) : null
    ]);
    if (!actual || actual.sinAcceso) return null; // sin el registro no hay nada que contar (mejor nada que números a medias)
    const cobros = [...cobrosDe(anterior && anterior.cuentas, pj), ...cobrosDe(actual.cuentas, pj)];
    const cobradas = cobros.reduce((s, x) => s + (x.cantidad || 1), 0);
    const activacion = act ? fechaDMA(act.fecha) : null;
    const resumen = resumenVeterania({ activacion, cobradas, hoy });
    const ultima = cobros[cobros.length - 1] || null;
    // ¿está la última aprobación en la bóveda? (sus enlaces apuntan al mensaje de la aprobación)
    const enBoveda = ultima && boveda && Array.isArray(boveda.propios)
      ? boveda.propios.some(p => new RegExp('(^|\\D)' + ultima.post + '(\\D|$)').test(p.enl || '')) : null;
    return {
      v: 1, leido: new Date(ahora()).toISOString(),
      activacion: act ? act.fecha : null, campo: act ? act.campo : null,
      ...(resumen ? { anios: resumen.anios, corresponden: resumen.corresponden, faltan: resumen.faltan, proxima: resumen.proxima ? resumen.proxima.toISOString() : null, dias: resumen.dias } : {}),
      cobradas, cobros: cobros.map(x => ({ post: x.post, fecha: x.fecha, cantidad: x.cantidad, aprobo: x.aprobo })),
      ultima: ultima ? { post: ultima.post, fecha: ultima.fecha, aprobo: ultima.aprobo, enBoveda } : null,
      // el registro anterior no se pudo abrir: lo que se cobró ahí no se cuenta
      sinAnterior: !!(cfg.anterior && (!anterior || anterior.sinAcceso)),
      registro: cfg.registro, errores
    };
  }

  return { leer, contarRegistro };
}
