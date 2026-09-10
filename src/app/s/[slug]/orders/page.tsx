import {MyOrders} from "./my-orders";
export default async function OrdersPage({params}:{params:Promise<{slug:string}>}){return <MyOrders slug={(await params).slug}/>;}
