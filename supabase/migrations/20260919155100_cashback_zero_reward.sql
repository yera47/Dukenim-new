create or replace function public.loyalty_rule_progress(p_rule uuid,p_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.loyalty_rules; total_units bigint; earned integer; first_live integer=1; expired_units bigint=0; candidate integer; unlocked timestamptz; amount integer; reward_value integer; available jsonb=null;
begin
 select * into r from public.loyalty_rules where id=p_rule;
 select coalesce(sum(q.units),0) into total_units from public.loyalty_qualifications(p_rule,p_user) q;
 earned=least(total_units/(r.config->>'threshold')::integer,2147483647)::integer;
 if not (r.config->>'repeat')::boolean then earned=least(earned,1); end if;
 if (r.config->>'expiryDays')::integer>0 then
  select coalesce(sum(q.units),0) into expired_units from public.loyalty_qualifications(p_rule,p_user) q where q.unlocked_at+make_interval(days=>(r.config->>'expiryDays')::integer)<=now();
  first_live=least(expired_units/(r.config->>'threshold')::integer+1,2147483647)::integer;
 end if;
 -- Only gaps following consumed rewards can be candidates: bounded by actual orders,
 -- not an arbitrarily large monetary threshold/points balance.
 for candidate in select n from (
  select first_live n
  union select numbered.n::integer from (
   select row_number() over(order by q.unlocked_at,q.event_id) n,q.amount from public.loyalty_qualifications(p_rule,p_user) q where r.config->>'reward'='cashback'
  ) numbered where numbered.n>=first_live and floor(numbered.amount::numeric*(r.config->>'value')::integer/100)>0
  union select (d.milestone+1) from public.loyalty_redemptions d where d.rule_id=p_rule and d.user_id=p_user and not d.cancelled and d.milestone>=first_live and d.milestone<earned
 ) gaps where n<=earned and not exists(select 1 from public.loyalty_redemptions d where d.rule_id=p_rule and d.user_id=p_user and d.milestone=n and not d.cancelled) order by n loop
  select q.unlocked_at,q.amount into unlocked,amount from (
   select x.*,sum(x.units) over(order by x.unlocked_at,x.event_id) cumulative from public.loyalty_qualifications(p_rule,p_user) x
  ) q where q.cumulative>=candidate::bigint*(r.config->>'threshold')::integer order by q.unlocked_at,q.event_id limit 1;
  reward_value=case when r.config->>'reward'='cashback' then floor(amount::numeric*(r.config->>'value')::integer/100)::integer else (r.config->>'value')::integer end;
  if reward_value=0 then continue; end if;
  available=jsonb_build_object('ruleId',p_rule,'milestone',candidate,'reward',r.config->>'reward','label',r.config->>'label','value',reward_value,'expiresAt',case when (r.config->>'expiryDays')::integer>0 then unlocked+make_interval(days=>(r.config->>'expiryDays')::integer) else null end);
  exit;
 end loop;
 return jsonb_build_object('rule',r.config,'active',r.active,'progress',total_units,'available',available);
end $$;
