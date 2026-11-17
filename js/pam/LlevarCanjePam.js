// @ts-check
// «Llevar a PAM» desde el Registro de Canjes: el foro deja en el almacén del agente («pam.llevar») una petición
// aprobada ya leída (js/reglas/LlevarCanje.js) y abre PAM. Aquí se abre sola la puerta de PAM. Es el «Preparar el
// canje» de siempre (CanjesPam) para una petición que no se preparó en PAM (2.3.1: un solo camino):
//   1. Mi Ficha: se suma el canje a la ficha (la misma regla que «Traer de la calculadora»: solo sube y añade) y se
//      apunta qué cambió, para editar después la ficha del foro mensaje a mensaje.
//   2. Bóveda de PAM: se PREPARA el movimiento (grageas que se quitan y los dos enlaces), sin «Ya lo publiqué»: eso lo
//      hace «Terminar en PAM» cuando el movimiento ya está publicado en el foro.
// Y la petición queda registrada, con esos códigos y la aprobación, donde la ven la tarjeta «⚖ Canjes» y la barra
// del Registro («pam.cuentas.<foro>.<cuenta>»): las dos siguen con «Aplicar el canje» → «Terminar en PAM».
// Si la Bóveda de PAM ya tiene un movimiento con el enlace de esta petición, el canje ya se cerró: no se toca.
// Todo por PamActual (las funciones de las páginas), nunca pulsando botones.
import { abrirPuerta, crearEl } from './ui/Puerta.js?v=2.3.2';
import { cambiosDeCanje } from '../reglas/CambiosFicha.js?v=2.3.2';
import { claveCuenta } from '../reglas/Canjes.js?v=2.3.2';
import { CLAVE_LLEVAR, esMovimientoDe } from '../reglas/LlevarCanje.js?v=2.3.2';
import { numerosFormulario } from './CanjesPam.js?v=2.3.2';

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

  /** La puerta para un paquete («pam.llevar»). `res` se llena al ejecutar: qué cambió en la ficha y el movimiento. */
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
          el('div', { clase: 'p-nota', texto: 'Se suma a tu ficha de PAM lo que dice la petición, como «Traer de la calculadora»: los niveles solo suben y lo que ya tenés no se repite.' }),
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
          res.manual = r.manual;
          pam.verSeccion('ficha');
          return { estado: 'ok' };
        }
      });
    }
    // 2. Bóveda de PAM: el movimiento preparado (sin «Ya lo publiqué»)
    const titulo = 'Bóveda de PAM · preparar el movimiento (−' + fmt(paq.total) + ' grageas)';
    const busca = pam.pjBoveda(paq.pj);
    if (busca.omitido) pasos.push({ tipo: 'pam', titulo, omitido: busca.omitido });
    else if (!(paq.total > 0)) pasos.push({ tipo: 'pam', titulo, omitido: 'No encontré el total de la petición: preparalo a mano en la Bóveda.' });
    else {
      const pj = busca.pj, bv = pam.bovedaDe(pj.id) || {};
      const ya = (bv.log || []).find(m => esMovimientoDe(m, paq.post));
      if (ya) { res.cerrado = true; pasos.push({ tipo: 'pam', titulo, igual: 'Este canje ya está cerrado en la Bóveda de PAM (' + new Date(ya.at).toLocaleDateString('es-AR') + ').' }); }
      else {
        const v = { delta: '-' + paq.total, pet: paq.enlacePet, ace: paq.enlaceAce };
        // lo que había en esos campos es un movimiento anterior que no se cerró (como en «Preparar el canje»)
        const restos = [['delta', 'Grageas que se añaden/quitan'], ['pet', 'Enlace de la petición'], ['ace', 'Enlace de la aceptación']]
          .filter(([k]) => { const x = String(bv[k] == null ? '' : bv[k]).trim(); return x && x !== v[k]; }).map(([k, et]) => et + ': ' + bv[k]);
        const act = Number(bv.act);
        pasos.push({
          tipo: 'pam', titulo,
          vista: el('div', { clase: 'p-vista' }, [
            el('div', { clase: 'p-nota', texto: 'Se prepara en la Bóveda de «' + pj.nombre + '» el movimiento con los enlaces de la petición y de la aprobación' + (isNaN(act) ? '' : ' (' + fmt(act) + ' → ' + fmt(act - paq.total) + ' grageas)') + '. Todavía no se cierra: en el foro, «Aplicar en el foro» lo publica en tu bóveda y «Terminar en PAM» hace el «Ya lo publiqué».' }),
            restos.length ? el('div', { clase: 'aviso', texto: 'La Bóveda de PAM de «' + pj.nombre + '» tenía a medias un movimiento anterior (' + restos.join(' · ') + '): se reemplaza por este.' }) : null,
            !isNaN(act) && act - paq.total < 0 ? el('div', { clase: 'aviso', texto: 'Según PAM no te alcanzan las grageas: quedarías en ' + fmt(act - paq.total) + '.' }) : null
          ]),
          ejecutar: () => {
            const r = pam.prepararBoveda(pj.id, v);
            if (!r) throw new Error('No encuentro el personaje «' + pj.nombre + '» en la Bóveda de PAM.');
            const n = numerosFormulario(r.form);
            if (n.cambio !== -paq.total) return { estado: 'error', detalle: 'El código de PAM no quita ' + paq.total + ' grageas (dice ' + n.cambio + ').' };
            res.boveda = { html: r.html, form: r.form, numeros: n, divisor: r.divisor || '✦', pjBoveda: pj.nombre };
            return { estado: 'ok' };
          }
        });
      }
    }
    return {
      titulo: 'Llevar el canje a PAM',
      explicacion: 'Canje aprobado de «' + paq.pj + '» (' + fmt(paq.total) + ' grageas), leído del Registro de Canjes. Después, en el foro, «Aplicar en el foro» actualiza tu bóveda y tu ficha, y «Terminar en PAM» lo cierra acá.',
      pasos
    };
  }

  /**
   * La petición queda registrada donde la ven la tarjeta «⚖ Canjes» y la barra del Registro, con lo que preparó PAM y
   * la aprobación (quien toca «Llevar a PAM» la da por buena). Si ya estaba aplicada en el foro, no se toca.
   */
  async function registrar(paq, res) {
    const k = claveCuenta(paq.foro, paq.cuenta.id), d = (await leer(k)) || {};
    d.peticiones = d.peticiones || [];
    let x = d.peticiones.find(y => y.post === paq.post);
    if (!x) {
      x = { post: paq.post, enlace: paq.enlacePet, creado: ahoraISO(), fecha: '', pj: paq.pj, gastadas: paq.total, estado: 'aprobada', aprobacion: null, descartadas: [], desde: 'registro' };
      d.peticiones.push(x);
      if (d.peticiones.length > 20) d.peticiones = d.peticiones.slice(-20);
    }
    if (!x.aplicada && !x.enPAM) {
      x.aprobacion = { ...(paq.aprobacion || {}), confirmada: true };
      x.estado = 'aprobada';
      x.gastadas = paq.total;
      if (res.boveda) x.boveda = res.boveda;
      if (res.cambiosFicha) { x.cambiosFicha = res.cambiosFicha; delete x.ficha; } // la ficha, mensaje a mensaje (N07)
      if (res.manual && res.manual.length) x.manualFicha = res.manual;
    }
    if (res.cerrado) { x.enPAM = x.enPAM || ahoraISO(); x.cerrada = true; }
    x.llevada = ahoraISO();
    await agente.guardarDato(k, d);
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
      if (hecho) await registrar(paq, res);
      avisarAlForo(paq.foro, hecho);
    } finally { abierta = false; }
  }

  return { revisar, accionLlevar };
}
