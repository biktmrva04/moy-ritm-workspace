/* Weekly timeblocking for My Rhythm. Task blocks are movable/resizable; imported .ics is read-only. */
(function(){
'use strict';
const $c=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const H0=8,H1=22,H=64,GRID=(H1-H0)*H,step=15;
let week=monday(iso()),chosen='',showTasks=true,showMeetings=true,gesture=null,syncActive=false,lastSync=0;
state.calendarFeeds=Array.isArray(state.calendarFeeds)?state.calendarFeeds:[];
const mins=s=>{let m=/^(\d\d?):(\d\d)$/.exec(s||'');return m?+m[1]*60+(+m[2]):null};
const time=n=>pad(Math.floor(n/60))+':'+pad(n%60),snap=n=>Math.round(n/step)*step,clip=(n,a,b)=>Math.min(b,Math.max(a,n));
const dates=()=>Array.from({length:7},(_,i)=>shift(week,i));
function ensureScheduledTimes(){
 let changed=false;
 for(const d of [...new Set(occurrences().map(o=>o.day).filter(Boolean))]){
  const items=occurrences().filter(o=>o.day===d&&task(o.taskId));
  const reserved=items.filter(o=>mins(o.start)!==null&&mins(o.end)>mins(o.start)).map(o=>[mins(o.start),mins(o.end)]);
  const meetingReserved=(state.calendarEvents||[]).filter(e=>e.start&&iso(new Date(e.start))===d).map(e=>{let a=new Date(e.start),b=new Date(e.end);return [a.getHours()*60+a.getMinutes(),b.getHours()*60+b.getMinutes()]});
  for(const occ of items.filter(o=>mins(o.start)===null||mins(o.end)===null||mins(o.end)<=mins(o.start))){
   const t=task(occ.taskId),copies=Math.max(1,occurrences().filter(x=>x.taskId===t.id).length);
   const duration=clip(snap((effectiveRemaining(t)||1)*60/copies),30,120);
   let start=9*60;const overlaps=(a,b)=>[...reserved,...meetingReserved].some(([x,y])=>a<y&&b>x);
   while(start+duration<=H1*60&&overlaps(start,start+duration))start+=15;
   start=clip(start,H0*60,H1*60-duration);
   occ.start=time(start);occ.end=time(start+duration);reserved.push([start,start+duration]);changed=true;
  }
 }
 if(changed)persist();
}
const taskBlocks=day=>occurrences().filter(o=>o.day===day&&o.start&&o.end&&mins(o.end)>mins(o.start)&&task(o.taskId)).map(o=>({id:o.id,start:mins(o.start),end:mins(o.end),title:task(o.taskId).title,project:task(o.taskId).project,summary:task(o.taskId).shortResult||'',taskId:o.taskId,kind:'task'}));
const meetingBlocks=day=>(state.calendarEvents||[]).filter(e=>{if(!e.start||!e.end)return false;return iso(new Date(e.start))===day}).map(e=>{const a=new Date(e.start),b=new Date(e.end);return {id:e.id,start:a.getHours()*60+a.getMinutes(),end:a.getHours()*60+a.getMinutes()+Math.round((b-a)/60000),title:e.title,source:e.source||'Календарь',kind:'meeting'}}).filter(e=>e.end>e.start);
function layout(blocks){
 blocks.sort((a,b)=>a.start-b.start||b.end-a.end);
 for(const block of blocks){const intersect=blocks.filter(x=>x.start<block.end&&block.start<x.end).sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));block.col=intersect.findIndex(x=>x.id===block.id);block.count=intersect.length}
 return blocks;
}
function blockHTML(b,day){
 const a=clip(b.start,H0*60,H1*60),z=clip(b.end,H0*60,H1*60);if(z<=a)return '';
 const left=b.col/b.count*100,width=100/b.count;
 const colors=['#d7e5ff','#d6f2df','#f7dbed','#e8ddff','#ffedcf'];
 const n=[...(b.source||'')].reduce((x,ch)=>x+ch.charCodeAt(0),0)%colors.length;
 const paint=b.kind==='meeting'?';background:'+colors[n]:'';
 const duration=z-a,compact=duration<=45?' cal-compact':'';
 const actions=b.kind==='task'?'<div class="cal-item-actions"><button type="button" data-cal-copy="'+esc(b.taskId)+'" aria-label="Копировать задачу" title="Копировать">⧉</button><button type="button" data-cal-continue="'+esc(b.id)+'" aria-label="Продолжить задачу" title="Продолжить">↪</button></div>':'';
 return '<article class="cal-block '+(b.kind==='task'?'cal-work':'cal-call')+compact+'" data-cal-block="'+esc(b.id)+'" data-cal-kind="'+b.kind+'" data-cal-day="'+day+'" style="top:'+((a-H0*60)*H/60)+'px;height:'+Math.max(25,(z-a)*H/60-2)+'px;left:calc('+left+'% + 3px);width:calc('+width+'% - 6px)'+paint+'" title="'+esc(b.title)+'"><div class="cal-block-time">◷ '+time(b.start)+'–'+time(b.end)+'</div><div class="cal-block-title">'+esc(b.title)+'</div>'+(b.kind==='task'?'<div class="cal-block-summary">'+esc(b.summary||'Нет краткого итога')+'</div>':'')+actions+(b.kind==='task'?'<i data-cal-resize="'+esc(b.id)+'" title="Изменить длительность">⋮⋮</i>':'')+'</article>';
}

