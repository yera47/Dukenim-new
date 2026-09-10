import {describe,it,expect,vi,afterEach} from 'vitest';
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:vi.fn()}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>undefined})}));
vi.mock('@/lib/queries/tenants',()=>({getPublicTenantBySlug:vi.fn()}));
import {createAdminClient} from '@/lib/supabase/admin';
import {getPublicTenantBySlug} from '@/lib/queries/tenants';
import {POST} from './route';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe('reservation API boundary',()=>{
 it('uses resolved tenant and server amount, without exposing order IDs or contacts',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');
  const rpc=vi.fn().mockResolvedValue({data:[{order_id:'private-id',order_number:12,total:21700,expires_at:'2026-09-11T12:00:00Z',reservation_status:'reserved',phone:'private'}]});
  vi.mocked(createAdminClient).mockReturnValue({rpc} as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(getPublicTenantBySlug).mockResolvedValue({data:{id:'resolved-shop'},error:null} as unknown as Awaited<ReturnType<typeof getPublicTenantBySlug>>);
  const input={slug:'serik',requestId:'cb101010-0000-4000-8000-000000000005',name:'Серик',phone:'77000000000',items:[{variantId:'cb101010-0000-4000-8000-000000000004',qty:1}]};
  const response=await POST(new Request('https://www.dukenim.kz/api/reservations',{method:'POST',headers:{origin:'https://www.dukenim.kz','content-type':'application/json'},body:JSON.stringify(input)}));
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toEqual({orderNumber:12,total:21700,expiresAt:'2026-09-11T12:00:00Z',reservationStatus:'reserved'});
  expect(rpc).toHaveBeenCalledWith('create_merchandise_reservation',expect.objectContaining({p_tenant_id:'resolved-shop',p_request_id:input.requestId}));
 });
 it('rejects cross-origin stock holds before touching database',async()=>{
  const response=await POST(new Request('https://www.dukenim.kz/api/reservations',{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:'{}'}));
  expect(response.status).toBe(403);
 });
 it('fails closed without service configuration',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');
  const response=await POST(new Request('https://www.dukenim.kz/api/reservations',{method:'POST',headers:{origin:'https://www.dukenim.kz','content-type':'application/json'},body:'{}'}));
  expect(response.status).toBe(503);
 });
 it('rejects invalid items before database access',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');
  const response=await POST(new Request('https://www.dukenim.kz/api/reservations',{method:'POST',headers:{origin:'https://www.dukenim.kz','content-type':'application/json'},body:JSON.stringify({items:[]})}));
  expect(response.status).toBe(400);
 });
});
