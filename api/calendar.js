/* Same-origin, read-only proxy for Yandex iCal feeds. No passwords or arbitrary URL fetching. */
const allowed=(raw)=>{
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  if(!/^(?:[a-z0-9-]+\.)*yandex\.(ru|com|kz)$/i.test(u.hostname))return null;
  return u;
 }catch{return null}
};
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 let data=req.body;
 if(typeof data==='string'){try{data=JSON.parse(data)}catch{return res.status(400).json({error:'Invalid JSON'})}}
 let url=allowed(data?.url);if(!url)return res.status(400).json({error:'Only HTTPS Yandex iCal URLs are supported'});
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
 try{
  let response;
  for(let n=0;n<3;n++){
   response=await fetch(url.toString(),{signal:ctrl.signal,redirect:'manual',headers:{Accept:'text/calendar, text/plain;q=0.9, */*;q=0.2','User-Agent':'MoyRitm-CalendarSync/1.0'}});
   if([301,302,303,307,308].includes(response.status)){
    const redirect=response.headers.get('location'),target=redirect?allowed(new URL(redirect,url).toString()):null;
    if(!target)return res.status(502).json({error:'Calendar link redirects to an unsupported host'});
    url=target;continue;
   }
   break;
  }
  if(!response||!response.ok)return res.status(502).json({error:'Unable to retrieve calendar feed'});
  const len=Number(response.headers.get('content-length')||0);
  if(len>4*1024*1024)return res.status(413).json({error:'Calendar feed is too large'});
  const chunks=[];let count=0;
  for await(const chunk of response.body){
   count+=chunk.byteLength;if(count>4*1024*1024)return res.status(413).json({error:'Calendar feed is too large'});
   chunks.push(Buffer.from(chunk));
  }
  const text=Buffer.concat(chunks).toString('utf8');
  if(!text.includes('BEGIN:VCALENDAR'))return res.status(422).json({error:'Response is not an iCal feed'});
  res.setHeader('Content-Type','text/calendar; charset=utf-8');
  return res.status(200).send(text);
 }catch{return res.status(504).json({error:'Calendar connection timed out or failed'})}
 finally{clearTimeout(timeout)}
};