import {beforeEach,expect,it,vi} from 'vitest';
const chat=vi.hoisted(()=>vi.fn());
vi.mock('server-only',()=>({}));
vi.mock('./azure-foundry',()=>({getAzureFoundryStatus:()=>({configured:true}),createAzureFoundryChatCompletion:chat,AzureFoundryError:class extends Error{}}));
import {createAiStudioDesign,createAiStudioDraft,createAiStudioStructure} from './studio';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test');});
const design={colorTheme:{background:'#f7dce6',surface:'#fff3f7',accent:'#164a36'},templateKey:'atelier',paletteKey:'mono',brandColor:'#c04455',heroTitle:'Серик Шоп',heroSubtitle:'Одежда для города',heroCtaLabel:'В каталог',rationale:'Цвет логотипа'};
it('passes brand rules to design and accepts individual hex color on eligible plan',async()=>{
  chat.mockResolvedValue({content:JSON.stringify(design)});
  const result=await createAiStudioDesign('Спокойный магазин','fashion','pro',{brand:{notes:'Без зелёного',colors:['#c04455']}});
  expect(result.design.brandColor).toBe('#c04455');
  expect(chat.mock.calls[0][0][1].content).toContain('Без зелёного');
});
it('does not accept a custom color on basic plan',async()=>{
  chat.mockResolvedValue({content:JSON.stringify(design)});
  await expect(createAiStudioDesign('Спокойный магазин','fashion','basic')).rejects.toThrow();
});
it('requires the new theme while allowing arbitrary shades on Start',async()=>{
 chat.mockResolvedValue({content:JSON.stringify({...design,brandColor:undefined})});
 expect((await createAiStudioDesign('Розовый и зелёный','beauty','basic')).design.colorTheme).toEqual(design.colorTheme);
 chat.mockResolvedValue({content:JSON.stringify({...design,colorTheme:undefined})});
 await expect(createAiStudioDesign('Розовый и зелёный','beauty','pro')).rejects.toThrow();
});
it('bounds verbose explanation without dropping valid colours',async()=>{
 chat.mockResolvedValue({content:JSON.stringify({...design,rationale:'Объяснение '.repeat(70)})});
 const result=await createAiStudioDesign('Розовый и зелёный','beauty','pro');
 expect(result.design.rationale.length).toBe(240);
 expect(result.design.colorTheme).toEqual(design.colorTheme);
});
it('uses valid unescaped JSON instructions and merchant facts for copy',async()=>{
  chat.mockResolvedValue({content:'```json\n{"title":"Серик Шоп","body":"Одежда для города","ctaLabel":"Каталог"}\n```'});
  await createAiStudioDraft('hero','Создай заголовок',{name:'Серик Шоп'});
  expect(chat.mock.calls[0][0][0].content).toContain('"title":string');
  expect(chat.mock.calls[0][0][0].content).not.toContain('\\"');
  expect(chat.mock.calls[0][0][1].content).toContain('Серик Шоп');
});
it('passes brand context to sections',async()=>{
  chat.mockResolvedValue({content:JSON.stringify({sections:[{name:'Новинки',description:'Новые поступления'},{name:'Коллекции',description:'Подборки товаров'}]})});
  await createAiStudioStructure('Создай разделы',{brand:{notes:'Лаконичные названия'}});
  expect(chat.mock.calls[0][0][1].content).toContain('Лаконичные названия');
});
it('restricts a first catalog suggestion to templates accepted by atomic creation',async()=>{
 chat.mockResolvedValue({content:JSON.stringify({...design,templateKey:'gallery',sections:[{name:'Одежда'},{name:'Аксессуары'}]})});
 await createAiStudioDesign('Создать магазин','fashion','pro',{catalog_status:'not_started'});
 expect(chat.mock.calls[0][0][1].content).not.toContain('"key":"atelier"');
 expect(chat.mock.calls[0][0][1].content).toContain('"key":"gallery"');
});
