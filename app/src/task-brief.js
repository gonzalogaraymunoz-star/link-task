export const TASK_BRIEF_SCRIPT = String.raw`
(() => {
  if (window.__linkTaskEditorial) return;
  window.__linkTaskEditorial = true;

  const HEADINGS = [
    'PROPÓSITO', 'PUNTO DE PARTIDA', 'SIGUIENTE ACCIÓN',
    'PASOS DE TRABAJO', 'CRITERIO DE CIERRE', 'EVIDENCIAS',
    'PROMPT PARA AGENTE', 'LÍMITES'
  ];
  const labels = {
    'PROPÓSITO': 'Para qué lo hacemos',
    'PUNTO DE PARTIDA': 'Dónde estamos',
    'SIGUIENTE ACCIÓN': 'Qué hacer ahora',
    'PASOS DE TRABAJO': 'Camino de ejecución',
    'CRITERIO DE CIERRE': 'Qué significa terminar',
    'EVIDENCIAS': 'Cómo lo comprobamos',
    'PROMPT PARA AGENTE': 'Instrucciones para delegar',
    'LÍMITES': 'Condiciones y autorizaciones'
  };

  const css = document.createElement('style');
  css.textContent = [
    '.editorialBrief{display:grid;gap:14px;min-width:0;width:100%;font-size:13px;line-height:1.58}',
    '.editorialSection{padding:12px 0;border-bottom:1px solid var(--border,#dedede);min-width:0}',
    '.editorialSection:last-child{border:0}',
    '.editorialSection h4{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted,#6a726a);font-weight:700;margin:0 0 7px}',
    '.editorialSection p{margin:0!important;white-space:pre-wrap!important;overflow-wrap:anywhere;line-height:1.65!important;color:var(--text,#232323)!important}',
    '.editorialSection a{color:var(--accent,#526d4b);text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}',
    '.editorialSection ol{padding-left:19px;margin:7px 0 0;display:grid;gap:8px}',
    '.editorialSection li{overflow-wrap:anywhere;color:var(--text,#232323)}',
    '.editorialSection[data-role="SIGUIENTE ACCIÓN"]{padding:16px;border:1px solid var(--border,#d8ded6);border-radius:13px;background:var(--hover,#f3f5f1)}',
    '.editorialSection[data-role="PROMPT PARA AGENTE"]{padding:16px;border:1px solid var(--border,#d8ded6);border-radius:13px;background:var(--card,#fff)}',
    '.editorialActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}',
    '.editorialActions button,.editorialGuideBtn{border:1px solid var(--border,#ccc);background:var(--bg,#fff);color:var(--text,#222);border-radius:9px;padding:8px 11px;font:inherit;font-size:11px;cursor:pointer}',
    '.editorialActions button:hover,.editorialGuideBtn:hover{background:var(--hover,#eee)}',
    '.editorialHint{font-size:11px;color:var(--muted,#666);margin-top:8px;line-height:1.5}',
    '#linkKanban .editorialBrief{margin-top:10px}',
    '.inspector>.editorialBrief{width:100%}',
    '@media(max-width:640px){.editorialSection[data-role="SIGUIENTE ACCIÓN"],.editorialSection[data-role="PROMPT PARA AGENTE"]{padding:12px}}'
  ].join('\n');
  document.head.append(css);

  function sectionsFrom(raw) {
    if (typeof raw !== 'string' || !raw.startsWith('PROPÓSITO\n')) return null;
    const re = /(?:^|\n\n)(PROPÓSITO|PUNTO DE PARTIDA|SIGUIENTE ACCIÓN|PASOS DE TRABAJO|CRITERIO DE CIERRE|EVIDENCIAS|PROMPT PARA AGENTE|LÍMITES)\n/g;
    const spots = [];
    let hit;
    while ((hit = re.exec(raw)) !== null) spots.push({name:hit[1],start:re.lastIndex,index:hit.index});
    if (spots.length < 3) return null;
    return spots.map((x,i) => ({name:x.name,value:raw.slice(x.start,i+1<spots.length?spots[i+1].index:raw.length).trim()}));
  }

  function richText(parent, body) {
    const re = /https:\/\/[^\s<>"']+/g;
    let last=0, hit;
    while ((hit=re.exec(body))!==null) {
      if(hit.index>last) parent.append(document.createTextNode(body.slice(last,hit.index)));
      let url=hit[0],tail='';
      while(/[.,;)]$/.test(url)){tail=url.slice(-1)+tail;url=url.slice(0,-1)}
      const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent=url.includes('tasks.google.com')?'Abrir tarea en Google Tasks ↗':url.includes('instagram.com')?'Ver publicación ↗':'Abrir enlace ↗';
      parent.append(link);
      if(tail)parent.append(document.createTextNode(tail));
      last=hit.index+hit[0].length;
    }
    if(last<body.length)parent.append(document.createTextNode(body.slice(last)));
  }

  async function copy(text,button) {
    try{
      await navigator.clipboard.writeText(text);
      const previous=button.textContent;button.textContent='Copiado ✓';
      setTimeout(()=>{if(button.isConnected)button.textContent=previous},1800);
    }catch{button.textContent='No se pudo copiar'}
  }

  function renderBrief(raw) {
    const secs=sectionsFrom(raw);
    if(!secs)return null;
    const root=document.createElement('div');root.className='editorialBrief';root.setAttribute('aria-label','Ficha de ejecución');
    for(const section of secs){
      const block=document.createElement('section');block.className='editorialSection';block.dataset.role=section.name;
      const h=document.createElement('h4');h.textContent=labels[section.name]||section.name;
      block.append(h);
      if(section.name==='PASOS DE TRABAJO'){
        const list=document.createElement('ol');
        for(const item of section.value.split('\n').filter(Boolean)){
          const li=document.createElement('li');richText(li,item.replace(/^\s*\d+[\).]\s*/,''));list.append(li);
        }
        block.append(list);
      } else {
        const p=document.createElement('p');richText(p,section.value);block.append(p);
      }
      if(section.name==='PROMPT PARA AGENTE'){
        const row=document.createElement('div');row.className='editorialActions';
        const button=document.createElement('button');button.type='button';button.textContent='Copiar prompt';
        button.addEventListener('click',()=>copy(section.value,button));row.append(button);
        const full=document.createElement('button');full.type='button';full.textContent='Copiar ficha completa';
        full.addEventListener('click',()=>copy(raw,full));row.append(full);block.append(row);
      }
      root.append(block);
    }
    return root;
  }

  function enhance() {
    const inspector=document.getElementById('inspector');
    if(inspector){
      const candidate=[...inspector.children].find(n=>n.tagName==='P' && n.textContent.startsWith('PROPÓSITO\n'));
      if(candidate){const formatted=renderBrief(candidate.textContent);if(formatted)candidate.replaceWith(formatted)}
    }
    const details=document.querySelector('#linkKanban .lkdetail');
    if(details && !details.hidden){
      const candidate=[...details.children].find(n=>n.tagName==='P' && n.textContent.startsWith('PROPÓSITO\n'));
      if(candidate){const formatted=renderBrief(candidate.textContent);if(formatted)candidate.replaceWith(formatted)}
    }
  }

  function template(){
    const title=document.getElementById('title')?.value.trim() || 'Definir una tarea concreta';
    return [
      'PROPÓSITO', title+'. Explica el valor para el negocio o cliente.',
      '', 'PUNTO DE PARTIDA','Describe solo lo que está comprobado y lo que falta.',
      '', 'SIGUIENTE ACCIÓN','Una acción mínima ejecutable ahora, con responsable.',
      '', 'PASOS DE TRABAJO','1. Revisar fuentes y materiales existentes.\n2. Ejecutar el siguiente paso autorizado.\n3. Registrar la evidencia y el resultado.',
      '', 'CRITERIO DE CIERRE','Define un resultado observable, no solo actividad.',
      '', 'EVIDENCIAS','Indica enlace, documento, registro o comprobante verificable.',
      '', 'PROMPT PARA AGENTE','Actúa como colaborador de LINK TASK para esta tarea. Lee su contexto, verifica fuentes, propone el siguiente paso mínimo e informa hecho, evidencia y bloqueo. Solicita aprobación antes de actos externos, financieros o irreversibles.',
      '', 'LÍMITES','No inventar resultados, no duplicar tareas ni realizar acciones externas sin autorización.'
    ].join('\n');
  }

  function addGuide(){
    const type=document.getElementById('kind'),area=document.getElementById('summary'),form=document.getElementById('entryForm');
    if(!type||!area||!form)return;
    const parent=area.closest('.field');if(!parent||parent.querySelector('.editorialGuideBtn'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='editorialGuideBtn';
    btn.textContent='Usar guía editorial de tarea';
    const hint=document.createElement('div');hint.className='editorialHint';
    hint.textContent='Una tarea útil comunica propósito, próxima acción, cierre comprobable y prompt de continuación.';
    parent.append(btn,hint);
    const refresh=()=>{const isTask=type.value==='task';btn.hidden=!isTask;hint.hidden=!isTask;
      if(isTask){area.placeholder='Propósito, estado real, siguiente acción, evidencia y prompt para agente...'}
    };
    type.addEventListener('change',refresh);refresh();
    btn.addEventListener('click',()=>{if(area.value.trim() && !window.confirm('¿Reemplazar el contenido actual por una guía editable?'))return;area.value=template();area.focus()});
    form.addEventListener('submit',(event)=>{
      if(type.value!=='task')return;
      const value=area.value.trim();
      if(!value){event.preventDefault();window.alert('Describe el propósito y próximo paso antes de guardar la tarea.');area.focus();return}
      if(!sectionsFrom(value)){
        const title=document.getElementById('title')?.value.trim()||'Tarea';
        area.value=[
         'PROPÓSITO',title,
         '', 'PUNTO DE PARTIDA',value,
         '', 'SIGUIENTE ACCIÓN','Definir el siguiente paso verificable desde el estado existente.',
         '', 'PASOS DE TRABAJO','1. Revisar fuentes existentes.\n2. Proponer una acción concreta.\n3. Registrar resultado y evidencia.',
         '', 'CRITERIO DE CIERRE','Completar cuando exista resultado comprobable.',
         '', 'EVIDENCIAS','Pendiente de aportar referencia verificable.',
         '', 'PROMPT PARA AGENTE','Verifica la fuente de esta tarea, identifica qué falta y propone un siguiente paso mínimo. No presupongas que ya fue ejecutada.',
         '', 'LÍMITES','Pedir autorización antes de acciones externas o financieras; no duplicar ni inventar resultados.'
        ].join('\n');
      }
    },true);
  }

  function start(){
    addGuide();enhance();
    const observer=new MutationObserver(()=>{enhance();addGuide()});
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
`;
