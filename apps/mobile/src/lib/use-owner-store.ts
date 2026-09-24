import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { loadOwnerContext, type OwnerContext, type OwnerStore } from "@/lib/owner";
import { supabase } from "@/lib/supabase";

const key = "dukenim_selected_store";
export function useOwnerStore() {
  const [context,setContext]=useState<OwnerContext|null>(null); const [store,setStore]=useState<OwnerStore|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const load=useCallback(async()=>{setError("");try{const next=await loadOwnerContext();setContext(next);if(!next.stores.length){const result=supabase?await supabase.rpc("staff_directory" as never):{data:null};router.replace((Array.isArray(result.data)&&result.data.length?"/staff":"/setup-store") as never);return;}const saved=localStorage.getItem(key);const selected=next.stores.find(item=>item.id===saved)??next.stores[0];localStorage.setItem(key,selected.id);setStore(selected);}catch(e){setError(e instanceof Error?e.message:"Не удалось открыть магазин.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const select=(next:OwnerStore)=>{localStorage.setItem(key,next.id);setStore(next);};
  return {context,store,loading,error,reload:load,select};
}
