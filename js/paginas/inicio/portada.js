// @ts-nocheck
// Portada y navegación principal (fase 8e): el mismo código que estaba en index.html (copia congelada en tests/legado/paginas/), como módulo.
// Lo que cambia, marcado con «8e»: guarda tu nombre con el almacén (misma clave).
// Recibe la ventana: así las pruebas lo montan en una página de prueba junto al antiguo y comparan.
import { Almacen } from '../../core/Almacen.js?v=0.6.9';
/** @param {Window} w la ventana de PAM */
export async function montar(w) {
const almacen = Almacen.de(w);
const window = w, document = w.document, location = w.location, history = w.history, Math = w.Math, showSection = (...a) => w.showSection(...a);
  const K_USER = "grimorioAvadense.usuario";
  const SECS = {home:"sec-home", ficha:"sec-revisor", control:"sec-revisor", canjes:"sec-canjes", compendio:"sec-compendio", empleos:"sec-revisor", editor:"sec-revisor",
    ganancias:"sec-rr", boveda:"sec-rr", futuros:"sec-rr", roles:"sec-rr", misroles:"sec-rr", turnos:"sec-rr", oficiales:"sec-rr", coloreador:"sec-rr", respaldo:"sec-rr"};
  /* sección de PAM -> pestaña del Registro de Roles */
  const RR_TAB = {ganancias:"ganancias", boveda:"boveda", futuros:"canjes", roles:"inicio", misroles:"personajes", turnos:"turnos", oficiales:"oficiales", coloreador:"coloreador", respaldo:"copia"};
  const RR_INFO = {
    ganancias:["Ganancias","Lo que cobra cada personaje en el mes: sueldo, puntos, extras y pagos fijos."],
    boveda:["Bóveda","Tus grageas al día: sumá lo cobrado, restá los canjes y copiá el código para actualizar la bóveda del foro."],
    futuros:["Futuros canjes","La lista de lo que querés comprar, con prioridad y cuánto te falta juntar."],
    roles:["Resumen de roles","Cómo vas con cada personaje: roles pendientes, fechas límite y leyenda de colores."],
    misroles:["Roles por personaje","Todos los roles de cada personaje, con compañeros, estado, fecha y enlace."],
    turnos:["Control de turnos","Turnos de misiones y cuántas grageas suma cada uno."],
    oficiales:["Posibles oficiales","Ideas y oficiales disponibles para pedir o aceptar."],
    coloreador:["Coloreador de Diálogos","Pegá tu post, elegí el color del personaje y copiá el BBCode listo para el foro."],
    respaldo:["Importar y copia","Importá tu Excel de roles o guardá una copia del registro con un código."]
  };
  const GRUPOS = [
    {id:"pj", nombre:"Mi personaje", corto:"Personaje", glyph:"❖", items:[
      ["ficha","Mi Ficha","❖","Cargá atributos, habilidades, trasfondos y ventajas de tu personaje."],
      ["control","Controlador de Stats","⚖","Chequeá que los stats de combate de tu ficha estén bien calculados."]]},
    {id:"gr", nombre:"Grageas y canjes", corto:"Grageas", glyph:"✦", items:[
      ["ganancias","Ganancias","✧","Lo que cobra cada personaje en el mes."],
      ["boveda","Bóveda","⛁","Tus grageas al día y el código para actualizar la bóveda."],
      ["canjes","Tabla de Canjes","✦","Calculá cuánto cuesta cada mejora y armá el texto para el foro."],
      ["futuros","Futuros canjes","☆","Tu lista de deseos, con prioridad y cuánto te falta."],
      ["compendio","Compendio Arcano","⚝","Hechizos, pociones, rituales y objetos, con buscador y filtros."]]},
    {id:"rol", nombre:"Rol", glyph:"☾", items:[
      ["roles","Resumen de roles","☾","Pendientes, fechas límite y cómo vas con cada personaje."],
      ["misroles","Roles por personaje","✎","Todos tus roles con compañeros, estado y enlace."],
      ["coloreador","Coloreador de Diálogos","✒","Coloreá los diálogos de tu post con BBCode."],
      ["turnos","Control de turnos","⌛","Turnos de misiones y grageas por turno."],
      ["oficiales","Posibles oficiales","❦","Oficiales disponibles e ideas para pedir."],
      ["respaldo","Importar y copia","⎘","Importá tu Excel de roles o guardá una copia del registro."]]},
    {id:"emp", nombre:"Empleos", glyph:"⚜", items:[
      ["empleos","Empleos","⚜","Qué nivel alcanzás en cada empleo y qué te falta."],
      ["editor","Editor de Empleos","✧","Cargá empleos nuevos y compartilos con un código."]]}
  ];
  const grupoDe = k => GRUPOS.find(g=>g.items.some(it=>it[0]===k));
  const escH = s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  /* menú principal: un botón por categoría con su desplegable */
  const mainNav = document.getElementById("mainNav"), subNav = document.getElementById("subNav");
  let navOpen = null;
  function pintarNav(cur){
    const g = grupoDe(cur), it = g && g.items.find(x=>x[0]===cur);
    const open = navOpen==="all";
    mainNav.innerHTML = `<div class="nav-grp${open?" open":""}"><button class="nav-g nav-all${g?" active":""}" data-navg="all" aria-expanded="${open}" aria-haspopup="true">`+
      `<span class="nav-ham" aria-hidden="true">☰</span><span class="nav-cur">${it?`<span class="nc-g">${escH(g.nombre)} ·</span> ${escH(it[1])}`:"Secciones"}</span><span class="car">${open?"▴":"▾"}</span></button>`+
      `<div class="nav-menu nav-mega"${open?"":" hidden"}>${GRUPOS.map(G=>`<div class="nm-col"><div class="nm-h"><span>${G.glyph}</span> ${escH(G.nombre)}</div>`+
        G.items.map(x=>`<button data-go="${x[0]}" class="${x[0]===cur?"active":""}"><span class="nm-g">${x[2]}</span>${escH(x[1])}</button>`).join("")+`</div>`).join("")}</div></div>`;
    subNav.innerHTML = g && g.items.length>1 ? `<span class="sn-lbl">${escH(g.nombre)}</span>`+g.items.map(x=>`<button data-go="${x[0]}" class="${x[0]===cur?"active":""}" ${x[0]===cur?'aria-current="page"':""}>${escH(x[1])}</button>`).join("") : "";
    subNav.hidden = !subNav.innerHTML;
  }
  mainNav.addEventListener("click", e=>{
    const b = e.target.closest("[data-navg]"); if(!b) return;
    e.stopPropagation(); navOpen = navOpen===b.dataset.navg ? null : b.dataset.navg; pintarNav(document.body.dataset.sec);
  });
  document.addEventListener("click", e=>{ if(navOpen && !e.target.closest(".nav-grp [data-navg]")){ navOpen=null; pintarNav(document.body.dataset.sec); } });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && navOpen){ navOpen=null; pintarNav(document.body.dataset.sec); } });
  /* portada agrupada */
  document.getElementById("homeGroups").innerHTML = GRUPOS.map(G=>`<div class="home-group"><h2 class="hg-title"><span>${G.glyph}</span> ${escH(G.nombre)}</h2><div class="home-grid g${G.items.length}">`+
    G.items.map(it=>`<button class="home-card" data-go="${it[0]}"><span class="hc-glyph">${it[2]}</span><span class="hc-title">${escH(it[1])}</span><span class="hc-desc"${it[0]==="compendio"?' id="hcArcanos"':""}>${escH(it[3])}</span></button>`).join("")+`</div></div>`).join("");
  window.rrNav = t => { const k = Object.keys(RR_TAB).find(x=>RR_TAB[x]===t) || "roles"; showSection(k); };
  const RE_INFO = {
    ficha:["Mi Ficha","Toda la ficha de tu personaje, con el mismo orden que la del foro. Importala pegando tu ficha, completala y copiala de vuelta. Se guarda en este navegador."],
    control:["Controlador de Stats","Revisa que los stats de combate y los puntos de pociones y rituales de tu ficha estén bien calculados, teniendo en cuenta raza, objetos y arcanos."],
    empleos:["Empleos","Tocá un empleo para ver qué nivel alcanzás y qué te falta para el siguiente."],
    editor:["Editor de Empleos","Creá o corregí empleos copiando sus umbrales del foro, y compartilos con un código."]
  };
  let user = {g:"", n:""};
  user = Object.assign(user, almacen.leer(K_USER, {}) || {}); /* 8e: con el almacén */
  const inG = document.getElementById("inpGenero"), inN = document.getElementById("inpUsuario"), greet = document.getElementById("greet");
  inG.value = user.g; inN.value = user.n;
  const fitG = ()=>{ inG.style.width = (Math.max(1, inG.value.length) * 0.78 + 0.12) + "em"; };
  function paintGreet(){
    const g = user.g.trim(), n = user.n.trim();
    greet.textContent = n ? `Bienvenid${g||"_"}, ${n}` : "Inicio";
    greet.classList.toggle("named", !!n);
  }
  function saveUser(){ almacen.guardar(K_USER, user); paintGreet(); } /* 8e: con el almacén */
  inG.addEventListener("input", ()=>{ user.g = inG.value; fitG(); saveUser(); });
  inN.addEventListener("input", ()=>{ user.n = inN.value; saveUser(); });
  fitG(); paintGreet();
  const hc = document.getElementById("hcArcanos");
  const TC = window.pamTabla || {}; /* 8d: la Tabla de Canjes ya es un módulo */
  if(hc && typeof TC.ARCANOS!=="undefined") hc.textContent = `${TC.ARCANOS.length} hechizos, pociones, rituales y objetos, con buscador y filtros.`;

  window.showSection = function(key, push=true){
    if(!SECS[key]) key = "home";
    document.querySelectorAll(".app-sec").forEach(s=>s.classList.toggle("active", s.id===SECS[key]));
    document.body.dataset.sec = key;
    document.getElementById("ledgerWrap").style.display = (key==="canjes"||key==="compendio") ? "" : "none";
    if(key==="canjes"||key==="compendio"){ try{ const TC = window.pamTabla || {}; /* 8d */ if(typeof TC.renderAll==="function") TC.renderAll(); if(typeof TC.COMP!=="undefined" && TC.COMP.built) TC.compResults(); }catch(e){} }
    if(RR_TAB[key]){
      document.getElementById("rrTitle").textContent = RR_INFO[key][0];
      document.getElementById("rrSub").textContent = RR_INFO[key][1];
      if(window.rrGo) window.rrGo(RR_TAB[key]); else window.__rrStart = RR_TAB[key];
    }
    navOpen = null; pintarNav(key);
    if(RE_INFO[key]){
      document.getElementById("reTitle").textContent = RE_INFO[key][0];
      document.getElementById("reSub").textContent = RE_INFO[key][1];
      if(window.reSetTab) window.reSetTab(key);
    }
    if(push){ try{ history.replaceState(null,"", key==="home" ? location.pathname+location.search : "#"+key); }catch(e){} }
    window.scrollTo(0,0);
  };
  document.addEventListener("click", e=>{
    const b = e.target.closest("[data-go]");
    if(b && !b.closest("#re-app")) showSection(b.dataset.go);
  });
  const start = (location.hash||"").replace("#","");
  showSection(SECS[start] ? start : "home", false);

}
