import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { loadOwnerContext, type OwnerContext, type OwnerStore } from "@/lib/owner";
import { supabase } from "@/lib/supabase";
import { useMerchantBrand } from "@/components/merchant-brand-theme";

const key = "dukenim_selected_store";
export function useOwnerStore(previewStore?:OwnerStore) {
  const{applyStore}=useMerchantBrand();
  const [context,setContext]=useState<OwnerContext|null>(null); const [store,setStore]=useState<OwnerStore|null>(previewStore??null); const [loading,setLoading]=useState(!previewStore); const [error,setError]=useState("");
  const load=useCallback(async()=>{setError("");if(previewStore){setStore(previewStore);setLoading(false);return;}try{const next=await loadOwnerContext();setContext(next);if(next.role==="superadmin"&&!next.stores.length){router.replace("/root" as never);return;}if(!next.stores.length){const result=supabase?await supabase.rpc("staff_directory" as never):{data:null};router.replace((Array.isArray(result.data)&&result.data.length?"/staff":"/setup-store") as never);return;}const saved=localStorage.getItem(key);const selected=next.stores.find(item=>item.id===saved)??next.stores[0];localStorage.setItem(key,selected.id);setStore(selected);}catch(e){setError(e instanceof Error?e.message:"Не удалось открыть магазин.");}finally{setLoading(false);}},[previewStore]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>applyStore(store),[applyStore,store]);
  const select=(next:OwnerStore)=>{localStorage.setItem(key,next.id);setStore(next);applyStore(next);};
  return {context,store,loading,error,reload:load,select};
}
