// @ts-check
// La «Sesión con código» de PAM (index.html de Hana Park, «PAM · Sesión con código»): el botón ☁ de arriba, la caja
// de la portada y el guardado automático, con el mismo HTML y los mismos textos. Copiada por un script desde
// index.html; los cambios:
//   · la nube (código, cifrado, Firestore) está en js/nube/Nube.js, y la lista de lo que viaja en js/nube/pendiente.js;
//   · F10: cada guardado lleva la versión de la nube que conoce; si otro dispositivo guardó por medio no se pisa nada
//     y sale el aviso de siempre («Traer los de la nube» / «Guardar los de acá»);
//   · F11: si los datos traídos de la nube no se pudieron poner, se avisa y no se guarda lo de este navegador encima.
import { Conflicto, nuevoCodigo, normal, formato } from './Nube.js?v=2.1.4';

/**
 * @param {{ doc: Document, win: any, nube: ReturnType<typeof import('./Nube.js').crearNube>, claves: { esDePAM: (k: string) => boolean, errorAlTraer?: string|null } }} dep
 */
export function iniciarSesion({ doc, win, nube, claves }) {
const K_SES = "pam.sesion";
const wrap = doc.getElementById("sesWrap");
if(!wrap) return null;
const esc = t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const esDePAM = claves.esDePAM;

let ses = null; try{ ses = JSON.parse(win.localStorage.getItem(K_SES)||"null"); }catch(e){}
let abierto=false, estado=ses?"on":"off", msg="", msgOk=false, recien=false, ver=false, confirmar=null, ultimaVez=0, conflicto=null;
const guardarSes = ()=>{ try{ ses ? win.localStorage.setItem(K_SES, JSON.stringify(ses)) : win.localStorage.removeItem(K_SES); }catch(e){} };

/* ---------- datos ---------- */
function foto(){
  const o={}, ks=[];
  for(let i=0;i<win.localStorage.length;i++){ const k=win.localStorage.key(i); if(esDePAM(k)) ks.push(k); }
  ks.sort().forEach(k=>o[k]=win.localStorage.getItem(k));
  return o;
}
function firma(o){ const t=JSON.stringify(o); let h=5381; for(let i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))|0; return t.length+":"+(h>>>0).toString(36); }

function traerYRecargar(datos, t, version){
  ses.t = t; ses.version = version || null; ses.firma = firma(datos); guardarSes();
  try{ win.sessionStorage.setItem("pam.pendiente", JSON.stringify({datos})); }catch(e){ win.alert("No se pudieron traer los datos: el navegador no tiene espacio."); return; }
  win.location.reload();
}

