export type ProductPhotoMode="background_composite"|"creative_angles";
export type ProductPhotoScenario="product_photos"|"catalog_hero"|"story_promo";
export type ProductPhotoPackSize=2|3|4|5;
export type ProductPhotoStage="idle"|"ready"|"queued"|"processing"|"review"|"error"|"approved";

export type ProductPhotoDraft={
  mode:ProductPhotoMode;
  scenario?:ProductPhotoScenario;
  outputCount:ProductPhotoPackSize;
  instruction:string;
  sourceCount:number;
  additionalReferenceCount:number;
  merchantFacts?:string;
};

export type ProductPhotoValidation={ok:boolean;errors:string[];warnings:string[]};

export const PRODUCT_PHOTO_MAX_ATTEMPTS_PER_OUTPUT=3;

export type ProductDetailPassport={
  criticalDetails:string[];
  originalReferenceIds:string[];
  hiddenSides:string[];
};
export type ProductDetailReview={automaticChecksPassed:boolean;manualApproved:boolean;failedDetails:string[]};

export function canApproveProductResult(passport:ProductDetailPassport,review:ProductDetailReview){
  const referencesAreOriginal=passport.originalReferenceIds.length>0&&passport.originalReferenceIds.every(id=>!id.startsWith("generated:"));
  return referencesAreOriginal&&passport.criticalDetails.length>0&&review.automaticChecksPassed&&review.manualApproved&&review.failedDetails.length===0;
}

export function validateProductPhotoDraft(draft:ProductPhotoDraft):ProductPhotoValidation{
  const errors:string[]=[];const warnings:string[]=[];
  if(draft.sourceCount!==1)errors.push("Добавьте ровно одно исходное фото товара.");
  const instruction=draft.instruction.trim();
  if(instruction.length<8)errors.push("Опишите фон, свет или композицию минимум в 8 символах.");
  if(instruction.length>500)errors.push("Сократите инструкцию до 500 символов.");
  if(draft.outputCount<2||draft.outputCount>5)errors.push("Выберите от 2 до 5 вариантов.");
  if(draft.mode==="creative_angles"){
    if(draft.additionalReferenceCount<2)errors.push("Для новых ракурсов нужны минимум два дополнительных реальных фото товара.");
    warnings.push("Новые ракурсы являются генеративными: проверьте швы, принт, фурнитуру, текстуру и скрытые детали вручную.");
  }else{
    warnings.push("Товар остаётся неизменяемым слоем; меняются только фон, внешняя тень, отступы и композиция.");
  }
  if(draft.scenario&&draft.scenario!=="product_photos"&&(draft.merchantFacts?.trim().length??0)<8)errors.push("Для обложки или промо добавьте проверенные факты продавца.");
  return{ok:errors.length===0,errors,warnings};
}

export function productPhotoScenarioCopy(scenario:ProductPhotoScenario){
  if(scenario==="catalog_hero")return{title:"Обложка каталога",description:"Hero для реального storefront renderer: фото, композиция и отдельный слой проверенного текста."};
  if(scenario==="story_promo")return{title:"Stories и промо",description:"Вертикальная иллюстрация и текстовый draft для Stories во всех шаблонах."};
  return{title:"Фото товара",description:"Постановочные карточки товара с reference-guided генерацией или точным композитингом."};
}

export function productPhotoModeCopy(mode:ProductPhotoMode){
  return mode==="background_composite"
    ?{title:"Сохранить товар",description:"Вырезаем исходный товар и компонуем его поверх новых фонов. Сам товар не перерисовывается.",provenance:"Фон изменён · товар из оригинала"}
    :{title:"Новые ракурсы",description:"Требует дополнительных реальных фото. Результаты генеративные и не подтверждают невидимые детали.",provenance:"Генеративный ракурс · требует проверки"};
}

export function configuredPhotoPackLimit(env:NodeJS.ProcessEnv=process.env):number|null{
  const raw=env.AI_PHOTO_PACKS_MONTHLY?.trim();
  if(!raw)return null;
  const value=Number(raw);
  return Number.isInteger(value)&&value>0&&value<=100?value:null;
}
