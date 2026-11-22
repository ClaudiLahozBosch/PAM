// @ts-check
// 2.5.0 · «Terminar en PAM» después de «Aplicar a la bóveda» el sueldo en el foro: el foro deja en el almacén del agente
// («pam.sueldo», js/reglas/Sueldo.js) el sueldo aplicado y abre PAM. Aquí se abre sola la puerta de PAM: el sueldo se
// apunta en la Bóveda de PAM como un movimiento más («Ya lo publiqué», rrBoveda.cerrar), con los enlaces del pedido y
// de la aprobación. Así PAM sigue con los mismos números que el foro y el próximo canje no se encuentra otro saldo.
// No se toca si la Bóveda de PAM ya tiene ese movimiento (el enlace del pedido) o ya tiene las grageas de después.
// Si PAM tenía otro saldo antes del sueldo, no se adivina: se dice y se propone «Enviar a PAM» desde el foro.
// Como «Llevar a PAM» (LlevarCanjePam.js): todo por PamActual, nunca pulsando botones.
import { abrirPuerta, crearEl } from './ui/Puerta.js?v=2.5.0';
import { CLAVE_SUELDO } from '../reglas/Sueldo.js?v=2.5.0';
import { esMovimientoDe } from '../reglas/LlevarCanje.js?v=2.5.0';

const ahoraISO = () => new Date().toISOString();
const fmt = n => (typeof n === 'number' && !isNaN(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—');
const idPost = enlace => (String(enlace || '').match(/[?&]p=(\d+)/) || [])[1] || '';

/**
 * @param {{ agente: { leerDato(k: string): Promise<any>, guardarDato(k: string, v: any): Promise<any> },
 *   pam: ReturnType<typeof import('./PamActual.js').crearPamActual>, doc: Document }} dep
 */
export function crearSueldoPam({ agente, pam, doc }) {
  const el = crearEl(doc);
  let abierta = false;
  const leer = async k => { try { return await agente.leerDato(k); } catch (e) { return null; } };

  /** La puerta para un paquete («pam.sueldo»). */
  function accionSueldo(paq) {
    const n = paq.numeros || {}, mes = paq.mes ? paq.mes[0].toUpperCase() + paq.mes.slice(1) : '';
    const titulo = 'Bóveda de PAM · sumar el sueldo de ' + mes + ' (+' + fmt(paq.monto) + ' grageas)';
    const busca = pam.pjBoveda(paq.pj);
    /** @type {any} */ let paso;
    if (busca.omitido) paso = { tipo: 'pam', titulo, omitido: busca.omitido };
    else {
      const pj = busca.pj, bv = pam.bovedaDe(pj.id) || {}, act = Number(bv.act);
      const ya = (bv.log || []).find(m => esMovimientoDe(m, idPost(paq.enlacePet)));
      if (ya) paso = { tipo: 'pam', titulo, igual: 'Este sueldo ya está apuntado en la Bóveda de PAM (' + new Date(ya.at).toLocaleDateString('es-AR') + ').' };
      else if (act === n.actuales) paso = { tipo: 'pam', titulo, igual: 'La Bóveda de PAM ya tiene ' + fmt(n.actuales) + ' grageas, como el foro.' };
      else if (act !== n.iniciales) {
        paso = { tipo: 'pam', titulo, omitido: 'La Bóveda de PAM de «' + pj.nombre + '» dice ' + fmt(act) + ' grageas, y tu bóveda del foro tenía ' + fmt(n.iniciales) + ' antes del sueldo. No sé de dónde sale la diferencia, así que no lo sumo: en el foro tocá «Enviar a PAM» y PAM toma los números del foro.' };
      } else {
        paso = {
          tipo: 'pam', titulo,
          vista: el('div', { clase: 'p-vista' }, [
            el('div', { clase: 'p-nota', texto: 'Se apunta en la Bóveda de «' + pj.nombre + '» el movimiento que ya publicaste en el foro: ' + fmt(n.iniciales) + ' + ' + fmt(paq.monto) + ' = ' + fmt(n.actuales) + ' grageas (totales: ' + fmt(n.totales) + '), con los enlaces del pedido y de la aprobación.' })
          ]),
          ejecutar: () => {
            const r = pam.cerrarBoveda(pj.id, { delta: '+' + paq.monto, pet: paq.enlacePet, ace: paq.enlaceAce });
            if (!r) throw new Error('No encuentro el personaje «' + pj.nombre + '» en la Bóveda de PAM.');
            if (r.act !== n.actuales) return { estado: 'error', detalle: 'La Bóveda de PAM quedó en ' + fmt(r.act) + ' grageas y el foro en ' + fmt(n.actuales) + '.' };
            pam.verSeccion('boveda');
            return { estado: 'ok' };
          }
        };
      }
    }
    return {
      titulo: 'Terminar el sueldo en PAM',
      explicacion: 'El sueldo de ' + mes + ' de «' + paq.pj + '» ya está en tu bóveda del foro. Falta apuntarlo en la Bóveda de PAM, para que los dos tengan las mismas grageas.',
      pasos: [paso]
    };
  }

  /** Si el foro dejó un sueldo para terminar (y no se usó), se abre su puerta. */
  async function revisar() {
    if (abierta || doc.querySelector('.esc-ui.puerta-fondo')) return;
    const paq = await leer(CLAVE_SUELDO);
    if (!paq || paq.usado || !paq.cuenta || !(paq.monto > 0)) return;
    if (!pam.haySueldo()) return;
    abierta = true;
    try {
      const r = await abrirPuerta(doc, paq.cuenta.nombre || paq.pj, accionSueldo(paq));
      paq.usado = { fecha: ahoraISO(), resultado: r.resultado };
      await agente.guardarDato(CLAVE_SUELDO, paq).catch(() => {});
    } finally { abierta = false; }
  }

  return { revisar, accionSueldo };
}
