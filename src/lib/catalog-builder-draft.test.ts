import {expect,it} from 'vitest';
import {catalogBuilderStateSchema} from './catalog-builder-draft';
it('round trips the chosen AI proposal without accepting arbitrary references',()=>{
 const state={step:2,catalogName:'Серик Шоп',templateKey:'atelier',paletteKey:'mono',brief:'Магазин одежды',generationId:'11111111-1111-4111-8111-111111111111'};
 expect(catalogBuilderStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
 expect(catalogBuilderStateSchema.safeParse({...state,generationId:'https://other.test'}).success).toBe(false);
});
