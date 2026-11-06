/* Пространства: переключатель и контекстное меню */
(function(){
'use strict';
const spaces={
 work:{title:'Работа',icon:'▣',label:'РАБОТА',defaultView:'board',menu:[['board','▦','Канбан'],['week','▤','Задачи на неделю'],['admin','⚙','Администрирование']]},
 food:{title:'Вкусно и просто',icon:'◈',label:'ПИТАНИЕ',defaultView:'menu',menu:[['menu','▦','Меню на неделю'],['recipes','♡','Мои рецепты'],['shopping','▤','Список покупок']]},
 lunaria:{title:'Lunaria',icon:'✦',label:'МЕДИАТЕКА',defaultView:'library',menu:[['library','▦','Моя медиатека'],['recommend','✧','Что сегодня?']]},
 home:{title:'Наш дом',icon:'⌂',label:'ДОМАШНИЕ ДЕЛА',defaultView:'today',menu:[['today','☼','Сегодня'],['calendar','▤','Календарь'],['tasks','☑','Все дела']]}
};
const byView=v=>['board','week','admin'].includes(v)?'work':spaces[v]?v:'work';
const $=selector=>document.querySelector(selector);
const nav=$('#spaceNav'),menu=$('#spacePickerMenu'),picker=$('#spacePicker');
const selected={work:state.view==='week'?'week':state.view==='admin'?'admin':'board'};
let lastWorkspace='';
function sync(v=state.view){
 const space=byView(v),cfg=spaces[space];
 $('#spaceCurrentIcon').textContent=cfg.icon;
 $('#spaceCurrentLabel').textContent=cfg.title;
 $('#spaceSidebarTitle').textContent=cfg.label;
 $('#quickActions').classList.toggle('hidden',space!=='work');
 $('#quickActionsLine').classList.toggle('hidden',space!=='work');
 $('#spaceDemoArea').classList.toggle('hidden',space==='work');
 const active=space==='work'?v:(window.megaGetSection?.(space)||cfg.defaultView);
 if(space==='work')selected.work=active;
 const key=space+':'+active;
 if(lastWorkspace!==key){
  nav.innerHTML=cfg.menu.map(([id,ic,label])=>'<button type="button" class="nav-item '+(id===active?'active':'')+'" data-space-nav="'+space+':'+id+'"><span>'+ic+'</span> '+label+'</button>').join('');
  lastWorkspace=key;
 }else{
  nav.querySelectorAll('[data-space-nav]').forEach(b=>b.classList.toggle('active',b.dataset.spaceNav===key));
 }
 menu.querySelectorAll('[data-select-space]').forEach(b=>b.classList.toggle('selected',b.dataset.selectSpace===space));
 if(space!=='work'){
  const labels=Object.fromEntries(cfg.menu.map(([id,,label])=>[id,label]));
  $('#pageTitle').innerHTML=labels[active]+' <span class="page-dot">.</span>';
  $('#pageEyebrow').textContent=cfg.title.toUpperCase()+' · МОЕ ПРОСТРАНСТВО';
 }else $('#pageEyebrow').textContent='МОЕ РАБОЧЕЕ ПРОСТРАНСТВО';
}
window.syncWorkspaceNav=sync;
function change(space,section){
 const cfg=spaces[space];if(!cfg)return;
 close();
 if(space==='work'){
  state.view=section||selected.work||cfg.defaultView;
  if(!cfg.menu.some(([id])=>id===state.view))state.view='board';
 }else{
  state.view=space;
  window.megaSelectSection?.(space,section||window.megaGetSection?.(space)||cfg.defaultView);
 }
 persist();render();
}
function close(){menu.classList.add('hidden');picker.setAttribute('aria-expanded','false')}
picker.addEventListener('click',e=>{e.stopPropagation();const willOpen=menu.classList.contains('hidden');menu.classList.toggle('hidden',!willOpen);picker.setAttribute('aria-expanded',String(willOpen))});
menu.addEventListener('click',e=>{const button=e.target.closest('[data-select-space]');if(button)change(button.dataset.selectSpace)});
nav.addEventListener('click',e=>{const button=e.target.closest('[data-space-nav]');if(!button)return;const [space,section]=button.dataset.spaceNav.split(':');change(space,section)});
document.addEventListener('click',e=>{if(!e.target.closest('.space-selector'))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
$('#loadDemoBtn').addEventListener('click',()=>{
 const space=byView(state.view);
 if(space==='work'||!window.megaInstallDemo)return;
 if(!confirm('Добавить несколько примеров в «'+spaces[space].title+'»? Твои существующие записи сохранятся.'))return;
 const n=window.megaInstallDemo(space);
 if(n){toast('Добавлены примеры: '+n+' 💙');sync()}else toast('Примеры уже добавлены');
});
sync();
// app.js initializes earlier than mega.js; paint the last active personal page on reload.
if(['food','lunaria','home'].includes(state.view) && window.renderMega)window.renderMega();
})();
