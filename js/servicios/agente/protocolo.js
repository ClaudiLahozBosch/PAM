// Contrato entre PAM y el agente (el script del foro).
// Petición:  { pam: PROTOCOLO, de, id, tipo, datos }
// Respuesta: { pam: PROTOCOLO, de, re: id, ok, resultado | error }
// «de» es 'pam' o 'agente': en la misma ventana cada lado ignora sus propios mensajes.
//
// PAM → agente:
//   hola                                   → { agente, protocolo, foro, cuenta: {id, nombre}|null, ruta }
//   foro.leer      { ruta }                → { estado, ruta, url, html }        (solo rutas del foro)
//   foro.publicar  { tipo:'responder', tema, mensaje, motivo }   → puerta del agente → { publicado, decision, … }
//   foro.editar    { post, original, nuevo, motivo, titulo }     → puerta con diferencias → { editado, decision, estado, … }
//   almacen.leer   { clave } / almacen.guardar { clave, valor }   (claves «pam.*»)
//   almacen.legado                         → { valores } lo que guardaba el «Mi PJ» antiguo
//   panel.tamano   { ancho, alto } · panel.mostrar { abierto } · panel.pastilla { texto }
// agente → PAM:
//   editor.revisar { texto, ruta }         → { avisos: string[] }

export const PROTOCOLO = 1;

/** Foros en los que PAM acepta un agente como ventana madre del panel. */
export const FOROS = ['https://test-forito.foroactivo.com', 'https://hp-avada-kedavra.foroactivo.com'];
