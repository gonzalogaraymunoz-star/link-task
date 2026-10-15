export const MOBILE_SCRIPT = String.raw`
(function(){
 'use strict';
 const mobile=window.matchMedia('(max-width: 850px)');
 const menu=document.getElementById('menuBtn');
 const sidebar=document.getElementById('sidebar');
 const modal=document.getElementById('modalBack');
 if(!menu||!sidebar)return;
 const backdrop=document.createElement('div');
 backdrop.className='mobileNavBackdrop';
 backdrop.setAttribute('aria-hidden','true');
 document.body.append(backdrop);
 menu.setAttribute('aria-controls','sidebar');
 menu.setAttribute('aria-haspopup','true');
 menu.setAttribute('aria-expanded','false');
 menu.setAttribute('title','Abrir menú LINK TASK');
 menu.setAttribute('aria-label','Abrir menú LINK TASK');
 menu.type='button';
 const newEntry=document.getElementById('newEntry');
 const newSession=document.getElementById('newSession');
 if(newEntry){newEntry.setAttribute('aria-label','Registrar actividad');newEntry.setAttribute('title','Registrar actividad')}
 if(newSession){newSession.setAttribute('aria-label','Iniciar sesión de trabajo');newSession.setAttribute('title','Iniciar sesión de trabajo')}
 let previousFocus=null;
 let modalFocus=null;
 const visibleTargets=()=>[...sidebar.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
 function setMenuState(open,restore=false){
   if(!mobile.matches)open=false;
   const wasOpen=sidebar.classList.contains('open');
   sidebar.classList.toggle('open',open);
   backdrop.classList.toggle('is-open',open);
   document.body.classList.toggle('mobileNavOpen',open);
   menu.setAttribute('aria-expanded',String(open));
   menu.setAttribute('aria-label',open?'Cerrar menú LINK TASK':'Abrir menú LINK TASK');
   menu.setAttribute('title',menu.getAttribute('aria-label'));
   if(mobile.matches){
     sidebar.inert=!open;
     sidebar.setAttribute('aria-hidden',String(!open));
   }else{
     sidebar.inert=false;
     sidebar.removeAttribute('aria-hidden');
   }
   if(open&&!wasOpen){
     previousFocus=document.activeElement;
     const target=sidebar.querySelector('#search')||visibleTargets()[0];
     if(target)requestAnimationFrame(()=>target.focus({preventScroll:true}));
   }else if(!open&&wasOpen&&restore){
     (menu||previousFocus)?.focus({preventScroll:true});
   }
 }
 // The original app assigned onclick during its inline setup. Keep its nav bindings, replace only the menu toggle.
 menu.onclick=null;
 menu.addEventListener('click',()=>setMenuState(!sidebar.classList.contains('open'),true));
 backdrop.addEventListener('click',()=>setMenuState(false,true));
 sidebar.addEventListener('click',event=>{
   if(event.target.closest('[data-nav],[data-business]'))setMenuState(false,false);
 });
 const syncBreakpoint=()=>{
   if(!mobile.matches){setMenuState(false,false);return}
   const open=sidebar.classList.contains('open');
   setMenuState(open,false);
 };
 if(mobile.addEventListener)mobile.addEventListener('change',syncBreakpoint);
 else mobile.addListener(syncBreakpoint);
 syncBreakpoint();
 let touchStartX=null,touchStartY=null;
 sidebar.addEventListener('touchstart',e=>{
   if(!mobile.matches||!sidebar.classList.contains('open')||e.touches.length!==1)return;
   touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;
 },{passive:true});
 sidebar.addEventListener('touchend',e=>{
   if(touchStartX===null||e.changedTouches.length!==1)return;
   const dx=e.changedTouches[0].clientX-touchStartX,dy=e.changedTouches[0].clientY-touchStartY;
   if(dx<-75&&Math.abs(dx)>Math.abs(dy)*1.5)setMenuState(false,true);
   touchStartX=touchStartY=null;
 },{passive:true});
 // Keep the chosen section/business visible in its own scrollable navigation panel.
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
 const navTargets={all:()=>document.querySelector('.intro')||document.getElementById('dashboard'),conversation:()=>document.querySelector('.sectiontop'),decision:()=>document.querySelector('.sectiontop'),task:()=>document.querySelector('.sectiontop'),evidence:()=>document.querySelector('.sectiontop'),session:()=>document.querySelector('.sectiontop')};
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
 // Modal ergonomics and accessible keyboard focus, preserving original submit/cancel handlers.
 const modalVisible=()=>Boolean(modal?.classList.contains('open'));
 const modalTargets=()=>modal?[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]')].filter(el=>el.getClientRects().length&&!el.closest('.hidden')):[];
 function syncModal(){
   if(!modal)return;
   const open=modalVisible();
   document.body.classList.toggle('modalOpen',open);
   if(open){
     if(!modalFocus)modalFocus=document.activeElement;
     if(mobile.matches&&sidebar.classList.contains('open'))setMenuState(false,false);
     const target=document.getElementById('closeModal')||modalTargets()[0];
     if(target&&(!modal.contains(document.activeElement)||document.activeElement===document.body))
       requestAnimationFrame(()=>target.focus({preventScroll:true}));
   }else if(modalFocus){
     if(modalFocus.isConnected)modalFocus.focus({preventScroll:true});
     modalFocus=null;
   }
 }
 if(modal){
   new MutationObserver(syncModal).observe(modal,{attributes:true,attributeFilter:['class']});
   syncModal();
   modal.addEventListener('click',event=>{
     if(event.target===modal)document.getElementById('closeModal')?.click();
   });
 }
 document.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
     if(modalVisible()){document.getElementById('closeModal')?.click();return}
     if(mobile.matches&&sidebar.classList.contains('open')){
       event.preventDefault();setMenuState(false,true);
     }
     return;
   }
   if(event.key!=='Tab')return;
   const container=modalVisible()?modal:(mobile.matches&&sidebar.classList.contains('open')?sidebar:null);
   if(!container)return;
   const options=container===sidebar?visibleTargets():modalTargets();
   if(!options.length)return;
   const first=options[0],last=options[options.length-1];
   if(event.shiftKey&&(document.activeElement===first||!container.contains(document.activeElement))){
     event.preventDefault();last.focus();
   }else if(!event.shiftKey&&(document.activeElement===last||!container.contains(document.activeElement))){
     event.preventDefault();first.focus();
   }
 });
 // Prevent a hidden drawer or modal from trapping scroll after browser back / page restoration.
 window.addEventListener('pageshow',()=>{
   if(!mobile.matches)setMenuState(false,false);
   syncModal();
 });
})();
`;
