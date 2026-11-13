// @ts-nocheck
// Coloreador de Diálogos (fase 8b): el mismo código que estaba en index.html (copia congelada en
// tests/legado/paginas/registro-roles.js), como módulo. Lo que cambia, marcado con «8b»:
//   · guarda con el almacén (js/core/Almacen.js), con las mismas claves cd_…;
//   · N08: recuerda la última configuración de cada personaje de Mi Ficha.

import { GROUPS, FMTS, MARKERS, parseTag, fmtTags, ruleColor, colorize } from '../../bbcode/Dialogos.js?v=2.1.2';

/**
 * @param {ShadowRoot} RR donde está el Coloreador (dentro del Registro de Roles)
 * @param {Window} w la ventana de PAM
 * @param {{ almacen: import('../../core/Almacen.js').Almacen }} o
 */
export function montarColoreador(RR, w, { almacen }) {
const document = w.document, navigator = w.navigator, FileReader = w.FileReader, setTimeout = (...a) => w.setTimeout(...a);
  const $ = id => RR.getElementById('cd-'+id);
  const src=$('src'), tag=$('tag'), out=$('out'), preview=$('preview'), picker=$('picker');
  const store = { /* 8b: con el almacén, mismas claves */
    get(k,d){return almacen.leer(k,d)},
    set(k,v){almacen.guardar(k,v)}
  };

  // 2.1.0: lo que colorea está en js/bbcode/Dialogos.js (también lo usa Mi PJ en el foro)
  function makeFmt(box,f,onChange){
    FMTS.forEach(([k,txt,title])=>{const b=document.createElement('button');b.type='button';b.className='tg '+k;b.textContent=txt;b.title=title;
      b.setAttribute('aria-label',title);b.setAttribute('aria-pressed',!!f[k]);
      b.onclick=()=>{f[k]=!f[k];b.setAttribute('aria-pressed',f[k]);onChange()};box.append(b)});
    return f;
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
    guardarDelPj(rules,mrules); /* N08 */
    try{document.dispatchEvent(new w.CustomEvent('pam:coloreador'))}catch(e){} /* 2.1.0: js/pam/main.js lo pasa a Mi PJ */
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
  // ---------- N08 (8b): lo de cada personaje ----------
  /* Por personaje de Mi Ficha se guarda (cd_pj.<id>) la lista de nombres, las marcas, el formato del diálogo, el código
     de color y las opciones: al cambiar de personaje vuelve lo que se usó la última vez con él. Si todavía no tiene nada,
     queda lo de ahora. El texto que se colorea, los colores recientes y el fondo de la vista previa son de todos. */
  const pjActivo=()=>{try{return (w.pamPjs&&w.pamPjs.activa())||null}catch(e){return null}};
  let pjAplicado=null;
  function guardarDelPj(rules,mrules){
    const id=pjActivo(); if(!id||id!==pjAplicado) return;
    store.set('cd_pj.'+id,{names:rules,marks:mrules,dlgf:Object.assign({},dlgF),tag:tag.value,opts:opts()});
  }
  function aplicarDelPj(c){
    namesBox.innerHTML=''; marksBox.innerHTML='';
    if(Array.isArray(c.marks)) c.marks.forEach(r=>addMark(r.m,r.g,r.c,r.f||{},r.strip)); else addMark();
    if(Array.isArray(c.names)&&c.names.length) c.names.forEach(r=>addRule(r.name||'',r.g,r.c,r.f||{})); else addRule('Miss Alpha',2);
    if(typeof c.tag==='string') tag.value=c.tag;
    const o=c.opts; if(o){$('optRaya').checked=o.raya!==false;$('optGuion').checked=o.guion!==false;$('optComillas').checked=o.comillas!==false;$('optFix').checked=!!o.fix;$('optCenter').checked=!!o.center}
    Object.keys(dlgF).forEach(k=>delete dlgF[k]); Object.assign(dlgF,c.dlgf||{});
    FMTS.forEach(([k])=>{const b=$('dlgFmt').querySelector('.tg.'+k); if(b) b.setAttribute('aria-pressed',!!dlgF[k])});
  }
  function revisarPj(){
    const id=pjActivo(); if(id===pjAplicado) return;
    pjAplicado=id;
    const c=id&&store.get('cd_pj.'+id,null);
    if(c&&typeof c==='object'){aplicarDelPj(c);update()}
  }
  document.addEventListener('pam:pjs',revisarPj);
  revisarPj();

  drawRecent(); update();
  
}
