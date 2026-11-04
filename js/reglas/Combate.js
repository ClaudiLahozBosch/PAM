// @ts-check
// Stats de combate y puntos de pociones/rituales (Sistema Avadense + Calculadora de Stats de Combate).
// Es `combate()` y `puntos()` del PAM antiguo sobre la Ficha nueva: mismos números y mismos textos
// (el editor los escribe en la ficha del foro).
import { norm, num } from '../core/texto.js?v=0.6.5';

const BONUS = [0, 1, 2, 4, 7, 9];
const LV_IDX = v => Math.min(4, num(v)); // 1 Novato … 4 Maestro (Herbivicus, etc.)

/**
 * ¿Tiene la ficha este arcano u objeto? Por el nombre escrito o por el del Compendio.
 * @param {import('../modelos/Ficha.js').Ficha} f @param {string} nombre
 * @param {import('../datos/Compendio.js').Compendio} [compendio]
 */
export function tieneArcano(f, nombre, compendio) {
  const n = norm(nombre);
  return f.arcanos.some(a => norm(a.nombre) === n || (compendio && a.ref && [compendio.porId(a.ref)?.nombre, compendio.porId(a.ref)?.nombreCalc].some(x => x && norm(x) === n)));
}

function mods(f, compendio) {
  const r = norm(f.datos.raza || '').replace(/[^a-z]/g, '');
  const t = n => tieneArcano(f, n, compendio);
  return {
    semiD: r.includes('semiduend'), semiG: r.includes('semigigant'),
    carstein: t('Anillo de los Carstein'), warlockObj: t('Armadura de Warlock'),
    maletin: t('Maletín del pocionista inquieto'), bisu: t('Bisutería Arcana'), herbiObj: t('Herbivicus'),
    herbicida: t('Poción herbicida'), vitae: t('Planta Vitae'), solucion: t('Solución del ritualista'), altar: t('Altar del ritualista')
  };
}

/**
 * @param {import('../modelos/Ficha.js').Ficha} f
 * @param {import('../datos/Sistema.js').Sistema} sistema
 * @param {{ warlock?: boolean|null, fuerza?: number, actividad?: boolean, lic?: boolean, compendio?: any }} [opt]
 */
