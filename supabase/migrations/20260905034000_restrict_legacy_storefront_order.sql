-- The v2 checkout derives prices and delivery costs on the server. Keep the
-- legacy signature available only for trusted server-side maintenance code.
revoke all on function public.create_storefront_order(
  uuid, text, text, text, text, integer, text, public.payment_status, jsonb
) from public;
revoke all on function public.create_storefront_order(
  uuid, text, text, text, text, integer, text, public.payment_status, jsonb
) from anon;
revoke all on function public.create_storefront_order(
  uuid, text, text, text, text, integer, text, public.payment_status, jsonb
) from authenticated;
grant execute on function public.create_storefront_order(
  uuid, text, text, text, text, integer, text, public.payment_status, jsonb
) to service_role;
