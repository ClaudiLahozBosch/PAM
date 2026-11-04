/* PAM · El tema de colores, antes de pintar nada.
   Desde la fase 8a las páginas las carga js/pam/arranque.js, un poco más tarde que cuando estaban dentro de index.html:
   sin esto se vería un momento el tema Avadense antes del elegido. js/paginas/pam/temas.js lo vuelve a poner igual. */
try { document.documentElement.dataset.skin = localStorage.getItem('grimorio.tema') || 'avadense'; } catch (_) {}
