// En el navegador cada import lleva «?v=VERSIÓN» (scripts/versionar.mjs). En las pruebas se quita, para que
// un módulo importado por una prueba y por otro módulo sea el mismo (si no, habría dos copias de cada clase).
import { registerHooks } from 'node:module';

registerHooks({
  resolve(especificador, contexto, siguiente) {
    const r = siguiente(especificador, contexto);
    if (r.url.startsWith('file:') && r.url.includes('?v=')) return { ...r, url: r.url.replace(/\?v=[^#]*/, '') };
    return r;
  }
});
