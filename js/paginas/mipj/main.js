// @ts-check
// «Configurar Mi PJ»: qué hace Mi PJ en el foro. Las opciones y lo que no se puede apagar están en
// js/reglas/ConfigMiPj.js; esta página solo las enseña, guarda con el almacén (`grimorio.mipj.config`, viaja con la
// Sesión con código) y avisa con el evento `pam:mipj` para que js/pam/ConfigMiPjAlForo.js pase la copia al agente.
// Recibe la ventana, como las demás páginas: así las pruebas la montan en jsdom.
import { Almacen } from '../../core/Almacen.js?v=2.2.0';
import { OPCIONES, LECTURA, SIEMPRE, configPorDefecto, normalizarConfig } from '../../reglas/ConfigMiPj.js?v=2.2.0';

const CLAVE = 'grimorio.mipj.config';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const GRUPOS = [
  { g: 'foro', titulo: 'En las páginas del foro', sub: 'Lo que Mi PJ pinta dentro de los temas y del editor.', aplica: 'Los botones del editor cambian al momento; el cartel del oficial, al recargar el tema.' },
  { g: 'panel', titulo: 'Tarjetas del panel', sub: 'Qué se ve al abrir el panel Mi PJ.', aplica: 'Se ve al abrir el panel (o al recargar la página del foro).' },
  { g: 'pastilla', titulo: 'La pastilla', sub: 'Lo que se ve con el panel cerrado, abajo a la derecha.', aplica: '' }
];

