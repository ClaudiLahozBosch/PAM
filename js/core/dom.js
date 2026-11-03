// @ts-check
// Construir HTML sin plantillas de texto: los textos van siempre como texto (nunca se interpretan como HTML),
// así un dato del foro o de un código importado no puede meter etiquetas ni scripts (auditoría F08).

/**
 * h('div', { class: 'tarjeta', onclick: fn }, 'texto', otroNodo, null, [más, nodos])
 * @param {string} tag
 * @param {Record<string, any>|null} [props]
 * @param {...any} hijos textos, nodos, listas o null
 */
export function h(tag, props, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = String(v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k === 'href') { const s = String(v); if (/^(https?:|\/|#)/i.test(s)) e.setAttribute('href', s); }
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  const poner = x => {
    if (x == null || x === false) return;
    if (Array.isArray(x)) x.forEach(poner);
    else e.appendChild(x instanceof Node ? x : document.createTextNode(String(x)));
  };
  hijos.forEach(poner);
  return e;
}

/** Vacía un elemento y le pone hijos nuevos. */
export function reemplazar(el, ...hijos) {
  el.replaceChildren();
  for (const x of hijos.flat()) if (x != null && x !== false) el.appendChild(x instanceof Node ? x : document.createTextNode(String(x)));
}

/** 12345 → «12.345» */
export const miles = n => (typeof n === 'number' && Number.isFinite(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—');
