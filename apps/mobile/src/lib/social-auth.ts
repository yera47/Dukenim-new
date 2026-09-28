import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export const appleAuthReady = process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === "true";
export const nativeAuthRedirect = "dukenim://auth-callback";

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Подключение входа не настроено.");
  const redirectTo = Platform.OS === "web" ? Linking.createURL("auth-callback") : nativeAuthRedirect;
  const {data,error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo,skipBrowserRedirect:true}});
  if(error||!data.url)throw new Error("Вход через Google пока недоступен.");
  const browser=await WebBrowser.openAuthSessionAsync(data.url,redirectTo);
  if(browser.type!=="success")return false;
  const response=Linking.parse(browser.url).queryParams;
  if(response?.error)throw new Error("Google не завершил вход. Повторите попытку.");
  const existing=await supabase.auth.getSession();
  if(existing.data.session)return true;
  const code=response?.code;
  if(typeof code!=="string")throw new Error("Google не вернул код входа.");
  const exchanged=await supabase.auth.exchangeCodeForSession(code);
  if(exchanged.error){
    const session=await supabase.auth.getSession();
    if(session.data.session)return true;
    throw new Error("Не удалось завершить вход через Google. Повторите попытку.");
  }
  return true;
}

export async function signInWithApple() {
  if (!appleAuthReady) throw new Error("Вход через Apple ещё не подключён в проекте.");
  if (Platform.OS!=="ios"||!supabase) throw new Error("Apple вход доступен только на iPhone.");
  if(!await AppleAuthentication.isAvailableAsync())throw new Error("Apple вход недоступен на этом устройстве.");
  const nonce=Crypto.randomUUID();
  const hashed=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,nonce);
  let credential:AppleAuthentication.AppleAuthenticationCredential;
  try{credential=await AppleAuthentication.signInAsync({nonce:hashed,requestedScopes:[AppleAuthentication.AppleAuthenticationScope.FULL_NAME,AppleAuthentication.AppleAuthenticationScope.EMAIL]});}
  catch(error){if(error&&typeof error==="object"&&"code" in error&&error.code==="ERR_REQUEST_CANCELED")return false;throw new Error("Не удалось открыть Apple вход.");}
  if(!credential.identityToken)throw new Error("Apple не вернул подтверждение входа.");
  const signed=await supabase.auth.signInWithIdToken({provider:"apple",token:credential.identityToken,nonce});
  if(signed.error)throw new Error("Не удалось завершить вход через Apple.");
  // Apple supplies the person's name only on the first authorization.
  const givenName=credential.fullName?.givenName?.trim();
  const familyName=credential.fullName?.familyName?.trim();
  const fullName=[givenName,familyName].filter(Boolean).join(" ");
  if(fullName&&!signed.data.user.user_metadata?.full_name){
    try{
      await supabase.auth.updateUser({data:{full_name:fullName,given_name:givenName??"",family_name:familyName??""}});
    }catch{
      // A profile update must not undo a valid Apple session.
    }
  }
  return true;
}
