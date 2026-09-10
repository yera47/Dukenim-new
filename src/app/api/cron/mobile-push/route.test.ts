import {afterEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const admin=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:admin}));
vi.mock('@/lib/staff-server',()=>({createStaffAdminClient:admin}));
import {GET} from './route';
afterEach(()=>vi.unstubAllEnvs());
it('rejects missing or incorrect cron credentials before queue access',async()=>{
 vi.stubEnv('CRON_SECRET','fixture-secret');
 expect((await GET(new NextRequest('https://example.test'))).status).toBe(401);
 expect((await GET(new NextRequest('https://example.test',{headers:{Authorization:'Bearer wrong'}}))).status).toBe(401);
 expect(admin).not.toHaveBeenCalled();
});
