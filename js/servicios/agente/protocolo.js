// Contrato entre PAM y el agente (el script del foro).
// Petición:  { pam: PROTOCOLO, de, id, tipo, datos }
// Respuesta: { pam: PROTOCOLO, de, re: id, ok, resultado | error }
// «de» es 'pam' o 'agente': en la misma ventana cada lado ignora sus propios mensajes.
//
// PAM → agente:
//   hola                                   → { agente, protocolo, foro, cuenta: {id, nombre}|null, ruta, ventana: {ancho, alto},
//                                              hash: «#escriba-…» con el que se abrió la página (el agente lo quita de la dirección) }
//   foro.ir        { ruta }                lleva la página del foro a otra ruta del mismo foro
//   foro.leer      { ruta }                → { estado, ruta, url, html }        (solo rutas del foro)
//   foro.puerta    { titulo, explicacion, avisos, pasos: [{tipo:'publicar', tema, texto} | {tipo:'editar', post, original, nuevo, motivo}],
//                    enlaceFinal?: { texto } }
//                                          → la puerta del Escriba → { resultado, pasos: [{estado, post, …}], siguiente? }
//                                            («enlace del paso n» en un texto = enlace al mensaje del paso n;
//                                             un paso con `omitido` no se hace; `siguiente`: se pulsó el botón de enlaceFinal)
//   pam.abrir      { hash, mensaje?, respuesta? }  abre PAM en otra pestaña (y le pasa el mensaje hasta que conteste)
//   pam.enviar     { mensaje, respuesta }  lo mismo, a la pestaña de PAM que ya se abrió
//   foro.publicar  { tema, mensaje, motivo } y foro.editar { post, original, nuevo, motivo }: la misma puerta con un paso
//   almacen.leer   { clave } / almacen.guardar { clave, valor }   (claves «pam.*»)
//   almacen.legado                         → { valores } lo que guardaba el «Mi PJ» antiguo
//   panel.tamano   { ancho, alto }         tamaño del iframe (lo que ocupa Mi PJ)
//   panel.tema     { tema }                el tema de Mi PJ para las puertas
// agente → PAM:
//   editor.revisar { texto, ruta }         → { avisos: string[], encabezado? }   («Antes de publicar»)
//                                          2.1.0: y colorear { dialogos, coloreado, cambiaria, sinConfig, quien } (el botón; 2.5.1: y nombres, marcas)
//   editor.colorear { texto }              → { texto, tramos, quien, sinConfig }   («Colorear diálogos», 2.1.0)
//   editor.descolorear { texto }           → { texto }   («Quitar colores» sin el texto de antes, 2.1.3)
//   ventana.cambio { ancho, alto }         cambió el tamaño de la ventana del foro
//   pam.cierre     { hecho }               la pestaña de PAM terminó de cerrar el canje («Canje publicado → PAM»)
//   canje.accion   { accion, p }           2.3.0: un clic en la barra del Registro de Canjes («llevar» | «ficha», p = mensaje)
// PAM → agente (2.3.0):
//   canje.pintar   { css, barras: { <post>: html } }  la barra de Mi PJ debajo de tus peticiones aprobadas; canje.quitar {}

export const PROTOCOLO = 1;

/** Foros en los que PAM acepta un agente como ventana madre del panel. */
export const FOROS = ['https://test-forito.foroactivo.com', 'https://hp-avada-kedavra.foroactivo.com'];
