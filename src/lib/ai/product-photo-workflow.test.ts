import{describe,expect,it}from"vitest";
import{canApproveProductResult,configuredPhotoPackLimit,productPhotoModeCopy,productPhotoScenarioCopy,validateProductPhotoDraft}from"./product-photo-workflow";

describe("product photo workflow",()=>{
  it("accepts a source-preserving 4-5 image pack without claiming generated angles",()=>{
    const result=validateProductPhotoDraft({mode:"background_composite",outputCount:5,instruction:"Светлый фон и мягкая внешняя тень",sourceCount:1,additionalReferenceCount:0});
    expect(result.ok).toBe(true);expect(result.warnings.join(" ")).toContain("неизменяемым слоем");
    expect(productPhotoModeCopy("background_composite").provenance).toContain("товар из оригинала");
  });
  it("blocks creative angles without enough real references",()=>{
    const result=validateProductPhotoDraft({mode:"creative_angles",outputCount:4,instruction:"Показать товар сбоку",sourceCount:1,additionalReferenceCount:1});
    expect(result.ok).toBe(false);expect(result.errors.join(" ")).toContain("минимум два");expect(result.warnings.join(" ")).toContain("генеративными");
  });
  it("keeps quota configurable and never interprets missing or invalid values as unlimited",()=>{
    expect(configuredPhotoPackLimit({NODE_ENV:"test"} as NodeJS.ProcessEnv)).toBeNull();
    expect(configuredPhotoPackLimit({NODE_ENV:"test",AI_PHOTO_PACKS_MONTHLY:"10"} as NodeJS.ProcessEnv)).toBe(10);
    expect(configuredPhotoPackLimit({NODE_ENV:"test",AI_PHOTO_PACKS_MONTHLY:"unlimited"} as NodeJS.ProcessEnv)).toBeNull();
  });
  it("requires merchant facts for hero and promo text drafts",()=>{
    expect(validateProductPhotoDraft({scenario:"catalog_hero",mode:"background_composite",outputCount:4,instruction:"Светлый hero для каталога",sourceCount:1,additionalReferenceCount:0}).ok).toBe(false);
    expect(validateProductPhotoDraft({scenario:"story_promo",mode:"background_composite",outputCount:4,instruction:"Вертикальная промо-подача",sourceCount:1,additionalReferenceCount:0,merchantFacts:"Скидка 10% до 20 октября"}).ok).toBe(true);
    expect(productPhotoScenarioCopy("catalog_hero").description).toContain("storefront renderer");
  });
  it("never lets an automatic detail check replace manual approval or original references",()=>{
    const passport={criticalDetails:["логотип","шов"],originalReferenceIds:["source:front","source:back"],hiddenSides:[]};
    expect(canApproveProductResult(passport,{automaticChecksPassed:true,manualApproved:false,failedDetails:[]})).toBe(false);
    expect(canApproveProductResult({...passport,originalReferenceIds:["generated:one"]},{automaticChecksPassed:true,manualApproved:true,failedDetails:[]})).toBe(false);
    expect(canApproveProductResult(passport,{automaticChecksPassed:true,manualApproved:true,failedDetails:[]})).toBe(true);
  });
});
