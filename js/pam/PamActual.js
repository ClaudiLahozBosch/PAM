// @ts-check
// Adaptador del PAM actual (index.html de Hana Park). Es el ÚNICO archivo que conoce sus funciones por dentro
// (window.rrOficiales, window.showSection…). El controlador habla con PAM solo a través de esto; cuando las páginas
// de PAM se reescriban (fase 8), se cambia este archivo y nada más.

/**
 * @param {any} w la ventana de PAM (en las pruebas, una de mentira)
 */
export function crearPamActual(w) {
  return {
    /** ¿Está la lista de «Posibles oficiales»? (la Bóveda de PAM la define al cargar) */
    hayOficiales: () => !!(w.rrOficiales && w.rrOficiales.previa && w.rrOficiales.aplicar),
    /** Qué cambiaría al sumar estos oficiales: { nuevos: [{nombre, relacion, fav}], cambios: [{nombre, estado, antes, fav}] } */
    previaOficiales: (items, estados) => w.rrOficiales.previa(items, estados),
    /** Los suma a «Posibles oficiales»: { nuevos: n, cambios: n } */
    aplicarOficiales: (items, estados) => w.rrOficiales.aplicar(items, estados),
    /** Enseña una sección de PAM («oficiales», «ficha», «boveda»…). */
    verSeccion: nombre => { try { w.showSection(nombre); } catch (e) { /* esta versión de PAM no la tiene */ } }
  };
}
