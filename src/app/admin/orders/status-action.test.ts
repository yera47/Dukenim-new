import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),client:vi.fn()}));
vi.mock('@/lib/auth',()=>({getSessionContext:mocks.session}));
vi.mock('@/lib/supabase/server',()=>({createClient:mocks.client}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {saveOrderStatus} from './status-action';
const form=()=>{const f=new FormData();f.set('orderId','11111111-1111-4111-8111-111111111111');f.set('status','cancelled');f.set('expected','new');return f;};
beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue({user:{id:'owner'},tenantId:'mine',role:'owner'});});
it('rejects anonymous writes',async()=>{mocks.session.mockResolvedValue(null);expect((await saveOrderStatus({},form())).error).toBeTruthy();expect(mocks.client).not.toHaveBeenCalled();});
it('does not report success for stale or other-tenant orders',async()=>{
 const chain={update:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),select:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null,error:null})};
 mocks.client.mockResolvedValue({from:()=>chain});
 expect((await saveOrderStatus({},form())).error).toContain('другой вкладке');
 expect(chain.eq).toHaveBeenCalledWith('tenant_id','mine');expect(chain.eq).toHaveBeenCalledWith('status','new');
});
it('shows refund requirement rather than pretending to refund money',async()=>{
 const chain={update:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),select:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null,error:{message:'Refund payment before cancellation'}})};
 mocks.client.mockResolvedValue({from:()=>chain});expect((await saveOrderStatus({},form())).error).toContain('Автоматический возврат денег здесь не выполняется');
});
