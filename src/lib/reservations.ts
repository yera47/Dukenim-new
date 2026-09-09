import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { pickupLocationSchema } from "./pickup-location";

export const reservationSettingsSchema=z.object({enabled:z.boolean(),holdHours:z.number().int().min(1).max(72),location:pickupLocationSchema});
export const reservationRequestSchema=z.object({
 slug:z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),requestId:z.string().uuid(),
 name:z.string().trim().min(2).max(80),phone:z.string().trim().max(30).refine(value=>/^\d{7,15}$/.test(value.replace(/\D/g,""))),
 items:z.array(z.object({variantId:z.string().uuid(),qty:z.number().int().min(1).max(20)}).strict()).min(1).max(50),
}).strict().refine(value=>new Set(value.items.map(item=>item.variantId)).size===value.items.length,"Повторяющиеся товары");
export const reservationLabels={reserved:"Ожидает подтверждения",confirmed:"Подтверждена",collected:"Выдана и оплачена",cancelled:"Отменена",expired:"Срок истёк"} as const;
export type ReservationStatus=keyof typeof reservationLabels;
export type ReservationRow={order_id:string;tenant_id:string;request_id:string;fingerprint:Json;phone:string;status:ReservationStatus;expires_at:string;created_at:string;updated_at:string};
type Settings={tenant_id:string;enabled:boolean;hold_hours:number;location:Json};
type Table<T>={Row:T;Insert:Partial<T>;Update:Partial<T>;Relationships:[]};
type ReservationDatabase={public:{Tables:{reservation_settings:Table<Settings>;merchandise_reservations:Table<ReservationRow>};Views:Record<never,never>;Enums:Record<never,never>;CompositeTypes:Record<never,never>;Functions:{
 create_merchandise_reservation:{Args:{p_tenant_id:string;p_request_id:string;p_name:string;p_phone:string;p_items:Json};Returns:{order_id:string;order_number:number;total:number;expires_at:string;reservation_status:ReservationStatus}[]};
 manage_merchandise_reservation:{Args:{p_order_id:string;p_action:string};Returns:ReservationStatus};
}}};
// Isolated schema extension: avoids overwriting another integration's generated types.
export const reservationsClient=(client:SupabaseClient<Database>)=>client as unknown as SupabaseClient<ReservationDatabase>;
