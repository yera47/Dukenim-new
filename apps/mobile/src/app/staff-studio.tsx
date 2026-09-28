import {useCallback,useRef,useState} from "react";
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {router,useFocusEffect,useLocalSearchParams} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {colors,site} from "@/lib/theme";
import {supabase} from "@/lib/supabase";
type Reply={reply:string};type Turn={id:string;message:string;response:Reply};
export default function StaffStudio(){
 const{accessId,store}=useLocalSearchParams<{accessId:string;store?:string}>();
 const[turns,setTurns]=useState<Turn[]>([]),[text,setText]=useState(""),[sending,setSending]=useState(false),[loading,setLoading]=useState(true),[canWrite,setCanWrite]=useState(false),[error,setError]=useState("");
 const requestId=useRef(0);
 const load=useCallback(async()=>{
  const current=++requestId.current;
  setLoading(true);setCanWrite(false);setTurns([]);setError("");
  try{
   if(!accessId||!supabase)throw new Error("Доступ не найден.");
   const{data:{session},error:sessionError}=await supabase.auth.getSession();
   if(sessionError||!session)throw new Error("Войдите снова.");
   const response=await fetch(`${site}/api/mobile/staff-studio?accessId=${encodeURIComponent(accessId)}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
   const body=await response.json() as{turns?:Turn[];canWrite?:boolean;error?:string};
   if(!response.ok||!Array.isArray(body.turns))throw new Error(body.error||"История AI Studio недоступна.");
   if(current!==requestId.current)return;
   setTurns(body.turns);setCanWrite(body.canWrite===true);
  }catch(cause){if(current===requestId.current)setError(cause instanceof Error?cause.message:"История AI Studio недоступна.");}
  finally{if(current===requestId.current)setLoading(false);}
 },[accessId]);
 useFocusEffect(useCallback(()=>{void load();return()=>{requestId.current+=1;};},[load]));
 const send=async()=>{
  const prompt=text.trim();if(!accessId||!supabase||!canWrite||prompt.length<2||sending)return;
  setSending(true);setError("");
  try{
   const{data:{session},error:sessionError}=await supabase.auth.getSession();
   if(sessionError||!session)throw new Error("Войдите снова.");
   const response=await fetch(`${site}/api/mobile/staff-studio`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({accessId,message:prompt})});
   const body=await response.json() as{id?:string;consultation?:Reply;error?:string};
   if(response.status===403){setCanWrite(false);setTurns([]);throw new Error(body.error||"Доступ к AI Studio закрыт.");}
   if(!response.ok||!body.consultation)throw new Error(body.error||"AI Studio недоступна.");
   setTurns(current=>[...current,{id:body.id??String(Date.now()),message:prompt,response:body.consultation!}]);setText("");
  }catch(cause){setError(cause instanceof Error?cause.message:"AI Studio недоступна.");}
  finally{setSending(false);}
 };
 return <SafeAreaView style={s.page}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
  <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={()=>router.back()} style={s.back}><Text style={s.backText}>‹</Text></Pressable><View style={{flex:1,alignItems:"center"}}><Text style={s.store}>{store||"Магазин"}</Text><Text style={s.status}>AI Studio · сотрудник</Text></View><View style={{width:40}}/></View>
  <ScrollView contentContainerStyle={s.chat} keyboardShouldPersistTaps="handled"><View style={s.welcome}><Text style={s.title}>Помощник магазина</Text><Text style={s.copy}>Здесь видна общая история магазина. Новые предложения доступны только с правом изменения.</Text></View>
   {loading?<ActivityIndicator color={colors.navy}/>:error&&!canWrite&&!turns.length?<Pressable onPress={()=>void load()} style={s.ai}><Text style={s.error}>{error} Нажмите, чтобы повторить.</Text></Pressable>:null}
   {!loading&&!error&&!turns.length?<Text style={s.copy}>Истории пока нет.</Text>:null}
   {turns.map(turn=><View key={turn.id} style={{gap:7}}><View style={s.user}><Text style={s.userText}>{turn.message}</Text></View><View style={s.ai}><Text style={s.aiText}>{turn.response.reply}</Text></View></View>)}
   {error&&(canWrite||turns.length)?<Text style={s.error}>{error}</Text>:null}
   {!loading&&!canWrite&&!error?<Text style={s.copy}>Владелец оставил доступ только для чтения.</Text>:null}
  </ScrollView>
  {canWrite?<View style={s.composer}><TextInput value={text} onChangeText={setText} multiline maxLength={800} placeholder="Сообщение…" style={s.input}/><Pressable disabled={sending||text.trim().length<2} onPress={()=>void send()} style={[s.send,(sending||text.trim().length<2)&&{opacity:.4}]}>{sending?<ActivityIndicator color="white"/>:<Text style={s.sendText}>↑</Text>}</Pressable></View>:null}
 </KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"white"},header:{minHeight:62,paddingHorizontal:14,flexDirection:"row",alignItems:"center",borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},back:{width:40,height:40,borderRadius:20,backgroundColor:colors.navySoft,alignItems:"center",justifyContent:"center"},backText:{fontSize:31,lineHeight:32,color:colors.navyDark},store:{fontSize:16,fontWeight:"900",color:colors.ink},status:{fontSize:10,color:colors.muted,marginTop:2},chat:{padding:16,gap:13},welcome:{alignItems:"center",padding:12,gap:6},title:{fontSize:25,fontWeight:"900",color:colors.ink},copy:{fontSize:13,lineHeight:19,textAlign:"center",color:colors.muted},user:{alignSelf:"flex-end",maxWidth:"84%",borderRadius:20,borderBottomRightRadius:6,backgroundColor:colors.navy,padding:12},userText:{color:"white",fontSize:15,lineHeight:21},ai:{alignSelf:"flex-start",maxWidth:"91%",borderRadius:20,borderBottomLeftRadius:6,backgroundColor:"#F1F5F7",padding:13},aiText:{fontSize:15,lineHeight:22,color:colors.ink},error:{color:colors.danger},composer:{minHeight:70,paddingHorizontal:12,paddingVertical:7,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.line,flexDirection:"row",alignItems:"flex-end",gap:7},input:{flex:1,minHeight:50,maxHeight:110,borderRadius:25,borderWidth:1,borderColor:colors.line,paddingHorizontal:15,paddingVertical:13,fontSize:15},send:{width:50,height:50,borderRadius:25,backgroundColor:colors.navy,alignItems:"center",justifyContent:"center"},sendText:{fontSize:23,fontWeight:"900",color:"white"}});
