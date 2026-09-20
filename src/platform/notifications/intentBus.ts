import type {QuickActionIntent} from '../contracts';
let listener:((intent:QuickActionIntent)=>void)|undefined;
let pending:QuickActionIntent|undefined;
export function clearPendingNotificationIntent(){pending=undefined;}
export function deliverNotificationIntent(intent:QuickActionIntent){if(listener)listener(intent);else pending=intent;}
export function registerNotificationHandler(handle:(intent:QuickActionIntent)=>void){listener=handle;if(pending){const value=pending;pending=undefined;handle(value);}return()=>{if(listener===handle)listener=undefined;};}
