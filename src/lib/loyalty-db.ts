import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database,Json} from "@/types/database";
type Table<T>={Row:T;Insert:Partial<T>;Update:Partial<T>;Relationships:[]};
type LoyaltyDatabase={public:{Tables:{
 loyalty_programs:Table<{tenant_id:string;name:string;enabled:boolean;terms:string;updated_at:string}>;
 loyalty_rules:Table<{id:string;tenant_id:string;config:Json;active:boolean;created_at:string}>;
 buyer_order_access:Table<{order_id:string;tenant_id:string;user_id:string|null;guest_hash:string;discount:number;reward_label:string|null}>;
};Views:Record<never,never>;Enums:Record<never,never>;CompositeTypes:Record<never,never>;Functions:{
 save_loyalty_program:{Args:{p_tenant_id:string;p_program:Json};Returns:boolean};
 create_food_product:{Args:Database["public"]["Functions"]["create_product_with_variants"]["Args"]&{p_food_options:Json};Returns:string};
 create_catalog_setup_with_loyalty:{Args:Database["public"]["Functions"]["create_catalog_setup"]["Args"]&{p_loyalty:Json|null};Returns:string};
 claim_buyer_orders:{Args:{p_tenant:string;p_user:string|null;p_guest_hash:string;p_receipts:string[]};Returns:number};
 buyer_history:{Args:{p_tenant:string;p_user:string|null;p_guest_hash:string;p_offset:number};Returns:Json};
 create_buyer_order:{Args:{p_tenant_id:string;p_name:string;p_phone:string;p_delivery_method:string;p_delivery_address:string;p_zone_id:string|null;p_payment_method:string;p_items:Json;p_requested_for:string|null;p_user:string|null;p_guest_hash:string;p_reward_rule:string|null;p_reward_milestone:number|null;p_referral_code:string|null};Returns:{order_id:string;order_number:number;total:number}[]};
 owner_confirm_cash:{Args:{p_order:string;p_refund:boolean};Returns:boolean};
 set_variant_stock:{Args:{p_tenant_id:string;p_variant_id:string;p_target:number};Returns:number};
}}};
export const loyaltyClient=(client:SupabaseClient<Database>)=>client as unknown as SupabaseClient<LoyaltyDatabase>;
