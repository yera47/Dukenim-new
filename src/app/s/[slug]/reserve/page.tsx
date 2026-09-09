import {notFound} from "next/navigation";
import {resolveTenant} from "@/lib/tenant";
import {createAdminClient} from "@/lib/supabase/admin";
import {reservationsClient} from "@/lib/reservations";
import {ReservationCheckout} from "./reservation-checkout";
import {readPickupLocation} from "@/lib/pickup-location";
export default async function ReservePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,tenant=await resolveTenant(slug);if(!tenant)notFound();
 const {data,error}=await reservationsClient(createAdminClient()).from("reservation_settings").select("*").eq("tenant_id",tenant.id).maybeSingle();
 const location=readPickupLocation(data?.location);
 if(error||!data?.enabled||!location)return <p className="container py-10">Бронирование в этом магазине сейчас недоступно.</p>;
 return <ReservationCheckout slug={slug} hours={data.hold_hours} location={location}/>;
}
