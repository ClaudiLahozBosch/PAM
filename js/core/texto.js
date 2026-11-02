// @ts-check
// Utilidades de texto. Una sola versión de cada una (en el PAM antiguo `esc` estaba definida siete veces).

/** Para comparar: sin tildes, sin espacios a los lados, en minúsculas. «Seducción» → «seduccion». */
export function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Como `norm`, y además junta los espacios repetidos y quita la puntuación final («Irvin Giles.» → «irvin giles»). */
export function normNombre(s) {
  return norm(s).replace(/\s+/g, ' ').replace(/[.,;:!¡?¿]+$/, '').trim();
}

const HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapa texto para meterlo en HTML, también dentro de atributos (comillas incluidas). */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => HTML[c]);
}

/** Para usar un texto dentro de una expresión regular. */
export function escRe(s) {
  return String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** 3 → «III». Fuera de rango, el número tal cual. */
export function aRomano(n) {
  return ROMANOS[n] ?? String(n);
}

/** «III» o «3» → 3. Si no es un nivel, null. */
export function deRomano(s) {
  const t = String(s ?? '').trim().toUpperCase();
  const i = ROMANOS.indexOf(t);
  if (i > 0) return i;
  return /^\d+$/.test(t) ? Number(t) : null;
}

/** Número a partir de cualquier valor; lo que no es número cuenta como 0. */
export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
