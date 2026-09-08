import {SupportThread} from "@/components/admin/support-thread";
export default async function Page({params}:{params:Promise<{id:string}>}){return <SupportThread id={(await params).id}/>;}
