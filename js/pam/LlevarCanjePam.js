// @ts-check
// 2.3.0 · «Llevar a PAM» desde el Registro de Canjes: el foro deja en el almacén del agente («pam.llevar») una
// petición aprobada ya leída (js/reglas/LlevarCanje.js) y abre PAM. Aquí se abre sola la puerta de PAM con dos pasos:
//   1. Mi Ficha: se suma el canje a la ficha del personaje (solo sube y añade; llevarlo dos veces da lo mismo) y se
//      apunta qué cambió, para que «Aplicar cambio a la ficha» edite después la ficha del foro mensaje a mensaje.
//   2. Bóveda de PAM: se descuentan las grageas con los enlaces de la petición y de la aprobación, y «Ya lo publiqué».
//      Si ya hay un movimiento con el enlace de esta petición (p. ej. de «Terminar en PAM»), no se descuenta otra vez.
// Todo por PamActual (las funciones de las páginas), nunca pulsando botones.
import { abrirPuerta, crearEl } from './ui/Puerta.js?v=2.3.1';
import { cambiosDeCanje } from '../reglas/CambiosFicha.js?v=2.3.1';
import { claveCuenta } from '../reglas/Canjes.js?v=2.3.1';
import { CLAVE_LLEVAR, claveLlevados, esMovimientoDe } from '../reglas/LlevarCanje.js?v=2.3.1';

