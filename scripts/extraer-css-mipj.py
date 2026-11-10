# Saca el CSS del panel «Mi PJ» de pam-mi-pj.user.js (la constante CSS de moduloMiPJ) a css/mipj.css,
# tal cual, con los únicos cambios que exige dibujarlo dentro de un iframe:
#   · 100vh / 100vw  → var(--vh) / var(--vw): el tamaño de la ventana del FORO (el iframe no lo ve; lo da el agente);
#   · @media (max-width:520px) → #mipj.estrecho (la misma regla, pero según el ancho del foro).
# Uso: python -I scripts/extraer-css-mipj.py
import io, re, sys
src = io.open('tests/legado/pam-mi-pj.user.js', encoding='utf-8').read()
i = src.index('  const CSS = `\n') + len('  const CSS = `\n')
j = src.index('`;', i)
css = src[i:j]
assert '${' not in css and '\\' not in css, 'el CSS tiene interpolaciones o escapes: revisar a mano'
antes = css
css = css.replace('100vh', 'var(--vh)').replace('100vw', 'var(--vw)')
css = css.replace('@media (max-width:520px){#mipj{right:8px;bottom:8px}}', '#mipj.estrecho{right:8px;bottom:8px}')
assert '@media' not in css, 'queda un @media: revisar'
cabecera = ('/* CSS del panel «Mi PJ» (Hana Park), sacado de pam-mi-pj.user.js 1.7.1 con scripts/extraer-css-mipj.py.\n'
            '   Cambios: 100vh/100vw → var(--vh)/var(--vw) (ventana del foro) y la regla de pantalla estrecha → #mipj.estrecho.\n'
            '   Los colores del tema Avadense van también aquí, para que la pastilla se vea antes de que arranque el JavaScript\n'
            '   (el tema elegido los sobreescribe igual que antes). */\n'
            ':root{--vh:100vh;--vw:100vw}\nhtml,body{margin:0;padding:0;background:transparent;overflow:hidden}\n'
            '#mipj{--m-ink:#171a2b;--m-panel:#1e2236;--m-panel-2:#262a42;--m-parchment:#F1EADF;--m-parchment-dim:#a7a1b6;--m-gold:#B49768;'
            '--m-gold-bright:#d6bd8f;--m-arcane-bright:#cf94a3;--m-good:#93b8a0;--m-bad:#d98377;--m-line-strong:rgba(241,234,223,.16);'
            '--m-accent-ink:#1b1e30;--m-serif:"Cormorant Garamond",Georgia,serif;--m-sans:"Nunito",system-ui,sans-serif}\n')
io.open('css/mipj.css', 'w', encoding='utf-8', newline='\n').write(cabecera + css.strip() + '\n')
print('css/mipj.css', len(css), 'caracteres;', antes.count('100vh'), 'vh y', antes.count('100vw'), 'vw cambiados')
