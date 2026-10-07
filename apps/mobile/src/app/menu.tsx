import { Platform, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText as Text } from "@/components/app-text";
import { AppScreen, ui } from "@/components/app-shell";
import { AppSymbol } from "@/components/app-symbol";
import { useMerchantBrand } from "@/components/merchant-brand-theme";
import { merchantMenuGroups } from "@/lib/merchant-menu";
import { bulkaMerchantPreviewStore, merchantPreviewStore } from "@/lib/merchant-preview";
import { useOwnerStore } from "@/lib/use-owner-store";
import { colors } from "@/lib/theme";

const productPhotoProviderEnabled=process.env.EXPO_PUBLIC_PRODUCT_IMAGE_PROVIDER_ENABLED==="true";

export default function MerchantMenu(){
  const{uiPreview,brand}=useLocalSearchParams<{uiPreview?:string;brand?:string}>();
  const previewFixture=Platform.OS==="web"&&uiPreview==="390";
  const previewStore=brand==="bulka"?bulkaMerchantPreviewStore:merchantPreviewStore;
  const{store}=useOwnerStore(previewFixture?previewStore:undefined);
  const{theme}=useMerchantBrand();
  return <AppScreen section="Ещё" store={store?.name} logoUrl={store?.logo_url}>
    {previewFixture?<View style={s.fixture}><Text style={s.fixtureText}>Демо · только синтетические данные</Text></View>:null}
    <View style={[s.intro,{backgroundColor:`${theme.accent}12`,borderRadius:theme.cardRadius}]}>
      <View style={[s.introIcon,{backgroundColor:theme.surface}]}><AppSymbol name="slider.horizontal.3" size={23} color={theme.accent}/></View>
      <View style={{flex:1}}><Text style={s.title}>Управление магазином</Text><Text style={s.copy}>Продажи, продвижение и настройки — компактно по задачам.</Text></View>
    </View>
    <Pressable accessibilityRole="button" onPress={()=>router.push("/studio" as never)} style={({pressed})=>[s.studio,{backgroundColor:theme.accentStrong,borderRadius:theme.cardRadius},pressed&&ui.pressed]}>
      <View style={s.studioMark}><AppSymbol name="sparkles" size={23} color="white"/></View><View style={{flex:1}}><Text style={s.studioTitle}>AI Studio</Text><Text style={s.studioCopy}>Оформление магазина и проверка витрины</Text></View><AppSymbol name="chevron.right" size={17} color="white"/>
    </Pressable>
    {productPhotoProviderEnabled?<Pressable accessibilityRole="button" onPress={()=>router.push("/photo-studio" as never)} style={({pressed})=>[s.photoStudio,{borderRadius:theme.cardRadius},pressed&&ui.pressed]}>
      <View style={[s.studioMark,{backgroundColor:"#F0E6EC"}]}><AppSymbol name="sparkles" size={23} color={theme.accentStrong}/></View><View style={{flex:1}}><Text style={s.photoTitle}>Фото Studio</Text><Text style={s.photoCopy}>Фоны, варианты и ручное одобрение перед публикацией</Text></View><AppSymbol name="chevron.right" size={17} color={theme.accentStrong}/>
    </Pressable>:null}
    {merchantMenuGroups.map(group=><View key={group.title} style={s.group}><Text style={[s.groupTitle,{color:theme.accentStrong}]}>{group.title.toUpperCase()}</Text><View style={[s.list,{backgroundColor:theme.surface,borderRadius:theme.cardRadius}]}>{group.items.map((item,index)=><Pressable accessibilityRole="button" key={item.path} onPress={()=>router.push(item.path as never)} style={({pressed})=>[s.row,index>0&&s.rowBorder,pressed&&ui.pressed]}><View style={[s.icon,{backgroundColor:`${theme.accent}12`}]}><AppSymbol name={item.icon} size={20} color={theme.accentStrong}/></View><View style={s.rowCopy}><Text style={s.rowTitle}>{item.title}</Text><Text numberOfLines={1} style={s.rowDescription}>{item.copy}</Text></View><AppSymbol name="chevron.right" size={15} color={colors.muted}/></Pressable>)}</View></View>)}
  </AppScreen>;
}

const s=StyleSheet.create({
  fixture:{alignSelf:"flex-start",borderRadius:99,backgroundColor:"#FFF4D8",paddingHorizontal:10,paddingVertical:6},fixtureText:{fontSize:10,fontWeight:"900",color:"#6A4A12"},
  intro:{padding:16,gap:12,flexDirection:"row",alignItems:"center"},introIcon:{width:46,height:46,borderRadius:15,alignItems:"center",justifyContent:"center"},title:{fontSize:24,fontWeight:"900",letterSpacing:-.6,color:colors.ink},copy:{fontSize:12,lineHeight:17,color:colors.muted,marginTop:3},
  studio:{minHeight:80,padding:14,flexDirection:"row",alignItems:"center",gap:12},studioMark:{width:44,height:44,borderRadius:14,backgroundColor:"#FFFFFF1C",alignItems:"center",justifyContent:"center"},studioTitle:{fontSize:17,fontWeight:"900",color:"white"},studioCopy:{fontSize:11,lineHeight:16,color:"#FFF9FC",marginTop:3},
  photoStudio:{minHeight:76,padding:14,flexDirection:"row",alignItems:"center",gap:12,borderWidth:1,borderColor:"#DED6DB",backgroundColor:"white"},photoTitle:{fontSize:16,fontWeight:"900",color:colors.ink},photoCopy:{fontSize:11,lineHeight:16,color:colors.muted,marginTop:3},
  group:{gap:7},groupTitle:{fontSize:10,fontWeight:"900",letterSpacing:1.35,marginLeft:4,marginTop:4},list:{borderWidth:1,borderColor:colors.line,overflow:"hidden"},row:{minHeight:66,paddingHorizontal:13,paddingVertical:10,flexDirection:"row",alignItems:"center",gap:11},rowBorder:{borderTopWidth:1,borderTopColor:"#E9EDF0"},icon:{width:40,height:40,borderRadius:13,alignItems:"center",justifyContent:"center"},rowCopy:{flex:1,minWidth:0},rowTitle:{fontSize:15,fontWeight:"900",color:colors.ink},rowDescription:{fontSize:11,lineHeight:16,color:colors.muted,marginTop:2},
});
