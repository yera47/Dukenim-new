export const DOOR_ENTRY_MS=1320;
export const DOOR_EXIT_MS=900;
export const DOOR_REDUCED_MS=160;
const authRoutes=["/","/login","/register","/auth-callback","/forgot-password","/root-account-login"];
export function shouldPlayDoorEntry(previous:string,current:string){
  return previous!==current&&authRoutes.some(route=>previous===route||previous.startsWith(`${route}?`))&&!authRoutes.some(route=>current===route||current.startsWith(`${route}?`));
}
export function doorDuration(kind:"entry"|"exit",reduceMotion:boolean){
  return reduceMotion?DOOR_REDUCED_MS:kind==="exit"?DOOR_EXIT_MS:DOOR_ENTRY_MS;
}
export function doorMotionPlan(kind:"entry"|"exit",reduceMotion:boolean){
  return {duration:doorDuration(kind,reduceMotion),pointerEvents:"none" as const,visibleAfterCompletion:false};
}
export function shouldDismissDoorMotion(appState:string){return appState!=="active";}
