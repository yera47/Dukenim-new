import {expect,it} from 'vitest';
import {catalogBuilderStateSchema} from './catalog-builder-draft';
it('preserves the active illustration step and accepts older drafts',()=>{
 const state={step:1,catalogName:'Серик Шоп',templateKey:'atelier',paletteKey:'mono',brief:'Одежда для города'};
 expect(catalogBuilderStateSchema.parse(state).designStage).toBeUndefined();
 expect(catalogBuilderStateSchema.parse({...state,designStage:'examples'}).designStage).toBe('examples');
 expect(catalogBuilderStateSchema.parse({...state,designStage:'colors',colorBrief:'Розовый и тёмно-зелёный'}).colorBrief).toBe('Розовый и тёмно-зелёный');
 expect(catalogBuilderStateSchema.safeParse({...state,colorBrief:'a'.repeat(301)}).success).toBe(false);
 expect(catalogBuilderStateSchema.safeParse({...state,designStage:'published'}).success).toBe(false);
});
it('round trips the chosen AI proposal without accepting arbitrary references',()=>{
 const state={step:2,catalogName:'Серик Шоп',templateKey:'atelier',paletteKey:'mono',brief:'Магазин одежды',generationId:'11111111-1111-4111-8111-111111111111'};
 expect(catalogBuilderStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
 expect(catalogBuilderStateSchema.safeParse({...state,generationId:'https://other.test'}).success).toBe(false);
});
