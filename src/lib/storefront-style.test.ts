import {expect,it} from 'vitest';
import {storefrontStyle} from './storefront-style';
it('does not replace black brand color with legacy green',()=>{
 expect(storefrontStyle({palette_key:'mono',brand_color:'#000000'},'pro','#00aa00')).toMatchObject({'--tenant-accent':'#000000','--store-accent-ink':'#ffffff'});
});
it('keeps light accents legible and explicit palettes independent of legacy tenant accent',()=>{
 expect(storefrontStyle({palette_key:'mono',brand_color:'#ffff00'},'pro','#00aa00')).toMatchObject({'--tenant-accent':'#ffff00','--store-accent-ink':'#000000'});
 expect(storefrontStyle({palette_key:'mono'},'pro','#00aa00')).not.toMatchObject({'--tenant-accent':'#00aa00'});
});
