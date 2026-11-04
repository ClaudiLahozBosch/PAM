/* PAM · Datos del foro → PAM, del script «Mi PJ» antiguo (postMessage pamForo).
   Fase 8a: el mismo código que estaba dentro de index.html, sin cambios. Lo carga js/pam/arranque.js. */
/* ============ Datos del foro → PAM (lo manda el script «Mi PJ» de Tampermonkey) ============ */
(function(){
const FORO = "https://hp-avada-kedavra.foroactivo.com";
const FOROS_PRUEBA = ["https://test-forito.foroactivo.com"];   /* el foro de pruebas también puede mandar datos (siempre con Aceptar / Denegar) */
const esc = t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtN = n => (n===null||n===undefined||n==="") ? "—" : Number(n).toLocaleString("es-ES");
let actual = null;
/* colores y tipografías del tema actual, para que el panel del foro se vea igual que PAM */
function temaPAM(){
  const pr=document.createElement("div"); pr.style.cssText="position:absolute;visibility:hidden"; document.body.appendChild(pr);
  const cs=()=>getComputedStyle(pr), out={skin:document.documentElement.dataset.skin||"avadense"};
  ["ink","panel","panel-2","parchment","parchment-dim","gold","gold-bright","arcane-bright","good","bad","line-strong","accent-ink"].forEach(k=>{ pr.style.color=`var(--${k})`; out[k]=cs().color; });
  pr.style.fontFamily="var(--serif)"; out.serif=cs().fontFamily; pr.style.fontFamily="var(--sans)"; out.sans=cs().fontFamily;
  pr.remove(); return out;
}
window.addEventListener("message", e=>{
  if((e.origin!==FORO && !FOROS_PRUEBA.includes(e.origin)) || !e.data || !e.data.pamForo) return;
  try{ e.source && e.source.postMessage({pamForoOk:1, tema:temaPAM()}, e.origin); }catch(_){}
  const d = e.data.data; if(!d || !d.cuenta) return;
  if(actual && actual.leido===d.leido && document.getElementById("foroDlg")) return;   /* ya está abierto */
  actual = d; abrir(d);
});
function hace(iso){ const m=Math.round((Date.now()-new Date(iso))/60000); return isNaN(m)?"":m<1?"recién":m<60?`hace ${m} min`:`hace ${Math.round(m/60)} h`; }
function abrir(d){
  const F = window.pamFicha, RB = window.rrBoveda;
  const pj = F ? F.buscar(d.cuenta) : null;
  const disp = Number((document.getElementById("inpDisponibles")||{}).value)||0;
  const bAhora = (pj && RB) ? RB.get(pj.id) : null;
  const B = d.boveda || {}, FI = d.ficha || {};
  const fila = (l,a,b) => `<tr><td>${esc(l)}</td><td>${a}</td><td class="nv">${b}</td></tr>`;
  const link = u => u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(FORO,"").slice(0,48))}</a>` : "—";
  let fichaTxt;
  if(!FI.codigo) fichaTxt = `No encontré la ficha de «${esc(d.cuenta)}» en el foro, así que no se toca.`;
  else if(pj && pj.activo) fichaTxt = `«${esc(pj.nombre)}» ya es el personaje activo de PAM: se reemplaza su ficha por la del foro.`;
  else if(pj) fichaTxt = `Se cambia al personaje «${esc(pj.nombre)}» y se reemplaza su ficha por la del foro.`;
  else fichaTxt = `«${esc(d.cuenta)}» no está en PAM: se crea el personaje con la ficha del foro (y con él su registro y su bóveda).`;
  const est = FI.estado==="pendiente" ? `<span class="fd-badge warn">Pendiente de revisión</span>` : FI.estado==="revisada" ? `<span class="fd-badge ok">Revisada</span>` : "";
  const h = `<div class="fd-back" id="foroDlg" role="dialog" aria-modal="true" aria-labelledby="fdT"><div class="fd-box">
    <div class="fd-head"><h2 id="fdT">Datos del foro → PAM</h2><span>${esc(d.cuenta)}</span></div>
    <p class="fd-intro">Personaje «${esc(d.cuenta)}», leído del foro ${esc(hace(d.leido))}. Esto es lo que cambiaría en PAM; no se toca nada hasta que aceptes. Destildá lo que no quieras traer.</p>
    <label class="fd-sec"><div class="fd-st"><input type="checkbox" id="fdF" ${FI.codigo?"checked":"disabled"}><b>1. Mi Ficha · importar la ficha del foro</b>${est}</div>
      <p>${fichaTxt}</p>${FI.codigo?`<small>Ficha: ${link(FI.url)} · ${fmtN(FI.codigo.length)} caracteres${FI.sello?` · último sello: ${esc(FI.sello.fecha)} (${esc(FI.sello.autor)})`:""}</small>`:""}</label>
    <label class="fd-sec"><div class="fd-st"><input type="checkbox" id="fdG" ${B.act!=null?"checked":"disabled"}><b>2. Tabla de Canjes · grageas disponibles</b></div>
      <table><thead><tr><th>Campo</th><th>En PAM ahora</th><th>Del foro</th></tr></thead><tbody>${fila("Grageas disponibles", fmtN(disp), fmtN(B.act))}</tbody></table></label>
    <label class="fd-sec"><div class="fd-st"><input type="checkbox" id="fdB" ${B.url?"checked":"disabled"}><b>3. Bóveda de PAM · números y enlaces</b></div>
      ${B.url?`<p>${pj?`Bóveda de «${esc(pj.nombre)}».`:`Bóveda del personaje nuevo «${esc(d.cuenta)}».`} En PAM, «Grageas Iniciales» es el saldo con el que empieza el próximo movimiento: por eso coincide con «Actuales».</p>
      <table><thead><tr><th>Campo</th><th>En PAM ahora</th><th>Del foro</th></tr></thead><tbody>
        ${fila("Grageas Iniciales", fmtN(bAhora&&bAhora.ini), fmtN(B.act))}
        ${fila("Grageas Totales", fmtN(bAhora&&bAhora.tot), fmtN(B.tot))}
        ${fila("Grageas Actuales", fmtN(bAhora&&bAhora.act), fmtN(B.act))}
        ${B.pla!=null?fila("Puntos Legendarios Actuales", fmtN(bAhora&&bAhora.pla), fmtN(B.pla)):""}
        ${B.plt!=null?fila("Puntos Legendarios Totales", fmtN(bAhora&&bAhora.plt), fmtN(B.plt)):""}
        ${fila("Enlace: primer post", link(bAhora&&bAhora.l1), link(B.l1))}
        ${fila("Enlace: último post", link(bAhora&&bAhora.l2), link(B.l2))}
        ${fila("Enlace: última corrección"+(B.revision?` (${B.revision.autor})`:""), link(bAhora&&bAhora.l3), link(B.l3))}
      </tbody></table>`:`<p>No encontré la bóveda de «${esc(d.cuenta)}» en el Panel de Bóvedas.</p>`}</label>
    <div class="fd-btns"><button class="fd-no" id="fdNo">Denegar</button><button class="fd-ok" id="fdOk">Aceptar</button></div>
  </div></div>`;
  const old=document.getElementById("foroDlg"); if(old) old.remove();
  document.body.insertAdjacentHTML("beforeend", h);
  const dlg=document.getElementById("foroDlg");
  const cerrar=()=>{ dlg.remove(); actual=null; };
  document.getElementById("fdNo").onclick=cerrar;
  dlg.addEventListener("click", e=>{ if(e.target===dlg) cerrar(); });
  document.addEventListener("keydown", function k(e){ if(e.key==="Escape"){ cerrar(); document.removeEventListener("keydown",k); } });
  document.getElementById("fdOk").onclick=()=>{
    const hechos=[]; const fueFicha = document.getElementById("fdF").checked && !!FI.codigo;
    try{
      let id = pj && pj.id;
      if(document.getElementById("fdF").checked && FI.codigo){ const r=F.importar(FI.codigo, d.cuenta); id=r.id; hechos.push("ficha ("+r.resumen+")"); }
      if(!id && (document.getElementById("fdB").checked)) id = F.asegurar(d.cuenta);
      if(document.getElementById("fdG").checked && B.act!=null){ const i=document.getElementById("inpDisponibles"); i.value=B.act; i.dispatchEvent(new Event("input",{bubbles:true}));
        if(B.pla!=null){ const ip=document.getElementById("inpPL"); if(ip){ ip.value=B.pla; ip.dispatchEvent(new Event("input",{bubbles:true})); } }
        hechos.push("grageas disponibles"); }
      if(document.getElementById("fdB").checked && B.url && id && RB){ window.rrSync && window.rrSync();
        if(RB.set(id, {ini:B.act, tot:B.tot, act:B.act, pla:B.pla, plt:B.plt, l1:B.l1, l2:B.l2, l3:B.l3, url:B.url, leido:d.leido})) hechos.push("bóveda"); }
    }catch(err){ console.error(err); alert("Algo falló al aplicar los datos: "+err.message); }
    cerrar();
    if(hechos.length){ aviso(`Listo: se actualizó ${hechos.join(", ")} de ${d.cuenta}.`); if(window.showSection) window.showSection(fueFicha?"ficha":"boveda"); }
  };
  document.getElementById("fdOk").focus();
}
function aviso(m){ const t=document.createElement("div"); t.className="fd-toast"; t.textContent=m; document.body.appendChild(t); setTimeout(()=>t.remove(),4200); }
if(location.hash==="#foro"){ try{ history.replaceState(null,"",location.pathname+location.search); }catch(_){} }
window.pamForoListo = true;
})();