/* ---------- acciones ---------- */
let guardando=false;
async function guardar(forzar){
  if(!ses || guardando || conflicto) return;
  const d = foto(), f = firma(d);
  if(!forzar && f===ses.firma) return;
  /* F10: sin saber qué versión hay en la nube (una sesión de antes), primero se mira */
  if(!ses.version) return revisarNube();
  guardando=true; estado="busy"; pintar();
  try{
    const w = await nube.escribir(ses.code, d, ses.version==="nuevo" ? {nuevo:true} : {version:ses.version, tMin:(ses.t||0)+1});
    ses.t = w.t; ses.version = w.version; ses.firma = f; guardarSes(); estado="on"; ultimaVez=Date.now();
  }
  catch(e){
    /* F10: otro dispositivo guardó por medio: no se pisa nada, se mira qué hay */
    if(e instanceof Conflicto){ guardando=false; estado="on"; ses.version=null; return revisarNube(); }
    estado="err"; msg = e.message==="permiso" ? "La base de datos rechazó el guardado (revisá las reglas de Firestore)." : "No se pudo guardar: sin conexión. Se reintenta solo."; msgOk=false; }
  guardando=false; pintar();
}
async function revisarNube(){
  if(!ses) return;
  try{
    const r = await nube.leer(ses.code);
    if(!r){ ses.version="nuevo"; await guardar(true); return; }
    if(r.t > (ses.t||0) || (ses.version && r.version && r.version!==ses.version)){
      if(firma(foto())===ses.firma) traerYRecargar(r.datos, r.t, r.version);   /* acá no hubo cambios: traemos lo nuevo */
      else { conflicto = r; estado="conf"; pintar(); }                   /* cambios en los dos lados */
    }
    else if(!ses.version){ ses.version = r.version; guardarSes(); }     /* la nube no tiene nada más nuevo */
  }catch(e){ estado="err"; msg="Sin conexión con la nube. Tus cambios quedan en este navegador."; msgOk=false; pintar(); }
}
async function crear(){
  const code = nuevoCodigo();
  estado="busy"; msg=""; pintar();
  try{
    ses = {code, t:0, firma:""};
    const d = foto(); const w = await nube.escribir(code, d, {nuevo:true}); ses.t = w.t; ses.version = w.version; ses.firma = firma(d); guardarSes();
    estado="on"; recien=true; ver=true; ultimaVez=Date.now();
  }catch(e){ ses=null; guardarSes(); estado="off"; msg = e.message==="permiso" ? "La base de datos rechazó el guardado (revisá las reglas de Firestore)." : "No se pudo conectar. Probá de nuevo en un rato."; msgOk=false; }
  pintar();
}
async function entrar(raw){
  const x = normal(raw);
  if(!x){ msg="Ese código no tiene el formato de PAM (PAM-XXXX-XXXX-XXXX-XXXX)."; msgOk=false; pintar(); return; }
  estado="busy"; msg=""; pintar();
  try{
    const r = await nube.leer(x);
    if(!r){ estado="off"; msg="No hay nada guardado con ese código. Revisá que esté bien escrito."; msgOk=false; pintar(); return; }
    ses = {code:x, t:0, firma:""};
    traerYRecargar(r.datos, r.t, r.version);
  }catch(e){ ses=null; estado="off"; msg = /decrypt|operation/i.test(e.name+e.message) ? "El código no coincide con los datos guardados." : "No se pudo conectar. Probá de nuevo en un rato."; msgOk=false; pintar(); }
}
function salir(){ ses=null; guardarSes(); estado="off"; recien=false; ver=false; conflicto=null; msg="Cerraste la sesión en este navegador. Tus datos siguen guardados con tu código."; msgOk=true; pintar(); }

