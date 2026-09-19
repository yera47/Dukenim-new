import type{SupabaseClient}from"@supabase/supabase-js";import type{Database}from"@/types/database";
type Customer={id:string;tenant_id:string;phone:string;name:string|null;first_order:string|null;last_order:string|null;orders_count:number;total_spent:number;user_id:string|null;marketing_sms_consent:boolean;marketing_sms_consent_at:string|null};
type BuyerDb={public:{Tables:{customers:{Row:Customer;Insert:Partial<Customer>;Update:Partial<Customer>;Relationships:[]}};Views:Record<string,never>;Enums:Record<string,never>;CompositeTypes:Record<string,never>;Functions:Record<string,never>}};
export const buyerClient=(client:SupabaseClient<Database>)=>client as unknown as SupabaseClient<BuyerDb>;
