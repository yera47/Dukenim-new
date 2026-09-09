import sharp from "sharp";
export async function prepareBrandPage(input:Buffer){
  if(input.length>700000||input[0]!==255||input[1]!==216||input[2]!==255)throw new Error("Invalid page image");
  const source=sharp(input,{limitInputPixels:16000000,animated:false}).rotate();
  const meta=await source.metadata();if(meta.format!=="jpeg")throw new Error("Invalid page format");
  for(const size of [1100,850,600]){
    const png=await source.clone().resize(size,size,{fit:"inside",withoutEnlargement:true}).png().toBuffer();
    if(png.length<=1000000)return png;
  }
  throw new Error("Page image too complex");
}
export async function prepareBrandLogo(input:Buffer) {
  const raster=input.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
    (input[0]===255&&input[1]===216&&input[2]===255) ||
    (input.subarray(0,4).toString()==="RIFF"&&input.subarray(8,12).toString()==="WEBP");
  if(!raster)throw new Error("Unsupported raster image");
  const image=sharp(input,{limitInputPixels:16000000,animated:false}).rotate();
  const metadata=await image.metadata();
  if(!["png","jpeg","webp"].includes(metadata.format??"")) throw new Error("Поддерживаются PNG, JPEG и WebP.");
  const png=await image.resize(512,512,{fit:"inside",withoutEnlargement:true}).png().toBuffer();
  const {data,info}=await sharp(png).resize(48,48,{fit:"inside"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const counts=new Map<string,number>();
  for(let i=0;i<data.length;i+=info.channels) {
    if(data[i+3]<180) continue;
    const hex="#"+[data[i],data[i+1],data[i+2]].map(v=>(Math.min(255,Math.round(v/24)*24)).toString(16).padStart(2,"0")).join("");
    counts.set(hex,(counts.get(hex)??0)+1);
  }
  const colors=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([color])=>color);
  return {png,colors};
}
