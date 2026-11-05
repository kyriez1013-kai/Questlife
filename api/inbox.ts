import { inboxChanges, inboxSchema, inboxToken, hash } from './_lib/inbox';
import { boundedBody, inboxResponse, inboxRpc } from './_lib/inboxRpc';
export default async function handler(req:any,res:any){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return inboxResponse(res,405,{error:'write_only'});}
  const token=inboxToken(req.headers??{});if(!token)return inboxResponse(res,401,{error:'invalid_inbox_token'});
  let body;try{body=inboxSchema.parse(boundedBody(req.body));}catch{return inboxResponse(res,400,{error:'invalid_request'});}
  try{
    const tokenHash=hash(token);const context=await inboxRpc('questlife_inbox_prepare',{token_hash:tokenHash});
    if(!context.ok)return inboxResponse(res,context.status??403,{error:context.error});
    if(body.kind==='health'&&!context.healthConsent)return inboxResponse(res,403,{error:'health_consent_required'});
    let changes;try{changes=inboxChanges(body,context.history??[],new Date().toISOString());}catch(e){return inboxResponse(res,400,{error:(e as Error).message});}
    const result=await inboxRpc('questlife_inbox_commit',{token_hash:tokenHash,request_id:body.requestId,request_hash:hash(JSON.stringify(body)),kind:body.kind,changes});
    return inboxResponse(res,result.ok?200:result.status??409,result);
  }catch{return inboxResponse(res,503,{error:'inbox_unavailable',retryable:true});}
}
