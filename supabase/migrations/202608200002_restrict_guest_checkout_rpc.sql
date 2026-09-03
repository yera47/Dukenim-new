-- Apply only after the server-side checkout route has been deployed and a real
-- guest order has been smoke-tested. This removes direct browser access to the
-- SECURITY DEFINER checkout RPC; the application route uses service credentials.
revoke execute on function public.create_storefront_order(uuid,text,text,text,text,integer,text,public.payment_status,jsonb) from anon, authenticated;