export function combate(f, sistema, opt = {}) {
  const A = f.atributos, b = s => BONUS[num(f.habilidades[s])] || 0, M = mods(f, opt.compendio);
  const et = sistema.etapa(f.datos.etapa);
  const E = et ? { pa: et.pa, u: et.umbral, h: et.heridas, none: false } : { pa: 0, u: 0, h: 0, none: true };
  const warl = opt.warlock == null ? false : !!opt.warlock && M.warlockObj;
  const fz = num(opt.fuerza), act = opt.actividad ? 1 : 0, L4 = opt.lic ? 4 : 0;
  const P = num(A['Percepción']), V = num(A.Vigor) + fz, D = num(A.Destreza), W = num(A.Voluntad), Po = num(A.Poder);
  const vUmb = M.semiD ? Math.floor(V / 2) : V;
  const vPA = M.carstein ? 0 : vUmb * (M.semiG ? 3 : 1);
  const extra = (n, l) => n ? ` ${n > 0 ? '+' : '−'} ${Math.abs(n)} (${l})` : '';
  const ini = P + b('Iniciativa') + L4 - (warl ? 2 : 0) + act;
  const atkF = V + b('Pelea') + L4 + (M.semiG ? 2 : 0);
  const def = 5 + D + b('Esquivar') + L4 - (warl ? 2 : 0) + act;
  const atkM = Po + b('Duelo');
  const luchaFx = (atkF + def - 5 + ini) / 3, luchaMx = (atkM + def - 5 + ini) / 3;
  const pa = (E.pa + vPA + W) * (opt.lic ? 2 : 1), umbral = E.u + vUmb + L4, heridas = E.h + W + (opt.lic ? 2 : 0);
  const vigTxt = fz ? `Vigor (${num(A.Vigor)} + ${fz} poción)` : `Vigor (${num(A.Vigor)})`;
  const t = {
    ini: `Percepción (${P}) + Iniciativa (${b('Iniciativa')})` + extra(-(warl ? 2 : 0), 'Armadura de Warlock') + extra(act, 'Poción de actividad') + extra(L4, 'Licantropía'),
    atkF: `${vigTxt} + Pelea (${b('Pelea')})` + extra(M.semiG ? 2 : 0, 'Semigigante') + extra(L4, 'Licantropía'),
    luchaF: `(Ataque Físico (${atkF}) + Defensa (${def}) - 5 + Iniciativa (${ini})) / 3`,
    atkM: `Poder (${Po}) + Duelo (${b('Duelo')})`,
    luchaM: `(Ataque Mágico (${atkM}) + Defensa (${def}) - 5 + Iniciativa (${ini})) / 3`,
    def: `5 + Destreza (${D}) + Esquiva (${b('Esquivar')})` + extra(-(warl ? 2 : 0), 'Armadura de Warlock') + extra(act, 'Poción de actividad') + extra(L4, 'Licantropía'),
    pa: (opt.lic ? '(' : '') + (E.none ? 'Base (sin etapa) + ' : `Base (${E.pa}) + `) + (M.carstein ? `Vigor (0, Anillo de los Carstein)` : M.semiG ? `Vigor × 3 (${vPA}, Semigigante)` : M.semiD ? `Vigor ÷ 2 (${vPA}, Semiduende)` : vigTxt) + ` + Voluntad (${W})` + (opt.lic ? ') × 2 (Licantropía)' : ''),
    umbral: (E.none ? 'Base (sin etapa) + ' : `Base (${E.u}) + `) + (M.semiD ? `Vigor ÷ 2 (${vUmb}, Semiduende)` : vigTxt) + extra(L4, 'Licantropía'),
    heridas: (E.none ? 'Base (sin etapa)' : `Base (${E.h})`) + ` + Voluntad (${W})` + extra(opt.lic ? 2 : 0, 'Licantropía')
  };
  return { ini, atkF, def, atkM, luchaF: Math.round(luchaFx), luchaM: Math.round(luchaMx), luchaFx, luchaMx, pa, umbral, heridas, t, M, warl };
}

/**
 * @param {import('../modelos/Ficha.js').Ficha} f
 * @param {{ herbivicus?: boolean|null, compendio?: any }} [opt]
 */
export function puntos(f, opt = {}) {
  const M = mods(f, opt.compendio), sk = s => num(f.habilidades[s]);
  const P = num(f.atributos.Poder), bp = BONUS[sk('Pociones')] || 0, br = BONUS[sk('Rituales')] || 0;
  let pp = P + bp, ppTxt = [`Poder (${P})`, `Pociones (${bp})`];
  if (M.maletin) { pp *= 2; ppTxt = [`(${ppTxt.join(' + ')}) × 2 (Maletín del pocionista inquieto)`]; }
  const herb = LV_IDX(sk('Herbología')), rit = LV_IDX(sk('Rituales'));
  const herbiOn = M.herbiObj && (opt.herbivicus == null ? true : !!opt.herbivicus);
  if (herbiOn && herb) { pp += herb; ppTxt.push(`${herb} (Herbivicus)`); }
  if (M.herbicida && herb) { pp += herb; ppTxt.push(`${herb} (Poción Herbicida)`); }
  if (M.vitae && rit) { pp += rit; ppTxt.push(`${rit} (Planta Vitae)`); }
  let pr = P + br, prTxt = [`Poder (${P})`, `Rituales (${br})`];
  if (M.bisu) { pr = P + br * 2; prTxt = [`Poder (${P})`, `Rituales (${br}) × 2 (Bisutería Arcana)`]; }
  if (M.solucion && bp) { pr += bp; prTxt.push(`${bp} (Solución del ritualista)`); }
  const art = LV_IDX(f.artes.reduce((m, x) => Math.max(m, num(x.nivel)), 0));
  if (M.altar && art) { pr += art; prTxt.push(`${art} (Altar del ritualista)`); }
  return { pp, ppTxt: ppTxt.join(' + '), pr, prTxt: prTxt.join(' + ') };
}
