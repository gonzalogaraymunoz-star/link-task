export const MOBILE_SCRIPT = "\n(function(){\n 'use strict';\n const mobile=window.matchMedia('(max-width: 850px)');\n const menu=document.getElementById('menuBtn');\n const sidebar=document.getElementById('sidebar');\n const modal=document.getElementById('modalBack');\n if(!menu||!sidebar)return;\n const backdrop=document.createElement('div');\n backdrop.className='mobileNavBackdrop';\n backdrop.setAttribute('aria-hidden','true');\n document.body.append(backdrop);\n menu.setAttribute('aria-controls','sidebar');\n menu.setAttribute('aria-haspopup','true');\n menu.setAttribute('aria-expanded','false');\n menu.setAttribute('title','Abrir menú LINK TASK');\n menu.setAttribute('aria-label','Abrir menú LINK TASK');\n menu.type='button';\n const newEntry=document.getElementById('newEntry');\n const newSession=document.getElementById('newSession');\n if(newEntry){newEntry.setAttribute('aria-label','Registrar actividad');newEntry.setAttribute('title','Registrar actividad')}\n if(newSession){newSession.setAttribute('aria-label','Iniciar sesión de trabajo');newSession.setAttribute('title','Iniciar sesión de trabajo')}\n let previousFocus=null;\n let modalFocus=null;\n const visibleTargets=()=>[...sidebar.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex=\"-1\"])')].filter(el=>el.getClientRects().length);\n function setMenuState(open,restore=false){\n   if(!mobile.matches)open=false;\n   const wasOpen=sidebar.classList.contains('open');\n   sidebar.classList.toggle('open',open);\n   backdrop.classList.toggle('is-open',open);\n   document.body.classList.toggle('mobileNavOpen',open);\n   menu.setAttribute('aria-expanded',String(open));\n   menu.setAttribute('aria-label',open?'Cerrar menú LINK TASK':'Abrir menú LINK TASK');\n   menu.setAttribute('title',menu.getAttribute('aria-label'));\n   if(mobile.matches){\n     sidebar.inert=!open;\n     sidebar.setAttribute('aria-hidden',String(!open));\n   }else{\n     sidebar.inert=false;\n     sidebar.removeAttribute('aria-hidden');\n   }\n   if(open&&!wasOpen){\n     previousFocus=document.activeElement;\n     const target=sidebar.querySelector('#search')||visibleTargets()[0];\n     if(target)requestAnimationFrame(()=>target.focus({preventScroll:true}));\n   }else if(!open&&wasOpen&&restore){\n     (menu||previousFocus)?.focus({preventScroll:true});\n   }\n }\n // The original app assigned onclick during its inline setup. Keep its nav bindings, replace only the menu toggle.\n menu.onclick=null;\n menu.addEventListener('click',()=>setMenuState(!sidebar.classList.contains('open'),true));\n backdrop.addEventListener('click',()=>setMenuState(false,true));\n sidebar.addEventListener('click',event=>{\n   if(event.target.closest('[data-nav],[data-business]'))setMenuState(false,false);\n });\n const syncBreakpoint=()=>{\n   if(!mobile.matches){setMenuState(false,false);return}\n   const open=sidebar.classList.contains('open');\n   setMenuState(open,false);\n };\n if(mobile.addEventListener)mobile.addEventListener('change',syncBreakpoint);\n else mobile.addListener(syncBreakpoint);\n syncBreakpoint();\n let touchStartX=null,touchStartY=null;\n sidebar.addEventListener('touchstart',e=>{\n   if(!mobile.matches||!sidebar.classList.contains('open')||e.touches.length!==1)return;\n   touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;\n },{passive:true});\n sidebar.addEventListener('touchend',e=>{\n   if(touchStartX===null||e.changedTouches.length!==1)return;\n   const dx=e.changedTouches[0].clientX-touchStartX,dy=e.changedTouches[0].clientY-touchStartY;\n   if(dx<-75&&Math.abs(dx)>Math.abs(dy)*1.5)setMenuState(false,true);\n   touchStartX=touchStartY=null;\n },{passive:true});\n // Keep the chosen section/business visible in its own scrollable navigation panel.
 function revealNav(target){
   const item=target?.closest?.('[data-nav],[data-business]');
   if(!item||!sidebar.contains(item))return;
   requestAnimationFrame(()=>item.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest',inline:'nearest'}));
 }
 sidebar.addEventListener('click',event=>revealNav(event.target),true);
 const activeObserver=new MutationObserver(changes=>{
   for(const change of changes){
     if(change.type==='attributes'&&change.target.matches?.('[data-nav],[data-business]')&&change.target.classList.contains('active'))revealNav(change.target);
   }
 });
 activeObserver.observe(sidebar,{subtree:true,attributes:true,attributeFilter:['class']});
 // Sidebar navigation must move the MAIN viewport to the destination, not merely select a filter.
 // Run after legacy onclick and Kanban handlers have rendered the target section.
 const navTargets={all:()=>document.querySelector('.intro')||document.getElementById('dashboard'),conversation:()=>document.querySelector('.sectiontop'),decision:()=>document.querySelector('.sectiontop'),task:()=>document.getElementById('linkKanban')||document.querySelector('.sectiontop'),evidence:()=>document.querySelector('.sectiontop'),session:()=>document.querySelector('.sectiontop')};
 const navigateTo=target=>{
   if(!target)return;
   const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const header=document.querySelector('.top');
   const offset=(header?.getBoundingClientRect().height||0)+16;
   const y=window.scrollY+target.getBoundingClientRect().top-offset;
   const position=Math.max(0,y);
   // Some layouts scroll .main rather than window; move the actual scroll owner.
   const owners=[document.scrollingElement,document.documentElement,document.body,document.querySelector('.main'),document.querySelector('.content')].filter(Boolean);
   for(const owner of owners){
     if(owner.scrollHeight>owner.clientHeight+10){
       const rect=target.getBoundingClientRect();
       const base=owner===document.scrollingElement||owner===document.documentElement||owner===document.body?position:owner.scrollTop+rect.top-owner.getBoundingClientRect().top-offset;
       owner.scrollTo({top:Math.max(0,base),behavior:'instant'});
     }
   }
   target.scrollIntoView({block:'start',behavior:'instant'});
   // Sticky toolbar offset is handled through scroll-margin on section targets.

 };
 sidebar.addEventListener('click',event=>{
   const nav=event.target.closest('[data-nav],[data-business]');
   if(!nav)return;
   const section=nav.dataset.nav;
   const business=nav.dataset.business;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(business){
       const kanban=document.getElementById('linkKanban');
       const businessFilter=kanban?.querySelector('select[aria-label="Filtrar negocio"]');
       if(businessFilter){
         const option=[...businessFilter.options].find(x=>x.value.toLowerCase()===business.toLowerCase());
         if(option){businessFilter.value=option.value;businessFilter.dispatchEvent(new Event('change',{bubbles:true}));}
       }
       navigateTo(kanban&&!kanban.hidden?kanban:document.querySelector('.sectiontop'));
     }else if(section==='task'){
       navigateTo(navTargets.task());
     }else{
       navigateTo(navTargets[section]?.()||document.querySelector('.sectiontop'));
     }
   }));
 });
 // Modal ergonomics and accessible keyboard focus, preserving original submit/cancel handlers.\n const modalVisible=()=>Boolean(modal?.classList.contains('open'));\n const modalTargets=()=>modal?[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]')].filter(el=>el.getClientRects().length&&!el.closest('.hidden')):[];\n function syncModal(){\n   if(!modal)return;\n   const open=modalVisible();\n   document.body.classList.toggle('modalOpen',open);\n   if(open){\n     if(!modalFocus)modalFocus=document.activeElement;\n     if(mobile.matches&&sidebar.classList.contains('open'))setMenuState(false,false);\n     const target=document.getElementById('closeModal')||modalTargets()[0];\n     if(target&&(!modal.contains(document.activeElement)||document.activeElement===document.body))\n       requestAnimationFrame(()=>target.focus({preventScroll:true}));\n   }else if(modalFocus){\n     if(modalFocus.isConnected)modalFocus.focus({preventScroll:true});\n     modalFocus=null;\n   }\n }\n if(modal){\n   new MutationObserver(syncModal).observe(modal,{attributes:true,attributeFilter:['class']});\n   syncModal();\n   modal.addEventListener('click',event=>{\n     if(event.target===modal)document.getElementById('closeModal')?.click();\n   });\n }\n document.addEventListener('keydown',event=>{\n   if(event.key==='Escape'){\n     if(modalVisible()){document.getElementById('closeModal')?.click();return}\n     if(mobile.matches&&sidebar.classList.contains('open')){\n       event.preventDefault();setMenuState(false,true);\n     }\n     return;\n   }\n   if(event.key!=='Tab')return;\n   const container=modalVisible()?modal:(mobile.matches&&sidebar.classList.contains('open')?sidebar:null);\n   if(!container)return;\n   const options=container===sidebar?visibleTargets():modalTargets();\n   if(!options.length)return;\n   const first=options[0],last=options[options.length-1];\n   if(event.shiftKey&&(document.activeElement===first||!container.contains(document.activeElement))){\n     event.preventDefault();last.focus();\n   }else if(!event.shiftKey&&(document.activeElement===last||!container.contains(document.activeElement))){\n     event.preventDefault();first.focus();\n   }\n });\n // Prevent a hidden drawer or modal from trapping scroll after browser back / page restoration.\n window.addEventListener('pageshow',()=>{\n   if(!mobile.matches)setMenuState(false,false);\n   syncModal();\n });\n})();\n";
