// @ts-check
// Pestaña «Mi PJ» del panel: ficha, stats de combate y bóveda de la cuenta conectada.
import { h, reemplazar, miles } from '../../core/dom.js';

const CLAVE_CACHE = 'pam.panel.mipj';
const CADUCA_MIN = 30;

export class PanelMiPj {
  /**
   * @param {HTMLElement} raiz
   * @param {{ cargar: () => Promise<any>, guardado?: Storage|null, ahora?: () => number }} dep
   */
  constructor(raiz, { cargar, guardado = null, ahora = () => Date.now() }) {
    this.raiz = raiz; this.cargar = cargar; this.guardado = guardado; this.ahora = ahora;
    this.datos = null; this.leyendo = false;
  }

  async iniciar() {
    const cache = this.#leerCache();
    if (cache) { this.datos = cache; this.pintar(); }
    const viejo = !cache || this.ahora() - new Date(cache.leido).getTime() > CADUCA_MIN * 60000;
    if (viejo) await this.actualizar(); else this.pintar();
  }

  async actualizar() {
    if (this.leyendo) return;
    this.leyendo = true; this.pintar();
    try { this.datos = await this.cargar(); this.#guardarCache(this.datos); }
    catch (e) { this.datos = { ...(this.datos ?? {}), errores: [String(e instanceof Error ? e.message : e)] }; }
    finally { this.leyendo = false; this.pintar(); }
  }

  pintar() {
    const d = this.datos;
    const barra = h('div', { class: 'barra' },
      h('span', { class: 'suave' }, this.leyendo ? 'Leyendo el foro…' : d?.leido ? 'Leído ' + hace(d.leido, this.ahora()) : ''),
      h('button', { type: 'button', onclick: () => this.actualizar(), disabled: this.leyendo }, 'Actualizar'));
    if (!d) return reemplazar(this.raiz, barra);
    if (d.estado === 'sinSesion') return reemplazar(this.raiz, barra, h('p', { class: 'aviso' }, 'Entra en el foro con tu cuenta para ver tu personaje.'));
    if (d.estado === 'foroDesconocido') return reemplazar(this.raiz, barra, h('p', { class: 'aviso' }, `PAM no conoce este foro (${d.foro}).`));
    const foro = d.foro ? 'https://' + d.foro : '';
    reemplazar(this.raiz, barra,
      d.cuenta ? h('p', { class: 'suave' }, 'Cuenta: ', h('b', null, d.cuenta.nombre)) : null,
      this.#tarjetaFicha(d, foro), this.#tarjetaBoveda(d, foro),
      (d.errores ?? []).length ? h('ul', { class: 'errores' }, d.errores.map(e => h('li', null, e))) : null);
  }

  #tarjetaFicha(d, foro) {
    const r = d.ficha;
    if (!r) return null;
    const f = r.ficha, c = d.stats?.combate, p = d.stats?.puntos;
    const at = f.atributos ?? {};
    const revisar = (f.desconocidos?.length ?? 0) + (f.trasfondos ?? []).filter(t => t.estadoLectura === 'revisar').length;
    return h('section', { class: 'tarjeta' },
      h('h2', null, h('a', { href: `${foro}/t${r.tema}-`, target: '_top' }, f.nombre || r.titulo || 'Tu ficha')),
      h('p', { class: 'suave' }, `${r.ficha.partes?.length ?? 1} mensaje${(r.ficha.partes?.length ?? 1) !== 1 ? 's' : ''} · ${r.resumen}`),
      h('div', { class: 'chips' }, Object.entries(at).map(([k, v]) => h('span', { class: 'chip', title: k }, `${k.slice(0, 3)} ${v}`))),
      c ? h('div', { class: 'stats' },
        stat('Iniciativa', c.ini), stat('Ataque físico', c.atkF), stat('Ataque mágico', c.atkM), stat('Defensa', c.def),
        stat('Lucha física', c.luchaF), stat('Lucha mágica', c.luchaM), stat('PAs', c.pa), stat('Umbral', c.umbral), stat('Heridas', c.heridas),
        p ? stat('Pt. pociones', p.pp) : null, p ? stat('Pt. rituales', p.pr) : null, stat('Destino', f.presentacion?.pd)) : null,
      revisar ? h('p', { class: 'aviso' }, `${revisar} línea${revisar !== 1 ? 's' : ''} de la ficha para revisar.`) : null);
  }

  #tarjetaBoveda(d, foro) {
    const b = d.boveda;
    if (!b) return null;
    return h('section', { class: 'tarjeta' },
      h('h2', null, h('a', { href: `${foro}${b.url}`, target: '_top' }, 'Bóveda')),
      h('div', { class: 'stats' }, stat('Grageas', miles(b.act)), stat('Totales', miles(b.tot)), b.pla != null ? stat('PL', miles(b.pla)) : null),
      b.movs?.length ? h('ul', { class: 'movs' }, b.movs.map(m => h('li', null, h('b', { class: m.d >= 0 ? 'mas' : 'menos' }, (m.d >= 0 ? '+' : '') + miles(m.d)), ' → ', miles(m.act), m.fecha ? h('span', { class: 'suave' }, ' · ' + m.fecha) : null))) : null,
      b.revision ? h('p', { class: 'suave' }, 'Revisada por ', b.revision.autor, b.revision.fecha ? ' · ' + b.revision.fecha : '') : null,
      b.nota ? h('p', { class: 'nota' }, h('b', null, b.nota.autor + ': '), b.nota.texto) : null);
  }

  #leerCache() { try { const t = this.guardado?.getItem(CLAVE_CACHE); return t ? JSON.parse(t) : null; } catch { return null; } }
  #guardarCache(d) { try { this.guardado?.setItem(CLAVE_CACHE, JSON.stringify(d)); } catch { /* sin espacio: no pasa nada */ } }
}

function stat(nombre, valor) { return h('div', { class: 'stat' }, h('span', null, nombre), h('b', null, valor ?? '—')); }

function hace(iso, ahora) {
  const min = Math.round((ahora - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  return horas < 48 ? `hace ${horas} h` : `hace ${Math.round(horas / 24)} días`;
}
