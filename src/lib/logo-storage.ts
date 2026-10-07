export function ownedLogoPath(url:string|null|undefined,tenantId:string){
  if(!url)return null;
  try{
    const path=decodeURIComponent(new URL(url).pathname.split("/product-images/")[1]??"");
    return path.startsWith(`${tenantId}/logo-`)&&path.endsWith(".png")?path:null;
  }catch{return null;}
}
