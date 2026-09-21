import {MyOrders} from "./my-orders";
import {phoneAuthReady} from "@/lib/phone-auth-ready";
export default async function OrdersPage({params}:{params:Promise<{slug:string}>}){return <MyOrders slug={(await params).slug} phoneAuthAvailable={phoneAuthReady()}/>;}
