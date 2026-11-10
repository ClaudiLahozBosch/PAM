// @ts-nocheck
// Revisor de Empleos: el empleo de ejemplo (Sanador/a) y el lector de los empleos del foro (data/empleos-foro.txt).
// Copiado tal cual del código antiguo (fase 8c).
import { SUELDOS } from './datos.js?v=2.0.0';
export const A = (a,th)=>({k:'attr',a,th});
export const S = (s,th)=>({k:'skill',s,th});
export const B = (t,c,e,th)=>({k:'bg',t,c,e,th});
export const one = c => ({opts:[[c]]});
export function sanador(){
  return {
    id:'sanador', nombre:'Sanador/a', sueldo:'', unico:false,
    notas:'Empleo de ejemplo cargado desde la tabla de requisitos de Sanadora. Revisa el sueldo en el foro.',
    reqs:[
      one(A('Inteligencia',[2,3,4,5,6])), one(A('Poder',[1,2,2,3,4])),
      one(A('Voluntad',[1,1,2,2,3])), one(A('Percepción',[1,1,2,2,3])),
      one(S('Medicina',[2,3,3,3,4])), one(S('Herbología',[1,2,2,3,4])),
      one(S('Magizoología',[1,2,2,3,4])), one(S('Arcanismo',[1,1,2,2,3])),
      one(S('Cultura Mágica',[1,1,2,2,3])), one(S('Oratoria',[0,1,1,2,3])),
      one(S('Frialdad',[0,1,2,3,3])), one(S('Empatía',[1,1,2,3,4])),
      one(S('Alerta',[0,1,1,2,3])), one(S('Pociones',[1,2,2,3,4])),
      one(S('Rituales',[1,2,2,3,4])), one(S('Cultura Muggle',[0,0,0,1,2])),
      one(B('Biblioteca','Herbología','',[1,1,2,3,3])),
      one(B('Biblioteca','Herbología','Plantas naturales',[0,1,2,2,2])),
      one(B('Biblioteca','Herbología','Pociones',[0,1,2,2,2])),
      one(B('Biblioteca','Medicina','',[1,2,3,3,5])),
      one(B('Biblioteca','Medicina','Enfermedades mágicas',[0,2,3,3,5])),
      one(B('Biblioteca','Medicina','Experimental',[0,0,2,3,3])),
      one(B('Biblioteca','Medicina','Heridas mágicas',[0,2,3,3,5])),
      one(B('Biblioteca','Medicina','Medicina muggle',[0,0,1,2,2])),
      one(B('Informantes','Política','San Mungo',[0,1,2,2,3])),
      one(B('Influencia','Política','San Mungo',[0,0,2,2,3]))
    ],
    checks:[
      {t:'TIMOs: "Supera las expectativas" o más', desde:1},
      {t:'ÉXTASIS: "Supera las expectativas" o más en 2 de 4 (Herbología / Transformación y Encantamientos / Criaturas / DCAO)', desde:1}
    ]
  };
}