/* ---------- interfaz ---------- */
function hace(ms){ const s=Math.round(ms/1000); if(s<10) return "recién"; if(s<60) return "hace "+s+" s"; const m=Math.round(s/60); return m<60 ? "hace "+m+" min" : "hace "+Math.round(m/60)+" h"; }
function pintar(){
  const etiqueta = !ses ? "Iniciar sesión" : estado==="busy" ? "Guardando…" : estado==="conf" ? "Revisar" : estado==="err" ? "Sin conexión" : "Sesión";
  let h = `<button class="theme-btn ses-btn ${ses?estado:""}" data-ses="toggle" aria-expanded="${abierto}" aria-controls="sesList" title="Guardar tu sesión con un código"><span class="ses-ic">☁</span><span class="ses-l">${etiqueta}</span><span class="ses-dot"></span><span class="car">${abierto?"▴":"▾"}</span></button>`;
  h += `<div class="theme-list ses-list" id="sesList"${abierto?"":" hidden"}>`;
  if(!ses){
    h += `<h3>Cargá tu sesión</h3><p>Si ya usaste PAM en otro lado, pegá tu código y se traen tus fichas, roles y bóveda.</p>
      ${confirmar?`<div class="ses-conf">Esto reemplaza lo que hay en este navegador por lo guardado en <b>${esc(formato(confirmar))}</b>.<div class="ses-row" style="margin-top:8px"><button class="ses-b pri" data-ses="entrarOk">Sí, traer mis datos</button><button class="ses-b" data-ses="entrarNo">Cancelar</button></div></div>`
        :`<div class="ses-row"><input type="text" class="ses-in" id="sesIn" placeholder="PAM-XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false" aria-label="Tu código de PAM"><button class="ses-b pri" data-ses="entrar" ${estado==="busy"?"disabled":""}>Cargar</button></div>`}
      <div class="ses-or">¿Primera vez?</div>
      <p>Sin mail ni cuenta: PAM te da un código y con él abrís todo en cualquier navegador, también dentro del foro.</p>
      <button class="ses-b" data-ses="crear" ${estado==="busy"?"disabled":""}>Crear mi código</button>`;
  } else {
    const cod = formato(ses.code);
    if(recien) h += `<div class="ses-new"><b>Anotá tu código ahora.</b> Es la única llave de tus datos: sin él no se pueden recuperar.</div>`;
    if(conflicto) h += `<div class="ses-conf">Hay cambios más nuevos guardados desde otro dispositivo y también cambios en este.<div class="ses-row" style="margin-top:8px"><button class="ses-b pri" data-ses="traer">Traer los de la nube</button><button class="ses-b" data-ses="pisar">Guardar los de acá</button></div></div>`;
    h += `<p class="ses-st">${estado==="busy"?"Guardando…":estado==="err"?"Sin conexión: se reintenta solo.":estado==="conf"?"Esperando que elijas.":`<b>Guardado</b> ${ultimaVez?hace(Date.now()-ultimaVez):""}`}</p>`;
    h += `<div class="ses-code">${ver?esc(cod):"PAM-••••-••••-••••-"+esc(ses.code.slice(-4))}</div>`;
    h += `<div class="ses-row"><button class="ses-b pri" data-ses="copiar">Copiar código</button><button class="ses-b" data-ses="ver">${ver?"Ocultar":"Mostrar"}</button><button class="ses-b" data-ses="ya" ${estado==="busy"||conflicto?"disabled":""}>Guardar ahora</button></div>
      <p class="ses-fine">Cada cambio se guarda solo. Para abrir PAM en otro lado, tocá «Iniciar sesión» y pegá este código.</p>
      <div class="ses-row" style="margin-top:10px"><button class="ses-b warn" data-ses="salir">Cerrar sesión en este navegador</button></div>`;
  }
  if(msg) h += `<p class="ses-msg${msgOk?" ok":""}">${esc(msg)}</p>`;
  h += `<p class="ses-fine">Tus datos viajan cifrados con tu código: nadie más puede leerlos, ni quien administra PAM.</p></div>`;
  pintarHome();
  const foco = doc.activeElement && doc.activeElement.id==="sesIn" ? doc.getElementById("sesIn").value : null;
  wrap.innerHTML = h;
  if(foco!==null){ const i=doc.getElementById("sesIn"); if(i){ i.value=foco; i.focus(); } }
}
const homeEl = doc.getElementById("homeSes");
let homeMsg="";
function pintarHome(){
  if(!homeEl) return;
  const val = doc.getElementById("homeSesIn") ? doc.getElementById("homeSesIn").value : "";
  if(ses){
    homeEl.innerHTML = `<p class="hs-t"><span class="ses-ic">☁</span> Sesión activa</p><p>Tus datos se guardan solos con el código que termina en <b>${esc(ses.code.slice(-4))}</b>. <button class="hs-link" data-hs="abrir">Ver mi código</button></p>`;
  } else {
    homeEl.innerHTML = `<p class="hs-t"><span class="ses-ic">☁</span> ¿Ya usaste PAM en otro lado?</p><p>Pegá tu código de sesión para traer tus fichas, roles y bóveda.</p>
      <div class="ses-row"><input type="text" id="homeSesIn" placeholder="PAM-XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false" aria-label="Tu código de PAM"><button class="pri" data-hs="cargar">Cargar sesión</button></div>
      <p style="margin:10px 0 0">¿Primera vez? <button class="hs-link" data-hs="crear">Creá tu código</button> y tus cambios se guardan solos.</p>${homeMsg?`<p class="hs-msg">${esc(homeMsg)}</p>`:""}`;
    const i=doc.getElementById("homeSesIn"); if(i) i.value=val;
  }
}
if(homeEl){
  homeEl.addEventListener("click", e=>{
    const b=e.target.closest("[data-hs]"); if(!b) return; e.stopPropagation();
    const a=b.dataset.hs;
    if(a==="abrir"){ abierto=true; ver=true; pintar(); win.scrollTo({top:0,behavior:"smooth"}); return; }
    if(a==="crear"){ abierto=true; pintar(); win.scrollTo({top:0,behavior:"smooth"}); crear(); return; }
    if(a==="cargar"){
      const x=normal(doc.getElementById("homeSesIn").value);
      if(!x){ homeMsg="Ese código no tiene el formato de PAM (PAM-XXXX-XXXX-XXXX-XXXX)."; pintarHome(); return; }
      homeMsg=""; confirmar=x; msg=""; abierto=true; pintar(); win.scrollTo({top:0,behavior:"smooth"});
    }
  });
  homeEl.addEventListener("keydown", e=>{ if(e.key==="Enter" && e.target.id==="homeSesIn"){ e.preventDefault(); homeEl.querySelector('[data-hs="cargar"]').click(); } });
}
wrap.addEventListener("click", async e=>{
  const b = e.target.closest("[data-ses]"); if(!b) return;
  e.stopPropagation();
  const a = b.dataset.ses;
  if(a==="toggle"){ abierto=!abierto; if(!abierto){ recien=false; if(estado!=="err") msg=""; } pintar(); return; }
  if(a==="crear") return crear();
  if(a==="entrar"){ const x=normal(doc.getElementById("sesIn").value); if(!x){ msg="Ese código no tiene el formato de PAM (PAM-XXXX-XXXX-XXXX-XXXX)."; msgOk=false; pintar(); return; } confirmar=x; msg=""; pintar(); return; }
  if(a==="entrarOk"){ const x=confirmar; confirmar=null; return entrar(x); }
  if(a==="entrarNo"){ confirmar=null; pintar(); return; }
  if(a==="ver"){ ver=!ver; pintar(); return; }
  if(a==="copiar"){ const t=formato(ses.code); try{ await win.navigator.clipboard.writeText(t); msg="Código copiado."; msgOk=true; }catch(_){ ver=true; msg="Seleccioná el código y copialo."; msgOk=true; } pintar(); return; }
  if(a==="ya") return guardar(true);
  if(a==="salir") return salir();
  if(a==="traer"){ const r=conflicto; conflicto=null; return traerYRecargar(r.datos, r.t, r.version); }
  if(a==="pisar"){ ses.t = conflicto.t; ses.version = conflicto.version; conflicto=null; estado="on"; return guardar(true); }
});
wrap.addEventListener("keydown", e=>{ if(e.key==="Enter" && e.target.id==="sesIn"){ e.preventDefault(); wrap.querySelector('[data-ses="entrar"]').click(); } });
wrap.addEventListener("input", e=>{ if(e.target.id==="sesIn" && msg){ msg=""; } });
doc.addEventListener("click", e=>{ if(abierto && !wrap.contains(e.target)){ abierto=false; recien=false; pintar(); } });

/* guardado automático: cada 4 s se fija si cambió algo; también al salir de la pestaña */
win.setInterval(()=>{ if(ses && !conflicto && estado!=="busy") guardar(false); }, 4000);
win.setInterval(()=>{ if(abierto && ses && estado==="on") pintar(); }, 15000);
doc.addEventListener("visibilitychange", ()=>{ if(!ses) return; if(doc.hidden) guardar(false); else revisarNube(); });
win.pamSesion = {guardar:()=>guardar(true), estado:()=>({ses, estado, conflicto:!!conflicto})};

if(ses && claves.errorAlTraer){ ses.t = 0; ses.firma = ""; ses.version = null; guardarSes(); msg = "No se pudieron poner acá los datos de la nube ("+claves.errorAlTraer+"): este navegador quedó como estaba."; msgOk = false; }
if(ses && ses.firma && firma(foto())===ses.firma) ultimaVez = ses.t||0;
pintar();
if(ses) revisarNube();

return win.pamSesion;
}
