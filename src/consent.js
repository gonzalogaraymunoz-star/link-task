
export const consentScript = String.raw`
const $=id=>document.getElementById(id);
const form=$('oauth-consent'), message=$('message');
const approve=$('approve'), deny=$('deny'), details=$('supabase-config');
const endpoint=details.dataset.url, apikey=details.dataset.key;
function status(x){message.textContent=x;}
async function send(decision){
 approve.disabled=true; deny.disabled=true; status('Procesando…');
 try{
  let jwt='';
  if(decision==='approve'){
   const email=$('email').value.trim(),password=$('password').value;
   if(!email||!password)throw Error('Introduce tu correo y contraseña LINK.');
   const response=await fetch(endpoint+'/auth/v1/token?grant_type=password',{
     method:'POST',headers:{apikey,'content-type':'application/json'},body:JSON.stringify({email,password})
   });
   $('password').value='';
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.access_token)throw Error(data.error_description||'No se pudo verificar tu sesión.');
   jwt=data.access_token;
  }
  const scope=[...form.querySelectorAll('input[name=\"scope\"]:checked')].map(x=>x.value);
  const res=await fetch('/authorize',{
   method:'POST',credentials:'same-origin',
   headers:{'content-type':'application/json',...(jwt?{authorization:'Bearer '+jwt}:{})},
   body:JSON.stringify({decision,handle:form.elements.handle.value,scope})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.redirect)throw Error(data.error||'No se pudo autorizar.');
  window.location.assign(data.redirect);
 }catch(e){status(e.message);approve.disabled=false;deny.disabled=false;}
}
approve.addEventListener('click',e=>{e.preventDefault();send('approve')});
deny.addEventListener('click',e=>{e.preventDefault();send('deny')});
`;
