// Contrato entre PAM y el agente (el script del foro).
// Petición:  { pam: PROTOCOLO, de, id, tipo, datos }
// Respuesta: { pam: PROTOCOLO, de, re: id, ok, resultado | error }
// «de» es 'pam' o 'agente': en la misma ventana cada lado ignora sus propios mensajes.

export const PROTOCOLO = 1;

/** Foros en los que PAM acepta un agente como ventana madre del panel. */
export const FOROS = ['https://test-forito.foroactivo.com'];

/**
 * Tipos de mensaje. PAM → agente salvo que se indique.
 * @typedef {'hola'|'foro.leer'|'foro.publicar'|'almacen.leer'|'almacen.guardar'} TipoAgente
 * @typedef {'editor.revisar'} TipoPam  agente → PAM
 */
