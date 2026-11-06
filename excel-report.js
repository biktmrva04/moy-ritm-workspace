(function(){
'use strict';
const columns=['№','Описание задачи','Срок','Ссылка','Ответственный','Статус','Интерес','Комментарий'];
const safe=v=>/^[=+\-@\t\r]/.test(String(v??''))?"'"+String(v):String(v??'');
window.downloadWeeklyTemplate=async function({rows,start,end}){
 if(!window.ExcelJS){toast('Excel-библиотека недоступна. Скачан CSV');download('moy-ritm-'+start+'.csv',csv(),'text/csv;charset=utf-8');return}
 const btn=document.querySelector('#downloadReport');if(btn)btn.disabled=true;
 try{
 const wb=new ExcelJS.Workbook();wb.creator='Мой ритм';wb.created=new Date();
 const name=start.slice(8,10)+'.'+start.slice(5,7)+'-'+end.slice(8,10)+'.'+end.slice(5,7)+'.'+end.slice(0,4);
 const sheet=wb.addWorksheet(name,{views:[{state:'frozen',ySplit:1,showGridLines:false}]});
 [7,78,18,48,26,20,54,48].forEach((width,i)=>sheet.getColumn(i+1).width=width);
 const hdr=sheet.addRow(columns);hdr.height=36;
 hdr.eachCell((cell,index)=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:'FF1E1C40'}};cell.alignment={vertical:'middle',wrapText:true};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:index%2?'FFE5E8FA':'FFF0EFFC'}};cell.border={bottom:{style:'medium',color:{argb:'FF9189B9'}},right:{style:'thin',color:{argb:'FFDCD9E9'}}}});
 rows.slice(1).forEach((source,i)=>{
  const values=Array.from({length:8},(_,k)=>{const v=source[k]??'';return k===0?(Number(v)||i+1):k===2&&/^\d{4}-\d\d-\d\d$/.test(v)?new Date(v+'T12:00:00'):safe(v)});
  const row=sheet.addRow(values);row.height=43;
  row.eachCell({includeEmpty:true},(cell,index)=>{cell.font={name:'Arial',size:10,color:{argb:'FF35334A'}};cell.alignment={vertical:'top',wrapText:true};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:i%2?'FFF9F9FD':'FFFFFFFF'}};cell.border={bottom:{style:'hair',color:{argb:'FFE0DEEA'}},right:{style:'hair',color:{argb:'FFE5E3EE'}}};
   if(index===3&&cell.value instanceof Date)cell.numFmt='dd.mm.yyyy';
   if((index===4||index===7)&&typeof cell.value==='string'&&/^https?:\/\//i.test(cell.value)){cell.value={text:cell.value,hyperlink:cell.value};cell.font={name:'Arial',size:10,color:{argb:'FF536CC4'},underline:true}}
  });
  row.getCell(1).alignment={horizontal:'center',vertical:'middle'};row.getCell(3).alignment={horizontal:'center',vertical:'middle'};
 });
 sheet.autoFilter={from:'A1',to:'H'+Math.max(1,rows.length)};
 sheet.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,paperSize:9};
 const bytes=await wb.xlsx.writeBuffer(),blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='АКАМ_Итоги_за_неделю_'+start+'_'+end+'.xlsx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Таблица Excel сформирована');
 }catch(err){console.error('Excel export',err);toast('Ошибка Excel: '+(err.message||'неизвестная ошибка'))}
 finally{if(btn)btn.disabled=false}
};
})();