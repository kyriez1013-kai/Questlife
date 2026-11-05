import { authConfigured, supabaseClient } from '../sync-v2/supabase';
import { readSyncState } from '../sync-v2/runtime';
export type ShortcutStatus={active:boolean;healthConsent:boolean;consentAt?:string;lastSync:Partial<Record<'state'|'capture'|'health'|'calendar'|'follow_up',string>>;deleted?:number;token?:string};
export async function manageShortcut(action:string):Promise<ShortcutStatus>{
  if(!authConfigured())throw new Error('signin');
  const auth=supabaseClient().auth;const {data,error}=await auth.getSession();const session=data.session;
  if(error||!session)throw new Error('signin');
  if((await readSyncState()).ownerId!==session.user.id)throw new Error('account');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const r=await fetch('/api/inbox-token',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action}),cache:'no-store',signal:controller.signal});
    const value=await r.json();
    if((await auth.getSession()).data.session?.user.id!==session.user.id||(await readSyncState()).ownerId!==session.user.id)throw new Error('account');
    if(!r.ok||!value.ok)throw new Error(r.status===401?'signin':'unavailable');
    return value;
  }finally{clearTimeout(timer);}
}
