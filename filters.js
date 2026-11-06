/* Advanced task filters for Work / Kanban and Weekly view.
   All advanced filter presets are stored in the same account state as tasks. */
(function(){
'use strict';
const $f=s=>document.querySelector(s);
const blank=()=>({statuses:[],priorities:[],types:[],projects:[],projectMode:'all',favorite:'all',deadline:'all',dueFrom:'',dueTo:'',plan:'all',planFrom:'',planTo:'',activity:'all',estimateMin:'',estimateMax:'',remainingMin:'',remainingMax:'',workedMin:'',workedMax:'',crm:'all',kaiten:'all',documents:'all',comments:'all',checklist:'all',flags:{},sort:'default'});
const keys=['statuses','priorities','types','projects'];
function normalized(input){let out={...blank(),...(input||{})};for(const key of keys)out[key]=Array.isArray(out[key])?out[key]:[];out.flags=out.flags&&typeof out.flags==='object'?out.flags:{};return out}
state.taskFilterAdvanced=normalized(state.taskFilterAdvanced);
state.taskFilterPresets=Array.isArray(state.taskFilterPresets)?state.taskFilterPresets:[];
let f=state.taskFilterAdvanced,opened=false;
function ensureCurrent(){if(state.taskFilterAdvanced!==f){f=normalized(state.taskFilterAdvanced);state.taskFilterAdvanced=f}}
const tday=()=>iso(),isodate=d=>iso(d),weekStart=()=>monday(tday()),weekEnd=()=>shift(weekStart(),6);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function number(value){return value===''||value===null||value===undefined?null:Number(value)}
function inRange(value,min,max){const a=number(min),b=number(max);return (a===null||value>=a)&&(b===null||value<=b)}
function anyMatch(t){ensureCurrent();
 if(f.statuses.length&&!f.statuses.includes(t.status))return false;
 if(f.priorities.length&&!f.priorities.includes(t.priority))return false;
 if(f.types.length&&!f.types.includes(t.type))return false;
 if(f.projectMode==='none'&&t.project)return false;
 if(f.projectMode==='some'&&!t.project)return false;
 if(f.projects.length&&!f.projects.includes(t.project||''))return false;
 if(f.favorite!=='all'&&t.favorite!==(f.favorite==='yes'))return false;
 const today=tday(),start=weekStart(),end=weekEnd(),overdue=!!(t.deadline&&t.deadline<today&&t.status!=='done');
 const day=t.deadline||'';
 if(f.deadline==='overdue'&&!overdue)return false;
 if(f.deadline==='today'&&day!==today)return false;
 if(f.deadline==='tomorrow'&&day!==shift(today,1))return false;
 if(f.deadline==='week'&&!(day>=start&&day<=end))return false;
 if(f.deadline==='next7'&&!(day>=today&&day<=shift(today,7)))return false;
 if(f.deadline==='none'&&day)return false;
 if(f.deadline==='custom'&&(!day||(f.dueFrom&&day<f.dueFrom)||(f.dueTo&&day>f.dueTo)))return false;
 const scheduled=occurrences().some(o=>o.taskId===t.id&&(f.plan==='today'?o.day===today:f.plan==='week'?o.day>=start&&o.day<=end:f.plan==='custom'&&(!f.planFrom||o.day>=f.planFrom)&&(!f.planTo||o.day<=f.planTo)));
 if(['today','week','custom'].includes(f.plan)&&!scheduled)return false;
 if(f.plan==='none'&&occurrences().some(o=>o.taskId===t.id))return false;
 const workedToday=timeInRange(t.id,today,today),workedWeek=timeInRange(t.id,start,end),workedTotal=elapsed(t.id);
 if(f.activity==='today5'&&workedToday<300)return false;
 if(f.activity==='week5'&&workedWeek<300)return false;
 if(f.activity==='today'&&workedToday<=0)return false;
 if(f.activity==='week'&&workedWeek<=0)return false;
 if(f.activity==='never'&&workedTotal>0)return false;
 if(f.activity==='noToday'&&workedToday>0)return false;
 if(f.activity==='running'&&state.timer?.taskId!==t.id)return false;
 if(!inRange(Number(t.estimate)||0,f.estimateMin,f.estimateMax))return false;
 if(!inRange(effectiveRemaining(t),f.remainingMin,f.remainingMax))return false;
 if(!inRange(workedTotal/3600,f.workedMin,f.workedMax))return false;
 const linkTests={crm:!!t.crm,kaiten:!!t.kaiten,documents:!!t.documents?.length,comments:!!t.comments?.length};
 for(const [key,value] of Object.entries(linkTests)){if(f[key]==='yes'&&!value)return false;if(f[key]==='no'&&value)return false}
 const check=t.checklist||[],done=check.filter(x=>x.done).length;
 if(f.checklist==='none'&&check.length)return false;
 if(f.checklist==='allDone'&&(!check.length||done!==check.length))return false;
 if(f.checklist==='unfinished'&&(!check.length||done===check.length))return false;
 if(f.checklist==='started'&&(!done||done===check.length))return false;
 for(const [key,value] of Object.entries(f.flags)){if(value==='yes'&&!t.flags?.[key])return false;if(value==='no'&&!!t.flags?.[key])return false}
 return true;
}
window.taskAdvancedMatch=anyMatch;
const priorityOrder={high:0,medium:1,low:2};
window.taskFilterSort=(a,b)=>{ensureCurrent();switch(f.sort){
 case 'dueAsc':return (a.deadline||'9999').localeCompare(b.deadline||'9999');
 case 'dueDesc':return (b.deadline||'0000').localeCompare(a.deadline||'0000');
 case 'remainingDesc':return effectiveRemaining(b)-effectiveRemaining(a);
 case 'remainingAsc':return effectiveRemaining(a)-effectiveRemaining(b);
 case 'spentDesc':return elapsed(b.id)-elapsed(a.id);
 case 'priority':return (priorityOrder[a.priority]??3)-(priorityOrder[b.priority]??3);
 case 'project':return (a.project||'').localeCompare(b.project||'','ru');
 default:return 0;
}};
function nonDefault(){const d=blank();return Object.keys(d).filter(k=>{if(k==='sort')return f.sort!==d.sort;if(keys.includes(k))return f[k].length>0;if(k==='flags')return Object.values(f.flags).some(x=>x!=='all');return f[k]!==d[k]})}
function summary(){const n=nonDefault().length;const basic=(filter!=='all'?1:0)+(query?1:0)+(deadlineBefore?1:0);return n+basic}
function pill(label,value,field){return '<span class="filter-pill">'+esc(label)+' <b>'+esc(value)+'</b>'+(field?'<button type="button" data-remove-advanced="'+esc(field)+'" title="Убрать фильтр">×</button>':'')+'</span>'}
function updateSummary(){ensureCurrent();
 const count=summary(),badge=$f('#advancedFilterCount');badge.textContent=count?String(count):'';
 badge.classList.toggle('hidden',!count);
 $f('#advancedFilterButton').classList.toggle('has-filters',!!count);
 $f('#resetTaskFilters').classList.toggle('hidden',!count);
 const found=state.tasks.filter(t=>[t.title,t.description,t.type,t.shortResult,...(t.comments||[]).map(c=>c.text),t.kaiten,t.crm,...(t.documents||[]).map(d=>d.url+' '+d.label)].join(' ').toLowerCase().includes(query)&&(!deadlineBefore||(t.deadline&&t.deadline<=deadlineBefore))&&(filter==='all'||filter==='favorite'&&t.favorite||filter==='overdue'&&t.deadline&&t.deadline<tday()&&t.status!=='done')&&anyMatch(t)).length;
 $f('#advancedFilterMatches').textContent='Найдено задач: '+found;
 const chips=[];
 if(query)chips.push(pill('Поиск',query,null));
 if(filter!=='all')chips.push(pill('Быстрый фильтр',filter==='favorite'?'Избранное':'Просрочено',null));
 if(deadlineBefore)chips.push(pill('Дедлайн до',deadlineBefore,null));
 for(const key of nonDefault())chips.push(pill(filterLabels[key]||key,keys.includes(key)?f[key].join(', '):key==='flags'?Object.entries(f.flags).filter(([,v])=>v!=='all').length+' отметок':f[key],key));
 const row=$f('#filterActiveRow');row.innerHTML=(chips.length?chips.join(''):'<span class="filter-unset">Фильтры не выбраны</span>')+'<span class="filter-found">Найдено: <b>'+found+'</b></span>';
}
window.refreshTaskFilters=updateSummary;
const filterLabels={statuses:'Статус',priorities:'Приоритет',types:'Тип работы',projects:'Проект',projectMode:'Наличие проекта',favorite:'Избранное',deadline:'Дедлайн',dueFrom:'Срок с',dueTo:'Срок до',plan:'План',planFrom:'План с',planTo:'План до',activity:'Активность',estimateMin:'План от',estimateMax:'План до',remainingMin:'Остаток от',remainingMax:'Остаток до',workedMin:'Факт от',workedMax:'Факт до',crm:'CRM',kaiten:'Kaiten',documents:'Документы',comments:'Комментарии',checklist:'Чек-лист',flags:'Отметки CRM',sort:'Сортировка'};
const opts=(list,value)=>list.map(([k,label])=>'<option value="'+esc(k)+'" '+(k===value?'selected':'')+'>'+esc(label)+'</option>').join('');
function select(name,title,choices){return '<label class="filter-field">'+title+'<select data-adv="'+name+'">'+opts(choices,f[name])+'</select></label>'}
function numberField(name,title){return '<label class="filter-field">'+title+'<input data-adv="'+name+'" type="number" min="0" step="0.25" value="'+esc(f[name])+'" placeholder="Любое"></label>'}
function dateField(name,title){return '<label class="filter-field">'+title+'<input data-adv="'+name+'" type="date" value="'+esc(f[name])+'"></label>'}
function facets(name,title,items){return '<fieldset class="filter-facet"><legend>'+title+'</legend><div class="facet-options">'+items.map(([id,label])=>'<label class="facet-checkbox"><input data-adv-set="'+name+'" type="checkbox" value="'+esc(id)+'" '+(f[name].includes(id)?'checked':'')+'><span>'+esc(label)+'</span></label>').join('')+'</div></fieldset>'}
function tri(name,title){return select(name,title,[['all','Не важно'],['yes','Есть'],['no','Нет']])}
function section(title,description,body,open=false){return '<details class="advanced-filter-section" '+(open?'open':'')+'><summary><strong>'+title+'</strong><small>'+description+'</small></summary><div class="advanced-filter-section-body">'+body+'</div></details>'}
function renderPanel(){ensureCurrent();
 const statuses=STATUSES.map(([k,v])=>[k,v]);
 const priorities=[['high','Высокий'],['medium','Средний'],['low','Низкий']];
 const types=Object.keys(state.types).sort((a,b)=>a.localeCompare(b,'ru')).map(x=>[x,x]);
 const projects=projectList().sort((a,b)=>a.localeCompare(b,'ru')).map(x=>[x,x]);
 let h='<div class="filter-preset-bar"><label>Сохраненные наборы<select id="filterPresetSelect"><option value="">Выбрать набор…</option>'+state.taskFilterPresets.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</select></label><button type="button" id="filterSavePreset">＋ Сохранить набор</button><button type="button" id="filterDeletePreset">Удалить набор</button></div>';
 h+=section('01 · Основное','Проект, тип, статус и приоритет',
 facets('statuses','Статусы',statuses)+facets('priorities','Приоритеты',priorities)+facets('types','Типы работы',types)+facets('projects','Проекты',projects)+select('projectMode','Проект заполнен',[['all','Любой'],['some','Есть проект'],['none','Без проекта']])+select('favorite','Избранное',[['all','Любое'],['yes','Только избранные'],['no','Не избранные']]),true);
 h+=section('02 · Даты и сроки','Дедлайны и дни планирования',
 '<div class="advanced-filter-grid">'+select('deadline','Дедлайн',[['all','Любой'],['overdue','Просрочен'],['today','Сегодня'],['tomorrow','Завтра'],['week','На этой неделе'],['next7','В ближайшие 7 дней'],['none','Без дедлайна'],['custom','Свой диапазон']])+dateField('dueFrom','Дедлайн с')+dateField('dueTo','Дедлайн по')+select('plan','В календаре',[['all','Любой'],['today','Запланировано сегодня'],['week','На этой неделе'],['custom','Свой диапазон'],['none','Без даты в плане']])+dateField('planFrom','Запланировано с')+dateField('planTo','Запланировано по')+'</div>');
 h+=section('03 · Загрузка и трудозатраты','Сколько уже работала и сколько осталось',
 '<div class="advanced-filter-grid">'+select('activity','Фактическая активность',[['all','Любая'],['today5','Сегодня ≥ 5 мин'],['week5','Неделя ≥ 5 мин'],['today','Любая работа сегодня'],['week','Любая работа за неделю'],['noToday','Сегодня без трудозатрат'],['never','Без трудозатрат вообще'],['running','Таймер запущен']])+numberField('remainingMin','Остаток от, ч')+numberField('remainingMax','Остаток до, ч')+numberField('workedMin','Факт от, ч')+numberField('workedMax','Факт до, ч')+numberField('estimateMin','План от, ч')+numberField('estimateMax','План до, ч')+'</div>');
 h+=section('04 · Содержимое и CRM','Ссылки, чек-листы, записи, отметки',
 '<div class="advanced-filter-grid">'+tri('crm','Ссылка CRM')+tri('kaiten','Ссылка Kaiten')+tri('documents','Документы / ссылки')+tri('comments','Комментарии')+select('checklist','Чек-лист',[['all','Любой'],['none','Нет чек-листа'],['allDone','Полностью выполнен'],['unfinished','Есть невыполненные'],['started','Выполнен частично']])+'</div><fieldset class="filter-facet"><legend>Отметки CRM</legend><div class="advanced-flag-grid">'+FLAGS.map(([id,label])=>'<label class="filter-field">'+esc(label)+'<select data-adv-flag="'+esc(id)+'">'+opts([['all','Любая'],['yes','Да'],['no','Нет']],f.flags[id]||'all')+'</select></label>').join('')+'</div></fieldset>');
 h+=section('05 · Сортировка','Как показывать карточки',
 select('sort','Сортировать внутри колонок',[['default','Как сейчас'],['dueAsc','Сначала ближайший дедлайн'],['dueDesc','Сначала дальний дедлайн'],['priority','Сначала высокий приоритет'],['remainingDesc','Больше всего оставшихся часов'],['remainingAsc','Меньше всего оставшихся часов'],['spentDesc','Больше всего отработано'],['project','По проекту А–Я']]));
 $f('#advancedFilterBody').innerHTML=h;
}
function apply(){state.taskFilterAdvanced=f;persist();render();updateSummary()}
function close(){opened=false;$f('#advancedFilterPanel').classList.add('hidden');$f('#advancedFilterButton').setAttribute('aria-expanded','false');$f('#advancedFilterBackdrop')?.classList.add('hidden')}
function open(){opened=true;renderPanel();$f('#advancedFilterPanel').classList.remove('hidden');$f('#advancedFilterButton').setAttribute('aria-expanded','true');$f('#advancedFilterBackdrop')?.classList.remove('hidden');updateSummary()}
function reset(){const clean=blank();for(const key of Object.keys(f))delete f[key];Object.assign(f,clean);state.taskFilterAdvanced=f;filter='all';query='';deadlineBefore='';$f('#search').value='';$f('#deadlineDate').value='';persist();render();if(opened)renderPanel();updateSummary()}
// Capture the earliest click on the filter button, independent of nested labels.
document.addEventListener('click',e=>{
 const trigger=e.target.closest('#advancedFilterButton');if(!trigger)return;
 e.preventDefault();e.stopPropagation();
 const isVisible=!$f('#advancedFilterPanel').classList.contains('hidden');
 if(isVisible)close();else open();
},true);
$f('#advancedFilterClose').addEventListener('click',close);
$f('#advancedFilterDone').addEventListener('click',close);
$f('#advancedFilterReset').addEventListener('click',reset);
$f('#resetTaskFilters').addEventListener('click',reset);
$f('#advancedFilterPanel').addEventListener('change',e=>{
 const el=e.target;
 if(el.dataset.advSet){const name=el.dataset.advSet;f[name]=el.checked?[...new Set([...f[name],el.value])]:f[name].filter(x=>x!==el.value);apply();return}
 if(el.dataset.advFlag){f.flags[el.dataset.advFlag]=el.value;apply();return}
 if(el.dataset.adv){f[el.dataset.adv]=el.value;apply()}
});
$f('#advancedFilterPanel').addEventListener('click',e=>{
 if(e.target.id==='filterSavePreset'){
  const name=prompt('Название набора фильтров (например, «Мои задачи на сегодня»):');if(!name?.trim())return;
  state.taskFilterPresets.push({id:uid(),name:name.trim().slice(0,60),filters:structuredClone(f),basic:{filter,query,deadlineBefore}});persist();renderPanel();toast('Набор фильтров сохранен');return}
 if(e.target.id==='filterDeletePreset'){
  const id=$f('#filterPresetSelect')?.value;if(!id)return;
  if(!confirm('Удалить сохраненный набор?'))return;state.taskFilterPresets=state.taskFilterPresets.filter(x=>x.id!==id);persist();renderPanel();return}
});
$f('#advancedFilterPanel').addEventListener('change',e=>{
 if(e.target.id!=='filterPresetSelect'||!e.target.value)return;
 const preset=state.taskFilterPresets.find(x=>x.id===e.target.value);if(!preset)return;
 f=normalized(structuredClone(preset.filters));filter=preset.basic?.filter||'all';query=preset.basic?.query||'';deadlineBefore=preset.basic?.deadlineBefore||'';
 $f('#search').value=query;$f('#deadlineDate').value=deadlineBefore;apply();renderPanel();toast('Набор применен: '+preset.name);
});
$f('#filterActiveRow').addEventListener('click',e=>{
 const button=e.target.closest('[data-remove-advanced]');if(!button)return;
 const field=button.dataset.removeAdvanced;
 if(keys.includes(field))f[field]=[];
 else if(field==='flags')f.flags={};
 else f[field]=blank()[field];
 apply();if(opened)renderPanel();
});
$f('#advancedFilterBackdrop')?.addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)close()});
updateSummary();
})();