function render(){
 if(state.view!=='calendar')return;
 if(!Array.isArray(state.calendarEvents))state.calendarEvents=[];
 ensureScheduledTimes();
 const ddays=dates(),view=$c('#calendarView');if(!view)return;
 view.innerHTML='<div class="cal-intro"><div><div class="cal-overline">✦ PLAN YOUR MAGIC</div><h2>Мой календарь <span>✿</span></h2><p>Для созвонов, задач и времени на себя</p></div><div class="cal-arrows"><button data-cal-page="-1">←</button><button data-cal-page="0">Сегодня</button><button data-cal-page="1">→</button><b>'+date(ddays[0]).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})+' — '+date(ddays[6]).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})+'</b></div></div>'+
 '<div class="cal-controls"><label class="cal-pick">Задача<select id="calTaskChoice"><option value="">Выбери задачу…</option>'+state.tasks.map(t=>'<option value="'+esc(t.id)+'" '+(chosen===t.id?'selected':'')+'>'+esc(t.title)+'</option>').join('')+'</select></label><button id="calPlace" class="cal-primary">＋ Запланировать</button><label class="cal-check"><input type="checkbox" id="calShowTasks" '+(showTasks?'checked':'')+'> Задачи</label><label class="cal-check"><input type="checkbox" id="calShowMeetings" '+(showMeetings?'checked':'')+'> Созвоны</label><label class="cal-import">↥ Импорт .ics<input type="file" id="calIcs" accept=".ics,text/calendar" hidden></label><button id="calClear">Очистить импорт</button></div>'+
 '<div class="cal-feed-panel"><div class="cal-feed-heading"><strong>↻ Автосинхронизация с Яндекс Календарем</strong><span id="calSyncStatus">'+(state.calendarFeeds.length?'Обновление каждые 15 минут, пока сайт открыт':'Подключи ссылку iCal')+'</span></div><div class="cal-feed-input"><input id="calFeedUrl" type="url" autocomplete="off" spellcheck="false" placeholder="https://calendar.yandex.ru/… (ссылка iCal)"><button id="calFeedAdd" type="button">＋ Подключить</button><button id="calSyncNow" type="button">↻ Обновить сейчас</button></div><div class="cal-feed-list">'+state.calendarFeeds.map(x=>'<span class="cal-feed-chip"><b>'+esc(x.name||'Яндекс Календарь')+'</b><button type="button" data-cal-feed-remove="'+esc(x.id)+'" title="Отключить календарь">×</button></span>').join('')+'</div><small>Укажи ссылку экспорта iCal из настроек Яндекс Календаря. Пароль не нужен. События автоматически обновляются при открытии сайта и далее каждые 15 минут.</small></div>'+
 '<div class="cal-info">Перетаскивай цветные блоки по сетке, чтобы менять день и время. Тяни нижний край для изменения длительности. Шаг — 15 минут. Созвоны из Яндекса доступны для просмотра.</div>'+
 '<div class="cal-scroll"><div class="cal-grid"><div class="cal-time-title">GMT '+(new Date().getTimezoneOffset()<=0?'+':'')+(-new Date().getTimezoneOffset()/60)+'</div>'+
 ddays.map((day,i)=>'<div class="cal-day-title '+(day===iso()?'today':'')+'"><small>'+['пн','вт','ср','чт','пт','сб','вс'][i]+'</small><strong>'+date(day).getDate()+'</strong></div>').join('')+
 '<div class="cal-time-axis">'+Array.from({length:H1-H0+1},(_,i)=>'<span style="top:'+(i*H)+'px">'+pad(H0+i)+':00</span>').join('')+'</div>'+
 ddays.map(day=>'<div class="cal-day '+(day===iso()?'today':'')+'" data-cal-date="'+day+'" style="height:'+GRID+'px">'+Array.from({length:H1-H0},(_,i)=>'<div class="cal-hour" style="top:'+(i*H)+'px"></div>').join('')+
 layout([...(showTasks?taskBlocks(day):[]),...(showMeetings?meetingBlocks(day):[])]).map(b=>blockHTML(b,day)).join('')+'</div>').join('')+'</div></div>'+
 '<div class="cal-foot"><span><i class="cal-work-dot"></i> Мои задачи</span><span><i class="cal-call-dot"></i> Созвоны из Яндекса</span><span>'+state.calendarEvents.length+' событий импортировано</span></div>'+
 '<p class="cal-source">Для импорта: Яндекс Календарь → настройки нужного календаря → Экспорт → iCal → скачать файл .ics. Затем выбери файл выше. Файл .ics — разовый импорт. Для автоматической синхронизации подключи ссылку iCal выше.</p>';
}
window.renderWorkCalendar=render;
if(state.view==='calendar')render();
function validFeed(url){
 try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&/^(?:[a-z0-9-]+\\.)*yandex\\.(?:ru|com|kz)$/i.test(u.hostname)&&u.port===''}catch{return false}
}
async function syncFeeds(force=false){
 if(syncActive||!state.calendarFeeds?.length)return;
 if(!force&&Date.now()-lastSync<14*60000)return;
 syncActive=true;
 const feedback=$c('#calSyncStatus');if(feedback)feedback.textContent='Синхронизация…';
 let updated=0,failed=0;
 for(const feed of state.calendarFeeds){
  try{
   const response=await fetch('/api/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:feed.url})});
   if(!response.ok)throw Error('HTTP '+response.status);
   const body=await response.text();if(!body.includes('BEGIN:VCALENDAR'))throw Error('Неверный iCal');
   const events=parseICS(body).map(e=>({...e,source:feed.id}));
   state.calendarEvents=(state.calendarEvents||[]).filter(e=>e.source!==feed.id).concat(events);
   feed.syncedAt=new Date().toISOString();feed.error='';updated+=events.length;
  }catch(error){feed.error=String(error.message).slice(0,100);failed++;console.warn('iCal sync',error)}
 }
 syncActive=false;lastSync=Date.now();persist();if(state.view==='calendar')render();
 const msg=failed?'Обновлено: '+updated+' · Ошибок: '+failed:'Синхронизировано событий: '+updated;
 const el=$c('#calSyncStatus');if(el)el.textContent=msg;
 if(force)toast(msg);
}
window.syncYandexCalendar=syncFeeds;
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncFeeds(false)});
setInterval(()=>syncFeeds(false),15*60000);
setTimeout(()=>syncFeeds(false),1500);
function place(id,day,start,end){
 let t=task(id);if(!t)return;
 const free=occurrences().find(o=>o.taskId===id&&o.day===day&&!o.start&&!o.end);
 if(free){free.start=time(start);free.end=time(end)}else state.occurrences.push({id:uid(),taskId:id,day,continuation:true,start:time(start),end:time(end)});
 persist();render();toast('Задача внесена в календарь');
}
function schedule(){
 chosen=$c('#calTaskChoice').value;if(!chosen){toast('Сначала выбери задачу');return}
 const d=iso(),length=clip(snap((effectiveRemaining(task(chosen))||1)*60),30,180),today=dates().includes(d)?d:dates()[0];
 place(chosen,today,9*60,Math.min(H1*60,9*60+length));
}
function changeBlock(id,day,start,end){
 const o=occurrences().find(o=>o.id===id);if(!o)return;
 o.day=day;o.start=time(start);o.end=time(end);if(!o.continuation){let t=task(o.taskId);if(t)t.day=day}
 persist();render();
}
function parseICS(src){
 const lines=src.replace(/\r\n[ \t]|\n[ \t]/g,'').replace(/\r\n/g,'\n').split('\n');const items=[];let buf=null;
 for(const ln of lines){if(ln==='BEGIN:VEVENT')buf=[];else if(ln==='END:VEVENT'&&buf){items.push(buf);buf=null}else if(buf)buf.push(ln)}
 const value=(data,name)=>{const s=data.find(x=>x.split(':',1)[0].split(';')[0].toUpperCase()===name);return s?s.slice(s.indexOf(':')+1):''};
 const line=(data,name)=>data.find(x=>x.split(':',1)[0].split(';')[0].toUpperCase()===name)||'';
 const tz=ln=>/TZID=([^;:]+)/i.exec(ln)?.[1]||'';
 function asDate(v,tzid){
  const m=/^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)?(Z)?)?/.exec(v);if(!m)return null;
  const [,y,mo,d,h='00',mi='00',ss='00',z]=m;
  if(z)return new Date(Date.UTC(+y,+mo-1,+d,+h,+mi,+ss));
  if(!tzid)return new Date(+y,+mo-1,+d,+h,+mi,+ss);
  let stamp=Date.UTC(+y,+mo-1,+d,+h,+mi,+ss),target=stamp;
  try{const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:tzid,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
   for(let i=0;i<3;i++){const p=Object.fromEntries(fmt.formatToParts(new Date(stamp)).filter(x=>x.type!=='literal').map(x=>[x.type,+x.value]));stamp+=target-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)}
   return new Date(stamp)}catch{return new Date(+y,+mo-1,+d,+h,+mi,+ss)}
 }
 const out=[];
 for(const part of items){const first=line(part,'DTSTART');if(!first)continue;const a=asDate(value(part,'DTSTART'),tz(first));if(!a||!Number.isFinite(a.getTime()))continue;
 const finish=line(part,'DTEND'),b=finish?asDate(value(part,'DTEND'),tz(finish)):new Date(a.getTime()+3600000);
 const length=Math.max(15*60000,b-a),base={id:value(part,'UID')||uid(),title:value(part,'SUMMARY').replace(/\\n/gi,' ').replace(/\\,/g,','),start:a.toISOString(),end:new Date(a.getTime()+length).toISOString()};
 const rule=value(part,'RRULE');if(!rule){out.push(base);continue}
 const rules=Object.fromEntries(rule.split(';').map(x=>x.split('='))),interval=Math.max(1,Number(rules.INTERVAL)||1),count=Math.min(260,Number(rules.COUNT)||100),until=rules.UNTIL?asDate(rules.UNTIL,'UTC'):new Date(a.getTime()+180*86400000),days=(rules.BYDAY||'').split(',').filter(Boolean),codes=['SU','MO','TU','WE','TH','FR','SA'];
 if(!['DAILY','WEEKLY'].includes(rules.FREQ)){out.push(base);continue}
 let n=0,accepted=0;for(let i=0;i<366&&accepted<count;i++){const cur=new Date(a.getTime()+i*86400000);if(cur>until)break;
 const same=rules.FREQ==='DAILY'?i%interval===0:Math.floor(i/7)%interval===0&&(!days.length?cur.getDay()===a.getDay():days.includes(codes[cur.getDay()]));
 if(!same)continue;out.push({...base,id:base.id+'_'+n++,start:cur.toISOString(),end:new Date(cur.getTime()+length).toISOString()});accepted++}
 }
 return out.filter(e=>new Date(e.end)>new Date(e.start)).slice(0,5000);
}
const root=$c('#calendarView');
root.addEventListener('click',e=>{
 const pg=e.target.closest('[data-cal-page]');if(pg){week=pg.dataset.calPage==='0'?monday(iso()):shift(week,+pg.dataset.calPage*7);render();return}
 if(e.target.id==='calPlace'){schedule();return}
 if(e.target.id==='calSyncNow'){syncFeeds(true);return}
 if(e.target.id==='calFeedAdd'){const input=$c('#calFeedUrl'),url=input?.value.trim();if(!validFeed(url)){toast('Нужна HTTPS-ссылка iCal от Яндекса');return}if(state.calendarFeeds.some(x=>x.url===url)){toast('Календарь уже подключен');return}state.calendarFeeds.push({id:uid(),name:'Яндекс '+(state.calendarFeeds.length+1),url,syncedAt:'',error:''});persist();render();syncFeeds(true);return}
 const remove=e.target.closest('[data-cal-feed-remove]');if(remove){const id=remove.dataset.calFeedRemove;if(!confirm('Отключить этот календарь?'))return;state.calendarFeeds=state.calendarFeeds.filter(x=>x.id!==id);state.calendarEvents=state.calendarEvents.filter(x=>x.source!==id);persist();render();return}
 const duplicate=e.target.closest('[data-cal-copy]');if(duplicate){e.stopPropagation();copyTask(duplicate.dataset.calCopy);return}
 const continueBtn=e.target.closest('[data-cal-continue]');if(continueBtn){e.stopPropagation();const o=occurrences().find(x=>x.id===continueBtn.dataset.calContinue);if(o)createContinuation(o.taskId,shift(o.day,1),o.start,o.end);return}
 if(e.target.id==='calClear'){if(!confirm('Удалить все импортированные события? Задачи не изменятся.'))return;state.calendarEvents=[];persist();render();return}
 const entry=e.target.closest('[data-cal-block]');if(entry&&entry.dataset.calKind==='meeting'){const evt=state.calendarEvents.find(x=>x.id===entry.dataset.calBlock);if(evt)toast('Созвон: '+evt.title);return}
 // Task clicks are handled by pointerup to avoid opening twice.
});
root.addEventListener('change',async e=>{
 if(e.target.id==='calTaskChoice'){chosen=e.target.value;return}
 if(e.target.id==='calShowTasks'){showTasks=e.target.checked;render();return}
 if(e.target.id==='calShowMeetings'){showMeetings=e.target.checked;render();return}
 if(e.target.id==='calIcs'){
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>6*1024*1024){toast('Файл больше 6 МБ');return}
  try{const imported=parseICS(await file.text());if(!imported.length){toast('Не нашла события в файле .ics');return}
   const other=state.calendarEvents.filter(x=>x.source!==file.name);state.calendarEvents=[...other,...imported.map(x=>({...x,source:file.name}))];persist();render();toast('Обновлен календарь '+file.name+': '+imported.length+' событий')}catch(err){console.error(err);toast('Не удалось прочитать iCal-файл')}
 }
});
root.addEventListener('pointerdown',e=>{
 const el=e.target.closest('[data-cal-block]');if(!el||el.dataset.calKind!=='task'||e.button!==0||e.target.closest('button'))return;
 const o=occurrences().find(x=>x.id===el.dataset.calBlock);if(!o)return;
 e.preventDefault();const resizing=!!e.target.closest('[data-cal-resize]');
 gesture={id:o.id,startY:e.clientY,startX:e.clientX,initial:mins(o.start),end:mins(o.end),day:o.day,resizing,moved:false};
 el.setPointerCapture(e.pointerId);el.classList.add('cal-dragging');
});
root.addEventListener('pointermove',e=>{
 if(!gesture)return;const el=e.target.closest('[data-cal-block]')||root.querySelector('[data-cal-block="'+gesture.id+'"]');if(!el)return;
 const dy=e.clientY-gesture.startY;const offset=snap(dy*60/H);
 if(Math.abs(dy)>4)gesture.moved=true;
 const duration=gesture.end-gesture.initial;
 if(gesture.resizing){const newEnd=clip(gesture.end+offset,gesture.initial+15,H1*60);el.style.height=Math.max(25,(newEnd-gesture.initial)*H/60-2)+'px'}
 else{const beginning=clip(gesture.initial+offset,H0*60,H1*60-duration);el.style.top=((beginning-H0*60)*H/60)+'px'}
});
root.addEventListener('pointerup',e=>{
 if(!gesture)return;const info=gesture;gesture=null;if(!info.moved){if(!info.resizing)openTask(occurrences().find(x=>x.id===info.id)?.taskId);return}
 const dy=e.clientY-info.startY,offset=snap(dy*60/H),duration=info.end-info.initial;
 let start=info.initial,end=info.end,day=info.day;
 if(info.resizing)end=clip(info.end+offset,info.initial+15,H1*60);
 else{
  start=clip(info.initial+offset,H0*60,H1*60-duration);end=start+duration;
  const at=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cal-date]');if(at)day=at.dataset.calDate;
 }
 changeBlock(info.id,day,start,end);
});
root.addEventListener('pointercancel',()=>{gesture=null;render()});
})();