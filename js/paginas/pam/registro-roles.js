/* PAM · Registro de Roles y Coloreador de Diálogos.
   Fase 8a: el mismo código que estaba dentro de index.html, sin cambios. Lo carga js/pam/arranque.js. */
/* ============ Registro de Roles + Coloreador (integrados en PAM, dentro de Shadow DOM) ============ */
(function(){
const host=document.getElementById("rr-host");
const RR=host.attachShadow({mode:"open"});
RR.__extraCss=1;RR.innerHTML='<style>'+"\n.of-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0 4px}.of-f{border:var(--bw,1px) solid var(--line);background:var(--surface);color:var(--fg);border-radius:999px;padding:4px 11px;cursor:pointer;font:inherit;font-size:.85rem}.of-f.on{background:var(--accent);border-color:var(--accent);color:var(--surface)}.of-f strong{font-weight:700}.of-q{flex:1;min-width:12rem;border:var(--bw,1px) solid var(--line);background:var(--surface);color:var(--fg);border-radius:999px;padding:6px 12px;font:inherit;font-size:.9rem}.of-st{text-align:center}.of-star{font-size:1.1rem;line-height:1;color:var(--muted);opacity:.45;padding:2px 6px}.of-star.on{color:#d9a52b;opacity:1}.of-star:hover{opacity:1}tr[hidden]{display:none}\n:host{display:block}img{max-width:100%}[hidden]{display:none!important}\n/* Layout: cuaderno de rol con pesta\u00f1as; cada pesta\u00f1a es una hoja del Excel original, tablas con chips de color pastel */\n:host{\n  --bg:#FAF3E7; --surface:#FFFDF8; --surface-2:#F3EADB; --line:#E4D8C6; --fg:#3A3340; --muted:#7A6F80;\n  --accent:#6B5490; --accent-soft:#E7DCF5; --focus:#8F74B8;\n  --rose-bg:#F7D6E0; --rose-fg:#9B4A5F;\n  --mint-bg:#D9F0E4; --mint-fg:#3F7F6B;\n  --peach-bg:#FFE2B8; --peach-fg:#8A4B00;\n  --lilac-bg:#E7DCF5; --lilac-fg:#6B5490;\n  --sage-bg:#DCE8D0; --sage-fg:#3F5B41;\n  --sky-bg:#D9EEF7; --sky-fg:#3B6E8C;\n  --sand-bg:#F0E6D6; --sand-fg:#8A7355;\n  --gray-bg:#EDEBF2; --gray-fg:#6B6B80;\n  --gold-bg:#FCEFC7; --gold-fg:#8A6A1F;\n  --terra-bg:#FCE1D6; --terra-fg:#9B4A3F;\n  --ff-head:\"Questrial\",\"Century Gothic\",\"Avenir Next\",system-ui,sans-serif;\n  --ff-body:\"Lora\",\"Constantia\",Georgia,serif;\n  --r:10px; --ff-display:var(--ff-head); --fs:15px; --bw:1px;\n  --title-grad:linear-gradient(90deg,var(--accent),var(--accent)); --bg-img:none; --fx-op:0;\n}\n@media (prefers-color-scheme: dark){:host([data-skin=\"pastel\"]){\n  --bg:#1D1924; --surface:#262030; --surface-2:#2E2739; --line:#3F3550; --fg:#EFE8F5; --muted:#ADA2B8;\n  --accent:#C7B2EA; --accent-soft:#3A2F4F; --focus:#C7B2EA;\n  --rose-bg:#4A2633; --rose-fg:#F4B9CB; --mint-bg:#1F3D33; --mint-fg:#A8E0C6;\n  --peach-bg:#4A3215; --peach-fg:#FFCB85; --lilac-bg:#392D4F; --lilac-fg:#D3C1F2;\n  --sage-bg:#2A3A27; --sage-fg:#BFD6AE; --sky-bg:#1F3542; --sky-fg:#A9D4EC;\n  --sand-bg:#3A3124; --sand-fg:#E1CBA8; --gray-bg:#33313D; --gray-fg:#C5C3D4;\n  --gold-bg:#433715; --gold-fg:#F1D686; --terra-bg:#4A2A22; --terra-fg:#F4B7A3;\n  color-scheme:dark}}\n:host([data-theme=\"dark\"]){\n  --bg:#1D1924; --surface:#262030; --surface-2:#2E2739; --line:#3F3550; --fg:#EFE8F5; --muted:#ADA2B8;\n  --accent:#C7B2EA; --accent-soft:#3A2F4F; --focus:#C7B2EA;\n  --rose-bg:#4A2633; --rose-fg:#F4B9CB; --mint-bg:#1F3D33; --mint-fg:#A8E0C6;\n  --peach-bg:#4A3215; --peach-fg:#FFCB85; --lilac-bg:#392D4F; --lilac-fg:#D3C1F2;\n  --sage-bg:#2A3A27; --sage-fg:#BFD6AE; --sky-bg:#1F3542; --sky-fg:#A9D4EC;\n  --sand-bg:#3A3124; --sand-fg:#E1CBA8; --gray-bg:#33313D; --gray-fg:#C5C3D4;\n  --gold-bg:#433715; --gold-fg:#F1D686; --terra-bg:#4A2A22; --terra-fg:#F4B7A3;\n  color-scheme:dark}\n\n/* ===== Temas (skins). Pastel Core = tokens base de arriba. Los dem\u00e1s fijan su propio look. ===== */\n:host([data-skin=\"magic\"]){\n  --bg:#EDE4EB; --bg-img:radial-gradient(ellipse at 15% 0%,#C9C3DD 0,transparent 55%),radial-gradient(ellipse at 90% 30%,#E7D0A8 0,transparent 45%),linear-gradient(180deg,#EDE4EB,#E3DCEE);\n  --surface:#FBF8FB; --surface-2:#F1EAF2; --line:#D9CCE0; --fg:#3B3152; --muted:#7D6F90;\n  --accent:#6B62AE; --accent-soft:#E6E0F3; --focus:#9B80A5;\n  --title-grad:linear-gradient(90deg,#6B62AE,#9B80A5 50%,#D6A6B9);\n  --ff-display:\"Cinzel Decorative\",Georgia,serif; --ff-head:\"Cormorant Garamond\",Georgia,serif; --ff-body:\"Cormorant Garamond\",Georgia,serif; --fs:17px; --fx-op:.55;\n  --rose-bg:#F6DCE6; --rose-fg:#A04E72; --mint-bg:#DDEFEA; --mint-fg:#3D7A6E; --peach-bg:#F6E1D3; --peach-fg:#97573A;\n  --lilac-bg:#E6E0F3; --lilac-fg:#5F507B; --sage-bg:#E1EBDD; --sage-fg:#4D6A4C; --sky-bg:#DDE3F3; --sky-fg:#4E5F99;\n  --sand-bg:#F3E6D2; --sand-fg:#8C6F4A; --gray-bg:#ECE8F0; --gray-fg:#6E6680; --gold-bg:#F5EACB; --gold-fg:#8A6B2A; --terra-bg:#F4DCD7; --terra-fg:#9A4F52;\n  color-scheme:light}\n:host([data-skin=\"terror\"]){\n  --bg:#19191C; --bg-img:radial-gradient(ellipse at 50% -10%,#4A2638 0,transparent 55%),linear-gradient(180deg,#241C29,#19191C 70%);\n  --surface:#211C25; --surface-2:#2B2431; --line:#45303F; --fg:#E8DCCF; --muted:#A99487;\n  --accent:#C98A92; --accent-soft:#3A2230; --focus:#B19A72;\n  --title-grad:linear-gradient(90deg,#B77A83,#B19A72 50%,#8A3D4F);\n  --ff-display:\"UnifrakturCook\",\"Cinzel\",Georgia,serif; --ff-head:\"Cinzel\",Georgia,serif; --ff-body:\"Libre Baskerville\",Georgia,serif; --fs:14px; --fx-op:.35;\n  --rose-bg:#4A2033; --rose-fg:#F0A7B8; --mint-bg:#26352E; --mint-fg:#A9CDB7; --peach-bg:#43311C; --peach-fg:#E5C08A;\n  --lilac-bg:#352A40; --lilac-fg:#CDB7E0; --sage-bg:#2C3328; --sage-fg:#BACBA6; --sky-bg:#25303D; --sky-fg:#A9C1D9;\n  --sand-bg:#3A3227; --sand-fg:#D7C29E; --gray-bg:#302D35; --gray-fg:#C2BCC8; --gold-bg:#3F3420; --gold-fg:#D9BF86; --terra-bg:#4A2526; --terra-fg:#E8A59A;\n  color-scheme:dark}\n:host([data-skin=\"neutro\"]){\n  --bg:#F4F0EA; --bg-img:none;\n  --surface:#FBF9F6; --surface-2:#EDE7DF; --line:#DCD4CA; --fg:#2A2826; --muted:#756B64;\n  --accent:#3F3D3B; --accent-soft:#E8E2DA; --focus:#968B82;\n  --title-grad:linear-gradient(90deg,#3F3D3B,#3F3D3B);\n  --ff-display:\"Cormorant Garamond\",Georgia,serif; --ff-head:\"Montserrat\",system-ui,sans-serif; --ff-body:\"Libre Baskerville\",Georgia,serif; --fs:14px; --fx-op:.35;\n  --rose-bg:#EFE1DF; --rose-fg:#8A5450; --mint-bg:#E2E8E2; --mint-fg:#4F6656; --peach-bg:#F0E5D6; --peach-fg:#82623A;\n  --lilac-bg:#E7E3E9; --lilac-fg:#625870; --sage-bg:#E3E6DC; --sage-fg:#56604A; --sky-bg:#E1E6EA; --sky-fg:#4E6070;\n  --sand-bg:#ECE5DB; --sand-fg:#7A6A55; --gray-bg:#E7E5E2; --gray-fg:#5F5C58; --gold-bg:#EFE7D3; --gold-fg:#7A6533; --terra-bg:#EEDFD8; --terra-fg:#83533F;\n  color-scheme:light}\n:host([data-skin=\"magico\"]){\n  --bg:#201B3A; --bg-img:radial-gradient(ellipse at 80% -10%,#7567A8 0,transparent 45%),radial-gradient(ellipse at 0% 100%,#51447F 0,transparent 50%),linear-gradient(180deg,#201B3A,#2A2350);\n  --surface:#272149; --surface-2:#30295A; --line:#4A4180; --fg:#ECE8F7; --muted:#AEBFD5;\n  --accent:#E4D19A; --accent-soft:#3B3370; --focus:#C4A66A;\n  --title-grad:linear-gradient(90deg,#C4A66A,#E4D19A 45%,#B796C4);\n  --ff-display:\"Cinzel Decorative\",Georgia,serif; --ff-head:\"Cinzel\",Georgia,serif; --ff-body:\"Cormorant Garamond\",Georgia,serif; --fs:17px; --fx-op:.6;\n  --rose-bg:#4C2E5A; --rose-fg:#F2B8D6; --mint-bg:#20414A; --mint-fg:#A6E0D6; --peach-bg:#4A3A22; --peach-fg:#F0D49A;\n  --lilac-bg:#40356F; --lilac-fg:#D6C6F2; --sage-bg:#2D4136; --sage-fg:#BCD9B4; --sky-bg:#2A3866; --sky-fg:#B9CBEB;\n  --sand-bg:#3F3730; --sand-fg:#E4D19A; --gray-bg:#363157; --gray-fg:#C9C4E0; --gold-bg:#4A3E22; --gold-fg:#E4D19A; --terra-bg:#4D2E3A; --terra-fg:#F0B3A6;\n  color-scheme:dark}\n:host([data-skin=\"pixel\"]){\n  --bg:#FBEFD8; --bg-img:linear-gradient(90deg,rgba(91,53,88,.05) 1px,transparent 1px),linear-gradient(rgba(91,53,88,.05) 1px,transparent 1px);\n  --surface:#FFF8EA; --surface-2:#F6E3C2; --line:#5B3558; --fg:#3A2238; --muted:#7A5A70;\n  --accent:#9B527A; --accent-soft:#F6D3E0; --focus:#617BA2;\n  --title-grad:linear-gradient(90deg,#9B527A,#9B527A);\n  --ff-display:\"Pixelify Sans\",monospace; --ff-head:\"Pixelify Sans\",monospace; --ff-body:\"VT323\",monospace; --fs:20px; --r:0px; --bw:2px; --fx-op:.7;\n  --rose-bg:#F6CADA; --rose-fg:#8A3A62; --mint-bg:#D6E8C3; --mint-fg:#3E5E3F; --peach-bg:#F8DCA6; --peach-fg:#8A5420;\n  --lilac-bg:#E6D2EC; --lilac-fg:#5B3558; --sage-bg:#D9E6B8; --sage-fg:#496653; --sky-bg:#D2E0EF; --sky-fg:#3D5275;\n  --sand-bg:#F0DDB8; --sand-fg:#7E5A35; --gray-bg:#E6DEE6; --gray-fg:#5E5260; --gold-bg:#F7E2A1; --gold-fg:#8A5E1F; --terra-bg:#F4D0BC; --terra-fg:#8C4A2F;\n  color-scheme:light}\n:host([data-skin=\"pixel\"]) .rr-body{background-size:12px 12px}\n:host([data-skin=\"pixel\"]) .panel,:host([data-skin=\"pixel\"]) .tbl-wrap,:host([data-skin=\"pixel\"]) .card{box-shadow:4px 4px 0 var(--line)}\n:host([data-skin=\"pixel\"]) button,:host([data-skin=\"pixel\"]) .chip-s,:host([data-skin=\"pixel\"]) select.chip,:host([data-skin=\"pixel\"]) .pj-tab{border-radius:0}\n:host([data-skin=\"pixel\"]) h1{font-weight:600;text-shadow:none}\n:host([data-skin=\"pixel\"]) th{font-size:.7rem}\n:host([data-skin=\"magic\"]) h1,:host([data-skin=\"magico\"]) h1{letter-spacing:.03em}\n:host([data-skin=\"magic\"]) .panel{box-shadow:0 10px 40px -18px #6B62AE}\n:host([data-skin=\"magico\"]) .panel{box-shadow:0 0 0 1px rgba(228,209,154,.15),0 18px 50px -20px #000}\n:host([data-skin=\"terror\"]) .panel{box-shadow:0 20px 60px -25px #000}\n:host([data-skin=\"neutro\"]) .panel{border-color:var(--line)}\n.panel,.tbl-wrap,.card,.tabs a,.pj-tab,button{border-width:var(--bw)}\n.orn{-webkit-text-fill-color:initial;background:none}\n/* ===== \u00c1nimo (good girl / carita triste) ===== */\n.mood{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px 20px;align-items:center;padding:18px clamp(14px,3vw,22px);border-radius:var(--r);border:var(--bw) solid currentColor;position:relative;overflow:hidden}\n.mood.happy{background:var(--mint-bg);color:var(--mint-fg)}\n.mood.sad{background:var(--peach-bg);color:var(--peach-fg)}\n.mood.cry{background:var(--rose-bg);color:var(--rose-fg)}\n.mood.zen{background:var(--lilac-bg);color:var(--lilac-fg)}\n.mood .face{width:110px;height:110px;border:0;background:none;padding:0;border-radius:50%;cursor:pointer;color:inherit}\n.mood .face svg{width:100%;height:100%;overflow:visible}\n.mood-txt{display:grid;gap:6px;min-width:0}\n.mood-big{font-family:var(--ff-display);font-size:clamp(1.8rem,5.5vw,3rem);line-height:1.05;margin:0;color:inherit;text-wrap:balance}\n.mood-sub{margin:0;font-size:1rem}\n.mood .pend{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}\n.mood .pend button{background:var(--surface);color:inherit;border-color:currentColor;font-size:.82rem;padding:3px 10px}\n.trato{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;padding-top:12px;border-top:1px dashed currentColor}\n.trato .q{font-family:var(--ff-head);font-size:.9rem;margin-right:4px}\n.trato button{background:var(--surface);color:var(--fg);font-size:.85rem}\n.trato button[aria-pressed=\"true\"]{background:currentColor}\n.trato button[aria-pressed=\"true\"] span{color:var(--surface)}\n.mood.ask .trato{border-top:0;padding-top:0}\n.mood.ask .trato .q{font-size:1.05rem}\n.mood-x{position:absolute;top:8px;right:8px;z-index:2;width:30px;height:30px;padding:0;display:grid;place-items:center;background:var(--surface);color:inherit;border-color:currentColor;font-size:.85rem;opacity:.75}\n.mood-x:hover{opacity:1}\n.drop{position:relative;border:calc(var(--bw) + 1px) dashed var(--line);border-radius:var(--r);padding:22px;display:grid;gap:6px;justify-items:center;text-align:center;background:var(--surface-2);cursor:pointer}\n.drop.over,.drop:focus-within{border-color:var(--accent);background:var(--accent-soft)}\n.drop input{position:absolute;width:1px;height:1px;opacity:0}\n.imp-sum{display:grid;gap:10px;padding:16px;border-radius:var(--r);border:var(--bw) solid var(--line);background:var(--surface-2)}\n.imp-sum ul{margin:0;padding-left:1.2em;display:grid;gap:3px}\n\n/* b\u00f3veda */\n.bov-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:16px}\n@media (max-width:820px){.bov-grid{grid-template-columns:1fr}}\n.bov-card{border-radius:var(--r);padding:18px 20px;display:grid;gap:14px;border:var(--bw) solid currentColor}\n.bov-h{font-family:var(--ff-display);font-size:1.35rem}\n.bov-g{display:grid;gap:6px}\n.bov-g+.bov-g{padding-top:12px;border-top:1px dashed currentColor}\n.bov-l{display:flex;align-items:center;gap:8px;font-family:var(--ff-head)}\n.flor{font-size:1.05em;width:1.2em;text-align:center}\n.bov-lbl{flex:1;min-width:0}\ninput.bov-n{width:9ch!important;background:var(--surface);border-color:currentColor;color:var(--fg);font-weight:600}\n.bov-links{border:var(--bw) solid var(--line);border-radius:var(--r);padding:16px 18px;display:grid;gap:10px;align-content:start;background:var(--surface-2)}\n.bov-link{display:grid;gap:2px}\n.bov-link .bov-lbl{font-family:var(--ff-head);font-size:.8rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}\n.bov-link input.cell{font-size:.82rem;background:var(--surface);border-color:var(--line)}\n.bov-tx{display:grid;gap:12px;border:var(--bw) solid var(--line);border-radius:var(--r);padding:16px 18px}\n.bov-f{display:grid;gap:4px}\n.bov-f .lbl,.bov-codes .lbl{font-family:var(--ff-head);font-size:.78rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}\n.bov-tx input.bov-d{width:12ch;border:1px solid var(--line);font-size:1.1rem;font-weight:600;border-color:var(--line);background:var(--surface-2)}\n.bov-tx textarea.bov-enl{resize:vertical;border:1px solid var(--line);font-family:var(--ff-body);border-color:var(--line);background:var(--surface-2);font-size:.9rem}\n.bov-prev{display:flex;align-items:baseline;gap:8px;font-family:var(--ff-head);font-size:1.15rem;font-variant-numeric:tabular-nums;padding:6px 12px;border-radius:var(--r);background:var(--accent-soft)}\n.bov-prev strong{color:var(--accent);font-size:1.35rem}\n.bov-prev .pos{color:var(--mint-fg)} .bov-prev .neg{color:var(--rose-fg)}\n.bov-enls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px}\n.bov-tx input.bov-u{border:1px solid var(--line);background:var(--surface-2);font-size:.88rem}\n.bov-div{font-size:1.1em;color:var(--accent)}\n.bov-codes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:12px}\n.bov-codes .code-box{min-height:130px;resize:vertical}\n\n/* log de movimientos */\n.bov-log-wrap{display:grid;gap:8px}\n.bov-log{font-family:ui-monospace,\"SFMono-Regular\",Menlo,Consolas,monospace;font-size:.82rem;background:var(--surface-2);border:var(--bw) solid var(--line);border-radius:var(--r);padding:8px 0;max-height:320px;overflow-y:auto}\n.lg{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:5px 14px;border-left:3px solid transparent;font-variant-numeric:tabular-nums}\n.lg:nth-child(even){background:color-mix(in srgb,var(--surface) 45%,transparent)}\n.lg.last{border-left-color:var(--accent)}\n.lg-t{color:var(--muted)}\n.lg-n{min-width:5ch;text-align:right}\n.lg-d{font-weight:700;min-width:6ch}\n.lg-d.pos{color:var(--mint-fg)} .lg-d.neg{color:var(--rose-fg)}\n.lg-a{font-weight:700;color:var(--accent)}\n.lg-tot{color:var(--muted)}\n.lg-l{flex:1;min-width:0}\n.lg-l a{color:var(--accent);text-underline-offset:2px}\n.lg-sep{color:var(--muted)}\n.lg-x{padding:0 6px!important;font-size:.75rem;opacity:.5}\n.lg:hover .lg-x{opacity:1}\n.lg-nota{font:inherit;color:var(--fg);background:transparent;border:1px dashed var(--line);border-radius:4px;padding:1px 6px;flex:1;min-width:10ch}\n.empty-log{color:var(--muted)}\n\n/* futuros canjes */\n.w-sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:16px;border:var(--bw) solid var(--line);border-radius:var(--r);background:var(--surface-2)}\n.w-big{display:grid;gap:2px}\n.w-big .lbl,.w-add .lbl,.wf .lbl{font-family:var(--ff-head);font-size:.74rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}\n.w-big strong{font-family:var(--ff-head);font-size:1.9rem;line-height:1.1;color:var(--accent);font-variant-numeric:tabular-nums}\n.w-big.neg strong{color:var(--rose-fg)} .w-big.pos strong{color:var(--mint-fg)}\n.w-big small{color:var(--muted)}\n.w-bar{grid-column:1/-1;position:relative;height:14px;border-radius:999px;background:var(--surface);border:1px solid var(--line);overflow:hidden}\n.w-bar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--accent),var(--mint-fg));border-radius:999px}\n.w-bar span{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-family:var(--ff-head);font-size:.7rem;color:var(--fg)}\n.w-prio{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px}\n@media (max-width:640px){.w-sum{grid-template-columns:1fr}}\n.w-add{display:grid;gap:12px;border:var(--bw) dashed var(--line);border-radius:var(--r);padding:16px}\n.w-form{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:end}\n.wf{display:grid;gap:3px;min-width:min(100%,150px)}\n.wf.grow{flex:1;min-width:min(100%,260px)}\n.w-add select.wsel,.w-add input.wsel{border:1px solid var(--line);background:var(--surface);min-width:0}\n.w-prev{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px;font-family:var(--ff-head);padding:8px 12px;border-radius:var(--r);background:var(--accent-soft);min-width:0;flex:1}\n.wp-n{font-weight:600}\n.wp-g{color:var(--accent);font-size:1.2rem} .wp-pl{color:var(--gold-fg)}\n.wp-req{font-size:.8rem;color:var(--muted);flex-basis:100%}\n.pr-b{font-family:var(--ff-head);border:1px solid transparent;font-size:.82rem;padding:4px 10px;opacity:.55}\n.pr-b[aria-pressed=\"true\"]{opacity:1;border-color:currentColor;box-shadow:inset 0 0 0 1px currentColor}\n.w-list,.w-done{display:grid;gap:6px}\n.wi{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto auto;align-items:center;gap:6px 12px;padding:8px 10px 8px 12px;border:1px solid var(--line);border-left:5px solid var(--pc);border-radius:var(--r);background:var(--surface)}\n.wi.done{opacity:.6}\n.wi.done .wi-n{text-decoration:line-through}\n.wi-t{display:grid;min-width:0}\n.wi-n{font-weight:600;overflow-wrap:anywhere}\n.wi-req{font-size:.78rem;color:var(--muted)}\n.wi-g{font-family:var(--ff-head);font-size:1.05rem;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}\n.wi-g small{color:var(--muted)} .wi-pl{font-size:.8rem;color:var(--gold-fg)}\n.wi-a{display:flex;gap:2px;white-space:nowrap}\n.wi-a .ghost{padding:3px 7px;font-size:.8rem}\n@media (max-width:720px){.wi{grid-template-columns:1fr auto}.wi .wprio{grid-column:1/-1;justify-self:start}.wi-s{grid-column:1}.wi-a{grid-column:2;justify-self:end}}\n.w-done summary{font-family:var(--ff-head);color:var(--muted);cursor:pointer;margin-bottom:6px}\n\n/* chips de selecci\u00f3n con color */\nselect.cell.chip.t-rose{background:var(--rose-bg);color:var(--rose-fg)}\nselect.cell.chip.t-mint{background:var(--mint-bg);color:var(--mint-fg)}\nselect.cell.chip.t-peach{background:var(--peach-bg);color:var(--peach-fg)}\nselect.cell.chip.t-lilac{background:var(--lilac-bg);color:var(--lilac-fg)}\nselect.cell.chip.t-sage{background:var(--sage-bg);color:var(--sage-fg)}\nselect.cell.chip.t-sky{background:var(--sky-bg);color:var(--sky-fg)}\nselect.cell.chip.t-sand{background:var(--sand-bg);color:var(--sand-fg)}\nselect.cell.chip.t-gray{background:var(--gray-bg);color:var(--gray-fg)}\nselect.cell.chip.t-gold{background:var(--gold-bg);color:var(--gold-fg)}\nselect.cell.chip.t-terra{background:var(--terra-bg);color:var(--terra-fg)}\nselect.cell.chip{padding-right:12px}\n\n/* ===== coloreador ===== */\n.cd-panel{background:var(--surface);border:1px solid var(--line);border-top:0;border-radius:0 0 var(--r) var(--r);padding:20px clamp(12px,3vw,24px)}\n#coloreador .panel{background:var(--surface-2)}\n#coloreador{--prev-dark:#17192a;--prev-dark-fg:#c9ccd8;--prev-light:#fbf8f1;--prev-light-fg:#2b2b2b;font-family:var(--ff-body);color:var(--fg)}\n#coloreador header{margin-bottom:16px}\n#coloreador h2.cd-h{font-family:var(--ff-display);font-weight:400;font-size:clamp(1.5rem,3vw,2rem);line-height:1.1;margin:0;color:var(--accent)}\n#coloreador header{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px;margin-bottom:22px}\n#coloreador h1{font-family:var(--ff-display);font-weight:400;font-size:clamp(28px,4vw,40px);line-height:1.1;margin:0;text-wrap:balance}\n#coloreador h1 .raya{color:var(--accent)}\n#coloreador .sub{color:var(--muted);margin:6px 0 0;max-width:60ch}\n#coloreador .cd-legend{font-family:ui-monospace,\"SFMono-Regular\",Menlo,Consolas,monospace;font-size:12.5px;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 12px;color:var(--muted)}\n#coloreador .cd-legend b{color:var(--accent);font-weight:500}\n#coloreador .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}\n#coloreador .col{display:flex;flex-direction:column;gap:16px;min-width:0}\n#coloreador .panel{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}\n#coloreador .label{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}\n#coloreador textarea,#coloreador input[type=text]{width:100%;font:inherit;color:var(--fg);background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px}\n#coloreador textarea{resize:vertical;min-height:230px;line-height:1.6}\n#coloreador textarea.code{font-family:ui-monospace,\"SFMono-Regular\",Menlo,Consolas,monospace;font-size:13px;min-height:200px}\n#coloreador textarea:focus,#coloreador input:focus,#coloreador button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}\n#coloreador input[type=text]{font-family:ui-monospace,\"SFMono-Regular\",Menlo,Consolas,monospace;font-size:13.5px}\n#coloreador .colorrow{display:flex;gap:10px;align-items:center}\n#coloreador .colorrow input[type=text]{flex:1;min-width:0}\n#coloreador .swatch{position:relative;width:44px;height:44px;border-radius:8px;border:1px solid var(--line);overflow:hidden;flex:none;cursor:pointer}\n#coloreador .swatch input{position:absolute;inset:-8px;width:60px;height:60px;border:0;padding:0;cursor:pointer;opacity:0}\n#coloreador .swatch span{position:absolute;inset:0}\n#coloreador .recent{display:flex;flex-wrap:wrap;gap:6px;min-height:24px}\n#coloreador .chip{display:inline-flex;align-items:center;gap:6px;font-family:ui-monospace,\"SFMono-Regular\",Menlo,Consolas,monospace;font-size:12px;padding:3px 8px 3px 4px;border:1px solid var(--line);border-radius:99px;background:var(--surface-2);color:var(--fg);cursor:pointer}\n#coloreador .chip i{width:14px;height:14px;border-radius:50%;display:block;border:1px solid var(--line)}\n#coloreador .hint{font-size:12.5px;color:var(--muted);margin:0}\n#coloreador .opts{display:flex;flex-wrap:wrap;gap:8px 16px}\n#coloreador .opts label{display:flex;gap:6px;align-items:center;font-size:13.5px;cursor:pointer}\n#coloreador .opts input{accent-color:var(--accent)}\n#coloreador .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n#coloreador button{font:inherit;font-weight:600;font-size:13.5px;border-radius:8px;padding:9px 16px;cursor:pointer;border:1px solid var(--line);background:var(--surface-2);color:var(--fg)}\n#coloreador button.primary{background:var(--accent);border-color:var(--accent);color:var(--surface)}\n#coloreador .status{font-size:13px;color:var(--muted)}\n#coloreador .count{font-family:ui-monospace,\"SFMono-Regular\",Menlo,Consolas,monospace;font-size:12px;color:var(--accent);background:var(--accent-soft);padding:2px 8px;border-radius:99px;text-transform:none;letter-spacing:0}\n#coloreador .preview{border-radius:8px;padding:16px 18px;line-height:1.7;white-space:pre-wrap;word-wrap:break-word;font-family:Georgia,\"Times New Roman\",serif;font-size:15px;border:1px solid var(--line);min-height:240px;max-height:520px;overflow:auto}\n#coloreador .preview.dark{background:var(--prev-dark);color:var(--prev-dark-fg)}\n#coloreador .preview.light{background:var(--prev-light);color:var(--prev-light-fg)}\n#coloreador .preview.img{background:#141420 url(\"data:image/jpeg;base64,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\") repeat;color:#e9e4d8;text-shadow:0 1px 2px rgba(0,0,0,.55)}\n#coloreador .names{display:flex;flex-direction:column;gap:8px}\n#coloreador .namerow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 38px 34px;gap:8px;align-items:center;padding-bottom:10px;border-bottom:1px dashed var(--line)}\n#coloreador .namerow:last-child{border-bottom:0;padding-bottom:0}\n#coloreador .namerow .fmt{grid-column:1/-1}\n#coloreador .rowswatch.none span{background:repeating-linear-gradient(45deg,var(--surface-2) 0 5px,var(--line) 5px 7px)!important}\n#coloreador .strip{display:flex;gap:6px;align-items:center;font-size:12.5px;color:var(--muted);margin-left:auto;cursor:pointer}\n#coloreador .strip input{accent-color:var(--accent)}\n#coloreador .howto{margin:0;padding:10px 12px 10px 28px;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;font-size:13px;color:var(--muted);display:flex;flex-direction:column;gap:4px}\n#coloreador .howto b{color:var(--fg);font-weight:600}\n#coloreador .howto code{font-family:ui-monospace,\"SFMono-Regular\",Menlo,Consolas,monospace;font-size:12px;color:var(--fg)}\n#coloreador .rowswatch{position:relative;width:38px;height:38px;border-radius:8px;border:1px solid var(--line);overflow:hidden;cursor:pointer}\n#coloreador .rowswatch input{position:absolute;inset:-8px;width:56px;height:56px;border:0;padding:0;opacity:0;cursor:pointer}\n#coloreador .rowswatch span{position:absolute;inset:0}\n#coloreador .fmt{display:flex;flex-wrap:wrap;gap:6px;align-items:center}\n#coloreador .fmt .lbl{font-size:12px;color:var(--muted);margin-right:2px}\n#coloreador .tg{min-width:32px;height:30px;padding:0 9px;font-size:13px;font-weight:500;border-radius:7px;background:var(--surface-2);color:var(--muted)}\n#coloreador .tg[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent);color:var(--fg)}\n#coloreador .tg.b{font-weight:800}\n#coloreador .tg.i{font-style:italic;font-family:Georgia,serif}\n#coloreador .tg.u{text-decoration:underline}\n#coloreador .tg.s{text-decoration:line-through}\n#coloreador .namerow select{width:100%;font:inherit;font-size:13.5px;color:var(--fg);background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:10px 26px 10px 10px;appearance:none;-webkit-appearance:none;cursor:pointer}\n#coloreador .selwrap{position:relative;min-width:0}\n#coloreador .selwrap::after{content:\"\u25be\";position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;font-size:12px}\n#coloreador .namerow .del{padding:0;height:34px;width:34px;font-size:16px;line-height:1;color:var(--muted)}\n#coloreador .namerow input[type=text]{padding:10px}\n#coloreador .uploadbtn{font-size:12px;font-weight:500;text-transform:none;letter-spacing:0;color:var(--muted);cursor:pointer;border:1px solid var(--line);border-radius:7px;padding:4px 10px}\n#coloreador .uploadbtn input{display:none}\n#coloreador .seg{display:inline-flex;border:1px solid var(--line);border-radius:7px;overflow:hidden}\n#coloreador .seg button{border:0;border-radius:0;padding:4px 10px;font-size:12px;font-weight:500;background:transparent;color:var(--muted)}\n#coloreador .seg button[aria-pressed=true]{background:var(--accent-soft);color:var(--fg)}\n#coloreador footer{margin-top:24px;color:var(--muted);font-size:13px;max-width:75ch}\n#coloreador footer code{font-family:ui-monospace,\"SFMono-Regular\",Menlo,Consolas,monospace;font-size:12px;background:var(--surface);border:1px solid var(--line);padding:1px 5px;border-radius:4px}\n@media (max-width:860px){#coloreador .grid{grid-template-columns:1fr}}\n/* ===== temas nuevos ===== */\n:host([data-skin=\"peony\"]){--bg:#EEEADF;--bg-img:radial-gradient(ellipse at 10% 0%,#D8C595 0,transparent 45%),radial-gradient(ellipse at 100% 100%,#E6AEA4 0,transparent 45%),linear-gradient(180deg,#F2EEE7,#E8E6D8);--surface:#FAF8F3;--surface-2:#F2EEE7;--line:#D9D3C2;--fg:#3E3433;--muted:#7C7466;--accent:#8E5963;--accent-soft:#F3DED9;--focus:#9DAA85;--title-grad:linear-gradient(90deg,#8E5963,#E6AEA4 55%,#9DAA85);--ff-display:\"Space Mono\",ui-monospace,monospace;--ff-head:\"Space Mono\",ui-monospace,monospace;--ff-body:\"Lora\",Georgia,serif;--fs:15px;--fx-op:.5;--rose-bg:#F7D6E0;--rose-fg:#9B4A5F;--mint-bg:#D9F0E4;--mint-fg:#3F7F6B;--peach-bg:#FFE2B8;--peach-fg:#8A4B00;--lilac-bg:#E7DCF5;--lilac-fg:#6B5490;--sage-bg:#DCE8D0;--sage-fg:#3F5B41;--sky-bg:#D9EEF7;--sky-fg:#3B6E8C;--sand-bg:#F0E6D6;--sand-fg:#8A7355;--gray-bg:#EDEBF2;--gray-fg:#6B6B80;--gold-bg:#FCEFC7;--gold-fg:#8A6A1F;--terra-bg:#FCE1D6;--terra-fg:#9B4A3F;color-scheme:light}\n:host([data-skin=\"matcha\"]){--bg:#ECE8DE;--bg-img:linear-gradient(180deg,#E6E2D7,#E9E0D0);--surface:#F8F6F0;--surface-2:#EFEAE0;--line:#D8CDBA;--fg:#3F1D0E;--muted:#7C6450;--accent:#A2663C;--accent-soft:#EFE1CF;--focus:#ABBF9B;--title-grad:linear-gradient(90deg,#3F1D0E,#A2663C 60%,#7E9468);--ff-display:\"Bodoni Moda\",Georgia,serif;--ff-head:\"Josefin Sans\",system-ui,sans-serif;--ff-body:\"Josefin Sans\",system-ui,sans-serif;--fs:15px;--fx-op:.5;--rose-bg:#F7D6E0;--rose-fg:#9B4A5F;--mint-bg:#D9F0E4;--mint-fg:#3F7F6B;--peach-bg:#FFE2B8;--peach-fg:#8A4B00;--lilac-bg:#E7DCF5;--lilac-fg:#6B5490;--sage-bg:#DCE8D0;--sage-fg:#3F5B41;--sky-bg:#D9EEF7;--sky-fg:#3B6E8C;--sand-bg:#F0E6D6;--sand-fg:#8A7355;--gray-bg:#EDEBF2;--gray-fg:#6B6B80;--gold-bg:#FCEFC7;--gold-fg:#8A6A1F;--terra-bg:#FCE1D6;--terra-fg:#9B4A3F;color-scheme:light}\n:host([data-skin=\"lotus\"]){--bg:#0F2E23;--bg-img:radial-gradient(ellipse at 85% 0%,rgba(200,133,130,.35) 0,transparent 45%),radial-gradient(ellipse at 0% 100%,#1B5B65 0,transparent 55%),linear-gradient(180deg,#0F2E23,#12392F);--surface:#143A2E;--surface-2:#184538;--line:#2C5A49;--fg:#F4F1DE;--muted:#B8C2A2;--accent:#C88582;--accent-soft:#2A4A3E;--focus:#798F53;--title-grad:linear-gradient(90deg,#C88582,#F4F1DE 55%,#798F53);--ff-display:\"Montserrat\",system-ui,sans-serif;--ff-head:\"Montserrat\",system-ui,sans-serif;--ff-body:\"Lora\",Georgia,serif;--fs:15px;--fx-op:.5;--rose-bg:#4C2E3A;--rose-fg:#F2B8C8;--mint-bg:#20414A;--mint-fg:#A6E0D6;--peach-bg:#4A3A22;--peach-fg:#F0D49A;--lilac-bg:#3E3460;--lilac-fg:#D6C6F2;--sage-bg:#2D4136;--sage-fg:#BCD9B4;--sky-bg:#23395A;--sky-fg:#B9CBEB;--sand-bg:#3F3730;--sand-fg:#E4D1AA;--gray-bg:#33323D;--gray-fg:#C9C6D8;--gold-bg:#4A3E22;--gold-fg:#E8D19A;--terra-bg:#4D2E30;--terra-fg:#F0B3A6;color-scheme:dark}\n:host([data-skin=\"buttercup\"]){--bg:#FFF7D6;--bg-img:radial-gradient(ellipse at 90% 0%,#A8C6E7 0,transparent 50%),radial-gradient(ellipse at 0% 100%,#FFE08A 0,transparent 45%),linear-gradient(180deg,#FFF7D6,#FFF2B2);--surface:#FFFCEE;--surface-2:#FFF4CC;--line:#E8D99A;--fg:#2F4562;--muted:#6A7E99;--accent:#4F78AE;--accent-soft:#E2ECF8;--focus:#7FA8D6;--title-grad:linear-gradient(90deg,#4F78AE,#7FA8D6 55%,#D9B23A);--ff-display:\"Italiana\",Georgia,serif;--ff-head:\"Josefin Sans\",system-ui,sans-serif;--ff-body:\"Josefin Sans\",system-ui,sans-serif;--fs:15px;--fx-op:.5;--rose-bg:#F7D6E0;--rose-fg:#9B4A5F;--mint-bg:#D9F0E4;--mint-fg:#3F7F6B;--peach-bg:#FFE2B8;--peach-fg:#8A4B00;--lilac-bg:#E7DCF5;--lilac-fg:#6B5490;--sage-bg:#DCE8D0;--sage-fg:#3F5B41;--sky-bg:#D9EEF7;--sky-fg:#3B6E8C;--sand-bg:#F0E6D6;--sand-fg:#8A7355;--gray-bg:#EDEBF2;--gray-fg:#6B6B80;--gold-bg:#FCEFC7;--gold-fg:#8A6A1F;--terra-bg:#FCE1D6;--terra-fg:#9B4A3F;color-scheme:light}\n:host([data-skin=\"velvet\"]){--bg:#1A0D0E;--bg-img:radial-gradient(ellipse at 50% -10%,#733438 0,transparent 50%),linear-gradient(180deg,#24100F,#1A0D0E 70%);--surface:#24120F;--surface-2:#2E1716;--line:#4E2427;--fg:#EEDFDA;--muted:#C1A39D;--accent:#D5BCB5;--accent-soft:#45171B;--focus:#A16462;--title-grad:linear-gradient(90deg,#D5BCB5,#A16462 60%,#D5BCB5);--ff-display:\"Cormorant Garamond\",Georgia,serif;--ff-head:\"Cormorant Garamond\",Georgia,serif;--ff-body:\"Cormorant Garamond\",Georgia,serif;--fs:17px;--fx-op:.5;--rose-bg:#4C2E3A;--rose-fg:#F2B8C8;--mint-bg:#20414A;--mint-fg:#A6E0D6;--peach-bg:#4A3A22;--peach-fg:#F0D49A;--lilac-bg:#3E3460;--lilac-fg:#D6C6F2;--sage-bg:#2D4136;--sage-fg:#BCD9B4;--sky-bg:#23395A;--sky-fg:#B9CBEB;--sand-bg:#3F3730;--sand-fg:#E4D1AA;--gray-bg:#33323D;--gray-fg:#C9C6D8;--gold-bg:#4A3E22;--gold-fg:#E8D19A;--terra-bg:#4D2E30;--terra-fg:#F0B3A6;color-scheme:dark}\n:host([data-skin=\"berries\"]){--bg:#0B2224;--bg-img:radial-gradient(ellipse at 100% 0%,rgba(148,29,29,.35) 0,transparent 45%),radial-gradient(ellipse at 0% 100%,#336269 0,transparent 55%),linear-gradient(180deg,#0B2224,#0F2C2F);--surface:#102D30;--surface-2:#15383C;--line:#285055;--fg:#E3F4F5;--muted:#93BFC2;--accent:#93D4D8;--accent-soft:#1E464A;--focus:#93D4D8;--title-grad:linear-gradient(90deg,#93D4D8,#E3F4F5 50%,#D2483F);--ff-display:\"Montserrat\",system-ui,sans-serif;--ff-head:\"Montserrat\",system-ui,sans-serif;--ff-body:\"Montserrat\",system-ui,sans-serif;--fs:14px;--fx-op:.5;--rose-bg:#4C2E3A;--rose-fg:#F2B8C8;--mint-bg:#20414A;--mint-fg:#A6E0D6;--peach-bg:#4A3A22;--peach-fg:#F0D49A;--lilac-bg:#3E3460;--lilac-fg:#D6C6F2;--sage-bg:#2D4136;--sage-fg:#BCD9B4;--sky-bg:#23395A;--sky-fg:#B9CBEB;--sand-bg:#3F3730;--sand-fg:#E4D1AA;--gray-bg:#33323D;--gray-fg:#C9C6D8;--gold-bg:#4A3E22;--gold-fg:#E8D19A;--terra-bg:#4D2E30;--terra-fg:#F0B3A6;color-scheme:dark}\n:host([data-skin=\"tealplum\"]){--bg:#0B3237;--bg-img:radial-gradient(ellipse at 100% 0%,rgba(122,42,90,.55) 0,transparent 50%),radial-gradient(ellipse at 0% 100%,rgba(90,30,66,.45) 0,transparent 45%),linear-gradient(180deg,#0E3E44,#0B3237);--surface:#10424A;--surface-2:#154D55;--line:#2C6A70;--fg:#F3EAE0;--muted:#B9CFCB;--accent:#E3A6CB;--accent-soft:#5A1E42;--focus:#E3A6CB;--title-grad:linear-gradient(90deg,#E3A6CB,#F3EAE0 50%,#7FC3C3);--ff-display:\"Playfair Display\",Georgia,serif;--ff-head:\"Playfair Display\",Georgia,serif;--ff-body:\"Libre Baskerville\",Georgia,serif;--fs:14px;--fx-op:.45;--rose-bg:#4C2E3A;--rose-fg:#F2B8C8;--mint-bg:#1E4A47;--mint-fg:#A6E0D6;--peach-bg:#4A3A22;--peach-fg:#F0D49A;--lilac-bg:#4A2546;--lilac-fg:#EBC3DE;--sage-bg:#2D4136;--sage-fg:#BCD9B4;--sky-bg:#1F4452;--sky-fg:#B4DCE6;--sand-bg:#3F3730;--sand-fg:#E4D1AA;--gray-bg:#2F3F42;--gray-fg:#C9D6D6;--gold-bg:#4A3E22;--gold-fg:#E8D19A;--terra-bg:#4D2E30;--terra-fg:#F0B3A6;color-scheme:dark}\n:host([data-skin=\"bubble\"]){--bg:#102B53;--bg-img:radial-gradient(circle at 15% 20%,rgba(206,181,212,.25) 0,transparent 30%),radial-gradient(circle at 85% 70%,rgba(125,159,192,.3) 0,transparent 35%),linear-gradient(180deg,#102B53,#16335F);--surface:#16355F;--surface-2:#1D406E;--line:#3A5A86;--fg:#EEF2FA;--muted:#AFC0D8;--accent:#CEB5D4;--accent-soft:#2C4A78;--focus:#7D9FC0;--title-grad:linear-gradient(90deg,#F2E3C6,#CEB5D4 50%,#7D9FC0);--ff-display:\"DM Serif Display\",Georgia,serif;--ff-head:\"Montserrat\",system-ui,sans-serif;--ff-body:\"Montserrat\",system-ui,sans-serif;--fs:14px;--fx-op:.5;--rose-bg:#4C2E3A;--rose-fg:#F2B8C8;--mint-bg:#20414A;--mint-fg:#A6E0D6;--peach-bg:#4A3A22;--peach-fg:#F0D49A;--lilac-bg:#3E3460;--lilac-fg:#D6C6F2;--sage-bg:#2D4136;--sage-fg:#BCD9B4;--sky-bg:#23395A;--sky-fg:#B9CBEB;--sand-bg:#3F3730;--sand-fg:#E4D1AA;--gray-bg:#33323D;--gray-fg:#C9C6D8;--gold-bg:#4A3E22;--gold-fg:#E8D19A;--terra-bg:#4D2E30;--terra-fg:#F0B3A6;color-scheme:dark}\n:host([data-skin=\"velvet\"]) h1{font-style:italic}\n:host([data-skin=\"tealplum\"]) th{color:#F3EAE0}\n:host([data-skin=\"tealplum\"]) .panel,:host([data-skin=\"tealplum\"]) .cd-panel{box-shadow:inset 0 3px 0 #7A2A5A}\n:host([data-skin=\"peony\"]) h1,:host([data-skin=\"bubble\"]) h1{letter-spacing:.04em}\n:host([data-skin=\"bubble\"]) h1{text-transform:uppercase;font-size:clamp(1.5rem,3.6vw,2.2rem)}\n#pumpkins{position:absolute;left:0;top:0;width:100%;pointer-events:none;z-index:5;overflow:hidden}\n.pk{position:absolute;pointer-events:auto;cursor:pointer;line-height:1;filter:drop-shadow(0 0 8px rgba(255,140,30,.55));transform:rotate(var(--rot,0deg));background:none;border:0;padding:0}\n.pk:hover{filter:drop-shadow(0 0 14px rgba(255,160,40,.9))}\n@media (prefers-reduced-motion:no-preference){.pk{animation:pkin .5s cubic-bezier(.2,1.6,.4,1) both, pkglow 2.6s ease-in-out infinite .5s}}\n@keyframes pkin{from{transform:scale(0) rotate(var(--rot,0deg))}to{transform:scale(1) rotate(var(--rot,0deg))}}\n@keyframes pkglow{0%,100%{filter:drop-shadow(0 0 6px rgba(255,140,30,.45))}50%{filter:drop-shadow(0 0 14px rgba(255,150,40,.85))}}\n.pk-bar{display:inline-flex;gap:6px;align-items:center;margin-left:6px}\n.pk-bar button{font-size:.82rem;padding:4px 10px}\n.skin-toggle{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 5px}\n.skin-toggle i{width:22px;height:22px;border-radius:50%;flex:none}\n:host([data-skin=\"pixel\"]) .skin-toggle i{border-radius:0}\n.skin-toggle .lbl{margin:0}\n.skin-toggle .car{color:var(--muted);font-size:.8em}\n.skin-list{display:flex;flex-wrap:wrap;gap:6px;flex-basis:100%;padding:10px;border:1px dashed var(--line);border-radius:var(--r);background:color-mix(in srgb,var(--surface) 70%,transparent)}\n.mini-face{border:0;background:none;padding:0;font-size:1.3rem;line-height:1;cursor:pointer}\n.mood-rain{position:absolute;inset:0;pointer-events:none}\n.mood-rain i{position:absolute;top:-12px;width:2px;height:10px;border-radius:2px;background:currentColor;opacity:.35}\n.sparkle{position:absolute;pointer-events:none;font-size:14px}\n#party{position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden}\n#party span{position:absolute;left:50%;top:40%;font-size:var(--s,22px)}\n@media (prefers-reduced-motion:no-preference){\n  .mood.happy .face svg{animation:boing 1.6s ease-in-out infinite}\n  .mood.sad .face svg{animation:sway 3.2s ease-in-out infinite;transform-origin:50% 90%}\n  .mood.cry .face svg{animation:sob .5s ease-in-out infinite}\n  .mood .face.shake svg{animation:shake .45s ease-in-out}\n  .tear{animation:drip 1.4s ease-in infinite}\n  .tear.b{animation-delay:.7s}\n  .mood-rain i{animation:rain linear infinite}\n  .sparkle{animation:twinkle 1.8s ease-in-out infinite}\n  #party span{animation:boom var(--d,1.8s) cubic-bezier(.15,.7,.3,1) forwards}\n  .mood-big.wiggle{animation:wig 2.4s ease-in-out infinite}\n}\n@keyframes boing{0%,100%{transform:translateY(0) scale(1,1)}30%{transform:translateY(-10px) scale(.96,1.04)}55%{transform:translateY(0) scale(1.06,.94)}}\n@keyframes sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}\n@keyframes sob{0%,100%{transform:translate(0,0)}25%{transform:translate(-1.5px,1px)}75%{transform:translate(1.5px,1px)}}\n@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px) rotate(-6deg)}60%{transform:translateX(8px) rotate(6deg)}}\n@keyframes drip{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(26px);opacity:0}}\n@keyframes rain{to{transform:translateY(260px)}}\n@keyframes twinkle{0%,100%{transform:scale(.4) rotate(0);opacity:.2}50%{transform:scale(1.2) rotate(30deg);opacity:1}}\n@keyframes boom{0%{transform:translate(-50%,-50%) scale(.2);opacity:1}80%{opacity:1}100%{transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(var(--r)) scale(1);opacity:0}}\n@keyframes wig{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}\n@media (max-width:520px){.mood{grid-template-columns:1fr;justify-items:center;text-align:center}.mood .pend,.trato{justify-content:center}}\n/* part\u00edculas decorativas */\n#fx{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0;opacity:var(--fx-op)}\n#fx span{position:absolute;top:-10%;font-size:var(--sz,18px);filter:saturate(.8)}\n.wrap{position:relative;z-index:1}\n@media (prefers-reduced-motion:no-preference){#fx span{animation:caer var(--dur,22s) linear var(--del,0s) infinite}}\n@keyframes caer{from{transform:translate(0,0) rotate(0)}50%{transform:translate(var(--dx,20px),60vh) rotate(20deg)}to{transform:translate(0,120vh) rotate(-10deg)}}\n@media (prefers-reduced-motion:reduce){#fx span{top:var(--y,40%)}}\n/* selector de tema */\n.skins{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;align-items:center}\n.skins .lbl{font-family:var(--ff-head);font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-right:4px}\n.skin-b{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 4px}\n.skin-b i{width:22px;height:22px;border-radius:50%;display:inline-block;flex:none}\n:host([data-skin=\"pixel\"]) .skin-b i{border-radius:0}\n.skin-b[aria-pressed=\"true\"]{border-color:var(--accent);background:var(--accent-soft);color:var(--fg)}\n/* enlaces */\n.tit{display:flex;align-items:center;gap:6px;min-width:0}\n.tit input.cell{flex:1;min-width:0;font-weight:600}\n.go-tab{flex:none;display:inline-flex;align-items:center;gap:4px;font-family:var(--ff-head);font-size:.75rem;line-height:1;text-decoration:none;white-space:nowrap;padding:5px 10px;border-radius:999px;background:var(--accent);color:var(--surface);box-shadow:0 1px 0 var(--line)}\n.go-tab:hover{filter:brightness(1.08)}\n.go-tab:focus-visible{outline:2px solid var(--focus);outline-offset:2px}\n:host([data-skin=\"pixel\"]) .go-tab{border-radius:0;box-shadow:2px 2px 0 var(--line)}\n.lnk-btn{flex:none;padding:3px 6px!important;font-size:.85rem;opacity:.55}\n.lnk-btn:hover,.lnk-btn.on{opacity:1}\n.lnk-edit{display:flex;align-items:center;gap:6px;margin-top:4px}\n.lnk-edit input.cell{flex:1;min-width:0;font-size:.82rem;background:var(--surface-2);border-color:var(--line)}\n.link-cell{display:flex;align-items:center;gap:2px;min-width:9rem}\n.link-cell input{font-size:.8rem;color:var(--muted)}\n.go{text-decoration:none;font-size:.95rem;padding:2px 6px;border-radius:6px;color:var(--accent)}\n.go:hover{background:var(--accent-soft)}\na.rlink{color:inherit;text-decoration-color:currentColor;text-underline-offset:3px}\n*{box-sizing:border-box}\n.rr-body{color:var(--fg);font-family:var(--ff-body);font-size:var(--fs);line-height:1.5;min-height:100%}\n.wrap{max-width:1560px;margin:0 auto;padding-inline:16px;padding-block:24px 64px}\nh1,h2,h3,.lbl,button,select,.tabs a,th{font-family:var(--ff-head)}\nh1{font-family:var(--ff-display);font-size:clamp(1.7rem,4vw,2.4rem);font-weight:400;margin:0;color:var(--accent);background:var(--title-grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-wrap:balance;letter-spacing:.01em}\nh2{font-size:1.25rem;font-weight:400;margin:0;color:var(--accent);text-wrap:balance}\nh3{font-size:1.05rem;font-weight:400;margin:0}\n.head{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:end;justify-content:space-between}\n.owner{display:flex;align-items:baseline;gap:6px;color:var(--muted);font-style:italic}\n.owner input{font:inherit;font-style:normal;color:var(--fg);background:transparent;border:0;border-bottom:1px dashed var(--line);padding:2px 4px;width:14ch}\n.status{font-family:var(--ff-head);font-size:.8rem;color:var(--muted);display:flex;gap:6px;align-items:center}\n.dot{width:8px;height:8px;border-radius:50%;background:var(--mint-fg)}\n.dot.local{background:var(--peach-fg)}\n.tabs{display:flex;flex-wrap:wrap;gap:4px 2px;margin-top:20px;border-bottom:1px solid var(--line)}\n.tabs a{padding:9px clamp(8px,1.1vw,14px);text-decoration:none;color:var(--muted);border-radius:var(--r) var(--r) 0 0;white-space:nowrap;font-size:.95rem;border:1px solid transparent;border-bottom:0;margin-bottom:-1px}\n.tabs a[aria-current=\"page\"]{color:var(--accent);background:var(--surface);border-color:var(--line)}\n.tabs a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--focus);outline-offset:2px}\n.panel{background:var(--surface);border:1px solid var(--line);border-top:0;border-radius:0 0 var(--r) var(--r);padding:20px clamp(12px,3vw,24px);display:grid;gap:24px}\n.banner{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;background:var(--gold-bg);color:var(--gold-fg);padding:10px 14px;border-radius:var(--r);font-size:.92rem}\n.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}\n.between{justify-content:space-between}\nbutton{font-size:.88rem;cursor:pointer;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--fg);padding:6px 14px;line-height:1.3}\nbutton:hover{border-color:var(--accent)}\nbutton.primary{background:var(--accent);border-color:var(--accent);color:var(--surface)}\nbutton.ghost{border-color:transparent;background:transparent;color:var(--muted);padding:4px 8px}\nbutton.ghost:hover{color:var(--rose-fg)}\nbutton.warn{background:var(--rose-bg);color:var(--rose-fg);border-color:var(--rose-fg)}\n.tbl-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r)}\ntable{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}\nth{font-weight:400;text-align:left;font-size:.8rem;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);background:var(--accent-soft);padding:9px 10px;white-space:nowrap}\ntd{padding:6px 10px;border-top:1px solid var(--line);vertical-align:middle}\ntd.num,th.num{text-align:right}\ntfoot td{font-family:var(--ff-head);background:var(--surface-2)}\ninput.cell,select.cell{font:inherit;color:inherit;background:transparent;border:1px solid transparent;border-radius:6px;padding:4px 6px;width:100%;min-width:0}\ninput.cell:hover,select.cell:hover{border-color:var(--line)}\ninput.cell:focus{background:var(--surface-2);border-color:var(--line)}\ninput.cell.num{text-align:right;width:7ch}\ninput[type=\"date\"].cell{min-width:9.5rem}\nselect.chip{appearance:none;-webkit-appearance:none;font-family:var(--ff-head);font-size:.85rem;border:0;border-radius:999px;padding:4px 12px;cursor:pointer;width:auto}\n.chip-s{display:inline-flex;align-items:center;gap:4px;font-family:var(--ff-head);font-size:.85rem;border-radius:999px;padding:3px 11px;white-space:nowrap}\n.t-rose{background:var(--rose-bg);color:var(--rose-fg)} .t-mint{background:var(--mint-bg);color:var(--mint-fg)}\n.t-peach{background:var(--peach-bg);color:var(--peach-fg)} .t-lilac{background:var(--lilac-bg);color:var(--lilac-fg)}\n.t-sage{background:var(--sage-bg);color:var(--sage-fg)} .t-sky{background:var(--sky-bg);color:var(--sky-fg)}\n.t-sand{background:var(--sand-bg);color:var(--sand-fg)} .t-gray{background:var(--gray-bg);color:var(--gray-fg)}\n.t-gold{background:var(--gold-bg);color:var(--gold-fg)} .t-terra{background:var(--terra-bg);color:var(--terra-fg)}\n.c-rose{color:var(--rose-fg)} .c-mint{color:var(--mint-fg)} .c-peach{color:var(--peach-fg)} .c-lilac{color:var(--lilac-fg)}\n.c-sage{color:var(--sage-fg)} .c-sky{color:var(--sky-fg)} .c-sand{color:var(--sand-fg)} .c-gray{color:var(--gray-fg)}\n.c-gold{color:var(--gold-fg)} .c-terra{color:var(--terra-fg)}\n.con{display:flex;flex-direction:column;gap:2px;min-width:14rem}\n.con-p{display:flex;align-items:center;gap:4px;min-width:0}\n.con-p input.cell{flex:1;min-width:0}\n.wheel{flex:none;width:22px;height:22px;border-radius:50%;padding:3px;cursor:pointer;background:conic-gradient(#e2546b,#f0a23b,#e8d54a,#6cc46a,#4bb3d6,#6a6fd6,#b45ad0,#e2546b);display:grid;place-items:center;position:relative}\n.wheel input{appearance:none;-webkit-appearance:none;width:16px;height:16px;border:2px solid var(--surface);border-radius:50%;padding:0;background:none;cursor:pointer}\n.wheel input::-webkit-color-swatch-wrapper{padding:0}\n.wheel input::-webkit-color-swatch{border:none;border-radius:50%}\n.wheel input::-moz-color-swatch{border:none;border-radius:50%}\n.wheel.unset input{opacity:0}\n.wheel.unset::after{content:\"\";position:absolute;inset:6px;border-radius:50%;background:var(--surface);pointer-events:none}\n.wheel:focus-within{outline:2px solid var(--focus);outline-offset:2px}\n.add2{font-size:.75rem;padding:2px 6px;white-space:nowrap;color:var(--accent)}\n.con input.cell{font-weight:600}\n\n.lim-over{background:var(--rose-bg);color:var(--rose-fg);border-radius:6px}\n.lim-soon{background:var(--peach-bg);color:var(--peach-fg);border-radius:6px}\n.legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}\n.legend .lbl{font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}\n.legend .chips{display:flex;flex-wrap:wrap;gap:6px}\n.alerts{display:grid;gap:6px}\n.alert{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px 12px;border-radius:var(--r);font-size:.92rem}\n.muted{color:var(--muted)}\n.small{font-size:.85rem}\n.empty{padding:20px;text-align:center;color:var(--muted);font-style:italic}\n.pjs{display:flex;flex-wrap:wrap;gap:6px}\n.pj-tab{border-radius:999px;padding:6px 14px;border:1px solid var(--line);font-family:var(--ff-head);font-size:.92rem;background:var(--surface);color:var(--fg);cursor:pointer}\n.pj-tab[aria-pressed=\"true\"]{border-color:currentColor;box-shadow:inset 0 0 0 1px currentColor}\n.pj-head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:14px;border-radius:var(--r)}\n.pj-head input{font-family:var(--ff-head);font-size:1.15rem;color:inherit;background:transparent;border:0;border-bottom:1px dashed currentColor;padding:2px 4px;width:12ch}\n.pj-head input.emo{width:3ch;text-align:center}\n.swatches{display:flex;gap:5px;flex-wrap:wrap}\n.sw{width:22px;height:22px;border-radius:50%;border:2px solid var(--surface);padding:0;box-shadow:0 0 0 1px var(--line)}\n.sw[aria-pressed=\"true\"]{box-shadow:0 0 0 2px var(--fg)}\n.counts{font-family:var(--ff-head);font-size:.9rem;display:flex;flex-wrap:wrap;gap:6px 14px}\n.turn-grid{display:flex;flex-wrap:wrap;gap:3px;width:calc(12 * 28px + 11 * 3px)}\n/* Tablas anchas sin scroll: columnas fijas en pantallas grandes, tarjetas en pantallas angostas */\ntable.stack{table-layout:fixed}\ntable.stack td{overflow:hidden}\ntable.stack .cell{min-width:0!important}\ntable.stack select.chip{max-width:100%;text-overflow:ellipsis}\ntable.stack .con{min-width:0}\ntable.stack .link-cell{min-width:0}\ntable.stack input[type=\"date\"].cell{min-width:0;font-size:.9em;padding-inline:2px}\n@media (max-width:980px){\n  .tbl-wrap:has(table.stack){overflow:visible;border:0}\n  table.stack,table.stack tbody{display:block}\n  table.stack thead{display:none}\n  table.stack tr{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:4px 12px;padding:12px 40px 12px 12px;border:var(--bw) solid var(--line);border-radius:var(--r);margin-bottom:10px;position:relative;background:var(--surface)}\n  table.stack td{display:block;border:0;padding:0;overflow:visible}\n  table.stack td[data-l]::before{content:attr(data-l);display:block;font-family:var(--ff-head);font-size:.7rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:2px 6px 0}\n  table.stack td.wide{grid-column:1/-1}\n  table.stack td.del{position:absolute;top:6px;right:4px}\n  table.stack td.empty{grid-column:1/-1}\n}\n.tc{width:28px;height:28px;border-radius:6px;border:1px solid var(--line);padding:0;font-size:.75rem;display:grid;place-items:center;flex:none}\n.tc.s-sin{background:var(--surface);color:var(--muted)}\n.gan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:16px}\n.card{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;min-width:0}\n.card-h{padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-family:var(--ff-head)}\n.card table td{padding:4px 8px}\n.big{font-family:var(--ff-head);font-size:1.6rem;color:var(--accent)}\n.code-box{width:100%;min-height:90px;font-family:ui-monospace,monospace;font-size:.78rem;background:var(--surface-2);color:var(--fg);border:1px solid var(--line);border-radius:var(--r);padding:10px}\ndetails summary{cursor:pointer;font-family:var(--ff-head);color:var(--accent)}\n.toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--fg);color:var(--bg);font-family:var(--ff-head);padding:8px 16px;border-radius:999px;font-size:.88rem}\n@media (prefers-reduced-motion:no-preference){.tc,button,select.chip{transition:background .15s,border-color .15s}}\n\n/* ===== Integraci\u00f3n en PAM ===== */\n:host([data-skin=\"avadense\"]){\n  --bg:var(--ink,#171a2b); --surface:var(--panel,#1e2236); --surface-2:var(--panel-2,#262a42); --line:#383d5a; --fg:var(--parchment,#F1EADF); --muted:var(--parchment-dim,#a7a1b6);\n  --accent:var(--gold-bright,#d6bd8f); --accent-soft:#2d2c40; --focus:var(--gold,#B49768);\n  --title-grad:linear-gradient(90deg,#d6bd8f,#cf94a3);\n  --ff-display:\"Cormorant Garamond\",Georgia,serif; --ff-head:\"Nunito\",system-ui,sans-serif; --ff-body:\"Nunito\",system-ui,sans-serif; --fs:15px;\n  --rose-bg:#4A2633; --rose-fg:#F4B9CB; --mint-bg:#1F3D33; --mint-fg:#A8E0C6;\n  --peach-bg:#4A3215; --peach-fg:#FFCB85; --lilac-bg:#392D4F; --lilac-fg:#D3C1F2;\n  --sage-bg:#2A3A27; --sage-fg:#BFD6AE; --sky-bg:#1F3542; --sky-fg:#A9D4EC;\n  --sand-bg:#3A3124; --sand-fg:#E1CBA8; --gray-bg:#33313D; --gray-fg:#C5C3D4;\n  --gold-bg:#433715; --gold-fg:#F1D686; --terra-bg:#4A2A22; --terra-fg:#F4B7A3;\n  color-scheme:dark}\n:host([data-skin=\"avadense\"]) button.primary{color:#1b1e30}\n.rr-body{font-family:var(--ff-body);font-size:var(--fs);line-height:1.5}\n.wrap{max-width:1240px;padding-inline:24px;padding-block:24px 40px}\n.wrap>.head,#skins,#tabs,#fx,#pumpkins{display:none!important}\n#panel{border-top:var(--bw,1px) solid var(--line);border-radius:var(--r)}\n@media (max-width:520px){.wrap{padding-inline:12px}}\n"+'</style>'+"<div class=\"rr-body\"><div id=\"pumpkins\"><\/div>\n<div class=\"wrap\">\n  <header class=\"head\">\n    <div>\n      <h1 id=\"titulo\">\ud83c\udf37 Registro de Roles \ud83c\udf37<\/h1>\n      <label class=\"owner\" for=\"owner\">de <input id=\"owner\" placeholder=\"tu nombre\"><\/label>\n    <\/div>\n    <div class=\"row\" style=\"gap:10px\"><button class=\"mini-face\" id=\"miniFace\" title=\"\u00bfC\u00f3mo vas con los roles?\" aria-label=\"Ver c\u00f3mo vas con los roles\">\ud83d\ude42<\/button><div class=\"status\" id=\"status\"><span class=\"dot local\"><\/span><span>Guardado en este navegador<\/span><\/div><\/div>\n  <\/header>\n  <div class=\"skins\" id=\"skins\" role=\"group\" aria-label=\"Tema\"><\/div>\n  <nav class=\"tabs\" id=\"tabs\" aria-label=\"Secciones\">\n    <a href=\"#inicio\" data-tab=\"inicio\">\ud83e\uddfa Inicio<\/a>\n    <a href=\"#personajes\" data-tab=\"personajes\">\ud83e\uddd1\u200d\ud83c\udfa8 Personajes<\/a>\n    <a href=\"#turnos\" data-tab=\"turnos\">\ud83c\udfae Control de turnos<\/a>\n    <a href=\"#oficiales\" data-tab=\"oficiales\">\ud83c\udf80 Posibles oficiales<\/a>\n    <a href=\"#ganancias\" data-tab=\"ganancias\">\ud83c\udf6f Ganancias<\/a>\n    <a href=\"#boveda\" data-tab=\"boveda\">\ud83c\udfe6 B\u00f3veda<\/a>\n    <a href=\"#canjes\" data-tab=\"canjes\">\ud83c\udf81 Futuros canjes<\/a>\n    <a href=\"#coloreador\" data-tab=\"coloreador\">\ud83d\udd8b\ufe0f Coloreador<\/a>\n    <a href=\"#copia\" data-tab=\"copia\">\ud83d\udce5 Importar y copia<\/a>\n  <\/nav>\n  <main class=\"panel\" id=\"panel\"><\/main>\n  <section id=\"coloreador\" class=\"cd-panel\" hidden>\n  <header>\n    <div>\n      <h2 class=\"cd-h\">\ud83d\udd8b\ufe0f Coloreador de Di\u00e1logos <span class=\"raya\">\u2014<\/span><\/h2>\n      <p class=\"sub\">Peg\u00e1 tu post, eleg\u00ed el color del personaje y copi\u00e1 el BBCode. Detecta rayas, guiones y comillas, y deja afuera los incisos del narrador.<\/p>\n    <\/div>\n    <div class=\"cd-legend\"><b>\u2014Di\u00e1logo<\/b> \u2014dijo el narrador\u2014<b>. M\u00e1s di\u00e1logo.<\/b><\/div>\n  <\/header>\n\n  <div class=\"grid\">\n    <div class=\"col\">\n      <section class=\"panel\">\n        <div class=\"label\"><label for=\"cd-src\">Texto sin c\u00f3digo<\/label><button id=\"cd-clear\" type=\"button\" style=\"padding:4px 10px;font-size:12px\">Borrar<\/button><\/div>\n        <textarea id=\"cd-src\" spellcheck=\"false\">\u2014Nombres\u2026 \u2014repiti\u00f3, frunciendo el ce\u00f1o mientras rebuscaba en lo que le hab\u00eda rozado la cabeza\u2014. Eran fragmentos, Miss Alpha. Dos o tres s\u00edlabas sueltas, como si alguien pronunciara un nombre desde muy lejos. Nada que pueda decirte con certeza que sea de un culpable y no de una v\u00edctima. \u2014Hizo una mueca de frustraci\u00f3n, de las que le sal\u00edan cuando algo se le escapaba\u2014. Lo anotar\u00e9 en cuanto pueda, aunque sea incompleto. A veces lo que no se entiende hoy encaja ma\u00f1ana.<\/textarea>\n      <\/section>\n\n      <section class=\"panel\">\n        <div class=\"label\"><label for=\"cd-tag\">C\u00f3digo de color<\/label><\/div>\n        <div class=\"colorrow\">\n          <label class=\"swatch\" title=\"Elegir color\"><span id=\"cd-swatchFill\"><\/span><input type=\"color\" id=\"cd-picker\" value=\"#e8c468\" aria-label=\"Elegir color\"><\/label>\n          <input type=\"text\" id=\"cd-tag\" value=\"[color=#E8C468] [/color]\" spellcheck=\"false\">\n        <\/div>\n        <p class=\"hint\">Acepta <code>[color=#E8C468] [/color]<\/code>, solo <code>#E8C468<\/code>, o etiquetas combinadas como <code>[color=#E8C468][i] [/i][/color]<\/code>.<\/p>\n        <div class=\"recent\" id=\"cd-recent\"><\/div>\n        <div class=\"fmt\" id=\"cd-dlgFmt\"><span class=\"lbl\">Formato del di\u00e1logo<\/span><\/div>\n      <\/section>\n\n      <section class=\"panel\">\n        <div class=\"label\">Nombres por grupo<span class=\"count\" id=\"cd-ncount\">0 nombres<\/span><\/div>\n        <div class=\"names\" id=\"cd-names\"><\/div>\n        <div class=\"actions\"><button type=\"button\" id=\"cd-addName\">+ Agregar nombre<\/button><\/div>\n        <p class=\"hint\">Escrib\u00ed un nombre (Maximilian, Blake\u2026) y eleg\u00ed su grupo, toc\u00e1 el cuadrito para un color propio, o eleg\u00ed \u00abSin color\u00bb para dejarlo solo en negrita, cursiva, etc. Todas las veces que aparezca en el texto sale con ese color y formato, tambi\u00e9n dentro de los di\u00e1logos.<\/p>\n      <\/section>\n\n      <section class=\"panel\">\n        <div class=\"label\">Marcas especiales<span class=\"count\" id=\"cd-mcount\">0 marcas<\/span><\/div>\n        <ol class=\"howto\">\n          <li>Eleg\u00ed el s\u00edmbolo que us\u00e1s en tu texto, por ejemplo <code>*asteriscos*<\/code> para pensamientos.<\/li>\n          <li>Eleg\u00ed el color (o \u00abSin color\u00bb) y el formato con B, I, U, S.<\/li>\n          <li>Marc\u00e1 <b>Quitar s\u00edmbolos<\/b> si quer\u00e9s que los <code>*<\/code> desaparezcan del resultado.<\/li>\n          <li>Ejemplo: <code>*No otra vez*<\/code> \u2192 <code>[color=#B9A6D9][i]No otra vez[/i][/color]<\/code><\/li>\n        <\/ol>\n        <div class=\"names\" id=\"cd-marks\"><\/div>\n        <div class=\"actions\"><button type=\"button\" id=\"cd-addMark\">+ Agregar marca<\/button><\/div>\n        <p class=\"hint\">Las marcas se aplican antes que los di\u00e1logos: si eleg\u00eds comillas ac\u00e1, esas comillas dejan de contar como di\u00e1logo. Lo marcado no puede ocupar m\u00e1s de una l\u00ednea.<\/p>\n      <\/section>\n\n      <section class=\"panel\">\n        <div class=\"label\">Qu\u00e9 cuenta como di\u00e1logo<\/div>\n        <div class=\"opts\">\n          <label><input type=\"checkbox\" id=\"cd-optRaya\" checked> Raya (\u2014 \u2013)<\/label>\n          <label><input type=\"checkbox\" id=\"cd-optGuion\" checked> Guion (-)<\/label>\n          <label><input type=\"checkbox\" id=\"cd-optComillas\" checked> Comillas (\" \" \u201c \u201d \u00ab \u00bb)<\/label>\n          <label><input type=\"checkbox\" id=\"cd-optFix\"> Convertir guiones en raya<\/label>\n          <label><input type=\"checkbox\" id=\"cd-optCenter\"> Centrar todo el texto [center]<\/label>\n        <\/div>\n        <p class=\"hint\">El centrado va sobre el post entero: si se aplica a un tramo suelto, el foro lo parte en otra l\u00ednea.<\/p>\n      <\/section>\n    <\/div>\n\n    <div class=\"col\">\n      <section class=\"panel\">\n        <div class=\"label\"><label for=\"cd-out\">Resultado con c\u00f3digo<\/label><span class=\"count\" id=\"cd-count\">0 tramos<\/span><\/div>\n        <textarea id=\"cd-out\" class=\"code\" readonly spellcheck=\"false\"><\/textarea>\n        <div class=\"actions\">\n          <button class=\"primary\" id=\"cd-copy\" type=\"button\">Copiar c\u00f3digo<\/button>\n          <span class=\"status\" id=\"cd-status\" role=\"status\"><\/span>\n        <\/div>\n      <\/section>\n\n      <section class=\"panel\">\n        <div class=\"label\">Vista previa\n          <span class=\"seg\" role=\"group\" aria-label=\"Fondo de la vista previa\">\n            <button type=\"button\" id=\"cd-bgImg\" aria-pressed=\"true\">Foro<\/button>\n            <button type=\"button\" id=\"cd-bgDark\" aria-pressed=\"false\">Oscuro<\/button>\n            <button type=\"button\" id=\"cd-bgLight\" aria-pressed=\"false\">Claro<\/button>\n          <\/span>\n          <label class=\"uploadbtn\">Otro fondo<input type=\"file\" id=\"cd-bgFile\" accept=\"image/*\"><\/label>\n        <\/div>\n        <div class=\"preview img\" id=\"cd-preview\"><\/div>\n      <\/section>\n    <\/div>\n  <\/div>\n\n  <footer>\n    Reglas: una raya al inicio del p\u00e1rrafo (o despu\u00e9s de punto o dos puntos) abre di\u00e1logo; la siguiente raya abre el inciso del narrador y la que lo cierra devuelve al di\u00e1logo, con la puntuaci\u00f3n pegada dentro del color. Una raya en medio de narraci\u00f3n se toma como aclaraci\u00f3n, no como di\u00e1logo. Los guiones dentro de palabras (<code>anti-muggle<\/code>) se ignoran.\n  <\/footer>\n<\/section>\n<\/div>\n<div class=\"toast\" id=\"toast\" hidden><\/div>\n<div id=\"party\" aria-hidden=\"true\"><\/div><\/div>";
RR.appendChild(Object.assign(document.createElement("style"),{textContent:`
.bov-tipo{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 14px}
.bov-tipo button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--surface)}
:host([data-skin="avadense"]) .bov-tipo button[aria-pressed="true"]{color:#1b1e30}
.lg-k{font-family:var(--ff-head);font-size:.72rem;letter-spacing:.06em;padding:1px 6px;border-radius:999px;background:var(--gold-bg);color:var(--gold-fg)}
.lg-inv{flex:1;min-width:0;white-space:pre-wrap}`}));
const syncSkin=()=>{host.dataset.skin=document.documentElement.dataset.skin||"avadense";};
syncSkin(); new MutationObserver(()=>{syncSkin(); if(window.rrRender) try{window.rrRender();}catch(e){}}).observe(document.documentElement,{attributes:true,attributeFilter:["data-skin"]});

(()=>{
const TIPOS=[["Oficial","terra","🎓"],["Acontecimiento","sage","🎉"],["Gesta","gold","⚔️"],["Evento","lilac","🎪"],["Misión","sage","🗺️"],["Clases","sky","📚"],["Libre","sand","🌼"],["Grupal","gray","👥"]];
const ESTADOS=[["Sin Contestar","rose","📪"],["Contestado","mint","✅"],["Pausado","peach","⏸️"],["Terminado","lilac","🏁"]];
const CASA_HEX={"slytherin":"#3F5B41","ravenclaw":"#3B6E8C","hufflepuff":"#8A6A1F","gryffindor":"#9B4A5F"}; /* solo para pasar datos viejos (casas) a colores */
const TURNOS=[["Sin Postear","sin","·"],["Rápido","mint","⚡"],["Normal","lilac","🌸"],["Lento","sky","🐌"],["Falta Justificada","peach","FJ"],["Falta Injustificada","rose","FI"]];
const TONOS=["mint","sky","terra","gold","lilac","rose","sage","peach","sand","gray"];
const OF_EST=[["Disponible","mint","🌸"],["Ocupado","rose","💌"]];
const GEST=[["Cobrado","mint","✓"],["Sin Cobrar","peach","…"]];
const KEY="registro-roles-v1";
const SKINS=[
 {id:"pastel",nombre:"Pastel Core",orn:"🌷",sw:"linear-gradient(135deg,#D9F0E4,#E7DCF5 50%,#F7D6E0)",fx:["🌷","🌿","🍬","🌼","🧺"]},
 {id:"magic",nombre:"Magic Girl",orn:"🦋",sw:"linear-gradient(135deg,#6B62AE,#9B80A5 50%,#D6A6B9)",fx:["🦋","✦","🌙","💎","🌸","🫧","✨","🎀"]},
 {id:"terror",nombre:"Gothic Horror",orn:"🕯️",sw:"linear-gradient(135deg,#241C29,#4A2638 50%,#8A3D4F)",fx:["🕯️","🥀","🦇","🕸️","🩸","🗝️","🌙"]},
 {id:"neutro",nombre:"Elegant Minimal",orn:"✦",sw:"linear-gradient(135deg,#F4F0EA,#B8AEA5 50%,#3F3D3B)",fx:["🪶","✦","🤍","🌾","🕯️"]},
 {id:"magico",nombre:"Enchanted Fantasy",orn:"🔮",sw:"linear-gradient(135deg,#201B3A,#8065A5 55%,#E4D19A)",fx:["✨","💫","🔮","🌙","🪶","🦋","💎","🍄"]},
 {id:"pixel",nombre:"Pixel Core",orn:"⭐",sw:"linear-gradient(135deg,#9B527A,#71936B 50%,#F0CF88)",fx:["⭐","🍄","🌸","💎","🧪","🪙","✨","🍓"]},
 {"id": "peony", "nombre": "Peony Garden", "orn": "🌸", "sw": "linear-gradient(135deg,#9DAA85,#D8C595 35%,#E6AEA4 70%,#8E5963)", "fx": ["🌸", "🌷", "🍃", "🌼"]},
 {"id": "matcha", "nombre": "Matcha Latte", "orn": "🍵", "sw": "linear-gradient(135deg,#ABBF9B,#E4CDB0 45%,#A2663C 75%,#3F1D0E)", "fx": ["🍵", "☕", "🥛", "🍃", "🧋"]},
 {"id": "lotus", "nombre": "Lotus Pond", "orn": "🪷", "sw": "linear-gradient(135deg,#0F2E23,#798F53 40%,#C88582 70%,#1B5B65)", "fx": ["🪷", "✨", "🍃", "💧", "🌸"]},
 {"id": "buttercup", "nombre": "Buttercup Morning", "orn": "🌼", "sw": "linear-gradient(135deg,#FFF2B2,#FFE08A 40%,#A8C6E7 70%,#7FA8D6)", "fx": ["🌼", "☁️", "☀️", "🧺", "🌾"]},
 {"id": "velvet", "nombre": "Velvet Library", "orn": "📚", "sw": "linear-gradient(135deg,#1A0D0E,#45171B 35%,#733438 65%,#D5BCB5)", "fx": ["📚", "🕯️", "🥀", "🗝️", "📜"]},
 {"id": "berries", "nombre": "Winter Berries", "orn": "🍒", "sw": "linear-gradient(135deg,#0B2224,#336269 40%,#93D4D8 70%,#941D1D)", "fx": ["🍒", "❄️", "🍃", "🫐"]},
 {"id": "tealplum", "nombre": "Teal & Plum", "orn": "🍷", "sw": "linear-gradient(135deg,#0F4448 0 50%,#7A2A5A 50% 100%)", "fx": ["🍷", "🌺", "🕯️", "📕", "🫖"]},
 {"id": "bubble", "nombre": "Bubble Dream", "orn": "🫧", "sw": "linear-gradient(135deg,#102B53,#4E7AB1 40%,#CEB5D4 70%,#7D9FC0)", "fx": ["🫧", "✨", "💫", "🫧", "💜"]}];
const skinOf=()=>SKINS.find(k=>k.id===document.documentElement.dataset.skin)||{id:"avadense",nombre:"Avadense",orn:"✦",fx:["✦","☾","✧","✨"]};
const safeUrl=u=>{u=String(u||"").trim();if(!u)return"";if(!/^https?:\/\//i.test(u))u="https://"+u;try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:"";}catch(_){return"";}};
function linkCell(v,attr){const u=safeUrl(v);return `<div class="link-cell"><input class="cell" ${attr} value="${esc(v||"")}" placeholder="pegá el enlace" aria-label="Enlace">${u?`<a class="go" href="${esc(u)}" target="_blank" rel="noopener" title="Abrir el tema" aria-label="Abrir enlace">↗</a>`:""}</div>`;}
let fxFor=null, skinsOpen=false;
function applySkin(){ renderPumpkins(); }
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const find=(list,v)=>list.find(x=>x[0]===v)||list[0];

function ejemplo(){
  const fj=[{id:uid(),nombre:"💰 Sueldo mensual",monto:125},{id:uid(),nombre:"📰 Columna en el periódico",monto:75}];
  return {v:1,ejemplo:true,owner:"",skin:"pastel",
    personajes:[
      {id:uid(),nombre:"Personaje 1",emoji:"🌿",tono:"mint",wishCfg:{esp:1},wish:[{id:uid(),cat:"talento",n:"Aparecerse",g:200,pl:0,req:"Poder 2 y 17 años",prio:"alta",hecho:false},{id:uid(),cat:"atributo",n:"Poder 2 → 3",g:400,pl:0,req:"Necesitás el límite de STAT a 3",prio:"alta",hecho:false},{id:uid(),cat:"hechizo",n:"Hechizo intermedio: Expelliarmus",g:300,pl:0,req:"Necesitás un arcano básico por cada intermedio",prio:"media",hecho:false},{id:uid(),cat:"objeto",n:"Objeto avanzado: Capa de Invisibilidad",g:600,pl:0,req:"",prio:"baja",hecho:false}],boveda:{ini:35,tot:27314,act:35,plt:0,pla:0,l1:"https://hp-avada-kedavra.foroactivo.com/t35871-boveda-990#677949",l2:"https://hp-avada-kedavra.foroactivo.com/t35871p60-boveda-990#734794",l3:"https://hp-avada-kedavra.foroactivo.com/t35871p60-boveda-990#716416",delta:"+125",enl:""},
       roles:[
        {id:uid(),nombre:"Entre jardines (ejemplo)",con:"Nombre del compañero",color:"#3B6E8C",con2:"Otro PJ",color2:"#C0587E",dos:true,tipo:"Libre",fecha:"Marzo 2033",estado:"Contestado",limite:"",enlace:"https://hp-avada-kedavra.foroactivo.com"},
        {id:uid(),nombre:"Trama grupal (ejemplo)",con:"Grupal",color:"",tipo:"Grupal",fecha:"Agosto 2033",estado:"Sin Contestar",limite:fechaISO(2)},
        {id:uid(),nombre:"Rol oficial (ejemplo)",con:"Otro personaje",color:"#9B4A5F",tipo:"Oficial",fecha:"Octubre 2033",estado:"Terminado",limite:""}],
       ganancias:[{id:uid(),concepto:"💰 Sueldo mensual",monto:0,fijo:fj[0].id,estado:"Cobrado"},{id:uid(),concepto:"⭐ Puntos",monto:90,fijo:"",estado:"Cobrado"},{id:uid(),concepto:"✨ Extras",monto:20,fijo:"",estado:"Sin Cobrar"}]},
      {id:uid(),nombre:"Personaje 2",emoji:"🦊",tono:"terra",
       roles:[{id:uid(),nombre:"Una misión (ejemplo)",con:"Grupal",color:"",tipo:"Misión",fecha:"",estado:"Pausado",limite:fechaISO(-1)}],
       ganancias:[{id:uid(),concepto:"📚 Clases",monto:40,fijo:"",estado:"Sin Cobrar"},{id:uid(),concepto:"📰 Periódico",monto:0,fijo:fj[1].id,estado:"Cobrado"}]}],
    fijos:fj,
    turnos:{tarifas:{rapido:25,normal:20,lento:15,falta:20},
      misiones:[{id:uid(),nombre:"Misión de ejemplo",faltasMaster:0,n:12,t:["Rápido","Rápido","Normal","Rápido","Normal","Lento"]}]},
    oficiales:[{id:uid(),nombre:"Título del oficial (ejemplo)",relacion:"Tema / trama",fecha:"2029-03-21",estado:"Disponible"},{id:uid(),nombre:"Otro oficial (ejemplo)",relacion:"San Mungo",fecha:"2029-06-14",estado:"Ocupado"}]};
}
function vacio(){return {v:1,ejemplo:false,owner:S.owner||"",skin:S.skin||"pastel",personajes:[nuevoPj("Mi personaje","🌷","lilac")],fijos:[{id:uid(),nombre:"💰 Sueldo mensual",monto:125}],turnos:{tarifas:{rapido:25,normal:20,lento:15,falta:20},misiones:[]},oficiales:[]};}
function nuevoPj(n,e,t){return {id:uid(),nombre:n,emoji:e,tono:t,roles:[],ganancias:[{id:uid(),concepto:"💰 Sueldo mensual",monto:0,fijo:"",estado:"Sin Cobrar"},{id:uid(),concepto:"⭐ Puntos",monto:0,fijo:"",estado:"Sin Cobrar"}]};}
function fechaISO(d){const x=new Date();x.setDate(x.getDate()+d);return x.toISOString().slice(0,10);}

let S=ejemplo();
let tab="inicio", pjSel=null, store={kind:"local"};

/* ---------- guardado ---------- */
function loadLocal(){try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(d&&d.personajes)return d;}}catch(e){}return null;}
let saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(doSave,700);}
async function doSave(){
  try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}
  if(store.kind==="db"){try{await store.ref.set({data:JSON.stringify(S),at:Date.now()});}catch(e){store={kind:"local"};setStatus();}}
}
function setStatus(){
  const el=RR.getElementById("status");
  el.innerHTML=store.kind==="db"?'<span class="dot"></span><span>Guardado en tu cuenta</span>':'<span class="dot local"></span><span>Guardando en este navegador</span>';
}
async function initDb(){
  try{
    if(!window.claude?.use)return;
    const [db,user]=await Promise.all([claude.use("db"),claude.use("user")]);
    if(!db||!user)return;
    const id=await user.id(); if(!id)return;
    const ref=db.doc("data/users/"+id+"/registro");
    const snap=await ref.get();
    const body=snap&&snap.exists?snap.data():null;
    if(body&&body.data){
      const d=JSON.parse(body.data); if(d&&d.personajes){S=d;pjSel=null;}
    }else{
      const loc=loadLocal(); if(loc)S=loc;
      await ref.set({data:JSON.stringify(S),at:Date.now()});
    }
    store={kind:"db",ref};setStatus();render();
  }catch(e){/* sigue en el navegador */}
}

/* ---------- utilidades ---------- */
function toast(m){const t=RR.getElementById("toast");t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2200);}
let linkOpen=null;
function tituloRol(r){const u=safeUrl(r.enlace);
  return `<div class="tit"><input class="cell" data-f="nombre" value="${esc(r.nombre)}" aria-label="Nombre de rol" placeholder="Nombre del rol (podés pegar el enlace acá)">${u?`<a class="go-tab" href="${esc(u)}" target="_blank" rel="noopener" title="Abrir el rol en el foro">↗ Ir al rol</a>`:""}<button class="ghost lnk-btn${linkOpen===r.id?" on":""}" data-act="lnk" title="${u?"Cambiar el enlace del rol":"Agregar el enlace del rol"}" aria-label="${u?"Cambiar enlace":"Agregar enlace"}" aria-expanded="${linkOpen===r.id}">🔗</button></div>${linkOpen===r.id?`<div class="lnk-edit"><input class="cell" data-f="enlace" value="${esc(r.enlace||"")}" placeholder="Pegá el enlace del tema en el foro" aria-label="Enlace del rol"><button class="ghost" data-act="lnkOk">Listo</button></div>`:""}`;}
function conRow(nombre,color,fN,fC,ph,extra){const has=/^#[0-9a-f]{6}$/i.test(color||"");
  return `<div class="con-p"><label class="wheel${has?"":" unset"}" title="Elegir color"><input type="color" data-f="${fC}" value="${has?color:"#ffffff"}" aria-label="Color de ${ph}"></label><input class="cell" data-f="${fN}" value="${esc(nombre||"")}" aria-label="${ph}" placeholder="${ph}"${has?` style="color:${color}"`:""}>${extra||""}</div>`;}
function migrar(){S.personajes.forEach(p=>p.roles.forEach(r=>{if(r.casa!==undefined){if(!r.color){const k=String(r.casa).toLowerCase().replace("ex-","");r.color=CASA_HEX[k]||"";}delete r.casa;}}));}
function opts(list,v){return list.map(([n,,e])=>`<option value="${esc(n)}"${n===v?" selected":""}>${e?e+" ":""}${esc(n||"— casa —")}</option>`).join("");}
function chipSel(list,v,attrs){const t=find(list,v)[1];return `<select class="cell chip t-${t}" ${attrs}>${opts(list,v)}</select>`;}
function chip(list,v,txt){const [n,t,e]=find(list,v);return `<span class="chip-s t-${t}">${e} ${esc(txt??n)}</span>`;}
function hoy(){const d=new Date();d.setHours(0,0,0,0);return d;}
function limEstado(r){if(!r.limite||r.estado==="Terminado")return"";const d=new Date(r.limite+"T00:00:00");const diff=(d-hoy())/864e5;if(diff<0)return"over";if(diff<=3)return"soon";return"";}
function cuenta(pj){const c={};ESTADOS.forEach(([n])=>c[n]=0);pj.roles.forEach(r=>c[r.estado]=(c[r.estado]||0)+1);return c;}
function montoG(g){if(g.fijo){const f=S.fijos.find(x=>x.id===g.fijo);return f?+f.monto||0:0;}return +g.monto||0;}
function totalPj(pj){let cob=0,pend=0;pj.ganancias.forEach(g=>{const m=montoG(g);g.estado==="Cobrado"?cob+=m:pend+=m;});return {cob,pend};}
function pjById(id){return S.personajes.find(p=>p.id===id);}
function armDelete(btn,fn){if(btn.dataset.armed){fn();return;}btn.dataset.armed="1";const old=btn.innerHTML;btn.textContent="¿Borrar?";btn.classList.add("warn");setTimeout(()=>{if(btn.isConnected){delete btn.dataset.armed;btn.innerHTML=old;btn.classList.remove("warn");}},3000);}

/* ---------- vistas ---------- */
const V={};
V.inicio=()=>{
  const filas=S.personajes.map(p=>{const c=cuenta(p),g=totalPj(p);return `<tr>
    <td><span class="chip-s t-${p.tono}">${esc(p.emoji)} ${esc(p.nombre)}</span></td>
    ${ESTADOS.map(([n])=>`<td class="num">${n==="Sin Contestar"&&c[n]>0?`<span class="chip-s t-rose">${c[n]}</span>`:c[n]}</td>`).join("")}
    <td class="num">${p.roles.length}</td><td class="num">${g.cob}</td></tr>`;}).join("");
  const tot=ESTADOS.map(([n])=>S.personajes.reduce((a,p)=>a+cuenta(p)[n],0));
  const totR=S.personajes.reduce((a,p)=>a+p.roles.length,0), totG=S.personajes.reduce((a,p)=>a+totalPj(p).cob,0);
  const alerts=[];S.personajes.forEach(p=>p.roles.forEach(r=>{const l=limEstado(r);if(l)alerts.push({p,r,l});}));
  alerts.sort((a,b)=>a.r.limite.localeCompare(b.r.limite));
  return `
  ${moodCard()}
  ${S.ejemplo?`<div class="banner"><span>🌱 Estás viendo datos de ejemplo. Editalos encima o empezá con la plantilla en blanco.</span><span class="row"><button data-act="toImport">📥 Importar mi Excel</button><button data-act="keep">Usar el ejemplo</button><button class="primary" data-act="blank">Empezar en blanco</button></span></div>`:""}
  <section style="display:grid;gap:10px"><h2>🧺 Resumen por personaje</h2>
  <div class="tbl-wrap"><table><thead><tr><th>Personaje</th>${ESTADOS.map(([n,,e])=>`<th class="num">${e} ${n}</th>`).join("")}<th class="num">📚 Total</th><th class="num">🍬 Grageas del mes</th></tr></thead>
  <tbody>${filas||`<tr><td colspan="7" class="empty">Todavía no hay personajes. Creá uno en la pestaña Personajes.</td></tr>`}</tbody>
  <tfoot><tr><td>✨ Total</td>${tot.map(x=>`<td class="num">${x}</td>`).join("")}<td class="num">${totR}</td><td class="num">${totG}</td></tr></tfoot></table></div></section>
  <section style="display:grid;gap:10px"><h2>⏳ Fechas límite</h2>
  ${alerts.length?`<div class="alerts">${alerts.map(({p,r,l})=>`<div class="alert ${l==="over"?"t-rose":"t-peach"}"><strong>${l==="over"?"⌛ Vencido":"⏳ Pronto"}</strong><span>${safeUrl(r.enlace)?`<a class="rlink" href="${esc(safeUrl(r.enlace))}" target="_blank" rel="noopener">${esc(r.nombre)}</a>`:esc(r.nombre)}</span><span class="small">· ${esc(p.emoji)} ${esc(p.nombre)} · ${fmtFecha(r.limite)}</span></div>`).join("")}</div>`
   :`<p class="muted small" style="margin:0">Nada vencido ni por vencer en los próximos 3 días. Las fechas límite se cargan en cada rol.</p>`}
  </section>
  <section style="display:grid;gap:10px"><h2>🎨 Leyenda de colores</h2>
  <div class="legend">
    <div><div class="lbl">🏷️ Tipo de rol</div><div class="chips">${TIPOS.map(([n])=>chip(TIPOS,n)).join("")}</div></div>
    <div><div class="lbl">🌤️ Estado</div><div class="chips">${ESTADOS.map(([n])=>chip(ESTADOS,n)).join("")}<span class="chip-s t-rose">⌛ Límite vencido</span><span class="chip-s t-peach">⏳ Límite ≤ 3 días</span></div></div>
    <div><div class="lbl">🎨 Color de cada compañero</div><p class="small muted" style="margin:0">Tocá la ruedita al lado del nombre en «Con» para elegirle un color. Con «+ PJ» sumás un segundo compañero con su propio color.</p></div>
  </div></section>`;
};
function fmtFecha(iso){if(!iso)return"";const [y,m,d]=iso.split("-");return `${d}/${m}/${y}`;}

V.personajes=()=>{
  if(!pjSel||!pjById(pjSel))pjSel=S.personajes[0]?.id||null;
  const p=pjById(pjSel);
  const sel=`<div class="row between"><div class="pjs">${S.personajes.map(x=>`<button class="pj-tab c-${x.tono}" aria-pressed="${x.id===pjSel}" data-act="pj" data-id="${x.id}">${esc(x.emoji)} ${esc(x.nombre)}</button>`).join("")}</div><button class="primary" data-act="addPj">+ Personaje</button></div>`;
  if(!p)return sel+`<p class="empty">Agregá tu primer personaje para empezar a anotar sus roles.</p>`;
  const c=cuenta(p);
  const filas=p.roles.map(r=>{const l=limEstado(r);return `<tr data-rid="${r.id}">
    <td class="wide" data-l="📖 Nombre de rol">${tituloRol(r)}</td>
    <td data-l="💌 Con"><div class="con">${conRow(r.con,r.color,"con","color","Con quién",r.dos?"":`<button class="ghost add2" data-act="add2" title="Sumar otro PJ a este rol" aria-label="Sumar otro PJ">+ PJ</button>`)}${r.dos?conRow(r.con2,r.color2,"con2","color2","Otro PJ",`<button class="ghost" data-act="del2" title="Quitar este PJ" aria-label="Quitar segundo PJ">✕</button>`):""}</div></td>
    <td data-l="🏷️ Tipo">${chipSel(TIPOS,r.tipo,'data-f="tipo" aria-label="Tipo de rol"')}</td>
    <td data-l="🗓️ Fecha"><input class="cell" style="min-width:8rem" data-f="fecha" value="${esc(r.fecha)}" aria-label="Fecha" placeholder="Fecha en el rol"></td>
    <td data-l="🌤️ Estado">${chipSel(ESTADOS,r.estado,'data-f="estado" aria-label="Estado"')}</td>
    <td data-l="⏳ Fecha límite" class="${l?"lim-"+l:""}"><input type="date" class="cell" data-f="limite" value="${esc(r.limite)}" aria-label="Fecha límite"></td>
    <td class="del"><button class="ghost" data-act="delRol" aria-label="Borrar rol">✕</button></td></tr>`;}).join("");
  return sel+`
  <div class="pj-head t-${p.tono}">
    <input class="emo" data-pf="emoji" value="${esc(p.emoji)}" aria-label="Emoji" maxlength="4">
    <input data-pf="nombre" value="${esc(p.nombre)}" aria-label="Nombre del personaje">
    <div class="swatches" role="group" aria-label="Color">${TONOS.map(t=>`<button class="sw t-${t}" style="background:var(--${t}-fg)" aria-label="${t}" aria-pressed="${t===p.tono}" data-act="tono" data-t="${t}"></button>`).join("")}</div>
    <span style="flex:1"></span>
    <span class="small muted" title="El personaje se borra desde el selector de personajes de arriba">Se borra desde Mi Ficha</span>
  </div>
  <div class="counts">${ESTADOS.map(([n,t,e])=>`<span class="c-${t}">${e} ${n}: <strong>${c[n]}</strong></span>`).join("")}</div>
  <div class="tbl-wrap"><table class="stack"><thead><tr><th style="width:29%">📖 Nombre de rol</th><th style="width:23%">💌 Con</th><th style="width:11%">🏷️ Tipo</th><th style="width:11%">🗓️ Fecha</th><th style="width:12%">🌤️ Estado</th><th style="width:12%">⏳ Límite</th><th style="width:36px"></th></tr></thead>
  <tbody>${filas||`<tr><td colspan="8" class="empty">Sin roles todavía.</td></tr>`}</tbody></table></div>
  <div><button data-act="addRol">+ Agregar rol</button></div>`;
};

V.turnos=()=>{
  const T=S.turnos,tf=T.tarifas;
  const filas=T.misiones.map(m=>{
    const n=Math.max(1,Math.min(40,+m.n||12));const t=Array.from({length:n},(_,i)=>m.t[i]||"Sin Postear");
    const k=x=>t.filter(y=>y===x).length;
    const r=k("Rápido"),no=k("Normal"),le=k("Lento"),fi=k("Falta Injustificada");
    const g=r*tf.rapido+no*tf.normal+le*tf.lento+(+m.faltasMaster||0)*tf.falta;
    return `<tr data-mid="${m.id}">
      <td><input class="cell" style="min-width:10rem;font-weight:600" data-mf="nombre" value="${esc(m.nombre)}" aria-label="Misión o jugador"></td>
      <td class="num"><strong>${g}</strong></td><td class="num">${r+no+le}</td>
      <td class="num"><input class="cell num" type="number" min="0" data-mf="faltasMaster" value="${+m.faltasMaster||0}" aria-label="Faltas del master"></td>
      <td class="num">${fi?`<span class="chip-s t-rose">${fi}</span>`:0}</td>
      <td class="num">${r}</td><td class="num">${no}</td><td class="num">${le}</td>
      <td><div class="turn-grid">${t.map((x,i)=>{const [nm,tt,e]=find(TURNOS,x);return `<button class="tc ${tt==="sin"?"s-sin":"t-"+tt}" data-act="turn" data-i="${i}" title="T${i+1}: ${nm} (clic para cambiar)" aria-label="Turno ${i+1}: ${nm}">${e}</button>`;}).join("")}</div></td>
      <td class="num"><input class="cell num" type="number" min="1" max="40" data-mf="n" value="${n}" aria-label="Cantidad de turnos" style="width:5ch"></td>
      <td><button class="ghost" data-act="delMis" aria-label="Borrar">✕</button></td></tr>`;}).join("");
  return `<div class="row between"><h2>🎮 Control de turnos</h2><button class="primary" data-act="addMis">+ Misión</button></div>
  <p class="muted small" style="margin:0">Tocá cada casilla para cambiar el estado del turno: ${TURNOS.map(([n,t,e])=>`<span class="chip-s ${t==="sin"?"":"t-"+t}">${e} ${n}</span>`).join(" ")}. Las grageas se calculan solas con las tarifas.</p>
  <div class="tbl-wrap"><table><thead><tr><th>🧙 Misión / jugador</th><th class="num">🍬 Grageas</th><th class="num">🔁 Turnos</th><th class="num">🚫 Faltas master</th><th class="num">😢 Mis faltas</th><th class="num">⚡</th><th class="num">🌸</th><th class="num">🐌</th><th>🎲 Turnos</th><th class="num">Nº</th><th></th></tr></thead>
  <tbody>${filas||`<tr><td colspan="11" class="empty">Sin misiones. Agregá una para llevar sus turnos.</td></tr>`}</tbody></table></div>
  <section style="display:grid;gap:8px;max-width:420px"><h3>💰 Tarifas · grageas por turno</h3>
  <div class="tbl-wrap"><table><tbody>
   ${[["rapido","⚡ Rápido"],["normal","🌸 Normal"],["lento","🐌 Lento"],["falta","🚫 Falta del master"]].map(([k,l])=>`<tr><td>${l}</td><td class="num"><input class="cell num" type="number" min="0" data-tf="${k}" value="${tf[k]}" aria-label="${l}"></td></tr>`).join("")}
  </tbody></table></div></section>`;
};

let ofFiltro="todos", ofQ="";
const ofPasa=o=>ofFiltro==="todos"||(ofFiltro==="fav"?!!o.fav:o.estado===ofFiltro);
V.oficiales=()=>{
  const c=x=>S.oficiales.filter(o=>o.estado===x).length, nf=S.oficiales.filter(o=>o.fav).length;
  const chipF=(k,t,n)=>`<button class="of-f${ofFiltro===k?" on":""}" data-act="ofF" data-k="${k}">${t} <strong>${n}</strong></button>`;
  return `<div class="row between"><h2>🎀 Posibles oficiales</h2><button class="primary" data-act="addOf">+ Oficial</button></div>
  <div class="of-bar">${chipF("todos","Todos",S.oficiales.length)}${chipF("Disponible","🌸 Disponibles",c("Disponible"))}${chipF("Ocupado","💌 Ocupados",c("Ocupado"))}${chipF("fav","★ Favoritos",nf)}
    <input class="of-q" type="search" placeholder="Buscar oficial, relación…" value="${esc(ofQ)}" aria-label="Buscar oficial"></div>
  <p class="small muted" style="margin:4px 0 10px">Con Mi PJ podés traer los sucesos de El Profeta desde la Biblioteca de oficiales del foro.</p>
  <div class="tbl-wrap"><table class="stack"><thead><tr><th style="width:36px"></th><th style="width:32%">🎓 Oficial</th><th style="width:21%">💌 Relación</th><th style="width:12%">🗓️ Fecha</th><th style="width:13%">🌤️ Estado</th><th style="width:16%">🔗 Enlace</th><th style="width:36px"></th></tr></thead><tbody>
  ${S.oficiales.map(o=>`<tr data-oid="${o.id}" data-q="${esc(norm([o.nombre,o.relacion,o.fecha].join(" ")))}"${ofPasa(o)&&(!ofQ||norm([o.nombre,o.relacion,o.fecha].join(" ")).includes(norm(ofQ)))?"":" hidden"}>
    <td class="of-st"><button class="ghost of-star${o.fav?" on":""}" data-act="ofFav" aria-label="${o.fav?"Quitar de favoritos":"Marcar como favorito"}" title="${o.fav?"Quitar de favoritos":"Marcar como favorito"}">★</button></td>
    <td class="wide" data-l="🎓 Oficial"><input class="cell" style="min-width:14rem;font-weight:600" data-of="nombre" value="${esc(o.nombre)}" aria-label="Oficial"></td>
    <td data-l="💌 Relación"><input class="cell" style="min-width:10rem" data-of="relacion" value="${esc(o.relacion)}" aria-label="Relación"></td>
    <td data-l="🗓️ Fecha"><input class="cell" style="min-width:8rem" data-of="fecha" value="${esc(o.fecha)}" aria-label="Fecha" placeholder="AAAA-MM-DD o texto"></td>
    <td data-l="🌤️ Estado">${chipSel(OF_EST,o.estado,'data-of="estado" aria-label="Estado"')}</td>
    <td data-l="🔗 Enlace">${linkCell(o.enlace,'data-of="enlace"')}</td>
    <td class="del"><button class="ghost" data-act="delOf" aria-label="Borrar">✕</button></td></tr>`).join("")||`<tr><td colspan="7" class="empty">Anotá acá los oficiales que te interesan.</td></tr>`}
  </tbody></table><p class="empty of-nada" hidden>No hay oficiales con este filtro.</p></div>`;
};
function ofBuscar(){
  const t=norm(ofQ); let vis=0;
  panel.querySelectorAll("tr[data-oid]").forEach(tr=>{const o=S.oficiales.find(x=>x.id===tr.dataset.oid);const ok=o&&ofPasa(o)&&(!t||tr.dataset.q.includes(t));tr.hidden=!ok;if(ok)vis++;});
  const n=panel.querySelector(".of-nada"); if(n) n.hidden=!!vis||!S.oficiales.length;
}
V.ganancias=()=>{
  const total=S.personajes.reduce((a,p)=>a+totalPj(p).cob,0), pend=S.personajes.reduce((a,p)=>a+totalPj(p).pend,0);
  const fOpts=v=>`<option value="">Monto propio</option>`+S.fijos.map(f=>`<option value="${f.id}"${f.id===v?" selected":""}>${esc(f.nombre)}</option>`).join("");
  return `<div class="row between" style="align-items:end"><div><h2>🍯 Ganancias mensuales</h2><p class="muted small" style="margin:0">Solo suma lo que está marcado como cobrado.</p></div>
  <div style="text-align:right"><div class="big">${total} <span class="small muted">grageas</span></div><div class="small muted">${pend} sin cobrar</div></div></div>
  <div class="row"><button data-act="resetMes">↺ Nuevo mes (todo a «Sin Cobrar»)</button></div>
  <div class="gan-grid">${S.personajes.map(p=>{const g=totalPj(p);return `<div class="card" data-pid="${p.id}">
    <div class="card-h t-${p.tono}"><span>${esc(p.emoji)} ${esc(p.nombre)}</span><span>🧾 ${g.cob}</span></div>
    <div style="overflow-x:auto"><table><tbody>${p.ganancias.map(x=>`<tr data-gid="${x.id}">
      <td><input class="cell" data-gf="concepto" value="${esc(x.concepto)}" aria-label="Concepto" style="min-width:8rem"></td>
      <td><select class="cell" data-gf="fijo" aria-label="Pago fijo" style="font-size:.8rem;color:var(--muted);max-width:8rem">${fOpts(x.fijo)}</select></td>
      <td class="num">${x.fijo?`<span style="padding:0 6px">${montoG(x)}</span>`:`<input class="cell num" type="number" min="0" data-gf="monto" value="${+x.monto||0}" aria-label="Grageas">`}</td>
      <td>${chipSel(GEST,x.estado,'data-gf="estado" aria-label="Estado"')}</td>
      <td><button class="ghost" data-act="delG" aria-label="Borrar">✕</button></td></tr>`).join("")}</tbody></table></div>
    <div style="padding:8px 10px"><button class="ghost" style="color:var(--accent)" data-act="addG">+ Concepto</button></div></div>`;}).join("")||`<p class="empty">Creá un personaje primero.</p>`}</div>
  <section style="display:grid;gap:8px;max-width:460px"><h3>💳 Pagos fijos</h3><p class="muted small" style="margin:0">Montos que se repiten (sueldo, columnas…). Elegilos en un concepto y se actualizan solos.</p>
  <div class="tbl-wrap"><table><tbody>${S.fijos.map(f=>`<tr data-fid="${f.id}"><td><input class="cell" data-ff="nombre" value="${esc(f.nombre)}" aria-label="Pago fijo"></td><td class="num"><input class="cell num" type="number" min="0" data-ff="monto" value="${+f.monto||0}" aria-label="Monto"></td><td><button class="ghost" data-act="delF" aria-label="Borrar">✕</button></td></tr>`).join("")||`<tr><td class="empty">Sin pagos fijos.</td></tr>`}</tbody></table></div>
  <div><button data-act="addF">+ Pago fijo</button></div></section>`;
};

/* ---------- bóveda ---------- */
const FLOR=Object.assign({pastel:"✿",magic:"✧",terror:"†",neutro:"❦",magico:"✶",pixel:"◆"},{"peony": "❀", "matcha": "✿", "lotus": "✾", "buttercup": "❁", "velvet": "❦", "berries": "✱", "tealplum": "❦", "bubble": "✧"});
/* divisor de enlaces: solo símbolos de texto (el foro no acepta emojis) */
const DIV=Object.assign({pastel:"✿",magic:"✧",terror:"†",neutro:"✦",magico:"✶",pixel:"◆"},{"peony": "❀", "matcha": "·", "lotus": "✾", "buttercup": "❁", "velvet": "❧", "berries": "✱", "tealplum": "◆", "bubble": "✧"});
const divisor=()=>DIV[skinOf().id]||"✦";
function bovEnlaces(b){const d=divisor(),u=x=>String(x||"").trim();const parts=[];
  if(u(b.pet))parts.push(`[url=${u(b.pet)}]Petición[/url]`);if(u(b.ace))parts.push(`[url=${u(b.ace)}]Aceptación[/url]`);
  u(b.enl).split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(x=>parts.push(/^https?:\/\//i.test(x)?`[url=${x}]Enlace[/url]`:x));
  return parts.join(` ${d} `);}
const BOV_LINKS=[["l1","Primer post"],["l2","Último post"],["l3","Última corrección"]];
const num=v=>{const n=parseInt(String(v??"").replace(/[^\d-]/g,""),10);return isNaN(n)?0:n;};
const signo=n=>(n>=0?"+":"")+n;
function bov(p){if(!p.boveda)p.boveda={ini:0,tot:0,act:0,plt:0,pla:0,l1:"",l2:"",l3:"",delta:"",enl:""};return p.boveda;}
function bovCalc(b){const d=num(b.delta);return {ini:num(b.act),d,act:num(b.act)+d,tot:num(b.tot)+Math.max(d,0)};}
function bovApplyOtro(bb){const at=new Date().toISOString(),limpiar=()=>{bb.enl="";bb.pet="";bb.ace="";};bb.log=bb.log||[];
  if(bb.tipo==="pl"){const c=bovCalcPL(bb);if(!c.d){toast("Escribí cuántos Puntos Legendarios se añaden o quitan");return false;}
    bb.log.unshift({id:uid(),at,kind:"pl",pl0:num(bb.pla),plt0:num(bb.plt),ini:c.ini,d:c.d,act:c.act,tot:c.tot,enl:bovEnlaces(bb),pet:String(bb.pet||"").trim(),ace:String(bb.ace||"").trim()});
    bb.pla=c.act;bb.plt=c.tot;bb.pdelta="";limpiar();toast(`Bóveda actualizada: ${c.act} Puntos Legendarios`);}
  else{const txt=String(bb.inv||"").trim();if(!txt){toast("Escribí qué se añade o se quita del inventario");return false;}
    bb.log.unshift({id:uid(),at,kind:"inv",txt,ini:num(bb.act),d:0,act:num(bb.act),tot:num(bb.tot),enl:bovEnlaces(bb),pet:String(bb.pet||"").trim(),ace:String(bb.ace||"").trim()});
    bb.inv="";limpiar();toast("Inventario anotado en los movimientos");}
  if(bb.log.length>150)bb.log.length=150;return true;}
function bovCalcPL(b){const d=num(b.pdelta);return {ini:num(b.pla),d,act:num(b.pla)+d,tot:num(b.plt)+Math.max(d,0)};}
function bovCodes(b){const T=b.tipo||"gr";
  if(T==="pl"){const c=bovCalcPL(b),enl=bovEnlaces(b);
    const form=`{Puntos Legendarios iniciales» ${c.ini}\n{Puntos Legendarios que se añaden/quitan» ${signo(c.d)}\n{Puntos Legendarios actuales» ${c.act}\n{Puntos Legendarios totales» ${c.tot}\n{Enlaces» ${enl}`;
    const html=`<div class="scaja-content"><span class="scaja-form">{Puntos Legendarios iniciales»</span> ${c.ini}\n<span class="scaja-form">{Puntos Legendarios que se añaden/quitan»</span> ${signo(c.d)}\n<span class="scaja-form">{Puntos Legendarios actuales»</span> ${c.act}\n<span class="scaja-form">{Puntos Legendarios totales»</span> ${c.tot}\n<span class="scaja-form">{Enlaces»</span> ${enl}\n</div>`;
    return {c,form,html};}
  if(T==="inv"){const enl=bovEnlaces(b),txt=String(b.inv||"").trim();
    const form=`{Nuevo inventario» ${txt}\n{Enlaces» ${enl}`;
    const html=`<div class="scaja-content"><span class="scaja-form">{Nuevo inventario»</span> ${txt}\n<span class="scaja-form">{Enlaces»</span> ${enl}\n</div>`;
    return {c:null,form,html};}
  return bovCodesGr(b);}
function bovCodesGr(b){const c=bovCalc(b),enl=bovEnlaces(b);
  const form=`{Grageas iniciales» ${c.ini}\n{Grageas que se añaden/quitan» ${signo(c.d)}\n{Grageas actuales» ${c.act}\n{Grageas totales» ${c.tot}\n{Enlaces» ${enl}`;
  const html=`<div class="scaja-content"><span class="scaja-form">{Grageas iniciales»</span> ${c.ini}\n<span class="scaja-form">{Grageas que se añaden/quitan»</span> ${signo(c.d)}\n<span class="scaja-form">{Grageas actuales»</span> ${c.act}\n<span class="scaja-form">{Grageas totales»</span> ${c.tot}\n<span class="scaja-form">{Enlaces»</span> ${enl}\n</div>`;
  return {c,form,html};}
function bovPrevT(b,c){const T=b.tipo||"gr";if(T==="inv")return "";if(T==="pl")return `<span>${c.ini}</span><span class="op ${c.d<0?"neg":"pos"}">${signo(c.d)}</span><span>=</span><strong>${c.act}</strong><span class="muted small">PL · totales ${c.tot}</span>${c.act<0?`<span class="small" style="color:var(--rose-fg)">⚠ no te alcanzan los Puntos Legendarios</span>`:""}`;return bovPrev(c);}
function updateBovCode(){const p=pjById(pjSel);if(!p||tab!=="boveda")return;const bb0=bov(p),{c,form,html}=bovCodes(bb0);
  const a=RR.getElementById("bovForm"),h=RR.getElementById("bovHtml");if(a)a.value=form;if(h)h.value=html;
  const pv=RR.getElementById("bovPrev");if(pv)pv.innerHTML=bovPrevT(bb0,c);}
function bovPrev(c){return `<span>${c.ini}</span><span class="op ${c.d<0?"neg":"pos"}">${signo(c.d)}</span><span>=</span><strong>${c.act}</strong><span class="muted small">· totales ${c.tot}</span>${c.act<0?`<span class="small" style="color:var(--rose-fg)">⚠ no te alcanzan las grageas</span>`:""}`;}
function fmtAt(iso){try{const d=new Date(iso);return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;}catch(_){return"";}}
function bovLog(b){const L=b.log||[];
  return `<section class="bov-log-wrap"><div class="row between"><h3>📜 Últimos movimientos</h3><div class="row">${L.length?`<button data-act="bovUndo" title="Vuelve los números a como estaban antes del último movimiento">↶ Deshacer el último</button>`:""}<button class="ghost" data-act="bovAddLog" title="Agregar una línea de nota al registro">+ nota</button></div></div>
  <div class="bov-log" role="log" aria-label="Últimos movimientos">${L.length?L.map((e,i)=>`<div class="lg${i===0?" last":""}" data-lid="${e.id}">
    <span class="lg-t">[${esc(fmtAt(e.at))}]</span>
    ${e.nota!==undefined?`<input class="lg-nota" data-lf="nota" value="${esc(e.nota)}" aria-label="Nota">`:e.kind==="inv"?`<span class="lg-inv">Inventario: ${esc(e.txt)}</span>`:`${e.kind==="pl"?`<span class="lg-k">PL</span>`:""}<span class="lg-n">${e.ini}</span><span class="lg-d ${e.d<0?"neg":"pos"}">${signo(e.d)}</span><span class="lg-a">→ ${e.act}</span><span class="lg-tot">tot ${e.tot}</span>`}
    <span class="lg-l">${[["Petición",e.pet],["Aceptación",e.ace]].filter(x=>safeUrl(x[1])).map(([l,u])=>`<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${l}</a>`).join(` <span class="lg-sep">${esc(divisor())}</span> `)}</span>
    <button class="ghost lg-x" data-act="bovDelLog" data-id="${e.id}" aria-label="Borrar movimiento">✕</button></div>`).join(""):`<div class="lg empty-log">&gt; Todavía no hay movimientos. Cuando toques «Ya lo publiqué», queda anotado acá.</div>`}</div></section>`;}
V.boveda=()=>{
  if(!pjSel||!pjById(pjSel))pjSel=S.personajes[0]?.id||null;
  const p=pjById(pjSel);const f=FLOR[skinOf().id]||"✿";
  const sel=`<div class="pjs">${S.personajes.map(x=>`<button class="pj-tab c-${x.tono}" aria-pressed="${x.id===pjSel}" data-act="pj" data-id="${x.id}">${esc(x.emoji)} ${esc(x.nombre)}</button>`).join("")}</div>`;
  if(!p)return `<h2>🏦 Bóveda</h2><p class="empty">Creá un personaje primero.</p>`;
  const b=bov(p),{c,form,html}=bovCodes(b),cob=totalPj(p).cob;
  const line=(k,l)=>`<label class="bov-l" for="bv-${k}"><span class="flor" aria-hidden="true">${f}</span><span class="bov-lbl">${l}:</span><input class="cell num bov-n" type="number" id="bv-${k}" data-bf="${k}" value="${num(b[k])}"></label>`;
  return `<div class="row between"><h2>🏦 Bóveda</h2>${sel}</div>
  <div class="bov-grid">
    <section class="bov-card t-${p.tono}">
      <div class="bov-h">${esc(p.emoji)} ${esc(p.nombre)}</div>
      <div class="bov-g">${line("ini","Grageas Iniciales")}${line("tot","Grageas Totales")}${line("act","Grageas Actuales")}</div>
      <div class="bov-g">${line("plt","Puntos Legendarios Totales")}${line("pla","Puntos Legendarios Actuales")}</div>
    </section>
    <section class="bov-links"><h3>🔗 Ir a la bóveda</h3>
      ${BOV_LINKS.map(([k,l])=>{const u=safeUrl(b[k]);return `<div class="bov-link"><span class="bov-lbl">${l}</span><div class="tit"><input class="cell" data-bf="${k}" value="${esc(b[k]||"")}" placeholder="Pegá el enlace" aria-label="Enlace: ${l}">${u?`<a class="go-tab" href="${esc(u)}" target="_blank" rel="noopener">↗ Ir</a>`:""}</div></div>`;}).join("")}
    </section>
  </div>
  <section class="bov-tx"><h3>🧾 Actualizar la bóveda</h3>
    <div class="bov-tipo" role="group" aria-label="Qué se actualiza">${[["gr","Grageas"],["pl","Puntos Legendarios"],["inv","Inventario"]].map(([k,l])=>`<button data-act="bovTipo" data-t="${k}" aria-pressed="${(b.tipo||"gr")===k}">${l}</button>`).join("")}</div>
    ${(b.tipo||"gr")==="gr"?`
    <div class="row" style="align-items:end;gap:12px">
      <label class="bov-f" for="bv-delta"><span class="lbl">Grageas que se añaden/quitan</span><input class="cell bov-d" id="bv-delta" data-bf="delta" value="${esc(b.delta||"")}" placeholder="+125 o -40" inputmode="numeric"></label>
      ${cob?`<button data-act="bovCob">Usar lo cobrado del mes (+${cob})</button>`:""}
      <div class="bov-prev" id="bovPrev" aria-live="polite">${bovPrevT(b,c)}</div>
    </div>
    `:(b.tipo==="pl")?`<div class="row" style="align-items:end;gap:12px"><label class="bov-f" for="bv-pdelta"><span class="lbl">Puntos Legendarios que se añaden/quitan</span><input class="cell bov-d" id="bv-pdelta" data-bf="pdelta" value="${esc(b.pdelta||"")}" placeholder="+3 o -10" inputmode="numeric"></label><div class="bov-prev" id="bovPrev" aria-live="polite">${bovPrevT(b,c)}</div></div><p class="small muted" style="margin:0">Tenés ${num(b.pla)} Puntos Legendarios actuales y ${num(b.plt)} totales (arriba, en la tarjeta del personaje).</p>`:`<label class="bov-f" for="bv-inv"><span class="lbl">Nuevo inventario: lo que se añade o se quita</span><textarea class="cell bov-enl" id="bv-inv" data-bf="inv" rows="3" placeholder="Ej.: + Capa de viaje encantada · − Poción multijugos (usada)">${esc(b.inv||"")}</textarea></label>`}
    <div class="bov-enls">
      <label class="bov-f" for="bv-pet"><span class="lbl">Enlace de la petición</span><input class="cell bov-u" id="bv-pet" data-bf="pet" value="${esc(b.pet||"")}" placeholder="Pegá el enlace de la petición"></label>
      <label class="bov-f" for="bv-ace"><span class="lbl">Enlace de la aceptación</span><input class="cell bov-u" id="bv-ace" data-bf="ace" value="${esc(b.ace||"")}" placeholder="Pegá el enlace de la aceptación"></label>
    </div>
    <label class="bov-f" for="bv-enl"><span class="lbl">Otros enlaces o texto (opcional, uno por línea)</span><textarea class="cell bov-enl" id="bv-enl" data-bf="enl" rows="2" placeholder="Si hay más enlaces, van acá">${esc(b.enl||"")}</textarea></label>
    <p class="small muted" style="margin:0">Divisor entre enlaces: <strong class="bov-div">${esc(divisor())}</strong> (cambia con el tema). Queda así: <code>[url=…]Petición[/url] ${esc(divisor())} [url=…]Aceptación[/url]</code></p>
    <div class="bov-codes">
      <div><div class="row between"><span class="lbl">Formulario</span><button data-act="copyTxt" data-t="bovForm">Copiar</button></div><textarea class="code-box" id="bovForm" readonly rows="6" aria-label="Formulario">${esc(form)}</textarea></div>
      <div><div class="row between"><span class="lbl">Código para la bóveda</span><button class="primary" data-act="copyTxt" data-t="bovHtml">Copiar código</button></div><textarea class="code-box" id="bovHtml" readonly rows="6" aria-label="Código de la bóveda">${esc(html)}</textarea></div>
    </div>
    <div class="row"><button class="primary" data-act="bovApply">✓ Ya lo publiqué: ${(b.tipo||"gr")==="inv"?"anotarlo":"actualizar mis números"}</button><span class="small muted">${(b.tipo||"gr")==="inv"?"Queda anotado en Últimos movimientos y se limpia el formulario.":"Iniciales pasa a ser lo que tenías, Actuales y Totales se actualizan, y se limpia la transacción. Lo que gastás no resta de Totales."}</span></div>
  </section>
  ${bovLog(b)}`;
};

/* ---------- futuros canjes (wish list) ---------- */
const ATRS=["Carisma","Destreza","Inteligencia","Percepción","Voluntad","Vigor","Poder"];
const ATR_COST=[0,250,300,400,550,750,1000,1300,1750];
const HABS={Vigor:["Atletismo","Pelea"],Destreza:["Esquivar","Latrocinio","Sigilo","Volar"],Carisma:["Coordinación","Intimidación","Oratoria","Seducir","Subterfugio"],Poder:["Duelo","Pociones","Rituales"],Voluntad:["Arte/Artesanía","Estilo","Frialdad"],"Percepción":["Alerta","Consciencia","Empatía","Iniciativa","Investigación"],Inteligencia:["Adivinación","Arcanismo","Callejeo","Cultura Mágica","Cultura Muggle","Herbología","Magizoología","Medicina","Política","Supervivencia"]};
const HAB_LV=["Ninguno","Novato","Competente","Experto","Maestro","Legendario"];
const HAB_COST=[0,75,150,250,400,750], ARTE_COST=[0,38,75,125,200,375];
const ROM=["—","I","II","III","IV","V","VI"];
const TRAS_T=["Biblioteca","Informantes","Seguidores","Influencia"];
const TRAS_CAT=["Adivinación","Arcanismo","Callejeo","Cultura Mágica","Cultura Muggle","Herbología","Magizoología","Medicina","Política","Supervivencia","Académicos","Bajos fondos","Hogwarts","Seres Mágicos","Sociedad"];
const VENT=["Fama","Orden de Merlín","Patrón","Recursos"], VENT_COST=[0,100,300,600,1000];
const ESP_R=["Combatiente","Encantador","Hechicero","Jugador de Quidditch","Magizoólogo","Mago oscuro","Medimago"];
const ARC_NV=[["Doméstico",25],["Básico",100],["Intermedio",300],["Avanzado",600],["Legendario",3000]];
const SP=s=>s.split("|");
const ARC={"hechizo": [["Accio", "Aguamenti", "Arresto Momentum", "Ascendio", "Bauleo", "Calidum", "Colovaria", "Crinus Muto", "Depulso", "Descendo", "Fregotego", "Lumos", "Nox", "Paentio ✦", "Sonorus", "Tergeo", "Waddiwasi", "Wingardium Leviosa"], ["Adoleret", "Agmen", "Alarte Ascendere", "Alchimia Incantatio Mínima", "Alohomora", "Alset", "Amica Plantae", "Aparecium", "Aquaeructo", "Atabraquium", "Avis", "Bombarda", "Calvorio", "Carpe Retractum", "Claustra Terrae", "Defodio", "Diffindo", "Dissendium", "Egni ✦", "Ennervate", "Episkey", "Expulso", "Ferula", "Fett", "Fiendlock", "Finestra", "Flipendo", "Fluctus Mínima", "Frigus", "Homorphus", "Jaulio", "Lacarnum Inflamarae", "Legeremens Minoris", "Liberacorpus", "Locomotor Mortis", "Lupuracterem ✦", "Meteoloembrujo Recanto", "Morslauter", "Nuntius Minoris", "Obscuro", "Oclumens Minoris", "Oppugno", "Parasitus Mínima", "Petrificus Totalus", "Prior Incantato", "Protego", "Rayo", "Relashio", "Reparo Mínima", "Repelium Mínima", "Rictumsempra", "Riddikulus", "Sensus Animal", "Surgito", "Tragababosas", "Ventriloquos ✦", "Ventus"], ["Aberto", "Alchimia Incantatio", "Andacht", "Antus", "Aqua Volatem", "Aquacaudalis", "Arania Exumai", "Audire Plantae", "Avium Grex", "Cohortis", "Confringo", "Delictum", "Densaugeo", "Deprimo", "Diluculum", "Dispergam", "Dual Potens", "Emtiv ✦", "Everte Statum", "Expelliarmus", "Fianto Duri", "Finite", "Fluctus", "Furunculus", "Glacius", "Impedimenta", "Impetus Plantae", "Incarcerous", "Incendio", "Infulgurum", "Legeremens Media", "Levicorpus", "Locomotor Terminus", "Loqui Animal", "Mayal Asir ✦", "Mobilicorpus", "Morsequor", "Nuntius Media", "Obliviate", "Oclumens Media", "Onerarios", "Parasitus", "Protego Máxima", "Reducto", "Remedium", "Reparifors", "Reparo", "Repelium", "Revelio", "Ruptis", "Sectum", "Tarantallegra", "Tirmelo Plantae", "Vastag Köd ✦", "Vespertilliomuci", "Vulneructum"], ["Alchimia Incantatio Máxima", "Anteoculatia", "Arctis", "Ardoribus Sempiternis", "Arovlop", "Artivestringo", "Avada Kedavra", "Avium Legio", "Bombarda Máxima", "Brackium Emendo", "Confocus ✦", "Confundo", "Consumo Diabolica", "Crucio", "Desmaius", "Exorcismo", "Expecto Patronum", "Expecto Tenebris ✦", "Fiendfyre", "Finite Incantatem", "Fluctus Máxima", "Fulgari", "Furia Plantae", "Gubraith", "Halálos Köd ✦", "Harmonia Nectere Passus", "Illuminas Pluviam", "Imperio", "Impulso Fractus", "Incendio Diabolica", "Invow ✦", "Legeremens", "Levinsana", "Lingualoopsia", "Locomotor Finalis", "Macrocranio", "Morswunde", "Nebula Alchimia", "Nuntius", "Oclumens", "Parasitus Maxima", "Paries Ignis", "Partis Temporus", "Portaberto", "Potentiae Actus", "Repelium Máxima", "Rupturum", "Salvio Hexia", "Sectumsempra", "Specialis Revelio", "Turbinis", "Vulnera Sanentur"], ["Orfebrería de cadáveres ✦"]], "pocion": [[], ["Aliento embotellado ✦", "Antídoto contra Veritaserum", "Chuchería para mascotas", "Concentrado de brugmansia", "Filtro de niebla embotellada ✦", "Filtro de Upsala", "Fluido Explosivo", "Poción agudizadora de ingenio", "Poción calmante", "Poción de actividad", "Poción de aliento de perro", "Poción de fuerza de culturista", "Poción de la memoria", "Poción de Quasimodo", "Poción de reanimación", "Poción embellecedora", "Poción herbicida", "Poción incorpórea", "Poción olvidadiza", "Poción pimentónica", "Poción vigorizante", "Poción Wiggenweld", "Preparado de mandrágora", "Reactivo de Descurainia sophia", "Retardante alquímico", "Solución animadora", "Test de Saberhagen"], ["Antídoto", "Chuchería para animales", "Coles masticadoras chinas", "Concentrado de Centinodia", "Concentrado de erumpent", "Esencia de Díctamo", "Filtro corrosivo", "Filtro de esencia de niebla ✦", "Obfuscate mortem", "Poción crecepelo", "Poción de Ataraxia", "Poción de Babel", "Poción de Berserker", "Poción de fuerza de semigigante", "Poción de Gregory el Zalamero", "Poción de piel ignífuga", "Poción de raíces sangrientas", "Poción de sentido animal", "Poción debilitante", "Poción envejecedora", "Poción multijugos", "Poción rejuvenecedora", "Preparado del árbol de las hienas", "Solución del estilista trágico", "Solución del ritualista", "Vapores de Dharamsala"], ["Aliento de dragón", "Amortentia", "Chuchería para bestias", "Destilado de Asfodelo", "Elixir de Insignificancia", "Elixir dorado", "Elixir Vitalis", "Felix Felicis", "Filtro de forma de niebla ✦", "Filtro de insensibilidad", "Filtro de muertos en vida", "Filtro de precognición", "Integrum Elixir ✦", "Poción de fuerza de gigante", "Poción de Helena de Troya", "Poción de la desesperación", "Poción Matalobos", "Vahos de Delfos", "Veritaserum", "Zumo de tentácula venenosa"], []], "ritual": [[], ["Abyssumbra ✦", "Avencompedium", "Avensegium", "Bullapetasum", "Cave Inimicum", "Coetus Fuga ✦", "Crescemultum", "Deletrius", "Dimminuendo", "Duro", "Epoximise", "Fermaportus", "Flagrate", "Gamexarum", "Herbivicus", "Illusia Minoris", "Köd ✦", "Locomotor", "Los ojos del muerto | Oculi Morti", "Mimble Wimble", "Morsmordre", "Nebulus", "Oriéntame", "Pericullum", "Puertas de Barovia ✦", "Repello Inimicum", "Repello Muggletum", "Ritual antiaparición | Captus", "Ritual de alarma ✦", "Ritual de castigo menor | Damnum Minoris", "Ritual de codificación | Encriptio", "Ritual de comunicación | Loquitur", "Ritual de convocación de criatura | Vocatfera", "Ritual de encantamiento | Malleator", "Ritual de la Autopsia | Autopsius", "Ritual de llamada espiritual | Vocantus", "Ritual de los ecos de la niebla ✦", "Ritual de los ojos de la bestia menor | Animalis Oculus Minoris", "Ritual de modificación mental menor | Mutatio Mentis Minoris", "Ritual de ofuscación menor | Celaris Minoris", "Ritual de permanencia | Permanentia", "Ritual de tramitación de expediente | Ex Libris", "Ritual de trampa arcana menor | Laqueus Minoris", "Sanatore Mínima", "Sbond", "Serpensortia", "Spongify", "Transfiguración de objetos a animales menor | Diversium Animalis Minoris", "Transfiguración humana menor | Transfiguratio Minoris", "Transformación de objetos menor | Mutatio Minoris"], ["Appare Vestigium", "Caeca Temporalis", "Climatus", "Engorgio", "Evanesco", "Geistimalle ✦", "Geminio", "Homonculous", "Illusia", "Juramento Inquebrantable", "Lumos Salta ✦", "Morsdicit", "Mortem costume ✦", "Muffliato", "Planta Vitae", "Portus Mínima", "Proteico", "Reducio", "Ritual clarividencia | Procul Visio", "Ritual de castigo | Damnum", "Ritual de cerradura arcana | Fermaportus Máxima", "Ritual de comunicación mental | Loquitur Máxima", "Ritual de encierro de Criatura | Custotfera", "Ritual de encierro espiritual | Custontus", "Ritual de infortunio | Infortunii", "Ritual de los luceros de la niebla ✦", "Ritual de los ojos de la bestia | Animalis Oculis", "Ritual de modificación mental | Mutatio Mentis", "Ritual de ofuscación intermedio | Celaris", "Ritual de purificación ✦", "Ritual de trampa arcana | Laqueus", "Ritual simple de extensión indetectable | Magnus Interna", "Sanatore", "Sanctum ✦", "Sutura mnemónica | Rememoratio ✦", "Tabú", "Transfiguración de objetos a animales medianos | Diversium Animalis", "Transfiguración humana intermedia | Transfiguratio", "Transformación de objetos medianos | Mutatio", "Vastag Köd ✦"], ["Alchimia Temporalis ✦", "Aparturum ✦", "Artus Argentum", "Aurorium", "Fabulari Distare ✦", "Fidelio", "Illusia Maxima", "Inferi", "Locomotor Maxima", "Maldición", "Portus", "Protego Diabólica", "Ritual de castigo mayor | Damnum Mayoris", "Ritual de la forja duendigozna | Malleator Maxima", "Ritual de los ojos de la bestia mayor | Animalis Oculis Mayoris", "Ritual de modificación mental mayor | Mutatio Mentis Mayoris", "Ritual de ofuscación mayor | Celaris Mayoris", "Ritual de paso limitado | Transitus Prohibere", "Ritual de profanación | Regio Desecrate", "Ritual de protección frente al mal", "Ritual de protección | Pacislocum", "Ritual de trampa arcana mayor | Laqueus Mayoris", "Ritual del arcanista | Arcanistus", "Ritual del esclavo fantasmal | Servuntus", "Ritual del simulacro de niebla ✦", "Ritual Widerhersteele ✦", "Sanatore Máxima", "Transfiguración de objetos a animales grandes | Diversium Animalis Mayoris", "Transfiguración humana absoluta | Alter Humanus", "Transfiguración humana avanzada | Transfiguratio Mayoris", "Transformación de objetos grandes | Mutatio Mayoris"], ["Ritual de Confinamiento de Muerte | Confinis Mortem ✦"]], "objeto": [[], ["Alfombra voladora Alasdy", "Baúl de viaje Alasdy", "Botas de viaje", "Botella del genio", "Brújula de Godric", "Camilla Plegable Levitante de Primeros Auxilios", "Campana de llamada", "Chivatoscopio", "Colmillo de Peligro", "Conjunto de Flavio el Engreído", "Cruz de plata", "Espectrogafas", "Instrumento musical encantado", "La Mano de la Gloria", "Lechuza mecánica", "Libro Infinito", "Medallón de Lucidez Extrema", "Monóculo Áurico", "Morsseum", "PARA", "Pensadero", "Polvo peruano de oscuridad instantánea", "Puertas de Larga Distancia", "Recordadora", "Reloj Lunar", "S.C.R.O.L.L.", "Saquito de habichuelas mágicas", "Tienda Adaptable, Rápidamente Desplegable, Ingeniosamente Segura", "Tinta de Veracidad"], ["Amuleto del guardián", "Ancla del expedicionista", "Anillo de los Carstein", "Anillo de Moebius", "Anillo tejido ✦", "Armadura de Warlock", "Bisutería Arcana", "Bola de cristal", "Brazalete de Transporte ✦", "Bufanda de Babel", "Capa del líder de la manada", "Dado del destino", "El Mapa Rojo", "Instrumento de Hamelín", "La lengua de Crucasma", "La nariz de Crucasma", "Llave de las Mil Puertas", "Los dedos de Crucasma", "Los Ojos de Crucasma", "Los oídos de Crucasma", "Maletín de Sanación San Mungo ✦", "Monóculo del tasador", "Máscara mortuoria", "Papel psíquico", "Petardes", "Polvo fantasmal", "Polvo Fúnebre", "Prótesis Mágica", "Reloj de Parada", "Saco de piel de Moke", "Tatuaje Arcano", "Tercer brazo", "Trampa Onírica", "Vehículo volador"], ["Altar del ritualista", "Cinturón del Herbalista", "Estuche Arcaico de Cirugía Avanzada Mágica ✦", "Grimorio Silvano ✦", "Mapa del Merodeador 2.0 ✦"], ["Cisne ✦", "Nachtglanz ✦", "Sudario estigio ✦"]]};
const ARC_REQ={"Morslauter": "Requiere ser Mortífago Novato.", "Morsseum": "Requiere ser Mortifago Novato.", "PARA": "requiere de 5 turnos o en su defecto 30 minutos para recargar su energía.", "Polvo peruano de oscuridad instantánea": "requiere de vientos fuertes, y no basta con un hechizo de disipación).", "S.C.R.O.L.L.": "requiere de flujo mágico personal, por lo que la distancia de alcance de sus mensajes depende de cada persona,", "Saco de piel de Moke": "requiere de una tirada de latrocinio a dificultad 21.", "Tatuaje Arcano": "requieren de canalización continua (como barreras mágicas), si se usan desde el tatuaje tienen la misma proble", "Vehículo volador": "Requiere Cultura Muggle 2 para poder conducirlo.", "Crescemultum": "Requiere Especialización Encantador 1.", "Dimminuendo": "Requiere Especialización Encantador 1.", "Duro": "Requiere Especialización Encantador 1.", "Locomotor": "Requiere Especialización Encantador 2.", "Los ojos del muerto | Oculi Morti": "Requiere Especialización Mago Oscuro 2.", "Morsmordre": "Requiere ser Mortifago Novato.", "Ritual de castigo menor | Damnum Minoris": "requiere acción alguna en combate, pero no se podrá realizar dos veces al mismo objetivo en menos de 24 horas ", "Ritual de convocación de criatura | Vocatfera": "Requiere Especialización Magizoólogo 1.", "Ritual de encantamiento | Malleator": "Requiere Especialización Encantador 1.", "Ritual de la Autopsia | Autopsius": "Requiere Especialización Medimago 1.", "Ritual de llamada espiritual | Vocantus": "Requiere Especialización Mago Oscuro 2.", "Ritual de los ojos de la bestia menor | Animalis Oculus Minoris": "Requiere Especialización Magizoólogo 2.", "Ritual de modificación mental menor | Mutatio Mentis Minoris": "Requiere Legeremens y Obliviate.", "Sanatore Mínima": "Requiere Especialización Medimago 1.", "Sbond": "Requiere ser Ordenista Novato.", "Spongify": "Requiere Especialización Encantador 1.", "Climatus": "Requiere Nebulus.", "Engorgio": "Requiere Crescemultum.", "Homonculous": "Requiere Especialización Encantador 2.", "Illusia": "Requiere Illusia Minoris.", "Morsdicit": "Requiere ser Mortifago Experto.", "Portus Mínima": "Requiere Especialización Encantador 2.", "Proteico": "Requiere Especialización Encantador 1.", "Reducio": "Requiere Dimminuendo.", "Ritual de castigo | Damnum": "Requiere Ritual de castigo menor.", "Ritual de cerradura arcana | Fermaportus Máxima": "Requiere Especialización Encantador 2, Fermaportus y Reparo.", "Ritual de comunicación mental | Loquitur Máxima": "Requiere Ritual de comunicación.", "Ritual de encierro de Criatura | Custotfera": "Requiere Magizoólogo 1.", "Ritual de encierro espiritual | Custontus": "Requiere Mago Oscuro 2.", "Ritual de ofuscación intermedio | Celaris": "Requiere Celaris Minoris.", "Ritual de los ojos de la bestia | Animalis Oculis": "Requiere Animalis Oculis Minoris.", "Ritual de modificación mental | Mutatio Mentis": "Requiere Mutatio Mentis Minoris.", "Ritual de trampa arcana | Laqueus": "Requiere Laqueus Minoris.", "Ritual simple de extensión indetectable | Magnus Interna": "Requiere Especialización Encantador 2.", "Sanatore": "Requiere Sanatore Mínima.", "Transfiguración de objetos a animales medianos | Diversium Animalis": "Requiere Diversium Animalis Minoris.", "Transformación de objetos medianos | Mutatio": "Requiere Mutatio Minoris.", "Transfiguración humana intermedia | Transfiguratio": "Requiere Transfiguratio Minoris.", "Artus Argentum": "Requiere Poder 5.", "Aurorium": "Requiere Poder 7.", "Fidelio": "Requiere Especialización Encantador 2.", "Illusia Maxima": "Requiere Illusia.", "Inferi": "Requiere Especialización Mago Oscuro 2.", "Locomotor Maxima": "Requiere Locomotor.", "Maldición": "Requiere Poder 7.", "Portus": "Requiere Portus Mínima.", "Protego Diabólica": "Requiere Poder 7 y Fiendfyre.", "Ritual de la forja duendigozna | Malleator Maxima": "Requiere Especialización Encantador 3 y Malleator.", "Ritual de modificación mental mayor | Mutatio Mentis Mayoris": "Requiere Mutatio Mentis.", "Ritual de los ojos de la bestia mayor | Animalis Oculis Mayoris": "Requiere Animalis Oculis.", "Ritual de ofuscación mayor | Celaris Mayoris": "Requiere Celaris.", "Ritual de paso limitado | Transitus Prohibere": "Requiere Especialización Hechicero 3.", "Ritual de profanación | Regio Desecrate": "Requiere Especialización Mago Oscuro 2.", "Ritual de trampa arcana mayor | Laqueus Mayoris": "Requiere Laqueus.", "Ritual del arcanista | Arcanistus": "Requiere Delictum, Prior Incantato y Specialis Revelio.", "Ritual del esclavo fantasmal | Servuntus": "Requiere Exorcismo.", "Sanatore Máxima": "Requiere Sanatore.", "Transfiguración de objetos a animales grandes | Diversium Animalis Mayoris": "Requiere Especialización Magizoólogo 2 y Diversium Animalis.", "Transformación de objetos grandes | Mutatio Mayoris": "Requiere Especialización Encantador 2 y Mutatio.", "Transfiguración humana avanzada | Transfiguratio Mayoris": "Requiere Especialización Magizoólogo 2 y Transfiguratio.", "Poción pimentónica": "Requiere Medimago 1.", "Poción vigorizante": "Requiere Especialización Medimago 2.", "Reactivo de Descurainia sophia": "Requiere Especialización Medimago 2.", "Antídoto": "Requiere Poción pimentónica.", "Chuchería para animales": "Requiere Chcuchería para mascotas.", "Concentrado de Centinodia": "Requiere Reactivo de Descurainia sophia.", "Concentrado de erumpent": "Requiere Fluido explosivo.", "Esencia de Díctamo": "Requiere Poción vigorizante.", "Obfuscate mortem": "Requiere Mago Oscuro 2.", "Poción de fuerza de semigigante": "Requiere Poción de fuerza de culturista.", "Poción de Gregory el Zalamero": "Requiere Poción embellecedora.", "Poción de raíces sangrientas": "Requiere Concentrado de brugmansia.", "Preparado del árbol de las hienas": "Requiere Poción aliento de perro.", "Vapores de Dharamsala": "Requiere Filtro de Upsala.", "Aliento de dragón": "Requiere Concentrado de erumpent.", "Chuchería para bestias": "Requiere chuchería para animales.", "Destilado de Asfodelo": "Requiere Concentrado de Centidonia.", "Elixir dorado": "Requiere Antídoto.", "Elixir Vitalis": "Requiere Esencia de Díctamo.", "Poción de fuerza de gigante": "Requiere Poción de fuerza de semigigante.", "Poción de Helena de Troya": "Requiere Poción de Gregory el Zalamero.", "Vahos de Delfos": "Requiere Vapores de Dharamsala.", "Zumo de tentácula venenosa": "Requiere Poción de raíces sangrientas.", "Adoleret": "Requiere ser Ordenista Novato.", "Agmen": "Requiere Especialización Hechicero 1.", "Alset": "Requiere Especialización Encantador 2.", "Aparecium": "Requiere Especialización Hechicero 2.", "Ennervate": "Requiere Especialización Hechicero 1.", "Episkey": "Requiere Especialización Medimago 1.", "Ferula": "Requiere Especialización Medimago 1.", "Fett": "Requiere ser Ordenista Novato.", "Fiendlock": "Requiere Especialización Hechicero 1.", "Homorphus": "Requiere Especialización Hechicero 3.", "Jaulio": "Requiere Claustra Terrae.", "Legeremens Minoris": "Requiere Especialización Mago Oscuro 1.", "Liberacorpus": "Requiere Especialización Hechicero 1.", "Nuntius Minoris": "Requiere Legeremens Minoris.", "Oclumens Minoris": "Requiere Especialización Mago Oscuro 1.", "Oppugno": "requieren una postura demasiado estática que causará un penalizador de -1 a la Defensa del conjurador.", "Parasitus Mínima": "Requiere Especialización Mago Oscuro 2.", "Prior Incantato": "Requiere Especialización Hechicero 1.", "Relashio": "Requiere Especialización Hechicero 1.", "Reparo Mínima": "Requiere Especialización Encantador 2.", "Repelium Mínima": "Requiere Especialización Combatiente 1.", "Sensus Animal": "Requiere un nivel de la especialización magizoología acorde a la clase de bestia o criatura.", "Surgito": "Requiere Especialización Hechicero 1.", "Alchimia Incantatio Máxima": "Requiere Alchima Incantantio.", "Anteoculatia": "Requiere Locomotor Terminatus.", "Ardoribus Sempiternis": "Requiere ser Ordenista Experto.", "Arctis": "Requiere Glacius.", "Arovlop": "Requiere Antus.", "Artivestringo": "Requiere Cohortis.", "Avada Kedavra": "Requiere Especialización Mago Oscuro 3.", "Avium Legio": "Requiere Avis Grex.", "Bombarda Máxima": "Requiere Confringo.", "Brackium Emendo": "Requiere Reparifors.", "Confundo": "Requiere Especialización Mago Oscuro 1.", "Consumo Diabolica": "Requiere Incendio Diabolica.", "Crucio": "Requiere Especialización Mago Oscuro 3.", "Desmaius": "Requiere Impedimenta.", "Exorcismo": "Requiere Especializacion Mago Oscuro 2.", "Fiendfyre": "Requiere Incendio.", "Finite Incantatem": "Requiere Finite.", "Fluctus Máxima": "Requiere Fluctus.", "Fulgari": "Requiere Incarcerous.", "Furia Plantae": "Requiere Impetus Plantae.", "Gubraith": "Requiere Poder 7.", "Harmonia Nectere Passus": "Requiere Reparo.", "Illuminas Pluviam": "Requiere Infulgurum.", "Imperio": "Requiere Especialización Mago Oscuro 3.", "Impulso Fractus": "Requiere Everte Statum.", "Incendio Diabolica": "Requiere Protego Diabolica.", "Legeremens": "Requiere Legeremens Media.", "Levinsana": "Requiere Levicorpus.", "Lingualoopsia": "Requiere Tarantallegra.", "Locomotor Finalis": "Requiere Locomotor Terminatus.", "Macrocranio": "Requiere Dispergam.", "Morswunde": "Requiere ser Mortifago Experto.", "Nebula Alchimia": "Requiere Alchimia Incantatio Maxima.", "Nuntius": "Requiere Nuntius Media.", "Oclumens": "Requiere Oclumens Media.", "Parasitus Maxima": "Requiere Parasitus.", "Paries Ignis": "Requiere Aqua Volatem y Partis Temporus.", "Partis Temporus": "Requiere Fianto Duri.", "Portaberto": "Requiere Aberto.", "Potentiae Actus": "Requiere Dual Potens.", "Repelium Máxima": "Requiere Repelium.", "Rupturum": "Especialidad Mago Oscuro 2.", "Salvio Hexia": "Requiere Protego Máxima.", "Sectumsempra": "Requiere Sectum.", "Specialis Revelio": "Requiere Revelio.", "Turbinis": "Requiere Ruptis.", "Vulnera Sanentur": "Requiere Remedium.", "Aberto": "Requiere Alohomora.", "Alchimia Incantatio": "Requiere Alchima Incantantio Minima.", "Andacht": "Requiere ser Ordenista Competente.", "Antus": "Requiere Alset.", "Aquacaudalis": "Requiere Aquaeructo.", "Aqua Volatem": "Requiere Jaulio y Fianto Duri.", "Arania Exumai": "Requiere Especialización Magizoólogo 1.", "Avium Grex": "Requiere Avis.", "Cohortis": "Requiere Obscuro.", "Confringo": "Requiere Bombarda.", "Delictum": "Requiere Aparecium.", "Deprimo": "Requiere Defodio.", "Dispergam": "Requiere Expulso.", "Dual Potens": "Requiere Agmen.", "Everte Statum": "Requiere Flipendo.", "Expelliarmus": "requiere renunciar a usar talentos de combate en el turno siguiente.", "Fianto Duri": "Requiere Claustra Terrae.", "Finite": "Requiere Especialización Hechicero 3.", "Fluctus": "Requiere Fluctus Mínima.", "Glacius": "Requiere Frigus.", "Impedimenta": "Requiere Petrificus Totallus.", "Impetus Plantae": "Requiere Amica Plantae.", "Incarcerous": "Requiere Atabraquium.", "Incendio": "Requiere Lacarnum Inflamarae.", "Infulgurum": "Requiere Rayo.", "Legeremens Media": "Requiere Legeremens Minoris.", "Levicorpus": "Requiere Alarte Ascendere.", "Locomotor Terminus": "Requiere Locomotor Mortis.", "Loqui Animal": "Requiere Sensus Animal y un nivel de la especialización magizoología acorde a la clase de bestia o criatura.", "Morsequor": "Requiere ser Mortifago Competente.", "Nuntius Media": "Requiere Nuntius Minoris.", "Obliviate": "Requiere Especialización Mago Oscuro 1.", "Oclumens Media": "Requiere Oclumens Minoris.", "Onerarios": "Requiere ser Ordenista Competente.", "Parasitus": "Requiere Parasitus Mínima.", "Protego Máxima": "Requiere Protego.", "Remedium": "Requiere Episkey.", "Reparifors": "Requiere Ferula.", "Reparo": "Requiere Reparo Mínima.", "Repelium": "Requiere Repelium Mínima.", "Revelio": "Requiere Aparecium.", "Ruptis": "Requiere Ventus.", "Sectum": "Requiere Diffindo.", "Tarantallegra": "Requiere Rictumsempra.", "Vespertilliomuci": "Requiere Tragababosas.", "Vulneructum": "Requiere Especialización Medimagia 1.", "Egni ✦": "Requiere Enervate y Especialización Medimagia 1.", "Emtiv ✦": "Requiere Encantador 2.", "Vastag Köd ✦": "Requiere Köd.", "Confocus ✦": "Requiere Confundo.", "Expecto Tenebris ✦": "Requiere Mago Oscuro 1.", "Halálos Köd ✦": "Requiere Vastag Köd.", "Invow ✦": "Requiere Emtiv.", "Filtro de niebla embotellada ✦": "Requiere Köd.", "Filtro de forma de niebla ✦": "Requiere Filtro de esencia de niebla.", "Integrum Elixir ✦": "Requiere Especialización Medimagia 2.", "Coetus Fuga ✦": "Requiere Aurium.", "Lumos Salta ✦": "Requiere Lumos.", "Geistimalle ✦": "Requiere Confundo.", "Ritual de purificación ✦": "Requiere Especialización Magizoólogo 1, Maestría en Dementores y Hechizo Virtuoso: Expecto Patronum.", "Sanctum ✦": "Requiere Köd.", "Sutura mnemónica | Rememoratio ✦": "Requiere Hechicero 1 y Modificación Mental Mayor.", "Fabulari Distare ✦": "Requiere Illusia Máxima y Ritual de Clarividencia.", "Ritual del simulacro de niebla ✦": "Requiere Ritual de los ojos de la niebla.", "Ritual Widerhersteele ✦": "Requiere Horrocrux.", "Estuche Arcaico de Cirugía Avanzada Mágica ✦": "Requiere Sanatore. Requiere especialización Medimago 3 para usarlo en uno mismo.", "Ritual de Confinamiento de Muerte | Confinis Mortem ✦": "Requiere Especialización Mago Oscuro 3.", "Meteoloembrujo Recanto": "Requiere Especialización Hechicero 1.", "Tirmelo Plantae": "Requiere Audire Plantae.", "Ritual de castigo mayor | Damnum Mayoris": "Requiere Ritual de castigo.", "Transfiguración humana absoluta | Alter Humanus": "Requiere Transfiguratio Mayoris."};
/* [nombre, grageas, puntos legendarios, requisito] */
const LISTAS={
 talento:{"Generales":[["Acción Coordinada",100],["Identidad Alternativa",500],["Maestría en [animal o bestia]",100],["Maestría en [ser mágico]",200],["Primeros Auxilios",300],["Último estertor",500]],
  "Mágicos":[["Animagia",600],["Aparecerse",200,0,"Poder 2 y 17 años"],["Conjuración silenciosa",250,0,"Poder 3"],["Conjurar sin varita",2500,25,"Poder 7 y Arcanismo 3"],["Horrocrux",1500,15,"Poder 7, Arcanismo 4, Esp. Artes Oscuras 3"],["Maestría en antídotos",200],["Oráculo",666]],
  "De arcanos":[["Hechizo Predilecto",200,2],["Hechizo Raudo",300,3],["Hechizo Virtuoso",300,3],["Hechizo Inventado",600,6],["Poción Predilecta",200,2],["Poción Rauda",300,3],["Poción Virtuosa",300,3],["Poción Inventada",600,6],["Ritual Predilecto",200,2],["Ritual Raudo",300,3],["Ritual Virtuoso",300,3],["Ritual Inventado",600,6],["Objeto Inventado",600,6]],
  "De combate":[["Ataque agresivo",75,0,"Combatiente 1"],["Ataque cauteloso",75,0,"Combatiente 1"],["Ataque rápido",75,0,"Combatiente 1"],["Ataque explosivo",250,0,"Ataque rápido y Combatiente 2"],["Flanquear",250,0,"Ataque agresivo y Combatiente 2"],["Usar cobertura",250,0,"Ataque cauteloso y Combatiente 2"],["Ataque múltiple",250,0,"Combatiente 2"],["Asalto cegador",500,0,"Ataque explosivo y Combatiente 3"],["Ataque crítico",500,0,"Flanquear y Combatiente 3"],["Defensa total",500,0,"Usar cobertura y Combatiente 3"],["Beber poción",100],["Lanzar poción",300,0,"Beber poción"],["Desarme",300],["Entrenador de criaturas",300,0,"Compañero animal"],["Entrenador de reanimados",300,0,"Un reanimado"],["Proteger",100],["Sometimiento",600]],
  "Sociales":[["Aliado Torpe",100],["Aliado Común",300],["Aliado Dotado",600],["Compañero Animal Doméstico",50,0,"Magizoólogo 1 y Maestría"],["Compañero Animal Básico",100,0,"Magizoólogo 2 y Maestría"],["Compañero Animal Intermedio",300,0,"Magizoólogo 3 y Maestría"],["Compañero Animal Avanzado",600,0,"Magizoólogo 3 y Maestría"],["Reanimado Torpe",50],["Reanimado Común",150],["Reanimado de Cámara",300],["Reanimado de Combate",600],["Lazo",50],["Unión",50,0,"Lazo"],["Vínculo",50,0,"Unión"]]},
 arma:{"Arma":[["Arma física",100]],
  "Materiales":[["Tratamiento de encantador",50],["Adamantino",100],["Emplasto de dragón",150],["Reforjado por duendes",200],["Acero duendigozna",300,0,"Reforjado por duendes"]],
  "Runas básicas (1 espacio)":SP("Ignis|Glacies|Ventus|Fulgur|Sanguis|Crepitus|Fixum").map(n=>["Runa "+n+" Mínima",50,0,"Combatiente 1"]).concat([["Runa Venite",50,0,"Combatiente 1"]]),
  "Runas intermedias (2 espacios)":SP("Ignis|Glacies|Ventus|Fulgur|Sanguis|Crepitus|Fixum").map(n=>["Runa "+n+" Media",150,0,"Runa Mínima y Combatiente 2"]),
  "Runas avanzadas (3 espacios)":SP("Ignis|Glacies|Ventus|Fulgur|Sanguis|Crepitus|Fixum").map(n=>["Runa "+n+" Máxima",300,0,"Runa Media y Combatiente 3"])},
 raza:{"Razas":[["Metamorfomago",500],["Semiduende",500],["Semigigante",500],["Semiveela",500],["Licantropía",150,0,"Explicarlo en la historia de la ficha"]]},
 quidditch:{"Maniobras":[["Maniobra doméstica",25],["Maniobra básica",75,0,"Jugador de Quidditch 1"],["Maniobra intermedia",250,0,"Jugador de Quidditch 2"],["Maniobra avanzada",500,0,"Jugador de Quidditch 2"]],
  "Escobas":[["Escoba básica (Nimbus 1000, Barredora 7…)",100],["Escoba intermedia (Nimbus 2000/2001, Saeta de Fuego…)",200],["Escoba avanzada (Saeta de Fuego Suprema, Saeta de Trueno VII)",300]],
  "Protecciones":[["Yelmo de Whisp",100],["Brazales de Whisp",200],["Pechera de Whisp",300]],
  "Guantes":[["Guantes de Todoroki",100],["Agarraderas de Llewellyn",200],["Magnetos de Weasley",300]],
  "Bates":[["Golpeabludgers de Quigley",100],["Quebrantahuesos de Draganov",200],["Lucesfuera de Jones",300]]},
 legendario:{"Características legendarias":[["Compañero Animal Legendario",1000,10,"Magizoólogo del nivel del compañero y Experto en el animal"],["Arcano Legendario",3000,30,"Diseñarlo con Sistemas"],["Reliquia Legendaria",3000,30,"Diseñarla con Sistemas"],["Evolución de Trasfondos",0,5,"Esperar un año entre canjes"]]}};
const IDI_MAG=["Duendigozna","Gigante","Hadas","Pársel","Runas","Sirenio","Troll"], IDI_LV=["Ninguno","Bajo","Medio","Alto"];
const ASIG=["Adivinación, Astrología y Astronomía","Cuidado de Criaturas Mágicas","Defensa contra las Artes Oscuras","Encantamientos y Transformaciones","Estudios Muggles","Herbología y Pociones","Historia de la Magia","Magia Ritual"];
const CALIF=["Aceptable","Supera Expectativas","Extraordinario"];
const PRIO=[["alta","Alta","rose","▲"],["media","Media","peach","●"],["baja","Baja","mint","▼"]];
const WCATS=[["atributo","💪 Atributo"],["habilidad","🎯 Habilidad"],["trasfondo","📚 Trasfondo"],["ventaja","👑 Ventaja"],["especializacion","🎓 Especialización"],["hechizo","🪄 Hechizo"],["pocion","⚗️ Poción"],["ritual","🕯️ Ritual"],["objeto","💎 Objeto mágico"],["arma","⚔️ Arma o runa"],["talento","✨ Talento"],["idioma","🗣️ Idioma"],["titulo","📜 Título académico"],["quidditch","🧹 Quidditch"],["raza","🧬 Raza"],["destino","⭐ Destino, límites y proezas"],["legendario","🌟 Otras legendarias"],["otro","✏️ Otro (lo escribís vos)"]];
let wd={cat:"atributo",prio:"media"};
const allHabs=()=>Object.values(HABS).flat();
const range=(a,b,c)=>{let g=0;for(let l=a+1;l<=b;l++)g+=c[l]||0;return g;};
function wOpt(v,list,lab){return list.map((x,i)=>{const val=Array.isArray(x)?x[0]:x;const t=lab?lab(x,i):(Array.isArray(x)?x[0]:x);return `<option value="${esc(val)}"${String(val)===String(v)?" selected":""}>${esc(t)}</option>`;}).join("");}
function numOpts(v,from,to,lab){let h="";for(let i=from;i<=to;i++)h+=`<option value="${i}"${+v===i?" selected":""}>${esc(lab?lab(i):i)}</option>`;return h;}
function wf(lbl,inner,cls){return `<label class="wf${cls?" "+cls:""}"><span class="lbl">${lbl}</span>${inner}</label>`;}
function wsel(k,opts){return `<select class="cell wsel" data-wd="${k}">${opts}</select>`;}
function winp(k,ph,type){return `<input class="cell wsel" data-wd="${k}" value="${esc(wd[k]??"")}" placeholder="${esc(ph||"")}"${type?` type="${type}" min="0"`:""}>`;}
function grouped(cat){return Object.entries(LISTAS[cat]).map(([g,items])=>`<optgroup label="${esc(g)}">${items.map(x=>`<option value="${esc(x[0])}"${wd.item===x[0]?" selected":""}>${esc(x[0])} · ${x[1]}${x[2]?" + "+x[2]+" PL":""}</option>`).join("")}</optgroup>`).join("");}
function findItem(cat,n){for(const items of Object.values(LISTAS[cat]))for(const x of items)if(x[0]===n)return x;return null;}
function wDefaults(){const d=wd,c=d.cat;
  if(c==="atributo"){d.atr??=ATRS[0];d.de??=0;d.a??=Math.min(8,+d.de+1);}
  if(c==="habilidad"){d.hab??="Atletismo";d.de??=0;d.a??=1;}
  if(c==="trasfondo"){d.tt??=TRAS_T[0];d.tc??="General";d.de??=0;d.a??=1;}
  if(c==="ventaja"){d.vt??=VENT[0];d.de??=0;d.a??=1;}
  if(c==="especializacion"){d.er??=ESP_R[0];d.en??=1;}
  if(["hechizo","pocion","ritual","objeto"].includes(c)){if(d.nv===undefined||(c!=="hechizo"&&+d.nv===0))d.nv=1;}
  if(["talento","arma","raza","quidditch","legendario"].includes(c)){if(!d.item||!findItem(c,d.item))d.item=Object.values(LISTAS[c])[0][0][0];}
  if(c==="idioma"){d.it??="Mágico";d.de??=0;d.a??=1;}
  if(c==="titulo"){d.tk??="EXTASIS";d.as??=ASIG[0];d.ca??=CALIF[0];}
  if(c==="destino"){d.dk??="pd";}
}
function wCompute(p){const d=wd,c=d.cat;wDefaults();
  if(c==="atributo"){const de=+d.de,a=+d.a;if(a<=de)return null;return {n:`${d.atr} ${de} → ${a}`,g:range(de,a,ATR_COST),pl:a>=8?17:0,req:(a>=8?"Al 8 requiere Veteranía Legendaria. ":"")+(a>5?"Pasar de 5 requiere Talentoso":"Necesitás el límite de STAT a "+a)};}
  if(c==="habilidad"){const de=+d.de,a=+d.a;if(a<=de)return null;const arte=d.hab==="Arte/Artesanía";return {n:`${d.hab}: ${HAB_LV[de]} → ${HAB_LV[a]}`,g:range(de,a,arte?ARTE_COST:HAB_COST),pl:a>=5?7:0,req:a>=5?"Requiere Maestro y Veteranía Legendaria":a>=4?"Maestro requiere el Talentoso de su atributo":""};}
  if(c==="trasfondo"){const de=+d.de,a=+d.a;if(a<=de)return null;const esp=d.tc==="Específico";const base=l=>l<=5?(esp?50:100)*l:0;let g=0,pl=0;for(let l=de+1;l<=a;l++){g+=base(l);}if(a>=6){g+=esp?300:600;pl=esp?3:6;}
    const cat=String(d.tcat||"").trim();return {n:`${d.tt} ${d.tc}${cat?" > "+cat:""} ${ROM[de]} → ${ROM[a]}`,g,pl,req:a>=6?"Nivel VI es legendario: requiere tenerlo al V":""};}
  if(c==="ventaja"){const de=+d.de,a=+d.a;if(a<=de)return null;return {n:`${d.vt} ${ROM[de]} → ${ROM[a]}`,g:range(de,a,VENT_COST),pl:a>=4?10:0,req:a>=4?"Nivel IV es legendario: requiere tenerla al III":""};}
  if(c==="especializacion"){const ya=+(p.wishCfg?.esp||0),pend=(p.wish||[]).filter(w=>w.cat==="especializacion"&&!w.hecho).length,n=ya+pend+1;return {n:`${d.er} ${d.en}`,g:150*n,pl:0,req:`Sería tu ${n}ª especialización${+d.en>1?" · requiere "+d.er+" "+(d.en-1):""}`};}
  if(["hechizo","pocion","ritual","objeto"].includes(c)){const nv=+d.nv,lista=ARC[c][nv]||[];const nm=d.nm&&(lista.includes(d.nm)||d.nm==="__otro")?d.nm:lista[0];d.nm=nm;const nombre=nm==="__otro"?String(d.libre||"").trim():nm;if(!nombre)return null;
    const tipo={hechizo:"Hechizo",pocion:"Poción",ritual:"Ritual",objeto:"Objeto"}[c];const leg=nv===4;
    const base=leg?(c==="objeto"?"Reliquia Legendaria: requiere Veteranía Legendaria y diseñarla con Sistemas":"Arcano Legendario: requiere Veteranía Legendaria y diseñarlo con Sistemas"):c==="pocion"?`Requiere Pociones ${HAB_LV[nv]}`:c==="ritual"?`Requiere Rituales ${HAB_LV[nv]}`:(c==="hechizo"&&nv>=2?`Necesitás un arcano ${ARC_NV[nv-1][0].toLowerCase()} por cada ${ARC_NV[nv][0].toLowerCase()}`:"");
    const extra=ARC_REQ[nm]||"";const req=[extra,base].filter(Boolean).join(" · ");
    return {n:`${tipo} ${ARC_NV[nv][0].toLowerCase()}: ${nombre}`,g:ARC_NV[nv][1],pl:leg?30:0,req};}
  if(["talento","arma","raza","quidditch","legendario"].includes(c)){const x=findItem(c,d.item);if(!x)return null;const extra=String(d.det||"").trim();return {n:x[0]+(extra?" ("+extra+")":""),g:x[1],pl:x[2]||0,req:x[3]||""};}
  if(c==="idioma"){const de=+d.de,a=+d.a;if(a<=de)return null;const mag=d.it==="Mágico";const nom=mag?(d.im||IDI_MAG[0]):(String(d.il||"").trim()||"Idioma muggle");return {n:`${nom}: ${IDI_LV[de]} → ${IDI_LV[a]}`,g:(a-de)*(mag?100:50),pl:0,req:mag?"Explicar en la historia quién te lo enseña":""};}
  if(c==="titulo"){const i=CALIF.indexOf(d.ca);if(d.tk==="TIMOs")return {n:`TIMOs: ${d.ca}`,g:[50,100,150][i],pl:0,req:"Curso mínimo: 6.º"};return {n:`EXTASIS ${d.as}: ${d.ca}`,g:[30,60,90][i],pl:0,req:"Etapa mínima: Joven"};}
  if(c==="destino"){const k=d.dk;if(k==="pd")return {n:"Punto de Destino",g:1000,pl:0,req:"Máximo uno por año de veteranía"};
    if(k==="lim")return {n:`+1 al límite de ${d.atr||ATRS[0]}`,g:500,pl:0,req:"Máximo dos por año; sin diferencias de 2 entre límites"};
    if(k==="tal")return {n:`Talentoso en ${d.atr||ATRS[0]}`,g:1000,pl:0,req:"Todos los límites a 5"};
    if(k==="pro")return {n:`Proeza de ${d.hab||"Atletismo"}`,g:300,pl:3,req:"+9 entre Habilidad y STAT; tantas como Puntos de Destino"};}
  if(c==="otro"){const nm=String(d.libre||"").trim();if(!nm)return null;return {n:nm,g:num(d.g),pl:num(d.pl),req:""};}
  return null;}
function wForm(p){const d=wd,c=d.cat;wDefaults();let f="";
  const atrSel=k=>wsel(k,wOpt(d[k]||ATRS[0],ATRS));
  const habSel=k=>`<select class="cell wsel" data-wd="${k}">${Object.entries(HABS).map(([a,hs])=>`<optgroup label="${a}">${hs.map(h=>`<option${(d[k]||"Atletismo")===h?" selected":""}>${h}</option>`).join("")}</optgroup>`).join("")}</select>`;
  if(c==="atributo")f=wf("Atributo",atrSel("atr"))+wf("Lo tenés en",wsel("de",numOpts(d.de,0,7)))+wf("Lo querés en",wsel("a",numOpts(d.a,1,8,i=>i===8?"8 (legendario)":i)));
  if(c==="habilidad")f=wf("Habilidad",habSel("hab"))+wf("La tenés en",wsel("de",numOpts(d.de,0,4,i=>HAB_LV[i])))+wf("La querés en",wsel("a",numOpts(d.a,1,5,i=>HAB_LV[i])));
  if(c==="trasfondo")f=wf("Trasfondo",wsel("tt",wOpt(d.tt,TRAS_T)))+wf("Clase",wsel("tc",wOpt(d.tc,["General","Específico"])))+wf("Categoría",`<input class="cell wsel" data-wd="tcat" list="dl-cat" value="${esc(d.tcat||"")}" placeholder="Ej.: Política > Azkaban"><datalist id="dl-cat">${TRAS_CAT.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`)+wf("Lo tenés en",wsel("de",numOpts(d.de,0,5,i=>ROM[i])))+wf("Lo querés en",wsel("a",numOpts(d.a,1,6,i=>i===6?"VI (legendario)":ROM[i])));
  if(c==="ventaja")f=wf("Ventaja",wsel("vt",wOpt(d.vt,VENT)))+wf("La tenés en",wsel("de",numOpts(d.de,0,3,i=>ROM[i])))+wf("La querés en",wsel("a",numOpts(d.a,1,4,i=>i===4?"IV (legendaria)":ROM[i])));
  if(c==="especializacion")f=wf("Rama",wsel("er",wOpt(d.er,ESP_R)))+wf("Nivel",wsel("en",numOpts(d.en,1,3)))+wf("¿Cuántas especializaciones tenés ya?",`<input class="cell wsel" type="number" min="0" max="21" data-wcfg="esp" value="${+(p.wishCfg?.esp||0)}">`);
  if(["hechizo","pocion","ritual","objeto"].includes(c)){const niv=ARC_NV.map((x,i)=>[i,x]).filter(([i])=>(ARC[c][i]||[]).length);const lista=ARC[c][+d.nv]||[];
    f=wf("Nivel",`<select class="cell wsel" data-wd="nv">${niv.map(([i,x])=>`<option value="${i}"${+d.nv===i?" selected":""}>${x[0]} · ${x[1]}${i===4?" + 30 PL":""}</option>`).join("")}</select>`)+wf("Nombre",`<select class="cell wsel" data-wd="nm">${lista.map(n=>`<option${d.nm===n?" selected":""}>${esc(n)}</option>`).join("")}<option value="__otro"${d.nm==="__otro"?" selected":""}>Otro (lo escribo yo)…</option></select>`,"grow")+(d.nm==="__otro"?wf("¿Cuál?",winp("libre","Nombre")):"");}
  if(["talento","arma","raza","quidditch","legendario"].includes(c))f=wf("Canje",`<select class="cell wsel" data-wd="item">${grouped(c)}</select>`,"grow")+wf("Detalle (opcional)",winp("det",c==="arma"?"Ej.: daga de plata":"Ej.: hipogrifo, posición…"));
  if(c==="idioma")f=wf("Tipo",wsel("it",wOpt(d.it,["Mágico","Muggle"])))+(d.it==="Muggle"?wf("Idioma",winp("il","Ej.: Francés")):wf("Idioma",wsel("im",wOpt(d.im||IDI_MAG[0],IDI_MAG))))+wf("Lo tenés en",wsel("de",numOpts(d.de,0,2,i=>IDI_LV[i])))+wf("Lo querés en",wsel("a",numOpts(d.a,1,3,i=>IDI_LV[i])));
  if(c==="titulo")f=wf("Título",wsel("tk",wOpt(d.tk,["EXTASIS","TIMOs"])))+(d.tk==="EXTASIS"?wf("Asignatura",wsel("as",wOpt(d.as,ASIG)),"grow"):"")+wf("Calificación",wsel("ca",wOpt(d.ca,CALIF)));
  if(c==="destino")f=wf("Canje",wsel("dk",[["pd","Punto de Destino · 1000"],["lim","+1 al límite de un STAT · 500"],["tal","Talentoso · 1000"],["pro","Proeza · 300 + 3 PL"]].map(([v,t])=>`<option value="${v}"${d.dk===v?" selected":""}>${t}</option>`).join("")),"grow")+(d.dk==="lim"||d.dk==="tal"?wf("Atributo",atrSel("atr")):"")+(d.dk==="pro"?wf("Habilidad",habSel("hab")):"");
  if(c==="otro")f=wf("Qué es",winp("libre","Ej.: Objeto Inventado — Reloj de arena"),"grow")+wf("Grageas",winp("g","0","number"))+wf("Puntos Legendarios",winp("pl","0","number"));
  return f;}
function wPreview(p){const r=wCompute(p);return r?`<span class="wp-n">${esc(r.n)}</span><strong class="wp-g">${r.g} <small>grageas</small></strong>${r.pl?`<strong class="wp-pl">+ ${r.pl} <small>PL</small></strong>`:""}${r.req?`<span class="wp-req">⚠ ${esc(r.req)}</span>`:""}`:`<span class="muted small">Elegí un nivel mayor al que ya tenés.</span>`;}
function wishCalc(p){const b=bov(p),have=num(b.act),havePl=num(b.pla);const pend=(p.wish||[]).filter(w=>!w.hecho).sort((a,b)=>PRIO.findIndex(x=>x[0]===a.prio)-PRIO.findIndex(x=>x[0]===b.prio));
  let cg=0,cp=0;const ok={};pend.forEach(w=>{cg+=num(w.g);cp+=num(w.pl);ok[w.id]={cg,cp,alc:cg<=have&&cp<=havePl};});
  const tot={g:cg,pl:cp};const by={};PRIO.forEach(([k])=>{by[k]=pend.filter(w=>w.prio===k).reduce((a,w)=>a+num(w.g),0);});return {have,havePl,pend,ok,tot,by};}
V.canjes=()=>{
  if(!pjSel||!pjById(pjSel))pjSel=S.personajes[0]?.id||null;
  const p=pjById(pjSel);
  const sel=`<div class="pjs">${S.personajes.map(x=>`<button class="pj-tab c-${x.tono}" aria-pressed="${x.id===pjSel}" data-act="pj" data-id="${x.id}">${esc(x.emoji)} ${esc(x.nombre)}</button>`).join("")}</div>`;
  if(!p)return `<h2>🎁 Futuros canjes</h2><p class="empty">Creá un personaje primero.</p>`;
  p.wish=p.wish||[];p.wishCfg=p.wishCfg||{esp:0};
  const k=wishCalc(p),falta=Math.max(0,k.tot.g-k.have),pct=k.tot.g?Math.min(100,Math.round(k.have/k.tot.g*100)):100,faltaPl=Math.max(0,k.tot.pl-k.havePl);
  const row=w=>{const o=k.ok[w.id];const pr=PRIO.find(x=>x[0]===w.prio)||PRIO[1];return `<div class="wi${w.hecho?" done":""}" data-wid="${w.id}" style="--pc:var(--${pr[2]}-fg)">
    <select class="cell chip t-${pr[2]} wprio" data-wfield="prio" aria-label="Prioridad">${PRIO.map(([v,l,,ic])=>`<option value="${v}"${w.prio===v?" selected":""}>${ic} ${l}</option>`).join("")}</select>
    <div class="wi-t"><span class="wi-n">${esc(w.n)}</span>${w.req?`<span class="wi-req">${esc(w.req)}</span>`:""}</div>
    <span class="wi-g">${num(w.g)}<small> g</small>${num(w.pl)?`<br><span class="wi-pl">${num(w.pl)} PL</span>`:""}</span>
    <span class="wi-s">${w.hecho?`<span class="chip-s t-lilac">✓ canjeado</span>`:o.alc?`<span class="chip-s t-mint">✓ te alcanza</span>`:`<span class="chip-s t-gray" title="Grageas acumuladas en orden de prioridad">faltan ${Math.max(0,o.cg-k.have)}</span>`}</span>
    <span class="wi-a">${w.hecho?`<button class="ghost" data-act="wUndo" title="Volver a la lista">↶</button>`:`<button class="ghost" data-act="wBov" title="Marcar como canjeado y cargar el gasto en la Bóveda">→ Bóveda</button><button class="ghost" data-act="wDone" title="Marcar como canjeado">✓</button>`}<button class="ghost lg-x" data-act="wDel" aria-label="Quitar">✕</button></span></div>`;};
  const pend=k.pend,hechos=p.wish.filter(w=>w.hecho);
  return `<div class="row between"><h2>🎁 Futuros canjes</h2>${sel}</div>
  <section class="w-sum">
    <div class="w-big"><span class="lbl">Necesitás</span><strong>${k.tot.g}</strong><small>grageas${k.tot.pl?` + ${k.tot.pl} PL`:""}</small></div>
    <div class="w-big"><span class="lbl">Tenés en la bóveda</span><strong>${k.have}</strong><small>grageas · ${k.havePl} PL</small></div>
    <div class="w-big ${falta?"neg":"pos"}"><span class="lbl">${falta?"Te faltan":"¡Te alcanza todo!"}</span><strong>${falta}</strong><small>grageas${faltaPl?` y ${faltaPl} PL`:""}</small></div>
    <div class="w-bar" role="img" aria-label="Tenés el ${pct}% de lo que necesitás"><i style="width:${pct}%"></i><span>${pct}%</span></div>
    <div class="w-prio">${PRIO.map(([v,l,t,ic])=>`<span class="chip-s t-${t}">${ic} ${l}: <strong>${k.by[v]}</strong> g</span>`).join("")}</div>
  </section>
  <section class="w-add"><h3>✚ Agregar a la lista</h3>
    <div class="w-form">${wf("¿Qué querés canjear?",`<select class="cell wsel" data-wd="cat">${WCATS.map(([v,l])=>`<option value="${v}"${wd.cat===v?" selected":""}>${l}</option>`).join("")}</select>`)}${wForm(p)}</div>
    <div class="row" style="justify-content:space-between;align-items:center;gap:12px">
      <div class="w-prev" id="wPrev" aria-live="polite">${wPreview(p)}</div>
      <div class="row"><span class="lbl" style="margin-right:2px">Prioridad</span>${PRIO.map(([v,l,t,ic])=>`<button class="pr-b t-${t}" aria-pressed="${wd.prio===v}" data-act="wPrio" data-v="${v}">${ic} ${l}</button>`).join("")}<button class="primary" data-act="wAdd">Agregar</button></div>
    </div>
  </section>
  <section class="w-list">${pend.length?pend.map(row).join(""):`<p class="empty">Tu lista está vacía. Agregá lo que querés canjear y te digo cuántas grageas necesitás.</p>`}</section>
  ${hechos.length?`<details class="w-done"><summary>Ya canjeados (${hechos.length})</summary>${hechos.map(row).join("")}</details>`:""}
  <p class="small muted" style="margin:0">Los precios salen de la lista de canjes del foro. Los arcanos con ✦ son inventados por usuarios del foro. «Te alcanza» suma en orden de prioridad (alta, media, baja) contra las grageas actuales de la Bóveda.</p>`;
};

V.coloreador=()=>"";
V.copia=()=>importView()+`<h2>💾 Copia de seguridad</h2>
  <p style="margin:0;max-width:62ch">${store.kind==="db"?"Tu registro se guarda en tu cuenta y lo ves solo vos.":"Tu registro se guarda en este navegador. Si cambiás de dispositivo o borrás los datos del navegador, se pierde."} Copiá el código de vez en cuando y guardalo donde quieras; pegándolo acá lo recuperás.</p>
  <div style="display:grid;gap:8px"><textarea class="code-box" id="exp" readonly aria-label="Código del registro">${esc(JSON.stringify(S))}</textarea><div><button class="primary" data-act="copy">Copiar código</button></div></div>
  <div style="display:grid;gap:8px"><h3>Cargar un código</h3><textarea class="code-box" id="imp" placeholder="Pegá acá el código de tu registro" aria-label="Pegar código"></textarea><div class="row"><button data-act="import">Cargar</button><span class="small muted">Reemplaza todo lo que hay ahora.</span></div></div>
  <details><summary>Borrar todo</summary><p class="small muted">Vuelve a la plantilla en blanco.</p><button class="warn" data-act="wipe">Borrar todo</button></details>`;


/* ---------- ánimo ---------- */
const TRATO={chica:{w:"girl",e:"👧",l:"Chica",reina:"reina"},chico:{w:"boy",e:"👦",l:"Chico",reina:"rey"},persona:{w:"person",e:"🌟",l:"Indefinido",reina:"leyenda"}};
function pendientes(){const out=[];let venc=0,total=0;S.personajes.forEach(p=>p.roles.forEach(r=>{total++;if(r.estado==="Sin Contestar")out.push({p,r});if(limEstado(r)==="over")venc++;}));return {out,venc,total};}
function moodState(){const {out,venc,total}=pendientes();if(!total)return{m:"zen",out,venc,total};if(!out.length)return{m:"happy",out,venc,total};if(out.length>=3||venc)return{m:"cry",out,venc,total};return{m:"sad",out,venc,total};}
const pick=a=>a[Math.floor(Math.random()*a.length)];
let frase={};
function faceSVG(m){
  const eyes={
    happy:'<path d="M30 46 q7 -9 14 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M56 46 q7 -9 14 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    sad:'<path d="M29 43 l12 -5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M71 43 l-12 -5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="37" cy="51" r="5.5" fill="currentColor"/><circle cx="63" cy="51" r="5.5" fill="currentColor"/><circle cx="39" cy="49" r="1.8" fill="var(--surface)"/><circle cx="65" cy="49" r="1.8" fill="var(--surface)"/>',
    cry:'<path d="M28 44 q9 6 16 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M56 44 q9 6 16 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    zen:'<path d="M30 49 h13" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M57 49 h13" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'}[m];
  const mouth={happy:'<path d="M38 62 q12 16 24 0 z" fill="currentColor"/><path d="M44 68 q6 5 12 0" fill="var(--rose-fg)" opacity=".8"/>',
    sad:'<path d="M40 71 q10 -9 20 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    cry:'<path d="M37 74 q13 -16 26 0 q-13 -5 -26 0 z" fill="currentColor"/>',
    zen:'<path d="M43 67 q7 4 14 0" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'}[m];
  const tears=m==="sad"?'<path class="tear" d="M64 58 q-3 6 0 8 q3 -2 0 -8z" fill="var(--sky-fg)"/>':m==="cry"?'<path class="tear" d="M33 50 q-4 8 0 11 q4 -3 0 -11z" fill="var(--sky-fg)"/><path class="tear b" d="M67 50 q-4 8 0 11 q4 -3 0 -11z" fill="var(--sky-fg)"/><path class="tear b" d="M30 52 q-4 8 0 11 q4 -3 0 -11z" fill="var(--sky-fg)"/><path class="tear" d="M70 52 q-4 8 0 11 q4 -3 0 -11z" fill="var(--sky-fg)"/>':"";
  const extra=m==="happy"?'<text x="86" y="20" font-size="14">✨</text><text x="2" y="30" font-size="11">💖</text>':m==="cry"?'<text x="72" y="10" font-size="22">🌧️</text>':m==="zen"?'<text x="78" y="18" font-size="12">💤</text>':"";
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="54" r="40" fill="var(--surface)" stroke="currentColor" stroke-width="3.5"/>${m!=="zen"?'<ellipse cx="27" cy="62" rx="7" ry="4" fill="var(--rose-fg)" opacity=".28"/><ellipse cx="73" cy="62" rx="7" ry="4" fill="var(--rose-fg)" opacity=".28"/>':""}${eyes}${mouth}${tears}${extra}</svg>`;
}
function moodCard(){
  if(S.moodOff)return"";
  const st=moodState(),t=TRATO[S.trato],n=st.out.length;
  if(!frase[st.m+n])frase[st.m+n]=st.m==="happy"?pick(["Tus compañeros de rol te adoran.","Cero roles esperando. El foro está en paz gracias a vos.","Todo al día. Andá a tomarte un té, te lo ganaste.","Ni un rol pendiente. Sos el ejemplo del foro."])
    :st.m==="sad"?pick(["Los roles no se contestan solos…","Alguien está refrescando el tema esperando tu respuesta.","Un postcito y volvemos a ser felices.","Tu compañero de rol está mirando la ventana, esperándote."])
    :st.m==="cry"?pick(["Hay gente esperando. Mucha gente. La carita no aguanta más.","Esto ya es un abandono de roles. La carita llora.","Tus personajes te extrañan. Volvé.","La pila de roles crece y la carita se deshace."]):"Cuando anotes tus roles, acá te voy a contar cómo vas.";
  let big,sub=frase[st.m+n];
  if(st.m==="happy")big=t?`good ${t.w} ✨`:"good… ¿girl? ¿boy? ¿person?";
  else if(st.m==="sad")big=`${n===1?"Te falta 1 rol":"Te faltan "+n+" roles"} 🥺`;
  else if(st.m==="cry")big=`${n?n+(n===1?" rol sin contestar":" roles sin contestar"):"Fechas vencidas"} 😭`;
  else big="Todo tranqui por acá";
  if(st.m==="happy")sub=(t?`Contestaste todo, ${t.reina}. `:"Contestaste todo. ")+sub;
  if(st.venc)sub+=` (${st.venc===1?"1 fecha límite vencida":st.venc+" fechas límite vencidas"})`;
  const rain=st.m==="cry"?`<div class="mood-rain">${Array.from({length:22},(_,i)=>`<i style="left:${(i*4.7+Math.random()*3)%100}%;animation-duration:${.7+Math.random()*.7}s;animation-delay:${-Math.random()}s"></i>`).join("")}</div>`:"";
  const spk=st.m==="happy"?Array.from({length:7},()=>`<span class="sparkle" style="left:${Math.random()*96}%;top:${Math.random()*85}%;animation-delay:${-Math.random()*1.8}s">${pick(["✦","✨","⭐","💖"])}</span>`).join(""):"";
  return `<section class="mood ${st.m}${S.trato?"":" ask"}" aria-live="polite">${rain}${spk}<button class="mood-x" data-act="moodOff" aria-label="Ocultar la carita" title="Ocultar (la carita de arriba la vuelve a mostrar)">✕</button>
    <button class="face" data-act="face" aria-label="Carita">${faceSVG(st.m)}</button>
    <div class="mood-txt"><p class="mood-big${st.m==="happy"?" wiggle":""}">${esc(big)}</p><p class="mood-sub">${esc(sub)}</p>
    ${n?`<div class="pend">${st.out.slice(0,8).map(({p,r})=>`<button data-act="goPj" data-id="${p.id}">${esc(p.emoji)} ${esc(r.nombre||"(sin nombre)")}</button>`).join("")}${n>8?`<span class="small">y ${n-8} más</span>`:""}</div>`:""}</div>
    <div class="trato"><span class="q">${S.trato?"Te trato como:":"Antes que nada: ¿cómo querés que te trate?"}</span>${Object.entries(TRATO).map(([k,v])=>`<button data-act="trato" data-k="${k}" aria-pressed="${S.trato===k}"><span>${v.e} ${v.l}</span></button>`).join("")}</div>
  </section>`;
}
let lastMood=null;
function updateMood(){
  const st=moodState();
  RR.getElementById("miniFace").textContent={happy:"🥰",sad:"🥺",cry:"😭",zen:"🙂"}[st.m];
  if(lastMood&&lastMood!=="happy"&&st.m==="happy"&&!S.moodOff)party(true);
  lastMood=st.m;
}
function party(big){
  const box=RR.getElementById("party");const k=skinOf();
  const em=[...k.fx,"🎉","✨","💖","⭐"];
  const n=big?60:28;let h="";
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,d=120+Math.random()*(big?520:300);h+=`<span style="--x:${Math.cos(a)*d|0}px;--y:${Math.sin(a)*d*.8|0}px;--r:${(Math.random()*720-360)|0}deg;--d:${1.2+Math.random()*1.2}s;--s:${16+Math.random()*22|0}px">${pick(em)}</span>`;}
  box.innerHTML=h;clearTimeout(party.t);party.t=setTimeout(()=>box.innerHTML="",2600);
  if(big){const t=TRATO[S.trato];toast(t?`GOOD ${t.w.toUpperCase()} 🎉`:"¡Todo contestado! 🎉");}
}

/* ---------- render y eventos ---------- */
const panel=RR.getElementById("panel");
function render(){
  syncPam();
  migrar();
  applySkin();
  updateMood();
  RR.getElementById("owner").value=S.owner||"";
  RR.querySelectorAll("#tabs a").forEach(a=>a.setAttribute("aria-current",a.dataset.tab===tab?"page":"false"));
  const isCol=tab==="coloreador";panel.hidden=isCol;RR.getElementById("coloreador").hidden=!isCol;
  panel.innerHTML=V[tab]();
  requestAnimationFrame(()=>renderPumpkins());
}
function go(t){if(!V[t])t="inicio";tab=t;render();}
/* Pestañas sin depender del # de la dirección (algunas vistas embebidas lo bloquean) */
function nav(t){if(window.rrNav)window.rrNav(t);else go(t);}
RR.getElementById("tabs").addEventListener("click",e=>{const a=e.target.closest("a[data-tab]");if(!a)return;e.preventDefault();nav(a.dataset.tab);});

/* calabazas (solo Gothic Horror) */
function renderPumpkins(){const L=RR.getElementById("pumpkins");if(!L)return;const on=skinOf().id==="terror";const list=on?(S.pumpkins||[]):[];
  L.style.height=on?Math.max(document.documentElement.scrollHeight,innerHeight)+"px":"0px";
  L.innerHTML=list.map((q,i)=>`<button class="pk" data-i="${i}" title="Tocala para sacarla" aria-label="Calabaza" style="left:${q.x}%;top:${q.y}%;font-size:${q.s}px;--rot:${q.r}deg">🎃</button>`).join("");}
RR.getElementById("pumpkins").addEventListener("click",e=>{const b=e.target.closest(".pk");if(!b)return;S.pumpkins.splice(+b.dataset.i,1);save();applySkin();});
addEventListener("resize",()=>renderPumpkins());
RR.getElementById("skins").addEventListener("click",e=>{if(e.target.closest("[data-skt]")){skinsOpen=!skinsOpen;applySkin();return;}const pk=e.target.closest("[data-pk]");if(pk){S.pumpkins=S.pumpkins||[];
  if(pk.dataset.pk==="add"){for(let i=0;i<6;i++)S.pumpkins.push({x:+(Math.random()*94+1).toFixed(1),y:+(Math.random()*92+3).toFixed(1),s:22+Math.round(Math.random()*24),r:Math.round(Math.random()*40-20)});if(S.pumpkins.length>60)S.pumpkins=S.pumpkins.slice(-60);toast("🎃 ¡Calabazas! Tocá una para sacarla");}
  else{S.pumpkins=[];toast("Calabazas barridas 🧹");}
  save();applySkin();return;}const b=e.target.closest("[data-skin]");if(!b)return;S.skin=b.dataset.skin;skinsOpen=false;save();render();toast("Tema: "+skinOf().nombre);});
RR.getElementById("miniFace").addEventListener("click",()=>{if(S.moodOff){S.moodOff=false;save();toast("La carita volvió 🙂");}nav("inicio");});
RR.getElementById("owner").addEventListener("input",e=>{S.owner=e.target.value;save();});

function ctx(el){
  const tr=el.closest("[data-rid],[data-mid],[data-oid],[data-gid],[data-fid]");
  const card=el.closest("[data-pid]");
  return {tr,card};
}
function setField(el){
  const {tr,card}=ctx(el); let v=el.value;
  if(el.type==="number")v=+v||0;
  const p=pjById(pjSel);
  if(el.dataset.f&&p){const r=p.roles.find(x=>x.id===tr.dataset.rid);if(r)r[el.dataset.f]=v;}
  else if(el.dataset.pf&&p){p[el.dataset.pf]=v;if(el.dataset.pf==="nombre"&&p.pamId&&window.pamPjs)window.pamPjs.renombrar(p.pamId,v);}
  else if(el.dataset.mf){const m=S.turnos.misiones.find(x=>x.id===tr.dataset.mid);if(m)m[el.dataset.mf]=v;}
  else if(el.dataset.tf){S.turnos.tarifas[el.dataset.tf]=v;}
  else if(el.dataset.of){const o=S.oficiales.find(x=>x.id===tr.dataset.oid);if(o)o[el.dataset.of]=v;}
  else if(el.dataset.gf){const pj=pjById(card.dataset.pid);const g=pj&&pj.ganancias.find(x=>x.id===tr.dataset.gid);if(g)g[el.dataset.gf]=v;}
  else if(el.dataset.lf){const pj=pjById(pjSel);const lid=el.closest("[data-lid]")?.dataset.lid;const e=pj&&(bov(pj).log||[]).find(x=>x.id===lid);if(e)e[el.dataset.lf]=el.value;else return false;}
  else if(el.dataset.bf){const pj=pjById(pjSel);if(!pj)return false;const k=el.dataset.bf;bov(pj)[k]=["delta","pdelta","inv","enl","pet","ace","l1","l2","l3"].includes(k)?el.value:num(el.value);}
  else if(el.dataset.ff){const f=S.fijos.find(x=>x.id===tr.dataset.fid);if(f)f[el.dataset.ff]=v;}
  else return false;
  return true;
}
/* Pegar un enlace en el título del rol lo guarda como enlace */
panel.addEventListener("paste",e=>{const el=e.target;if(!el.matches||!el.matches('[data-f="nombre"]'))return;
  const txt=(e.clipboardData||window.clipboardData)?.getData("text")?.trim()||"";if(!/^https?:\/\/\S+$/i.test(txt))return;
  const tr=el.closest("[data-rid]"),p=pjById(pjSel),r=p&&tr&&p.roles.find(x=>x.id===tr.dataset.rid);if(!r)return;
  e.preventDefault();r.enlace=txt;linkOpen=null;save();render();toast("Enlace guardado: tocá «↗ Ir al rol» para abrirlo");});
panel.addEventListener("input",e=>{if(e.target.matches(".of-q")){ofQ=e.target.value;ofBuscar();}});
panel.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches('[data-f="enlace"]')){e.preventDefault();e.target.blur();linkOpen=null;render();}});
panel.addEventListener("input",e=>{if(e.target.dataset.bf&&setField(e.target)){save();updateBovCode();return;}if(e.target.type==="color"){const t=e.target.closest(".con-p")?.querySelector("input.cell");if(t)t.style.color=e.target.value;e.target.parentElement.classList.remove("unset");}if(e.target.matches("input"))if(setField(e.target))save();});
panel.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.bf&&!["l1","l2","l3"].includes(e.target.dataset.bf))return;if(e.target.matches("input,select")){if(setField(e.target)){save();render();}}});

panel.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b)return;
  const a=b.dataset.act,{tr,card}=ctx(b),p=pjById(pjSel);
  const done=()=>{save();render();};
  switch(a){
    case"keep":S.ejemplo=false;return done();
    case"trato":{S.trato=b.dataset.k;save();render();const t=TRATO[S.trato];if(moodState().m==="happy")party(true);else toast(`Anotado: ${t.e} ${t.l}`);return;}
    case"lnk":{const id=tr.dataset.rid;linkOpen=linkOpen===id?null:id;render();panel.querySelector(`[data-rid="${id}"] [data-f="enlace"]`)?.focus();return;}
    case"lnkOk":linkOpen=null;return render();
    case"add2":{const r=p.roles.find(x=>x.id===tr.dataset.rid);r.dos=true;if(r.con2===undefined){r.con2="";r.color2="";}done();panel.querySelector(`[data-rid="${r.id}"] [data-f="con2"]`)?.focus();return;}
    case"del2":{const r=p.roles.find(x=>x.id===tr.dataset.rid);r.dos=false;r.con2="";r.color2="";return done();}
    case"wPrio":wd.prio=b.dataset.v;return render();
    case"wAdd":{const r=wCompute(p);if(!r){toast("Completá los datos del canje");return;}p.wish=p.wish||[];p.wish.push({id:uid(),cat:wd.cat,n:r.n,g:r.g,pl:r.pl,req:r.req,prio:wd.prio,hecho:false,at:new Date().toISOString()});toast(`Agregado: ${r.n} (${r.g} grageas)`);return done();}
    case"wDel":{const id=b.closest("[data-wid]").dataset.wid;return armDelete(b,()=>{p.wish=p.wish.filter(x=>x.id!==id);done();});}
    case"wDone":case"wUndo":{const w=p.wish.find(x=>x.id===b.closest("[data-wid]").dataset.wid);if(w){w.hecho=a==="wDone";if(w.hecho)toast("¡Canjeado! ✨");}return done();}
    case"wBov":{const w=p.wish.find(x=>x.id===b.closest("[data-wid]").dataset.wid);if(!w)return;w.hecho=true;const bb=bov(p);bb.delta="-"+num(w.g);bb.enl=w.n;save();toast(`Cargué -${num(w.g)} en la Bóveda${num(w.pl)?` · acordate de descontar ${num(w.pl)} PL`:""}`);return nav("boveda");}
    case"moodOff":S.moodOff=true;toast("Carita oculta. Tocá la carita de arriba para traerla");return done();
    case"toImport":return nav("copia");
    case"impReplace":case"impAdd":{if(!pendingImport)return;applyImport(pendingImport,a==="impReplace");pendingImport=null;return done();}
    case"impCancel":pendingImport=null;return render();
    case"face":{const m=moodState().m;if(m==="happy")party(false);else{b.classList.remove("shake");void b.offsetWidth;b.classList.add("shake");toast(pick(m==="cry"?["No me toques, estoy llorando 😭","Contestá un rol y se me pasa","*sollozos en BBCode*"]:m==="sad"?["🥺 un postcito nomás…","Te espero acá","¿Y si contestás uno ahora?"]:["Anotá un rol y hablamos"]));}return;}
    case"goPj":pjSel=b.dataset.id;return nav("personajes");
    case"blank":S=vacio();pjSel=null;toast("Plantilla en blanco lista");return done();
    case"pj":{pjSel=b.dataset.id;const rp=pjById(pjSel);if(rp&&rp.pamId&&window.pamPjs)window.pamPjs.cambiar(rp.pamId);return render();}
    case"addPj":if(window.pamPjs){window.pamPjs.nuevoUI();toast("Ponele nombre en Mi Ficha: su registro y su bóveda se crean solos");return;}{const t=TONOS[S.personajes.length%TONOS.length];const n=nuevoPj("Nuevo personaje","✨",t);S.personajes.push(n);pjSel=n.id;save();return nav("personajes");}
    case"tono":p.tono=b.dataset.t;return done();
    case"delPj":return armDelete(b,()=>{S.personajes=S.personajes.filter(x=>x.id!==p.id);pjSel=null;done();toast("Personaje borrado");});
    case"addRol":p.roles.push({id:uid(),nombre:"",con:"",color:"",tipo:"Libre",fecha:"",estado:"Sin Contestar",limite:"",enlace:""});done();
      {const ins=panel.querySelectorAll('[data-f="nombre"]');ins[ins.length-1]?.focus();}return;
    case"delRol":return armDelete(b,()=>{p.roles=p.roles.filter(x=>x.id!==tr.dataset.rid);done();});
    case"addMis":S.turnos.misiones.push({id:uid(),nombre:"Nueva misión",faltasMaster:0,n:12,t:[]});return done();
    case"delMis":return armDelete(b,()=>{S.turnos.misiones=S.turnos.misiones.filter(x=>x.id!==tr.dataset.mid);done();});
    case"turn":{const m=S.turnos.misiones.find(x=>x.id===tr.dataset.mid),i=+b.dataset.i;const cur=TURNOS.findIndex(x=>x[0]===(m.t[i]||"Sin Postear"));m.t[i]=TURNOS[(cur+1)%TURNOS.length][0];save();render();
      panel.querySelector(`[data-mid="${m.id}"] [data-i="${i}"]`)?.focus();return;}
    case"ofF":ofFiltro=b.dataset.k;render();ofBuscar();return;
    case"ofFav":{const o=S.oficiales.find(x=>x.id===tr.dataset.oid);if(o){o.fav=!o.fav;save();render();ofBuscar();}return;}
    case"addOf":S.oficiales.push({id:uid(),nombre:"",relacion:"",fecha:"",estado:"Disponible",enlace:""});return done();
    case"delOf":return armDelete(b,()=>{S.oficiales=S.oficiales.filter(x=>x.id!==tr.dataset.oid);done();});
    case"addG":{const pj=pjById(card.dataset.pid);pj.ganancias.push({id:uid(),concepto:"",monto:0,fijo:"",estado:"Sin Cobrar"});return done();}
    case"delG":{const pj=pjById(card.dataset.pid);pj.ganancias=pj.ganancias.filter(x=>x.id!==tr.dataset.gid);return done();}
    case"addF":S.fijos.push({id:uid(),nombre:"Nuevo pago",monto:0});return done();
    case"delF":return armDelete(b,()=>{const id=tr.dataset.fid;S.fijos=S.fijos.filter(x=>x.id!==id);S.personajes.forEach(pj=>pj.ganancias.forEach(g=>{if(g.fijo===id)g.fijo="";}));done();});
    case"resetMes":S.personajes.forEach(pj=>pj.ganancias.forEach(g=>g.estado="Sin Cobrar"));toast("Mes nuevo: todo sin cobrar");return done();
    case"copyTxt":{const ta=RR.getElementById(b.dataset.t);if(!ta)return;const fb=()=>{ta.focus();ta.select();toast("Seleccionado: copialo con Ctrl+C");};
      try{navigator.clipboard.writeText(ta.value).then(()=>toast("Copiado ✨"),fb);}catch(_){fb();}return;}
    case"bovTipo":{bov(p).tipo=b.dataset.t;return done();}
    case"bovUndo":{const bb=bov(p),e=bb.log&&bb.log[0];if(!e)return;if(e.kind==="pl"){bb.pla=e.pl0;bb.plt=e.plt0;bb.log.shift();toast("Deshecho: volviste a "+e.pl0+" Puntos Legendarios");return done();}if(e.kind==="inv"){bb.log.shift();toast("Deshecho el último movimiento de inventario");return done();}bb.ini=e.ini0;bb.act=e.act0;bb.tot=e.tot0;bb.log.shift();toast("Deshecho: volviste a "+e.act0+" grageas");return done();}
    case"bovDelLog":return armDelete(b,()=>{const bb=bov(p);bb.log=(bb.log||[]).filter(x=>x.id!==b.dataset.id);done();});
    case"bovAddLog":{const bb=bov(p);bb.log=bb.log||[];bb.log.unshift({id:uid(),at:new Date().toISOString(),ini0:num(bb.ini),act0:num(bb.act),tot0:num(bb.tot),ini:num(bb.act),d:0,act:num(bb.act),tot:num(bb.tot),enl:"",nota:"Nota",pet:"",ace:""});return done();}
    case"bovCob":{const bb=bov(p);bb.delta="+"+totalPj(p).cob;return done();}
    case"bovApply":{const bb=bov(p);if((bb.tipo||"gr")!=="gr"){if(bovApplyOtro(bb))done();return;}const c=bovCalc(bb);if(!c.d){toast("Escribí cuántas grageas se añaden o quitan");return;}const d0=new Date();bb.log=bb.log||[];bb.log.unshift({id:uid(),at:d0.toISOString(),ini0:num(bb.ini),act0:num(bb.act),tot0:num(bb.tot),ini:c.ini,d:c.d,act:c.act,tot:c.tot,enl:bovEnlaces(bb),pet:String(bb.pet||"").trim(),ace:String(bb.ace||"").trim()});if(bb.log.length>150)bb.log.length=150;
      bb.ini=c.ini;bb.act=c.act;bb.tot=c.tot;bb.delta="";bb.enl="";bb.pet="";bb.ace="";toast(`Bóveda actualizada: ${c.act} grageas`);return done();}
    case"copy":{const ta=RR.getElementById("exp");const ok=()=>toast("Código copiado");
      try{navigator.clipboard.writeText(ta.value).then(ok,()=>{ta.select();toast("Seleccionado: copialo con Ctrl+C");});}catch(_){ta.select();toast("Seleccionado: copialo con Ctrl+C");}return;}
    case"import":{try{const d=JSON.parse(RR.getElementById("imp").value.trim());if(!d||!Array.isArray(d.personajes))throw 0;S=d;S.ejemplo=false;pjSel=null;toast("Registro cargado");done();}catch(_){toast("Ese código no es válido: revisá que esté completo");}return;}
    case"wipe":return armDelete(b,()=>{S=vacio();pjSel=null;done();toast("Registro en blanco");});
  }
});


/* ---------- importar desde Excel ---------- */
let pendingImport=null, impError="";
const XLSX_URL="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
function loadXLSX(){return window.XLSX?Promise.resolve(window.XLSX):new Promise((ok,ko)=>{const sc=document.createElement("script");sc.src=XLSX_URL;sc.onload=()=>ok(window.XLSX);sc.onerror=()=>ko(new Error("No se pudo cargar el lector de Excel"));document.head.appendChild(sc);});}
const norm=v=>String(v??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9ñ ]+/g," ").replace(/\s+/g," ").trim();
const compact=v=>norm(v).replace(/ /g,"");
const firstEmoji=v=>{const m=String(v||"").match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*/u);return m?m[0]:"";};
const cleanName=v=>String(v||"").replace(/\p{Extended_Pictographic}|️|‍/gu,"").trim();
const pad=n=>String(n).padStart(2,"0");
/* SheetJS pierde el plano alto de los emojis en celdas de texto inline (U+1F337 → U+F337): se recuperan */
const fixAstral=v=>typeof v==="string"?v.replace(/[\uF000-\uF8FF\uFADA-\uFAFF]/g,c=>String.fromCodePoint(c.charCodeAt(0)+0x10000)):v;
function serialToDate(n){const d=new Date(Math.round((n-25569)*864e5));return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate()};}
function asFecha(v){if(typeof v==="number"&&v>1000){const x=serialToDate(v);return `${pad(x.d)}/${pad(x.m)}/${x.y}`;}return String(v??"").trim();}
function asISO(v){if(typeof v==="number"&&v>1000){const x=serialToDate(v);return `${x.y}-${pad(x.m)}-${pad(x.d)}`;}
  const s=String(v??"").trim();let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(m)return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;return "";}
const matchList=(list,v,def)=>{const n=compact(v);if(!n)return def;const f=list.find(([x])=>compact(x)===n);return f?f[0]:def;};
function colIndex(head,tests){for(const t of tests){const i=head.findIndex(h=>t(h));if(i>=0)return i;}return -1;}

function parseWorkbook(wb){
  const X=window.XLSX,res={personajes:[],oficiales:[],misiones:[],tarifas:null,fijos:[],gan:[],avisos:[]};
  wb.SheetNames.forEach(name=>{
    const rows=X.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:""}).map(r=>r.map(fixAstral));
    const findHead=pred=>rows.findIndex(r=>r.some(c=>pred(norm(c))));
    let h=findHead(c=>c==="nombre de rol"||c==="nombre del rol");
    if(h>=0){
      const head=rows[h].map(norm);
      const ci={nombre:colIndex(head,[x=>x.startsWith("nombre")]),con:colIndex(head,[x=>x==="con"||x.startsWith("con ")]),
        tipo:colIndex(head,[x=>x.startsWith("tipo")]),lim:colIndex(head,[x=>x.includes("limite")]),
        fecha:colIndex(head,[x=>x==="fecha"]),estado:colIndex(head,[x=>x.startsWith("estado")]),enlace:colIndex(head,[x=>x.includes("enlace")||x.includes("link")])};
      const titulo=rows.slice(0,h).flat().find(c=>String(c).trim())||name;
      const pj={id:uid(),nombre:cleanName(name)||cleanName(titulo)||"Personaje",emoji:firstEmoji(titulo)||"✨",tono:"",roles:[],ganancias:[]};
      rows.slice(h+1).forEach(r=>{const nm=String(r[ci.nombre]??"").trim();if(!nm)return;
        pj.roles.push({id:uid(),nombre:nm,con:ci.con>=0?String(r[ci.con]??"").trim():"",color:"",
          tipo:ci.tipo>=0?matchList(TIPOS,r[ci.tipo],"Libre"):"Libre",fecha:ci.fecha>=0?asFecha(r[ci.fecha]):"",
          estado:ci.estado>=0?matchList(ESTADOS,r[ci.estado],"Sin Contestar"):"Sin Contestar",limite:ci.lim>=0?asISO(r[ci.lim]):"",
          enlace:ci.enlace>=0?String(r[ci.enlace]??"").trim():""});});
      res.personajes.push(pj);return;
    }
    h=findHead(c=>c==="oficial");
    if(h>=0&&rows[h].some(c=>norm(c).startsWith("relacion"))){
      const head=rows[h].map(norm);
      const ci={n:colIndex(head,[x=>x==="oficial"]),r:colIndex(head,[x=>x.startsWith("relacion")]),f:colIndex(head,[x=>x.startsWith("fecha")]),e:colIndex(head,[x=>x.startsWith("estado")]),l:colIndex(head,[x=>x.includes("enlace")||x.includes("link")])};
      rows.slice(h+1).forEach(r=>{const nm=String(r[ci.n]??"").trim();if(!nm)return;
        res.oficiales.push({id:uid(),nombre:nm,relacion:ci.r>=0?String(r[ci.r]??"").trim():"",fecha:ci.f>=0?(asISO(r[ci.f])||asFecha(r[ci.f])):"",estado:ci.e>=0?matchList(OF_EST,r[ci.e],"Disponible"):"Disponible",enlace:ci.l>=0?String(r[ci.l]??"").trim():""});});
      return;
    }
    h=findHead(c=>c==="jugador"||c==="mision");
    if(h>=0&&rows[h].some(c=>/^t\d+$/.test(compact(c)))){
      const head=rows[h].map(compact);
      const tcols=head.map((x,i)=>/^t\d+$/.test(x)?i:-1).filter(i=>i>=0);
      const fm=head.findIndex(x=>x.includes("faltasdelmaster")||x==="faltasmaster");
      for(let i=h+1;i<rows.length;i++){const r=rows[i];const nm=String(r[0]??"").trim();
        if(norm(nm).includes("tarifa"))break; if(!nm)continue;
        res.misiones.push({id:uid(),nombre:nm,faltasMaster:fm>=0?(+r[fm]||0):0,n:tcols.length||12,t:tcols.map(c=>matchList(TURNOS,r[c],"Sin Postear"))});}
      const tf={};rows.forEach(r=>{const k=norm(r[0]),v=r[1];if(typeof v!=="number")return;
        if(k==="rapido")tf.rapido=v;else if(k==="normal")tf.normal=v;else if(k==="lento")tf.lento=v;else if(k.startsWith("falta"))tf.falta=v;});
      if(Object.keys(tf).length)res.tarifas=tf;
      return;
    }
    let found=false;
    rows.forEach((r,ri)=>r.forEach((c,cj)=>{
      if(norm(c)==="grageas"&&cj>0&&typeof r[cj-1]==="string"&&/[a-z]/i.test(norm(r[cj-1]))&&norm(r[cj+1]).startsWith("estado")&&!norm(r[cj-1]).startsWith("total")){
        found=true;const blk={nombre:cleanName(r[cj-1]),emoji:firstEmoji(r[cj-1]),items:[]};
        for(let k=ri+1;k<rows.length;k++){const rr=rows[k],con=String(rr[cj-1]??"").trim();
          if(!con||norm(con).startsWith("total"))break;
          const v=rr[cj],e=rr[cj+1];blk.items.push({concepto:con,monto:typeof v==="number"?v:(+v||0),estado:compact(e)==="cobrado"?"Cobrado":"Sin Cobrar"});}
        res.gan.push(blk);
      }
      if(norm(c)==="pagos fijos"){found=true;for(let k=ri+1;k<rows.length;k++){const rr=rows[k],nm=String(rr[cj]??"").trim(),v=rr[cj+1];if(!nm||typeof v!=="number")break;res.fijos.push({id:uid(),nombre:nm,monto:v});}}
    }));
    if(!found&&!/^inicio$/i.test(norm(name))&&rows.some(r=>r.some(c=>String(c).trim())))res.avisos.push(name);
  });
  const ck=n=>compact(cleanName(n));
  res.gan.forEach(b=>{
    let pj=res.personajes.find(p=>ck(p.nombre)===ck(b.nombre))||res.personajes.find(p=>ck(p.nombre).startsWith(ck(b.nombre))||ck(b.nombre).startsWith(ck(p.nombre)));
    if(!pj){pj={id:uid(),nombre:b.nombre||"Personaje",emoji:b.emoji||"✨",tono:"",roles:[],ganancias:[]};res.personajes.push(pj);}
    pj.ganancias=b.items.map(it=>{const k=ck(it.concepto);const f=k&&res.fijos.find(f=>{const fk=ck(f.nombre);return fk===k||fk.startsWith(k)||k.startsWith(fk);});
      return f?{id:uid(),concepto:it.concepto,monto:0,fijo:f.id,estado:it.estado}:{id:uid(),concepto:it.concepto,monto:it.monto,fijo:"",estado:it.estado};});
  });
  return res;
}
function applyImport(r,reemplazar){
  if(reemplazar){S.personajes=[];S.oficiales=[];S.turnos.misiones=[];S.fijos=[];}
  const usados=new Set(S.personajes.map(p=>p.tono));let ti=0;
  r.personajes.forEach(p=>{
    const ya=S.personajes.find(x=>compact(x.nombre)===compact(p.nombre));
    if(ya&&!reemplazar){ya.roles.push(...p.roles);if(p.ganancias.length)ya.ganancias=p.ganancias;return;}
    while(usados.has(TONOS[ti%TONOS.length])&&ti<TONOS.length)ti++;
    p.tono=TONOS[ti%TONOS.length];usados.add(p.tono);ti++;
    if(!p.ganancias.length)p.ganancias=[{id:uid(),concepto:"💰 Sueldo mensual",monto:0,fijo:"",estado:"Sin Cobrar"}];
    S.personajes.push(p);
  });
  S.oficiales.push(...r.oficiales);S.turnos.misiones.push(...r.misiones);
  if(r.tarifas)Object.assign(S.turnos.tarifas,r.tarifas);
  r.fijos.forEach(f=>{const ya=S.fijos.find(x=>compact(x.nombre)===compact(f.nombre));if(ya){ya.monto=f.monto;S.personajes.forEach(p=>p.ganancias.forEach(g=>{if(g.fijo===f.id)g.fijo=ya.id;}));}else S.fijos.push(f);});
  S.ejemplo=false;pjSel=null;
  const n=r.personajes.reduce((a,p)=>a+p.roles.length,0);
  toast(`Importado: ${r.personajes.length} personajes, ${n} roles ✨`);
}
async function handleFile(file){
  if(!file)return;impError="";pendingImport=null;
  if(!/\.(xlsx|xlsm|xls|ods)$/i.test(file.name)){impError="Ese archivo no es un Excel. Subí un .xlsx (también sirve .xls u .ods).";return render();}
  try{
    toast("Leyendo tu Excel…");
    const X=await loadXLSX();const buf=await file.arrayBuffer();
    const wb=X.read(buf,{type:"array"});const r=parseWorkbook(wb);r.archivo=file.name;
    if(!r.personajes.length&&!r.oficiales.length&&!r.misiones.length)impError="No encontré hojas de roles. Cada personaje tiene que tener su hoja con una columna «Nombre de rol».";
    else pendingImport=r;
  }catch(e){impError="No pude leer el archivo. Probá guardarlo de nuevo como .xlsx y volvé a subirlo.";}
  render();
}
function importView(){
  const r=pendingImport;
  const resumen=r?`<div class="imp-sum"><h3>📄 ${esc(r.archivo)}</h3><ul>
    ${r.personajes.map(p=>`<li>${esc(p.emoji)} <strong>${esc(p.nombre)}</strong>: ${p.roles.length} ${p.roles.length===1?"rol":"roles"}${p.ganancias.length?` · ${p.ganancias.length} conceptos de ganancias`:""}</li>`).join("")}
    ${r.oficiales.length?`<li>🎀 ${r.oficiales.length} posibles oficiales</li>`:""}
    ${r.misiones.length?`<li>🎮 ${r.misiones.length} ${r.misiones.length===1?"misión":"misiones"} en el control de turnos${r.tarifas?" + tarifas":""}</li>`:""}
    ${r.fijos.length?`<li>💳 ${r.fijos.length} pagos fijos</li>`:""}
    ${r.avisos.length?`<li class="muted">Hojas que no reconocí y salteé: ${r.avisos.map(esc).join(", ")}</li>`:""}
  </ul><p class="small muted" style="margin:0">El color de cada compañero no viene en el Excel: elegilo después con la ruedita de cada rol.</p>
  <div class="row"><button class="primary" data-act="impReplace">Reemplazar mi registro</button><button data-act="impAdd">Sumar a lo que tengo</button><button class="ghost" data-act="impCancel">Cancelar</button></div></div>`:"";
  return `<section style="display:grid;gap:12px"><h2>📥 Importar desde Excel</h2>
  <p style="margin:0;max-width:62ch">Subí tu planilla de roles. Leo una hoja por personaje (con las columnas Nombre de rol, Con, Tipo de Rol, Fecha, Estado y Fecha Límite), y si están, también Posibles Oficiales, Control de turnos y Ganancias Mensuales.</p>
  <label class="drop" id="drop" for="xlsxIn"><span style="font-size:2rem">📂</span><strong>Elegí tu archivo .xlsx</strong><span class="small muted">o arrastralo hasta acá</span><input type="file" id="xlsxIn" accept=".xlsx,.xlsm,.xls,.ods"></label>
  ${impError?`<div class="alert t-rose">${esc(impError)}</div>`:""}${resumen}</section>`;
}
panel.addEventListener("change",e=>{if(e.target.id==="xlsxIn")handleFile(e.target.files[0]);});
panel.addEventListener("dragover",e=>{const d=e.target.closest("#drop");if(d){e.preventDefault();d.classList.add("over");}});
panel.addEventListener("dragleave",e=>{const d=e.target.closest("#drop");if(d)d.classList.remove("over");});
panel.addEventListener("drop",e=>{const d=e.target.closest("#drop");if(d){e.preventDefault();d.classList.remove("over");handleFile(e.dataTransfer.files[0]);}});

/* eventos de la wish list */
function wUpdPrev(){const p=pjById(pjSel),el=RR.getElementById("wPrev");if(p&&el)el.innerHTML=wPreview(p);}
panel.addEventListener("change",e=>{const t=e.target,p=pjById(pjSel);
  if(t.dataset.wd){const k=t.dataset.wd;if(k==="cat"){wd={cat:t.value,prio:wd.prio};}else{wd[k]=t.value;if(k==="de"&&+wd.a<=+wd.de)wd.a=+wd.de+1;if(k==="nv"){wd.nm="";}}render();return;}
  if(t.dataset.wcfg&&p){p.wishCfg=p.wishCfg||{};p.wishCfg[t.dataset.wcfg]=num(t.value);save();wUpdPrev();return;}
  if(t.dataset.wfield&&p){const w=(p.wish||[]).find(x=>x.id===t.closest("[data-wid]").dataset.wid);if(w){w[t.dataset.wfield]=t.value;save();render();}return;}
});
panel.addEventListener("input",e=>{const t=e.target,p=pjById(pjSel);
  if(t.dataset.wd&&t.tagName==="INPUT"){wd[t.dataset.wd]=t.value;wUpdPrev();}
  if(t.dataset.wcfg&&p){p.wishCfg=p.wishCfg||{};p.wishCfg[t.dataset.wcfg]=num(t.value);save();wUpdPrev();}
});

const loc=loadLocal(); if(loc)S=loc;
/* ---- personajes conectados con Mi Ficha: cada ficha tiene su registro, ganancias, bóveda y futuros canjes ---- */
const nrm=x=>String(x||"").normalize("NFD").replace(/[̀-ͯ]/g,"").trim().toLowerCase();
let sincronizando=false;
function syncPam(){
  const Pm=window.pamPjs; if(!Pm||sincronizando) return false;
  sincronizando=true; let ch=false, sel=false;
  try{
    if(S.ejemplo){ const v=vacio(); v.personajes=[]; v.owner=S.owner||""; S=v; ch=true; }
    const L=Pm.lista(), ids=new Set(L.map(x=>x.id));
    const antes=S.personajes.length;
    S.personajes=S.personajes.filter(r=>!r.pamId||ids.has(r.pamId));           /* se borró la ficha: se borra su registro */
    if(S.personajes.length!==antes) ch=true;
    const libres=()=>Pm.lista().filter(x=>!S.personajes.some(r=>r.pamId===x.id));
    S.personajes.filter(r=>!r.pamId).forEach(r=>{                             /* registros viejos: se unen a su ficha */
      let m=libres().find(x=>x.nombre&&nrm(x.nombre)===nrm(r.nombre))||libres().find(x=>x.nombre&&r.nombre&&(nrm(x.nombre).startsWith(nrm(r.nombre)+" ")||nrm(r.nombre).startsWith(nrm(x.nombre)+" ")));
      if(!m){ const v=libres().find(x=>!x.nombre); if(v){ m=v; Pm.renombrar(v.id,r.nombre); } }
      r.pamId = m ? m.id : Pm.crear(r.nombre); ch=true;
    });
    const L2=Pm.lista();
    L2.forEach(x=>{ let r=S.personajes.find(y=>y.pamId===x.id);
      if(!r){ r=nuevoPj(x.nombre||"Sin nombre","✨",TONOS[S.personajes.length%TONOS.length]); r.pamId=x.id; S.personajes.push(r); ch=true; }
      const n=x.nombre||"Sin nombre"; if(r.nombre!==n){ r.nombre=n; ch=true; } });
    if(S.personajes.map(r=>r.pamId).join()!==L2.map(x=>x.id).join()){
      S.personajes.sort((a,b)=>L2.findIndex(x=>x.id===a.pamId)-L2.findIndex(x=>x.id===b.pamId)); ch=true; }
    const act=S.personajes.find(r=>r.pamId===Pm.activa());
    if(act && pjSel!==act.id){ pjSel=act.id; sel=true; }
    if(ch) save();
  } finally { sincronizando=false; }
  return ch||sel;
}
window.rrSync = () => { syncPam(); };
window.rrBoveda = {
  get: pamId => { syncPam(); const r=S.personajes.find(x=>x.pamId===pamId); return r ? Object.assign({nombre:r.nombre}, bov(r)) : null; },
  set: (pamId, v) => { syncPam(); const r=S.personajes.find(x=>x.pamId===pamId); if(!r) return false; const b=bov(r);
    ["ini","tot","act","plt","pla"].forEach(k=>{ if(v[k]!==undefined && v[k]!==null && v[k]!=="") b[k]=num(v[k]); });
    ["l1","l2","l3"].forEach(k=>{ if(v[k]) b[k]=v[k]; });
    b.foro = Object.assign({}, b.foro||{}, {leido:v.leido||"", url:v.url||""});
    pjSel=r.id; save(); if(panel.innerHTML) render(); return true; },
  /* canjes (Mi PJ): deja preparado un movimiento de grageas y devuelve sus códigos (lo que sale en «Formulario» y «Código para la bóveda») */
  preparar: (pamId, v) => { syncPam(); const r=S.personajes.find(x=>x.pamId===pamId||x.id===pamId); if(!r) return null; const b=bov(r);
    b.tipo="gr"; ["delta","pet","ace"].forEach(k=>{ if(v[k]!==undefined) b[k]=String(v[k]); });
    pjSel=r.id; save(); if(panel.innerHTML) render(); const {c,form,html}=bovCodesGr(b); return {form, html, c, divisor:divisor()}; },
  /* canjes (Mi PJ): «Ya lo publiqué: actualizar mis números» con los enlaces del canje; devuelve las grageas actuales */
  cerrar: (pamId, v) => { syncPam(); const r=S.personajes.find(x=>x.pamId===pamId||x.id===pamId); if(!r) return null; const bb=bov(r);
    bb.tipo="gr"; ["delta","pet","ace"].forEach(k=>{ if(v && v[k]!==undefined) bb[k]=String(v[k]); });
    const c=bovCalc(bb); if(!c.d) return {act:num(bb.act), sinCambio:true};
    bb.log=bb.log||[]; bb.log.unshift({id:uid(),at:new Date().toISOString(),ini0:num(bb.ini),act0:num(bb.act),tot0:num(bb.tot),ini:c.ini,d:c.d,act:c.act,tot:c.tot,enl:bovEnlaces(bb),pet:String(bb.pet||"").trim(),ace:String(bb.ace||"").trim()}); if(bb.log.length>150)bb.log.length=150;
    bb.ini=c.ini;bb.act=c.act;bb.tot=c.tot;bb.delta="";bb.enl="";bb.pet="";bb.ace="";
    pjSel=r.id; save(); if(panel.innerHTML) render(); return {act:c.act}; }
};
syncPam();
document.addEventListener("pam:pjs",()=>{ if(syncPam() && panel.innerHTML) render(); });
/* Biblioteca de oficiales (Mi PJ) → Posibles oficiales. clave = tema#mensaje del suceso */
const ofClave=u=>{const m=String(u||"").match(/\/t(\d+)[^#\s]*(?:#(\d+))?/);return m?("t"+m[1]+"#"+(m[2]||"")):"";};
function ofPlan(items,estados){
  syncPam();
  const nuevos=[],cambios=[],porClave=new Map(S.oficiales.filter(o=>ofClave(o.enlace)).map(o=>[ofClave(o.enlace),o]));
  (items||[]).forEach(it=>{const k=ofClave(it.enlace);const o=k&&porClave.get(k)||S.oficiales.find(x=>norm(x.nombre)===norm(it.nombre)&&it.nombre);
    if(!o){if(!nuevos.some(n=>ofClave(n.enlace)===k))nuevos.push(it);return;}
    if(it.fav&&!o.fav)cambios.push({o,fav:true});});
  Object.entries(estados||{}).forEach(([k,e])=>{const o=porClave.get(k);if(o&&o.estado!==e&&!cambios.some(c=>c.o===o&&c.estado))cambios.push({o,estado:e,antes:o.estado});});
  return {nuevos,cambios};
}
window.rrOficiales={
  lista:()=>JSON.parse(JSON.stringify(S.oficiales)),
  previa:(items,estados)=>{const p=ofPlan(items,estados);return {nuevos:p.nuevos.map(x=>({nombre:x.nombre,relacion:x.relacion,fav:!!x.fav})),cambios:p.cambios.map(c=>({nombre:c.o.nombre,estado:c.estado||"",antes:c.antes||"",fav:!!c.fav}))};},
  aplicar:(items,estados)=>{
    const p=ofPlan(items,estados);
    if(S.ejemplo){S.oficiales=S.oficiales.filter(o=>!/\(ejemplo\)/i.test(o.nombre));S.ejemplo=false;}
    p.nuevos.forEach(it=>S.oficiales.push({id:uid(),nombre:it.nombre||"",relacion:it.relacion||"",fecha:it.fecha||"",estado:it.estado||"Disponible",enlace:it.enlace||"",fav:!!it.fav}));
    p.cambios.forEach(c=>{if(c.fav)c.o.fav=true;if(c.estado)c.o.estado=c.estado;});
    save();if(panel.innerHTML)render();
    return {nuevos:p.nuevos.length,cambios:p.cambios.length};
  }
};
window.rrGo=t=>{if(t!==tab||!panel.innerHTML)go(t);};window.rrTab=()=>tab;window.rrRender=()=>render();
go(window.__rrStart||"inicio");
setStatus();
initDb();
})();


/* Coloreador de Diálogos (integrado) */
(function(){
  const $ = id => RR.getElementById('cd-'+id);
  const src=$('src'), tag=$('tag'), out=$('out'), preview=$('preview'), picker=$('picker');
  const store = {
    get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
    set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  };

  // ---------- Etiquetas ----------
  function parseTag(s){
    s=(s||'').trim();
    if(!s) return null;
    if(/^#?[0-9a-f]{3,8}$/i.test(s)){const h=s[0]==='#'?s:'#'+s;return {open:`[color=${h}]`,close:'[/color]',color:h}}
    if(/^[a-z]+$/i.test(s)) return {open:`[color=${s}]`,close:'[/color]',color:s};
    const i=s.indexOf('[/');
    let open,close;
    if(i>0){open=s.slice(0,i).trim();close=s.slice(i).trim()}
    else{
      open=s;
      const names=[...s.matchAll(/\[([a-z0-9]+)(?:=[^\]]*)?\]/gi)].map(m=>m[1]);
      close=names.reverse().map(n=>`[/${n}]`).join('');
    }
    const m=open.match(/\[color=([^\]]+)\]/i);
    return {open,close,color:m?m[1].trim():null};
  }

  // ---------- Detección de diálogo ----------
  const SPACE=/\s/;
  const PUNCT_AFTER=/[\s.,;:!?…)"»”'\]]/;
  function isDash(line,i,o){
    const c=line[i];
    if(c==='—'||c==='–') return o.raya;
    if(c==='-'&&o.guion){
      if(line[i+1]==='-'||line[i-1]==='-') return false;
      const prev=i===0?' ':line[i-1], next=i+1>=line.length?' ':line[i+1];
      return SPACE.test(prev)||PUNCT_AFTER.test(next)||/[(«"“]/.test(prev);
    }
    return false;
  }
  function opening(line,i){return i===0||/[\s(«"“]/.test(line[i-1])}
  function afterSentence(line,i){
    let j=i-1; while(j>=0&&SPACE.test(line[j])) j--;
    return j<0||/[.!?…:]/.test(line[j]);
  }
  const Q_OPEN={'"':'"','“':'”','«':'»'};

  // devuelve array de {t, c} por carácter
  function markLine(line,o){
    const res=[]; let st='N', qClose=null;
    for(let i=0;i<line.length;i++){
      let ch=line[i];
      const dash=isDash(line,i,o);
      if(dash&&o.fix&&ch==='-') ch='—';
      if(st==='Q'){res.push({t:ch,c:true}); if(ch===qClose) st='N'; continue}
      if(dash){
        if(st==='N'){ if(afterSentence(line,i)){st='D';res.push({t:ch,c:true})} else {st='A';res.push({t:ch,c:false})} }
        else if(st==='A'){st='N';res.push({t:ch,c:false})}
        else if(st==='D'){st='I';res.push({t:ch,c:false})}
        else if(st==='I'){st='D';res.push({t:ch,c:opening(line,i)&&afterSentence(line,i)})}
        continue;
      }
      if(st==='N'&&o.comillas&&Q_OPEN[ch]){st='Q';qClose=Q_OPEN[ch];res.push({t:ch,c:true});continue}
      res.push({t:ch,c:st==='D'});
    }
    return res;
  }

  const GROUPS=[
    ['Gryffindor','#A3000D'],['Hufflepuff','#DAA515'],['Ravenclaw','#316996'],['Slytherin','#005C1F'],['Otros menores','#b25228'],
    ['Ex-Gryffindor','#803E3A'],['Ex-Hufflepuff','#d1cb9e'],['Ex-Ravenclaw','#769aaf'],['Ex-Slytherin','#4ca07d'],['Otros Adultos','#ae7952']];
  const FMTS=[['b','B','Negrita','b'],['i','I','Cursiva','i'],['u','U','Subrayado','u'],['s','S','Tachado','strike']];
  function fmtTags(f){f=f||{};const on=FMTS.filter(x=>f[x[0]]);return {open:on.map(x=>`[${x[3]}]`).join(''),close:on.reverse().map(x=>`[/${x[3]}]`).join('')}}
  function makeFmt(box,f,onChange){
    FMTS.forEach(([k,txt,title])=>{const b=document.createElement('button');b.type='button';b.className='tg '+k;b.textContent=txt;b.title=title;
      b.setAttribute('aria-label',title);b.setAttribute('aria-pressed',!!f[k]);
      b.onclick=()=>{f[k]=!f[k];b.setAttribute('aria-pressed',f[k]);onChange()};box.append(b)});
    return f;
  }
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function ruleColor(r){return r.g==='none'?null:r.g==='custom'?(r.c||'#ffffff'):(GROUPS[r.g]||GROUPS[0])[1]}
  function wrapStyle(t,c,f){const ff=fmtTags(f);const inner=ff.open+t+ff.close;return c?`[color=${c}]${inner}[/color]`:inner}
  const MARKERS=[['*','*'],['**','**'],['_','_'],['~','~'],['"','"'],['“','”'],['«','»'],['‘','’'],['(',')'],['<','>'],['|','|']];
  function markRegex(rules){
    const list=rules.map(r=>({r,m:MARKERS[r.m]})).filter(x=>x.m).sort((a,b)=>b.m[0].length-a.m[0].length);
    if(!list.length) return null;
    const re=new RegExp(list.map(x=>'(?<!'+reEsc(x.m[0][0])+')'+reEsc(x.m[0])+'([^\\n'+reEsc(x.m[1][0])+']+)'+reEsc(x.m[1])+'(?!'+reEsc(x.m[1].slice(-1))+')').join('|'),'g');
    return {re,list};
  }
  function nameRegex(rules){
    const list=rules.filter(r=>r.name.trim()).map(r=>({n:r.name.trim(),c:ruleColor(r),f:fmtTags(r.f)}))
      .sort((a,b)=>b.n.length-a.n.length);
    if(!list.length) return null;
    const map=new Map(list.map(x=>[x.n.toLowerCase(),x]));
    const re=new RegExp('(?<![\\p{L}\\p{N}_])('+list.map(x=>reEsc(x.n)).join('|')+')(?![\\p{L}\\p{N}_])','giu');
    return {re,map};
  }
  function paintNames(t,nr,cnt){
    if(!nr) return t;
    return t.replace(nr.re,m=>{cnt.n++;const x=nr.map.get(m.toLowerCase());return x.c?`[color=${x.c}]${x.f.open}${m}${x.f.close}[/color]`:x.f.open+m+x.f.close});
  }

  function colorize(text,tg,o,rules,mrules){
    let n=0; const nr=nameRegex(rules||[]); const cnt={n:0}; const mr=markRegex(mrules||[]); const slots=[];
    const PH=0xE000;
    if(mr) text=text.replace(mr.re,(...a)=>{
      const g=a.slice(1,1+mr.list.length); const k=g.findIndex(v=>v!==undefined); const x=mr.list[k];
      const body=x.r.strip?g[k]:x.m[0]+g[k]+x.m[1];
      slots.push({body,c:ruleColor(x.r),f:x.r.f}); return String.fromCharCode(PH+slots.length-1);
    });
    const lines=text.replace(/\r\n?/g,'\n').split('\n').map(line=>{
      const marks=markLine(line,o);
      // agrupar en tramos
      const runs=[];
      for(const m of marks){const last=runs[runs.length-1]; if(last&&last.c===m.c) last.t+=m.t; else runs.push({t:m.t,c:m.c})}
      return runs.map(r=>{
        if(!r.c||!r.t.trim()) return paintNames(r.t,nr,cnt);
        const lead=r.t.match(/^\s*/)[0], trail=r.t.match(/\s*$/)[0];
        n++;
        return lead+tg.open+paintNames(r.t.trim(),nr,cnt)+tg.close+trail;
      }).join('');
    });
    let code=lines.join('\n');
    if(slots.length) code=code.replace(/[\uE000-\uF8FF]/g,ch=>{const sl=slots[ch.charCodeAt(0)-PH];return sl?wrapStyle(paintNames(sl.body,nr,{n:0}),sl.c,sl.f):ch});
    if(o.center&&code.trim()) code='[center]'+code+'[/center]';
    return {code,count:n,names:cnt.n,marks:slots.length};
  }

  // ---------- Vista previa BBCode ----------
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  function render(bb){
    let h=esc(bb);
    h=h.replace(/\[color=([#a-zA-Z0-9(),.% ]+)\]/gi,'<span style="color:$1">').replace(/\[\/color\]/gi,'</span>');
    h=h.replace(/\[(\/?)(b|i|u|s)\]/gi,'<$1$2>').replace(/\[(\/?)strike\]/gi,'<$1s>');
    h=h.replace(/\[center\]/gi,'<div style="text-align:center">').replace(/\[\/center\]/gi,'</div>');
    return h;
  }

  // ---------- Estado ----------
  function opts(){return {raya:$('optRaya').checked,guion:$('optGuion').checked,comillas:$('optComillas').checked,fix:$('optFix').checked,center:$('optCenter').checked}}
  function toHex(c){const d=document.createElement('canvas').getContext('2d');d.fillStyle='#000';d.fillStyle=c;return d.fillStyle}
  function update(){
    const base=parseTag(tag.value), df=fmtTags(dlgF);
    const tg=base&&{open:base.open+df.open,close:df.close+base.close,color:base.color};
    store.set('cd_dlgf',dlgF);
    const rules=readRules(); store.set('cd_names',rules);
    const mrules=readMarks(); store.set('cd_marks',mrules);
    store.set('cd_src',src.value); store.set('cd_tag',tag.value); store.set('cd_opts',opts());
    const r=tg?colorize(src.value,tg,opts(),rules,mrules):colorize(src.value,{open:'',close:''},{raya:false,guion:false,comillas:false,fix:false,center:$('optCenter').checked},rules,mrules);
    $('mcount').textContent=r.marks+(r.marks===1?' marca':' marcas');
    $('ncount').textContent=r.names+(r.names===1?' coincidencia':' coincidencias');
    if(!tg){out.value=r.code;preview.innerHTML=render(r.code);$('count').textContent='sin color';return}
    out.value=r.code;
    preview.innerHTML=render(r.code);
    $('count').textContent=r.count+(r.count===1?' tramo':' tramos');
    const col=tg.color||'transparent';
    $('swatchFill').style.background=col;
    if(tg.color){const hx=toHex(tg.color); if(/^#[0-9a-f]{6}$/i.test(hx)) picker.value=hx}
    store.set('cd_src',src.value); store.set('cd_tag',tag.value); store.set('cd_opts',opts());
  }

  // colores recientes
  function recent(){return store.get('cd_recent',[])}
  function pushRecent(t){const l=recent().filter(x=>x!==t);l.unshift(t);store.set('cd_recent',l.slice(0,8));drawRecent()}
  function drawRecent(){
    const box=$('recent'); box.innerHTML='';
    recent().forEach(t=>{
      const tg=parseTag(t); if(!tg) return;
      const b=document.createElement('button'); b.type='button'; b.className='chip'; b.title=t;
      const i=document.createElement('i'); i.style.background=tg.color||'transparent';
      b.append(i, document.createTextNode(tg.color||t));
      b.onclick=()=>{tag.value=t;update()};
      box.append(b);
    });
  }

  $('copy').onclick=()=>{
    const done=()=>{$('status').textContent='Copiado ✓';setTimeout(()=>$('status').textContent='',2000)};
    const fallback=()=>{out.focus();out.select();try{document.execCommand('copy');done()}catch(e){$('status').textContent='Seleccionado: usá Ctrl/Cmd+C'}};
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(out.value).then(done,fallback); else fallback();
    if(parseTag(tag.value)) pushRecent(tag.value.trim());
  };
  $('clear').onclick=()=>{src.value='';update();src.focus()};
  picker.addEventListener('input',()=>{
    const cur=parseTag(tag.value), hex=picker.value.toUpperCase();
    if(cur&&cur.color&&/\[color=/i.test(tag.value)) tag.value=tag.value.replace(/\[color=[^\]]+\]/i,`[color=${hex}]`);
    else tag.value=`[color=${hex}] [/color]`;
    update();
  });
  function setBg(m){if(!['img','dark','light'].includes(m)) m='img';
    preview.className='preview '+m; if(m!=='img') preview.style.backgroundImage='';
    else if(customBg) preview.style.backgroundImage=`url("${customBg}")`;
    ['img','dark','light'].forEach(k=>$('bg'+k[0].toUpperCase()+k.slice(1)).setAttribute('aria-pressed',k===m)); store.set('cd_bg',m)}
  let customBg=null;
  $('bgImg').onclick=()=>setBg('img'); $('bgDark').onclick=()=>setBg('dark'); $('bgLight').onclick=()=>setBg('light');
  $('bgFile').addEventListener('change',e=>{const f=e.target.files[0]; if(!f) return; const fr=new FileReader();
    fr.onload=()=>{customBg=fr.result;setBg('img')}; fr.readAsDataURL(f)});

  const dlgF=Object.assign({},store.get('cd_dlgf',{}));
  makeFmt($('dlgFmt'),dlgF,()=>update());

  // nombres
  const namesBox=$('names'); let nid=0;
  function groupSelect(id,rule){
    const sel=document.createElement('select'); sel.id=id; sel.setAttribute('aria-label','Color');
    GROUPS.forEach(([n],i)=>{const op=document.createElement('option');op.value=i;op.textContent=n;sel.append(op)});
    [['custom','Color propio'],['none','Sin color']].forEach(([v,t])=>{const op=document.createElement('option');op.value=v;op.textContent=t;sel.append(op)});
    sel.value=String(rule.g); return sel;
  }
  function styleRow(box,head,rule,onDel,extra){
    const id=++nid, row=document.createElement('div'); row.className='namerow'; row._rule=rule;
    const wrap=document.createElement('div'); wrap.className='selwrap'; const sel=groupSelect('gr'+id,rule); wrap.append(sel);
    const sw=document.createElement('label'); sw.className='rowswatch';
    const fill=document.createElement('span'); const pick=document.createElement('input'); pick.type='color'; pick.id='pc'+id; pick.setAttribute('aria-label','Color propio');
    sw.append(fill,pick);
    const paint=()=>{const col=ruleColor(rule); sw.classList.toggle('none',!col); fill.style.background=col||''; sw.title=col||'Sin color';
      if(col){const hx=toHex(col);if(/^#[0-9a-f]{6}$/i.test(hx))pick.value=hx}};
    sel.addEventListener('change',()=>{const v=sel.value; rule.g=(v==='custom'||v==='none')?v:+v; if(typeof rule.g==='number') rule.c=GROUPS[rule.g][1]; paint();update()});
    pick.addEventListener('input',()=>{rule.g='custom';rule.c=pick.value.toUpperCase();sel.value='custom';paint();update()});
    paint();
    const del=document.createElement('button'); del.type='button'; del.className='del'; del.textContent='×'; del.title='Quitar'; del.setAttribute('aria-label','Quitar');
    del.onclick=()=>{row.remove(); onDel(); update()};
    const fm=document.createElement('div'); fm.className='fmt'; fm.innerHTML='<span class="lbl">Formato</span>';
    makeFmt(fm,rule.f,update); if(extra) fm.append(extra);
    row.append(head,wrap,sw,del,fm); box.append(row); return row;
  }
  function normG(g){return (g==='custom'||g==='none')?g:(g|0)}
  function addRule(name='',g=0,c=null,f={}){
    g=normG(g); const rule={g,c:c||(typeof g==='number'?GROUPS[g][1]:'#FFFFFF'),f:Object.assign({},f)};
    const inp=document.createElement('input'); inp.type='text'; inp.id='nm'+(nid+1); inp.placeholder='Nombre'; inp.value=name; inp.setAttribute('aria-label','Nombre');
    inp.addEventListener('input',update); rule.inp=inp;
    styleRow(namesBox,inp,rule,()=>{if(!namesBox.children.length) addRule()}); return inp;
  }
  function readRules(){return [...namesBox.querySelectorAll('.namerow')].map(r=>({name:r._rule.inp.value,g:r._rule.g,c:r._rule.c,f:r._rule.f}))}

  const marksBox=$('marks');
  function addMark(m=0,g='custom',c='#B9A6D9',f={i:true},strip=true){
    g=normG(g); const rule={m:+m,g,c:c||(typeof g==='number'?GROUPS[g][1]:'#FFFFFF'),f:Object.assign({},f),strip:!!strip};
    const wrap=document.createElement('div'); wrap.className='selwrap';
    const sel=document.createElement('select'); sel.id='mk'+(nid+1); sel.setAttribute('aria-label','Símbolo');
    MARKERS.forEach(([a,b],i)=>{const op=document.createElement('option');op.value=i;op.textContent=a+'texto'+b;sel.append(op)});
    sel.value=String(rule.m); sel.addEventListener('change',()=>{rule.m=+sel.value;update()}); wrap.append(sel);
    const lab=document.createElement('label'); lab.className='strip'; const cb=document.createElement('input'); cb.type='checkbox'; cb.id='st'+(nid+1); cb.checked=rule.strip;
    cb.addEventListener('change',()=>{rule.strip=cb.checked;update()}); lab.append(cb,document.createTextNode('Quitar símbolos'));
    styleRow(marksBox,wrap,rule,()=>{},lab); return sel;
  }
  function readMarks(){return [...marksBox.querySelectorAll('.namerow')].map(r=>({m:r._rule.m,g:r._rule.g,c:r._rule.c,f:r._rule.f,strip:r._rule.strip}))}
  $('addMark').onclick=()=>{addMark(0,'custom','#B9A6D9',{},true).focus()};
  const savedMarks=store.get('cd_marks',null);
  if(Array.isArray(savedMarks)) savedMarks.forEach(r=>addMark(r.m,r.g,r.c,r.f||{},r.strip)); else addMark();
  $('addName').onclick=()=>{addRule().focus()};
  const savedNames=store.get('cd_names',null);
  if(Array.isArray(savedNames)&&savedNames.length) savedNames.forEach(r=>addRule(r.name||'',r.g,r.c,r.f||{})); else addRule('Miss Alpha',2);
  [src,tag].forEach(el=>el.addEventListener('input',update));
  ['optRaya','optGuion','optComillas','optFix','optCenter'].forEach(id=>$(id).addEventListener('change',update));

  // restaurar
  const s=store.get('cd_src',null); if(s!=null&&s.trim()) src.value=s;
  const t=store.get('cd_tag',null); if(t) tag.value=t;
  const o=store.get('cd_opts',null); if(o){$('optRaya').checked=o.raya!==false;$('optGuion').checked=o.guion!==false;$('optComillas').checked=o.comillas!==false;$('optFix').checked=!!o.fix;$('optCenter').checked=!!o.center}
  setBg(store.get('cd_bg','img'));
  drawRecent(); update();
  
})();

})();
