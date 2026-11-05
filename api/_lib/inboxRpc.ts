import { serverUrl } from './supabaseAuth';
export async function inboxRpc(name:string,args:Record<string,unknown>,accessToken?:string) {
  const url=serverUrl(process.env.SUPABASE_URL);
  const key=accessToken?process.env.SUPABASE_ANON_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||url.pathname!=='/'||url.search||!key)throw new Error('inbox_not_configured');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const r=await fetch(new URL(`/rest/v1/rpc/${name}`,url),{method:'POST',headers:{apikey:key,Authorization:`Bearer ${accessToken??key}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:controller.signal,redirect:'error',cache:'no-store'});
    if(!r.ok)throw new Error('inbox_unavailable');
    return await r.json();
  }finally{clearTimeout(timer);}
}
export function inboxResponse(res:any,status:number,body:unknown){res.setHeader('Cache-Control','no-store');return res.status(status).json(body);}
export function boundedBody(raw:unknown){
  if(typeof raw==='string'){if(Buffer.byteLength(raw)>131072)throw new Error('invalid_request');return JSON.parse(raw);}
  if(!raw||Buffer.byteLength(JSON.stringify(raw))>131072)throw new Error('invalid_request');return raw;
}
