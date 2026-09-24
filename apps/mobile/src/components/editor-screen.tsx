import type {PropsWithChildren} from "react";
import {Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {router} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {colors} from "@/lib/theme";

export function EditorScreen({title,subtitle,children}:{title:string;subtitle?:string}&PropsWithChildren){return <SafeAreaView style={s.safe} edges={["top","left","right"]}><View style={s.header}><Pressable accessibilityLabel="Назад" onPress={()=>router.back()} style={s.back}><Text style={s.chevron}>‹</Text></Pressable><View style={s.heading}><Text numberOfLines={1} style={s.title}>{title}</Text>{subtitle?<Text numberOfLines={1} style={s.subtitle}>{subtitle}</Text>:null}</View><View style={s.spacer}/></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></SafeAreaView>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"white"},header:{minHeight:62,paddingHorizontal:14,flexDirection:"row",alignItems:"center",borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},back:{width:40,height:40,borderRadius:20,backgroundColor:colors.navySoft,alignItems:"center",justifyContent:"center"},chevron:{fontSize:31,lineHeight:32,color:colors.navyDark,marginTop:-2},heading:{flex:1,alignItems:"center",gap:2},title:{fontSize:16,fontWeight:"900",color:colors.ink,maxWidth:240},subtitle:{fontSize:10,color:colors.muted},spacer:{width:40},content:{padding:20,paddingBottom:48,gap:14}});
