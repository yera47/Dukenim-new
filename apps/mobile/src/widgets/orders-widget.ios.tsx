import { HStack, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type OrderWidgetInput = { status: string };

type OrdersWidgetProps = {
  newOrders: number;
  activeOrders: number;
  updatedAt: string;
};

const DukenimOrdersWidgetView = (props: OrdersWidgetProps, environment: WidgetEnvironment) => {
  "widget";
  const isSmall = environment.widgetFamily === "systemSmall";
  return (
    <VStack
      alignment="leading"
      spacing={isSmall ? 8 : 12}
      modifiers={[
        padding({ all: 14 }),
        containerBackground("#FFFFFF", "widget"),
        widgetURL("dukenim://orders"),
      ]}
    >
      <Text modifiers={[font({ size: 13, weight: "bold" }), foregroundStyle("#0E3854")]}>Dukenim</Text>
      <Text modifiers={[font({ size: isSmall ? 28 : 32, weight: "bold" }), foregroundStyle("#111820")]}>Заказы</Text>
      <HStack spacing={16}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 24, weight: "bold" }), foregroundStyle("#0E3854")]}>{props.newOrders}</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle("#5F6C75")]}>новых</Text>
        </VStack>
        {!isSmall ? (
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 24, weight: "bold" }), foregroundStyle("#111820")]}>{props.activeOrders}</Text>
            <Text modifiers={[font({ size: 11 }), foregroundStyle("#5F6C75")]}>в работе</Text>
          </VStack>
        ) : null}
      </HStack>
      <Text modifiers={[font({ size: 10 }), foregroundStyle("#7A858D")]}>Обновлено {props.updatedAt}</Text>
    </VStack>
  );
};

const DukenimOrdersWidget = createWidget("DukenimOrdersWidget", DukenimOrdersWidgetView);

export function updateOrdersWidget(orders: OrderWidgetInput[]): void {
  const active = new Set(["confirmed", "assembled", "delivering"]);
  DukenimOrdersWidget.updateSnapshot({
    newOrders: orders.filter((order) => order.status === "new").length,
    activeOrders: orders.filter((order) => active.has(order.status)).length,
    updatedAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  });
}

export function clearOrdersWidget(): void {
  DukenimOrdersWidget.updateSnapshot({ newOrders: 0, activeOrders: 0, updatedAt: "—" });
}

export default DukenimOrdersWidget;