export const _nz = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export const SMALLW = new Set(['de','del','la','las','los','y','e','o','en','contra','a','por','el']);
export function tcase(s){
  return String(s).toLowerCase().split(/(\s+|\/|\(|-)/).map((w,i)=>{
    if(!w.trim() || /^[\/(-]$/.test(w)) return w;
    if(w==='fiqa') return 'FIQA';
    if(i>0 && SMALLW.has(w)) return w;
    return w.charAt(0).toUpperCase()+w.slice(1);
  }).join('');
}
export const slug = s => _nz(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function parseTh(t){
  const a = t.includes(',') ? t.split(',').map(Number) : t.split('').map(Number);
  while(a.length<5) a.push(a[a.length-1]||0);
  return a.slice(0,5);
}
export function parseCondDSL(s){
  // devuelve una lista de alternativas (cada una: lista de condiciones)
  const m = s.trim().match(/^([ASMVRB])\s+(.+?)\s+([\d,]+)$/);
  if(!m) throw new Error('Condición no válida: '+s);
  const [,k,body,thS] = m, th = parseTh(thS);
  if(k==='A') return [[{k:'attr',a:body,th}]];
  if(k==='S') return [[{k:'skill',s:body,sp:'',th}]];
  if(k==='V') return [[{k:'adv',v:body,th}]];
  if(k==='M'){ const [a,n]=body.split('#'); const c={k:'bestskill',a,th}; if(n&&+n>1) c.n=+n; return [[c]]; }
  if(k==='R'){ const [tier,type]=body.split(':'); return [[{k:'arc',tier,type:type||'',th}]]; }
  if(k==='B'){ const [t,c,e]=body.split('|'); return c.split('/').map(cc=>[{k:'bg',t,c:cc,e:e||'',th}]); }
}
export function parseReqLine(line){
  // "X ó Y + Z" -> {opts:[[...],[...]]}
  const opts=[];
  line.split(' ó ').forEach(alt=>{
    let combos=[[]];
    alt.split(' + ').forEach(part=>{
      const alts=parseCondDSL(part); const next=[];
      combos.forEach(cb=>alts.forEach(a=>next.push(cb.concat(a))));
      combos=next;
    });
    combos.forEach(cb=>opts.push(cb));
  });
  return {opts};
}
export function parseEmpleosDSL(txt){
  const out=[]; let grupo='', cur=null;
  const byName={};
  const finish=()=>{
    if(!cur) return;
    const base={ nombre:tcase(cur.name), grupo, sueldo:cur.sueldo, unico:cur.unico, desc:cur.desc,
      notas:cur.notas.join(' '), fuente:'foro' };
    const mk=(suffix,reqs,checks)=>{
      const j=Object.assign({},JSON.parse(JSON.stringify(base)),{
        id:'f-'+slug(cur.name+(suffix?' '+suffix:'')),
        nombre: base.nombre+(suffix?' — '+suffix:''),
        reqs:JSON.parse(JSON.stringify(reqs)), checks:JSON.parse(JSON.stringify(checks))});
      return j;
    };
    const variants=Object.keys(cur.vars);
    let made=[];
    if(variants.length){
      variants.forEach(v=>made.push(mk(v, cur.reqs.concat(cur.vars[v].reqs), cur.checks.concat(cur.vars[v].checks))));
    } else made.push(mk('', cur.reqs, cur.checks));
    if(cur.fis){
      const map=cur.fis; const swap=c=>{ c=JSON.parse(JSON.stringify(c));
        if(c.k==='attr' && map['A '+c.a]) c.a=map['A '+c.a];
        else if(c.k==='skill' && map['S '+c.s]) c.s=map['S '+c.s];
        return c; };
      const fj=mk('Personaje físico', cur.reqs.map(q=>({opts:q.opts.map(o=>o.map(swap))})), cur.checks);
      made.push(fj);
    }
    byName[cur.name]=made[0];
    made.forEach(j=>out.push(j));
    cur=null;
  };
  String(txt).split('\n').forEach(raw=>{
    const l=raw.replace(/\s+$/,''); if(!l.trim()) return;
    const tag=l.charAt(0), rest=l.slice(1).trim();
    if(tag==='@'){ finish(); grupo=rest; return; }
    if(tag==='!'){
      finish();
      const [name,sueldo,tags]=rest.split('|').map(x=>(x||'').trim());
      const unico=/único|1 puesto/i.test(tags||'');
      const notas=[];
      if(tags && !/^puesto único$/i.test(tags)) notas.push(tags+'.');
      if(/sin sueldo/i.test(sueldo)) notas.push('Sin sueldo.');
      const S=Object.keys(SUELDOS).find(k=>_nz(k)===_nz(sueldo))||'';
      cur={name,sueldo:S,unico,desc:'',notas,reqs:[],checks:[],vars:{},v:null,fis:null};
      return;
    }
    if(!cur) return;
    const tgt = cur.v ? cur.vars[cur.v] : cur;
    if(tag==='d'){ cur.desc=rest; return; }
    if(tag==='n'){ cur.notas.push(rest); return; }
    if(tag==='='){ if(rest==='-'){ cur.v=null; } else { cur.v=rest; cur.vars[rest]={reqs:[],checks:[]}; } return; }
    if(tag==='&'){ const src=byName[rest]; if(src){ cur.reqs.push(...JSON.parse(JSON.stringify(src.reqs))); cur.checks.push(...JSON.parse(JSON.stringify(src.checks))); } return; }
    if(tag==='X'){ const m=rest.match(/^[^:]*:\s*(.*)$/); const map={}; (m?m[1]:'').split(',').forEach(p=>{ const [a,b]=p.split('>').map(x=>x.trim()); if(a&&b) map[a]=b; }); cur.fis=map; return; }
    if(tag==='C'){ const m=l.match(/^C(\d)\s+(.*)$/); if(m) tgt.checks.push({t:m[2],desde:+m[1]}); return; }
    if('ASMVRB'.includes(tag) && l.charAt(1)===' '){ tgt.reqs.push(parseReqLine(l)); return; }
  });
  finish();
  return out;
}
