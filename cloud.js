'use strict';
// Cloud layer; integrates with the existing UI while retaining a local backup.
(function(){
 const cfg=window.RHYTHM_CONFIG||{};
 const configured=!!(cfg.supabaseUrl&&cfg.supabasePublishableKey);
 const authLayer=document.querySelector('#authLayer');
 const authForm=document.querySelector('#authForm');
 const authEmail=document.querySelector('#authEmail');
 const authPassword=document.querySelector('#authPassword');
 const authMessage=document.querySelector('#authMessage');
 const userBadge=document.querySelector('#userBadge');
 const signOut=document.querySelector('#signOut');
 const cloudIndicator=document.querySelector('#cloudIndicator');
 const importBtn=document.querySelector('#importLocal');
 let client=null, signedUser=null, saveTimer=null, generation=0, synced=false, busy=false;
 const note=(s,error=false)=>{authMessage.textContent=s;authMessage.style.color=error?'#c45169':'#6784b7'};
 const cloudNote=s=>{cloudIndicator.textContent=s};
 function setAuthenticated(user){signedUser=user;authLayer.classList.toggle('hidden',!!user);document.querySelector('.app-shell').classList.toggle('locked',!user);userBadge.classList.toggle('hidden',!user);signOut.classList.toggle('hidden',!user);userBadge.textContent=user?.email||'';}
 function cleanState(remote){
  const v=remote&&typeof remote==='object'?remote:{};
  const normalized={...demo(),...v, tasks:(v.tasks||[]).map(normalizeTask), logs:Array.isArray(v.logs)?v.logs:[], timer:null};
  state=normalized;migrateState();render();
 }
 async function loadForUser(user){
   const myGeneration=++generation; synced=false; cloudNote('Синхронизация…');
   const {data,error}=await client.from('rhythm_state').select('payload').eq('user_id',user.id).maybeSingle();
   if(myGeneration!==generation)return;
   if(error){cloudNote('Ошибка загрузки: '+error.message);return}
   if(data?.payload && Object.keys(data.payload).length){cleanState(data.payload)}
   else{cleanState({tasks:[],logs:[],occurrences:[],projects:[],types:Object.fromEntries(DEFAULT_TYPES),dailyDone:{}})}
   synced=true;cloudNote('☁ Сохранено в облаке');
   // Only optional user-initiated import; never silently overwrite cloud data.
   importBtn.classList.remove('hidden');
 }
 async function writeCloud(){
   if(!signedUser||!synced||busy)return;
   busy=true;
   const user=signedUser; const copy=structuredClone(state); copy.timer=null;
   cloudNote('Сохранение…');
   try{
    const {error}=await client.from('rhythm_state').upsert({user_id:user.id,payload:copy,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error)throw error;
    cloudNote('☁ Сохранено в облаке');
   }catch(e){cloudNote('Не сохранено: '+e.message);}
   finally{busy=false;if(window.cloudPending){window.cloudPending=false;requestSave()}}
 }
 function requestSave(){if(!signedUser||!synced)return;if(busy){window.cloudPending=true;return}clearTimeout(saveTimer);saveTimer=setTimeout(writeCloud,700)}
 window.rhythmCloudSave=requestSave;
 if(!configured){note('Нужно подключить новый Supabase-проект. Инструкция в README.md.',true);return}
 if(!window.supabase?.createClient){note('Не удалось загрузить библиотеку Supabase. Проверь подключение к интернету.',true);return}
 client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 authForm.addEventListener('submit',async e=>{
  e.preventDefault();const email=authEmail.value.trim(),password=authPassword.value;
  if(password.length<6){note('Пароль должен содержать минимум 6 символов.',true);return}
  const mode=e.submitter?.value||'signin';note('Проверяем…');
  const result=mode==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin}}):await client.auth.signInWithPassword({email,password});
  if(result.error){note(result.error.message,true);return}
  if(mode==='signup'&&!result.data.session)note('Подтверди email по ссылке из письма.');
  else note('Готово!');
 });
 signOut.addEventListener('click',async()=>{
  if(saveTimer){clearTimeout(saveTimer);await writeCloud()}
  ++generation;synced=false; await client.auth.signOut();
  cleanState({tasks:[],logs:[],occurrences:[],projects:[]});setAuthenticated(null);cloudNote('Вход не выполнен');importBtn.classList.add('hidden');
 });
 importBtn.addEventListener('click',()=>{
   if(!signedUser)return;
   const raw=localStorage.getItem('akam-my-rhythm-v2')||localStorage.getItem('akam-my-rhythm-v1');
   if(!raw){alert('На этом устройстве нет данных из локальной версии. Можно восстановить сохраненный JSON через резервную копию.');return}
   if(!confirm('Импортировать задачи из локальной версии? Облачные данные будут заменены. Сначала сделай резервную копию!'))return;
   try{const backup=JSON.parse(raw);cleanState(backup);requestSave();}catch{alert('Локальные данные не удалось прочитать')}
 });
 client.auth.onAuthStateChange((event,session)=>{
    setTimeout(()=>{
      const user=session?.user||null;
      if(user){if(signedUser?.id===user.id)return;setAuthenticated(user);loadForUser(user)}
      else{++generation;synced=false;setAuthenticated(null)}
    },0)
 });
 client.auth.getSession().then(({data})=>{if(!data.session?.user)setAuthenticated(null)});
})();