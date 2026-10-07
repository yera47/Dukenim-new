import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AppText as Text } from "@/components/app-text";
import { useLocalSearchParams } from "expo-router";
import { AppScreen, ui } from "@/components/app-shell";
import { colors, money } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { notificationTarget } from "@/lib/notification-target";
import { bulkaMerchantPreviewImages, bulkaMerchantPreviewStore, merchantPreviewImages, merchantPreviewStore } from "@/lib/merchant-preview";
import { useOwnerStore } from "@/lib/use-owner-store";
import { useMerchantBrand } from "@/components/merchant-brand-theme";
type Status =
  "new" | "confirmed" | "assembled" | "delivering" | "done" | "cancelled";
type Order = {
  id: string;
  order_number: number | null;
  status: Status;
  total: number;
  subtotal: number;
  delivery_cost: number;
  delivery_method: string | null;
  delivery_address: string | null;
  payment_method: string | null;
  payment_status: string;
  created_at: string;
  kaspi_invoice_sent_at: string | null;
};
type Item = {
  id: string;
  title_snapshot: string;
  price_snapshot: number;
  qty: number;
  image_url?: string | null;
};
const progressStatuses: Status[] = ["new", "confirmed", "assembled", "delivering", "done"];
const labels: Record<Status, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  assembled: "Собран",
  delivering: "Доставляется",
  done: "Завершён",
  cancelled: "Отменён",
};
const next: Record<Status, Status[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["assembled", "cancelled"],
  assembled: ["delivering", "done", "cancelled"],
  delivering: ["done"],
  done: [],
  cancelled: [],
};
export default function OrderScreen() {
  const params = useLocalSearchParams<{
    orderId?: string;
    tenantId?: string;
    uiPreview?: string;
    brand?: string;
  }>();
  const { orderId, tenantId, uiPreview, brand } = params;
  const previewFixture = Platform.OS === "web" && uiPreview === "390";
  const previewStore = brand === "bulka" ? bulkaMerchantPreviewStore : merchantPreviewStore;
  const previewProductImage = brand === "bulka" ? bulkaMerchantPreviewImages[0] : merchantPreviewImages[0];
  useOwnerStore(previewFixture ? previewStore : undefined);
  const { theme } = useMerchantBrand();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const target = useMemo(
    () => notificationTarget({ orderId, tenantId }),
    [orderId, tenantId],
  );
  const load = useCallback(async () => {
    if (previewFixture) {
      setOrder({id:"preview-1247",order_number:1247,status:"new",total:4200,subtotal:4200,delivery_cost:0,delivery_method:"delivery",delivery_address:"Демо-адрес, 12",payment_method:"cash",payment_status:"pending",created_at:"2026-10-01T09:42:00Z",kaspi_invoice_sent_at:null});
      setItems([{id:"preview-item-1",title_snapshot:"Круассан с миндалём",price_snapshot:2100,qty:2}]);
      setMessage("");
      setLoading(false);
      return;
    }
    if (!supabase || !target) {
      setOrder(null);
      setItems([]);
      setMessage("Некорректная ссылка на заказ.");
      setLoading(false);
      return;
    }
    const [a, b] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id,order_number,status,total,subtotal,delivery_cost,delivery_method,delivery_address,payment_method,payment_status,created_at,kaspi_invoice_sent_at",
        )
        .eq("id", target.orderId)
        .eq("tenant_id", target.tenantId)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("id,title_snapshot,price_snapshot,qty")
        .eq("order_id", target.orderId)
        .eq("tenant_id", target.tenantId),
    ]);
    if (a.error || !a.data || b.error || !b.data?.length) {
      setOrder(null);
      setItems([]);
      setMessage(
        a.error || !a.data
          ? "Заказ недоступен для этого аккаунта."
          : "Не удалось загрузить состав заказа. Действия пока недоступны.",
      );
    } else {
      setMessage("");
      setOrder(a.data as Order);
      setItems(b.data as Item[]);
    }
    setLoading(false);
  }, [previewFixture, target]);
  useEffect(() => {
    void load();
  }, [load]);
  const status = async (value: Status) => {
    if(previewFixture){Alert.alert("Демо-заказ","Статус не отправляется в базу данных.");return;}
    if (!supabase || !target || !order) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("orders")
      .update({ status: value })
      .eq("id", target.orderId)
      .eq("tenant_id", target.tenantId)
      .eq("status", order.status)
      .select("id")
      .maybeSingle();
    setBusy(false);
    if (error || !data)
      Alert.alert(
        "Статус не изменён",
        error?.message.includes("Payment")
          ? "Сначала подтвердите получение оплаты."
          : "Заказ изменился. Обновите его.",
      );
    else await load();
  };
  const kaspi = async (action: "invoice_sent" | "paid") => {
    if (!supabase || !order) return;
    if (action === "paid" && reference.trim().length < 4) {
      Alert.alert("Укажите номер операции или чека");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("manage_kaspi_remote_order", {
      p_order: order.id,
      p_action: action,
      p_reference: action === "paid" ? reference.trim() : null,
    });
    setBusy(false);
    if (error)
      Alert.alert("Действие не сохранено", "Проверьте текущий статус заказа.");
    else await load();
  };
  const cash = async () => {
    if (previewFixture) {
      Alert.alert("Demo mode", "Payment state is not changed in this synthetic preview.");
      return;
    }
    if (!supabase || !order) return;
    setBusy(true);
    const { error } = await supabase.rpc("owner_confirm_cash", {
      p_order: order.id,
      p_refund: false,
    });
    setBusy(false);
    if (error) Alert.alert("Оплата не подтверждена");
    else await load();
  };
  return (
    <AppScreen section="Заказ" store={previewFixture?previewStore.name:undefined} logoUrl={previewFixture?previewStore.logo_url:undefined}>
      {loading ? (
        <ActivityIndicator color={colors.navy} />
      ) : order ? (
        <>
          <View style={[s.hero,{backgroundColor:theme.accentStrong,borderRadius:theme.cardRadius}]}>
            <Text style={s.eyebrow}>{labels[order.status]}</Text>
            <Text style={s.title}>
              Заказ {order.order_number ? `№${order.order_number}` : ""}
            </Text>
            <Text style={s.total}>{money(order.total)}</Text>
            <Text style={s.meta}>
              {new Date(order.created_at).toLocaleString("ru-RU")} ·{" "}
              {order.delivery_method === "pickup" ? "Самовывоз" : "Доставка"}
            </Text>
          </View>
          <View style={s.progressCard} accessibilityLabel={`Order status: ${labels[order.status]}`}>
            {progressStatuses.map((value, index) => {
              const current = progressStatuses.indexOf(order.status);
              const complete = order.status !== "cancelled" && index <= current;
              return <View key={value} style={s.progressStep}>
                <View style={[s.progressDot,{borderColor:theme.accent},complete&&{backgroundColor:theme.accent}]} />
                <Text numberOfLines={1} style={[s.progressLabel,complete&&{color:theme.accent,fontWeight:"900"}]}>{labels[value]}</Text>
              </View>;
            })}
          </View>
          <View style={[ui.card,{backgroundColor:theme.surface,borderRadius:theme.cardRadius}]}>
            <Text style={ui.cardTitle}>Состав заказа</Text>
            {items.map((item) => (
              <View key={item.id} style={s.item}>
                {item.image_url || previewFixture ? <Image alt={item.title_snapshot} source={{uri:item.image_url??previewProductImage}} resizeMode="cover" style={[s.itemImage,{borderRadius:Math.max(8,theme.cardRadius-10)}]} /> : <View style={[s.itemImage,s.itemFallback,{backgroundColor:`${theme.accent}1F`,borderRadius:Math.max(8,theme.cardRadius-10)}]}><Text style={{color:theme.accent,fontWeight:"900"}}>{item.title_snapshot.slice(0,1)}</Text></View>}
                <Text style={{ flex: 1 }}>
                  {item.title_snapshot} × {item.qty}
                </Text>
                <Text style={s.itemPrice}>
                  {money(item.price_snapshot * item.qty)}
                </Text>
              </View>
            ))}
            <View style={s.line} />
            <Text style={s.address}>
              {order.delivery_address || "Адрес не указан"}
            </Text>
          </View>
          <View style={[ui.card,{backgroundColor:theme.surface,borderRadius:theme.cardRadius}]}>
            <Text style={ui.cardTitle}>Оплата</Text>
            <Text style={ui.subtitle}>
              {order.payment_method === "kaspi"
                ? "Удалённая оплата Kaspi"
                : "Наличными"}{" "}
              ·{" "}
              {order.payment_status === "paid"
                ? "деньги подтверждены"
                : order.payment_status === "refunded"
                  ? "возврат отмечен"
                  : "ожидает подтверждения"}
            </Text>
            {order.payment_status === "pending" &&
            order.payment_method === "kaspi" ? (
              <>
                <Pressable
                  disabled={busy}
                  onPress={() => void kaspi("invoice_sent")}
                  style={ui.outline}
                >
                  <Text style={ui.outlineText}>
                    {order.kaspi_invoice_sent_at
                      ? "Отправить счёт повторно"
                      : "Отметить: счёт отправлен"}
                  </Text>
                </Pressable>
                <TextInput
                  value={reference}
                  onChangeText={setReference}
                  style={ui.input}
                  placeholder="Номер операции или чека"
                />
                <Pressable
                  disabled={busy}
                  onPress={() => void kaspi("paid")}
                  style={ui.button}
                >
                  <Text style={ui.buttonText}>
                    Деньги проверены — подтвердить заказ
                  </Text>
                </Pressable>
              </>
            ) : null}
            {order.payment_status === "pending" &&
            order.payment_method === "cash" ? (
              <Pressable
                disabled={busy}
                onPress={() => void cash()}
                style={[ui.button,{backgroundColor:theme.accentStrong,borderRadius:theme.buttonRadius}]}
              >
                <Text style={ui.buttonText}>Наличные получены</Text>
              </Pressable>
            ) : null}
          </View>
          {next[order.status].length ? (
            <View style={[ui.card,{backgroundColor:theme.surface,borderRadius:theme.cardRadius}]}>
              <Text style={ui.cardTitle}>Следующий этап</Text>
              <Text style={ui.subtitle}>
                Покупатель увидит новый статус в «Моих заказах».
              </Text>
              <View style={s.actions}>
                {next[order.status].map((value) => (
                  <Pressable
                    disabled={busy}
                    key={value}
                    onPress={() =>
                      value === "cancelled"
                        ? Alert.alert(
                            "Отменить заказ?",
                            "Остаток будет возвращён правилами заказа.",
                            [
                              { text: "Нет", style: "cancel" },
                              {
                                text: "Отменить",
                                style: "destructive",
                                onPress: () => void status(value),
                              },
                            ],
                          )
                        : void status(value)
                    }
                    style={[ui.outline,{borderRadius:theme.buttonRadius},value === "confirmed"&&{backgroundColor:theme.accentStrong,borderColor:theme.accentStrong}, value === "cancelled" && s.cancel]}
                  >
                    <Text
                      style={[
                        ui.outlineText,
                        value === "confirmed"&&{color:"#FFFFFF"},value === "cancelled" && s.cancelText,
                      ]}
                    >
                      {value==="confirmed"?"Принять заказ":labels[value]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={ui.card}>
          <Text style={ui.error}>{message}</Text>
          <Pressable
            disabled={loading}
            onPress={() => {
              setLoading(true);
              void load();
            }}
            style={ui.outline}
          >
            <Text style={ui.outlineText}>Повторить</Text>
          </Pressable>
        </View>
      )}
    </AppScreen>
  );
}
const s = StyleSheet.create({
  back: { color: colors.navy, fontWeight: "800" },
  hero: {
    borderRadius: 23,
    backgroundColor: colors.navyDark,
    padding: 21,
    gap: 6,
  },
  eyebrow: {
    color: "#C3D5E0",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: { color: "white", fontSize: 27, fontWeight: "900" },
  total: { color: "white", fontSize: 31, fontWeight: "900" },
  meta: { color: "#D6E2E9", fontSize: 12 },
  item: { flexDirection: "row", gap: 10, paddingVertical: 5 },
  itemImage: { width: 54, height: 54 },
  itemFallback: { alignItems: "center", justifyContent: "center" },
  itemPrice: { fontWeight: "900", color: colors.ink },
  progressCard: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 4, paddingHorizontal: 2 },
  progressStep: { flex: 1, minWidth: 0, alignItems: "center", gap: 5 },
  progressDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, backgroundColor: "transparent" },
  progressLabel: { maxWidth: "100%", color: colors.muted, fontSize: 9, textAlign: "center" },
  line: { height: 1, backgroundColor: colors.line },
  address: { color: colors.muted, lineHeight: 20 },
  actions: { gap: 8 },
  cancel: { borderColor: "#E6B5B1" },
  cancelText: { color: colors.danger },
});
