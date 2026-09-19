import "server-only";
import {createHash,randomBytes} from "node:crypto";
import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import type {NextResponse} from "next/server";
export const buyerCookie="dukenim_buyer";
export async function buyerIdentity(){
 const jar=await cookies();
 const saved=jar.get(buyerCookie)?.value;
 const token=saved&&/^[a-f0-9]{64}$/.test(saved)?saved:randomBytes(32).toString("hex");
 const client=await createClient();
 const {data:{user},error}=await client.auth.getUser();
 // A network failure must not silently turn an authenticated checkout into a guest order.
 if(error && error.name!=="AuthSessionMissingError") throw error;
 return {userId:user?.id??null,token,hash:createHash("sha256").update(token).digest("hex")};
}
export function setBuyerCookie(response:NextResponse,token:string){response.cookies.set(buyerCookie,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:365*86400});}