const ahoraISO = () => new Date().toISOString();
const fmt = n => (typeof n === 'number' && !isNaN(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—');

/**
 * @param {{ agente: { leerDato(k: string): Promise<any>, guardarDato(k: string, v: any): Promise<any> },
 *   pam: ReturnType<typeof import('./PamActual.js').crearPamActual>, doc: Document }} dep
 */
export function crearLlevarCanjePam({ agente, pam, doc }) {
  const el = crearEl(doc);
  const win = /** @type {any} */ (doc.defaultView);
  let abierta = false;
  const leer = async k => { try { return await agente.leerDato(k); } catch (e) { return null; } };

  /** La puerta para un paquete («pam.llevar»). `res` se llena al ejecutar: lo que cambió en la ficha. */
  function accionLlevar(paq, res) {
    const pasos = [];
    // 1. Mi Ficha
    if (!pam.buscarPj(paq.pj)) {
      pasos.push({ tipo: 'pam', titulo: 'Mi Ficha · sumar el canje', omitido: 'En «Mi Ficha» de PAM no hay ningún personaje llamado «' + paq.pj + '». Crealo (o importá su ficha desde el foro con «Enviar a PAM») y volvé a tocar «Llevar a PAM».' });
    } else {
      const lista = el('ul', { clase: 'p-lista' }, (paq.cambios || []).map(c => el('li', { texto: c.texto })));
      pasos.push({
        tipo: 'pam', titulo: 'Mi Ficha · sumar el canje a «' + paq.pj + '»',
        vista: el('div', { clase: 'p-vista' }, [
          el('div', { clase: 'p-nota', texto: 'Se suma a tu ficha de PAM lo que dice la petición. Los niveles solo suben: lo que ya tenés igual o más alto no se toca.' }),
          lista,
          paq.aMano && paq.aMano.length ? el('div', { clase: 'aviso', texto: 'Esto no lo entendí: agregalo a mano en «Mi Ficha» → ' + paq.aMano.join(' · ') }) : null
        ]),
        ejecutar: () => {
          if (!pam.activarPj(paq.pj)) throw new Error('No encuentro a «' + paq.pj + '» en «Mi Ficha».');
          const antes = pam.fichaEnMemoria();
          const r = pam.aplicarCanjeFicha(paq.cambios || []);
          const despues = pam.fichaEnMemoria();
          if (!antes || !despues) throw new Error('No encuentro la ficha activa de PAM.');
          res.cambiosFicha = cambiosDeCanje(antes, despues);
          res.hechos = r.hechos; res.manual = r.manual;
          pam.verSeccion('ficha');
          return { estado: 'ok' };
        }
      });
    }
    // 2. Bóveda de PAM
    const titulo = 'Bóveda de PAM · descontar ' + fmt(paq.total) + ' grageas';
    const busca = pam.pjBoveda(paq.pj);
    if (busca.omitido) pasos.push({ tipo: 'pam', titulo, omitido: busca.omitido });
    else if (!(paq.total > 0)) pasos.push({ tipo: 'pam', titulo, omitido: 'No encontré el total de la petición: descontalo a mano en la Bóveda.' });
    else {
      const pj = busca.pj, bv = pam.bovedaDe(pj.id) || {};
      const ya = (bv.log || []).find(m => esMovimientoDe(m, paq.post));
      if (ya) pasos.push({ tipo: 'pam', titulo, igual: 'La Bóveda de PAM ya tiene el movimiento de esta petición (' + new Date(ya.at).toLocaleDateString('es-AR') + ').' });
      else {
        const act = Number(bv.act), queda = act - paq.total;
        pasos.push({
          tipo: 'pam', titulo,
          vista: el('div', { clase: 'p-vista' }, [
            el('div', { clase: 'p-nota', texto: 'Se pone el movimiento en la Bóveda de «' + pj.nombre + '» con los enlaces de la petición y de la aprobación, y se pulsa «Ya lo publiqué».' + (isNaN(act) ? '' : ' Grageas actuales: ' + fmt(act) + ' → ' + fmt(queda) + '.') }),
            !isNaN(queda) && queda < 0 ? el('div', { clase: 'aviso', texto: 'Según PAM no te alcanzan las grageas: quedarías en ' + fmt(queda) + '.' }) : null
          ]),
          ejecutar: () => {
            const p = pam.prepararBoveda(pj.id, { delta: '-' + paq.total, pet: paq.enlacePet, ace: paq.enlaceAce });
            if (!p) throw new Error('No encuentro el personaje «' + pj.nombre + '» en la Bóveda de PAM.');
            const c = pam.cerrarBoveda(pj.id, {});
            if (!c) throw new Error('No encuentro el personaje «' + pj.nombre + '» en la Bóveda de PAM.');
            return { estado: 'ok' };
          }
        });
      }
    }
    return {
      titulo: 'Llevar el canje a PAM',
      explicacion: 'Canje aprobado de «' + paq.pj + '» (' + fmt(paq.total) + ' grageas), leído del Registro de Canjes. Después, en el foro, «Aplicar cambio a la ficha» edita tu ficha con lo que cambió acá.',
      pasos
    };
  }

  /** Lo que queda apuntado para el foro: qué cambió en la ficha («Aplicar cambio a la ficha» lo usa). */
  async function apuntar(paq, res) {
    const k = claveLlevados(paq.foro, paq.cuenta.id), d = (await leer(k)) || {};
    d.posts = d.posts || {};
    const prev = d.posts[paq.post] || {};
    d.posts[paq.post] = { ...prev, fecha: ahoraISO(), pj: paq.pj, total: paq.total, cambiosFicha: res.cambiosFicha || prev.cambiosFicha || null, manual: res.manual || [] };
    const ids = Object.keys(d.posts).sort((a, b) => +a - +b);
    while (ids.length > 20) delete d.posts[/** @type {string} */ (ids.shift())];
    await agente.guardarDato(k, d);
    // si la petición la había publicado Mi PJ, queda cerrada en PAM (la tarjeta del panel deja de enseñarla)
    const kc = claveCuenta(paq.foro, paq.cuenta.id), dc = await leer(kc);
    const x = dc && (dc.peticiones || []).find(y => y.post === paq.post);
    if (x) { x.enPAM = ahoraISO(); x.cerrada = true; await agente.guardarDato(kc, dc).catch(() => {}); }
  }

  function avisarAlForo(foro, hecho) { try { if (win.opener && foro) win.opener.postMessage({ escribaCierre: 1, hecho }, 'https://' + foro); } catch (e) { /* sin pestaña del foro */ } }

  /** Si el foro dejó un canje para llevar (y no se usó), se abre su puerta. */
  async function revisar() {
    if (abierta || doc.querySelector('.esc-ui.puerta-fondo')) return;
    const paq = await leer(CLAVE_LLEVAR);
    if (!paq || paq.usado || !paq.post || !paq.cuenta) return;
    if (!pam.hayLlevar()) return;
    abierta = true;
    try {
      const res = {};
      const r = await abrirPuerta(doc, paq.cuenta.nombre || paq.pj, accionLlevar(paq, res));
      paq.usado = { fecha: ahoraISO(), resultado: r.resultado };
      await agente.guardarDato(CLAVE_LLEVAR, paq).catch(() => {});
      const hecho = r.resultado === 'aceptada' || r.resultado === 'igual' || r.resultado === 'parcial';
      if (hecho) await apuntar(paq, res);
      avisarAlForo(paq.foro, hecho);
    } finally { abierta = false; }
  }

  return { revisar, accionLlevar };
}
