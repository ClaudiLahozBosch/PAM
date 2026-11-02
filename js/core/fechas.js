// @ts-check
// Fechas en hora local. `toISOString()` da el día en UTC: en Madrid, entre medianoche y la 1-2 h,
// devolvía el día anterior (auditoría F15).

const dos = n => String(n).padStart(2, '0');

/** «AAAA-MM-DD» del día local. */
export function fechaLocal(d = new Date()) {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Copia de la fecha con `n` días más (o menos), respetando los cambios de hora. */
export function sumarDias(n, desde = new Date()) {
  const x = new Date(desde.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** Equivalente correcto del `fechaISO(d)` antiguo: el día local de hoy + `dias`. */
export function fechaISO(dias = 0, desde = new Date()) {
  return fechaLocal(sumarDias(dias, desde));
}

/** «AAAA-MM-DD» → Date a mediodía local (así no cambia de día por la zona horaria). */
export function deFechaLocal(s) {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null;
}
