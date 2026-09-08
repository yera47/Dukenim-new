import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {createAzureFoundryChatCompletion} from './azure-foundry';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('uses verified Azure Kimi controls without raising token budget',async()=>{
 vi.stubEnv('AZURE_AI_FOUNDRY_ENDPOINT','https://azure.example.test/openai/v1');
 vi.stubEnv('AZURE_AI_FOUNDRY_API_KEY','test-placeholder-not-real-key');
 vi.stubEnv('AZURE_AI_FOUNDRY_DEPLOYMENT','Kimi-K2.6');
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:'{"reply":"OK"}'}}]})));
 vi.stubGlobal('fetch',fetcher);
 await createAzureFoundryChatCompletion([{role:'user',content:'Return JSON'}]);
 const body=JSON.parse(fetcher.mock.calls[0][1].body);
 expect(body).toMatchObject({reasoning_effort:'none',response_format:{type:'json_object'},max_tokens:1600});
 expect(body).not.toHaveProperty('thinking');
 expect(body).not.toHaveProperty('temperature');
});
