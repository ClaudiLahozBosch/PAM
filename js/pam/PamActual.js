// @ts-check
// Adaptador de las páginas de PAM. Es el ÚNICO archivo de lo que llega del foro (js/pam/) que conoce lo que ofrecen
// las páginas (window.rrOficiales, window.pamFicha, window.rrBoveda, window.pamCanjes, window.showSection…) y lo que
// guardan en el navegador (solo lo lee). El controlador habla con PAM solo a través de esto. Nunca pulsa botones ni
// escribe en campos de PAM: usa sus funciones.
// Fase 8 (8b–8e): las páginas ya son módulos (js/paginas/), con las mismas funciones en window, así que este archivo
// no cambió. El «Texto para copiar» de la Tabla de Canjes (tablaCanjes) siempre está al día: desde F16 la Tabla lo
// pinta con cada cambio aunque no esté a la vista (prueba en tests/caracterizacion/tabla.test.mjs).

const normNombre = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * @param {any} w la ventana de PAM (en las pruebas, una de mentira)
 */
export function crearPamActual(w) {
  const leerJSON = clave => { try { const v = w.localStorage.getItem(clave); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  /* lo que PAM tiene guardado (solo lectura): las fichas de «Mi Ficha» y el Registro de Roles (con la Bóveda) */
  const fichas = () => { const g = leerJSON('grimorio.personajes'); return g && Array.isArray(g.lista) ? g : null; };
  const activa = () => { const g = fichas(); return g ? (g.lista.find(x => x.id === g.activa) || null) : null; };
  const registro = () => { const r = leerJSON('registro-roles-v1'); return r && Array.isArray(r.personajes) ? r : null; };

  return {
    /* ---------- Posibles oficiales ---------- */
    /** ¿Está la lista de «Posibles oficiales»? (la Bóveda de PAM la define al cargar) */
    hayOficiales: () => !!(w.rrOficiales && w.rrOficiales.previa && w.rrOficiales.aplicar),
    /** Qué cambiaría al sumar estos oficiales: { nuevos: [{nombre, relacion, fav}], cambios: [{nombre, estado, antes, fav}] } */
    previaOficiales: (items, estados) => w.rrOficiales.previa(items, estados),
    /** Los suma a «Posibles oficiales»: { nuevos: n, cambios: n } */
    aplicarOficiales: (items, estados) => w.rrOficiales.aplicar(items, estados),

    /* ---------- canjes ---------- */
    /** ¿Tiene este PAM lo que usan los canjes? (las funciones de pamFicha y rrBoveda de la rama refactor) */
    hayCanjes: () => !!(w.pamFicha && w.pamFicha.traerCalculadora && w.pamFicha.codigoPersonal && w.rrBoveda && w.rrBoveda.preparar && w.rrBoveda.cerrar),
    /** Lo que enseña la Tabla de Canjes ahora: el «Texto para copiar» y las grageas (tal como se ven). */
    tablaCanjes: () => {
      const d = w.document, txt = id => { const e = d.getElementById(id); return e ? e.textContent.trim() : ''; };
      const box = d.querySelector('#panel-resumen .summary-box'), inp = d.getElementById('inpDisponibles');
      return { texto: box ? box.textContent.trim() : null, disponibles: inp ? String(inp.value) : '', gastadas: txt('valGastadas'), restantes: txt('valRestantes') };
    },
    /** La ficha activa de «Mi Ficha» (lo guardado): { id, ficha } o null. */
    fichaActiva: () => activa(),
    /** La ficha activa tal como la tiene PAM ahora mismo (una copia, en el formato antiguo), o null. */
    fichaEnMemoria: () => { try { const f = w.grimorioFicha && w.grimorioFicha(); return f ? JSON.parse(JSON.stringify(f)) : null; } catch (e) { return null; } },
    /** «Traer de la calculadora»: los canjes del carrito pasan a la ficha de PAM. */
    traerCalculadora: () => w.pamFicha.traerCalculadora(),
    /** «Llevar a la calculadora»: la ficha de PAM pasa a ser el nivel actual de la Tabla de Canjes. */
    llevarCalculadora: () => w.pamFicha.llevarCalculadora(),
    /** El código del foro de la ficha activa en modo «Personalizada»: { codigo, base, hechos, manual } o null. */
    codigoPersonal: () => w.pamFicha.codigoPersonal(),
    /**
     * El personaje de la Bóveda de PAM con ese nombre: { pj, aproximado } o { omitido: texto } (como Mi PJ 1.7.1).
     * @param {string} nombrePj
     */
    pjBoveda(nombrePj) {
      const R = registro();
      const comoEmpezar = ' En PAM: ☰ → «Mi Ficha», creá el personaje «' + nombrePj + '» (su bóveda se crea sola) y volvé a enviar los datos desde el foro.';
      if (R && R.ejemplo) return { omitido: 'La Bóveda de PAM todavía muestra los datos de ejemplo, y Mi PJ no escribe en ellos.' + comoEmpezar };
      const objetivo = normNombre(nombrePj);
      // primero por «Mi Ficha» (cada personaje tiene su bóveda): con las funciones de PAM, siempre al día
      try {
        const f = w.pamFicha.buscar(nombrePj), b = f && w.rrBoveda.get(f.id);
        if (b) return { pj: { id: f.id, nombre: b.nombre, boveda: b }, aproximado: normNombre(b.nombre) !== objetivo };
      } catch (e) { /* PAM sin esas funciones: lo guardado */ }
      if (!R) return { omitido: 'La Bóveda de PAM todavía muestra los datos de ejemplo, y Mi PJ no escribe en ellos.' + comoEmpezar };
      const F = fichas();
      const deFicha = F ? F.lista.find(x => x.ficha && normNombre(x.ficha.nombre) === objetivo) : null;
      let pj = (deFicha && R.personajes.find(p => p.pamId === deFicha.id)) || R.personajes.find(p => normNombre(p.nombre) === objetivo);
      let aproximado = false;
      if (!pj) {
        const palabras = objetivo.split(' ');
        const cand = R.personajes.filter(p => { const n = normNombre(p.nombre); return n && n.split(' ').every(x => palabras.includes(x)); });
        if (cand.length === 1) { pj = cand[0]; aproximado = true; }
      }
      if (!pj) return { omitido: 'En la Bóveda de PAM no hay ningún personaje llamado «' + nombrePj + '».' + comoEmpezar };
      return { pj, aproximado };
    },
    /** La bóveda de un personaje de la Bóveda de PAM (por su id de «Mi Ficha» o de la Bóveda). */
    bovedaDe: id => { try { const b = w.rrBoveda.get(id); if (b) return b; } catch (e) { /* lo guardado */ } const R = registro(); const p = R && R.personajes.find(x => x.id === id); return (p && p.boveda) || {}; },
    /** Deja preparado un movimiento de grageas: { form, html, c, divisor } o null. */
    prepararBoveda: (id, v) => w.rrBoveda.preparar(id, v),
    /** «Ya lo publiqué»: { act } o null. */
    cerrarBoveda: (id, v) => w.rrBoveda.cerrar(id, v),
    /** R08: el canje ya está cerrado: el carrito (y las armas) de la Tabla de Canjes quedan vacíos. */
    vaciarCarrito: () => { try { if (w.pamCanjes) w.pamCanjes.vaciarCarrito(); } catch (e) { /* PAM sin Tabla de Canjes */ } },

    /** Enseña una sección de PAM («oficiales», «ficha», «boveda»…). */
    verSeccion: nombre => { try { w.showSection(nombre); } catch (e) { /* esta versión de PAM no la tiene */ } }
  };
}
