#!/usr/bin/env python3
"""Generate a self-contained HTML viewer for decision_trees.json.
Graph (flowchart) + raw JSON per tree, no external/CDN dependencies.
Re-run after editing the trees to refresh the view."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "representation/underwriting_manual/decision_trees.json"
OUT = ROOT / "decision_trees_view.html"
data = json.loads(SRC.read_text(encoding="utf-8"))
DATA_JS = json.dumps(data, ensure_ascii=False)

HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Árboles de decisión — Manual de Suscripción Automotores (LBC)</title>
<style>
  :root{
    --bg:#f6f7f9; --panel:#ffffff; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0;
    --decision:#2563eb; --decision-bg:#eff6ff; --hub:#475569; --hub-bg:#f1f5f9;
    --excl:#b45309; --excl-bg:#fffbeb; --lift:#0f766e; --lift-bg:#effdf9;
    --route:#4338ca; --route-bg:#eef2ff; --band:#7c3aed; --band-bg:#f9f5ff;
    --good:#15803d; --good-bg:#f0fdf4; --bad:#b91c1c; --bad-bg:#fef2f2;
    --flag:#dc2626; --overlay:#9333ea; --edge:#94a3b8;
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg)}
  .app{display:grid;grid-template-columns:280px 1fr;height:100vh}
  /* sidebar */
  .side{background:var(--panel);border-right:1px solid var(--line);overflow:auto;padding:16px}
  .side h1{font-size:15px;margin:0 0 4px}
  .side .sub{font-size:12px;color:var(--muted);margin-bottom:16px;line-height:1.4}
  .treelist{list-style:none;margin:0;padding:0}
  .treelist li{padding:11px 12px;border:1px solid var(--line);border-radius:9px;margin-bottom:9px;cursor:pointer;transition:.12s}
  .treelist li:hover{border-color:#cbd5e1;background:#fafbfc}
  .treelist li.active{border-color:var(--decision);background:var(--decision-bg);box-shadow:0 0 0 1px var(--decision) inset}
  .treelist .tid{font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--decision)}
  .treelist .tname{font-size:12.5px;margin-top:3px;line-height:1.35}
  .treelist .tmeta{font-size:11px;color:var(--muted);margin-top:5px}
  .legend{margin-top:18px;border-top:1px solid var(--line);padding-top:14px}
  .legend h2{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:0 0 9px}
  .legend .row{display:flex;align-items:center;gap:8px;font-size:11.5px;margin-bottom:6px}
  .swatch{width:14px;height:14px;border-radius:4px;border:1.5px solid}
  /* main */
  .main{display:flex;flex-direction:column;overflow:hidden}
  .topbar{background:var(--panel);border-bottom:1px solid var(--line);padding:12px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .topbar .name{font-size:15px;font-weight:650}
  .topbar .src{font:11.5px ui-monospace,Menlo,monospace;color:var(--muted);background:#f1f5f9;padding:2px 8px;border-radius:6px}
  .tabs{margin-left:auto;display:flex;gap:4px;background:#f1f5f9;border-radius:8px;padding:3px}
  .tabs button{border:0;background:transparent;padding:6px 14px;border-radius:6px;font-size:12.5px;cursor:pointer;color:var(--muted)}
  .tabs button.active{background:var(--panel);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}
  .zoom{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)}
  .zoom button{width:26px;height:26px;border:1px solid var(--line);background:var(--panel);border-radius:6px;cursor:pointer;font-size:14px}
  .banners{padding:10px 18px 0;display:flex;flex-direction:column;gap:8px}
  .banner{font-size:12px;border-radius:8px;padding:9px 12px;line-height:1.45}
  .banner.eval{background:#f8fafc;border:1px solid var(--line);color:#334155}
  .banner.conflict{background:#fef2f2;border:1px solid #fecaca;color:#7f1d1d}
  .banner.rule{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a}
  .banner b{font-weight:700}
  .stage-wrap{flex:1;overflow:auto;position:relative}
  .stage{position:relative;transform-origin:0 0}
  .node{position:absolute;border-radius:10px;border:1.5px solid var(--line);background:var(--panel);padding:9px 11px;font-size:12px;line-height:1.4;box-shadow:0 1px 3px rgba(15,23,42,.07);cursor:pointer;z-index:2}
  .node:hover{box-shadow:0 3px 10px rgba(15,23,42,.16)}
  .node.sel{box-shadow:0 0 0 2px var(--decision),0 3px 10px rgba(15,23,42,.18)}
  .node .nh{display:flex;align-items:center;gap:7px;margin-bottom:5px}
  .node .knd{font:600 9.5px ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.04em}
  .node .nid{font:600 10px ui-monospace,Menlo,monospace;color:var(--muted)}
  .node .pg{margin-left:auto;font:10px ui-monospace,Menlo,monospace;color:var(--muted);background:#f1f5f9;padding:1px 6px;border-radius:5px}
  .node .body{color:#1e293b}
  .node .sub{color:var(--muted);font-size:11px;margin-top:5px;font-style:italic}
  .node .badge{display:inline-block;margin-top:6px;font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:6px}
  .node .flagchip{display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:10.5px;font-weight:600;color:var(--flag);background:#fff1f2;border:1px solid #fecdd2;padding:2px 7px;border-radius:6px}
  .k-decision{border-color:var(--decision);background:var(--decision-bg)} .k-decision .knd{color:var(--decision)}
  .k-hub{border-color:var(--hub);background:var(--hub-bg)} .k-hub .knd{color:var(--hub)}
  .k-excl{border-color:var(--excl);background:var(--excl-bg)} .k-excl .knd{color:var(--excl)}
  .k-lift{border-color:var(--lift);background:var(--lift-bg)} .k-lift .knd{color:var(--lift)}
  .k-route{border-color:var(--route);background:var(--route-bg)} .k-route .knd{color:var(--route)}
  .k-band{border-color:var(--band);background:var(--band-bg)} .k-band .knd{color:var(--band)}
  .k-good{border-color:var(--good);background:var(--good-bg)} .k-good .knd{color:var(--good)}
  .k-bad{border-color:var(--bad);background:var(--bad-bg)} .k-bad .knd{color:var(--bad)}
  .k-flag{border-color:var(--flag);background:#fff1f2} .k-flag .knd{color:var(--flag)}
  .badge.b-excl{background:#fef3c7;color:#92400e}.badge.b-good{background:#dcfce7;color:#166534}.badge.b-bad{background:#fee2e2;color:#991b1b}.badge.b-route{background:#e0e7ff;color:#3730a3}
  svg.edges{position:absolute;left:0;top:0;overflow:visible;z-index:1}
  .elabel{position:absolute;z-index:1;font-size:10.5px;background:var(--panel);border:1px solid var(--line);color:#475569;padding:1px 7px;border-radius:10px;transform:translate(-50%,-50%);white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis}
  .elabel.warn{color:#9a3412;border-color:#fed7aa;background:#fff7ed}
  /* json view */
  .jsonwrap{flex:1;overflow:auto;padding:18px}
  pre.json{margin:0;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;white-space:pre-wrap;word-break:break-word}
  .j-key{color:#7c3aed}.j-str{color:#15803d}.j-num{color:#b45309}.j-bool{color:#2563eb}
  /* detail drawer */
  .drawer{position:fixed;top:0;right:0;width:430px;max-width:90vw;height:100vh;background:var(--panel);border-left:1px solid var(--line);box-shadow:-8px 0 24px rgba(15,23,42,.12);transform:translateX(100%);transition:.18s;z-index:50;display:flex;flex-direction:column}
  .drawer.open{transform:none}
  .drawer .dh{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px}
  .drawer .dh .knd{font:600 10px ui-monospace,Menlo,monospace;text-transform:uppercase;padding:2px 7px;border-radius:6px;background:#f1f5f9}
  .drawer .dh button{margin-left:auto;border:0;background:#f1f5f9;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:15px}
  .drawer .db{padding:16px;overflow:auto}
  .drawer .db h3{font-size:12px;margin:0 0 6px;color:var(--ink)}
  .drawer .db pre{font:11.5px/1.5 ui-monospace,Menlo,monospace;background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:12px;white-space:pre-wrap;word-break:break-word;margin:0}
  .hint{padding:14px 18px;color:var(--muted);font-size:12px}
</style>
</head>
<body>
<div class="app">
  <aside class="side">
    <h1>Árboles de decisión</h1>
    <div class="sub">Manual de Lineamientos de Suscripción — Automotores (LBC). Vista de <code>decision_trees.json</code>. Cada nodo cita su página/sección de origen.</div>
    <ul class="treelist" id="treelist"></ul>
    <div class="legend">
      <h2>Leyenda de nodos</h2>
      <div class="row"><span class="swatch" style="border-color:var(--decision);background:var(--decision-bg)"></span>Decisión / pregunta (gate)</div>
      <div class="row"><span class="swatch" style="border-color:var(--hub);background:var(--hub-bg)"></span>Conjunto de exclusiones</div>
      <div class="row"><span class="swatch" style="border-color:var(--excl);background:var(--excl-bg)"></span>Exclusión</div>
      <div class="row"><span class="swatch" style="border-color:var(--lift);background:var(--lift-bg)"></span>Levantamiento de exclusión</div>
      <div class="row"><span class="swatch" style="border-color:var(--route);background:var(--route-bg)"></span>Ruta / verificación / chequeo</div>
      <div class="row"><span class="swatch" style="border-color:var(--band);background:var(--band-bg)"></span>Banda (siniestralidad → acción)</div>
      <div class="row"><span class="swatch" style="border-color:var(--good);background:var(--good-bg)"></span>Resultado: admitido / procede</div>
      <div class="row"><span class="swatch" style="border-color:var(--bad);background:var(--bad-bg)"></span>Resultado: excluido / deriva</div>
      <div class="row"><span class="swatch" style="border-color:var(--flag);background:#fff1f2"></span>⚑ Conflicto / ambigüedad de la fuente</div>
    </div>
  </aside>
  <main class="main">
    <div class="topbar">
      <span class="name" id="tName"></span>
      <span class="src" id="tSrc"></span>
      <div class="tabs">
        <button id="tabGraph" class="active" onclick="setTab('graph')">Diagrama</button>
        <button id="tabJson" onclick="setTab('json')">JSON</button>
      </div>
      <div class="zoom" id="zoomCtl">
        <button onclick="zoom(-0.1)">−</button><span id="zlabel">100%</span><button onclick="zoom(0.1)">+</button><button onclick="zoomFit()" title="Ajustar">⤢</button>
      </div>
    </div>
    <div class="banners" id="banners"></div>
    <div class="stage-wrap" id="stageWrap"><div class="stage" id="stage"></div></div>
    <div class="jsonwrap" id="jsonWrap" style="display:none"><pre class="json" id="jsonPre"></pre></div>
    <div class="hint" id="hint">Haz clic en cualquier nodo para ver su objeto JSON de origen y citas completas.</div>
  </main>
</div>
<div class="drawer" id="drawer">
  <div class="dh"><span class="knd" id="dKnd"></span><strong id="dTitle"></strong><button onclick="closeDrawer()">×</button></div>
  <div class="db"><h3>Objeto de origen (decision_trees.json)</h3><pre id="dJson"></pre></div>
</div>

<script>
const DATA = /*DATA*/;
const TREES = DATA.trees;
let cur = 0, tab = 'graph', scale = 1;

/* ---------- helpers ---------- */
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function el(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstChild;}

/* ---------- adapters: tree JSON -> {nodes, edges, banners} ---------- */
function adapt(tree){
  if(tree.exclusiones) return adaptEligibility(tree);
  if(tree.branches)    return adaptRenovacion(tree);
  if(tree.root && tree.root.question) return adaptFlow(tree);
  return {nodes:[],edges:[],banners:[]};
}

function node(id,col,kind,title,body,opts){opts=opts||{};return Object.assign({id,col,kind,title,body},opts);}

function adaptEligibility(tree){
  const nodes=[], edges=[], banners=[];
  if(tree.evaluation_order) banners.push({cls:'eval',html:'<b>Orden de evaluación:</b> '+esc(tree.evaluation_order)});
  const r=tree.root;
  const isGate = !!r.question;
  // root
  const rootTitle = isGate ? r.question : r.statement;
  nodes.push(node('root',0,'decision', isGate?'Gate de tipo de vehículo':'Admisión', rootTitle,
    {sub: r.admitted_types_quote? 'Tipos admitidos: '+r.admitted_types_quote : (r.note||''), raw:r, pg:tree.source.pdf_page}));
  let exclCol, exclParent;
  if(isGate){
    // No -> not eligible terminal
    if(r.if_no){ nodes.push(node('noelig',1,'bad','Resultado','NO',{body:r.if_no.outcome,raw:r.if_no})); edges.push({from:'root',to:'noelig',label:'No'}); }
    // hub
    nodes.push(node('hub',1,'hub','Exclusiones','Cualquier exclusión que aplique ⇒ excluido (salvo levantamiento). Sin orden definido entre ellas.',{raw:{evaluation_order:tree.evaluation_order}}));
    edges.push({from:'root',to:'hub',label:'Sí, tipo admitido'});
    exclCol=2; exclParent='hub';
  } else {
    exclCol=1; exclParent='root';
  }
  // exclusions
  tree.exclusiones.forEach(x=>{
    const badge = x.outcome ? '<span class="badge b-excl">'+esc(x.outcome.split(';')[0])+'</span>' : '<span class="badge b-excl">excluido</span>';
    nodes.push(node(x.id, exclCol, 'excl', x.id, x.excluded, {raw:x, pg:x.source_page, badgeHtml:badge, flag:x.flag||x.note||x.clarification_quote, hasFlag:!!x.flag}));
    edges.push({from:exclParent,to:x.id,label:''});
    const cc=exclCol+1;
    if(x.lift_condition){
      const lc=x.lift_condition; const txt=[lc.if&&('Si: '+lc.if),lc.and&&('Y: '+lc.and),lc.authority&&('Autoridad: '+lc.authority),lc.conditions&&('Condiciones: '+lc.conditions.join(' · ')),lc.then&&('⇒ '+lc.then)].filter(Boolean).join('  ');
      nodes.push(node(x.id+'_lift',cc,'lift','Levantamiento',txt,{raw:lc}));
      edges.push({from:x.id,to:x.id+'_lift',label:'salvo si'});
    }
    if(x.lift_conditions){
      x.lift_conditions.forEach((lc,i)=>{
        const txt=[lc.case,lc.scope&&('Alcance: '+lc.scope),lc.conditions&&('Cond.: '+lc.conditions.join(' · ')),lc.limit&&('Límite: '+lc.limit),lc.pricing&&('Tarif.: '+lc.pricing)].filter(Boolean).join('  ');
        nodes.push(node(x.id+'_lift'+i,cc,'lift','Levantamiento',txt,{raw:lc}));
        edges.push({from:x.id,to:x.id+'_lift'+i,label:'salvo'});
      });
    }
    if(x.routing){ nodes.push(node(x.id+'_rt',cc,'route','Ruta',(x.routing.case||'')+' ⇒ '+(x.routing.then||''),{raw:x.routing})); edges.push({from:x.id,to:x.id+'_rt',label:'caso'}); }
    if(x.additional_check){ nodes.push(node(x.id+'_ac',cc,'route','Chequeo',(x.additional_check.if||'')+' ⇒ '+(x.additional_check.then||''),{raw:x.additional_check})); edges.push({from:x.id,to:x.id+'_ac',label:'además'}); }
    if(x.verification){ nodes.push(node(x.id+'_vf',cc,'route','Verificación',x.verification,{raw:{verification:x.verification}})); edges.push({from:x.id,to:x.id+'_vf',label:'verificar'}); }
  });
  // eligible terminal
  nodes.push(node('elig',exclCol,'good','Resultado',tree.default_outcome,{raw:{default_outcome:tree.default_outcome}}));
  edges.push({from:exclParent,to:'elig',label:'ninguna aplica',dashed:true});
  return {nodes,edges,banners};
}

function adaptRenovacion(tree){
  const nodes=[], edges=[], banners=[];
  if(tree.conflict_flag) banners.push({cls:'conflict',html:'⚑ <b>Conflicto interno de la fuente:</b> '+esc(tree.conflict_flag)});
  nodes.push(node('root',0,'decision','Renovación','Decisión por segmento y siniestralidad',{raw:{name:tree.name,source:tree.source}, pg:tree.source.pdf_page}));
  tree.branches.forEach((b,bi)=>{
    const sid='seg'+bi;
    nodes.push(node(sid,1,'decision','Segmento',b.segment,{raw:b, pg:(b.source_pages||[]).join(','), sub:b.scope_quote||'', flag:b.flag||b.band_boundary_flag||b.placement_in_source, hasFlag:!!(b.flag||b.band_boundary_flag)}));
    edges.push({from:'root',to:sid,label:''});
    // auto-renewal conditions (Comercial)
    if(b.auto_renewal_conditions){
      nodes.push(node(sid+'_arc',2,'route','Renovación automática','Condiciones: '+b.auto_renewal_conditions.join('  ·  '),{raw:{auto_renewal_conditions:b.auto_renewal_conditions}}));
      edges.push({from:sid,to:sid+'_arc',label:'requisitos'});
    }
    const rd=b.rate_decision||b.bands;
    if(rd) rd.forEach((band,i)=>{
      const cond=band.condition||band.if, act=band.action||band.then;
      const bodyExtra=band.constraint?('  ['+band.constraint+']'):'';
      nodes.push(node(sid+'_b'+i,2,'band','Banda',act+bodyExtra,{raw:band}));
      edges.push({from:sid,to:sid+'_b'+i,label:cond});
    });
  });
  // conflict node linking the two overlapping segments (Consumer=seg1, Pesados=seg2)
  if(tree.conflict_flag && tree.branches.length>=3){
    nodes.push(node('conf',3,'flag','⚑ Conflicto','Los esquemas de seg. Consumer y Pesados/motos se solapan con bandas distintas. La fuente no indica cuál prevalece.',{raw:{conflict_flag:tree.conflict_flag}}));
    edges.push({from:'seg1',to:'conf',label:'solapa',dashed:true,warn:true});
    edges.push({from:'seg2',to:'conf',label:'solapa',dashed:true,warn:true});
  }
  return {nodes,edges,banners};
}

function adaptFlow(tree){
  const nodes=[], edges=[], banners=[];
  const r=tree.root;
  if(r.general_rule_verbatim) banners.push({cls:'rule',html:'<b>Regla general:</b> '+esc(r.general_rule_verbatim)});
  nodes.push(node('root',0,'decision','Retroactividad', r.question,{raw:r, pg:tree.source.pdf_page}));
  if(r.if_yes){
    nodes.push(node('yes',1,'route', r.if_yes.case||'Sí','Requisitos: '+(r.if_yes.requirements||[]).join('  ·  '),{raw:r.if_yes}));
    edges.push({from:'root',to:'yes',label:'Sí (≤30 días)'});
    nodes.push(node('yesout',2,'good','Resultado',r.if_yes.outcome,{raw:{outcome:r.if_yes.outcome}}));
    edges.push({from:'yes',to:'yesout',label:'cumple'});
  }
  if(r.if_no){
    nodes.push(node('no',1,'bad', r.if_no.case||'No', r.if_no.outcome,{raw:r.if_no}));
    edges.push({from:'root',to:'no',label:'No (>30 días)'});
  }
  if(r.overlay_condition){
    const oc=r.overlay_condition;
    nodes.push(node('ovl',1,'flag','⚑ Condición superpuesta', oc.condition,{raw:oc, flag:oc.note}));
    edges.push({from:'root',to:'ovl',label:'si hubo siniestro',dashed:true,warn:true});
    nodes.push(node('ovlout',2,'route','Resultado',oc.outcome,{raw:{outcome:oc.outcome}}));
    edges.push({from:'ovl',to:'ovlout',label:'⇒'});
  }
  return {nodes,edges,banners};
}

/* ---------- node element ---------- */
const KMAP={decision:'k-decision',hub:'k-hub',excl:'k-excl',lift:'k-lift',route:'k-route',band:'k-band',good:'k-good',bad:'k-bad',flag:'k-flag'};
const KLAB={decision:'decisión',hub:'exclusiones',excl:'exclusión',lift:'levantamiento',route:'ruta',band:'banda',good:'resultado',bad:'resultado',flag:'conflicto'};
function buildNodeEl(n){
  const pg = n.pg!=null&&n.pg!==''? '<span class="pg">p.'+esc(n.pg)+'</span>':'';
  const idl = (n.id&&/^[XC]\d/.test(n.id))? '<span class="nid">'+esc(n.id)+'</span>':'';
  const badge = n.badgeHtml||'';
  const flag = n.flag? '<div class="flagchip" title="'+esc(n.flag)+'">⚑ '+esc(n.hasFlag?'conflicto':'nota')+'</div>':'';
  const sub = n.sub? '<div class="sub">'+esc(n.sub.length>180?n.sub.slice(0,180)+'…':n.sub)+'</div>':'';
  const e = el('<div class="node '+KMAP[n.kind]+'" data-id="'+esc(n.id)+'">'
    +'<div class="nh"><span class="knd">'+KLAB[n.kind]+'</span>'+idl+pg+'</div>'
    +'<div class="title" style="font-weight:600;margin-bottom:3px">'+esc(n.title||'')+'</div>'
    +'<div class="body">'+esc(n.body||'')+'</div>'+sub+badge+flag+'</div>');
  e.style.width = ({decision:280,hub:250,excl:320,lift:300,route:300,band:300,good:240,bad:200,flag:330}[n.kind]||260)+'px';
  e.addEventListener('click',ev=>{ev.stopPropagation();openDrawer(n,e);});
  return e;
}

/* ---------- layout (HTML nodes + SVG edges) ---------- */
function layout(stage, nodes, edges){
  stage.innerHTML=''; const byId={}; nodes.forEach(n=>byId[n.id]=n);
  nodes.forEach(n=>{ n.el=buildNodeEl(n); n.el.style.left='0px'; n.el.style.top='0px'; stage.appendChild(n.el); });
  nodes.forEach(n=>{ const r=n.el.getBoundingClientRect(); n.w=r.width; n.h=r.height; });
  const cols={}; nodes.forEach(n=>{(cols[n.col]=cols[n.col]||[]).push(n);});
  const ckeys=Object.keys(cols).map(Number).sort((a,b)=>a-b);
  const COLGAP=90,VGAP=16,PADX=24,PADY=24;
  const colW={}; ckeys.forEach(c=>colW[c]=Math.max.apply(null,cols[c].map(n=>n.w)));
  const colX={}; let x=PADX; ckeys.forEach(c=>{colX[c]=x; x+=colW[c]+COLGAP;});
  ckeys.forEach(c=>{ let y=PADY; cols[c].forEach(n=>{ n.x=colX[c]; n.y=y; y+=n.h+VGAP; }); });
  // parent-centering, right-to-left
  for(let i=ckeys.length-2;i>=0;i--){
    const c=ckeys[i]; let prevBottom=PADY-VGAP;
    cols[c].forEach(n=>{
      const kids=edges.filter(e=>e.from===n.id).map(e=>byId[e.to]).filter(k=>k&&k.col>c);
      if(kids.length){ const cy=kids.reduce((s,k)=>s+(k.y+k.h/2),0)/kids.length; n.y=cy-n.h/2; }
      if(n.y<prevBottom+VGAP) n.y=prevBottom+VGAP;
      prevBottom=n.y+n.h;
    });
  }
  let maxX=0,maxY=0;
  nodes.forEach(n=>{ n.el.style.left=n.x+'px'; n.el.style.top=n.y+'px'; maxX=Math.max(maxX,n.x+n.w); maxY=Math.max(maxY,n.y+n.h); });
  // svg edges
  const W=maxX+PADX, H=maxY+PADY;
  const svgNS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(svgNS,'svg'); svg.setAttribute('class','edges'); svg.setAttribute('width',W); svg.setAttribute('height',H);
  svg.innerHTML='<defs><marker id="arr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker>'
    +'<marker id="arrw" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#ea580c"/></marker></defs>';
  edges.forEach(e=>{
    const s=byId[e.from], t=byId[e.to]; if(!s||!t) return;
    const sx=s.x+s.w, sy=s.y+s.h/2, tx=t.x, ty=t.y+t.h/2, mx=Math.max(sx+24,(sx+tx)/2);
    const p=document.createElementNS(svgNS,'path');
    p.setAttribute('d','M'+sx+','+sy+' H'+mx+' V'+ty+' H'+tx);
    p.setAttribute('fill','none'); p.setAttribute('stroke', e.warn?'#ea580c':'#94a3b8');
    p.setAttribute('stroke-width', e.warn?'2':'1.5'); if(e.dashed) p.setAttribute('stroke-dasharray','5,4');
    p.setAttribute('marker-end', e.warn?'url(#arrw)':'url(#arr)');
    svg.appendChild(p);
    if(e.label){ const lab=el('<div class="elabel'+(e.warn?' warn':'')+'">'+esc(e.label)+'</div>'); lab.style.left=mx+'px'; lab.style.top=((sy+ty)/2)+'px'; stage.appendChild(lab); }
  });
  stage.insertBefore(svg, stage.firstChild);
  stage.style.width=W+'px'; stage.style.height=H+'px';
  stage._w=W; stage._h=H;
}

/* ---------- render ---------- */
function render(){
  const tree=TREES[cur];
  document.getElementById('tName').textContent=tree.name;
  document.getElementById('tSrc').textContent='p.'+tree.source.pdf_page+(tree.source.printed_page?(' (impresa '+tree.source.printed_page+')'):'')+' · §'+tree.source.section+' · '+tree.id;
  // sidebar active
  [...document.querySelectorAll('#treelist li')].forEach((li,i)=>li.classList.toggle('active',i===cur));
  const {nodes,edges,banners}=adapt(tree);
  // banners
  const bw=document.getElementById('banners'); bw.innerHTML='';
  banners.forEach(b=>bw.appendChild(el('<div class="banner '+b.cls+'">'+b.html+'</div>')));
  // graph — ensure stage is visible so getBoundingClientRect measures real heights
  document.getElementById('stageWrap').style.display='block';
  document.getElementById('jsonWrap').style.display='none';
  layout(document.getElementById('stage'), nodes, edges);
  // json
  document.getElementById('jsonPre').innerHTML=highlight(JSON.stringify(tree,null,2));
  scale=1; applyZoom(); setTab(tab);
}
function highlight(s){
  return esc(s)
    .replace(/("(\\.|[^"\\])*")(\s*:)/g,'<span class="j-key">$1</span>$3')
    .replace(/:\s*("(\\.|[^"\\])*")/g,': <span class="j-str">$1</span>')
    .replace(/\b(-?\d+\.?\d*)\b/g,'<span class="j-num">$1</span>')
    .replace(/\b(true|false|null)\b/g,'<span class="j-bool">$1</span>');
}
function setTab(t){
  tab=t;
  document.getElementById('tabGraph').classList.toggle('active',t==='graph');
  document.getElementById('tabJson').classList.toggle('active',t==='json');
  document.getElementById('stageWrap').style.display=t==='graph'?'block':'none';
  document.getElementById('jsonWrap').style.display=t==='json'?'block':'none';
  document.getElementById('zoomCtl').style.visibility=t==='graph'?'visible':'hidden';
  document.getElementById('hint').style.display=t==='graph'?'block':'none';
}
function zoom(d){ scale=Math.min(2,Math.max(0.4,scale+d)); applyZoom(); }
function applyZoom(){ document.getElementById('stage').style.transform='scale('+scale+')'; document.getElementById('zlabel').textContent=Math.round(scale*100)+'%'; }
function zoomFit(){ const w=document.getElementById('stageWrap').clientWidth-20, st=document.getElementById('stage'); scale=Math.min(1,w/(st._w||w)); applyZoom(); }
function openDrawer(n,e){
  document.querySelectorAll('.node.sel').forEach(x=>x.classList.remove('sel')); if(e) e.classList.add('sel');
  document.getElementById('dKnd').textContent=KLAB[n.kind]||n.kind;
  document.getElementById('dTitle').textContent=(n.title||'')+(n.id&&/^[XC]\d/.test(n.id)?(' · '+n.id):'');
  document.getElementById('dJson').innerHTML=highlight(JSON.stringify(n.raw!=null?n.raw:{node:n.title,body:n.body},null,2));
  document.getElementById('drawer').classList.add('open');
}
function closeDrawer(){ document.getElementById('drawer').classList.remove('open'); document.querySelectorAll('.node.sel').forEach(x=>x.classList.remove('sel')); }

/* ---------- init ---------- */
const tl=document.getElementById('treelist');
TREES.forEach((t,i)=>{
  tl.appendChild(el('<li onclick="select('+i+')"><div class="tid">'+esc(t.id)+'</div><div class="tname">'+esc(t.name)+'</div><div class="tmeta">p.'+t.source.pdf_page+' · §'+t.source.section+' · '+( (t.exclusiones&&(t.exclusiones.length+' exclusiones')) || (t.branches&&(t.branches.length+' ramas')) || 'flujo condicional')+'</div></li>'));
});
function select(i){ cur=i; render(); }
window.addEventListener('keydown',e=>{ if(e.key==='Escape') closeDrawer(); });
select(0);
</script>
</body>
</html>"""

OUT.write_text(HTML.replace("/*DATA*/", DATA_JS), encoding="utf-8")
print("wrote", OUT, "(", len(HTML), "bytes template,", len(DATA_JS), "bytes data )")
print("trees:", [t["id"] for t in data["trees"]])
