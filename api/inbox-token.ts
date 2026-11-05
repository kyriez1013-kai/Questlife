import { randomBytes } from 'node:crypto';
import { verifySupabaseBearer } from './_lib/supabaseAuth';
import { hash } from './_lib/inbox';
import { boundedBody, inboxResponse, inboxRpc } from './_lib/inboxRpc';
export default async function handler(req:any,res:any){
  if(req.method!=='POST')return inboxResponse(res,405,{error:'method_not_allowed'});
  const auth=await verifySupabaseBearer(req);if(auth.ok===false)return inboxResponse(res,auth.status,{error:auth.error});
  let action:string;try{const body=boundedBody(req.body) as Record<string,unknown>;if(Object.keys(body).some(k=>k!=='action')||!['status','rotate','revoke','health_on','health_off','delete_health'].includes(String(body.action)))throw new Error();action=String(body.action);}catch{return inboxResponse(res,400,{error:'invalid_request'});}
  const token=action==='rotate'?`ql_${randomBytes(32).toString('base64url')}`:undefined;
  try{const result=await inboxRpc('questlife_inbox_manage',{action,new_hash:token?hash(token):null},auth.accessToken);return inboxResponse(res,result.ok?200:400,{...result,...(result.ok&&token?{token}:{})});}catch{return inboxResponse(res,503,{error:'inbox_unavailable',retryable:true});}
}