/** @param {Window} w la ventana de PAM */
export async function montar(w) {
  const doc = w.document, almacen = Almacen.de(w);
  const host = doc.getElementById('mipj-host');
  if (!host) return;
  let cfg = normalizarConfig(almacen.leer(CLAVE, null));
  let guardadoT = null;

  const sw = (g, id, on, extra = '') => `<span class="cm-sw"><input type="checkbox" role="switch" data-g="${g}" data-id="${esc(id)}"${on ? ' checked' : ''}${extra}><span class="cm-pista" aria-hidden="true"></span></span>`;
  const fila = (g, o) => `<label class="cm-op"><span class="cm-gl" aria-hidden="true">${o.glifo}</span><span class="cm-tx"><b>${esc(o.titulo)}</b><small>${esc(o.desc)}</small></span>${sw(g, o.id, cfg[g][o.id])}</label>`;

  function pastilla() {
    const P = cfg.pastilla;
    return `<div class="cm-pill" aria-label="Así se ve la pastilla"><span class="cm-pb"><i>✦</i>Mi PJ</span>${P.grageas ? '<b>1.240</b>' : ''}${P.roles ? '<span class="cm-n">3</span>' : ''}${P.misiones ? '<span class="cm-ms">⚔1</span>' : ''}${P.sueldo ? '<span class="cm-sd">⚜</span>' : ''}${P.ficha ? '<span class="cm-dot"></span>' : ''}</div>`;
  }

  function grupo(G) {
    const L = OPCIONES[G.g], n = L.filter(o => cfg[G.g][o.id]).length;
    const pausado = G.g === 'foro' && cfg.pausa;
    return `<section class="cm-card cm-grupo${pausado ? ' cm-pausado' : ''}" data-grupo="${G.g}">
      <header class="cm-gh"><div><h2>${esc(G.titulo)}</h2><p>${esc(G.sub)}</p></div>
        <span class="cm-cuenta">${n} de ${L.length}</span>
        <span class="cm-todo"><button type="button" data-todo="${G.g}" data-v="1">Todo</button><button type="button" data-todo="${G.g}" data-v="0">Nada</button></span></header>
      ${G.g === 'pastilla' ? `<div class="cm-vista">${pastilla()}<small>Vista previa con datos de ejemplo</small></div>` : ''}
      ${pausado ? '<div class="cm-nota-pausa">☾ En pausa: no se pinta nada dentro del foro. Lo que elijas acá se guarda para cuando lo vuelvas a activar.</div>' : ''}
      <div class="cm-ops">${L.map(o => fila(G.g, o)).join('')}</div>
      ${G.aplica ? `<p class="cm-aplica">${esc(G.aplica)}</p>` : ''}
    </section>`;
  }

  function estadoHtml() {
    const E = /** @type {any} */ (w).pamMiPjEstado;
    if (!E) return '<span class="cm-chip cm-buscando"><i></i>Buscando Mi PJ en este navegador…</span>';
    if (E.estado === 'sin') return `<span class="cm-chip cm-sin"><i></i>No encuentro Mi PJ en este navegador</span><span class="cm-chip-txt">Igual se guarda: Mi PJ lo toma la próxima vez que abras PAM con el script instalado. <a href="pam-mi-pj.user.js">Instalar Mi PJ</a></span>`;
    if (E.estado === 'error') return `<span class="cm-chip cm-sin"><i></i>No pude pasarle la configuración a Mi PJ</span><span class="cm-chip-txt">${esc(E.detalle || '')} Probá recargar PAM.</span>`;
    return `<span class="cm-chip cm-ok"><i></i>Mi PJ conectado${E.agente ? ' · ' + esc(E.agente) : ''}</span><span class="cm-chip-txt">Los cambios le llegan solos al foro.</span>`;
  }

  function pintar() {
    host.innerHTML = `<div class="cm">
      <div class="cm-estado" id="cmEstado">${estadoHtml()}</div>
      <section class="cm-card cm-pausa${cfg.pausa ? ' on' : ''}">
        <span class="cm-pausa-gl" aria-hidden="true">${cfg.pausa ? '☾' : '✦'}</span>
        <label class="cm-pausa-tx" for="cmPausa"><b>Desactivar todas las superposiciones en el foro</b>
          <small>${cfg.pausa ? 'Mi PJ está en pausa dentro de las páginas del foro: ni carteles, ni revisiones, ni botones en el editor. La pastilla y el panel siguen.' : 'Apaga de una vez todo lo que Mi PJ pinta dentro de los temas y del editor, sin perder lo que elegiste abajo.'}</small></label>
        ${sw('pausa', 'pausa', cfg.pausa, ' id="cmPausa"')}
      </section>
      <div class="cm-cols">
        <div class="cm-col">${grupo(GRUPOS[0])}${grupo(GRUPOS[2])}</div>
        <div class="cm-col">${grupo(GRUPOS[1])}
          <section class="cm-card cm-grupo" data-grupo="lectura">
            <header class="cm-gh"><div><h2>Lectura del foro</h2><p>Cuándo Mi PJ vuelve a leer tu ficha, tu bóveda y tus roles.</p></div></header>
            <div class="cm-ops">
              <label class="cm-op"><span class="cm-gl" aria-hidden="true">⌛</span><span class="cm-tx"><b>Al abrir una página del foro</b><small>Si lo último que leyó es más viejo que esto, lee de nuevo.</small></span>
                <select class="cm-sel" id="cmCada">${LECTURA.map(x => `<option value="${x.min}"${x.min === cfg.lectura.cada ? ' selected' : ''}>${esc(x.texto)}</option>`).join('')}</select></label>
              <label class="cm-op"><span class="cm-gl" aria-hidden="true">⛁</span><span class="cm-tx"><b>Releer al escribir en tu bóveda</b><small>Para comparar con lo último antes de publicar un movimiento.</small></span>${sw('lectura', 'boveda', cfg.lectura.boveda)}</label>
            </div>
          </section>
        </div>
      </div>
      <section class="cm-card cm-siempre">
        <header class="cm-gh"><div><h2>Siempre activo</h2><p>Esto no se puede apagar: son las protecciones de Mi PJ o la forma de volver a encender lo demás.</p></div></header>
        <div class="cm-sgrid">${SIEMPRE.map(s => `<div class="cm-s"><span class="cm-gl" aria-hidden="true">${s.glifo}</span><span class="cm-tx"><b>${esc(s.titulo)} <span class="cm-candado" title="Siempre activo">🔒</span></b><small>${esc(s.desc)}</small></span></div>`).join('')}</div>
      </section>
      <footer class="cm-pie"><span class="cm-guardado" id="cmGuardado" aria-live="polite"></span>
        <button type="button" class="btn ghost small" id="cmRestablecer">Restablecer como venía</button></footer>
    </div>`;
  }

  function guardar(mensaje = '✓ Guardado') {
    almacen.guardar(CLAVE, cfg);
    doc.dispatchEvent(new w.CustomEvent('pam:mipj'));
    pintar();
    const g = doc.getElementById('cmGuardado');
    if (g) { g.textContent = mensaje; g.classList.add('on'); }
    if (guardadoT) w.clearTimeout(guardadoT);
    guardadoT = w.setTimeout(() => { const x = doc.getElementById('cmGuardado'); if (x) x.classList.remove('on'); }, 1800);
  }

  host.addEventListener('change', e => {
    const t = /** @type {HTMLInputElement} */ (e.target);
    if (t.id === 'cmCada') { cfg.lectura.cada = parseInt(t.value, 10) || 0; guardar(); return; }
    const g = t.dataset && t.dataset.g, id = t.dataset && t.dataset.id;
    if (!g || !id) return;
    if (g === 'pausa') cfg.pausa = t.checked;
    else if (g === 'lectura') cfg.lectura.boveda = t.checked;
    else cfg[g][id] = t.checked;
    // el foco vuelve al mismo interruptor después de repintar (teclado)
    guardar();
    const igual = host.querySelector(`input[data-g="${g}"][data-id="${id}"]`);
    if (igual) /** @type {HTMLElement} */ (igual).focus();
  });
  host.addEventListener('click', e => {
    const b = /** @type {HTMLElement} */ (e.target).closest('button');
    if (!b) return;
    if (b.dataset.todo) { const g = b.dataset.todo, v = b.dataset.v === '1'; for (const o of OPCIONES[g]) cfg[g][o.id] = v; guardar(); }
    else if (b.id === 'cmRestablecer') { cfg = configPorDefecto(); guardar('✓ Todo como venía'); }
  });

  const repintarEstado = () => { const e = doc.getElementById('cmEstado'); if (e) e.innerHTML = estadoHtml(); };
  doc.addEventListener('pam:mipj-estado', repintarEstado);
  // js/pam/main.js pregunta al agente a los 0, 1,5 y 4 s: si a los 7 s nadie contestó, no hay script
  w.setTimeout(() => { if (!(/** @type {any} */ (w).pamMiPjEstado)) { /** @type {any} */ (w).pamMiPjEstado = { estado: 'sin' }; repintarEstado(); } }, 7000);
  pintar();
}
