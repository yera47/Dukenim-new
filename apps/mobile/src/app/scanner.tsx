import { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState<string | null>(null);
  if (!permission) return <View style={styles.page} />;
  if (!permission.granted) return <View style={styles.page}><Text style={styles.title}>Сканер товара</Text><Text style={[styles.text, styles.dark]}>Камера используется только после вашего разрешения.</Text><Pressable onPress={requestPermission} style={styles.button}><Text style={styles.buttonText}>Разрешить камеру</Text></Pressable><Link href="/" style={styles.link}>Назад</Link></View>;
  return <View style={styles.camera}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes:["ean13","ean8","code128","code39","upc_a","upc_e","qr"] }} onBarcodeScanned={code ? undefined : ({ data }) => setCode(data)} /><View style={styles.overlay}><Text style={[styles.title, styles.light]}>Наведите на штрихкод</Text><View style={styles.frame} /><Text style={styles.text}>{code ? `Код: ${code}` : "Код будет считан локально камерой."}</Text>{code && <Pressable onPress={() => setCode(null)} style={styles.button}><Text style={styles.buttonText}>Сканировать ещё</Text></Pressable>}<Link href="/" style={styles.link}>Закрыть</Link></View></View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:"#F4F0E8",padding:28,justifyContent:"center",gap:16},camera:{flex:1,backgroundColor:"#071B17"},overlay:{flex:1,alignItems:"center",justifyContent:"center",padding:28,gap:18,backgroundColor:"#071B174D"},frame:{width:260,height:170,borderWidth:2,borderColor:"#B08A50",borderRadius:22},title:{fontSize:22,fontWeight:"800",color:"#071B17"},light:{color:"#FFFDF8"},text:{color:"#E8DFD0",textAlign:"center",lineHeight:20},dark:{color:"#56625B",textAlign:"left"},button:{backgroundColor:"#071B17",padding:15,borderRadius:14},buttonText:{color:"#FFFDF8",fontWeight:"800"},link:{color:"#B08A50",fontWeight:"800"}});
